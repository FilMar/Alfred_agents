---
tags: [memory, distiller, models, classification, local]
sources: [conversation, "https://ollama.com/library/tev1:0.8b", "https://ollama.com/library/nimble"]
---

## Decision

Small decision models exist, in the style of TypeSafe's Jev. They are candidates for every distiller step that is classification, not generation. They are not adopted yet. No step uses them until a test against hand-labelled candidates says they beat glm-5.3-flash.

What such a model does: it takes one text (`state`) and 1 to 64 named questions about it. Each question is a pick from a list, a true or false, or a place on a rubric. It returns the answer with a probability.

The two known today, both on Ollama, both fine-tuned from Qwen3.5:

| model | maker | sizes | context | accuracy (vendor's eval) | runs on |
|---|---|---|---|---|---|
| `tev1` | Together AI | 0.8B, 4B | about 2,000 tokens | 63.5% (0.8B), 73.3% (4B) | the laptop; 0.8B maybe the Rasp |
| `nimble` | Bespoke Labs | 9B, 9.5 GB | 256K tokens | 75.7% | the desktop |

Jev itself scores 76.0% on the same comparison. Neither model is tested in Italian, and our text is Italian. No cloud version exists today.

Where they fit, and where they do not:

| step | today | fits a decision model |
|---|---|---|
| noise filter, phase 0 | regex | yes: true or false, "only an ack or an operational command" |
| critic, phase 1b | glm, true or false | yes: the closed questions as they are |
| novelty, phase 2 | glm | yes: a pick from a list, "which neighbour says the same thing: none, N0 to N4" |
| episodes and summaries, extraction, shapes | glm | no: these generate text |

## Why

The critic is the noisy part of the pipeline. glm judges the same candidate differently from one run to the next. A decision model returns a probability, so the threshold becomes ours, the answer repeats, and the call is free and local.

The context size decides which questions fit. `tev1` reads about 2,000 tokens, so it can judge a candidate alone: `is_textbook_definition`, `is_project_detail`, `is_user_rejection` on the quote. It cannot judge `is_agent_unconfirmed_claim`, which needs the episode and the session map. `nimble` reads 256K tokens, so it can take every question.

The desktop is not always on. That does not block `nimble`. Distillation works on a queue, not in real time: `tl pending` waits, and the queue empties when the machine is on.

The test that would adopt one, not run yet: label about 60 candidates from the extraction spike by hand, run `tev1` 4B and `nimble` on the same closed questions, and compare them with glm. Three measures: agreement with the labels, the same answer twice, and time.

## Cross-references

- [memory_critic_is_one_guard_with_probabilities](memory_critic_is_one_guard_with_probabilities) — the closed questions these models would answer
- [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](memory_distiller_is_a_pipeline_of_small_calls_with_no_tools) — the steps listed above
