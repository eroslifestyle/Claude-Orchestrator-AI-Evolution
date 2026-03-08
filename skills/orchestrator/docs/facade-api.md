# Facade API V15.1.0

> Unified API for Orchestrator V15.1.0 - 17 Namespaces, 129 Exports

## Overview

The Facade API provides a single entry point for all orchestrator functionality through `lib/facade.py`.

## Namespaces (17)

### 1. Selection Namespace
- `AgentPerformanceDB` - Performance tracking database
- `AgentSelector` - ML-based agent selection

### 2. Cache Namespace
- `PredictiveAgentCache` - Predictive caching with ML

### 3. Chaos Namespace
- `ChaosInjector` - Chaos engineering for resilience
- `ChaosConfig` - Configuration dataclass

### 4. Distributed Namespace
- `DistributedLockManager` - Redis-based distributed locks

### 5. Routing Namespace
- `RoutingEngineV2` - 4-layer keyword routing

### 6. Hot Reload Namespace
- `PluginHotReloader` - Plugin hot-reload system

## Usage

```python
from lib.facade import selection, cache, chaos, distributed, routing, hot_reload

# Access components
selector = selection.AgentSelector()
injector = chaos.get_chaos_injector()
engine = routing.RoutingEngineV2()
```

## Direct Exports (112)

All core classes and functions are exported directly:
- `AgentSelector`, `FileLockManager`, `ChaosInjector`, etc.

## Version History

| Version | Changes |
|---------|---------|
| V15.1.0 | Initial release with 17 namespaces |
