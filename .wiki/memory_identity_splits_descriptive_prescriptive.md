---
tags: [memory, ti, tb, identity, schema]
sources: [conversation, tools/tb/src/types.ts, tools/ti/src/types.ts]
---

## Decision

Identity lives in two halves, in two stores, and they stay apart.

| | Question | Where | Shape |
|---|---|---|---|
| Descriptive | what someone is like | `tb`, field `about` | atomic fact |
| Prescriptive | what to do in a context | `ti` | `if` to `do` |

`tb` notes gain an `about` field. Its values are entity names — `filippo`, `alfredo`, anyone else — with `mondo` meaning the note is about nobody in particular. It is an open set, not an enum of roles, which is why the field is not called `owner`: it says who the note is about, not who holds it.

So the notes marked `about: alfredo` are the agent's identity, in its descriptive half. `ti` rules are the same identity in its executable half.

This also removes the "user model" as a separate layer. A fact about Filippo is a `tb` note with `about: filippo`, under the same critic and the same decay as every other note. The admission rule stays: a claim about Filippo cites the `tl` events that support it, or it does not enter.

## Why

Without `about`, "HNSW search is logarithmic" and "Filippo wants dry answers" are the same kind of object. They are not. The first is true for everyone and does not expire. The second is true for one person and changes. With one field the two can decay on different clocks; without it, ageing facts about a person can only be handled by ageing everything.

The two halves have to stay in separate stores because they fail in opposite, diagnosable ways. A descriptive fact filed in `ti` becomes a rule with no trigger: the `if` is vague, so it fires always or never, and it pollutes every search. A prescriptive rule filed in `tb` is never applied, because nothing in `tb` dispatches — it stays a good sentence that no one runs.

Rejected: a fifth store for the user profile. It answers the same question as `tb` and is retrieved the same way, so it would only add a second place where the same truth can drift.

## Cross-references

- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the prescriptive half, and why it is its own collection
- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — semantic against procedural, and the test that splits them
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the events an admitted claim about a person has to cite
