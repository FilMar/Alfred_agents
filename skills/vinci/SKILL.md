---
name: vinci
description: >-
  Genera un Curriculum Vitae in Typst a partire da una conversazione libera o da
  un CV/testo esistente fornito dall'utente. Produce un file .typ pronto da
  compilare, scegliendo tra tre varianti di stile (classico, moderno,
  accademico). Usa SEMPRE questa skill quando l'utente vuole creare, scrivere,
  rifare o convertire un curriculum, un CV o un résumé in Typst — anche se non
  nomina esplicitamente "Typst", basta che chieda un CV e menzioni Typst nel
  contesto, o che chieda di trasformare le proprie esperienze in un curriculum
  tipografico. Attivala anche per "fammi il CV", "curriculum in typst",
  "rifammi il résumé", "converti questo profilo LinkedIn in CV".
compatibility: Requires this skill's justfile and `typst` available in PATH.
allowed-tools: Bash, Read, Write, Edit
---

# Vinci — Curriculum Vitae in Typst

Come Vasari, che scrisse le *Vite* fissando per sempre la reputazione degli artisti,
questo compito ritrae una persona in una pagina, in modo che resti.

Il compito qui è raccogliere i contenuti della persona e versarli in uno dei tre
template Typst autocontenuti in `assets/`, consegnando un file `.typ` che compila
subito, ovunque, senza dipendenze esterne.

## Flusso di lavoro

### 1. Raccogli i contenuti
Parti da ciò che l'utente ti dà: un CV esistente, un profilo LinkedIn incollato,
un testo libero, oppure niente. Estrai da lì il più possibile — non far ripetere
all'utente cose che ha già scritto.

Poi chiedi **solo le lacune essenziali**, in modo mirato e in un colpo solo. Il
nucleo minimo di un CV:
- nome e ruolo/titolo professionale
- contatti (email, telefono, città; opzionali: sito, GitHub, LinkedIn, ORCID)
- una riga di profilo/sintesi
- esperienze (ruolo, ente, periodo, 1-3 risultati concreti per voce)
- formazione (titolo, ente, periodo)
- competenze e lingue

Non trasformare la raccolta in un interrogatorio. Se mancano dettagli minori,
proponi una formulazione ragionevole e segnala all'utente cosa hai ipotizzato,
così può correggere. I risultati contano più delle mansioni: preferisci "ridotto
la latenza del 40%" a "responsabile della manutenzione".

### 2. Scegli la variante
Tre stili in `assets/`, tutti già compilabili con dati d'esempio:

| variante | quando | carattere |
|---|---|---|
| `moderno.typ` | tech, startup, prodotto, design | sans, accento blu, compatto, un colpo d'occhio |
| `classico.typ` | ruoli tradizionali, consulenza, settori conservativi | serif sobrio, intestazione centrata, niente colore |
| `accademico.typ` | ricerca, dottorato, posizioni universitarie | serif denso, sezioni Pubblicazioni/Didattica, numero di pagina |

Consiglia la variante adatta al contesto della persona, ma lascia scegliere
all'utente. Se non ha preferenze, usa il default sensato per il suo settore.

### 3. Compila il template
Apri il file della variante scelta. È diviso in due blocchi separati da commenti:

- `// ---------- DATI ----------` — **modifica solo questo.** Sostituisci i dati
  d'esempio con quelli reali della persona, mantenendo la stessa struttura
  (dizionari, array, nomi dei campi).
- `// ---------- LAYOUT ----------` — **non toccarlo** salvo richiesta esplicita
  (es. cambio font o colore d'accento). È ciò che garantisce che il file compili
  e resti coerente.

Copia il template nella working directory dell'utente con un nome sensato (es.
`cv_mario_rossi.typ`) e riscrivi il blocco DATI. Non lasciare mai dati d'esempio
residui.

### 4. Verifica che compili

Se `typst` è disponibile, **compila sempre** prima di consegnare:

```bash
just compile cv_mario_rossi.typ
```

Se dà errore, leggilo e correggi il `.typ` — un CV che non compila è inutile.
Se `typst` non è installato, rivedi la sintassi con cura seguendo le regole sotto
e dillo all'utente, suggerendogli come installarlo (`https://typst.app` o il
binario da GitHub `typst/typst`).

### 5. Consegna

Dai all'utente il percorso del `.typ` e il comando per compilarlo:

```bash
just compile cv_mario_rossi.typ
```

(`typst compile` produce il PDF; `just watch cv_mario_rossi.typ` per l'anteprima
live). Ricordagli che i dati stanno tutti nel blocco DATI, così può ritoccarli da
solo.

## Regole di sintassi Typst (per non rompere il file quando editi i DATI)

Queste sono le insidie che fanno fallire la compilazione. Rispettarle è ciò che
distingue un `.typ` che funziona da uno che esplode.

- **I dati vanno nelle stringhe** (`"..."`), non nel markup. Dentro una stringa i
  caratteri `#`, `@`, `*`, `_`, `<`, `$` sono letterali e innocui. Tieni i
  contenuti della persona nelle stringhe del blocco DATI e non avrai sorprese.
- **Virgolette dentro le stringhe** vanno con backslash: `"la tesi «X»"` va bene
  (le caporali no problema), ma `"disse "ciao""` no — usa `"disse \"ciao\""`.
- **Array a un solo elemento** richiede la virgola finale: `("Go",)` non `("Go")`.
  Vale per `punti:` con una sola voce.
- **Ogni voce di un array/dizionario** termina con virgola. Meglio metterla anche
  sull'ultima: è consentita e previene errori quando aggiungi righe.
- **Per togliere una sezione** (es. la persona non ha pubblicazioni), elimina sia
  il suo blocco dati sia la sua chiamata `#sezione(...)` con il relativo `#for`.
  Non lasciare un `#for` che itera su un array inesistente.
- **Per aggiungere una voce**, copia un elemento esistente dell'array e cambiane i
  campi, mantenendo identici i nomi dei campi (`ruolo`, `ente`, `periodo`, ...).
- **Accenti e simboli** (à, è, €, «») sono UTF-8 e funzionano nativamente.
- **Font**: i template usano `DejaVu Sans` (moderno) e `Libertinus Serif`
  (classico/accademico) perché disponibili ovunque. Per cambiarli, modifica solo
  `font:` in `#set text(...)` nel blocco LAYOUT. Se un font non c'è, Typst usa un
  fallback e compila comunque (con un warning innocuo).

## Estendere oltre i template

Se l'utente vuole qualcosa che i tre stili non coprono (foto, colonna laterale
con timeline, QR code, sezione progetti/certificazioni), aggiungi la sezione
lavorando **dentro le convenzioni del template**: definisci i dati come array di
dizionari nel blocco DATI e una `#sezione("...")` con un `#for` nel LAYOUT, sullo
stesso schema delle sezioni esistenti. Compila per verificare a ogni aggiunta.
