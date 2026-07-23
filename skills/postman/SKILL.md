---
name: postman
description: "Manages emails via Himalaya: triage and auto-sort INBOX, search by any field, browse folders, compose email drafts to file (user sends manually). No deletion, no sending."
---

## Operations

### 1. Triage

No fixed classification script. Sender/subject → folder rules live in `ti` (tags `mail`, `triage`) and grow over time instead of being hardcoded.

1. Fetch envelopes:
   ```bash
   himalaya envelope list --page-size 200 -o json -f INBOX
   ```
2. Group by sender address/domain (dedupe — one lookup per sender, not per email).
3. For each sender, check for a known rule:
   ```bash
   ti search "<sender address or domain>" --tags mail,triage --limit 1
   ```
4. High-confidence match (score clearly high, e.g. > 0.85) → apply its `do` (target folder) directly:
   ```bash
   himalaya folder create '<folder>'   # idempotent, ignore error if it exists
   himalaya message move -f INBOX '<folder>' <id1> <id2> ...
   ```
5. No match, or low-confidence: show the sender + subjects to the user, ask which folder they belong to (or "leave in INBOX" / "delete manually"). Do not guess silently.
6. Once the user decides, move the emails **and** persist the rule so it is never asked again:
   ```bash
   ti add --if "<sender address or domain>" --do "move to <folder>" --tags mail,triage
   ```
7. If the user corrects a rule that already exists, do not try to edit it in place (`ti` never overwrites by design) — add a fresh entry with the corrected mapping via `ti add`; the newer, more specific rule will naturally outrank the stale one in future searches, and the stale entry can be pruned later with `ti delete <id>` if it keeps interfering.

Review the accumulated rulebook any time with:
```bash
ti list --tags mail,triage
```

---

### 2. Cerca

Use Himalaya's query syntax. Always use `-o json` and format the output as a table.

```bash
himalaya envelope list -o json [QUERY]
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
himalaya envelope list -o json 'from paypal and after 2026-01-01'
himalaya envelope list -o json -f pagamenti 'subject fattura'
himalaya envelope list -o json 'not flag seen and after 2026-06-01'
```

Show results as a readable table: ID, from, subject, date.

---

### 3. Sfoglia

```bash
himalaya envelope list -o json -f "<folder>"
```

Available folders (list dynamically if unsure):
```bash
himalaya folder list
```

---

### 4. Componi

Write an email draft to file. **Do NOT send it.** The user will send manually.

Save the file to `~/mail/outbox/<slug>.mml` (create the directory if it does not exist).

Format (MML — himalaya template format):
```
From: filippo.ufficiale <filippo.ufficiale@gmail.com>
To: <recipient>
Subject: <subject>

<body>
```

For the account `lavoro` use the appropriate From address (check with `himalaya account list` if unsure).

After writing the file, print:
```
Draft saved: ~/mail/outbox/<filename>.mml
To send: himalaya template send < ~/mail/outbox/<filename>.mml
```

If replying to an existing email, generate the reply template with:
```bash
himalaya template reply <id>
```
Then fill in the body, save to `~/mail/outbox/reply-<id>.mml`, and show the send command.
