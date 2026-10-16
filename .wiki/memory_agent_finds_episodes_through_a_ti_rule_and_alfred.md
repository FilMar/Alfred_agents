---
tags: [memory, episodic, ti, alfred, routing]
sources: [.design/memory.md@0e0a366, conversation]
---

## Decision

Two pieces tell the agent to search the episodes.

- A line in `alfred.md` says that `tl search "<topic>"` finds past episodes of every project.
- A `ti` rule gives the steps when the user asks what was done in the past. First search. Then open the exchanges with `tl show` if the summary is not enough. Give the date.

Both are written after `tl search` exists.

## Why

`alfred.md` lists four systems and does not name `tl`. The agent does not know there is an archive to ask.

The hook injects a `ti` rule only if its score is 0.5 or more. A real prompt tops out near 0.53. A question like "what did we do on X?" can fall under the cutoff, and then the rule does not reach the agent.

The line in `alfred.md` is always in context. It points to a tool, as the line for `tb search` does. The rule holds the steps.

## Cross-references

- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — where the 0.5 comes from
- [memory_episodes_are_neither_pruned_nor_injected](memory_episodes_are_neither_pruned_nor_injected) — why the agent has to search
