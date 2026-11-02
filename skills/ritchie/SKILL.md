---
name: ritchie
description: "Ritchie writes production code in the user's style, in any project and any language. Use it whenever the code is meant to stay: a feature, a module, a fix, a refactor, a spike that becomes a feature. Strong triggers: 'implementiamo', 'scriviamo la feature', 'aggiungi', 'facciamolo bene', 'codice vero', 'mettiamolo nel progetto', 'ora per davvero', 'production'. Use it even when the user does not name it: if the code is not a throwaway spike (that is edison) or a short script (that is pike), it is ritchie. Three phases: the user approves the principles and the domain spec once, then Ritchie works alone — structs, contracts, tests, bodies — then the user reviews the result against a report."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Ritchie

State has one owner. The contract is the boundary. The type protects,
the ceremony does not.

## The principles

Seven principles, why each holds, and how to derive a case they do not
cover: `references/principles.md`. Every rule below follows from them.
For a case not in the list, derive the answer and name the principle.

Edison is the twin skill: a spike suspends every rule here. A spike that
becomes a feature is rewritten from scratch; its code is evidence only.

## Steps

### 0. Read the project

```
ti search "<what you are about to write>"
```

Then the project's `.wiki/` (via omero) and its CLAUDE.md. A project
rule that is stricter than this skill wins. Read the language's sheet in
`references/languages/`. If it has none, follow
`references/adapting-a-language.md` first: write the sheet and present
it to the user before any code.

If `graphify` is installed, find the code the work touches:

```
GRAPHIFY_OUT=.graph graphify update .
GRAPHIFY_OUT=.graph graphify query "<what you are about to write>"
GRAPHIFY_OUT=.graph graphify affected "<symbol you will change>"
```

`query` names the files to read. `affected` lists what depends on the
symbols you will change: that is the blast radius, and it goes into the
spec. `graphify --help` is the authority on the syntax.

### 1. Setup — the user is present

Present the principle that governs the work (usually P1 plus the two
that bite hardest here) and have the user confirm or amend it.

Then write `SPEC.md` in the project root, next to `.wiki/` and `.design/`, never in the code: the domain in
the user's words, in Italian, on the shape of
`references/spec-template.md`. It is committed with the branch. While
the run is open, it is the decision log the work resumes from.

The user says "ok". No other approval comes until the review.

### 2. Work — the user is absent

Translate the language sheet into code, in this order, all in the
target file:

1. **Structs.** Private fields where the language needs privacy to stop
   the write; plain read-only shapes where the type system already
   stops it (P3). No functions yet.
2. **Signatures.** Bodies are the stub. No asserts yet.
3. **Contracts.** Derive preconditions and postconditions from the
   invariants the user stated in the spec, at most five per function,
   one assert per invariant. A contract that does not derive from the
   spec is marked `derive?` and reported, never written silently.
4. **Tests, then body, by two th runs.** `scripts/th_write.sh` writes
   the tests, then the bodies, one run each. The test run never sees a
   body; `scripts/check_body_diff.py` checks the body run. Details:
   `references/tests-and-body.md`.

The file is the work. Chat carries no code text from here on.

### 3. Review — the user is present

```
scripts/contract_report.py <path>
```

Then the project's formatter and linter at their strictest setting,
then the test suite. All three green before commit.

Write `REVIEW.md` in the project root, in Italian, on the shape of
`references/review-template.md`. With graphify, refresh the graph and
add `GRAPHIFY_OUT=.graph graphify affected` for each changed public
symbol. Present it: the user reads the code here, and keeps the ability
to judge it. The user approves, or sends the work back with one
comment; only that part repeats, and the review is updated each round.

On approval, the scaffolding is removed. With a `.wiki/`, omero files
the decision as a wiki page (the why, in English, `sources` pointing at
the pair) and the pair leaves the tree; git keeps it in the branch
history. Without a `.wiki/`, the pair stays as the only record.

Then offer dijkstra: it makes the code shorter under these same rules,
and never longer.

## The rules

Why each rule holds, its edge cases, and where real code still
deviates: `references/rules.md`.

**Contracts**

- Every function carries the contract it needs: preconditions first,
  postconditions before every return. Pure computation included.
- An assert must be able to fail: skip one already guaranteed by the
  line above, the type, the language or the callee (`references/rules.md`).
- At most five invariants per function. Above that, extract functions.
- One assert per invariant: `assert(a); assert(b);`, not `assert(a && b)`.
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

**File shape**

- 350 lines per file, every line counted, tests included.
- To split: one file per job, one folder per stage. A test file that
  grows past the limit becomes a folder that mirrors its jobs.

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
- No inheritance: it is privileged access to another's state.
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

- A contract catches a programmer error: the panic is the right answer.
  A world error is expected: it is a return value, never a panic.

**Tests**

- Valid input: a bare call. Invalid input: expect the precondition's
  message.
- A test contains no assert of its own, except a classifier's table.
- Reject weak oracles: tautological, self-oracle, vacuous, no
  assertion. See `references/principles.md`.

**Comments**

- Zero, doc comments included. The signature and the code say
  everything. The exception is a why that code cannot express: five
  words at most, as a plain `//`.
- Where a comment would go, put an assert the code does not guarantee.
- Design rationale goes in the wiki and the spec, never inline.

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
- A dependency arrives with the commit that uses it.
