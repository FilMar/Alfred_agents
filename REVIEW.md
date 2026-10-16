# Review: gli episodi da td a tl

## Esito

- Stato: approvato
- Giro 1: approvato dall'utente.

## Copertura della spec

- Episodio (struct, id, `from` e `to`) → `Episode`, `EpisodeInput`, `episodeId`, `episodeOf` in `tools/tl/src/episodes.ts`
- Blocco episodio `-- <id8> <data>` + riassunto → `episodeBlock`, `dayOf`, `opensDatedBlock` in `tools/tl/src/episodes.ts`
- Scrittura che sostituisce gli episodi della sessione → `writeEpisodes` in `tools/tl/src/episode_store.ts`
- Vettore dal riassunto, stesso modello di `tb` e `ti` → `embedDocument` di `tools/tb/src/infra.ts`, chiamato da `writeEpisodes`
- Passo 0 di `td`: scrive in modalità attiva, non in shadow → `distillSession` e `episodesToWrite` in `tools/td/src/distiller.ts`
- Errore di scrittura = sessione non chiusa → `closeSession` riceve `episodeFailure`
- Id dell'estrattore nel payload → `Recorder.extractorId()` in `tools/td/src/recorder.ts`
- Fuori da questo lavoro, da fare: `tl search`, la riga in `alfred.md` e la regola `ti`, la ricostruzione

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| `episodeId`: sessione e primo scambio sono id | "derivato da sessione e primo scambio" | P2 |
| `episodeOf`: almeno uno scambio, in ordine di tempo, riassunto non vuoto | "Un episodio ha almeno uno scambio, un riassunto non vuoto e `from <= to`" | P2 |
| `episodeOf`: `from` e `to` sono primo e ultimo scambio | "`from` è il tempo del primo scambio… `to` quello dell'ultimo" | P2 |
| `episodeBlock`: apre con id corto e giorno, finisce col riassunto, due righe | "L'intestazione del blocco ha l'id corto e il giorno" | P2 |
| `writeEpisodes`: almeno un episodio, tutti della sessione, nessuno doppio | "Dopo la scrittura la collection ha per quella sessione esattamente gli episodi ricevuti" | P2 |
| `writeEpisodes`: gli episodi stanno in una pagina (1000) | derive? Nessuna riga della spec. Il limite viene dalla lettura con una sola pagina | P2 |
| `episodesToWrite`: un episodio salvato per ogni episodio della mappa | "Dopo la scrittura… gli episodi ricevuti" | P2 |

## Metriche

```
14 functions  median=2.5  mean=3.9  max=16  over40=0  flagged=0
```

## Test

- 1037 passati, 0 falliti (suite intera); `tsc` pulito su tutti i tool
- Nuovi: 25 in `tests/tl_episodes.test.ts`, 7 in `tests/tl_episode_store.test.ts`, 4 in `tests/td_active_end_to_end.test.ts` (episodi scritti con date e scambi, niente in shadow, store giù lascia la sessione aperta, stessa sessione due volte)
- Mutanti provati: 8 su `episodes.ts`, 6 su `episode_store.ts` e sul passo 0. Due sono sopravvissuti al primo giro (il vecchio episodio non cancellato e il vettore calcolato su un testo sbagliato) e ho corretto i test; ora sono tutti uccisi. Il controllo finale `sameIds` in `writeEpisodes` non ha un test che lo faccia scattare: si attiva solo se lo store restituisce un insieme diverso da quello scritto

## Scostamenti

- **Payload.** La spec e il wiki dicevano `model` e `prompt_version`. Salvo `extractor` (l'id della riga di configurazione, che contiene modello e prompt) e `model`. La pagina del wiki va aggiornata
- **Test del `th run` corretti a mano.** Usavano `node:test`; il repo usa `bun:test`. Il test sull'id ricalcolava lo SHA-256 (un oracolo che rifà la funzione); l'ho sostituito con tre valori letterali calcolati a parte
- **Fixture dei test di `td` cambiate.** `episodeId` pretende che la sessione sia un id. Nei dati reali lo sono tutte (313 su 313), ma otto test usavano `s-1` o `e2e-1`. Ora usano id nella forma 8-4-4-4-12
- **Codice di bordo scritto a mano.** `episode_store.ts` e il cablaggio in `distiller.ts` non passano dai due `th run`: sono colla di I/O. I test sono sugli stub di memoria
- **Mai provato sui servizi veri.** Né Qdrant né Ollama reali: solo gli stub. La collection `tl_episodes` non esiste ancora nello store vero
- **Un solo `th run` per i corpi.** Il rapporto sul test di `episodeId` segnalava una riga di test rotta da una mia conversione automatica: l'ho corretta
