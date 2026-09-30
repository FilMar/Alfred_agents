---
tags: [memory, distiller, tl, platone]
sources: [conversation, ROADMAP_MEMORIA.md]
---

## Decision

Distillation stays manual for now. No service runs every 10 minutes. The user runs `platone` on a window of `tl pending`. Platone ends with `tl distilled <id...>`, so every exchange it read leaves the queue, with notes or without.

The automatic distiller waits until the problems below have an answer. A reminder at session start, that prints the size of `tl pending`, is the missing piece of the manual flow.

## Why

The manual flow already works end to end: `tl pending`, platone, `tb save --exchange`, `tl distilled`. An automatic service adds cost and risk and no new capability. These problems came up when it was designed:

- **It feeds itself.** `th run` archives every finished run as a `kind: subtask` row, and that row enters `tl pending`. A distiller built on `th` would read its own runs forever.
- **The fix is a third kind.** A `kind: distill` row would keep only exchange data, with no input and no output, and a `parent` pointing at the exchange it distilled. It must not appear in `tl` as an ordinary subtask. This needs a change in `tl` and in `th run`.
- **Knowledge also comes from task runs.** Skipping `subtask` rows to break the loop would throw away what the runs of tasks taught. The filter must be on the distiller's own rows, not on the kind.
- **Fixed cost per run.** Every `th run` carries about 9k input tokens of system prompt. Small exchanges cost more in overhead than in content. A direct call to the Ollama API would avoid it.
- **`th --timeout` bug.** `promptWithTimeout` in `tools/th/src/runner.ts` never clears its timer. The process stays alive for the full timeout after the run ends. A service that waits on the process would stall.

Open with the roadmap and not decided here: Hindsight as the engine, the dedup threshold, how many days a provisional note lives.

## Cross-references

- [memory_distiller_th_run_would_use_gemma4](memory_distiller_th_run_would_use_gemma4) — the model to use when it does run
- [memory_delegated_run_is_a_pi_subtask](memory_delegated_run_is_a_pi_subtask) — why `th` rows enter `tl`
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the schema, and `distilled` as the only mutable field
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — why the human step is worth removing later
