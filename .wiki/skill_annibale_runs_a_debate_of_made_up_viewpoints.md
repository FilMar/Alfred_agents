---
tags: [skill, annibale, th, debate]
sources: [conversation, .design/main.md, skills/annibale/SKILL.md, skills/annibale/scripts/debate.sh]
---

## Decision

`annibale` does one thing: an agentic debate on one problem. It is not a general orchestrator any more.

- Annibale writes a brief that holds the whole problem. It makes two to four viewpoints on the fly. A viewpoint is a hat plus a stance written for this problem: who the voice is, what it cares about, what it cannot see.
- `scripts/debate.sh` runs the voices in parallel. They do not see each other, and each answers with a position, the reasons, and what would change its mind. Blue then writes the agreement, the tensions, one recommendation and the tripwires.
- One round. The voices answer on their own, then one synthesis is written.
- Voices run in the run directory, not in the project, and are told to use no tools. This limits what they see. It is not a sandbox.
- Annibale decides nothing. If the decision should stay, `omero` Ingest takes the conversation as its source.

Removed: the `tdd-coding` flow, the Socratic `debate` flow, the parallel pattern, and the free sequential flows.

## Why

`tdd-coding` did what `ritchie`, `piano` and `omero` now do, with generic hats as coders. The Socratic debate belongs to `socrate`, which may become a `ti` rule. The council had real results: it produced the MCP decision and the extractor comparison.

The old script had a default synthesiser that no longer existed, and no way to give each voice its own stance. Both are fixed.

Studies find that debate often does not beat one agent, that model diversity helps, and that extra rounds can make voices converge. Alfredo builds chains of independent agents. So the voices are independent, hats differ, and there is one round.

Named experts that live in `.expert/` are deferred. Members were removed for good reasons: files made once and never reused (see [agents_hats_replace_members](agents_hats_replace_members)). A viewpoint should be saved only after it was reused.

## Cross-references

- [agents_hats_replace_members](agents_hats_replace_members) — why named delegates were removed
- [skill_omero_debates_design_before_decisions](skill_omero_debates_design_before_decisions) — where a decision from a debate goes
