# Claude Orchestrator - AI Evolution

```
+==============================================================================+
|                                                                              |
|     OOOO   RRRR    CCCC  H   H  EEEEE   SSSS  TTTTT  RRRR    AAAA           |
|    O    O  R   R  C      H   H  E      S        T    R   R  A    A          |
|    O    O  RRRR   C      HHHHH  EEEE    SSS     T    RRRR   AAAAAA          |
|    O    O  R  R   C      H   H  E          S    T    R  R   A    A          |
|     OOOO   R   R   CCCC  H   H  EEEEE  SSSS     T    R   R  A    A          |
|                                                                              |
|               V14.0.3 - AI-NATIVE - PREDICTIVE MULTI-AGENT SYSTEM           |
|                                                                              |
+==============================================================================+
```

[![GitHub Repo](https://img.shields.io/badge/GitHub-Claude--Orchestrator--AI--Evolution-blue?logo=github)](https://github.com/eroslifestyle/Claude-Orchestrator-AI-Evolution)
![Version](https://img.shields.io/badge/Version-14.0.3-green)
![Tests](https://img.shields.io/badge/Tests-91_total-brightgreen)
![Stress Test](https://img.shields.io/badge/Stress_Test-5%2F5_PASS-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-99.7%25-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🚀 AI-Native Multi-Agent Orchestrator

A **self-optimizing** multi-agent orchestration system for Claude Code with:
- **Predictive Agent Caching** - ML-based pattern recognition (>90% accuracy)
- **Adaptive Token Budgeting** - Dynamic 200-1500 token allocation
- **A/B Testing Framework** - Multi-variant experiments with statistical significance
- **Auto-Tuning Parameters** - Bayesian optimization for system parameters

---

## 📊 Performance Benchmarks (V14.0.3)

| Test | Throughput | Status |
|------|------------|--------|
| Multi-Task | **4,228 task/sec** | ✅ PASS |
| Multi-Agent | **4,149 pred/sec** | ✅ PASS |
| Multi-Skill | **5,502 skill/sec** | ✅ PASS |
| Simultaneous | **5,838 ops/sec** | ✅ PASS |
| Memory | **128 bytes/op** | ✅ PASS |

**Overall: 5/5 PASS - 0% error rate**

---

## 🏗️ Architecture

### Agents (43 Total)

| Tier | Count | Description |
|------|-------|-------------|
| **Core** | 6 | Orchestrator, Analyzer, Coder, Reviewer, Documenter, System Coordinator |
| **L1 Experts** | 22 | GUI, Database, Security, API, Testing, MQL, Trading, Mobile, N8N, DevOps, etc. |
| **L2 Specialists** | 15 | Layout, Query Optimizer, Auth, Endpoint, Unit Test, MQL Optimization, etc. |

### Skills (32 Total)

| Category | Skills |
|----------|--------|
| **Core** | orchestrator, code-review, git-workflow, testing-strategy, debugging, api-design |
| **Workflow** | plan, tdd-workflow, security-scan, refactor-clean, build-fix, multi-plan, fix, cleanup |
| **Utility** | strategic-compact, verification-loop, checkpoint, sessions, status, metrics |
| **Language** | python-patterns, python-performance, typescript-patterns, go-patterns |
| **Learning** | learn, evolve |

---

## 🧠 AI-Native Features (V14.0.2+)

### 1. Predictive Agent Cache (`lib/predictive_cache.py`)

```python
from lib.predictive_cache import get_predictive_cache

cache = get_predictive_cache()
predictions = cache.predict_next_agents(task, context)
# Accuracy: >90%, Cold start fallback, Tiered storage (hot/warm/cold)
```

### 2. Adaptive Token Budget (`lib/adaptive_budget.py`)

```python
from lib.adaptive_budget import get_budget_calculator

budget = get_budget_calculator().calculate_budget(task, context)
# Dynamic range: 200-1500 tokens based on complexity
```

### 3. A/B Testing Framework (`lib/ab_testing.py`)

```python
from lib.ab_testing import ABTestingFramework

ab = ABTestingFramework()
exp = ab.create_experiment("routing_test", control, treatment)
variant = ab.assign_variant("routing_test", user_id)
# Multi-variant (A/B/C/D), Z-test significance, Chi-square
```

### 4. Auto-Tuner (`lib/auto_tuner.py`)

```python
from lib.auto_tuner import AutoTuner

tuner = AutoTuner()
params = tuner.suggest_parameters()
tuner.record_outcome(params, metrics)
# Gaussian Process with RBF kernel, UCB exploration
```

---

## 📁 Project Structure

```
.claude/
├── agents/              # 43 agent definitions (.md files)
├── skills/              # 32 skills + orchestrator/
│   └── orchestrator/    # Main orchestrator skill
│       ├── SKILL.md     # Skill definition (1200+ lines)
│       ├── VERSION.json # Version tracking
│       └── docs/        # 18 documentation files
├── lib/                 # Python modules
│   ├── predictive_cache.py    # V14.0.2 AI caching
│   ├── adaptive_budget.py     # V14.0.2 Token budgeting
│   ├── ab_testing.py          # V14.0.2 A/B testing
│   ├── auto_tuner.py          # V14.0.2 Bayesian optimization
│   ├── lazy_agents.py         # V13.1 Lazy L2 loading
│   ├── rule_excerpts.py       # V13.1 Pre-computed rules
│   ├── agent_performance.py   # V13.0 Performance tracking
│   ├── agent_selector.py      # V13.0 ML-based routing
│   ├── file_locks.py          # V13.0 Race condition prevention
│   ├── skill_interface.py     # V13.0 Plugin interface
│   └── skill_plugin.py        # V13.0 Dynamic loader
├── rules/               # 11 rules files
│   ├── common/          # Universal rules
│   ├── python/          # Python patterns
│   ├── typescript/      # TypeScript patterns
│   └── go/              # Go patterns
├── learnings/           # instincts.json (captured patterns)
├── templates/           # 3 templates (task, review, integration)
└── workflows/           # 4 workflows (bugfix, feature, refactor, optimized)
```

---

## 🚦 Quick Start

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
# Unit tests
pytest lib/tests/ -v --cov=lib --cov-report=term-missing

# Stress test
python tmp/stress_test_v14.py
```

### 4. Use with Claude Code

Copy `.claude/` to your project or set as global:

```bash
# Windows
xcopy /E /I .claude %USERPROFILE%\.claude

# Linux/Mac
cp -r .claude ~/.claude
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](skills/orchestrator/docs/architecture.md) | System architecture |
| [quickstart-it.md](skills/orchestrator/docs/quickstart-it.md) | Italian quick start |
| [setup-guide.md](skills/orchestrator/docs/setup-guide.md) | Setup guide |
| [examples.md](skills/orchestrator/docs/examples.md) | Usage examples |
| [test-suite.md](skills/orchestrator/docs/test-suite.md) | Test documentation |
| [troubleshooting.md](skills/orchestrator/docs/troubleshooting.md) | Common issues |
| [windows-support.md](skills/orchestrator/docs/windows-support.md) | Windows specifics |

---

## 🗺️ Roadmap

### V14.0.3 (Current) ✅
- [x] Predictive Agent Caching
- [x] Adaptive Token Budgeting
- [x] A/B Testing Framework
- [x] Auto-Tuning Parameters
- [x] Stress Test 5/5 PASS
- [x] Memory optimization (gc.collect periodic)

### V15.0 (Planned)
- [ ] Distributed Cache (Redis support)
- [ ] Analytics Dashboard
- [ ] Multi-process coordination
- [ ] Enhanced observability

### V16.0 (Future)
- [ ] Web UI Dashboard
- [ ] Real-time metrics streaming
- [ ] Cloud deployment templates

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Anthropic for Claude API
- All contributors and testers
- The open-source community

---

**Made with ❤️ by [eroslifestyle](https://github.com/eroslifestyle)**

*V14.0.3 - AI-Native - March 2026*
