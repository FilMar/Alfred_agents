---
tags: [memory, distiller, td, config, contracts]
sources: [conversation, tools/td/src/config.ts, tests/td_config.test.ts]
---

## Decision

The config of `td` has four types: `ModelConnection`, `Role`, `CriticCheck` and `Extractor`. None has a public constructor. `fromJson(raw: unknown)` is the only way in.

- `fromJson` checks the shape of the JSON.
- The private constructor checks the ranges. It stores a frozen copy that holds only the known fields.
- An extra field in the JSON does not reach the state. The round trip in `fromJson` then fails, so the extra field is refused with a contract error.
- No caller shares state with the config. `compat` and the list of checks are copied in, and `toJson` and `toPiModel` copy them out.

Commit `edf8989`. The round trip rule itself is in [memory_td_config_json_is_checked_on_both_sides_and_must_round_trip](memory_td_config_json_is_checked_on_both_sides_and_must_round_trip), and it stays live.

## Why

**An extractor always arrives as JSON.** It comes from a file, through `td extractor add`, or from a row in `tl`. A public constructor would have no caller today.

**A typo must not pass in silence.** A key like `temprature` is missing a required field, so the shape check stops it. A key that is only extra would be kept and written back. With the known fields only, the round trip catches it.

**Immutable means nobody can change it, the caller included.** The first body stored `compat` by reference. The contract on `toJson` caught it: the returned JSON shared `compat` with the connection. The first body also froze the caller's own JSON object. A copy fixes both.

## Cross-references

- [memory_td_config_json_is_checked_on_both_sides_and_must_round_trip](memory_td_config_json_is_checked_on_both_sides_and_must_round_trip) — shape in the guard, range in the callee, round trip
- [style_type_checks_are_private_static_methods_of_their_class](style_type_checks_are_private_static_methods_of_their_class) — where the checks live; getters have no contract
- [memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it](memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it) — the drop rule of a check
- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 1
