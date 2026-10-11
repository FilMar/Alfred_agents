---
tags: [skill, ritchie, typescript, structs]
sources: [skills/ritchie/SKILL.md, skills/ritchie/references/languages.md, skills/ritchie/references/rules.md]
---

## Decision

In TypeScript, a ritchie value is a `Readonly` type plus the functions that build it or derive a new one from it. The functions carry the contracts. Fields are read directly, with no getter. A brand makes the type opaque only where an invariant must hold for every value. A class is kept for a value that owns a resource or a connection.

The general rule in `SKILL.md` changes from "fields are private, always" to "a value is immutable, and only its own contracted functions build or change it". Privacy protects the write, not the read.

## Why

**The idea came from Rust.** There a struct holds data and functions, and a private field is the only way to stop a write and force one constructor. The user's intent was never "a class for everything". It was: types are not changed by hand, and dedicated functions with contracts manipulate them.

**The old mechanism map overshot.** It mapped Rust privacy to `#field` plus a getter in TypeScript. In `tools/td` this turned a pipeline of immutable values into classes with private state, frozen copies and one getter per field. Phase 0b grew from about 15 lines of spike to 170. `readonly` already stops the write at compile time, so the class added code and no guarantee.

**The brand covers the one real gap.** Without privacy, any literal can skip the constructor. A branded type makes that a compile error, for one line, where it matters.

**Old code.** The `td` components written before this decision stay as they are. They are converted when touched.

## Cross-references

- [skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role](skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role) — the rest of the ritchie workflow
- [memory_td_episodes_split_a_session_in_one_call_checked_for_full_cover_and_listed_as_json_strings](memory_td_episodes_split_a_session_in_one_call_checked_for_full_cover_and_listed_as_json_strings) — the 170-line case
