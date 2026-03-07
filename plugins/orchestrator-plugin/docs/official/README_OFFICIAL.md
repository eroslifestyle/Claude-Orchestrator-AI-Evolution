# Orchestrator Plugin v2.1 ALWAYS-ON

**Intelligent Multi-Agent Orchestration for Claude Code**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Claude Code](https://img.shields.io/badge/Claude_Code-%3E%3D2.0.0-purple)](https://claude.ai/code)
[![Version](https://img.shields.io/badge/version-2.1.0--ALWAYS--ON-red)](https://github.com/example/orchestrator-plugin)

---

## Overview

The Orchestrator Plugin is a sophisticated multi-agent orchestration system for Claude Code that enables intelligent task distribution, parallel execution, and smart model selection. It automatically analyzes requests, delegates them to specialized agents, and executes tasks with optimal resource allocation.

### Key Capabilities

- **Smart Model Selection**: Automatically chooses the right Claude model (Haiku/Sonnet/Opus) for each task
- **23 Specialized Agents**: From core operations to domain-specific experts (GUI, Security, Trading, AI, etc.)
- **Parallel Execution**: Run up to 128 agents concurrently with intelligent load balancing
- **Clean Context Technology**: Each agent starts with optimized context for maximum efficiency
- **Auto-Documentation**: REGOLA #5 enforcement with automatic documentation generation
- **Resilience & Recovery**: Built-in fallback systems and error recovery

---

## Features Matrix

| Feature | Status | Description |
|---------|--------|-------------|
| **Smart Model Selection** | ✅ Stable | Automatic Haiku/Sonnet/Opus selection based on task complexity |
| **Agent Discovery** | ✅ Stable | Automatic agent routing based on keywords and patterns |
| **Parallel Execution** | ✅ Stable | Up to 128 concurrent agents with priority queue |
| **Clean Context** | ✅ Stable | Each agent starts with `/clear` for maximum efficiency |
| **Auto-Documentation** | ✅ Stable | REGOLA #5 enforcement with documenter agent |
| **Dependency Management** | ✅ Stable | Task dependencies with automatic unlock |
| **Streaming Results** | ✅ Stable | Real-time progress updates and event emission |
| **Fallback System** | ✅ Stable | Automatic fallback to default agent on missing specialist |
| **Simulation Mode** | ✅ Stable | Safe testing without real agent execution |
| **Session Reporting** | ✅ Stable | Comprehensive execution reports with recommendations |

---

## Quick Start

### 3 Simple Steps

#### 1. Install the Plugin

```bash
cd c:\Users\LeoDg\.claude\plugins\orchestrator-plugin
npm install
npm run build
```

#### 2. Configure (Optional)

Edit `config/orchestrator-config.json`:

```json
{
  "maxConcurrent": 12,
  "enableSmartModelSelection": true,
  "enableCleanContext": true,
  "enableAutoDocumentation": true
}
```

#### 3. Use in Claude Code

```typescript
import { orchestrator, TaskConfig } from 'orchestrator-plugin';

// Define tasks
const tasks: TaskConfig[] = [
  { description: "Create PyQt5 GUI for dashboard" },
  { description: "Implement JWT authentication" },
  { description: "Write unit tests for API" }
];

// Execute orchestration
const stats = await orchestrator.addTasks(tasks);
await orchestrator.execute();

console.log(stats);
```

---

## Installation Guide

### Prerequisites

- **Node.js**: >= 18.0.0
- **Claude Code**: >= 2.0.0
- **npm**: >= 8.0.0

### Standard Installation

```bash
# Clone or navigate to plugin directory
cd c:\Users\LeoDg\.claude\plugins\orchestrator-plugin

# Install dependencies
npm install

# Build the plugin
npm run build

# Validate installation
npm run validate-plugin
```

### Development Installation

```bash
# Install with dev dependencies
npm install

# Enable watch mode for development
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

### CLI Installation

```bash
# Package the plugin
npm run package

# Install via CLI
npm run install-plugin
```

---

## Usage Examples

### Basic Task Execution

```typescript
import { runOrchestration, TaskConfig } from 'orchestrator-plugin';

const tasks: TaskConfig[] = [
  {
    description: "Implement user registration feature",
    priority: "ALTA"
  },
  {
    description: "Create database schema for users",
    agentFile: "experts/database_expert.md",
    model: "sonnet"
  }
];

const stats = await runOrchestration(tasks);
console.log(`Completed: ${stats.completed}/${stats.totalTasks}`);
```

### Advanced Orchestration with Dependencies

```typescript
import { OrchestratorV4, TaskConfig } from 'orchestrator-plugin';

const orch = new OrchestratorV4({
  maxConcurrent: 20,
  enableCleanContext: true,
  enableSmartModelSelection: true
});

// Add dependent tasks
const schemaId = orch.addTask({
  description: "Design database schema",
  model: "opus"
});

const apiId = orch.addTask({
  description: "Implement REST API endpoints",
  dependsOn: [schemaId],
  model: "sonnet"
});

const testId = orch.addTask({
  description: "Write integration tests",
  dependsOn: [apiId],
  model: "haiku"
});

// Execute with automatic dependency resolution
await orch.execute();
```

### Streaming Results

```typescript
const orch = new OrchestratorV4({ enableStreaming: true });

orch.on('taskStarted', ({ taskId }) => {
  console.log(`Task ${taskId} started`);
});

orch.on('taskCompleted', ({ taskId, duration }) => {
  console.log(`Task ${taskId} completed in ${duration}ms`);
});

orch.on('cleanContextPrepared', ({ taskId, contextSize }) => {
  console.log(`Task ${taskId} - Context optimized to ${contextSize} tokens`);
});

await orch.execute();
```

### Clean Context Mode

```typescript
const orch = new OrchestratorV4({
  enableCleanContext: true,
  cleanBeforeTask: true,    // Clear context before each task
  isolateAgents: true,       // Isolate context between agents
  focusMode: true           // Remove verbosity
});

// Each agent will start with optimized prompt:
// "/clear\nYou are [AGENT_NAME] expert.\nYour task: [DESCRIPTION]"
```

---

## API Reference

### Core Classes

#### `OrchestratorV4`

Main orchestration engine.

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `constructor()` | `config?: Partial<OrchestratorConfig>` | `OrchestratorV4` | Create new orchestrator instance |
| `addTask()` | `config: TaskConfig` | `string` | Add single task, returns task ID |
| `addTasks()` | `configs: TaskConfig[]` | `string[]` | Add multiple tasks |
| `execute()` | - | `Promise<ExecutionStats>` | Execute all tasks |
| `stop()` | - | `void` | Stop execution |
| `reset()` | - | `void` | Reset orchestrator state |
| `getStats()` | - | `ExecutionStats` | Get current statistics |
| `getSessionReport()` | - | `SessionReport` | Get full session report |
| `getTask()` | `id: string` | `Task \| undefined` | Get task by ID |
| `getTasks()` | - | `Task[]` | Get all tasks |
| `getConfig()` | - | `OrchestratorConfig` | Get current config |
| `updateConfig()` | `updates: Partial<OrchestratorConfig>` | `void` | Update config |

#### `TaskConfig`

Configuration for a single task.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `description` | `string` | Yes | - | Task description |
| `agentFile` | `string` | No | Auto-detected | Agent file path |
| `model` | `'haiku' \| 'sonnet' \| 'opus'` | No | Auto-selected | Claude model to use |
| `priority` | `'CRITICA' \| 'ALTA' \| 'MEDIA' \| 'BASSA'` | No | Auto-detected | Task priority |
| `dependsOn` | `string[]` | No | `[]` | Task IDs this task depends on |
| `timeout` | `number` | No | `300000` | Task timeout in ms |
| `retries` | `number` | No | `0` | Number of retries |
| `metadata` | `Record<string, any>` | No | `{}` | Custom metadata |

#### `OrchestratorConfig`

Orchestrator configuration.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxConcurrent` | `number` | `12` | Maximum concurrent tasks |
| `maxDepth` | `number` | `10` | Maximum task depth |
| `maxTasks` | `number` | `500` | Maximum total tasks |
| `taskTimeout` | `number` | `300000` | Default task timeout (ms) |
| `enableSmartModelSelection` | `boolean` | `true` | Enable smart model selection |
| `enableAgentDiscovery` | `boolean` | `true` | Enable agent discovery |
| `enableAutoDocumentation` | `boolean` | `true` | Enable auto-documentation |
| `enableDashboard` | `boolean` | `true` | Enable dashboard output |
| `enableStreaming` | `boolean` | `true` | Enable streaming results |
| `enableCleanContext` | `boolean` | `true` | Enable clean context mode |
| `cleanBeforeTask` | `boolean` | `true` | Clear before each task |
| `cleanAfterTask` | `boolean` | `false` | Clear after each task |
| `isolateAgents` | `boolean` | `true` | Isolate agent contexts |
| `focusMode` | `boolean` | `true` | Remove verbosity |
| `autoFallbackOnMissing` | `boolean` | `true` | Auto-fallback to default |
| `defaultFallbackAgent` | `string` | `'core/coder.md'` | Default fallback agent |
| `simulateExecution` | `boolean` | `true` | Simulate execution (safe mode) |
| `simulationDelay` | `{min, max}` | `{50, 200}` | Simulation delay range |

#### `ExecutionStats`

Execution statistics.

| Property | Type | Description |
|----------|------|-------------|
| `totalTasks` | `number` | Total number of tasks |
| `completed` | `number` | Completed tasks |
| `failed` | `number` | Failed tasks |
| `running` | `number` | Currently running |
| `pending` | `number` | Pending tasks |
| `progress` | `number` | Progress percentage (0-100) |
| `elapsedMs` | `number` | Elapsed time in ms |
| `avgTaskDuration` | `number` | Average task duration |
| `parallelism` | `number` | Current parallelism |
| `maxParallelism` | `number` | Maximum parallelism reached |
| `modelDistribution` | `Record<ModelType, number>` | Tasks per model |
| `cleanContext` | `CleanContextStats` | Clean context statistics |

### Events

The orchestrator emits the following events:

| Event | Data | Description |
|-------|------|-------------|
| `taskAdded` | `{taskId, task}` | Task added to queue |
| `taskStarted` | `{taskId}` | Task started execution |
| `taskCompleted` | `{taskId, duration, unlockedCount}` | Task completed |
| `taskFailed` | `{taskId, error}` | Task failed |
| `cleanContextPrepared` | `{taskId, clearCommand, contextSize, optimizations}` | Clean context prepared |

### Convenience Functions

#### `runOrchestration()`

```typescript
async function runOrchestration(
  tasks: TaskConfig[],
  config?: Partial<OrchestratorConfig>
): Promise<ExecutionStats>
```

Quick execution with automatic setup.

#### `analyzeRequest()`

```typescript
function analyzeRequest(
  description: string
): {agent: string, model: ModelType, priority: PriorityLevel}
```

Analyze a request to determine optimal agent and model.

---

## Agent Registry

The plugin includes 23 specialized agents:

### Core Agents (6)

| Agent | Role | Default Model | Specialization |
|-------|------|---------------|----------------|
| **orchestrator** | Central coordination | Sonnet | Multi-agent orchestration, parallelism |
| **system_coordinator** | Resource management | Haiku | Token tracking, agent monitoring |
| **analyzer** | Code exploration | Haiku | Codebase analysis, search |
| **coder** | General implementation | Sonnet | Coding, bug fixing |
| **reviewer** | Quality assurance | Sonnet | Code review, standards |
| **documenter** | Documentation | Haiku | Technical writing, REGOLA #5 |

### Expert Agents (17)

| Agent | Role | Default Model | Specialization |
|-------|------|---------------|----------------|
| **gui-super-expert** | UI/UX specialist | Sonnet | PyQt5, Qt, Design Systems |
| **database_expert** | Database specialist | Sonnet | SQL, Optimization, Queries |
| **db-schema-designer** | Database schema | Sonnet | Schema design, Database modeling |
| **api-design-specialist** | API design | Sonnet | REST API, API architecture |
| **security_unified_expert** | Security specialist | Opus | AppSec, IAM, Cyber Defense |
| **trading_strategy_expert** | Trading strategy | Sonnet | Risk management, Prop firms |
| **mql_expert** | MQL4/MQL5 specialist | Sonnet | MetaTrader, Expert Advisors |
| **tester_expert** | QA specialist | Sonnet | Testing, Debug, Performance |
| **architect_expert** | Architecture specialist | Opus | System design, patterns |
| **integration_expert** | API integration | Sonnet | REST, Telegram, cTrader |
| **devops_expert** | DevOps specialist | Haiku | CI/CD, Docker, Kubernetes |
| **languages_expert** | Multi-language | Sonnet | Python, JS, C#, idioms |
| **ai_integration_expert** | AI integration | Sonnet | LLM, RAG, Prompt engineering |
| **claude_systems_expert** | Claude ecosystem | Sonnet | Cost optimization, patterns |
| **mobile_expert** | Mobile development | Sonnet | iOS, Android, Flutter |
| **n8n_expert** | Workflow automation | Sonnet | N8N, Low-code integration |
| **social_identity_expert** | OAuth specialist | Sonnet | OAuth2, OIDC, Social login |

---

## Configuration

### Environment Variables

```bash
# Claude API Configuration
ANTHROPIC_API_KEY=your_api_key
CLAUDE_MODEL=claude-opus-4-5-20251101

# Orchestrator Configuration
ORCHESTRATOR_MAX_CONCURRENT=12
ORCHESTRATOR_ENABLE_CLEAN_CONTEXT=true
ORCHESTRATOR_SIMULATE_EXECUTION=true

# Logging
ORCHESTRATOR_LOG_LEVEL=info
ORCHESTRATOR_LOG_FILE=orchestrator.log
```

### Configuration Files

- `config/orchestrator-config.json` - Main configuration
- `config/agent-registry.json` - Agent registry
- `config/keyword-mappings.json` - Keyword routing rules

---

## Troubleshooting

### Common Issues

#### Issue: Tasks not executing

**Solution**: Check `simulateExecution` setting. Set to `false` for real execution:

```typescript
const orch = new OrchestratorV4({ simulateExecution: false });
```

#### Issue: Agent not found

**Solution**: Enable auto-fallback:

```typescript
const orch = new OrchestratorV4({
  autoFallbackOnMissing: true,
  defaultFallbackAgent: 'core/coder.md'
});
```

#### Issue: High token usage

**Solution**: Enable Clean Context mode:

```typescript
const orch = new OrchestratorV4({
  enableCleanContext: true,
  cleanBeforeTask: true,
  focusMode: true
});
```

### Debug Mode

```typescript
const orch = new OrchestratorV4({
  enableStreaming: true,
  enableDashboard: true
});

// Log all events
orch.on('taskStarted', console.log);
orch.on('taskCompleted', console.log);
orch.on('taskFailed', console.log);
orch.on('cleanContextPrepared', console.log);
```

---

## Performance Tips

1. **Use Haiku for repetitive tasks**: Format, lint, validate, build
2. **Use Sonnet for most tasks**: General coding, debugging, testing
3. **Use Opus for complex tasks**: Architecture, security, refactoring
4. **Enable Clean Context**: Reduces token usage by 30-50%
5. **Adjust parallelism**: Increase `maxConcurrent` for I/O-bound tasks
6. **Use dependencies**: For tasks that must run sequentially

---

## License

MIT License - see LICENSE file for details.

---

## Support

- **Documentation**: See `/docs/official/` directory
- **Issues**: Report via GitHub issues
- **Contributing**: See CONTRIBUTING.md

---

**Version**: 2.1.0-ALWAYS-ON
**Last Updated**: 2026-02-01
**Maintained By**: Development Team
