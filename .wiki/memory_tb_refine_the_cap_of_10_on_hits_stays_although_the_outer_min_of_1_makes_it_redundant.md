---
tags: [memory, tb, refine, trust, formula]
sources: [tools/tb/SPEC.md@61cd4c3, tools/tb/REVIEW.md@61cd4c3]
---

## Decision

The cap of 10 on `hits` stays in the `trust` formula. It does no work today.

## Why

The formula has an outer `min(1, ...)`. With the base at 0.5 and the weight at 0.05, ten hits give exactly `0.5 + 0.05 * 10 = 1`. Any count above ten would already be cut to 1 by the outer `min`. No test can tell the two apart, and a mutant that removes the cap survives. It is an equivalent mutant, not a hole in the tests.

The cap on `hits_related` is different. With the weight at 0.02, ten related hits give 0.2, and the outer `min` does not cut it. A test pins that one.

The cap on `hits` stays for two reasons. The formula in the wiki says it. And the weights are guesses: if the base or the weight changes at the first dry run, the cap on `hits` starts to matter at once. Removing it now would be a change to a formula that is not fixed yet.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — the formula and its weights
