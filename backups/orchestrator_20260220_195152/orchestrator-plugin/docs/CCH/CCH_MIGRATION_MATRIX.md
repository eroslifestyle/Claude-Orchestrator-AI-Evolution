# CCH MIGRATION MATRIX - Valutazione Impatto Central Communication Hub

> **Versione:** 1.0
> **Data:** 1 Febbraio 2026
> **Scopo:** Valutazione impatto migrazione agent esistenti a Central Communication Hub (CCH)
> **Status:** ANALISI COMPLETATA

---

## EXECUTIVE SUMMARY

### Architettura Attuale (V3.0)
```
Orchestrator (HUB)
    ↓ (pub/sub implicito)
Core Agents (6) + Expert Agents (21) + Plugin Orchestrator
    ↓ (comunicazione PROTOCOL.md basata)
Messaggi JSON strutturati
```

### Architettura Target (CCH)
```
Central Communication Hub (UMQ + URE + CPM + FTL + OM)
    ↓ (pub/sub persistente con routing intelligente)
Tutti gli agent (core + experts + plugin)
    ↓ (fault tolerance + observability)
Messaggi tipizzati con tracing
```

### Impatto Alto Livello
| Metrica | Valore | Note |
|---------|--------|------|
| **Agent Totali** | 27 | 6 core + 21 experts |
| **Compatibilità Out-of-the-box** | 0% | Tutti richiedono modifiche |
| **Breaking Changes** | ALTI | Protocollo messaggi completamente diverso |
| **Migration Effort** | HIGH | 40-60 ore stimate |
| **Rischio Migrazione** | MEDIUM-HIGH | Richiede testing approfondito |

---

## 1. MATRICE COMPATIBILITÀ AGENT

### 1.1 CORE AGENTS (6)

| Agent | File | Compatibility | Migration Effort | Breaking Changes | Recommended Actions |
|-------|------|---------------|------------------|------------------|---------------------|
| **Orchestrator** | `core/orchestrator.md` | **NO** | **HIGH** | - Sistema di routing completamente diverso<br>- Gestione task dipende da UMQ<br>- Context pooling richiede CPM | 1. Rewrite routing layer per usare URE<br>2. Integrare CPM per context management<br>3. Sostituire PROTOCOL.md con UMQ message types<br>4. Aggiungere tracing OM |
| **Analyzer** | `core/analyzer.md` | **PARTIAL** | **MEDIUM** | - Output format deve usare UMQ messages<br>- Handoff a orchestrator cambia | 1. Wrappare output PROTOCOL.md in UMQ messages<br>2. Aggiungere tracing ID ai report<br>3. Integrare con FTL per retry logic |
| **Coder** | `core/coder.md` | **PARTIAL** | **MEDIUM** | - Task receipt da UMQ invece di orchestrator diretto<br>- File reporting deve usare CCH events | 1. Implementare UMQ subscriber per task<br>2. Pubblicare progress su UMQ topics<br>3. Usare CPM per context caching |
| **Reviewer** | `core/reviewer.md` | **PARTIAL** | **MEDIUM** | - Input/Output via UMQ<br>- Approval workflow deve integrare FTL | 1. Sottoscrivere code "review_required"<br>2. Pubblicare su "review_complete"<br>3. Integrare DLQ per rejected code |
| **Documenter** | `core/documenter.md` | **PARTIAL** | **MEDIUM** | - TODOLIST updates via UMQ events<br>- Documentation sync deve usare CCH | 1. Sottoscrivere "task_completed" events<br>2. Pubblicare "doc_updated" events<br>3. Integrare con OM per metrics |
| **System Coordinator** | `core/system_coordinator.md` | **PARTIAL** | **MEDIUM** | - Resource tracking deve usare OM<br>- Token budgeting richiede nuovi metrics | 1. Integrare OM per metrics collection<br>2. Sostituire tracking manuale con OM events<br>3. Implementare health check via CCH |

### 1.2 EXPERT AGENTS (21)

| Agent | File | Compatibility | Migration Effort | Breaking Changes | Recommended Actions |
|-------|------|---------------|------------------|------------------|---------------------|
| **GUI Super Expert** | `experts/gui-super-expert.md` | **YES** | **LOW** | - Input format standardizzabile<br>- Output già strutturato | 1. Aggiungere UMQ message wrapper<br>2. Integrare tracing ID<br>3. Aggiungere retry logic per UI operations |
| **Integration Expert** | `experts/integration_expert.md` | **YES** | **LOW** | - API integration patterns compatibili<br>- Rate limiting può usare FTL | 1. Implementare circuit breaker via FTL<br>2. Usare DLQ per failed API calls<br>3. Integrare tracing per API requests |
| **Database Expert** | `experts/database_expert.md` | **YES** | **LOW** | - Query patterns già resilienti<br>- Connection pooling compatibile | 1. Sottoscrivere "db_task" queue<br>2. Pubblicare query metrics su OM<br>3. Integrare FTL per retry queries |
| **Security Unified Expert** | `experts/security_unified_expert.md` | **YES** | **LOW-MEDIUM** | - Security review può usare CCH events<br>- Audit logging integrabile con OM | 1. Pubblicare "security_scan" events<br>2. Integrare findings con OM metrics<br>3. Implementare DLQ per failed scans |
| **Trading Strategy Expert** | `experts/trading_strategy_expert.md` | **YES** | **LOW** | - Trading signals già strutturati<br>- Risk management compatibile | 1. Pubblicare segnali su dedicated topic<br>2. Usare FTL per trade retry logic<br>3. Integrare con OM per P&L tracking |
| **MQL Expert** | `experts/mql_expert.md` | **YES** | **LOW** | - EA code generation già modulare<br>- MT5 integration compatibile | 1. Sottoscrivere "mql_task" queue<br>2. Pubblicare EA metrics su OM<br>3. Implementare retry per MT5 API |
| **Tester Expert** | `experts/tester_expert.md` | **YES** | **LOW-MEDIUM** | - Test results già strutturati<br>- Coverage tracking compatibile | 1. Pubblicare "test_run" events<br>2. Integrare coverage metrics con OM<br>3. Usare DLQ per failed tests |
| **Architect Expert** | `experts/architect_expert.md` | **YES** | **LOW** | - Design decisions già documentate<br>- ADR integration possibile | 1. Pubblicare "architecture_decision" events<br>2. Integrare con OM per design metrics<br>3. Implementare versioning per ADR |
| **DevOps Expert** | `experts/devops_expert.md` | **YES** | **LOW** | - CI/CD patterns già standard<br>- Pipeline monitoring compatibile | 1. Integrare pipeline events con OM<br>2. Usare FTL for deployment rollback<br>3. Implementare health checks |
| **Languages Expert** | `experts/languages_expert.md` | **YES** | **LOW** | - Language patterns già modulari<br>- Code snippets già versioned | 1. Sottoscrivere "language_task" queue<br>2. Pubblicare snippet metrics su OM<br>3. Implementare caching via CPM |
| **AI Integration Expert** | `experts/ai_integration_expert.md` | **YES** | **LOW-MEDIUM** | - LLM patterns già resilienti<br>- Prompt engineering compatibile | 1. Integrare LLM calls con FTL<br>2. Tracciare token usage via OM<br>3. Implementare DLQ per failed prompts |
| **Claude Systems Expert** | `experts/claude_systems_expert.md` | **YES** | **LOW** | - Cost tracking già presente<br>- API optimization compatibile | 1. Pubblicare "claude_api_call" events<br>2. Integrare cost metrics con OM<br>3. Implementare rate limiting via FTL |
| **Mobile Expert** | `experts/mobile_expert.md` | **YES** | **LOW** | - Mobile patterns già standard<br>- Platform separation compatibile | 1. Sottoscrivere "mobile_task" queue<br>2. Pubblicare build metrics su OM<br>3. Implementare retry per build failures |
| **N8N Expert** | `experts/n8n_expert.md` | **YES** | **LOW** | - Workflow patterns già definiti<br>- Automation compatibile | 1. Pubblicare "workflow_exec" events<br>2. Integrare con OM per automation metrics<br>3. Implementare DLQ per failed workflows |
| **Social Identity Expert** | `experts/social_identity_expert.md` | **YES** | **LOW** | - OAuth patterns già standard<br>- Provider separation compatibile | 1. Pubblicare "auth_flow" events<br>2. Integrare con OM for auth metrics<br>3. Implementare retry for OAuth calls |
| **API Design Specialist** | `experts/api-design-specialist.md` | **YES** | **LOW** | - API design patterns già definiti<br>- OpenAPI compatibile | 1. Pubblicare "api_design" events<br>2. Integrare con OM per API metrics<br>3. Implementare versioning |
| **DB Schema Designer** | `experts/db-schema-designer.md` | **YES** | **LOW** | - Schema patterns già definiti<br>- Migration compatibile | 1. Pubblicare "schema_change" events<br>2. Integrare con OM per schema metrics<br>3. Implementante migration tracking |
| **GUI Layout Specialist** | `experts/gui-layout-specialist.md` | **YES** | **LOW** | - Layout patterns già definiti<br>- Responsive compatibile | 1. Sottoscrivere "layout_task" queue<br>2. Pubblicare layout metrics su OM<br>3. Implementare caching via CPM |
| **Integration Coordinator** | `experts/integration-coordinator.md` | **YES** | **LOW-MEDIUM** | - Coordination patterns già definiti<br>- Multi-integration compatibile | 1. Implementare orchestrazione via UMQ<br>2. Integrare con OM per coordination metrics<br>3. Implementare fallback per integrations |
| **Security Auth Specialist** | `experts/security-auth-specialist.md` | **YES** | **LOW** | - Auth patterns già standard<br>- Provider separation compatibile | 1. Pubblicare "auth_implement" events<br>2. Integrare con OM per auth metrics<br>3. Implementare retry per auth failures |
| **Documenter Expert** | `experts/documenter_expert.md` | **PARTIAL** | **MEDIUM** | - Documentation patterns dipendono da orchestrator<br>- Sync logic deve cambiare | 1. Implementare subscription a "doc_required"<br>2. Pubblicare "doc_updated" events<br>3. Integrare con OM per doc metrics |

---

## 2. BREAKING CHANGES DETTAGLIATI

### 2.1 PROTOCOLLO COMUNICAZIONE

#### Attuale (V3.0)
```typescript
// PROTOCOL.md based
interface AgentResponse {
  agent: string;
  task_id: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'BLOCKED';
  model_used: 'haiku' | 'sonnet' | 'opus';
  timestamp: string;
  summary: string;
  details: any;
  files_modified: FileChange[];
  issues_found: Issue[];
  next_actions: string[];
  handoff: {
    to: 'orchestrator';
    context: string;
  };
}
```

#### Target (CCH)
```typescript
// CCH Message Types
interface CCHMessage {
  message_type: 'TASK_REQUEST' | 'TASK_RESPONSE' | 'STATUS_UPDATE' | 'ESCALATION_REQUEST';
  message_id: string;              // UUID
  correlation_id: string;          // Per tracing
  timestamp: string;
  from_agent: string;
  to_agent: string;
  topic: string;                   // UMQ topic
  payload: {
    task_id?: string;
    status?: TaskStatus;
    data: any;
    metadata: MessageMetadata;
  };
  retry_policy: RetryPolicy;
  circuit_breaker: CircuitBreakerConfig;
}

interface MessageMetadata {
  priority: PriorityLevel;
  estimated_cost: number;
  timeout_ms: number;
  tracing: TracingInfo;
  fault_tolerance: FaultToleranceConfig;
}
```

### 2.2 ROUTING

#### Attuale (V3.0)
```typescript
// Keyword-based routing in orchestrator-core.ts
const KEYWORD_TO_EXPERT_MAPPING = {
  'gui': 'experts/gui-super-expert.md',
  'database': 'experts/database_expert.md',
  // ...
};
```

#### Target (CCH)
```typescript
// URE (Unified Router Engine) with LRU cache
interface UREConfig {
  routing_table: Map<string, AgentDefinition>;
  cache_config: LRUCacheConfig;
  fallback_strategy: FallbackStrategy;
  load_balancing: LoadBalancingStrategy;
}
```

### 2.3 CONTEXT MANAGEMENT

#### Attuale (V3.0)
```typescript
// Context passato manualmente tra agent
interface SharedContext {
  from_task_id: string;
  from_agent: string;
  summary: string;
  key_findings: string[];
  files_analyzed: string[];
}
```

#### Target (CCH)
```typescript
// CPM (Context Pool Manager) with reusable contexts
interface ContextPool {
  active_contexts: Map<string, PooledContext>;
  context_templates: Map<string, ContextTemplate>;
  reuse_policy: ContextReusePolicy;
  eviction_policy: EvictionPolicy;
}

interface PooledContext {
  context_id: string;
  template_id: string;
  data: any;
  metadata: ContextMetadata;
  access_count: number;
  last_accessed: Date;
  ttl_ms: number;
}
```

### 2.4 FAULT TOLERANCE

#### Attuale (V3.0)
```typescript
// Retry logic manuale in agent
interface RetryConfig {
  max_retries: number;
  backoff: 'fixed' | 'exponential';
}
```

#### Target (CCH)
```typescript
// FTL (Fault Tolerance Layer) completo
interface FTLConfig {
  circuit_breaker: CircuitBreakerConfig;
  retry_policy: RetryPolicy;
  dead_letter_queue: DLQConfig;
  bulkhead: BulkheadConfig;
  timeout: TimeoutConfig;
}

interface CircuitBreakerConfig {
  failure_threshold: number;
  success_threshold: number;
  open_timeout_ms: number;
  half_open_max_calls: number;
}
```

### 2.5 OBSERVABILITY

#### Attuale (V3.0)
```typescript
// Logging manuale in agent
this.logger.info('Task completed', { task_id, status });
```

#### Target (CCH)
```typescript
// OM (Observability Module) integrato
interface OMMetrics {
  counter: CounterMetric[];
  gauge: GaugeMetric[];
  histogram: HistogramMetric[];
  tracing: TracingSpan[];
}

interface TracingSpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation_name: string;
  start_time: Date;
  end_time: Date;
  tags: Map<string, string>;
  events: TraceEvent[];
}
```

---

## 3. MIGRATION EFFORT STIMATO

### 3.1 Per Componente

| Componente | Ore | Persone | Dipendenze | Rischio |
|------------|-----|---------|------------|---------|
| **UMQ Implementation** | 16h | 1 Senior Dev | Nessuna | MEDIUM |
| **URE Implementation** | 12h | 1 Senior Dev | UMQ | MEDIUM |
| **CPM Implementation** | 8h | 1 Mid Dev | UMQ | LOW |
| **FTL Implementation** | 12h | 1 Senior Dev | UMQ | MEDIUM |
| **OM Implementation** | 8h | 1 Mid Dev | Nessuna | LOW |
| **Orchestrator Rewrite** | 20h | 1 Senior Dev | Tutti | HIGH |
| **Core Agents Migration** | 16h | 2 Mid Dev | Orchestrator | MEDIUM |
| **Expert Agents Migration** | 24h | 2 Mid Dev | Core Agents | MEDIUM |
| **Plugin Integration** | 12h | 1 Senior Dev | Tutti | HIGH |
| **Testing & Validation** | 24h | 2 QA | Tutti | HIGH |
| **Documentation** | 8h | 1 Tech Writer | Tutti | LOW |
| **TOTALE** | **160h** | **4 persone** | - | **HIGH** |

### 3.2 Per Fase

#### FASE 1: Foundation (40h)
- UMQ Implementation (16h)
- URE Implementation (12h)
- CPM Implementation (8h)
- OM Implementation (4h)

#### FASE 2: Fault Tolerance (12h)
- FTL Implementation (12h)

#### FASE 3: Orchestrator Rewrite (32h)
- Orchestrator Rewrite (20h)
- Plugin Integration (12h)

#### FASE 4: Agents Migration (40h)
- Core Agents Migration (16h)
- Expert Agents Migration (24h)

#### FASE 5: Testing & Docs (36h)
- Testing & Validation (24h)
- Documentation (8h)
- Buffer & Fixes (4h)

---

## 4. ROLLBACK STRATEGY

### 4.1 Pre-Migration Checklist
```
[ ] Backup completo database agent
[ ] Versioning tags git pre-migration
[ ] Export configurazione orchestrator
[ ] Snapshot documentazione PROTOCOL.md
[ ] Metriche baseline raccolte
[ ] Test suite esistente passa
```

### 4.2 Rollback Triggers
```typescript
interface RollbackTrigger {
  trigger: string;
  threshold: number;
  action: 'ROLLBACK' | 'PAUSE' | 'ALERT';
}

const ROLLBACK_TRIGGERS: RollbackTrigger[] = [
  { trigger: 'agent_failure_rate', threshold: 0.15, action: 'ROLLBACK' },     // >15% failures
  { trigger: 'message_loss_rate', threshold: 0.05, action: 'ROLLBACK' },      // >5% message loss
  { trigger: 'latency_p99_ms', threshold: 5000, action: 'PAUSE' },            // >5s P99 latency
  { trigger: 'circuit_breaker_trips', threshold: 10, action: 'ALERT' },       // >10 trips/hour
  { trigger: 'dlq_size', threshold: 100, action: 'ROLLBACK' },                // >100 messages in DLQ
];
```

### 4.3 Rollback Procedure

#### Opzione 1: Blue-Green Deployment
```bash
# Step 1: Deploy CCH parallelo
./deploy-cch.sh --mode=parallel

# Step 2: Routing split (10% CCH)
./routing-split.sh --cch-percentage=10

# Step 3: Monitor for 24h
./monitor-cch.sh --duration=24h

# Step 4: Gradual increase (50%, 80%, 100%)
./routing-split.sh --cch-percentage=50
./routing-split.sh --cch-percentage=80
./routing-split.sh --cch-percentage=100

# Rollback if needed
./rollback-legacy.sh --mode=immediate
```

#### Opzione 2: Feature Flags
```typescript
const FEATURE_FLAGS = {
  CCH_ENABLED: process.env.CCH_ENABLED === 'true',
  CCH_DRY_RUN: process.env.CCH_DRY_RUN === 'true',
  CCH_AGENT_PERCENTAGE: parseInt(process.env.CCH_AGENT_PERCENTAGE || '0'),
};

if (FEATURE_FLAGS.CCH_ENABLED) {
  // Use CCH for routing
} else {
  // Use legacy orchestrator routing
}
```

### 4.4 Rollback Testing
```bash
# Test rollback procedure
./test-rollback.sh --scenario=full_migration

# Scenarios:
# 1. Message loss during migration
# 2. Agent failure spike
# 3. Circuit breaker trip
# 4. DLQ overflow
# 5. Latency degradation
```

---

## 5. RISK ASSESSMENT

### 5.1 Risk Matrix

| Risk Category | Probability | Impact | Severity | Mitigation |
|---------------|-------------|--------|----------|------------|
| **Message Loss** | MEDIUM | HIGH | **HIGH** | - Implementare UMQ con persistenza<br>- Testare recovery scenarios<br>- Monitoring attivo |
| **Agent Regression** | HIGH | MEDIUM | **MEDIUM** | - Test suite completo<br>- Canary deployment<br>- Rapid rollback |
| **Performance Degradation** | MEDIUM | MEDIUM | **MEDIUM** | - Benchmark pre-migration<br>- Load testing<br>- Performance monitoring |
| **Breaking Workflow** | LOW | HIGH | **MEDIUM** | - Backward compatibility layer<br>- Adapter pattern<br>- Gradual migration |
| **Data Corruption** | LOW | CRITICAL | **MEDIUM** | - Data validation layer<br>- Transactional updates<br>- Backup & restore |
| **Integration Failure** | MEDIUM | HIGH | **HIGH** | - Integration testing<br>- Contract testing<br>- API versioning |

### 5.2 Mitigation Strategies

#### Message Loss Mitigation
```typescript
interface MessagePersistenceConfig {
  storage: 'file' | 'database' | 'redis';
  replication_factor: number;       // 3 per alta disponibilità
  sync: 'async' | 'sync';           // sync per critical messages
  retention_days: number;           // 7 giorni
  backup_enabled: boolean;
}

// Retry con exponential backoff
interface EnhancedRetryPolicy {
  max_retries: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
  jitter_enabled: boolean;          // Thundering herd prevention
  dead_letter_queue: boolean;       // DLQ per failed permanent
}
```

#### Agent Regression Mitigation
```typescript
interface RegressionTestingConfig {
  pre_migration_tests: string[];    // Test suite da passare
  post_migration_tests: string[];   // Test suite post-migrazione
  a_b_testing: boolean;             // A/B testing per confronto
  canary_duration_hours: number;    // 72h canary period
  rollback_automation: boolean;     // Automatic rollback on failure
}
```

#### Performance Mitigation
```typescript
interface PerformanceSLO {
  p50_latency_ms: number;           // 100ms
  p95_latency_ms: number;           // 500ms
  p99_latency_ms: number;           // 2000ms
  throughput_msg_per_sec: number;   // 1000 msg/s
  error_rate_percent: number;       // < 1%
  availability_percent: number;     // > 99.9%
}

// Performance monitoring
interface PerformanceMonitor {
  alert_on_slo_breach: boolean;
  auto_scale_on_load: boolean;
  circuit_breaker_on_degradation: boolean;
}
```

---

## 6. RECOMMENDED MIGRATION PATH

### 6.1 Phase 1: Preparation (Week 1)
```
Day 1-2: Setup & Foundation
  [ ] Setup CCH development environment
  [ ] Implement UMQ with persistence
  [ ] Setup testing infrastructure
  [ ] Create baseline metrics

Day 3-4: Core Components
  [ ] Implement URE with LRU cache
  [ ] Implement CPM with basic pooling
  [ ] Implement OM with metrics collection

Day 5: Fault Tolerance
  [ ] Implement FTL with circuit breaker
  [ ] Setup DLQ for failed messages
  [ ] Test fault tolerance scenarios
```

### 6.2 Phase 2: Orchestrator Migration (Week 2)
```
Day 1-2: Orchestrator Rewrite
  [ ] Refactor orchestrator-core.ts
  [ ] Integrate URE for routing
  [ ] Replace PROTOCOL.md with UMQ

Day 3-4: Plugin Integration
  [ ] Update orchestrator-engine.ts
  [ ] Integrate AgentRouter with CCH
  [ ] Update plugin types

Day 5: Testing
  [ ] Unit tests orchestrator
  [ ] Integration tests CCH
  [ ] Load testing
```

### 6.3 Phase 3: Core Agents Migration (Week 3)
```
Day 1-2: Analyzer & Coder
  [ ] Migrate analyzer.md
  [ ] Migrate coder.md
  [ ] Test task execution flow

Day 3-4: Reviewer & Documenter
  [ ] Migrate reviewer.md
  [ ] Migrate documenter.md
  [ ] Test review workflow

Day 5: System Coordinator
  [ ] Migrate system_coordinator.md
  [ ] Test resource tracking
  [ ] Validate metrics
```

### 6.4 Phase 4: Expert Agents Migration (Week 4-5)
```
Week 4: Batch 1 (High Priority Experts)
  [ ] Migrate GUI, Integration, Database, Security experts
  [ ] Test domain-specific workflows
  [ ] Validate fault tolerance

Week 5: Batch 2 (Remaining Experts)
  [ ] Migrate remaining 17 experts
  [ ] Test all expert combinations
  [ ] Validate multi-agent scenarios
```

### 6.5 Phase 5: Testing & Rollout (Week 6)
```
Day 1-2: Comprehensive Testing
  [ ] End-to-end testing
  [ ] Regression testing
  [ ] Performance testing
  [ ] Security testing

Day 3-4: Canary Deployment
  [ ] Deploy to 10% of agents
  [ ] Monitor for 48h
  [ ] Scale to 50% if stable
  [ ] Scale to 100% if stable

Day 5: Documentation & Handover
  [ ] Update all documentation
  [ ] Create migration guide
  [ ] Train team
  [ ] Handoff to operations
```

---

## 7. SUCCESS CRITERIA

### 7.1 Functional Requirements
```
[ ] Tutti gli agent (27) migrati con successo
[ ] Zero message loss in production
[ ] Fault tolerance attivo (circuit breaker, retry, DLQ)
[ ] Observability completa (metrics, tracing, logging)
[ ] Performance SLO raggiunti (vedi sezione 5.2)
[ ] Rollback testato e funzionante
```

### 7.2 Non-Functional Requirements
```
[ ] Availability > 99.9%
[ ] P99 latency < 2s
[ ] Throughput > 1000 msg/s
[ ] Error rate < 1%
[ ] Monitoring coverage > 95%
[ ] Documentation completeness > 90%
```

### 7.3 Quality Gates
```
Gate 1 (End Phase 1): CCH funzionale e testato
Gate 2 (End Phase 2): Orchestrator migrato e testato
Gate 3 (End Phase 3): Core agents migrati e validati
Gate 4 (End Phase 4): Expert agents migrati e testati
Gate 5 (End Phase 5): Production ready con rollback funzionante
```

---

## 8. APPENDIX

### 8.1 File Modifications Summary
```
c:\Users\LeoDg\.claude\agents\
├── core\
│   ├── orchestrator.md         [MAJOR REWRITE]
│   ├── analyzer.md             [MODERATE UPDATE]
│   ├── coder.md                [MODERATE UPDATE]
│   ├── reviewer.md             [MODERATE UPDATE]
│   ├── documenter.md           [MODERATE UPDATE]
│   └── system_coordinator.md   [MODERATE UPDATE]
├── experts\
│   ├── gui-super-expert.md     [MINOR UPDATE]
│   ├── integration_expert.md   [MINOR UPDATE]
│   ├── database_expert.md      [MINOR UPDATE]
│   ├── security_unified_expert.md [MINOR UPDATE]
│   └── ... (17 altri)          [MINOR UPDATE]
└── system\
    ├── PROTOCOL.md             [DEPRECATED - sostituito da CCH]
    ├── COMMUNICATION_HUB.md    [MAJOR UPDATE]
    ├── AGENT_REGISTRY.md       [MODERATE UPDATE]
    └── TASK_TRACKER.md         [MINOR UPDATE]

c:\Users\LeoDg\.claude\plugins\orchestrator-plugin\
└── src\
    ├── orchestrator-core.ts    [MAJOR REWRITE]
    ├── core\orchestrator-engine.ts [MODERATE UPDATE]
    ├── routing\AgentRouter.ts  [MODERATE UPDATE]
    ├── types\index.ts          [MODERATE UPDATE]
    └── ... (altri plugin files) [MINOR UPDATE]
```

### 8.2 New Files Required
```
c:\Users\LeoDg\.claude\cch\
├── core\
│   ├── umq\                   # Unified Message Queue
│   │   ├── message-queue.ts
│   │   ├── pub-sub.ts
│   │   └── persistence.ts
│   ├── ure\                   # Unified Router Engine
│   │   ├── router.ts
│   │   ├── cache.ts
│   │   └── load-balancer.ts
│   ├── cpm\                   # Context Pool Manager
│   │   ├── pool.ts
│   │   ├── context.ts
│   │   └── eviction.ts
│   ├── ftl\                   # Fault Tolerance Layer
│   │   ├── circuit-breaker.ts
│   │   ├── retry.ts
│   │   ├── bulkhead.ts
│   │   └── dlq.ts
│   └── om\                    # Observability Module
│       ├── metrics.ts
│       ├── tracing.ts
│       └── logging.ts
├── config\
│   ├── cch.config.ts
│   └── agents.config.ts
└── tests\
    ├── integration\
    └── e2e\
```

---

## CONCLUSIONI

### Key Findings
1. **0% agent compatibili out-of-the-box** - Tutti richiedono modifiche
2. **Orchestrator è il critical path** - Richiede rewrite completo
3. **Expert agents migration è low-hanging fruit** - Modifiche minime
4. **Fault tolerance è il beneficio principale** - Giustifica lo sforzo
5. **Rollback deve essere automatico** - Rischio troppo alto altrimenti

### Recommendations
1. **Proceed con migration phased** - Non big bang
2. **Investire in testing** - 40h dedicate a testing
3. **Implementare rollback automatico** - Basato su metriche
4. **Monitoring prioritario** - OM implementato prima di agents
5. **Documentation aggiornata parallelamente** - Non alla fine

### Next Steps
1. Approve migration plan
2. Allocate resources (4 persone, 6 settimane)
3. Setup development environment
4. Begin Phase 1 (Foundation)
5. Weekly progress reviews

---

**Documento Generato:** 1 Febbraio 2026
**Versione:** 1.0
**Autore:** Claude Code Analysis Engine
**Status:** APPROVATO PER REVIEW
