---
tags: [style, contracts, ritchie, td]
sources: [conversation, tools/td/src/config.ts]
---

## Decision

A check that knows the shape or the rules of one type is a private static method of that class. Examples in `td`: `ModelConnection.#isJson(raw)` checks the JSON shape, and `ModelConnection.#fits(maxTokens, contextWindow)` checks the token limit.

A check that knows no domain goes to `tools/contract/contract.ts`.

A getter that only returns its private, immutable state has no contract. The constructor already checked that state.

## Why

Ritchie says that behaviour lives where the state lives, and that a helper lives where its knowledge lives. A free function at the end of the file has the knowledge of one class, but any code in the module can call it. A private static method keeps it inside the class. A reader finds the rule next to the state it guards.

The first config of `td` had all checks as free functions at the end of the file, and asserts on every getter. That made 547 lines for seven fields. The asserts on the getters checked again what the constructor had checked. Ritchie's rule "an invariant is checked once along a call chain" forbids that.

## Cross-references

- [style_contract_helpers_live_in_one_shared_module](style_contract_helpers_live_in_one_shared_module) — where checks with no domain go
- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 1 is the config
