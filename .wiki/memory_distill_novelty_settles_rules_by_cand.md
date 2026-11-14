---
tags: [memory, distiller, alfred, novelty]
sources: [spec.json@6af63cb, review.json@6af63cb, tools/alfred/src/distill/novelty.rs]
---

## Decision

The novelty judge of the Rust distiller sees only rules. A `Ruling` is `new`, `duplicate` or `append`. `settle()` turns an `append` with no `do` into a `duplicate`. There is no `extends`, `contradicts` or `ref_only`, and no check across kinds.

`verdicts_check()` asks for one verdict per `cand`, each `cand` once and in range. `settle()` matches each verdict to its candidate by `cand`, not by its place in the list.

## Why

The distiller in `alfred serve` writes rules and no notes, so the note verdicts have nothing to act on.

The first body matched verdicts by their place in the list. A model that answers in another order gave a verdict to the wrong candidate, and the generated tests did not see it. The review found it. `td` matches by `cand` too. Two tests now fix the order.

## Cross-references

- [memory_td_ref_only_saves_nothing_because_a_ref_needs_two_notes](memory_td_ref_only_saves_nothing_because_a_ref_needs_two_notes) — the note verdicts of `td`
- [memory_novelty_stays_with_the_judge_not_a_vector_cutoff](memory_novelty_stays_with_the_judge_not_a_vector_cutoff) — why a judge and not a cutoff
