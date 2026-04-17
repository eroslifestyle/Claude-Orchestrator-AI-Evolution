# fix-windows-claude.ps1
# Repara Claude Code su Windows (PowerShell + VSCode) dopo modifiche rotte a ~/.claude
#
# Uso:
#   .\fix-windows-claude.ps1                 # default: profilo ccg (GLM-5 via Z.AI)
#   .\fix-windows-claude.ps1 -Profile cca    # profilo Anthropic nativo
#   .\fix-windows-claude.ps1 -Profile ccg    # profilo GLM-5 via Z.AI
#   .\fix-windows-claude.ps1 -CleanTodos     # svuota anche la cartella todos corrotti
#   .\fix-windows-claude.ps1 -DryRun         # mostra cosa farebbe senza scrivere

[CmdletBinding()]
param(
    [ValidateSet("cca", "ccg")]
    [string]$Profile = "cca",

    [string]$ZaiToken = "8c56cd4653d140508b0d1b8330821c8b.ga76G1dlgYjv7l3n",

    [switch]$CleanTodos,
    [switch]$ResetMcp,
    [switch]$Nuke,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$claudeDir    = Join-Path $env:USERPROFILE ".claude"
$settingsPath = Join-Path $claudeDir "settings.json"
$localPath    = Join-Path $claudeDir "settings.local.json"
$todosDir     = Join-Path $claudeDir "todos"
$mcpPath      = Join-Path $claudeDir ".mcp.json"
$mcpPath2     = Join-Path $claudeDir "mcp.json"
$claudeJson   = Join-Path $env:USERPROFILE ".claude.json"   # global config cache

Write-Host ""
Write-Host "=== Claude Code Windows Fixer ===" -ForegroundColor Cyan
Write-Host "  Profilo       : $Profile"
Write-Host "  .claude dir   : $claudeDir"
Write-Host "  settings.json : $settingsPath"
Write-Host "  ResetMcp      : $ResetMcp"
Write-Host "  CleanTodos    : $CleanTodos"
Write-Host "  Nuke          : $Nuke"
Write-Host "  DryRun        : $DryRun"
Write-Host ""

# --- Pre-flight: is claude CLI installed? -------------------------------------
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCmd) {
    Write-Host "[OK] claude binary trovato: $($claudeCmd.Source)" -ForegroundColor Green
    try {
        $ver = & claude --version 2>&1 | Out-String
        Write-Host "     Versione: $($ver.Trim())" -ForegroundColor DarkGray
    } catch {
        Write-Host "[WARN] claude --version ha fallito: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERR] 'claude' non trovato nel PATH. Reinstalla:" -ForegroundColor Red
    Write-Host "      npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
}
Write-Host ""

# --- Validate JSON files before touching them ---------------------------------
function Test-JsonFile($path) {
    if (-not (Test-Path $path)) { return @{ exists=$false; valid=$true; error=$null } }
    try {
        Get-Content $path -Raw | ConvertFrom-Json -ErrorAction Stop | Out-Null
        return @{ exists=$true; valid=$true; error=$null }
    } catch {
        return @{ exists=$true; valid=$false; error=$_.Exception.Message }
    }
}

Write-Host "--- Diagnostica JSON config ---" -ForegroundColor Cyan
foreach ($p in @($settingsPath, $localPath, $mcpPath, $mcpPath2, $claudeJson)) {
    $r = Test-JsonFile $p
    if (-not $r.exists)      { Write-Host "  [--] $p (assente)" -ForegroundColor DarkGray }
    elseif ($r.valid)        { Write-Host "  [OK] $p" -ForegroundColor Green }
    else {
        Write-Host "  [BAD] $p" -ForegroundColor Red
        Write-Host "        $($r.error)" -ForegroundColor Red
    }
}
Write-Host ""

if (-not (Test-Path $claudeDir)) {
    if ($DryRun) {
        Write-Host "[DRY] Creerei $claudeDir" -ForegroundColor Yellow
    } else {
        New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
        Write-Host "[OK] Creato $claudeDir" -ForegroundColor Green
    }
}

# --- Backup existing settings -------------------------------------------------
function Backup-File($path) {
    if (Test-Path $path) {
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $bak = "$path.bak.$stamp"
        if ($DryRun) {
            Write-Host "[DRY] Backup: $path -> $bak" -ForegroundColor Yellow
        } else {
            Copy-Item $path $bak -Force
            Write-Host "[OK] Backup -> $bak" -ForegroundColor Green
        }
    }
}

Backup-File $settingsPath
Backup-File $localPath

# --- Build clean settings -----------------------------------------------------
$permissions = [ordered]@{
    allow = @(
        "Bash(*)", "Read(*)", "Write(*)", "Edit(*)", "MultiEdit(*)",
        "Glob(*)", "Grep(*)", "WebSearch(*)", "WebFetch(*)", "mcp__*"
    )
    deny = @()
    defaultMode = "bypassPermissions"
}

if ($Profile -eq "ccg") {
    $settings = [ordered]@{
        env = [ordered]@{
            ANTHROPIC_BASE_URL             = "https://api.z.ai/api/anthropic"
            ANTHROPIC_AUTH_TOKEN           = $ZaiToken
            ANTHROPIC_DEFAULT_HAIKU_MODEL  = "glm-4.5-air"
            ANTHROPIC_DEFAULT_SONNET_MODEL = "glm-4.7"
            ANTHROPIC_DEFAULT_OPUS_MODEL   = "glm-5"
            API_TIMEOUT_MS                 = "600000"
        }
        permissions        = $permissions
        includeCoAuthoredBy = $false
    }
} else {
    # cca - Anthropic nativo: nessun override di BASE_URL / token
    $settings = [ordered]@{
        permissions        = $permissions
        includeCoAuthoredBy = $false
    }
}

$json = $settings | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "--- New settings.json ---" -ForegroundColor Cyan
Write-Host $json
Write-Host "-------------------------" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY] Scriverei $settingsPath" -ForegroundColor Yellow
} else {
    # UTF-8 senza BOM (Claude Code non digerisce bene il BOM in JSON)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($settingsPath, $json, $utf8NoBom)
    Write-Host "[OK] Scritto $settingsPath" -ForegroundColor Green
}

# --- Remove stale settings.local.json that may carry bogus keys ---------------
if (Test-Path $localPath) {
    try {
        $local = Get-Content $localPath -Raw | ConvertFrom-Json
        $badKeys = @("dangerouslySkipPermissions", "autoApproveEverything",
                     "profile", "orchestrator", "security")
        $hasBad = $false
        foreach ($k in $badKeys) {
            if ($local.PSObject.Properties.Name -contains $k) { $hasBad = $true; break }
        }
        if ($hasBad) {
            if ($DryRun) {
                Write-Host "[DRY] Rimuoverei chiavi invalide da $localPath" -ForegroundColor Yellow
            } else {
                foreach ($k in $badKeys) {
                    if ($local.PSObject.Properties.Name -contains $k) {
                        $local.PSObject.Properties.Remove($k)
                    }
                }
                $utf8NoBom = New-Object System.Text.UTF8Encoding $false
                [System.IO.File]::WriteAllText(
                    $localPath,
                    ($local | ConvertTo-Json -Depth 10),
                    $utf8NoBom
                )
                Write-Host "[OK] Ripulito $localPath" -ForegroundColor Green
            }
        } else {
            Write-Host "[SKIP] $localPath gia' pulito" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "[WARN] Impossibile parsare $localPath, lo rinomino" -ForegroundColor Yellow
        if (-not $DryRun) {
            Move-Item $localPath "$localPath.broken" -Force
        }
    }
}

# --- Reset MCP config if requested (or if it fails JSON parsing) --------------
function Reset-IfBroken($path) {
    if (-not (Test-Path $path)) { return }
    $r = Test-JsonFile $path
    if (-not $r.valid -or $ResetMcp) {
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $bak = "$path.bak.$stamp"
        if ($DryRun) {
            Write-Host "[DRY] Rinominerei $path -> $bak" -ForegroundColor Yellow
        } else {
            Move-Item $path $bak -Force
            Write-Host "[OK] MCP resettato: $path -> $bak" -ForegroundColor Green
        }
    }
}
Reset-IfBroken $mcpPath
Reset-IfBroken $mcpPath2

# --- Global config cache (.claude.json) ---------------------------------------
# Se corrotto, Claude Code non si avvia affatto.
$r = Test-JsonFile $claudeJson
if ($r.exists -and -not $r.valid) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $bak = "$claudeJson.bak.$stamp"
    if ($DryRun) {
        Write-Host "[DRY] Rinominerei .claude.json corrotto -> $bak" -ForegroundColor Yellow
    } else {
        Move-Item $claudeJson $bak -Force
        Write-Host "[OK] .claude.json corrotto spostato -> $bak" -ForegroundColor Green
    }
}

# --- Nuke: reset totale (mantiene solo backup) --------------------------------
if ($Nuke) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $nukeBackup = Join-Path $env:USERPROFILE ".claude.nuked.$stamp"
    if ($DryRun) {
        Write-Host "[DRY] Sposterei $claudeDir -> $nukeBackup (NUKE)" -ForegroundColor Yellow
    } else {
        if (Test-Path $claudeDir) {
            Move-Item $claudeDir $nukeBackup -Force
            Write-Host "[OK] NUKE: $claudeDir -> $nukeBackup" -ForegroundColor Green
            New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
            # riscrivi solo settings.json pulito
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($settingsPath, $json, $utf8NoBom)
            Write-Host "[OK] Riscritto settings.json pulito" -ForegroundColor Green
        }
    }
}

# --- Optionally clean todos ---------------------------------------------------
if ($CleanTodos -and (Test-Path $todosDir)) {
    $count = (Get-ChildItem $todosDir -File -ErrorAction SilentlyContinue).Count
    if ($DryRun) {
        Write-Host "[DRY] Svuoterei $todosDir ($count file)" -ForegroundColor Yellow
    } else {
        Get-ChildItem $todosDir -File -ErrorAction SilentlyContinue | Remove-Item -Force
        Write-Host "[OK] Svuotato $todosDir ($count file rimossi)" -ForegroundColor Green
    }
}

# --- Verify API reachability --------------------------------------------------
Write-Host ""
Write-Host "--- Verifica connettivita' API ---" -ForegroundColor Cyan
$target = if ($Profile -eq "ccg") { "https://api.z.ai/api/anthropic" }
          else                    { "https://api.anthropic.com" }
try {
    $resp = Invoke-WebRequest -Uri $target -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] $target raggiungibile (HTTP $($resp.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[WARN] $target non risponde: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "       Verifica rete / firewall / token." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host "Prossimi passi:" -ForegroundColor White
Write-Host "  1. Chiudi COMPLETAMENTE VSCode e ogni terminale PowerShell"
Write-Host "  2. Riapri PowerShell e lancia:  claude --version"
Write-Host "  3. Se parte, lancia:  claude"
Write-Host ""
Write-Host "Se NON si avvia ancora, escalation:" -ForegroundColor Yellow
Write-Host "  .\fix-windows-claude.ps1 -ResetMcp                  # resetta MCP servers"
Write-Host "  .\fix-windows-claude.ps1 -CleanTodos -ResetMcp      # + svuota todos"
Write-Host "  .\fix-windows-claude.ps1 -Nuke                      # reset totale ~/.claude"
Write-Host ""
Write-Host "Debug startup:"
Write-Host "  `$env:ANTHROPIC_LOG='debug'; claude --version"
Write-Host ""
