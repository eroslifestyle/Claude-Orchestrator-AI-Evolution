# Orchestrator Documentation Index V12.9

> **Version:** 12.9 | **Last Updated:** 2026-03-06
> **Total Documents:** 22 (20 active, 2 deprecated) | **Total Lines:** ~9,500

---

## Overview

| # | Document | Description | Lines |
|---|----------|-------------|-------|
| 1 | [INDEX.md](./INDEX.md) | This documentation index | 200 |
| 2 | [changelog.md](./changelog.md) | Version history and release notes | 180 |
| 3 | [AUDIT-REPORT-V12.0.md](./AUDIT-REPORT-V12.0.md) | Deep audit V12.0 findings | 413 |
| 4 | [AUDIT-REPORT-V12.1.md](./AUDIT-REPORT-V12.1.md) | Deep audit V12.1 findings | 350 |
| 5 | [setup-guide.md](./setup-guide.md) | Step-by-step installation and configuration | 74 |
| 6 | [architecture.md](./architecture.md) | System architecture and component overview | 124 |
| 7 | [troubleshooting.md](./troubleshooting.md) | Common issues and solutions | 139 |
| 8 | [memory-integration.md](./memory-integration.md) | Persistent context across sessions | 735 |
| 9 | [health-check.md](./health-check.md) | System health monitoring and diagnostics | 819 |
| 10 | [observability.md](./observability.md) | Metrics, logging, tracing, alerting | 1,164 |
| 11 | [test-suite.md](./test-suite.md) | Comprehensive validation tests (58 tests) | ~1,500 |
| 12 | [examples.md](./examples.md) | End-to-end workflow examples | 248 |
| 13 | [error-recovery.md](./error-recovery.md) | Automatic error detection and fallback | 149 |
| 14 | [windows-support.md](./windows-support.md) | Windows-specific configuration | 112 |
| 15 | [routing-table.md](./routing-table.md) | **DEPRECATED** - Migrated to SKILL.md | 18 |
| 16 | [skills-reference.md](./skills-reference.md) | Claude Code skills system reference | 219 |
| 17 | [team-patterns.md](./team-patterns.md) | **DEPRECATED** - Obsolete | 35 |
| 18 | [mcp-integration.md](./mcp-integration.md) | MCP server management and routing | 171 |
| 19 | [migration-v12.md](./migration-v12.md) | Migration guide to V12 | 150 |
| 20 | [automated-testing.md](./automated-testing.md) | Automated testing framework | 200 |
| 21 | [metrics-dashboard.md](./metrics-dashboard.md) | Metrics dashboard setup | 180 |
| 22 | [docs-site-guide.md](./docs-site-guide.md) | Documentation site guide | 120 |

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

### Testing & Quality

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **test-suite.md** | 58 tests across 11 categories | Validating system health |

### Legacy (Deprecated)
| Document | Status | Replacement |
|----------|--------|-------------|
| **routing-table.md** | DEPRECATED | Migrated to SKILL.md - routing logic integrated V10.0+ |
| **team-patterns.md** | DEPRECATED | Obsolete - team patterns restructured in V12.0+ |

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

LEGACY
  routing-table.md (deprecated)
  team-patterns.md (deprecated)
```

### By Priority

| Priority | Documents |
|----------|-----------|
| **CRITICAL** | setup-guide.md, architecture.md, troubleshooting.md |
| **HIGH** | memory-integration.md, health-check.md, observability.md, error-recovery.md |
| **MEDIUM** | mcp-integration.md, skills-reference.md, test-suite.md, examples.md |
| **LOW** | windows-support.md, routing-table.md, team-patterns.md |

---

## External References

### Main Files
- **Main SKILL.md:** [../SKILL.md](../SKILL.md)
- **Version Info:** [../../../VERSION.json](../../../VERSION.json)

### Related Directories
- **Agents:** [../../../agents/](../../../agents/) - 43 agent definitions (6 core + 22 L1 + 15 L2)
- **Skills:** [../../../skills/](../../../skills/) - 27 skills
- **Rules:** [../../../rules/](../../../rules/) - 11 rule files
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

---

## Maintenance Notes

### Last Updated
- **V12.9:** 2026-03-06 - Docs count corretto: 22 file (era 17), INDEX.md sincronizzato
- **V12.8:** 2026-03-06 - INDEX.md aggiornato, deprecated markers clarified
- **V12.0:** 2026-02-26 - Comprehensive audit (56 issues fixed), changelog.md created
- **V11.3.1:** 2026-02-26 - Deep audit fixes, INDEX.md created
- **V11.3:** 2026-02-26 - Version bump, documentation alignment
- **V11.2:** 2026-02-26 - Audit fixes, added setup-guide, troubleshooting, architecture

### Deprecated Files
The following files are retained for backward compatibility but content has been migrated to SKILL.md:
- `routing-table.md` - Agent routing now in SKILL.md
- `team-patterns.md` - Team patterns now in SKILL.md

---

*Orchestrator Documentation Index V12.9 - Generated 2026-03-06*
