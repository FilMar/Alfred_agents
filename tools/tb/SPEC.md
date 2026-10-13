# Spec: `tb refine --apply` e archivio fuori dall'hook (a mano)

## Entità

- **Note** (`types.ts`)
  - stato: guadagna `archived_at?: string`, un istante ISO 8601 UTC come `when` e `last_hit`.
  - non fa: nessun altro campo cambia.
  - comanda: solo `tb refine --apply` scrive e toglie `archived_at`. La ricerca lo legge e non lo scrive mai.

- **Piano** (`refine.ts`, puro)
  - stato: due liste di note con forma `LowNote`: `archive` e `restore`.
  - `archive`: note con trust sotto 0.2 e senza `archived_at`.
  - `restore`: note con `archived_at` e trust a 0.2 o più.
  - una nota archiviata con trust ancora sotto 0.2 resta com'è: nessuna scrittura.
  - comanda: `planOf`, che prende le note già col loro trust. `refineReport` lo chiama e lo mette nel JSON come `plan`.
  - non fa: non legge Qdrant, non scrive.

- **`tb refine`** (senza opzioni)
  - fa: come oggi, più `plan` nel JSON. Non scrive niente.

- **`tb refine --apply`**
  - fa: esegue il piano. Scrive `archived_at = now` sulle note di `archive` e toglie la chiave dalle note di `restore`. Stampa lo stesso JSON, più `applied: { archived, restored }` con i conteggi.
  - non fa: non cancella note, non tocca `hits`, non riscrive un `archived_at` che c'è già.
  - costo: due richieste di scrittura in tutto, non una per nota. Le note da archiviare hanno lo stesso payload e vanno in un solo `setPayloadMany`. Quelle da ripristinare vanno in una sola richiesta che toglie la chiave. Misurato oggi: leggere e calcolare 798 note richiede circa 0,55 secondi.

- **`tb search --no-archived`** (`cli.ts`, `types.ts`, `qdrant.ts`)
  - fa: esclude le note con `archived_at`, anche tra i correlati di `--depth 1`.
  - senza il flag: le archiviate si trovano come le altre e mostrano `archived_at` nel JSON.
  - in libreria: `SearchOptions.exclude_archived`.
  - nello store: una condizione `is_empty` su `archived_at` in `must` del filtro di ricerca. Il filtro vale anche per i correlati, perché viene riusato nella visita dei riferimenti.

- **Scrittura del payload** (`qdrant.ts`)
  - fa: nuova funzione per togliere chiavi dal payload di più note (`/points/payload/delete`). `setPayloadMany` scrive già un payload su più note.

- **Hook** (`extensions/tb_ti/claude.sh`, `extensions/tb_ti/pi.ts`)
  - fanno: passano `--no-archived` alla ricerca di `tb`.

- **Avvio sessione** (`extensions/tb_refine/claude.sh`, `extensions/tb_refine/pi.ts`)
  - fa: all'apertura di Claude Code (hook `SessionStart`, origine `startup`) e di pi (evento `session_start`) lancia staccato `tb refine --apply`. Silenzioso, esce sempre con 0, non blocca l'apertura. Lo stesso schema di `extensions/tl`.
  - non fa: non ha un controllo sull'intervallo dall'ultimo giro. Costa circa mezzo secondo ed è idempotente.
  - l'interruttore: i file sono linkati da `setup.sh`, ma la voce `SessionStart` in `~/.claude/settings.json` la aggiunge l'utente. Finché non c'è, non parte niente. In pi basta il link dell'estensione.

- **`td`** (`neighbours.ts`)
  - non cambia: non passa il flag. Un candidato uguale a una nota archiviata deve risultare un duplicato.

- **Stub dei test** (`tests/helpers/td_stubs.ts`)
  - fa: impara la condizione `is_empty` e la rotta `/points/payload/delete`.

## Flussi

- Qdrant → `browseNotes({ limit })` → `Note[]` → trust di ciascuna → `planOf` → `plan` → stdout
- Con `--apply`: `plan` → `setPayloadMany(ids di archive, { archived_at: now })` e rimozione di `archived_at` da `restore` → stdout con `applied`
- Apertura di Claude Code o di pi → hook staccato → `tb refine --apply` → archivia e ripristina
- Ricerca voluta trova una nota archiviata → `recordHits` aggiorna `hits` e `last_hit` → al giro dopo `--apply` il trust sale e `archived_at` viene tolto
- Hook → `tb search --no-archived` → mai una nota archiviata, né diretta né via refs

## Invarianti

- Solo `--apply` scrive o toglie `archived_at`. Una ricerca che dà un hit a una nota archiviata non lo cambia.
- `archived_at` si scrive una volta: una nota che ce l'ha già non viene riscritta, quindi il momento del primo archivio resta.
- `archive` e `restore` non hanno note in comune. Ogni nota di `archive` ha trust sotto 0.2 e nessun `archived_at`. Ogni nota di `restore` ha `archived_at` e trust a 0.2 o più.
- Dopo un `--apply`, una nota ha `archived_at` se e solo se il suo trust è sotto 0.2. Quelle già archiviate e ancora sotto 0.2 tengono il loro `archived_at`.
- Senza `--apply` non c'è nessuna scrittura.
- Due giri `--apply` di fila sugli stessi dati: il secondo non scrive niente.
- `search --no-archived` non restituisce mai una nota con `archived_at`, né diretta né correlata.
- Senza il flag la ricerca restituisce anche le archiviate, con `archived_at` visibile.
- Il payload di una nota appena salvata non cambia (nessun `archived_at`). Dopo `--apply` una nota archiviata ha le chiavi di prima più `archived_at` e nient'altro.
- Un'opzione sconosciuta viene rifiutata da commander.
- L'hook di avvio non rallenta e non fa fallire l'apertura: parte staccato e esce sempre con 0.
- Limite noto: due sessioni aperte nello stesso momento possono lanciare due giri insieme. Il valore di `archived_at` di una nota può allora essere l'istante del secondo. Il danno è nullo: la nota è archiviata comunque.

## Decisioni

1. **Chi toglie `archived_at` quando una nota archiviata riceve un hit: solo il giro di `--apply`.** Tra l'hit e il giro la nota resta marcata e fuori dall'hook, ma la ricerca voluta la trova. Scartato: la ricerca la toglie subito. Sarebbe un secondo scrittore della stessa chiave (P1).
2. **`archived_at` è un istante, non solo il giorno.** Come `when`, `last_hit` e `last_hit_related`. Il giorno si ricava dall'istante.
3. **Nessun tetto di scritture per giro.** Si lancia a mano, e la prima ondata vera è dopo il 2027-01-18. Un `--max-archived` si aggiunge se serve.
4. **`tb refine` senza `--apply` mostra il piano.** Il campo `low` resta com'è.
5. **Ritchie con run `th` solo per `planOf`**, l'unica funzione nuova con una regola da scrivere. Il filtro, la scrittura e il comando sono codice di bordo, scritto a mano con test sugli stub.
6. **L'API HTTP di `tb` non riceve l'opzione.** Nessun client la usa oggi. Si aggiunge quando serve.
7. **`--apply` parte a ogni apertura di sessione, senza un controllo sull'intervallo.** L'idea è dell'utente. Hermes controlla anche l'intervallo (168 ore) e l'inattività (2 ore), ma il suo giro costa una revisione con LLM. Il nostro costa mezzo secondo e non cambia nulla se non c'è niente da fare. Un timbro dell'ultimo giro si aggiunge se serve.
8. **L'interruttore è la voce `SessionStart` in `~/.claude/settings.json`.** Il codice si scrive ora e non fa danni, perché nessuna nota scende sotto 0.2 prima del 2027-01-18. La prima ondata (164 note) si archivierebbe alla prima apertura di sessione dopo quel giorno, con i parametri che ci saranno nel codice. La pagina wiki sulla soglia dice di leggere il tasso di hit a gennaio e di fissare soglia ed emivita prima di accendere: quindi la voce in `settings.json` si aggiunge dopo quella lettura.

## Fatti che i contratti non portano

- `planOf(scored)` classifica ogni nota con questa tabella. "Archiviata" vuol dire che `archived_at` esiste. Il confine 0.2 sta dalla parte di `restore`: un trust di esattamente 0.2 non è sotto la soglia.

| trust | `archived_at` | esito |
|---|---|---|
| sotto 0.2 | assente | `archive` |
| sotto 0.2 | presente | niente |
| 0.2 o più | presente | `restore` |
| 0.2 o più | assente | niente |

- Una lista vuota dà due liste vuote.
- Gli elementi di `archive` si costruiscono con `lowNoteOf`, quelli di `restore` con `restoredNoteOf` (già scritta: stessa forma di `lowNoteOf`, ma richiede un trust a 0.2 o più).
- `planOf(scored)`: `scored` è una lista di coppie `{ note, trust }` in cui il trust è già calcolato da `trustOf`. Non ricalcola e non conosce `now`. Soglia: `TRUST_FLOOR` (0.2), strettamente sotto per `archive`, a 0.2 o più per `restore`.
- Ordine delle due liste: trust crescente, a parità per id (come `low`).
- Gli elementi delle liste hanno la forma di `lowNoteOf`: `id`, `trust`, `what` tagliato a 80 caratteri, `when`, `hits`, `hits_related`. `lowNoteOf` oggi rifiuta un trust a 0.2 o più, quindi per `restore` serve una funzione gemella o un parametro: si decide nel lavoro.
- `now` per `archived_at` entra dal bordo (`new Date()`), mai dalla funzione pura.
- Come costruire l'input dei test: come in `tests/tb_refine.test.ts`, note parziali con un cast. Per il comando e la ricerca, gli stub di `tests/helpers/td_stubs.ts`.

## Fuori da questo passaggio

- La cancellazione dopo un anno senza segnali e il suo log (non prima del 2027-09-21).
- Un timbro dell'ultimo giro e un controllo di inattività, come il Curator di Hermes.
- Un `restore` esplicito: un hit basta.
- Un campo per fissare una nota (*pin*).
- L'opzione nell'API HTTP.

## File

- Codice: `tools/tb/src/types.ts`, `qdrant.ts`, `notes.ts`, `refine.ts`, `cli.ts`; `extensions/tb_ti/claude.sh`, `extensions/tb_ti/pi.ts`; nuovi `extensions/tb_refine/claude.sh` e `pi.ts`; `setup.sh` li linka.
- Test: nuovo `tests/tb_refine_plan.test.ts` (`planOf`, `restoredNoteOf`), `tests/tb_refine.test.ts` aggiornato col campo `plan`, `tests/tb_refine_cli.test.ts` (`--apply` sugli stub, idempotenza), nuovo `tests/tb_search_archived.test.ts` (il filtro, anche sui correlati), e il test del payload esatto in `tests/tb_note_payload.test.ts` esteso con `archived_at`.
- Contratti da `tools/common/contract.ts`.
