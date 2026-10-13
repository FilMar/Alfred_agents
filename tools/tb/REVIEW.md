# Review: `tb refine --apply` e archivio fuori dall'hook

## Esito

- Stato: in attesa
- Giro 1: implementato, test e controlli verdi. Aspetta il tuo giudizio.

## Copertura della spec

- `Note.archived_at` → `tools/tb/src/types.ts`
- Piano (`archive`, `restore`) e `planOf` → `tools/tb/src/refine.ts`. Corpo scritto da `th`
- `restoredNoteOf` → `refine.ts`, scritta a mano. Con `lowNoteOf` condivide `viewOf`
- `tb refine` mostra `plan` → `refineReport` in `refine.ts`, stampato da `tools/tb/src/cli.ts`
- `tb refine --apply` → `cli.ts`, con `markArchived` e `clearArchived` in `tools/tb/src/notes.ts`. Due richieste di scrittura in tutto
- Rimozione di chiavi dal payload → `deletePayloadKeys` in `tools/tb/src/qdrant.ts`
- `tb search --no-archived` → opzione in `cli.ts`, `SearchOptions.exclude_archived` in `types.ts`, condizione `is_empty` in `buildSearchFilter` (`qdrant.ts`). Il filtro vale anche per i correlati, perché la visita lo riusa
- Hook → `extensions/tb_ti/claude.sh` e `extensions/tb_ti/pi.ts` passano `--no-archived`
- Avvio sessione → nuovi `extensions/tb_refine/claude.sh` e `extensions/tb_refine/pi.ts`. `setup.sh` li linka
- `td` non passa il flag → `neighbours.ts` non è stato toccato
- Invariante "solo `--apply` scrive `archived_at`" → nessun altro punto del codice lo scrive
- Invariante "`archived_at` se e solo se trust sotto 0.2 dopo un giro" → `tests/tb_refine_cli.test.ts`
- Invariante "secondo giro non scrive niente" → `tests/tb_refine_cli.test.ts`
- Invariante "senza il flag trova anche le archiviate con `archived_at` visibile" → `tests/tb_search_archived.test.ts`
- Invariante "payload dopo archivio e ripristino" → `tests/tb_note_payload.test.ts`
- Un'opzione sconosciuta viene rifiutata → `tests/tb_refine_cli.test.ts`

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| `planOf`: ogni trust tra 0 e 1 (pre) | invariante di `trustOf`, che produce i trust | P2 |
| `planOf`: nessuna nota in entrambe le liste (post) | invariante "archive e restore non hanno note in comune" | P1 |
| `planOf`: ogni nota da archiviare è sotto la soglia e senza `archived_at` (post) | tabella degli esiti | P1 |
| `planOf`: ogni nota da ripristinare ha `archived_at` e trust a 0.2 o più (post) | tabella degli esiti | P1 |
| `restoredNoteOf`: trust a 0.2 o più (pre) | tabella degli esiti | P2 |
| `restoredNoteOf`: id uguale, `what` entro 80 caratteri (post) | stessa forma di `lowNoteOf` | P1 |
| `refineReport`: le note da archiviare sono tra le note sotto soglia (post) | `archive` ⊆ note sotto 0.2 | P1 |

Nessun `derive?`.

## Metriche

```
tools/tb/src/refine.ts: 19 functions  median=2  mean=4.4  max=15  over40=0  flagged=0
tools/tb/src/notes.ts: 18 functions  median=4  mean=5.6  max=19  over40=0  flagged=0
tools/tb/src/qdrant.ts: 27 functions  median=11  mean=10.6  max=21  over40=0  flagged=0
```

## Test

- 928 passati, 0 falliti (suite completa). Erano 902: i 26 in più sono i test di `planOf`, della ricerca, di `--apply` e del payload
- Typecheck dei cinque tool: pulito
- Contro il file con il `todo`: 8 test di `planOf` falliti e 6 passati (la precondizione di `planOf` e i cinque di `restoredNoteOf`, che aveva già il corpo), come previsto
- Mutanti: 15 provati, 15 uccisi. Uno è sopravvissuto al primo giro (il collegamento di `--no-archived` nel comando, che nessun test provava): ho aggiunto un test che lancia `tb search` come processo
- Prova su Qdrant vero con una collezione usa-e-getta (creata e cancellata): il filtro `is_empty` tiene solo la nota senza `archived_at`, e `payload/delete` toglie la chiave. Gli stub imitano Qdrant, quindi volevo la prova sul vero
- Sullo store vero: `tb search --no-archived` funziona e `tb refine` mostra `plan` con 0 note da archiviare e 0 da ripristinare. Non ho lanciato `--apply` sullo store vero

## Scostamenti

- `restoredNoteOf` l'ho scritta a mano, e ho estratto `viewOf` (la mappa da nota a `LowNote`) per non copiarla. Il corpo di `lowNoteOf`, scritto da `th`, ora la chiama
- Ho estratto `byTrustThenId`, il comparatore che compariva tre volte, dopo il run dei corpi. I test sono rimasti verdi
- I test di `th` usano `node:test` e `assert`, non `bun:test` e `expect` come `tb_refine.test.ts`. Funzionano uguale, e `td_neighbours.test.ts` è già scritto così
- I test con valori attesi propri sono tabelle di esiti di un classificatore e di una mappa, come per `trustOf`
- Il modello dei test ha suggerito un'isteresi alla soglia (archivia sotto 0.2, ripristina oltre un margine). Non l'ho adottata: l'archiviata si trova ancora con la ricerca voluta, quindi l'archivio non toglie il segnale che serve al rientro, e una nota vicina a 0.2 che oscilla è il comportamento voluto
- `setup.sh` ora linka anche l'hook di `tl` (`ingest-tl.sh`, `tl.ts`), che mancava
- Gli stub di test hanno imparato `is_empty` e `/points/payload/delete`. Quello di Ollama ora risponde al controllo di salute con il modello di embedding, perché `tb search` lo richiede
- Non toccata l'API HTTP: nessun client usa `exclude_archived`
- Non provati dal vivo: l'hook `SessionStart` di Claude Code e l'evento `session_start` di pi. Di entrambi ho controllato solo la sintassi, perché le estensioni stanno fuori da `tsc` e dai test
- Limite noto: due sessioni aperte insieme possono lanciare due giri. Il valore di `archived_at` può allora essere l'istante del secondo
- Dopo l'approvazione: Omero scrive le pagine wiki, e `SPEC.md` e `REVIEW.md` escono dall'albero
- **L'interruttore non è acceso.** La voce `SessionStart` in `~/.claude/settings.json` la aggiungi tu, dopo la lettura del tasso di hit di gennaio. Finché non c'è, l'hook non parte. In pi basta linkare l'estensione con `setup.sh`: se lo lanci, parte da subito (ma non può archiviare nulla prima del 2027-01-18)
