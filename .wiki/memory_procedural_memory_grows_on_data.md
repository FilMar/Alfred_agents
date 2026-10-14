---
tags: [memory, procedural, strategy]
sources: [conversation, procedural_memory_gaps.md@3d6da87]
replaces: [memory_log_first_three_moves@c1dbd73, memory_procedural_six_gaps@c1dbd73]
---

## Decision

Procedural memory grows on top of data, not on guesses. `tb` holds semantic memory only: facts, concepts and links, found by similarity.

Three gaps are still open between what the system does and what it could learn from doing:

1. **No telemetry on skills.** Delegated runs are archived in `tl`. A skill that runs inline leaves no row of its own: no count, no context, no outcome.
2. **No procedure taken from the outcome.** A score says how a run went. It does not keep the steps that made it work.
3. **No revision loop.** `tb` and `ti` only add. A skill changes only when a person rewrites it.

Closed since the first diagnosis:

- The stores had no shared record. `tl` is now one archive for chat and for delegated runs.
- A store indexed by situation. `ti` holds `if` to `do` rules.
- The path from a member to a skill is gone with the members.

Order of work, cheapest first:

1. Telemetry on skills. Without data the other gaps have nothing to work on.
2. Procedure extraction with a human gate. After a good task, distil the sequence of actions, not the concept, and propose it. Minimal form: a `tb` note of kind `protocollo` with the trigger in the `what`. A store of its own only when search shows it is not enough.
3. A revision loop, only when data exists. A rule for retiring a procedure, written today, would be a guess.

Anti-pattern: start at 2 or 3 because they are more interesting. Without data you build intelligence on nothing.

## Why

The only missing piece was one record of what happened, and `tl` is it. Everything else already exists: `protocollo` notes, `ti`, the skill authoring of `efesto`.

Hat metrics measure how well a run went. They do not keep the procedure. Measuring is half of the job.

The same order holds in the rest of the repo: observe first, act after.
