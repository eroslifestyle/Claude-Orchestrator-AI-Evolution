---
title: Orchestrator Architecture
version: V15.1.0
last_updated: 2026-03-08
language: it
module: orchestrator
tags: [architecture, system-design, auto-correction]
---

# Orchestrator Architecture

> Documentazione architetturale del sistema Orchestrator V15.1.0

---

## Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Componenti Core](#componenti-core)
3. [Ciclo di Auto-correzione](#ciclo-di-auto-correzione-v1510)
4. [Integrazione Learning System](#integrazione-con-learning-system)

---

## Panoramica Sistema

L'Orchestrator V15.1.0 e un sistema AI-native per la gestione di agenti, skill e routing intelligente.

### Metriche Chiave

| Componente | Conteggio |
|------------|-----------|
| Agenti | 43 (6 core + 22 L1 + 15 L2) |
| Skills | 32 (7 core + 8 workflow + 6 utility + altri) |
| Moduli Core | 21 |
| Rules Files | 11 |
| Facade Exports | 129 |

---

## Componenti Core

### Facade API Unificata

Punto di ingresso unificato per tutti i moduli core:

```python
from lib.facade import facade

# Accesso via namespace
facade.chaos.inject_failure()
facade.routing.select_agent("task description")
facade.distributed_lock.acquire("resource_id")

# Export diretti
from lib.facade import ChaosInjector, RoutingEngineV2
```

### Namespaces Disponibili

| Namespace | Scopo |
|-----------|-------|
| chaos | Chaos engineering e failure injection |
| distributed_lock | Coordinazione distribuita |
| routing | ML-based agent routing |
| hot_reload | Plugin hot reloading |
| core | Componenti base (OrchestratorCore, ecc.) |
| agents | Gestione agenti |
| skills | Gestione skill |

---

## Ciclo di Auto-correzione (V15.1.0)

Il sistema implementa un ciclo di auto-correzione per migliorare continuamente l'affidabilita.

### Flusso

1. **Rileva errore** - L'agente o il tool segnala un fallimento
2. **Analizza root cause** - L'orchestrator analizza lo stack trace e il contesto
3. **Correggi** - Modifica agente/skill/script responsabile
4. **Testa** - Verifica che la correzione funzioni
5. **Aggiorna documentazione** - Registra il learning in `worklog.md` o skill correlata
6. **Sistema piu forte** - La knowledge base si arricchisce

### Principi

- **Errori come opportunita**: Ogni fallimento e un'opportunita di apprendimento
- **Determinismo prima di tutto**: Spostare complessita nel codice deterministico
- **Documenta sempre**: Ogni correzione deve essere registrata
- **Non ripetere errori**: I pattern di errore diventano regole

### Integrazione con Learning System

Il ciclo di auto-correzione alimenta il sistema di learning:
- Errori ricorrenti -> Pattern in `instincts.json`
- Confidence >= 0.7 -> Promozione a skill via `/evolve`

---

## Integrazione con Learning System

### Flusso Learning

```
Errore rilevato
      |
      v
Analisi Pattern
      |
      v
instincts.json (confidence < 0.7)
      |
      v
Validazione Ricorrente
      |
      v
/evolve -> Skill permanente
```

### File Coinvolti

| File | Scopo |
|------|-------|
| `learnings/instincts.json` | Pattern di errore e correzioni |
| `docs/worklog.md` | Log delle correzioni applicate |
| `skills/evolve.md` | Skill per promozione pattern |

---

## Moduli Core Dettaglio

### ChaosInjector

Iniezione controllata di fallimenti per test di resilienza.

```python
from lib.facade import ChaosInjector, FailureType

injector = ChaosInjector(config={
    "failure_type": FailureType.LATENCY,
    "injection_rate": 0.1,
    "intensity": 0.5
})
```

### DistributedLockManager

Coordinazione distribuita con Redis backend.

```python
from lib.facade import DistributedLockManager

lock_manager = DistributedLockManager(backend="redis")
with lock_manager.acquire("critical_section", ttl=30):
    # Operazione protetta
    pass
```

### RoutingEngineV2

Routing ML-based con 4-layer keyword matching.

```python
from lib.facade import RoutingEngineV2

router = RoutingEngineV2()
agent = router.select_agent("implement user authentication")
# Returns: best matching agent with confidence score
```

---

## Performance Metrics (V15.1.0)

| Metrica | Valore |
|---------|--------|
| Throughput | 9015 ops/sec |
| Memory per operation | 39.82 bytes |
| Error rate | 0% |
| Cold start latency | <100ms |
| Pattern accuracy | >90% |
| Budget calculation | <5ms |
| Facade import time | <10ms |

---

## Riferimenti

- [Roadmap V15.1](../roadmap-v15.1.md)
- [ADR-001 Documentation Location](../adr/ADR-001-documentation-location.md)
- [Rules README](../../rules/README.md)
