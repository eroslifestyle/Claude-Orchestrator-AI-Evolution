# CCA/CCG Dual System - Deployment Guide

> **Version:** 1.0.0 | **System Version:** V12.0.3 (Full Coherence)

---

## Overview

This directory contains deployment scripts for the **CCA/CCG Dual-Profile Claude Code System**, enabling seamless switching between:

| Profile | Provider | Model | Use Case |
|---------|----------|-------|----------|
| **CCA** | Anthropic | Claude Opus 4.6 | Production, complex tasks |
| **CCG** | Z.AI | GLM5 | Development, cost optimization |

### System Components

- **43 Agents** (6 core + 22 L1 + 15 L2)
- **26 Skills** (7 core + 8 workflow + 6 utility + 3 language + 2 learning)
- **10 Rules Files** (common, python, typescript, go)
- **1 MCP Server** (orchestrator via stdio/Python)

---

## Prerequisites

### Required
- **PowerShell 5.1+** (Windows) or **PowerShell Core 7+** (cross-platform)
- **Python 3.10+** (for MCP orchestrator)
- **Git 2.0+**
- **Claude Code CLI** (installed via `npm install -g @anthropic-ai/claude-code`)

### Optional
- **VSCode** (for profile integration)
- **GitHub CLI** (for repository operations)

### API Credentials

| Profile | Required Environment Variable | Format |
|---------|------------------------------|--------|
| CCA | `ANTHROPIC_API_KEY` | `sk-ant-...` |
| CCG | `ZAI_API_KEY` or `ANTHROPIC_AUTH_TOKEN` | `zai-...` |

---

## Quick Start

### 1. Export System (Source Machine)

```powershell
# Basic export to Desktop
.\export-dual-system.ps1

# Export to custom location
.\export-dual-system.ps1 -OutputPath "D:\Backups\claude-system.zip"

# Include log files (optional)
.\export-dual-system.ps1 -IncludeLogs
```

### 2. Install System (Target Machine)

```powershell
# Install with default CCA profile
.\install-dual-system.ps1 -ZipPath "C:\Downloads\claude-system.zip"

# Install with CCG profile
.\install-dual-system.ps1 -ZipPath ".\claude-system.zip" -Profile CCG

# Skip backup (fresh install)
.\install-dual-system.ps1 -ZipPath ".\system.zip" -SkipBackup

# Force install despite missing prerequisites
.\install-dual-system.ps1 -ZipPath ".\system.zip" -Force
```

### 3. Configure Environment

```powershell
# Interactive configuration
.\autoconfig.ps1

# Non-interactive with API key
.\autoconfig.ps1 -Profile cca -ApiKey "sk-ant-your-key-here"

# With GitHub token
.\autoconfig.ps1 -Profile ccg -ApiKey "zai-xxx" -GithubToken "ghp_xxx"

# Dry run (preview changes)
.\autoconfig.ps1 -Profile cca -DryRun
```

### 4. Switch Profiles

```powershell
# Interactive menu
.\switch-vscode.ps1

# Switch to specific profile
.\switch-vscode.ps1 -Profile ccg

# Non-interactive switch
.\switch-vscode.ps1 -Profile cca -NonInteractive

# Check current status
.\switch-vscode.ps1 -Profile status
```

---

## Script Documentation

### export-dual-system.ps1

Creates a portable ZIP archive of the dual-profile system.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-OutputPath` | string | Desktop | Custom destination path for ZIP |
| `-IncludeLogs` | switch | false | Include log files in export |

**Excluded Directories:**
- `projects/`, `backups/`, `cache/`, `logs/`
- `debug/`, `tmp/`, `todos/`, `stats-cache/`

**Excluded Files:**
- `.credentials.json`, `.env`, `*.jsonl`, `*.bak`, `*.log`

**Output:**
- `claude-dual-system-YYYYMMDD-HHMMSS.zip`
- Contains: `manifest.json`, `install-dual-system.ps1`, `README.md`

---

### install-dual-system.ps1

Installs the dual-profile system from a ZIP archive.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-ZipPath` | string | **required** | Path to source ZIP |
| `-Profile` | CCA/CCG | CCA | Profile to configure |
| `-SkipBackup` | switch | false | Skip backup creation |
| `-SkipDependencies` | switch | false | Skip pip install |
| `-Force` | switch | false | Install despite missing prerequisites |

**Installation Steps:**
1. Detect home directory
2. Validate ZIP file
3. Check prerequisites (Python, Git, Claude CLI)
4. Create backup of existing `~/.claude`
5. Extract ZIP to temp location
6. Create directory structure
7. Copy files to target
8. Verify integrity (manifest.json hashes)
9. Create symlinks
10. Install MCP dependencies
11. Set file permissions
12. Configure profile marker

---

### autoconfig.ps1

Auto-configures environment for CCA or CCG profile.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-Profile` | cca/ccg | cca | Profile to configure |
| `-ApiKey` | string | "" | API token to configure |
| `-GithubToken` | string | "" | GitHub PAT |
| `-Force` | switch | false | Overwrite existing |
| `-DryRun` | switch | false | Preview without changes |

**Actions:**
1. Detect OS and shell (Windows/Linux/macOS)
2. Create directory structure
3. Generate `.env` and `.env.template`
4. Update shell profile (PowerShell/Bash/Zsh)
5. Create `.gitignore`
6. Verify configuration

**Profile Configuration:**

| Profile | Env Prefix | Key Pattern |
|---------|------------|-------------|
| CCA | `ANTHROPIC` | `sk-ant-` |
| CCG | `ZAI` | `zai-` |

---

### switch-vscode.ps1

Switches between CCA and CCG profiles with VSCode integration.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-Profile` | cca/ccg/status | "" | Target profile or status check |
| `-Workspace` | string | current | VSCode workspace path |
| `-NonInteractive` | switch | false | Skip interactive menu |

**Features:**
- Profile switching with backup
- VSCode settings integration
- API connection validation
- Backup rotation (max 3 backups)

**VSCode Integration:**
Updates `.vscode/settings.json` with:
- Terminal environment variables
- Claude Code extension profile marker

---

## Environment Variables

### Required

```bash
# CCA Profile (Anthropic)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# CCG Profile (Z.AI)
ZAI_API_KEY=zai-your-key-here
# OR (alternative)
ANTHROPIC_AUTH_TOKEN=zai-your-key-here
ANTHROPIC_BASE_URL=https://api.zukijourney.com/v1
```

### Optional

```bash
# GitHub Integration
GITHUB_TOKEN=ghp-your-token-here

# System Paths
CLAUDE_HOME=~/.claude
CLAUDE_PROFILE=cca  # or ccg

# Python
PYTHONIOENCODING=utf-8
```

---

## VPS Deployment Requirements

### Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2+ vCPU |
| RAM | 1 GB | 2+ GB |
| Disk | 5 GB | 10+ GB |
| Network | 1 Mbps | 10+ Mbps |

### Supported Platforms

| Platform | Architecture | Tested |
|----------|-------------|--------|
| Ubuntu 20.04+ | x86_64 | Yes |
| Debian 11+ | x86_64 | Yes |
| CentOS 8+ | x86_64 | Yes |
| Amazon Linux 2 | x86_64 | Yes |
| Windows Server 2019+ | x86_64 | Yes |

### Installation on Linux

```bash
# Install PowerShell (Ubuntu/Debian)
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update && sudo apt install -y powershell

# Install Python 3.10+
sudo apt install -y python3.10 python3-pip

# Install Git
sudo apt install -y git

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Run installation
pwsh ./install-dual-system.ps1 -ZipPath ./claude-system.zip
```

---

## Troubleshooting

### Common Issues

#### 1. Python Not Found

```
[ERROR] Python not found
```

**Solution:**
```powershell
# Windows (winget)
winget install Python.Python.3.12

# Windows (choco)
choco install python -y

# Linux
sudo apt install python3.10 python3-pip -y
```

#### 2. Claude CLI Not Found

```
[WARNING] Claude Code CLI not found
```

**Solution:**
```powershell
# Requires Node.js 18+
npm install -g @anthropic-ai/claude-code

# Verify
claude --version
```

#### 3. Permission Denied

```
[ERROR] Access denied
```

**Solution:**
```powershell
# Run as Administrator (Windows)
Start-Process powershell -Verb RunAs

# Linux/macOS
chmod +x *.ps1
pwsh ./install-dual-system.ps1 ...
```

#### 4. Hash Mismatch

```
[WARNING] Hash mismatch: path/to/file
```

**Solution:**
- Re-download the ZIP archive
- Verify file integrity: `Get-FileHash -Path ./archive.zip -Algorithm SHA256`
- Use `-Force` to skip verification (not recommended)

#### 5. Profile Switch Fails

```
[ERROR] Profile credentials validation failed
```

**Solution:**
```powershell
# Check profile files exist
Test-Path ~/.claude/settings-anthropic.json
Test-Path ~/.claude/settings-glm.json

# Verify credentials in .env
Get-Content ~/.claude/.env
```

#### 6. MCP Orchestrator Not Working

```
[ERROR] MCP server failed to start
```

**Solution:**
```powershell
# Install Python dependencies
pip install -r ~/.claude/skills/orchestrator/requirements.txt

# Check Python version (requires 3.10+)
python --version

# Verify MCP configuration
Get-Content ~/.claude/settings.json | ConvertFrom-Json | Select-Object -ExpandProperty mcpServers
```

---

## Directory Structure

```
~/.claude/
  agents/           # 43 agent definitions
  skills/           # 26 skills
    orchestrator/   # MCP server (Python)
    learn/          # Learning skill
  rules/            # Context-aware rules engine
    common/         # Universal rules
    python/         # Python-specific
    typescript/     # TypeScript-specific
    go/             # Go-specific
  learnings/        # System learnings (instincts.json)
  templates/        # Task templates
  workflows/        # Workflow definitions
  deploy/           # Deployment scripts (this directory)
  memory/           # Persistent memory
  hooks/            # Event hooks
  commands/         # Slash commands

  CLAUDE.md         # Global instructions
  settings.json     # Active profile
  settings-anthropic.json  # CCA profile
  settings-glm.json        # CCG profile
  .env              # Environment variables (gitignored)
  .env.template     # Template for .env
  .gitignore        # Git ignore rules
  .profile          # Current profile marker
```

---

## Security Notes

1. **Never commit `.env` or `.credentials.json`** - These are automatically excluded from exports
2. **API keys should have minimal scope** - Only grant necessary permissions
3. **Rotate keys regularly** - Especially after sharing exports
4. **Use secrets manager in production** - Consider HashiCorp Vault, AWS SSM, etc.

---

## Support

- **Documentation:** `~/.claude/skills/orchestrator/docs/`
- **Memory:** `~/.claude/projects/c--Users-LeoDg--claude/memory/MEMORY.md`
- **Issues:** Check `~/.claude/debug/` for logs

---

## Changelog

### v1.0.0 (2026-02-27)
- Initial release
- 4 deployment scripts
- Cross-platform support (Windows/Linux/macOS)
- VSCode integration
- Automatic backup and integrity verification
