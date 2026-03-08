# Agent Routing Table

> **Source:** skills/orchestrator/SKILL.md (V14.0.3)
> **Last Updated:** 2026-03-07

---

## Routing Table

| Keyword | Agent | Model |
|---------|-------|-------|
| GUI, PyQt5, Qt, widget, UI, NiceGUI, CSS, theme | GUI Super Expert | inherit |
| layout, sizing, splitter | GUI Layout Specialist L2 | inherit |
| database, SQL, schema | Database Expert | inherit |
| query, index, optimize DB | DB Query Optimizer L2 | inherit |
| security, encryption | Security Unified Expert | inherit |
| auth, JWT, session, login | Security Auth Specialist L2 | inherit |
| offensive security, pentesting, exploit, red team, OWASP, vulnerability | Offensive Security Expert | inherit |
| reverse engineer, binary, disassemble, IDA, Ghidra, malware, firmware | Reverse Engineering Expert | inherit |
| API, REST, webhook | Integration Expert | inherit |
| endpoint, route | API Endpoint Builder L2 | inherit |
| test, debug, QA | Tester Expert | inherit |
| unit test, mock, pytest | Test Unit Specialist L2 | inherit |
| MQL, EA, MetaTrader | MQL Expert | inherit |
| optimize EA, memory MT5 | MQL Optimization L2 | inherit |
| decompile, .ex4, .ex5 | MQL Decompilation Expert | inherit |
| trading, strategy | Trading Strategy Expert | inherit |
| risk, position size | Trading Risk Calculator L2 | inherit |
| mobile, iOS, Android | Mobile Expert | inherit |
| mobile UI, responsive | Mobile UI Specialist L2 | inherit |
| n8n, workflow, n8n automation | N8N Expert | inherit |
| workflow builder | N8N Workflow Builder L2 | inherit |
| Claude, prompt, token | Claude Systems Expert | inherit |
| prompt optimize | Claude Prompt Optimizer L2 | inherit |
| architettura, design, system | Architect Expert | opus |
| design pattern, DDD, SOLID | Architect Design Specialist L2 | inherit |
| DevOps, deploy, CI/CD, git, commit, branch, merge, PR | DevOps Expert | haiku |
| pipeline, Jenkins, GitHub Actions | DevOps Pipeline Specialist L2 | haiku |
| Python, JS, C#, coding | Languages Expert | inherit |
| refactor, clean code | Languages Refactor Specialist L2 | inherit |
| AI, LLM, GPT, embeddings | AI Integration Expert | inherit |
| model selection, fine-tuning, RAG | AI Model Specialist L2 | inherit |
| OAuth, social login | Social Identity Expert | inherit |
| OAuth2 flow, provider integration | Social OAuth Specialist L2 | inherit |
| analyze, explore, search | Analyzer | haiku |
| implement, fix, code | Coder | inherit |
| review, quality check, code review | Reviewer | inherit |
| document, changelog | Documenter | haiku |
| skill, SKILL.md, slash command | Coder | inherit |
| logging, monitoring, metrics, observability | DevOps Expert | haiku |
| security validate, authorization, permission check, sanitize | Security Unified Expert | inherit |
| input validate, data validation, schema validate | Coder | inherit |
| rename, restructure, decompose, extract method | Languages Refactor Specialist L2 | inherit |
| notification, alert, message, Slack, Discord | Notification Expert | inherit |
| playwright, e2e, browser automation, scraping | Browser Automation Expert | inherit |
| MCP, plugin, extension, model context protocol | MCP Integration Expert | inherit |
| Stripe, PayPal, payment, checkout, subscription | Payment Integration Expert | inherit |
| performance, optimize, profiling, benchmark | Architect Expert | opus |
| generate, create, boilerplate, scaffold | Languages Expert | inherit |
| data analysis, visualization, report | AI Integration Expert | inherit |
| type check, typed, typing, lint | Languages Expert | inherit |

---

## Agent Statistics

**Total Agents:** 43 (6 core + 22 L1 + 15 L2)

- **Core Agents:** Analyzer, Coder, Reviewer, Documenter, System Coordinator, Architect Expert
- **L1 Specialists:** Domain experts (GUI, Database, Security, etc.)
- **L2 Specialists:** Sub-domain experts (Layout, Query Optimization, Auth, etc.)

---

## Routing Rules

### Priority
**Longest keyword match wins.** If tie, first match in table wins.

### Multi-keyword Matching
When user request matches keywords in multiple rows:

1. Extract ALL matching keywords from request
2. Count matches per agent
3. Select agent with highest match count
4. If tie, use table order (first row wins)

### Default Fallback
`Coder` (inherit) - Universal fallback when no keywords match.

### Model Notes
- **inherit** = Omit model parameter in Task tool (inherits parent model, typically Opus 4.6)
- **haiku** = Use for mechanical tasks (fast, efficient)
- **opus** = Use for architecture decisions (complex reasoning)

**Priority:** Task.model param > Routing Table default > inherit

---

## L2 to L1 Parent Mapping

L2 specialists fall back to their L1 parent on failure:

| L2 Specialist | L1 Parent |
|---------------|-----------|
| GUI Layout Specialist L2 | GUI Super Expert |
| DB Query Optimizer L2 | Database Expert |
| Security Auth Specialist L2 | Security Unified Expert |
| API Endpoint Builder L2 | Integration Expert |
| Test Unit Specialist L2 | Tester Expert |
| MQL Optimization L2 | MQL Expert |
| Trading Risk Calculator L2 | Trading Strategy Expert |
| Mobile UI Specialist L2 | Mobile Expert |
| N8N Workflow Builder L2 | N8N Expert |
| Claude Prompt Optimizer L2 | Claude Systems Expert |
| Architect Design Specialist L2 | Architect Expert |
| DevOps Pipeline Specialist L2 | DevOps Expert |
| Languages Refactor Specialist L2 | Languages Expert |
| AI Model Specialist L2 | AI Integration Expert |
| Social OAuth Specialist L2 | Social Identity Expert |

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main orchestrator documentation
- [slash-commands.md](slash-commands.md) - Slash commands reference
- [error-recovery.md](../error-recovery.md) - Error handling and fallback chains
