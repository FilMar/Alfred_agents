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

## Diagnosi misurata (2026-09-28, prima della Fase 0)

Corpus: **737 note** in `third-brain`, **54 regole** in `pi_identity`. A fine giornata, dopo Platone e Mosè: 747 e 56. Ogni riga qui sotto si riproduce con `scripts/tb_corpus_report.py`.

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

### Fase 0 — Indice e schema — **fatta** (2026-09-28)

Una sola ricostruzione, quattro cose dentro. Tutto reversibile: le collection v1.5
sono ancora sul server e il ritorno è uno spostamento di alias.

**L'alias.** `third-brain` e `pi_identity` sono alias. Le collection reali portano
modello e dimensione nel nome: `*__nomic-v1.5-768` (i vettori originali, intatti) e
`*__v2moe-768` (quelli in uso). Verificato prima di toccare i dati: Qdrant risolve
un alias su *ogni* endpoint che `tb` e `ti` usano — GET della collection, creazione
degli indici di payload, upsert, query, scroll, e anche le snapshot di Clio, che
tornano col nome della collection reale. Nessun chiamante è cambiato.

Un dettaglio trovato con la sonda: `DELETE /collections/<nome-alias>` risponde 200 e
**non cancella niente**. Un alias fa da scudo anche contro la cancellazione.

**La pistola disinnescata.** `ensureCollection()` non cancella più la collection
quando manca la configurazione sparse: solleva un errore che dice cosa fare.

**Il modello.** `nomic-embed-text-v2-moe`, con `search_document:` in scrittura e
`search_query:` in ricerca. `embed()` è diventato `embedDocument()` e `embedQuery()`:
un modello addestrato su due compiti che li distingue dal prefisso non può avere una
sola funzione che li serve entrambi.

Confronto dense-only, 747 note, 120 parafrasi italiane a cui è vietato riusare le
parole rare della nota (`scripts/data/paraphrases.json`, generate una volta e
committate; 8 su 120 conservano una parola rara dopo un tentativo di riscrittura):

| misura | v1.5 senza prefisso | v2-moe con prefisso |
|---|---|---|
| recall@1 | 0.233 | **0.650** |
| MRR@10 | 0.301 | **0.727** |
| nota fuori dai primi 10 | 64/120 | **16/120** |
| ref-recall@10 | 0.246 | **0.345** |
| distanza query vera / fuori tema | 0.085 | **0.293** |

L'ultima riga è tutto il problema in un numero: v1.5 dava 0.662 a una query sulla
carbonara contro 0.747 a una query vera. Tutti i punteggi stavano intorno a 0.7, e
con quella compressione nessuna soglia poteva separare niente. Il ref-recall è
sbilanciato **a favore** di v1.5 — quei link sono stati scritti guardando i suoi
vicini — e v2 vince comunque.

**Il cross-lingua, che credevamo di non usare.** La premessa "il corpus è
interamente in italiano" era vera al 97%: **22 note su 747 sono in inglese** (tutte
di giugno e luglio, sparse su tutti i `kind`, `ti` invece è italiano puro). Quindi
il cross-lingua non era un caso ipotetico da non misurare: era il 3% del corpus,
ed era il 3% peggio servito.

Misurato con una parafrasi italiana del `what` di ognuna delle 22
(`scripts/reports/fase0_crosslingual.json`):

| | v1.5 | v2-moe |
|---|---|---|
| trovate nei primi 10 da query italiana | **0 / 22** | **16 / 22** |
| al primo posto | 0 | 5 |

Zero. Nessuna nota inglese era raggiungibile da una domanda in italiano, e non
c'era modo di accorgersene: una ricerca che non trova niente non lascia errori.
Le 6 che ancora sfuggono sono note di comunicazione e persuasione molto astratte,
dove anche la parafrasi italiana è una domanda diversa.

**Tradotte, lo stesso giorno.** Non con un supersede: un ref punta per **id**, e l'id
è `SHA256(what + ":" + when)`, quindi una nota nuova avrebbe un id nuovo e avrebbe
orfanato ogni arco in entrata. Quindi riscrittura sul posto, id invariato — che con
`upsert` è letteralmente la cancellazione e la ricreazione, in un'operazione sola.
`when`, `kind`, `tags`, `refs`, `backrefs` e `hits` restano, e `updated_at` trova il
suo primo scrittore vero. L'inglese originale sta in
`scripts/data/translations_it.json`, sotto git accanto alla traduzione: il posto dei
record è il repository, non il payload.

Le stesse 22 query italiane, sulla stessa collection, prima e dopo:

| | v1.5 | v2, testo inglese | v2, testo tradotto |
|---|---|---|---|
| nei primi 10 | 0 / 22 | 16 / 22 | **20 / 22** |
| al primo posto | 0 | 5 | **10** |

Il corpus è ora italiano al 100%: 747 su 747. Tradotte a mano, non da un modello
locale: 22 note sono poche e il testo resta nel Third Brain per sempre. Le traduzioni
sono committate in `scripts/data/translations_it.json`, quindi rivedibili riga per
riga in git, e `scripts/tb_retranslate.ts` passa dal vero percorso di scrittura di
`tb` — così il vettore sparso lo ricostruisce il codice di produzione e non una
reimplementazione dell'hash.

Costo: 747 embed in 9 minuti e 23 secondi, cioè 0.75 s per nota. È il prezzo di ogni
futuro cambio di modello, ed è basso abbastanza da non essere un argomento.

**Le soglie, misurate invece che scelte.** Sotto v2 una risposta giusta sta a 0.43
nel caso peggiore, una query fuori tema non supera 0.25, e la fascia tra le due è
vuota. La curva completa è in `scripts/reports/fase0_threshold.json`: il ginocchio
di precisione è a 0.65, dove la nota giusta è prima nel 95.5% dei casi ma passa solo
il 18% delle query.

Lo stesso numero, 0.6, era sbagliato in due direzioni opposte: troppo alto per il
recupero di christopher, troppo basso per il dedupe di mosè. Sotto v1.5 un unico
valore faceva due lavori diversi perché tutti i punteggi erano indistinguibili.

| consumatore | prima | ora | perché |
|---|---|---|---|
| `skills/christopher` | 0.6 | 0.35 | il recupero deliberato vuole portata, a giudicare ci pensa l'agente |
| `skills/mose` | 0.6 | 0.5 | il dedupe vuole candidati da valutare, non verdetti |
| hook `extensions/tb_ti/claude.sh` | 0.8 | 0.5 | vedi sotto |

**Il hook era muto.** A 0.8 non si accendeva su nessuno di otto prompt reali, e
**nemmeno sotto v1.5**: è stato silenzioso da sempre. È la ragione principale per cui
545 note su 747 non sono mai state colpite — non le note sono inutili, è
l'iniezione automatica che non è mai partita. A 0.5 si accende sul prompt giusto
(regola ritchie su "stai per scrivere codice di produzione", nota SQLite su "esiste
il tipo datetime?") e tace sulla potatura delle rose.

**I campi nuovi.** Su tutte le 747: `embed_model`, `status: promossa`, `about: mondo`,
`updated_at = when`, e `origin: umano` su ogni ref. Le note nuove
nascono uguali. Nessuno li legge ancora.

`superseded_by` e `session` **non esistono**: Qdrant scarta una chiave di payload
il cui valore è `null`, quindi su una nota vecchia non possono stare. Qui l'assenza è
come si scrive `null`. Torneranno quando qualcosa scriverà un valore vero — e questo
chiude metà della decisione aperta numero 3.

**Il debito riparato, e una sorpresa.** Gli 11 archi che puntavano a note inesistenti
**non puntavano a note cancellate**: tutti e undici si risolvono in modo univoco sui
primi 8 caratteri esadecimali dell'id. Sono id troncati o imbottiti di zeri — qualcuno
ha copiato l'id corto che la CLI mostra. Quindi sono stati riparati, non buttati: il
grafo ci guadagna 11 archi invece di perderli. Resta un difetto d'uso da chiudere:
**`tb` mostra id corti e accetta solo id lunghi.**

Nella stessa passata: 26 ref duplicati collassati, 1 self-ref rimosso, 1 payload senza
`id` riempito, e `backrefs` **ricalcolato da zero** — era dato derivato e non tornava in
nessuna delle due direzioni (18 ref senza backref, 13 backref senza ref, di cui 7 verso
note inesistenti). Ora 1134 archi in entrambi i sensi. Ogni singola modifica è in
`scripts/reports/fase0_repair.json`.

**Gli strumenti che restano.** `scripts/`, solo stdlib, nessuna dipendenza:
`qdrant_clone.py` (copia una collection con vettori, payload e indici),
`qdrant_alias_point.py` (sposta un alias, e cancella una collection che occupa quel
nome solo dopo aver dimostrato che è già copiata), `tb_corpus_report.py` (riproduce
ogni numero di questa roadmap con un comando), `tb_fase0_fields.py` (la migrazione),
`tb_reembed.py` (re-embed in una collection nuova), `tb_paraphrase_set.py`,
`tb_benchmark.py`, `tb_threshold.py`.

**Fuori da questa fase:** altri modelli candidati (`bge-m3`, `qwen3-embedding`) —
l'armatura di misura li accoglie quando vorrai, `tb_reembed.py` + `tb_benchmark.py` e
sono due comandi.

**Conseguenze da verificare, non toccate.**
- Il modello passa da 137M a 475M parametri. `.wiki/memory_tb_ti_on_rasp` argomentava
  la fattibilità su Pi 5 con la taglia vecchia: se Ollama gira sul Pi, il numero va
  rimisurato.
- Il hook chiama `tb search --depth 1`: i correlati arrivano con `score: null` e
  `--min-score` **non li filtra**, perché la soglia agisce sulla ricerca e il traversal
  aggiunge dopo. La soglia nuova taglia i diretti e lascia passare i correlati. È
  esattamente la Fase 1, ora con un motivo in più.
- La suite `th` scrive fixture in `.th/members/` del progetto e i suoi 8 test falliscono
  alla seconda esecuzione per collisione con la propria spazzatura. Preesistente, non
  toccato.

### Fase 1 — Ranking e telemetria dei correlati — **fatta** (2026-09-28)

Venti righe previste, cinquanta scritte. Due punti del piano li hanno smentiti le misure del corpus.

**Fatto**

- **Score sui correlati.** Una nota raggiunta da un arco porta il coseno che il motore calcola contro la query, non `score: null`. Lo calcola Qdrant, con una `/points/query` e `filter: has_id` sulla frontiera: nessun vettore attraversa la rete e lo score di un correlato e quello di un diretto sono la stessa quantita per costruzione.
- **Il filtro della ricerca entra nel traversal.** Non era nel piano: `--kind`, `--evidence-only` e l'esclusione degli hub valevano solo per i diretti, perche il traversal usava `getByIds`, che non porta filtri. Uno score su una nota non filtrata la fa sembrare vagliata, quindi il difetto andava chiuso qui.
- **`hits_related` e `last_hit_related`**, campi separati. Le scritture si raggruppano per payload: una ricerca che tocca 25 correlati mai contati fa **una** richiesta, non 25.
- **Traversal dei `backrefs`** oltre ai `refs`. Gli id di ogni salto sono ordinati prima di essere troncati, quindi due ricerche sugli stessi dati restituiscono le stesse note.
- **`tb` accetta l'id corto.** Per prefisso, come `git`; un id completo non costa nessuna chiamata in piu. Ambiguo e inesistente sono errori con un messaggio, non crash. Il colpevole della classe di errore era `tools/tb/src/graph/graph.js:171`, che stampa `ref.id.slice(0, 8)`.
- **`--min-score` e `--depth` validati in un solo posto**, usato dalla CLI e dalla API. Prima `{"depth": 1.5}` faceva 2 salti e `--min-score abc` mandava `score_threshold: null` sul filo.
- **`min_score` e `related_limit` esposti sulla API HTTP.** Senza, la stessa funzione aveva due semantiche a seconda della porta.
- **`pi.ts` ricalibrato.** La Fase 0 aveva portato `claude.sh` da 0.8 a 0.5 e dimenticato il gemello TypeScript: stesso hook, altro runtime, soglia che non sparava mai.

**Non fatto, perche le misure lo smentiscono**

- ~~Tagliare i correlati con `min_score`~~. Misurato su 8 query, `limit 10` (`scripts/reports/fase1_related.json`): **0 correlati su 161 passano 0.5**, la soglia del hook; 44 su 161 passano 0.35. Il taglio non riduce il blocco, lo cancella — e cancella prima la metà utile, perche `.wiki/memory_refs_carry_non_semantic_reach` misura che il 23% degli archi punta oltre il 200° vicino denso della sorgente. Un arco esiste per una ragione che la query non porta: il suo score è basso per costruzione, non per irrilevanza. I correlati si ordinano e si tagliano **per rango** (`--related-limit`, 25 di default, 3 nel hook).
- ~~`--min-score` nativo su `ti search`~~. Esisteva già, wired end-to-end (`tools/ti/src/cli.ts:70` → `identity.ts:45` → `score_threshold`). Il debito era chiuso e la roadmap non lo sapeva.

**Trovato mentre si scriveva**

`--hybrid` e `--min-score` insieme erano rotti, e `skills/christopher/SKILL.md` li documentava come combinazione valida. La fusione RRF di Qdrant produce `1/(k + rank)` con `k = 2`: 0.5 per un primo posto, 0.29 per un quinto in entrambe le liste. Numeri che sembrano similarità e non lo sono, tagliati da una soglia in unità di coseno. Ora la fusione scelge i candidati e il coseno li valuta e li ordina: un solo significato in `score` su tutti i percorsi.

**Misure** (747 note, 8 query, `limit 10`)

| | valore |
|---|---|
| correlati per ricerca, solo `refs` | 14.6 |
| correlati per ricerca, con `backrefs` | 23.1 (×1.58) |
| correlati che passano `min_score 0.35` | 44 / 161 |
| correlati che passano `min_score 0.5` | 0 / 161 |
| `hits_related` scritti in una ricerca a 3 correlati | 1 richiesta HTTP |

**Verifica**: 54 test verdi (25 nuovi, 4 mutazioni del codice provate una per una per controllare che i test mordano), typecheck pulito, `contract_report.py` senza segnalazioni sul codice nuovo, e il percorso completo provato sul corpus vero — denso, ibrido, prefisso corto, contatori.

**Resta aperto**

- `hits_related` diverso da zero dopo una settimana d'uso: il criterio di chiusura del piano non è verificabile il giorno in cui si scrive il codice. La telemetria ha iniziato a contare.
- `tb graph` disegna il grafo dai soli `refs` (`graph/graph.js:81`), mentre il traversal ora percorre anche i `backrefs`: il grafo disegnato e quello percorso divergono. Si chiude quando `third_os` copre la lettura.
- `RELATED_LIMIT = 25` non morde quasi mai (la media è 23.1). È un limite di sicurezza, non una scelta di qualità: il numero giusto si vedrà da `hits_related`.
- **Il rasp ha un checkout suo di `pi`.** Due copie del codice, un solo store: finché il branch non è su `master` e il rasp non ha fatto `git pull`, un `tb` lanciato là gira in versione pre-Fase 1. Non corrompe niente — i campi nuovi sono opzionali e il codice vecchio non li scrive — ma per quelle chiamate `hits_related` resta fermo e i correlati tornano con `score: null`. Vale per ogni chiamata automatica dal nodo: cron, task dell'orchestratore, `th`. Il `git pull` sul rasp fa parte del merge, non del deploy successivo.

### Fase 2 — `tl` — **scritta** (2026-09-28), non ancora in produzione

Lo strato episodico. Produce esperienze e archi senza far leggere niente a nessuno.

**Fatto**

- **Tre tabelle** come in `.wiki/memory_tl_work_archive_not_event_log`, senza modifiche. Niente indici, niente compressione, `distilled` unico campo mutabile.
- **Un servizio CRUD davanti al file**, perche SQLite e un file e non un server: il file non esce dal rasp, la logica sta nel CLI. L'API valida comunque ogni riga che scrive — `kind`, timestamp ISO-8601 a larghezza fissa, campi obbligatori, chiavi esterne — con **un solo validatore in `types.ts` usato dalle due parti**.
- **Ingestione idempotente**: l'id di un exchange viene dal transcript, non da un generatore. Il hook di fine turno passa il path o il session id, gira staccato ed esce sempre 0. `tl ingest --all` riempie i buchi, quindi un exchange perso e in ritardo, e il backfill e lo stesso comando lanciato una volta.
- **Aggregazioni nel CLI**: `tl cost --by day|session|model`, `tl pending`, `tl show`, `tl sessions`.
- **Unita systemd** (`tools/tl/deploy/tl.service`), processo nativo come l'orchestratore: un file SQLite vuole il disco dell'host.

**Trovato guardando i transcript veri**

- Un exchange si apre su un messaggio utente che porta `origin`. I 276 record che non ce l'hanno sono `/compact`, avvisi di interruzione e iniezioni di skill: **non e deriva di versione**, esistono in tutte. I loro token non si perdono, finiscono nell'exchange precedente.
- **`subtask` vuol dire `th`, non il subagente nativo di Claude.** Sono tre cose: tu chiedi (`chat`), io delego a un subagente nativo, io delego a un cappello via `th`. La terza non sta nel transcript per niente — `th` fa le sue chiamate in un processo suo — quindi la riga la scrive `th`, dopo la Fase 6. La seconda **non e una riga**: la chiamata al Task e la relazione finale del subagente stanno gia dentro l'output dell'exchange che le ha chieste. Non si conta solo quello che il subagente ha speso dentro di se: misurato, **2,4% dei token di output**, su 8 sessioni di 43.
- I sidechain stanno in file separati (`<sessione>/subagents/agent-*.jsonl`), quindi escluderli e gratis: `tl` legge solo i transcript di primo livello. Vale anche per `pi`, che scrive i sotto-run in `<sessione>/<id>/run-N/` — stessa categoria, stessa esclusione, ottenuta camminando a profondita uno.
- **Due harness, uno schema.** `pi` e piu pulito di Claude: i risultati dei tool hanno un ruolo loro (`toolResult`), quindi un messaggio `user` e un exchange senza euristiche. Ma i suoi id di messaggio sono corti (otto cifre esadecimali), quindi l'id dell'exchange si **deriva** con SHA256 formattato a UUID, come fa `noteId` in `tb`: una sola forma nell'archivio e idempotenza intatta. L'originale resta in `meta.source_id`, e ogni riga porta `meta.harness`.
- **`pi` calcola il costo in denaro**, Claude Code no: 0,2344 $ su 794 exchange, in `meta.cost_usd`. E i modelli sono un mondo separato — deepseek, glm, gemma, kimi, minimax contro la famiglia Claude.
- **`harness` e una colonna di `sessions`**, non un campo ripetuto su ogni riga. Senza, distinguere una sessione `pi` da una Claude si poteva solo dedurre: o una `LIKE` su JSON negli exchange, o la versione dell'UUID (`pi` usa v7, Claude v4, e separa 110 da 43 perfettamente) — che funziona oggi ed e un incidente di due implementazioni, non un contratto. La regola per decidere dove mettere un campo l'aveva gia data la decisione dello schema: su `sessions` sta cio che resta costante per tutta la sessione, ed e per quello che `model` sta sull'exchange. Serviva una `ALTER TABLE`, perche `CREATE TABLE IF NOT EXISTS` lascia stare una tabella che esiste.
- **`--refresh`**: `--all` salta le righe che l'archivio ha gia, quindi un parser migliorato non le raggiungerebbe mai. Con `--refresh` si rimandano tutte, e l'idempotenza per id fa il resto. Serviva subito: le 967 righe scritte prima di `meta.harness` dicevano `unknown`.

**Misure** (47 transcript, un mese di lavoro)

| | valore |
|---|---|
| sessioni / exchange | **153 / 1763** (Claude 969, `pi` 794) |
| tempo del backfill completo | 9 s sul rasp, 157 transcript |
| archivio contro transcript | 23 MB contro 102 MB |
| secondo giro sugli stessi file | 0 scritture, 1763 note |
| testo recuperato da un exchange | 97.000 caratteri |

**Verifica**: 71 test nuovi, sei mutazioni del codice provate una per una — **una e sopravvissuta** e ha smascherato un test che non provava niente (usava una riga senza `usage` per dimostrare che le righe non-risposta vengono ignorate). Corretto. `SELECT *` leggibile per giorno, sessione, macchina e costo. Typecheck ora copre `tb`, `ti` e `tl`: `ti` aveva un `tsconfig.json` che nessuno script eseguiva.

**Resta da fare, ed e deploy, non codice**

1. Merge del branch e `git pull` sul rasp.
2. `systemctl enable --now tl` sul rasp, e il symlink `tl` sul PATH di ogni macchina che lavora (fatto sul desktop).
3. Registrare il hook `Stop` in `~/.claude/settings.json` — **dopo** che il servizio risponde, altrimenti ogni turno lancia un `tl` che fallisce in silenzio.
4. Backfill: `tl ingest --all` una volta, da ogni macchina.
5. `tl` nei backup di Clio.

**Finita quando:** una settimana di lavoro e interrogabile per sessione, macchina e costo con un `SELECT *` leggibile, e da un exchange si risale al testo completo. Provato in locale su un mese; vero in produzione quando i cinque punti sopra sono chiusi.

### Fase 3 — Il distillatore

Uno, non due. Legge una finestra temporale di eventi e propone note e regole `provvisorie`.

- Gira periodico e senza chiedere. Modello piccolo e locale (1-12B basta per l'estrazione).
- Ogni nota nasce `provvisoria`, con `session` che punta a dove è nata in `tl`.
- **`source_raw` è stato rimosso** (2026-09-28, decisione di Filippo). Era un campo che tenevo io per "poter ri-estrarre quando il distillatore migliora", proposto durante il design e mai chiesto. Il grezzo è un record, e i record stanno in `tl` e in git: duplicarlo dentro ogni nota paga lo stesso testo due volte e lo mette nel posto che si legge più spesso.
- **Il campo si chiama `session`, non `source_event`.** "Event" era un fossile del nome vecchio di `tl`, quando era un event log. Una cosa da decidere quando il campo avrà uno scrittore: `tl` ha tre tabelle, `sessions` ed `exchanges` fra loro, e una sessione contiene molti scambi. Se serve risalire allo scambio esatto, l'id da scrivere è quello dell'exchange e il nome dovrà dirlo; se basta sapere in quale sessione sei nato, `session` è giusto e più corto.
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

- ~~`th`: fuori `member create/list/get/delete/promote` e `--from`; `run` prende cappello, task, prompt extra, tools~~ — **fatto il 2026-09-28**. Un membro era un file con tre cose dentro (ruolo, cappello, lista di tool) e ora sono tre argomenti: `--hat`, `--system`, `--tools`. `composeSystemPrompt` costruisce la stessa stringa nello stesso ordine, quindi un run si comporta identico a quando il ruolo veniva da disco. Il flag si chiama `--system` e non `--prompt`: accanto a `--task`, "prompt" sarebbe una seconda parola per "cosa devi fare".
- ~~`fury` perde il mestiere~~ — in pensione: il suo lavoro era generare il roster dei membri. `annibale` riscritto attorno ai cappelli, `council.sh` passa `--hats`, e `test_skill.sh` di efesto non crea più un membro usa-e-getta.
- Il gap che si chiude da sé: `.th/members/` conteneva **solo fixture di test**, sette, rigenerate dalla suite a ogni esecuzione. Senza `member create` non ha più un creatore.
- ~~Poi gli eventi `th.run` in `tl`~~ — **fatto il 2026-09-28**, in anticipo: `th` scrive la sua riga quando il run finisce (`tools/th/src/archive.ts`). Il rinvio serviva a non nascere con l'`actor` sbagliato, e quel motivo e scaduto — il cappello si sa. Andava fatto adesso perche `th` costruisce la sessione con `SessionManager.inMemory()` e i suoi file stanno in `/tmp`: **il testo dell'output esiste solo in quel momento**. Su cinque `out_path` provati da `th.db`, zero esistevano ancora.
- **`th.db` piallato** (506 righe, di cui 373 run reali). Non era una decisione, era una contraddizione: `.wiki/th_detached_runs_state_in_tmp` dice "no database for in-progress state — the file set is the state" e `.wiki/th_http_api_scoped_no_db` dice "durable history beyond `/tmp` is out of scope — that is `tl`'s job". Il database del CLI violava entrambe. Ora `/tmp` e lo stato in volo, `tl` e la storia, e `th history` legge le due fonti separatamente.
- **Il passato non e stato importato, e per una ragione precisa**: `th.db` non aveva `path`, `host` ne `model`, e il suo `input_tokens` sommava input + cache-read + cache-write in un numero solo (fino a 1,4 milioni). Scriverlo nella colonna `tokens_in` di `tl` non sarebbe stato un dato mancante ma **un dato falso**, e fra un mese nessuno ricorderebbe che le righe prima del 28 settembre confondono la cache con l'input.
- **Lo spool**, che nasce dal fatto che `tl` e ora l'unica casa: se la scrittura fallisce, le tre righe vanno in `/tmp/th-*.unarchived` accanto ai file del run, e `th archive-pending` le manda dopo. Provato spegnendo l'archivio: il run finisce in 0,1s con un avviso, la riga resta, e al giro dopo entra.
- Resta solo il **`parent`**: collegare una delega all'exchange che l'ha chiesta richiede che chi chiama passi il proprio id, e nessuno lo da a `th` oggi.
- ~~Il gap 6 di `.wiki/memory_procedural_six_gaps` (promozione membro↔skill) si chiude come obsoleto~~ — chiuso: non esistono più membri da promuovere. L'unità su cui si accumula esperienza è il cappello, e adesso `tl` puo contarla, perche l'`actor` di un subtask e uno dei sei e non uno dei quaranta nomi inventati.
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
3. Nome e forma del campo di stato in `tb`: `status` separato da `superseded_by`, oppure un unico campo di ciclo di vita. Mezza decisione l'ha chiusa Qdrant: un payload con valore `null` non esiste, quindi `superseded_by` non è scrivibile come default e la Fase 0 ha scritto solo `status`. Resta da decidere se la Fase 4 aggiunge un campo o cambia `status`.
4. Se Hindsight diventi il motore di `tl` invece di scriverlo: decidibile solo con uno spike che misuri latenza e qualità di estrazione con modello locale.
5. Quanti giorni prima che una `provvisoria` decada. Non si indovina: si guarda la distribuzione di `hits_related` dopo la Fase 1.

## Debito segnalato, non toccato

- ~~24 note con `refs` duplicati, 1 con self-ref, 1 payload senza campo `id`, 11 archi verso note inesistenti~~ — riparato in Fase 0.
- ~~`ensureCollection()` cancella la collection quando la configurazione non combacia~~ — chiuso in Fase 0.
- Il frontmatter dei membri `th` ha un campo `skills` che il tipo `Member` non contempla.
- Il `tsconfig.json` di `th` non aveva i tipi di bun, quindi nessuno l'ha mai eseguito. Aggiunti il 2026-09-28: l'errore su `db.ts` e sparito col database, resta `tools/th/src/detached-runner.ts:17`, che usa **due tipi `JobPaths` diversi**, uno senza `pid`. Non toccato, e `th` non e ancora nello script `typecheck`.
- La suite di `th` scriveva nel `th.db` vero: era la causa dei 133 run firmati `test-member`. Chiusa alla radice con il database, ma le fixture in `.th/members/` restano.
- ~~La suite `th` e quella dell'orchestratore interferiscono in parallelo: 7-8 test su 154~~ — chiuso il 2026-09-28 togliendo `tools/orchestrator/` e `tools/cockpit/`, che Filippo non usa più. La causa era quella: le due suite condividevano stato su filesystem, e 6 dei fallimenti erano in `th`, non nell'orchestratore. Ora **161 test su 161**, verdi su tre esecuzioni di fila.
- ~~`tb` stampa id corti e accetta solo id lunghi~~ — chiuso in Fase 1: risolve per prefisso.
- `tb graph` disegna dai soli `refs` mentre il traversal percorre anche i `backrefs` (vedi Fase 1).
- `tb graph` si dismette quando `third_os` copre la lettura (già in `ROADMAP.md`).

## Pagine `.wiki/` — stato

Scritte a fine Fase 0: `memory_embedding_model_follows_the_corpus_language`, `memory_score_cutoffs_belong_to_the_model`, `memory_absence_is_how_qdrant_stores_null`, `wiki_decision_is_written_when_the_design_ends`.

Scritte a fine Fase 1: `memory_related_notes_ranked_not_cut` (supera `memory_related_results_need_scores`), `memory_score_is_always_the_engine_cosine`.

Scritte il 2026-09-28: `memory_human_gate_is_the_bottleneck`, `memory_refs_carry_non_semantic_reach`, `memory_related_results_need_scores`, `memory_graph_engine_deferred_not_needed`, `memory_keep_raw_source_for_reingest`, `memory_alias_makes_migration_reversible`, `memory_coala_four_types_map_to_pi`, `memory_tl_work_archive_not_event_log` (supera `memory_tl_unified_event_log`), `memory_wiki_is_the_project_notebook`, `memory_identity_splits_descriptive_prescriptive`.

Ancora da aggiornare, quando la fase relativa arriva:

| Pagina | Cosa cambia | Fase |
|---|---|---|
| `memory_procedural_six_gaps` | gap 6 chiuso come obsoleto (via i membri) | 6 |
| `agents_roster_lives_on_filesystem` | superata se i membri spariscono | 6 |
| `memory_ti_context_action_rules` | schema nuovo di `ti` | 5 |
| `core_tb_stateless_single_source` | da verificare contro supersede e stato della nota | 4 |
| `hook_tb_ti_auto_injection` | la soglia si sposta dentro la ricerca, e arriva la riscrittura della query | 1, 6 |
