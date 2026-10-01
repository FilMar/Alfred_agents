---
tags: [memory, distiller, tl, tb, ti, pipeline, hats]
sources: [conversation, spikes/2026-10-01-extraction-hats/main.py, spikes/2026-10-01-extraction-hats/extract_v1.jsonl, spikes/2026-10-01-extraction-hats/extract.jsonl, spikes/2026-10-01-extraction-hats/extract_v3.jsonl]
replaces: [memory_distiller_th_run_would_use_gemma4]
---

## Decision

The distiller is a script, not an agent. The LLM never calls a tool. Each call has one job and answers with JSON only. Code does everything that can be checked: read `tl`, drop noise, check the output, search `tb` and `ti`, save, close the queue.

The calls go straight to the Ollama API, not through `th run`. The model in the spike is `glm-5.3-flash:cloud`.

Each call wears one de Bono hat. Blue is the code.

| phase | who | hat | in | out |
|---|---|---|---|---|
| 0 | code | blue | `tl pending` for a session | exchanges, minus noise (ack, task-notification, harness error) |
| 0b | LLM, 1 per session | blue | the list of exchanges | episodes `{from, to, summary}`; the summary says how it ended |
| 1 | LLM, 1 per episode | white | the episode, the whole session map, the tag vocabulary | notes `{what, why, kind, tags, contexts[2], quote}`, rules `{if, do, tags, quote}` |
| 1 | code | blue | the candidates | drops: quote not in the text, rule quote not from the user, kind, Italian, project identifiers, purity; bad tags removed |
| 1b | LLM, 1 per episode | black | the candidates, the episode, the session map | closed questions, see [memory_critic_is_one_guard_with_probabilities](memory_critic_is_one_guard_with_probabilities) |
| 2 | code | blue | each candidate | the 5 nearest in `tb` or `ti`; cosine 0.95 or more is dropped |
| 2 | LLM, 1 per episode | black | candidates, neighbours, items saved earlier in the session, integer ids | per candidate: `new`, `duplicate(of)`, `extends(of, reason)`, `contradicts(of, reason)`; for rules `new`, `duplicate`, `append(of, do)` |
| 2 | code | blue | the verdicts | `tb save` or `ti add` with `--exchange` set by code; a ref for extends and contradicts; `append-do` |
| 3 | LLM, code, LLM | green, then black | each new note | bridges by shape, see [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading) |
| end | code | blue | every exchange read | `tl distilled` |

Two rules hold across phases:

- The model writes text and picks from fixed sets. It never writes an id. Neighbours carry integer ids, and code checks that `of` is one of them.
- Every save happens right away. The next episode finds it in the search, and LLM2 sees it as a neighbour.

## Why

**The one-agent distiller failed on process, not on judgment.** One erodoto run with glm-5.3-flash had to load the two quality files. It dropped the `..` from their path, got ENOENT, and went on without them. It did not say so. Then it found no command to read one session. So it grepped the `tl` source, tried an unrelated SQLite file, and called the raw HTTP API with curl. 2 of its 3 rules fail the rule bar. A pipeline cannot skip a step, because code runs the steps.

**The spike, on session `684fbf7a` (38 exchanges):**

| version | change | result |
|---|---|---|
| v1 | one exchange per call | 19 notes, 4 rules, 115 s. About 10 good notes and 4 wrong ones, 2 of them a claim of the agent that the user later denied |
| v2 | LLM1 also sees the next exchange | the 2 denied claims are gone; the real lesson of the session appears as a rule |
| v3 | episodes plus the critic | the critic drops the textbook definition, the agent guess and the non-rejection rule. An episode split cut one story in two, and a note from its first half teaches the opposite of the truth |
| v4 | the whole session map in every call; looser code checks | added because of v3; the result is in the spike file |

The cost of a full session stays near 1 to 2 cents and under 2 minutes. That is why the pipeline can afford a separate critic and a phase 0.

**Episodes, not exchanges.** A lesson often spans several exchanges: a wrong guess, a denial, then the real cause. Read one exchange at a time, the guess looks like a fact. The session map gives every call the end of the story, even when the split is wrong.

**Direct API, not `th run`.** A `th run` costs about 9k fixed tokens. It also files itself in `tl`, so a distiller built on it would read its own runs. A direct call has neither problem. Two of the five open problems in [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) disappear with it.

**Why glm-5.3-flash.** It is a mixture of experts with 321B total and 18B active parameters. That is close to the 20B Hindsight recommends. The gemma4 choice in the replaced decision rested on the fixed cost of a `th run`, and that cost is gone. Gemma was not tested in this shape.

## Cross-references

- [memory_hindsight_not_adopted_its_shape_is_copied](memory_hindsight_not_adopted_its_shape_is_copied) — where the shape comes from
- [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) — how the JSON is held
- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — phase 0b output reused as an index
- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — still live: the pipeline is a spike, not a service
- [.memory_distiller_th_run_would_use_gemma4](.memory_distiller_th_run_would_use_gemma4) — the replaced decision
