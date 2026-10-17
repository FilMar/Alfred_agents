# Review: verdetti coerenti e doppioni nella stessa sessione

## Esito

- Stato: approvato
- Giro 1: approvato dall'utente.

## Copertura della spec

- A. Un verdetto verso un elemento di un altro tipo diventa `new`, senza collegamento e senza `adds`, `reason`, `do` → `settle` e `ofsAreConsistent` in `tools/td/src/novelty.ts`
- A. La sessione non resta aperta per questo motivo → il verdetto `new` non produce errori; il test `turns a verdict that points at an item of another kind into new`
- B. Opzione `--same-session-cutoff <x>`, predefinito 0,8, la libreria senza valore non filtra → `tools/td/src/cli.ts`, `SAME_SESSION_CUTOFF_DEFAULT` e `cutoffOf` in `tools/td/src/twin.ts`, `distillerOf(..., sameSessionCutoff = null)`
- B. Ogni candidato si confronta con gli elementi della sessione dello stesso tipo → `twinVerdicts` in `tools/td/src/twin_gate.ts`
- B. Somiglianza almeno pari alla soglia: verdetto `duplicate` dell'elemento, il giudice non lo vede → `twinOf` in `twin.ts`, l'unione dei verdetti in `decideTarget`, `tools/td/src/distiller.ts`
- B. Se tutti sono doppioni, il giudice non viene chiamato → `judgeNovelty` riceve una lista vuota; il test `a candidate that says again a saved item is a duplicate and the judge is not asked`
- B. A parità vince il primo → `twinOf`, tabella dei casi
- B. Un doppione non entra nella lista e non consuma il tetto → il test `a twin does not take a place of the cap per session`
- B. Vale in shadow → la lista si riempie anche in shadow, come per il tetto
- Fuori dal lavoro, da fare: confronto tra candidati dello stesso scambio; soglia contro tutto `tb`; grappoli di idee distinte

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| `settle`: un verdetto non `new` porta la chiave di un elemento dello stesso tipo del candidato | "Nessun verdetto di un candidato porta l'id di un elemento di un altro tipo" | P2 |
| `cosine`: vettori non vuoti, della stessa lunghezza, non nulli; risultato tra -1 e 1 | "`cosine`: un numero tra -1 e 1" | P2 |
| `twinOf`: la soglia è un numero maggiore di 0 e al più 1; un gemello la raggiunge; è il primo più vicino; senza gemello nessuno la raggiunge | "Ogni candidato si confronta con l'elemento più vicino. A parità vince il primo" | P2 |
| `cutoffOf`: nullo o numero maggiore di 0 e al più 1 | "`cutoffOf`: legge il testo della soglia" | P2 |
| `twinVerdicts`: senza soglia nessun gemello; ogni gemello è un `duplicate` di un elemento della lista | "Un doppione dichiarato dal filtro ha somiglianza almeno pari alla soglia" | P2 |
| `cosine`: nessun vettore tutto zero | derive? Nessuna riga della spec. Un vettore nullo non ha direzione | P2 |
| `twinOf`: ogni elemento ha un vettore lungo quanto il vettore | derive? Nessuna riga della spec | P2 |

## Metriche

```
67 functions  median=1  mean=5.7  max=37  over40=0  flagged=0
```

## Test

- 1139 passati, 0 falliti (suite intera); `tsc` pulito
- Nuovi: `tests/td_twin.test.ts` (tabelle di `cutoffOf`, `cosine`, `twinOf` e dei classificatori), 3 in `tests/td_active_end_to_end.test.ts` (gemello senza chiamare il giudice, senza soglia il giudice è chiamato, un gemello non consuma il tetto), 2 in `tests/td_novelty.test.ts` (verdetto tra tipi diversi diventa `new`, verdetto dello stesso tipo resta)
- Mutanti: 11 provati su `twin.ts`, `twin_gate.ts`, `distiller.ts` e `novelty.ts`. Tutti individuati. Due varianti sono equivalenti per costruzione e non le ho provate: la cache dei vettori in `twin_gate.ts` e il filtro per tipo, i cui testi di tipo diverso restano comunque sotto la soglia

## Scostamenti

- **Tre test vecchi di `td_novelty` cambiati.** Usavano per comodità coppie nota-regola (una nota che "contraddice" una regola, un `append` verso una nota) che il nuovo contratto rifiuta. Ora usano elementi dello stesso tipo
- **Test del `th run` corretti.** Usavano `vitest`: li ho portati a `bun:test`. `cutoffOf`, `cosine` e `twinOf` avevano solo chiamate senza risultato atteso: ho aggiunto le tabelle di casi
- **Il confronto è sul testo `what`**, non su `why` più `what`. È il testo che vede anche il giudice. Sul lotto del 17 ottobre dà lo stesso numero di coppie a 0,8 (2 su 57)
- **A 0,8 il filtro è prudente.** Sul lotto del 17 ottobre avrebbe preso due coppie su sei di quel grappolo (0,84 e 0,80) e lasciato le altre quattro (0,73–0,77). La soglia si abbassa con l'opzione
- **I doppioni del filtro si vedono come `duplicate` in `tl extractions`**, uguali a quelli del giudice. Il motivo ("same idea as an item of this session") è nel verdetto in memoria, non nella tabella
- **Non si confronta con gli altri candidati dello stesso scambio**, solo con gli elementi già decisi
- **Mai provato su una sessione vera.** Il modello di embedding è locale, quindi il filtro non costa chiamate a pagamento
