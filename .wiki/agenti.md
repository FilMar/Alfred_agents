# Agenti

## Frontmatter

tags: [agenti, skill, th, cappelli]
sources: [README.md, roadmap.md, skills/]
updated: 2026-06-06

## Panoramica

Gli agenti sono Claude Code instances con system prompt specializzato (ruolo + cappello de Bono). Vivono in `skills/<nome>/SKILL.md` e vengono eseguiti via `th run --member <nome>` oppure come skill Claude Code.

Il file `SKILL.md` contiene:
- Chi è l'agente (identità, comportamento)
- Quando triggerarlo (trigger impliciti)
- Come opera (protocollo di lavoro)

## Agenti disponibili

| Agente | Ruolo | Cappello |
|--------|-------|----------|
| `annibale` | Orchestratore: scompone lavori complessi in flow multi-agente con cappelli de Bono | Blue (processo) |
| `oracolo` | Recupera conoscenza dal TB senza interpretare | White (dati) |
| `socrate` | Genera attrito cognitivo: trova contraddizioni e lacune, non chiude | Black (critico) |
| `aristotele` | Cura le sintesi del TB: hub, connessioni mancanti, cluster densi | Yellow (sintesi) |
| `platone` | Sedimenta idee nel TB in modo atomico e connesso, con serendipità | Green (creativo) |
| `feynman` | Insegna il corpus del TB con la tecnica Feynman a tre livelli | White + Yellow |
| `indiana` | Archeologia del codice: diagnostica pattern, debiti, decisioni sepolte | Black (critico) |
| `ermes` | Estrae testo da URL (articoli web e YouTube) | White (dati) |
| `prometeo` | Crea e migliora skill, misura performance via eval e benchmark | Green (creativo) |
| `omero` | Mantiene la wiki locale del progetto in `.wiki/` via CLI `tw` | Blue (processo) |
| `giano` | Ruolo in definizione | — |

## Cappelli de Bono

I cappelli de Bono definiscono il frame cognitivo dell'agente:

| Cappello | Frame | Uso tipico |
|----------|-------|------------|
| White | Dati puri, nessuna interpretazione | Retrieval, estrazione |
| Black | Critico, rischi, problemi | Review, stress test |
| Yellow | Ottimismo, valore, opportunità | Sintesi, sintesi positiva |
| Green | Creatività, nuove idee | Generazione, design |
| Blue | Processo, organizzazione | Orchestrazione, piano |
| Red | Emozioni, intuizioni | — |

I cappelli vivono in `tools/th/src/` (directory `hats/`). Usa `th hats list` per vederli tutti.

## Pattern di esecuzione

**Sequenziale** (output di uno → contesto del successivo):
```bash
th run --member oracolo --task "recupera tutto su X" --output /tmp/oracolo.out
th run --member feynman --task "$(cat /tmp/oracolo.out) — insegna"
```

**Parallelo** con `--detach`:
```bash
th run --member socrate --task "trova lacune in..." --detach
th run --member aristotele --task "trova cluster in..." --detach
# poll su /tmp/th-*.status, poi sintetizza
```

**Annibale** orchestra automaticamente il pattern giusto scomponendo il problema in sotto-task.

## Ciclo del membro

1. `th member create <name> --hat <hat> --role "<ruolo>"` — crea il membro
2. `th run --member <name> --task "<task>"` — esegue in sandbox bwrap
3. `th history --member <name>` — storico run
4. `th member promote <name>` — promuove da locale a globale

## Riferimenti incrociati

- [architettura](architettura) — overview system e sandbox
- [th_cli](th_cli) — comandi `th` completi
