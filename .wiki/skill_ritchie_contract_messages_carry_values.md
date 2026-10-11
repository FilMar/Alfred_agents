---
tags: [skill, ritchie, contracts, messages]
sources: [skills/ritchie/SKILL.md, skills/ritchie/references/rules.md, skills/ritchie/references/languages.md]
replaces: []
---

## Decision

A contract message has two parts: a stable prefix, then the values.

```
"Type.fn: what must hold | x=<x> len=<len>"
```

- The prefix is the identity of the invariant. Tests match it by substring. It changes only when the invariant changes.
- The suffix lists the values the assert expression reads, and only those. It can change freely. No test matches it.
- A postcondition also lists the result and the value read before the change.
- The owner's state (`self`) goes in only when it is small. A large state is left to the backtrace.
- The message is built only when the assert fails. Each language gets the cheapest way:
  - Rust: format arguments of `debug_assert!`.
  - Python: an f-string in the assert message.
  - TypeScript: `assert(cond, () => msg)`, a callback.
  - Go: `contract.Assert` takes format arguments.

This is a design target. Ritchie does not follow it yet.

## Why

A failed contract today names the rule but not the data. The user then reruns under a debugger or adds prints to learn what broke.

A global panic hook that dumps the whole system state was rejected. It is complex and it does not say which values matter. It also risks putting private data in logs.

Values in the message keep the one-assert-one-expression rule and the stable substring match. They add no new mechanism.

## Cross-references

- [skill_convention_direct_cli](skill_convention_direct_cli)
