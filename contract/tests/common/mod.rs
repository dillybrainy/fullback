//! Test harness: runs the FULLBACK contract against a simulated fEUR ledger.
//!
//! `pay` plays the token's `ft_transfer_call`: it moves the tokens to the contract,
//! calls `ft_on_transfer`, and returns any refund. After every call the receipts the
//! contract created are executed: each `ft_transfer` moves tokens out of the contract
//! (failing when the receiver is not registered on the token), and the following
//! `on_payout` callback is called with that result. A panic is caught and treated as
//! a rejected transaction, so no tokens move.

#![allow(dead_code)]

use fullback::{Fullback, InstallmentInput, TrainingClub};
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::{
    test_vm_config, testing_env, AccountId, PromiseOrValue, PromiseResult, RuntimeFeesConfig,
};
use std::collections::{HashMap, HashSet};
use std::panic::{catch_unwind, AssertUnwindSafe};

pub const FT: &str = "feur.testnet";
pub const CONTRACT: &str = "fullback.testnet";
pub const NORDVIK: &str = "nordvik.testnet";
pub const PORTO: &str = "portoalegre.testnet";
pub const KOTA: &str = "kotafc.testnet";
pub const DESA: &str = "akademidesa.testnet";
pub const CLUBZ: &str = "clubz.testnet";
pub const KEEPER: &str = "keeper.testnet";
pub const STRANGER: &str = "stranger.testnet";

pub const PDF_HASH: &str = "3f79bb7b435b05321651daefd374cdc681dc06faa65e374e38337b88ca046dea";

pub const START_SEC: u64 = 1_800_000_000;

/// Whole fEUR to base units (6 decimals).
pub fn fe(whole: u128) -> u128 {
    whole * 1_000_000
}

pub fn acc(name: &str) -> AccountId {
    name.parse().unwrap()
}

pub struct Sim {
    pub c: Fullback,
    pub balances: HashMap<AccountId, u128>,
    pub registered: HashSet<AccountId>,
    pub now_sec: u64,
    pub logs: Vec<String>,
}

impl Sim {
    /// Contract deployed, every demo party registered on fEUR except `unregistered`.
    pub fn new_with_unregistered(unregistered: &[&str]) -> Self {
        let now_sec = START_SEC;
        set_context(CONTRACT, now_sec, vec![]);
        let c = Fullback::new(acc(FT));
        let mut registered = HashSet::new();
        for who in [
            CONTRACT, NORDVIK, PORTO, KOTA, DESA, CLUBZ, KEEPER, STRANGER,
        ] {
            if !unregistered.contains(&who) {
                registered.insert(acc(who));
            }
        }
        Sim {
            c,
            balances: HashMap::new(),
            registered,
            now_sec,
            logs: vec![],
        }
    }

    pub fn new() -> Self {
        Self::new_with_unregistered(&[])
    }

    pub fn advance(&mut self, secs: u64) {
        self.now_sec += secs;
    }

    pub fn mint(&mut self, who: &str, amount: u128) {
        *self.balances.entry(acc(who)).or_default() += amount;
    }

    pub fn balance(&self, who: &str) -> u128 {
        self.balances.get(&acc(who)).copied().unwrap_or(0)
    }

    pub fn register(&mut self, who: &str) {
        self.registered.insert(acc(who));
    }

    /// A contract call signed by `caller`. `Err` carries the panic message.
    pub fn call<T>(
        &mut self,
        caller: &str,
        f: impl FnOnce(&mut Fullback) -> T,
    ) -> Result<T, String> {
        set_context(caller, self.now_sec, vec![]);
        let result = catch_unwind(AssertUnwindSafe(|| f(&mut self.c)));
        match result {
            Ok(v) => {
                self.logs.extend(get_logs());
                self.run_receipts();
                Ok(v)
            }
            Err(e) => Err(panic_message(e)),
        }
    }

    /// `ft_transfer_call` on fEUR from `sender` to the contract. Returns the amount the
    /// contract kept, or the panic message (every token is then refunded).
    pub fn pay(&mut self, sender: &str, amount: u128, msg: Value) -> Result<u128, String> {
        self.pay_with_token(FT, sender, amount, msg)
    }

    pub fn pay_with_token(
        &mut self,
        token: &str,
        sender: &str,
        amount: u128,
        msg: Value,
    ) -> Result<u128, String> {
        let on_feur = token == FT;
        if on_feur {
            assert!(
                self.balance(sender) >= amount,
                "{sender} does not have enough fEUR"
            );
            self.move_tokens(sender, CONTRACT, amount);
        }
        set_context(token, self.now_sec, vec![]);
        let result = catch_unwind(AssertUnwindSafe(|| {
            self.c
                .ft_on_transfer(acc(sender), U128(amount), msg.to_string())
        }));
        match result {
            Ok(PromiseOrValue::Value(refund)) => {
                self.logs.extend(get_logs());
                self.run_receipts();
                if on_feur {
                    self.move_tokens(CONTRACT, sender, refund.0);
                }
                Ok(amount - refund.0)
            }
            Ok(PromiseOrValue::Promise(_)) => {
                panic!("ft_on_transfer is expected to return a value")
            }
            Err(e) => {
                if on_feur {
                    self.move_tokens(CONTRACT, sender, amount);
                }
                Err(panic_message(e))
            }
        }
    }

    fn move_tokens(&mut self, from: &str, to: &str, amount: u128) {
        if amount == 0 {
            return;
        }
        let from_balance = self.balances.entry(acc(from)).or_default();
        assert!(*from_balance >= amount, "{from} would go negative");
        *from_balance -= amount;
        *self.balances.entry(acc(to)).or_default() += amount;
    }

    /// Executes the receipts created by the last call: ft_transfer, then its callback.
    fn run_receipts(&mut self) {
        let mut last_transfer_ok = false;
        for receipt in get_created_receipts() {
            for action in receipt.actions {
                let MockAction::FunctionCallWeight {
                    method_name, args, ..
                } = action
                else {
                    continue;
                };
                let method = String::from_utf8(method_name).unwrap();
                let args: Value = serde_json::from_slice(&args).unwrap();
                match method.as_str() {
                    "ft_transfer" => {
                        assert_eq!(receipt.receiver_id, acc(FT), "payouts must go through fEUR");
                        let to = args["receiver_id"].as_str().unwrap().to_string();
                        let amount: u128 = args["amount"].as_str().unwrap().parse().unwrap();
                        last_transfer_ok = self.registered.contains(&acc(&to));
                        if last_transfer_ok {
                            self.move_tokens(CONTRACT, &to, amount);
                        }
                    }
                    "on_payout" => {
                        let result = if last_transfer_ok {
                            PromiseResult::Successful(vec![])
                        } else {
                            PromiseResult::Failed
                        };
                        set_context(CONTRACT, self.now_sec, vec![result]);
                        self.c.on_payout(
                            acc(args["account_id"].as_str().unwrap()),
                            U128(args["amount"].as_str().unwrap().parse().unwrap()),
                            args["deal_id"].as_u64(),
                        );
                        self.logs.extend(get_logs());
                    }
                    other => panic!("unexpected cross-contract call {other}"),
                }
            }
        }
    }

    pub fn deal(&self, deal_id: u64) -> fullback::DealView {
        self.c.get_deal(deal_id).expect("deal exists")
    }

    pub fn event_names(&self, deal_id: u64) -> Vec<String> {
        self.c
            .get_events(deal_id)
            .into_iter()
            .map(|e| e.event)
            .collect()
    }

    // ------------------------------------------------------------ Deal 1

    /// Deal 1: Porto Alegre FC buys Lucas from Nordvik IF for 10,000,000 fEUR in
    /// 4 x 2,500,000, collateral 2,500,000, sell-on 15%, Kota FC 4%, Akademi Desa 1%.
    pub fn create_deal1(&mut self) -> u64 {
        self.call(PORTO, |c| {
            c.create_deal(
                "lucas-1".to_string(),
                "Lucas".to_string(),
                acc(NORDVIK),
                U128(fe(10_000_000)),
                deal1_installments(),
                U128(fe(2_500_000)),
                1500,
                "gross".to_string(),
                deal1_training_clubs(),
                PDF_HASH.to_string(),
            )
        })
        .expect("create_deal")
    }

    /// Deal 1 approved and collateral deposited: Active at `now_sec`.
    pub fn active_deal1(&mut self) -> u64 {
        let id = self.create_deal1();
        self.mint(PORTO, fe(20_000_000));
        self.call(NORDVIK, |c| c.approve_deal(id)).expect("approve");
        self.pay(PORTO, fe(2_500_000), action("deposit_collateral", id))
            .expect("deposit");
        id
    }
}

pub fn deal1_installments() -> Vec<InstallmentInput> {
    (1..=4)
        .map(|i| InstallmentInput {
            amount: U128(fe(2_500_000)),
            due_offset_sec: 120 * i,
        })
        .collect()
}

pub fn deal1_training_clubs() -> Vec<TrainingClub> {
    vec![
        TrainingClub {
            account_id: acc(KOTA),
            name: "Kota FC".to_string(),
            bps: 400,
        },
        TrainingClub {
            account_id: acc(DESA),
            name: "Akademi Desa".to_string(),
            bps: 100,
        },
    ]
}

pub fn action(name: &str, deal_id: u64) -> Value {
    json!({ "action": name, "deal_id": deal_id })
}

fn set_context(predecessor: &str, now_sec: u64, promise_results: Vec<PromiseResult>) {
    testing_env!(
        VMContextBuilder::new()
            .current_account_id(acc(CONTRACT))
            .predecessor_account_id(acc(predecessor))
            .signer_account_id(acc(predecessor))
            .block_timestamp(now_sec * 1_000_000_000)
            .build(),
        test_vm_config(),
        RuntimeFeesConfig::test(),
        Default::default(),
        promise_results
    );
}

fn panic_message(e: Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = e.downcast_ref::<String>() {
        s.clone()
    } else if let Some(s) = e.downcast_ref::<&str>() {
        s.to_string()
    } else {
        "unknown panic".to_string()
    }
}
