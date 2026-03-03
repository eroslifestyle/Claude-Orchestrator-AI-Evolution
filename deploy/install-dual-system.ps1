#Requires -Version 5.1
<#
.SYNOPSIS
    Install script for CCA/CCG dual Claude Code system.

.DESCRIPTION
    Installs the dual-profile Claude Code system (CCA/CCG) from a ZIP archive.
    Supports automatic home detection, prerequisite verification, backup creation,
    integrity verification, and MCP dependency installation.

.PARAMETER ZipPath
    Path to the source ZIP file containing the system.

.PARAMETER Profile
    Profile to configure: 'CCA' (Anthropic Claude Opus 4.6) or 'CCG' (GLM5 via Z.AI).
    Default is 'CCA'.

.PARAMETER SkipBackup
    Skip creating backup of existing ~/.claude directory.

.PARAMETER SkipDependencies
    Skip installing MCP dependencies (pip install).

.PARAMETER Force
    Force installation even if prerequisites are not fully met.

.EXAMPLE
    .\install-dual-system.ps1 -ZipPath "C:\Downloads\claude-system.zip" -Profile CCA

.EXAMPLE
    .\install-dual-system.ps1 -ZipPath ".\system.zip" -Profile CCG -SkipBackup

.NOTES
    Version: 1.0.0
    Author: CCA/CCG System
    Requires: PowerShell 5.1+, Python 3.10+, Git, Claude Code CLI
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$ZipPath,

    [Parameter(Mandatory = $false)]
    [ValidateSet("CCA", "CCG")]
    [string]$Profile = "CCA",

    [Parameter(Mandatory = $false)]
    [switch]$SkipBackup = $false,

    [Parameter(Mandatory = $false)]
    [switch]$SkipDependencies = $false,

    [Parameter(Mandatory = $false)]
    [switch]$Force = $false
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$SCRIPT_VERSION = "1.0.0"
$MIN_PYTHON_VERSION = [version]"3.10.0"
$MIN_GIT_VERSION = [version]"2.0.0"

# Colors for output
$COLOR_INFO = "Cyan"
$COLOR_SUCCESS = "Green"
$COLOR_WARNING = "Yellow"
$COLOR_ERROR = "Red"
$COLOR_HEADER = "Magenta"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
    Write-Host " $Message" -ForegroundColor $COLOR_HEADER
    Write-Host "========================================" -ForegroundColor $COLOR_HEADER
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $COLOR_INFO
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor $COLOR_SUCCESS
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $COLOR_WARNING
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $COLOR_ERROR
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Get-PythonVersion {
    try {
        $versionOutput = python --version 2>&1
        if ($versionOutput -match "(\d+\.\d+\.\d+)") {
            return [version]$matches[1]
        }
    } catch {}
    return $null
}

function Get-GitVersion {
    try {
        $versionOutput = git --version 2>&1
        if ($versionOutput -match "(\d+\.\d+\.\d+)") {
            return [version]$matches[1]
        }
    } catch {}
    return $null
}

function Get-ClaudeCodeVersion {
    try {
        $versionOutput = claude --version 2>&1
        if ($versionOutput -match "(\d+\.\d+\.\d+)") {
            return $matches[1]
        }
        return "installed"
    } catch {}
    return $null
}

function New-DirectoryIfNotExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Info "Created directory: $Path"
    }
}

function Compress-ToBackup {
    param(
        [string]$SourcePath,
        [string]$BackupPath
    )

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = Join-Path $BackupPath "claude_backup_$timestamp.zip"

    Write-Info "Creating backup: $backupFile"

    try {
        Compress-Archive -Path "$SourcePath\*" -DestinationPath $backupFile -CompressionLevel Optimal -Force
        Write-Success "Backup created successfully"
        return $backupFile
    } catch {
        Write-Error "Failed to create backup: $_"
        return $null
    }
}

function Test-HashManifest {
    param(
        [string]$ExtractPath,
        [string]$ManifestPath
    )

    if (-not (Test-Path $ManifestPath)) {
        Write-Warning "No manifest.json found, skipping integrity check"
        return $true
    }

    Write-Info "Verifying file integrity..."

    try {
        $manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
        $allValid = $true
        $checkedCount = 0
        $failedCount = 0

        foreach ($file in $manifest.files) {
            $filePath = Join-Path $ExtractPath $file.path
            if (-not (Test-Path $filePath)) {
                Write-Warning "Missing file: $($file.path)"
                $failedCount++
                $allValid = $false
                continue
            }

            $hash = Get-FileHash $filePath -Algorithm SHA256 -ErrorAction SilentlyContinue
            if ($hash -and $hash.Hash -eq $file.sha256) {
                $checkedCount++
            } else {
                Write-Warning "Hash mismatch: $($file.path)"
                $failedCount++
                $allValid = $false
            }
        }

        if ($allValid) {
            Write-Success "Integrity verified: $checkedCount files OK"
        } else {
            Write-Warning "Integrity check: $checkedCount OK, $failedCount failed"
        }

        return $allValid
    } catch {
        Write-Error "Failed to parse manifest: $_"
        return $false
    }
}

function New-Symlink {
    param(
        [string]$LinkPath,
        [string]$TargetPath
    )

    # Remove existing if present
    if (Test-Path $LinkPath) {
        Remove-Item $LinkPath -Force -Recurse -ErrorAction SilentlyContinue
    }

    # Create junction (directory symlink on Windows)
    try {
        New-Item -ItemType Junction -Path $LinkPath -Target $TargetPath -Force | Out-Null
        Write-Success "Created junction: $LinkPath -> $TargetPath"
        return $true
    } catch {
        Write-Warning "Could not create junction: $_"
        return $false
    }
}

function Install-McpDependencies {
    param([string]$ClaudePath)

    $requirementsPath = Join-Path $ClaudePath "skills\orchestrator\requirements.txt"

    if (-not (Test-Path $requirementsPath)) {
        Write-Info "No requirements.txt found, checking for pyproject.toml"
        $pyprojectPath = Join-Path $ClaudePath "skills\orchestrator\pyproject.toml"
        if (Test-Path $pyprojectPath) {
            Write-Info "Installing from pyproject.toml..."
            & pip install -e (Split-Path $pyprojectPath) 2>&1
        } else {
            Write-Info "No Python dependencies to install"
        }
        return
    }

    Write-Info "Installing MCP dependencies..."
    $result = & pip install -r $requirementsPath 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed successfully"
    } else {
        Write-Warning "Some dependencies may not have installed correctly"
        Write-Host $result
    }
}

function Set-FilePermissions {
    param([string]$Path)

    Write-Info "Setting file permissions..."

    # Ensure scripts are executable (mainly for Git Bash compatibility)
    $scriptsPath = Join-Path $Path "scripts"
    if (Test-Path $scriptsPath) {
        Get-ChildItem -Path $scriptsPath -Filter "*.sh" -Recurse | ForEach-Object {
            # On Windows, we just ensure the file is writable
            try {
                $_.Attributes = 'Normal'
            } catch {}
        }
    }

    # Ensure config files have proper permissions
    $configFiles = @(
        "CLAUDE.md",
        "settings.json",
        ".env"
    )

    foreach ($config in $configFiles) {
        $configPath = Join-Path $Path $config
        if (Test-Path $configPath) {
            try {
                $file = Get-Item $configPath
                $file.Attributes = 'Normal'
            } catch {}
        }
    }

    Write-Success "Permissions configured"
}

function Show-Summary {
    param(
        [string]$ClaudePath,
        [string]$Profile,
        [hashtable]$Prereqs,
        [bool]$BackupCreated,
        [string]$BackupFile
    )

    Write-Header "INSTALLATION SUMMARY"

    Write-Host ""
    Write-Host "System Version:    V12.0.3 (Full Coherence)" -ForegroundColor $COLOR_INFO
    Write-Host "Profile:           $Profile" -ForegroundColor $COLOR_INFO
    Write-Host "Install Path:      $ClaudePath" -ForegroundColor $COLOR_INFO
    Write-Host ""

    Write-Host "Prerequisites:" -ForegroundColor $COLOR_INFO
    Write-Host "  Python:          $($Prereqs.Python)" -ForegroundColor $(if ($Prereqs.Python -ne "OK") { $COLOR_WARNING } else { $COLOR_SUCCESS })
    Write-Host "  Git:             $($Prereqs.Git)" -ForegroundColor $(if ($Prereqs.Git -ne "OK") { $COLOR_WARNING } else { $COLOR_SUCCESS })
    Write-Host "  Claude Code CLI: $($Prereqs.ClaudeCode)" -ForegroundColor $(if ($Prereqs.ClaudeCode -ne "OK") { $COLOR_WARNING } else { $COLOR_SUCCESS })
    Write-Host ""

    if ($BackupCreated) {
        Write-Host "Backup:            $BackupFile" -ForegroundColor $COLOR_SUCCESS
    } else {
        Write-Host "Backup:            Skipped" -ForegroundColor $COLOR_WARNING
    }
    Write-Host ""

    Write-Host "Agents:            43 (6 core + 22 L1 + 15 L2)" -ForegroundColor $COLOR_INFO
    Write-Host "Skills:            26 (7 core + 8 workflow + 6 utility + 3 language + 2 learning)" -ForegroundColor $COLOR_INFO
    Write-Host "Rules:             10 files (common, python, typescript, go)" -ForegroundColor $COLOR_INFO
    Write-Host ""

    Write-Host "Next Steps:" -ForegroundColor $COLOR_HEADER
    Write-Host "  1. Restart your terminal or run: refreshenv" -ForegroundColor $COLOR_INFO
    Write-Host "  2. Verify installation: claude --version" -ForegroundColor $COLOR_INFO
    Write-Host "  3. Test orchestrator: /orchestrator [task]" -ForegroundColor $COLOR_INFO
    Write-Host ""

    if ($Profile -eq "CCG") {
        Write-Host "Note: CCG profile uses GLM5 via Z.AI" -ForegroundColor $COLOR_WARNING
        Write-Host "      Ensure Z.AI credentials are configured" -ForegroundColor $COLOR_WARNING
    }
    Write-Host ""
}

# ============================================================================
# MAIN INSTALLATION
# ============================================================================

function Main {
    Write-Header "CCA/CCG Dual System Installer v$SCRIPT_VERSION"
    Write-Info "Profile: $Profile"

    # Step 1: Detect home directory
    Write-Header "Step 1: Detecting Home Directory"

    $homePath = $env:USERPROFILE
    if ([string]::IsNullOrEmpty($homePath)) {
        $homePath = $env:HOME
    }
    if ([string]::IsNullOrEmpty($homePath)) {
        Write-Error "Could not detect home directory"
        exit 1
    }

    $claudePath = Join-Path $homePath ".claude"
    Write-Success "Home directory: $homePath"
    Write-Success "Target path: $claudePath"

    # Step 2: Validate ZIP file
    Write-Header "Step 2: Validating Source ZIP"

    if (-not (Test-Path $ZipPath)) {
        Write-Error "ZIP file not found: $ZipPath"
        exit 1
    }

    $zipItem = Get-Item $ZipPath
    if ($zipItem.Extension -ne ".zip") {
        Write-Error "File is not a ZIP archive: $ZipPath"
        exit 1
    }

    Write-Success "ZIP file validated: $ZipPath ($(('{0:N2}' -f ($zipItem.Length / 1MB))) MB)"

    # Step 3: Check prerequisites
    Write-Header "Step 3: Checking Prerequisites"

    $prereqs = @{
        Python = "NOT FOUND"
        Git = "NOT FOUND"
        ClaudeCode = "NOT FOUND"
    }

    # Check Python
    $pythonVersion = Get-PythonVersion
    if ($pythonVersion) {
        if ($pythonVersion -ge $MIN_PYTHON_VERSION) {
            $prereqs.Python = "OK (v$pythonVersion)"
            Write-Success "Python: v$pythonVersion"
        } else {
            $prereqs.Python = "OUTDATED (v$pythonVersion, need $MIN_PYTHON_VERSION)"
            Write-Warning "Python version outdated: v$pythonVersion (need $MIN_PYTHON_VERSION)"
        }
    } else {
        Write-Warning "Python not found"
    }

    # Check Git
    $gitVersion = Get-GitVersion
    if ($gitVersion) {
        $prereqs.Git = "OK (v$gitVersion)"
        Write-Success "Git: v$gitVersion"
    } else {
        Write-Warning "Git not found"
    }

    # Check Claude Code CLI
    $claudeVersion = Get-ClaudeCodeVersion
    if ($claudeVersion) {
        $prereqs.ClaudeCode = "OK (v$claudeVersion)"
        Write-Success "Claude Code CLI: v$claudeVersion"
    } else {
        Write-Warning "Claude Code CLI not found"
    }

    # Check if we should proceed
    if (-not $Force) {
        $missingPrereqs = @($prereqs.Values | Where-Object { $_ -like "NOT FOUND*" -or $_ -like "OUTDATED*" })
        if ($missingPrereqs.Count -gt 0) {
            Write-Error "Missing prerequisites. Use -Force to install anyway."
            exit 1
        }
    } else {
        Write-Warning "Force mode enabled, proceeding despite missing prerequisites"
    }

    # Step 4: Create backup if needed
    $backupCreated = $false
    $backupFile = $null

    if (-not $SkipBackup -and (Test-Path $claudePath)) {
        Write-Header "Step 4: Creating Backup"

        $backupDir = Join-Path $homePath ".claude_backups"
        New-DirectoryIfNotExists $backupDir

        $backupFile = Compress-ToBackup -SourcePath $claudePath -BackupPath $backupDir
        if ($backupFile) {
            $backupCreated = $true
        }
    } elseif ($SkipBackup) {
        Write-Info "Skipping backup as requested"
    } else {
        Write-Info "No existing installation to backup"
    }

    # Step 5: Extract ZIP
    Write-Header "Step 5: Extracting Files"

    $tempExtractPath = Join-Path $env:TEMP "claude_extract_$(Get-Date -Format 'yyyyMMddHHmmss')"

    try {
        # Create temp extraction directory
        New-DirectoryIfNotExists $tempExtractPath

        Write-Info "Extracting to temporary location..."
        Expand-Archive -Path $ZipPath -DestinationPath $tempExtractPath -Force

        # Find the actual content (might be in a subfolder)
        $extractedItems = Get-ChildItem $tempExtractPath

        if ($extractedItems.Count -eq 1 -and $extractedItems[0].PSIsContainer) {
            # ZIP contained a single folder
            $sourceContent = $extractedItems[0].FullName
        } else {
            # ZIP contained files directly
            $sourceContent = $tempExtractPath
        }

        Write-Success "Extraction complete"
    } catch {
        Write-Error "Failed to extract ZIP: $_"
        exit 1
    }

    # Step 6: Create target directory structure
    Write-Header "Step 6: Creating Directory Structure"

    # Remove existing if present
    if (Test-Path $claudePath) {
        Write-Info "Removing existing installation..."
        Remove-Item $claudePath -Recurse -Force
    }

    New-DirectoryIfNotExists $claudePath

    # Create subdirectories
    $subdirs = @(
        "agents",
        "skills\orchestrator\docs",
        "skills\learn",
        "rules\common",
        "rules\python",
        "rules\typescript",
        "rules\go",
        "learnings",
        "templates",
        "workflows",
        "sessions",
        "deploy"
    )

    foreach ($subdir in $subdirs) {
        $dirPath = Join-Path $claudePath $subdir
        New-DirectoryIfNotExists $dirPath
    }

    Write-Success "Directory structure created"

    # Step 7: Copy files
    Write-Header "Step 7: Installing Files"

    try {
        Write-Info "Copying files to $claudePath..."
        Copy-Item -Path "$sourceContent\*" -Destination $claudePath -Recurse -Force
        Write-Success "Files copied successfully"
    } catch {
        Write-Error "Failed to copy files: $_"
        # Cleanup temp
        Remove-Item $tempExtractPath -Recurse -Force -ErrorAction SilentlyContinue
        exit 1
    }

    # Cleanup temp
    Remove-Item $tempExtractPath -Recurse -Force -ErrorAction SilentlyContinue

    # Step 8: Verify integrity
    Write-Header "Step 8: Verifying Integrity"

    $manifestPath = Join-Path $claudePath "manifest.json"
    $integrityOk = Test-HashManifest -ExtractPath $claudePath -ManifestPath $manifestPath

    if (-not $integrityOk -and -not $Force) {
        Write-Error "Integrity check failed. Use -Force to proceed anyway."
        exit 1
    }

    # Step 9: Create symlinks
    Write-Header "Step 9: Creating Symlinks"

    # Create skills/docs symlink to orchestrator/docs if needed
    $skillsDocsPath = Join-Path $claudePath "skills\docs"
    $orchestratorDocsPath = Join-Path $claudePath "skills\orchestrator\docs"

    if ((Test-Path $orchestratorDocsPath) -and -not (Test-Path $skillsDocsPath)) {
        New-Symlink -LinkPath $skillsDocsPath -TargetPath $orchestratorDocsPath
    }

    # Step 10: Install dependencies
    if (-not $SkipDependencies) {
        Write-Header "Step 10: Installing Dependencies"
        Install-McpDependencies -ClaudePath $claudePath
    } else {
        Write-Info "Skipping dependency installation"
    }

    # Step 11: Set permissions
    Write-Header "Step 11: Setting Permissions"
    Set-FilePermissions -Path $claudePath

    # Step 12: Configure profile
    Write-Header "Step 12: Configuring Profile"

    $envExamplePath = Join-Path $claudePath ".env.example"
    $envPath = Join-Path $claudePath ".env"

    if (-not (Test-Path $envPath) -and (Test-Path $envExamplePath)) {
        Copy-Item $envExamplePath $envPath
        Write-Info "Created .env from .env.example"
    }

    # Set profile marker
    $profileMarkerPath = Join-Path $claudePath ".profile"
    Set-Content -Path $profileMarkerPath -Value $Profile -NoNewline
    Write-Success "Profile set to: $Profile"

    # Show summary
    Show-Summary -ClaudePath $claudePath -Profile $Profile -Prereqs $prereqs -BackupCreated $backupCreated -BackupFile $backupFile

    Write-Header "Installation Complete!"
    Write-Success "The CCA/CCG system has been installed successfully."
    Write-Host ""
}

# Run main function
try {
    Main
} catch {
    Write-Error "Installation failed: $_"
    Write-Host $_.ScriptStackTrace
    exit 1
}
