# Spec: td affidabile (obiettivo 2, parte codice)

## Entità

- **ModelCaller.ask**
  - stato: nessuno
  - fa: manda il prompt al modello; ogni chiamata aspetta al massimo `timeoutMs`, di default `CALL_TIMEOUT_MS` (5 minuti)
  - non fa: non lancia eccezioni per una chiamata scaduta; una chiamata scaduta è una risposta rifiutata, come un errore del modello
  - serve a: `td`, che oggi resta appeso se il modello non risponde
- **qualityBar** (nuovo, `tools/td/src/guides.ts`)
  - stato: nessuno, funzione pura
  - fa: unisce il testo di `tb guide` e di `ti guide` in una sezione "## Quality bar", con una riga che dice al modello di usare il livello e di saltare i comandi, perché non può eseguirli
  - serve a: i prompt di estrazione e di novità; `QUALITY_BAR` è la sezione letta una volta dai file `tools/tb/guide.md` e `tools/ti/guide.md`
- **extractionPrompt, noveltyPrompt**
  - fa: mettono `QUALITY_BAR` in testa al prompt; il resto non cambia

## Flussi

- guide.md di tb e ti → `readGuide` → `qualityBar` → `QUALITY_BAR`
- `QUALITY_BAR` + prompt di oggi → modello di estrazione / di novità

## Invarianti

- `timeoutMs` è un intero positivo
- una chiamata scaduta dà una risposta non ok, con un failure non vuoto
- `qualityBar`: le due guide non sono vuote; il risultato contiene la guida delle note e quella delle regole, in quest'ordine, e inizia con "## Quality bar"
- `extractionPrompt` e `noveltyPrompt` iniziano con `QUALITY_BAR`

## Parte config (nessun codice)

- nuova riga dell'estrattore, figlia della 2: un check del critico `is_generic_rule` per le regole; il prompt di novità dice che un `append` vale solo se il `do` è un ordine per la stessa situazione dell'`if` del vicino, scritto come ordine all'agente e mai come nota sulla regola
