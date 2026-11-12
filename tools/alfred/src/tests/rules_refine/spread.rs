use crate::rules::refine::spread_of;

#[test]
#[should_panic(expected = "spread_of: every trust is between 0 and 1")]
fn spread_of_rejects_trust_out_of_range() {
    spread_of(&[0.5, 1.000001]);
}

#[test]
fn spread_of_one_bin_per_tenth() {
    let _ = spread_of(&[0.05, 0.15, 0.95]);
}

#[test]
fn spread_of_bins_add_up_to_total() {
    let _ = spread_of(&[0.25, 0.75, 1.0]);
}

#[test]
fn spread_of_total_counts_every_trust() {
    let _ = spread_of(&[0.1, 0.2, 0.3, 0.9]);
}

#[test]
fn spread_of_table() {
    let no_trusts: [f64; 0] = [];
    let empty = spread_of(&no_trusts);
    assert_eq!(empty.bins, vec![0u32; 10]);
    assert_eq!(empty.total, 0);
    assert_eq!(empty.below_floor, 0);

    let zero = spread_of(&[0.0]);
    assert_eq!(zero.bins, vec![1u32, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert_eq!(zero.total, 1);
    assert_eq!(zero.below_floor, 1);

    let one = spread_of(&[1.0]);
    assert_eq!(one.bins, vec![0u32, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    assert_eq!(one.total, 1);
    assert_eq!(one.below_floor, 0);

    let first_ninth = spread_of(&[0.09]);
    assert_eq!(first_ninth.bins, vec![1u32, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert_eq!(first_ninth.total, 1);
    assert_eq!(first_ninth.below_floor, 1);

    let tenth = spread_of(&[0.1]);
    assert_eq!(tenth.bins, vec![0u32, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert_eq!(tenth.total, 1);
    assert_eq!(tenth.below_floor, 1);

    let just_over_tenth = spread_of(&[0.11]);
    assert_eq!(just_over_tenth.bins, vec![0u32, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert_eq!(just_over_tenth.total, 1);
    assert_eq!(just_over_tenth.below_floor, 1);

    let under_floor = spread_of(&[0.1999999]);
    assert_eq!(under_floor.bins, vec![0u32, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert_eq!(under_floor.total, 1);
    assert_eq!(under_floor.below_floor, 1);

    let floor = spread_of(&[0.2]);
    assert_eq!(floor.bins, vec![0u32, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
    assert_eq!(floor.total, 1);
    assert_eq!(floor.below_floor, 0);

    let over_floor = spread_of(&[0.2000001]);
    assert_eq!(over_floor.bins, vec![0u32, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
    assert_eq!(over_floor.total, 1);
    assert_eq!(over_floor.below_floor, 0);

    let odd_tenths = spread_of(&[0.3, 0.7]);
    assert_eq!(odd_tenths.bins, vec![0u32, 0, 0, 1, 0, 0, 0, 1, 0, 0]);
    assert_eq!(odd_tenths.total, 2);
    assert_eq!(odd_tenths.below_floor, 0);

    let mixed = spread_of(&[0.0, 0.05, 0.15, 0.2, 0.25, 0.95, 1.0]);
    assert_eq!(mixed.bins, vec![2u32, 1, 2, 0, 0, 0, 0, 0, 0, 2]);
    assert_eq!(mixed.total, 7);
    assert_eq!(mixed.below_floor, 3);
}
