---
tags: [style, tb, ti, hono, api]
sources: [tools/tb/src/api.ts, tools/ti/src/api.ts]
---

## Decision

`tb` and `ti` each expose the same business logic through two thin entry points: `cli.ts` (commander, for humans and agents shelling out) and `api.ts` (Hono, for HTTP tool integrations, e.g. registering the module as an OpenAPI Tool Server). Added 2026-07-23.

- One Hono route per CLI command, same option names and semantics (`POST /search`, `POST /save`, `GET /tags`, `GET /random`, `GET /browse`, `PATCH /notes/:id` for `tb`; `POST /add`, `POST /search`, `GET /list`, `DELETE /entries/:id`, `PATCH /entries/:id` for `ti`).
- A static, hand-written `GET /openapi.json` — no codegen; kept in sync by hand because the surface is small and changes rarely.
- `serveApi()` called from a `serve` CLI command via `Bun.serve({ port, fetch: app.fetch })`.
- Ports are env-overridable: `TB_API_PORT` (8788), `TI_API_PORT` (8789).

To extend: add the logic function to `notes.ts`/`identity.ts`, wire the CLI command, add the matching Hono route (same names), add the route to the static `OPENAPI_SPEC`. Logic never lives in either entry point.

## Why

Both entry points calling the same underlying functions means behavior can never drift between CLI and HTTP surface. `api.ts` sits alongside `cli.ts` at the same layer, importing from the business-logic module, never the reverse — it extends the dependency direction of [style_tb_ti_layering](style_tb_ti_layering) instead of breaking it. Hand-written OpenAPI over codegen: the surface is small; codegen would add a dependency for little.

## Cross-references

- [style_tb_ti_layering](style_tb_ti_layering) — the layering this sits on
- [th_http_api_scoped_no_db](th_http_api_scoped_no_db) — the planned `th` extension, deliberately divergent (async job polling)