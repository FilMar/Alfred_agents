---
tags: [skill, tb, ti, references, architecture]
sources: [conversation, SPEC.md@d8c9f7c, REVIEW.md@d8c9f7c, SPEC.md@67c44cc, tools/td/src/guides.ts, tools/tb/guide.md, tools/ti/guide.md, tools/common/cli.ts]
replaces: [skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills@c517871]
---

## Decision

`tb guide` prints what a good note is. `ti guide` prints what a good rule is. The text lives in `tools/tb/guide.md` and `tools/ti/guide.md`, next to the tool. A skill calls the command and never links the file.

The command reads a local file only. It needs no Qdrant and no Ollama. The path comes from `import.meta.url`, so it works from the symlink in `~/.local/bin`.

The guides keep what a note or a rule must be, and the checks before a save. They drop how a skill extracted them: the bridge of `platone` and the entry from `tl` of `mose`. One line of the old `tl` section stays in the rule guide: no rule from silence.

`aristotele` runs `tb guide` before any `tb save` and `ti guide` before any `ti add`. The agent runs `ti guide` before a `ti add` by hand.

## Why

The rules of a good note are the contract of the store, as syntax is the contract of `--help`. A skill holds the procedure and the tool holds the contract. This is the split `efesto` already sets.

A link from a skill into another skill's folder breaks when that skill goes. That happened: `aristotele` linked into `platone`. A command does not move.

Rejected: text in Qdrant. A note about how to write notes would pollute search. Rejected: the name `ti rules`. It reads like the rules themselves.

`td` puts both guides at the head of its extract and novelty prompts. It reads them from the files once, when it starts. A change to a guide reaches `td` with no new extractor row. The price: about 3000 tokens more per call, and two runs of the same extractor row are no longer exactly comparable when a guide changed between them.

## Cross-references

- [skill_census_platone_and_mose_removed_td_writes](skill_census_platone_and_mose_removed_td_writes) — why the guides left the skills
- [skill_convention_direct_cli](skill_convention_direct_cli) — skill holds procedure, CLI holds syntax
- [memory_td_config_enters_as_checked_json](memory_td_config_enters_as_checked_json) — why a prompt copy in the extractor freezes
