# Principles

Seven principles. Every rule in this skill derives from one of them.
When a case is not covered, derive the answer from a principle and say
which one you used.

## P1. State has one owner

The thing that holds state is the only thing that touches it. Behaviour
lives where the state lives. No struct writes another's state, same
module or crate included. No inheritance: a subclass reads and writes
the parent's state without going through the parent's interface, which
is privileged access. Composition keeps the boundary.

*Derivation:* a value is immutable; only its own contracted functions
build it or derive a new one from it. Where only privacy can stop the
write (Rust, Python), fields are private and read through getters. Where
the type system makes the value read-only (a TypeScript `Readonly`
type), fields are read directly. A getter exists only for a computed
value.

## P2. The contract is the boundary

Every function declares at its boundary what it demands (preconditions)
and what it guarantees (postconditions). The contract is the only oracle
of a test: a test carries no assert of its own, except a classifier's
outcome table. Contracts stay live in the checked production profile.

Rules that follow:

- At most five invariants per function. Past five, the function does
  too much: extract.
- One assert per invariant. The message of a compound assert lies about
  which clause failed.
- One assert is one expression. A check that computes calls a helper.
- An invariant is checked once along a call chain. The one exception is
  data that crosses a boundary (disk, network, another process): assert
  on write, assert again on read.
- Message: short, stable, next to the identifier — `"Type.fn: what must
  hold"`. Tests match it by substring.

## P3. The type protects, the ceremony does not

If the type system already guarantees something, no code is added for
it. A getter over a plain read-only field is ceremony. A newtype or a
brand without an invariant to defend is ceremony. A builder for two
fields with a default is ceremony.

The test for ceremony: delete the code. If nothing the compiler or the
test suite says is lost, it was ceremony.

## P4. Short in the common case

Code that is read every day is short; verbosity lives only at the
edges (I/O, parsing, a boundary another process crosses). Build the
common case with the shortest construction the language allows
(`Default` + struct update in Rust, `replace` on a frozen dataclass in
Python, a spread in TypeScript), and spend the saved lines on the
contract, not on wrappers.

## P5. Programmer error panics, world error returns

A contract catches a programmer error: the program is in a state the
author said cannot exist, and the honest answer is to stop. A world
error is expected — a file is missing, a user typed a letter where a
number goes — and it is a return value the caller handles. Neither
shape is used for the other.

## P6. Zero comments

The signature and the code say everything. Where a comment would go, put
a plainly true assert instead: an assert cannot go stale without failing,
a comment can. The exception is a why the code cannot express, five
words at most, as a plain `//`. Design rationale goes in the project
wiki, never inline.

## P7. Derive, do not memorise

A case not in this skill is answered by the principle, stated out loud.
Memorised exceptions rot; a derived answer names its source and can be
checked against it.

## Test weakness taxonomy

A test is only as strong as its oracle. Reject:

- **Tautological** — the assert holds for any implementation (`result
  == result`).
- **Self-oracle** — the assert reimplements the function's own logic.
- **Vacuous** — the input filter excludes nearly every case.
- **No assertion** — the body calls the function and stops.

## Enforcement

A principle nothing enforces is a principle forgotten. Every principle
has at least one mechanical check in the gate (phase 3): formatter,
linter at the strictest setting, the test suite, and
`contract_report.py` over the contracts.
