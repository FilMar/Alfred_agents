---
tags: [skill, references, platone, mose]
sources: [conversation]
---

## Decision

The folder `skills/references/` is gone. Its two files moved into the skill that uses each one, with `git mv`:

- `note_quality.md` to `skills/platone/references/`
- `rule_quality.md` to `skills/mose/references/`

The links in `platone` and `mose` are now relative to their own folder. The move is staged in git, not yet committed.

This is the current state only. The next page proposes a different home for the same text.

## Why

The folder was shared with `erodoto`, which is removed. After that, each file had one user, so it belongs inside that skill.

One exception: `aristotele` also links to `note_quality.md`. Its link now points to `../platone/references/note_quality.md`. The text is not copied, because a copy is a second source that drifts. The cost is a link from one skill into another. It goes away when `aristotele` or `platone` is retired.

## Cross-references

- [skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills](skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills) — a different home for the same text
- [skill_erodoto_removed_because_td_replaces_it_and_it_only_batched_platone_and_mose](skill_erodoto_removed_because_td_replaces_it_and_it_only_batched_platone_and_mose) — why the folder lost its shared use
- [skill_convention_direct_cli](skill_convention_direct_cli) — the layout of a skill folder
