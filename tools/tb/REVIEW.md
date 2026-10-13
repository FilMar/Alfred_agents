# Review: tb refine (primo passaggio, dry-run)

## Esito

- Stato: in attesa
- Giro 1: implementato, test e controlli verdi. Aspetta il tuo giudizio.

## Copertura della spec

- Signals → `Signals` e `signalsOf` in `tools/tb/src/refine.ts`
- `COUNTERS_START` → costante in `refine.ts`, 2026-09-21
- Trust → `trustOf` in `refine.ts`. È un numero: nessun tipo a parte, il controllo è `isUnit` nella postcondizione
- Spread → `Spread` e `spreadOf` in `refine.ts`
- `tb refine` → comando in `tools/tb/src/cli.ts`, dopo `browse`. Legge, chiama `refineReport`, stampa
- Elenco sotto 0.2 (id, trust, what a 80 caratteri, when, hits, hits_related) → `LowNote` e `lowNoteOf`
- Composizione dei tre calcoli → `refineReport` (decisione 2 dello spec)
- Flusso: `now` entra dal bordo (`new Date()` in `cli.ts`), mai dalle funzioni pure
- Nessuna scrittura, opzione sconosciuta rifiutata → `tests/tb_refine_cli.test.ts`
- Invarianti dello spec (0.5 al giorno 0, 119 giorni, giorni futuri a 0, fasce, sottoinsieme) → `tests/tb_refine.test.ts`

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| `signalsOf`: `when` è una data ISO | derive? Decisione 4 dello spec: ISO 8601 è un invariante dello store, quindi un errore di programma | P5 |
| `signalsOf`: `countersStart` valido | invariante "last_signal è sempre un istante" | P2 |
| `signalsOf`: `lastSignal` valido (post) | stessa invariante, vale anche se `last_hit` è illeggibile | P2 |
| `signalsOf`: senza segnali il floor è `countersStart` (post) | invariante "senza hit ricade su max(when, COUNTERS_START)" | P1 |
| `trustOf`: `hits` e `hitsRelated` interi da 0 | invariante "trustOf è sempre in [0, 1]": con un contatore negativo non regge | P2 |
| `trustOf`: `lastSignal` e `now` validi | stessa invariante: una data illeggibile dà NaN | P2 |
| `trustOf`: trust tra 0 e 1 (post) | invariante 1 | P2 |
| `spreadOf`: ogni trust tra 0 e 1 | deriva dall'invariante 1 di `trustOf` | P2 |
| `spreadOf`: 10 fasce, totale, somma delle fasce, sotto-soglia nel totale (post) | invarianti di `spreadOf` | P1 |
| `lowNoteOf`: trust sotto la soglia | derive? lo spec dice "note sotto 0.2", non dice che la funzione lo pretenda | P1 |
| `lowNoteOf`: id uguale, `what` entro 80 (post) | elenco sotto 0.2 dello spec | P1 |
| `refineReport`: note sotto il limite di lettura | decisione 1: `browseNotes` non pagina | P2 |
| `refineReport`: totale e elenco coerenti con lo spread (post) | invarianti di `spreadOf` e dell'elenco | P1 |

## Metriche

```
11 functions  median=2  mean=5.4  max=15  over40=0  flagged=0
```

## Test

- 902 passati, 0 falliti (suite completa). Di questi 60 in `tb_refine.test.ts` e 2 in `tb_refine_cli.test.ts`
- Typecheck di tutti e cinque i tool: pulito
- Contro il file con i `todo`: 9 passati (le precondizioni) e 50 falliti, come previsto
- Mutanti: 20 provati. 18 uccisi subito. Il mutante sul tetto di `hits_related` sopravviveva: aggiunto il test "eleven related hits are worth the same as ten", ora ucciso. Il mutante sul tetto di `hits` è equivalente: con 10 hit il valore è già 1.0 e il `min(1, …)` esterno copre tutto, quindi nessun test può distinguerlo

## Scostamenti

- Lo spec diceva "legge tutte le note con `browseNotes`". Ma `browseNotes` legge una pagina da 20. Il comando passa `limit: REFINE_NOTES_LIMIT` (10000) e c'è un assert contro il troncamento. Lo spec è stato corretto (decisione 1)
- L'ordine dell'elenco non era nello spec: trust crescente, a parità id (decisione 3)
- I test di `trustOf` hanno valori attesi propri (0.25, 0.125, 0.7, …). La regola dice niente assert nei test, tranne le tabelle dei classificatori. `trustOf` non è un classificatore, ma i valori vengono dalle invarianti dello spec e il contratto non può portarli: scostamento voluto
- Il comparatore di `sort` in `refineReport` l'ho riscritto io a mano: `check_body_diff.py` scambiava il suo `return` per un `return` anticipato del corpo (falso positivo). Ora è un'espressione
- L'helper `tests/helpers/td_stubs.ts` ha due righe nuove: la radice `/` di Qdrant e il `GET` di Ollama rispondono. Prima davano 404 e un errore non gestito, e il controllo di salute di `tb` falliva. Non cambia i test esistenti: la suite era verde prima e dopo
- Funzioni private senza contratto: `isValidDate`, `isIsoDate`, `isCounter`, `allUnit`, `sum`, `floorHolds`. Sono predicati, come quelli di `contract.ts`
- I `Date` dentro un tipo `Readonly` restano mutabili: `readonly` non li protegge
- Il progetto non ha formatter né linter. Il controllo è `tsc` in modalità strict
- Osservazione, non un difetto: nella formula il tetto di 10 su `hits` è ridondante, perché `0.5 + 0.05*10 = 1`. Il tetto sul `min(1, …)` esterno fa già lo stesso lavoro. Resta nel codice perché lo dice lo spec e la wiki
- Non fatto, per decisione dello spec: `--apply`, archiviazione, `archived_at`, cancellazione, log
