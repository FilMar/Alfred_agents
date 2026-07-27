---
name: steward
description: "Manages tasks via Taskwarrior through a justfile abstraction layer. Capture, organize, track and complete tasks with GTD semantics using Areas of Focus, Workflow states, and Energy levels. Use it whenever the user wants to add, list, modify, complete, or review tasks, manage projects and contexts, check overdue or active work, or do any task management activity — even if they don't mention Taskwarrior explicitly."
---

# Steward

Steward manages tasks through a `justfile` that wraps Taskwarrior. Always use the recipes in this skill's `justfile` instead of calling `task` directly — the justfile provides GTD-semantic names and handles quoting. Run `just --list` from this directory to see all recipes.

## Sistema GTD Personalizzato

Il sistema usa tre dimensioni per organizzare i task:

### 1. Aree di Focus (dove appartiene il task nella tua vita)
- `+emotion` — lavoro principale, relazioni profonde, scopo
- `+cura` — salute, benessere, esercizio, manutenzione casa
- `+amministrazione` — bollette, scadenze fiscali, burocrazia
- `+personale` — progetti creativi, studio, hobby intellettuali
- `+lavoro` — lavoretti secondari, freelance, clienti

### 2. Workflow (stato dell'azione)
- `+next` — azioni pronte da fare ora
- `+waiting` — in attesa di altri o eventi esterni
- `+someday` — forse un giorno (non attivo ora)
- `+routine` — abitudini ricorrenti giornaliere/settimanali

### 3. Energia Richiesta (quanto richiede il task)
- `+focus` — deep work, alta concentrazione
- `+execute` — meccanico, esecuzione senza pensiero
- `+reflect` — riflessione, pianificazione, brainstorming
- `+rest` — bassa energia, recupero, abitudini leggere

### 4. Progetti (outcome specifici con fine definita)
- `project:NomeProgetto` — es. `project:ScrivereLibro`, `project:ViaggioGiappone`
- I progetti non si creano esplicitamente — esistono quando assegni il primo task

## Capture

Aggiungi un task all'inbox (senza categorizzazione, solo descrizione):

```bash
just add "Comprare pane"
just add "Inviare report" due:tomorrow
```

Per catturare già categorizzato (se chiaro al momento):

```bash
just add "Scrivi capitolo 3" project:ScrivereLibro +personale +next +focus
just add "Paga bolletta luce" +amministrazione +next +execute due:eom
just add "Meditazione" +cura +routine +rest due:today recur:daily
```

L'inbox — task senza tag `+next`, `+waiting`, `+someday`, o `+routine`, da chiarire:

```bash
just list -next -waiting -someday -routine
```

## Clarify & Organize

Assegna area di focus, stato workflow, energia, progetto:

```bash
# Assegna area di focus
just tag 12 emotion
just tag 12 cura
just tag 12 amministrazione
just tag 12 personale
just tag 12 lavoro

# Assegna stato workflow
just tag 12 next
just tag 12 waiting
just tag 12 someday
just tag 12 routine

# Assegna energia
just tag 12 focus
just tag 12 execute
just tag 12 reflect
just tag 12 rest

# Assegna progetto
just proj 12 ScrivereLibro
just proj 12 ViaggioGiappone

# Rimuovi tag
just untag 12 next      # es. sposta da next a waiting
just untag 12 focus

# Imposta scadenza
just due 12 tomorrow
just due 12 2025-08-15
just due 12 eom         # end of month

# Rimuovi scadenza
just nodue 12

# Modifica generica (qualsiasi modificatore Taskwarrior)
just modify 12 due:eom +urgent project:Lavoro
```

## Reflect

### Per Stato Workflow

```bash
just next-actions     # tutte le azioni pronte (+next)
just waiting-list     # in attesa di altri (+waiting)
just someday          # lista someday/maybe (+someday)
just routine          # abitudini ricorrenti (+routine)
```

### Per Area di Focus

```bash
just emotion          # task dell'area Emotion
just cura             # task dell'area Cura
just amministrazione  # task dell'area Amministrazione
just personale        # task dell'area Personale
just lavoro           # task dell'area Lavoro
```

### Per Energia Richiesta

```bash
just focus            # task che richiedono deep work
just exec             # task meccanici da eseguire
just reflect          # task di riflessione/pianificazione
just rest             # task a bassa energia
```

### Altri Report Utili

```bash
just next             # task più urgenti (sorted by urgency)
just overdue          # task scaduti
just active           # task avviati (started ma non completati)
just completed        # task completati
just projects         # overview progetti con conteggio task
just tags             # tutti i tag in uso
just calendar         # calendario con scadenze
```

### Liste con Filtri Personalizzati

```bash
just list                            # tutti i pending
just list project:ScrivereLibro      # per progetto
just list +emotion +next             # area + stato
just list +focus due.before:tomorrow # energia + scadenza
```

### Dettagli Completi di un Task

```bash
just info 12          # dettagli completi + storico modifiche
```

## Engage

```bash
just start 12         # inizia a lavorare (task diventa "active")
just stop 12          # ferma il lavoro
just done 12          # completa il task
just delete 12        # elimina il task
```

Aggiungi un'annotazione (nota) a un task:

```bash
just annotate 12 "Inviata mail a Marco per chiarimenti"
```

## Routine

Le routine si creano con ricorrenza:

```bash
# Routine giornaliera
just add "Meditazione" +cura +routine +rest due:today recur:daily

# Routine settimanale
just add "Review settimanale" +personale +routine +reflect due:today recur:weekly
```

Taskwarrior genera automaticamente le istanze future alla scadenza.

## Export

Esporta task in JSON per elaborazione programmatica:

```bash
just export                          # tutti i pending
just export project:Home status:pending
just export +next +emotion
```

## Raw

Quando l'astrazione non copre ciò che ti serve, passa direttamente a Taskwarrior:

```bash
just raw burndown.weekly
just raw 12 duplicate
just raw stats
just raw +emotion calendar
```

## Flusso di Lavoro Consigliato

### 1. Cattura (Capture)
Butta giù tutto quello che hai in mente, senza categorizzare:
```bash
just add "Task generico"
```

### 2. Chiarimento (Clarify)
Processa l'inbox periodicamente (ogni giorno o ogni settimana):
```bash
just list -next -waiting -someday -routine   # task da chiarire
```

Per ogni task, chiediti:
- È azionabile? Se no, elimina o sposta in `+someday`
- Qual è la prossima azione fisica?
- A quale area di focus appartiene? (`+emotion`, `+cura`, etc.)
- Che energia richiede? (`+focus`, `+execute`, `+reflect`, `+rest`)
- È parte di un progetto? (`project:Nome`)
- Qual è lo stato? (`+next`, `+waiting`, `+someday`, `+routine`)

### 3. Organizzazione (Organize)
Applica le categorizzazioni:
```bash
just tag 12 emotion
just tag 12 next
just tag 12 focus
just proj 12 ScrivereLibro
```

### 4. Reflection (Review)
- **Daily:** `just next` e `just routine` per vedere cosa fare oggi
- **Weekly:** `just someday` per review progetti futuri, `just projects` per overview
- **Monthly:** `just calendar` per pianificazione a lungo termine

### 5. Engagement (Execute)
Scegli in base a:
- Contesto fisico (dove sei, che strumenti hai)
- Tempo disponibile (5 min vs 2 ore)
- Energia mentale (alto vs basso)
- Priorità (urgenza + importanza)

```bash
just focus      # se hai energia e tempo per deep work
just exec       # se hai poco tempo/energia, task meccanici
just rest       # se sei stanco, abitudini leggere
```

## Contesti (Context)

Taskwarrior supporta contesti predefiniti per filtrare automaticamente le liste:

```bash
just context-list         # vedi contesti disponibili
just context-set next     # attiva contesto: mostra solo +next
just context-set focus    # attiva contesto: mostra solo +focus
just context-none         # disattiva contesto
```

Contesti disponibili: `next`, `waiting`, `someday`, `routine`, `focus`, `exec`, `reflect`, `rest`, `emotion`, `cura`, `amministrazione`, `personale`, `lavoro`.
