# Spec: tb guide e ti guide

## Entità

- **Guida**
  - stato: un file markdown dentro il tool: `tools/tb/guide.md` (nota), `tools/ti/guide.md` (regola)
  - fa: dice cosa deve essere una nota o una regola buona, e i controlli prima di salvarla
  - non fa: non descrive come estrarre note o regole da una sessione o da `tl`
  - serve a: aristotele prima di `tb save`, l'agente prima di un `ti add` a mano
  - comanda: chi modifica il file nel repo

- **readGuide** (in `tools/common/cli.ts`)
  - stato: nessuno
  - fa: legge il file della guida accanto al tool e ne restituisce il testo, senza spazi o a capo finali
  - non fa: non usa la rete, non tocca Qdrant né Ollama

- **comando `guide`** (in `tb` e in `ti`)
  - fa: stampa la guida del proprio tool su stdout, esce con 0
  - non fa: non chiama `requireServices`

## Flussi

- `tb guide` → readGuide(`tools/tb/guide.md`) → testo su stdout
- `ti guide` → readGuide(`tools/ti/guide.md`) → testo su stdout

## Invarianti

- il testo della guida non è vuoto
- l'url della guida è un file locale (`file:`)
- il comando funziona anche con Qdrant e Ollama irraggiungibili
- il percorso si risolve dal file reale del tool, anche quando il tool è lanciato dal symlink in `~/.local/bin`

## Test

- file: `tests/cli_guide.test.ts`, con `bun:test`; importa `readGuide` da `../tools/common/cli.ts`
- readGuide: un url `file:` di un file temporaneo con testo e a capo finali; un url `https:` per la precondizione; un file temporaneo di soli spazi per la postcondizione "non vuoto"
- i comandi si lanciano come processi: `Bun.spawn(["bun", "tools/<tb|ti>/src/cli.ts", "guide"])`, con `QDRANT_URL=http://127.0.0.1:9` e `OLLAMA_URL=http://127.0.0.1:9` nell'env
- `tb guide` stampa un testo che comincia con `# Note quality`; `ti guide` uno che comincia con `# Rule quality`; entrambi escono con 0
- il symlink: un symlink temporaneo a `tools/tb/src/cli.ts` in una cartella temporanea, lanciato con `bun <symlink> guide`, stampa lo stesso testo
