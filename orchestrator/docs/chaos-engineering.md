# Chaos Engineering V15.1.0

> ChaosInjector per resilience testing

## Overview

ChaosInjector implements chaos engineering patterns to test system resilience.

## Features

- **Latency Injection**: Add random delays
- **Error Injection**: Simulate failures
- **Resource Exhaustion**: Test under load

## Configuration

```python
from lib.chaos import ChaosInjector, ChaosConfig

config = ChaosConfig(
    enabled=True,
    probability=0.01,  # 1% chance
    max_latency_ms=500,
    safe_environments={"development", "testing"}
)

injector = ChaosInjector(config)
```

## Usage

### As Decorator
```python
@injector.inject_failure(FailureType.NETWORK_ERROR)
async def fetch_data():
    ...
```

### Context Manager
```python
async with chaos_context("api"):
    result = await api_call()
```

## Safe Environments

Chaos is only injected in configured safe environments (default: development, testing).

## Metrics

- `injected_failures_total`: Count of failures injected
- `latency_injected_ms`: Total latency added

## Version History

| Version | Changes |
|---------|---------|
| V15.1.0 | Initial ChaosInjector implementation |
