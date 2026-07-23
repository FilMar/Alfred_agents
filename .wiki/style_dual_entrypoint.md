# Style: dual entrypoint (CLI + HTTP API)

## Frontmatter

```yaml
tags: [architecture, tb, ti, hono, style]
sources: [tools/tb/src/api.ts, tools/tb/src/cli.ts, tools/tb/src/types.ts, tools/ti/src/api.ts, tools/ti/src/cli.ts, tools/ti/src/types.ts]
updated: 2026-07-23
```

## Description

`tb` and `ti` each expose the same business logic through two thin entry points: `cli.ts` (commander, for humans/agents shelling out) and `api.ts` (Hono, for HTTP tool integrations — e.g. registering the module as an OpenAPI Tool Server in OpenWebUI). Added 2026-07-23.

## How it is written

Neither entry point contains logic — both call the same underlying functions (`notes.ts` for `tb`, `identity.ts` for `ti`), so behavior can never drift between the CLI and the API surface. This follows the existing `cli.ts → notes.ts` dependency direction documented in [architettura](architettura); `api.ts` simply sits alongside `cli.ts` at the same layer, importing from the business-logic module, never the reverse.

`api.ts` responsibilities:
- one Hono route per CLI command, same option names/semantics (`POST /search`, `POST /save`, `GET /tags`, `GET /random`, `GET /browse`, `PATCH /notes/:id` for `tb`; `POST /add`, `POST /search`, `GET /list`, `DELETE /entries/:id`, `PATCH /entries/:id` for `ti`)
- a static, hand-written `GET /openapi.json` describing the same routes — no `zod-openapi` or codegen, kept in sync by hand since the surface is small and changes rarely
- `serveApi()`, called from a new `serve` CLI command (same pattern as the existing `graph` command in `tb`) via `Bun.serve({ port, fetch: app.fetch })`

Pure helpers used by both entry points (`isValidKind`, `normalizeTags`, `errorMessage`) live in each module's `types.ts` — validation/formatting logic that isn't specific to either surface.

Ports are env-overridable, not hardcoded: `TB_API_PORT` (default 8788), `TI_API_PORT` (default 8789).

## How to extend

Adding a new CLI command to `tb` or `ti` that should also be reachable over HTTP:
1. Add the business-logic function to `notes.ts`/`identity.ts` (or reuse an existing one) — never put logic in `cli.ts` or `api.ts` directly.
2. Wire the `cli.ts` command as usual.
3. Add the matching Hono route in `api.ts`, same option names, translating query/body params instead of commander flags.
4. Add the route to the static `OPENAPI_SPEC` object in the same file.
5. If a new module gains this pattern for the first time, add a `serve` command to its `cli.ts` and a `serveApi()`/`API_PORT` export in its `api.ts`.

## Example

```typescript
// tools/tb/src/api.ts
app.post("/search", async (c) => {
  const body = await c.req.json();
  if (typeof body.query !== "string") return c.json({ error: "query is required" }, 400);
  const results = await searchNotes(body.query, { limit: body.limit, /* ... */ });
  return c.json(results);
});
```

## Cross-references

- [architettura](architettura) — the layer table and `cli.ts → notes.ts` dependency direction
- [ti_module](ti_module) — `ti`'s own architecture, now including `serve`/`api.ts`
- [tb_on_rasp](tb_on_rasp) — `tb`'s client/server model, which this pattern extends with a third client type (HTTP tool consumers, not just CLI callers)
- [th_cli](th_cli) — planned extension to `th`; diverges here because `run` is long-running, so the API needs detached-job polling (`GET /runs/:id`, `/out`, `/log`) instead of the sync request/response used by `tb`/`ti` — and unlike `tb`/`ti`, the polling routes read straight from `/tmp` files, not a database (`th.db` is being phased out in favor of [tl_module](tl_module) for history; in-progress status never needed a DB in the first place)
