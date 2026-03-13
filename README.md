# Claude Orchestrator AI Evolution

[![Version](https://img.shields.io/badge/version-18.2.0-blue.svg)](https://github.com/eroslifestyle/Claude-Orchestrator-AI-Evolution)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10+-yellow.svg)](https://www.python.org/)
[![CI](https://github.com/eroslifestyle/Claude-Orchestrator-AI-Evolution/workflows/CI/badge.svg)](https://github.com/eroslifestyle/Claude-Orchestrator-AI-Evolution/actions)
[![Tests](https://img.shields.io/badge/tests-400%2B-brightgreen.svg)](https://github.com/eroslifestyle/Claude-Orchestrator-AI-Evolution)

---

## Overview

**Claude Orchestrator AI Evolution** is a self-optimizing multi-agent orchestration system for Claude Code. It provides intelligent task decomposition, predictive agent caching, adaptive token budgeting, and a modular plugin architecture.

The orchestrator automatically routes tasks to specialized agents based on keyword patterns, complexity scoring, and ML-based pattern recognition with >90% accuracy.

### Key Stats

| Metric | Value |
|--------|-------|
| **Agents** | 43 (6 Core + 22 L1 + 15 L2) |
| **Skills** | 30 |
| **Languages Supported** | 6 |
| **Tests** | 400+ |
| **Lines of Code** | 64K+ |

---

## Features

### 43 Specialized Agents

| Tier | Count | Examples |
|------|-------|----------|
| **Core (L0)** | 6 | Orchestrator, Analyzer, Coder, Reviewer, Documenter, System Coordinator |
| **L1 Experts** | 22 | GUI Super Expert, Database Expert, Security Expert, API Expert, DevOps Expert, MQL Expert, Mobile Expert, N8N Expert, etc. |
| **L2 Specialists** | 15 | Layout Specialist, Query Optimizer, Auth Specialist, Endpoint Builder, Unit Test Specialist, MQL Optimization, etc. |

### 30 Skills

| Category | Skills |
|----------|--------|
| **Core** | orchestrator, code-review, git-workflow, testing-strategy, debugging, api-design, remotion-best-practices, keybindings-help |
| **Utility** | strategic-compact, verification-loop, checkpoint, status, metrics, prompt-engineering-patterns |
| **Workflow** | plan, tdd-workflow, security-scan, refactor-clean, build-fix, multi-plan, fix, cleanup, simplify |
| **Language** | python-patterns, python-performance-optimization, typescript-patterns, go-patterns |
| **Learning** | learn, evolve |

### AI-Native Capabilities

- **Predictive Agent Caching** - ML-based pattern recognition (>90% accuracy)
- **Adaptive Token Budgeting** - Dynamic 200-1500 token allocation
- **A/B Testing Framework** - Multi-variant experiments with statistical significance
- **Auto-Tuning Parameters** - Bayesian optimization for system parameters
- **Chaos Engineering** - 5 failure types injection for resilience testing
- **Distributed Locking** - Redis-based coordination

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/eroslifestyle/Claude-Orchestrator-AI-Evolution.git
cd Claude-Orchestrator-AI-Evolution
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Tests

```bash
# Unit tests with coverage
pytest lib/tests/ -v --cov=lib --cov-report=term-missing

# Or use the provided scripts
./scripts/run_coverage.sh      # Unix/Linux/Mac
.\scripts\run_coverage.ps1     # Windows
```

### 4. Use with Claude Code

Copy the `.claude/` directory to your project or set as global:

```bash
# Windows
xcopy /E /I .claude %USERPROFILE%\.claude

# Linux/Mac
cp -r .claude ~/.claude
```

---

## Architecture

### Project Structure

```text
.claude/
├── agents/              # 43 agent definitions
│   ├── core/            # L0: 6 core agents
│   ├── experts/         # L1: 22 expert agents
│   │   └── L2/          # L2: 15 specialist agents
│   ├── config/          # Routing, standards
│   └── system/          # Registry, protocols
├── skills/              # 30 skills + orchestrator/
│   └── orchestrator/    # Main orchestrator skill
│       ├── SKILL.md     # Skill definition
│       ├── VERSION.json # Version tracking
│       └── docs/        # 18+ documentation files
├── lib/                 # Python modules (91 files, 64K+ LOC)
│   ├── predictive_cache.py
│   ├── adaptive_budget.py
│   ├── ab_testing.py
│   ├── auto_tuner.py
│   ├── facade.py
│   └── ... (87 more)
├── rules/               # 11 rules files
│   ├── common/          # Universal rules
│   ├── python/          # Python patterns
│   ├── typescript/      # TypeScript patterns
│   ├── go/              # Go patterns
│   ├── rust/            # Rust patterns
│   ├── java/            # Java patterns
│   └── cpp/             # C++ patterns
├── templates/           # 3 templates
└── workflows/           # 4 workflows
```

### Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](skills/orchestrator/docs/architecture.md) | System architecture |
| [algorithm.md](skills/orchestrator/docs/algorithm.md) | Step-by-step algorithm |
| [routing.md](skills/orchestrator/docs/routing.md) | Complete routing table |
| [agents.md](skills/orchestrator/docs/agents.md) | Agent hierarchy (L0/L1/L2) |
| [setup-guide.md](skills/orchestrator/docs/setup-guide.md) | Setup guide |
| [examples.md](skills/orchestrator/docs/examples.md) | Usage examples |
| [test-suite.md](skills/orchestrator/docs/test-suite.md) | Test documentation |

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SILENT_START` | Suppress initial task table | `false` |
| `OUTPUT_MODE` | Output verbosity (`verbose`/`compact`/`silent`) | `compact` |

### Settings File

```json
{
  "env": {
    "SILENT_START": "false",
    "OUTPUT_MODE": "compact"
  }
}
```

---

## Supported Languages

| Language | Rules File | Patterns |
|----------|------------|----------|
| **Python** | `rules/python/patterns.md` | PEP 8, type hints, async, testing |
| **TypeScript** | `rules/typescript/patterns.md` | strict mode, zod, discriminated unions |
| **Go** | `rules/go/patterns.md` | error handling, interfaces, concurrency |
| **Rust** | `rules/rust/patterns.md` | ownership, borrowing, async, error handling |
| **Java** | `rules/java/patterns.md` | Spring Boot, DI, testing patterns |
| **C++** | `rules/cpp/patterns.md` | Modern C++17/20, RAII, memory management |

---

## Changelog

### [2026-03-10] V18.1.0 - Unified Evolution & Modular Architecture

**Added:**
- `rules/rust/patterns.md`: Rust coding standards
- `rules/java/patterns.md`: Java patterns (Spring Boot, DI, testing)
- `rules/cpp/patterns.md`: C++ patterns (Modern C++17/20, RAII)
- `scripts/run_coverage.sh` and `run_coverage.ps1`: Coverage scripts

**Changed:**
- SKILL.md modularizzato: Orchestrator ora include docs/ modulari
- VERSION.json: Aggiornato a V18.1.0, orchestrator V12.9.1

**Fixed:**
- Sincronizzazione completa lib/ (tutti i moduli Python V17)
- Rimossi file obsoleti e duplicati

### [2026-02-18] Agent Teams Gap Fix

- Aggiunta sezione PREREQUISITES per Agent Teams
- Aggiunto disclaimer EXPERIMENTAL FEATURE
- Documentate 7 limitazioni note

### [2026-02-16] Dual Provider Setup

- Sincronizzazione assets Anthropic -> GLM
- Setup doppia istanza VS Code
- Verifica integrita completa

### [2026-02-26] V12.0 - Deep Audit

- Baseline V12 con audit completo
- Anti-patterns documentati
- Error recovery protocol

### [2026-02-15] V11.0 - Initial Release

- Orchestrator core system
- 43 agents, 30 skills
- Modular architecture

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes using conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

```text
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore, perf, ci, build, style
```

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Anthropic for Claude API
- All contributors and testers
- The open-source community

---

**Made with care by [eroslifestyle](https://github.com/eroslifestyle)**

*V18.1.0 - Unified Evolution - March 2026*
