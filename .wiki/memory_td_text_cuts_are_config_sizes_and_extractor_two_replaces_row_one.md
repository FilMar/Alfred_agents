---
tags: [memory, distiller, td, config, tl]
sources: [tools/td/src/config.ts, spikes/2026-10-01-extraction-hats/main.py]
---

## Decision

`Extractor` has four more sizes, beside `episodeChars` and `topK`:

| field | value in row 2 | what it cuts |
|---|---|---|
| `targetInputChars` | 6000 | the input of the target exchange, phase 1 |
| `targetOutputChars` | 8000 | the output of the target exchange, phase 1 |
| `listingChars` | 300 | each side of an exchange in the phase 0b listing |
| `vocabularySize` | 80 | the tags of `tb` given as vocabulary |

The six sizes are one invariant: every size is a positive integer. The constructor checks it with one assert, and the message names the first bad field.

Extractor row 2 in `tl` is row 1 plus these four values, with `parent: 1`. It is active. Row 1 no longer reads, since `fromJson` wants every field. It has no extraction and stays as dead history: `tl` has no delete.

[memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat_only](memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat_only) left these cuts in code. This decision wins on that point. The rest of that decision holds for row 2.

## Why

**A row must say everything that made a result.** With a cut in code, a change to it makes two different extractors under one id. Each extraction carries `extractor_id`, so a comparison between runs would mix them with no trace. In config, the change is a new row with a `parent` and a `why`.

**The cuts touch many exchanges.** Of 2569 in `tl` on 2026-10-09: 63 inputs over 6000, 79 outputs over 8000, 391 inputs and 1814 outputs over 300. The listing cut shapes almost every episode.

**Now, not later.** A new field breaks the read of every older row. On 2026-10-09 the only older row had no extraction, so the cost was one dead row.

## Cross-references

- [memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat_only](memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat_only) — row 1, and the cuts it left in code
- [memory_td_config_json_is_checked_on_both_sides_and_must_round_trip](memory_td_config_json_is_checked_on_both_sides_and_must_round_trip) — why an old row stops reading
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — config is data
