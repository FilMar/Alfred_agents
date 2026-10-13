# Spec: tb refine (primo passaggio, solo dry-run)

## Entità

- **Signals**
  - stato: `hits`, `hits_related` e `last_signal` (un istante) di una nota.
  - fa: niente, è un valore. Si legge da una `Note`.
  - non fa: non conosce Qdrant e non scrive.
  - serve a: dare a `trustOf` solo i campi che contano.
  - comanda: `signalsOf(note, countersStart)`, che la costruisce.
  - `last_signal`: il più recente tra `last_hit` e `last_hit_related`. Se mancano entrambi, `max(when, countersStart)`.
  - `COUNTERS_START` è una costante con nome in `refine.ts`: 2026-09-21. I contatori esistono solo da quel giorno, prima non c'era misura. Si toglie quando avranno mesi di storia.

- **Trust**
  - stato: un numero tra 0 e 1.
  - fa: `trustOf(signals, now)` lo calcola da zero, ogni volta. Non si incrementa.
  - non fa: non tocca lo `score` della ricerca, non scrive sulla nota.
  - serve a: dire quanto una nota è viva. Nota nuova senza segnali: 0.5.
  - comanda: solo `trustOf`.
  - formula (decisione wiki, pesi a occhio):
    `min(1, 0.5 + 0.05*min(hits,10) + 0.02*min(hits_related,10)) * 0.5^(giorni_dall_ultimo_segnale / 90)`
  - i giorni si contano da `last_signal` di `Signals`, già calcolato.

- **Spread**
  - stato: quante note in ciascuna fascia di 0.1 di trust, il totale, quante sotto 0.2.
  - fa: `spreadOf(trusts)` lo costruisce.
  - non fa: non legge note.
  - serve a: vedere la distribuzione prima di fissare la soglia.
  - comanda: solo `spreadOf`.

- **`tb refine`**
  - fa: legge tutte le note con `browseNotes`, calcola il trust di ciascuna, stampa su stdout un JSON: lo `Spread` e l'elenco delle note sotto 0.2 (id, trust, `what` tagliato a 80 caratteri, `when`, `hits`, `hits_related`).
  - non fa: non scrive su Qdrant, non archivia, non cancella. Non ha `--apply` in questo passaggio. Un'opzione sconosciuta viene rifiutata da commander.
  - comanda: il bordo in `cli.ts` (I/O) chiama le funzioni pure.

## Flussi

- Qdrant → `browseNotes({ limit: REFINE_NOTES_LIMIT })` → `Note[]` → `signalsOf` → `Signals` → `trustOf(signals, now)` → `Trust` → `spreadOf` → `Spread` → stdout (JSON)
- `now` entra dal bordo (`new Date()`), mai dalla funzione pura.

## Decisioni

1. `browseNotes` legge una pagina sola e non pagina (default 20 note). `tb refine` passa `limit: REFINE_NOTES_LIMIT` (10000, costante in `refine.ts`). Se le note lette sono 10000 o più, la lettura può essere troncata: è un errore di programma, c'è un assert. (Trovato leggendo il codice: lo spec diceva "legge tutte le note".)
2. `refineReport(notes, now, countersStart)` è la funzione pura che compone `signalsOf`, `trustOf` e `spreadOf` e produce il JSON da stampare. Il bordo in `cli.ts` legge, chiama `refineReport`, stampa.
3. L'elenco delle note sotto 0.2 è ordinato per trust crescente, a parità per id. Lo spec non diceva l'ordine: serve a leggere prima le peggiori e a rendere l'output stabile.
4. Una `when` non leggibile come data è un errore di programma: l'ISO 8601 è un invariante dello store. Contratto marcato `derive?`.

## Invarianti

- `trustOf` restituisce sempre un numero in [0, 1].
- Una nota senza hit e con ultimo segnale uguale a `now` vale 0.5.
- A parità di segnali, più giorni dall'ultimo segnale non alzano mai il trust.
- A parità di giorni, più hit non abbassano mai il trust. Sopra 10 hit non cambia più nulla.
- Se l'ultimo segnale è nel futuro rispetto a `now` (orologio sballato, nota appena scritta), i giorni valgono 0. Non è un errore di programma: viene dai dati.
- Un `last_hit` assente non è un errore: il segnale ricade su `max(when, COUNTERS_START)`.
- Una nota senza hit e con `when` prima di `COUNTERS_START` vale 0.5 il giorno `COUNTERS_START` e scende sotto 0.2 dopo 119 giorni, il 2027-01-18.
- Una nota senza hit e con `when` dopo `COUNTERS_START` conta i giorni da `when`, non dal floor.
- `spreadOf`: la somma delle fasce è uguale al totale. Le note sotto 0.2 sono un sottoinsieme del totale.
- Il comando non fa nessuna scrittura: dopo il dry-run lo snapshot delle note è identico a prima.

## Fuori da questo passaggio

- `--apply`, `archived_at`, archiviazione, cancellazione, log: passaggi successivi.
- Ricerca che include gli archiviati.
- Campo per i giorni distinti di hit.
- Timer e import dello storico.

## File

- Codice: `tools/tb/src/refine.ts`. Il comando si aggiunge in `tools/tb/src/cli.ts`.
- Test: `tests/tb_refine.test.ts`.
- Contratti da `tools/contract/contract.ts`.

## Fatti che i contratti non portano

- `Signals`: `{ hits, hitsRelated, lastSignal }`. `hits` e `hitsRelated` valgono 0 se il campo manca. `lastSignal` è un `Date`.
- `signalsOf(note, countersStart)`: se `last_hit` o `last_hit_related` esistono, `lastSignal` è il più recente dei due che esistono. Se mancano entrambi, è `max(when, countersStart)`.
- `trustOf(signals, now)`: `giorni = max(0, (now - lastSignal) / 86_400_000)`, frazionari. `trust = min(1, 0.5 + 0.05*min(hits,10) + 0.02*min(hitsRelated,10)) * 0.5^(giorni/90)`. Costanti con nome in `refine.ts`: `TRUST_BASE`, `HIT_WEIGHT`, `RELATED_WEIGHT`, `HIT_CAP`, `HALF_LIFE_DAYS`.
- `Spread`: `{ bins, total, belowFloor }`. `bins` ha sempre 10 numeri. La fascia di `t` è `min(9, floor(t * 10))`, quindi 1.0 sta nell'ultima. `belowFloor` conta i trust strettamente sotto `TRUST_FLOOR` (0.2).
- `refineReport` ritorna `{ spread, low }`. `low` ha una `LowNote` per ogni nota sotto 0.2: `{ id, trust, what, when, hits, hits_related }`. `what` è tagliato ai primi 80 caratteri, senza puntini. `hits` e `hits_related` valgono 0 se mancano.
- Il comando stampa `{ spread, low }` come JSON con indentazione 2, come `out()` in `cli.ts`.
- Come costruire l'input dei test: `Note` ha molti campi, i test ne riempiono solo `id`, `when`, `what` e i contatori e usano un cast, come fa `tests/td_neighbours.test.ts`. `refine.ts` non importa Qdrant: i test della parte pura non hanno stub. Il test del comando (nessuna scrittura) usa `startMemoryStubs` e lancia `bun tools/tb/src/cli.ts refine` con `QDRANT_URL` dello stub.
