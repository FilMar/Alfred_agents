---
tags: [memory, distiller, td, components]
sources: [conversation, memory_distiller_is_its_own_tool_td_and_tl_stays_the_register]
---

## Decision

`td` is built from 14 components. The table says what each one does and who else it touches. There is no code yet, so this page is also the state.

| # | component | what it does | touches |
|---|---|---|---|
| 1 | Config | The full description of an extractor: four calls (episodes, extract, critic, novelty), each with model, reasoning, temperature and the whole system prompt. Also the critic questions with their cuts, `episodeChars` and `topK`. Checked on write and on read. Converts to and from JSON. | nothing: pure data |
| 2 | Extractor registry | Adds a row, reads it by id or takes the active one, sets `active`. A thin shell over the `tl` API. | `tl`: `/extractors` |
| 3 | Session reader (phase 0) | Takes the pending exchanges of one session with their contents, sorts them by time and removes the noise. | `tl`: `/exchanges`, `/contents` |
| 4 | LLM client | One call to `pi-ai` with a `Call` from the config. Pulls out the JSON, checks it, and retries once with the error. Returns the token usage. | `pi-ai` |
| 5 | Episodes (phase 0b) | One call per session. Checks that the episodes cover everything, in order, with no gap. Builds the session map. | 4 |
| 6 | Extraction (phase 1) | One call per exchange, with the episode and the map as context. Produces note and rule candidates. | 4; `tb` for the tag vocabulary |
| 7 | Checks (phase 1, code) | Pure functions: quote is in the text, Italian, project identifiers, purity, valid tags, rule quote comes from the user, one rule per quote. | nothing |
| 8 | Critic (phase 1b) | One call per candidate. Gives probabilities. The cuts in the config decide if the candidate drops and for which question. | 4 |
| 9 | Neighbours (phase 2a) | The top `topK` from `tb` for notes and from `ti` for rules. | `tb` and `ti`, read only |
| 10 | Novelty (phase 2b) | One call per exchange. Gives verdicts with integer ids. Code checks `of` and applies the rule on `extends`. Keeps the list of what was already saved in the session. | 4, 9 |
| 11 | Save (phase 2c) | In shadow it does nothing. In active mode it writes to `tb` and `ti`, adds refs, runs `append-do` and sets `distilled`. | active mode: `tb`, `ti`, `tl` write |
| 12 | Recorder | For each candidate it builds one `extractions` row: where it dropped, the probabilities, the verdict. Writes it. | `tl`: `/extractions` |
| 13 | Distiller | The conductor. Runs the phases in order on one session, one call after another (at most 3 together for the critic). Keeps the session state: map and saved list. The only entry point of the library. | 1 to 12 |
| 14 | CLI | `td extractor add/show/activate` and `td distill --session`. Calls only what the library exports. | 13, 2 |

Who touches what:

- `tl`: reads exchanges, contents and the active extractor. Writes extractions and `active`. In active mode it also writes `distilled`.
- `tb`: tags and search, read only. In active mode, also save.
- `ti`: search, read only. In active mode, also `add` and `append-do`.
- `pi-ai`: every model call.
- `th`: only the hat files, once, when the first config is made. `td` does not use it at run time.

Open points are in the roadmap, not here: which sessions `td distill` takes, class or function for 5 to 10, how `td` searches `tb` and `ti`, in-session repeats and the 0.95 cut.

## Why

One component per reason to change. The pure parts (config, checks, parsing, the rule on `extends`) have no I/O, so they can be tested with bare calls. The parts that call a model or a store are thin. The Distiller holds only the order of the steps.

Components 1, 7 and 12 are the ones that must exist before any model call runs: the config says what to run, the checks and the recorder say what to keep and what to log. Building them first gives the shadow run its data from the first call.

## Cross-references

- [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register](memory_distiller_is_its_own_tool_td_and_tl_stays_the_register) — the files and the split with `tl`
- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the phases the components run
- [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low) — component 4
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — components 1, 2 and 12 write these rows
