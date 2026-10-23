# Spec: il distiller distilla solo la conversazione

## Entità

- **Turno delegato**
  - stato: uno scambio `kind: subtask`, classificato come noise dal lettore di sessione
  - fa: esce da turni, contesto earlier e timeline episodi; lo sweep active lo chiude a costo zero
  - non fa: non è mai input del modello
  - serve a: svuotare la coda pending delle run th senza mandarne il contenuto al modello
  - comanda: il kind, scritto da th all'archiviazione; il distiller lo legge e decide, nessun altro lo scrive

- **Sweep di una sessione senza conversazione**
  - stato: una sessione i cui scambi sono tutti noise (delegati compresi)
  - fa: l'else dell'if che già saltava le sessioni vuote chiude i noise rimasti, nessuna chiamata a modello, nessun episodio
  - non fa: estrae, giudica, salva, produce report
  - serve a: la coda pending si svuota davvero e il gate di `distill.sh` (soglia 50) resta onesto
  - comanda: il distiller in modalità active

## Flussi

- sweep → sessione tutta noise: chiusura diretta degli id → marcati `distilled` col tempo della run
- sweep → sessione mista: i turni chat estratti come oggi; la chiusura copre turni + noise, delegati compresi
- run th → tl: la riga subtask arriva, resta, e lo sweep successivo la consuma

## Invarianti

- Una sessione senza turni chat non genera nessuna chiamata a modello
- Lo sweep active chiude ogni scambio letto: la sessione non resta in pending
- Il contenuto di un delegato non è mai input del modello: né target, né contesto earlier, né timeline degli episodi
- shadow non chiude nulla

## Conseguenze esterne

- `skills/ritchie/scripts/th_write.sh`: via `--no-archive`, le run dei test e dei body tornano in tl
- `skills/ritchie/references/tests-and-body.md`: una clausola — la run si archivia in tl come riga subtask
- Le 4 run di dibattito già marcate a mano col tempo 1970 restano come sono: la regola nuova automatizza la classe, non ritocca il passato