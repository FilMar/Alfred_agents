---
tags: [memory, tb, refine, archive]
sources: [tools/tb/SPEC.md@78af67d, tools/tb/REVIEW.md@78af67d, conversation]
---

## Decision

Only `tb refine --apply` writes and clears `archived_at`. A hit on an archived note does not clear it. The next run does, once the trust is back at 0.2 or more.

`archived_at` is an ISO instant, like `when` and `last_hit`. A note that already has it keeps it, so the moment of the first archive stays.

After a run, a note has `archived_at` if and only if its trust is under 0.2.

The writes are two requests, not one per note: one `setPayloadMany` for the notes to archive, and one removal of the key for the notes to restore. Reading and computing 798 notes took about 0.55 seconds on 2026-10-13.

## Why

The key has one owner. If the search cleared it at the hit, there would be two writers of one fact, and they would drift.

The cost of waiting for the next run is small: until then the note stays out of the hook, and a deliberate search still finds it.
