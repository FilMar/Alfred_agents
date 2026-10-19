---
tags: [style, contracts, common, tb, ti, tl, th, td]
sources: [conversation, tools/common/contract.ts, tools/common/cli.ts, tools/common/tags.ts]
replaces: [style_contract_helpers_live_in_one_shared_module]
---

## Decision

`tools/common` is the one folder for every module the tools share. It was `tools/contract` until 2026-10-13.

It holds three modules:

- `contract.ts`: `assert`, `ContractError`, `isNonBlank`, `allNonBlank`, `isPositiveInt`, `isRecord`, `isUnit`, `sameJson`.
- `cli.ts`: `errorMessage`, `out`, `die`, `collect`. Every CLI had its own copy.
- `tags.ts`: `normalizeTags`. `tb` and `ti` had one copy each.

The folder knows no tool and imports from no tool. A tool imports it by relative path, for example `../../common/contract.js`. There is no package and no build step. `tb` dropped `rootDir` from its `tsconfig.json`, so it can import from outside `src`. Bun runs the sources, so `dist` is not used.

Two helpers stay where they are:

- `requireServices` is still a copy in the `tb` and `ti` CLIs. It needs `checkHealth` from `tb`, so it cannot move to a folder that imports no tool.
- The private `isPositiveInt` of `tb`: it accepts `undefined`, so it means something else.

## Why

Before, `tl`, `th` and `td` imported `assert` from `tb/src/types.ts`, the file about notes. That made 12 imports outside `tb`. A tool that wanted one assert took a link to the note types with it. `tb` was the shared module without being one.

Ritchie puts a helper where its knowledge lives. The knowledge of `assert` is the contract, not the notes. The knowledge of `die` and `out` is the CLI, not any one tool.

The CLI helpers were copies: `die` and `out` in five CLIs, `errorMessage` in three files, `collect` and `normalizeTags` in two. They were identical except for white space.

One folder for all shared modules gives one place to look, and one place to change. A folder per kind of helper would have given the next reader a map to learn. The lazy message of [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) is a change to one file.

A package with its own `package.json` lost. It adds a build and a version for a few small functions.

## Cross-references

- [style_type_checks_are_private_static_methods_of_their_class](style_type_checks_are_private_static_methods_of_their_class) — where checks that know one type go
- [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) — the message shape `assert` should take
