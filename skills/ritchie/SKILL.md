---
name: ritchie
description: "Ritchie writes production code in the user's style, in any project and any language. Use it whenever the code is meant to stay: a feature, a module, a fix, a refactor, a spike that becomes a feature. Strong triggers: 'implementiamo', 'scriviamo la feature', 'aggiungi', 'facciamolo bene', 'codice vero', 'mettiamolo nel progetto', 'ora per davvero', 'production'. Use it even when the user does not name it: if the code is not a throwaway spike (that is edison), it is ritchie. Three phases: the user approves the principles and the domain spec once, then Ritchie works alone — structs, contracts, tests, bodies — then the user reviews the result against a report."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Ritchie

State has one owner. The contract is the boundary. The type protects,
the ceremony does not.

## The principles

Seven principles, why each holds, and how to derive a case they do not
cover: `references/principles.md`. Every rule below follows from them.
When a case is not in the list, derive the answer from the principle
and say which one.

Edison is the twin skill. A spike suspends every rule here. When a spike
becomes a feature, the feature is written from scratch under these
rules. Spike code is evidence, never a starting point.

## New language?

If the project's language has no sheet in `references/languages/`,
follow `references/adapting-a-language.md`: answer eight questions,
write the sheet, present it to the user, then write code.

## Steps

### 0. Read the project

```
ti search "<what you are about to write>"
```

Then the project's `.wiki/` (via omero) and its CLAUDE.md. A project
rule that is stricter than this skill wins. Check
`references/languages/` for the language's sheet; read it.

### 1. Setup — the user is present

Present the principle that governs the work (usually P1 plus the two
that bite hardest here) and have the user confirm or amend it.

Then write `SPEC.md` next to the work, never in the code: the domain in
the user's words, in Italian, on the shape of
`references/spec-template.md`. It is committed with the branch. While
the run is open, it is the decision log the work resumes from.

The user says "ok". That is the only approval in the middle of the
work: none.

### 2. Work — the user is absent

Read the language sheet. Translate it into code, in this order, all in
the target file:

1. **Structs.** Private fields where the language needs privacy to stop
   the write; plain read-only shapes where the type system already
   stops it (P3). No functions yet.
2. **Signatures.** Bodies are the stub. No asserts yet.
3. **Contracts.** Derive preconditions and postconditions from the
   invariants the user stated in the spec, at most five per function,
   one assert per invariant. A contract that does not derive from the
   spec is marked `derive?` and reported, never written silently.
4. **Tests, then body, by two th runs.** `scripts/th_write.sh` writes
   the tests, then the bodies — one run each, details in
   `references/tests-and-body.md`. The test run never sees a body. Run
   the tests against the stub file: every bare-call test fails, every
   should-panic test passes. The body run is checked by
   `scripts/check_body_diff.py`.

The file is the work. Chat carries no code text from here on.

### 3. Review — the user is present

```
scripts/contract_report.py <path>
```

Then the project's formatter and linter at their strictest setting,
then the test suite. All three green before commit.

Write `REVIEW.md` next to the work, in Italian, on the shape of
`references/review-template.md`, and present it. The user reads the
code here — this is the moment the user keeps the ability to judge it.
The user approves, or sends the work back with one comment; only the
involved part repeats, and the review is updated each round.

On approval, the scaffolding is removed. If the project has a `.wiki/`,
omero files the decision as a wiki page — the why, in English,
with `sources` pointing at the pair — and the pair leaves the tree; git
keeps the raw text in the branch history. Without a `.wiki/`, the pair
stays: it is the only record.

## The rules

Why each rule holds, its edge cases, and where real code still
deviates: `references/rules.md`.

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
- No recursion. No early `return` before postconditions: one exit.

**Structs**

- A value is immutable. Only its own contracted functions build it or
  derive a new one from it.
- Where only privacy can stop the write (Rust, Python), fields are
  private and read through getters. Where the type system makes the
  value read-only (a TypeScript `Readonly` type), fields are read
  directly, and a getter exists only for a computed value.
- A plain type with a construction function is the default. A class or
  an opaque type is used only when an invariant must hold for every
  value, so that no literal can skip the constructor.
- Build short in the common case: the shortest construction the
  language allows. Consuming builders (`with_x(self) -> Self`,
  `replace`, a spread copy) when a per-step contract or many optional
  fields justify them. Each returns a new value.
- No struct writes another's state, same module or crate included.
- No inheritance. Inheritance is privileged access to someone else's
  state.
- A constructor returns the type already wrapped. The wrapper hides
  behind an alias.
- A newtype replaces a bare primitive when the name cannot carry the
  meaning, and replaces a magic threshold: a threshold is a state the
  type failed to model. No newtype by habit.
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
- A test contains no assert of its own, except a classifier's outcome
  table: see `references/rules.md`.
- Reject weak oracles: tautological, self-oracle, vacuous, no
  assertion. See `references/principles.md`.

**Comments**

- Zero, doc comments included. The signature and the code say
  everything. The exception is a why that code cannot express: five
  words at most, as a plain `//`.
- Where a comment would go, put a plainly true assert instead. The
  contract replaces the comment.
- Design rationale goes in the project wiki and in the spec file, never
  inline.

**Abstraction**

- Nearly everything is a struct with its interface. The program is
  those structs calling each other. "Abstract" means encapsulated, not
  generalized in advance.
- An abstraction must make sense of the domain, not of the code.
- A helper lives where its knowledge lives, not where it looks most
  reusable.
- A trait or interface pays only with one consumer and many
  implementors. Never over a backend that has one implementation.
- DRY at the second copy, not the third.
- A dependency arrives in the commit that uses it, never for a feature
  still to come.
