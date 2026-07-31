---
name: ermes
description: "Manages emails: triage and auto-sort INBOX, search by any field, browse folders, compose email drafts to file (user sends manually). No deletion, no sending."
---

Arguments are positional only. `just --list` shows all recipes with argument order.

## Triage

- Fetch: `just inbox filippo INBOX 200`
- Group by sender address/domain — one lookup per sender, not per email.
- Check known rule: `just ti-search "<sender address or domain>"`
- Score > 0.85 → apply directly: `just move filippo INBOX '<folder>' <id1> <id2> ...`
- No match / low confidence → ask the user which folder (or "leave in INBOX" / "delete manually"). Never guess silently.
- After the user decides: move the emails, then persist the rule: `just ti-add "<sender address or domain>" "<folder>"`
- Correcting an existing rule → do not edit in place: `just ti-add` a fresh entry with the corrected mapping; prune the stale one later with `just ti-delete <id>` if it interferes.
- Review rulebook: `just ti-list`

## Cerca

`just search filippo INBOX [QUERY]`

Query syntax:
- `from <pattern>` / `subject <pattern>` / `body <pattern>`
- `before <yyyy-mm-dd>` / `after <yyyy-mm-dd>`
- `flag seen` / `flag unseen`
- Operators: `and`, `or`, `not`

Examples:
- `just search filippo INBOX from paypal and after 2026-01-01`
- `just search filippo pagamenti subject fattura`
- `just search filippo INBOX not flag seen and after 2026-06-01`

Show results as a table: ID, from, subject, date.

## Sfoglia

- `just inbox filippo "<folder>"`
- List folders: `just folders filippo`

## Componi

Write a draft to file. Never send it — the user sends manually.

- New message: `just template filippo <to> "<subject>" "<body>"` → saves `~/mail/outbox/<slug>.eml`
- Reply: `just reply filippo <id>` → saves `~/mail/outbox/reply-<id>.eml`, quoted original prefilled
- Read a saved draft: `just show-template ~/mail/outbox/<slug>.eml`
- Edit the body directly in the file, then hand the user the send command (never run it): `just send-cmd ~/mail/outbox/<slug>.eml [account]`
