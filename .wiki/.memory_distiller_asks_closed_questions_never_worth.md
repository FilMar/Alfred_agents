---
tags: [memory, distiller, selectivity, critic]
sources: [conversation, spikes/2026-10-01-extraction-hats/main.py, spikes/2026-10-01-extraction-hats/extract_v3.jsonl, spikes/2026-10-01-distiller-per-exchange/main.py]
---

## Decision

No LLM in the distiller is asked whether a note is worth keeping. Value is judged by use: a note enters as `provvisoria` and is promoted by hits.

Bad candidates are dropped by closed questions instead. A critic call (black hat) answers true or false for each candidate, and code drops it on any true:

- note: `is_textbook_definition`, `is_agent_unconfirmed_claim`, `is_project_detail`;
- rule: `is_user_rejection` (false drops it).

The extractor gets three rules, and only three. Everything else in the quality bar is a code check.

1. Simple words. The mechanism and why it works, not what was done. No project names. At most one technical term.
2. Two contexts. The note names two unrelated situations where it helps, as a field of the output.
3. A rule only from a correction, with the user's sentence quoted word for word.

## Why

The selective approach failed twice. The spike of one `th` run per exchange saved too much. The one-agent erodoto run saved little, and 2 of its 3 rules failed the bar. A question like "is this worth remembering" asks for the judgment the model does worst. Neither mem0 nor Hindsight asks it: both extract freely and pay at read time.

A closed question is a narrow task. It points at one failure that has a name. In v1 of the extraction spike the wrong notes were exactly a textbook definition, two agent claims the user denied, and one project detail. A rule came from "direi di avviare per solo 1 pagina", which is an instruction, not a rejection. In v3 the critic dropped the definition, the agent's guess and the non-rejection rule. Its `why` field said so in one sentence each.

The two-context test works better as a field than as an instruction. The model has to write the two situations, and a reader sees at once when they are invented.

Use as the judge follows [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck): no step may add a human review.

Known limit: the critic sees only what its input holds. In v3 an episode split hid the user's denial in a later episode, and the critic passed a wrong note. That is why every call gets the whole session map ([memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](memory_distiller_is_a_pipeline_of_small_calls_with_no_tools)).

## Cross-references

- [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](memory_distiller_is_a_pipeline_of_small_calls_with_no_tools) — where the critic sits
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — use, not reading, promotes a note
