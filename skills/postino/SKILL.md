---
name: postino
description: "Manages emails via Himalaya: triage and auto-sort INBOX, search by any field, browse folders, compose email drafts to file (user sends manually). No deletion, no sending."
---

## Operations

### 1. Triage

Scans a folder (default INBOX), auto-classifies emails, moves them to the right folders, and warns about messages worth deleting manually.

```bash
bash /home/filippo/git_projects/pi/skills/postino/scripts/triage.sh
```

For a folder other than INBOX or custom page size:
```bash
bash /home/filippo/git_projects/pi/skills/postino/scripts/triage.sh --folder focus --page-size 200
```

The script:
- Creates missing folders automatically (`promo`, `notifiche`, `archiviare`)
- Moves emails and prints a summary
- Marks categories like promo / old meeting invites / site notifications with a delete suggestion (the user deletes manually)

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
