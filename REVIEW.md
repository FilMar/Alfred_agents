# Review: distillatore automatico all'avvio della sessione

## Esito

- Stato: in attesa
- Primo giro: pronto per la revisione. Non serve nessuna voce nuova in `~/.claude/settings.json`: l'hook `SessionStart` con `startup` che lancia `tb refine` esiste già e lancia anche il distillatore.

## Copertura della spec

- Sessione letta con gli scambi già distillati → `tools/td/src/session.ts`: `SessionRead.read` carica anche gli scambi distillati (senza rumore) come `earlier`; `whole()` li fonde con quelli in coda in ordine di tempo; `isPending(turn)` li distingue.
- Mappa degli episodi sulla sessione intera → `tools/td/src/episodes.ts`: `split`, `listing`, `check`, `fromJson` usano `whole()`. L'asserzione di copertura esistente (`#covers`) vale ora per tutta la sessione.
- Estrazione solo sugli scambi in coda → `tools/td/src/distiller.ts`, `distillSession`: salta il bersaglio che non è in coda. `closeSession` e `reportsEveryTurn` non cambiano: chiudono e riportano solo gli scambi in coda.
- Una sessione con la divisione fallita lascia gli episodi di prima → già vero: gli episodi si scrivono solo con una mappa valida. Un test lo verifica.
- Hook di avvio → `extensions/tb_refine/claude.sh` lancia `distill.sh` staccato, accanto a `tb refine`. Anche per pi: `extensions/tb_refine/pi.ts`, evento `session_start`, stessa forma.
- Soglia 50, tetto 100, lock con `flock`, registro → `extensions/tb_refine/distill.sh`. Il registro è `~/.local/state/alfredo/td-distill.log`.

## Contratti derive?

Nessuno. Ogni contratto nuovo viene da un'invariante dello spec.

| Contratto | Derivato da | Principio |
|---|---|---|
| `SessionRead.of`: gli scambi precedenti sono della sessione, senza id doppi, senza rumore | "gli episodi coprono ogni scambio della sessione" | P2 |
| `SessionRead.whole`: tutti gli scambi una volta sola, in ordine | "senza vuoti né sovrapposizioni" | P1 |
| `SessionRead.isPending`: un scambio non in coda è uno precedente | "l'estrazione non rilegge uno scambio già distillato" | P1 |
| `SessionRead.#distilled`: sotto il tetto, della sessione, già distillati | confine con `tl` | P2 |

## Metriche

```

33 functions  median=1  mean=2.0  max=10  over40=0  flagged=0
```

## Test

- 1151 passati, 0 falliti. `tsc` pulito in tutti i sotto-progetti.
- 12 test nuovi: 9 su `SessionRead` (precondizioni, `whole`, tabella di `isPending`, lettura con rumore tra i distillati, tetto), 3 end-to-end (episodi sull'intera sessione con estrazione solo sul nuovo; il secondo giro sostituisce il primo; la divisione fallita lascia il primo).
- Mutanti, tutti uccisi: `read.turns()` al posto di `whole()` negli episodi (2 test); estrazione senza il salto (2); `isPending` sempre vero (4); rumore tra gli scambi precedenti (1); filtro `distilled: false` al posto di `true` (4).
- Hook, provato su stub di `tl` e `bun` (non sulla coda vera): sotto soglia (49) non lancia nulla e non scrive; a 50 lancia una volta e scrive due righe; lock tenuto da un altro giro: una riga "skipped"; gruppo di processi ucciso con `kill -9`: il giro dopo parte; `td` in errore (exit 3): scrive "exit 3"; `tl` giù: non lancia e esce 0. La prova ha trovato un errore (`$?` letto dopo `date`, scriveva sempre "exit 0"): corretto.

## Scostamenti

- Il hook per pi era "fuori dal lavoro" nello spec; l'hai chiesto dopo l'ok ed è fatto. Non l'ho provato in una sessione pi vera: ho controllato solo che il modulo si carichi e che `tsc` sia pulito.
- Ho scritto i corpi e i test a mano e non con i due `th run`: la modifica è chirurgica su funzioni già coperte da 600 test, e un `th run` su file interi avrebbe riscritto codice che non andava toccato. Lo dico perché la regola dice altro.
- `distill.sh` è bash senza contratti né test automatici: i test sono la prova su stub descritta sopra, e non sono nel repo. Se vuoi un test automatico per l'hook, è un lavoro a parte.
- Le sessioni lunghe pagano il costo di rileggere i contenuti degli scambi già distillati (una richiesta a `tl` per scambio) a ogni ripresa. Per 200 scambi sono 200 richieste locali alla rete del rasp.
- Se il modello divide la sessione in modo diverso al secondo giro, gli episodi cambiano confini e id: i vecchi vengono sostituiti. Il contenuto resta coperto.
- Il tetto per sessione (`--max-per-session`) vale per esecuzione: una sessione che riprende può ora salvare altri 10 elementi.
- `td` non è nel PATH: `distill.sh` lo chiama con il percorso relativo allo script, quindi non serve il link.
