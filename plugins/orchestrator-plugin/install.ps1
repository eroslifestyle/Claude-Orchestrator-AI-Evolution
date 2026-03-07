# install.ps1 - Orchestrator Plugin Installer for Windows
# Run: irm https://raw.githubusercontent.com/eroslifestyle/orchestrator-plugin/main/install.ps1 | iex

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host @"

==============================================================
     ORCHESTRATOR PLUGIN INSTALLER v2.1.0
     Multi-Agent Orchestration for Claude Code
==============================================================

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
        throw "Python 3.10+ required, found: $pyVer"
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
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      OK: UV already installed ($uvVer)" -ForegroundColor Green
    } else {
        throw "UV not found"
    }
} catch {
    Write-Host "      Installing UV via pip..." -ForegroundColor Yellow
    pip install uv --quiet

    # Verify installation
    $uvCheck = uv --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      OK: UV installed ($uvCheck)" -ForegroundColor Green
    } else {
        Write-Host "      FAIL: UV installation failed" -ForegroundColor Red
        Write-Host "      Try manual install: pip install uv" -ForegroundColor Yellow
        exit 1
    }
}

# Step 3: Create directories
Write-Host "[3/6] Creating directories..." -ForegroundColor Yellow
if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}
if (-not (Test-Path $pluginsDir)) {
    New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
}
Write-Host "      OK: Directories created" -ForegroundColor Green

# Step 4: Clone/Update repository
Write-Host "[4/6] Downloading Orchestrator Plugin..." -ForegroundColor Yellow
if (Test-Path $orchestratorDir) {
    if ($Force) {
        Write-Host "      Removing existing installation..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $orchestratorDir
        git clone https://github.com/eroslifestyle/orchestrator-plugin.git $orchestratorDir 2>&1 | Out-Null
    } else {
        Write-Host "      Updating existing installation..." -ForegroundColor Yellow
        Push-Location $orchestratorDir
        git pull origin main 2>&1 | Out-Null
        Pop-Location
    }
} else {
    git clone https://github.com/eroslifestyle/orchestrator-plugin.git $orchestratorDir 2>&1 | Out-Null
}

if (Test-Path $orchestratorDir) {
    Write-Host "      OK: Plugin downloaded" -ForegroundColor Green
} else {
    Write-Host "      FAIL: Clone failed" -ForegroundColor Red
    exit 1
}

# Step 5: Create/Update settings.local.json
Write-Host "[5/6] Configuring Claude Code..." -ForegroundColor Yellow

$settings = @{
    enabledMcpjsonServers = @("orchestrator")
    enableAllProjectMcpServers = $true
}

if (Test-Path $settingsPath) {
    # Merge with existing settings
    try {
        $existingSettings = Get-Content $settingsPath -Raw | ConvertFrom-Json

        # Add orchestrator to list if not present
        if ($existingSettings.enabledMcpjsonServers -notcontains "orchestrator") {
            $existingSettings.enabledMcpjsonServers += "orchestrator"
        }

        $existingSettings | ConvertTo-Json -Depth 10 | Out-File -FilePath $settingsPath -Encoding UTF8 -Force
        Write-Host "      OK: settings.local.json updated (merged)" -ForegroundColor Green
    } catch {
        # If parsing fails, overwrite
        $settings | ConvertTo-Json | Out-File -FilePath $settingsPath -Encoding UTF8 -Force
        Write-Host "      OK: settings.local.json created (new)" -ForegroundColor Green
    }
} else {
    $settings | ConvertTo-Json | Out-File -FilePath $settingsPath -Encoding UTF8 -Force
    Write-Host "      OK: settings.local.json created" -ForegroundColor Green
}

# Step 6: Create skills directory and SKILL.md
Write-Host "[6/6] Setting up skills..." -ForegroundColor Yellow
$skillsDir = "$orchestratorDir\skills\orchestrator"

if (-not (Test-Path $skillsDir)) {
    New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null
}

$skillContent = @'
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
- Multi-Tutto: Ogni fase, ogni livello, massima parallelizzazione

**REGOLA D'ORO: RISPETTA SEMPRE LE DIPENDENZE**
- Task con dipendenze -> Sequenziale solo se necessario (T1 -> T2 -> T3)
- Task indipendenti -> SEMPRE parallelo (T1, T2, T3 insieme)

## Selezione Agenti

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

## Regole Fondamentali

1. **MAI** codificare direttamente - delega SEMPRE agli agenti
2. **SEMPRE** mostrare la tabella PRIMA di eseguire
3. **MASSIMO** parallelismo per task indipendenti
4. **RISPETTA** SEMPRE le dipendenze tra task
5. **SEMPRE** concludere con documentazione (REGOLA #5)
6. **MULTI-TUTTO** ad ogni livello, onde di parallelismo

## Uso

L'utente scrivera': `/orchestrator <descrizione task>`

Esempio:
- `/orchestrator Aggiungi login OAuth2 con JWT`
- `/orchestrator Crea GUI PyQt5 per gestione inventario`
- `/orchestrator Fix bug nella connessione database`

</orchestrator-command>
'@

$skillContent | Out-File -FilePath "$skillsDir\SKILL.md" -Encoding UTF8 -Force
Write-Host "      OK: Skill created" -ForegroundColor Green

# Verification
Write-Host "`n[VERIFICATION]" -ForegroundColor Cyan
$checks = @(
    @{ Path = $settingsPath; Name = "settings.local.json" },
    @{ Path = "$orchestratorDir\.mcp.json"; Name = ".mcp.json" },
    @{ Path = "$orchestratorDir\.claude-plugin\plugin.json"; Name = "plugin.json" },
    @{ Path = "$orchestratorDir\mcp_server\server.py"; Name = "mcp_server/server.py" },
    @{ Path = "$skillsDir\SKILL.md"; Name = "skills/orchestrator/SKILL.md" }
)

$allOk = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "  [OK] $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $($check.Name)" -ForegroundColor Red
        $allOk = $false
    }
}

# Done
if ($allOk) {
    Write-Host @"

==============================================================
     INSTALLATION COMPLETE!
==============================================================

  Next steps:
  1. Restart VS Code / Claude Code completely
  2. Test with: /orchestrator Test di verifica

  MCP Tools available after restart:
  - mcp__orchestrator__orchestrator_analyze
  - mcp__orchestrator__orchestrator_execute
  - mcp__orchestrator__orchestrator_agents
  - mcp__orchestrator__orchestrator_status
  - mcp__orchestrator__orchestrator_preview

==============================================================

"@ -ForegroundColor Green
} else {
    Write-Host @"

==============================================================
     INSTALLATION INCOMPLETE
==============================================================

  Some files are missing. Check the errors above.

  Try running with -Force flag:
  irm https://raw.githubusercontent.com/eroslifestyle/orchestrator-plugin/main/install.ps1 | iex -Force

==============================================================

"@ -ForegroundColor Yellow
}
