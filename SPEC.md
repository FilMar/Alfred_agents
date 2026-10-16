# Spec: output testuale di tb e ti

Obiettivo: chi cerca con `tb search` o `ti search` (l'agente, l'hook) riceve un blocco di testo corto. Il resto sta dietro `--json` e `meta`.

## Entità

- **Render** (`tools/common/render.ts`)
  - stato: nessuno, solo funzioni pure
  - fa: dà il blocco di testo di una nota o di una regola, unisce i blocchi, toglie il vettore a una regola
  - non fa: non legge Qdrant, non scrive su stdout, non conosce la CLI
  - serve a: `tb search`, `ti search`; l'hook non formatta più
  - comanda: è l'unico posto che conosce il formato
- **Blocco nota**: `-- <id8>`, poi `what`, poi `why`, ognuno su una riga
- **Blocco regola**: `-- <id8>`, poi le righe di `do`, una per riga
- **Id corto**: i primi 8 caratteri dell'id
- **tb search / ti search**
  - di default stampano i blocchi uno dopo l'altro, senza separatore finale
  - con `--json` stampano l'output completo di oggi, la regola senza vettore
  - senza risultati non stampano nulla
- **tb meta `<id>`** e **ti meta `<id>`**
  - stampano la nota o la regola completa in JSON, senza vettore
  - l'id è intero o un prefisso unico
- **Id di ti**: `delete`, `append-do` e `meta` accettano un prefisso unico, come `tb`

## Flussi

- Hook → `tb search` e `ti search` (testo) → contesto della sessione, senza formattazione propria
- Agente → `tb search` → blocchi → `tb meta <id8>` se serve il resto
- Curatori (aristotele, platone, td) → `--json` o libreria → campi completi

## Invarianti

- L'id mostrato ha 8 caratteri e risolve a una sola nota o regola, o fallisce con l'elenco dei candidati
- Un blocco ha sempre l'id e almeno una riga di contenuto
- Il testo non contiene `tags`, `kind`, `score`, `via`, `refs`, `source`, `if`
- Le note collegate seguono le dirette, nello stesso ordine di oggi
- `meta(id)` è uguale al campo `note` (o alla regola) di quel risultato in `search --json`
- L'id si risolve con una sola funzione per tool, usata da `meta`, `update`, `delete` e `append-do`
- `browse`, `random`, `tags`, `list`, `refine` e le API HTTP restano come sono

## Fuori da questo lavoro

- `meta` per `browse` e `random`; il wiki di `tb` e `ti` (lo fa omero)
