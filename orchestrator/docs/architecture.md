# Orchestrator System Architecture V14.0.2

> Complete system architecture documentation for the multi-agent orchestrator.

---

## Overview

```
================================================================================
                        ORCHESTRATOR SYSTEM ARCHITECTURE
                              V14.0.2 AI-NATIVE
================================================================================

USER REQUEST
     |
     v
+------------------+
| CLAUDE.md        |  Mandate: always use orchestrator
| (Entry Point)    |
+--------+---------+
         |
         v
+------------------+
| ORCHESTRATOR     |  skills/orchestrator/SKILL.md
| (Commander)      |  NEVER does work directly
+--------+---------+
         |
    +----+----+----+----+----+
    |    |    |    |    |    |
    v    v    v    v    v    v
  [T1] [T2] [T3] [T4] [T5] [Tn]   <- Parallel subagents (max parallelism)
    |    |    |    |    |    |
    +----+----+----+----+----+
         |
         v
+------------------+
| VERIFICATION     |  Step 8: Reviewer validates (max 2 loops)
+--------+---------+
         |
         v
+------------------+
| DOCUMENTATION    |  Step 9: Documenter + /learn capture
+--------+---------+
         |
         v
+------------------+
| METRICS          |  Step 10: Session summary
+--------+---------+
         |
         v
+------------------+
| CLEANUP          |  Step 11: Temp files, NUL artifacts
+--------+---------+
         |
         v
+------------------+
| REPORT           |  Step 12: Final table with results
+------------------+
```

---

## System Components

### Core Layer (6 Agents)

| Agent | File | Purpose | Model Priority |
|-------|------|---------|----------------|
| **Orchestrator** | orchestrator.md | Central coordinator, delegates all work | inherit |
| **Analyzer** | analyzer.md | Research, exploration, search | haiku |
| **Coder** | coder.md | Implementation, fixes, code generation | inherit |
| **Reviewer** | reviewer.md | Quality validation, code review | inherit |
| **Documenter** | documenter.md | Documentation, changelog, /learn | haiku |
| **System Coordinator** | system_coordinator.md | Cleanup, maintenance, checkpoints | haiku |

### Expert Layer - L1 (22 Agents)

Domain experts for specialized tasks:

| Domain | Agent File | Keywords |
|--------|------------|----------|
| GUI Development | gui-super-expert.md | GUI, PyQt5, Qt, widget, UI, NiceGUI, CSS |
| Database | database_expert.md | database, SQL, schema |
| Security | security_unified_expert.md | security, encryption |
| Offensive Security | offensive_security_expert.md | pentesting, exploit, OWASP |
| Reverse Engineering | reverse_engineering_expert.md | binary, disassemble, IDA, Ghidra |
| Integration | integration_expert.md | API, REST, webhook |
| Testing | tester_expert.md | test, debug, QA |
| MQL/Trading | mql_expert.md | MQL, EA, MetaTrader |
| Trading Strategy | trading_strategy_expert.md | trading, strategy |
| MQL Decompilation | mql_decompilation_expert.md | decompile, .ex4, .ex5 |
| Mobile | mobile_expert.md | mobile, iOS, Android |
| N8N Automation | n8n_expert.md | n8n, workflow, automation |
| Claude Systems | claude_systems_expert.md | Claude, prompt, token |
| Architecture | architect_expert.md | architettura, design, system |
| DevOps | devops_expert.md | DevOps, deploy, CI/CD, git |
| Languages | languages_expert.md | Python, JS, C#, coding |
| AI Integration | ai_integration_expert.md | AI, LLM, GPT, embeddings |
| Social Identity | social_identity_expert.md | OAuth, social login |
| Browser Automation | browser_automation_expert.md | playwright, e2e, scraping |
| MCP Integration | mcp_integration_expert.md | MCP, plugin, extension |
| Notification | notification_expert.md | notification, alert, Slack, Discord |
| Payment | payment_integration_expert.md | Stripe, PayPal, payment |

### Specialist Layer - L2 (15 Agents)

Task-specific specialists with parent fallback:

| L2 Specialist | Parent (L1) | Specialization |
|---------------|-------------|----------------|
| gui-layout-specialist.md | GUI Super Expert | layout, sizing, splitter |
| db-query-optimizer.md | Database Expert | query, index, optimize DB |
| security-auth-specialist.md | Security Unified Expert | auth, JWT, session, login |
| api-endpoint-builder.md | Integration Expert | endpoint, route |
| test-unit-specialist.md | Tester Expert | unit test, mock, pytest |
| mql-optimization.md | MQL Expert | optimize EA, memory MT5 |
| trading-risk-calculator.md | Trading Strategy Expert | risk, position size |
| mobile-ui-specialist.md | Mobile Expert | mobile UI, responsive |
| n8n-workflow-builder.md | N8N Expert | workflow builder |
| claude-prompt-optimizer.md | Claude Systems Expert | prompt optimize |
| architect-design-specialist.md | Architect Expert | design pattern, DDD, SOLID |
| devops-pipeline-specialist.md | DevOps Expert | pipeline, Jenkins, Actions |
| languages-refactor-specialist.md | Languages Expert | refactor, clean code |
| ai-model-specialist.md | AI Integration Expert | model selection, RAG |
| social-oauth-specialist.md | Social Identity Expert | OAuth2 flow |

**Fallback Chain:** L2 Specialist -> L1 Parent -> Coder (universal)

---

## Skills Layer (26 Skills)

### Core Skills (7)

| Skill | Location | Purpose |
|-------|----------|---------|
| orchestrator | skills/orchestrator/ | Multi-agent coordination |
| code-review | skills/code-review/ | Code quality validation |
| git-workflow | skills/git-workflow/ | Git operations |
| testing-strategy | skills/testing-strategy/ | Test planning |
| debugging | skills/debugging/ | Bug investigation |
| api-design | skills/api-design/ | API architecture |
| remotion-best-practices | skills/remotion-best-practices/ | Video generation |

### Utility Skills (6)

| Skill | Location | Purpose |
|-------|----------|---------|
| strategic-compact | skills/strategic-compact/ | Context management |
| verification-loop | skills/verification-loop/ | Result validation |
| checkpoint | skills/checkpoint/ | Session state persistence |
| sessions | skills/sessions/ | Session management |
| status | skills/status/ | System health |
| metrics | skills/metrics/ | Performance tracking |

### Workflow Skills (8)

| Skill | Location | Purpose |
|-------|----------|---------|
| plan | skills/plan/ | Implementation planning |
| tdd-workflow | skills/tdd-workflow/ | Test-driven development |
| security-scan | skills/security-scan/ | Security audit |
| refactor-clean | skills/refactor-clean/ | Code cleanup |
| build-fix | skills/build-fix/ | Build error resolution |
| multi-plan | skills/multi-plan/ | Multi-approach comparison |
| fix | skills/fix/ | Bug fixing |
| cleanup | skills/cleanup/ | Session cleanup |

### Language Skills (3)

| Skill | Location | Purpose |
|-------|----------|---------|
| python-patterns | skills/python-patterns/ | Python best practices |
| typescript-patterns | skills/typescript-patterns/ | TypeScript best practices |
| go-patterns | skills/go-patterns/ | Go best practices |

### Learning Skills (2)

| Skill | Location | Purpose |
|-------|----------|---------|
| learn | skills/learn/ | Pattern capture |
| evolve | skills/evolve/ | Pattern promotion |

---

## Rules Engine (10 Files)

### Common Rules (6)

| File | Rules | Purpose |
|------|-------|---------|
| coding-style.md | ~25 | Naming, structure, control flow |
| security.md | ~100 | OWASP-inspired security rules |
| testing.md | ~25 | Test standards |
| git-workflow.md | ~20 | Commit, branch, PR rules |
| database.md | ~50 | SQL, schema, indexing |
| api-design.md | ~50 | REST/GraphQL standards |

### Language-Specific Rules (3)

| File | Rules | Purpose |
|------|-------|---------|
| python/patterns.md | ~35 | PEP 8, type hints, async |
| typescript/patterns.md | ~30 | Strict mode, zod, unions |
| go/patterns.md | ~30 | Error handling, interfaces |

### Rules Documentation

| File | Purpose |
|------|---------|
| README.md | Rules engine documentation |

**Injection:** Rules are loaded contextually at Step 3 based on detected file types and task type.

---

## Learning System

### Data Flow

```
SESSION WORK
     |
     v
+------------------+
| STEP 9: CAPTURE  |  Documenter invokes /learn
+--------+---------+
         |
         v
+------------------+
| instincts.json   |  Confidence: 0.3 -> +0.2 -> cap 0.9
| (Storage)        |  Threshold: 0.5 for inclusion
+--------+---------+
         |
         v (manual /evolve)
+------------------+
| skills/learned/  |  Promoted skill files
| (Promotion)      |  Requires: 0.7+ confidence, 3+ confirms
+------------------+
```

### Confidence Lifecycle

| Stage | Value | Condition |
|-------|-------|-----------|
| Initial | 0.3 | New pattern captured |
| Growth | +0.2 | Per confirmation |
| Cap | 0.9 | Maximum confidence |
| Inclusion | 0.5+ | Included in subagent prompts |
| Promotion | 0.7+ | Eligible for /evolve |

### Files

| File | Purpose |
|------|---------|
| learnings/instincts.json | Active pattern storage |
| skills/learn/SKILL.md | Canonical learning format |
| skills/evolve/SKILL.md | Promotion workflow |

---

## Data Flow

```
================================================================================
                            COMPLETE DATA FLOW
================================================================================

USER REQUEST
     |
     v
+------------------+     +------------------+     +------------------+
| STEP 1: PATH     | --> | STEP 2: MEMORY   | --> | STEP 3: RULES    |
| Check project    |     | Load MEMORY.md   |     | Load contextual  |
| location         |     | + instincts.json |     | rules files      |
+------------------+     +------------------+     +------------------+
                                                        |
     +--------------------------------------------------+
     |
     v
+------------------+
| STEP 4: DECOMPOSE|
| Break into tasks |
| Route to agents  |
+--------+---------+
         |
         v
+------------------+
| STEP 5: TABLE    |  Show plan to user
+--------+---------+
         |
         v
+------------------+
| STEP 6: LAUNCH   |  ALL independent tasks in ONE message
+--------+---------+
         |
         v
+------------------+
| STEP 7: DEPS     |  Launch dependent tasks
+--------+---------+
         |
         v
+------------------+
| STEP 8: VERIFY   |  Reviewer validates (max 2 loops)
+--------+---------+
         |
         v
+------------------+
| STEP 9: DOCUMENT |  Changelog + /learn capture
+--------+---------+
         |
         v
+------------------+
| STEP 10: METRICS |  Session summary
+--------+---------+
         |
         v
+------------------+
| STEP 11: CLEANUP |  Delete temp files, NUL artifacts
+--------+---------+
         |
         v
+------------------+
| STEP 12: REPORT  |  Final table with results
+------------------+

TRIGGER: Context ~70% -> STEP X: COMPACT (save checkpoint, notify user)
```

---

## File Structure

```
~/.claude/
|
+-- CLAUDE.md                    # Global instructions (orchestrator mandate)
+-- VERSION.json                 # Single source of truth for versions
+-- settings.json                # Claude Code configuration
|
+-- agents/
|   +-- core/                    # 6 core agents
|   |   +-- orchestrator.md
|   |   +-- analyzer.md
|   |   +-- coder.md
|   |   +-- reviewer.md
|   |   +-- documenter.md
|   |   +-- system_coordinator.md
|   |
|   +-- experts/                 # 22 L1 domain experts
|   |   +-- gui-super-expert.md
|   |   +-- database_expert.md
|   |   +-- security_unified_expert.md
|   |   +-- ... (19 more)
|   |   |
|   |   +-- L2/                  # 15 L2 specialists
|   |       +-- gui-layout-specialist.md
|   |       +-- db-query-optimizer.md
|   |       +-- ... (13 more)
|
+-- skills/
|   +-- orchestrator/
|   |   +-- SKILL.md             # Main orchestrator algorithm
|   |   +-- docs/                # 14 documentation files
|   |       +-- architecture.md  # This file
|   |       +-- memory-integration.md
|   |       +-- mcp-integration.md
|   |       +-- error-recovery.md
|   |       +-- team-patterns.md
|   |       +-- skills-reference.md
|   |       +-- windows-support.md
|   |       +-- routing-table.md
|   |       +-- setup-guide.md
|   |       +-- troubleshooting.md
|   |       +-- health-check.md
|   |       +-- observability.md
|   |       +-- examples.md
|   |       +-- test-suite.md
|   |
|   +-- code-review/SKILL.md
|   +-- git-workflow/SKILL.md
|   +-- testing-strategy/SKILL.md
|   +-- debugging/SKILL.md
|   +-- api-design/SKILL.md
|   +-- remotion-best-practices/SKILL.md
|   +-- strategic-compact/SKILL.md
|   +-- verification-loop/SKILL.md
|   +-- checkpoint/SKILL.md
|   +-- sessions/SKILL.md
|   +-- status/SKILL.md
|   +-- metrics/SKILL.md
|   +-- plan/SKILL.md
|   +-- tdd-workflow/SKILL.md
|   +-- security-scan/SKILL.md
|   +-- refactor-clean/SKILL.md
|   +-- build-fix/SKILL.md
|   +-- multi-plan/SKILL.md
|   +-- fix/SKILL.md
|   +-- cleanup/SKILL.md
|   +-- python-patterns/SKILL.md
|   +-- typescript-patterns/SKILL.md
|   +-- go-patterns/SKILL.md
|   +-- learn/SKILL.md
|   +-- evolve/SKILL.md
|
+-- rules/
|   +-- README.md                # Rules engine documentation
|   +-- common/
|   |   +-- coding-style.md
|   |   +-- security.md
|   |   +-- testing.md
|   |   +-- git-workflow.md
|   |   +-- database.md
|   |   +-- api-design.md
|   |
|   +-- python/patterns.md
|   +-- typescript/patterns.md
|   +-- go/patterns.md
|
+-- learnings/
|   +-- instincts.json           # Captured patterns
|
+-- templates/
|   +-- task-template.md
|   +-- review-template.md
|   +-- integration-template.md
|
+-- workflows/
|   +-- bugfix-workflow.md
|   +-- feature-workflow.md
|   +-- refactoring-workflow.md
|   +-- optimized-workflow.md
|
+-- projects/                    # Project-specific memory
|   +-- {project-hash}/
|       +-- memory/MEMORY.md
```

---

## MCP and Native Tools

### MCP Servers (Actual Protocol)

| Server | Type | Status | Purpose |
|--------|------|--------|---------|
| orchestrator | stdio (Python) | Active | Multi-agent coordination |
| slack | HTTP (OAuth) | Inactive | Slack integration |
| firebase | stdio (NPX) | Inactive | Firebase integration |

### Marketplace Plugins (10 Available)

context7, github, gitlab, serena, playwright, stripe, supabase, greptile, linear, laravel-boost

### Native Tools (Built-in, NOT MCP)

| Tool | Functions |
|------|-----------|
| canva | Design generation, editing, export |
| web-reader | URL content extraction |
| web-search-prime | Web search with filters |
| zai-mcp-server | Image/video analysis, UI processing |

**Important:** Native tools use `mcp__` prefix but are NOT actual MCP servers. Always available without ToolSearch.

---

## Session Hooks

| Hook Point | Fires When | Action |
|------------|-----------|--------|
| SessionStart | Session begins | Load memory + rules + health check |
| PreToolUse | Before tool call | Validate tool allowed |
| PostToolUse | After tool call | Collect metrics |
| PreCompact | Before compression | Save checkpoint |
| SessionEnd | Session ends | Learning + cleanup + metrics |
| Stop | Forced stop | Emergency checkpoint |

---

## Error Recovery

| Error | Recovery | Max Retries |
|-------|----------|-------------|
| Task timeout (>5min) | Fresh context restart | 3 |
| Agent unavailable | Route to fallback | 1 |
| MCP tool failure | Retry with fallback | 3 |
| File conflict | Sequential with lock | 3 |
| Memory corruption | Rebuild from backup | 1 |
| Circular dependency | Split to intermediate | 1 |
| Rate limit (429) | Exponential backoff | 5 |
| Resource exhausted | Cleanup + retry | 2 |

**Post-retry behavior:** Mark FAILED, log error, escalate critical blockers via AskUserQuestion.

---

## AI-NATIVE Architecture (V14.0.2)

### Predictive Cache

```
┌─────────────────────────────────────────────────────────────┐
│                  PredictiveAgentCache V14.0.2               │
├─────────────────────────────────────────────────────────────┤
│  Task Input → Pattern Engine → Agent Predictions           │
│                                                              │
│  Storage Tiers:                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ HOT 200  │→ │ WARM 800 │→ │ COLD 500 │                  │
│  │ patterns │  │ patterns │  │ precious │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  Cold Start Fallback:                                        │
│  AgentUsageTracker → Keyword mapping → Default predictions  │
│                                                              │
│  Distributed Lock (optional):                                │
│  ENV[CLAUDE_MULTI_PROCESS=true] → Redis lock                │
└─────────────────────────────────────────────────────────────┘
```

### Adaptive Budget

```
┌─────────────────────────────────────────────────────────────┐
│                 AdaptiveTokenBudget V14.0.2                 │
├─────────────────────────────────────────────────────────────┤
│  Task → Complexity Assessment → Token Budget               │
│                                                              │
│  Adaptive Thresholds (auto-adjust):                         │
│  - simple:   25th percentile of distribution                │
│  - medium:   50th percentile (median)                       │
│  - complex:  75th percentile                                │
│  - Update: 10% adjustment per 100+ samples                  │
│                                                              │
│  Dynamic Rule Budget:                                        │
│  - Base: 35%                                                 │
│  - High keyword density: +10%                               │
│  - Security domain: +15%                                    │
│  - New project: +10%                                         │
│  - Range: 20% - 60%                                          │
└─────────────────────────────────────────────────────────────┘
```

### A/B Testing

```
┌─────────────────────────────────────────────────────────────┐
│                  ABTestingFramework V14.0.2                 │
├─────────────────────────────────────────────────────────────┤
│  Multi-Variant Support (A/B/C/D):                           │
│                                                              │
│  Experiment Configuration:                                   │
│  - variants: List[RoutingStrategy] (2-4)                    │
│  - weights: List[float] (e.g., [0.5, 0.3, 0.2])            │
│                                                              │
│  Statistical Tests:                                          │
│  - 2 variants: Z-test (alpha=0.05)                          │
│  - 3+ variants: Chi-square test                             │
│  - Min samples: 30 per variant                              │
│                                                              │
│  Assignment: SHA-256 hash → weighted distribution           │
└─────────────────────────────────────────────────────────────┘
```

### Auto-Tuner

```
┌─────────────────────────────────────────────────────────────┐
│                      AutoTuner V14.0.2                      │
├─────────────────────────────────────────────────────────────┤
│  Gaussian Process Regressor:                                 │
│  - Kernel: RBF with length_scale=0.5                        │
│  - Fit: Cholesky decomposition (fallback: pseudo-inverse)   │
│  - Predict: Posterior mean + variance                       │
│                                                              │
│  Adaptive Candidates:                                        │
│  - Formula: sqrt(dimensions) * base_factor                  │
│  - base_factor: 10 (early), 5 (medium), 3 (exploitation)   │
│  - Range: max(5, 2*dim) to 100                              │
│                                                              │
│  Candidate Generation: Latin Hypercube Sampling             │
│  Acquisition Function: UCB (mu + kappa * sigma)            │
│  Kappa Decay: 0.95 per iteration, min 0.1                   │
└─────────────────────────────────────────────────────────────┘
```

### V14.0.2 New Lib Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `lib/predictive_cache.py` | 814 | Pattern recognition, agent preloading |
| `lib/adaptive_budget.py` | 403 | Complexity-based token budgeting |
| `lib/ab_testing.py` | 320 | Multi-variant statistical testing |
| `lib/auto_tuner.py` | 551 | Bayesian hyperparameter optimization |

### V14.0.2 Performance Targets

| Metric | V13.1 | V14.0.2 | Improvement |
|--------|-------|---------|-------------|
| Agent Prediction Accuracy | N/A | >90% | NEW |
| Token Budget Precision | Fixed | Adaptive | 40% better |
| A/B Test Significance | Manual | Auto | Automated |
| Tuning Iterations | Manual | Auto | Bayesian |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **V14.0.2** | 2026-03-07 | AI-NATIVE: PredictiveAgentCache, AdaptiveTokenBudget, ABTestingFramework, AutoTuner, 4 new lib modules (~3208 lines), 54 new tests |
| **V13.1** | 2026-03-07 | Super-Performance: DB indexes, Rule Excerpts, Lazy L2 loading, 6 bug fixes (HIGH L-6, MEDIUM H-3, M-2, M-1, M-1x2) |
| **V13.0** | 2026-03-07 | Dynamic Agent Selection, Plugin Skills, File Locks, 5 new lib modules, bug fixes (3 CRITICAL, 4 HIGH) |
| **V11.3.1 AUDIT FIX** | 2026-02-26 | Deep audit: ~90 issues found, 22 fix categories, Windows syntax, routing entries, MCP honesty, subagent MCP access, learning threshold (0.5->0.6), multi-tag evolution |
| V11.3 AUDIT FIX | 2026-02-26 | 67 issues: MCP rewrite, step ordering, skills catalog (26), 4 ghost agents, NUL fix, L2->L1 mapping |
| V11.2 AUDIT FIX | 2026-02-26 | 34 issues: step reorder, agent count (43), 4 orphans routed |
| V11.1 BUGFIX | 2026-02-26 | 24 fixes: step ordering, learning format, routing |
| V11.0 NEW GEN | 2026-02-26 | Learning system, Rules Engine, Hooks, 24 skills |
| V10.2 ULTRA | 2026-02-21 | Notification Expert, Context Injection |
| V10.0 ULTRA | 2026-02-21 | Memory, Health Check, Observability |
| V8.0 SLIM | 2026-02-15 | Agent Teams, 39 agents |
| V7.0 | 2026-02-10 | MCP Integration, LSP |
| V5.0-6.0 | 2026-01-28 | Windows support, parallel execution |

---

## Quick Reference

| Metric | Value |
|--------|-------|
| Total Agents | 43 (6 core + 22 L1 + 15 L2) |
| Total Skills | 26 (7 core + 6 utility + 8 workflow + 3 language + 2 learning) |
| Rules Files | 10 (6 common + 3 language + README) |
| MCP Servers | 3 configured (1 active, 2 inactive) |
| Native Tools | 4 (canva, web-reader, web-search-prime, zai-mcp-server) |
| Documentation | 14 files in docs/ |
| Templates | 3 |
| Workflows | 4 |
| Version | 14.0.2 AI-NATIVE ARCHITECTURE |

---

---

## V13.1 Super-Performance Upgrade

### New Lib Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `lib/migrations/add_agent_score_index.sql` | 22 | DB indexes for agent_metrics |
| `lib/rule_excerpts.py` | 134 | Pre-computed rule excerpts system |
| `lib/rule_excerpts_index.json` | 112 | Index for rule categories |
| `lib/lazy_agents.py` | 320 | Lazy loading for L2 specialists |

### Performance Improvements

| Metric | V13.0 | V13.1 | Improvement |
|--------|-------|-------|-------------|
| DB Query Latency | <10ms | <5ms | 20-40% faster |
| Rules I/O Tokens | ~3000 | ~500 | 70-83% reduction |
| L2 Agent Memory | 15 loaded | Max 10 loaded | 30% reduction |
| Startup Time | ~2s | ~1.2s | 40% reduction |

### Bug Fixes (6 total)

| ID | Severity | Bug | Fix |
|----|----------|-----|-----|
| L-6 | HIGH | Signal handler deadlock | SystemExit vs sys.exit() |
| H-3 | MEDIUM | _save_to_disk() lock during I/O | Separate I/O from lock |
| M-2 | MEDIUM | shutdown() not waiting for flush | Add thread join |
| M-1 | MEDIUM | _async_events memory leak | cleanup_async_events() |
| M-1 | MEDIUM | cleanup() exception ignored | Track failures |
| - | MEDIUM | Missing DB indexes | 3 composite indexes |

---

**ORCHESTRATOR SYSTEM ARCHITECTURE V14.0.2 AI-NATIVE**
*Predictive cache. Adaptive budget. A/B testing. Auto-tuner.*
