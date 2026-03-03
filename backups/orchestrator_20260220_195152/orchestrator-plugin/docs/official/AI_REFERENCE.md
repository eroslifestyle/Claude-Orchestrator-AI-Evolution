# AI Reference Guide - Orchestrator Plugin v4.1 EMPEROR

**AI-Readable Reference for LLM Integration**

This document provides structured, machine-readable information about the Orchestrator Plugin for AI systems and LLMs.

---

## Metadata

```json
{
  "plugin_name": "orchestrator-plugin",
  "version": "4.1.0-EMPEROR",
  "protocol_version": "1.0",
  "author": "Development Team",
  "license": "MIT",
  "generated_date": "2026-02-01",
  "compatibility": {
    "node": ">=18.0.0",
    "claude_code": ">=2.0.0",
    "anthropic_sdk": ">=0.20.0"
  }
}
```

---

## Tool Definitions

### MCP Tools

The plugin provides the following MCP tools:

```json
{
  "mcp_tools": [
    {
      "name": "orchestrator_agents",
      "description": "List all available expert agents with optional filtering",
      "parameters": {
        "filter": {
          "type": "string",
          "description": "Filter by domain or keyword (optional)",
          "required": false
        }
      },
      "returns": "Array of agent definitions"
    },
    {
      "name": "orchestrator_analyze",
      "description": "Analyze a request and generate execution plan without executing",
      "parameters": {
        "request": {
          "type": "string",
          "description": "User request to analyze",
          "required": true
        },
        "show_table": {
          "type": "boolean",
          "description": "Show execution plan table",
          "default": true,
          "required": false
        }
      },
      "returns": "Execution plan with task breakdown"
    },
    {
      "name": "orchestrator_execute",
      "description": "Execute orchestration plan (generates plan for Task tool execution)",
      "parameters": {
        "request": {
          "type": "string",
          "description": "User request to orchestrate",
          "required": true
        },
        "parallel": {
          "type": "number",
          "description": "Max parallel agents (1-64)",
          "default": 6,
          "required": false
        },
        "model": {
          "type": "string",
          "description": "Force specific model",
          "enum": ["auto", "haiku", "sonnet", "opus"],
          "default": "auto",
          "required": false
        }
      },
      "returns": "Execution session ID and results"
    },
    {
      "name": "orchestrator_preview",
      "description": "Preview orchestration with detailed task breakdown",
      "parameters": {
        "request": {
          "type": "string",
          "description": "Request to preview",
          "required": true
        }
      },
      "returns": "Detailed task breakdown with agent assignments"
    },
    {
      "name": "orchestrator_status",
      "description": "Get status of an orchestration session",
      "parameters": {
        "session_id": {
          "type": "string",
          "description": "Session ID to check (empty for latest)",
          "required": false
        }
      },
      "returns": "Session status and statistics"
    },
    {
      "name": "orchestrator_cancel",
      "description": "Cancel an active orchestration session",
      "parameters": {
        "session_id": {
          "type": "string",
          "description": "Session ID to cancel",
          "required": true
        }
      },
      "returns": "Cancellation confirmation"
    },
    {
      "name": "orchestrator_list",
      "description": "List recent orchestration sessions",
      "parameters": {
        "limit": {
          "type": "number",
          "description": "Max sessions to return",
          "default": 10,
          "minimum": 1,
          "maximum": 50,
          "required": false
        }
      },
      "returns": "Array of recent sessions"
    }
  ]
}
```

---

## Agent Registry

### Core Agents

```json
{
  "core_agents": [
    {
      "name": "orchestrator",
      "file": "core/orchestrator.md",
      "role": "Central coordination hub",
      "specialization": "Multi-agent orchestration, parallelism, delegation",
      "keywords": ["orchestrate", "coordinate", "manage", "delegate", "parallel"],
      "defaultModel": "sonnet",
      "version": "5.3",
      "capabilities": [
        "task_delegation",
        "parallel_execution",
        "agent_coordination",
        "load_balancing"
      ]
    },
    {
      "name": "system_coordinator",
      "file": "core/system_coordinator.md",
      "role": "Resource management assistant",
      "specialization": "Resource management, token tracking, agent spawn monitoring",
      "keywords": ["resource", "token", "tracking", "memory", "system"],
      "defaultModel": "haiku",
      "version": "3.0",
      "capabilities": [
        "token_tracking",
        "memory_management",
        "agent_monitoring"
      ]
    },
    {
      "name": "analyzer",
      "file": "core/analyzer.md",
      "role": "Code exploration specialist",
      "specialization": "Codebase analysis, file exploration, keyword search",
      "keywords": ["analyze", "explore", "search", "find", "structure", "codebase"],
      "defaultModel": "haiku",
      "version": "2.1",
      "capabilities": [
        "code_analysis",
        "file_search",
        "keyword_search",
        "structure_analysis"
      ]
    },
    {
      "name": "coder",
      "file": "core/coder.md",
      "role": "General implementation specialist",
      "specialization": "General coding, feature implementation, bug fixing",
      "keywords": ["code", "implement", "develop", "create", "build", "fix"],
      "defaultModel": "sonnet",
      "version": "2.8",
      "capabilities": [
        "feature_implementation",
        "bug_fixing",
        "problem_solving",
        "code_generation"
      ]
    },
    {
      "name": "reviewer",
      "file": "core/reviewer.md",
      "role": "Code quality specialist",
      "specialization": "Code review, quality check, best practices enforcement",
      "keywords": ["review", "quality", "check", "validate", "audit", "standards"],
      "defaultModel": "sonnet",
      "version": "2.5",
      "capabilities": [
        "code_review",
        "quality_check",
        "standards_enforcement",
        "best_practices"
      ]
    },
    {
      "name": "documenter",
      "file": "core/documenter.md",
      "role": "Documentation specialist",
      "specialization": "Technical writing, documentation, README updates",
      "keywords": ["document", "write", "readme", "docs", "comments", "guide"],
      "defaultModel": "haiku",
      "version": "2.3",
      "capabilities": [
        "technical_writing",
        "documentation_generation",
        "readme_creation",
        "rule_5_enforcement"
      ]
    }
  ]
}
```

### Expert Agents

```json
{
  "expert_agents": [
    {
      "name": "gui-super-expert",
      "file": "experts/gui-super-expert.md",
      "role": "UI/UX specialist",
      "specialization": "PyQt5, Qt, UI, Widget, Tab, Dialog, Layout, Design Systems",
      "keywords": ["gui", "ui", "ux", "interface", "widget", "pyqt", "qt", "layout", "dialog", "tab", "design", "accessibility"],
      "defaultModel": "sonnet",
      "version": "2.0",
      "capabilities": [
        "pyqt5_development",
        "qt_design",
        "ui_layout",
        "widget_creation",
        "design_systems"
      ]
    },
    {
      "name": "database_expert",
      "file": "experts/database_expert.md",
      "role": "Database specialist",
      "specialization": "SQLite, PostgreSQL, Schema, Query optimization, Migration",
      "keywords": ["database", "sql", "sqlite", "postgresql", "query", "schema", "migration", "optimization"],
      "defaultModel": "sonnet",
      "version": "1.5",
      "capabilities": [
        "database_design",
        "query_optimization",
        "schema_migration",
        "sql_development"
      ]
    },
    {
      "name": "security_unified_expert",
      "file": "experts/security_unified_expert.md",
      "role": "Security specialist (unified)",
      "specialization": "Security, Encryption, Auth, JWT, OWASP, AppSec, IAM, Cyber Defense",
      "keywords": ["security", "auth", "authentication", "authorization", "encryption", "jwt", "oauth", "owasp", "appsec", "iam"],
      "defaultModel": "opus",
      "version": "3.0",
      "capabilities": [
        "application_security",
        "iam_implementation",
        "cyber_defense",
        "encryption",
        "owasp_compliance"
      ]
    },
    {
      "name": "trading_strategy_expert",
      "file": "experts/trading_strategy_expert.md",
      "role": "Trading strategy specialist",
      "specialization": "Trading, Risk Management, Position Sizing, Prop Firm Compliance",
      "keywords": ["trading", "strategy", "risk", "management", "position", "sizing", "prop", "firm", "compliance"],
      "defaultModel": "sonnet",
      "version": "2.2",
      "capabilities": [
        "trading_strategy",
        "risk_management",
        "position_sizing",
        "prop_firm_compliance"
      ]
    },
    {
      "name": "mql_expert",
      "file": "experts/mql_expert.md",
      "role": "MQL4/MQL5 specialist",
      "specialization": "MQL5, MQL4, MetaTrader, EA, OnTimer, Expert Advisor, CPU optimization",
      "keywords": ["mql", "mql4", "mql5", "metatrader", "ea", "expert", "advisor", "ontimer", "trading", "forex"],
      "defaultModel": "sonnet",
      "version": "1.8",
      "capabilities": [
        "mql5_development",
        "expert_advisor",
        "metatrader_integration",
        "cpu_optimization"
      ]
    },
    {
      "name": "tester_expert",
      "file": "experts/tester_expert.md",
      "role": "Quality assurance specialist",
      "specialization": "Testing, QA, Debug, Performance, Memory, Test Architecture",
      "keywords": ["test", "testing", "qa", "quality", "debug", "performance", "memory", "benchmark"],
      "defaultModel": "sonnet",
      "version": "1.6",
      "capabilities": [
        "testing",
        "quality_assurance",
        "debugging",
        "performance_analysis",
        "memory_profiling"
      ]
    },
    {
      "name": "architect_expert",
      "file": "experts/architect_expert.md",
      "role": "Software architecture specialist",
      "specialization": "System Design, API Design, Design Pattern, Microservices, Trade-offs, ADR",
      "keywords": ["architecture", "design", "pattern", "system", "api", "microservices", "adr", "c4", "diagram"],
      "defaultModel": "opus",
      "version": "2.1",
      "capabilities": [
        "system_design",
        "api_design",
        "design_patterns",
        "architecture_decision_records",
        "lateral_thinking"
      ]
    },
    {
      "name": "integration_expert",
      "file": "experts/integration_expert.md",
      "role": "API integration specialist",
      "specialization": "API, Telegram, cTrader, REST, Webhook, TradingView, messaging",
      "keywords": ["api", "integration", "telegram", "ctrader", "rest", "webhook", "tradingview", "client", "server"],
      "defaultModel": "sonnet",
      "version": "1.4",
      "capabilities": [
        "api_integration",
        "webhook_development",
        "messaging_systems",
        "client_server_communication"
      ]
    },
    {
      "name": "devops_expert",
      "file": "experts/devops_expert.md",
      "role": "DevOps & SRE specialist",
      "specialization": "DevOps, CI/CD, Deploy, Docker, Build, IaC, Kubernetes, Monitoring",
      "keywords": ["devops", "cicd", "deploy", "docker", "build", "kubernetes", "iac", "monitoring", "observability"],
      "defaultModel": "haiku",
      "version": "1.2",
      "capabilities": [
        "ci_cd_pipelines",
        "docker_deployment",
        "kubernetes_orchestration",
        "infrastructure_as_code",
        "monitoring"
      ]
    },
    {
      "name": "languages_expert",
      "file": "experts/languages_expert.md",
      "role": "Multi-language programming specialist",
      "specialization": "Python, JavaScript, C#, Multi-language, Syntax, Idioms, Performance",
      "keywords": ["python", "javascript", "csharp", "language", "syntax", "idioms", "performance", "programming"],
      "defaultModel": "sonnet",
      "version": "1.9",
      "capabilities": [
        "multi_language_development",
        "language_idioms",
        "syntax_optimization",
        "cross_language_patterns"
      ]
    },
    {
      "name": "ai_integration_expert",
      "file": "experts/ai_integration_expert.md",
      "role": "AI integration specialist",
      "specialization": "AI Integration, LLM, Model Selection, Build vs Buy, RAG, Prompt Engineering",
      "keywords": ["ai", "llm", "model", "integration", "rag", "prompt", "engineering", "build", "buy"],
      "defaultModel": "sonnet",
      "version": "1.7",
      "capabilities": [
        "ai_integration",
        "llm_implementation",
        "rag_systems",
        "prompt_engineering",
        "roi_analysis"
      ]
    },
    {
      "name": "claude_systems_expert",
      "file": "experts/claude_systems_expert.md",
      "role": "Claude ecosystem specialist",
      "specialization": "Claude Ecosystem, Haiku/Sonnet/Opus, Cost Optimization, API Patterns",
      "keywords": ["claude", "haiku", "sonnet", "opus", "cost", "optimization", "api", "patterns", "caching"],
      "defaultModel": "sonnet",
      "version": "2.0",
      "capabilities": [
        "claude_optimization",
        "cost_optimization",
        "api_patterns",
        "caching_strategies",
        "model_orchestration"
      ]
    },
    {
      "name": "mobile_expert",
      "file": "experts/mobile_expert.md",
      "role": "Mobile development specialist",
      "specialization": "iOS, Android, Swift, Kotlin, Flutter, React Native, App Store",
      "keywords": ["mobile", "ios", "android", "swift", "kotlin", "flutter", "react", "native", "app", "store"],
      "defaultModel": "sonnet",
      "version": "1.3",
      "capabilities": [
        "ios_development",
        "android_development",
        "flutter_development",
        "react_native",
        "app_store_deployment"
      ]
    },
    {
      "name": "n8n_expert",
      "file": "experts/n8n_expert.md",
      "role": "Workflow automation specialist",
      "specialization": "N8N, Workflow Automation, Process Integration, Low-Code",
      "keywords": ["n8n", "workflow", "automation", "process", "integration", "lowcode", "nocode"],
      "defaultModel": "sonnet",
      "version": "1.1",
      "capabilities": [
        "n8n_development",
        "workflow_automation",
        "process_integration",
        "low_code_solutions"
      ]
    },
    {
      "name": "social_identity_expert",
      "file": "experts/social_identity_expert.md",
      "role": "Social identity & OAuth specialist",
      "specialization": "OAuth2, OIDC, Google, Facebook, Apple, Microsoft, GitHub Login",
      "keywords": ["oauth", "oauth2", "oidc", "google", "facebook", "apple", "microsoft", "github", "social", "login"],
      "defaultModel": "sonnet",
      "version": "1.5",
      "capabilities": [
        "oauth2_implementation",
        "oidc_integration",
        "social_login",
        "identity_provider_integration"
      ]
    }
  ]
}
```

---

## Configuration Schema

### OrchestratorConfig

```json
{
  "type": "object",
  "properties": {
    "maxConcurrent": {
      "type": "number",
      "default": 12,
      "minimum": 1,
      "maximum": 128,
      "description": "Maximum concurrent tasks"
    },
    "maxDepth": {
      "type": "number",
      "default": 10,
      "minimum": 1,
      "maximum": 100,
      "description": "Maximum task depth"
    },
    "maxTasks": {
      "type": "number",
      "default": 500,
      "minimum": 1,
      "maximum": 10000,
      "description": "Maximum total tasks"
    },
    "taskTimeout": {
      "type": "number",
      "default": 300000,
      "minimum": 1000,
      "description": "Default task timeout in milliseconds"
    },
    "enableSmartModelSelection": {
      "type": "boolean",
      "default": true,
      "description": "Enable smart model selection"
    },
    "enableAgentDiscovery": {
      "type": "boolean",
      "default": true,
      "description": "Enable agent discovery"
    },
    "enableAutoDocumentation": {
      "type": "boolean",
      "default": true,
      "description": "Enable auto-documentation (REGOLA #5)"
    },
    "enableDashboard": {
      "type": "boolean",
      "default": true,
      "description": "Enable dashboard output"
    },
    "enableStreaming": {
      "type": "boolean",
      "default": true,
      "description": "Enable streaming results"
    },
    "enableCleanContext": {
      "type": "boolean",
      "default": true,
      "description": "Enable clean context mode"
    },
    "cleanBeforeTask": {
      "type": "boolean",
      "default": true,
      "description": "Clear context before each task"
    },
    "cleanAfterTask": {
      "type": "boolean",
      "default": false,
      "description": "Clear context after each task"
    },
    "isolateAgents": {
      "type": "boolean",
      "default": true,
      "description": "Isolate context between agents"
    },
    "focusMode": {
      "type": "boolean",
      "default": true,
      "description": "Remove verbosity"
    },
    "autoFallbackOnMissing": {
      "type": "boolean",
      "default": true,
      "description": "Auto-fallback to default agent"
    },
    "defaultFallbackAgent": {
      "type": "string",
      "default": "core/coder.md",
      "description": "Default fallback agent"
    },
    "simulateExecution": {
      "type": "boolean",
      "default": true,
      "description": "Simulate execution (safe mode)"
    },
    "simulationDelay": {
      "type": "object",
      "properties": {
        "min": {"type": "number", "default": 50},
        "max": {"type": "number", "default": 200}
      },
      "description": "Simulation delay range in milliseconds"
    }
  }
}
```

### TaskConfig

```json
{
  "type": "object",
  "required": ["description"],
  "properties": {
    "description": {
      "type": "string",
      "description": "Task description"
    },
    "agentFile": {
      "type": "string",
      "description": "Agent file path (e.g., 'experts/database_expert.md')"
    },
    "model": {
      "type": "string",
      "enum": ["haiku", "sonnet", "opus"],
      "description": "Claude model to use"
    },
    "priority": {
      "type": "string",
      "enum": ["CRITICA", "ALTA", "MEDIA", "BASSA"],
      "description": "Task priority"
    },
    "dependsOn": {
      "type": "array",
      "items": {"type": "string"},
      "default": [],
      "description": "Task IDs this task depends on"
    },
    "timeout": {
      "type": "number",
      "default": 300000,
      "description": "Task timeout in milliseconds"
    },
    "retries": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "description": "Number of retries"
    },
    "metadata": {
      "type": "object",
      "default": {},
      "description": "Custom metadata"
    }
  }
}
```

---

## Keyword Mappings

```json
{
  "keyword_agent_map": {
    "gui": {"agent": "experts/gui-super-expert.md", "model": "sonnet", "priority": "ALTA"},
    "pyqt": {"agent": "experts/gui-super-expert.md", "model": "sonnet", "priority": "ALTA"},
    "pyqt5": {"agent": "experts/gui-super-expert.md", "model": "sonnet", "priority": "ALTA"},
    "qt": {"agent": "experts/gui-super-expert.md", "model": "sonnet", "priority": "ALTA"},
    "widget": {"agent": "experts/gui-super-expert.md", "model": "sonnet", "priority": "ALTA"},
    "ui": {"agent": "experts/gui-super-expert.md", "model": "sonnet", "priority": "ALTA"},
    "frontend": {"agent": "experts/gui-super-expert.md", "model": "sonnet", "priority": "ALTA"},
    "database": {"agent": "experts/database_expert.md", "model": "sonnet", "priority": "ALTA"},
    "db": {"agent": "experts/database_expert.md", "model": "sonnet", "priority": "ALTA"},
    "sql": {"agent": "experts/database_expert.md", "model": "sonnet", "priority": "ALTA"},
    "sqlite": {"agent": "experts/database_expert.md", "model": "sonnet", "priority": "ALTA"},
    "query": {"agent": "experts/database_expert.md", "model": "sonnet", "priority": "ALTA"},
    "schema": {"agent": "experts/database_expert.md", "model": "sonnet", "priority": "ALTA"},
    "security": {"agent": "experts/security_unified_expert.md", "model": "opus", "priority": "CRITICA"},
    "auth": {"agent": "experts/security_unified_expert.md", "model": "opus", "priority": "CRITICA"},
    "authentication": {"agent": "experts/security_unified_expert.md", "model": "opus", "priority": "CRITICA"},
    "jwt": {"agent": "experts/security_unified_expert.md", "model": "opus", "priority": "CRITICA"},
    "oauth": {"agent": "experts/social_identity_expert.md", "model": "sonnet", "priority": "CRITICA"},
    "api": {"agent": "experts/integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "rest": {"agent": "experts/integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "telegram": {"agent": "experts/integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "webhook": {"agent": "experts/integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "integration": {"agent": "experts/integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "trading": {"agent": "experts/trading_strategy_expert.md", "model": "sonnet", "priority": "ALTA"},
    "mql": {"agent": "experts/mql_expert.md", "model": "sonnet", "priority": "ALTA"},
    "mt4": {"agent": "experts/mql_expert.md", "model": "sonnet", "priority": "ALTA"},
    "mt5": {"agent": "experts/mql_expert.md", "model": "sonnet", "priority": "ALTA"},
    "metatrader": {"agent": "experts/mql_expert.md", "model": "sonnet", "priority": "ALTA"},
    "architecture": {"agent": "experts/architect_expert.md", "model": "opus", "priority": "ALTA"},
    "design": {"agent": "experts/architect_expert.md", "model": "opus", "priority": "ALTA"},
    "refactor": {"agent": "experts/architect_expert.md", "model": "opus", "priority": "ALTA"},
    "pattern": {"agent": "experts/architect_expert.md", "model": "opus", "priority": "ALTA"},
    "test": {"agent": "experts/tester_expert.md", "model": "sonnet", "priority": "ALTA"},
    "testing": {"agent": "experts/tester_expert.md", "model": "sonnet", "priority": "ALTA"},
    "debug": {"agent": "experts/tester_expert.md", "model": "sonnet", "priority": "ALTA"},
    "fix": {"agent": "experts/tester_expert.md", "model": "sonnet", "priority": "ALTA"},
    "bug": {"agent": "experts/tester_expert.md", "model": "sonnet", "priority": "ALTA"},
    "devops": {"agent": "experts/devops_expert.md", "model": "haiku", "priority": "MEDIA"},
    "docker": {"agent": "experts/devops_expert.md", "model": "haiku", "priority": "MEDIA"},
    "deploy": {"agent": "experts/devops_expert.md", "model": "haiku", "priority": "MEDIA"},
    "ci": {"agent": "experts/devops_expert.md", "model": "haiku", "priority": "MEDIA"},
    "cd": {"agent": "experts/devops_expert.md", "model": "haiku", "priority": "MEDIA"},
    "ai": {"agent": "experts/ai_integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "llm": {"agent": "experts/ai_integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "claude": {"agent": "experts/claude_systems_expert.md", "model": "sonnet", "priority": "ALTA"},
    "prompt": {"agent": "experts/ai_integration_expert.md", "model": "sonnet", "priority": "ALTA"},
    "document": {"agent": "core/documenter.md", "model": "haiku", "priority": "BASSA"},
    "documentation": {"agent": "core/documenter.md", "model": "haiku", "priority": "BASSA"},
    "doc": {"agent": "core/documenter.md", "model": "haiku", "priority": "BASSA"},
    "analyze": {"agent": "core/analyzer.md", "model": "sonnet", "priority": "MEDIA"},
    "code": {"agent": "core/coder.md", "model": "sonnet", "priority": "MEDIA"},
    "implement": {"agent": "core/coder.md", "model": "sonnet", "priority": "MEDIA"},
    "review": {"agent": "core/reviewer.md", "model": "sonnet", "priority": "MEDIA"}
  },
  "repetitive_keywords": [
    "format", "lint", "validate", "check", "verify", "build", "compile",
    "copy", "move", "rename", "log", "report", "export", "import", "sync"
  ],
  "complex_keywords": [
    "architect", "design", "refactor", "optimize", "security", "migration",
    "integration", "strategy", "analysis", "performance", "scalability",
    "distributed", "concurrent", "async", "investigate", "research"
  ]
}
```

---

## Protocol Specification

### Request Format

```typescript
interface OrchestrationRequest {
  request: string;
  parallel?: number;
  model?: 'auto' | 'haiku' | 'sonnet' | 'opus';
  session_id?: string;
}
```

### Response Format

```typescript
interface OrchestrationResponse {
  session_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tasks: Task[];
  stats: ExecutionStats;
  errors?: string[];
}
```

### Event Protocol

```typescript
interface OrchestrationEvent {
  event_type:
    | 'taskAdded'
    | 'taskStarted'
    | 'taskCompleted'
    | 'taskFailed'
    | 'cleanContextPrepared';
  session_id: string;
  timestamp: number;
  data: any;
}
```

---

## Clean Context Protocol

### Prompt Template

```
/clear
You are {AGENT_NAME} expert.
Your expertise: {SPECIALIZATION}
Your task: {DESCRIPTION}
Focus: Deliver efficient, production-ready solution.
```

### Optimization Flags

- `clear_start`: Execute `/clear` before task
- `agent_expertise`: Include agent specialization
- `task_only`: Minimal context, focus on task
- `isolation`: Isolate from previous agent context
- `focus_mode`: Remove verbosity

---

## Routing Configuration

```json
{
  "routing_config": {
    "fallback_agent": "coder",
    "fallback_model": "haiku",
    "max_parallel_agents": 20,
    "escalation_enabled": true,
    "escalation_pattern": ["haiku", "sonnet", "opus"],
    "auto_documentation": true,
    "documenter_agent": "documenter"
  }
}
```

---

**Version**: 4.1.0-EMPEROR
**Protocol**: 1.0
**Last Updated**: 2026-02-01
