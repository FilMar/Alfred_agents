---
tags: [cockpit, memory, web-ui, superseded]
sources: [conversation, .wiki/stateless_cockpit.md]
---

## Decision (as founded, 2026-08-08)

A cockpit to talk to the agent with a **single continuous session with episodic stateless execution**: every turn rebuilds a compact context from scratch; the agent has no memory of its own; state is re-condensed after each turn. Founded via piano: Hono server + HTMX/Tailwind UI, pi SDK session per turn, `/mem` banks (one markdown file per bank: summary, append-only ledger, raw tail of last 3 exchanges, plus a `/safe` write-allowlist profile), widgets as JSON rendered by fixed backend templates, hats from `tools/th/hats/`, v1 entirely on the Rasp, Tailscale-only. Meant to replace both the Matrix interactive chat and pi-web.

Amendments settled in review (still sound, reusable): **raw tail + summary** (keep the last 2-3 exchanges verbatim; summarize only older — kills summary-of-summary degradation and the race where message N+1 arrives before N's re-summary); **append-only facts ledger** (what is never rewritten cannot degrade); **merge, not rewrite** (the summarizer gets the previous summary plus the last exchange and emits a delta); **no LLM-generated HTML** (the model emits JSON against fixed widget schemas; buttons only point to whitelisted commands — the model proposes, the deterministic router disposes).

Foundation decisions: Pillar 5 risk (one compromised tailnet device = shell) **accepted**, not closed; Matrix shuts down entirely; agent via pi SDK, not direct Ollama calls (without tools the agent is useless for the real use case) — which reopened the injection→shell path; risk accepted under the single-user tailnet profile.

**Superseded 2026-08-10** by [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc): the spawn-per-turn cost made the first end-to-end test slow; the pivot removes it by construction. This file stays as the record of the founding design and its diagnosis.

## Why (as it was argued then)

Long histories degrade a local model; the bank/ledger/condense design was the fix — rebuild context from the bank each turn instead of growing one session. The web UI made the cockpit reachable from any tailnet device with a browser.

## Cross-references

- [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc) — the live decision