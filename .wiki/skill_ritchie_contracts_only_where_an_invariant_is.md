---
tags: [skill, ritchie, dijkstra, contracts, tests]
sources: [conversation, skills/ritchie/SKILL.md, skills/ritchie/references/principles.md]
---

## Decision

A contract exists where an invariant exists. A function with an invariant checks it: preconditions first, postconditions before the one exit. A function with no invariant has no contract and no test of its own.

Contracts and tests are not a goal. The goal is that every invariant is checked once, at the place that owns it.

## Why

The user set the rule after the cleanup of distill part C. A cut left `apply` with no assert. Its one precondition repeated the postcondition of `judge` on the same call chain. Under "every function carries a contract", that looked like a defect. Under this rule it is correct: `apply` owns no invariant.

The same reading found a real gap. `save_rule` checked "no id means a session item was skipped", but not the other way. The fix made the postcondition exact: no id exactly when it skips a session item.

It settles the open question between "every function has a contract" and "one invariant is checked once along a call chain". The second rule wins, and a function can end with no contract.

## Cross-references

- [skill_dijkstra_proves_owner_rules_against_baseline](skill_dijkstra_proves_owner_rules_against_baseline) — dijkstra measures cuts against the owner rules
- [skill_dijkstra_cuts_weak_tests_never_strengthens_them](skill_dijkstra_cuts_weak_tests_never_strengthens_them) — a test that cannot fail goes
