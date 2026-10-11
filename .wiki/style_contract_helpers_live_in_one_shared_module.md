---
tags: [style, contracts, tb, tl, th, td]
sources: [conversation, tools/contract/contract.ts, tools/tb/tsconfig.json]
---

## Decision

`assert`, `ContractError` and the generic predicates that contracts use live in one module: `tools/contract/contract.ts`. Every tool imports it by relative path, for example `../../contract/contract.js`. There is no package and no build step.

The module holds only what knows nothing about a domain: `assert`, `ContractError`, `isNonBlank`, `isPositiveInt`, `isRecord`, `sameJson`.

`tb` dropped `rootDir` from its `tsconfig.json`, so it can import from outside `src`. Bun runs the sources, so `dist` is not used.

Two helpers stay where they are:

- `errorMessage`: there are three copies, in `tb`, `ti` and `th`. It formats an error for a CLI. It is not a contract.
- The private `isPositiveInt` of `tb`: it accepts `undefined`, so it means something else.

Commit `f9fc5ef`.

## Why

Before, `tl`, `th` and `td` imported `assert` from `tb/src/types.ts`, the file about notes. That made 12 imports outside `tb`. A tool that wanted one assert took a link to the note types with it. `tb` was the shared module without being one.

Ritchie puts a helper where its knowledge lives. The knowledge of `assert` is the contract, not the notes.

One module also gives one place to change. The lazy message of [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) is now a change to one file.

A package with its own `package.json` lost. It adds a build and a version for six small functions.

## Cross-references

- [style_type_checks_are_private_static_methods_of_their_class](style_type_checks_are_private_static_methods_of_their_class) — where checks that know one type go
- [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) — the message shape `assert` should take
