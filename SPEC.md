# Spec: tb merge

Principi: P1 (lo stato ha un solo proprietario), P2 (il contratto è il confine), P5 (errore del mondo = valore di ritorno, errore del programmatore = panic).

## Entità

- **MergePlan** (tb, puro, `tools/tb/src/merge.ts`)
  - stato: la nota `into` dopo l'unione; per ogni nota collegata a una nota `drop`, i suoi `refs` e `backrefs` nuovi
  - fa: calcola l'unione da `into`, le note `drop` (una o più) e le note collegate a loro
  - non fa: I/O; non scrive testo: `into` di solito è una nota nuova che Aristotele ha appena salvato con il testo ripensato; non cambia testo, `why`, kind, `when`, `id`, `source`, `exchange`, `about`, vettore di `into`
  - serve a: `mergeNotes` in `notes.ts`, che scrive il piano
  - comanda: `tb merge <into> <drop...>`, chiamato da Aristotele

## Flussi

- Aristotele: `tb save` del testo nuovo → `tb merge <nuova> <vecchie...>`
- `tb merge <into> <drop...>` → `MergePlan` → scrive le note collegate, poi `into`, poi cancella i punti `drop` → `{ into, dropped, relinked }`

## Invarianti

- `into` non è tra le `drop`; almeno una `drop`; nessuna `drop` ripetuta
- nessuna nota punta a una `drop` dopo il piano; nessun ref o backref di `into` punta a `into` o a una `drop`
- nessun ref duplicato per id in nessuna nota; un ref spostato tiene `reason` e `origin`
- `tags` = unione; `hits` e `hits_related` = somma; `last_hit` e `last_hit_related` = il più recente
- `archived_at` resta solo se tutte sono archiviate; `updated_at` = adesso
- se i ref di `into` superano `REFS_LIMIT`, errore del mondo e nessuna scrittura

## Dettagli per i run (test e corpo)

- `mergedLinks`: refs = prima i ref di `into`, poi quelli di ogni `drop` nell'ordine dato; si scarta un ref verso `into` o verso una `drop`; tra due ref con lo stesso id vince il primo (tiene `reason` e `origin` del primo). backrefs = unione nello stesso ordine (`into`, poi le `drop`), senza `into`, senza le `drop`, senza duplicati.
- `mergedCounters`: `hits` e `hits_related` = somma, un campo assente vale 0, il risultato è sempre un numero; `last_hit` e `last_hit_related` = la data ISO più recente tra quelle presenti, assente se nessuna nota la ha; `archived_at` = quello della prima nota se tutte hanno `archived_at`, altrimenti assente. La prima nota è `into`.
- `mergedInto`: la nota `into` con `refs` e `backrefs` da `mergedLinks`, i campi di `mergedCounters` (un campo assente nel risultato è assente anche nella nota: nessuna chiave con valore `undefined`), `tags` = unione in ordine (`into`, poi le `drop`) senza duplicati, `updated_at` = `now.toISOString()`. Tutti gli altri campi di `into` restano.
- `relinkOf`: per una nota collegata a una `drop`. refs: un ref verso una `drop` diventa un ref verso `intoId` con la stessa `reason` e `origin`, nella stessa posizione; se la nota ha già un ref verso `intoId`, o ne ha già prodotto uno, il ref spostato si scarta. backrefs: un id di una `drop` diventa `intoId`, poi si tolgono i duplicati tenendo il primo. Gli altri ref e backref restano uguali e nello stesso ordine.
- `mergePlan`: `gone` = gli id delle `drop`. `relinked` = `relinkOf` per ogni nota di `linked` che non è `into` e non è una `drop`, nell'ordine di `linked`, senza ripetere un id. `dropped` = gli id delle `drop` nell'ordine dato. `into` del piano = `mergedInto(into, drops, now)`. Se `into.refs.length` del piano supera `refsLimit`: `{ ok: false, error: "refs limit: <n> refs, limit <refsLimit>; drop some refs or make a hub first" }`.
- Una `Note` di test: `{ id, when, why, what, tags: [], kind: "dato", refs: [] }` più i campi che servono al caso. Un `Link`: `{ id, reason }`, `origin` opzionale. Gli id sono stringhe qualsiasi.
- Test con `bun:test` (`import { describe, expect, test } from "bun:test"`), import da `../tools/tb/src/merge.ts`.
