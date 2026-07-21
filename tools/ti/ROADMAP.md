# Roadmap

## Foundation
- [ ] Define `IdentityEntry` type (`if: string`, `do: string[]`, `tags: string[]`, plus Qdrant-required `id`/vector fields)
- [ ] Create Qdrant collection `pi_identity` (single dense vector, same `nomic-embed-text` / 768-dim config as `third-brain`) — provisioning script or idempotent create-if-missing on first use
- [ ] Import and reuse `tools/tb/src/infra.ts` (`HttpClient`, `QDRANT_URL`, `OLLAMA_URL`, `EMBED_MODEL`) without modification

## CLI Commands
- [ ] `ti add --if <string> --do <string> [--tags <a,b,c>]` — embed `if`, upsert a new entry
- [ ] `ti search <query> [--tags <a,b,c>] [--limit N]` — embed query, return ranked candidates with their full `do` array and score, for the caller to judge
- [ ] `ti list [--tags <a,b,c>]` — dump entries, no ranking, for inspection
- [ ] `ti delete <id>` — remove an entry
- [ ] `ti append-do <id> --do <string>` — append a behavior string to an existing entry's `do` array (used after the caller has decided, via `search`, that a match already exists)

## Testing
- [ ] `tests/ti.test.ts` mirroring `tests/tb.test.ts` conventions (mocked HTTP client, no live Qdrant/Ollama dependency)
- [ ] Sentinel test: `add` never silently overwrites — always creates a new point unless the caller explicitly calls `append-do`

## Packaging
- [ ] Register `ti` in root `package.json` `bin`
- [ ] `tsconfig.json` for `tools/ti` (mirrors `tools/tb/tsconfig.json`)
