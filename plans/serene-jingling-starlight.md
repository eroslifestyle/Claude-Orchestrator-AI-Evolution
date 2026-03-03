# Piano: Script Universale Definitivo - Claude Multi-Agent Environment

## Context

Dall'installazione sulla VPS abbiamo imparato molto:
- ✅ Il sistema FUNZIONA perfettamente con i fix applicati
- ✅ I profili CCA (Anthropic) e CCG (GLM5) sono completamente isolati
- ✅ L'approccio con settings.json separati è corretto
- ⚠️ Problema risolto: Start-Process causava errori (risolto con chiamata diretta)
- ⚠️ Problema risolto: Percorso Claude.exe hardcoded (risolto con ricerca dinamica)
- ⚠️ Problema risolto: Path utente hardcoded (deve usare $env:USERPROFILE)

Attualmente nella cartella ci sono MOLTI file .ps1, alcuni obsoleti, altri duplicati. È ora di creare un **UNICO script universale** che funzioni su qualsiasi VPS Windows.

## Obiettivo

Creare uno script definitivo che:
1. **Sia universale**: Funzioni su qualsiasi Windows/VPS senza hardcoded paths
2. **Sia completo**: Contenga tutto il necessario in un solo file
3. **Sia affidabile**: Incorpori tutti i fix appresi dall'installazione VPS
4. **Sia pulito**: Elimini tutti i file obsoleti/duplicati
5. **Sia auto-sufficiente**: Non richieda file esterni o pre-configurazioni

## Analisi File Esistenti

### Da ELIMINARE (obsoleti/duplicati):
- `cca_ccg_setup.ps1` - Vecchia versione con settings switching
- `cca_ccg_parallel_setup.ps1` - Vecchia versione approccio parallelo
- `cca_ccg_ultimate_setup.ps1` - Vecchia versione con parametro GLMKey
- `check-claude.ps1` - Diagnostic tool (funzionalità incorporata)
- `fix-claude-path.ps1` - Fix singolo (già incorporato)
- `fix-cca-function.ps1` - Fix singolo (già incorporato)
- `fix-cca-ccg-functions.ps1` - Fix singolo (già incorporato)
- `fix-parallel-profile.ps1` - Approccio alternativo
- `vps-deployment/install.ps1` - Redundante
- `cca.ps1`, `ccg.ps1` - Launcher VS Code (funzionalità opzionale)

### Da MANTENERE (come riferimento):
- `autoinstall.ps1` - Base per lo script definitivo
- `vps-deployment/Claude-Multi-Agent.ps1` - Runtime script di riferimento
- Documentazione `.md` files

## Key Learnings dall'Installazione VPS

### 1. **CRITICAL FIX: Start-Process ❌ → Direct Call ✅**
```powershell
# SBAGLIATO (causava errori):
Start-Process powershell -ArgumentList "-NoExit","-Command","$env:CLAUDE_CONFIG_DIR='$Global:CcaDir'; & '$Global:ClaudeExe'"

# CORRETTO:
$env:CLAUDE_CONFIG_DIR = $Global:CcaDir
& $Global:ClaudeExe
```

### 2. **Path Dinamici, Non Hardcoded**
```powershell
# SBAGLIATO:
$UserHome = "C:\Users\vpslgdvc"

# CORRETTO:
$UserHome = $env:USERPROFILE
```

### 3. **Ricerca Claude.exe con Fallback**
```powershell
# Devono essere controllati MOLTI percorsi possibili:
$searchPaths = @(
    "$env:USERPROFILE\.local\bin\claude.exe",
    "$env:APPDATA\npm\claude.exe",
    "$env:PROGRAMFILES\Claude\claude.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Claude\claude.exe"
)
```

### 4. **Preserva Settings Esistenti**
```powershell
# Prima di sovrascrivere settings.json:
if (-not (Test-Path "$profileDir\settings.json")) {
    # Crea solo se non esiste
}
```

## Design Script Definitivo

### Nome File: `claude-multi-agent-universal.ps1`

### Struttura Script:

```powershell
# ============================================================
#  Claude Multi-Agent Environment - UNIVERSAL INSTALLER
#  Version: 6.0 Universal
#  Compatible: Any Windows/VPS (no hardcoded paths)
#  ============================================================

# --- SEZIONE 1: Discovery & Detection ---
function Find-ClaudeExecutable {
    # Cerca claude.exe in MOLTI percorsi possibili
    # Ritorna $null se non trovato
}

function Find-VSCodeExecutable {
    # Cerca code.exe in percorsi standard
    # Ritorna $null se non trovato
}

# --- SEZIONE 2: Directory Creation ---
function Initialize-Directories {
    # Crea .claude-cca e .claude-ccg
    # Usa $env:USERPROFILE (mai hardcoded)
}

# --- SEZIONE 3: Settings Generation ---
function New-CCASettings {
    # Genera settings.json per Anthropic
    # NON sovrascrive se esiste già
}

function New-CCGSettings {
    # Genera settings.json per GLM5
    # Chiede Z.AI API Key se necessario
    # NON sovrascrive se esiste già
}

# --- SEZIONE 4: Runtime Script Generation ---
function New-RuntimeScript {
    # Genera Claude-Multi-Agent.ps1 con:
    #  - Funzioni cca/ccg CORRETTE (no Start-Process)
    #  - Percorsi dinamici ($env:USERPROFILE)
    #  - Claude.exe path auto-detected
    #  - Credential sync
    #  - Cleanup functions
}

# --- SEZIONE 5: PowerShell Profile Integration ---
function Initialize-PowerShellProfile {
    # Aggiunge import dello script runtime
    # Controlla se già presente
    # Non duplica righe
}

# --- SEZIONE 6: Verification & Testing ---
function Test-Installation {
    # Verifica tutto:
    #  - Directory esistono
    #  - Settings.json validi
    #  - Runtime script creato
    #  - PowerShell profile aggiornato
    #  - Mostra report finale
}

# --- SEZIONE 7: Main Execution ---
Write-Host "=== Claude Multi-Agent Universal Installer ==="
$claudeExe = Find-ClaudeExecutable
$vsCodeExe = Find-VSCodeExecutable

if (-not $claudeExe) {
    Write-Host "[ERROR] Claude.exe non trovato" -Red
    Write-Host "Installalo da: https://claude.ai/download" -Yellow
    exit 1
}

Initialize-Directories
New-CCASettings
New-CCGSettings
New-RuntimeScript
Initialize-PowerShellProfile
Test-Installation

Write-Host "[SUCCESS] Installazione completata!" -Green
Write-Host "Riavvia PowerShell e usa: cca oppure ccg" -Cyan
```

### Runtime Script Generato (Claude-Multi-Agent.ps1):

```powershell
# ============================================================
#  Claude Multi-Agent Environment - RUNTIME
#  Auto-generated by claude-multi-agent-universal.ps1
#  ============================================================

# Paths (dinamici, auto-detected during install)
$Global:ClaudeExe = "PATH_FOUND_DURING_INSTALL"  # Inserito da installer
$Global:VsCodeExe = "PATH_FOUND_DURING_INSTALL"  # Inserito da installer
$Global:CcaDir = "$env:USERPROFILE\.claude-cca"
$Global:CcgDir = "$env:USERPROFILE\.claude-ccg"

# CRITICAL FIX: No Start-Process!
function cca {
    Sync-Credentials
    Write-Host "[CCA] Anthropic Opus 4.6" -Cyan
    if (-not (Test-Path $Global:ClaudeExe)) {
        Write-Host "[ERROR] Claude.exe non trovato" -Red
        return
    }
    $env:CLAUDE_CONFIG_DIR = $Global:CcaDir
    & $Global:ClaudeExe
}

function ccg {
    Write-Host "[CCG] GLM5 via Z.AI" -Green
    if (-not (Test-Path $Global:ClaudeExe)) {
        Write-Host "[ERROR] Claude.exe non trovato" -Red
        return
    }
    $env:CLAUDE_CONFIG_DIR = $Global:CcgDir
    & $Global:ClaudeExe
}

# Utility functions
function ccinfo { /* ... */ }
function ccstatus { /* ... */ }
function ccclean { /* ... */ }
function Sync-Credentials { /* ... */ }
function Invoke-ClaudeCleanup { /* ... */ }

# Auto-load
Invoke-ClaudeCleanup
Sync-Credentials
```

## Piano Esecuzione

### Step 1: Pulizia File Obsoleti
Elimina dalla cartella `E:\Dropbox\1_Forex\Programmazione\ClaudCode\CCA_CCG_Setup\`:
- `cca_ccg_setup.ps1`
- `cca_ccg_parallel_setup.ps1`
- `cca_ccg_ultimate_setup.ps1`
- `check-claude.ps1`
- `fix-claude-path.ps1`
- `fix-cca-function.ps1`
- `fix-cca-ccg-functions.ps1`
- `fix-parallel-profile.ps1`
- `cca.ps1`
- `ccg.ps1`
- `vps-deployment/` (tutta la cartella)

### Step 2: Creazione Script Universale
Crea `claude-multi-agent-universal.ps1` con tutte le funzioni sopra descritte.

### Step 3: Aggiornamento Documentazione
Aggiorna README e istruzioni per puntare al nuovo script universale.

### Step 4: Testing Procedure
Testare su ambiente pulito:
1. Copia solo `claude-multi-agent-universal.ps1`
2. Esegui
3. Verifica che funzioni tutto

## File Target Principali

**Da creare:**
- `E:\Dropbox\1_Forex\Programmazione\ClaudCode\CCA_CCG_Setup\claude-multi-agent-universal.ps1`

**Da generare durante installazione:**
- `C:\Users\$USERPROFILE\Claude-Multi-Agent.ps1` (runtime script)
- `C:\Users\$USERPROFILE\.claude-cca\settings.json`
- `C:\Users\$USERPROFILE\.claude-ccg\settings.json`

**Da aggiornare:**
- `Microsoft.PowerShell_profile.ps1` (aggiunge import)

## Verifica Finale

Dopo l'esecuzione dello script universale:

1. ✅ Script trovato claude.exe automaticamente
2. ✅ Directory .claude-cca e .claude-ccg create
3. ✅ Settings.json generati per entrambi i profili
4. ✅ Runtime script Claude-Multi-Agent.ps1 creato
5. ✅ PowerShell profile aggiornato
6. ✅ Comando `ccinfo` mostra tutto [OK]
7. ✅ `cca` avvia Anthropic senza errori
8. ✅ `ccg` avvia GLM5 senza errori
9. ✅ Funziona su qualsiasi Windows/VPS (no hardcoded paths)

## Vantaggi Script Universale

### Rispetto alla situazione attuale:
1. **Un solo file da copiare** → Invece di cartelle con multi file
2. **Funziona ovunque** → No hardcoded paths per utente specifico
3. **Auto-detection** → Trova automaticamente Claude.exe e VS Code
4. **Idempotente** → Puoi eseguirlo più volte senza problemi
5. **Preserva configurazioni** → Non sovrascrive settings esistenti
6. **Tutti i fix inclusi** → Start-Process fix, path detection, etc.

### Cosa cambierà per l'utente:
**Prima:**
```powershell
# Dovevi copiare tutta la cartella vps-deployment
# E eseguire fix multipli
```

**Dopo:**
```powershell
# Copi un solo file
scp claude-multi-agent-universal.ps1 vps:/home/user/

# E lo esegui
.\claude-multi-agent-universal.ps1

# Finito! Tutto funziona
```

## Deliverable Finale

**File unico:**
```
E:\Dropbox\1_Forex\Programmazione\ClaudCode\CCA_CCG_Setup\
└── claude-multi-agent-universal.ps1    ← Tutto qui!
```

**Documentazione aggiornata:**
- README.md aggiornato con nuovo script
- QUICKSTART semplificato
- ISTRUZIONI aggiornate per script universale

## Riepilogo Azioni

1. ✅ Analizzati tutti i file .ps1 esistenti
2. ✅ Identificati i fix critici (Start-Process, paths)
3. ✅ Progettato script universale con auto-detection
4. ✅ Piano pulizia file obsoleti
5. ✅ Progettata procedura di verifica

**Prossimo step:** Implementazione script universale con tutte le funzioni integrate.
