# Review: tl search e tl episode

## Esito

- Stato: approvato
- Giro 1: approvato dall'utente.

## Copertura della spec

- Ricerca di episodi con limite, soglia e periodo → `searchEpisodes` in `tools/tl/src/episode_store.ts`
- Controllo del payload che si rilegge → `episodeFromPayload` in `tools/tl/src/episode_read.ts`
- Periodo come sovrapposizione → `periodOverlaps` in `tools/tl/src/episode_read.ts`
- `tl search` con testo, `--json`, `--limit`, `--min-score`, `--since`, `--until` → `tools/tl/src/cli.ts`
- `tl episode <id>` e risoluzione dell'id → `episodeById` e `resolveEpisodeId` in `episode_store.ts`, comando in `cli.ts`
- `tl episode(id)` uguale all'episodio di `tl search --json` → test `a prefix gives the episode that search --json shows`
- Ordine per punteggio, soglia, periodo, nessuna scrittura → contratti di `searchEpisodes` (il periodo è anche un filtro di Qdrant) e i test di `tests/tl_episode_search.test.ts`
- Fuori dal lavoro, da fare: la riga in `alfred.md` e la regola `ti`; la ricostruzione; la prova sui servizi veri

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| `periodOverlaps`: since e until sono giorni o null, since non dopo until | "since e until sono giorni… until incluso" | P2 |
| `periodOverlaps`: un periodo senza limiti accetta ogni episodio | "un episodio entra se si sovrappone al periodo" | P2 |
| `episodeFromPayload`: l'id è un id; un episodio porta l'id chiesto, un errore non è vuoto | "Controllo del payload" | P2 |
| `searchEpisodes`: miglior punteggio per primo, nessuno sotto la soglia, ogni risultato dentro il periodo | "dal più vicino… nessuno sta sotto la soglia… un risultato fuori dal periodo non esce mai" | P2 |
| `searchEpisodes`: la domanda non è vuota, il limite è un intero positivo | derive? Nessuna riga della spec. Sono input della CLI | P2 |
| `allIds`: la collection sta nel tetto di 50 pagine | derive? Nessuna riga della spec | P2 |
| `resolveEpisodeId`, `episodeById`: id non vuoto, id risolto in forma di id, episodio col id chiesto | "Risoluzione dell'id" | P2 |

## Metriche

```
27 functions  median=2  mean=5.1  max=29  over40=0  flagged=0
```

## Test

- 1067 passati, 0 falliti (suite intera); `tsc` pulito
- Nuovi: 14 in `tests/tl_episode_read.test.ts`, 16 in `tests/tl_episode_search.test.ts` (stub, più processi veri di `tl search` e `tl episode`)
- Mutanti: 16 provati su `episode_read.ts` e `episode_store.ts`. Quattordici uccisi. Due sopravvivono: il numero chiesto a Qdrant più uno (poi tagliato al limite) e la scorciatoia dell'id intero (stesso risultato con una scansione in più). Il flag `with_payload: false` nel recupero per id non è controllabile sullo stub, che restituisce il payload comunque

## Scostamenti

- **Nome cambiato.** `dayOf` di `episodes.ts` è ora `dayOfTime`, perché `types.ts` ha già una `dayOf(exchange)` con un altro argomento
- **Il periodo lo filtra Qdrant.** La ricerca chiede esattamente `limit` risultati con un filtro `range` su `to` e `from`. Ho verificato in sola lettura, sulla collection delle note, che il vostro Qdrant applica un `range` su una data scritta come stringa ISO anche senza indice: 47 note di ottobre trovate su 798, quante ne aspettavo. Su `tl_episodes` il filtro non è provato, perché la collection non esiste ancora. Ogni risultato viene comunque ricontrollato con `periodOverlaps` (postcondizione)
- **Test del `th run` corretti.** Il payload di prova portava l'`id` dentro; nello store non c'è, perché l'id è quello del punto. Ora la prova è sul payload vero
- **Soglia 0,35 mai provata su dati veri.** Nei test dello stub i punteggi stanno su un'altra scala (0,83 per una frase uguale, 0,31 per una con una parola in comune)
- **Mai provato sui servizi veri.** Né la scrittura né la lettura degli episodi hanno toccato la collection vera. `QDRANT_URL` punta già alla Rasp, come per `tb` e `ti`
