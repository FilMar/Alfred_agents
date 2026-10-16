---
tags: [memory, episodic, ti, alfred, routing]
sources: [.design/memory.md@0e0a366, SPEC.md@cbce0c9, conversation]
---

## Decision

Two pieces tell the agent to search the episodes.

- A line in `alfred.md` says that `tl search "<topic>"` finds past episodes of every project.
- A `ti` rule gives the steps when the user asks what was done in the past. First search. Then open the episode with `tl episode <id>` to get its exchanges. Then read an exchange with `tl show <id>` if the summary is not enough. Give the date.

`tl search` and `tl episode` exist. The line and the rule are still to be written.

## Why

`alfred.md` lists four systems and does not name `tl`. The agent does not know there is an archive to ask.

The hook injects a `ti` rule only if its score is 0.5 or more. A real prompt tops out near 0.53. A question like "what did we do on X?" can fall under the cutoff, and then the rule does not reach the agent.

The line in `alfred.md` is always in context. It points to a tool, as the line for `tb search` does. The rule holds the steps.

## Cross-references

- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — where the 0.5 comes from
- [memory_episodes_are_neither_pruned_nor_injected](memory_episodes_are_neither_pruned_nor_injected) — why the agent has to search
