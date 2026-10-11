# Adapting a language

One sheet per language in `references/languages/<language>.md`. When a
project needs a language without a sheet, answer the eight questions
below, write the sheet, present it to the user, and only then write
code.

## The eight questions

1. **Immutability.** How does the language make a value read-only, and
   what stops the write? (private fields, `Readonly`, frozen objects,
   convention)
2. **Contract.** How is one invariant checked? Can a build flag strip
   the check, and what is the checked production profile that keeps it
   live?
3. **Construction.** How is a value built with required and optional
   fields, with the least code for the common case?
4. **Stub.** What does an unwritten function body look like?
5. **Panic test.** How does a test expect a panic and match its message?
6. **World error.** What is the idiomatic error value — `Result`, an
   exception, a union type, a second return value?
7. **Error types.** When does an error become its own type? (one enum
   per phase, a root wrapper)
8. **Inheritance.** Does the language have it? If yes, the answer is
   composition, because inheritance is privileged access to someone
   else's state (P1).

## The sheet template

Each sheet answers the eight questions with a short code shape per
answer, plus one full worked example: a small type with a consuming
builder, a contract, a stub, and its two tests (valid input, invalid
input). Keep the sheet under 150 lines. Code shapes only — no prose
essays.

Apply P3 and P4 while writing the sheet: show the shortest construction
the language idiomatically allows, not the most ceremonious one.
