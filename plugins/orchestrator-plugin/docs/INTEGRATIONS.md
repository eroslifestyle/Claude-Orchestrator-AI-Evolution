# ORCHESTRATOR PLUGIN - GUIDA INTEGRAZIONE COMPLETA

## Versione 2.1.0 | Claude Code Integration Guide

---

## INSTALLAZIONE RAPIDA (One-Click)

### Windows (PowerShell come Amministratore)

```powershell
# Copia e incolla questo comando per installare tutto automaticamente
irm https://raw.githubusercontent.com/eroslifestyle/orchestrator-mcp-server/main/install.ps1 | iex
```

### Linux/Mac

```bash
curl -fsSL https://raw.githubusercontent.com/eroslifestyle/orchestrator-mcp-server/main/install.sh | bash
```

---

## INSTALLAZIONE MANUALE DETTAGLIATA

Se preferisci installare manualmente o lo script automatico fallisce, segui questi passaggi.

---

## STEP 0: DIAGNOSTICA PREREQUISITI

Prima di iniziare, verifica cosa manca:

### Windows (PowerShell)

```powershell
Write-Host "`n====== DIAGNOSTICA ORCHESTRATOR ======`n" -ForegroundColor Cyan

# 1. Python
try {
    $py = python --version 2>&1
    if ($py -match "3\.(1[0-9]|[2-9][0-9])") {
        Write-Host "[OK] $py" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Python trovato ma versione < 3.10: $py" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Python non installato" -ForegroundColor Red
}

# 2. UV/UVX
try {
    $uv = uv --version 2>&1
    Write-Host "[OK] UV: $uv" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] UV/UVX non installato" -ForegroundColor Red
}

# 3. Git
try {
    $git = git --version 2>&1
    Write-Host "[OK] $git" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Git non installato" -ForegroundColor Red
}

# 4. settings.local.json
$settingsPath = "$env:USERPROFILE\.claude\settings.local.json"
if (Test-Path $settingsPath) {
    Write-Host "[OK] settings.local.json esiste" -ForegroundColor Green
} else {
    Write-Host "[FAIL] settings.local.json NON ESISTE" -ForegroundColor Red
}

# 5. .mcp.json
$mcpPath = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.mcp.json"
if (Test-Path $mcpPath) {
    Write-Host "[OK] .mcp.json esiste" -ForegroundColor Green
} else {
    Write-Host "[FAIL] .mcp.json NON ESISTE" -ForegroundColor Red
}

# 6. mcp_server/
$serverPath = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\mcp_server"
if (Test-Path $serverPath) {
    Write-Host "[OK] mcp_server/ esiste" -ForegroundColor Green
} else {
    Write-Host "[FAIL] mcp_server/ NON ESISTE" -ForegroundColor Red
}

# 7. skills/
$skillsPath = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\skills"
if (Test-Path $skillsPath) {
    Write-Host "[OK] skills/ esiste" -ForegroundColor Green
} else {
    Write-Host "[FAIL] skills/ NON ESISTE" -ForegroundColor Red
}

Write-Host "`n======================================`n" -ForegroundColor Cyan
```

---

## STEP 1: INSTALLARE UV/UVX

UV è il package manager Python moderno richiesto per eseguire il server MCP.

### Windows (PowerShell come Amministratore)

```powershell
# Metodo 1: Via pip (più semplice)
pip install uv

# Metodo 2: Via installer ufficiale
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verifica installazione
uv --version
uvx --version
```

### Linux/Mac

```bash
# Installer ufficiale
curl -LsSf https://astral.sh/uv/install.sh | sh

# Ricarica PATH
source ~/.bashrc  # o ~/.zshrc per zsh

# Verifica
uv --version
uvx --version
```

### Troubleshooting UV

Se `uvx` non viene trovato dopo l'installazione:

```powershell
# Windows - Aggiungi al PATH
$uvPath = "$env:USERPROFILE\.local\bin"
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$uvPath", "User")

# Riavvia PowerShell e verifica
uvx --version
```

---

## STEP 2: CREARE settings.local.json

Questo file abilita il server MCP in Claude Code.

### Windows (PowerShell)

```powershell
# Crea il file settings.local.json
$settingsContent = @'
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
'@

$settingsPath = "$env:USERPROFILE\.claude\settings.local.json"

# Crea directory se non esiste
$claudeDir = "$env:USERPROFILE\.claude"
if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force
}

# Scrivi il file
$settingsContent | Out-File -FilePath $settingsPath -Encoding UTF8 -Force

Write-Host "settings.local.json creato in: $settingsPath" -ForegroundColor Green
```

### Linux/Mac

```bash
# Crea directory se non esiste
mkdir -p ~/.claude

# Crea settings.local.json
cat > ~/.claude/settings.local.json << 'EOF'
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
EOF

echo "settings.local.json creato!"
```

---

## STEP 3: CLONARE IL REPOSITORY COMPLETO

Il repository deve contenere TUTTE le cartelle necessarie.

### Struttura Repository Richiesta

```
orchestrator-plugin/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── .mcp.json                    # Configurazione MCP
├── mcp_server/                  # Server Python MCP
│   ├── server.py
│   ├── pyproject.toml
│   ├── __init__.py
│   └── README.md
├── skills/                      # Skill definitions
│   └── orchestrator/
│       └── SKILL.md
├── config/                      # Configuration files
│   ├── agent-registry.json
│   └── keyword-mappings.json
└── docs/
    └── INTEGRATIONS.md
```

### Clonare il Repository

```bash
# Rimuovi vecchia installazione se esiste
rm -rf ~/.claude/plugins/orchestrator-plugin

# Clona repository completo
git clone https://github.com/eroslifestyle/orchestrator-plugin.git ~/.claude/plugins/orchestrator-plugin

# Verifica struttura
ls -la ~/.claude/plugins/orchestrator-plugin/
```

---

## STEP 4: CONFIGURARE .mcp.json

### Opzione A: Usare uvx da GitHub (RACCOMANDATO)

```json
{
  "orchestrator": {
    "command": "uvx",
    "args": [
      "--from",
      "git+https://github.com/eroslifestyle/orchestrator-mcp-server",
      "orchestrator-mcp"
    ]
  }
}
```

### Opzione B: Usare Python locale (se uvx non funziona)

```json
{
  "orchestrator": {
    "command": "python",
    "args": [
      "C:\\Users\\TUO_USERNAME\\.claude\\plugins\\orchestrator-plugin\\mcp_server\\server.py"
    ]
  }
}
```

### Opzione C: Usare npx (alternativa)

```json
{
  "orchestrator": {
    "command": "npx",
    "args": [
      "-y",
      "@anthropic/mcp-server-orchestrator"
    ]
  }
}
```

---

## STEP 5: CREARE LA SKILL /orchestrator

### Crea la struttura skills/

```powershell
# Windows
$skillDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\skills\orchestrator"
New-Item -ItemType Directory -Path $skillDir -Force
```

```bash
# Linux/Mac
mkdir -p ~/.claude/plugins/orchestrator-plugin/skills/orchestrator
```

### Crea SKILL.md

Crea il file `skills/orchestrator/SKILL.md`:

```markdown
# Orchestrator Skill

<orchestrator-command>

## Comportamento

Sei l'ORCHESTRATOR v4.2 ENHANCED - Sistema di orchestrazione **MULTI-TUTTO** unificato con Risk Assessment, Fallback Chain, Real-time Monitoring e Quality Gate.

**FILOSOFIA FONDAMENTALE: MULTI-TUTTO AD OGNI LIVELLO**
- Multi-Task: Ogni richiesta si decompone in N task paralleli
- Multi-Agent: Ogni task usa l'agent ottimale
- Multi-Parallelismo: Niente e' sequenziale se puo' essere parallelo

## Agent Table

| Keyword | Agent Expert File | Model | Priority |
|---------|------------------|-------|----------|
| gui, pyqt5, qt | experts/gui-super-expert.md | sonnet | ALTA |
| database, sql | experts/database_expert.md | sonnet | ALTA |
| security, auth | experts/security_unified_expert.md | opus | CRITICA |
| api, telegram | experts/integration_expert.md | sonnet | ALTA |
| test, debug | experts/tester_expert.md | sonnet | ALTA |

## Uso

L'utente scrivera': `/orchestrator <descrizione task>`

Esempio:
- `/orchestrator Aggiungi login OAuth2 con JWT`
- `/orchestrator Crea GUI PyQt5 per gestione inventario`

</orchestrator-command>
```

---

## STEP 6: SCRIPT DI INSTALLAZIONE AUTOMATICA

### install.ps1 (Windows)

Crea questo file nel repository:

```powershell
# install.ps1 - Orchestrator Plugin Installer for Windows
# Run: irm https://raw.githubusercontent.com/eroslifestyle/orchestrator-mcp-server/main/install.ps1 | iex

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║     ORCHESTRATOR PLUGIN INSTALLER v2.1.0                     ║
║     Multi-Agent Orchestration for Claude Code                ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Paths
$claudeDir = "$env:USERPROFILE\.claude"
$pluginsDir = "$claudeDir\plugins"
$orchestratorDir = "$pluginsDir\orchestrator-plugin"
$settingsPath = "$claudeDir\settings.local.json"

# Step 1: Check Python
Write-Host "[1/6] Checking Python..." -ForegroundColor Yellow
try {
    $pyVer = python --version 2>&1
    if ($pyVer -match "3\.(1[0-9]|[2-9][0-9])") {
        Write-Host "      OK: $pyVer" -ForegroundColor Green
    } else {
        throw "Python 3.10+ required"
    }
} catch {
    Write-Host "      FAIL: Python 3.10+ not found" -ForegroundColor Red
    Write-Host "      Install from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Step 2: Install UV
Write-Host "[2/6] Installing UV..." -ForegroundColor Yellow
try {
    $uvVer = uv --version 2>&1
    Write-Host "      OK: UV already installed ($uvVer)" -ForegroundColor Green
} catch {
    Write-Host "      Installing UV via pip..." -ForegroundColor Yellow
    pip install uv --quiet
    Write-Host "      OK: UV installed" -ForegroundColor Green
}

# Step 3: Create directories
Write-Host "[3/6] Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
Write-Host "      OK: Directories created" -ForegroundColor Green

# Step 4: Clone/Update repository
Write-Host "[4/6] Downloading Orchestrator Plugin..." -ForegroundColor Yellow
if (Test-Path $orchestratorDir) {
    if ($Force) {
        Remove-Item -Recurse -Force $orchestratorDir
        git clone https://github.com/eroslifestyle/orchestrator-plugin.git $orchestratorDir
    } else {
        Push-Location $orchestratorDir
        git pull origin main
        Pop-Location
    }
} else {
    git clone https://github.com/eroslifestyle/orchestrator-plugin.git $orchestratorDir
}
Write-Host "      OK: Plugin downloaded" -ForegroundColor Green

# Step 5: Create settings.local.json
Write-Host "[5/6] Configuring Claude Code..." -ForegroundColor Yellow
$settings = @{
    enabledMcpjsonServers = @("orchestrator")
    enableAllProjectMcpServers = $true
}
$settings | ConvertTo-Json | Out-File -FilePath $settingsPath -Encoding UTF8 -Force
Write-Host "      OK: settings.local.json created" -ForegroundColor Green

# Step 6: Create skills directory
Write-Host "[6/6] Setting up skills..." -ForegroundColor Yellow
$skillsDir = "$orchestratorDir\skills\orchestrator"
New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null

$skillContent = @'
# Orchestrator Skill

<orchestrator-command>

## Comportamento

Sei l'ORCHESTRATOR v4.2 ENHANCED - Sistema di orchestrazione multi-agent.

Quando l'utente invoca questo comando:
1. Analizza la richiesta
2. Identifica keywords e domini
3. Seleziona gli expert agents
4. Genera il piano di esecuzione
5. Esegui gli agenti in parallelo
6. Documenta i risultati (REGOLA #5)

## Uso

`/orchestrator <descrizione task>`

</orchestrator-command>
'@
$skillContent | Out-File -FilePath "$skillsDir\SKILL.md" -Encoding UTF8 -Force
Write-Host "      OK: Skill created" -ForegroundColor Green

# Done
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║     INSTALLATION COMPLETE!                                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Next steps:                                                  ║
║  1. Restart VS Code / Claude Code                            ║
║  2. Test with: /orchestrator Test di verifica                ║
║                                                               ║
║  Tools available:                                             ║
║  - mcp__orchestrator__orchestrator_analyze                   ║
║  - mcp__orchestrator__orchestrator_execute                   ║
║  - mcp__orchestrator__orchestrator_agents                    ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green
```

### install.sh (Linux/Mac)

```bash
#!/bin/bash
# install.sh - Orchestrator Plugin Installer for Linux/Mac
# Run: curl -fsSL https://raw.githubusercontent.com/eroslifestyle/orchestrator-mcp-server/main/install.sh | bash

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     ORCHESTRATOR PLUGIN INSTALLER v2.1.0                     ║"
echo "║     Multi-Agent Orchestration for Claude Code                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Paths
CLAUDE_DIR="$HOME/.claude"
PLUGINS_DIR="$CLAUDE_DIR/plugins"
ORCHESTRATOR_DIR="$PLUGINS_DIR/orchestrator-plugin"
SETTINGS_PATH="$CLAUDE_DIR/settings.local.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check Python
echo -e "${YELLOW}[1/6] Checking Python...${NC}"
if command -v python3 &> /dev/null; then
    PY_VER=$(python3 --version)
    echo -e "      ${GREEN}OK: $PY_VER${NC}"
else
    echo -e "      ${RED}FAIL: Python 3.10+ not found${NC}"
    exit 1
fi

# Step 2: Install UV
echo -e "${YELLOW}[2/6] Installing UV...${NC}"
if command -v uv &> /dev/null; then
    echo -e "      ${GREEN}OK: UV already installed${NC}"
else
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true
    echo -e "      ${GREEN}OK: UV installed${NC}"
fi

# Step 3: Create directories
echo -e "${YELLOW}[3/6] Creating directories...${NC}"
mkdir -p "$CLAUDE_DIR"
mkdir -p "$PLUGINS_DIR"
echo -e "      ${GREEN}OK: Directories created${NC}"

# Step 4: Clone/Update repository
echo -e "${YELLOW}[4/6] Downloading Orchestrator Plugin...${NC}"
if [ -d "$ORCHESTRATOR_DIR" ]; then
    cd "$ORCHESTRATOR_DIR"
    git pull origin main
else
    git clone https://github.com/eroslifestyle/orchestrator-plugin.git "$ORCHESTRATOR_DIR"
fi
echo -e "      ${GREEN}OK: Plugin downloaded${NC}"

# Step 5: Create settings.local.json
echo -e "${YELLOW}[5/6] Configuring Claude Code...${NC}"
cat > "$SETTINGS_PATH" << 'EOF'
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
EOF
echo -e "      ${GREEN}OK: settings.local.json created${NC}"

# Step 6: Create skills directory
echo -e "${YELLOW}[6/6] Setting up skills...${NC}"
SKILLS_DIR="$ORCHESTRATOR_DIR/skills/orchestrator"
mkdir -p "$SKILLS_DIR"
cat > "$SKILLS_DIR/SKILL.md" << 'EOF'
# Orchestrator Skill

<orchestrator-command>

## Comportamento

Sei l'ORCHESTRATOR v4.2 ENHANCED - Sistema di orchestrazione multi-agent.

## Uso

`/orchestrator <descrizione task>`

</orchestrator-command>
EOF
echo -e "      ${GREEN}OK: Skill created${NC}"

# Done
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     INSTALLATION COMPLETE!                                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                                  ║"
echo "║  1. Restart VS Code / Claude Code                            ║"
echo "║  2. Test with: /orchestrator Test di verifica                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
```

---

## STEP 7: VERIFICA FINALE

### Test Completo

```powershell
# Windows - Verifica tutto
Write-Host "`n=== VERIFICA FINALE ===" -ForegroundColor Cyan

# 1. UV funziona?
uvx --version

# 2. Server MCP avviabile?
uvx --from git+https://github.com/eroslifestyle/orchestrator-mcp-server orchestrator-mcp --help

# 3. File esistono?
Test-Path "$env:USERPROFILE\.claude\settings.local.json"
Test-Path "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.mcp.json"
Test-Path "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\skills\orchestrator\SKILL.md"
```

### In Claude Code

Dopo aver riavviato VS Code:

```
# Verifica tool disponibili
mcp__orchestrator__orchestrator_agents

# Test skill
/orchestrator Analizza la struttura del progetto
```

---

## TROUBLESHOOTING RAPIDO

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `uvx: command not found` | UV non installato | `pip install uv` |
| Tool MCP non visibili | settings.local.json mancante | Esegui Step 2 |
| `/orchestrator` non funziona | skills/ mancante | Esegui Step 5 |
| `/orchestrator` non riconosciuto | `.claude-plugin/` mancante o con nome sbagliato | Vedi sezione "ERRORE CRITICO: Cartella Plugin" |
| Server non si avvia | Repository incompleto | Ri-clona il repo |
| Errore Python | Dipendenza mcp mancante | `pip install mcp` |
| Skill non appare | `_backup_claude-plugin/` invece di `.claude-plugin/` | Rinomina cartella con PUNTO |

---

## ERRORE CRITICO: NOME CARTELLA `.claude-plugin/`

### IL PROBLEMA PIU' COMUNE

**ATTENZIONE:** Il nome della cartella di configurazione del plugin DEVE iniziare con un PUNTO (`.`), NON con underscore (`_`).

```
SBAGLIATO:                          CORRETTO:
_claude-plugin/                     .claude-plugin/
_backup_claude-plugin/              .claude-plugin/
claude-plugin/                      .claude-plugin/
```

### Perche' Succede?

1. **Backup automatici**: Alcuni tool creano backup con underscore
2. **Copia manuale errata**: Il punto viene perso durante copia/incolla
3. **File explorer Windows**: Le cartelle con punto iniziale sono nascoste

### Come Verificare (Windows PowerShell)

```powershell
# Mostra TUTTE le cartelle, incluse quelle nascoste
Get-ChildItem -Path "$env:USERPROFILE\.claude\plugins\orchestrator-plugin" -Force | Where-Object { $_.PSIsContainer }

# Output atteso:
# .claude-plugin    <- CORRETTO (con punto)
# agents
# commands
# config
# ...

# Output PROBLEMATICO:
# _backup_claude-plugin   <- SBAGLIATO (con underscore)
# _claude-plugin          <- SBAGLIATO (con underscore)
```

### Come Verificare (Linux/Mac)

```bash
# Mostra tutte le cartelle incluse quelle nascoste
ls -la ~/.claude/plugins/orchestrator-plugin/ | grep "^d"

# Deve esserci:
# drwxr-xr-x  .claude-plugin   <- CORRETTO (con punto)
```

### FIX RAPIDO

```powershell
# Windows - Rinomina da underscore a punto
$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"

# Se esiste _backup_claude-plugin, rinominala
if (Test-Path "$pluginDir\_backup_claude-plugin") {
    # Crea .claude-plugin se non esiste
    if (-not (Test-Path "$pluginDir\.claude-plugin")) {
        Move-Item "$pluginDir\_backup_claude-plugin" "$pluginDir\.claude-plugin"
        Write-Host "Cartella rinominata correttamente!" -ForegroundColor Green
    } else {
        Write-Host ".claude-plugin gia' esiste, copia plugin.json manualmente" -ForegroundColor Yellow
    }
}
```

```bash
# Linux/Mac
PLUGIN_DIR="$HOME/.claude/plugins/orchestrator-plugin"

# Se esiste _backup_claude-plugin, rinominala
if [ -d "$PLUGIN_DIR/_backup_claude-plugin" ]; then
    if [ ! -d "$PLUGIN_DIR/.claude-plugin" ]; then
        mv "$PLUGIN_DIR/_backup_claude-plugin" "$PLUGIN_DIR/.claude-plugin"
        echo "Cartella rinominata correttamente!"
    else
        echo ".claude-plugin gia' esiste"
    fi
fi
```

### Struttura OBBLIGATORIA del Plugin

```
orchestrator-plugin/
├── .claude-plugin/              <- OBBLIGATORIO: PUNTO all'inizio!
│   └── plugin.json              <- Manifesto del plugin
├── commands/                    <- Auto-discovered (comandi slash)
│   └── orchestrator.md          <- Definisce /orchestrator
├── skills/                      <- Auto-discovered (alternative)
│   └── orchestrator/
│       └── SKILL.md
├── agents/                      <- Auto-discovered
│   ├── core/
│   └── experts/
└── hooks/                       <- Auto-discovered
    └── *.md
```

**REGOLA:** Claude Code cerca SOLO `.claude-plugin/plugin.json` per riconoscere un plugin valido!

---

## FORMATO `allowed-tools` NEI COMANDI

### Problema Secondario Comune

Il formato del campo `allowed-tools` nel frontmatter YAML puo' causare problemi.

### Formato SBAGLIATO (Array JSON)

```yaml
---
allowed-tools: ["Task", "Read", "Write", "Edit", "Glob", "Grep", "Bash"]
---
```

### Formato CORRETTO (Stringa)

```yaml
---
allowed-tools: Task, Read, Write, Edit, Glob, Grep, Bash
---
```

### Oppure Omettere (Tutti i Tool Disponibili)

```yaml
---
# Nessun campo allowed-tools = tutti i tool disponibili
---
```

### Esempio Completo di `commands/orchestrator.md`

```markdown
---
description: Orchestrator V6.0 - Coordina agent multipli in parallelo
allowed-tools: Task, Read, Write, Edit, Glob, Grep, Bash, TodoWrite
---

<orchestrator-command>

[Contenuto della skill...]

</orchestrator-command>
```

---

## STRUTTURA REPOSITORY GITHUB RICHIESTA

Il repository **eroslifestyle/orchestrator-plugin** deve contenere:

```
orchestrator-plugin/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json
├── mcp_server/
│   ├── server.py
│   ├── pyproject.toml
│   └── __init__.py
├── skills/
│   └── orchestrator/
│       └── SKILL.md
├── config/
│   ├── agent-registry.json
│   └── keyword-mappings.json
├── install.ps1
├── install.sh
└── docs/
    └── INTEGRATIONS.md
```

**IMPORTANTE:** Tutti questi file devono essere committati e pushati su GitHub!

---

## CHECKLIST PRE-RILASCIO

```
[ ] Repository GitHub e' PUBLIC
[ ] install.ps1 presente e testato
[ ] install.sh presente e testato
[ ] mcp_server/ contiene server.py e pyproject.toml
[ ] skills/orchestrator/SKILL.md presente
[ ] .mcp.json configurato correttamente
[ ] README.md con istruzioni chiare
```

---

## ATTIVAZIONE COMANDO /orchestrator - GUIDA DETTAGLIATA

Questa sezione spiega in dettaglio come funziona il sistema di skill in Claude Code e come attivare correttamente il comando `/orchestrator`.

---

### COME FUNZIONA IL SISTEMA DI SKILL IN CLAUDE CODE

Claude Code utilizza un sistema di "skill" per estendere i comandi disponibili. Una skill e' un file Markdown che definisce il comportamento di Claude quando l'utente invoca un comando slash (es. `/orchestrator`).

```
┌─────────────────────────────────────────────────────────────────┐
│                    SKILL SYSTEM ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User: /orchestrator task description                          │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────┐                                       │
│   │  Claude Code CLI    │                                       │
│   │  Cerca skill in:    │                                       │
│   │  - plugins/*/skills/│                                       │
│   │  - .claude/commands/│                                       │
│   └──────────┬──────────┘                                       │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────┐                                       │
│   │  SKILL.md           │                                       │
│   │  Caricato e inietta │                                       │
│   │  nel prompt di      │                                       │
│   │  Claude             │                                       │
│   └──────────┬──────────┘                                       │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────┐                                       │
│   │  Claude esegue      │                                       │
│   │  seguendo le        │                                       │
│   │  istruzioni della   │                                       │
│   │  skill              │                                       │
│   └─────────────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### FILE DI CONFIGURAZIONE RICHIESTI

Per attivare `/orchestrator` sono necessari **4 file di configurazione**:

#### 1. plugin.json (Definizione Plugin)

**Percorso:** `~/.claude/plugins/orchestrator-plugin/.claude-plugin/plugin.json`

```json
{
  "name": "orchestrator",
  "description": "Multi-agent orchestration MCP server providing automatic task distribution and coordination across 64+ expert agents for complex development workflows.",
  "version": "2.1.0",
  "author": {
    "name": "LeoDg",
    "email": "leo@example.com"
  },
  "skills": [
    {
      "name": "orchestrator",
      "description": "Main orchestration command - coordinate multiple expert agents",
      "command": "/orchestrator",
      "file": "../skills/orchestrator/SKILL.md"
    }
  ],
  "mcpServers": {
    "orchestrator": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/eroslifestyle/orchestrator-mcp-server", "orchestrator-mcp"]
    }
  }
}
```

**Campi importanti:**
- `name`: Nome univoco del plugin
- `skills`: Array di skill disponibili
- `skills[].command`: Il comando slash (es. `/orchestrator`)
- `skills[].file`: Percorso al file SKILL.md
- `mcpServers`: Configurazione server MCP (alternativa a .mcp.json)

---

#### 2. SKILL.md (Definizione Comportamento)

**Percorso:** `~/.claude/plugins/orchestrator-plugin/skills/orchestrator/SKILL.md`

Questo file definisce COME Claude deve comportarsi quando l'utente invoca `/orchestrator`.

**Struttura base:**

```markdown
# Nome Skill

<nome-comando-command>

## Comportamento

[Istruzioni dettagliate per Claude su come eseguire il comando]

## Uso

[Esempi di utilizzo]

</nome-comando-command>
```

**IMPORTANTE:** Il tag XML (es. `<orchestrator-command>`) deve:
- Avere un nome univoco
- Essere aperto e chiuso correttamente
- Contenere tutte le istruzioni per Claude

---

#### 3. .mcp.json (Configurazione Server MCP)

**Percorso:** `~/.claude/plugins/orchestrator-plugin/.mcp.json`

```json
{
  "orchestrator": {
    "command": "uvx",
    "args": [
      "--from",
      "git+https://github.com/eroslifestyle/orchestrator-mcp-server",
      "orchestrator-mcp"
    ]
  }
}
```

**Opzioni alternative:**

```json
// Opzione Python locale
{
  "orchestrator": {
    "command": "python",
    "args": ["C:\\Users\\TUO_USERNAME\\.claude\\plugins\\orchestrator-plugin\\mcp_server\\server.py"]
  }
}

// Opzione con path relativo (Linux/Mac)
{
  "orchestrator": {
    "command": "python3",
    "args": ["~/.claude/plugins/orchestrator-plugin/mcp_server/server.py"]
  }
}
```

---

#### 4. settings.local.json (Abilitazione MCP)

**Percorso:** `~/.claude/settings.local.json`

```json
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
```

**Campi:**
- `enabledMcpjsonServers`: Lista dei server MCP da attivare
- `enableAllProjectMcpServers`: Abilita tutti i server nei progetti

---

### STRUTTURA COMPLETA DELLE DIRECTORY

```
~/.claude/
├── settings.json              # Impostazioni globali Claude
├── settings.local.json        # ← FILE 4: Abilita MCP servers
└── plugins/
    └── orchestrator-plugin/
        ├── .claude-plugin/
        │   ├── plugin.json    # ← FILE 1: Definizione plugin
        │   └── marketplace.json
        ├── .mcp.json          # ← FILE 3: Config MCP server
        ├── skills/
        │   └── orchestrator/
        │       └── SKILL.md   # ← FILE 2: Comportamento skill
        ├── mcp_server/
        │   ├── server.py      # Server MCP Python
        │   ├── pyproject.toml
        │   └── __init__.py
        ├── config/
        │   ├── agent-registry.json
        │   └── keyword-mappings.json
        ├── install.ps1
        └── install.sh
```

---

### CREAZIONE MANUALE DEI FILE

#### Windows (PowerShell)

```powershell
# Variabili
$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"
$claudePluginDir = "$pluginDir\.claude-plugin"
$skillsDir = "$pluginDir\skills\orchestrator"

# 1. Crea directory
New-Item -ItemType Directory -Path $claudePluginDir -Force
New-Item -ItemType Directory -Path $skillsDir -Force

# 2. Crea plugin.json
@'
{
  "name": "orchestrator",
  "description": "Multi-agent orchestration system with 64+ parallel agents",
  "version": "2.1.0",
  "author": {
    "name": "LeoDg"
  },
  "skills": [
    {
      "name": "orchestrator",
      "description": "Main orchestration command",
      "command": "/orchestrator",
      "file": "../skills/orchestrator/SKILL.md"
    }
  ]
}
'@ | Out-File -FilePath "$claudePluginDir\plugin.json" -Encoding UTF8

# 3. Crea .mcp.json
@'
{
  "orchestrator": {
    "command": "python",
    "args": ["PATH_TO_SERVER/server.py"]
  }
}
'@ -replace 'PATH_TO_SERVER', "$pluginDir\mcp_server" | Out-File -FilePath "$pluginDir\.mcp.json" -Encoding UTF8

# 4. Crea SKILL.md
@'
# Orchestrator Skill

<orchestrator-command>

## Comportamento

Sei l'ORCHESTRATOR v4.2 ENHANCED - Sistema di orchestrazione multi-agent.

Quando l'utente invoca questo comando:
1. Analizza la richiesta e identifica keywords
2. Seleziona gli expert agents appropriati
3. Mostra il piano di esecuzione
4. Esegui gli agenti in parallelo
5. Documenta i risultati

## Agent Table

| Keyword | Expert File | Model | Priority |
|---------|-------------|-------|----------|
| gui, pyqt5, qt | experts/gui-super-expert.md | sonnet | ALTA |
| database, sql | experts/database_expert.md | sonnet | ALTA |
| security, auth | experts/security_unified_expert.md | opus | CRITICA |
| api, rest, webhook | experts/integration_expert.md | sonnet | ALTA |
| test, debug, fix | experts/tester_expert.md | sonnet | ALTA |

## Uso

`/orchestrator <descrizione task>`

Esempio:
- `/orchestrator Aggiungi autenticazione JWT`
- `/orchestrator Crea interfaccia per gestione utenti`

</orchestrator-command>
'@ | Out-File -FilePath "$skillsDir\SKILL.md" -Encoding UTF8

# 5. Crea settings.local.json
@'
{
  "enabledMcpjsonServers": ["orchestrator"],
  "enableAllProjectMcpServers": true
}
'@ | Out-File -FilePath "$env:USERPROFILE\.claude\settings.local.json" -Encoding UTF8

Write-Host "Configurazione completata!" -ForegroundColor Green
Write-Host "Riavvia VS Code per attivare /orchestrator" -ForegroundColor Yellow
```

#### Linux/Mac (Bash)

```bash
#!/bin/bash

# Variabili
PLUGIN_DIR="$HOME/.claude/plugins/orchestrator-plugin"
CLAUDE_PLUGIN_DIR="$PLUGIN_DIR/.claude-plugin"
SKILLS_DIR="$PLUGIN_DIR/skills/orchestrator"

# 1. Crea directory
mkdir -p "$CLAUDE_PLUGIN_DIR"
mkdir -p "$SKILLS_DIR"

# 2. Crea plugin.json
cat > "$CLAUDE_PLUGIN_DIR/plugin.json" << 'EOF'
{
  "name": "orchestrator",
  "description": "Multi-agent orchestration system with 64+ parallel agents",
  "version": "2.1.0",
  "author": {
    "name": "LeoDg"
  },
  "skills": [
    {
      "name": "orchestrator",
      "description": "Main orchestration command",
      "command": "/orchestrator",
      "file": "../skills/orchestrator/SKILL.md"
    }
  ]
}
EOF

# 3. Crea .mcp.json
cat > "$PLUGIN_DIR/.mcp.json" << EOF
{
  "orchestrator": {
    "command": "python3",
    "args": ["$PLUGIN_DIR/mcp_server/server.py"]
  }
}
EOF

# 4. Crea SKILL.md
cat > "$SKILLS_DIR/SKILL.md" << 'EOF'
# Orchestrator Skill

<orchestrator-command>

## Comportamento

Sei l'ORCHESTRATOR v4.2 ENHANCED - Sistema di orchestrazione multi-agent.

Quando l'utente invoca questo comando:
1. Analizza la richiesta e identifica keywords
2. Seleziona gli expert agents appropriati
3. Mostra il piano di esecuzione
4. Esegui gli agenti in parallelo
5. Documenta i risultati

## Agent Table

| Keyword | Expert File | Model | Priority |
|---------|-------------|-------|----------|
| gui, pyqt5, qt | experts/gui-super-expert.md | sonnet | ALTA |
| database, sql | experts/database_expert.md | sonnet | ALTA |
| security, auth | experts/security_unified_expert.md | opus | CRITICA |
| api, rest, webhook | experts/integration_expert.md | sonnet | ALTA |
| test, debug, fix | experts/tester_expert.md | sonnet | ALTA |

## Uso

`/orchestrator <descrizione task>`

Esempio:
- `/orchestrator Aggiungi autenticazione JWT`
- `/orchestrator Crea interfaccia per gestione utenti`

</orchestrator-command>
EOF

# 5. Crea settings.local.json
cat > "$HOME/.claude/settings.local.json" << 'EOF'
{
  "enabledMcpjsonServers": ["orchestrator"],
  "enableAllProjectMcpServers": true
}
EOF

echo "Configurazione completata!"
echo "Riavvia VS Code per attivare /orchestrator"
```

---

### VERIFICA ATTIVAZIONE /orchestrator

Dopo aver creato tutti i file e riavviato VS Code:

#### Test 1: Verifica che la skill sia riconosciuta

```
/orchestrator test
```

Se funziona, vedrai Claude rispondere con il piano di orchestrazione.

#### Test 2: Verifica MCP tools disponibili

In Claude Code, chiedi:
```
Elenca i tool MCP orchestrator disponibili
```

Dovresti vedere:
- `mcp__orchestrator__orchestrator_analyze`
- `mcp__orchestrator__orchestrator_execute`
- `mcp__orchestrator__orchestrator_agents`
- `mcp__orchestrator__orchestrator_status`
- `mcp__orchestrator__orchestrator_preview`

#### Test 3: Script di verifica automatica

```powershell
# Windows
Write-Host "=== VERIFICA /orchestrator ===" -ForegroundColor Cyan

$checks = @(
    @{Path="$env:USERPROFILE\.claude\settings.local.json"; Name="settings.local.json"},
    @{Path="$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.mcp.json"; Name=".mcp.json"},
    @{Path="$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.claude-plugin\plugin.json"; Name="plugin.json"},
    @{Path="$env:USERPROFILE\.claude\plugins\orchestrator-plugin\skills\orchestrator\SKILL.md"; Name="SKILL.md"}
)

foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "[OK] $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($check.Name) - MANCANTE!" -ForegroundColor Red
    }
}

# Verifica contenuto settings.local.json
$settings = Get-Content "$env:USERPROFILE\.claude\settings.local.json" | ConvertFrom-Json
if ($settings.enabledMcpjsonServers -contains "orchestrator") {
    Write-Host "[OK] orchestrator abilitato in settings" -ForegroundColor Green
} else {
    Write-Host "[FAIL] orchestrator NON abilitato in settings" -ForegroundColor Red
}
```

---

### TROUBLESHOOTING /orchestrator

#### Problema: "/orchestrator" non viene riconosciuto

**Causa 1:** SKILL.md mancante o in posizione sbagliata

```powershell
# Verifica
Test-Path "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\skills\orchestrator\SKILL.md"
```

**Causa 2:** plugin.json non definisce la skill

```powershell
# Verifica che plugin.json contenga la sezione "skills"
Get-Content "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.claude-plugin\plugin.json"
```

**Causa 3:** VS Code non riavviato

```
Chiudi completamente VS Code (File > Exit)
Riapri VS Code
```

**Causa 4:** Cartella `.claude-plugin/` con nome SBAGLIATO (ERRORE COMUNE!)

Il nome DEVE iniziare con un PUNTO (`.`), NON con underscore (`_`).

```powershell
# Verifica se esiste con nome sbagliato
$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"

# Controlla nome corretto
if (Test-Path "$pluginDir\.claude-plugin") {
    Write-Host "OK: .claude-plugin esiste" -ForegroundColor Green
} else {
    Write-Host "ERRORE: .claude-plugin NON ESISTE" -ForegroundColor Red

    # Controlla nomi sbagliati comuni
    if (Test-Path "$pluginDir\_backup_claude-plugin") {
        Write-Host "TROVATO: _backup_claude-plugin (SBAGLIATO - usa underscore)" -ForegroundColor Yellow
        Write-Host "FIX: Rinomina in .claude-plugin" -ForegroundColor Cyan
    }
    if (Test-Path "$pluginDir\_claude-plugin") {
        Write-Host "TROVATO: _claude-plugin (SBAGLIATO - usa underscore)" -ForegroundColor Yellow
        Write-Host "FIX: Rinomina in .claude-plugin" -ForegroundColor Cyan
    }
}
```

**FIX per Causa 4:**

```powershell
# Rinomina automaticamente la cartella
$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"

# Se esiste _backup_claude-plugin, rinominala
if (Test-Path "$pluginDir\_backup_claude-plugin") {
    if (-not (Test-Path "$pluginDir\.claude-plugin")) {
        Rename-Item "$pluginDir\_backup_claude-plugin" ".claude-plugin"
        Write-Host "Cartella rinominata: _backup_claude-plugin -> .claude-plugin" -ForegroundColor Green
    }
}

# Se esiste _claude-plugin, rinominala
if (Test-Path "$pluginDir\_claude-plugin") {
    if (-not (Test-Path "$pluginDir\.claude-plugin")) {
        Rename-Item "$pluginDir\_claude-plugin" ".claude-plugin"
        Write-Host "Cartella rinominata: _claude-plugin -> .claude-plugin" -ForegroundColor Green
    }
}
```

#### Problema: Tool MCP non disponibili

**Causa 1:** settings.local.json mancante

```powershell
# Crea il file
@'
{"enabledMcpjsonServers":["orchestrator"],"enableAllProjectMcpServers":true}
'@ | Out-File "$env:USERPROFILE\.claude\settings.local.json" -Encoding UTF8
```

**Causa 2:** Server MCP non avviabile

```powershell
# Test manuale del server
python "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\mcp_server\server.py"
```

**Causa 3:** Dipendenza MCP mancante

```bash
pip install mcp
```

---

### RELAZIONE TRA SKILL E MCP SERVER

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│  /orchestrator (SKILL)          MCP SERVER (TOOLS)             │
│  ═══════════════════          ══════════════════════           │
│                                                                 │
│  Definisce il COMPORTAMENTO    Fornisce gli STRUMENTI          │
│  di Claude quando invocato     che Claude puo' usare           │
│                                                                 │
│  ┌─────────────────┐          ┌─────────────────────┐          │
│  │   SKILL.md      │          │   server.py         │          │
│  │                 │          │                     │          │
│  │ - Istruzioni    │   usa    │ - orchestrator_     │          │
│  │ - Agent table   │ ───────> │   analyze           │          │
│  │ - Regole        │          │ - orchestrator_     │          │
│  │ - Workflow      │          │   execute           │          │
│  │                 │          │ - orchestrator_     │          │
│  │                 │          │   agents            │          │
│  └─────────────────┘          └─────────────────────┘          │
│                                                                 │
│  ENTRAMBI sono necessari per il funzionamento completo!        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

- **SKILL** = Definisce COSA fare e COME farlo
- **MCP SERVER** = Fornisce gli STRUMENTI per farlo

Senza la SKILL: `/orchestrator` non viene riconosciuto
Senza MCP SERVER: I tool `orchestrator_*` non sono disponibili

---

### ESEMPIO COMPLETO DI SESSIONE

```
User: /orchestrator Crea sistema di autenticazione con JWT

Claude (seguendo SKILL.md):

ORCHESTRATOR v4.2 - EXECUTION PLAN
══════════════════════════════════

TASK: Crea sistema di autenticazione con JWT
├─ Risk Level: MEDIUM
├─ Complessita: alta
├─ Domini: Security, API
├─ Agenti Totali: 3

AGENT TABLE
| # | Task | Expert | Model | Priority |
|---|------|--------|-------|----------|
| T1 | Security design | security_unified_expert.md | opus | CRITICA |
| T2 | API endpoints | integration_expert.md | sonnet | ALTA |
| T3 | Documentation | documenter.md | haiku | MEDIA |

EXECUTION STRATEGY:
├─ Wave 1 (Parallel): T1, T2
└─ Wave 2 (After T1,T2): T3

Procedo con l'esecuzione? (conferma per MEDIUM risk)
```

---

## VPS WINDOWS - DIAGNOSI E FIX RAPIDO

Questa sezione e' specifica per l'installazione su VPS Windows.

---

### SCRIPT DIAGNOSI COMPLETO (Copia e incolla in PowerShell)

```powershell
# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR DIAGNOSTIC TOOL v2.1 - VPS WINDOWS
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ORCHESTRATOR DIAGNOSTIC TOOL v2.1 - VPS WINDOWS          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"

# 0. CONTROLLO CRITICO: Nome cartella .claude-plugin (DEVE avere il PUNTO!)
Write-Host "[0/9] Cartella .claude-plugin..." -NoNewline
$claudePluginDir = "$pluginDir\.claude-plugin"
$wrongDir1 = "$pluginDir\_backup_claude-plugin"
$wrongDir2 = "$pluginDir\_claude-plugin"

if (Test-Path $claudePluginDir) {
    Write-Host " OK (.claude-plugin esiste)" -ForegroundColor Green
} else {
    Write-Host " FAIL - .claude-plugin NON ESISTE" -ForegroundColor Red
    $errors += ".claude-plugin MANCANTE (ERRORE CRITICO!)"

    # Verifica se esiste con nome sbagliato
    if (Test-Path $wrongDir1) {
        Write-Host "         TROVATO: _backup_claude-plugin (nome SBAGLIATO!)" -ForegroundColor Yellow
        Write-Host "         FIX: Rinomina in .claude-plugin (con PUNTO)" -ForegroundColor Cyan
    }
    if (Test-Path $wrongDir2) {
        Write-Host "         TROVATO: _claude-plugin (nome SBAGLIATO!)" -ForegroundColor Yellow
        Write-Host "         FIX: Rinomina in .claude-plugin (con PUNTO)" -ForegroundColor Cyan
    }
}

# 1. Python
Write-Host "[1/9] Python..." -NoNewline
try {
    $py = python --version 2>&1
    if ($py -match "3\.(1[0-9]|[2-9][0-9])") {
        Write-Host " OK ($py)" -ForegroundColor Green
    } else {
        Write-Host " WARN: $py (< 3.10)" -ForegroundColor Yellow
        $errors += "Python < 3.10"
    }
} catch {
    Write-Host " FAIL - Python non trovato" -ForegroundColor Red
    $errors += "Python non installato"
}

# 2. UV/UVX
Write-Host "[2/9] UV/UVX..." -NoNewline
try {
    $uv = uv --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK ($uv)" -ForegroundColor Green
    } else { throw }
} catch {
    Write-Host " FAIL - Installa con: pip install uv" -ForegroundColor Red
    $errors += "UV non installato"
}

# 3. settings.local.json
Write-Host "[3/9] settings.local.json..." -NoNewline
$settingsPath = "$env:USERPROFILE\.claude\settings.local.json"
if (Test-Path $settingsPath) {
    try {
        $content = Get-Content $settingsPath -Raw | ConvertFrom-Json
        if ($content.enabledMcpjsonServers -contains "orchestrator") {
            Write-Host " OK (orchestrator abilitato)" -ForegroundColor Green
        } else {
            Write-Host " FAIL - 'orchestrator' non in enabledMcpjsonServers" -ForegroundColor Red
            $errors += "orchestrator non abilitato"
        }
    } catch {
        Write-Host " FAIL - JSON non valido" -ForegroundColor Red
        $errors += "settings.local.json corrotto"
    }
} else {
    Write-Host " FAIL - FILE NON ESISTE" -ForegroundColor Red
    $errors += "settings.local.json mancante"
}

# 4. Plugin directory
Write-Host "[4/9] Plugin directory..." -NoNewline
if (Test-Path $pluginDir) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL - $pluginDir non esiste" -ForegroundColor Red
    $errors += "Plugin directory mancante"
}

# 5. .mcp.json
Write-Host "[5/9] .mcp.json..." -NoNewline
$mcpPath = "$pluginDir\.mcp.json"
if (Test-Path $mcpPath) {
    Write-Host " OK" -ForegroundColor Green
    # Mostra contenuto
    Write-Host "         Contenuto: " -NoNewline -ForegroundColor Gray
    $mcpContent = Get-Content $mcpPath -Raw
    Write-Host $mcpContent.Substring(0, [Math]::Min(80, $mcpContent.Length)) -ForegroundColor Gray
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $errors += ".mcp.json mancante"
}

# 6. plugin.json
Write-Host "[6/9] plugin.json..." -NoNewline
$pluginJson = "$pluginDir\.claude-plugin\plugin.json"
if (Test-Path $pluginJson) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $errors += "plugin.json mancante"
}

# 7. SKILL.md (CRITICO!)
Write-Host "[7/9] SKILL.md..." -NoNewline
$skillPath = "$pluginDir\skills\orchestrator\SKILL.md"
if (Test-Path $skillPath) {
    $skillSize = (Get-Item $skillPath).Length
    Write-Host " OK ($skillSize bytes)" -ForegroundColor Green
} else {
    Write-Host " FAIL - QUESTO E' IL FILE PIU' IMPORTANTE!" -ForegroundColor Red
    $errors += "SKILL.md MANCANTE (critico)"
}

# 8. mcp_server
Write-Host "[8/9] mcp_server/server.py..." -NoNewline
$serverPath = "$pluginDir\mcp_server\server.py"
if (Test-Path $serverPath) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $errors += "server.py mancante"
}

# 9. commands/orchestrator.md (alternativa a skills/)
Write-Host "[9/9] commands/orchestrator.md..." -NoNewline
$commandPath = "$pluginDir\commands\orchestrator.md"
if (Test-Path $commandPath) {
    $cmdSize = (Get-Item $commandPath).Length
    Write-Host " OK ($cmdSize bytes)" -ForegroundColor Green
} else {
    Write-Host " WARN - Non trovato (OK se usi skills/)" -ForegroundColor Yellow
    # Non e' un errore critico se esiste SKILL.md
}

# Riepilogo
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "TUTTI I CHECK PASSATI!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Se /orchestrator ancora non funziona:" -ForegroundColor Yellow
    Write-Host "  1. Chiudi COMPLETAMENTE VS Code (File > Exit)" -ForegroundColor Yellow
    Write-Host "  2. Riapri VS Code" -ForegroundColor Yellow
    Write-Host "  3. Prova: /orchestrator test" -ForegroundColor Yellow
} else {
    Write-Host "PROBLEMI TROVATI ($($errors.Count)):" -ForegroundColor Red
    Write-Host ""
    foreach ($e in $errors) {
        Write-Host "  X $e" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Esegui lo script FIX qui sotto per risolvere." -ForegroundColor Cyan
}
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
```

---

### SCRIPT FIX COMPLETO (Crea tutti i file necessari)

Se la diagnosi mostra errori, esegui questo script per creare/ricreare tutti i file:

```powershell
# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR FIX TOOL v2.1 - VPS WINDOWS
# Crea TUTTI i file necessari per far funzionare /orchestrator
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ORCHESTRATOR FIX TOOL v2.1 - VPS WINDOWS                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"

# Step 1: Crea tutte le directory
Write-Host "[1/6] Creazione directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$env:USERPROFILE\.claude" -Force | Out-Null
New-Item -ItemType Directory -Path "$pluginDir\.claude-plugin" -Force | Out-Null
New-Item -ItemType Directory -Path "$pluginDir\skills\orchestrator" -Force | Out-Null
New-Item -ItemType Directory -Path "$pluginDir\mcp_server" -Force | Out-Null
New-Item -ItemType Directory -Path "$pluginDir\config" -Force | Out-Null
Write-Host "       OK" -ForegroundColor Green

# Step 2: Crea settings.local.json
Write-Host "[2/6] Creazione settings.local.json..." -ForegroundColor Yellow
@'
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
'@ | Out-File -FilePath "$env:USERPROFILE\.claude\settings.local.json" -Encoding UTF8 -Force
Write-Host "       OK - $env:USERPROFILE\.claude\settings.local.json" -ForegroundColor Green

# Step 3: Crea .mcp.json (usa Python locale, piu' affidabile di uvx)
Write-Host "[3/6] Creazione .mcp.json..." -ForegroundColor Yellow
$serverPath = "$pluginDir\mcp_server\server.py" -replace '\\', '\\\\'
@"
{
  "orchestrator": {
    "command": "python",
    "args": ["$serverPath"]
  }
}
"@ | Out-File -FilePath "$pluginDir\.mcp.json" -Encoding UTF8 -Force
Write-Host "       OK - $pluginDir\.mcp.json" -ForegroundColor Green

# Step 4: Crea plugin.json
Write-Host "[4/6] Creazione plugin.json..." -ForegroundColor Yellow
@'
{
  "name": "orchestrator",
  "description": "Multi-agent orchestration system with 64+ parallel agents for complex development workflows",
  "version": "2.1.0",
  "author": {
    "name": "LeoDg"
  },
  "skills": [
    {
      "name": "orchestrator",
      "description": "Main orchestration command - coordinate multiple expert agents",
      "command": "/orchestrator",
      "file": "../skills/orchestrator/SKILL.md"
    }
  ]
}
'@ | Out-File -FilePath "$pluginDir\.claude-plugin\plugin.json" -Encoding UTF8 -Force
Write-Host "       OK - $pluginDir\.claude-plugin\plugin.json" -ForegroundColor Green

# Step 5: Crea SKILL.md (IL FILE PIU' IMPORTANTE!)
Write-Host "[5/6] Creazione SKILL.md (file critico)..." -ForegroundColor Yellow
@'
# Orchestrator Skill

<orchestrator-command>

## Comportamento

Sei l'ORCHESTRATOR v4.2 ENHANCED - Sistema di orchestrazione **MULTI-TUTTO** unificato.

**FILOSOFIA: MULTI-TUTTO AD OGNI LIVELLO**
- Multi-Task: Ogni richiesta si decompone in N task paralleli
- Multi-Agent: Ogni task usa l'agent ottimale
- Multi-Parallelismo: Niente e' sequenziale se puo' essere parallelo

Quando l'utente invoca questo comando:

### STEP 1: Analisi Task
Analizza la richiesta ed estrai:
- Keywords: parole chiave del dominio
- Domini: aree di competenza richieste
- Complessita: bassa/media/alta

### STEP 2: Selezione Agenti

| Keyword | Agent Expert File | Model | Priority |
|---------|------------------|-------|----------|
| gui, pyqt5, qt, widget, ui | experts/gui-super-expert.md | sonnet | ALTA |
| database, sql, sqlite, query | experts/database_expert.md | sonnet | ALTA |
| security, auth, jwt, encryption | experts/security_unified_expert.md | opus | CRITICA |
| api, telegram, webhook, rest | experts/integration_expert.md | sonnet | ALTA |
| architecture, design, refactor | experts/architect_expert.md | opus | ALTA |
| test, debug, bug, fix | experts/tester_expert.md | sonnet | ALTA |
| devops, docker, deploy | experts/devops_expert.md | haiku | MEDIA |
| mql, mql5, metatrader | experts/mql_expert.md | sonnet | ALTA |
| document, docs, readme | core/documenter.md | haiku | MEDIA |
| code, implement, feature | core/coder.md | sonnet | MEDIA |

### STEP 3: Mostra Piano di Esecuzione

PRIMA di eseguire, mostra SEMPRE la tabella:

```
ORCHESTRATOR v4.2 - EXECUTION PLAN
══════════════════════════════════

TASK: [descrizione]
├─ Complessita: [bassa/media/alta]
├─ Domini: [lista]
├─ Agenti: [numero]

AGENT TABLE
| # | Task | Expert | Model | Priority |
|---|------|--------|-------|----------|
| T1 | ... | ... | ... | ... |
| T2 | ... | ... | ... | ... |

EXECUTION STRATEGY:
├─ Wave 1 (Parallel): T1, T2...
└─ Documenter (Final): Tn
```

### STEP 4: Esecuzione Parallela

Usa il Task tool per lanciare gli agenti in parallelo.

### STEP 5: Documentazione (REGOLA #5)

SEMPRE alla fine, documenta le modifiche.

## Regole Fondamentali

1. MAI codificare direttamente - DELEGA agli agenti
2. SEMPRE mostrare tabella PRIMA di eseguire
3. MASSIMO parallelismo per task indipendenti
4. SEMPRE concludere con documentazione

## Uso

`/orchestrator <descrizione task>`

Esempio:
- `/orchestrator Aggiungi login OAuth2 con JWT`
- `/orchestrator Crea GUI PyQt5 per gestione inventario`
- `/orchestrator Fix bug nella connessione database`

</orchestrator-command>
'@ | Out-File -FilePath "$pluginDir\skills\orchestrator\SKILL.md" -Encoding UTF8 -Force
Write-Host "       OK - $pluginDir\skills\orchestrator\SKILL.md" -ForegroundColor Green

# Step 6: Verifica MCP dipendenza
Write-Host "[6/6] Verifica dipendenza MCP Python..." -ForegroundColor Yellow
try {
    $mcpCheck = python -c "import mcp; print('OK')" 2>&1
    if ($mcpCheck -match "OK") {
        Write-Host "       OK - modulo mcp installato" -ForegroundColor Green
    } else {
        Write-Host "       Installazione mcp..." -ForegroundColor Yellow
        pip install mcp --quiet
        Write-Host "       OK - mcp installato" -ForegroundColor Green
    }
} catch {
    Write-Host "       Installazione mcp..." -ForegroundColor Yellow
    pip install mcp --quiet
    Write-Host "       OK" -ForegroundColor Green
}

# Riepilogo finale
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   FIX COMPLETATO!                                          ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                                             ║" -ForegroundColor Green
Write-Host "║   PROSSIMI PASSI:                                          ║" -ForegroundColor Green
Write-Host "║                                                             ║" -ForegroundColor Green
Write-Host "║   1. CHIUDI VS Code completamente (File > Exit)            ║" -ForegroundColor Yellow
Write-Host "║   2. Riapri VS Code                                        ║" -ForegroundColor Yellow
Write-Host "║   3. Apri Claude Code                                      ║" -ForegroundColor Yellow
Write-Host "║   4. Digita: /orchestrator test                            ║" -ForegroundColor Yellow
Write-Host "║                                                             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

# Mostra file creati
Write-Host ""
Write-Host "File creati:" -ForegroundColor Cyan
Write-Host "  - $env:USERPROFILE\.claude\settings.local.json" -ForegroundColor Gray
Write-Host "  - $pluginDir\.mcp.json" -ForegroundColor Gray
Write-Host "  - $pluginDir\.claude-plugin\plugin.json" -ForegroundColor Gray
Write-Host "  - $pluginDir\skills\orchestrator\SKILL.md" -ForegroundColor Gray
```

---

### VERIFICA RAPIDA POST-FIX

Dopo aver eseguito il fix e riavviato VS Code:

```powershell
# Verifica rapida che tutto sia OK
$checks = @(
    "$env:USERPROFILE\.claude\settings.local.json",
    "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.mcp.json",
    "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.claude-plugin\plugin.json",
    "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\skills\orchestrator\SKILL.md"
)

$allOk = $true
foreach ($path in $checks) {
    if (Test-Path $path) {
        Write-Host "[OK] $(Split-Path $path -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $(Split-Path $path -Leaf)" -ForegroundColor Red
        $allOk = $false
    }
}

if ($allOk) {
    Write-Host "`nTutto OK! Ora riavvia VS Code e prova /orchestrator" -ForegroundColor Green
}
```

---

### PROBLEMI COMUNI SU VPS WINDOWS

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `/orchestrator` non riconosciuto | `.claude-plugin/` mancante o con nome sbagliato | **Vedi FIX sotto** |
| `/orchestrator` non riconosciuto | `_backup_claude-plugin/` invece di `.claude-plugin/` | Rinomina con PUNTO iniziale |
| `/orchestrator` non riconosciuto | SKILL.md mancante | Esegui script FIX |
| Tool MCP non visibili | settings.local.json mancante | Esegui script FIX |
| Errore "uvx not found" | UV non installato | `pip install uv` |
| Errore "mcp module not found" | Dipendenza mancante | `pip install mcp` |
| Nessun effetto dopo fix | VS Code non riavviato | Chiudi e riapri VS Code |
| Server MCP non si avvia | Percorso errato in .mcp.json | Verifica path in .mcp.json |
| Skill non appare dopo riavvio | `allowed-tools` in formato JSON array | Usa formato stringa |

---

### SE ANCORA NON FUNZIONA

1. **Esegui lo script di diagnosi** e copia l'output
2. **Verifica i log di Claude Code** in VS Code (Output > Claude Code)
3. **Prova a eseguire manualmente il server MCP:**

```powershell
python "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\mcp_server\server.py"
```

Se vedi errori, condividili per ricevere aiuto specifico.

---

## FIX SPECIFICO: plugin.json MANCANTE

### Problema Identificato

```
PROBLEMA: Manca plugin.json nella posizione corretta

File                    Percorso                              Stato
plugin.json             .claude-plugin/plugin.json            ❌ MANCANTE
plugin.json             root/                                 ⚠️ Posizione sbagliata
commands/orchestrator.md root                                 ✅ Esiste
```

### Causa

Il file `plugin.json` deve essere nella cartella `.claude-plugin/`, NON nella root del plugin.

**Struttura CORRETTA:**
```
orchestrator-plugin/
├── .claude-plugin/
│   └── plugin.json      ← DEVE ESSERE QUI!
├── .mcp.json
├── skills/
│   └── orchestrator/
│       └── SKILL.md
└── ...
```

**Struttura SBAGLIATA:**
```
orchestrator-plugin/
├── plugin.json          ← SBAGLIATO! Non viene letto qui
├── .mcp.json
└── ...
```

### Soluzione Rapida (PowerShell)

```powershell
# ═══════════════════════════════════════════════════════════════
# FIX: Crea plugin.json nella posizione CORRETTA
# ═══════════════════════════════════════════════════════════════

$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"

# 1. Crea la directory .claude-plugin se non esiste
Write-Host "Creazione directory .claude-plugin..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$pluginDir\.claude-plugin" -Force | Out-Null
Write-Host "OK" -ForegroundColor Green

# 2. Crea plugin.json nella posizione corretta
Write-Host "Creazione plugin.json..." -ForegroundColor Yellow
@'
{
  "name": "orchestrator",
  "description": "Multi-agent orchestration system with 64+ parallel agents for complex development workflows",
  "version": "2.1.0",
  "author": {
    "name": "LeoDg"
  },
  "skills": [
    {
      "name": "orchestrator",
      "description": "Main orchestration command - coordinate multiple expert agents",
      "command": "/orchestrator",
      "file": "../skills/orchestrator/SKILL.md"
    }
  ]
}
'@ | Out-File -FilePath "$pluginDir\.claude-plugin\plugin.json" -Encoding UTF8 -Force
Write-Host "OK" -ForegroundColor Green

# 3. Verifica
Write-Host ""
Write-Host "Verifica..." -ForegroundColor Cyan
if (Test-Path "$pluginDir\.claude-plugin\plugin.json") {
    Write-Host "[OK] plugin.json creato in: $pluginDir\.claude-plugin\plugin.json" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Errore nella creazione" -ForegroundColor Red
}

# 4. Mostra contenuto
Write-Host ""
Write-Host "Contenuto plugin.json:" -ForegroundColor Cyan
Get-Content "$pluginDir\.claude-plugin\plugin.json"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "FIX COMPLETATO! Ora:" -ForegroundColor Green
Write-Host "  1. Chiudi VS Code completamente (File > Exit)" -ForegroundColor Yellow
Write-Host "  2. Riapri VS Code" -ForegroundColor Yellow
Write-Host "  3. Prova: /orchestrator test" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
```

### Verifica Post-Fix

```powershell
# Verifica che plugin.json sia nella posizione corretta
$correctPath = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.claude-plugin\plugin.json"
$wrongPath = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\plugin.json"

Write-Host "Verifica posizione plugin.json:" -ForegroundColor Cyan

if (Test-Path $correctPath) {
    Write-Host "[OK] plugin.json in .claude-plugin/ (CORRETTO)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] plugin.json NON in .claude-plugin/" -ForegroundColor Red
}

if (Test-Path $wrongPath) {
    Write-Host "[WARN] plugin.json in root (posizione sbagliata, verra' ignorato)" -ForegroundColor Yellow
}
```

### Se Hai un Backup

Se hai un backup in `_backup_claude-plugin/plugin.json`, puoi copiarlo:

```powershell
# Copia da backup
$backupPath = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\_backup_claude-plugin\plugin.json"
$targetPath = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin\.claude-plugin\plugin.json"

if (Test-Path $backupPath) {
    # Crea directory target
    New-Item -ItemType Directory -Path (Split-Path $targetPath) -Force | Out-Null

    # Copia
    Copy-Item $backupPath $targetPath -Force

    Write-Host "plugin.json copiato da backup" -ForegroundColor Green
} else {
    Write-Host "Backup non trovato, usa lo script di creazione sopra" -ForegroundColor Yellow
}
```

---

## CHECKLIST COMPLETA PRE-ATTIVAZIONE

Esegui questo script per verificare TUTTI i requisiti:

```powershell
# ═══════════════════════════════════════════════════════════════
# CHECKLIST COMPLETA ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CHECKLIST COMPLETA - ORCHESTRATOR PLUGIN                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$pluginDir = "$env:USERPROFILE\.claude\plugins\orchestrator-plugin"
$allOk = $true

# Lista file richiesti con descrizione
$requiredFiles = @(
    @{
        Path = "$env:USERPROFILE\.claude\settings.local.json"
        Name = "settings.local.json"
        Desc = "Abilita il server MCP"
        Critical = $true
    },
    @{
        Path = "$pluginDir\.claude-plugin\plugin.json"
        Name = ".claude-plugin/plugin.json"
        Desc = "Definisce il plugin e registra la skill"
        Critical = $true
    },
    @{
        Path = "$pluginDir\.mcp.json"
        Name = ".mcp.json"
        Desc = "Configura il server MCP"
        Critical = $true
    },
    @{
        Path = "$pluginDir\skills\orchestrator\SKILL.md"
        Name = "skills/orchestrator/SKILL.md"
        Desc = "Definisce il comportamento di /orchestrator"
        Critical = $true
    },
    @{
        Path = "$pluginDir\mcp_server\server.py"
        Name = "mcp_server/server.py"
        Desc = "Server MCP Python"
        Critical = $false
    }
)

foreach ($file in $requiredFiles) {
    $status = if (Test-Path $file.Path) { "[OK]" } else { "[FAIL]" }
    $color = if (Test-Path $file.Path) { "Green" } else { "Red" }

    Write-Host "$status $($file.Name)" -ForegroundColor $color
    Write-Host "      $($file.Desc)" -ForegroundColor Gray

    if (-not (Test-Path $file.Path) -and $file.Critical) {
        $allOk = $false
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($allOk) {
    Write-Host "TUTTI I FILE CRITICI PRESENTI!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prossimi passi:" -ForegroundColor Yellow
    Write-Host "  1. Chiudi VS Code completamente" -ForegroundColor White
    Write-Host "  2. Riapri VS Code" -ForegroundColor White
    Write-Host "  3. Digita: /orchestrator test" -ForegroundColor White
} else {
    Write-Host "FILE MANCANTI! Esegui lo script FIX COMPLETO" -ForegroundColor Red
}

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
```

---

## SCRIPT MASTER: FIX COMPLETO ONE-SHOT

Questo script crea/ricrea TUTTI i file necessari in un colpo solo:

```powershell
# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR MASTER FIX - CREA TUTTO DA ZERO
# Esegui questo script per configurare completamente il plugin
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   ORCHESTRATOR MASTER FIX v2.1                             ║" -ForegroundColor Magenta
Write-Host "║   Crea tutti i file necessari da zero                      ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

$claudeDir = "$env:USERPROFILE\.claude"
$pluginDir = "$claudeDir\plugins\orchestrator-plugin"

# ─────────────────────────────────────────────────────────────────
# STEP 1: Crea tutte le directory
# ─────────────────────────────────────────────────────────────────
Write-Host "[1/5] Creazione struttura directory..." -ForegroundColor Yellow

$directories = @(
    $claudeDir,
    "$claudeDir\plugins",
    $pluginDir,
    "$pluginDir\.claude-plugin",
    "$pluginDir\skills",
    "$pluginDir\skills\orchestrator",
    "$pluginDir\mcp_server",
    "$pluginDir\config"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
Write-Host "       OK - Directory create" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────
# STEP 2: Crea settings.local.json
# ─────────────────────────────────────────────────────────────────
Write-Host "[2/5] Creazione settings.local.json..." -ForegroundColor Yellow

@'
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
'@ | Out-File -FilePath "$claudeDir\settings.local.json" -Encoding UTF8 -Force

Write-Host "       OK - $claudeDir\settings.local.json" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────
# STEP 3: Crea .claude-plugin/plugin.json (CRITICO!)
# ─────────────────────────────────────────────────────────────────
Write-Host "[3/5] Creazione .claude-plugin/plugin.json..." -ForegroundColor Yellow

@'
{
  "name": "orchestrator",
  "description": "Multi-agent orchestration system with 64+ parallel agents for complex development workflows",
  "version": "2.1.0",
  "author": {
    "name": "LeoDg"
  },
  "skills": [
    {
      "name": "orchestrator",
      "description": "Main orchestration command - coordinate multiple expert agents",
      "command": "/orchestrator",
      "file": "../skills/orchestrator/SKILL.md"
    }
  ]
}
'@ | Out-File -FilePath "$pluginDir\.claude-plugin\plugin.json" -Encoding UTF8 -Force

Write-Host "       OK - $pluginDir\.claude-plugin\plugin.json" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────
# STEP 4: Crea .mcp.json
# ─────────────────────────────────────────────────────────────────
Write-Host "[4/5] Creazione .mcp.json..." -ForegroundColor Yellow

$serverPathEscaped = "$pluginDir\mcp_server\server.py" -replace '\\', '\\\\'

@"
{
  "orchestrator": {
    "command": "python",
    "args": ["$serverPathEscaped"]
  }
}
"@ | Out-File -FilePath "$pluginDir\.mcp.json" -Encoding UTF8 -Force

Write-Host "       OK - $pluginDir\.mcp.json" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────
# STEP 5: Crea skills/orchestrator/SKILL.md (IL PIU' IMPORTANTE!)
# ─────────────────────────────────────────────────────────────────
Write-Host "[5/5] Creazione skills/orchestrator/SKILL.md..." -ForegroundColor Yellow

@'
# Orchestrator Skill

<orchestrator-command>

## Comportamento

Sei l'ORCHESTRATOR v4.2 ENHANCED - Sistema di orchestrazione **MULTI-TUTTO** unificato con Risk Assessment, Fallback Chain, Real-time Monitoring e Quality Gate.

**FILOSOFIA FONDAMENTALE: MULTI-TUTTO AD OGNI LIVELLO**
- Multi-Task: Ogni richiesta si decompone in N task paralleli
- Multi-Sub-Task: Ogni task si decompone in N sub-task paralleli
- Multi-Agent: Ogni task usa l'agent ottimale
- Multi-Sub-Agent: Ogni agent puo' delegare a sub-agent specialistici
- Multi-Parallelismo: Niente e' sequenziale se puo' essere parallelo

**REGOLA D'ORO: RISPETTA SEMPRE LE DIPENDENZE**
- Task con dipendenze -> Sequenziale solo se necessario
- Task indipendenti -> SEMPRE parallelo

Quando l'utente invoca questo comando:

### STEP 1: Analisi Task

Analizza la richiesta ed estrai:
- **Keywords**: parole chiave del dominio
- **Domini**: aree di competenza richieste
- **Complessita**: bassa/media/alta

### STEP 2: Selezione Agenti

| Keyword | Agent Expert File | Model | Priority |
|---------|------------------|-------|----------|
| gui, pyqt5, qt, widget, ui | experts/gui-super-expert.md | sonnet | ALTA |
| database, sql, sqlite, query | experts/database_expert.md | sonnet | ALTA |
| security, auth, jwt, encryption | experts/security_unified_expert.md | opus | CRITICA |
| api, telegram, webhook, rest | experts/integration_expert.md | sonnet | ALTA |
| architecture, design, refactor | experts/architect_expert.md | opus | ALTA |
| test, debug, bug, fix | experts/tester_expert.md | sonnet | ALTA |
| devops, docker, deploy, ci/cd | experts/devops_expert.md | haiku | MEDIA |
| mql, mql5, mt5, metatrader | experts/mql_expert.md | sonnet | ALTA |
| trading, strategy, risk | experts/trading_strategy_expert.md | sonnet | ALTA |
| document, docs, readme | core/documenter.md | haiku | MEDIA |
| analyze, explore, search | core/analyzer.md | sonnet | MEDIA |
| code, implement, feature | core/coder.md | sonnet | MEDIA |
| review, validate | core/reviewer.md | sonnet | MEDIA |

### STEP 3: Mostra Piano di Esecuzione

PRIMA di eseguire, mostra SEMPRE la tabella:

```
ORCHESTRATOR v4.2 - EXECUTION PLAN
==================================

TASK: [descrizione task]
- Complessita: [bassa/media/alta]
- Domini: [lista domini]
- Agenti Totali: [numero]

AGENT TABLE
| # | Task | Expert File | Model | Priority |
|---|------|-------------|-------|----------|
| T1 | ... | ... | ... | ... |
| T2 | ... | ... | ... | ... |

EXECUTION STRATEGY:
- Wave 1 (Parallel): T1, T2, T3...
- Wave 2 (After Wave 1): T4, T5...
- Documenter (Final): Tn
```

### STEP 4: Esecuzione Parallela

Usa il Task tool per lanciare gli agenti in parallelo.

### STEP 5: Documentazione (REGOLA #5)

SEMPRE alla fine, documenta le modifiche.

## Regole Fondamentali

1. **MAI** codificare direttamente - DELEGA agli agenti
2. **SEMPRE** mostrare tabella PRIMA di eseguire
3. **MASSIMO** parallelismo per task indipendenti
4. **RISPETTA** SEMPRE le dipendenze tra task
5. **SEMPRE** concludere con documentazione

## Uso

`/orchestrator <descrizione task>`

Esempio:
- `/orchestrator Aggiungi login OAuth2 con JWT`
- `/orchestrator Crea GUI PyQt5 per gestione inventario`
- `/orchestrator Fix bug nella connessione database`
- `/orchestrator Refactoring del modulo di autenticazione`

</orchestrator-command>
'@ | Out-File -FilePath "$pluginDir\skills\orchestrator\SKILL.md" -Encoding UTF8 -Force

Write-Host "       OK - $pluginDir\skills\orchestrator\SKILL.md" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────
# VERIFICA FINALE
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "VERIFICA FILE CREATI:" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "$claudeDir\settings.local.json",
    "$pluginDir\.claude-plugin\plugin.json",
    "$pluginDir\.mcp.json",
    "$pluginDir\skills\orchestrator\SKILL.md"
)

$allOk = $true
foreach ($f in $files) {
    if (Test-Path $f) {
        $size = (Get-Item $f).Length
        Write-Host "[OK] $(Split-Path $f -Leaf) ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $(Split-Path $f -Leaf)" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($allOk) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   CONFIGURAZIONE COMPLETATA CON SUCCESSO!                  ║" -ForegroundColor Green
    Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║                                                             ║" -ForegroundColor Green
    Write-Host "║   PROSSIMI PASSI:                                          ║" -ForegroundColor Green
    Write-Host "║                                                             ║" -ForegroundColor Green
    Write-Host "║   1. CHIUDI VS Code completamente (File > Exit)            ║" -ForegroundColor Yellow
    Write-Host "║   2. Riapri VS Code                                        ║" -ForegroundColor Yellow
    Write-Host "║   3. Apri una nuova sessione Claude Code                   ║" -ForegroundColor Yellow
    Write-Host "║   4. Digita: /orchestrator test                            ║" -ForegroundColor Yellow
    Write-Host "║                                                             ║" -ForegroundColor Green
    Write-Host "║   Se funziona, vedrai il piano di orchestrazione!          ║" -ForegroundColor Green
    Write-Host "║                                                             ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "ERRORE: Alcuni file non sono stati creati." -ForegroundColor Red
    Write-Host "Verifica i permessi della cartella." -ForegroundColor Yellow
}
```

---

## RIFERIMENTI DIAGNOSI

Questo documento e' stato integrato con le informazioni dalla diagnosi del problema su VPS Windows:
- **File diagnosi:** `docs/DIAGNOSI-ORCHESTRATOR.md`
- **Problema principale:** Cartella `_backup_claude-plugin/` invece di `.claude-plugin/`
- **Problema secondario:** Formato `allowed-tools` in JSON array invece di stringa

---

**Documento aggiornato:** 2026-02-02
**Versione:** 2.2.0
**Autore:** LeoDg
**Ultima modifica:** Integrazione fix per VPS Windows (nome cartella .claude-plugin)
