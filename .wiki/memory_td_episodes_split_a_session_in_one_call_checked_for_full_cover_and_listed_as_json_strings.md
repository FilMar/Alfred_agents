---
tags: [memory, distiller, td, episodes, phase-0b]
sources: [tools/td/src/episodes.ts, spikes/2026-10-01-extraction-hats/main.py]
---

## Decision

Component 5 of `td` is `episodes.ts`, phase 0b, with two classes.

- `Episode`: the indices `from` and `to` (both included) of a run of turns, a summary, and those turns. Component 6 reads the turns from it.
- `SessionMap`: the episodes of one session.
  - `split(read, extractor)` makes one `ModelCaller.ask` call with the `episodes` role. It returns `{ answer, map }`, and `map` is `null` exactly when the answer failed.
  - `text()` is the session map that later phases get as context.

The pure parts are public and tested apart: `listing`, `check`, `fromJson`.

- **The check is the spike's `v0`**, with the same error texts in the same order: the list, the cover with no gap, the summary, the end. It is stricter on one point: a summary of only spaces fails, since `Episode` refuses a blank summary.
- **The listing writes each side with `JSON.stringify`**, not with Python `repr`. Only the quotes change: double quotes instead of single ones. Newlines are escaped in both, so each turn is two lines.
- **The cut counts code points** (`Array.from`), as Python `[:n]` does. An emoji is never split in half.
- **The summary length is not checked.** The prompt asks for 20 to 30 words in Italian, as in the spike, which checked nothing more either.

## Why

**One exit for a classifier.** `check(n)` returns an arrow over the private `#badEpisodes`. A body with a `return` inside a callback trips `check_body_diff.py`. The arrow keeps the rule in a function with one exit.

**A failure is a value.** A session the model cannot split, after one fix, is a normal event. The `Distiller` gets the answer with its tokens and decides.

**Where it will likely break.** Episodes are not saved in `tl`. The split is not deterministic: in the spike the same session once gave 4 episodes and once 9. A run that stops in the middle of a session and starts again gets a new map. The extractions saved before the stop then refer to a map that no longer exists. To decide with the Save (11) or the Distiller (13).

## Cross-references

- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 5
- [memory_td_model_caller_asks_once_fixes_json_once_and_returns_failures_as_values](memory_td_model_caller_asks_once_fixes_json_once_and_returns_failures_as_values) — the call and the one fix
- [memory_td_session_reader_drops_only_task_notifications_and_api_errors_under_a_cap_of_1000](memory_td_session_reader_drops_only_task_notifications_and_api_errors_under_a_cap_of_1000) — the turns it splits
- [memory_td_text_cuts_are_config_sizes_and_extractor_two_replaces_row_one](memory_td_text_cuts_are_config_sizes_and_extractor_two_replaces_row_one) — `listingChars`
