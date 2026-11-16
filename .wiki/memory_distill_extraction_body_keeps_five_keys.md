---
tags: [memory, distiller, alfred, extractions, record]
sources: [spec.json@c597998, review.json@c597998, tools/alfred/src/distill/record.rs]
---

## Decision

The `body` of an `extractions` row is the JSON of the `RuleCandidate`: the keys `if`, `do`, `tags`, `proposedTags` and `quote`, in this order. Extra keys that the model sends are not kept.

## Why

`RuleCandidate` reads the model's answer into a typed struct, so only its fields exist after the read. `td` spread the raw object, so a stray key of the model ended up in the row.

A fixed shape lets a query read every row the same way. The extra keys carried no field that any reader used.
