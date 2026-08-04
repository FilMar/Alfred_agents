---
name: ermes
description: "Manages emails: triage by tagging, search by any field, browse folders, compose email drafts to file (user sends manually). No deletion, no sending."
---

Arguments are positional only. `just --list` shows all recipes with argument order.

## Tags

Triage tags mail, it does not move it. A tag is a custom IMAP keyword: it
lives on the server, one mail can carry several, and search reads it back.
Mail stays in INBOX.

Tag names are flat words, so a prefix carries the dimension:

- `p/<project>` — the project or thread it belongs to (`p/tef`, `p/oasees`)
- `s/<state>` — what to do with it (`s/todo`, `s/waiting`, `s/done`)

Recipes:

- Add: `just tag-add filippo INBOX p/tef <id1> <id2> ...`
- Remove: `just tag-rm filippo INBOX s/todo <id1> ...`
- Find: `just tag-find filippo p/tef`
- Existing tag vocabulary: `just tags filippo`

Read `just tags` before inventing a name. A near-duplicate (`p/tef` next to
`p/tef-ev`) splits the same set in two and both halves go missing. That list
only grows: the server keeps a tag name after the last mail drops it, so a
name there may carry no mail. `just tag-find` tells you which ones are live.

## Triage

- Fetch: `just inbox filippo INBOX 200`
- Group by sender address/domain — one lookup per sender, not per email.
- Check known rule: `just ti-search "<sender address or domain>"`
- Score > 0.85 → apply directly: `just tag-add filippo INBOX '<tag>' <id1> <id2> ...`
- No match / low confidence → ask the user which tag (or "leave it untagged"). Ask, do not guess.
- After the user decides: tag the emails, then persist the rule: `just ti-add "<sender address or domain>" "<tag>"`
- Correcting an existing rule → do not edit in place. Add a fresh entry with `just ti-add` and the corrected mapping. Prune the stale one later with `just ti-delete <id>`, if it interferes.
- Review rulebook: `just ti-list`

## Search

`just search filippo INBOX [QUERY]`

Query syntax:
- `from <pattern>` / `subject <pattern>` / `body <pattern>`
- `before <yyyy-mm-dd>` / `after <yyyy-mm-dd>`
- `flag seen` / `flag unseen` / `flag <tag>` — any tag name works here too
- Operators: `and`, `or`, `not`

Examples:
- `just search filippo INBOX from paypal and after 2026-01-01`
- `just search filippo pagamenti subject fattura`
- `just search filippo INBOX not flag seen and after 2026-06-01`
- `just search filippo INBOX flag p/tef and not flag s/done`

Show results as a table: ID, from, subject, date.

## Browse

- `just inbox filippo "<folder>"`
- List folders: `just folders filippo`
- Folders still work and `just move` still moves mail, for the rare case a
  folder is the right answer. Triage uses tags.

## Compose

Write a draft to file. Never send it — the user sends manually.

- New message: `just template filippo <to> "<subject>" "<body>"` → saves `~/mail/outbox/<slug>.eml`
- Reply: `just reply filippo <id>` → saves `~/mail/outbox/reply-<id>.eml`, quoted original prefilled
- Read a saved draft: `just show-template ~/mail/outbox/<slug>.eml`
- Edit the body directly in the file, then hand the user the send command (never run it): `just send-cmd ~/mail/outbox/<slug>.eml [account]`
