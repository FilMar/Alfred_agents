---
name: ermes
description: "Manages emails via Himalaya: triage and auto-sort INBOX, search by any field, browse folders, compose email drafts to file (user sends manually). No deletion, no sending."
---

Use the recipes in this skill's `justfile` instead of calling `himalaya` directly — it wraps account handling (`filippo` default, `lavoro`) and folder/id plumbing. Run `just --list` from this directory to see all recipes with their argument order (just takes positional args, not `name=value`).

## Operations

### 1. Triage

No fixed classification script. Sender/subject → folder rules live in `ti` (tags `mail`, `triage`) and grow over time instead of being hardcoded.

1. Fetch envelopes:
   ```bash
   just inbox filippo INBOX 200
   ```
2. Group by sender address/domain (dedupe — one lookup per sender, not per email).
3. For each sender, check for a known rule:
   ```bash
   just ti-search "<sender address or domain>"
   ```
4. High-confidence match (score clearly high, e.g. > 0.85) → apply its `do` (target folder) directly:
   ```bash
   just move filippo INBOX '<folder>' <id1> <id2> ...
   ```
5. No match, or low-confidence: show the sender + subjects to the user, ask which folder they belong to (or "leave in INBOX" / "delete manually"). Do not guess silently.
6. Once the user decides, move the emails **and** persist the rule so it is never asked again:
   ```bash
   just ti-add "<sender address or domain>" "<folder>"
   ```
7. If the user corrects a rule that already exists, do not try to edit it in place (`ti` never overwrites by design) — add a fresh entry with the corrected mapping via `just ti-add`; the newer, more specific rule will naturally outrank the stale one in future searches, and the stale entry can be pruned later with `ti delete <id>` if it keeps interfering.

Review the accumulated rulebook any time with:
```bash
just ti-list
```

---

### 2. Cerca

Use Himalaya's query syntax, passed through the `search` recipe. Always format the output as a table.

```bash
just search filippo INBOX [QUERY]
```

Query syntax:
- `from <pattern>` — mittente contiene pattern
- `subject <pattern>` — oggetto contiene pattern
- `body <pattern>` — corpo contiene pattern
- `before <yyyy-mm-dd>` / `after <yyyy-mm-dd>` — per data
- `flag seen` / `flag unseen` — lette / non lette
- Operatori: `and`, `or`, `not`

Examples:
```bash
just search filippo INBOX from paypal and after 2026-01-01
just search filippo pagamenti subject fattura
just search filippo INBOX not flag seen and after 2026-06-01
```

Show results as a readable table: ID, from, subject, date.

---

### 3. Sfoglia

```bash
just inbox filippo "<folder>"
```

Available folders (list dynamically if unsure):
```bash
just folders filippo
```

---

### 4. Componi

Write an email template to file. **Do NOT send it.** The user will send manually. This is a local `.mml` template, not a server-side draft — there is no reason to save it to the IMAP Drafts folder for this workflow.

```bash
just template filippo <to> "<subject>" "<body>"
```

This saves to `~/mail/outbox/<slug>.mml` via `himalaya template write`, which prefills the correct From header and signature for the given account. To read it back:
```bash
just show-template ~/mail/outbox/<slug>.mml
```

If replying to an existing email, generate the reply template instead — this already saves to `~/mail/outbox/reply-<id>.mml`, prefilled with the quoted original and the account's signature:
```bash
just reply filippo <id>
```
Edit the file to fill in the body (`show-template` to read it, then Edit as usual), then show the send command:
```bash
just send-cmd ~/mail/outbox/reply-<id>.mml
```
