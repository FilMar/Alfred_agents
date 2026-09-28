# ROADMAP — Memoria adattiva (`tb`, `ti`, `tl`, `th`)

Documento vivo, in italiano, guidato da Filippo. Affiancato a `ROADMAP.md`, che resta la roadmap di `third_os`.

## Il problema in una frase

La memoria funziona solo se Filippo approva ogni nota e conferma ogni regola. Il gate umano è il collo di bottiglia, ed è scritto nelle regole di governo (Platone propone e l'utente legge; Mosè "never without explicit user confirmation"), non nel codice. L'obiettivo è togliere il gate senza trasformare la memoria in una discarica.

## L'architettura

Quattro tipi, un punto d'ingresso, un giudice, un log che basta a sé.

| Tipo CoALA | Domanda | Store | Motore | Cosa si embedda |
|---|---|---|---|---|
| Working | cosa vedo adesso | context window | hook `tb_ti` | — |
| Semantic | cosa so | `tb` | Qdrant | `why` + `what` |
| Procedural | cosa faccio dato un contesto | `ti` + skills | Qdrant + `SKILL.md` | solo `if` |
| Episodic | cosa è successo | `tl` | SQLite + REST | niente |

`.wiki/` **non è uno strato**: è il quadernino con cui l'agente traccia l'evoluzione di un progetto, e la sua metà generale esce verso `tb`. Vedi `.wiki/memory_wiki_is_the_project_notebook`.

L'identità sta in due metà che non si mescolano: descrittiva in `tb` col campo `about`, prescrittiva in `ti` come `if`→`do`. Vedi `.wiki/memory_identity_splits_descriptive_prescriptive`.

## Diagnosi misurata (2026-09-28)

Corpus: **737 note** in `third-brain`, **54 regole** in `pi_identity`.

| Misura | Valore | Cosa dice |
|---|---|---|
| Note per mese | mag 309, giu 223, lug 81, ago 85, set 39 | il rito si sta spegnendo: **-8x in quattro mesi**. Il fardello è già nei dati |
| `hits` / `last_hit` | 199 note con almeno un hit, **538 su 737 mai colpite**, max 4, 6 giorni distinti di storia | il segnale d'uso è scritto da `recordHits` e **letto da nessuno** |
| `kind` | protocollo 272, dato 165, sintesi 157, attrito 122, indice 17, configurazione 4 | il corpus è al 37% procedurale; le decisioni stanno in `.wiki/`, non in `tb` |
| `refs` | 1150 archi, 1.56 per nota, 628 note con almeno un ref, max 6 | grafo sottile ma esteso |
| **Ridondanza dei `refs`** | il bersaglio era già nei primi 10 vicini vettoriali solo nel **26%** dei casi; **oltre il 200esimo nel 23%** | tre quarti dei link tengono una relazione che il coseno non tiene. I `refs` restano |
| **Carico di `depth 1`** | **+11.9 note** per ricerca, `score: null`, senza soglia né ordine; il 45% oltre il 200esimo vicino della query | portata senza ranking. Valore e rumore indistinguibili |
| **Telemetria dei correlati** | `recordHits` filtra `via === "search"`; `traverseCorrelates` segue solo `refs`, mai `backrefs` | il sistema non può sapere se usa i ref, e percorre metà del grafo |
| Duplicati semantici | coppie ≥0.9: **2**; ≥0.85: **32** (54 note, 7%) | duplicazione mite, e **18 delle 32 coppie non sono collegate** (inclusa quella a 0.93) |
| Campo `why` | 39% del testo embeddato, ma solo **1%** cita altre note o gap del TB | il `why` è contesto vero, non meta-commento |
| Contaminazione di progetto | **0** note con code fence, **1** che cita path del repo | la separazione con `.wiki/` tiene |
| Provenienza | `source` su **368/737 (50%)**, di cui 192 con URL risolvibile | per 369 note la nota è l'unico artefatto esistente |
| **Rotazione dei transcript** | 95 MB, 76 sessioni, la più vecchia **esattamente un mese**; 5-7% esternalizzato in `tool-results/` | i 369 senza fonte sono la rotazione a 30 giorni, non un buco di schema |
| **Moltiplicatore del contesto** | 816k token scritti in cache contro 23.7M letti: **ogni token in contesto è riletto ~29 volte** | il rumore nell'hook non si paga una volta, si paga per tutta la sessione |
| `ti` | campi `if`, `do`, `tags`. 51 regole su 54 hanno un solo `do`. Nessun campo d'uso | `ti` non può decadere né imparare |
| `th` | `Member = { name, hat, tools }`. `~/.th/members/` contiene **solo fixture di test**; `th history` mostra membri inventati al volo | il file membro è cerimonia: l'effimero è già la prassi |

### Conclusione della diagnosi

Lo Zettelkasten **non è la fonte del rumore**: duplicazione mite, `why` legittimo, zero contaminazione, tag sani. I duplicati che esistono sono la stessa fonte ingerita due volte — un buco nella pipeline di scrittura, non nello schema.

E i `refs` non sono decorazione: sono la parte del corpus che un indice vettoriale non può ricostruire. Un arco su quattro punta dove nessun limite ragionevole arriverebbe.

Quello che lo Zettelkasten costa davvero è due cose:

1. **L'immutabilità** di `what`/`why`/`kind`, che litiga con supersede, critico e credenze che evolvono.
2. **I link a mano**: i candidati sono gratis (vicini vettoriali già in Qdrant, e più avanti gli scambi di `tl`) e nessuno li genera.

## Cosa non si fa

- **Non si sostituisce `tb` con Hindsight.** Hindsight, Mnemosyne e Mem0 stanno tutti nello slot episodico: sono candidati motore di `tl`, non di `tb` né di `ti`.
- **Non si svuota per "reinserire con più cognizione".** Per 369 note su 737 il grezzo non esiste più: sarebbe parafrasi, non ri-estrazione.
- **Non si aggiunge un motore a grafo nativo.** Soglia per riaprire la decisione in `.wiki/memory_graph_engine_deferred_not_needed`: oggi sei all'opposto su tutte e tre le condizioni.
- **Non si indicizza `.wiki/` in Qdrant.** Riempirebbe `tb` delle convenzioni di quaranta progetti. La distillazione deve perdere informazione.
- **Non si fanno riscrivere le skill da sole** (gap 6). Resta mossa 3 di `.wiki/memory_log_first_three_moves`.
- **Da adesso si conserva il grezzo** per ogni fonte nuova: nota `99e6a68e`, registrata e mai applicata.

## Decisioni prese

| Domanda | Scelta |
|---|---|
| Cosa sostituisce l'OK in scrittura | **`status: provvisoria` + decadimento.** Due filtri indipendenti, nessuno dei due perfetto. Il critico è il secondo, non il primo: `provvisoria` + oblio bastano ad aprire il gate |
| Cosa succede a una nota superata | **Supersede tracciabile.** Resta, esclusa dalla ricerca di default, con link a chi la sostituisce |
| Chi giudica | **L'uso.** `hits` sui diretti, `hits_related` sui correlati, eventi in `tl`. Filippo resta corte d'appello, non primo grado |
| Portata e ranking | **Tre portate** (denso, sparso, `refs`+`backrefs`) e **un solo ranking**. Ogni correlata riceve uno score contro la query |
| Di chi parla una nota | **`about`**, insieme aperto di nomi di entità; `mondo` quando non parla di nessuno. Non `owner`: dice il soggetto, non il proprietario |
| Forma di `tl` | **Archivio del lavoro, non log di eventi.** Una riga per scambio; `kind` ha due valori, `chat` e `subtask`. Tre tabelle: `sessions`, `exchanges`, `contents`. `.wiki/memory_tl_work_archive_not_event_log` |
| Cosa contiene `tl` | **Tutto**, body compresi, più `tool-results/`. Copia autosufficiente, mai autorità. Entra nei backup di Clio |
| Quanti distillatori | **Uno.** La wiki non è una sorgente separata: un `Write` su `.wiki/` è contenuto di uno scambio |
| Modello utente | Non è uno strato: sono note `tb` con `about: filippo`, stesso critico e stesso oblio |
| Membri `th` | **Si tolgono.** `th run --hat <cappello> --task ... --prompt "<system prompt extra>" --tools ...` |

Due vincoli di onestà da non dimenticare in implementazione:

- **Il critico v1 è una rubrica scritta, non appresa.** Le correzioni passate ("snellisci") vivono nelle chat, non in un log. La rubrica si scrive dalle fonti che esistono (`skills/platone/SKILL.md`, i vincoli di stile in `CLAUDE.md`, le regole `ti` pertinenti) e impara solo quando `tl` registra le bocciature.
- **Il ranking per uso parte come spinta debole, non come filtro.** `last_hit` ha 6 giorni di storia: filtrare oggi vuol dire seppellire note buone mai ancora cercate.

## Le fasi

### Fase 0 — Indice e schema

Quattro cose in una sola ricostruzione, perché ricostruire l'indice si paga una volta.

**Il modello.** Si passa a `nomic-embed-text-v2-moe` (768 dimensioni, Matryoshka fino a 256, ~100 lingue). Il corpus è interamente in italiano e l'attuale `nomic-embed-text:latest` (137M, v1.5) è addestrato in inglese: è la ragione del cambio. Il limite di 512 token non morde — misurato su `why+what`: mediana 505 caratteri, p99 1007, massimo 1312.

**I prefissi.** `search_document:` in scrittura, `search_query:` in ricerca, in `tb` e in `ti` (che riusa `infra.ts`). Obbligatori per entrambi i modelli Nomic: senza, confronti vettori prodotti in un modo per cui il modello non è stato addestrato.

**L'alias.** `COLLECTION` diventa un alias; la collection reale porta modello e dimensione nel nome. Ricetta verificata end-to-end, senza re-embed, in `.wiki/memory_alias_makes_migration_reversible`:

1. Snapshot con Clio.
2. Crea `third-brain__nomic-v1.5-768` con la stessa configurazione (dense + sparse).
3. Copia i 737 punti con `scroll(with_vector=true)` -> `upsert`: dense, sparse e payload sopravvivono identici.
4. Verifica: stesso conteggio, cinque note a campione identiche all'originale.
5. Cancella `third-brain` — un alias non può avere il nome di una collection esistente (HTTP 409).
6. Crea l'alias `third-brain` -> `third-brain__nomic-v1.5-768`.

Da qui la v1.5 resta viva come riferimento e come rollback: `third-brain__v2moe-768` si costruisce a parte e il passaggio è uno spostamento di alias.

**Prerequisito non negoziabile:** `ensureCollection()` (`tools/tb/src/qdrant.ts`, righe 69-92) *cancella* la collection se manca `sparse_vectors`. Va trasformato in un errore rumoroso **prima** di qualsiasi migrazione.

**I campi nuovi.** Chiavi in inglese come le esistenti, valori in italiano come `kind`:

| Campo | Valore alla migrazione |
|---|---|
| `embed_model` | il modello che ha prodotto il vettore |
| `status` | `promossa` per tutte le 737 esistenti; `provvisoria` sarà il default delle nuove |
| `superseded_by` | `null` |
| `about` | `mondo` per tutte le esistenti; si correggerà a mano dove è falso, non si indovina in massa |
| `updated_at` | uguale a `when` alla migrazione |
| `refs[].origin` | `umano` per tutti i ref esistenti: sono stati scritti a mano |
| `source_raw` | vuoto sulle vecchie, obbligatorio sulle nuove |
| `source_event` | `null` sulle vecchie; sulle nuove lo scambio `tl` da cui nascono |

Nella stessa passata si normalizza il debito: 24 note con `refs` duplicati, 1 self-ref, 1 payload senza campo `id`, **11 archi che puntano a note inesistenti**. È riparazione, non cancellazione.

`pi_identity` segue la stessa meccanica (alias, prefissi, `embed_model`). I campi di uso ed esito delle regole restano Fase 5.

**La misura, senza giudizi umani.** Tutto in italiano: il cross-lingua non si misura perché non lo usi.

- **Auto-recupero da parafrasi** — il discriminante. 120 note a campione, una riformulazione italiana del `what` generata una volta e committata, con divieto di riusare i nomi distintivi. Metriche `recall@1` e `MRR@10`: posizioni, non punteggi.
- **Ref-recall@10** — gratis: i `refs` scritti a mano sono giudizi di pertinenza già pagati. Sbilanciato a favore di v1.5, quindi se v2 vince comunque il risultato è solido.
- **Controllo** — una query volutamente irrilevante deve restare visibilmente sotto (regola `ti` esistente).
- Confronto in **dense-only** sulle due collection: lo sparse è indipendente dal modello.

**Finita quando:** l'alias `third-brain` punta alla collection v2, la v1.5 esiste ancora, il confronto è committato con i numeri di entrambe, e `tb search` risponde come prima o meglio.

**Fuori da questa fase:** altri modelli candidati (`bge-m3`, `qwen3-embedding`) — l'armatura di misura li accoglie quando vorrai. E nessun comportamento nuovo: i campi nascono, la logica che li legge viene dopo.

### Fase 1 — Ranking e telemetria dei correlati

Venti righe, e sono il giudice di tutto il resto. Prima di `tl` per costo, non per importanza.

- **Score sui correlati**: una nota raggiunta via `refs` è valutata col coseno contro la query, non lasciata a `score: null`. Diventa ordinabile e tagliabile con `min_score`.
- **`hits_related`**, campo separato: `recordHits` conta anche i correlati. Da qui in poi "l'agente usa i ref?" è una query, non un'analisi.
- **Traversal dei `backrefs`** oltre ai `refs`: metà degli archi scritti oggi non viene percorsa.
- `--min-score` nativo su `ti search` (debito già segnalato in `.wiki/memory_ti_context_action_rules`).

**Finita quando:** una ricerca `depth 1` restituisce correlate ordinate e tagliate, e dopo una settimana `hits_related` ha numeri diversi da zero.

### Fase 2 — `tl`

Lo strato episodico. Produce esperienze e archi senza far leggere niente a nessuno.

- Schema come in `.wiki/memory_tl_work_archive_not_event_log`: tre tabelle, `sessions`, `exchanges`, `contents`. `kind` ha due soli valori, `chat` e `subtask`.
- **Ingestione degli scambi** via hook di fine turno: una riga per scambio, `input` e `output` in `contents`, spediti insieme ai file di `tool-results/`. I token si leggono dal transcript stesso (`input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `model`): nessuna dipendenza dall'harness.
- Niente compressione e niente indici, per ora. Un log che devi decomprimere non lo guardi, e a 6.000 righe al mese SQLite scansiona tutto senza che si noti.
- `distilled` (timestamp, `NULL` se mai) è la coda del distillatore: `WHERE distilled IS NULL`. È l'unico campo mutabile, ed è contabilità sulla pipeline, non storia.
- Timestamp in TEXT, ISO-8601 UTC, sempre con la `Z` e a larghezza fissa. SQLite non ha un tipo datetime e non valida niente: il formato è una regola di chi scrive, e una riga scritta in un altro modo si ordina nel posto sbagliato senza mai dare errore.
- **`tl` entra nei backup di Clio.** Contiene l'unica copia dei transcript, che altrimenti sparirebbero in 30 giorni.

Gli scambi `subtask` lanciati da `th` arrivano **dopo** la Fase 6, così nascono con `actor = cappello` e non si riscrivono. La Fase 2 non li aspetta: le chat sono il 95% e non dipendono da `th`.

**Finita quando:** una settimana di lavoro è interrogabile per sessione, macchina e costo con un `SELECT *` leggibile, e da uno scambio si risale al testo completo di cosa è stato chiesto e fatto.

### Fase 3 — Il distillatore

Uno, non due. Legge una finestra temporale di eventi e propone note e regole `provvisorie`.

- Gira periodico e senza chiedere. Modello piccolo e locale (1-12B basta per l'estrazione).
- Ogni nota nasce `provvisoria`, con `source_raw` pieno e `source_event` che punta allo scambio da cui viene.
- Controllo di duplicazione **in scrittura** — è il buco che ha prodotto i duplicati attuali: sopra soglia si fonde o si scarta, non si aggiunge.
- **La regola di estrazione** è una domanda dentro il prompt, non un componente: *il perché sopravvive se cancello il progetto?* Sì → nota `tb` in italiano e in prima persona, con il path della pagina come `source`. No → resta nella wiki.
- Ammissione per le note `about: filippo`: ogni affermazione cita gli eventi `tl` che la sostengono, o non entra.

**Finita quando:** una sessione produce note in `tb` senza che Filippo le legga, i duplicati ≥0.9 non aumentano, e la metà generale di una pagina wiki compare in `tb` da sola.

### Fase 4 — Oblio e supersede

La rete di sicurezza. Ha bisogno dei contatori della Fase 1 e degli eventi della Fase 2.

- `provvisoria` mai colpita entro N giorni → **decade**, cancellabile: era gratis.
- `promossa` → non si cancella mai, si **supera**: `superseded_by` punta alla versione nuova, la ricerca esclude le superate per default con flag per vederle.
- Ranking pesato su `hits`/`last_hit` come **boost**, non come filtro.
- Candidati-ref automatici dai vicini vettoriali e da `source_event` condiviso (due note nate dallo stesso scambio sono collegate con una provenienza, non con un'ipotesi), con `ref.origin` (`auto` | `umano`) e `reason` sempre presente.
- Sanità su `addRefs`: dedup, blocco dell'auto-riferimento.

**Finita quando:** una nota superata smette di comparire senza essere cancellata, una `provvisoria` inutilizzata sparisce da sola, e `tb` propone il collegamento della coppia a 0.93 oggi scollegata.

### Fase 5 — Schema nuovo di `ti`

54 righe: il più economico da rifare, e l'unico store il cui schema è davvero insufficiente.

- Esito e uso: quante volte la regola è stata applicata, con quale risultato, ultima applicazione, ambito, eventuale scadenza. Le fonti sono gli eventi `tl`.
- Decadimento: una regola mai applicata sbiadisce; una correzione ripetuta diventa regola.
- Migrazione delle 54 regole esistenti.

**Finita quando:** `ti` sa dire quali regole non ha mai usato, e le 54 vivono nel nuovo schema.

### Fase 6 — `th` senza membri, critico, riscrittura delle query

Nessuna delle fasi precedenti dipende da queste.

- `th`: fuori `member create/list/get/delete/promote` e `--from`; `run` prende cappello, task, prompt extra, tools. `fury` perde il mestiere, `annibale` smette di passare nomi di membri. Poi gli eventi `th.run` in `tl`.
- Il gap 6 di `.wiki/memory_procedural_six_gaps` (promozione membro↔skill) si **chiude come obsoleto**: con nomi inventati a ogni run non esiste storico da promuovere. L'unità su cui si accumula esperienza diventa il cappello — 6, stabili, matrice densa.
- **Critico** come secondo filtro: valuta con la rubrica, boccia o snellisce. Ogni bocciatura è un evento `tl`, perché la rubrica possa migliorare.
- **Riscrittura delle query** nell'hook: un modello piccolo traduce il prompt conversazionale in una query. Da valutare con una misura, non da assumere.

**Finita quando:** un run parte con cappello e prompt inline senza creare file, ogni run lascia un evento in `tl`, e il critico boccia qualcosa che l'oblio avrebbe tenuto.

## Per un agente che parte da zero

**Precondizioni.** Se una fallisce, fermati: non sei nell'ambiente giusto.

- `tb status` deve dare `{"qdrant":true,"ollama":true,"model":true}`. Qdrant è remoto su `filrasp` via Tailscale (`QDRANT_URL`); Ollama è **locale** su `localhost:11434` (`OLLAMA_URL`). L'`OLLAMA_HOST` presente in env serve ad altro e `tb` non lo usa.
- `bun test tests/tb.test.ts tests/ti.test.ts` verde **prima** di toccare qualsiasi cosa. Se è rosso all'inizio non è colpa tua, e non si procede.
- Il modello che stai per usare deve comparire in `ollama list`; altrimenti `ollama pull`.

**Prima di ogni passo che scrive.**

- `skills/clio/scripts/backup_qdrant.sh third-brain` per lo snapshot. Rollback: `skills/clio/scripts/restore_qdrant.sh`.
- Nessun passo scrive sulla collection viva: si costruisce a parte e si sposta l'alias. Se ti trovi a fare `upsert` sulla collection che l'alias sta servendo, ti sei perso.

**Fermati e chiedi.** Non decidere da solo su:

- soglia di duplicazione in scrittura e forma del campo di stato — dichiarate aperte qui sotto;
- qualsiasi modifica al `CLAUDE.md` globale (la conferma di Mosè);
- cancellare o riscrivere una skill (`fury`) o una pagina `.wiki/`;
- cancellare note, regole o collection **non** create da te in questa sessione;
- `git push`, force-push, riscrittura di storia.

**Governance.** Codice che resta -> **Ritchie**. Prova usa-e-getta -> **Edison**. Pagine `.wiki/` -> **Omero**. Regole `ti` -> **Mosè**, che non scrive senza conferma. Design con più prospettive -> **Annibale**. Estrazione verso `tb` -> **Platone**. Prima di un'azione ricorrente o non ovvia: `ti search "<contesto>"`.

**Dove sta cosa.**

- Embedding e costanti: `tools/tb/src/infra.ts` — `embed()` alla riga 66, `EMBED_MODEL`, `VECTOR_SIZE`, `COLLECTION`.
- Collection, ricerca, traversal: `tools/tb/src/qdrant.ts` — `ensureCollection()` righe 69-92 (la pistola), `traverseCorrelates()` riga 208, `search()` riga 248.
- Note e API pubblica: `tools/tb/src/notes.ts` (`recordHits()` riga 112), `types.ts`, `cli.ts`, `api.ts`.
- `ti`: `tools/ti/src/{identity,qdrant,types,cli}.ts`, riusa `infra.ts` di `tb`.
- `tl`: `tools/tl/` — README e ROADMAP, nessun codice.
- Test: `tests/tb.test.ts`, `tests/ti.test.ts`, `tests/th.test.ts`.
- Transcript delle sessioni: `~/.claude/projects/<progetto>/<session>.jsonl` più la directory sorella `<session>/tool-results/`.
- Misura del corpus e benchmark: `scripts/` (da scrivere in Fase 0, via Ritchie).

**Quando un passo è finito.** Vale il "Finita quando" della fase, verificato da un comando che lascia un output — non da un'impressione.

## Dipendenze

```
0 (indice e schema)
  └─► 1 (ranking e telemetria dei correlati)
        └─► 4 (oblio e supersede)
2 (tl)
  ├─► 3 (distillatore) ──► 4
  └─► 5 (schema ti)
6 (th senza membri, critico, riscrittura query)   indipendente
  └─► eventi th.run in tl
```

`1` e `2` sono indipendenti fra loro: `1` costa venti righe, `2` costa un servizio. `4` ha bisogno di entrambe.

## Rapporto con `ROADMAP.md` (`third_os`)

`third_os` importa `tools/tb/src/{qdrant,notes}.ts` come libreria e tiene note e vettori in RAM. Tre conseguenze:

- Le Fasi 0 e 1 cambiano i vettori e la semantica della ricerca: `third_os` deve leggere `superseded_by` e non disegnare le superate, o disegnarle sbiadite come scelta esplicita.
- Il budget di **~150 nodi vivi** della Fase 1 di `third_os` è un vincolo sulla Fase 3: l'ingestione automatica alza il volume, e senza oblio il grafo diventa illeggibile. L'oblio è un prerequisito della webapp.
- I vettori in RAM rendono lo score sui correlati (Fase 1) un prodotto scalare: `third_os` è il posto dove costa meno di tutti.

## Decisioni aperte

1. **Togliere la conferma a Mosè è una modifica al `CLAUDE.md` globale**, non al codice. Decisione di Filippo.
2. Soglia di duplicazione in scrittura (Fase 3): 0.9 è conservativo, 0.85 toccherebbe 54 note su 737. Da tarare su dati.
3. Nome e forma del campo di stato in `tb`: `status` separato da `superseded_by`, oppure un unico campo di ciclo di vita. La Fase 0 scrive entrambi con i default; la forma definitiva si decide quando la Fase 4 li legge.
4. Se Hindsight diventi il motore di `tl` invece di scriverlo: decidibile solo con uno spike che misuri latenza e qualità di estrazione con modello locale.
5. Quanti giorni prima che una `provvisoria` decada. Non si indovina: si guarda la distribuzione di `hits_related` dopo la Fase 1.

## Debito segnalato, non toccato

- 24 note con `refs` duplicati, 1 con self-ref, 1 payload senza campo `id`, 11 archi verso note inesistenti.
- Il frontmatter dei membri `th` ha un campo `skills` che il tipo `Member` non contempla.
- `ensureCollection()` cancella la collection quando la configurazione non combacia.
- `tb graph` si dismette quando `third_os` copre la lettura (già in `ROADMAP.md`).

## Pagine `.wiki/` — stato

Scritte il 2026-09-28: `memory_human_gate_is_the_bottleneck`, `memory_refs_carry_non_semantic_reach`, `memory_related_results_need_scores`, `memory_graph_engine_deferred_not_needed`, `memory_keep_raw_source_for_reingest`, `memory_alias_makes_migration_reversible`, `memory_coala_four_types_map_to_pi`, `memory_tl_work_archive_not_event_log` (supera `memory_tl_unified_event_log`), `memory_wiki_is_the_project_notebook`, `memory_identity_splits_descriptive_prescriptive`.

Ancora da aggiornare, quando la fase relativa arriva:

| Pagina | Cosa cambia | Fase |
|---|---|---|
| `memory_procedural_six_gaps` | gap 6 chiuso come obsoleto (via i membri) | 6 |
| `agents_roster_lives_on_filesystem` | superata se i membri spariscono | 6 |
| `memory_ti_context_action_rules` | schema nuovo di `ti` | 5 |
| `core_tb_stateless_single_source` | da verificare contro supersede e stato della nota | 4 |
| `hook_tb_ti_auto_injection` | la soglia si sposta dentro la ricerca, e arriva la riscrittura della query | 1, 6 |
