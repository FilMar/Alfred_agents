---
tags: [memory, distiller, td, config, tl]
sources: [tools/alfred/src/distill/config.rs, tools/alfred/src/distill/critic.rs, tools/alfred/src/distill/cli.rs, tools/td/src/config.ts@last-typescript, tools/tl/src/db.ts@last-typescript]
replaces: [memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat_only@c1dbd73, memory_td_text_cuts_are_config_sizes_and_extractor_two_replaces_row_one@c1dbd73]
---

## Decision

A row of `extractor` says everything that made a result. Nothing that changes the output lives only in code. The values themselves are data: read them with `alfred extractor show`.

- **The cuts are config.** `episodeChars`, `topK`, `targetInputChars`, `targetOutputChars`, `listingChars` and `vocabularySize`. Every size is a positive integer. `bad_config()` checks all six when a row is read and names the first bad field.
- **The questions of the critic live once**, in `checks`. `critic.system` holds the guard hat only. The code builds the task block from the checks of the candidate kind: one probability per question, and the JSON shape. The block is a template, like the order of the phases, not a choice.
- **A change is a new row** with a `parent` and a `why`.

History: row 1 was the spike pipeline, v7 with critic F, active from 2026-10-09. Row 2 is row 1 plus the four cut sizes, with `parent: 1`. Row 4 is active now ([memory_extractor_row_4_has_rules_only_roles](memory_extractor_row_4_has_rules_only_roles)). Row 1 could not be read by `td`, because `fromJson` wanted every field. It has no extraction and stays as dead history, since `tl` has no delete.

## Why

With a cut in code, a change to it makes two different extractors under one id. Each extraction carries `extractor_id`, so a comparison between runs would mix them with no trace. In config, the same change is a new row.

The cuts touch many exchanges. Of 2569 in `tl` on 2026-10-09: 63 inputs were over 6000 characters, 79 outputs over 8000, and 391 inputs and 1814 outputs over 300. The listing cut shapes almost every episode.

If the questions were also written inside a whole prompt, a change to the text of a check would leave the prompt behind.

Now, not later: a new field breaks the read of every older row. On 2026-10-09 the only older row had no extraction, so the cost was one dead row.
