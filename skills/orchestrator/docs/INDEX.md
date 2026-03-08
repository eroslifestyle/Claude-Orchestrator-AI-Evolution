# Orchestrator Documentation Index V15.1.0

> **Version:** 15.1.0 Facade API Unified | **Last Updated:** 2026-03-08
> **Total Documents:** 25 | **Total Lines:** ~9,500
> **Agents:** 43 (6 core + 22 L1 + 15 L2) | **Skills:** 32 | **Facade Exports:** 129

---

## Overview

| # | Document | Description | Lines |
|---|----------|-------------|-------|
| 1 | [changelog.md](./changelog.md) | Version history and release notes (V15.1.0 Facade API) | 280 |
| 2 | [AUDIT-REPORT-V12.0.md](./AUDIT-REPORT-V12.0.md) | Deep audit findings and resolutions | 413 |
| 3 | [setup-guide.md](./setup-guide.md) | Step-by-step installation and configuration | 74 |
| 4 | [architecture.md](./architecture.md) | System architecture and component overview | 124 |
| 5 | [troubleshooting.md](./troubleshooting.md) | Common issues and solutions | 139 |
| 6 | [memory-integration.md](./memory-integration.md) | Persistent context across sessions | 735 |
| 7 | [health-check.md](./health-check.md) | System health monitoring and diagnostics | 819 |
| 8 | [observability.md](./observability.md) | Metrics, logging, tracing, alerting | 1,164 |
| 9 | [test-suite.md](./test-suite.md) | Comprehensive validation tests (149 tests) | ~1,500 |
| 10 | [examples.md](./examples.md) | End-to-end workflow examples | 248 |
| 11 | [error-recovery.md](./error-recovery.md) | Automatic error detection and fallback | 149 |
| 12 | [windows-support.md](./windows-support.md) | Windows-specific configuration | 112 |
| 13 | [routing-table.md](./routing-table.md) | Agent routing configuration (DEPRECATED) | 18 |
| 14 | [skills-reference.md](./skills-reference.md) | Claude Code skills system reference | 219 |
| 15 | [team-patterns.md](./team-patterns.md) | Agent team patterns (DEPRECATED) | 35 |
| 16 | [mcp-integration.md](./mcp-integration.md) | MCP server management and routing | 171 |
| 17 | [bimodal-routing.md](./bimodal-routing.md) | Bimodal profile system (cca/ccg) | 265 |
| 18 | [facade-api.md](./facade-api.md) | Unified Facade API (17 namespaces) | 320 |
| 19 | [chaos-engineering.md](./chaos-engineering.md) | ChaosInjector usage and patterns | 185 |
| 20 | [distributed-locking.md](./distributed-locking.md) | Redis-based distributed locks | 145 |
| 21 | [routing-engine-v2.md](./routing-engine-v2.md) | 4-layer keyword routing system | 210 |
| 22 | [hot-reload.md](./hot-reload.md) | Plugin hot-reload mechanism | 165 |

---

## Quick Links

### Getting Started
- [Setup Guide](./setup-guide.md) - Start here for installation
- [Architecture](./architecture.md) - Understand the system design
- [Examples](./examples.md) - Learn by example workflows

### Troubleshooting
- [Troubleshooting Guide](./troubleshooting.md) - Fix common issues
- [Error Recovery](./error-recovery.md) - Automatic recovery system
- [Windows Support](./windows-support.md) - Platform-specific notes

### Reference
- [Health Check](./health-check.md) - System diagnostics
- [Observability](./observability.md) - Monitoring and alerting
- [Memory Integration](./memory-integration.md) - Context persistence
- [Test Suite](./test-suite.md) - Validation tests
- [Facade API](./facade-api.md) - Unified API (17 namespaces)

### V15.1 Features
- [Facade API](./facade-api.md) - Unified Facade with 129 exports
- [Chaos Engineering](./chaos-engineering.md) - ChaosInjector patterns
- [Distributed Locking](./distributed-locking.md) - Redis-based locks
- [Routing Engine V2](./routing-engine-v2.md) - 4-layer keyword matching
- [Hot Reload](./hot-reload.md) - Plugin hot-reload mechanism

---

## Detailed Documentation

### Core Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **setup-guide.md** | Installation and first-time setup | New installations, verifying configuration |
| **architecture.md** | System design, data flow, component map | Understanding how parts connect |
| **troubleshooting.md** | Diagnostics and problem resolution | When things go wrong |
| **examples.md** | 7 end-to-end workflow examples | Learning orchestrator patterns |
| **format-standard.md** | Rules format standardization | When creating/migrating rules files |

### System Modules

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **memory-integration.md** | Cross-session context persistence | Implementing memory features |
| **health-check.md** | 6 diagnostic check types | Running system diagnostics |
| **observability.md** | Metrics, logs, traces, alerts | Setting up monitoring |
| **error-recovery.md** | Recovery matrix, fallback chains | Handling failures gracefully |

### Platform & Integration

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **windows-support.md** | Windows-specific commands and issues | On Windows platforms |
| **mcp-integration.md** | MCP servers, native tools, marketplace | Configuring external tools |
| **skills-reference.md** | Claude Code skills system | Creating or using skills |

### V15.1 New Features

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **facade-api.md** | Unified Facade API (17 namespaces) | Using the facade for imports |
| **chaos-engineering.md** | ChaosInjector usage and patterns | Testing system resilience |
| **distributed-locking.md** | Redis-based distributed locks | Multi-instance coordination |
| **routing-engine-v2.md** | 4-layer keyword routing system | Understanding agent selection |
| **hot-reload.md** | Plugin hot-reload mechanism | Development workflow |

### Testing & Quality

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **test-suite.md** | 149 tests across 11 categories | Validating system health |

### Legacy (Deprecated)
| Document | Status | Replacement |
|----------|--------|-------------|
| **routing-table.md** | DEPRECATED | Integrated in SKILL.md V10.0+ |
| **team-patterns.md** | DEPRECATED | Integrated in SKILL.md V10.0+ |

### Standards
| Document | Status | Purpose |
|----------|--------|---------|
| **format-standard.md** | NEW | Rules format standardization |

---

## Document Categories

### By Function

```
CORE SYSTEM
  setup-guide.md
  architecture.md
  examples.md

OPERATIONS
  health-check.md
  observability.md
  error-recovery.md
  troubleshooting.md

DATA & CONTEXT
  memory-integration.md

INTEGRATION
  mcp-integration.md
  skills-reference.md

PLATFORM
  windows-support.md

QUALITY
  test-suite.md

V15.1 FEATURES
  facade-api.md
  chaos-engineering.md
  distributed-locking.md
  routing-engine-v2.md
  hot-reload.md

LEGACY
  routing-table.md (deprecated)
  team-patterns.md (deprecated)
```

### By Priority

| Priority | Documents |
|----------|-----------|
| **CRITICAL** | setup-guide.md, architecture.md, troubleshooting.md, facade-api.md |
| **HIGH** | memory-integration.md, health-check.md, observability.md, error-recovery.md, routing-engine-v2.md |
| **MEDIUM** | mcp-integration.md, skills-reference.md, test-suite.md, examples.md, chaos-engineering.md, distributed-locking.md, hot-reload.md |
| **LOW** | windows-support.md, routing-table.md, team-patterns.md |

---

## Version History

### V15.1.0 - Facade API Unified (2026-03-08)

#### New Features (5)

| # | Feature | Description | Lines |
|---|---------|-------------|-------|
| 1 | **Facade API** | Unified API with 17 namespaces, 129 exports | 320 |
| 2 | **Chaos Engineering** | ChaosInjector with 6 failure types | 185 |
| 3 | **Distributed Locking** | Redis-based distributed lock manager | 145 |
| 4 | **Routing Engine V2** | 4-layer keyword matching for agent selection | 210 |
| 5 | **Hot Reload** | Plugin hot-reload with version tracking | 165 |

#### Facade Namespaces (17)

| Namespace | Exports | Purpose |
|-----------|---------|---------|
| `agents` | 8 | Agent definitions and selection |
| `skills` | 6 | Skill loading and management |
| `routing` | 12 | RoutingEngineV2 and routing logic |
| `chaos` | 9 | ChaosInjector and failure injection |
| `distributed_lock` | 7 | DistributedLockManager and backends |
| `hot_reload` | 6 | PluginHotReloader |
| `predictive_cache` | 11 | PredictiveAgentCache |
| `adaptive_budget` | 10 | AdaptiveTokenBudget |
| `ab_testing` | 8 | ABTestingFramework |
| `auto_tuner` | 7 | AutoTuner |
| `file_locks` | 9 | FileLockManager |
| `exceptions` | 12 | Custom exception hierarchy |
| `metrics` | 8 | Metrics collection |
| `process` | 6 | Process management |
| `memory` | 5 | Memory integration |
| `utils` | 6 | Utility functions |
| `types` | 5 | Type definitions |

#### Metrics

- **Total Exports:** 129 (17 namespaces + 112 direct)
- **Test Coverage:** 350+ tests (98.8% pass rate)
- **Facade Modules:** 21 core modules

### V14.0.3 - Bug Fix Release (2026-03-07)

#### Limitazioni Risolte (8/8)

| # | Modulo | Limitazione | Soluzione |
|---|--------|-------------|-----------|
| 1 | predictive_cache | No cold start handling | Keyword-based fallback |
| 2 | predictive_cache | Pattern rari persi in deque | Tiered storage (hot/warm/cold) |
| 3 | predictive_cache | No distributed lock | Redis lock opzionale |
| 4 | adaptive_budget | Soglie hard-coded | Adattive da distribuzione |
| 5 | adaptive_budget | 40% rule budget fisso | Dinamico 20-60% |
| 6 | ab_testing | Solo 50/50 split | Multi-variant A/B/C/D |
| 7 | auto_tuner | GP stub | Vero RBF kernel |
| 8 | auto_tuner | n_candidates=20 fisso | Adattivo 5-100 |

#### Stress Test Results

- **170 operazioni simultanee** (60 task + 55 agent + 55 skill)
- **9015 ops/sec** throughput
- **0% error rate**
- **39.82 bytes/op** memory

#### Test Coverage

- predictive_cache: 31 test
- adaptive_budget: 24 test
- ab_testing: 18 test
- auto_tuner: 18 test
- **Totale: 91 test PASS**

### V14.0 AI-NATIVE (2026-03-07)

- **PredictiveAgentCache:** Pattern recognition, accuracy >90%, preload agents
- **AdaptiveTokenBudget:** 200-1500 tokens, complexity-based
- **ABTestingFramework:** Z-test statistics, alpha 0.05
- **AutoTuner:** Bayesian optimization, 4 tunable parameters

### V13.1 SUPER-PERFORMANCE (2026-03-07)

- **DB Optimization:** 3 indexes for 20-40% query speedup
- **Rule Excerpts:** Pre-computed chunks, 70% I/O reduction
- **Lazy L2 Loading:** 15 specialists load on-demand, 30% memory reduction

### V13.0 (2026-03-07)

- **Dynamic Agent Selection:** ML-based routing con performance tracking
- **Plugin Skills Architecture:** Dynamic skill loading con hot-reload
- **File Locks System:** Race condition prevention

---

## External References

### Main Files
- **Main SKILL.md:** [../SKILL.md](../SKILL.md)
- **Version Info:** [../../../VERSION.json](../../../VERSION.json)

### Related Directories
- **Agents:** [../../../agents/](../../../agents/) - 43 agent definitions (6 core + 22 L1 + 15 L2)
- **Skills:** [../../../skills/](../../../skills/) - 26 skills
- **Rules:** [../../../rules/](../../../rules/) - 10 rule files
- **Learnings:** [../../../learnings/](../../../learnings/) - instincts.json
- **Templates:** [../../../templates/](../../../templates/) - 3 templates
- **Workflows:** [../../../workflows/](../../../workflows/) - 4 workflows

### Configuration
- **Settings:** [../../../settings.json](../../../settings.json)
- **Agent Registry:** [../../../plugins/orchestrator-plugin/config/agent-registry.json](../../../plugins/orchestrator-plugin/config/agent-registry.json)

---

## Document Stats

| Metric | Value |
|--------|-------|
| Total Documents | 22 |
| Active Documents | 20 |
| Deprecated Documents | 2 |
| Total Lines | ~9,500 |
| Largest Document | test-suite.md (~1,500 lines) |
| Smallest Document | routing-table.md (18 lines) |
| V15.1 New Documents | 5 (facade-api, chaos, distributed-lock, routing-v2, hot-reload) |

---

## Maintenance Notes

### Last Updated
- **V15.1.0:** 2026-03-08 - Facade API unified (17 namespaces, 129 exports), 5 new docs
- **V14.0.3:** 2026-03-07 - Bug fix release, 8 limitazioni risolte, stress test passed, 91 new tests
- **V14.0 AI-NATIVE:** 2026-03-07 - PredictiveAgentCache, AdaptiveTokenBudget, ABTestingFramework, AutoTuner
- **V13.1 Super-Performance:** 2026-03-07 - DB indexes, Rule Excerpts system, Lazy L2 loading, 6 bug fixes
- **V13.0.1:** 2026-03-07 - Bug fixes (3 CRITICAL, 4 HIGH, 6 MEDIUM/LOW), 3 ADRs, performance optimizations
- **V13.0:** 2026-03-07 - Dynamic Agent Selection, Plugin Skills, File Locks, 5 new lib modules
- **V12.7.1:** 2026-03-07 - Z.AI tools expansion (4 new tools), bimodal routing system
- **V12.0:** 2026-02-26 - Comprehensive audit (56 issues fixed), changelog.md created
- **V11.3.1:** 2026-02-26 - Deep audit fixes, INDEX.md created
- **V11.3:** 2026-02-26 - Version bump, documentation alignment
- **V11.2:** 2026-02-26 - Audit fixes, added setup-guide, troubleshooting, architecture

### Deprecated Files
The following files are retained for backward compatibility but content has been migrated to SKILL.md:
- `routing-table.md` - Agent routing now in SKILL.md
- `team-patterns.md` - Team patterns now in SKILL.md

---

*Orchestrator Documentation Index V15.1.0 Facade API Unified - Generated 2026-03-08*
