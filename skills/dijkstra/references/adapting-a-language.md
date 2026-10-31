# Adapting a language

One sheet per language in `references/languages/<language>.md`. A
sheet is a catalog of the tools that make code in that language
shorter. When the code in scope uses a language without a sheet,
answer the seven questions below, write the sheet, present it to the
user, and only then hunt.

The sheet is per language. The rules are per owner. A Python file
written by ritchie and a Python script written by pike read the same
sheet, and each keeps its own owner's rules.

## The seven questions

1. **Repeated items.** What generates N near-identical declarations:
   impls, handlers, enum arms, constants? (a macro, a decorator, a
   loop that registers entries in a table)
2. **Parallel copies.** What lets one function serve several types or
   several cases? (generics, a standard trait or protocol, a
   higher-order function)
3. **Construction.** What builds a value, or a variant of a base
   value, with the least code? (defaults plus update, `replace`,
   spread)
4. **Branch to data.** What turns a ladder of branches into a table
   the code looks up?
5. **Loops.** What turns an accumulating loop into one expression,
   while the input keeps its bound?
6. **Error plumbing.** What collapses repeated error checks, and does
   it break the owner's one-exit rule?
7. **Tests.** What merges N tests of the same shape into one table,
   while each case keeps the owner's test shape?

## Limits for every language

Each tool in a sheet states when it pays and which rule limits it.
These limits hold in every sheet, so the sheets do not repeat them:

- **Contracts stay written out.** A macro, a decorator or generated
  code never holds an assert. `contract_report.py` reads the text and
  cannot see a generated assert. Neither can the reader.
- **The definition counts.** The net line change includes the macro,
  the generic or the table itself. A tool pays only when the total
  shrinks.
- **No abstraction for one user.** A macro with one expansion, a
  decorator used once, a trait or interface with one implementor: all
  are ceremony.
- **Control flow stays visible.** Push ifs up, fors down. A tool may
  hide repetition. It never hides a branch the parent should own.
- **No inheritance, no recursion.** A base class that shares code, or
  a fold rewritten as recursion, is not a shorter way.

## The sheet template

One section per tool, at most seven tools. Each section has three
lines (replaces, pays, limit) and one code block of the shape after
the cut. Each code block stands alone and passes the language's
compiler or linter. Keep the sheet under 120 lines. Check every code
block before you present the sheet.
