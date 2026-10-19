---
tags: [mcp, cli, architecture, tools, contract]
sources: []
replaces: []
---

## Decision

pi does not migrate `tb`, `ti`, `th` and `tl` to MCP (Model Context Protocol). The four tools stay CLI-first with JSON output and optional HTTP APIs. A contract layer with JSON Schemas is added to the CLIs instead. An MCP shim is deferred behind a binary trigger: a second independent client that mounts the tools in a stable way.

The decision came from a council of four experts (kimi-k3/white, glm-5.3/yellow, mistral-large-4/black, gemma4-31b/green, synthesis by kimi-k3/blue). It reviewed the repo and five 2026 articles on CLI, MCP and API for AI agents.

## Why

MCP solves a multi-agent, multi-tenant problem. pi is single-user, single-agent and local. The payoff of MCP is writing one integration for five clients. pi has one client. No measured benefit for single-user local systems was found.

pi already has what MCP formalizes:

- The CLI tools emit JSON on stdout. `tb search` and `ti search` print text blocks and give the full JSON with `--json`.
- `--help` gives discovery for about 200 tokens, against about 55k for an MCP schema dump.
- Skills are a human-readable layer injected into the prompt. They do what MCP discovery does, cheaper.
- `extensions/tb_ti` and `extensions/tl` are hooks that act as an MCP server welded to one client.
- `tb serve` and `ti serve` expose Hono HTTP APIs with OpenAPI specs.

The real risks are independent of MCP. Prompt debt: SKILL.md files are code in natural language with no types, tests or versions. Prompt injection into the shell: the CLI inherits the shell permissions, and MCP does not fix that. On a Raspberry Pi with local LLMs, schema dumps eat the context a small model needs.

The work is in the roadmap, in priority order. P0: JSON Schemas for the output of the four CLIs, checked in CI. P1: security (a command whitelist, an audit log, the SQLite races in `th`, zombie processes). P2: the MCP stdio shim, when the trigger fires. P3: an optional spike of pi as an MCP client.

Rejected: native MCP servers, for no measured benefit. Also rejected: an MCP facade "to be ready", because readiness without consumers is over-engineering. Also rejected: SKILL.md files that simulate MCP, because they pollute the source of truth. And the belief that MCP stops prompt injection: injection crosses any transport. Gemini advised the migration with a generic framework, without seeing the code.

## Cross-references

- [style_dual_entrypoint](style_dual_entrypoint) — the CLI + HTTP API pattern these tools already follow
- [core_tb_stateless_single_source](core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp) — CLIs hold no state
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the hand-built MCP-like hook that already exists
- [skill_convention_direct_cli](skill_convention_direct_cli) — skills call CLIs directly
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — where the P2 trigger rule lives
