---
tags: [mcp, cli, architecture, tools, contract]
sources: []
replaces: []
---

## Decision

pi does not migrate `tb`, `ti`, `th`, `tl` to MCP (Model Context Protocol). The four tools stay CLI-first with JSON output and optional HTTP APIs. A contract layer with JSON Schemas is added to the CLIs instead. An MCP shim is deferred behind a binary trigger: a second independent client mounting the tools in a stable way.

The decision was made after a council of four experts (kimi-k3/white, glm-5.3/yellow, mistral-large-4/black, gemma4-31b/green, synthesis by kimi-k3/blue) reviewed the pi repository and five research articles on CLI vs MCP vs API for AI agents (2026).

## Why

MCP solves a multi-agent, multi-tenant problem. pi is single-user, single-agent, local. The payoff criterion for MCP is writing the same integration for five different clients. pi has one client. No measured benefit of MCP exists for single-user local systems in the sources reviewed.

pi already has what MCP formalizes:

- CLI tools emit JSON on stdout (tb, ti, th, tl).
- `--help` gives discovery at near-zero token cost (~200 tokens vs ~55k for MCP schema dumps).
- Skills (SKILL.md files) are a human-readable abstraction layer injected into the prompt. They do what MCP discovery does, cheaper.
- `extensions/tb_ti` and `extensions/tl` are hand-built hooks that search tb/ti and inject context. Functionally, they are an MCP server welded to one client.
- `tb serve` and `ti serve` expose Hono HTTP APIs with OpenAPI specs, ready if needed.

The real risks in pi are independent of MCP:

- Prompt debt: SKILL.md files are code in natural language with no type-checking, no tests, no versioning. This grows silently until the system is unmaintainable.
- Prompt injection into shell: an LLM reading untrusted input can generate malicious commands. MCP does not fix this. The CLI inherits the full shell permissions.
- On Raspberry Pi with local LLMs, MCP makes things worse: schema dumps eat context window that small models need.

The council roadmap, in priority order:

- P0 Contract Layer: JSON Schemas for the output of all four CLIs. CI tests that fail on schema deviation. Skills stop describing syntax and point to schemas. Cost: days. Benefit: 70% of MCP value at 10% of cost.
- P1 Security mitigations: scoped command whitelist, audit logging, SQLite race condition fixes in th, zombie process cleanup.
- P2 Binary trigger in ti: if a second independent client (Claude Desktop, Claude Code) needs to mount tb/ti/tl in a stable way, build an MCP stdio shim over the CLIs. Cost: one afternoon. The CLIs stay untouched.
- P3 Optional spike: pi as an MCP client. Test if a community MCP server is genuinely useful. Low cost because `@google/genai` has MCP as an optional peer.

What was rejected:

- Rewriting the four tools as native MCP servers. No measured benefit, payoff criterion not met, worse for local LLMs on RPi.
- Building the MCP facade "to be ready". Readiness without consumers is the over-engineering the user suspected.
- The "Shadow Protocol": SKILL.md files that simulate MCP. This pollutes the source of truth for every future agent that reads them.
- Believing MCP mitigates prompt injection. It does not; injection crosses any transport.

Gemini (the LLM that advised migration) applied a generic framework without seeing the code. It saw the theoretical benefit of standardization, not that pi has one consumer, CLIs already emit JSON, and Skills already do discovery at zero cost.

## Cross-references

- [style_dual_entrypoint](style_dual_entrypoint) — the CLI + HTTP API pattern these tools already follow
- [core_tb_stateless_single_source](core_tb_stateless_single_source) — CLIs hold no state
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the hand-built MCP-like hook that already exists
- [skill_convention_direct_cli](skill_convention_direct_cli) — skills call CLIs directly
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — where the P2 trigger rule lives
