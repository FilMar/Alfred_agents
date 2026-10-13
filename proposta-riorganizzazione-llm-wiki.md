```markdown
---
type: reference
topic: wiki
status: applied
updated: 2026-10-13
---

# Wiki – Come funziona

La wiki è la memoria strutturata del progetto.  
Viene mantenuta dall'LLM (Omero). L'umano cura le fonti e fa domande.

## Principi

1. **Minimal ma completo** — ogni pagina dice solo ciò che serve.
2. **Una decisione = un file** — niente documenti monolitici.
3. **Hub = stato attuale** — le overview riassumono, non ripetono.
4. **Decisioni working mutabili** — diventano immutabili solo quando applicate.
5. **Storia leggera** — si archivia, non si cancella (salvo casi rari).

## Struttura

```
.wiki/
├── index.md              # catalogo gerarchico (entry-point)
├── log.md                # cronologia append-only
├── AGENTS.md             # regole di navigazione e convenzioni
├── tb/                   # Third Brain
│   ├── overview.md       # hub
│   └── refine/           # sottotopic
│       ├── overview.md
│       └── *.md          # decisioni
├── td/                   # Distiller
├── skills/
├── th/
├── core/
├── style/
└── _archive/             # decisioni supersedute
```

Max 2 livelli di profondità.

## Tipi di pagina

| type       | Ruolo                                      | Mutabile?          |
|------------|--------------------------------------------|--------------------|
| `overview` | Hub di un topic. Sintesi + link            | Sì (si aggiorna)   |
| `decision` | Una singola scelta architetturale          | Solo se `draft`/`accepted` |
| `reference`| Specifica o convenzione                    | Quasi no           |

## Ciclo di vita di una decisione

```
draft → accepted → applied → (opzionale) superseded
```

- `draft` / `accepted` → si può riscrivere liberamente
- `applied` → immutabile (è il comportamento attuale)
- `superseded` → si sposta in `_archive/` e si linka dalla nuova

Se una decisione annulla completamente la precedente:
- la nuova contiene una sezione `## Previous` con riassunto breve
- il file vecchio va in `_archive/` (non si cancella, salvo casi estremi)

## Frontmatter standard

```yaml
---
type: overview | decision | reference
topic: tb/refine
status: draft | accepted | applied | superseded
updated: YYYY-MM-DD
supersedes: path/opzionale   # solo se sostituisce un'altra
---
```

## Navigazione (per l'LLM)

1. Leggi sempre `index.md` per primo
2. Se serve contesto di un topic → leggi `<topic>/overview.md`
3. Solo dopo apri le pagine foglia

## Operazioni

| Operazione | Cosa fa |
|------------|---------|
| **Ingest** | Nuova fonte o decisione → aggiorna/crea pagine + index + log |
| **Query**  | Risponde leggendo la wiki (con citazioni) |
| **Lint**   | Controlla orfani, contraddizioni, hub non aggiornati, link rotti |

## Regole di scrittura

- Prima frase = sintesi completa
- Niente storia lunga (va nel log o in `## Previous`)
- Max 2-4 link in "Vedi anche"
- massimo 20 righe per file decisione 

