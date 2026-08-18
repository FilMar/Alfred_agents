---
name: ermes
description: "Manages emails: triage by tagging, search by any field, browse folders, compose email drafts to file (user sends manually). No deletion, no sending."
---

Uses `himalaya` for mail and `ti` for triage rules. Accounts:
`filippo` (default) and `lavoro` — pass the account name as the first
argument to target the other one.

## Tags

Triage tags mail, it does not move it. A tag is a custom IMAP keyword: it
lives on the server, one mail can carry several, and search reads it back.
Mail stays in INBOX.

Tag names are flat words, so a prefix carries the dimension:

- `p/<project>` — the project or thread it belongs to (`p/tef`, `p/oasees`)
- `s/<state>` — what to do with it (`s/todo`, `s/waiting`, `s/done`)

The shared "flag" API only knows the four system flags (seen, flagged,
answered, draft). Tags use the raw IMAP API instead:

- Add: `himalaya imap store -a <account> -m <folder> -f '<tag>' -- <id-seq>`
- Remove: `himalaya imap store -a <account> -m <folder> --action remove -f '<tag>' -- <id-seq>`
- Find: `himalaya envelope search --json -m <folder> -a <account> flag '<tag>'`
- Existing tag vocabulary: `himalaya imap flags -a <account> <folder>`

`<id-seq>` is one IMAP sequence set: join the ids with commas, not spaces
(`101,102,103`). The `--` before `-f` is required — `-f` is variadic and
would otherwise swallow the ids.

Read the tag vocabulary before inventing a name. A near-duplicate
(`p/tef` next to `p/tef-ev`) splits the same set in two and both halves
go missing. That list only grows: the server keeps a tag name after the
last mail drops it, so a name there may carry no mail. The "find" search
above tells you which ones are live.

## Triage

- Fetch: `himalaya envelope list --page-size <n> --json -m <folder> -a <account>`
- Group by sender address/domain — one lookup per sender, not per email.
- Check known rule: `ti search "<sender address or domain>" --tags mail --tags triage --limit 1`
- Score > 0.85 → apply directly with the tag-add command above.
- No match / low confidence → ask the user which tag (or "leave it
  untagged"). Ask, do not guess.
- After the user decides: tag the emails, then persist the rule:
  `ti add --if "<sender address or domain>" --do "tag with <tag>" --tags mail --tags triage`
- Correcting an existing rule → do not edit in place. Add a fresh entry
  with the `ti add` command above and the corrected mapping. Prune the
  stale one later with `ti delete <id>`, if it interferes.
- Review rulebook: `ti list --tags mail --tags triage`

## Search

`himalaya envelope search --json -m <folder> -a <account> <query>`

Query syntax:
- `from <pattern>` / `subject <pattern>` / `body <pattern>`
- `before <yyyy-mm-dd>` / `after <yyyy-mm-dd>`
- `flag seen` / `flag unseen` / `flag <tag>` — any tag name works here too
- Operators: `and`, `or`, `not`

Examples:
- `himalaya envelope search --json -m INBOX -a filippo from paypal and after 2026-01-01`
- `himalaya envelope search --json -m pagamenti -a filippo subject fattura`
- `himalaya envelope search --json -m INBOX -a filippo not flag seen and after 2026-06-01`
- `himalaya envelope search --json -m INBOX -a filippo flag p/tef and not flag s/done`

Show results as a table: ID, from, subject, date.

## Browse

- List folders: `himalaya mailbox list --json -a <account>`
- List envelopes in a folder: `himalaya envelope list --page-size <n> --json -m <folder> -a <account>`
- Move mail: `himalaya message move --from '<src>' --to '<dst>' <ids> -a <account>` —
  the destination folder must already exist. Folders still work for the
  rare case one is the right answer; triage uses tags.

## Compose

Write a draft to file. Never send it — the user sends manually.

- New message: `scripts/template.sh <account> <to> "<subject>" "<body>"` →
  saves `~/mail/outbox/<slug>.eml`
- Reply: `scripts/reply.sh <account> <id> [folder]` → saves
  `~/mail/outbox/reply-<id>.eml`, quoted original prefilled
- Read a saved draft: `cat <file>`
- Edit the body directly in the file. Hand the user the send command,
  never run it: `himalaya message send -a <account> -- <file>`
