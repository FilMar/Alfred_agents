---
tags: [memory, distiller, th, model, cost]
sources: [conversation, spikes/2026-09-30-distiller-model/main.py]
---

## Decision

If a distiller runs as a `th` run, it uses `ollama/gemma4:31b-cloud`. One exchange per run, passed whole, `--thinking off`, no tools.

The choice rests on cost and speed. Note quality was never judged.

## Why

The spike drew 20 real exchanges from `tl pending` and ran each one through three Ollama cloud models. Every model returned valid JSON on 20 of 20 runs. Validity does not separate them.

| model | valid | median tokens in | median seconds |
|---|---|---|---|
| gemma4:31b-cloud | 20/20 | 2,874 | 3.2 |
| glm-5.3-flash:cloud | 20/20 | 11,189 | 26.2 |
| nemotron-3-nano:30b-cloud | 20/20 | 11,924 | 10.6 |

Gemma reads about four times fewer input tokens than the others. The fixed part of a `th run` prompt is about 9k tokens. Gemma benefits from prompt caching on Ollama cloud, so that part costs little. GLM and Nemotron pay it in full on every run. The main fear was to burn the Ollama credit, so this gap decides.

The 60 notes were never read side by side. The blind reading file was written and then dropped, so the spike answers cost and format, not quality. If notes from Gemma turn out poor, this decision is open again.

## Cross-references

- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — why no service runs this yet
- [memory_delegated_run_is_a_pi_subtask](memory_delegated_run_is_a_pi_subtask) — where the fixed cost of a `th run` comes from
