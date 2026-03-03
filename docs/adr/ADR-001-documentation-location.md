# ADR-001: Documentazione in agents/core/

## Status

Accepted

**Approval Date:** 2026-02-27

## Context

Attualmente la directory `agents/core/` contiene 11 file:

**Agent (6):**
- analyzer.md
- coder.md
- documenter.md
- orchestrator.md
- reviewer.md
- system_coordinator.md

**Documentazione (5):**
- COMPLETION_REPORT.md
- DOCUMENTATION_INDEX.md
- DOCUMENTATION_STATUS.md
- README_DOCUMENTATION.md
- TODOLIST.md

I file di documentazione sono mescolati con gli agent veri, creando confusione organizzativa e rendendo difficile distinguere rapidamente cosa sia codice eseguibile (agent) e cosa sia meta-informazione.

### Problemi Identificati

1. **Mix di responsabilita**: La directory dovrebbe contenere solo agent
2. **Scoperta difficile**: Chi cerca un agent deve filtrare manualmente i file
3. **Incoerenza strutturale**: Le altre directory (agents/l1/, agents/l2/) non hanno questo problema
4. **Manutenzione**: Aggiornare la documentazione richiede navigazione in directory mista

## Decision

Spostare i 5 file di documentazione da `agents/core/` a `agents/docs/core/`.

### Nuova Struttura Proposta

```
agents/
  core/
    analyzer.md
    coder.md
    documenter.md
    orchestrator.md
    reviewer.md
    system_coordinator.md
  docs/
    core/
      COMPLETION_REPORT.md
      DOCUMENTATION_INDEX.md
      DOCUMENTATION_STATUS.md
      README_DOCUMENTATION.md
      TODOLIST.md
  l1/
    [agent L1...]
  l2/
    [agent L2...]
```

### Comando di Migrazione

```bash
mkdir -p agents/docs/core/
mv agents/core/COMPLETION_REPORT.md agents/docs/core/
mv agents/core/DOCUMENTATION_INDEX.md agents/docs/core/
mv agents/core/DOCUMENTATION_STATUS.md agents/docs/core/
mv agents/core/README_DOCUMENTATION.md agents/docs/core/
mv agents/core/TODOLIST.md agents/docs/core/
```

## Consequences

### Positivi

1. **Pulizia organizzativa**: `agents/core/` contiene solo agent
2. **Coerenza**: Pattern ripetibile per altre directory se necessario
3. **Scoperta migliorata**: Immediata distinzione tra codice e documentazione
4. **Scalabilita**: Facile aggiungere documentazione per L1/L2 in `agents/docs/l1/`, `agents/docs/l2/`

### Negativi

1. **Rottura riferimenti**: Eventuali link interni ai file spostati devono essere aggiornati
2. **Abitudini**: Richiede aggiustamento mentale per chi e abituato alla struttura attuale

### Mitigazione

- Cercare e aggiornare tutti i riferimenti nei file esistenti
- Aggiornare MEMORY.md e DOCUMENTATION_INDEX.md principale

## Metadata

- **Autore**: Claude (Coder Agent)
- **Data**: 2026-02-27
- **Versione**: 1.0
- **Tag**: organization, documentation, structure
