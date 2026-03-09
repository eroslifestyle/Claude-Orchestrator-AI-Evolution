---
title: Orchestrator V17 Testing Plan
version: 1.0
last_updated: 2026-03-09
language: it
module: orchestrator
tags: [migration, testing, unit, integration, e2e, performance, v17]
---

# Orchestrator V17 Testing Plan

> Piano di testing completo per validare la migrazione V16 → V17

---

## Indice

1. [Panoramica](#panoramica)
2. [Testing Strategy](#testing-strategy)
3. [Unit Tests (55 tests)](#unit-tests)
4. [Integration Tests (35 tests)](#integration-tests)
5. [E2E Tests (25 tests)](#e2e-tests)
6. [Performance Benchmarks (15 tests)](#performance-benchmarks)
7. [Test Automation](#test-automation)
8. [Coverage Requirements](#coverage-requirements)

---

## Panoramica

| Categoria | Test Count | Target Coverage | Tempo Stimato |
|-----------|------------|-----------------|---------------|
| Unit Tests | 55 | >95% | 5 min |
| Integration Tests | 35 | >90% | 15 min |
| E2E Tests | 25 | >85% | 30 min |
| Performance Benchmarks | 15 | N/A | 20 min |
| **TOTALE** | **130** | **>90%** | **70 min** |

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  25 tests (slow, high value)
                    │  15%    │
                ┌───┴─────────┴───┐
                │  INTEGRATION    │  35 tests (medium)
                │      27%        │
            ┌───┴─────────────────┴───┐
            │       UNIT TESTS        │  55 tests (fast, isolated)
            │          58%            │
            └─────────────────────────┘
```

### Test Categories

| Categoria | Scopo | Frequenza |
|-----------|-------|-----------|
| Smoke | Verifica funzionalità base | Ogni commit |
| Unit | Test componenti isolati | Ogni commit |
| Integration | Test interazioni tra componenti | Ogni PR |
| E2E | Test flussi completi | Pre-release |
| Performance | Benchmark e regression | Giornaliero |
| Chaos | Test resilienza | Settimanale |

---

## Unit Tests

### 1. ClaudeToolRegistry Tests (15 tests)

**File**: `tests/unit/test_claude_tool_registry.py`

```python
import pytest
from lib.claude_tool_registry import ClaudeToolRegistry, ClaudeTool

@pytest.fixture
def registry():
    return ClaudeToolRegistry()

@pytest.fixture
def sample_tool():
    return ClaudeTool(
        name="query_api_users",
        description="Query REST API for user data",
        input_schema={"type": "object", "properties": {"endpoint": {"type": "string"}}},
        namespace="agents/core/analyzer"
    )

# === Registration Tests ===

@pytest.mark.asyncio
async def test_register_tool_adds_to_registry(registry, sample_tool):
    """Test che la registrazione aggiunge il tool al registry."""
    await registry.register_tool(sample_tool)
    assert "query_api_users" in registry._tools

@pytest.mark.asyncio
async def test_register_tool_creates_exact_index(registry, sample_tool):
    """Test che la registrazione crea indice exact match."""
    await registry.register_tool(sample_tool)
    assert registry._exact_index.get("query_api_users") == "query_api_users"

@pytest.mark.asyncio
async def test_register_tool_creates_keyword_index(registry, sample_tool):
    """Test che la registrazione crea indice keyword."""
    await registry.register_tool(sample_tool)
    assert "query" in registry._keyword_index
    assert "api" in registry._keyword_index
    assert "users" in registry._keyword_index

@pytest.mark.asyncio
async def test_register_tool_creates_namespace_index(registry, sample_tool):
    """Test che la registrazione crea indice namespace."""
    await registry.register_tool(sample_tool)
    assert "agents/core/analyzer" in registry._namespaces

@pytest.mark.asyncio
async def test_register_duplicate_tool_raises_error(registry, sample_tool):
    """Test che registrazione duplicata solleva errore."""
    await registry.register_tool(sample_tool)
    with pytest.raises(DuplicateToolError):
        await registry.register_tool(sample_tool)

# === Search Tests ===

@pytest.mark.asyncio
async def test_search_exact_match_returns_single(registry, sample_tool):
    """Test ricerca exact match ritorna singolo tool."""
    await registry.register_tool(sample_tool)
    results = await registry.search("query_api_users", {})
    assert len(results) == 1
    assert results[0].name == "query_api_users"

@pytest.mark.asyncio
async def test_search_keyword_match_returns_multiple(registry, sample_tool):
    """Test ricerca keyword ritorna multipli tools."""
    await registry.register_tool(sample_tool)
    await registry.register_tool(ClaudeTool(
        name="query_api_orders",
        description="Query orders API",
        input_schema={},
        namespace="agents/core/analyzer"
    ))
    results = await registry.search("api query", {})
    assert len(results) >= 2

@pytest.mark.asyncio
async def test_search_namespace_filter_works(registry, sample_tool):
    """Test filtro namespace nella ricerca."""
    await registry.register_tool(sample_tool)
    await registry.register_tool(ClaudeTool(
        name="query_api_admin",
        description="Query admin API",
        input_schema={},
        namespace="agents/L1/security_expert"
    ))
    results = await registry.search("query", {"namespace": "agents/core"})
    assert all("core" in r.namespace for r in results)

@pytest.mark.asyncio
async def test_search_no_match_returns_empty(registry):
    """Test ricerca senza match ritorna lista vuota."""
    results = await registry.search("nonexistent_tool_xyz", {})
    assert len(results) == 0

# === Batch Execution Tests ===

@pytest.mark.asyncio
async def test_batch_execute_returns_all_results(registry, sample_tool):
    """Test batch execution ritorna risultati per tutti i tools."""
    await registry.register_tool(sample_tool)
    calls = [ToolCall(name="query_api_users", parameters={"endpoint": "/users"})]
    results = await registry.batch_execute(calls)
    assert len(results) == 1

@pytest.mark.asyncio
async def test_batch_execute_empty_calls_returns_empty(registry):
    """Test batch execution con lista vuota."""
    results = await registry.batch_execute([])
    assert len(results) == 0

@pytest.mark.asyncio
async def test_unregister_tool_removes_from_all_indices(registry, sample_tool):
    """Test che unregister rimuove da tutti gli indici."""
    await registry.register_tool(sample_tool)
    await registry.unregister_tool("query_api_users")
    assert "query_api_users" not in registry._tools
    assert "query_api_users" not in registry._exact_index
```

### 2. ToolDiscoveryEngine Tests (12 tests)

**File**: `tests/unit/test_tool_discovery.py`

```python
import pytest
from lib.tool_discovery import ToolDiscoveryEngine, AgentContext

@pytest.fixture
def engine():
    return ToolDiscoveryEngine()

@pytest.fixture
def context():
    return AgentContext(namespace="agents/core", agent_name="analyzer")

# === Layer 1: Exact Match Tests ===

@pytest.mark.asyncio
async def test_layer1_exact_match_returns_immediately(engine, context):
    """Test Layer 1 ritorna exact match senza fallback."""
    results = await engine.discover("query_api_users", context)
    assert results[0].layer == 1
    assert results[0].name == "query_api_users"

@pytest.mark.asyncio
async def test_layer1_case_sensitive(engine, context):
    """Test Layer 1 e case-sensitive."""
    results = await engine.discover("QUERY_API_USERS", context)
    assert len(results) == 0 or results[0].layer > 1

# === Layer 2: Keyword Index Tests ===

@pytest.mark.asyncio
async def test_layer2_keyword_match_returns_ranked(engine, context):
    """Test Layer 2 ritorna risultati con ranking."""
    results = await engine.discover("api query", context)
    assert all(r.layer == 2 for r in results)
    assert results[0].score >= results[-1].score

@pytest.mark.asyncio
async def test_layer2_limits_to_10_results(engine, context):
    """Test Layer 2 limita risultati a 10."""
    # Setup: registra 20 tool con keyword "test"
    for i in range(20):
        await engine.register_tool(ClaudeTool(
            name=f"test_tool_{i}",
            description=f"Test tool {i}",
            input_schema={},
            namespace="agents/core"
        ))
    results = await engine.discover("test", context)
    assert len(results) <= 10

# === Layer 3: Namespace Filter Tests ===

@pytest.mark.asyncio
async def test_layer3_namespace_filter_applied(engine):
    """Test Layer 3 applica filtro namespace."""
    context = AgentContext(namespace="agents/L1", agent_name="database_expert")
    results = await engine.discover("database", context)
    assert all("L1" in r.namespace or "core" in r.namespace for r in results)

@pytest.mark.asyncio
async def test_layer3_fallback_to_layer4_on_empty():
    """Test Layer 3 fallback a Layer 4 se vuoto."""
    engine = ToolDiscoveryEngine()
    context = AgentContext(namespace="nonexistent", agent_name="test")
    results = await engine.discover("very_specific_tool", context)
    # Se Layer 3 vuoto, dovrebbe usare Layer 4
    assert results[0].layer == 4

# === Layer 4: Claude API Tests ===

@pytest.mark.asyncio
async def test_layer4_semantic_search_called():
    """Test Layer 4 chiama Claude API per semantic search."""
    engine = ToolDiscoveryEngine(enable_claude_fallback=True)
    context = AgentContext(namespace="agents/core", agent_name="test")
    results = await engine.discover("find user authentication tool", context)
    assert len(results) > 0

@pytest.mark.asyncio
async def test_layer4_handles_api_error():
    """Test Layer 4 gestisce errori API gracefully."""
    engine = ToolDiscoveryEngine(enable_claude_fallback=True)
    engine._claude_client = MockFailingClient()
    context = AgentContext(namespace="agents/core", agent_name="test")
    results = await engine.discover("complex query", context)
    assert results == []  # Graceful degradation

# === Performance Tests ===

@pytest.mark.asyncio
async def test_discovery_latency_under_5ms(engine, context):
    """Test discovery latency <5ms per 95% delle query."""
    import time
    latencies = []
    for _ in range(100):
        start = time.perf_counter()
        await engine.discover("query_api_users", context)
        latencies.append(time.perf_counter() - start)

    p95 = sorted(latencies)[94]
    assert p95 < 0.005  # 5ms
```

### 3. HybridResilienceHandler Tests (10 tests)

**File**: `tests/unit/test_hybrid_resilience.py`

```python
import pytest
from lib.hybrid_resilience import HybridResilienceHandler, CriticalityLevel

@pytest.fixture
def handler():
    return HybridResilienceHandler()

# === Circuit Breaker Tests ===

@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_failures(handler):
    """Test circuit breaker si apre dopo 5 failure."""
    for _ in range(5):
        handler.record_failure("test_tool")

    status = handler.get_circuit_status("test_tool")
    assert status == CircuitStatus.OPEN

@pytest.mark.asyncio
async def test_circuit_breaker_half_open_after_timeout(handler):
    """Test circuit breaker va in HALF_OPEN dopo timeout."""
    handler.record_failure("test_tool", count=5)
    # Simula timeout
    handler._circuits["test_tool"].last_failure_time -= 60
    status = handler.get_circuit_status("test_tool")
    assert status == CircuitStatus.HALF_OPEN

@pytest.mark.asyncio
async def test_circuit_breaker_closes_on_success(handler):
    """Test circuit breaker si chiude su success in HALF_OPEN."""
    handler._circuits["test_tool"].state = CircuitStatus.HALF_OPEN
    handler.record_success("test_tool")
    status = handler.get_circuit_status("test_tool")
    assert status == CircuitStatus.CLOSED

# === Criticality Tests ===

@pytest.mark.asyncio
async def test_critical_tool_failure_propagates(handler):
    """Test fallimento tool CRITICAL viene propagato."""
    calls = [ToolCall(name="deploy_production", parameters={})]
    criticality = {"deploy_production": CriticalityLevel.CRITICAL}

    with pytest.raises(CriticalToolError):
        await handler.execute_batch(calls, criticality, simulate_failure=True)

@pytest.mark.asyncio
async def test_non_critical_tool_failure_returns_error_result(handler):
    """Test fallimento tool NON-CRITICAL ritorna ErrorResult."""
    calls = [ToolCall(name="analyze_logs", parameters={})]
    criticality = {"analyze_logs": CriticalityLevel.NON_CRITICAL}

    result = await handler.execute_batch(calls, criticality, simulate_failure=True)
    assert isinstance(result.results[0], ErrorResult)

# === Retry Tests ===

@pytest.mark.asyncio
async def test_retry_policy_exponential_backoff(handler):
    """Test retry con exponential backoff."""
    handler.retry_policy = RetryPolicy(max_retries=3, backoff=ExponentialBackoff())

    call = ToolCall(name="flaky_tool", parameters={})
    result = await handler._execute_with_retry(call, simulate_failures=2)

    assert result.success
    assert result.attempts == 3

@pytest.mark.asyncio
async def test_retry_stops_after_max_retries(handler):
    """Test retry si ferma dopo max_retries."""
    call = ToolCall(name="always_fails", parameters={})
    result = await handler._execute_with_retry(call, simulate_failures=10)

    assert not result.success
    assert result.attempts == 3
```

### 4. WarmCacheManager Tests (10 tests)

**File**: `tests/unit/test_warm_cache.py`

```python
import pytest
from lib.warm_cache import WarmCacheManager

@pytest.fixture
async def cache():
    manager = WarmCacheManager()
    await manager.warm_cache()
    return manager

# === L1 Cache Tests ===

@pytest.mark.asyncio
async def test_l1_cache_hit_returns_tool(cache):
    """Test L1 cache hit ritorna tool."""
    tool = await cache.get("query_api_users")
    assert tool is not None
    assert tool.name == "query_api_users"

@pytest.mark.asyncio
async def test_l1_cache_miss_falls_back_to_l2(cache):
    """Test L1 miss fallback a L2."""
    # Invalida L1
    cache.l1_cache.invalidate("query_api_users")

    tool = await cache.get("query_api_users")
    assert tool is not None
    assert cache._last_hit_layer == 2

@pytest.mark.asyncio
async def test_l1_cache_evicts_lru(cache):
    """Test L1 cache evicta LRU quando piena."""
    # Riempi L1 (max 100)
    for i in range(101):
        await cache.set(f"tool_{i}", ClaudeTool(name=f"tool_{i}", ...))

    # Il primo tool dovrebbe essere stato evictato
    assert await cache.l1_cache.get("tool_0") is None

# === L2 Cache Tests ===

@pytest.mark.asyncio
async def test_l2_cache_persists_to_disk(cache, tmp_path):
    """Test L2 persiste su disco."""
    cache.l2_cache = DiskCache(path=tmp_path)
    await cache.set("test_tool", ClaudeTool(name="test_tool", ...), layer=2)

    # Verifica file creato
    assert (tmp_path / "test_tool.json").exists()

@pytest.mark.asyncio
async def test_l2_cache_ttl_expiry(cache):
    """Test L2 TTL expiry."""
    cache.l2_cache.ttl = 1  # 1 secondo
    await cache.set("expiring_tool", ClaudeTool(name="expiring_tool", ...), layer=2)

    import asyncio
    await asyncio.sleep(1.1)

    tool = await cache.get("expiring_tool")
    assert tool is None

# === Warm Loading Tests ===

@pytest.mark.asyncio
async def test_warm_cache_preloads_top_50(cache):
    """Test warm_cache precarica top 50 tools."""
    await cache.warm_cache()

    loaded = len([k for k in cache.l1_cache._cache.keys()])
    assert loaded >= 50

@pytest.mark.asyncio
async def test_background_refresh_ttl_under_10_min(cache):
    """Test background refresh per TTL < 10 min."""
    # Setup: tool con TTL prossimo a scadenza
    await cache.set("refresh_tool", ClaudeTool(...))
    cache.l1_cache._ttl["refresh_tool"] = 500  # 500 secondi

    # Verifica che venga refreshato
    await cache._check_background_refresh()
    assert cache.l1_cache._ttl["refresh_tool"] == 3600  # Reset TTL
```

### 5. HierarchicalBudgetManager Tests (8 tests)

**File**: `tests/unit/test_hierarchical_budget.py`

```python
import pytest
from lib.hierarchical_budget import HierarchicalBudgetManager, BudgetAction

@pytest.fixture
def manager():
    return HierarchicalBudgetManager()

# === Budget Allocation Tests ===

def test_get_budget_core_agent(manager):
    """Test budget per core agent."""
    budget = manager.get_budget("orchestrator")
    assert budget == 150_000

def test_get_budget_l1_expert(manager):
    """Test budget per L1 expert."""
    budget = manager.get_budget("database_expert")
    assert budget == 70_000

def test_get_budget_l2_specialist(manager):
    """Test budget per L2 specialist."""
    budget = manager.get_budget("claude_prompt_optimizer")
    assert budget == 40_000

def test_get_budget_unknown_agent_defaults(manager):
    """Test budget default per agente sconosciuto."""
    budget = manager.get_budget("unknown_agent")
    assert budget == 30_000

# === Effective Budget Tests ===

def test_effective_budget_full_streaming(manager):
    """Test budget effettivo con FULL streaming (-40%)."""
    budget = manager.calculate_effective_budget("orchestrator", StreamingMode.FULL)
    assert budget == 90_000  # 150K * 0.60

def test_effective_budget_partial_streaming(manager):
    """Test budget effettivo con PARTIAL streaming (-25%)."""
    budget = manager.calculate_effective_budget("database_expert", StreamingMode.PARTIAL)
    assert budget == 52_500  # 70K * 0.75

# === Budget Enforcement Tests ===

@pytest.mark.asyncio
async def test_budget_enforcer_warning_at_80_percent():
    """Test warning quando usage >80%."""
    enforcer = BudgetEnforcer()
    action = await enforcer.check_budget("orchestrator", 120_000)  # 80% of 150K
    assert action == BudgetAction.WARNING

@pytest.mark.asyncio
async def test_budget_enforcer_throttle_at_90_percent():
    """Test throttle quando usage >90%."""
    enforcer = BudgetEnforcer()
    action = await enforcer.check_budget("orchestrator", 135_000)  # 90% of 150K
    assert action == BudgetAction.THROTTLE

@pytest.mark.asyncio
async def test_budget_enforcer_stop_at_100_percent():
    """Test stop quando usage >=100%."""
    enforcer = BudgetEnforcer()
    action = await enforcer.check_budget("orchestrator", 150_000)  # 100% of 150K
    assert action == BudgetAction.STOP
```

---

## Integration Tests

### 1. Core Agents Integration Tests (15 tests)

**File**: `tests/integration/test_core_agents.py`

```python
import pytest
from lib.facade import orchestrator, analyzer, coder, reviewer, documenter

# === Orchestrator Integration ===

@pytest.mark.asyncio
async def test_orchestrator_delegates_to_registry():
    """Test orchestrator usa ClaudeToolRegistry."""
    result = await orchestrator.execute_task("analyze code")
    assert result.registry_used == True

@pytest.mark.asyncio
async def test_orchestrator_batch_execution():
    """Test orchestrator esegue batch di task."""
    tasks = [
        Task(description="analyze file1.py"),
        Task(description="analyze file2.py"),
        Task(description="analyze file3.py"),
    ]
    results = await orchestrator.execute_batch(tasks)
    assert len(results) == 3

@pytest.mark.asyncio
async def test_orchestrator_resilience_on_agent_failure():
    """Test orchestrator resilience quando agente fallisce."""
    # Simula failure
    with mock.patch("lib.facade.analyzer.analyze", side_effect=Exception("fail")):
        result = await orchestrator.execute_task("analyze code")
        assert result.status == "recovered"
        assert result.fallback_used == True

# === Analyzer Integration ===

@pytest.mark.asyncio
async def test_analyzer_uses_streaming():
    """Test analyzer usa Fine-Grained Streaming."""
    result = await analyzer.analyze_code("print('hello')")
    assert result.streaming_mode == StreamingMode.FULL
    assert result.chunks_received > 0

@pytest.mark.asyncio
async def test_analyzer_budget_enforced():
    """Test analyzer rispetta budget."""
    result = await analyzer.analyze_code(large_codebase())
    assert result.tokens_used <= 100_000

# === Coder Integration ===

@pytest.mark.asyncio
async def test_coder_generates_code():
    """Test coder genera codice funzionale."""
    result = await coder.generate_code("create a function that adds two numbers")
    assert "def add" in result.code
    assert result.streaming_mode == StreamingMode.FULL

@pytest.mark.asyncio
async def test_coder_budget_enforced():
    """Test coder rispetta budget."""
    result = await coder.generate_code(complex_requirement())
    assert result.tokens_used <= 120_000

# === Reviewer Integration ===

@pytest.mark.asyncio
async def test_reviewer_uses_streaming():
    """Test reviewer usa streaming."""
    result = await reviewer.review_code("def foo(): pass")
    assert result.streaming_mode == StreamingMode.FULL

# === Documenter Integration ===

@pytest.mark.asyncio
async def test_documenter_generates_docs():
    """Test documenter genera documentazione."""
    result = await documenter.generate_docs("def foo(): pass")
    assert "foo" in result.documentation
    assert result.streaming_mode == StreamingMode.FULL

# === Cross-Agent Integration ===

@pytest.mark.asyncio
async def test_agent_team_coordination():
    """Test coordinamento team di agenti."""
    team = AgentTeam(lead=orchestrator)
    team.add_teammate(analyzer)
    team.add_teammate(coder)

    result = await team.execute("refactor authentication module")
    assert result.all_teammates_completed == True

@pytest.mark.asyncio
async def test_delegation_chain_l2_to_l1_to_core():
    """Test chain delegazione L2→L1→Core."""
    result = await claude_prompt_optimizer.optimize("complex prompt")
    assert result.delegation_chain == ["L2→L1→Core"]
```

### 2. L1 Experts Integration Tests (12 tests)

**File**: `tests/integration/test_l1_experts.py`

```python
@pytest.mark.asyncio
async def test_database_expert_partial_streaming():
    """Test database expert usa PARTIAL streaming."""
    result = await database_expert.optimize_query("SELECT * FROM users")
    assert result.streaming_mode == StreamingMode.PARTIAL

@pytest.mark.asyncio
async def test_security_expert_partial_streaming():
    """Test security expert usa PARTIAL streaming."""
    result = await security_expert.scan_code("eval(user_input)")
    assert result.streaming_mode == StreamingMode.PARTIAL

@pytest.mark.asyncio
async def test_all_l1_experts_budget_under_70k():
    """Test tutti L1 rispettano budget <70K."""
    for expert in L1_EXPERTS:
        result = await expert.execute("test task")
        assert result.tokens_used <= 70_000

# === Batch L1 Tests ===

@pytest.mark.asyncio
async def test_batch_l1_execution():
    """Test esecuzione batch di L1 experts."""
    experts = [database_expert, security_expert, integration_expert]
    results = await execute_batch(experts, ["task1", "task2", "task3"])
    assert all(r.streaming_mode == StreamingMode.PARTIAL for r in results)
```

### 3. End-to-End Integration Tests (8 tests)

**File**: `tests/integration/test_e2e.py`

```python
@pytest.mark.asyncio
async def test_full_workflow_analyze_code_fix_review():
    """Test workflow completo: analyze → code → fix → review."""
    # Step 1: Analyze
    analysis = await analyzer.analyze_code(buggy_code())

    # Step 2: Generate fix
    fix = await coder.generate_fix(analysis.issues)

    # Step 3: Review fix
    review = await reviewer.review_code(fix.code)

    assert review.approved == True

@pytest.mark.asyncio
async def test_full_workflow_with_resilience():
    """Test workflow completo con failure injection."""
    injector = ChaosInjector(failure_type=FailureType.API_ERROR, rate=0.1)

    with injector:
        result = await orchestrator.execute_task("complex task")

    assert result.resilience_recoveries > 0
    assert result.status == "success"
```

---

## E2E Tests

### 1. User Journey Tests (10 tests)

**File**: `tests/e2e/test_user_journeys.py`

```python
@pytest.mark.e2e
@pytest.mark.asyncio
async def test_user_requests_code_generation():
    """Test: User richiede generazione codice."""
    # User input
    request = "Create a REST API endpoint for user authentication"

    # Orchestrator processing
    result = await orchestrator.process(request)

    # Assertions
    assert result.status == "completed"
    assert "endpoint" in result.code.lower()
    assert result.tokens_saved >= 0.85  # 85%+ savings

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_user_requests_code_review():
    """Test: User richiede code review."""
    code = """
    def login(username, password):
        query = f"SELECT * FROM users WHERE username='{username}'"
        return db.execute(query)
    """

    result = await orchestrator.process(f"Review this code: {code}")

    assert "SQL injection" in result.feedback
    assert result.streaming_used == True

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_user_requests_refactoring():
    """Test: User richiede refactoring."""
    code = "def process(data): return data"

    result = await orchestrator.process(f"Refactor this: {code}")

    assert result.status == "completed"
    assert result.refactored_code != code
```

### 2. Error Recovery E2E Tests (8 tests)

**File**: `tests/e2e/test_error_recovery.py`

```python
@pytest.mark.e2e
@pytest.mark.asyncio
async def test_api_rate_limit_recovery():
    """Test recovery da rate limit."""
    with mock_rate_limit(anthropic_api, duration=10):
        result = await orchestrator.process("analyze code")

    assert result.status == "completed"
    assert result.retries > 0

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_agent_crash_recovery():
    """Test recovery da crash agente."""
    with mock_agent_crash(coder):
        result = await orchestrator.process("generate code")

    assert result.status == "completed"
    assert result.fallback_agent_used == True
```

### 3. Performance E2E Tests (7 tests)

**File**: `tests/e2e/test_performance.py`

```python
@pytest.mark.e2e
@pytest.mark.asyncio
async def test_100_concurrent_tasks():
    """Test 100 task concorrenti."""
    tasks = [f"task_{i}" for i in range(100)]
    results = await orchestrator.process_batch(tasks)

    assert len(results) == 100
    assert all(r.status == "completed" for r in results)

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_token_savings_85_percent():
    """Test token savings >=85%."""
    baseline = await measure_baseline_tokens("complex task")
    v17 = await measure_v17_tokens("complex task")

    savings = (baseline - v17) / baseline
    assert savings >= 0.85
```

---

## Performance Benchmarks

### 1. Token Usage Benchmarks (5 tests)

**File**: `tests/performance/test_token_benchmarks.py`

```python
@pytest.mark.benchmark
def test_token_overhead_streaming_full(benchmark):
    """Benchmark token overhead con FULL streaming."""
    result = benchmark(
        measure_token_overhead,
        streaming_mode=StreamingMode.FULL
    )
    assert result.overhead <= 1500  # tokens

@pytest.mark.benchmark
def test_token_overhead_streaming_partial(benchmark):
    """Benchmark token overhead con PARTIAL streaming."""
    result = benchmark(
        measure_token_overhead,
        streaming_mode=StreamingMode.PARTIAL
    )
    assert result.overhead <= 3000  # tokens

@pytest.mark.benchmark
def test_batch_vs_sequential_tokens(benchmark):
    """Benchmark batch vs sequential execution."""
    sequential = benchmark(measure_sequential_tokens, n_tools=10)
    batch = benchmark(measure_batch_tokens, n_tools=10)

    assert batch < sequential * 0.3  # 70%+ savings
```

### 2. Latency Benchmarks (5 tests)

**File**: `tests/performance/test_latency_benchmarks.py`

```python
@pytest.mark.benchmark
def test_tool_discovery_latency(benchmark):
    """Benchmark tool discovery latency."""
    result = benchmark(
        measure_discovery_latency,
        query="query_api_users"
    )
    assert result.p95 < 0.005  # 5ms

@pytest.mark.benchmark
def test_cache_hit_latency(benchmark):
    """Benchmark cache hit latency."""
    result = benchmark(measure_cache_hit_latency)
    assert result.mean < 0.001  # 1ms

@pytest.mark.benchmark
def test_batch_execution_latency(benchmark):
    """Benchmark batch execution latency."""
    result = benchmark(
        measure_batch_latency,
        n_tools=10
    )
    assert result.mean < 1.0  # 1 second
```

### 3. Throughput Benchmarks (5 tests)

**File**: `tests/performance/test_throughput_benchmarks.py`

```python
@pytest.mark.benchmark
def test_max_concurrent_tasks(benchmark):
    """Benchmark max task concorrenti."""
    result = benchmark(measure_max_throughput)
    assert result.tasks_per_second >= 100

@pytest.mark.benchmark
def test_memory_per_task(benchmark):
    """Benchmark memoria per task."""
    result = benchmark(measure_memory_per_task)
    assert result.bytes < 100  # <100 bytes per task
```

---

## Test Automation

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: V17 Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Unit Tests
        run: pytest tests/unit/ -v --cov=lib --cov-report=xml

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Integration Tests
        run: pytest tests/integration/ -v

  e2e-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Run E2E Tests
        run: pytest tests/e2e/ -v --timeout=300

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Run Performance Benchmarks
        run: pytest tests/performance/ -v --benchmark-only
```

### Test Commands

```bash
# Run all tests
pytest

# Run specific category
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/
pytest tests/performance/

# Run with coverage
pytest --cov=lib --cov-report=html

# Run benchmarks only
pytest -m benchmark

# Run smoke tests only
pytest -m smoke

# Parallel execution
pytest -n auto
```

---

## Coverage Requirements

| Modulo | Target Coverage | Current |
|--------|-----------------|---------|
| claude_tool_registry.py | 95% | - |
| tool_discovery.py | 95% | - |
| hybrid_resilience.py | 95% | - |
| warm_cache.py | 90% | - |
| hierarchical_budget.py | 95% | - |
| fine_grained_streamer.py | 90% | - |
| **OVERALL** | **90%** | - |

---

**Version**: 1.0
**Author**: Orchestrator Team
**Date**: 2026-03-09
