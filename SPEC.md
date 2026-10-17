# Spec: verdetti coerenti e doppioni nella stessa sessione

Due correzioni al distillatore, nate dal lotto del 17 ottobre.

## A. Un verdetto non esce dal suo tipo

- Un verdetto che collega un candidato a un elemento noto (`extends`, `contradicts`, `duplicate`, `ref_only`, `append`) vale solo se l'elemento è dello stesso tipo del candidato: una nota con una nota, una regola con una regola
- Se il giudice indica un elemento di un altro tipo, il verdetto diventa `new`, senza collegamento e senza i campi `adds`, `reason` e `do`
- La sessione non resta aperta per questo motivo
- Il caso visto: una nota che "contraddice" una regola. Il collegamento falliva, perché la regola sta in `ti` e non in `tb`

## B. Il filtro dei doppioni nella stessa sessione

- Opzione `--same-session-cutoff <x>` di `td distill`: un numero maggiore di 0 e al massimo 1. Il predefinito della CLI è 0,8. La libreria senza il valore non filtra
- Prima del giudice di novità, ogni candidato si confronta con gli elementi che la sessione ha già deciso di salvare, dello stesso tipo. La somiglianza è il coseno dei testi con il modello di `tb` e `ti`
- Se la somiglianza con un elemento è almeno `x`, il candidato prende il verdetto `duplicate` di quell'elemento. Il giudice non lo vede
- Se tutti i candidati di uno scambio sono doppioni, il giudice non viene chiamato
- Ogni candidato si confronta con l'elemento più vicino. A parità vince il primo
- Un doppione non entra nella lista della sessione e non consuma il tetto per sessione
- Vale anche in shadow
- Gli elementi della sessione sono quelli decisi in questa esecuzione; non si confronta con tutto `tb`, che resta compito del giudice

## Funzioni pure

- `cosine`: il coseno tra due vettori della stessa lunghezza, un numero tra -1 e 1
- `twinOf`: dato un vettore, gli elementi della sessione con il loro vettore e la soglia, restituisce l'elemento più vicino che la raggiunge, oppure niente
- `cutoffOf`: legge il testo della soglia; vale solo un numero scritto con cifre e una parte decimale facoltativa, maggiore di 0 e al massimo 1 (`0.8`, `1`; non `0`, `1.1`, `0,8`, `-0.5`, `1e-1`, vuoto)

## Invarianti

- Nessun verdetto di un candidato porta l'id di un elemento di un altro tipo
- Un doppione dichiarato dal filtro ha somiglianza almeno pari alla soglia con l'elemento a cui rimanda
- Senza soglia il comportamento è quello di prima
- Il tetto per sessione conta solo gli elementi che entrano nella lista

## Fuori da questo lavoro

- Confrontare i candidati tra loro nello stesso scambio; una soglia contro tutto `tb`; i grappoli di idee distinte sullo stesso tema (somiglianza 0,57–0,67)
