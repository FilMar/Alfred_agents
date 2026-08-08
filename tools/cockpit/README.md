# cockpit

Personal web UI to talk to the pi agent from any device in the tailnet. One continuous session, no chat list.

## Problem

Chat tools keep one long message history. Small local models degrade on long histories. Many separate chats fragment the work. Matrix chat and pi-web both have this problem.

## Solution

Episodic stateless execution. Every turn rebuilds a compact context from scratch:

1. User input arrives.
2. Backend assembles context: active memory bank + retrieval from `tb` and `ti`.
3. A fresh pi SDK session answers, with full toolset, inside the th sandbox.
4. The exchange is re-condensed asynchronously into the bank.

A **memory bank** is one markdown file with three sections:

- **Summary** — rewritten by delta-merge each turn (previous summary + last exchange only).
- **Ledger** — append-only fixed sentences: decisions and key facts. Never re-paraphrased. The agent proposes an entry; the user confirms; the router writes it.
- **Tail** — last 3 exchanges verbatim, kept by the backend, no LLM involved.

Each bank also stores its `/safe` profile: the read/write directory allowlist for the agent sandbox. New banks start with write on `essays/`, `dot_file/`, `alfred`.

Slash commands resolve in a deterministic router, before the LLM:

- `/bash <cmd>` — user terminal in the browser. For the user only; not an agent tool.
- `/mem <name>` — switch memory bank. Banks swap atomically: summary, ledger, tail, safe profile.
- `/clean` — reset the current bank.
- `/safe` — menu to toggle read/write directories for the current bank.
- `/black`, `/white`, ... — apply a thinking hat to the next turn. Hats are read from `tools/th/hats/`.
- `/detach <task>` — offload to a background job.
- `/edit-memory` — inspect and fix the bank file.
- `/wake` — future: wake the Desktop and point the model URL there for heavy work.

The model never emits HTML. It emits JSON through an `emit_widget` tool (table, chart spec, action proposal). The backend renders fixed templates. Action buttons only point to whitelisted commands; state-mutating ones need confirmation. Charts come from atlante.

Long-term memory stays where it lives: Third Brain in (christopher), Third Brain out (platone). Banks are disposable; a finished bank's ledger is the input for platone before deletion.

Out of scope: multi-user, auth (tailnet-only for now), LLM-generated HTML, sshfs mounts, SQLite, multi-member orchestration.

## Stack

- Bun + TypeScript
- Hono (same dual-entrypoint pattern as `tb`/`ti`)
- HTMX + Tailwind, server-driven frontend
- `@earendil-works/pi-coding-agent` SDK — fresh session per turn, th sandbox
- Ollama as model backend (Rasp today; Desktop later by changing the URL + `/wake`)
- Memory banks: plain markdown files, one per bank

## Development

From the repo root: `bun install` (once). Then, from this directory:

```
just dev    # run with watch
just test   # run tests
```
