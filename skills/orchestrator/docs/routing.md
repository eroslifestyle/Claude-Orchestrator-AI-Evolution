# Agent Routing Table

> **Version:** V12.9.1 | **Parent:** [SKILL.md](../SKILL.md)

---

## ROUTING TABLE

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
| cleanup, checkpoint, session state, compact | System Coordinator | haiku |

---

## ROUTING RULES

### Priority
**Longest keyword match wins.** If tie, first match in table wins.

### Multi-keyword Matching
When user request matches keywords in multiple rows:
1. Extract ALL matching keywords from request
2. Count matches per agent
3. Select agent with highest match count
4. If tie, use table order (first row wins)

### Default Fallback
Default fallback: `Coder` (inherit).

### Model Assignment
Il modello per i task con "inherit" e determinato dal Complexity Score (STEP 4.5 in [algorithm.md](algorithm.md)):
- **DEFAULT:** haiku (score 0-6)
- **OPUS:** solo score 7-10

Agent con model esplicito "haiku" o "opus" nella routing table mantengono quel modello (score ignorato).

**Priority:** Explicit model (haiku/opus) > Complexity Score > inherit fallback

---

## AGENT HIERARCHY

**Agent count:** 6 core + 22 L1 + 15 L2 = 43 agents. All have .md definition files.

### L0 - Core Agents (6)
| Agent | Role |
|-------|------|
| Analyzer | Research, exploration, code analysis |
| Coder | Implementation, fixes, code generation |
| Reviewer | Code review, quality checks |
| Documenter | Documentation, changelogs |
| System Coordinator | Cleanup, checkpoints, session state |
| Architect Expert | Architecture, design decisions |

### L1 - Domain Experts (22)
| Agent | Domain |
|-------|--------|
| GUI Super Expert | UI/UX, Qt, NiceGUI |
| Database Expert | SQL, schema, queries |
| Security Unified Expert | Security, encryption |
| Offensive Security Expert | Pentesting, vulnerabilities |
| Reverse Engineering Expert | Binary analysis, malware |
| Integration Expert | APIs, REST, webhooks |
| Tester Expert | Testing, QA |
| MQL Expert | MetaTrader, EA |
| Trading Strategy Expert | Trading, strategies |
| Mobile Expert | iOS, Android |
| N8N Expert | Workflow automation |
| Claude Systems Expert | Claude integration, prompts |
| DevOps Expert | CI/CD, deployment |
| Languages Expert | Python, JS, C# |
| AI Integration Expert | LLMs, embeddings |
| Social Identity Expert | OAuth, social login |
| Notification Expert | Alerts, messaging |
| Browser Automation Expert | Playwright, scraping |
| MCP Integration Expert | Model Context Protocol |
| Payment Integration Expert | Stripe, PayPal |
| Documenter | Documentation |

### L2 - Specialists (15)
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

## FALLBACK CHAINS

Each agent has a 2-level fallback chain. L2 specialists fall back to their L1 parent, then to Coder.

**Coder is the universal last-resort fallback.**
