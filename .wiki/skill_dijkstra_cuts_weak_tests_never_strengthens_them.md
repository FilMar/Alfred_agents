---
tags: [skill, dijkstra, tests]
sources: [conversation, skills/dijkstra/SKILL.md]
---

## Decision

Dijkstra cuts or merges a weak test, and never rewrites it into a stronger one. Every test that stays keeps the owner's shape. For ritchie that is a bare call or an expected precondition message, with no oracle assert of its own. A test that a module lacks becomes a flag for ritchie.

## Why

In the first real run, dijkstra "fixed" weak tests by adding oracle asserts and new cases. That broke ritchie's rule that the contract is the only oracle, and it added code. Cutting stays inside both limits. Strengthening is ritchie's job.
