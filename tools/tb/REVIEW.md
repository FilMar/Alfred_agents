# Review: togliere `status` dalla nota

## Esito

- Stato: in attesa
- Giro 1: implementato, test e controlli verdi. Aspetta il tuo giudizio.

## Copertura della spec

- `Note` perde `status`; spariscono `NoteStatus` e `NOTE_STATUSES` → `tools/tb/src/types.ts`
- `createNote` non accetta né scrive `status` → `tools/tb/src/notes.ts` (parametro, letterale, import)
- `tb save` perde `--status` → `tools/tb/src/cli.ts` (opzione, validazione, chiamata)
- POST `/save` perde `status` nello schema e nel corpo → `tools/tb/src/api.ts`. Un corpo che lo manda ancora viene ignorato, come ogni campo sconosciuto
- Il salvataggio di `td` non passa `status` → `tools/td/src/save.ts`
- Le due skill non hanno più `--status provvisoria` → `skills/platone/references/note_quality.md` (comando e riga sul campo), `skills/mose/references/rule_quality.md`
- Invariante "payload esatto di una nota appena salvata" → `tests/tb_note_payload.test.ts`, due test (con e senza `source` e `exchange`)
- Invariante "i contatori e i backrefs arrivano da scritture precise" → stesso file, un test dopo una ricerca
- Invariante "nessun riferimento rimasto nel codice" → `rg` su `tools`, `skills`, `extensions`: nessun risultato fuori da `SPEC.md`
- Test che passavano `status` → aggiornati: `td_active_end_to_end`, `td_save`, `td_neighbours`
- Note già salvate (798) → non toccate, nessuna migrazione

## Contratti derive?

Nessuno. Non ho aggiunto contratti. La forma della nota la difende il tipo: un letterale `Note` con un campo in più non compila (P3). Un assert sarebbe una tautologia. L'invariante vive nel test sul payload.

## Metriche

```
tools/tb/src/notes.ts: 16 functions  median=4  mean=6.0  max=19  over40=0  flagged=0
tools/td/src/save.ts: 14 functions  median=2.5  mean=6.6  max=21  over40=0  flagged=0
```

## Test

- 905 passati, 0 falliti (suite completa). Erano 902: i 3 in più sono quelli di `tb_note_payload.test.ts`
- Typecheck dei cinque tool: pulito
- Mutanti: 6 provati, 6 uccisi. Ho rimesso `status` in `createNote`; tolto `about`, `embed_model`, `exchange`, `last_hit` e la scrittura del backref. Ciascuno fa fallire almeno un test del payload

## Scostamenti

- Nessun run `th`: la modifica non ha corpi nuovi da scrivere, quindi non c'era un file con righe `todo`. I test li ho aggiunti e aggiornati a mano
- I test del payload hanno valori attesi propri (`toStrictEqual`). La regola dice niente assert nei test tranne le tabelle di esiti. Qui l'oracolo è la forma esatta della nota e il contratto non può portarla: scostamento voluto, come per `trustOf`
- Il test usa un testo diverso per ogni nota e `limit: 1`: serve a far dare alla prima nota un hit diretto e alla seconda uno via ref. Dipende dall'embedding finto degli stub
- Non verificato da un test: il corpo API con `status` ignorato (`api.ts` non ha test), e il rifiuto di `tb save --status`. Per il secondo ho controllato che l'opzione non compare più in `--help` e che il comando non permette opzioni sconosciute. Non ho provato una scrittura vera per non sporcare lo store
- Le 798 note nello store hanno ancora `status` nel payload. Nessuno lo legge. La pagina wiki `memory_absence_is_how_qdrant_stores_null` dice che `status: promossa` informa su una nota vecchia: resta vera per i dati esistenti
- Dopo l'approvazione: la pagina wiki sul perché (Omero), la riga di roadmap chiusa, e `SPEC.md` e `REVIEW.md` escono dall'albero
