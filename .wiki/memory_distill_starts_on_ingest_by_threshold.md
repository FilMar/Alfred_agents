---
tags: [memory, distiller, alfred, trigger, ingest]
sources: [conversation]
---

## Decision

`alfred serve` has no timer for the distiller. After every ingest write, it checks whether to start a distill run. A run starts when one of these holds:

- at least 50 exchanges are pending;
- the oldest pending exchange is more than 24 hours old.

Two more conditions:

- No other run is going. One run at a time.
- A session that failed in the last run does not count toward the pending total.

Both thresholds are configurable.

## Why

The ingest already writes inside the same process, so the push is the event. A timer every 15 minutes wakes about 96 times a day and mostly finds nothing to do.

The threshold of 50 makes the runs bigger. A long open session is not distilled in small pieces, and the model sees more context at once.

The 24-hour rule covers a quiet week. Without it, 30 pending exchanges would never reach 50 and would wait forever.

A failed session stays pending. If it counted, it would keep the total over the threshold and start a run on every push, and each run pays for model calls.

Rejected: a 15-minute timer, proposed when the distiller moved into the server.

## Cross-references

- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — the server the distiller runs in
