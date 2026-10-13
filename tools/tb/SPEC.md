# Spec: togliere `status` dalla nota

## Entità

- **Note** (`types.ts`)
  - stato: i campi di una nota. Perde `status`.
  - fa: `NoteStatus` e `NOTE_STATUSES` spariscono.
  - non fa: non diventa un campo derivato dal trust, non viene sostituito da un marcatore di provenienza.
  - serve a: nessuno lo legge. La ricerca, il grafo, l'hook e `refine` non lo guardano. Nessun comando lo cambia: `tb update` non ha `--status`.

- **createNote** (`notes.ts`)
  - fa: costruisce la nota senza `status` e la salva.
  - non fa: non accetta più `status` tra i parametri e non lo scrive mai. Oggi mette `promossa` se manca.
  - contratto: nessuno nuovo. La forma della nota la difende il tipo: un letterale `Note` con un campo in più non compila (P3). Un assert sarebbe una tautologia. La forma esatta dello store si prova con un test positivo sul payload.

- **`tb save`** (`cli.ts`)
  - fa: perde `--status`. Commander rifiuta l'opzione sconosciuta.

- **POST `/save`** (`api.ts`)
  - fa: perde `status` nello schema e nel corpo. Un corpo che lo manda ancora viene ignorato, come ogni campo sconosciuto di questa API.

- **Salvataggio di `td`** (`save.ts`, `saveNote`)
  - fa: non passa più `status` a `createNote`.

- **Skill che chiamano `tb save`**
  - `skills/platone/references/note_quality.md` e `skills/mose/references/rule_quality.md` hanno `--status provvisoria` nei comandi di esempio. Vanno aggiornate nello stesso commit, altrimenti i comandi falliscono.

- **Note già salvate** (798: 747 `promossa`, 51 `provvisoria`)
  - restano come sono. Il campo resta nel payload, nessuno lo legge. Nessuna migrazione.

## Flussi

- `td` Save → `createNote({ what, why, kind, tags, exchange })` → nota senza `status` nello store
- `tb save --what ... --why ...` → `createNote(...)` → nota senza `status` nello store

## Invarianti

- Il payload di una nota appena salvata ha esattamente questi campi: `id`, `when`, `why`, `what`, `tags`, `kind`, `refs`, `embed_model`, `about`, `updated_at`, più `source` e `exchange` solo se dati. Nessun altro. Vale per ogni percorso di salvataggio (`td`, `tb save`, API), perché passano tutti da `createNote`.
- Gli altri campi arrivano dopo, ciascuno da una scrittura precisa, e prima non esistono (Qdrant scarta i campi nulli): il primo hit diretto aggiunge `hits` e `last_hit`; il primo hit via ref aggiunge `hits_related` e `last_hit_related`; il primo collegamento a una nota aggiunge `backrefs` su di lei. I campi possibili di una nota sono quelli del tipo `Note` e nessun altro.
- `tb save --status x` viene rifiutato.
- Le note già salvate non vengono toccate dalla modifica.
- Nel codice (`tools`, `skills`, `extensions`) non resta nessun riferimento a `provvisoria`, `promossa`, `NoteStatus` o `NOTE_STATUSES`.

## Decisioni

1. Un corpo API con `status` viene ignorato, non rifiutato. L'API ignora già ogni campo che non conosce. Rifiutarlo romperebbe un client vecchio per un campo che nessuno legge.
2. Nessun marcatore di provenienza ("fatta da `td`") al posto di `status`. Nessuna domanda lo legge oggi. `exchange` dice già da dove viene una nota distillata. Si aggiunge quando serve a qualcuno.
3. Ritchie senza i run `th`: la modifica non ha corpi nuovi da scrivere, quindi non c'è un file con righe `todo`. I test sono aggiornati e aggiunti a mano.
4. Il test è positivo ed esatto: il payload di `createNote` ha questi campi e basta. Non c'è un test su `status`, perché non esiste più. Oggi nessun test controlla la forma completa del payload (i test con gli stub usano `toMatchObject`, che ignora i campi in più), quindi questo è un test nuovo che protegge anche da altre derive.
5. Il controllo del test è un mutante: rimettere `status` in `createNote` deve far fallire il test del payload.

## Fuori da questo passaggio

- Togliere il campo dalle 798 note già salvate.
- La pagina wiki sul perché (la scrive Omero dopo l'approvazione) e la riga di roadmap.

## File

- Codice: `tools/tb/src/types.ts`, `notes.ts`, `api.ts`, `cli.ts`; `tools/td/src/save.ts`.
- Test da aggiornare: `tests/td_active_end_to_end.test.ts` (riga 112, toglie `status` dal `toMatchObject`), `tests/td_save.test.ts` (riga 25) e `tests/td_neighbours.test.ts` (riga 66), che passano `status` a `createNote` o lo mettono in un letterale.
- Test da aggiungere, in un file nuovo `tests/tb_note_payload.test.ts`, sugli stub:
  - `createNote` salva il payload esatto, con e senza `source` e `exchange`.
  - Dopo una ricerca che dà un hit diretto a una nota e un hit via ref a un'altra, le chiavi sono esattamente quelle della nota appena salvata più i campi che quella scrittura aggiunge (`hits` e `last_hit`; `hits_related`, `last_hit_related` e `backrefs`).
- Skill: `skills/platone/references/note_quality.md`, `skills/mose/references/rule_quality.md`.
