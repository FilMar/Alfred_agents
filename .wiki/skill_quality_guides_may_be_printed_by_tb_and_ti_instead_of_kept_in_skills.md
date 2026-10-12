---
tags: [skill, idea, tb, ti, references, architecture]
sources: [conversation]
---

## Decision

This is an idea, not a rule. Nothing is built. The user wants to think about it.

The rules of a good note and a good rule could be printed by the tools. `tb guide` would print how to write a note. `ti guide` would print how to write a rule. The skills `platone`, `mose` and `aristotele` would call the command and keep no copy of the text. The distiller `td` could read the same source.

## Why

The rules of a good note are the contract of the store. They belong to `tb`, as syntax belongs to `--help`. A skill holds the procedure and the tool holds the contract. This is the split that `efesto` already sets.

It would also fix two problems found on 2026-10-12:

- The distiller writes notes but does not read `note_quality.md`.
- `aristotele` links into the folder of `platone`.

Points to settle before any code:

- **Where the text lives.** A file shipped with the tool, printed by the command. It does not live in Qdrant: a note about how to write notes would pollute search. The command should not need the network.
- **The cut.** `note_quality.md` mixes two things. What a note must be is the contract of `tb`. How to extract notes, and the serendipity bridge, belong to the skill. The same cut applies to `rule_quality.md`.
- **The name.** `ti rules` would print rules about rules, which reads like the rules themselves. `guide` avoids this.
- **The distiller.** The extractor is an immutable JSON row in `tl`. If its prompt holds a copy of the guide, the text is frozen and drifts again. Read at run time, or cite once: still open.

Cost: three tools and two texts to cut. That is code that stays, so it would go through `ritchie` with a SPEC.

## Cross-references

- [skill_quality_references_moved_into_platone_and_mose](skill_quality_references_moved_into_platone_and_mose) — the current state this idea would replace
- [skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it) — why the rules must outlive `platone`
- [skill_convention_direct_cli](skill_convention_direct_cli) — skill holds procedure, CLI holds syntax
- [memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy](memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy) — why a prompt copy in the extractor freezes
