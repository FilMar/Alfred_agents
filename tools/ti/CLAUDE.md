## Project

`ti` (Third Identity): a thin CLI over a dedicated Qdrant collection (`pi_identity`) storing context→action rules (`if`/`do`/`tags`), separate from the Third Brain's semantic memory. A `do` entry can be a behavior, a dispatch to a skill/`th` member, or a `tb` lookup hint — not restricted to one kind.

## Stack

Bun + TypeScript, `commander` for the CLI. Qdrant (remote, same instance as `tb`) + Ollama (`nomic-embed-text`). Reuses `tools/tb/src/infra.ts` as a library.

## Constraints

- Never modify `tools/tb/`. Import from it, do not fork or duplicate its infra code.
- `ti` does not judge similarity, does not auto-merge, does not call an LLM. It is a dumb client: embed, upsert, search, return candidates. The merge/dedup decision (is this `if` similar to an existing one? does this `do` already exist in the array?) is made by whoever calls the CLI — human or agent — never inside `ti` itself.
- No note-linking (no `refs`/`backrefs` like `tb`). Entries are atomic condition→action rules, not a knowledge graph — even when a `do` references `tb`, store it as a search term/topic string, never a note id.
- Only `if` is embedded. `do` and `tags` are plain payload, never vectorized.

## How to work

- Before writing code for a new command, check the equivalent command in `tools/tb/src/cli.ts` for the established pattern (arg parsing, error handling, output format) — stay consistent, don't reinvent.
- Tests mock the HTTP client, same convention as `tests/tb.test.ts` — no test depends on a live Qdrant/Ollama instance.
