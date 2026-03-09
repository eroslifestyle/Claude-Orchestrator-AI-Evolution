# Orchestrator V17.0.0 - Design Document

> **Claude Tool Calling Integration** - Programmatic Tool Calling + Fine-Grained Streaming + Tool Search Tool
>
> **Version**: V17.0.0 | **Date**: 2026-03-09 | **Status**: PLANNING

---

## 1. Executive Summary

### 1.1 Obiettivo

Integrare le nuove Claude API capabilities nell'orchestrator per ottenere:
- **85%+ token savings** tramite Fine-Grained Streaming
- **Zero round-trip** con Programmatic Tool Calling
- **10,000+ tools** gestibili con Tool Search Tool

### 1.2 Scelte Architetturali

| Componente | Scelta | Beneficio |
|------------|--------|-----------|
| Tool Discovery | Ibrido 4-Layer | 95% query <5ms |
| Error Handling | Hybrid Resilience | 100% operativo |
| Cache Strategy | Warm Cache | 80%+ hit rate |
| Token Budget | Hierarchical Per-Agent | Ottimizzato per ruolo |
| Streaming | Hybrid (Partial/Full) | -25% tokens, full debug |
| Migration | Big Bang + Rollout Incrementale | Architettura pulita |

### 1.3 Metriche Target

| Metrica | Attuale (V16) | Target (V17) | Miglioramento |
|---------|---------------|--------------|---------------|
| Token overhead | 8,500-28,000 | 1,500-5,000 | **-85%** |
| Tool discovery | 50-200ms | <5ms (95%) | **-97%** |
| Round-trips | N per N tools | 1 per N tools | **-99%** |
| Error recovery | 85% | 99.9% | **+17%** |
| Cache hit rate | 40% | 80% | **+100%** |

---

## 2. Architettura di Sistema

### 2.1 Panoramica

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR V17.0.0                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              CLAUDE TOOL CALLING CORE                        │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │   │
│  │  │ Programmatic    │  │ Fine-Grained    │  │ Tool Search  │ │   │
│  │  │ Tool Calling    │  │ Streaming       │  │ Tool         │ │   │
│  │  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │   │
│  │           │                    │                   │         │   │
│  │           └────────────────────┼───────────────────┘         │   │
│  │                                ▼                             │   │
│  │              ┌─────────────────────────────┐                 │   │
│  │              │   ClaudeToolRegistry        │                 │   │
│  │              │   (10,000+ tools registered)│                 │   │
│  │              └─────────────────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              TOOL DISCOVERY (4-Layer)                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────┐  │   │
│  │  │ Layer 1 │→│ Layer 2 │→│ Layer 3 │→│ Layer 4          │  │   │
│  │  │ Exact   │ │ Keyword │ │Namespace│ │ Claude API       │  │   │
│  │  │ O(1)    │ │ O(k)    │ │ O(n)    │ │ Semantic Search  │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              WARM CACHE (Multi-Layer)                        │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                 │   │
│  │  │ L1: Hot (Memory) │  │ L2: Warm (Disk)  │                 │   │
│  │  │ Top 100 tools    │  │ All tools        │                 │   │
│  │  │ TTL: 1 ora       │  │ TTL: 6 ore       │                 │   │
│  │  └──────────────────┘  └──────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              AGENT LAYER (43 Agents)                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │   │
│  │  │ Core (6)   │  │ L1 (22)    │  │ L2 (15)    │            │   │
│  │  │ Full Stream│  │ Partial    │  │ Partial    │            │   │
│  │  │ 100K token │  │ 50K token  │  │ 30K token  │            │   │
│  │  └────────────┘  └────────────┘  └────────────┘            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componenti Core

#### 2.2.1 ClaudeToolRegistry

**Responsabilità**: Gestione di 10,000+ tools con lazy loading.

```python
class ClaudeToolRegistry:
    """
    Registry centralizzato per tutti i tools dell'ecosistema.

    Capacità:
    - 10,000+ tools registrati
    - Lazy loading per namespace
    - Deferred loading via Tool Search Tool
    """

    def __init__(self):
        self._tools: dict[str, ClaudeTool] = {}
        self._namespaces: dict[str, set[str]] = {}
        self._keyword_index: dict[str, set[str]] = {}
        self._exact_index: dict[str, str] = {}

    async def register_tool(self, tool: ClaudeTool) -> None:
        """Registra un tool con indicizzazione automatica."""

    async def search(self, query: str, context: dict) -> list[ClaudeTool]:
        """Ricerca 4-layer: Exact → Keyword → Namespace → Claude API."""

    async def batch_execute(self, calls: list[ToolCall]) -> list[ToolResult]:
        """Esegue N tools in un singolo round-trip."""
```

#### 2.2.2 ToolDiscoveryEngine (4-Layer)

**Responsabilità**: Ricerca tools con fallback progressivo.

```python
class ToolDiscoveryEngine:
    """
    Ricerca tools con 4 layer progressivi.

    Layer 1: Exact Match (O(1))
    Layer 2: Keyword Index (O(k))
    Layer 3: Namespace Filter (O(n))
    Layer 4: Claude Tool Search (Semantic)
    """

    async def discover(self, query: str, context: AgentContext) -> list[ToolMatch]:
        # Layer 1: Exact match
        if exact := self._exact_match(query):
            return [exact]

        # Layer 2: Keyword index
        if keyword_matches := self._keyword_search(query):
            return keyword_matches[:10]

        # Layer 3: Namespace filter
        namespace_matches = self._namespace_filter(query, context.namespace)
        if namespace_matches:
            return namespace_matches[:10]

        # Layer 4: Claude Tool Search Tool (fallback)
        return await self._claude_tool_search(query)
```

#### 2.2.3 HybridResilienceHandler

**Responsabilità**: Error handling differenziato per tool criticalità.

```python
class HybridResilienceHandler:
    """
    Error handling ibrido per 100% operational guarantee.

    Critical tools: Fail-Fast + Retry 3x
    Non-Critical tools: Fail-Safe + Partial results
    All tools: Circuit Breaker protection
    """

    def __init__(self):
        self.circuit_breakers: dict[str, CircuitBreaker] = {}
        self.retry_policy = RetryPolicy(max_retries=3, backoff=ExponentialBackoff())

    async def execute_batch(
        self,
        calls: list[ToolCall],
        criticality: dict[str, CriticalityLevel]
    ) -> BatchResult:
        results = []

        for call in calls:
            level = criticality.get(call.name, CriticalityLevel.NON_CRITICAL)

            try:
                # Circuit breaker check
                if not self.circuit_breakers[call.name].can_execute():
                    if level == CRITICAL:
                        raise CircuitOpenError(call.name)
                    else:
                        results.append(SkippedResult(call))
                        continue

                # Execute with retry for critical
                if level == CRITICAL:
                    result = await self._execute_with_retry(call)
                else:
                    result = await self._execute_best_effort(call)

                results.append(result)

            except Exception as e:
                self.circuit_breakers[call.name].record_failure()

                if level == CRITICAL:
                    raise  # Propagate for critical
                else:
                    results.append(ErrorResult(call, e))

        return BatchResult(results)
```

#### 2.2.4 WarmCacheManager

**Responsabilità**: Cache multi-layer con warm loading.

```python
class WarmCacheManager:
    """
    Cache multi-layer con warm loading all'avvio.

    L1: Hot Cache (In-Memory, LRU)
        - Top 100 tools più usati
        - TTL: 1 ora
        - Hit rate target: 60%

    L2: Warm Cache (Disk/Redis)
        - All tools registry
        - TTL: 6 ore
        - Hit rate target: 30%

    Warm Loading:
        - Precarica top 50 tools all'avvio sessione
        - Background refresh per TTL < 10 min
    """

    def __init__(self):
        self.l1_cache = LRUCache(maxsize=100, ttl=3600)
        self.l2_cache = DiskCache(path=".claude/cache/tools", ttl=21600)
        self._warm_tools = self._load_warm_list()

    async def warm_cache(self) -> None:
        """Precarica tools frequenti all'avvio."""
        for tool_name in self._warm_tools[:50]:
            await self._preload_tool(tool_name)

    async def get(self, key: str) -> Optional[ClaudeTool]:
        """Get con fallback L1 → L2 → Load."""

    async def set(self, key: str, tool: ClaudeTool, layer: int = 1) -> None:
        """Set con propagazione layer."""
```

---

## 3. Hierarchical Token Budget

### 3.1 Budget Per-Agent

```python
# Token budget gerarchico per tipo di agente
HIERARCHICAL_BUDGET = {
    # Core Agents - Massimo budget, full streaming
    "core": {
        "orchestrator": 150_000,  # Master coordinator
        "analyzer": 100_000,      # Code analysis
        "coder": 120_000,         # Code generation
        "reviewer": 80_000,       # Code review
        "documenter": 60_000,     # Documentation
        "system_coordinator": 70_000,  # System ops
    },

    # L1 Experts - Budget medio, partial streaming
    "L1": {
        "default": 50_000,
        "database_expert": 70_000,     # Complex queries
        "security_expert": 60_000,     # Security analysis
        "integration_expert": 55_000,  # API work
        "architect_expert": 65_000,    # Design patterns
        # ... altri 18 expert con 50K default
    },

    # L2 Specialists - Budget ridotto, partial streaming
    "L2": {
        "default": 30_000,
        "claude_prompt_optimizer": 40_000,  # Token optimization
        "db_query_optimizer": 35_000,       # Query tuning
        # ... altri 13 specialist con 30K default
    }
}

class HierarchicalBudgetManager:
    """
    Gestione token budget per-agent con streaming savings.
    """

    def get_budget(self, agent_name: str) -> int:
        """Ottiene budget per agente specifico."""
        if agent_name in HIERARCHICAL_BUDGET["core"]:
            return HIERARCHICAL_BUDGET["core"][agent_name]

        # Check L1
        for expert_config in HIERARCHICAL_BUDGET["L1"].values():
            if agent_name in expert_config:
                return expert_config[agent_name]

        # Check L2
        for specialist_config in HIERARCHICAL_BUDGET["L2"].values():
            if agent_name in specialist_config:
                return specialist_config[agent_name]

        # Fallback
        return 30_000

    def calculate_effective_budget(self, agent_name: str, streaming_mode: StreamingMode) -> int:
        """
        Calcola budget effettivo considerando streaming savings.

        Fine-Grained Streaming riduce overhead del 40%:
        - Full streaming: -40% overhead
        - Partial streaming: -25% overhead
        """
        base_budget = self.get_budget(agent_name)

        if streaming_mode == StreamingMode.FULL:
            return int(base_budget * 0.60)  # -40% overhead
        elif streaming_mode == StreamingMode.PARTIAL:
            return int(base_budget * 0.75)  # -25% overhead
        else:
            return base_budget
```

### 3.2 Budget Enforcement

```python
class BudgetEnforcer:
    """
    Enforcement del budget con throttling progressivo.
    """

    THROTTLE_THRESHOLDS = {
        0.80: BudgetAction.WARNING,    # Log warning
        0.90: BudgetAction.THROTTLE,   # Reduce batch size
        0.95: BudgetAction.PAUSE,      # Ask user
        1.00: BudgetAction.STOP,       # Force stop
    }

    async def check_budget(self, agent: str, current_usage: int) -> BudgetAction:
        """Controlla usage e ritorna azione necessaria."""
        budget = self.budget_manager.get_budget(agent)
        ratio = current_usage / budget

        for threshold, action in sorted(self.THROTTLE_THRESHOLDS.items(), reverse=True):
            if ratio >= threshold:
                return action

        return BudgetAction.CONTINUE
```

---

## 4. Fine-Grained Streaming Configuration

### 4.1 Hybrid Streaming Strategy

```python
class StreamingConfig:
    """
    Configurazione streaming ibrida per 43 agenti.

    Production Mode: Partial Streaming (default)
    Debug Mode: Full Streaming
    """

    AGENT_STREAMING_MODE = {
        # Core Agents - Full Streaming (debug visibility)
        "orchestrator": StreamingMode.FULL,
        "analyzer": StreamingMode.FULL,
        "coder": StreamingMode.FULL,
        "reviewer": StreamingMode.FULL,
        "documenter": StreamingMode.FULL,

        # L1 Experts - Partial Streaming (production)
        "database_expert": StreamingMode.PARTIAL,
        "security_expert": StreamingMode.PARTIAL,
        "integration_expert": StreamingMode.PARTIAL,
        # ... tutti gli altri L1 = PARTIAL

        # L2 Specialists - Partial Streaming (production)
        # ... tutti L2 = PARTIAL
    }

    @staticmethod
    def get_streaming_mode(agent_name: str, debug_mode: bool = False) -> StreamingMode:
        """Determina modalità streaming per agente."""
        if debug_mode:
            return StreamingMode.FULL

        return AGENT_STREAMING_MODE.get(agent_name, StreamingMode.PARTIAL)

    @staticmethod
    def should_stream_component(component: str, mode: StreamingMode) -> bool:
        """
        Determina quali componenti streammare.

        FULL: tool_name + parameters + results
        PARTIAL: tool_name + parameters only
        """
        if mode == StreamingMode.FULL:
            return True

        # PARTIAL mode
        return component in ["tool_name", "parameters"]
```

### 4.2 Streaming Implementation

```python
class FineGrainedStreamer:
    """
    Implementazione Fine-Grained Streaming.

    Docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming
    """

    async def stream_tool_call(
        self,
        tool_name: str,
        parameters: dict,
        mode: StreamingMode
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Stream tool call con parametri parziali.

        Yield:
        - tool_name chunk (immediato)
        - parameter chunks (progressivo)
        - result chunks (solo FULL mode)
        """
        # Stream tool name
        yield StreamChunk(type="tool_name", content=tool_name)

        # Stream parameters incrementally
        for key, value in parameters.items():
            async for chunk in self._stream_parameter(key, value):
                yield chunk

        # Execute tool
        result = await self._execute_tool(tool_name, parameters)

        # Stream results (FULL mode only)
        if mode == StreamingMode.FULL:
            async for chunk in self._stream_result(result):
                yield chunk
```

---

## 5. Programmatic Tool Calling

### 5.1 Batch Execution

```python
class ProgrammaticToolExecutor:
    """
    Esecuzione batch di N tools in 1 round-trip.

    Docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling
    """

    async def execute_batch(
        self,
        calls: list[ToolCall],
        resilience: HybridResilienceHandler
    ) -> BatchResult:
        """
        Esegue N tools in parallelo con error handling ibrido.

        Returns:
        - BatchResult con risultati parziali/complete
        - Errors gestiti per criticalità
        """
        # Classify tools by criticality
        criticality = self._classify_tools(calls)

        # Execute via Claude API (single round-trip)
        raw_results = await self._claude_batch_call(calls)

        # Apply resilience handling
        return await resilience.execute_batch(raw_results, criticality)

    async def _claude_batch_call(self, calls: list[ToolCall]) -> list[RawResult]:
        """
        Chiama Claude API con batch di tools.

        Vantaggio: 1 API call per N tools
        Risparmio: ~70% token overhead
        """
        response = await self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            tools=[call.to_tool_schema() for call in calls],
            messages=[{
                "role": "user",
                "content": f"Execute these {len(calls)} tools in batch"
            }]
        )

        return self._parse_batch_response(response)
```

---

## 6. Migration Plan

### 6.1 Big Bang + Rollout Incrementale

```
┌─────────────────────────────────────────────────────────────┐
│                    MIGRATION TIMELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1: INFRASTRUCTURE (Giorno 1-2)                      │
│  ├── Installare nuove dipendenze                           │
│  ├── Setup Warm Cache directories                          │
│  ├── Configurare monitoring (Prometheus + Grafana)         │
│  └── Test connettività Claude API nuove features           │
│                                                             │
│  PHASE 2: CORE MODULES (Giorno 3-5)                        │
│  ├── Implementare ClaudeToolRegistry                       │
│  ├── Implementare ToolDiscoveryEngine (4-layer)            │
│  ├── Implementare HybridResilienceHandler                  │
│  ├── Implementare WarmCacheManager                         │
│  └── Unit tests per ogni modulo                            │
│                                                             │
│  PHASE 3: CORE AGENTS MIGRATION (Giorno 6-8)               │
│  ├── Riscrivere orchestrator agent                         │
│  ├── Riscrivere analyzer agent                             │
│  ├── Riscrivere coder agent                                │
│  ├── Riscrivere reviewer agent                             │
│  ├── Riscrivere documenter agent                           │
│  ├── Riscrivere system_coordinator agent                   │
│  └── Integration tests per core agents                     │
│                                                             │
│  PHASE 4: L1 EXPERTS MIGRATION (Giorno 9-12)               │
│  ├── Riscrivere 22 L1 expert agents                        │
│  ├── Partial streaming config per tutti                    │
│  ├── Hierarchical budget enforcement                       │
│  └── Integration tests per L1 agents                       │
│                                                             │
│  PHASE 5: L2 SPECIALISTS MIGRATION (Giorno 13-15)          │
│  ├── Riscrivere 15 L2 specialist agents                    │
│  ├── Delegation to L1 parents                              │
│  └── Full integration tests                                │
│                                                             │
│  PHASE 6: TESTING & VALIDATION (Giorno 16-18)              │
│  ├── E2E tests (tutti i 43 agents)                         │
│  ├── Performance benchmarks                                │
│  ├── Token usage validation                                │
│  ├── Error recovery tests                                  │
│  └── Stress tests (1000+ concurrent tasks)                 │
│                                                             │
│  PHASE 7: DEPLOYMENT (Giorno 19-20)                        │
│  ├── Git tag: v17.0.0                                      │
│  ├── Blue-Green deployment                                 │
│  ├── Monitoring attivo 48h                                 │
│  └── Rollback plan ready                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

TOTALE: 20 giorni
RISCHIO: Medio (Big Bang con testing estensivo)
ROLLBACK: Git revert + feature flag
```

### 6.2 Rollback Strategy

```python
# Feature flag per rollback immediato
FEATURE_FLAGS = {
    "V17_TOOL_CALLING": True,     # False → torna a V16
    "V17_STREAMING": True,        # False → disabilita streaming
    "V17_TOOL_SEARCH": True,      # False → keyword-only
    "V17_CACHE": True,            # False → no cache
}

def get_tool_executor() -> Union[ProgrammaticToolExecutor, LegacyToolExecutor]:
    """Factory con feature flag."""
    if FEATURE_FLAGS["V17_TOOL_CALLING"]:
        return ProgrammaticToolExecutor()
    else:
        return LegacyToolExecutor()  # V16 fallback
```

---

## 7. Monitoring & Observability

### 7.1 Structured Logging

```python
import structlog

logger = structlog.get_logger()

# Log strutturato per ogni operazione
async def execute_tool_with_logging(call: ToolCall) -> ToolResult:
    log = logger.bind(
        tool_name=call.name,
        agent=call.agent,
        session_id=call.session_id
    )

    log.info("tool_execution_started", parameters=call.parameters)

    try:
        result = await execute_tool(call)
        log.info("tool_execution_completed",
                 duration_ms=result.duration,
                 tokens_used=result.tokens)
        return result
    except Exception as e:
        log.error("tool_execution_failed",
                  error=str(e),
                  error_type=type(e).__name__)
        raise
```

### 7.2 Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Metriche esposte
TOOL_EXECUTIONS = Counter(
    'orchestrator_tool_executions_total',
    'Total tool executions',
    ['tool_name', 'agent', 'status']
)

TOOL_LATENCY = Histogram(
    'orchestrator_tool_latency_seconds',
    'Tool execution latency',
    ['tool_name', 'agent'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

TOKEN_USAGE = Gauge(
    'orchestrator_token_usage',
    'Token usage by agent',
    ['agent', 'budget_tier']
)

CACHE_HITS = Counter(
    'orchestrator_cache_hits_total',
    'Cache hits by layer',
    ['layer']
)
```

### 7.3 Auto-Alerting

```yaml
# alerts.yml
groups:
  - name: orchestrator_v17
    rules:
      - alert: HighErrorRate
        expr: rate(orchestrator_tool_executions_total{status="error"}[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Error rate > 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(orchestrator_tool_latency_seconds_bucket[5m])) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency > 1s"

      - alert: TokenBudgetExceeded
        expr: orchestrator_token_usage / orchestrator_token_budget > 0.8
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Token usage > 80% budget"
```

---

## 8. API Reference

### 8.1 ClaudeToolRegistry API

```python
# Registrazione tool
await registry.register_tool(ClaudeTool(
    name="query_api_users",
    description="Query REST API for user data",
    input_schema={"type": "object", "properties": {...}},
    namespace="agents/core/analyzer"
))

# Ricerca tool
tools = await registry.search("database query optimization", context)

# Batch execution
results = await registry.batch_execute([
    ToolCall(name="query_api_users", parameters={"endpoint": "/users"}),
    ToolCall(name="analyze_code", parameters={"file": "main.py"}),
])
```

### 8.2 HybridResilienceHandler API

```python
# Classificazione criticalità
criticality = {
    "deploy_production": CriticalityLevel.CRITICAL,
    "analyze_logs": CriticalityLevel.NON_CRITICAL,
}

# Esecuzione con resilience
result = await resilience.execute_batch(calls, criticality)

# Check circuit breaker status
status = resilience.get_circuit_status("query_api_users")
# → CircuitStatus.OPEN | HALF_OPEN | CLOSED
```

### 8.3 WarmCacheManager API

```python
# Warm cache all'avvio
await cache.warm_cache()

# Get tool
tool = await cache.get("query_api_users")

# Set tool
await cache.set("query_api_users", tool, layer=1)

# Invalidate
await cache.invalidate("query_api_users")

# Stats
stats = await cache.get_stats()
# → {"l1_hits": 1200, "l2_hits": 450, "misses": 50}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```python
# tests/test_claude_tool_registry.py
@pytest.mark.asyncio
async def test_tool_registration():
    registry = ClaudeToolRegistry()
    tool = ClaudeTool(name="test_tool", ...)

    await registry.register_tool(tool)

    assert "test_tool" in registry._tools
    assert "test_tool" in registry._exact_index

@pytest.mark.asyncio
async def test_4layer_discovery():
    engine = ToolDiscoveryEngine()

    # Layer 1: Exact
    result = await engine.discover("query_api_users", context)
    assert result[0].name == "query_api_users"

    # Layer 2: Keyword
    result = await engine.discover("api query", context)
    assert len(result) > 0
    assert "query_api_users" in [r.name for r in result]
```

### 9.2 Integration Tests

```python
# tests/integration/test_batch_execution.py
@pytest.mark.asyncio
async def test_batch_execution_with_resilience():
    registry = ClaudeToolRegistry()
    resilience = HybridResilienceHandler()

    calls = [
        ToolCall(name="critical_op", parameters={...}),
        ToolCall(name="non_critical_op", parameters={...}),
    ]

    criticality = {
        "critical_op": CRITICAL,
        "non_critical_op": NON_CRITICAL,
    }

    result = await registry.batch_execute(calls, resilience, criticality)

    assert result.success_rate >= 0.95
    assert result.critical_success == True
```

### 9.3 Performance Tests

```python
# tests/performance/test_token_savings.py
def test_streaming_token_reduction():
    """Verifica -25% to -40% token savings con streaming."""

    # Baseline: no streaming
    baseline_tokens = measure_token_usage(streaming=False)

    # With partial streaming
    partial_tokens = measure_token_usage(streaming="PARTIAL")
    assert partial_tokens <= baseline_tokens * 0.75  # -25%

    # With full streaming
    full_tokens = measure_token_usage(streaming="FULL")
    assert full_tokens <= baseline_tokens * 0.60  # -40%
```

---

## 10. Risks & Mitigations

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Claude API rate limits | Media | Alto | Adaptive batch size + caching |
| Tool discovery lento | Bassa | Medio | 4-layer con 95% cache hit |
| Streaming overhead | Bassa | Basso | Partial mode default |
| Migration bug | Media | Alto | Feature flags + rollback |
| Token budget exceeded | Media | Medio | Smart throttling |

---

## 11. Success Criteria

- [ ] 85%+ token savings vs V16
- [ ] 95% tool discovery <5ms
- [ ] 99.9% uptime con resilience
- [ ] 80%+ cache hit rate
- [ ] Zero regressions in core functionality
- [ ] All 43 agents migrated successfully
- [ ] Full test coverage (>95%)

---

**Version**: V17.0.0
**Author**: Orchestrator Team
**Date**: 2026-03-09
