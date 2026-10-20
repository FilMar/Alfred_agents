# Review: tb merge

## Esito

- Stato: approvato
- giro 1: approvato senza commenti

## Copertura della spec

- piano puro dell'unione → `tools/tb/src/merge.ts`: `mergedLinks` (ref e backref), `mergedCounters` (hit, date, archivio), `mergedInto` (la nota finale), `relinkOf` (una nota collegata), `mergePlan` (tutto, più il limite dei ref)
- scritture → `mergeNotes` in `tools/tb/src/notes.ts`: note collegate, poi `into`, poi cancella le `drop`
- comando → `tb merge <into> <drops...>` in `tools/tb/src/cli.ts`; accetta prefissi di id; rifiuta una nota unita in se stessa o data due volte
- limite dei ref superato → errore del mondo `refs limit: ...`, nessuna scrittura (test sullo stub)
- trigger multipli in `ti` → tolti dalla spec: una regola fantasma è un `ti add` con lo stesso `do`

## Contratti derive?

Nessuno.

## Metriche

```
25 functions  median=2  mean=5.5  max=19  over40=0  flagged=0
```

## Test

- 1217 passati, 0 falliti (40 nuovi: 36 in `tests/tb_merge.test.ts` scritti dalla run th, 4 in `tests/tb_merge_store.test.ts` sullo stub)
- 11 mutanti, tutti uccisi: dedup dei ref, data più recente, archivio "tutte", unione dei tag, ref proprio verso `into` che vince, backref spostato, bordo del limite, dedup delle note collegate, `updated_at`, somma degli hit, `origin` del ref spostato

## Scostamenti

- `check_body_diff.py` ha rifiutato il corpo per un `return` dentro una lambda di `mergedCounters`. È il falso positivo già in roadmap (obiettivo 3). Ho riscritto la lambda come espressione senza `return`, e il controllo è passato.
- Lo stub di Qdrant (`tests/helpers/td_stubs.ts`) ora capisce i filtri `should` e le chiavi `refs[].id`. Senza, `scrollLinkedTo` restituiva tutte le note.
- `tb merge` non chiede `--yes` come `tb delete`: lo usa Aristotele, che agisce senza approvazione.
- Le scritture non sono atomiche: se il processo cade a metà, restano link verso le `drop`.
