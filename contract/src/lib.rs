//! FULLBACK contract.
//!
//! A transfer agreement between two clubs becomes a deal that holds the buyer's
//! collateral, collects installments in fEUR, pays overdue installments from the
//! collateral, and splits every payment between the seller, the training clubs
//! (Academy royalties) and, on a resale, the sell-on holder.
//!
//! Every payment arrives through `ft_transfer_call` on the fEUR token, which calls
//! `ft_on_transfer` here. Payouts leave through `ft_transfer`; a payout that fails is
//! kept in `pending` so the recipient can claim it later.

use near_sdk::json_types::{U128, U64};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::serde_json::{self, json, Value};
use near_sdk::store::{LookupMap, Vector};
use near_sdk::{
    env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue,
};

/// Academy royalties may never exceed 5% of a payment.
pub const MAX_TRAINING_BPS: u32 = 500;
pub const BPS_DENOMINATOR: u128 = 10_000;
pub const MAX_INSTALLMENTS: usize = 24;
pub const MAX_TRAINING_CLUBS: usize = 10;
pub const MAX_TEXT_LEN: usize = 64;

const GAS_FT_TRANSFER: Gas = Gas::from_tgas(8);
const GAS_ON_PAYOUT: Gas = Gas::from_tgas(6);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
const NANOS_PER_SEC: u64 = 1_000_000_000;

const EVENT_STANDARD: &str = "fullback";
const EVENT_VERSION: &str = "1.0.0";

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DealStatus {
    Proposed,
    Approved,
    Active,
    Defaulted,
    Completed,
    Resold,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DealKind {
    Primary,
    Resale,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TrainingClub {
    pub account_id: AccountId,
    pub name: String,
    pub bps: u16,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct InstallmentInput {
    pub amount: U128,
    pub due_offset_sec: u64,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct Installment {
    pub amount: u128,
    pub due_offset_sec: u64,
    pub paid: bool,
    pub paid_from_collateral: bool,
    pub paid_at_ns: Option<u64>,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct Deal {
    pub kind: DealKind,
    pub parent_deal_id: Option<u64>,
    pub player_id: String,
    pub player_name: String,
    pub seller_id: AccountId,
    pub buyer_id: AccountId,
    pub price: u128,
    pub installments: Vec<Installment>,
    pub collateral_required: u128,
    pub collateral_balance: u128,
    pub collateral_used_count: u32,
    pub sell_on_bps: u16,
    pub training_clubs: Vec<TrainingClub>,
    pub pdf_hash: String,
    pub status: DealStatus,
    pub created_at_ns: u64,
    pub activated_at_ns: Option<u64>,
    pub total_paid: u128,
    pub training_paid: u128,
}

impl Deal {
    fn next_unpaid(&self) -> Option<usize> {
        self.installments.iter().position(|i| !i.paid)
    }

    fn due_at_ns(&self, index: usize) -> Option<u64> {
        self.activated_at_ns
            .map(|start| start + self.installments[index].due_offset_sec * NANOS_PER_SEC)
    }

    fn all_paid(&self) -> bool {
        self.installments.iter().all(|i| i.paid)
    }
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Player {
    pub player_id: String,
    pub player_name: String,
    pub owner_id: AccountId,
    pub training_clubs: Vec<TrainingClub>,
    pub last_deal_id: u64,
    pub open_resale_deal_id: Option<u64>,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct StoredEvent {
    pub event: String,
    pub timestamp_ns: u64,
    pub block_height: u64,
    pub data_json: String,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct InstallmentView {
    pub amount: U128,
    pub due_offset_sec: u64,
    pub due_at_ns: Option<U64>,
    pub paid: bool,
    pub paid_from_collateral: bool,
    pub paid_at_ns: Option<U64>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct DealView {
    pub deal_id: u64,
    pub kind: DealKind,
    pub parent_deal_id: Option<u64>,
    pub player_id: String,
    pub player_name: String,
    pub seller_id: AccountId,
    pub buyer_id: AccountId,
    pub price: U128,
    pub installments: Vec<InstallmentView>,
    pub installments_paid: u32,
    pub next_due_index: Option<u32>,
    pub next_due_at_ns: Option<U64>,
    pub collateral_required: U128,
    pub collateral_balance: U128,
    pub collateral_used_count: u32,
    pub needs_top_up: bool,
    pub sell_on_bps: u16,
    pub sell_on_basis: String,
    pub training_clubs: Vec<TrainingClub>,
    pub pdf_hash: String,
    pub status: DealStatus,
    pub created_at_ns: U64,
    pub activated_at_ns: Option<U64>,
    pub total_paid: U128,
    pub training_paid: U128,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct EventView {
    pub event: String,
    pub deal_id: u64,
    pub timestamp_ns: U64,
    pub block_height: u64,
    pub data: Value,
}

#[near(serializers = [json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SettleResult {
    NotActive,
    NotDue,
    PaidFromCollateral,
    Defaulted,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SettleOutcome {
    pub result: SettleResult,
    pub installment_index: Option<u32>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct Config {
    pub ft_id: AccountId,
}

/// The `msg` of `ft_transfer_call`, e.g. `{"action":"pay_installment","deal_id":0}`.
#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde", tag = "action", rename_all = "snake_case")]
pub enum TransferAction {
    DepositCollateral { deal_id: u64 },
    TopUpCollateral { deal_id: u64 },
    PayInstallment { deal_id: u64 },
    PayResale { deal_id: u64 },
}

/// One leg of a split payment.
struct Payout {
    account_id: AccountId,
    amount: u128,
    role: &'static str,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Fullback {
    ft_id: AccountId,
    deals: Vector<Deal>,
    events: LookupMap<u64, Vec<StoredEvent>>,
    players: LookupMap<String, Player>,
    pending: LookupMap<AccountId, u128>,
}

#[near]
impl Fullback {
    #[init]
    pub fn new(ft_id: AccountId) -> Self {
        Self {
            ft_id,
            deals: Vector::new(b"d"),
            events: LookupMap::new(b"e"),
            players: LookupMap::new(b"p"),
            pending: LookupMap::new(b"q"),
        }
    }

    // ---------------------------------------------------------------- change

    /// Called by the buying club. Returns the new deal id.
    #[allow(clippy::too_many_arguments)]
    pub fn create_deal(
        &mut self,
        player_id: String,
        player_name: String,
        seller_id: AccountId,
        price: U128,
        installments: Vec<InstallmentInput>,
        collateral: U128,
        sell_on_bps: u16,
        sell_on_basis: String,
        training_clubs: Vec<TrainingClub>,
        pdf_hash: String,
    ) -> u64 {
        let buyer_id = env::predecessor_account_id();
        let pdf_hash = normalize_hash(&pdf_hash);

        require!(
            !player_id.is_empty() && player_id.len() <= MAX_TEXT_LEN,
            "player_id must be 1-64 characters"
        );
        require!(player_name.len() <= MAX_TEXT_LEN, "player_name is too long");
        require!(
            !self.players.contains_key(&player_id),
            "player_id is already registered; use record_resale for a later transfer"
        );
        require!(
            seller_id != buyer_id,
            "Seller and buyer must be different accounts"
        );
        require!(price.0 > 0, "Price must be positive");
        require!(collateral.0 > 0, "Collateral must be positive");
        require!(
            !installments.is_empty() && installments.len() <= MAX_INSTALLMENTS,
            "Between 1 and 24 installments are required"
        );
        require!(
            sell_on_basis == "gross",
            "Only a gross sell-on basis is supported"
        );

        let mut sum: u128 = 0;
        let mut last_offset: Option<u64> = None;
        for inst in &installments {
            require!(inst.amount.0 > 0, "Every installment must be positive");
            if let Some(prev) = last_offset {
                require!(
                    inst.due_offset_sec > prev,
                    "Installment due offsets must be strictly increasing"
                );
            }
            last_offset = Some(inst.due_offset_sec);
            sum = sum
                .checked_add(inst.amount.0)
                .unwrap_or_else(|| env::panic_str("Installment total overflows"));
        }
        require!(sum == price.0, "Installments must add up to the price");

        let training_bps = validate_training_clubs(&training_clubs, &seller_id, &buyer_id);
        require!(
            u32::from(sell_on_bps) + training_bps <= BPS_DENOMINATOR as u32,
            "Sell-on plus Academy royalties cannot exceed 100%"
        );
        require!(
            is_sha256_hex(&pdf_hash),
            "pdf_hash must be a 64-character SHA-256 hex string"
        );

        let deal_id = u64::from(self.deals.len());
        let now = env::block_timestamp();
        self.deals.push(Deal {
            kind: DealKind::Primary,
            parent_deal_id: None,
            player_id: player_id.clone(),
            player_name: player_name.clone(),
            seller_id: seller_id.clone(),
            buyer_id: buyer_id.clone(),
            price: price.0,
            installments: installments
                .iter()
                .map(|i| Installment {
                    amount: i.amount.0,
                    due_offset_sec: i.due_offset_sec,
                    paid: false,
                    paid_from_collateral: false,
                    paid_at_ns: None,
                })
                .collect(),
            collateral_required: collateral.0,
            collateral_balance: 0,
            collateral_used_count: 0,
            sell_on_bps,
            training_clubs: training_clubs.clone(),
            pdf_hash: pdf_hash.clone(),
            status: DealStatus::Proposed,
            created_at_ns: now,
            activated_at_ns: None,
            total_paid: 0,
            training_paid: 0,
        });
        self.players.insert(
            player_id.clone(),
            Player {
                player_id,
                player_name,
                // The buyer owns the player from now on; a resale also needs Completed.
                owner_id: buyer_id.clone(),
                training_clubs,
                last_deal_id: deal_id,
                open_resale_deal_id: None,
            },
        );
        self.emit(
            Some(deal_id),
            "deal_created",
            json!({
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "price": price,
                "pdf_hash": pdf_hash,
                "kind": DealKind::Primary,
            }),
        );
        deal_id
    }

    /// Called by the selling club.
    pub fn approve_deal(&mut self, deal_id: u64) {
        let caller = env::predecessor_account_id();
        let deal = self.deal_mut(deal_id);
        require!(
            caller == deal.seller_id,
            "Only the seller can approve this deal"
        );
        require!(
            deal.status == DealStatus::Proposed,
            "Deal is not waiting for approval"
        );
        deal.status = DealStatus::Approved;
        self.emit(
            Some(deal_id),
            "deal_approved",
            json!({ "seller_id": caller }),
        );
    }

    /// Anyone may call this. Pays the next overdue installment from the collateral,
    /// or marks the deal Defaulted when the collateral cannot cover it.
    pub fn settle_due(&mut self, deal_id: u64) -> SettleOutcome {
        let now = env::block_timestamp();
        let deal = self.deal_mut(deal_id);
        if deal.status != DealStatus::Active {
            return SettleOutcome {
                result: SettleResult::NotActive,
                installment_index: None,
            };
        }
        let index = deal
            .next_unpaid()
            .unwrap_or_else(|| env::panic_str("Active deal has no unpaid installment"));
        let due_at = deal.due_at_ns(index).unwrap_or(u64::MAX);
        if now < due_at {
            return SettleOutcome {
                result: SettleResult::NotDue,
                installment_index: Some(index as u32),
            };
        }

        let amount = deal.installments[index].amount;
        if deal.collateral_balance < amount {
            deal.status = DealStatus::Defaulted;
            let balance = deal.collateral_balance;
            self.emit(
                Some(deal_id),
                "deal_defaulted",
                json!({ "installment_index": index, "collateral_balance": U128(balance) }),
            );
            return SettleOutcome {
                result: SettleResult::Defaulted,
                installment_index: Some(index as u32),
            };
        }

        deal.collateral_balance -= amount;
        deal.collateral_used_count += 1;
        self.settle_installment(deal_id, index, true);
        SettleOutcome {
            result: SettleResult::PaidFromCollateral,
            installment_index: Some(index as u32),
        }
    }

    /// Called by the buyer once the deal is Completed (or Resold).
    pub fn release_collateral(&mut self, deal_id: u64) {
        let caller = env::predecessor_account_id();
        let deal = self.deal_mut(deal_id);
        require!(
            caller == deal.buyer_id,
            "Only the buyer can release the collateral"
        );
        require!(
            matches!(deal.status, DealStatus::Completed | DealStatus::Resold),
            "Collateral can only be released after the last installment is paid"
        );
        let amount = deal.collateral_balance;
        require!(amount > 0, "No collateral left to release");
        deal.collateral_balance = 0;
        self.emit(
            Some(deal_id),
            "collateral_released",
            json!({ "amount": U128(amount) }),
        );
        self.payout(&caller, amount, Some(deal_id));
    }

    /// Called by the player's current owner. Opens a one-payment resale deal and
    /// returns its id. The new buyer pays it with the `pay_resale` action.
    pub fn record_resale(
        &mut self,
        player_id: String,
        new_buyer_id: AccountId,
        fee: U128,
        pdf_hash: Option<String>,
    ) -> u64 {
        let caller = env::predecessor_account_id();
        let player = self
            .players
            .get(&player_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("Player not found"));
        require!(
            caller == player.owner_id,
            "Only the player's current owner can record a resale"
        );
        require!(
            player.open_resale_deal_id.is_none(),
            "A resale for this player is already open"
        );
        require!(fee.0 > 0, "Fee must be positive");
        require!(
            new_buyer_id != caller,
            "New buyer must be a different account"
        );
        let parent_id = player.last_deal_id;
        let parent = self.deal(parent_id);
        require!(
            parent.status == DealStatus::Completed,
            "The current deal must be Completed before a resale"
        );
        let pdf_hash = pdf_hash.map(|h| normalize_hash(&h)).unwrap_or_default();
        require!(
            pdf_hash.is_empty() || is_sha256_hex(&pdf_hash),
            "pdf_hash must be a 64-character SHA-256 hex string"
        );
        require!(
            player
                .training_clubs
                .iter()
                .all(|c| c.account_id != new_buyer_id),
            "A training club cannot be the new buyer"
        );

        let deal_id = u64::from(self.deals.len());
        let now = env::block_timestamp();
        self.deals.push(Deal {
            kind: DealKind::Resale,
            parent_deal_id: Some(parent_id),
            player_id: player_id.clone(),
            player_name: player.player_name.clone(),
            seller_id: caller.clone(),
            buyer_id: new_buyer_id.clone(),
            price: fee.0,
            installments: vec![Installment {
                amount: fee.0,
                due_offset_sec: 0,
                paid: false,
                paid_from_collateral: false,
                paid_at_ns: None,
            }],
            collateral_required: 0,
            collateral_balance: 0,
            collateral_used_count: 0,
            sell_on_bps: 0,
            training_clubs: player.training_clubs.clone(),
            pdf_hash: pdf_hash.clone(),
            status: DealStatus::Approved,
            created_at_ns: now,
            activated_at_ns: Some(now),
            total_paid: 0,
            training_paid: 0,
        });
        let mut player = player;
        player.open_resale_deal_id = Some(deal_id);
        self.players.insert(player_id, player);

        self.emit(
            Some(deal_id),
            "deal_created",
            json!({
                "buyer_id": new_buyer_id,
                "seller_id": caller,
                "price": fee,
                "pdf_hash": pdf_hash,
                "kind": DealKind::Resale,
            }),
        );
        self.emit(
            Some(parent_id),
            "resale_recorded",
            json!({ "resale_deal_id": deal_id, "new_buyer_id": new_buyer_id, "fee": fee }),
        );
        deal_id
    }

    /// Withdraws every pending payout of the caller.
    pub fn claim_pending(&mut self) {
        let caller = env::predecessor_account_id();
        let amount = self.pending.remove(&caller).unwrap_or(0);
        require!(amount > 0, "Nothing pending for this account");
        self.emit(
            None,
            "pending_claimed",
            json!({ "account_id": caller, "amount": U128(amount) }),
        );
        self.payout(&caller, amount, None);
    }

    /// NEP-141 receiver. Only the official fEUR token is accepted; anything that
    /// panics here is refunded in full by the token contract.
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        require!(
            env::predecessor_account_id() == self.ft_id,
            "Only the official fEUR token is accepted"
        );
        let action: TransferAction = serde_json::from_str(&msg)
            .unwrap_or_else(|_| env::panic_str("Invalid msg: expected a FULLBACK action"));
        let refund = match action {
            TransferAction::DepositCollateral { deal_id } => {
                self.on_deposit_collateral(deal_id, &sender_id, amount.0)
            }
            TransferAction::TopUpCollateral { deal_id } => {
                self.on_top_up_collateral(deal_id, &sender_id, amount.0)
            }
            TransferAction::PayInstallment { deal_id } => {
                self.on_pay_installment(deal_id, &sender_id, amount.0)
            }
            TransferAction::PayResale { deal_id } => {
                self.on_pay_resale(deal_id, &sender_id, amount.0)
            }
        };
        PromiseOrValue::Value(U128(refund))
    }

    /// Callback of every payout. Never panics: a failed transfer goes to `pending`.
    #[private]
    pub fn on_payout(&mut self, account_id: AccountId, amount: U128, deal_id: Option<u64>) -> bool {
        // ft_transfer returns no value, so a small bound is enough.
        let ok = env::promise_results_count() == 1 && env::promise_result_checked(0, 64).is_ok();
        if !ok {
            let current = self.pending.get(&account_id).copied().unwrap_or(0);
            self.pending.insert(account_id.clone(), current + amount.0);
            self.emit(
                deal_id,
                "payout_failed",
                json!({ "account_id": account_id, "amount": amount }),
            );
        }
        ok
    }

    // ------------------------------------------------------------------ view

    pub fn get_config(&self) -> Config {
        Config {
            ft_id: self.ft_id.clone(),
        }
    }

    pub fn get_deal(&self, deal_id: u64) -> Option<DealView> {
        self.deals
            .get(deal_id as u32)
            .map(|d| deal_view(deal_id, d))
    }

    pub fn list_deals(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<DealView> {
        let (from, limit) = page(from_index, limit);
        (from..u64::from(self.deals.len()))
            .take(limit)
            .map(|id| deal_view(id, self.deal(id)))
            .collect()
    }

    pub fn list_deals_by_account(
        &self,
        account_id: AccountId,
        from_index: Option<u64>,
        limit: Option<u64>,
    ) -> Vec<DealView> {
        let (from, limit) = page(from_index, limit);
        (0..u64::from(self.deals.len()))
            .filter(|id| self.involves(self.deal(*id), &account_id))
            .skip(from as usize)
            .take(limit)
            .map(|id| deal_view(id, self.deal(id)))
            .collect()
    }

    pub fn get_events(&self, deal_id: u64) -> Vec<EventView> {
        self.events
            .get(&deal_id)
            .map(|list| {
                list.iter()
                    .map(|e| EventView {
                        event: e.event.clone(),
                        deal_id,
                        timestamp_ns: U64(e.timestamp_ns),
                        block_height: e.block_height,
                        data: serde_json::from_str(&e.data_json).unwrap_or(Value::Null),
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn verify_pdf_hash(&self, deal_id: u64, pdf_hash: String) -> bool {
        match self.deals.get(deal_id as u32) {
            Some(deal) => !deal.pdf_hash.is_empty() && deal.pdf_hash == normalize_hash(&pdf_hash),
            None => false,
        }
    }

    pub fn get_pending(&self, account_id: AccountId) -> U128 {
        U128(self.pending.get(&account_id).copied().unwrap_or(0))
    }

    pub fn get_player(&self, player_id: String) -> Option<Player> {
        self.players.get(&player_id).cloned()
    }
}

// -------------------------------------------------------------- internals

impl Fullback {
    fn deal(&self, deal_id: u64) -> &Deal {
        u32::try_from(deal_id)
            .ok()
            .and_then(|i| self.deals.get(i))
            .unwrap_or_else(|| env::panic_str("Deal not found"))
    }

    fn deal_mut(&mut self, deal_id: u64) -> &mut Deal {
        u32::try_from(deal_id)
            .ok()
            .and_then(|i| self.deals.get_mut(i))
            .unwrap_or_else(|| env::panic_str("Deal not found"))
    }

    fn involves(&self, deal: &Deal, account_id: &AccountId) -> bool {
        if &deal.seller_id == account_id || &deal.buyer_id == account_id {
            return true;
        }
        if deal
            .training_clubs
            .iter()
            .any(|c| &c.account_id == account_id)
        {
            return true;
        }
        // The sell-on holder of a resale is the seller of the deal it came from.
        match deal.parent_deal_id {
            Some(parent) => {
                let parent = self.deal(parent);
                parent.sell_on_bps > 0 && &parent.seller_id == account_id
            }
            None => false,
        }
    }

    fn on_deposit_collateral(&mut self, deal_id: u64, sender: &AccountId, amount: u128) -> u128 {
        let now = env::block_timestamp();
        let deal = self.deal_mut(deal_id);
        require!(
            deal.kind == DealKind::Primary,
            "This deal takes no collateral"
        );
        require!(
            sender == &deal.buyer_id,
            "Only the buyer can deposit collateral"
        );
        require!(
            deal.status == DealStatus::Approved,
            "Deal must be approved by the seller first"
        );
        require!(
            amount >= deal.collateral_required,
            "Collateral must be deposited in full"
        );
        let required = deal.collateral_required;
        deal.collateral_balance = required;
        deal.status = DealStatus::Active;
        deal.activated_at_ns = Some(now);
        self.emit(
            Some(deal_id),
            "collateral_deposited",
            json!({ "amount": U128(required) }),
        );
        amount - required
    }

    fn on_top_up_collateral(&mut self, deal_id: u64, sender: &AccountId, amount: u128) -> u128 {
        let deal = self.deal_mut(deal_id);
        require!(
            sender == &deal.buyer_id,
            "Only the buyer can top up collateral"
        );
        require!(deal.status == DealStatus::Active, "Deal is not active");
        let missing = deal.collateral_required - deal.collateral_balance;
        require!(missing > 0, "Collateral is already full");
        require!(amount >= missing, "Top up must restore the full collateral");
        deal.collateral_balance = deal.collateral_required;
        let balance = deal.collateral_balance;
        self.emit(
            Some(deal_id),
            "collateral_topped_up",
            json!({ "amount": U128(missing), "collateral_balance": U128(balance) }),
        );
        amount - missing
    }

    fn on_pay_installment(&mut self, deal_id: u64, sender: &AccountId, amount: u128) -> u128 {
        let deal = self.deal_mut(deal_id);
        require!(
            deal.kind == DealKind::Primary,
            "Use pay_resale for a resale deal"
        );
        require!(
            sender == &deal.buyer_id,
            "Only the buyer can pay installments"
        );
        require!(deal.status == DealStatus::Active, "Deal is not active");
        let index = deal
            .next_unpaid()
            .unwrap_or_else(|| env::panic_str("All installments are paid"));
        let due = deal.installments[index].amount;
        require!(amount >= due, "Amount is less than the installment");
        self.settle_installment(deal_id, index, false);
        amount - due
    }

    fn on_pay_resale(&mut self, deal_id: u64, sender: &AccountId, amount: u128) -> u128 {
        let now = env::block_timestamp();
        let deal = self.deal_mut(deal_id);
        require!(deal.kind == DealKind::Resale, "Not a resale deal");
        require!(
            sender == &deal.buyer_id,
            "Only the new buyer can pay this resale"
        );
        require!(
            deal.status == DealStatus::Approved,
            "Resale is not open for payment"
        );
        let fee = deal.price;
        require!(amount >= fee, "Amount is less than the resale fee");

        deal.installments[0].paid = true;
        deal.installments[0].paid_at_ns = Some(now);
        deal.status = DealStatus::Completed;
        let seller = deal.seller_id.clone();
        let buyer = deal.buyer_id.clone();
        let clubs = deal.training_clubs.clone();
        let parent_id = deal.parent_deal_id.expect("resale has a parent");
        let player_id = deal.player_id.clone();

        let parent = self.deal_mut(parent_id);
        parent.status = DealStatus::Resold;
        let sell_on_holder = parent.seller_id.clone();
        let sell_on_bps = parent.sell_on_bps;

        let mut payouts = Vec::new();
        let sell_on = bps_of(fee, sell_on_bps);
        if sell_on > 0 {
            payouts.push(Payout {
                account_id: sell_on_holder,
                amount: sell_on,
                role: "sell_on",
            });
        }
        let training = push_training(&mut payouts, fee, &clubs);
        payouts.push(Payout {
            account_id: seller,
            amount: fee - sell_on - training,
            role: "seller",
        });

        let deal = self.deal_mut(deal_id);
        deal.total_paid = fee;
        deal.training_paid = training;

        if let Some(player) = self.players.get_mut(&player_id) {
            player.owner_id = buyer;
            player.last_deal_id = deal_id;
            player.open_resale_deal_id = None;
        }

        let data = json!({
            "resale_deal_id": deal_id,
            "fee": U128(fee),
            "payouts": payouts_json(&payouts),
        });
        self.emit(Some(parent_id), "resale_paid", data.clone());
        self.emit(Some(deal_id), "resale_paid", data);
        self.emit(Some(deal_id), "deal_completed", json!({}));
        for p in &payouts {
            self.payout(&p.account_id, p.amount, Some(deal_id));
        }
        amount - fee
    }

    /// Marks installment `index` paid and splits it between the training clubs and
    /// the seller. The caller has already checked who pays and where the money is.
    fn settle_installment(&mut self, deal_id: u64, index: usize, from_collateral: bool) {
        let now = env::block_timestamp();
        let deal = self.deal_mut(deal_id);
        let amount = deal.installments[index].amount;
        {
            let inst = &mut deal.installments[index];
            inst.paid = true;
            inst.paid_from_collateral = from_collateral;
            inst.paid_at_ns = Some(now);
        }
        let mut payouts = Vec::new();
        let training = push_training(&mut payouts, amount, &deal.training_clubs);
        payouts.push(Payout {
            account_id: deal.seller_id.clone(),
            amount: amount - training,
            role: "seller",
        });
        deal.total_paid += amount;
        deal.training_paid += training;
        let completed = deal.all_paid();
        if completed {
            deal.status = DealStatus::Completed;
        }

        self.emit(
            Some(deal_id),
            "installment_paid",
            json!({
                "installment_index": index,
                "amount": U128(amount),
                "from_collateral": from_collateral,
                "payouts": payouts_json(&payouts),
            }),
        );
        if completed {
            self.emit(Some(deal_id), "deal_completed", json!({}));
        }
        for p in &payouts {
            self.payout(&p.account_id, p.amount, Some(deal_id));
        }
    }

    /// Sends `amount` fEUR to `account_id`. State is already updated by the caller;
    /// if the transfer fails, `on_payout` moves the amount to `pending`.
    fn payout(&self, account_id: &AccountId, amount: u128, deal_id: Option<u64>) {
        if amount == 0 {
            return;
        }
        let args = json!({ "receiver_id": account_id, "amount": U128(amount) });
        let _ = Promise::new(self.ft_id.clone())
            .function_call(
                "ft_transfer".to_string(),
                args.to_string().into_bytes(),
                ONE_YOCTO,
                GAS_FT_TRANSFER,
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_ON_PAYOUT)
                    .on_payout(account_id.clone(), U128(amount), deal_id),
            );
    }

    fn emit(&mut self, deal_id: Option<u64>, event: &str, data: Value) {
        let mut logged = data.clone();
        if let (Some(id), Value::Object(map)) = (deal_id, &mut logged) {
            map.insert("deal_id".to_string(), json!(id));
        }
        env::log_str(&format!(
            "EVENT_JSON:{}",
            json!({
                "standard": EVENT_STANDARD,
                "version": EVENT_VERSION,
                "event": event,
                "data": [logged],
            })
        ));
        if let Some(id) = deal_id {
            let stored = StoredEvent {
                event: event.to_string(),
                timestamp_ns: env::block_timestamp(),
                block_height: env::block_height(),
                data_json: data.to_string(),
            };
            let mut list = self.events.get(&id).cloned().unwrap_or_default();
            list.push(stored);
            self.events.insert(id, list);
        }
    }
}

fn bps_of(amount: u128, bps: u16) -> u128 {
    amount * u128::from(bps) / BPS_DENOMINATOR
}

/// Adds one payout per training club and returns their total.
fn push_training(payouts: &mut Vec<Payout>, amount: u128, clubs: &[TrainingClub]) -> u128 {
    let mut total = 0;
    for club in clubs {
        let share = bps_of(amount, club.bps);
        if share > 0 {
            payouts.push(Payout {
                account_id: club.account_id.clone(),
                amount: share,
                role: "training_club",
            });
            total += share;
        }
    }
    total
}

fn payouts_json(payouts: &[Payout]) -> Value {
    Value::Array(
        payouts
            .iter()
            .map(
                |p| json!({ "account_id": p.account_id, "amount": U128(p.amount), "role": p.role }),
            )
            .collect(),
    )
}

fn validate_training_clubs(clubs: &[TrainingClub], seller: &AccountId, buyer: &AccountId) -> u32 {
    require!(clubs.len() <= MAX_TRAINING_CLUBS, "Too many training clubs");
    let mut total: u32 = 0;
    for (i, club) in clubs.iter().enumerate() {
        require!(
            club.name.len() <= MAX_TEXT_LEN,
            "Training club name is too long"
        );
        require!(
            &club.account_id != seller && &club.account_id != buyer,
            "A training club cannot be the seller or the buyer"
        );
        require!(
            clubs[..i].iter().all(|c| c.account_id != club.account_id),
            "Each training club may appear only once"
        );
        total += u32::from(club.bps);
    }
    require!(
        total <= MAX_TRAINING_BPS,
        "Academy royalties cannot exceed 500 bps (5%)"
    );
    total
}

fn normalize_hash(hash: &str) -> String {
    hash.trim().to_ascii_lowercase()
}

fn is_sha256_hex(hash: &str) -> bool {
    hash.len() == 64 && hash.bytes().all(|b| b.is_ascii_hexdigit())
}

fn page(from_index: Option<u64>, limit: Option<u64>) -> (u64, usize) {
    (
        from_index.unwrap_or(0),
        limit.unwrap_or(50).min(100) as usize,
    )
}

fn deal_view(deal_id: u64, d: &Deal) -> DealView {
    let next = d.next_unpaid();
    DealView {
        deal_id,
        kind: d.kind,
        parent_deal_id: d.parent_deal_id,
        player_id: d.player_id.clone(),
        player_name: d.player_name.clone(),
        seller_id: d.seller_id.clone(),
        buyer_id: d.buyer_id.clone(),
        price: U128(d.price),
        installments: d
            .installments
            .iter()
            .enumerate()
            .map(|(i, inst)| InstallmentView {
                amount: U128(inst.amount),
                due_offset_sec: inst.due_offset_sec,
                due_at_ns: d.due_at_ns(i).map(U64),
                paid: inst.paid,
                paid_from_collateral: inst.paid_from_collateral,
                paid_at_ns: inst.paid_at_ns.map(U64),
            })
            .collect(),
        installments_paid: d.installments.iter().filter(|i| i.paid).count() as u32,
        next_due_index: next.map(|i| i as u32),
        next_due_at_ns: next.and_then(|i| d.due_at_ns(i)).map(U64),
        collateral_required: U128(d.collateral_required),
        collateral_balance: U128(d.collateral_balance),
        collateral_used_count: d.collateral_used_count,
        needs_top_up: d.status == DealStatus::Active
            && d.collateral_balance < d.collateral_required,
        sell_on_bps: d.sell_on_bps,
        sell_on_basis: "gross".to_string(),
        training_clubs: d.training_clubs.clone(),
        pdf_hash: d.pdf_hash.clone(),
        status: d.status,
        created_at_ns: U64(d.created_at_ns),
        activated_at_ns: d.activated_at_ns.map(U64),
        total_paid: U128(d.total_paid),
        training_paid: U128(d.training_paid),
    }
}
