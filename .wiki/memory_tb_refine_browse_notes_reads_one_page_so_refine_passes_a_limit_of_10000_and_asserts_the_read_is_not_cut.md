---
tags: [memory, tb, refine, browse, qdrant]
sources: [tools/tb/SPEC.md, tools/tb/REVIEW.md, tools/tb/src/qdrant.ts]
---

## Decision

`tb refine` reads the notes with `browseNotes({ limit: REFINE_NOTES_LIMIT })`. The limit is a named constant, 10000.

`browseNotes` reads one page and does not follow `next_page_offset`. Its default limit is 20. The refiner asks for 10000 in one request.

`refineReport` asserts that the number of notes is below the limit. If the count reaches the limit, the read may be cut. That is a programmer error, so it is a contract and not a return value.

## Why

The first spec said "read all notes with `browseNotes`". That was false. The code showed it only when the bodies were written. A refiner that reads 20 notes of 793 prints a spread that looks right and is wrong. It would be the worst kind of bug: a good-looking number.

Alternatives that lost:

- **Paginate in `browseNotes`.** It changes a function that `tb browse` and the HTTP API already use. The refiner needs one read of one collection of under a thousand notes.
- **Use `scrollAllWithVectors`.** It reads every note, but it also pulls the dense vectors. The refiner needs no vector.
- **No assert.** A collection that grows past the limit would cut the read in silence.

The limit is not a fix for any size. When the corpus nears 10000, the assert fails first, and that is the moment to paginate.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — what the refiner computes on the notes it reads
