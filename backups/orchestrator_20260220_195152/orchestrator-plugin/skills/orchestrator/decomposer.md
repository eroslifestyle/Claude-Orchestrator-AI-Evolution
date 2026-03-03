# Task Decomposer - Logica di Scomposizione

## Scopo
Scompone automaticamente ogni richiesta utente in un task tree con wave parallele.

---

## DOMAIN MAPPING

### Keywords → Expert Agent Mapping

```yaml
gui_domain:
  keywords: [gui, pyqt, qt, widget, ui, form, window, dialog, button, layout, frontend]
  expert: "GUI Super Expert"
  l2_specialist: "GUI Layout Specialist L2"
  model: sonnet

database_domain:
  keywords: [database, db, sql, sqlite, query, table, schema, migration, orm]
  expert: "Database Expert"
  l2_specialist: "DB Query Optimizer L2"
  model: sonnet

security_domain:
  keywords: [security, auth, jwt, token, encryption, password, login, oauth]
  expert: "Security Unified Expert"
  l2_specialist: "Security Auth Specialist L2"
  model: opus

api_domain:
  keywords: [api, rest, endpoint, webhook, telegram, whatsapp, integration]
  expert: "Integration Expert"
  l2_specialist: "API Endpoint Builder L2"
  model: sonnet

architecture_domain:
  keywords: [architecture, design, pattern, refactor, structure, solid, ddd]
  expert: "Architect Expert"
  l2_specialist: "Architect Design Specialist"
  model: opus

testing_domain:
  keywords: [test, testing, unit, integration, mock, fixture, debug, bug, fix]
  expert: "Tester Expert"
  l2_specialist: "Test Unit Specialist L2"
  model: sonnet

devops_domain:
  keywords: [devops, docker, deploy, ci, cd, pipeline, github, actions]
  expert: "DevOps Expert"
  l2_specialist: "DevOps Pipeline Specialist"
  model: sonnet

mql_domain:
  keywords: [mql, mql4, mql5, mt4, mt5, metatrader, ea, indicator, expert advisor]
  expert: "MQL Expert"
  l2_specialist: "MQL Optimization L2"
  model: sonnet

trading_domain:
  keywords: [trading, strategy, risk, position, lot, drawdown, kelly, backtest]
  expert: "Trading Strategy Expert"
  l2_specialist: "Trading Risk Calculator L2"
  model: sonnet

ai_domain:
  keywords: [ai, llm, claude, gpt, prompt, embedding, rag, model]
  expert: "AI Integration Expert"
  l2_specialist: "AI Model Specialist"
  model: sonnet

mobile_domain:
  keywords: [mobile, flutter, react native, ios, android, app]
  expert: "Mobile Expert"
  l2_specialist: "Mobile UI Specialist L2"
  model: sonnet

n8n_domain:
  keywords: [n8n, workflow, automation, low-code, node]
  expert: "N8N Expert"
  l2_specialist: "N8N Workflow Builder L2"
  model: sonnet

languages_domain:
  keywords: [python, javascript, typescript, csharp, refactor, clean code]
  expert: "Languages Expert"
  l2_specialist: "Languages Refactor Specialist"
  model: sonnet

social_domain:
  keywords: [oauth2, oidc, social login, google, facebook, github, provider]
  expert: "Social Identity Expert"
  l2_specialist: "Social OAuth Specialist"
  model: sonnet
```

---

## DECOMPOSITION ALGORITHM

### Step 1: Extract Keywords
```
INPUT: "Crea sistema auth con GUI login, database SQLite e API REST"

EXTRACTED:
- "auth" → security_domain
- "gui" → gui_domain
- "login" → security_domain, gui_domain
- "database" → database_domain
- "sqlite" → database_domain
- "api" → api_domain
- "rest" → api_domain
```

### Step 2: Identify Domains
```
DOMAINS IDENTIFIED:
1. security_domain (auth, login)
2. gui_domain (gui, login form)
3. database_domain (database, sqlite)
4. api_domain (api, rest)
```

### Step 3: Calculate Complexity
```
COMPLEXITY RULES:
- 1 domain → LOW
- 2 domains → MEDIUM
- 3-4 domains → HIGH
- 5+ domains → CRITICAL

THIS REQUEST: 4 domains → HIGH
```

### Step 4: Build Task Tree
```json
{
  "request": "Crea sistema auth con GUI login, database SQLite e API REST",
  "complexity": "HIGH",
  "domains": ["security", "gui", "database", "api"],
  "total_tasks": 10,
  "waves": [
    {
      "id": "W1",
      "name": "Analysis",
      "parallel": true,
      "model": "haiku",
      "tasks": [
        {"id": "T1", "action": "analyze_codebase", "agent": "Explore"},
        {"id": "T2", "action": "analyze_security_requirements", "agent": "Explore"},
        {"id": "T3", "action": "analyze_gui_patterns", "agent": "Explore"},
        {"id": "T4", "action": "analyze_db_schema", "agent": "Explore"}
      ]
    },
    {
      "id": "W2",
      "name": "Implementation",
      "parallel": true,
      "depends_on": "W1",
      "tasks": [
        {"id": "T5", "action": "impl_db_schema", "agent": "Database Expert", "model": "sonnet"},
        {"id": "T6", "action": "impl_auth_logic", "agent": "Security Unified Expert", "model": "opus"},
        {"id": "T7", "action": "impl_gui_forms", "agent": "GUI Super Expert", "model": "sonnet"},
        {"id": "T8", "action": "impl_api_endpoints", "agent": "Integration Expert", "model": "sonnet"}
      ]
    },
    {
      "id": "W3",
      "name": "Integration",
      "parallel": false,
      "depends_on": "W2",
      "tasks": [
        {"id": "T9", "action": "integrate_all", "agent": "Architect Expert", "model": "opus"}
      ]
    },
    {
      "id": "W4",
      "name": "Validation",
      "parallel": true,
      "depends_on": "W3",
      "tasks": [
        {"id": "T10", "action": "security_review", "agent": "Reviewer", "model": "sonnet"},
        {"id": "T11", "action": "run_tests", "agent": "Tester Expert", "model": "sonnet"}
      ]
    },
    {
      "id": "W5",
      "name": "Documentation",
      "parallel": false,
      "depends_on": "W4",
      "tasks": [
        {"id": "T12", "action": "update_docs", "agent": "Documenter", "model": "haiku"}
      ]
    }
  ]
}
```

---

## DEPENDENCY DETECTION

### Independent Tasks (Can Run Parallel)
- Tasks in different domains without data dependencies
- Analysis tasks (all can run together)
- Implementation tasks in separate modules

### Dependent Tasks (Must Run Sequential)
- API depends on DB schema
- GUI depends on API endpoints
- Tests depend on implementation
- Docs depend on everything

### Dependency Graph Example
```
W1 Analysis (all parallel)
    │
    ▼
W2 Implementation (all parallel within wave)
    │
    ├─ T5 (DB) ──────────┐
    ├─ T6 (Auth) ────────┼──► W3 Integration
    ├─ T7 (GUI) ─────────┤
    └─ T8 (API) ─────────┘
                         │
                         ▼
                    W4 Validation (parallel)
                         │
                         ▼
                    W5 Documentation
```

---

## OUTPUT FORMAT

Il decomposer produce questo output strutturato che viene passato al wave-executor:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DECOMPOSITION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Richiesta: {user_request}
Complessita: {LOW|MEDIUM|HIGH|CRITICAL}
Domini: {domain_list}
Task totali: {N}
Waves: {W}

┌─────────┬────────────────────┬─────────────────────┬────────┐
│ Wave    │ Tasks              │ Agent               │ Model  │
├─────────┼────────────────────┼─────────────────────┼────────┤
│ W1      │ T1, T2, T3, T4     │ Explore             │ haiku  │
│ W2      │ T5, T6, T7, T8     │ Expert (mixed)      │ mixed  │
│ W3      │ T9                 │ Architect Expert    │ opus   │
│ W4      │ T10, T11           │ Reviewer, Tester    │ sonnet │
│ W5      │ T12                │ Documenter          │ haiku  │
└─────────┴────────────────────┴─────────────────────┴────────┘

Parallelismo max: {max_parallel_in_any_wave}
Speedup stimato: {sequential_time / parallel_time}x
```
