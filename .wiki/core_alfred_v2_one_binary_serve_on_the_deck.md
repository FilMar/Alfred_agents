---
tags: [core, alfred, server, deck, cli, architecture]
sources: [conversation]
replaces: [core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp@c517871]
---

## Decision

alfred v2 is one binary, `alfred`, in `tools/alfred`. `alfred serve` with the vault service and `alfred vault` exist. The rest is a design target.

- `alfred serve` runs only on the Steam Deck (filcloud). It holds all the logic and reaches all the data: Qdrant, the episode archive and the vault site. The distiller (`td` today) is part of it and runs there on a schedule.
- Every other subcommand is a thin client of the `alfred serve` API: `alfred vault`, `alfred rules` (`ti` today), `alfred hist` (`tl` today).
- `alfred command` (`th` today) runs on the local machine and does not use the API. It works on local files, inside the bwrap sandbox.
- The prompt hook calls the API with a short timeout, about 1 second. When the call fails, the hook injects nothing and stays silent. It never blocks the prompt.
- The old names are not kept as aliases. When a service moves to `alfred serve`, a single pass rewrites the files that call its old name: skills, hooks, `CLAUDE.md` and extensions.

## Why

The Raspberry no longer exists. Qdrant, the `tl` server and the Quartz site already run on the Deck. So the data does not move. Only the place of the logic changes. Today `tb` and `ti` talk to Qdrant directly, and the logic sits in each client.

One server gives one place for the state. A future panel for the state of the distiller and the memory reads from there, with no local logs to join. The clients become thin, and they are the part that changes most often.

Being offline already means no memory today, because Qdrant is remote. So the server adds no new failure.

Rejected: one binary with `tb`/`ti`/`tl` symlinks chosen by argv[0]. It kept old names for compatibility. The rename costs one mechanical pass per service. A sample count found about 61 files that call `ti`, 26 that call `tl` and 67 that call `th`.

The distiller on the Deck can use a local model. That choice waits for a comparison on the same data. A 7-8B model on that APU is slow, and its rules may be worse.

## Cross-references

- [core_alfred_v2_written_in_rust](core_alfred_v2_written_in_rust) — the language
- [memory_tb_dropped_vault_holds_shared_knowledge](memory_tb_dropped_vault_holds_shared_knowledge) — what the server stores
