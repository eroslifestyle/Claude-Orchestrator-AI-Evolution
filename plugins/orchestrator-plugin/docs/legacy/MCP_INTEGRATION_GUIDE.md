# Orchestrator Plugin - MCP Integration Guide

## 🎯 What Was Done

Your Orchestrator Plugin now has **MCP (Model Context Protocol) server integration** that works **exactly like Serena**:

| Feature | Serena (Reference) | Orchestrator (NOW) |
|---------|-------------------|-------------------|
| Activation Type | MCP Server (Always On) | MCP Server (Always On) |
| Configuration File | `.mcp.json` | `.mcp.json` ✅ |
| Installation Method | `uvx` from GitHub | `uvx` from GitHub ✅ |
| Tools Available | Always available | Always available ✅ |
| Auto-Start | Yes | Yes ✅ |

## 📁 Files Created

```
orchestrator-plugin/
├── .mcp.json                           ← MCP configuration (NEW)
├── mcp_server/
│   ├── server.py                       ← MCP server implementation (NEW)
│   ├── pyproject.toml                  ← Python package config (NEW)
│   ├── README.md                       ← MCP server docs (NEW)
│   └── test_mcp_server.py              ← Test script (NEW)
└── .claude-plugin/
    └── plugin.json                     ← Updated with MCP info (MODIFIED)
```

## 🚀 How It Works

### 1. MCP Server Activation

When Claude Code starts, it reads `.mcp.json` and automatically starts the MCP server:

```json
{
  "orchestrator": {
    "command": "uvx",
    "args": ["--from", "git+https://github.com/LeoDg/orchestrator-mcp-server", "orchestrator-mcp"]
  }
}
```

This is **exactly** how Serena works!

### 2. Available MCP Tools

Once activated, these tools are **always available** in any Claude Code session:

| Tool | Description |
|------|-------------|
| `orchestrator_analyze` | Analyze request and generate execution plan |
| `orchestrator_execute` | Execute orchestration (generates Task tool calls) |
| `orchestrator_status` | Get session status |
| `orchestrator_agents` | List available expert agents |
| `orchestrator_list` | List recent sessions |
| `orchestrator_preview` | Preview detailed breakdown |
| `orchestrator_cancel` | Cancel active session |

### 3. MCP Resources

- `orchestrator://sessions` - All sessions data
- `orchestrator://agents` - Available agents
- `orchestrator://config` - Server configuration

## 📋 Deployment Steps

### Step 1: Create GitHub Repository

```bash
cd mcp_server
git init
git add .
git commit -m "Initial MCP server for Orchestrator Plugin"

# Create repo on GitHub first, then:
git remote add origin https://github.com/LeoDg/orchestrator-mcp-server.git
git push -u origin main
```

### Step 2: Test Local Installation

```bash
# Test the MCP server works
uvx --from git+https://github.com/LeoDg/orchestrator-mcp-server orchestrator-mcp

# Or test directly with Python
cd mcp_server
python test_mcp_server.py
```

### Step 3: Verify in Claude Code

1. Restart Claude Code
2. The MCP tools should be automatically available
3. Test with: `Can you use orchestrator_analyze to check "implement a GUI with PyQt5"?`

## 🔧 Configuration Options

The `.mcp.json` supports these options:

```json
{
  "orchestrator": {
    "command": "uvx",
    "args": [
      "--from",
      "git+https://github.com/YOUR_USERNAME/orchestrator-mcp-server",
      "orchestrator-mcp"
    ],
    "env": {
      "ORCHESTRATOR_LOG_LEVEL": "INFO",
      "ORCHESTRATOR_AUTO_ACTIVATE": "true"
    }
  }
}
```

## 📊 Comparison: Before vs After

### Before (Hook Only)
```
User Request → Hook → Intercept → Manual orchestration
```
- ❌ Hook might not trigger
- ❌ Limited to prompt interception
- ❌ No direct tool access

### After (MCP Server)
```
Claude → MCP Tools (Always Available) → Orchestration
```
- ✅ Tools always available
- ✅ Can be called explicitly
- ✅ Works like Serena
- ✅ Full feature access

## 🎯 Usage Examples

### Example 1: Analyze a Request
```
Use orchestrator_analyze with request: "Implement a PyQt5 GUI with database for inventory management"
```

### Example 2: Execute Orchestration
```
Use orchestrator_execute with request: "Add JWT authentication to the API"
```

### Example 3: List Available Agents
```
Use orchestrator_agents to see all expert agents
```

## 🔍 Troubleshooting

### MCP tools not showing up?
1. Check `.mcp.json` syntax
2. Verify GitHub repo is public
3. Restart Claude Code
4. Check Claude Code logs

### Server fails to start?
1. Test locally: `python mcp_server/test_mcp_server.py`
2. Check Python version: `python --version` (need 3.10+)
3. Install dependencies: `pip install mcp`

### UVX command fails?
1. Install uvx: `pip install uv`
2. Or use pip install method instead

## 📝 Summary

Your Orchestrator Plugin now:
- ✅ Has MCP server that activates **automatically** like Serena
- ✅ Provides tools **always available** in every session
- ✅ Uses same deployment model (`uvx` from GitHub)
- ✅ Maintains all existing functionality (hooks still work)

The plugin is now **MCP-first** while keeping backward compatibility!
