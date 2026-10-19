# Review: hit e refine in ti, uguali a tb

## Esito

- Stato: approvato
- approvato al primo giro

## Copertura della spec

- campi `when`, `hits`, `last_hit`, `archived_at` → `tools/ti/src/types.ts`
- `when` alla nascita → `identity.addEntry`
- un hit per regola restituita, errore solo su stderr → `identity.recordHits` (stessa forma di tb: `nextHit`, `groupByPayload`)
- `--no-hits`, `--no-archived` → `ti/src/cli.ts` search; `record_hits`, `exclude_archived` → `SearchOptions`, `api.ts` `/search` e OpenAPI
- `append-do` scrive solo `do` → `identity.appendDo` con `setPayloadMany`
- scritture parziali e cancellazione di chiavi → `ti/src/qdrant.ts` `setPayloadMany`, `deletePayloadKeys`
- forma minima condivisa → `tb/src/refine.ts` tipo `Counted`; tutte le funzioni prendono `Counted` invece di `Note`
- `what` → `text` nella riga sotto soglia, `LOW_WHAT_CHARS` → `LOW_TEXT_CHARS` → `tb/src/refine.ts` e i suoi test
- regola → record contato → `ti/src/refine.ts` `countedOf`, `COUNTERS_START` = 2026-10-20
- `ti refine` e `--apply` → `ti/src/cli.ts`, `identity.markArchived`, `identity.clearArchived`
- `td` cerca senza contare → `td/src/neighbours.ts`
- hook prompt con `--no-archived` → `extensions/tb_ti/claude.sh`, `extensions/tb_ti/pi.ts`
- `ti refine --apply` all'avvio → `extensions/tb_refine/claude.sh`, `extensions/tb_refine/pi.ts`
- documentazione → `tools/ti/README.md`, sezione "Hits and refine"

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| Nessuno | | |

## Metriche

5 functions  median=1  mean=4.2  max=11  over40=0  flagged=0

## Test

- 1177 passati, 0 falliti; typecheck pulito
- nuovi: `tests/ti_refine.test.ts` (9, contratti di `countedOf`), `tests/ti_hits_refine.test.ts` (9, contro lo stub Qdrant: hit, `--no-hits`, `append-do`, `--no-archived`, `ti refine` con e senza `--apply`)
- mutanti su ogni campo di `countedOf` (6): tutti uccisi

## Scostamenti

- Solo `countedOf` è passato per le due run di th. Il resto è colla di I/O copiata dalla forma di tb (`recordHits`, `markArchived`, `clearArchived`, comandi CLI), scritta a mano e coperta dai test di integrazione.
- Il test di th importava da `vitest` e aveva `do` come stringa: corretti a `bun:test` e a una lista.
- `tests/ti.test.ts`: il test di `appendDo` fissava la vecchia riscrittura completa del punto. Ora verifica la scrittura del solo `do`.
- `ti` ora riconosce `ContractError` e stampa "ti bug, please report", come tb.
- `countedOf` restituisce `hits_related` e `last_hit_related` come chiavi esplicite `undefined`: nessun effetto su JSON né su `signalsOf`.
