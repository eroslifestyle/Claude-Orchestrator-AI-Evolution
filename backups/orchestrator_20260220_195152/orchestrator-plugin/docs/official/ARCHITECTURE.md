# Architecture - Orchestrator Plugin v4.1 EMPEROR

**System Architecture and Integration Points**

---

## Overview

The Orchestrator Plugin v4.1 EMPEROR is a sophisticated multi-agent orchestration system built on top of Claude Code. It provides intelligent task distribution, parallel execution, and smart resource allocation through a clean, modular architecture.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code Environment                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Orchestrator Plugin v4.1 EMPEROR             │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │   Orchestr- │  │  Agent       │  │  Clean Context  │  │  │
│  │  │  ator V4    │  │  Registry    │  │  Manager        │  │  │
│  │  │  (Engine)   │  │  (21 Agents) │  │  (Optimization) │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘  │  │
│  │         │                │                   │            │  │
│  │  ┌──────▼────────────────▼───────────────────▼────────┐  │  │
│  │  │              Task Execution Engine                   │  │  │
│  │  │  - Priority Queue  - Dependency Graph  - Events     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                       │
│  ┌────────────────────────▼────────────────────────────────┐  │
│  │                 MCP Server Layer                         │  │
│  │  - orchestrator_agents  - orchestrator_execute          │  │
│  │  - orchestrator_analyze - orchestrator_status           │  │
│  └────────────────────────┬────────────────────────────────┘  │
└───────────────────────────┼───────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Claude API    │
                    │  (Haiku/Sonnet/│
                    │   Opus)        │
                    └────────────────┘
```

---

## Component Diagram

### Core Components

```
┌──────────────────────────────────────────────────────────────┐
│                        OrchestratorV4                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Configuration                         │ │
│  │  - maxConcurrent, maxDepth, maxTasks                    │ │
│  │  - enableSmartModelSelection, enableCleanContext        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     Task Manager                         │ │
│  │  - addTask(), addTasks()                                │ │
│  │  - Task Queue (Priority-based)                          │ │
│  │  - Dependency Graph                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Execution Engine                        │ │
│  │  - execute(), stop(), reset()                           │ │
│  │  - Parallel Task Runner                                 │ │
│  │  - Event Emitter                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Smart Analysis                        │ │
│  │  - analyzeTask()                                        │ │
│  │  - Keyword Matching                                     │ │
│  │  - Model Selection                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Supporting Components

```
┌────────────────────────┐  ┌────────────────────────────────┐
│   Agent Registry        │  │   Clean Context Manager        │
│  - 21 Agents            │  │  - Context Wrapping            │
│  - Keyword Mappings     │  │  - Token Optimization          │
│  - Model Assignments    │  │  - Agent Isolation             │
└──────────┬─────────────┘  └────────────┬───────────────────┘
           │                             │
           └──────────┬──────────────────┘
                      │
           ┌──────────▼──────────┐
           │  Task Executor      │
           │  - Agent Invocation │
           │  - Result Handling  │
           └─────────────────────┘
```

---

## Data Flow

### 1. Task Submission Flow

```
User Request
    │
    ▼
┌─────────────────────┐
│ TaskConfig          │
│ - description       │
│ - agentFile (opt)   │
│ - model (opt)       │
│ - priority (opt)    │
│ - dependsOn (opt)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Smart Analysis      │
│ - Keyword detection │
│ - Agent selection   │
│ - Model selection   │
│ - Priority assignment│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Task Creation       │
│ - ID generation     │
│ - Dependency check  │
│ - Queue placement   │
└──────────┬──────────┘
           │
           ▼
Task Queue (Priority-based)
```

### 2. Execution Flow

```
Task Queue
    │
    ▼
┌─────────────────────┐
│ Ready Tasks         │
│ (Dependencies met)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Priority Selection  │
│ (CRITICA → BASSA)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Slot Check          │
│ (maxConcurrent)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Clean Context Wrap  │
│ - /clear            │
│ - Agent expertise   │
│ - Task description  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Agent Invocation    │
│ - Model selection   │
│ - Prompt delivery   │
│ - Result capture    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Dependency Unlock   │
│ - Update blockedBy  │
│ - Move to ready     │
└──────────┬──────────┘
           │
           ▼
Event Emission (taskCompleted)
```

### 3. Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Event Emitter                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │taskAdded │  │taskStart │  │taskCompl │  │taskFailed│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       └─────────────┴─────────────┴─────────────┘          │
│                             │                               │
│                      ┌──────▼──────┐                       │
│                      │  Listeners   │                       │
│                      │  - UI        │                       │
│                      │  - Logging   │                       │
│                      │  - Stats     │                       │
│                      └─────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Claude Code Integration

```typescript
// Plugin Entry Point
export const plugin = {
  name: 'orchestrator-plugin',
  version: '4.1.0-EMPEROR',

  // MCP Tools
  tools: [
    'orchestrator_agents',
    'orchestrator_analyze',
    'orchestrator_execute',
    'orchestrator_preview',
    'orchestrator_status',
    'orchestrator_cancel',
    'orchestrator_list'
  ],

  // Hooks
  hooks: {
    onTaskRequest: 'auto-orchestrate'
  }
};
```

### 2. MCP Server Integration

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Tool: orchestrator_execute                        │  │
│  │  Input: request, parallel, model                  │  │
│  │  Output: session_id, results                       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Tool: orchestrator_analyze                        │  │
│  │  Input: request, show_table                        │  │
│  │  Output: execution plan                            │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Tool: orchestrator_agents                         │  │
│  │  Input: filter                                     │  │
│  │  Output: agent list                                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3. Agent Registry Integration

```
Agent Registry (config/agent-registry.json)
    │
    ├─ Core Agents (6)
    │  ├─ orchestrator
    │  ├─ system_coordinator
    │  ├─ analyzer
    │  ├─ coder
    │  ├─ reviewer
    │  └─ documenter
    │
    └─ Expert Agents (15)
       ├─ gui-super-expert
       ├─ database_expert
       ├─ security_unified_expert
       ├─ trading_strategy_expert
       ├─ mql_expert
       ├─ tester_expert
       ├─ architect_expert
       ├─ integration_expert
       ├─ devops_expert
       ├─ languages_expert
       ├─ ai_integration_expert
       ├─ claude_systems_expert
       ├─ mobile_expert
       ├─ n8n_expert
       └─ social_identity_expert
```

### 4. Configuration Integration

```
Configuration Sources (Priority Order)
    │
    ├─ 1. Code Configuration (constructor)
    │   └─ OrchestratorV4({ maxConcurrent: 20 })
    │
    ├─ 2. Environment Variables
    │   └─ ORCHESTRATOR_MAX_CONCURRENT=20
    │
    └─ 3. Config File
        └─ config/orchestrator-config.json
```

---

## Clean Context Architecture

### Context Optimization Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                  Clean Context Manager                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Input: Task + Agent                               │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Step 1: Clear Context                            │  │
│  │  - Execute /clear                                 │  │
│  │  - Remove previous conversation                    │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Step 2: Expertise Injection                       │  │
│  │  - Add agent specialization                        │  │
│  │  - Include domain knowledge                        │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Step 3: Task Focus                                │  │
│  │  - Strip unnecessary context                       │  │
│  │  - Focus on current task only                      │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Output: Optimized Prompt                          │  │
│  │  /clear                                            │  │
│  │  You are [AGENT] expert.                           │  │
│  │  Your task: [DESCRIPTION]                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Token Savings

```
Without Clean Context:
┌──────────────────────────────────────┐
│ Previous Conversation: 10,000 tokens │
│ Context Overhead: 5,000 tokens       │
│ Task Description: 500 tokens         │
│ TOTAL: 15,500 tokens                 │
└──────────────────────────────────────┘

With Clean Context:
┌──────────────────────────────────────┐
│ /clear: 0 tokens                     │
│ Agent Expertise: 200 tokens          │
│ Task Description: 500 tokens         │
│ TOTAL: 700 tokens                    │
└──────────────────────────────────────┘

SAVINGS: 14,800 tokens (95.5% reduction)
```

---

## Smart Model Selection Architecture

### Decision Tree

```
┌─────────────────────────────────────────────────────────┐
│               Smart Model Selection                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Task Analysis                                     │  │
│  │  - Keywords                                        │  │
│  │  - Complexity                                      │  │
│  │  - Repetitiveness                                  │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│    ┌────────────────┼────────────────┐                 │
│    │                │                │                 │
│    ▼                ▼                ▼                 │
│ ┌─────┐        ┌─────┐         ┌─────┐                │
│ │Haiku│        │Sonnet│        │Opus │                │
│ └──┬──┘        └──┬──┘         └──┬──┘                │
│    │              │               │                    │
│    │              │               │                    │
│  Repetitive      Standard        Complex              │
│  Tasks           Tasks          Tasks                 │
│  - format        - coding        - architecture        │
│  - lint          - debug         - security            │
│  - validate      - test          - refactoring         │
│  - build         - implement     - migration           │
│                  - review                               │
└─────────────────────────────────────────────────────────┘
```

### Model Distribution Optimization

```
Cost-Optimal Distribution:
┌─────────────────────────────────────────┐
│ Haiku (30%):    $0.25/M tokens          │
│ Sonnet (60%):   $3.00/M tokens          │
│ Opus (10%):     $15.00/M tokens         │
│                                          │
│ Average Cost:   $2.33/M tokens          │
│ vs All Sonnet:  $3.00/M tokens (-22%)   │
│ vs All Opus:    $15.00/M tokens (-84%)  │
└─────────────────────────────────────────┘
```

---

## Parallel Execution Architecture

### Concurrency Model

```
┌─────────────────────────────────────────────────────────┐
│                 Parallel Execution Engine                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Task Queue (Priority-Ordered)                     │  │
│  │  [CRITICA] → [ALTA] → [MEDIA] → [BASSA]           │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Slot Manager (maxConcurrent)                      │  │
│  │  Available: 12/12 slots                            │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Active Tasks (Running in Parallel)                │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  │
│  │  │ T1 │ │ T2 │ │ T3 │ │ T4 │ │ T5 │ │ T6 │ ...  │  │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘       │  │
│  └───────────────────────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Completion Handler                                │  │
│  │  - Result collection                               │  │
│  │  - Dependency unlock                               │  │
│  │  - Next task dispatch                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Dependency Graph

```
T1 (Schema Design)
    │
    ├─ T2 (API Endpoints)
    │       │
    │       ├─ T3 (Tests)
    │       └─ T4 (Docs)
    │
    └─ T5 (Migration)
            │
            └─ T6 (Deployment)

Execution Order: T1 → (T2, T5) → (T3, T4, T6)
Parallel Groups: [{T1}, {T2, T5}, {T3, T4, T6}]
```

---

## Error Handling Architecture

### Resilience Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Error Handling System                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Layer 1: Task Level                               │  │
│  │  - Timeout detection                               │  │
│  │  - Retry logic                                     │  │
│  │  - Error capture                                   │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Layer 2: Agent Level                              │  │
│  │  - Agent fallback                                  │  │
│  │  - Model escalation (Haiku → Sonnet → Opus)       │  │
│  │  - Context recovery                                │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Layer 3: Orchestrator Level                       │  │
│  │  - Session recovery                                │  │
│  │  - State checkpointing                             │  │
│  │  - Graceful degradation                            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Performance Architecture

### Optimization Strategies

```
┌─────────────────────────────────────────────────────────┐
│              Performance Optimization Layer              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Caching Layer                                     │  │
│  │  - Agent cache (per-session)                       │  │
│  │  - Analysis cache (task patterns)                  │  │
│  │  - Model selection cache                           │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Lazy Loading                                      │  │
│  │  - Agents loaded on-demand                         │  │
│  │  - Deferred initialization                         │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Parallel Execution                                │  │
│  │  - Up to 128 concurrent agents                     │  │
│  │  - Priority-based scheduling                       │  │
│  │  - Smart load balancing                            │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Token Optimization                                │  │
│  │  - Clean Context (30-50% reduction)                │  │
│  │  - Smart model selection                           │  │
│  │  - Context caching                                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Security Architecture                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Input Validation                                  │  │
│  │  - Task description sanitization                   │  │
│  │  - Agent file path validation                      │  │
│  │  - Configuration bounds checking                   │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Agent Isolation                                   │  │
│  │  - Clean Context isolation                        │  │
│  │  - No cross-agent context leakage                 │  │
│  │  - Memory sandboxing                               │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Resource Limits                                   │  │
│  │  - maxTasks: 500                                   │  │
│  │  - maxDepth: 10                                    │  │
│  │  - taskTimeout: 300000ms                           │  │
│  │  - maxConcurrent: 128                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Extension Points

### Custom Agent Integration

```typescript
interface CustomAgent {
  name: string;
  file: string;
  role: string;
  specialization: string;
  keywords: string[];
  defaultModel: ModelType;
  version: string;
}

// Register custom agent
orchestrator.registerAgent({
  name: 'my-custom-agent',
  file: 'custom/my-agent.md',
  role: 'Custom specialist',
  specialization: 'My domain',
  keywords: ['custom', 'domain'],
  defaultModel: 'sonnet',
  version: '1.0'
});
```

### Custom Model Selection

```typescript
interface ModelSelector {
  (task: TaskConfig): ModelType;
}

// Register custom selector
orchestrator.registerModelSelector((task) => {
  if (task.description.includes('complex')) {
    return 'opus';
  }
  return 'sonnet';
});
```

---

## Monitoring & Observability

### Metrics Collected

```
┌─────────────────────────────────────────────────────────┐
│                 Observability Layer                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Execution Metrics                                 │  │
│  │  - Total tasks                                     │  │
│  │  - Completed/Failed/Pending                        │  │
│  │  - Average duration                                │  │
│  │  - Parallelism achieved                            │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Model Metrics                                     │  │
│  │  - Haiku/Sonnet/Opus distribution                  │  │
│  │  - Cost per task                                   │  │
│  │  - Token usage                                     │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Clean Context Metrics                             │  │
│  │  - Tokens saved                                    │  │
│  │  - Context efficiency                              │  │
│  │  - Optimization factors                            │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Agent Metrics                                     │  │
│  │  - Agent usage frequency                           │  │
│  │  - Agent success rate                              │  │
│  │  - Fallback rate                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Technology Stack                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Core                                              │  │
│  │  - TypeScript 5.2+                                │  │
│  │  - Node.js 18+                                    │  │
│  │  - EventEmitter                                   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Integration                                       │  │
│  │  - MCP (Model Context Protocol)                   │  │
│  │  - Claude Code API                                │  │
│  │  - Anthropic SDK                                  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Configuration                                     │  │
│  │  - JSON configuration files                       │  │
│  │  - Environment variables                          │  │
│  │  - Agent registry (JSON)                          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Development                                       │  │
│  │  - Jest (testing)                                  │  │
│  │  - ESLint (linting)                               │  │
│  │  - Prettier (formatting)                          │  │
│  │  - TypeScript (type checking)                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

```
orchestrator-plugin/
├── src/
│   ├── orchestrator-v4-unified.ts    # Main orchestrator engine
│   ├── clean-context.ts              # Clean context manager
│   ├── types.ts                      # Type definitions
│   ├── mcp-server.ts                 # MCP server implementation
│   └── agents/                       # Agent definitions
│       ├── core/                     # Core agents (6)
│       └── experts/                  # Expert agents (15)
├── config/
│   ├── orchestrator-config.json      # Main configuration
│   ├── agent-registry.json           # Agent registry
│   └── keyword-mappings.json         # Keyword routing
├── docs/
│   └── official/                     # Official documentation
│       ├── README_OFFICIAL.md
│       ├── AI_REFERENCE.md
│       ├── CHANGELOG.md
│       └── ARCHITECTURE.md
├── package.json
├── tsconfig.json
└── plugin-manifest.json
```

---

**Version**: 4.1.0-EMPEROR
**Last Updated**: 2026-02-01
**Architecture**: Unified Engine with Clean Context
