# Spec: distillatore automatico all'avvio della sessione

## Entità

- **Sessione letta** (`SessionRead`, in `td`)
  - stato: gli scambi in coda della sessione, e gli scambi già distillati della stessa sessione
  - fa: dà alla fase 0b tutti gli scambi della sessione, in ordine di tempo; dà alle fasi dopo solo quelli in coda
  - non fa: non rilegge per l'estrazione gli scambi già distillati
  - comanda: `td`
- **Mappa degli episodi** (`SessionMap`)
  - stato: gli episodi della sessione intera, dal primo all'ultimo scambio
  - fa: copre ogni scambio della sessione, anche quelli già distillati
  - non fa: non estrae note né regole da soli
  - serve a: scrivere in `tl_episodes` l'insieme completo degli episodi della sessione
- **Hook di avvio** (`extensions/tb_refine/claude.sh`, lo stesso già agganciato a `SessionStart`)
  - stato: nessuno
  - fa: oltre a `tb refine`, se la coda ha almeno 50 scambi e nessun distillatore gira, lancia `td distill --active --max-saved 100` staccato
  - non fa: non aspetta, non sceglie sessioni, non fallisce mai l'avvio
  - comanda: `td distill` decide cosa distillare
- **Lock**
  - stato: un file con `flock`, tenuto dal distillatore che gira
  - regola: il kernel lo libera se il processo muore; nessun pid da controllare
- **Registro**
  - stato: una riga per esecuzione (ora, scambi in coda, esito)
  - comanda: solo l'hook ci scrive

## Flussi

- Hook → `tl pending --limit 50`: richiesta → 50 righe se la coda è a 50 o più
- Hook → lock: libero → lancio; occupato → esco, riga nel registro
- `td distill` → fase 0b: tutti gli scambi della sessione → episodi dal primo all'ultimo scambio
- `td distill` → fasi 1–2: solo gli scambi in coda → note e regole
- `td distill` → `tl_episodes`: tutti gli episodi della sessione → sostituiscono quelli di prima
- `td distill` → `tl distilled`: solo gli scambi letti dall'estrazione

## Invarianti

- Gli episodi scritti per una sessione coprono ogni scambio della sessione, in ordine, senza vuoti né sovrapposizioni.
- Un giro non cancella mai un episodio senza scriverne uno che copra gli stessi scambi.
- L'estrazione non rilegge uno scambio già distillato.
- Un giro salva al massimo `--max-saved` elementi.
- Parte un solo distillatore alla volta.
- Sotto 50 scambi in coda l'hook non lancia nulla.
- Una sessione fallita nella divisione resta in coda intera; gli episodi di prima restano dove sono.
- Un errore del mondo (rete, rasp, Qdrant) è un valore nel registro: l'hook esce con codice 0.

## Fuori da questo lavoro

- Hook per pi (`pi.ts`): dopo.
- Spostare il distillatore sul rasp: richiede Ollama per l'embedding sul rasp.
- Timeout sulle chiamate di `td`: punto aperto a parte.
- Filtro delle sessioni ferme: scartato. L'ultimo episodio di una sessione aperta è un riassunto a metà e si riscrive al giro dopo.
- `td` non è nel PATH: l'hook chiama `bun tools/td/src/cli.ts` col percorso assoluto, oppure si mette un link in `~/.local/bin`. Da decidere in revisione.
