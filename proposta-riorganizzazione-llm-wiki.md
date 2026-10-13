---
type: proposal
status: draft
tags: [wiki, architecture, llm-wiki, reorganization]
date: 2026-01-15
sources: [conversation, karpathy-llm-wiki-gist, llmwikis-org-standard]
---

# Proposta: Riorganizzazione Wiki su pattern LLM Wiki

## Problema

La wiki attuale (`.wiki/`) ha 144 file `.md` in una singola directory piatta:

- 76 pagine `memory_*` (53% del totale) senza pagina hub
- Nomi file ipertrofici (fino a 90 caratteri, es. `memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing.md`)
- `index.md` è una tabella piatta di 90+ righe senza sezioni tematiche
- Nessun `log.md` cronologico
- Nessuna pagina overview per topic
- 28 file nascosti con prefisso `.` (decisioni superate)

Il problema non è il caos nei singoli file (sono ben formati: frontmatter, una decisione per file, cross-references) ma la **mancanza di aggregazione**: 65 pagine visibili a livello piatto, zero gerarchia.

## Ispirazione: LLM Wiki (Karpathy, aprile 2026)

Pattern architetturale con 3 strati e 3 operazioni:

| Strato | Descrizione |
|--------|-------------|
| **Raw sources** | Documenti originali immutabili |
| **The wiki** | Pagine markdown interconnesse, mantenute dall'LLM |
| **The schema** | `CLAUDE.md`/`AGENTS.md` che governa convenzioni e workflow |

| Operazione | Scopo |
|------------|-------|
| **Ingest** | Aggiungi fonte → aggiorna pagine esistenti |
| **Query** | Leggi wiki → rispondi con citazioni |
| **Lint** | Health-check: contraddizioni, orfani, pagine mancanti |

Due file speciali di navigazione:
- `index.md` — catalogo **organizzato per categoria**, non lista piatta
- `log.md` — cronologia append-only (`## [YYYY-MM-DD] tipo | titolo`)

## Proposta per la nostra wiki

### 1. Struttura a cartelle per sottosistema

```
.wiki/
├── index.md              # indice gerarchico con sezioni per topic
├── log.md                # cronologia append-only (nuovo)
├── tb/                   # Third Brain — semantic memory
│   ├── overview.md       # hub: cos'è, come funziona, decisiones chiave
│   ├── refine/           # pipeline di raffinamento (10 pagine)
│   │   ├── overview.md
│   │   ├── trust-scoring.md
│   │   ├── archive-threshold.md
│   │   └── ...
│   └── clients.md        # client tb, config, URL per call
├── td/                   # Distiller — 14 componenti, 21 pagine
│   ├── overview.md
│   ├── extractor/        # pipeline estrazione
│   ├── critic/           # validazione
│   ├── config/           # JSON schema, frozen config
│   └── sessions/         # gestione sessioni tl
├── tl/                   # Third Log — 3 pagine
│   └── overview.md
├── ti/                   # Third Identity — 2 pagine
│   └── overview.md
├── skills/               # 22 pagine skill + agents
│   ├── overview.md
│   ├── ritchie/          # 8 pagine raggruppate per skill
│   │   ├── overview.md
│   │   ├── spec.md
│   │   ├── review.md
│   │   └── contracts.md
│   ├── platone/          # consolidation, quality
│   └── ...
├── th/                   # Third Hand — 8 pagine
│   ├── overview.md
│   ├── orchestrator/     # annibale, tailscale, sandbox
│   └── verification/     # check, timeout, state
├── core/                 # Architettura — 10 pagine
│   ├── overview.md
│   ├── orthogonal-layers.md
│   └── graph/            # 4 pagine sul grafo
├── style/                # Convenzioni — 4 pagine
│   └── overview.md
└── _archive/             # 28 file nascosti (decisioni superate)
    └── ...
```

### 2. Nomi file: da frasi a slug brevi

| Prima | Dopo |
|-------|------|
| `memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it.md` | `tb/refine/archive-threshold.md` |
| `memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat.md` | `td/extractor/v7-critic-guard.md` |
| `skill_ritchie_spec_is_a_minimal_italian_document.md` | `skills/ritchie/spec.md` |

Regola: **max 3-5 parole per slug**, suffisso del topic come directory.

### 3. Hub page per ogni topic

Ogni cartella principale ha una `overview.md` che:
- Spiega cos'è il sottosistema in 3-5 frasi
- Elenca le decisioni chiave con link alle pagine detail
- Indica come si relaziona agli altri sottosistemi
- Ha una sezione "See also" verso sottosistemi collegati

### 4. index.md gerarchico

```markdown
# Wiki Index

## Core Architecture
- [Orthogonal Layers](core/orthogonal-layers.md) — tb/ti/th separation
- [Graph Engine](core/graph/overview.md) — deferred, not adopted

## Third Brain (tb)
- [Overview](tb/overview.md) — semantic memory, Qdrant, trust scoring
- [Refine pipeline](tb/refine/overview.md) — 10 pagine: trust, archive, soglie
- [Clients](tb/clients.md) — URL per call, test isolation

## Distiller (td)
- [Overview](td/overview.md) — 14 componenti, estrazione da sessioni tl
- [Extractor](td/extractor/overview.md) — v7 con critic F
- [Critic](td/critic/overview.md) — F-textbook, soglie
- [Config](td/config/overview.md) — JSON schema, frozen

## Skills
- [Overview](skills/overview.md) — 11 skill attive
- [Ritchie](skills/ritchie/overview.md) — spec → contracts → code → review
- [Platone](skills/platone/overview.md) — consolidation, quality, serendipity

## Third Hand (th)
- [Overview](th/overview.md) — orchestrator, verification, sandbox
```

### 5. log.md cronologico (nuovo file)

```markdown
# Wiki Log

Cronologia append-only di ingest, query, lint, riorganizzazioni.

## [2026-01-15] reorganize | Struttura a cartelle per topic
Migrazione da flat a gerarchia: 144 file → 8 cartelle + hub page.

## [2026-01-10] lint | 5 pagine orfane in memory_tb_refine_*
Collegate a tb/refine/overview.md.

## [2026-01-05] ingest | Decisione trust < 0.2 archivia
Creata tb/refine/archive-threshold.md.
```

## Vantaggi

1. **Navigabilità**: da 65 pagine piatte a ~10 hub + detail organizzati
2. **Scalabilità**: index.md gerarchico funziona fino a ~200 pagine per topic
3. **Manutenibilità**: Omero può aggiornare hub page invece di 65 file singoli
4. **Coerenza**: ogni topic ha un overview che sintetizza lo stato attuale
5. **Cronologia**: log.md dà visibilità sull'evoluzione della wiki

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Link rotti dopo rinomina | Script di migrazione che aggiorna tutti i cross-references |
| Troppi livelli di annidamento | Max 2 livelli (topic/sottotopic), no deeper |
| Hub page che diventa stantia | Lint periodico: hub deve linkare tutte le pagine del topic |

## Prossimi passi

1. [ ] Conferma struttura proposta
2. [ ] Creare script di migrazione (rinomina + sposta + aggiorna link)
3. [ ] Eseguire migrazione su branch `refactoring/wiki-llm-structure`
4. [ ] Verificare con `omero lint`
5. [ ] Aggiornare Omero SKILL.md con nuove convenzioni
6. [ ] Merge e aggiornare index.md

## Cross-references

- [Wiki è il progetto](memory_wiki_is_the_project) — la wiki vive e muore col progetto
- [Omero skill](skill_convention_direct) — convenzioni attuali
- Pattern esterno: [Karpathy LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- Standard: [llmwikis.org Structure Standard](https://llmwikis.org)

---

# Alternative architectures research

Ricerca su organizzazioni alternative rispetto alla struttura a cartelle per topic.

## 1. Flat + Frontmatter (no folders, solo metadata)

**Idea:** Zero cartelle, tutto in root. L'organizzazione è nel frontmatter (`type`, `topic`, `domain`, `status`) + wikilinks. Filtri via Dataview/obsidian-query.

| Pro | Contro |
|-----|--------|
| Nessun problema di "dove metto questo file" | 200+ file in una cartella = ingestibile per umani |
| Migrazioni sono solo frontmatter edit, zero file move | No struttura fisica, difficile da navigare senza tool |
| Ideale per Zettelkasten puro | Richiede tooling (Dataview) per essere navigabile |

**Implementazioni:** [nanowiki](https://github.com/ievertan00/nanowiki) — `notes/` flat, `moc/` auto-generati dal CLI, `meta/index.md` come catalogo.

**Verdict per noi:** No — abbiamo 144 file, flat è già il problema attuale. Aggiungere solo frontmatter non risolve.

---

## 2. LYT (Linking Your Thinking) — MOC-based

**Idea:** Note atomiche flat in `notes/`, organizzazione tramite **MOC** (Map of Content) — pagine hub che linkano note per topic. Navigazione per link, non per cartelle.

```
wiki/
├── notes/           # tutte le note, flat
│   ├── trust-scoring.md
│   ├── archive-threshold.md
│   └── ...
├── mocs/            # Map of Content per topic
│   ├── tb-refine.md      # hub: tutte le note su tb refine
│   ├── td-extractor.md   # hub: tutte le note su td extractor
│   └── ...
└── index.md         # super-MOC, linka tutti i MOC
```

| Pro | Contro |
|-----|--------|
| Scala magnificamente (>1000 note) | MOC vanno mantenuti a mano, possono andare stali |
| Navigazione per link = connessioni semantiche | Flat notes folder = caos visivo senza MOC |
| Ogni nota può appartenere a più MOC | Richiede disciplina nel linking |

**Implementazioni:**
- [claude-obsidian wiki-mode LYT](https://github.com/AgriciDaniel/claude-obsidian) — `wiki/notes/` flat + `wiki/mocs/` per topic
- [SherlockLiu's gardener approach](https://sherlockliu.co.uk) — MOCs come "categorie", folders come "fasi di crescita"

**Verdict per noi:** Interessante, ma i nostri MOC sarebbero praticamente le cartelle rinominate. La differenza è che LYT usa link invece di path. Per un agent che legge file, il path è più efficiente del link-following.

---

## 3. PARA (Projects / Areas / Resources / Archive)

**Idea:** Organizza per **actionability**, non per topic:
- **Projects** — lavoro attivo con deadline
- **Areas** — responsabilità continue (no deadline)
- **Resources** — materiale di riferimento per topic
- **Archive** — completato/inattivo

| Pro | Contro |
|-----|--------|
| Chiaro séparation active vs reference | Le nostre decisioni non sono "progetti", sono architettura |
| Ottimo per knowledge worker | Non mappa bene a sottosistemi tecnici (tb/td/ti) |
| Lifecycle esplicito (project → archive) | Archivire una decisione tecnica non ha senso — resta lì |

**Verdict per noi:** No — la nostra wiki documenta decisioni architetturali, non progetti. PARA è per chi fa content/strategy, non per chi escribe decisioni di sistema.

---

## 4. Zettelkasten (ID-based, flat, dense linking)

**Idea:** Ogni nota ha un ID univoco (timestamp). Nessuna cartella. Organizzazione solo via `parent_id`/`child_ids`/wikilinks. Massima densità di link.

```
wiki/
├── 20260115143022222345.md   # trust scoring
├── 20260120091530111234.md   # archive threshold
└── ...                        # 100% flat, ID-based
```

| Pro | Contro |
|-----|--------|
| Massima link density | Nomi file illeggibili per umani |
| Nulla da "dove lo metto" | Richiede tooling per navigare |
| Ideale per thinking/linking | Overkill per decisioni architetturali |

**Verdict per noi:** No — i nostri file devono essere leggibili da umani (Omero li legge, li scrive). Gli ID-nascondono il contenuto.

---

## 5. Domain-driven (Igor Schwarzmann's "Brain Dead" vault)

**Idea:** Struttura ibrida con:
- `intake/` — sorgenti esterne (sticky, mai mossi)
- `atlas/` — registro globale di entità (people, orgs, concepts)
- `projects/[name]/` — lavoro time-bound
- `domains/[name]/` — aree di responsabilità
- `_system/` — documentazione architettura

Ogni dominio ha un `_domain.md` manifest con regole di promozione.

| Pro | Contro |
|-----|--------|
| Sticky intake = zero file move = zero broken links | Complesso, 6+ livelli di astrazione |
| Separazione netta sorgenti/sintesi/lavoro | Overkill per un progetto singolo |
| Adatto a team multi-agente | Troppo per il nostro caso d'uso |

**Verdict per noi:** Interessante per l'idea di "sticky sources", ma troppo complesso. Noi abbiamo solo "decisioni", non progetti/sorgenti/entità.

---

## 6. Hybrid: Topic folders + MOC overview (la nostra proposta)

La proposta originale combina i meglio di due mondi:
- **Cartelle per topic** (tb/, td/, skills/) — navigazione fisica, path leggibili
- **Overview page per topic** — MOC-like, ma fisica (invece che link-only)
- **index.md gerarchico** — super-MOC testuale

Questo è un **ibrido pragmatico**: la struttura a cartelle dà un "posto" fisico ai file (utile per agenti che navigano per path), l'overview dà il contesto semantico (utile per umani e agenti che leggono).

---

## Confronto finale

| Architettura | Fit per noi | Perché |
|-------------|-------------|--------|
| **Flat + frontmatter** | 2/10 | È il problema attuale, non la soluzione |
| **LYT (MOC-based)** | 6/10 | Buona idea, ma i path sono più efficienti per agenti |
| **PARA** | 3/10 | Troppo orientato a progetti, non a decisioni |
| **Zettelkasten** | 2/10 | Nomi illeggibili, overkill per decisioni |
| **Domain-driven** | 5/10 | Troppo complesso, utile solo il "sticky" concept |
| **Hybrid: folders + overview** | **9/10** | Pragmatico, bilancia navigazione fisica e semantica |

---

## Elementi da rubare dalle alternative

Anche scartando le alternative pure, alcuni pattern sono utili:

1. **Sticky sources** (da Brain Dead): le décisions non vengono mai "spostate", si marchia `superseded` e si linka la nuova. Noi già usiamo il dot-prefix — è lo stesso pattern.

2. **Frontmatter `type`** (da LYT/Zettelkasten): aggiungere `type: decision|overview|reference` al frontmatter per distinguere hub page da detail page.

3. **MOC auto-generati** (da nanowiki): uno script che genera `moc/<topic>.md` dai frontmatter, invece di mantenerli a mano. Potremmo farlo dopo la migrazione.

4. **Progressive index L0/L1/L2** (dalla community Karpathy): `index.md` a 3 livelli di dettaglio — overview (10 righe), topic (50 righe), full (tutte le pagine). Utile quando la wiki cresce oltre 200 pagine.

5. **Growth stages** (da digital garden): tag `🌱seedling | 🌿budding | 🌲evergreen` per marcare maturità delle pagine. Noi abbiamo già `trust` in tb — analogo ma numerico.

---

## Raccomandazione finale

Restiamo con la **proposta ibrida** (cartelle per topic + overview page), ma integriamo:

- `type: overview|decision` nel frontmatter per distinguere hub da detail
- Script di generazione automatica degli indici per topic (post-migrazione)
- Opzione futura: progressive index L0/L1/L2 se la wiki supera 200 pagine
