//! Deal 2 (resale with sell-on and Academy royalties) and the PDF fingerprint.

mod common;

use common::*;
use fullback::{DealKind, DealStatus};
use near_sdk::json_types::U128;

/// Deal 1 fully paid and collateral released.
fn completed_deal1(sim: &mut Sim) -> u64 {
    let id = sim.active_deal1();
    for _ in 0..4 {
        sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
            .unwrap();
    }
    sim.call(PORTO, |c| c.release_collateral(id)).unwrap();
    id
}

fn record_resale(sim: &mut Sim, caller: &str) -> Result<u64, String> {
    sim.call(caller, |c| {
        c.record_resale("lucas-1".into(), acc(CLUBZ), U128(fe(20_000_000)), None)
    })
}

#[test]
fn resale_payment_is_split_between_sell_on_academies_and_seller_in_one_transaction() {
    let mut sim = Sim::new();
    let deal1 = completed_deal1(&mut sim);
    let before: Vec<u128> = [NORDVIK, KOTA, DESA, PORTO]
        .iter()
        .map(|a| sim.balance(a))
        .collect();

    let deal2 = record_resale(&mut sim, PORTO).unwrap();
    sim.mint(CLUBZ, fe(20_000_000));
    sim.pay(CLUBZ, fe(20_000_000), action("pay_resale", deal2))
        .unwrap();

    assert_eq!(sim.balance(NORDVIK) - before[0], fe(3_000_000));
    assert_eq!(sim.balance(KOTA) - before[1], fe(800_000));
    assert_eq!(sim.balance(DESA) - before[2], fe(200_000));
    assert_eq!(sim.balance(PORTO) - before[3], fe(16_000_000));
    assert_eq!(sim.balance(CLUBZ), 0);
    assert_eq!(sim.balance(CONTRACT), 0);

    let d2 = sim.deal(deal2);
    assert_eq!(d2.kind, DealKind::Resale);
    assert_eq!(d2.parent_deal_id, Some(deal1));
    assert_eq!(d2.status, DealStatus::Completed);
    assert_eq!(d2.training_paid.0, fe(1_000_000));
    assert_eq!(sim.deal(deal1).status, DealStatus::Resold);

    let player = sim.c.get_player("lucas-1".into()).unwrap();
    assert_eq!(player.owner_id, acc(CLUBZ));
    assert_eq!(player.last_deal_id, deal2);
    assert_eq!(player.open_resale_deal_id, None);

    // The sell-on holder sees the resale in their deal list.
    let nordvik_deals = sim.c.list_deals_by_account(acc(NORDVIK), None, None);
    assert!(nordvik_deals.iter().any(|d| d.deal_id == deal2));
    assert!(sim.event_names(deal1).contains(&"resale_paid".to_string()));
}

#[test]
fn resale_before_deal1_is_completed_is_rejected() {
    let mut sim = Sim::new();
    let id = sim.active_deal1();
    sim.pay(PORTO, fe(2_500_000), action("pay_installment", id))
        .unwrap();

    let err = record_resale(&mut sim, PORTO).unwrap_err();

    assert!(err.contains("must be Completed before a resale"), "{err}");
    assert_eq!(sim.c.list_deals(None, None).len(), 1);
}

#[test]
fn resale_by_someone_other_than_the_current_owner_is_rejected() {
    let mut sim = Sim::new();
    completed_deal1(&mut sim);

    for caller in [NORDVIK, STRANGER, CLUBZ] {
        let err = record_resale(&mut sim, caller).unwrap_err();
        assert!(err.contains("Only the player's current owner"), "{err}");
    }
}

#[test]
fn only_the_new_buyer_can_pay_the_full_resale_fee() {
    let mut sim = Sim::new();
    completed_deal1(&mut sim);
    let deal2 = record_resale(&mut sim, PORTO).unwrap();
    sim.mint(STRANGER, fe(20_000_000));
    sim.mint(CLUBZ, fe(20_000_000));

    let err = sim
        .pay(STRANGER, fe(20_000_000), action("pay_resale", deal2))
        .unwrap_err();
    assert!(err.contains("Only the new buyer"), "{err}");
    let err = sim
        .pay(CLUBZ, fe(19_999_999), action("pay_resale", deal2))
        .unwrap_err();
    assert!(err.contains("less than the resale fee"), "{err}");
    let err = record_resale(&mut sim, PORTO).unwrap_err();
    assert!(err.contains("already open"), "{err}");

    assert_eq!(sim.balance(CLUBZ), fe(20_000_000));
    assert_eq!(sim.deal(deal2).status, DealStatus::Approved);
}

#[test]
fn verify_pdf_hash_matches_only_the_recorded_fingerprint() {
    let mut sim = Sim::new();
    let id = sim.create_deal1();

    assert!(sim.c.verify_pdf_hash(id, PDF_HASH.into()));
    assert!(sim.c.verify_pdf_hash(id, PDF_HASH.to_uppercase()));

    let mut tampered = PDF_HASH.to_string();
    tampered.replace_range(0..1, "4");
    assert!(!sim.c.verify_pdf_hash(id, tampered));
    assert!(!sim.c.verify_pdf_hash(99, PDF_HASH.into()));
    // An id above u32::MAX must not wrap around to deal 0.
    assert!(!sim.c.verify_pdf_hash(id + (1 << 32), PDF_HASH.into()));
    assert!(sim.c.get_deal(id + (1 << 32)).is_none());
}

#[test]
fn create_deal_rejects_a_malformed_pdf_hash() {
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
                "gross".into(),
                deal1_training_clubs(),
                "abc".into(),
            )
        })
        .unwrap_err();
    assert!(err.contains("pdf_hash must be"), "{err}");
}

#[test]
fn a_player_id_can_only_be_used_by_one_primary_deal() {
    let mut sim = Sim::new();
    sim.create_deal1();
    let err = sim
        .call(PORTO, |c| {
            c.create_deal(
                "lucas-1".into(),
                "Lucas".into(),
                acc(NORDVIK),
                U128(fe(10_000_000)),
                deal1_installments(),
                U128(fe(2_500_000)),
                1500,
                "gross".into(),
                deal1_training_clubs(),
                PDF_HASH.into(),
            )
        })
        .unwrap_err();
    assert!(err.contains("already registered"), "{err}");
}
