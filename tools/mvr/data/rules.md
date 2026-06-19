# Multiversal Rules — Edizione Solo

> Documento unificato: regole di sistema + flusso di gioco solitario + tabelle di riferimento.
> Include: Sistema Preparazione · Sistema Sandbox

---

## STRUTTURA PERSONAGGIO

**5 Caratteristiche** (min 1, max 3): Atletica, Destrezza, Conoscenza, Carisma, Intuito

**Abilità**: custom, da 0 a max 10 durante la campagna (min 1, max 3 ognuna)

**Creazione**: tutte le caratteristiche partono a 1 + **3 punti** da spendere:
- 1 punto = +1 a una caratteristica (max 3)
- 1 punto = nuova abilità (parte da 1)

**Tratti**: sempre ±1. Positivi costano 1 punto, negativi danno +1 punto (max +3 da negativi → max 6 punti totali in creazione).

**Livello max**: 10 — **Levelup**: 100 × livello corrente EXP → 2 punti da spendere come in creazione.

---

## SISTEMA DI TIRO (Blackjack Sequenziale)

**Formula Target**: `(Difficoltà × 2) + 10` (Diff 0–10). Diff 11+: Target fisso **30**.

| Difficoltà | Target | Descrizione |
|---|---|---|
| 0 | 10 | Facile |
| 1 | 12 | Normale-Bassa |
| 2 | 14 | Normale |
| 3 | 16 | Normale-Alta |
| 4 | 18 | Difficile |
| 5 | 20 | Molto Difficile |
| 6 | 22 | Estremamente Difficile |
| 7 | 24 | Eroica |
| 8 | 26 | Quasi Impossibile |
| 9 | 28 | Leggendaria |
| 10 | 30 | Mitica |

**Pool dadi**: `2 base + caratteristica + Abilità Speciale + Tratti + Alterazioni + Equipaggiamento`

**Cap: 10d6**. Se hai più di 10 dadi, tiri 10d6 e i dadi in eccesso sono ignorati.

**Procedura**: tiri un dado alla volta, decidi se fermarti o continuare. Il totale è la somma di tutti i dadi tirati. Superare il Target = **fallimento critico**.

| Totale | Esito | Tabella |
|---|---|---|
| = Target | Successo Critico | FORTUNE × 2 |
| Target − 1 | Successo, e... | FORTUNE |
| Target − 2 | Successo, ma... | COMPLICAZIONI |
| Target − 3 | Fallimento, ma... | FORTUNE |
| Target − 4 | Fallimento, e... | COMPLICAZIONI |
| > Target | Fallimento Critico | COMPLICAZIONI × 2 |

> **Nota**: su prove a Difficoltà 0–1 il Master può ignorare la tabella collegata e prendere solo l'esito, per mantenere il ritmo su azioni minori.

---

## SPESA ABILITÀ

**Dadi extra**: spendi punti da abilità **rilevanti** alla prova → ratio **1:1**.
Abilità non rilevanti richiedono Tratti Speciali o Equipaggiamento apposito (ratio 2:1 o 3:1).

**Incassare il colpo** (dopo fallimento, prima che la ferita si applichi): spendi da una caratteristica **usata nella prova** — costo = gravità della ferita (1/2/3).

Le penalità temporanee recuperano con i riposi. Max −3 per abilità.

---

## COMBATTIMENTO

**Iniziativa**: narrativa (default Master) o meccanica (Destrezza + Intuito).

**Azioni per turno (1)**:

| Azione | Penalità Difesa |
|---|---|
| Attaccare | −2 dadi alle difese fino al tuo turno |
| Difesa Totale | Nessuna |
| Aiutare | −2 dadi + alleato +1 dado (max +2 alleati) |
| Muoversi | Nessuna |

**Difese** (reazione agli attacchi):
- **Schivare**: Destrezza + armatura leggera
- **Parare**: Atletica + scudo/arma
- Target: Diff 2–5 (14–20) in base alla forza dell'attacco
- Successo → eviti | Critico → eviti + cosa positiva | Fallimento → ferita | Sforo → ferita +1 livello

**Difendere alleati**:
- *Intercettare* (entro 2m): prendi tu l'attacco, tiri difesa normalmente
- *Disturbare* (distanza): Target 14 — successo: attaccante −2 dadi; critico: attacco fallisce; sforo: alleato −1 dado difesa

---

## FERITE E MORTE

Nessuna vita numerica. Le ferite sono **alterazioni contestuali** — si chiamano per quello che sono (*braccio rotto*, *gamba rotta*) e si applicano a ogni prova in cui quella condizione conta. Il senso narrativo ha l'ultima parola.

Il Master (o le tabelle) dichiara il **Pericolo** prima della prova:

| Pericolo | Fallimento normale | Fallimento Critico |
|---|---|---|
| 0 | Conseguenza narrativa | Ferita Lieve (−1) |
| 1 | Ferita Lieve (−1) | Ferita Media (−2) |
| 2 | Ferita Media (−2) | Ferita Grave (−3) |

**Livelli ferita**:

| Ferita | Penalità | Guarigione |
|---|---|---|
| Lieve (−1) | −1 dado alle prove rilevanti | Riposo Breve (1h) |
| Media (−2) | −2 dadi alle prove rilevanti | Riposo Lungo (8h) |
| Grave (−3) | −3 dadi alle prove rilevanti | Riposo Prolungato (1 sett.) o cure |

**Cumulazione della stessa alterazione**:
- Stesso grado → peggiora di 1 livello (−1+−1=−2, −2+−2=−3)
- Grado diverso → prendi la più grave
- Doppia −3 sulla stessa alterazione → −3 rimane + alterazione globale −1 su tutto

**Alterazioni globali**: colpiscono tutte le abilità. Max 1 positiva + 1 negativa attiva.

---

## DEATH ROLL

**Trigger**: 3 Ferite Gravi (−3) nel corpo.

Blackjack sequenziale, Target fisso **10**, 2d6 base.
- +1 dado: alleati entro 5m o Tratto positivo rilevante
- −1 dado: alterazione globale negativa attiva (min 1 dado)

| Risultato | Esito |
|---|---|
| ≤ 5 | Morte |
| 6–7 | Incapacitato (ogni turno: nuovo Death Roll con −1 dado cumulativo) |
| 8–9 | Cosciente 1 turno con −3 globale, poi Incapacitato |
| = 10 | Miracolo: scala 1 Grave (−3→−2) + Tratto +1 permanente |
| > 10 | Incapacitato + Tratto −1 permanente |

**4+ Ferite Gravi** contemporanee = morte istantanea.

**Stabilizzazione** (su alleato Incapacitato): Target 14 senza kit medico, 12 con kit — ferma il Death Roll, resta incosciente.

---

## RECUPERO

| Riposo | Durata | Ferite | Penalità temporanee |
|---|---|---|---|
| Breve | 1h | Tutte le −1 spariscono | scalano di 1 verso zero |
| Lungo | 8h | Tutte scalano di 1 (−3 non scala) | scalano di 2 verso zero |
| Prolungato | 1 settimana | Anche −3 scala a −2 | — |

---

## EQUIPAGGIAMENTO — Sistema Preparazione

> Il personaggio non porta un inventario — porta una storia. Gli oggetti comuni e i consumabili non vengono tracciati prima dell'avventura: vengono dichiarati nel momento in cui servono, attraverso un flashback narrativo.
>
> Gli Oggetti Seri — rari, unici, leggendari — invece pesano sulla scheda perché devono pesare. Sono trovati nel mondo, non dichiarati a tavolino.

### Punti Preparazione

I Punti Preparazione rappresentano quanto il personaggio era pronto: risorse nascoste, contatti, piccole previdenze quotidiane. Non è un inventario — è la misura della sua esperienza e cautela.

| Momento | Punti |
|---|---|
| Inizio campagna | +5 |
| Riposo breve (1h) | +1 |
| Riposo lungo (8h) | +2 |
| In città / luogo sicuro | Ricarica completa |
| Successo Critico (= Target) | +1 |
| Curarsi al riposo (per ferita) | −1 per ferita curata |
| Dichiarare oggetto Comune | −1 |
| Dichiarare oggetto di Qualità | −2 |

### Il Flashback

Quando hai bisogno di un oggetto comune o consumabile, spendi i punti e dichiara che lo avevi già — con una frase che lo giustifica narrativamente.

> *"Prima di entrare nel porto, sono passato dall'armaiolo."*

> *"Quando vivevo in questa città conoscevo un medico qui vicino."*

Il flashback non deve essere lungo. Una frase basta. Ma quella frase fa due cose insieme: giustifica l'oggetto narrativamente e ti immerge più a fondo nel personaggio.

**Stato Continuo**: alcuni oggetti non si dichiarano una volta sola — dichiarano uno stato. Spendi 1 punto e dici *"ho le munizioni"*, *"ho le razioni"*, *"ho i grimaldelli"*. Da quel momento ce li hai, senza tracciare ogni singolo proiettile o pasto.

Lo stato continuo dura finché:
- Una **Complicazione** lo esaurisce — la 6 (*qualcosa di essenziale cede*) è il trigger naturale
- **Decidi tu** che è il momento giusto narrativamente
- La **fiction lo rende ovvio** — sei stato in combattimento per tre giorni senza rifornimenti

Vale anche per gli oggetti fisici. La pistola si rompe, la spada si scheggia, l'armatura cede. Puoi aspettare che la storia te lo imponga, oppure dichiararlo tu per creare tensione nel momento più drammatico.

**Quando NON usare il Flashback**: la logica narrativa deve reggere. Non puoi dichiarare oggetti che non avresti mai potuto avere. Non puoi estrarre una spada leggendaria da una borsa normale. Non puoi avere un oggetto che richiederebbe accesso a luoghi mai visitati. Il tuo senso narrativo ha sempre l'ultima parola.

### Oggetti Seri

Gli oggetti rari, unici e leggendari non si dichiarano — si trovano. Escono da dungeon, ricompense, PNG, eventi. Sono momenti della storia, non risorse del personaggio.

Ogni oggetto serio **è un Tratto** sulla scheda — non ha tratti, li è. Non si chiede "quali bonus dà questa spada" ma "cosa sa fare questa spada che nessun'altra sa fare". L'oggetto diventa parte del personaggio, come una capacità speciale.

| Livello oggetto | Equivale a | Caratteristica |
|---|---|---|
| Raro | Tratto Minore | Effetto specifico, sempre attivo |
| Leggendario | Tratto Maggiore o Leggendario | Effetto potente, spesso con costo |

**Slot disponibili: massimo 3–4 Oggetti Seri sulla scheda.** Ogni slot è una storia. Quando tutti gli slot sono occupati e trovi qualcosa di nuovo, devi scegliere cosa lasciare andare. Quella scelta racconta il personaggio molto più di qualsiasi lista.

### Preparazione in Dungeon

In dungeon i Punti Preparazione si consumano e non si ricaricano facilmente. Più vai avanti, meno sei pronto. Non perché il personaggio diventi stupido — ma perché la realtà lo sta erodendo.

> Arrivare in fondo a un dungeon con 0 Punti Preparazione e trovare un oggetto leggendario ha un peso narrativo enorme. Ce l'hai fatta raschiando il fondo.

### Promemoria Preparazione

| Situazione | Regola |
|---|---|
| Hai bisogno di bende, cibo, munizioni... | Flashback + spendi 1 punto |
| Hai bisogno di uno strumento di qualità | Flashback + spendi 2 punti |
| Vuoi dichiarare uno stato continuo | Flashback + spendi 1 punto — vale finché la storia non lo esaurisce |
| Complicazione 6 con stato continuo attivo | La risorsa finisce, o l'oggetto si rompe |
| Vuoi rompere qualcosa tu per drammaticità | Puoi farlo liberamente, senza costi |
| Hai zero punti e ti serve qualcosa | Non ce l'hai. Improvvisa. |
| Trovi un oggetto raro o leggendario | Entra come Tratto in uno slot Oggetto Serio |
| Tutti gli slot sono pieni | Scegli cosa abbandonare |
| Fai un Successo Critico | Guadagni 1 Punto Preparazione |

---

## CREATURE E PNG

Le creature **non tirano mai dadi** — sono target statici con 4 statistiche: Attacco, Difesa, Mentale, Ferite.

- PG attacca creatura → tira vs **Difesa** della creatura
- Creatura attacca PG → PG tira difesa vs **Attacco** della creatura
- Influenza sociale → tira vs **Mentale**

**Ferite inflitte alle creature**: Successo → 1 ferita | Critico → 2 ferite | Arma Pesante → +1 ferita bonus.

**Formula creazione rapida**:
```
Attacco/Difesa = (Difficoltà × 2) + 10
Mentale       = (Difficoltà × 2) + 8
Ferite        = ⌊(Difficoltà + 1) ÷ 2⌋ + 1
```

| Difficoltà | Attacco | Difesa | Mentale | Ferite |
|---|---|---|---|---|
| 1 | 12 | 12 | 10 | 1 |
| 2 | 14 | 14 | 12 | 2 |
| 3 | 16 | 16 | 14 | 2 |
| 4 | 18 | 18 | 16 | 3 |
| 5 | 20 | 20 | 18 | 4 |
| 6 | 22 | 22 | 20 | 4 |
| 7 | 24 | 24 | 22 | 5 |
| 8 | 26 | 26 | 24 | 5 |
| 9 | 28 | 28 | 26 | 6 |
| 10 | 30 | 30 | 28 | 6+ |

---

## TRATTI SPECIALI

Abilità trasformative (non semplici ±1), ottenibili tramite:
1. **Successo esatto** su prove di alta difficoltà
2. **Sacrificio punti levelup** (4/6/10 punti)
3. **Eventi narrativi epici**

| Categoria | Difficoltà | Target | Livello min | Max per personaggio |
|---|---|---|---|---|
| Minore | 7 | 24 | 5–6 | 1 |
| Maggiore | 8–9 | 26–28 | 7–9 | 2 |
| Leggendario | 10+ | 30 (fisso) | 10 | 3 |

Il Tratto ottenuto deve essere **tematicamente legato** alla prova superata. Ogni Tratto Maggiore/Leggendario ha un costo o limitazione significativa.

---

## PROGRESSIONE EXP

- **Fallimento o Critico**: EXP = (Abilità Base + Abilità Speciale) × 2
- **Successo**: EXP = (Abilità Base + Abilità Speciale)
- **Soglia levelup**: 100 × livello corrente

| Livello | EXP necessari |
|---|---|
| 1 → 2 | 100 |
| 2 → 3 | 200 |
| 3 → 4 | 300 |
| … | … |
| 9 → 10 | 900 |

---

---

# FLUSSO DI GIOCO SOLITARIO

---

## L'OBIETTIVO LUNGO TERMINE

Prima di iniziare, definisci un obiettivo che non si risolve in una scena sola.

> *"Scoprire chi ha ucciso mio padre."*
> *"Trovare l'artefatto rubato prima che cada nelle mani sbagliate."*
> *"Sopravvivere al dungeon e uscirne vivo."*

L'obiettivo lungo termine è la spina dorsale della campagna. Tutto ruota intorno a lui.

---

## LE TRE FONTI DI SCENA

Le scene nascono sempre da una di queste tre fonti:

| Fonte | Esempio | Tabelle coinvolte |
|-------|---------|-------------------|
| **Indizio** | "L'orologio rotto punta a un gioielliere" | Visibilità, Oracolo |
| **Contesto** | "Ho una gamba rotta, devo curarmi" | Tono, Oracolo |
| **Evento esterno** | Il mondo agisce su di te, inaspettatamente | Eventi + Direzione |

Le fonti si mescolano: mentre ti curi (contesto) il medico menziona qualcosa di strano (indizio). Mentre segui una pista ti aggrediscono (evento esterno → nuovo contesto).

---

## IL FLUSSO DI SCENA

```
[FONTE DELLA SCENA]
indizio / contesto / evento esterno
        ↓
[1. ENTRA]
Tono (+ Scintilla opz.)
        ↓
[2. OBIETTIVO DELLA SCENA]
cosa vuoi ottenere? — una cosa sola, concreta
        ↓
[3. AGISCI]
Oracolo → tiro meccanico → PNG?
        ↓
[4. ESITO]
indizio / cambiamento / domanda aperta
        ↓
[5. HOOK]
→ fonte della prossima scena
```

---

### 1. ENTRA
*Sai perché sei qui. Hai un indizio, un contesto, o un evento che ti ha portato in questo posto.*

→ Tira **TONO** — che atmosfera ha questa scena?
→ Tira **SCINTILLA** *(opzionale)* — un dettaglio sensoriale o un gancio immediato

---

### 2. OBIETTIVO DELLA SCENA
*Decidi cosa vuoi ottenere qui. Una cosa sola, concreta.*

> "Voglio sapere se il gioielliere ha venduto quell'orologio."
> "Voglio che il medico mi rimetta in piedi."
> "Voglio attraversare il dungeon senza farmi vedere."

Non tiri nulla. Lo decidi tu.

---

### 3. AGISCI

#### QUANDO TIRARE

**Tira solo se il fallimento cambia qualcosa di importante nella storia.**

| Situazione | Tiri? |
|------------|-------|
| Entri nella taverna | No — chiunque può farlo |
| Convinci un barista diffidente a parlare | Sì — se fallisce perdi l'informazione o peggiora |
| Scala un muro basso | No |
| Scala un muro sotto la pioggia mentre ti inseguono | Sì |

#### ORACOLO O PROVA MECCANICA?

**Chi sta agendo?**

| Il mondo / il destino | Il tuo personaggio |
|----------------------|--------------------|
| → **Oracolo** | → **Prova meccanica** |

Spesso vengono in coppia:
> "Ci sono indizi sul corpo?" → Oracolo: *Sì* → "Li cerco" → Prova di Conoscenza.

A volte basta solo l'Oracolo:
> "C'è qualcuno che mi segue?" → Oracolo: *No* → nessuna prova, vai avanti.

A volte basta solo la prova:
> Sei in combattimento → Prova direttamente.

#### L'ORACOLO È META

L'Oracolo non è la percezione del personaggio — è la **voce del destino**, opera a livello di storia.

> "Qualcuno mi sta seguendo?" → Oracolo: *Sì*
> Il PG non lo sa ancora. Puoi tirare Intuito per vedere se se ne accorge, oppure tenerti questa informazione come autore e costruire tensione.

**Gioca il tuo personaggio, ma pensa come un autore.**

---

### 4. ESITO
Ogni scena dovrebbe produrre **almeno una** di queste cose:

- ✦ **Un indizio** — un fatto nuovo che apre una pista
- ✦ **Un cambiamento di contesto** — qualcosa nel tuo personaggio o nella situazione è diverso
- ✦ **Una domanda aperta** — qualcosa che non sai ancora

Se non hai nessuna di queste tre cose → tira **EVENTI + DIREZIONE** per forzare un hook.

---

### 5. HOOK
L'ultima cosa che succede prima che la scena si chiuda. Una domanda, una minaccia, una scoperta. Il hook diventa la fonte della prossima scena.

---

## L'INTERRUZIONE (Oracolo 7)

Quando l'Oracolo dà 7, il mondo agisce indipendentemente da te.

→ Tira **EVENTI** — cosa sta succedendo?
→ Tira **DIREZIONE** — chi o cosa coinvolge?
→ Tira **TONO** *(opzionale)*
→ Tira **IMPATTO** *(opzionale)* — conseguenza meccanica dell'evento

L'interruzione può rompere la scena in corso, aprire una nuova scena, o aggiungere un filo all'obiettivo lungo termine.

---

## GLI INDIZI

```
INDIZIO: [fatto osservato]
DOMANDA: [cosa suggerisce / cosa non torna]
POSSIBILE SCENA: [dove potrebbe portare]
```

**Esempio:**
```
INDIZIO: L'uomo aveva un orologio costoso al polso, rotto alle 3:14
DOMANDA: Chi gliel'ha regalato? Perché si è rotto a quell'ora esatta?
POSSIBILE SCENA: Il gioielliere che ha venduto l'orologio
```

---

## IL CONTESTO

Lo stato attuale del personaggio e della situazione — tutto ciò che genera scene per necessità, non per scelta.

**Esempi:**
- Ferita Media alla gamba → devo curarmi prima di muovermi
- Sono ricercato in città → ogni scena pubblica ha rischi
- Ho perso l'equipaggiamento → devo rimpiazzarlo

Il contesto **non scompare** finché non viene risolto.

---

---

# TABELLE DI GIOCO

> **Come leggere gli hook meccanici**
> Ogni risultato ha una traduzione meccanica *(in corsivo tra parentesi)* — è un suggerimento, non un obbligo.
> Se la fiction dice altro, la fiction vince sempre.
> Il livello della ferita segue il Pericolo dichiarato: 0 → Lieve (−1), 1 → Media (−2), 2 → Grave (−3).
> L'alterazione descrive cosa è stato danneggiato: usa l'azione fallita come guida.

---

## 1. ORACOLO

| 2d6 | Risultato | Tabelle collegate |
|-----|-----------|-------------------|
| 2 | No critico — e la situazione peggiora in modo inatteso | COMPLICAZIONI × 2 |
| 3 | No, e... | COMPLICAZIONI |
| 4 | No | — |
| 5 | No, ma... | FORTUNE |
| 6 | No, ma... | FORTUNE |
| 7 | ⚡ Interruzione | EVENTI + DIREZIONE |
| 8 | Sì, ma... | COMPLICAZIONI |
| 9 | Sì, ma... | COMPLICAZIONI |
| 10 | Sì | — |
| 11 | Sì, e... | FORTUNE |
| 12 | Sì critico — oltre le tue aspettative più ottimistiche | FORTUNE × 2 |

---

## 2. COMPLICAZIONI

| 2d6 | Risultato |
|-----|-----------|
| 2 | Un alleato ti guarda diversamente — hai sbagliato qualcosa, o lo ha fatto lui? *(−1 dado alle prove di Carisma con lui finché non risolvi)* |
| 3 | Il tempo sta finendo: ogni scelta da ora in poi ha un costo *(ogni prova fallita da qui alla fine della scena: Ferita Lieve contestuale all'azione)* |
| 4 | Arrivano altri, e non sono amici *(nuova minaccia: crea avversario Diff = Pericolo +1)* |
| 5 | Il terreno, l'ambiente, la struttura: lavora contro di te *(−1 dado alle prove fisiche finché resti qui)* |
| 6 | Qualcosa di essenziale cede nel momento peggiore *(un oggetto equipaggiato perde 1 Tratto fino a riparazione — oppure uno stato continuo finisce)* |
| 7 | ⚡ La spirale si stringe *(3d6, tieni i peggiori al prossimo Oracolo)* |
| 8 | Qualcosa cattura la tua attenzione al momento sbagliato *(−1 dado alla prossima prova)* |
| 9 | Esiti un istante di troppo — e quell'istante pesa *(il prossimo avversario agisce prima di te)* |
| 10 | Una reazione emotiva ti sorprende: la tua, o di qualcun altro *(−1 dado alle prove di Intuito o Carisma per questa scena)* |
| 11 | Questa prova lascia un segno sul tuo corpo *(Ferita contestuale all'azione, livello = Pericolo)* |
| 12 | Qualcosa si spezza dentro — questo non si dimentica *(Ferita Media −2 emotiva/mentale + alterazione narrativa permanente a scelta)* |

---

## 3. FORTUNE

| 2d6 | Risultato |
|-----|-----------|
| 2 | Qualcuno arriva quando non ti aspettavi più nessuno *(alleato PNG entra in scena: Diff = tua Difficoltà attuale)* |
| 3 | Una parola, al momento giusto, cambia tutto il quadro *(annulla una Complicazione attiva a scelta)* |
| 4 | I tuoi avversari guardano dall'altra parte — adesso *(+2 dadi alla prossima prova furtiva o di fuga)* |
| 5 | Il terreno, l'ambiente, la struttura: lavora con te *(+1 dado alle prove fisiche finché resti qui)* |
| 6 | Trovi quello di cui avevi bisogno — o qualcosa di molto simile *(risorsa o oggetto Comune disponibile subito — senza spendere Punti Preparazione)* |
| 7 | ⚡ La corrente gira *(3d6, tieni i migliori al prossimo Oracolo)* |
| 8 | Qualcosa ti avverte appena in tempo — fidati *(eviti automaticamente la prossima Ferita Lieve)* |
| 9 | Un ricordo preciso emerge e ti guida esattamente dove serve *(+1 dado a tutte le prove di Conoscenza per questa scena — può aprire un flashback)* |
| 10 | Il tuo nome apre una porta che sembrava chiusa *(il PNG coinvolto diventa neutrale o amichevole)* |
| 11 | Trovi dentro di te una riserva che non sapevi di avere *(recupera 1 punto speso da una caratteristica a scelta)* |
| 12 | La risposta era lì da sempre — ora finalmente la vedi *(scala una Ferita attiva di un livello + ottieni un indizio gratuito)* |

---

## 4. EVENTI

| 2d6 | Risultato |
|-----|-----------|
| 2 | Qualcosa crolla — strutture, alleanze, o certezze |
| 3 | Qualcuno fugge — da cosa? da chi? perché adesso? |
| 4 | Un conflitto esplode senza preavviso |
| 5 | Qualcosa di prezioso viene perso o distrutto |
| 6 | Occhi che osservano — qualcuno tiene traccia di tutto |
| 7 | Uno scambio avviene — denaro, parole, o segreti |
| 8 | Un accordo viene proposto o siglato |
| 9 | Qualcuno (o qualcosa) arriva — aspettato o no? |
| 10 | Qualcuno (o qualcosa) parte — definitivamente? |
| 11 | Una scoperta cambia il quadro — di chi o di cosa? |
| 12 | Si festeggia — ma non tutti sono contenti di farlo |

---

## 5. DIREZIONE

| 2d6 | Risultato |
|-----|-----------|
| 2 | Tocca te direttamente — sei nel centro di tutto |
| 3 | Coinvolge qualcuno della tua famiglia |
| 4 | Un tuo amico è al centro — può o vuole aiutarti? |
| 5 | Un conoscente di passaggio è implicato |
| 6 | Potrebbe riguardarti — forse è il momento di preoccuparsi |
| 7 | ⚡ Due fili si intrecciano *(tira EVENTI due volte)* |
| 8 | Una singola persona agisce in modo deciso |
| 9 | Un gruppo si muove con un obiettivo comune |
| 10 | L'evento tocca il luogo dove sei — comunità, villaggio |
| 11 | L'intera regione ne sente l'eco |
| 12 | Il mondo intero ne parlerà |

---

## 6. VISIBILITÀ

| 2d6 | Risultato |
|-----|-----------|
| 2 | Sepolto così in profondo che quasi non esiste più |
| 3 | Nascosto sotto strati di menzogna e silenzio deliberato |
| 4 | Qualcuno sospetta, ma tace — per ora |
| 5 | Si intravede appena, solo se si sa dove guardare |
| 6 | Chi presta attenzione lo percepisce |
| 7 | Solo tu (per ora) hai visto abbastanza da capire |
| 8 | La voce si diffonde — non è più solo tua |
| 9 | Abbastanza noto da muovere qualcuno ad agire |
| 10 | Evidente: chi non lo vede, non vuole vedere |
| 11 | La notizia si sparge in fretta — troppo in fretta |
| 12 | Tutti sanno, e il segreto ha già fatto il suo danno |

---

## 7. PNG

| 2d6 | Risultato |
|-----|-----------|
| 2 | Il reietto — porta un segreto che nessuno vuole sentire |
| 3 | Il criminale — vuole qualcosa da te, e sa come chiederlo |
| 4 | L'artista — osserva più di quanto dice, e ricorda tutto |
| 5 | Il viaggiatore — sa cose che non dovrebbe sapere |
| 6 | L'artigiano — ha quello che ti serve, ma c'è un prezzo |
| 7 | Il mercante — propone uno scambio: ascolta le condizioni |
| 8 | Il soldato — ti valuta: sei un problema o una risorsa? |
| 9 | Il nobile — ti usa o ti ignora, mai una via di mezzo |
| 10 | Il funzionario — nasconde qualcosa dietro la procedura |
| 11 | Il religioso — offre conforto o condanna, mai entrambi |
| 12 | La figura di potere — la sua presenza cambia il peso della stanza |

---

## 8. TONO

| 2d6 | Risultato |
|-----|-----------|
| 2 | Oscuro — le ombre nascondono qualcosa di peggio |
| 3 | Decadente — tutto qui sa di ultimo atto |
| 4 | Ostile — l'ambiente stesso non ti accoglie |
| 5 | Carico — le cose non dette riempiono il silenzio |
| 6 | Teso — un filo sottile che trema ma non si spezza ancora |
| 7 | Ambiguo — nessuna intenzione è leggibile, nemmeno la tua |
| 8 | Malinconico — qualcosa è stato perso qui, tempo fa |
| 9 | Ordinario — eppure qualcosa non torna |
| 10 | Caldo — per una volta, qualcuno è davvero dalla tua parte |
| 11 | Ironico — la situazione ha qualcosa di assurdo, quasi comico |
| 12 | Aperto — tutto sembra ancora possibile, anche le cose buone |

---

## 9. SCINTILLA

*Tira all'apertura scena, con un nuovo PNG, o quando vuoi ancorare la fiction.*

| 2d6 | Risultato |
|-----|-----------|
| 2 | Un odore che riporta a un ricordo preciso — e disturbante |
| 3 | Silenzio dove dovrebbe esserci rumore — perché? |
| 4 | Una voce familiare che non ti aspettavi qui |
| 5 | Il tatto rivela qualcosa che gli occhi non vedevano |
| 6 | Un dettaglio visivo fuori posto — piccolo, ma sbagliato |
| 7 | La temperatura cambia di colpo |
| 8 | Un suono lontano che non riesci a identificare |
| 9 | Qualcuno (o qualcosa) ti stava osservando — da quanto? |
| 10 | Rivela di sapere chi sei davvero |
| 11 | Porta con sé qualcosa che stavi cercando |
| 12 | Tutti i sensi si svegliano insieme — qualcosa non va, o è finalmente giusto |

---

## 10. IMPATTO

*Tira dopo EVENTI + DIREZIONE per tradurre l'evento in conseguenza meccanica.*
*Opzionale — usalo quando l'evento è violento, urgente, o cambia le condizioni di gioco.*

| 2d6 | Risultato |
|-----|-----------|
| 2 | Tutto peggiora insieme *(due Ferite Lievi contestuali, zone a scelta + −1 dado globale per questa scena)* |
| 3 | Perdi qualcosa di importante *(un oggetto equipaggiato va perso o distrutto — oppure perdi 2 Punti Preparazione)* |
| 4 | Sei costretto a reagire subito *(salta il beat OBIETTIVO — agisci senza prepararti)* |
| 5 | L'ambiente si fa ostile *(−1 dado a tutte le prove fisiche finché esci da qui)* |
| 6 | Qualcuno subisce le conseguenze al posto tuo *(un PNG alleato prende una Ferita Lieve)* |
| 7 | L'evento cambia il quadro ma non i tuoi dadi *(nessun effetto meccanico — solo fiction)* |
| 8 | Guadagni una posizione inaspettata *(+1 dado alla prossima prova per l'elemento sorpresa)* |
| 9 | L'interruzione ti rivela qualcosa *(ottieni un indizio gratuito legato all'obiettivo lungo termine)* |
| 10 | Trovi un alleato inatteso nell'evento *(il PNG coinvolto da DIREZIONE è disposto ad aiutarti)* |
| 11 | L'evento risolve un problema aperto *(chiudi un contesto attivo a scelta)* |
| 12 | La corrente gira completamente *(scala una Ferita attiva + tira FORTUNE)* |

---

---

# SISTEMA SANDBOX — Mondo Vivo

> Il sistema base racconta le scene. Il Sistema Sandbox racconta il mondo.
>
> Senza questo strato, il mondo esiste solo quando ci sei tu. Le fazioni si congelano. I nemici aspettano. Il tempo non passa davvero.
>
> Con questo strato, il mondo respira da solo. I nemici avanzano verso i loro obiettivi. Le fazioni si scontrano senza chiederti il permesso. Gli orologi ticchettano — e non si fermano mentre ti curi.
>
> Tre pezzi. Tutto si aggancia al sistema esistente senza riscrivere nulla.

---

## 1. FAZIONI

Una fazione è un gruppo con un obiettivo e una risorsa. Non serve di più.

**Struttura minima:**

```
NOME FAZIONE: _______________
OBIETTIVO:    cosa vogliono ottenere
RISORSA:      cosa hanno che gli altri non hanno
TENSIONE:     con chi sono in conflitto, e perché
OROLOGIO:     [  ] [  ] [  ] [  ] [  ] [  ]  ← tacche da riempire
```

**Quante fazioni?**

| Campagna | Fazioni consigliate |
|---|---|
| Breve (5–10 scene) | 1–2 |
| Media (10–20 scene) | 2–3 |
| Lunga (20+ scene) | 3–4 |

Più di 4 fazioni attive crea rumore, non complessità. Meglio poche con peso reale.

**Tensione tra fazioni**: ogni coppia di fazioni ha un livello di tensione da 1 a 3:

| Livello | Significato |
|---|---|
| 1 | Diffidenza — si ignorano o si tollerano |
| 2 | Conflitto aperto — si ostacolano attivamente |
| 3 | Guerra — ogni avanzata di una è una perdita per l'altra |

Quando una fazione compie un'azione rilevante per un'altra, la tensione può salire.

---

## 2. OROLOGI DEL MONDO

Ogni fazione ha un orologio — un contatore che misura quanto è vicina al suo obiettivo.

```
Orologio = 4 / 6 / 8 tacche  (scegli in base all'urgenza narrativa)
```

Più tacche = più tempo, più respiro. Meno tacche = pressione immediata.

### Quando avanza l'orologio

Avanza di **1 tacca** in questi momenti:

| Trigger | Note |
|---|---|
| Ogni 3 scene giocate | Avanza automaticamente, sempre |
| Oracolo 7 (Interruzione) | Solo per la fazione più attiva in quel momento |
| Fallimento su prova legata a quella fazione | Il tuo fallimento è il loro guadagno |
| Segnale narrativo ignorato | A tua discrezione — solo se la fiction lo giustifica |

### Quando si blocca l'orologio

| Azione | Effetto |
|---|---|
| Successo critico in prova diretta contro la fazione | L'orologio non avanza per le prossime 2 scene |
| Distruggi una loro risorsa chiave | L'orologio non avanza per le prossime 3 scene |
| Elimini un loro agente importante | Scala l'orologio di 1 tacca indietro |

### Quando l'orologio arriva a zero

L'obiettivo della fazione si compie. Interamente. Anche se non eri lì.

Questo non è un game over — è una svolta narrativa. Il mondo è cambiato. Ora devi fare i conti con le conseguenze.

> Il porto è sotto il controllo della Gilda. Il portale è aperto. La città è caduta.
> Cosa fai adesso?

---

## 3. REGISTRO PNG

I PNG ricorrenti hanno memoria. Ricordano cosa hai fatto — e come li hai trattati.

**Struttura:**

```
NOME PNG:     _______________
RUOLO:        chi è nel mondo
FAZIONE:      a chi è legato (se applicabile)
RELAZIONE:    [−3] [−2] [−1] [ 0 ] [+1] [+2] [+3]
NOTE:         cosa sa, cosa vuole, cosa teme
```

**La scala relazionale:**

| Valore | Atteggiamento |
|---|---|
| −3 | Nemico attivo — agisce contro di te |
| −2 | Ostile — non coopera, potrebbe denunciarti |
| −1 | Diffidente — ti serve qualcosa per guadagnarti la sua fiducia |
| 0 | Neutro — ti valuta, non si è ancora fatto un'idea |
| +1 | Favorevole — disposto ad aiutarti se non costa troppo |
| +2 | Alleato — si fida di te, farebbe sacrifici per aiutarti |
| +3 | Legame — ti protegge, condivide informazioni riservate |

**Come cambia la relazione:**

| Azione | Variazione |
|---|---|
| Lo aiuti concretamente in qualcosa di importante | +1 |
| Mantieni una promessa fatta a lui | +1 |
| Successo critico in una prova sociale con lui | +1 |
| Lo ignori quando aveva bisogno di te | −1 |
| Lo tradisci o lo menti deliberatamente | −2 |
| Fallimento critico in una prova sociale con lui | −1 |
| Agisci contro la sua fazione | −1 (o −2 se è devoto) |

La relazione non cambia mai di più di 1 punto per scena — i legami si costruiscono lentamente, anche quando si rompono velocemente.

---

## Come Si Incastra con il Sistema Esistente

### EVENTI + DIREZIONE → Fazioni

Quando tiri EVENTI e DIREZIONE, collega il risultato alla mappa di forze.

> EVENTI 8 — "Un accordo viene siglato"
> DIREZIONE 9 — "Un gruppo si muove con un obiettivo comune"
>
> → La Gilda ha appena stretto un'alleanza con il Governatore.
> → L'orologio della Gilda avanza di 1 tacca.
> → La tensione Gilda/Culto sale a 3.

Il risultato della tabella non cambia. Cambia il contesto in cui lo leggi.

### Oracolo 7 (Interruzione) → Orologio

Quando l'Oracolo dà 7, oltre a tirare EVENTI + DIREZIONE, avanza l'orologio della fazione più attiva in quella scena. L'interruzione non è casuale — è il mondo che si muove mentre tu sei distratto.

### Complicazione 2 / 11–12 → Registro PNG

Quando una complicazione coinvolge un PNG ricorrente, aggiorna la sua relazione.

> Complicazione 2 — "Un alleato ti guarda diversamente"
> → È un PNG del tuo registro → scala la relazione di −1

Questo trasforma le complicazioni da fastidi meccanici in storia permanente.

---

## Setup di Campagna

Prima di iniziare, dedica 10 minuti a questo:

```
1. OBIETTIVO LUNGO TERMINE
   → Una frase. Il cuore della campagna.

2. FAZIONI (2–3)
   → Nome, obiettivo, risorsa, tensione, orologio

3. PNG CHIAVE (3–5)
   → Nome, ruolo, fazione, relazione iniziale

4. DOMANDA APERTA
   → Una cosa che non sai ancora e vuoi scoprire giocando
```

Non serve di più. Il resto emerge dal gioco.

### Il Cattivo

Se la tua campagna ha un antagonista principale, dagli un orologio dedicato — separato dalla sua fazione, se ne ha una. L'orologio del cattivo non misura la sua organizzazione. Misura lui. La sua preparazione, il suo piano, la sua vicinanza al punto di non ritorno.

Quando arriva a zero, il cattivo vince. Non come scelta narrativa. Come conseguenza reale di quello che è successo — e di quello che non hai fatto in tempo.

---

---

# PROMEMORIA CONNESSIONI

```
APERTURA SCENA
  → sempre:    TONO
  → opzionale: SCINTILLA

ORACOLO
  → 2:         COMPLICAZIONI × 2
  → 3:         COMPLICAZIONI
  → 5-6:       FORTUNE
  → 7:         EVENTI + DIREZIONE → IMPATTO (opzionale)
               + avanza orologio fazione più attiva [SANDBOX]
  → 8-9:       COMPLICAZIONI
  → 11:        FORTUNE
  → 12:        FORTUNE × 2

PROVA MECCANICA
  → Successo Critico (= Target):   FORTUNE × 2 + guadagna 1 Punto Preparazione [PREP]
  → Successo, e... (Target −1):    FORTUNE
  → Successo, ma... (Target −2):   COMPLICAZIONI
  → Fallimento, ma... (Target −3): FORTUNE
  → Fallimento, e... (Target −4):  COMPLICAZIONI
  → Fallimento Critico (> Target): COMPLICAZIONI × 2

NUOVO PNG
  → PNG + SCINTILLA + TONO (opzionale)
  → se ricorrente: controlla REGISTRO PNG [SANDBOX]

INDAGINE / SEGRETO
  → VISIBILITÀ

FINE SCENA SENZA HOOK
  → EVENTI + DIREZIONE

SPIRALE (Complicazioni 7)
  → prossimo Oracolo: 3d6, tieni i peggiori

BOOST (Fortune 7)
  → prossimo Oracolo: 3d6, tieni i migliori

OGNI 3 SCENE [SANDBOX]
  → avanza orologio fazione più attiva di 1 tacca

COMPLICAZIONE 2 o 11–12 con PNG ricorrente [SANDBOX]
  → aggiorna relazione nel Registro PNG

COMPLICAZIONE 6 [PREP]
  → uno stato continuo finisce, o un oggetto si rompe

FORTUNE 6 [PREP]
  → oggetto Comune disponibile senza spendere Punti Preparazione
```
