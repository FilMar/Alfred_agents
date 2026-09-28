---
tags: [orchestrator, cockpit, th, removal, testing]
sources: [conversation, ROADMAP_MEMORIA.md, tools/orchestrator, tools/cockpit, tests/orchestrator.test.ts]
replaces: [orchestrator_minimal_rest_surface, orchestrator_run_task_matrix_only, orchestrator_adversarial_audit_static, orchestrator_filesystem_state_no_db, orchestrator_boot_callback_wake_window, orchestrator_bwrap_task_execution, orchestrator_metadata_exported_constants, orchestrator_remaining_work, cockpit_pivot_pi_extension_rpc]
---

## Decision

`tools/orchestrator/` and `tools/cockpit/` are removed from the repository, with their two test files. Filippo deleted them on 2026-09-28: he does not use either.

Nothing replaces them. Delegated execution is `th`'s job. Scheduling has no user: the orchestrator was paused on 2026-07-21 because no real recurring task justified finishing it, and two months later there still is none.

What the removal does **not** touch:

- [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) stays live. Its decision is about the network perimeter, not about the orchestrator: one Tailscale-only ingress, no application-level auth, and a control bot that must be self-hosted inside the tailnet rather than on Telegram's servers. `tl` was designed under that rule on the same day this removal happened, and [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) cites it too. The page keeps its `orchestrator_` name because a file name is a page's identity — the name is stale, the decision is not.
- [rasp_services_provisioning_order](rasp_services_provisioning_order) stays live. One service left that list; the order and the dependencies between the others stand, and `tl` joins them.
- [th_sandbox_bwrap_fixed_binds](th_sandbox_bwrap_fixed_binds) and [th_verification_outside_members](th_verification_outside_members) stay live. The orchestrator reused `th`'s sandbox and its verification stance, not the other way round.

## Why

The two tools were not costing nothing while nobody ran them. They were breaking the test suite for everything else.

Measured on 2026-09-28: the suite had 7 to 8 failures out of 154, and they moved between runs. Every file passed alone — `th` 41 of 41, the two orchestrator suites 35 and 24 — and the failures only appeared when `bun test tests/` ran the files in parallel, because the orchestrator suites and `th`'s share state on the filesystem. Six of the failures surfaced inside `th`, which is why an earlier diagnosis in `ROADMAP_MEMORIA.md` blamed `th`'s own fixtures and was wrong twice: first about the cause, then about which suite held it.

Removing the orchestrator made the suite green for the first time: **161 of 161, stable over three consecutive runs**. That is the price of unused code stated as a number. It does not sit in the directory it occupies; it sits in every run of the suite, in every diagnosis that has to route around it, and in the trust the suite loses when its red is permanent.

The code is not gone: git holds it, and the nine superseded pages are on disk with a leading dot. If a recurring task ever appears that needs a machine woken over Wake-on-LAN, the design is there to read. What is gone is the claim that it is current.

## Cross-references

- [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) — the decision that outlived the tool
- [agents_hats_replace_members](agents_hats_replace_members) — where delegated execution lives now
- [wiki_superseded_hidden_with_dot](wiki_superseded_hidden_with_dot) — why the nine pages are hidden rather than deleted
