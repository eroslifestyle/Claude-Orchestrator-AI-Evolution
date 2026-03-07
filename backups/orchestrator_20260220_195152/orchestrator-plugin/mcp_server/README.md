# Orchestrator MCP Server

Model Context Protocol (MCP) server for Claude Code Orchestrator Plugin.

## Features

- **ALWAYS ON**: Auto-activates like Serena MCP
- **Multi-Agent Orchestration**: Coordinate up to 64 parallel agents
- **Intelligent Routing**: Automatic expert agent selection
- **Cost Prediction**: ML-based cost estimation
- **Hierarchical Execution**: 3-level parallel task execution

## Installation

The MCP server is automatically installed via Claude Code's MCP system.

### Manual Installation

```bash
pip install orchestrator-mcp-server
```

Or via uvx (recommended):

```bash
uvx --from git+https://github.com/LeoDg/orchestrator-mcp-server orchestrator-mcp
```

## MCP Tools

### `orchestrator_analyze`
Analyze a request and generate execution plan without executing.

**Parameters:**
- `request` (string, required): The user request to analyze
- `show_table` (boolean, optional): Show execution plan table (default: true)

### `orchestrator_execute`
Execute orchestration plan (generates plan for Task tool execution).

**Parameters:**
- `request` (string, required): The user request to orchestrate
- `parallel` (number, optional): Max parallel agents 1-64 (default: 6)
- `model` (string, optional): Force specific model (auto/haiku/sonnet/opus)

### `orchestrator_status`
Get status of an orchestration session.

**Parameters:**
- `session_id` (string, optional): Session ID to check (empty for latest)

### `orchestrator_agents`
List all available expert agents.

**Parameters:**
- `filter` (string, optional): Filter by domain or keyword

### `orchestrator_list`
List recent orchestration sessions.

**Parameters:**
- `limit` (number, optional): Max sessions to return (default: 10)

### `orchestrator_preview`
Preview orchestration with detailed task breakdown.

**Parameters:**
- `request` (string, required): Request to preview

### `orchestrator_cancel`
Cancel an active orchestration session.

**Parameters:**
- `session_id` (string, required): Session ID to cancel

## MCP Resources

- `orchestrator://sessions` - All orchestration sessions
- `orchestrator://agents` - Available expert agents
- `orchestrator://config` - Server configuration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Claude Code                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │              Orchestrator MCP Server              │ │
│  │                                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │ │
│  │  │   Analyzer  │  │    Router   │  │ Executor  │ │ │
│  │  └─────────────┘  └─────────────┘  └───────────┘ │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │         Expert Agents Registry               │ │ │
│  │  │  GUI | DB | Security | API | MQL | ...      │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## License

MIT License - See LICENSE file for details.
