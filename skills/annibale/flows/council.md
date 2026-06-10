# Flow: Council of Experts

**Quando usarlo**: l'utente ha un problema, una decisione o una sfida che beneficia di prospettive di dominio diverse e parallele. Non è un ciclo socratico — è un consiglio che si riunisce, ragiona in parallelo, poi sintetizza.

**Natura**: strutturato — ogni giro produce output concreti che alimentano il giro successivo. Il numero di giri è modulabile: uno è spesso sufficiente, più giri servono quando il problema è complesso o le prospettive del primo giro aprono nuove tensioni.

---

## Il ciclo

```
[0. SETUP]      → Annibale sceglie gli esperti in base al dominio del problema
[1. PRIMO GIRO] → ogni esperto analizza il problema in parallelo, indipendentemente
[2. SINTESI]    → blu sintetizza le prospettive in una raccomandazione concreta
→ se servono altri giri: torna a [1] con il contesto accumulato
[N. CHIUSURA]   → blu chiude con decisione finale
```

---

## Fase 0 — Setup

Annibale sceglie gli esperti dal roster disponibile. Criteri:
- **Dominio**: chi ha la competenza più rilevante per questo problema?
- **Divergenza**: i profili devono coprire angoli diversi, non sovrapposti
- **Cappello**: ogni esperto porta il suo colore cognitivo — un ingegnere nero vede rischi, uno giallo vede opportunità

Non convocare più di 5 esperti per giro. Tre focalizzati valgono più di sei generici.

Proponi il consiglio all'utente prima di procedere:

```
Problema: <descrizione>

Consiglio proposto:
- steve-white  — <dominio> — <cosa analizzerà>
- knuth-black  — <dominio> — <cosa analizzerà>
- tesla-green  — <dominio> — <cosa analizzerà>

Giri previsti: 1 (espandibile)

Procedo?
```

---

## Fase 1 — Primo giro (parallelo)

Ogni esperto riceve il problema senza vedere gli altri. Indipendenza totale.

```bash
P1=$(th run --member <nome-cappello1> --task "Sei convocato come esperto in un consiglio.

Problema:
<problema>

Analizza dal tuo punto di vista. Sii specifico, non generico. Porta ciò che solo tu puoi portare." --detach)

P2=$(th run --member <nome-cappello2> --task "Sei convocato come esperto in un consiglio.

Problema:
<problema>

Analizza dal tuo punto di vista. Sii specifico, non generico. Porta ciò che solo tu puoi portare." --detach)

P3=$(th run --member <nome-cappello3> --task "Sei convocato come esperto in un consiglio.

Problema:
<problema>

Analizza dal tuo punto di vista. Sii specifico, non generico. Porta ciò che solo tu puoi portare." --detach)

STATUS1=$(echo "$P1" | jq -r '.status')
STATUS2=$(echo "$P2" | jq -r '.status')
STATUS3=$(echo "$P3" | jq -r '.status')

until grep -q "^done$" "$STATUS1" 2>/dev/null \
   && grep -q "^done$" "$STATUS2" 2>/dev/null \
   && grep -q "^done$" "$STATUS3" 2>/dev/null; do
  sleep 2
done

OUT1=$(cat "$(echo "$P1" | jq -r '.out')")
OUT2=$(cat "$(echo "$P2" | jq -r '.out')")
OUT3=$(cat "$(echo "$P3" | jq -r '.out')")
```

---

## Fase 2 — Sintesi

```bash
SINTESI=$(th run --member <nome-blue> --task "Hai davanti le analisi di un consiglio di esperti sullo stesso problema.

Problema:
<problema>

Analisi degli esperti:

<nome-cappello1>:
$OUT1

<nome-cappello2>:
$OUT2

<nome-cappello3>:
$OUT3

Sintetizza: quali tensioni emergono, dove convergono, qual è la raccomandazione più solida. Non fare la media — decidi.")
```

Presenta la sintesi all'utente. Poi chiedi:

```
Vuoi un altro giro? (gli esperti reagiranno alla sintesi e alle posizioni altrui)
```

---

## Giro aggiuntivo (opzionale, ripetibile)

Se l'utente vuole approfondire, ogni esperto riceve la sintesi del giro precedente e le posizioni degli altri. Ora può confermare, correggere o spingere più a fondo.

```bash
P1=$(th run --member <nome-cappello1> --task "Sei in un consiglio di esperti. Hai letto la sintesi del giro precedente e le analisi degli altri.

Problema originale:
<problema>

Sintesi del giro precedente:
$SINTESI

Analisi degli altri esperti:
<nome-cappello2>: $OUT2
<nome-cappello3>: $OUT3

Reagisci: conferma, correggi o approfondisci. Dove la sintesi ha sbagliato o mancato qualcosa di cruciale?" --detach)

# ripeti per ogni esperto, poi aggiorna OUT1, OUT2, OUT3 e riesegui la sintesi
```

Ripeti per quanti giri servono. Ogni giro accumula contesto — gli esperti diventano più precisi, le tensioni si affilano.

---

## Chiusura

Dopo l'ultimo giro, il blu chiude con decisione finale:

```bash
th run --member <nome-blue> --task "Consiglio concluso. Hai tutto il materiale dei giri precedenti.

Problema:
<problema>

Sintesi finale del consiglio precedente:
$SINTESI

Analisi finali degli esperti:
<nome-cappello1>: $OUT1
<nome-cappello2>: $OUT2
<nome-cappello3>: $OUT3

Chiudi: una decisione, le sue condizioni, i rischi residui. Niente aperture — il consiglio è chiuso."
```

---

## Regole

- **Indipendenza nel primo giro.** Gli esperti non vedono le analisi degli altri finché non hanno finito la propria.
- **Il blu non partecipa ai giri di analisi.** Entra solo in sintesi.
- **Un giro è spesso sufficiente.** Aggiungi giri solo se la sintesi apre tensioni nuove che vale la pena esplorare.
- **Il numero di giri lo decide l'utente**, non Annibale.
- **La chiusura è definitiva.** Nessun flow aperto alla fine.
