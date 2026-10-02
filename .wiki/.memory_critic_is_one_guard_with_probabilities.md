---
tags: [memory, distiller, critic, selectivity]
sources: [conversation, spikes/2026-10-01-critic-bench/main.py, spikes/2026-10-01-extraction-hats/main.py]
replaces: [memory_distiller_asks_closed_questions_never_worth]
---

## Decision

The distiller's critic is one judge with a role, and it answers with probabilities. This is the critic to build. It is variant E of the critic bench.

- **One judge.** glm-5.3-flash at temperature 0.1. No council.
- **A role, not a hat.** The system prompt opens with the guard:
  > You are the last guard of a knowledge base against chaos. If nothing passes you, nothing evolves: the base stays frozen and useless. If too much passes, everything changes at once and the base turns into noise: pure chaos. Your job is the balance. Let in what will still be worth reading in a year, in a different project. Stop the rest. You are not a pessimist and not an optimist: you are calibrated.
- **Probabilities, not certainty.** For each closed question the judge gives the probability, from 0.0 to 1.0, that the answer is yes. "Say what is most likely, not only what is certain."
- **Threshold about 0.4, chosen by code.** A question counts as a signal at 0.4 or more. A drop question fires when it is yes; `is_user_rejection` fires when it is no. The probabilities are kept, so the threshold can move without new calls.
- **One signal drops the candidate.** Not a third of the signals.
- **The questions.** For a note: `is_textbook_definition`, `is_agent_unconfirmed_claim`, `is_project_detail`, `is_record_of_what_was_done`, `is_about_the_agent`. For a rule: `is_user_rejection`.

The principle of the replaced decision still holds. No model is asked whether a note is worth keeping. Value is judged by use: a note enters as `provvisoria`. The extractor keeps its three rules (simple words, two contexts as a field, a rule only from a correction).

## Why

The critic bench froze 75 candidates (60 notes, 15 rules) from the extraction spike, so every difference between runs comes from the critic. A separate agent labelled them. 35 labels are low confidence.

| variant | right of 75 | bad kept | good dropped | right of 40 high-confidence |
|---|---|---|---|---|
| 3 black hats, glm, true or false (the v6 council) | 41 | 32 | 2 | 27 |
| black, white, yellow hats | 42 | 31 | 2 | 27 |
| black hat on glm, gemma4, nemotron | 44 | 30 | 1 | 27 |
| one glm, true or false | 42 | 33 | 0 | — |
| **one guard, probabilities, 0.4, one signal** | **53** | 21 | 1 | **33** |
| the same, drop at a third of the signals | 42 | 32 | 1 | 26 |

Keeping everything scores 32. Dropping everything scores 43.

**Diversity did not help.** A council works only when its judges err in different directions. Here every judge leaned the same way and kept too much, whatever the hat or the model. The cause was how the question was asked: "answer true only when the text clearly shows it", over five questions where true means drop. False was the safe answer.

**Probabilities and the role fixed most of it.** Project details went from 0 of 5 caught to 5 of 5. Notes about the agent went from 2 of 4 to 4 of 4. On the high-confidence labels no good note was dropped.

**A bad note has one defect.** A textbook definition is bad even when it is general, confirmed and not about the agent. Asking for two signals lets these single-defect notes through, so one signal drops.

**The noise of the v6 council came from temperature.** One judge at 0.1, run twice, changed 6 of 375 answers. The council's three judges at 0.7 split on 24%.

**`explains_mechanism` is out.** It is the only positive question, and it said yes to almost every candidate (17 false alarms).

**Known gaps, to fix next on the same bench.** The judge still misses 11 of 16 textbook notes and 13 of 15 notes that record what was done. These two questions need a sharper wording.

## Cross-references

- [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](memory_distiller_is_a_pipeline_of_small_calls_with_no_tools) — where the critic sits (phase 1b)
- [memory_jev_like_decision_models_are_candidates_for_classification](memory_jev_like_decision_models_are_candidates_for_classification) — local models that also return probabilities
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — use, not reading, promotes a note
- [.memory_distiller_asks_closed_questions_never_worth](.memory_distiller_asks_closed_questions_never_worth) — the replaced decision
