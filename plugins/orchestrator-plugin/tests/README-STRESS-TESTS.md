# ORCHESTRATOR STRESS TEST SUITE - GUIDA ESECUZIONE

## Overview

Sistema di stress testing per validare la resilienza del fallback system dell'Orchestrator quando 50+ agent non esistono nel filesystem.

**Obiettivi:**
- ✅ Validare fallback system in scenari estremi
- ✅ Misurare performance degradation con agent mancanti
- ✅ Identificare breaking points del sistema
- ✅ Documentare gap tra comportamento teorico e reale

---

## Quick Start

### 1. Installazione Dipendenze

```bash
cd "C:\Users\LeoDg\.claude\Sviluppo Plugin\Orchestrator"
npm install
```

### 2. Esecuzione Test Suite Completa

```bash
# Esegui tutti gli stress test (MILD, MEDIUM, EXTREME)
npm run stress-test

# O direttamente con ts-node
npx ts-node src/tests/stress-test-suite.ts
```

### 3. Esecuzione Singolo Scenario

```bash
# Modifica stress-test-suite.ts per eseguire solo uno scenario:
# const STRESS_TEST_SCENARIOS = [
#   STRESS_TEST_SCENARIOS[0]  // Solo MILD_STRESS_10_AGENTS
# ];

npx ts-node src/tests/stress-test-suite.ts
```

---

## Test Scenarios Configurati

### SCENARIO 1: MILD_STRESS_10_AGENTS
**Target:** Task medio con 10 agent non trovati (77% fallback rate)

```typescript
Configurazione:
├── Non-existent agents: 10
├── Task complexity: medium
├── Parallelism level: 2 (sub-tasks)
├── Expected fallbacks: 10
├── Timeout: 30 minutes

Agent Distribution:
├── L1 (Principal): 3 agents (tutti esistono) ✅
├── L2 (Sub-tasks): 7 agents (tutti NON esistono) ❌
└── Total: 10 agent tentati, 7 fallback

Expected Results:
├── Fallback success rate: 90%+
├── Performance degradation: 40-60%
├── Parallel efficiency: 70%+
└── Risk level: LOW
```

### SCENARIO 2: MEDIUM_STRESS_30_AGENTS
**Target:** Task complesso multi-dominio con 30 agent non trovati (86% fallback rate)

```typescript
Configurazione:
├── Non-existent agents: 30
├── Task complexity: high
├── Parallelism level: 3 (micro-tasks)
├── Expected fallbacks: 30
├── Timeout: 120 minutes

Agent Distribution:
├── L1 (Principal): 5 agents (tutti esistono) ✅
├── L2 (Sub-tasks): 14 agents (tutti NON esistono) ❌
├── L3 (Micro-tasks): 11 agents (tutti NON esistono) ❌
└── Total: 30 agent tentati, 25 fallback

Expected Results:
├── Fallback success rate: 85%+
├── Performance degradation: 200-400%
├── Parallel efficiency: 50%+
└── Risk level: MEDIUM-HIGH
```

### SCENARIO 3: EXTREME_STRESS_50_AGENTS
**Target:** Task enterprise con 50+ agent non trovati (88% fallback rate)

```typescript
Configurazione:
├── Non-existent agents: 56
├── Task complexity: extreme
├── Parallelism level: 3 (full hierarchy)
├── Expected fallbacks: 56
├── Timeout: 240 minutes

Agent Distribution:
├── L1 (Principal): 8 agents (tutti esistono) ✅
├── L2 (Sub-tasks): 32 agents (tutti NON esistono) ❌
├── L3 (Micro-tasks): 24 agents (tutti NON esistono) ❌
└── Total: 64 agent tentati, 56 fallback

Expected Results:
├── Fallback success rate: 80%+
├── Performance degradation: 800-1200%
├── Parallel efficiency: 30-40%
└── Risk level: HIGH-CRITICAL
```

---

## Output Interpretazione

### Console Output Format

```
🔥 ORCHESTRATOR STRESS TEST SUITE V1.0 - STARTED

📊 Total scenarios: 3
🎯 Target: Validate fallback resilience with 50+ non-existent agents

================================================================================
🧪 SCENARIO: MILD_STRESS_10_AGENTS
================================================================================

🔍 PHASE 1: AGENT DISCOVERY & VALIDATION
├─ Validating 10 agent files...
│  ✅ FOUND: experts/gui-super-expert.md
│  ✅ FOUND: experts/database_expert.md
│  ✅ FOUND: core/coder.md
│  ❌ NOT FOUND: experts/gui-layout-specialist.md
│  ❌ NOT FOUND: experts/gui-widget-creator.md
│  ... (più agent)
├─ Validation complete in 24.5ms
├─ Valid agents: 3/10
└─ Missing agents: 7/10

⚡ PHASE 2: ORCHESTRATION SIMULATION
├─ Simulating 2-level orchestration...
│  🔄 FALLBACK: experts/gui-layout-specialist.md → experts/gui-super-expert.md
│  🔄 FALLBACK: experts/gui-widget-creator.md → experts/gui-super-expert.md
│  ... (più fallback)
├─ Orchestration complete in 18500.2ms
├─ Attempted: 10
├─ Successful: 3
├─ Failed (fallback): 7
└─ Cascades: 7

🔄 PHASE 3: FALLBACK SYSTEM TESTING
├─ Testing fallback for 7 missing agents...
│  ✅ Fallback success: experts/gui-layout-specialist.md → experts/gui-super-expert.md (15.2ms)
│  ... (più test)
├─ Fallback triggers: 7
├─ Fallback successes: 7
├─ Success rate: 100.0%
└─ Avg recovery time: 18.3ms

📊 PHASE 4: PERFORMANCE ANALYSIS
... (metriche complete)

🎯 PHASE 5: ANALYSIS & SCORING
... (analisi dettagliata)

📊 TEST RESULT SUMMARY
────────────────────────────────────────────────────────────────────────────────
Status: ✅ PASSED
Grade: B (Score: 82.5/100)
Risk Level: MEDIUM

⏱️  Performance:
├─ Total Time: 18524ms
├─ Theoretical Time: 5625ms
├─ Degradation: 229.3%
└─ Parallel Efficiency: 30.3%

🔄 Fallback System:
├─ Triggered: 7
├─ Success Rate: 100.0%
├─ Avg Recovery: 18.3ms
└─ Cascades: 7

🎯 Agent Execution:
├─ Attempted: 10
├─ Successful: 3
├─ Failed: 7
└─ Not Found: 7

✅ Strengths:
├─ Excellent fallback success rate: 100.0%
└─ Fast fallback recovery: 18.3ms avg

⚠️  Weaknesses:
├─ Moderate performance degradation: 229.3%

💡 Recommendations:
├─ Optimize fallback execution to reduce overhead
```

### Results File (JSON)

Tutti i risultati vengono salvati in `stress-test-results.json`:

```json
[
  {
    "config": {
      "name": "MILD_STRESS_10_AGENTS",
      "description": "Task medio con 10 agent non trovati",
      "nonExistentAgents": 10,
      ...
    },
    "metrics": {
      "totalTimeMs": 18524.3,
      "theoreticalTimeMs": 5625.0,
      "degradationPercent": 229.3,
      "fallbackSuccessRate": 100.0,
      ...
    },
    "analysis": {
      "overallScore": 82.5,
      "grade": "B",
      "strengths": [...],
      "weaknesses": [...],
      "recommendations": [...]
    },
    "success": true,
    "logs": [...],
    "errors": []
  }
]
```

---

## Metriche Chiave

### Performance Metrics

| Metrica | Descrizione | Target |
|---------|-------------|--------|
| **Total Time** | Tempo totale esecuzione test | < 2x teorico |
| **Theoretical Time** | Tempo ideale (parallelismo perfetto, no fallback) | Baseline |
| **Degradation %** | Percentuale slowdown vs teorico | < 100% |
| **Parallel Efficiency** | Efficienza parallelismo effettivo | > 60% |

### Fallback Metrics

| Metrica | Descrizione | Target |
|---------|-------------|--------|
| **Fallbacks Triggered** | Numero fallback attivati | = expected |
| **Fallback Success Rate** | % fallback riusciti | > 90% |
| **Avg Recovery Time** | Tempo medio per fallback | < 500ms |
| **Cascades** | Numero cascade di fallback | < triggers |

### Execution Metrics

| Metrica | Descrizione | Target |
|---------|-------------|--------|
| **Agents Attempted** | Agent tentati | = configured |
| **Agents Successful** | Agent eseguiti con successo | ≥ valid agents |
| **Agents Failed** | Agent falliti | = missing agents |
| **Agents Not Found** | Agent non trovati nel filesystem | = expected |

### Grading System

| Grade | Score | Interpretazione |
|-------|-------|-----------------|
| **A** | 90-100 | Eccellente: Sistema robusto, fallback efficace |
| **B** | 80-89 | Buono: Sistema funzionante, alcuni miglioramenti possibili |
| **C** | 70-79 | Accettabile: Fallback funziona, performance degradate |
| **D** | 60-69 | Marginale: Fallback parziale, rischi significativi |
| **F** | 0-59 | Fallimento: Sistema non resiliente |

### Risk Levels

| Risk Level | Criteri | Azione |
|------------|---------|--------|
| **LOW** | Score > 80, no critical issues | ✅ Production ready |
| **MEDIUM** | Score 70-80, weaknesses presenti | ⚠️ Monitor in produzione |
| **HIGH** | Score 60-70, critical issues | 🔧 Fix prima di produzione |
| **CRITICAL** | Score < 60 o ≥3 critical issues | 🚨 Blocca produzione |

---

## Troubleshooting

### Problema: Test timeout

```bash
Error: Test exceeded timeout of 30 minutes
```

**Soluzione:**
- Aumenta timeout in `StressTestConfig.timeoutMinutes`
- Riduci numero agent nel test
- Verifica performance sistema

### Problema: Agent validation fallisce

```bash
Error: Cannot access agents directory
```

**Soluzione:**
```bash
# Verifica path corretto
cd "C:\Users\LeoDg\.claude"
ls agents/  # Deve mostrare core/ e experts/

# Imposta working directory corretta nel test
```

### Problema: Fallback success rate basso

```
Fallback Success Rate: 45.2% ⚠️
```

**Causa:** Fallback mapping incompleto

**Soluzione:**
- Verifica fallback mapping in `findFallbackAgent()`
- Aggiungi mapping mancanti
- Implementa ultimate fallback a `core/coder.md`

### Problema: Performance degradation estrema

```
Degradation: 1500% 🚨
```

**Causa:** Fallback serializzati invece che paralleli

**Soluzione:**
- Implementa parallel fallback execution
- Usa batching per fallback recovery
- Riduce overhead per agent validation

---

## Quick Fix Implementation

Se i test rivelano problemi critici, applica quick fix:

### Fix 1: Disable Sub-Agent Spawning

```typescript
// In orchestrator-core.ts
async generateHierarchicalTasks(tasks: AgentTask[]): Promise<AgentTask[]> {
  // QUICK FIX: Disabilita spawning temporaneamente
  const allTasks = tasks.map(task => ({
    ...task,
    allowSubSpawning: false,
    complexityThreshold: 1.0,
    maxSubTasks: 0
  }));

  return allTasks;
}
```

### Fix 2: Agent File Validation

```typescript
// In orchestrator-core.ts - AGGIUNGI questo metodo
private async validateAgentFile(agentPath: string): Promise<boolean> {
  const fullPath = path.join(process.cwd(), 'agents', agentPath);
  try {
    await fs.access(fullPath, fs.constants.R_OK);
    return true;
  } catch {
    console.warn(`⚠️ Agent file not found: ${agentPath}`);
    return false;
  }
}

// USA prima di executeAgent
private async executeAgent(task: AgentTask): Promise<TaskResult> {
  const isValid = await this.validateAgentFile(task.agentExpertFile);

  if (!isValid) {
    // Fallback
    const fallback = this.getFallbackAgent(task.agentExpertFile);
    console.log(`🔄 FALLBACK: ${task.agentExpertFile} → ${fallback}`);
    task.agentExpertFile = fallback;
  }

  // ... resto esecuzione
}
```

### Fix 3: Intelligent Fallback Mapping

```typescript
// In orchestrator-core.ts - AGGIUNGI questo metodo
private getFallbackAgent(invalidAgent: string): string {
  const fallbackMap = {
    // GUI specialists → gui-super-expert
    'experts/gui-layout-specialist.md': 'experts/gui-super-expert.md',
    'experts/gui-widget-creator.md': 'experts/gui-super-expert.md',
    'experts/gui-event-handler.md': 'experts/gui-super-expert.md',

    // Database specialists → database_expert
    'experts/db-schema-designer.md': 'experts/database_expert.md',
    'experts/db-migration-specialist.md': 'experts/database_expert.md',
    'experts/db-query-optimizer.md': 'experts/database_expert.md',

    // Security specialists → security_unified_expert
    'experts/security-auth-specialist.md': 'experts/security_unified_expert.md',
    'experts/security-encryption-expert.md': 'experts/security_unified_expert.md',

    // Ultimate fallback
    'default': 'core/coder.md'
  };

  return fallbackMap[invalidAgent] || fallbackMap['default'];
}
```

---

## Next Steps

### Dopo Test Execution

1. **Analizza risultati** in `stress-test-results.json`
2. **Identifica problemi critici** (grade F o risk CRITICAL)
3. **Implementa quick fixes** se necessario
4. **Re-run test** per validare fixes
5. **Documenta findings** in analysis report

### Se Test Passano (Grade B+)

✅ Sistema sufficientemente resiliente
✅ Fallback system funzionante
✅ Può procedere a next development phase

### Se Test Falliscono (Grade D-F)

🚨 BLOCCO PRODUZIONE
🔧 Implementa tutti i quick fixes
📝 Documenta gap architetturali
⏸️ Pausa development fino a stabilizzazione

---

## Contacts & Support

**Documentazione:**
- Analysis Report: `orchestrator-fallback-analysis.md`
- Test Suite: `stress-test-suite.ts`
- Results: `stress-test-results.json`

**Issues:**
Report bugs o problemi via sistema issue tracker

---

**READY TO TEST ORCHESTRATOR RESILIENCE!** 🔥
