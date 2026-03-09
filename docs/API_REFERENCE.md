---
title: API Reference - Orchestrator V15.1.0
version: 15.1.0
last_updated: 2026-03-08
language: it
module: facade
tags: [api, facade, routing, chaos, distributed-lock]
---

# API Reference - Orchestrator V15.1.0

Riferimento completo per l'API Facade dell'Orchestrator. Un singolo punto di accesso per 21 moduli organizzati in 17 namespace logici.

## Indice

1. [Overview](#overview)
2. [Facade API (17 Namespace)](#facade-api-17-namespace)
3. [Core Modules](#core-modules)
4. [Nuove API V15.1](#nuove-api-v151)
5. [Esempi di Utilizzo](#esempi-di-utilizzo)
6. [Guida alla Migrazione](#guida-alla-migrazione)

---

## Overview

L'API Facade fornisce un'interfaccia unificata per tutti i moduli lib dell'orchestrator.

**Statistiche:**
- **Namespace:** 17
- **Exports:** 129 (17 namespace + 112 classi/funzioni)
- **Moduli Core:** 21
- **Test Coverage:** 85%+

**Import Base:**
```python
from lib.facade import exports

# Accesso via namespace
selector = exports.selection.AgentSelector()
cache = exports.cache.get_predictive_cache()

# Import diretto
from lib.facade import AgentSelector, ChaosInjector, RoutingEngineV2
```

---

## Facade API (17 Namespace)

### 1. selection - Selezione Agent

Selezione agent ML-based con tracking performance.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `AgentSelector` | Selettore agent con keyword indexing |
| `AgentPerformanceDB` | Database SQLite per metriche agent |
| `AgentMetrics` | Dataclass per metriche agent |
| `ConnectionPool` | Pool thread-safe per connessioni SQLite |
| `KeywordInvertedIndex` | Indice O(1) per keyword matching |

```python
from lib.facade import selection

selector = selection.AgentSelector()
best_agent = selector.select_agent(task_description, candidates)
```

### 2. locks - Locking File

Locking file thread-safe con supporto reentrant.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `FileLockManager` | Manager lock file thread-safe |
| `HeartbeatManager` | Monitoraggio health lock |
| `LockInfo` | Metadata lock dataclass |
| `is_shutting_down()` | Check stato shutdown globale |

```python
from lib.facade import locks

fm = locks.FileLockManager()
if fm.acquire(path, holder_id, timeout=30.0):
    try:
        # Modifica file
        pass
    finally:
        fm.release(path, holder_id)
```

### 3. cache - Cache Predittiva

Cache predittiva per agent con pattern matching.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `PredictiveAgentCache` | Cache con predizione agent |
| `Prediction` | Singola predizione agent |
| `AgentSequence` | Pattern sequenza agent |
| `get_predictive_cache()` | Accesso singleton |

```python
from lib.facade import cache

pred_cache = cache.get_predictive_cache()
predictions = pred_cache.predict_next_agents(task, context)
pred_cache.preload_agents(predictions)
```

### 4. budget - Budget Token Adattivo

Gestione budget token con scoring complessita.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `AdaptiveTokenBudget` | Calcolatore budget principale |
| `BudgetCache` | Cache LRU con TTL per risultati |
| `ComplexityThresholds` | Soglie adattive per complessita |
| `RuleBudgetConfig` | Configurazione dinamica regole (20-60%) |
| `TokenBudget` | Tier budget dataclass |
| `get_budget_calculator()` | Accesso singleton |

```python
from lib.facade import budget

calc = budget.get_budget_calculator()
budget_info = calc.calculate_budget(task, context)
print(f"Allocati: {budget_info.total_tokens} token")
```

### 5. testing - A/B Testing

Framework per esperimenti A/B con test statistici.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `ABTestingFramework` | Framework principale per esperimenti |
| `RoutingStrategy` | Configurazione strategia dataclass |
| `Experiment` | Definizione esperimento dataclass |
| `ExperimentResult` | Risultato statistico con z-test |

```python
from lib.facade import testing

ab = testing.ABTestingFramework()
control = testing.RoutingStrategy("default", {"mode": "haiku"})
treatment = testing.RoutingStrategy("fast", {"mode": "haiku", "cache": True})
exp = ab.create_experiment("routing_test", control, treatment)
variant = ab.assign_variant("routing_test", "user_123")
```

### 6. tuning - Ottimizzazione Bayesiana

Ottimizzazione parametri con Gaussian Process.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `AutoTuner` | Tuner principale con ottimizzazione Bayesiana |
| `AutoTunerConfig` | Configurazione dataclass |
| `TunableParameter` | Definizione parametro dataclass |
| `OptimizationResult` | Risultato con parametri suggeriti |
| `GaussianProcessRegressor` | GP con kernel RBF |

```python
from lib.facade import tuning

tuner = tuning.AutoTuner()
params = tuner.suggest_parameters()
tuner.record_outcome(params, {"success_rate": 0.95})
best = tuner.get_best_parameters()
```

### 7. ml - Machine Learning Utilities

Utilita ML con fallback puro Python.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `GaussianProcessFallback` | GP puro Python con kernel RBF |
| `get_gp_implementation()` | Ritorna GP NumPy o fallback |
| `has_numpy()` | Check disponibilita NumPy |

```python
from lib.facade import ml

gp = ml.get_gp_implementation()
gp.fit(X_train, y_train)
means, variances = gp.predict(X_test)
```

### 8. skills - Sistema Plugin Skill

Sistema plugin per skill con hot-reload.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `SkillInterface` | Classe base astratta per skill |
| `SkillResult` | Risultato esecuzione skill dataclass |
| `SkillPluginLoader` | Loader dinamico con hot-reload |
| `SkillMdWrapper` | Wrapper per skill basate su SKILL.md |
| `create_skill_plugin()` | Factory function per plugin |

```python
from lib.facade import skills

loader = skills.SkillPluginLoader()
skill = loader.load_skill("orchestrator")
result = skill.execute(context)
```

### 9. rules - Gestione Regole

Gestione excerpt regole con budget awareness.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `RuleExcerptManager` | Manager caricamento regole |
| `RuleExcerpt` | Excerpt regola con metadata |
| `EXCERPT_CATEGORIES` | Categorie regole disponibili |
| `PRIORITY_ORDER` | Mapping priorita categorie |

```python
from lib.facade import rules

manager = rules.RuleExcerptManager()
excerpts = manager.get_excerpts(
    categories=["security", "database"],
    max_tokens=500
)
```

### 10. lazy - Lazy Loading Agent

Caricamento on-demand per agent L2 specialisti.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `LazyAgentLoader` | Loader on-demand per L2 |
| `AgentUsageTracker` | Tracking pattern utilizzo |
| `L2AgentInfo` | Metadata agent L2 dataclass |
| `L2_AGENTS` | Dizionario definizioni agent L2 |
| `get_lazy_agent_loader()` | Accesso singleton |
| `is_l2_agent()` | Check se agent e L2 |

```python
from lib.facade import lazy

loader = lazy.get_lazy_agent_loader()
agent = loader.load_agent("GUI Layout Specialist L2")
is_l2 = lazy.is_l2_agent("Coder")  # False
```

### 11. process - Gestione Processi

Gestione lifecycle processi con cleanup garantito.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `ProcessManager` | Spawning centralizzato con cleanup |
| `ProcessInfo` | Metadata processo dataclass |

```python
from lib.facade import process

pm = process.ProcessManager()
with pm.spawn(["python", "script.py"]) as proc:
    result = proc.communicate(timeout=30)
```

### 12. rate_limiter - Rate Limiting Adattivo

Rate limiting con token bucket e circuit breaker.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `AdaptiveRateLimiter` | Rate limiter principale |
| `TokenBucket` | Algoritmo token bucket |
| `MetricsWindow` | Sliding window per metriche |
| `CircuitBreaker` | Circuit breaker per fault tolerance |
| `CircuitState` | Stati circuit breaker enum |
| `RateLimitError` | Eccezione rate limit |
| `get_rate_limiter()` | Accesso singleton |
| `reset_rate_limiter()` | Reset singleton (testing) |
| `rate_limit()` | Decoratore per funzioni sync |
| `async_rate_limit()` | Decoratore per funzioni async |

```python
from lib.facade import rate_limiter

limiter = rate_limiter.get_rate_limiter()

if limiter.acquire("api"):
    process_request()
    limiter.record_outcome("api", success=True, latency_ms=50)

@rate_limiter.rate_limit("api")
def call_api():
    return requests.get("https://api.example.com")
```

### 13. exceptions - Gerarchia Eccezioni

Gerarchia eccezioni custom con chaining support.

| Classe | Descrizione |
|--------|-------------|
| `OrchestratorError` | Base per tutte le eccezioni |
| `AgentError` | Problemi agent |
| `AgentNotFoundError` | Agent non trovato nel registry |
| `AgentExecutionError` | Esecuzione agent fallita |
| `TaskError` | Problemi task |
| `TaskTimeoutError` | Task superato timeout |
| `TaskValidationError` | Validazione task fallita |
| `LockError` | Problemi lock |
| `LockAcquisitionError` | Acquisizione lock fallita |
| `LockTimeoutError` | Timeout acquisizione lock |
| `DeadlockError` | Deadlock rilevato |
| `DistributedLockError` | Problemi lock distribuito |
| `ConfigurationError` | Problemi configurazione |
| `RoutingError` | Problemi routing |
| `CacheError` | Problemi cache |
| `DatabaseError` | Problemi database |

```python
from lib.facade import exceptions

try:
    result = some_operation()
except exceptions.AgentError as e:
    print(f"Agent error: {e}")
    chain = exceptions.get_exception_chain(e)
```

### 14. wave_executor - Esecuzione a Ondate (V15.1)

Esecuzione parallela task organizzati per depth level.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `WaveExecutor` | Executor principale per wave |
| `Wave` | Singola wave di esecuzione |
| `WaveStatus` | Stato wave enum |
| `TaskResult` | Risultato esecuzione task |
| `UltraTask` | Task ottimizzato con dipendenze |
| `ResourcePool` | Pool risorse per esecuzione |
| `BackpressureController` | Controllo sovraccarico |
| `create_simple_task()` | Crea task senza dipendenze |
| `create_dependent_task()` | Crea task con dipendenze |
| `get_wave_executor()` | Accesso singleton |

```python
from lib.facade import wave_executor

executor = wave_executor.WaveExecutor()
tasks = [
    wave_executor.create_simple_task("t1", "Task 1", handler),
    wave_executor.create_dependent_task("t2", "Task 2", handler, {"t1"}),
]
results = await executor.execute_tree(tasks)
```

### 15. backpressure - Controllo Sovraccarico (V15.2)

Rilevamento sovraccarico e throttling automatico.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `BackpressureController` | Controller principale |
| `ThrottleState` | Stati throttling enum |
| `SystemMetrics` | Metriche sistema dataclass |
| `BackpressureConfig` | Configurazione controller |
| `THRESHOLDS` | Soglie transizione stato |
| `get_backpressure_controller()` | Accesso singleton |

```python
from lib.facade import backpressure

controller = backpressure.get_backpressure_controller()
delay = controller.check_and_throttle()
if delay > 0:
    time.sleep(delay)

with controller.task_context() as accepted:
    if accepted:
        execute_task()
```

---

## Nuove API V15.1

### 16. chaos - Chaos Engineering

Iniezione controllata di failure per resilience testing.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `ChaosInjector` | Singleton per chaos injection |
| `ChaosConfig` | Configurazione dataclass |
| `ChaosEvent` | Record evento dataclass |
| `FailureType` | Enum tipi di failure |
| `get_chaos_injector()` | Accesso singleton |
| `configure_chaos()` | Configura injector globale |

**FailureType disponibili:**
- `NETWORK` - Failure di rete
- `TIMEOUT` - Timeout simulato
- `LATENCY` - Latenza aggiunta
- `ERROR` - Errore generico
- `RESOURCE_EXHAUSTION` - Esaurimento risorse

```python
from lib.facade import chaos

injector = chaos.get_chaos_injector()
if injector.should_inject(chaos.FailureType.NETWORK):
    raise ConnectionError("Simulated failure")

# Context manager
with injector.chaos_context("api_call") as ctx:
    if ctx.network_failure:
        handle_failure()
```

### 17. distributed_lock - Lock Distribuito

Lock distribuiti basati su Redis con fallback file.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `DistributedLockManager` | Manager lock async principale |
| `FileDistributedLockManager` | Manager lock sync file-based |
| `LockMetadata` | Metadata lock dataclass |
| `LockBackend` | Interfaccia backend astratta |
| `RedisLockBackend` | Implementazione Redis |
| `FileLockBackend` | Implementazione file-based |
| `get_distributed_lock_manager()` | Accesso singleton |

```python
from lib.facade import distributed_lock

# Async context manager
async with distributed_lock.DistributedLockManager() as lock_mgr:
    async with lock_mgr.lock("resource", "holder", ttl=30):
        # Accesso esclusivo
        pass

# Sync file-based
file_lock = distributed_lock.FileDistributedLockManager()
if file_lock.acquire("resource", "holder"):
    try:
        # Work
        pass
    finally:
        file_lock.release("resource", "holder")
```

### 18. routing - Routing Engine V2

Routing agent multi-livello con 4 layer keyword matching.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `RoutingEngineV2` | Engine routing principale |
| `RoutingMetrics` | Metriche decision routing |
| `LayerStats` | Statistiche per-layer |
| `PrefixTrie` | Prefix matching O(k) |
| `InvertedIndex` | Keyword lookup O(1) |
| `SemanticCache` | Cache cluster semantici |
| `get_routing_engine_v2()` | Accesso singleton |
| `reset_routing_engine_v2()` | Reset singleton (testing) |

**4 Layer Routing:**
1. **Exact Match** - Match esatto keyword
2. **Prefix Match** - Match prefisso con trie
3. **Fuzzy Match** - Match fuzzy per errori typo
4. **Semantic Match** - Match semantico per sinonimi

```python
from lib.facade import routing

engine = routing.get_routing_engine_v2()
engine.build_from_routing_table({"python": "Coder", "test": "Tester"})
agent = engine.route("write a python test")
print(f"Selezionato: {agent}")

# Metriche
metrics = engine.get_performance_summary()
```

### 19. hot_reload - Hot Reload Plugin

Ricaricamento automatico skill su modifica file.

| Classe/Funzione | Descrizione |
|-----------------|-------------|
| `PluginHotReloader` | Classe hot-reloader principale |
| `HotReloadError` | Eccezione base errori hot-reload |
| `SkillLoadError` | Eccezione caricamento skill fallito |
| `DependencyError` | Eccezione risoluzione dipendenze |
| `SkillVersion` | Tracking versione dataclass |
| `HotReloadMetrics` | Metriche dataclass |
| `health_check()` | Check health sistema hot-reload |

```python
from lib.facade import hot_reload
from pathlib import Path

reloader = hot_reload.PluginHotReloader(Path("skills"))
reloader.register_callback(lambda name: print(f"Ricaricato: {name}"))
reloader.start()

# Check versione
version = reloader.get_skill_version("orchestrator")

# Reload manuale
success = reloader.reload_skill("orchestrator")

reloader.stop()

# Health check
status = hot_reload.health_check(reloader)
```

---

## Esempi di Utilizzo

### Esempio 1: Routing Task ad Agent

```python
from lib.facade import routing, selection

# Inizializza routing engine
engine = routing.get_routing_engine_v2()
engine.build_from_routing_table({
    "python": "Coder",
    "test": "Tester",
    "security": "SecurityReviewer",
    "api": "APIArchitect",
})

# Route task
task = "write a python test for user authentication"
agent = engine.route(task)
print(f"Agent selezionato: {agent}")

# Con selector ML-based
selector = selection.AgentSelector()
candidates = ["Coder", "Tester", "SecurityReviewer"]
best = selector.select_agent(task, candidates)
```

### Esempio 2: Gestione Budget Token

```python
from lib.facade import budget

calc = budget.get_budget_calculator()

# Calcola budget per task
task_context = {
    "description": "Refactor authentication module",
    "complexity": "high",
    "files_count": 15,
}

budget_info = calc.calculate_budget(task, task_context)
print(f"Token allocati: {budget_info.total_tokens}")
print(f"Per regole: {budget_info.rules_budget}")
print(f"Per contesto: {budget_info.context_budget}")
```

### Esempio 3: Chaos Engineering

```python
from lib.facade import chaos

# Configura chaos
chaos.configure_chaos(
    enabled=True,
    failure_rate=0.1,  # 10% failure rate
    failure_types=[chaos.FailureType.NETWORK, chaos.FailureType.TIMEOUT],
)

injector = chaos.get_chaos_injector()

# Inietta failure controllate
def call_external_api():
    if injector.should_inject(chaos.FailureType.NETWORK):
        raise ConnectionError("Simulated network failure")

    if injector.should_inject(chaos.FailureType.TIMEOUT):
        time.sleep(30)  # Simula timeout

    # Chiamata reale
    return requests.get("https://api.example.com")
```

### Esempio 4: Lock Distribuito

```python
import asyncio
from lib.facade import distributed_lock

async def process_with_lock(resource_id: str):
    lock_mgr = distributed_lock.get_distributed_lock_manager()

    async with lock_mgr.lock(resource_id, "worker-1", ttl=30):
        # Accesso esclusivo alla risorsa
        result = await expensive_operation(resource_id)
        return result

# Esegui
asyncio.run(process_with_lock("shared-resource-123"))
```

### Esempio 5: Esecuzione Parallela a Ondate

```python
import asyncio
from lib.facade import wave_executor

async def task_handler(task_id: str):
    await asyncio.sleep(1)
    return f"Result for {task_id}"

async def main():
    executor = wave_executor.get_wave_executor()

    # Crea albero task
    tasks = [
        wave_executor.create_simple_task("t1", "Root Task 1", task_handler),
        wave_executor.create_simple_task("t2", "Root Task 2", task_handler),
        wave_executor.create_dependent_task("t3", "Child of t1", task_handler, {"t1"}),
        wave_executor.create_dependent_task("t4", "Child of t1", task_handler, {"t1"}),
        wave_executor.create_dependent_task("t5", "Child of t2", task_handler, {"t2"}),
    ]

    # Esegui
    results = await executor.execute_tree(tasks)

    for task_id, result in results.items():
        status = "OK" if result.success else "FAIL"
        print(f"{task_id}: {status}")

    # Summary
    summary = executor.get_summary()
    print(f"Success rate: {summary['success_rate']:.2%}")

asyncio.run(main())
```

### Esempio 6: Rate Limiting Adattivo

```python
from lib.facade import rate_limiter

# Configura rate limiter
limiter = rate_limiter.get_rate_limiter()

# Uso manuale
def call_api_with_retry():
    for attempt in range(5):
        if limiter.acquire("api"):
            try:
                response = requests.get("https://api.example.com")
                limiter.record_outcome("api", success=True, latency_ms=50)
                return response
            except Exception as e:
                limiter.record_outcome("api", success=False, latency_ms=100)
                raise
        else:
            retry_after = limiter.get_retry_after("api")
            time.sleep(retry_after)

# Uso con decoratore
@rate_limiter.rate_limit("api")
def call_api():
    return requests.get("https://api.example.com")
```

---

## Guida alla Migrazione

### Da V14.x a V15.1

**1. Import Aggiornati:**

```python
# V14.x (deprecato)
from lib.agent_selector import AgentSelector
from lib.predictive_cache import PredictiveAgentCache

# V15.1 (consigliato)
from lib.facade import selection, cache

selector = selection.AgentSelector()
pred_cache = cache.get_predictive_cache()
```

**2. Nuove Eccezioni:**

```python
# V14.x
raise Exception("Agent not found")

# V15.1
from lib.facade import exceptions
raise exceptions.AgentNotFoundError("Agent not found in registry")
```

**3. Rate Limiting:**

```python
# V14.x - Rate limiting manuale
time.sleep(1)

# V15.1 - Rate limiting adattivo
from lib.facade import rate_limiter
limiter = rate_limiter.get_rate_limiter()
if limiter.acquire("api"):
    # Process
    pass
```

**4. Routing Engine:**

```python
# V14.x - Routing semplice
routing_table = {"python": "Coder"}
agent = routing_table.get(keyword, "Coder")

# V15.1 - Routing multi-livello
from lib.facade import routing
engine = routing.get_routing_engine_v2()
engine.build_from_routing_table(routing_table)
agent = engine.route("write a python test")
```

### Compatibilita

| Versione | Status | Note |
|----------|--------|------|
| V15.1.x | Stable | Versione corrente |
| V15.0.x | Supported | Bug fixes solo |
| V14.x | Deprecated | Migrare a V15.1 |
| V13.x | EOL | Non supportato |

---

## Riferimenti

- [Orchestrator SKILL.md](../skills/orchestrator/SKILL.md)
- [Routing Table](../skills/orchestrator/docs/reference/routing-table.md)
- [Error Recovery](../skills/orchestrator/docs/error-recovery.md)
- [AI-Native Features](../skills/orchestrator/docs/ai-native-features.md)

---

**Versione:** 15.1.0
**Ultimo Aggiornamento:** 2026-03-08
**Autore:** Orchestrator Team
