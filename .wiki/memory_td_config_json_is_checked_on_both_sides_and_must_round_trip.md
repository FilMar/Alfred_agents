---
tags: [memory, distiller, td, config, contracts]
sources: [conversation, tools/td/src/config.ts, tests/td_config.test.ts]
---

## Decision

Every config class (`Question`, `ModelSpec`, `Call`, `ExtractorConfig`) has `toJson()` and `static fromJson(raw: unknown)`.

- `fromJson` has a precondition: the shape and the enums of `raw` are right. A wrong shape is a broken contract. The ranges (a threshold from 0 to 1, a non-blank name) are checked by the `new` or `of` that `fromJson` calls.
- The postcondition of `fromJson` is a round trip: the new object writes back the same JSON it came from.
- The postcondition of `toJson` compares the result with the object's own state. It does not call `fromJson`, or the two would call each other without end.

The registry (component 2) parses the text of the `config` column. A text that is not JSON is a world error for the registry. It never reaches `fromJson`.

## Why

**The config crosses a boundary.** It is written to `tl` and read back later. The repo rule is to check on both sides, so `fromJson` is the read side and the constructor is the write side.

**The round trip is the oracle for the tests.** The tests have no assert of their own. A body that drops a field or changes a value breaks the round trip, and the contract throws.

**Shape in the guard, range in the callee.** An invariant is checked once along a chain. The range of a probability belongs to `Probability.of`, so `fromJson` does not repeat it.

**Where it will likely break.** A broken row in the database stops `td` with a contract error and no hint of which row. The registry must add the id of the extractor when it reads.

## Cross-references

- [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register](memory_distiller_is_its_own_tool_td_and_tl_stays_the_register) — `td` checks the config, `tl` only stops broken JSON
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the column that holds it
- [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) — the shape of the messages
