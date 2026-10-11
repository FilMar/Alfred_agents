# Review template

`REVIEW.md` is written in step 3, next to the work, in Italian. Same
rule as the spec: it is the document the user judges the work by.

Every section is mandatory, and "Nessuno" is a valid entry. The
contract report goes in verbatim. One line per review round in `Esito`:
the last line is the verdict in force.

---

# Review: <feature>

## Esito

- Stato: <in attesa | approvato | da correggere>
- <un commento per ogni giro, l'ultimo vince>

## Copertura della spec

- <elemento della spec> → <dove è finito nel codice>

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| <firma e contratto> | <spec o regola> | <P1–P7> |

## Metriche

<output verbatim di contract_report.py>

## Test

- <N> passati, <M> falliti
- <dettaglio dei falliti, se ce ne sono>

## Scostamenti

- <cosa è stato fatto diversamente dal piano, e perché>