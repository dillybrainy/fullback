//! fEUR: a mock euro token (NEP-141, 6 decimals) for the FULLBACK testnet demo.
//! 1 fEUR stands for €1. Only the owner can mint, so demo accounts can be refilled.

use near_contract_standards::fungible_token::events::FtMint;
use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC,
};
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore, FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, PromiseOrValue};

pub const DECIMALS: u8 = 6;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Feur {
    token: FungibleToken,
    metadata: FungibleTokenMetadata,
    owner_id: AccountId,
}

#[near]
impl Feur {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            token: FungibleToken::new(b"t".to_vec()),
            metadata: FungibleTokenMetadata {
                spec: FT_METADATA_SPEC.to_string(),
                name: "Fullback Euro (testnet)".to_string(),
                symbol: "fEUR".to_string(),
                icon: None,
                reference: None,
                reference_hash: None,
                decimals: DECIMALS,
            },
            owner_id,
        }
    }

    /// Owner only. The receiving account must already be registered (storage_deposit).
    pub fn mint(&mut self, account_id: AccountId, amount: U128) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only the token owner can mint"
        );
        require!(amount.0 > 0, "Amount must be positive");
        self.token.internal_deposit(&account_id, amount.0);
        FtMint {
            owner_id: &account_id,
            amount,
            memo: Some("mint"),
        }
        .emit();
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner_id.clone()
    }
}

#[near]
impl FungibleTokenCore for Feur {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for Feur {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used, _burned) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        used.into()
    }
}

#[near]
impl StorageManagement for Feur {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.internal_storage_unregister(force).is_some()
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for Feur {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn acc(name: &str) -> AccountId {
        name.parse().unwrap()
    }

    fn as_caller(caller: &str, deposit: NearToken) {
        testing_env!(VMContextBuilder::new()
            .current_account_id(acc("feur.testnet"))
            .predecessor_account_id(acc(caller))
            .attached_deposit(deposit)
            .build());
    }

    fn setup() -> Feur {
        as_caller("owner.testnet", NearToken::from_yoctonear(0));
        let mut t = Feur::new(acc("owner.testnet"));
        let bound = t.storage_balance_bounds().min;
        for who in ["owner.testnet", "buyer.testnet"] {
            as_caller(who, bound);
            t.storage_deposit(None, None);
        }
        t
    }

    #[test]
    fn owner_can_mint() {
        let mut t = setup();
        as_caller("owner.testnet", NearToken::from_yoctonear(0));
        t.mint(acc("buyer.testnet"), U128(2_500_000_000_000));
        assert_eq!(t.ft_balance_of(acc("buyer.testnet")).0, 2_500_000_000_000);
        assert_eq!(t.ft_total_supply().0, 2_500_000_000_000);
        assert_eq!(t.ft_metadata().decimals, 6);
        assert_eq!(t.ft_metadata().symbol, "fEUR");
    }

    #[test]
    #[should_panic(expected = "Only the token owner can mint")]
    fn mint_by_non_owner_is_rejected() {
        let mut t = setup();
        as_caller("buyer.testnet", NearToken::from_yoctonear(0));
        t.mint(acc("buyer.testnet"), U128(1));
    }

    #[test]
    #[should_panic]
    fn mint_to_unregistered_account_is_rejected() {
        let mut t = setup();
        as_caller("owner.testnet", NearToken::from_yoctonear(0));
        t.mint(acc("stranger.testnet"), U128(1));
    }
}
