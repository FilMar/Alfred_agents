---
tags: [memory, distiller, td, config, contracts]
sources: [conversation, tools/td/src/config.ts, tools/td/src/registry.ts, tests/td_config.test.ts]
replaces: [memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy@ff370b9, memory_td_config_json_is_checked_on_both_sides_and_must_round_trip@3535181]
---

## Decision

The config of `td` has four types: `ModelConnection`, `Role`, `CriticCheck` and `Extractor`. None has a public constructor. `fromJson(raw: unknown)` is the only way in. Each has `toJson()`.

- `fromJson` has a precondition: the shape and the enums of `raw` are right. A wrong shape is a broken contract.
- The private constructor checks the ranges. It stores a frozen copy that holds only the known fields. No caller shares state with the config: `compat` and the list of checks are copied in, and `toJson` copies them out.
- The postcondition of `fromJson` is a round trip: the new object writes back the same JSON it came from. An extra field fails the round trip, so it is refused. A typo such as `temprature` is a missing field, and the shape check stops it.
- The postcondition of `toJson` compares the result with the state of the object. It does not call `fromJson`, or the two would call each other for ever.

The registry parses the text of the `config` column. A text that is not JSON is a world error for the registry, and it never reaches `fromJson`. A row whose config breaks `fromJson` stops `td` with the contract error of the config. The registry does not add the id of the row: the caller knows the id it asked for, and `"active"` names one row.

## Why

An extractor always arrives as JSON: from a file, from `td extractor add`, or from a row in `tl`. A public constructor would have no caller.

The config crosses a boundary. The repo rule is to check on both sides, so `fromJson` is the read side and the constructor is the write side.

The round trip is the oracle for the tests. The tests have no assert of their own. A body that drops a field or changes a value breaks the round trip, and the contract throws.

Immutable means nobody can change it, the caller included. The first body stored `compat` by reference and froze the JSON object of the caller. A copy fixes both.

The range of a value belongs to the callee. An invariant is checked once along a chain of calls, so `fromJson` does not repeat it.

Where it will likely break: a new field in `ExtractorJson` breaks the round trip of every old row. That needs a migration of the rows, not a better message.
