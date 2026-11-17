---
tags: [memory, tb, ti, tl, near, reach, aristotele]
sources: [SPEC.md@94f04df, REVIEW.md@94f04df, tools/alfred/src/rules/near.rs, tools/alfred/src/rules/reach.rs, tools/alfred/src/rules/store/curation.rs, tools/alfred/src/hist/stats.rs, tools/alfred/src/hist/db/archive.rs]
---

## Decision

Code finds the candidates, and Aristotele judges them. Three commands feed it:

- `alfred rules near --min <cosine> [--limit]` prints the pairs of live rules above the threshold, closest first, with both texts. They are candidates for a merge.
- `alfred hist prompts [--since] [--until]` prints the prompts the user wrote, with no repeats, oldest first. It keeps a chat exchange whose `trigger` is absent (pi) or `human` (Claude). It drops task notifications, messages between agents and subtasks.
- `alfred hist prompts | alfred rules reach` searches each prompt with no archived rules, by default with `--limit 2 --min-score 0.5`, and counts no hit. The prompt hook now searches with `--limit 5 --min-score 0.3`, so the defaults no longer match it. It prints how often each live rule comes up, and the rules that never do. These are the rules that need ghost rules.

`near` is quadratic, so it refuses more than 3000 rules.

## Why

With hundreds of items, reading cannot find the duplicate pairs. The vectors already hold the answer, and a pass over them is cheap: it took about 4 seconds on the 800 notes of `tb`.

The hit counters of the rules start on 2026-10-20, so at first they said nothing. Replaying the real prompts measures reach today. The first run, on 1040 prompts from October, took 3 minutes: 53 of the 198 live rules never came up, and 35 came up once.

`reach` counts what would come up now, not what came up then. Rules born after a prompt are counted too. About 3% of the prompts are skill calls or pasted text, and they stay, because the hook sees them as well.

## Cross-references

- [memory_aristotele_is_a_manual_curator_of_tb_and_ti](memory_aristotele_is_a_manual_curator_of_tb_and_ti) — who uses them
- [memory_ghost_rules_are_plain_ti_rules_with_the_same_do](memory_ghost_rules_are_plain_ti_rules_with_the_same_do) — what a rule that is never reached gets
