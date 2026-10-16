# Spec: gli episodi da td a tl

Obiettivo: ogni sessione che `td distill --active` legge lascia i suoi episodi in una collection Qdrant di proprietà di `tl`: riassunto, date, id degli scambi.

## Entità

- **Episodio** (`tools/tl/src/episodes.ts`)
  - stato: sessione, id degli scambi in ordine, `from` e `to` (tempo del primo e dell'ultimo scambio), riassunto, id dell'estrattore, modello, `created`
  - fa: niente, è un valore
  - non fa: non porta il testo degli scambi
  - serve a: `tl` per scriverlo, `tl search` per trovarlo (blocco dopo)
  - comanda: `tl`
- **Scrittura degli episodi** (funzione di `tl`)
  - riceve la sessione e i suoi episodi, già col riassunto
  - sostituisce tutti gli episodi di quella sessione con quelli ricevuti
  - calcola il vettore dal riassunto, con il modello di `tb` e `ti`
  - non decide cosa è un episodio e non riassume: lo fa `td`
- **Blocco episodio**: l'intestazione `-- <id8> <data>`, poi il riassunto. La data è il giorno di `from`, le prime 10 cifre del tempo UTC, senza ora (`2026-09-30`). La funzione è pura e si costruisce ora; `tl search` la userà nel blocco dopo
- **Id dell'episodio**: lo SHA-256 del testo `sessione:primo scambio`, scritto nella forma 8-4-4-4-12 come l'id di una nota di `tb`. Riscrivere una sessione non crea doppioni
- **Passo 0 di td** (`distillSession`)
  - dopo una divisione riuscita, in modalità attiva, passa a `tl` gli episodi della sessione
  - in modalità shadow non scrive [da chiarire: confermi?]
  - un errore di scrittura è un errore di sessione: la sessione non viene chiusa e gli scambi restano in coda

## Flussi

- `td`: sessione → episodi con riassunto → `tl` scrive
- `tl`: episodio → vettore del riassunto → collection `tl_episodes` con le date

## Invarianti

- Un episodio ha almeno uno scambio, un riassunto non vuoto e `from <= to`
- `from` è il tempo del primo scambio dell'episodio e `to` quello dell'ultimo
- Dopo la scrittura la collection ha per quella sessione esattamente gli episodi ricevuti
- Riscrivere la stessa sessione due volte dà lo stesso risultato
- La collection non contiene il testo degli scambi
- L'intestazione del blocco ha l'id corto e il giorno, e nient'altro: né ora, né `to`, né scambi
- Se la scrittura fallisce la sessione non viene chiusa
- `tb` e `ti` non cambiano

## Fuori da questo lavoro

- Il comando `tl search`, `tl show`; la riga in `alfred.md` e la regola `ti`; la modalità di ricostruzione
