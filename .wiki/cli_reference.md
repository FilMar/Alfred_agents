---
tags: [cli, tb, tw, th, reference]
sources: [roadmap.md, skills/oracolo/SKILL.md, tools/tw/src/cli.ts, tools/th/src/cli.ts, tools/th/src/members.ts]
updated: 2026-06-04
---

# CLI Reference

## tb — Third Brain

Memoria semantica. DB globale in `~/.pi/tb.db`.

```bash
# Ricerca
tb search "<query>" [--limit <n>] [--depth <n>] [--hybrid] [--tags <tag>] [--kind <kind>] [--evidence-only] [--include-hubs]
tb browse [--kind <kind>] [--since <ISO date>] [--limit <n>]
tb random                    # nota casuale
tb tags                      # lista tag per frequenza

# Scrittura
tb save --what "<idea>" --why "<ragione>" --kind <tipo> [--tags "tag1,tag2"] [--source <uri>]
tb update <id> [--add-ref "<id>:<ragione>"] [--kind <tipo>]

# Visualizzazione
tb graph                     # grafo interattivo nel browser (PCA 2D)
```

**Formati output:**
- `tb search` → `{ note, score, via, citation }` — i campi della nota sono sotto `.note`
- `tb browse` / `tb random` → note flat: `{ id, what, why, tags, kind, refs, backrefs, when }`
- `tb tags` → `{ value, count }[]`

**Flags ricerca:**
- `--depth 1/2`: espande ai concetti collegati via refs
- `--hybrid`: migliore su termini tecnici e nomi propri
- `--evidence-only`: solo fatti (`dato`)
- `--include-hubs`: include nodi `indice` (nascosti di default)

**Kind validi:** `dato`, `protocollo`, `sintesi`, `attrito`, `configurazione`, `indice`

---

## tw — Third Wiki

Wiki locale di progetto. File in `.wiki/`, registro globale in `~/.pi/tw_registry.json`.

```bash
# Setup
tw init [--name <nome>]              # crea .wiki/ e registra (default: nome dir)
tw register [--name <nome>]          # registra una wiki già esistente
tw wikis                             # lista wiki registrate globalmente

# Pagine
tw page list                         # lista pagine della wiki locale
tw page get <nome>                   # legge una pagina (raw markdown)
tw page update <nome> \
  --section "<sezione>" \
  --content "<markdown>"             # aggiorna una sezione (scrittura atomica)

# Task
tw task list [--page <nome>] [--all]  # task aperti (--all include completati)
tw task add "<testo>" [--page <nome>] # aggiunge task alla sezione Tasks
tw task done "<testo>" [--page <nome>] # segna completato (match parziale)

# Ricerca
tw search "<query>"                  # regex case-insensitive sulla wiki locale
tw search "<query>" --global         # tutte le wiki registrate (sola lettura)
tw search "<query>" --wiki <nome>    # wiki specifica del registro
```

**Comportamento:**
- `tw` cerca `.wiki/` risalendo dal cwd (come `git`)
- `--page` default: `index`
- Task = checkbox markdown `- [ ]` / `- [x]` nella sezione `## Tasks` della pagina
- Scrittura sempre atomica (`write tmp → mv`)
- `--global` e `--wiki` sono sola lettura — scrittura solo sulla wiki locale

---

## th — Third Hand

Orchestrazione agenti. DB in `~/.pi/th.db` (runs + tracking).

```bash
# Membri
th member create <nome> --hat <cappello> --role "<ruolo>" --tools <t1,t2> [--skills <s1,s2>] [--tmp]
th member create <nome> --from <global>   # copia da un membro globale (ignora --hat/--role/--tools/--skills)
th member promote <nome> [--force]        # promuove locale/tmp a globale (~/.th/members/)
th member list [--local] [--global] [--tmp]
th member get <nome>
th member delete <nome>

# Skill disponibili
th skills                                 # lista skill nel progetto corrente

# Esecuzione
th run --member <nome> --task "<prompt>" \
  [--thinking <off|minimal|low|medium|high|xhigh>] \
  [--model <provider/id>] \
  [--output <file>] \
  [--timeout <secondi>] \
  [--detach]

# Cappelli
th hats list
th hats get <nome>

# Storico
th history [--member <nome>] [--limit <n>]
th get <runId>

# Modelli
th models
```

**Scope dei membri:**

| Scope | Path | Visibilità |
|---|---|---|
| Locale | `.th/members/<nome>.md` | Solo progetto corrente |
| Globale | `~/.th/members/<nome>.md` | Tutti i progetti |
| Tmp | `/tmp/.th/members/<nome>.md` | Temporanei, non persistono al reboot |

**Auto-instantiate:** `th run` su un membro globale (non presente localmente) lo copia automaticamente in `.th/members/` prima dell'esecuzione.

**`th member list`** senza flag mostra tutti e tre i gruppi. Con `--local`, `--global`, o `--tmp` filtra il gruppo.

**Sandbox bwrap:** ogni `th run` è isolato in un container read-only (tranne `cwd`, `~/.pi`, `/tmp`).

**`--detach`:** ritorna subito `{ pid, out, log, status }`. Il processo figlio scrive status (`running` → `done`/`error`) su file in `/tmp`.

---

## Git Shortcuts (Alfred)

```bash
ginit      # init + develop branch
gif        # feature branch
gir        # release branch
gib        # bugfix branch
grelease   # release flow
gith       # log graph
# gitu — VIETATO (add+commit+push automatico)
```

Formato commit (solo su richiesta esplicita): `<tipo>(<scope>): <cosa è cambiato e perché>`

## Riferimenti incrociati

- [Sistema Overview](sistema_overview.md)
- [Agenti e Skill](agenti_skill.md)
- [Flussi Quotidiani](flussi_quotidiani.md)
