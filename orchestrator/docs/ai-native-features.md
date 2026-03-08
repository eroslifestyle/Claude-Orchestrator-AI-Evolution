# AI-Native Features (V14.0.2+)

> Auto-optimization with machine learning and predictive caching.

---

## Components Overview

| Component | File | Purpose |
|-----------|------|---------|
| Predictive Agent Cache | `lib/predictive_cache.py` | Predict needed agents from task embedding |
| Adaptive Token Budget | `lib/adaptive_budget.py` | Dynamic token budget based on task complexity |
| A/B Testing Framework | `lib/ab_testing.py` | Test routing strategies with statistical significance |
| Auto-tuning Parameters | `lib/auto_tuner.py` | Bayesian optimization for system parameters |

---

## 1. Predictive Agent Caching (V14.0.2)

**Features:**
- Predicts agents needed based on task embedding
- Pattern recognition for agent sequences
- Preload with confidence threshold (0.7 default)
- Target accuracy: >90%
- Cold start fallback with keyword-based prediction
- Tiered storage (hot/warm/cold) for valuable patterns
- Optional distributed lock for multi-process (Redis)

**Usage:**
```python
from lib.predictive_cache import get_predictive_cache
cache = get_predictive_cache()
predictions = cache.predict_next_agents(task, context)
cache.preload_agents(predictions)
```

---

## 2. Adaptive Token Budget (V14.0.2)

**Features:**
- Dynamic budget based on task complexity
- Range: 200-1500 tokens
- Factors: keyword count, dependency depth, agent count
- 4 tiers: simple, medium, complex, very_complex
- Adaptive thresholds based on historical distribution
- Dynamic rule budget (20-60%) instead of fixed 40%
- Auto-adjust with 100+ samples

**Usage:**
```python
from lib.adaptive_budget import get_budget_calculator
budget_calc = get_budget_calculator()
budget = budget_calc.calculate_budget(task, context)
```

---

## 3. A/B Testing Framework (V14.0.2)

**Features:**
- Create experiments to test routing strategies
- Deterministic variant assignment
- Statistical significance with z-test (p < 0.05)
- Minimum 30 samples per variant
- Multi-variant support (A/B/C/D) with configurable weights
- Chi-square test for N variant comparison
- Latin Hypercube Sampling for uniform distribution

**Usage:**
```python
from lib.ab_testing import ABTestingFramework, RoutingStrategy
ab = ABTestingFramework()
exp = ab.create_experiment("test", control, treatment)
variant = ab.assign_variant("test", user_id)
```

---

## 4. Auto-tuning Parameters (V14.0.2)

**Features:**
- Bayesian optimization for parameters
- Tunable params: cache_ttl, batch_size, pool_size, preload_threshold
- Exploration/exploitation with UCB
- Metric scoring: success_rate, latency, token_efficiency
- True Gaussian Process with RBF kernel
- Adaptive n_candidates (5-100) based on dimensionality
- Latin Hypercube Sampling for candidate generation

**Usage:**
```python
from lib.auto_tuner import AutoTuner
tuner = AutoTuner()
params = tuner.suggest_parameters()
tuner.record_outcome(params, metrics)
```

---

## Performance (Stress Test V14.0.2)

| Metric | Value |
|--------|-------|
| Simultaneous ops | 170 (60 task + 55 agent + 55 skill) |
| Throughput | 9015 ops/sec |
| Error rate | 0% |
| Memory efficiency | 39.82 bytes/op |
