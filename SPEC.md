# Spec: il tetto per sessione di td distill

Obiettivo: una sessione non salva più di `n` elementi (note e regole). È un massimo, non un obiettivo: una sessione con meno idee ne salva meno. Taglia le sessioni troppo generose e risparmia chiamate al modello.

## Entità

- **Tetto per sessione** (opzione `--max-per-session <n>` di `td distill`)
  - `n` è un intero positivo scritto con sole cifre (`4`; non `0`, `-1`, `2.5`, `4abc`)
  - il predefinito della CLI è 10; chi usa la libreria senza passarlo non ha tetto
  - conta gli elementi che la sessione ha deciso di salvare: note nuove, note che estendono, note che contraddicono, regole nuove
  - vale in modalità attiva e in shadow, perché lo shadow deve simulare l'attiva
  - lavora insieme a `--max-saved`, il tetto dell'esecuzione intera: i due sono indipendenti
- **Sessione piena**: quando gli elementi decisi della sessione hanno raggiunto `n`
  - gli scambi che restano non vanno al modello: né estrazione, né critico, né novità. Per ognuno c'è un resoconto vuoto e riuscito, senza righe in `tl extractions`
  - in uno scambio già giudicato, i candidati oltre il tetto restano con il loro verdetto, senza id salvato e fuori dalla lista della sessione. Non sono un guasto
  - la sessione si chiude comunque: gli scambi vengono segnati distillati
- **Episodi**: la divisione in episodi avviene prima e non cambia. Una sessione piena scrive tutti i suoi episodi
- **Ordine**: contano gli elementi nell'ordine degli scambi. Il tetto tiene i primi `n`, non i migliori

## Flussi

- `td` → per ogni scambio: se la sessione è piena, resoconto vuoto; altrimenti estrae, giudica, decide, salva
- `td` → a fine sessione: chiude gli scambi anche se è piena

## Invarianti

- Nessuna sessione decide più di `n` elementi
- Una sessione piena non fa chiamate al modello per gli scambi che restano
- Una sessione piena si chiude, a meno di un altro errore
- Con un tetto nullo una sessione non è mai piena
- `--max-saved` e le sessioni sotto il tetto si comportano come prima
- Il tetto non aggiunge motivi di scarto a `tl`: il formato di `tl extractions` non cambia

## Fuori da questo lavoro

- Scegliere i migliori `n` invece dei primi `n`; il pre-filtro per somiglianza dei candidati
