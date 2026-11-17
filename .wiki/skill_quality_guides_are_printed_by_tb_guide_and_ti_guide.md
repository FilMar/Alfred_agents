---
tags: [skill, tb, ti, references, architecture]
sources: [conversation, SPEC.md@d8c9f7c, REVIEW.md@d8c9f7c, SPEC.md@67c44cc, tools/alfred/src/rules/guide.md, tools/alfred/src/rules/cli.rs, tools/alfred/src/distill/extract.rs, tools/td/src/guides.ts@last-typescript, tools/tb/guide.md@last-typescript]
replaces: [skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills@c517871]
---

## Decision

`alfred rules guide` prints what a good rule is. The text lives in `tools/alfred/src/rules/guide.md`, next to the code of the rules. The note guide went away with `tb`. A skill calls the command and never links the file.

The command needs no server, no Qdrant and no Ollama. The text is built into the binary with `include_str!`, so no path is looked up at run time.

The guide keeps what a rule must be, and the checks before a save. It drops how a skill extracted rules: the bridge of `platone` and the entry from `tl` of `mose`. One line of the old `tl` section stays: no rule from silence.

`aristotele` runs `alfred rules guide` before any `alfred rules add`. The agent does the same before an `alfred rules add` by hand.

## Why

What makes a good rule is the contract of the store, as syntax is the contract of `--help`. A skill holds the procedure and the tool holds the contract. This is the split `efesto` already sets.

A link from a skill into another skill's folder breaks when that skill goes. That happened: `aristotele` linked into `platone`. A command does not move.

Rejected: text in Qdrant. A rule about how to write rules would pollute search. Rejected: the name `ti rules`. It reads like the rules themselves.

The distiller in `alfred serve` puts the rule guide at the head of its extract and novelty prompts. The guide is built into the binary, so a change reaches the distiller with a new build and no new extractor row. The price is more tokens per call: about 3000 with the two guides of `td`. Also, two runs of the same extractor row stop being exactly comparable when a guide changed between them.

## Cross-references

- [skill_census_platone_and_mose_removed_td_writes](skill_census_platone_and_mose_removed_td_writes) — why the guides left the skills
- [skill_convention_direct_cli](skill_convention_direct_cli) — skill holds procedure, CLI holds syntax
- [memory_td_config_enters_as_checked_json](memory_extractor_row_4_has_rules_only_roles) — why a prompt copy in the extractor freezes
