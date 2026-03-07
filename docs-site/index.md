---
layout: default
title: Orchestrator V12.0 Documentation
description: Multi-agent orchestration system for Claude Code
---

# Orchestrator V12.0 Documentation

Welcome to the official documentation for **Orchestrator V12.0** - a powerful multi-agent orchestration system for Claude Code.

## Overview

The Orchestrator system manages 43 specialized agents across 3 layers, 26 skills, and 338 rules to deliver efficient, high-quality code generation and task execution.

```
USER REQUEST
     |
     v
+------------------+
| ORCHESTRATOR     |  Central coordinator
+--------+---------+
         |
    +----+----+----+----+
    |    |    |    |    |
    v    v    v    v    v
  [T1] [T2] [T3] [T4] [Tn]   <- Parallel execution
    |    |    |    |    |
    +----+----+----+----+
         |
         v
+------------------+
| VERIFICATION     |
+------------------+
```

## Quick Start

| Resource | Description |
|----------|-------------|
| [Architecture](architecture.html) | Complete system architecture overview |
| [Setup Guide](setup-guide.html) | Installation and configuration steps |
| [Routing Table](routing-table.html) | Agent routing and task delegation |

## Components

### Agents (43 Total)

| Layer | Count | Purpose |
|-------|-------|---------|
| Core | 6 | Central coordination and execution |
| L1 Experts | 22 | Domain-specific expertise |
| L2 Specialists | 15 | Task-specific implementations |

### Skills (26 Total)

| Category | Count | Examples |
|----------|-------|----------|
| Core | 7 | orchestrator, code-review, git-workflow |
| Utility | 6 | strategic-compact, checkpoint, metrics |
| Workflow | 8 | plan, tdd-workflow, security-scan |
| Language | 3 | python-patterns, typescript-patterns, go-patterns |
| Learning | 2 | learn, evolve |

### Rules (338 Total)

| Category | Rules | Purpose |
|----------|-------|---------|
| Security | ~100 | OWASP-inspired security rules |
| Database | ~50 | SQL, schema, indexing |
| API Design | ~50 | REST/GraphQL standards |
| Coding Style | ~25 | Naming, structure, control flow |
| Testing | ~25 | Test standards |
| Git Workflow | ~20 | Commit, branch, PR rules |
| Language-specific | ~95 | Python, TypeScript, Go patterns |

## Key Features

1. **Parallel Execution** - All independent tasks run simultaneously
2. **Intelligent Routing** - Automatic agent selection based on task type
3. **Continuous Learning** - Pattern capture and skill evolution
4. **Contextual Rules** - Rules loaded based on detected file types
5. **Error Recovery** - Automatic retry with fallback strategies

## System Stats

```
+------------------------+-------+
| Metric                 | Value |
+------------------------+-------+
| Total Agents           | 43    |
| Total Skills           | 26    |
| Rules Files            | 10    |
| Total Rules            | ~338  |
| MCP Servers            | 3     |
| Native Tools           | 4     |
| Documentation Files    | 14    |
| Templates              | 3     |
| Workflows              | 4     |
+------------------------+-------+
```

## Navigation

### Core Documentation

- [Architecture](architecture.html) - System architecture and data flow
- [Setup Guide](setup-guide.html) - Installation and configuration
- [Routing Table](routing-table.html) - Agent routing reference
- [Skills Reference](skills-reference.html) - Complete skills catalog

### Integration Guides

- [MCP Integration](mcp-integration.html) - MCP server configuration
- [Memory Integration](memory-integration.html) - Memory system usage
- [Team Patterns](team-patterns.html) - Agent team configurations

### Operations

- [Error Recovery](error-recovery.html) - Error handling strategies
- [Troubleshooting](troubleshooting.html) - Common issues and solutions
- [Health Check](health-check.html) - System diagnostics
- [Observability](observability.html) - Monitoring and metrics

### Development

- [Test Suite](test-suite.html) - Testing documentation
- [Examples](examples.html) - Usage examples
- [Windows Support](windows-support.html) - Windows-specific notes

## Version

**Current Version:** 12.0.0

See [Changelog](changelog.html) for version history.
