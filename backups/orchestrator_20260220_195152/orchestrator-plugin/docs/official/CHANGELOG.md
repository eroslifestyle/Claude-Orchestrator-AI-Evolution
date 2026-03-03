# Changelog - Orchestrator Plugin

All notable changes to the Orchestrator Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v4.1.2-INTEGRITY] - 2026-02-04

### Fixed

- **CRITICAL: Documenter Agent Enforcement**: Fixed orchestrator bypassing Documenter Agent
  - Added mandatory CHECK FINALE before user response
  - Orchestrator now BLOCKS if Documenter not launched post-task
  - Added `MANDATORY_DOCUMENTER_RULE` config flag in orchestrator-config.json
  - Updated `orchestrator.md` with INVIOLABLE RULE #5 section
  - Updated `commands/orchestrator.md` with CHECK FINALE BEFORE_COMPLETION
  - Updated `documenter.md` with AGENT OBBLIGATORIO banner
  - **Root Cause**: Regola #5 was documentation-only, not enforced in code
  - **Impact**: Ensures documentation always updated, prevents task incompleteness

### Changed

- **Documenter Agent** promoted to MANDATORY status (cannot be skipped)
- **Orchestrator workflow** includes documentation verification step

**Migration**: No action required. System now automatically ensures documentation integrity.

---

## [v4.1.1-CONSOLIDATION] - 2026-02-01

### cleanup

- **Documentation Consolidation**: Archived 16 duplicate files with 85% overlap to `docs/legacy/`
- **Cross-Reference Updates**: Updated 4 cross-references to point to archived content
- **Archive Management**: Created archive index at `docs/legacy/ARCHIVE_INDEX.md`
- **Documentation Hub**: Created central documentation hub at `docs/README.md`
- **Reporting**: Generated consolidation execution report `CONSOLIDATION_EXECUTION_REPORT.md`

**Migration**: Links to archive index - See [Archive Index](../legacy/ARCHIVE_INDEX.md) for archived content.

---

## [4.1.0-EMPEROR] - 2026-02-01

### Added

- **Clean Context Technology**: Revolutionary context optimization that reduces token usage by 30-50%
  - Each agent starts with `/clear` for maximum efficiency
  - Configurable clean before/after tasks
  - Agent isolation and focus mode
- **Smart Model Selection**: Automatic model selection based on task complexity
  - Repetitive tasks → Haiku (format, lint, validate, build)
  - Standard tasks → Sonnet (coding, debugging, testing)
  - Complex tasks → Opus (architecture, security, refactoring)
- **21 Specialized Agents**: Complete agent registry with core and expert agents
- **Dependency Management**: Task dependencies with automatic unlock
- **Streaming Results**: Real-time progress updates and event emission
- **Session Reporting**: Comprehensive execution reports with recommendations
- **MCP Integration**: Full Model Context Protocol support
- **Official Documentation**: Distribution-ready documentation suite

### Changed

- **Orchestrator Engine**: Complete rewrite as unified v4 EMPEROR engine
- **Agent Registry**: Consolidated from multiple sources into single registry
- **Configuration**: Enhanced configuration schema with clean context options
- **Performance**: Improved parallelism up to 128 concurrent agents
- **Default Settings**: Clean Context enabled by default for optimal efficiency

### Fixed

- Token usage optimization through Clean Context
- Agent discovery fallback mechanism
- Task dependency resolution
- Session tracking and reporting

### Deprecated

- Previous orchestrator versions (v1, v2, v3) - consolidated into v4

---

## [2.1.0-ALWAYS-ON] - 2026-01-15

### Added

- **Always-On Mode**: Orchestrator runs continuously in background
- **Auto-Orchestration Hook**: Automatic task delegation based on keywords
- **System Coordinator Agent**: Resource management and token tracking
- **Lazy Loading**: Agents loaded on-demand for performance
- **Resilience & Recovery**: Built-in error recovery and retry mechanisms

### Changed

- Agent loading strategy from eager to lazy
- Configuration persistence across sessions
- Event system enhanced with recovery events

### Fixed

- Memory leaks from agent caching
- Token tracking accuracy
- Race conditions in parallel execution

---

## [2.0.0] - 2025-12-20

### Added

- **Multi-Agent Orchestration**: Core orchestration engine
- **Agent Discovery**: Automatic agent selection based on keywords
- **Parallel Execution**: Up to 20 concurrent agents
- **Smart Model Selection**: Basic model selection (Haiku/Sonnet/Opus)
- **Configuration System**: JSON-based configuration
- **CLI Interface**: Command-line interface for orchestrator control

### Changed

- Complete architecture redesign from v1
- Plugin manifest format
- Agent file format (markdown)

### Breaking Changes

- Configuration file format changed from YAML to JSON
- Agent definitions now in markdown instead of YAML
- API surface completely redesigned

### Migration Guide

See [Migration Guide v1 to v2](#migration-guide-v1-to-v2) below.

---

## [1.0.0] - 2025-11-01

### Added

- Initial release
- Basic agent delegation
- Simple task queue
- Manual agent selection
- Single-threaded execution

---

## Migration Guides

### Migration Guide v1 to v2

#### Configuration

**Old (YAML):**
```yaml
orchestrator:
  max_concurrent: 10
  agents:
    - coder
    - tester
```

**New (JSON):**
```json
{
  "maxConcurrent": 12,
  "enableSmartModelSelection": true,
  "enableAgentDiscovery": true
}
```

#### Agent Definitions

**Old (YAML):**
```yaml
agent: coder
model: sonnet
keywords: [code, implement]
```

**New (Markdown):**
```markdown
# Coder Agent

Role: General implementation specialist
Specialization: Coding, bug fixing
Keywords: code, implement, develop
```

#### API

**Old:**
```typescript
orchestrator.delegate(task, agent)
```

**New:**
```typescript
orchestrator.addTask({
  description: task,
  agentFile: 'core/coder.md'
})
```

---

### Migration Guide v2 to v4

#### Clean Context

**New Configuration:**
```json
{
  "enableCleanContext": true,
  "cleanBeforeTask": true,
  "isolateAgents": true,
  "focusMode": true
}
```

#### Events

**New Events:**
```typescript
orch.on('cleanContextPrepared', ({ contextSize }) => {
  console.log(`Tokens saved: ${contextSize}`)
})
```

---

## Version History

| Version | Date | Status | Key Features |
|---------|------|--------|--------------|
| 4.1.1-CONSOLIDATION | 2026-02-01 | Stable | Documentation cleanup, Archive system |
| 4.1.0-EMPEROR | 2026-02-01 | Stable | Clean Context, 21 Agents, MCP |
| 2.1.0-ALWAYS-ON | 2026-01-15 | Stable | Always-On, Auto-Orchestration |
| 2.0.0 | 2025-12-20 | Stable | Multi-Agent, Parallel, Discovery |
| 1.0.0 | 2025-11-01 | Deprecated | Initial Release |

---

## Breaking Changes Summary

### v4.1.0-EMPEROR

- Clean Context enabled by default (disable if needed)
- Agent registry format updated to include metadata
- Event system extended with clean context events

### v2.0.0

- Configuration format: YAML → JSON
- Agent format: YAML → Markdown
- API: Complete redesign
- File structure: Reorganized

---

## Future Releases

### Planned for v4.2.0

- [ ] Web dashboard for real-time monitoring
- [ ] Agent performance analytics
- [ ] Cost optimization recommendations
- [ ] Custom agent creation UI

### Planned for v5.0.0

- [ ] Distributed orchestration across multiple Claude instances
- [ ] Agent marketplace for sharing custom agents
- [ ] Advanced workflow DSL
- [ ] Integration with external AI providers

---

## Upgrade Path

1. **v1.x → v2.0**: Configuration migration required, API breaking changes
2. **v2.x → v4.1**: Drop-in replacement, new features opt-in
3. **v4.1 → v4.2**: Smooth upgrade, new features opt-in
4. **v4.x → v5.0**: Major version, migration guide will be provided

---

**Current Version**: 4.1.1-CONSOLIDATION
**Release Date**: 2026-02-01
**Support Status**: Active
**Next Release**: Q2 2026 (v4.2.0)
