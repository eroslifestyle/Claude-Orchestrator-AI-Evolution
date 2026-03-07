# ORCHESTRATOR PLUGIN - ANALISI GLOBALE

## Statistiche Codebase

| Metrica | Valore |
|---------|--------|
| **File TypeScript** | 94 |
| **Linee di Codice** | 74,260 |
| **Moduli Principali** | 15+ |
| **Max Agent Paralleli** | 64 |

---

## ARCHITETTURA MODULARE

### 1. CORE ENGINE (`src/core/`)
- **orchestrator-engine.ts** - Engine principale Level 4
  - Coordinazione fino a 64 agent paralleli
  - Gestione dipendenze complesse
  - Task decomposition intelligente
  - ML-based cost prediction

### 2. EXECUTION (`src/execution/`)
| File | Funzione |
|------|----------|
| `ParallelExecutionRule.ts` | Esecuzione simultanea multi-agent |
| `AgentContextManager.ts` | Clear contesto automatico |
| `ErrorRecoveryManager.ts` | Gestione errori + escalation |
| `TokenBudgetManager.ts` | Budget token + auto-decomposizione |
| `DependencyGraphBuilder.ts` | Costruzione grafo dipendenze |
| `task-launcher.ts` | Lancio task con Tool API |

### 3. PARALLEL (`src/parallel/`)
| File | Funzione |
|------|----------|
| `AdvancedParallelEngine.ts` | Engine parallelo avanzato |
| `MultiLevelCoordinator.ts` | Coordinatore multi-livello |
| `DynamicSubTaskSpawner.ts` | Spawn dinamico subtask |
| `ResourceAutoScaler.ts` | Auto-scaling risorse |
| `batch-execution-manager.ts` | Gestione batch |
| `error-handling-system.ts` | Sistema errori parallelo |

### 4. ANALYSIS (`src/analysis/`)
- **KeywordExtractor.ts** - Estrazione keyword NLP
- **analysis-engine.ts** - Engine analisi completo
- **tiers/** - Analizzatori per tier (fast/smart/deep)

### 5. ROUTING (`src/routing/`)
- **AgentRouter.ts** - Routing agent intelligente
- **ModelSelector.ts** - Selezione modello (haiku/sonnet/opus)
- **SmartAgentRouter.ts** - Routing con fallback automatico

### 6. LOGGING (`src/logging/`)
- **OrchestratorVisualizer.ts** - Visualizzazione real-time completa

### 7. ML (`src/ml/`)
- **CostPredictionEngine.ts** - Predizione costi con ML

### 8. RESILIENCE (`src/resilience/`)
- **UltraResilientFallback.ts** - Sistema fallback ultra-resiliente

### 9. CCH - Central Communication Hub (`src/cch/`)
- Hub comunicazione centralizzato
- Message queue unificata
- Fault tolerance layer

---

## REGOLE IMPLEMENTATE

### REGOLA 1: Esecuzione Parallela Multi-Agent
```
Quando ci sono N task senza dipendenze reciproche,
eseguili TUTTI simultaneamente con N agent.
Rispetta SOLO le dipendenze esplicite.
```

**File:** `ParallelExecutionRule.ts`
- Rileva task indipendenti automaticamente
- Raggruppa per livello di dipendenza
- Calcola critical path
- Speedup factor fino a 64x

### REGOLA 2: Clear Contesto Prima di Ogni Agent
```
Prima di OGNI esecuzione agent:
1. Clear della conversazione precedente
2. Reset del contesto
3. Preload solo info essenziali
```

**File:** `AgentContextManager.ts`
- Clear automatico pre-esecuzione
- Batch clear per esecuzioni parallele
- Tracking statistiche token

### REGOLA 3: Visualizzazione Completa
```
Visualizza TUTTI i messaggi durante l'esecuzione
per seguire il lavoro totale dell'orchestrator.
```

**File:** `OrchestratorVisualizer.ts`
- Log real-time di ogni attivita
- Tracking agent e task
- Report finale dettagliato
- Output colorato

### REGOLA 4: Gestione Errori e Recovery
```
Su errore:
1. Retry automatico con backoff
2. Fallback ad agent alternativo
3. Escalation a model superiore
4. Circuit breaker per agent problematici
```

**File:** `ErrorRecoveryManager.ts`
- Retry con backoff esponenziale
- Escalation: haiku -> sonnet -> opus
- Circuit breaker threshold configurabile

### REGOLA 5: Token Budget Management
```
Mantenere SEMPRE utilizzo token sotto 50-70%
perche oltre si degradano performance e risultato.
Se necessario, decomporre il problema.
```

**File:** `TokenBudgetManager.ts`
- Zone: GREEN (0-50%), YELLOW (50-70%), RED (70-85%), CRITICAL (85%+)
- Auto-decomposizione in zona RED
- Clear forzato in zona CRITICAL
- Strategie di split: by_phase, by_component, by_subtask

---

## FLUSSO DI ESECUZIONE

```
1. ANALISI REQUEST
   |-> KeywordExtractor (NLP)
   |-> DomainClassification
   |-> ComplexityAnalysis

2. PIANIFICAZIONE
   |-> TaskDecomposition
   |-> DependencyGraphBuilder
   |-> ParallelExecutionPlan

3. PRE-ESECUZIONE
   |-> TokenBudgetCheck
   |-> AgentContextClear
   |-> ResourceAllocation

4. ESECUZIONE PARALLELA
   |-> BatchExecution (Promise.allSettled)
   |-> RealTimeVisualization
   |-> ProgressTracking

5. ERROR HANDLING
   |-> Retry/Fallback/Escalation
   |-> CircuitBreaker
   |-> Recovery

6. SINTESI
   |-> ResultAggregation
   |-> FinalReport
   |-> MetricsCollection
```

---

## CONFIGURAZIONE DEFAULT

```typescript
{
  // Parallelismo
  maxConcurrentAgents: 64,
  enableAggressiveParallel: true,

  // Context Management
  clearBeforeEachExecution: true,
  maxTokensBeforeAutoClear: 50000,

  // Token Budget
  greenThresholdPercent: 50,
  yellowThresholdPercent: 70,
  redThresholdPercent: 85,
  autoDecomposeOnRed: true,

  // Error Recovery
  maxRetries: 3,
  retryBackoffMultiplier: 2,
  enableAutoEscalation: true,
  circuitBreakerThreshold: 5,

  // Visualization
  showTimestamps: true,
  showAgentActivity: true,
  showTaskProgress: true,
  colorOutput: true
}
```

---

## MODELLI SUPPORTATI

| Modello | Uso | Costo Relativo |
|---------|-----|----------------|
| **Haiku** | Task ripetitivi, semplici | 1x |
| **Sonnet** | Task standard | 5x |
| **Opus** | Task critici, complessi | 25x |

---

## FILE CREATI OGGI (2026-02-03)

1. `src/execution/ParallelExecutionRule.ts` - Regola parallela
2. `src/execution/AgentContextManager.ts` - Context manager
3. `src/execution/ErrorRecoveryManager.ts` - Error recovery
4. `src/execution/TokenBudgetManager.ts` - Token budget
5. `src/logging/OrchestratorVisualizer.ts` - Visualizzazione
6. `src/run-integrated-stress-test.ts` - Stress test integrato
7. `tests/multi-agent-simultaneity.test.ts` - Test suite
8. `src/execution/index.ts` - Index moduli
9. `src/logging/index.ts` - Index logging

---

## COME ESEGUIRE

```bash
# Stress Test Integrato
npx ts-node src/run-integrated-stress-test.ts

# Con parametri custom
npx ts-node src/run-integrated-stress-test.ts --tasks 100 --agents 64

# Test Suite
npm test -- tests/multi-agent-simultaneity.test.ts
```
