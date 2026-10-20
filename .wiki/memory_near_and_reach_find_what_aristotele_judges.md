---
tags: [memory, tb, ti, tl, near, reach, aristotele]
sources: [SPEC.md@94f04df, REVIEW.md@94f04df, tools/tb/src/near.ts, tools/ti/src/reach.ts, tools/tl/src/prompts.ts]
---

## Decision

Code finds the candidates, and Aristotele judges them. Four commands feed it:

- `tb near --min <cosine> [--tags] [--limit]` and `ti near --min <cosine> [--limit]` print the pairs of live notes or rules above the threshold, closest first, with both texts. They are candidates for a merge.
- `tl prompts [--since] [--until]` prints the prompts the user wrote, with no repeats, oldest first. It keeps a chat exchange whose `trigger` is absent (pi) or `human` (Claude). It drops task notifications, messages between agents and subtasks.
- `tl prompts | ti reach` searches each prompt like the prompt hook does (`--limit 2 --min-score 0.5`, no archived rules) and counts no hit. It prints how often each live rule comes up, and the rules that never do. These are the rules that need ghost rules.

`near` is quadratic, so it refuses more than 3000 items. A tag filter narrows the notes.

## Why

With 800 notes, reading cannot find the duplicate pairs. The vectors already hold the answer, and a pass over them is cheap: about 4 seconds for `tb`.

The hit counters of `ti` start on 2026-10-20, so they say nothing yet. Replaying the real prompts measures reach today. The first run, on 1040 prompts from October, took 3 minutes: 53 of the 198 live rules never came up, and 35 came up once.

`reach` counts what would come up now, not what came up then. Rules born after a prompt are counted too. About 3% of the prompts are skill calls or pasted text, and they stay, because the hook sees them as well.

## Cross-references

- [memory_aristotele_is_a_manual_curator_of_tb_and_ti](memory_aristotele_is_a_manual_curator_of_tb_and_ti) — who uses them
- [memory_ghost_rules_are_plain_ti_rules_with_the_same_do](memory_ghost_rules_are_plain_ti_rules_with_the_same_do) — what a rule that is never reached gets
