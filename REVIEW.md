# Review: tb guide e ti guide

## Esito

- Stato: approvato
- giro 1: approvato senza commenti

## Copertura della spec

- Guida nota → `tools/tb/guide.md` (ex `note_quality.md`, senza la sezione 7 "The bridge")
- Guida regola → `tools/ti/guide.md` (ex `rule_quality.md`, senza la sezione 8 "Rules from tl", senza la riga su member e orchestratore, con la riga "No rule from silence" nella sezione 5)
- readGuide → `tools/common/cli.ts`
- comando `guide` → `tools/tb/src/cli.ts`, `tools/ti/src/cli.ts`, prima di `serve`, senza `requireServices`
- url `file:` → precondizione di readGuide
- testo non vuoto, senza spazi finali → due postcondizioni di readGuide
- Qdrant e Ollama irraggiungibili → test con `QDRANT_URL` e `OLLAMA_URL` su `127.0.0.1:9`
- symlink → test con un symlink temporaneo lanciato da una cartella fuori dal repo; provato anche a mano con `~/.local/bin/tb` e `ti` da `/tmp`

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| Nessuno | | |

## Metriche

```
6 functions  median=1.5  mean=1.7  max=3  over40=0  flagged=0
```

## Test

- `tests/cli_guide.test.ts`: 6 passati, 0 falliti
- suite intera: 1159 passati, 0 falliti; typecheck verde

## Scostamenti

- Tolti tre commenti dal file di test scritto dalla run: le regole vietano i commenti.
- I test dei comandi hanno `expect` propri (exit code, testo): il CLI gira in un altro processo, il contratto non lo raggiunge. Come in `tests/cli_text_output.test.ts`.
- `tb guide` e `ti guide` non sono letti da `td`: fuori da questa spec.
