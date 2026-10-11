---
tags: [memory, distiller, td, registry, tl]
sources: [tools/td/src/registry.ts, tools/tl/src/client.ts]
---

## Decision

Component 2 of `td` is one class, `Version`. A `Version` is one row of the `extractor` table of `tl`, with its config already parsed into a checked `Extractor`.

- `Version.add(extractor, parent, why, now)` writes a new row and reads it back. A new version is inactive.
- `Version.read(id | "active")` gives the version, or `null` when `tl` answers 404: the id does not exist, or no version is active.
- `version.activate()` sets the row active in `tl` and reads it back.

Every other HTTP error goes up unchanged. A row whose config breaks `Extractor.fromJson` stops `td` with the contract error of the config. The registry does not catch it to add the row id.

## Why

**The name is `Version`, not `Extractor`.** `Extractor` already names the config in `td` and the row type in `tl`. A row is one version of the extractor: it has a `parent` and a `why`, and it never changes.

**I/O lives on the class.** The state is the row, so the reads and writes of the row sit next to it. The tl client stays the only code that speaks HTTP.

**A missing row is a world error.** `td extractor show 9` with no row 9, or a distill run before any version is active, is a normal answer, so it is `null`. A dead `tl` is not, so it throws.

**`add` and `activate` read the row back.** The data crosses a boundary, so it is checked on the way in and again on the way out. The read also proves that `read` finds what `add` wrote. A body where `read` always gives `null` breaks `add` at once.

**`read` has no assert of its own.** The tl client already checks the id and the row. An invariant is checked once along a call chain.

**No row id on a broken config.** [memory_td_config_json_is_checked_on_both_sides_and_must_round_trip](memory_td_config_json_is_checked_on_both_sides_and_must_round_trip) said the registry must add the id. It does not, and this decision wins on that point. The caller of `read(7)` knows it asked for 7, and `"active"` names one row. Catching a contract error only to add a fact the caller has is code with no payoff.

**Where it will likely break.** A new field in `ExtractorJson` breaks the round trip of every old row. That needs a migration of the rows, not a better message.

## Cross-references

- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 2
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the table it reads
- [memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy](memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy) — `fromJson`, the only way in
