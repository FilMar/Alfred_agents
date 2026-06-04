---
tags: [flussi, workflow, memoria]
sources: [alfred.md, skills/platone/SKILL.md, skills/annibale/SKILL.md]
updated: 2026-06-04
---

# Flussi Quotidiani

I pattern operativi ricorrenti del sistema.

## 1. Sedimentazione della Conoscenza (Platone)

Fine sessione con output di valore:

1. Alfred segnala: "c'è materiale da sedimentare"
2. Platone: analizza thread → distilla concetti atomici → propone uno alla volta → aspetta conferma → salva
3. Dopo ogni save: `tb random` per connessioni serendipiche

## 5. Ricerca Prima di Rispondere (Oracolo / Alfred)

Prima di rispondere su un argomento che potrebbe essere nel TB:

```bash
tb search "<tema>" --depth 1
```

Se trovato: usa il materiale sedimentato, non reinventare.
Se vuoto: il vuoto è informazione — dichiaralo.

## 6. Orchestrazione Multi-Cappello (Annibale)

Problema complesso → Annibale scompone → propone flow → aspetta conferma → esegue.

Pattern sequenziale (default):
```bash
th run --member <nome1> --task "<task>" --output /tmp/step1.md
th run --member <nome2> --task "<task>\n\nContesto:\n$(cat /tmp/step1.md)" --output /tmp/step2.md
```

Il Blu chiude sempre il ciclo con sintesi e decisione.

## 2. Stato Progetto (tw)

Per capire dove si è con un progetto:

```bash
tw task list                         # task aperti su index
tw task list --page <pagina>         # task di una sezione specifica
tw page get <pagina>                 # stato completo di una pagina
tw search "<query>"                  # cerca nella wiki locale
```

Per aggiornare:

```bash
tw task add "<cosa da fare>" [--page <pagina>]
tw task done "<match parziale>"
tw page update <pagina> --section "<sezione>" --content "<markdown>"
```

## 7. Manutenzione Wiki (Omero)

- **Ingest**: nuovo materiale → `leggi → discuti → scrivi .wiki/ → aggiorna index + cross-ref + log`
- **Query**: domanda → `index → pagine rilevanti → risposta`
- **Lint**: health-check → contraddizioni, orfani, gap, affermazioni superate

## Riferimenti incrociati

- [Sistema Overview](sistema_overview.md)
- [Agenti e Skill](agenti_skill.md)
- [CLI Reference](cli_reference.md)
