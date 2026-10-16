# Spec: tl search e tl episode

Obiettivo: l'agente cerca negli episodi con `tl search` e ne apre uno con `tl episode`. Tutto con il testo corto come in `tb` e `ti`.

## Entità

- **Ricerca di episodi** (funzione di `tl`, nello stesso modulo che scrive)
  - riceve la domanda, un limite, una soglia di punteggio e un periodo (`since`, `until`)
  - calcola il vettore della domanda col modello di `tb` e `ti` e cerca nella collection
  - restituisce gli episodi con il punteggio, dal più vicino
  - non scrive e non legge il testo degli scambi
  - controlla ogni payload che legge: se non ha la forma di un episodio, è un errore del mondo e torna come messaggio
- **Controllo del payload** (funzione pura, `tools/tl/src/episode_read.ts`): un payload è un episodio se ha, tutti insieme, `session` in forma di id; `exchanges` con almeno un id; `from` e `to` come tempi ISO-8601 UTC con `from <= to`; `summary` non vuoto; `extractor` intero positivo; `model` non vuoto; `created` come tempo ISO-8601 UTC; e l'id del punto uguale all'id derivato da `session` e primo scambio. Altrimenti il risultato è un messaggio che nomina il campo sbagliato
- **Periodo**: un episodio entra se si sovrappone al periodo, cioè `to` non è prima di `since` e `from` non è dopo `until`. `since` e `until` sono giorni (`2026-09-30`), `until` incluso. La funzione che lo decide è pura e sta nello stesso modulo del controllo del payload
- **tl search `<domanda>`**
  - di default stampa i blocchi `-- <id8> <data>` e il riassunto, già costruiti da `episodeBlock`
  - con `--json` stampa gli episodi con `score`, senza vettore
  - opzioni: `--limit` (10), `--min-score` (0,35), `--since`, `--until`
  - senza risultati non stampa nulla
- **tl episode `<id>`**: stampa l'episodio intero in JSON, senza vettore. L'id è intero o un prefisso unico. Da lì `tl show <scambio>` apre il testo
- **Risoluzione dell'id**: una funzione sola, come in `tb` e `ti`. Nessuno: errore. Più d'uno: "Ambiguous" con fino a 5 candidati. Vuoto: rifiutato

## Flussi

- Agente → `tl search` → blocchi → `tl episode <id8>` → gli id degli scambi → `tl show <scambio>`
- `tl search` e `tl episode` → store degli episodi → Qdrant

## Invarianti

- `tl episode(id)` è uguale al campo episodio di quel risultato in `tl search --json`, meno il punteggio
- I risultati escono in ordine di punteggio decrescente e nessuno sta sotto la soglia
- Un risultato fuori dal periodo non esce mai
- Il testo non ha ora, `to`, scambi né estrattore: solo id corto, giorno e riassunto
- La ricerca e `episode` non scrivono nulla
- `tb`, `ti` e la scrittura degli episodi non cambiano

## Fuori da questo lavoro

- La riga in `alfred.md` e la regola `ti`; la ricostruzione; la prova su una sessione vera, che facciamo con tutto insieme
