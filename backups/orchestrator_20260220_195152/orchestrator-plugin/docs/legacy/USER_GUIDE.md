# Plugin Orchestrator - User Guide

> **Version:** 1.0
> **Date:** 30 Gennaio 2026
> **Audience:** Claude Code Users (All Levels)

## Quick Start

### What is Plugin Orchestrator?

Plugin Orchestrator transforms your Claude Code experience from managing multiple agents manually to **describing what you want in natural language** and letting the system automatically:

✅ **Select the right agents** for your task
✅ **Run them in parallel** when possible
✅ **Handle dependencies** automatically
✅ **Track progress** in real-time
✅ **Document everything** automatically
✅ **Optimize costs** by choosing the right models

### Before vs After

**🔴 Before (Manual):**
```bash
# Step 1: Choose agent manually
Task(subagent_type: "explore", instructions: "Find auth files...")

# Step 2: Wait for result, analyze manually
# Step 3: Choose next agent based on findings
Task(subagent_type: "general-purpose", instructions: "You are security expert...")

# Step 4: Repeat 5-10 times
# Step 5: Coordinate results manually
# Step 6: Document manually (often forgotten)
```
*Total: 30-60 minutes, high cognitive load, error-prone*

**🟢 After (Orchestrator):**
```bash
/orchestrator "Add OAuth2 Google login with secure JWT session storage"
```
*Total: 16 minutes, zero cognitive overhead, automatic documentation*

---

## Installation

### Prerequisites
- Claude Code v2.0+ installed
- Basic familiarity with Claude Code commands

### Install Steps
```bash
# 1. Install plugin
claude-code plugin install orchestrator-plugin

# 2. Verify installation
/help orchestrator

# 3. Ready to use!
/orchestrator "your first task description"
```

---

## Basic Usage

### Simple Commands

#### Fix a Bug
```bash
/orchestrator "Fix the sidebar alignment issue in the settings dialog"
```
**What happens:** Orchestrator detects GUI domain → routes to gui-super-expert → automatically documents fix

#### Add a Feature
```bash
/orchestrator "Add a dark mode toggle to user preferences"
```
**What happens:** Detects GUI + configuration domains → routes to gui-super-expert + database_expert → runs in parallel → auto-documents

#### Optimize Performance
```bash
/orchestrator "Optimize database queries in the user authentication module"
```
**What happens:** Detects database + performance domains → routes to database_expert + tester_expert → optimizes + validates

### Preview Mode

See the execution plan without running:
```bash
/orchestrator-preview "Add OAuth2 login with JWT tokens"
```

**Output:**
```
🤖 EXECUTION PLAN

| # | Task | Agent Expert File | Model | Depends | Est. Time |
|---|------|-------------------|-------|---------|-----------|
| T1 | Analyze auth flow | core/analyzer.md | haiku | - | 2m |
| T2 | Design security arch | experts/security_unified_expert.md | sonnet | T1 | 5m |
| T3 | OAuth2 integration | experts/social_identity_expert.md | sonnet | T2 | 6m |
| T4 | JWT implementation | experts/security_unified_expert.md | sonnet | T2 | 4m |
| T5 | Testing suite | experts/tester_expert.md | sonnet | T3,T4 | 3m |
| T6 | Documentation | core/documenter.md | haiku | T5 | 1m |

Total: 6 agents | 4 parallel batches | ~21 minutes | Est. cost: $0.28
```

---

## Advanced Usage

### Command Options

#### Budget Control
```bash
/orchestrator "Refactor authentication module" --budget 100
```
*Sets maximum cost to $1.00*

#### Time Limits
```bash
/orchestrator "Quick bug fix in login form" --time-limit 15m
```
*Limits execution to 15 minutes*

#### Model Preferences
```bash
/orchestrator "Simple README update" --model-preference haiku
```
*Prefers cheaper haiku model when possible*

#### Dry Run
```bash
/orchestrator "Complex refactoring task" --dry-run
```
*Shows plan without execution*

### Resume Failed Sessions

If an orchestration fails or gets interrupted:

```bash
# Check recent sessions
/orchestrator-list

# Resume specific session
/orchestrator-resume a7f3c9d2-4e8b-1234-5678-90abcdef1234
```

---

## Understanding the Output

### Real-Time Progress

During execution, you'll see live updates:

```
⚡ EXECUTING BATCH 2/4...
├─ T2: Design security (security-expert-b8e4d) ███████████▓ 95% (4.2m)
│  └─ Currently: Validating OWASP compliance...
│
├─ T3: OAuth2 integration (social-identity-c9f5e) ████████▓ 87% (5.1m)
│  └─ Currently: Configuring Google OAuth2 client...
│
└─ Batch Progress: 91% | ETA: 1.2 minutes remaining
```

### Final Report

At completion, you get a comprehensive summary:

```
✨ ORCHESTRATION COMPLETE (24.3 min)

📊 FINAL REPORT
├─ Success: 6/6 tasks completed
├─ Time: 24.3 min (2.7 min under estimate)
├─ Cost: $0.24 (14% under budget)
├─ Model Usage: haiku 15% | sonnet 72% | opus 13%
└─ Files Modified: 8 files across 4 modules

📁 FILES MODIFIED
├─ src/auth/oauth2_handler.py (new - OAuth2 integration)
├─ src/auth/jwt_manager.py (new - JWT token management)
├─ src/config/auth_config.json (updated - OAuth2 settings)
├─ tests/auth/test_oauth2.py (new - comprehensive tests)
├─ requirements.txt (updated - added authlib, PyJWT)
├─ README.md (updated - authentication setup guide)
├─ CONTEXT_HISTORY.md (updated - session documentation)
└─ docs/API.md (updated - new auth endpoints)

🎯 NEXT STEPS
├─ Configure OAuth2 client secrets in environment
├─ Run database migrations for auth tables
└─ Test OAuth2 flow in development environment

Session ID: a7f3c9d2 (for reference or resume)
```

---

## Domain-Specific Examples

### GUI Development
```bash
# Simple UI fix
/orchestrator "Fix button spacing in the toolbar"

# Complex UI feature
/orchestrator "Create a tabbed settings dialog with form validation"

# UI performance
/orchestrator "Optimize widget rendering performance in the main window"
```

### Database Operations
```bash
# Schema changes
/orchestrator "Add user preferences table with migration script"

# Query optimization
/orchestrator "Optimize slow queries in the reporting module"

# Database migration
/orchestrator "Migrate from SQLite to PostgreSQL with data preservation"
```

### Security Tasks
```bash
# Authentication
/orchestrator "Implement OAuth2 with multiple providers (Google, GitHub, Apple)"

# Encryption
/orchestrator "Add AES-256 encryption for sensitive user data"

# Security audit
/orchestrator "Perform security audit and fix OWASP Top 10 vulnerabilities"
```

### Trading & Financial
```bash
# Strategy development
/orchestrator "Create mean reversion trading strategy with 2% risk limit"

# MQL Expert Advisors
/orchestrator "Optimize EA for CPU 0% usage with improved signal accuracy"

# Risk management
/orchestrator "Implement position sizing with maximum drawdown protection"
```

### API Integration
```bash
# External APIs
/orchestrator "Integrate TradingView webhook with portfolio management"

# Internal APIs
/orchestrator "Create REST API endpoints for user management"

# Real-time data
/orchestrator "Add WebSocket connection for real-time price feeds"
```

### DevOps & Deployment
```bash
# CI/CD
/orchestrator "Setup GitHub Actions for automated testing and deployment"

# Containerization
/orchestrator "Dockerize application with multi-stage build optimization"

# Monitoring
/orchestrator "Add Prometheus metrics and Grafana dashboard"
```

---

## Best Practices

### Writing Effective Requests

#### ✅ Good Examples

**Be specific about the outcome:**
```bash
/orchestrator "Add dark mode toggle that persists user preference and updates all UI components"
```

**Include important constraints:**
```bash
/orchestrator "Optimize database queries to reduce response time below 100ms"
```

**Mention related concerns:**
```bash
/orchestrator "Add user registration with email verification and GDPR compliance"
```

#### ❌ Avoid These

**Too vague:**
```bash
/orchestrator "make it better"  # What needs improvement?
```

**Too technical (let the system choose):**
```bash
/orchestrator "use gui-super-expert.md to fix PyQt5 QVBoxLayout"  # Just describe the problem
```

**Multiple unrelated tasks:**
```bash
/orchestrator "fix bug and add feature and write docs and deploy"  # Break into separate orchestrations
```

### Understanding Cost Optimization

The orchestrator automatically optimizes costs by:

1. **Model Selection**: Uses cheapest model that can handle the task
   - Simple tasks → haiku ($)
   - Problem solving → sonnet ($$)
   - Architecture/creative → opus ($$$)

2. **Parallel Execution**: Runs independent tasks simultaneously

3. **Smart Escalation**: Only escalates models when necessary

**Cost Examples:**
```bash
"Fix typo in README"           # ~$0.02 (haiku only)
"Add OAuth2 login"            # ~$0.25 (mixed models)
"Design microservice arch"    # ~$0.45 (opus required)
```

### Working with Large Projects

For complex, multi-part projects:

1. **Break into phases:**
```bash
# Phase 1
/orchestrator "Design authentication architecture with OAuth2 and JWT"

# Phase 2
/orchestrator "Implement OAuth2 providers (Google, GitHub, Apple)"

# Phase 3
/orchestrator "Add JWT session management with refresh tokens"
```

2. **Use preview mode** to understand scope:
```bash
/orchestrator-preview "Complete user management system"
```

3. **Set appropriate budgets:**
```bash
/orchestrator "Large refactoring task" --budget 500  # $5.00 limit
```

---

## Troubleshooting

### Common Issues

#### Issue: "No suitable agent found"
**Cause:** Request too vague or outside supported domains
**Solution:** Be more specific about the task type
```bash
# Instead of:
/orchestrator "fix this"

# Try:
/orchestrator "fix the login button alignment in the authentication dialog"
```

#### Issue: "Circular dependency detected"
**Cause:** Task description implies impossible dependency chain
**Solution:** Break into sequential phases
```bash
# Instead of:
/orchestrator "test the feature while building it"

# Try:
/orchestrator "build authentication feature with comprehensive testing"
```

#### Issue: "Budget exceeded"
**Cause:** Task more complex than expected
**Solution:** Increase budget or simplify scope
```bash
/orchestrator "complex task" --budget 200  # Increase to $2.00
```

#### Issue: "Agent timeout"
**Cause:** Individual agent task too complex
**Solution:** Break into smaller subtasks
```bash
# Instead of:
/orchestrator "completely redesign the entire application"

# Try:
/orchestrator "redesign the user authentication flow"
```

### Getting Help

#### Check recent sessions:
```bash
/orchestrator-list
```

#### View session details:
```bash
/orchestrator-status a7f3c9d2  # Session ID
```

#### Resume interrupted session:
```bash
/orchestrator-resume a7f3c9d2
```

#### Preview before running:
```bash
/orchestrator-preview "your complex task"
```

---

## FAQ

### Q: How does orchestrator choose which agents to use?

**A:** It analyzes your request for keywords and domains:
- "GUI", "widget", "dialog" → gui-super-expert
- "database", "SQL", "query" → database_expert
- "security", "auth", "OAuth" → security_unified_expert
- And combinations for multi-domain tasks

### Q: Can I override the agent selection?

**A:** Not directly - the system is designed to make optimal choices automatically. If you need specific agents, use the traditional Task commands. The orchestrator is for "describe what you want" workflows.

### Q: How accurate is cost estimation?

**A:** Cost estimates are typically within ±20% accuracy. Factors affecting costs:
- Actual task complexity vs. detected complexity
- Model escalations (failures requiring stronger models)
- Real-world execution time variations

### Q: What happens if an agent fails?

**A:** The system automatically:
1. Retries the task up to 2 times
2. Escalates to a stronger model (haiku → sonnet → opus)
3. If still failing, gracefully handles the error
4. Continues with other independent tasks
5. Reports the failure in the final summary

### Q: Is my data safe?

**A:** Yes:
- No data leaves your machine
- All operations use existing Claude Code security
- Agent files are read-only
- Session data is stored locally only
- No external network calls except existing Claude API

### Q: Can I customize the keyword mappings?

**A:** Currently, keyword mappings are built-in and optimized. Future versions may allow customization through configuration files.

### Q: How does documentation work?

**A:** Every orchestration automatically includes a documentation step as the final task (REGOLA #5). This updates:
- `CONTEXT_HISTORY.md` with session details
- `README.md` if relevant
- Code comments for new/modified functions
- Any relevant project documentation

### Q: Can I run multiple orchestrations simultaneously?

**A:** Currently, one orchestration per session is supported. Each orchestration can run up to 20 agents in parallel internally.

---

## Examples by Experience Level

### Beginner Examples

**Start with simple, single-domain tasks:**
```bash
/orchestrator "Fix the typo in the main window title"
/orchestrator "Add a confirmation dialog before deleting files"
/orchestrator "Change the button color to blue in the settings"
```

### Intermediate Examples

**Try multi-step tasks within single domains:**
```bash
/orchestrator "Add user preferences with persistent storage"
/orchestrator "Implement form validation with error messages"
/orchestrator "Add keyboard shortcuts for common menu actions"
```

### Advanced Examples

**Handle complex, multi-domain orchestrations:**
```bash
/orchestrator "Implement OAuth2 authentication with JWT sessions, user roles, and audit logging"

/orchestrator "Create real-time trading dashboard with WebSocket price feeds, risk management, and database persistence"

/orchestrator "Build microservice architecture with API gateway, service discovery, and monitoring"
```

---

## Appendix: Supported Domains

### Complete Domain Coverage

| Domain | Agent Expert | Example Keywords | Typical Models |
|--------|-------------|------------------|----------------|
| **GUI/UX** | gui-super-expert | gui, widget, dialog, layout, pyqt5 | sonnet |
| **Database** | database_expert | sql, query, schema, migration, sqlite | sonnet |
| **Security** | security_unified_expert | auth, oauth, encryption, jwt, security | sonnet |
| **Trading** | trading_strategy_expert | trading, risk, position, strategy | sonnet |
| **MQL** | mql_expert | mql, ea, metatrader, expert advisor | sonnet |
| **Testing** | tester_expert | test, debug, qa, performance | sonnet |
| **Architecture** | architect_expert | design, pattern, microservice, refactor | opus |
| **Integration** | integration_expert | api, webhook, rest, telegram | sonnet |
| **DevOps** | devops_expert | deploy, docker, ci/cd, build | haiku |
| **Languages** | languages_expert | python, javascript, c#, refactor | sonnet |
| **AI/ML** | ai_integration_expert | ai, llm, model, embedding | sonnet |
| **Claude Systems** | claude_systems_expert | claude, optimization, cost | sonnet |
| **Mobile** | mobile_expert | ios, android, flutter, mobile | sonnet |
| **Automation** | n8n_expert | workflow, automation, n8n | sonnet |
| **Social Auth** | social_identity_expert | oauth2, google, social login | sonnet |

### Core Functions

| Function | Agent | Purpose | Model |
|----------|-------|---------|-------|
| **Analysis** | analyzer | Explore codebase, find files | haiku |
| **Implementation** | coder | General coding, bug fixes | sonnet |
| **Review** | reviewer | Code quality, best practices | sonnet |
| **Documentation** | documenter | Auto-documentation (REGOLA #5) | haiku |
| **System** | system_coordinator | Resource management | haiku |

---

## Getting Started Checklist

- [ ] Install orchestrator plugin
- [ ] Try a simple command: `/orchestrator "fix typo in README"`
- [ ] Try preview mode: `/orchestrator-preview "add dark mode toggle"`
- [ ] Run a real task and observe the progress
- [ ] Check the final report and documentation
- [ ] Try a multi-domain task
- [ ] Experiment with budget/time limits
- [ ] Practice writing effective task descriptions

**Ready to transform your Claude Code experience? Start with a simple task and discover the power of intelligent orchestration!**

---

*For technical details, see [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md)*
*For development information, see [PRD.md](PRD.md)*