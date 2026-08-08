# cockpit

## Project

Tailnet-only web UI for the pi agent. One continuous session with episodic stateless execution: every turn rebuilds context from the active memory bank + tb/ti retrieval, runs a fresh pi SDK session, re-condenses async. Single user. See README.md for the full design.

## Stack

Bun + TypeScript, Hono, HTMX + Tailwind, `@earendil-works/pi-coding-agent`, Ollama. Do not swap any of these on your own.

## Constraints

- The model never emits HTML. Widgets are JSON via the `emit_widget` tool; the backend renders fixed templates. Action buttons only map to whitelisted commands.
- Slash commands resolve in the deterministic router, before any LLM call.
- The ledger section of a memory bank is append-only. Never rewrite or re-paraphrase its entries in code or in prompts.
- Memory banks are plain markdown files. No database.
- Hats come from `tools/th/hats/`. The sandbox comes from th. Retrieval comes from tb/ti. Reuse them; do not duplicate.
- No auth code, no multi-user paths. Out of scope for now.

## How to work

- Follow the dual-entrypoint pattern of `tb`/`ti` (see `.wiki/style_dual_entrypoint`).
- Respect what already exists in the repo. Ask before breaking or changing existing behavior.
- Test with `just test` (bun test).
