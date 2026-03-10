# Agent Hierarchy and Structure

> **Version:** V12.9.1 | **Parent:** [SKILL.md](../SKILL.md)

---

## AGENT COUNT

**Total:** 43 agents
- **Core:** 6 agents
- **L1 Domain Experts:** 22 agents
- **L2 Specialists:** 15 agents

All agents have `.md` definition files in `~/.claude/agents/`.

---

## HIERARCHY STRUCTURE

```
ORCHESTRATOR (Lead)
    |
    +-- CORE AGENTS (6)
    |   |-- Analyzer
    |   |-- Coder
    |   |-- Reviewer
    |   |-- Documenter
    |   |-- System Coordinator
    |   +-- Architect Expert
    |
    +-- L1 DOMAIN EXPERTS (22)
    |   |-- GUI Super Expert
    |   |-- Database Expert
    |   |-- Security Unified Expert
    |   |-- Integration Expert
    |   |-- Tester Expert
    |   |-- ... (see full list below)
    |
    +-- L2 SPECIALISTS (15)
        |-- GUI Layout Specialist L2 -> GUI Super Expert
        |-- DB Query Optimizer L2 -> Database Expert
        |-- ... (see full list below)
```

---

## CORE AGENTS (6)

| Agent | Role | Default Model |
|-------|------|---------------|
| Analyzer | Analysis, exploration, search | haiku |
| Coder | Implementation, fixes, code generation | inherit |
| Reviewer | Code review, quality checks | inherit |
| Documenter | Documentation, changelogs | haiku |
| System Coordinator | Cleanup, checkpoints, session state | haiku |
| Architect Expert | Architecture, design decisions | opus |

---

## L1 DOMAIN EXPERTS (22)

| Agent | Domain | Default Model |
|-------|--------|---------------|
| GUI Super Expert | UI/UX, Qt, NiceGUI | inherit |
| Database Expert | SQL, schema, queries | inherit |
| Security Unified Expert | Security, encryption | inherit |
| Offensive Security Expert | Pentesting, vulnerabilities | inherit |
| Reverse Engineering Expert | Binary analysis, malware | inherit |
| Integration Expert | APIs, REST, webhooks | inherit |
| Tester Expert | Testing, QA | inherit |
| MQL Expert | MetaTrader, EA | inherit |
| Trading Strategy Expert | Trading, strategies | inherit |
| Mobile Expert | iOS, Android | inherit |
| N8N Expert | Workflow automation | inherit |
| Claude Systems Expert | Claude integration, prompts | inherit |
| DevOps Expert | CI/CD, deployment | haiku |
| Languages Expert | Python, JS, C# | inherit |
| AI Integration Expert | LLMs, embeddings | inherit |
| Social Identity Expert | OAuth, social login | inherit |
| Notification Expert | Alerts, messaging | inherit |
| Browser Automation Expert | Playwright, scraping | inherit |
| MCP Integration Expert | Model Context Protocol | inherit |
| Payment Integration Expert | Stripe, PayPal | inherit |
| Documenter | Documentation | haiku |

---

## L2 SPECIALISTS (15)

L2 specialists are routed via Task tool `subagent_types`. They inherit from L1 parents.

| L2 Specialist | L1 Parent | Specialty |
|---------------|-----------|-----------|
| GUI Layout Specialist L2 | GUI Super Expert | Layout, sizing, splitter |
| DB Query Optimizer L2 | Database Expert | Query optimization, indexing |
| Security Auth Specialist L2 | Security Unified Expert | JWT, session, login |
| API Endpoint Builder L2 | Integration Expert | Endpoint, route building |
| Test Unit Specialist L2 | Tester Expert | Unit tests, mocking, pytest |
| MQL Optimization L2 | MQL Expert | EA optimization, MT5 memory |
| Trading Risk Calculator L2 | Trading Strategy Expert | Risk, position sizing |
| Mobile UI Specialist L2 | Mobile Expert | Responsive UI |
| N8N Workflow Builder L2 | N8N Expert | Workflow building |
| Claude Prompt Optimizer L2 | Claude Systems Expert | Prompt optimization |
| Architect Design Specialist L2 | Architect Expert | Design patterns, DDD, SOLID |
| DevOps Pipeline Specialist L2 | DevOps Expert | Pipelines, Jenkins, GitHub Actions |
| Languages Refactor Specialist L2 | Languages Expert | Refactoring, clean code |
| AI Model Specialist L2 | AI Integration Expert | Model selection, fine-tuning, RAG |
| Social OAuth Specialist L2 | Social Identity Expert | OAuth2 flow, provider integration |

---

## AGENT TEAMS

Use Agent Teams for 3+ parallel tasks needing inter-agent communication.

**Lifecycle:** CREATE -> PLAN APPROVAL (optional) -> COORDINATE -> QUALITY GATE -> SHUTDOWN

**Key Rules:**
- Each teammate owns DIFFERENT files (no overlaps)
- Teammates get full project context but NOT lead's conversation history
- Spawn prompts must be self-contained
- 5-6 tasks per teammate is optimal
- Only lead manages teams (no nested teams)
- Teammates communicate via shared findings in lead's context
- Inter-teammate messaging: lead relays information between teammates
- File ownership violations cause task failure
- Always shut down ALL teammates BEFORE cleanup

**Common Patterns:**
- Parallel Review
- Multi-Module Feature
- Competing Hypotheses
- Research + Implement

---

## MODEL ASSIGNMENT

Model is NOT fixed per agent. Determined by Complexity Score (see [algorithm.md](algorithm.md#step-45-complexity-scoring-model-assignment)).

| Score | Model | Usage |
|-------|-------|-------|
| 0-6 | haiku | ~80% of tasks |
| 7-10 | opus | ~20% of tasks |

**Override Rules:**
- Explicit `haiku` in routing table -> haiku (score ignored)
- Explicit `opus` in routing table -> opus (score ignored)
- `inherit` -> Complexity Score decides
- Security/auth tasks: score +2 automatic (bias toward opus)
