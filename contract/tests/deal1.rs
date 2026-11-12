//! Deal 1: installments, collateral, Academy royalties, and failed payouts.

mod common;

use common::*;
use fullback::{DealStatus, InstallmentInput, SettleOutcome, SettleResult, TrainingClub};
use near_sdk::json_types::U128;

fn settle(sim: &mut Sim, id: u64) -> SettleOutcome {
    sim.call(KEEPER, |c| c.settle_due(id))
        .expect("settle_due never panics")
}

#[test]
fn installment_paid_on_time_is_split_between_seller_and_academies() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    assert_eq!(sim.deal(id).status, DealStatus::Active);

    let kept = sim
        .pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();

    assert_eq!(kept, fe(2_500_000));
    assert_eq!(sim.balance(NORDVIK), fe(2_375_000));
    assert_eq!(sim.balance(KOTA), fe(100_000));
    assert_eq!(sim.balance(DESA), fe(25_000));
    let deal = sim.deal(id);
    assert_eq!(deal.installments_paid, 1);
    assert_eq!(deal.training_paid.0, fe(125_000));
    assert!(!deal.needs_top_up);
    // Only the collateral is left in the contract.
    assert_eq!(sim.balance(CONTRACT), fe(2_500_000));
}

#[test]
fn overdue_installment_is_paid_from_collateral_and_buyer_must_top_up() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();

    sim.advance(240); // installment 2 is due
    let outcome = settle(&mut sim, id);

    assert_eq!(
        outcome,
        SettleOutcome {
            result: SettleResult::PaidFromCollateral,
            installment_index: Some(1)
        }
    );
    let deal = sim.deal(id);
    assert_eq!(deal.collateral_balance.0, 0);
    assert!(deal.needs_top_up);
    assert!(deal.installments[1].paid_from_collateral);
    assert_eq!(deal.collateral_used_count, 1);
    assert_eq!(sim.balance(NORDVIK), fe(2_375_000) * 2);
    assert_eq!(sim.balance(KOTA), fe(100_000) * 2);
    assert_eq!(sim.balance(DESA), fe(25_000) * 2);
    assert_eq!(sim.balance(CONTRACT), 0);
}

#[test]
fn overdue_installment_without_collateral_defaults_and_moves_no_money() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();
    sim.advance(240);
    settle(&mut sim, id);
    let before = sim.balances.clone();

    sim.advance(120); // installment 3 is due, no top up
    let outcome = settle(&mut sim, id);

    assert_eq!(
        outcome,
        SettleOutcome {
            result: SettleResult::Defaulted,
            installment_index: Some(2)
        }
    );
    assert_eq!(sim.deal(id).status, DealStatus::Defaulted);
    assert!(!sim.deal(id).needs_top_up);
    assert_eq!(sim.balances, before);
    // The buyer can no longer pay into a defaulted deal.
    assert!(sim
        .pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .is_err());
    assert_eq!(sim.balances, before);
}

#[test]
fn settle_due_before_the_due_date_does_nothing() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    sim.advance(119);
    let before = sim.balances.clone();

    let outcome = settle(&mut sim, id);

    assert_eq!(
        outcome,
        SettleOutcome {
            result: SettleResult::NotDue,
            installment_index: Some(0)
        }
    );
    assert_eq!(sim.balances, before);
    assert_eq!(sim.deal(id).collateral_balance.0, fe(2_500_000));
}

#[test]
fn settle_due_twice_for_the_same_installment_pays_once() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();
    sim.advance(240);

    settle(&mut sim, id);
    let after_first = sim.balances.clone();
    let second = settle(&mut sim, id);

    assert_eq!(second.result, SettleResult::NotDue);
    assert_eq!(sim.balances, after_first);
    assert_eq!(sim.deal(id).installments_paid, 2);
}

#[test]
fn settle_due_on_a_deal_that_is_not_active_does_nothing() {
    let mut sim = Sim::new();
    let id = sim.create_deal1();
    sim.advance(10_000);
    assert_eq!(settle(&mut sim, id).result, SettleResult::NotActive);
}

#[test]
fn tokens_other_than_feur_are_rejected_and_returned() {
    let mut sim = Sim::new();
    let id = sim.create_deal1();
    sim.call(NORDVIK, |c| c.approve_deal(id)).unwrap();

    let err = sim
        .pay_with_token(
            "fake-eur.testnet",
            PORTO,
            fe(2_500_000),
            action("deposit_collateral", id),
        )
        .unwrap_err();

    assert!(
        err.contains("Only the official fEUR token is accepted"),
        "{err}"
    );
    assert_eq!(sim.deal(id).status, DealStatus::Approved);
    assert_eq!(sim.deal(id).collateral_balance.0, 0);
}

#[test]
fn create_deal_rejects_installments_that_do_not_add_up_to_the_price() {
    let mut sim = Sim::new();
    let mut installments = deal1_installments();
    installments[3] = InstallmentInput {
        amount: U128(fe(2_000_000)),
        due_offset_sec: 480,
    };

    let err = sim
        .call(PORTO, |c| {
            c.create_deal(
                "lucas-x".into(),
                "Lucas".into(),
                acc(NORDVIK),
                U128(fe(10_000_000)),
                installments,
                U128(fe(2_500_000)),
                1500,
                "gross".into(),
                deal1_training_clubs(),
                PDF_HASH.into(),
            )
        })
        .unwrap_err();

    assert!(
        err.contains("Installments must add up to the price"),
        "{err}"
    );
    assert!(sim.c.list_deals(None, None).is_empty());
}

#[test]
fn create_deal_rejects_academy_royalties_above_five_percent() {
    let mut sim = Sim::new();
    let mut clubs = deal1_training_clubs();
    clubs[1] = TrainingClub {
        account_id: acc(DESA),
        name: "Akademi Desa".into(),
        bps: 101,
    };

    let err = sim
        .call(PORTO, |c| {
            c.create_deal(
                "lucas-x".into(),
                "Lucas".into(),
                acc(NORDVIK),
                U128(fe(10_000_000)),
                deal1_installments(),
                U128(fe(2_500_000)),
                1500,
                "gross".into(),
                clubs,
                PDF_HASH.into(),
            )
        })
        .unwrap_err();

    assert!(
        err.contains("Academy royalties cannot exceed 500 bps"),
        "{err}"
    );
}

#[test]
fn create_deal_rejects_more_training_clubs_than_one_payment_can_pay_out() {
    let mut sim = Sim::new();
    // Six clubs at 50 bps stay under 500 bps but exceed the club limit.
    let clubs: Vec<TrainingClub> = (1..=6)
        .map(|i| TrainingClub {
            account_id: acc(&format!("academy{i}.testnet")),
            name: format!("Academy {i}"),
            bps: 50,
        })
        .collect();

    let err = sim
        .call(PORTO, |c| {
            c.create_deal(
                "lucas-x".into(),
                "Lucas".into(),
                acc(NORDVIK),
                U128(fe(10_000_000)),
                deal1_installments(),
                U128(fe(2_500_000)),
                1500,
                "gross".into(),
                clubs,
                PDF_HASH.into(),
            )
        })
        .unwrap_err();

    assert!(err.contains("Too many training clubs"), "{err}");
}

#[test]
fn create_deal_rejects_a_net_sell_on_basis() {
    let mut sim = Sim::new();
    let err = sim
        .call(PORTO, |c| {
            c.create_deal(
                "lucas-x".into(),
                "Lucas".into(),
                acc(NORDVIK),
                U128(fe(10_000_000)),
                deal1_installments(),
                U128(fe(2_500_000)),
                1500,
                "net".into(),
                deal1_training_clubs(),
                PDF_HASH.into(),
            )
        })
        .unwrap_err();
    assert!(
        err.contains("Only a gross sell-on basis is supported"),
        "{err}"
    );
}

#[test]
fn only_the_seller_can_approve() {
    let mut sim = Sim::new();
    let id = sim.create_deal1();

    for caller in [PORTO, STRANGER] {
        let err = sim.call(caller, |c| c.approve_deal(id)).unwrap_err();
        assert!(
            err.contains("Only the seller can approve this deal"),
            "{err}"
        );
    }
    assert_eq!(sim.deal(id).status, DealStatus::Proposed);
}

#[test]
fn collateral_cannot_be_deposited_before_approval_or_partially() {
    let mut sim = Sim::new();
    let id = sim.create_deal1();
    sim.mint(PORTO, fe(5_000_000));

    let err = sim
        .pay(PORTO, fe(2_500_000), action("deposit_collateral", id))
        .unwrap_err();
    assert!(err.contains("approved by the seller first"), "{err}");

    sim.call(NORDVIK, |c| c.approve_deal(id)).unwrap();
    let err = sim
        .pay(PORTO, fe(2_499_999), action("deposit_collateral", id))
        .unwrap_err();
    assert!(
        err.contains("Collateral must be deposited in full"),
        "{err}"
    );

    assert_eq!(sim.balance(PORTO), fe(5_000_000));
    assert_eq!(sim.deal(id).status, DealStatus::Approved);
}

#[test]
fn overpaying_an_installment_refunds_the_rest_to_the_buyer() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    let before = sim.balance(PORTO);

    let kept = sim
        .pay(PORTO, fe(3_000_000), action("pay_installment", id))
        .unwrap();

    assert_eq!(kept, fe(2_500_000));
    assert_eq!(sim.balance(PORTO), before - fe(2_500_000));
    assert_eq!(sim.deal(id).installments_paid, 1);
}

#[test]
fn underpaying_an_installment_is_rejected() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    let before = sim.balances.clone();

    let err = sim
        .pay(PORTO, fe(2_499_999), action("pay_installment", id))
        .unwrap_err();

    assert!(err.contains("less than the installment"), "{err}");
    assert_eq!(sim.balances, before);
}

#[test]
fn only_the_buyer_can_pay_installments() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    sim.mint(STRANGER, fe(2_500_000));
    let err = sim
        .pay(STRANGER, fe(2_500_000), action("pay_installment", id))
        .unwrap_err();
    assert!(err.contains("Only the buyer can pay installments"), "{err}");
    assert_eq!(sim.balance(STRANGER), fe(2_500_000));
}

#[test]
fn all_four_installments_and_released_collateral_leave_nothing_in_the_contract() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    let start = sim.balance(PORTO) + fe(2_500_000);

    for _ in 0..4 {
        sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
            .unwrap();
    }
    assert_eq!(sim.deal(id).status, DealStatus::Completed);
    sim.call(PORTO, |c| c.release_collateral(id)).unwrap();

    assert_eq!(sim.balance(NORDVIK), fe(9_500_000));
    assert_eq!(sim.balance(KOTA), fe(400_000));
    assert_eq!(sim.balance(DESA), fe(100_000));
    assert_eq!(sim.balance(PORTO), start - fe(10_000_000));
    assert_eq!(sim.balance(CONTRACT), 0);
    assert_eq!(sim.deal(id).collateral_balance.0, 0);
}

#[test]
fn full_story_with_collateral_used_and_topped_up_ends_with_the_same_split() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    let start = sim.balance(PORTO) + fe(2_500_000);

    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();
    sim.advance(240);
    settle(&mut sim, id);
    assert!(sim.deal(id).needs_top_up);

    sim.pay(PORTO, fe(2_500_000), action("top_up_collateral", id))
        .unwrap();
    assert!(!sim.deal(id).needs_top_up);
    assert_eq!(sim.deal(id).collateral_balance.0, fe(2_500_000));

    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();
    assert_eq!(sim.deal(id).status, DealStatus::Completed);
    sim.call(PORTO, |c| c.release_collateral(id)).unwrap();

    assert_eq!(sim.balance(NORDVIK), fe(9_500_000));
    assert_eq!(sim.balance(KOTA), fe(400_000));
    assert_eq!(sim.balance(DESA), fe(100_000));
    assert_eq!(sim.balance(PORTO), start - fe(10_000_000));
    assert_eq!(sim.balance(CONTRACT), 0);
    assert_eq!(
        sim.event_names(id),
        [
            "deal_created",
            "deal_approved",
            "collateral_deposited",
            "installment_paid",
            "installment_paid",
            "collateral_topped_up",
            "installment_paid",
            "installment_paid",
            "deal_completed",
            "collateral_released",
        ]
    );
}

#[test]
fn top_up_must_restore_the_full_collateral() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    let err = sim
        .pay(PORTO, fe(1), action("top_up_collateral", id))
        .unwrap_err();
    assert!(err.contains("Collateral is already full"), "{err}");

    sim.advance(120);
    settle(&mut sim, id);
    let err = sim
        .pay(PORTO, fe(1_000_000), action("top_up_collateral", id))
        .unwrap_err();
    assert!(err.contains("restore the full collateral"), "{err}");

    let kept = sim
        .pay(PORTO, fe(3_000_000), action("top_up_collateral", id))
        .unwrap();
    assert_eq!(kept, fe(2_500_000));
}

#[test]
fn collateral_cannot_be_released_before_the_deal_is_completed() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    let err = sim.call(PORTO, |c| c.release_collateral(id)).unwrap_err();
    assert!(err.contains("after the last installment is paid"), "{err}");
}

#[test]
fn failed_payout_is_kept_as_pending_and_can_be_claimed() {
    let mut sim = Sim::new_with_unregistered(&[DESA]);
    let id = sim.active_deal1();

    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();

    assert_eq!(sim.balance(DESA), 0);
    assert_eq!(sim.c.get_pending(acc(DESA)).0, fe(25_000));
    assert!(sim.event_names(id).contains(&"payout_failed".to_string()));
    assert!(sim
        .logs
        .iter()
        .any(|l| l.starts_with("EVENT_JSON:") && l.contains("\"payout_failed\"")));
    // The other recipients were paid normally.
    assert_eq!(sim.balance(NORDVIK), fe(2_375_000));

    sim.register(DESA);
    sim.call(DESA, |c| c.claim_pending()).unwrap();

    assert_eq!(sim.balance(DESA), fe(25_000));
    assert_eq!(sim.c.get_pending(acc(DESA)).0, 0);
    let err = sim.call(DESA, |c| c.claim_pending()).unwrap_err();
    assert!(err.contains("Nothing pending"), "{err}");
}

#[test]
fn failed_claim_returns_the_amount_to_pending() {
    let mut sim = Sim::new_with_unregistered(&[DESA]);
    let id = sim.active_deal1();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();

    sim.call(DESA, |c| c.claim_pending()).unwrap();

    assert_eq!(sim.c.get_pending(acc(DESA)).0, fe(25_000));
    assert_eq!(sim.balance(DESA), 0);
}

#[test]
fn installments_may_be_paid_before_they_are_due() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();
    let deal = sim.deal(id);
    assert_eq!(deal.installments_paid, 2);
    assert_eq!(deal.next_due_index, Some(2));
    assert_eq!(
        deal.next_due_at_ns.unwrap().0,
        (START_SEC + 360) * 1_000_000_000
    );
}

#[test]
fn deals_are_listed_per_account() {
    let mut sim = Sim::new();
    let id = sim.create_deal1();
    for who in [NORDVIK, PORTO, KOTA, DESA] {
        let deals = sim.c.list_deals_by_account(acc(who), None, None);
        assert_eq!(deals.len(), 1, "{who}");
        assert_eq!(deals[0].deal_id, id);
    }
    assert!(sim
        .c
        .list_deals_by_account(acc(STRANGER), None, None)
        .is_empty());
    assert_eq!(sim.c.list_deals(None, None).len(), 1);
}
