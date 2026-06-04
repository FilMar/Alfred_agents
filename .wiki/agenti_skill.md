---
tags: [agenti, skill, cappelli]
sources: [alfred.md, skills/annibale/SKILL.md, skills/aristotele/SKILL.md, skills/ermes/SKILL.md, skills/feynman/SKILL.md, skills/indiana/SKILL.md, skills/oracolo/SKILL.md, skills/platone/SKILL.md, skills/prometeo/SKILL.md, skills/socrate/SKILL.md, skills/omero/SKILL.md]
updated: 2026-06-04
---

# Agenti e Skill

Ogni agente ha un ruolo cognitivo preciso. Non si sovrappongono — si complementano.

## Catalogo

| Agente | Ruolo | Trigger tipico |
|---|---|---|
| **Annibale** | Orchestratore: scompone lavori in flow multi-cappello | Problema complesso che beneficia di prospettive multiple |
| **Platone** | Sedimenta idee nel TB in modo atomico e connesso | Fine sessione con output di valore |
| **Feynman** | Insegna il corpus TB con la tecnica Feynman | "Spiegami X", "cosa so su Y" |
| **Socrate** | Genera attrito cognitivo: contraddizioni, lacune, assunzioni | "Stressami questa idea" |
| **Aristotele** | Cura sintesi TB: hub, connessioni mancanti, cluster | TB che ha bisogno di struttura |
| **Oracolo** | Recupera conoscenza dal TB senza interpretare | "Cosa c'è nel TB su X" |
| **Ermes** | Estrae testo da URL (web + YouTube) | Qualsiasi URL esterno |
| **Indiana** | Archeologia del codice: diagnostica pattern e debiti tecnici | "Analizza questo progetto" |
| **Prometeo** | Crea e migliora skill: draft, eval, benchmark, ottimizzazione description | "Crea una skill per X" |
| **Omero** | Mantiene la wiki locale del progetto tramite la CLI `tw` | Ingestare sorgenti, query sulla wiki, gestione task, health-check |

## Dettaglio Agenti Chiave

### Annibale (Orchestratore)

I Cappelli de Bono disponibili:

| Cappello | Codice | Ruolo |
|---|---|---|
| Bianco | `white-core` | Fatti, dati, lacune informative |
| Nero | `black-core` | Rischi, presupposti fragili, fallimenti |
| Giallo | `yellow-core` | Valore, opportunità, best-case |
| Verde | `green-core` | Divergenza, alternative non ovvie |
| Rosso | `red-core` | Reazione viscerale, gut feeling |
| Blu | `blue-core` | Sintesi, decisione — chiude sempre il ciclo |

Pattern di esecuzione:
- **Sequenziale**: output di uno → contesto del successivo (default)
- **Parallelo**: `--detach` su tutti + poll + sintesi col Blu

### Platone (Accrescitore della Memoria)

Processo di distillazione: Identificazione → Semplificazione (filtro Feynman) → Sedimentazione interattiva → Proposizione.

Regole assolute:
- Propone sempre prima di salvare — aspetta conferma dell'utente
- Nessun riferimento a nomi di persone, cappelli, o contesto di processo nel `what`/`why`
- Dopo ogni `tb save`: chiama `tb random` e cerca connessioni serendipiche reali

Tipi di nota (`kind`): `dato`, `protocollo`, `sintesi`, `attrito`, `configurazione` — mai `indice` (quello è di Aristotele).

### Socrate (Generatore di Attrito)

Output sempre in formato:
```
[Tensione trovata nel TB]
> "what della nota"

Domanda:
[Una sola domanda, senza risposta implicita]
```

Regola: una domanda sola — la più scomoda. Non valida, non conclude.

### Omero (Wiki Locale)

Tool consentiti: `Bash`, `Read` — niente Write o Edit, la wiki si gestisce solo via `tw`.

Strumento principale: CLI `tw` — non tocca mai `.wiki/` direttamente. `tw` trova la wiki risalendo dal cwd, come `git`.

Struttura:
- `./` — sorgenti del progetto (mai modificare)
- `.wiki/` — layer di sintesi (gestito solo via `tw`)
- `wiki.md` — convenzioni locali (se esiste, si legge prima di ogni operazione)

Comandi chiave:
```bash
tw init [--name <nome>]                                          # crea la wiki
tw page list / tw page get <nome>                                # naviga
tw page update <nome> --section "<H2>" --content "<md>"         # scrivi sezione
tw search "<query>"                                              # cerca
tw task list / tw task add "<testo>" / tw task done "<testo>"   # task
```

Operazioni: **Ingest** (legge sorgenti → discute → `tw page update` sezione per sezione → aggiorna index + cross-ref + log), **Query** (`tw search` → `tw page get` → risposta con citazioni), **Task** (gestione tramite `tw task`), **Lint** (contraddizioni, orfani, gap).

## Invocazione via th

```bash
th run --member <agente> --task "<prompt>"
th run --member <agente> --task "<prompt>" --thinking medium
th run --member <agente> --task "<prompt>" --output /tmp/out.md --detach
```

## Riferimenti incrociati

- [Sistema Overview](sistema_overview.md)
- [CLI Reference](cli_reference.md)
- [Flussi Quotidiani](flussi_quotidiani.md)

## Frontmatter

tags: [agenti, skill, cappelli]
sources: [alfred.md, skills/annibale/SKILL.md, skills/aristotele/SKILL.md, skills/ermes/SKILL.md, skills/feynman/SKILL.md, skills/indiana/SKILL.md, skills/oracolo/SKILL.md, skills/platone/SKILL.md, skills/prometeo/SKILL.md, skills/socrate/SKILL.md, skills/omero/SKILL.md]
updated: 2026-06-04
