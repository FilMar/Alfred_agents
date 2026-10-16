# Review: output testuale di tb e ti

## Esito

- Stato: approvato
- Giro 1: approvato dall'utente.

## Copertura della spec

- Render, blocco nota, blocco regola, id corto → `tools/common/render.ts` (`shortId`, `noteBlock`, `ruleBlock`, `blocksOf`)
- Vista senza vettore → `ruleView` in `render.ts`. `tb` non ne ha bisogno: `Note` non contiene il vettore
- `tb search` e `ti search` in testo, `--json` per il resto → `tools/tb/src/cli.ts`, `tools/ti/src/cli.ts`, `outText` in `tools/common/cli.ts`
- `tb meta <id>` → `noteById` in `tools/tb/src/notes.ts`
- `ti meta <id>`, prefisso per `delete` e `append-do` → `resolveEntryId` e `entryById` in `tools/ti/src/identity.ts`
- L'hook non formatta più → `extensions/tb_ti/claude.sh`, `extensions/tb_ti/pi.ts`
- Il test del processo passa a `--json` → `tests/tb_search_archived.test.ts`
- Le skill descrivono il nuovo output → christopher, socrate, aristotele, mose (`--json` dove serve `if`, `score`, `refs`)
- `meta(id)` uguale a `search --json` → provato a mano su 7 note di `tb` e 3 regole di `ti`, e nei test `tests/cli_text_output.test.ts`
- Fuori dal lavoro, da fare: il wiki di `tb` e `ti` (omero)

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| `shortId`: l'id ha almeno 8 caratteri, il risultato ne ha 8 ed è prefisso | "L'id mostrato ha 8 caratteri" | P2 |
| `noteBlock`: apre con l'id corto, finisce col `why`, almeno 3 righe | "ognuno su una riga" | P2 |
| `ruleBlock`: apre con l'id corto, contiene ogni azione, una riga per azione | "le righe di `do`, una per riga" | P2 |
| `blocksOf`: vuoto solo senza blocchi, ogni blocco inizia una riga | "senza risultati non stampano nulla", "uno dopo l'altro" | P2 |
| `ruleView`: nessun vettore, ogni altro campo resta | "la regola senza vettore" | P2 |
| `ruleView`: `isRecord(entry)` | derive? Nessuna riga della spec. Protegge dal JSON di Qdrant, che non è tipato | P2 |
| `noteById`, `resolveEntryId`: id non vuoto | derive? Nessuna riga della spec. Un prefisso vuoto corrisponde a tutto | P2 |

## Metriche

```
13 functions  median=1  mean=2.0  max=4  over40=0  flagged=0
```

## Test

- 1001 passati, 0 falliti (suite intera); `tsc` pulito su tb, ti, tl, th, td
- Nuovi: 62 in `tests/render.test.ts`, 11 in `tests/cli_text_output.test.ts` (processi veri contro gli stub)
- Mutanti provati su `render.ts`: il separatore tra blocchi, l'ordine di `what` e `why`, il separatore tra le righe di una regola, il prefisso dell'id, il vettore tolto, i campi tenuti. Tutti uccisi. Un mutante equivalente (`slice(0, 8) + ""`) sopravvive per costruzione

## Scostamenti

- **Una sola vista.** La spec prevedeva `noteView` e `ruleView`. `Note` non ha vettore, quindi `noteView` sarebbe stata una funzione identità. Esiste solo `ruleView`. La spec è aggiornata
- **Codice di bordo scritto a mano.** `noteById`, `resolveEntryId`, `entryById`, il cablaggio delle CLI e l'hook non passano dai due `th run`: sono poche righe di colla senza regole proprie. I test sono processi veri contro gli stub, scritti a mano
- **Test dei `th run` corretti.** Importavano `vitest`; il repo usa `bun:test`. Ho cambiato la riga di import
- **Contratti aggiunti dopo i mutanti.** Il separatore tra blocchi e quello tra `what` e `why` non erano protetti. Ho aggiunto `lineCountAtLeast`, `startedLines`, `emptyIffNone`, `allBlockStarts` e i loro test a mano
- **`noteBlock`: cinque invarianti, non sei.** Ho tolto `containsAll([what, why])`. Un corpo che sostituisse il `what` con un'altra riga di testo non verrebbe visto dal contratto
- **Dato non verificabile dal contratto.** Una nota con una riga interna che inizia con `-- ` confonderebbe chi legge i blocchi. Nei dati reali non ce ne sono (798 note, 71 regole)
- **`pi.ts` non provato in una sessione pi.** Il controllo è `tsc` e la lettura. Con la nuova forma sparisce anche il `.slice(0, 2)` che scartava le note collegate
- **Il wiki non è aggiornato.** Le pagine di `tb` e `ti` che descrivono l'output restano da riscrivere con omero
