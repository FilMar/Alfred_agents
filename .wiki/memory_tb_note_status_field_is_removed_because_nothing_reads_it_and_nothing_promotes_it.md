---
tags: [memory, tb, note, status, schema]
sources: [tools/tb/SPEC.md@7f3f8be, tools/tb/REVIEW.md@7f3f8be, conversation]
---

## Decision

The `status` field (`provvisoria` and `promossa`) is removed from the note.

`createNote`, `tb save`, the API and `td` stop writing it. `tb save` has no `--status` option. An API body that still sends `status` is ignored, like any unknown field.

The old notes keep the field in their payload. On 2026-10-13 there were 798 notes: 747 `promossa` and 51 `provvisoria`. Nothing reads the field, so there is no migration.

No marker of origin takes its place.

## Why

**Nobody reads it.** Search, the graph, the hook and `refine` do not look at it.

**Nobody promotes it.** `tb update` has no `--status`. Of the 51 `provvisoria` notes, 27 have hits and are still `provvisoria`. The promise "a note becomes `promossa` through use" was never built. The field had four writers and no owner.

**Trust does the job.** The question was always "is this note alive". `trust` answers it, derived from the hits, with no switch to flip. What `trust` does not say is "a human read this note". That meaning was never implemented, so nothing is lost.

The roadmap said to decide the fate of `status` once `trust` had proved itself. That condition was wrong. The field does not depend on `trust`. It had no reader.

Two decisions describe the old path: a new note enters as `provvisoria` and use decides. That detail no longer holds. The rest of those pages stands. See [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) and [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question).

Alternatives that lost:

- **Derive `status` from `trust`.** A derived field with no reader is debt.
- **Keep it until `trust` proves itself.** It does not depend on `trust`, so the wait has no end.
- **A marker of origin ("made by `td`").** No question reads it today. `exchange` already says where a distilled note comes from. Add a marker when a question needs it.
- **Clean the 798 old notes.** Nobody reads the field. A pass over the store buys nothing.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — `trust`, and the line that said `status` stays for now
- [memory_absence_is_how_qdrant_stores_null](memory_absence_is_how_qdrant_stores_null) — `status: promossa` still describes the old notes
- [memory_tb_note_payload_is_pinned_by_an_exact_test_so_a_key_cannot_appear_or_vanish_unseen](memory_tb_note_payload_is_pinned_by_an_exact_test_so_a_key_cannot_appear_or_vanish_unseen) — the test that pins the payload without `status`
