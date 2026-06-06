# Architettura

## Frontmatter

tags: [architettura, tb, th, tw, layer]
sources: [README.md, roadmap.md]
updated: 2026-06-06

## I tre layer

Pi è un sistema di augmentazione cognitiva personale composto da tre CLI ortogonali:

| CLI | Nome | Scopo |
|-----|------|-------|
| `tb` | Third Brain | Memoria semantica: idee, concetti, connessioni. Grafo associativo immutabile con backrefs e hybrid search. |
| `th` | Third Hand | Orchestrazione agenti con cappelli de Bono. Flow sequenziali e paralleli, sandbox bwrap, tracking SQLite. |
| `tw` | Third Wiki | Wiki locale di progetto. Pagine strutturate, style guide, ricerca regex. |
| `td` | Third Done | GTD: task, progetti, impegni. DB globale SQLite in `~/.pi/td.db`. |

I layer non si sovrappongono per design:
- **Third Brain**: idee che valgono oltre il progetto — principi, pattern, tensioni cognitive. No codice, no documentazione tecnica.
- **Wiki locale** (`.wiki/`): documentazione specifica del progetto — comandi, flussi, architettura. Vive e muore con il progetto.
- **Third Done**: task GTD globali — non contestualizzati al progetto.

## Storage e file system

```
~/.pi/
  agent/          # configurazione agente (SYSTEM.md, skills/)
  th.db           # tracking run th (SQLite)
  td.db           # task GTD (SQLite)
  tw_registry.json # registro wiki globale

~/.local/bin/     # symlink: tb, th, td (setup.sh)

.th/members/      # membri locali del progetto
~/.th/members/    # membri globali
/tmp/.th/members/ # membri temporanei
```

## Sandbox

Ogni `th run` viene eseguito sotto `bwrap` se disponibile. Il filesystem è read-only tranne:
- `cwd` (directory corrente del progetto)
- `~/.pi`
- `~/.bun`
- `/tmp`

L'agente non può scrivere fuori da questi path.

## Setup

```bash
./setup.sh   # installa symlink tb/th/td in ~/.local/bin/, linka alfred.md e skills/
```

`tw` non è ancora incluso in `setup.sh` (da aggiungere, vedi [roadmap](roadmap)).

## Riferimenti incrociati

- [agenti](agenti) — agenti disponibili e ruoli
- [th_cli](th_cli) — CLI completa di `th`
- [tw_cli](tw_cli) — CLI completa di `tw`
- [roadmap](roadmap) — stato fasi di sviluppo
