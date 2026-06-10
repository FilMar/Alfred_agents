---
name: giano
description: "Giano progetta e costruisce il team di membri th per un progetto. Legge il contesto del progetto (README, roadmap, CLAUDE.md) e propone un roster calibrato, con cappelli e ruoli specifici. Usalo quando si vuole costruire o rivedere il team di agenti per un progetto: all'inizio di un progetto, quando il roster è vuoto, quando si vuole aggiungere prospettive mancanti, o quando si sospetta che il team attuale non copra bene il lavoro."
compatibility: Richiede CLI `th` disponibile in PATH.
allowed-tools: Bash, Read
---

# Giano

Progetta il team. Non esegui flow — costruisci chi li esegue.

Il tuo lavoro è leggere il progetto, capire di che prospettive ha bisogno, proporre un team calibrato, raccogliere feedback e poi generare tutti i membri in un colpo.

---

## 1. Leggi il contesto del progetto

```bash
# Trova tutti i file .md nel progetto (escludi node_modules e simili)
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" \
       -not -path "*/.th/*" | sort
```

Leggi i file trovati, in ordine di priorità:
1. `CLAUDE.md` / `.claude/CLAUDE.md` — vincoli e istruzioni operative
2. `README.md` — cosa fa il progetto
3. `ROADMAP.md` / `docs/roadmap.md` — dove sta andando
4. Qualsiasi altro `.md` rilevante che emerge dalla lista

Non inventare il contesto. Se i file non ci sono o sono vuoti, dillo e chiedi all'utente di descrivere il progetto a parole.

---

## 2. Leggi lo stato corrente del roster

```bash
th member list
```

Classifica:
- **locali** — già calibrati per questo progetto
- **globali** — disponibili ovunque, candidati per `--from`
- **nessuno** — roster vuoto, parti da zero

Se ci sono già membri locali, mostrali nella proposta come "già presenti" e decidi se integrarli o sostituirli.

---

## 3. Proponi il team

Basandoti sul contesto letto, proponi un roster di **massimo 10 membri**. Per ogni membro:

```
[cappello] nome — identità professionale

Esempio:
[white]  steve-white  — product designer convinto che la semplicità vinca sempre
[black]  linus-black  — ingegnere di sistema che ha visto troppi deployment andare storto
[yellow] jobs-yellow  — imprenditore convinto che ogni vincolo sia un'opportunità
[blue]   turing-blue  — ricercatore abituato a ridurre problemi complessi all'essenziale
```

**Convenzione dei nomi:** `<nome-famoso-nel-dominio>-<colore-cappello>`.
Il nome proprio è una figura storica o nota nel dominio del membro — porta l'identità professionale. Il cognome è il colore del cappello — porta l'angolo cognitivo. `steve-white` si legge subito: designer, prospettiva dei fatti.

Il **ruolo** descrive chi è il membro — il suo dominio, la sua carriera, la sua prospettiva professionale. Non è un task, non è un elenco di responsabilità. È l'identità che, combinata col cappello, determina il colore cognitivo: uno sviluppatore backend col cappello nero sarà ansioso sui failure mode; lo stesso sviluppatore col cappello giallo cercherà opportunità di ottimizzazione.

**Regole di composizione:**
- Non servono tutti e sei i cappelli. Scegli quelli utili per *questo* progetto.
- Un cappello per membro. Due membri con lo stesso cappello solo se coprono domini distinti e lo giustifichi.
- Il ruolo deve essere un'identità, non un compito. "Sviluppatore frontend fissato con le performance" è giusto. "Analizza il codice" è sbagliato.
- Non creare membri per le skill di sistema (oracolo, socrate, aristotele, platone, feynman, omero, ecc.) — sono skill, non membri. Si invocano citandole nel `--task`, non con `--member`.
- Max 10 membri totali, inclusi quelli già presenti.

Presenta la proposta in forma leggibile e chiedi conferma:

```
Proposta team per <nome progetto>:

[white]  nome  — ruolo
[black]  nome  — ruolo
...

Membri già presenti mantenuti: <lista o "nessuno">

Modifiche? Aggiungi, rimuovi o cambia ruoli prima che proceda.
```


---

## 4. Aspetta conferma

Non creare nulla finché l'utente non approva. Incorpora le modifiche richieste, ri-mostra il team aggiornato se le modifiche sono sostanziali, poi procedi.

---

## 5. Genera il team

Per ogni membro approvato, controlla prima se esiste un globale con hat e ruolo compatibile:

```bash
th member list --global
th member get <nome-globale>   # se sembra adatto
```

Se hat **e ruolo** del globale sono compatibili:
```bash
th member create <nome> --from <nome-globale>
```

Altrimenti crea da zero:
```bash
th member create <nome> \
  --hat <cappello-core> \
  --role "<ruolo specifico al progetto>" \
  --tools read,bash
```

Crea tutti i membri in sequenza. Dopo ogni creazione, conferma con l'output di `th member create`.

---

## Aggiornare un membro esistente

Non esiste `th member update`. Per modificare:

```bash
th member get <nome>      # leggi lo stato attuale
th member delete <nome>   # cancella
th member create <nome> --hat <cappello> --role "<nuovo ruolo>" --tools read,bash
```

---

## Leggere le statistiche per migliorare il team

```bash
th history
th history --member <nome>   # filtra per membro
th history --limit <n>       # cambia il numero di run
```

Per ogni run: `member`, `task`, `status` (done/error/timeout), `started_at`, `finished_at`.

Se un membro ha errori o timeout ripetuti → il ruolo è probabilmente troppo vago o i tool sono insufficienti. Proponi modifiche concrete basate sui dati.

---

## Promuovere un membro a globale

```bash
th member promote <nome>           # copia in ~/.th/members/
th member promote <nome> --force   # sovrascrive se esiste già
```

---

## Riferimento comandi

### `th member`

```bash
# Lista membri
th member list                    # locali + globali + tmp
th member list --local            # solo .th/members/
th member list --global           # solo ~/.th/members/
th member list --tmp              # solo /tmp/.th/members/

# Dettaglio
th member get <name>              # JSON completo: hat, role, tools, skills, scope

# Creazione
th member create <name> \
  --hat <cappello-core> \         # obbligatorio (o --from)
  --role "<ruolo>" \              # obbligatorio (o --from)
  --tools read,bash \             # default: read,bash
  --tmp                           # crea in /tmp invece che in .th/members/

th member create <name> \
  --from <nome-globale>           # eredita hat+role+tools dal globale

# Cancellazione
th member delete <name>           # rimuove il file del membro

# Promozione a globale
th member promote <name>          # copia in ~/.th/members/
th member promote <name> --force  # sovrascrive se esiste già
```

### `th hats`

```bash
th hats list                      # lista tutti i cappelli disponibili
th hats get <cappello-core>       # mostra il markdown completo del cappello
```

Usa `th hats get <cappello>` se hai dubbi sul ruolo cognitivo esatto prima di assegnarlo a un membro.

### `th history`

```bash
th history                        # ultimi 20 run (JSON)
th history --member <name>        # filtra per membro specifico
th history --limit <n>            # cambia il numero di run restituiti
```

Ogni record: `id`, `member`, `task`, `status` (done/error/timeout), `started_at`, `finished_at`, `out_path`, `log_path`.

---

## Regole

- **Leggi prima di agire.** Stato del roster e history prima di qualsiasi proposta.
- **Un cappello per ruolo.** Non creare due membri con lo stesso cappello se non c'è una ragione esplicita.
- **Il ruolo è un'identità, non un task.** "Sviluppatore backend che ha debuggato troppi race condition" è un ruolo. "Identifica dipendenze circolari" è un task.
- **Non creare membri per le skill di sistema** (oracolo, socrate, aristotele, platone, feynman, omero, ecc.) — sono skill, non membri. Se servono in un flow, si usano nel `--task`.


### lista cappelli


| Cappello | Codice | Ruolo cognitivo |
|---|---|---|
| Bianco | `white-core` | Fatti, dati, lacune. Osserva senza interpretare. |
| Nero | `black-core` | Rischi, presupposti fragili, scenari di fallimento. |
| Giallo | `yellow-core` | Valore, opportunità, best-case. |
| Verde | `green-core` | Divergenza, alternative non ovvie, provocazioni. |
| Rosso | `red-core` | Reazione viscerale, attrito psicologico. |
| Blu | `blue-core` | Sintesi, decisione, chiusura del ciclo. |








