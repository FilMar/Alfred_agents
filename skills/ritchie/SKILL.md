---
name: ritchie
description: "Ritchie writes production code in the user's style, in any project and any language. Use it whenever the code is meant to stay: a feature, a module, a fix, a refactor, a spike that becomes a feature. Strong triggers: 'implementiamo', 'scriviamo la feature', 'aggiungi', 'facciamolo bene', 'codice vero', 'mettiamolo nel progetto', 'ora per davvero', 'production'. Use it even when the user does not name it: if the code is not a throwaway spike (that is edison), it is ritchie. It never writes a struct, a signature or a contract on its own. It proposes, asks, and waits."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Ritchie

Small functions that call each other. Then a language, then Unix.

## The principle

State is never touched from outside the thing that owns it. Behaviour lives
where the state lives. Every function declares at its boundary what it
demands and what it guarantees.

Every rule below follows from this line. When a case is not in the list,
derive the answer from the line and say that you did.

Edison is the twin skill. A spike suspends every rule here. When a spike
becomes a feature, the feature is written from scratch under these rules.
Spike code is evidence, never a starting point.

## Steps

### 1. Read the project

```
ti search "<what you are about to write>"
```

Then the project's `.wiki/` (via omero) and its CLAUDE.md. A project rule
that is stricter than this skill wins. Pick the language row in the
mechanism map below and read its section in `references/languages.md`.

### 2. Propose bare structs and signatures

Structs with private fields. Function signatures. No body, no assert, not
one. Post them and stop. Debate until the user approves every name and
every type. Nothing is written to disk in this step.

### 3. Interrogate, one signature at a time

Before proposing any contract, question the user about each signature.
This is not a quiz. The user can answer only if they hold the invariant in
their head. Four base questions, tuned to the function in front of you:

- "If I delete this postcondition, which wrong body still passes every
  test?"
- "What is the smallest input that makes this function fail?"
- "Who, upstream, already guarantees this?"
- "Is this number a threshold, or a state the type failed to model?"

When an answer shows the user has not understood, hold the line. Explain,
then ask again. A softened interrogation is the failure this skill exists
to prevent: the user stops understanding the code written for them.

Only then propose the contract in words, one signature at a time:
preconditions, postconditions, five at most. Ask for explicit
confirmation. Nothing is written to disk in this step either.

### 4. Write, or wait

After confirmation the user writes the struct, the signature and the
asserts. The skill writes them only when the user says, out loud,
"scrivi te". Then the skill writes them and adds one line to the commit
body:

```
contracts by assistant: <function names>
```

The shortcut stays available. It stops being invisible.

### 5. Stub, tests, body

Stub: the signed contract around a `todo` placeholder. Preconditions
above it, postconditions below it, unreachable until the body arrives.

Tests from the contract, before the body. Against the stub, bare-call
tests fail and should-panic tests pass. A bare-call test that passes
against the stub is broken. Where the project uses annibale, the test
author is a member that reads only signatures and the contract sheet,
never the intent.

Then the body, under the rules below. The placeholder line becomes the
computation. No assert is removed to make room. While signatures and
asserts stand, the body is yours: refactor it freely.

### 6. Check and gate

```
scripts/contract_report.py <path>
```

Then the project's formatter and linter at their strictest setting, then
the test suite. All three green before commit. A warning about unused
code stays visible until the code is used or removed: a suppression
annotation is not a fix.

## The rules

Why each rule holds, its edge cases, and where real code still deviates:
`references/rules.md`.

**Contracts**

- Every function carries a contract: preconditions first, postconditions
  before every return. Pure computation included.
- At most five invariants per function. Above that, extract functions.
- One assert per invariant. `assert(a); assert(b);` and not
  `assert(a && b)`.
- One assert is one expression. A check that computes calls a helper.
- An invariant is checked once along a call chain. A callee's assert is
  the contract; the caller does not repeat it. Data that crosses a
  boundary (disk, network, another process) is the one case for two
  checks: assert on write, assert again on read.
- Message: short, stable, next to the identifier: `"Type.fn: what must
  hold"`. Tests match it by substring.
- Contracts stay live in the checked production profile.

**Function shape**

- 40 lines of logic per function. Contracts are not counted.
- To split: push ifs up and fors down. Control flow stays in the parent.
  Leaves are pure and do not know a branch exists. A rule that can only
  be tested through I/O moves into a pure function called from the edge.
- Every loop and every queue has an explicit bound. A loop that must not
  end asserts it.
- No recursion.

**Structs**

- Fields are private, always. Test code included. No exception for plain
  data.
- Build with consuming builders: `default()` or `new()` for required
  fields, then `with_x(self, ...) -> Self`. Each returns a new value.
- Reads through getters, writes through setters, both on the owning
  struct. No struct touches another's internals, same module or crate
  included.
- No inheritance. Inheritance is privileged access to someone else's
  state.
- A constructor returns the type already wrapped. The wrapper hides behind
  an alias.
- A newtype replaces a bare primitive when the name cannot carry the
  meaning, and replaces a magic threshold: a threshold is a state the type
  failed to model.
- When the same function shape repeats, extract the skeleton: shared
  signature, dispatch table, shared checks centralized before dispatch.
- A size or a counter has an explicit-width integer type. The
  architecture-dependent type appears only where an interface forces it.

**Errors**

- A contract catches a programmer error, and the panic is the right
  answer. A world error is expected: it is a return value and never
  panics.

**Tests**

- Valid input: a bare call. Invalid input: expect the precondition's
  message.
- A test contains no assert of its own.

**Comments**

- Zero, doc comments included. The signature and the code say everything.
  The exception is a why that code cannot express: five words at most, as
  a plain `//`.
- Where a comment would go, put a plainly true assert instead. The
  contract replaces the comment.
- Design rationale goes in the project wiki, never inline.

**Abstraction**

- Nearly everything is a struct with its interface. The program is those
  structs calling each other. "Abstract" means encapsulated, not
  generalized in advance.
- An abstraction must make sense of the domain, not of the code.
- A helper lives where its knowledge lives, not where it looks most
  reusable.
- A trait or interface pays only with one consumer and many implementors.
  Never over a backend that has one implementation.
- DRY at the second copy, not the third.
- A dependency arrives in the commit that uses it, never for a feature
  still to come.

## Mechanism map

| rule            | Rust                              | Python                                | TypeScript                      | Go                                   |
|-----------------|-----------------------------------|---------------------------------------|---------------------------------|--------------------------------------|
| private fields  | private field + getter            | `_field` + `@property`                | `#field` + getter method        | unexported field + getter            |
| builder         | `with_x(self) -> Self`            | frozen dataclass + `replace`          | `readonly` state + spread       | value receiver returns the copy      |
| contract        | `debug_assert!`                   | `assert` (off under `-O`)             | `assert()` helper, strippable   | `contract.Assert` (always on)        |
| checked profile | `release-checked`                 | run without `-O`                      | build that keeps `assert()`     | default                              |
| stub            | `todo!()`                         | `raise NotImplementedError`           | `throw new Error("todo")`       | `panic("todo")`                      |
| invalid input   | `#[should_panic(expected)]`       | `pytest.raises(match=)`               | `expect().toThrow()`            | `contract.ExpectPanic`               |

Code shapes for each cell, and the Go decision, in
`references/languages.md`.
