<#
.SYNOPSIS
    Export CCA/CCG Dual System for portable deployment

.DESCRIPTION
    Creates a portable ZIP archive of the dual-profile Claude Code system,
    excluding non-portable directories and sensitive files. Includes a
    manifest with file hashes and an installation script.

.PARAMETER OutputPath
    Custom destination path for the ZIP file. Defaults to Desktop.

.PARAMETER IncludeLogs
    Include log files (default: excluded for portability)

.PARAMETER Verbose
    Show detailed progress information

.EXAMPLE
    .\export-dual-system.ps1
    Exports to Desktop with default settings

.EXAMPLE
    .\export-dual-system.ps1 -OutputPath "D:\Backups\claude-system.zip"
    Exports to custom location

.NOTES
    Version: 1.0.0
    Author: CCA/CCG System
    Requires: PowerShell 5.1+
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$OutputPath,

    [Parameter(Mandatory=$false)]
    [switch]$IncludeLogs = $false
)

# =============================================================================
# CONFIGURATION
# =============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# System info
$SystemVersion = "12.0.3"
$ExportDate = Get-Date -Format "yyyyMMdd-HHmmss"

# Auto-detect user's .claude path
$ClaudeBasePath = Join-Path $env:USERPROFILE ".claude"

# Directories to exclude (non-portable)
$ExcludeDirectories = @(
    "projects",
    "backups",
    "cache",
    "debug",
    "logs",
    "file-history",
    "paste-cache",
    "shell-snapshots",
    "tasks",
    "teams",
    "telemetry",
    "tmp",
    "todos",
    "stats-cache",
    ".claude"  # nested .claude directory
)

# Files to exclude (sensitive or non-portable)
$ExcludeFiles = @(
    ".credentials.json",
    ".env",
    "*.jsonl",
    "stats-cache.json",
    "*.bak",
    "*.tmp",
    "*.log"
)

# Directories to include (portable system components)
$IncludeDirectories = @(
    "agents",
    "skills",
    "rules",
    "learnings",
    "templates",
    "workflows",
    "hooks",
    "commands",
    "docs",
    "ide"
)

# Root files to include
$IncludeRootFiles = @(
    "CLAUDE.md",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    ".gitignore",
    "VERSION.json",
    "settings.json",
    "settings-anthropic.json",
    "settings-glm.json"
)

# =============================================================================
# FUNCTIONS
# =============================================================================

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "HH:mm:ss"
    $prefix = switch ($Level) {
        "INFO"    { "[INFO] " }
        "WARN"    { "[WARN] " }
        "ERROR"   { "[ERROR]" }
        "SUCCESS" { "[OK]   " }
    }

    $color = switch ($Level) {
        "INFO"    { "Cyan" }
        "WARN"    { "Yellow" }
        "ERROR"   { "Red" }
        "SUCCESS" { "Green" }
    }

    Write-Host "$timestamp $prefix $Message" -ForegroundColor $color
}

function Get-FileHashSHA256 {
    param([string]$FilePath)

    try {
        $hash = Get-FileHash -Path $FilePath -Algorithm SHA256 -ErrorAction Stop
        return $hash.Hash
    } catch {
        return "ERROR"
    }
}

function Test-ShouldExcludeFile {
    param(
        [string]$FileName,
        [string[]]$ExcludePatterns
    )

    foreach ($pattern in $ExcludePatterns) {
        if ($pattern.StartsWith("*") -and $pattern.EndsWith("*")) {
            # Contains pattern
            $searchPattern = $pattern.Trim("*")
            if ($FileName -like "*$searchPattern*") { return $true }
        } elseif ($pattern.StartsWith("*")) {
            # Ends with pattern
            if ($FileName -like $pattern) { return $true }
        } elseif ($pattern.EndsWith("*")) {
            # Starts with pattern
            if ($FileName -like $pattern) { return $true }
        } else {
            # Exact match
            if ($FileName -eq $pattern) { return $true }
        }
    }
    return $false
}

function New-InstallScript {
    param([string]$TargetZipName)

    return @'
# =============================================================================
# INSTALL-DUAL-SYSTEM.PS1
# Auto-generated installation script for CCA/CCG Dual System
# =============================================================================

<#
.SYNOPSIS
    Install CCA/CCG Dual System to user's .claude directory

.DESCRIPTION
    Extracts the portable system archive and configures the dual-profile
    Claude Code setup. Creates backups of existing files.

.PARAMETER Force
    Overwrite existing configuration without prompting

.EXAMPLE
    .\install-dual-system.ps1
    Installs with confirmation prompts

.EXAMPLE
    .\install-dual-system.ps1 -Force
    Installs without confirmation
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# Target installation path
$TargetPath = Join-Path $env:USERPROFILE ".claude"
$BackupPath = Join-Path $env:USERPROFILE ".claude-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CCA/CCG Dual System Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the extraction directory
$ManifestPath = Join-Path $PSScriptRoot "manifest.json"
if (-not (Test-Path $ManifestPath)) {
    Write-Error "manifest.json not found. Please run this script from the extracted archive directory."
    exit 1
}

# Load manifest
$Manifest = Get-Content $ManifestPath | ConvertFrom-Json
Write-Host "System Version: $($Manifest.version)" -ForegroundColor Yellow
Write-Host "Export Date: $($Manifest.export_date)" -ForegroundColor Yellow
Write-Host "Files: $($Manifest.file_count)" -ForegroundColor Yellow
Write-Host ""

# Check for existing installation
if (Test-Path $TargetPath) {
    if (-not $Force) {
        Write-Host "Existing .claude directory found at: $TargetPath" -ForegroundColor Yellow
        $response = Read-Host "Create backup and proceed? (Y/n)"
        if ($response -eq "n" -or $response -eq "N") {
            Write-Host "Installation cancelled." -ForegroundColor Red
            exit 0
        }
    }

    # Create backup
    Write-Host "Creating backup at: $BackupPath" -ForegroundColor Cyan
    Copy-Item -Path $TargetPath -Destination $BackupPath -Recurse -Force
    Write-Host "Backup created successfully." -ForegroundColor Green
}

# Verify file integrity
Write-Host ""
Write-Host "Verifying file integrity..." -ForegroundColor Cyan
$failedFiles = 0

foreach ($file in $Manifest.files) {
    $filePath = Join-Path $PSScriptRoot $file.relative_path
    if (Test-Path $filePath) {
        $currentHash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
        if ($currentHash -ne $file.hash) {
            Write-Host "  HASH MISMATCH: $($file.relative_path)" -ForegroundColor Red
            $failedFiles++
        }
    } else {
        Write-Host "  MISSING: $($file.relative_path)" -ForegroundColor Red
        $failedFiles++
    }
}

if ($failedFiles -gt 0) {
    Write-Host ""
    Write-Error "Integrity check failed for $failedFiles file(s). Aborting installation."
    exit 1
}

Write-Host "All files verified successfully." -ForegroundColor Green

# Copy files to target
Write-Host ""
Write-Host "Installing files to: $TargetPath" -ForegroundColor Cyan

foreach ($file in $Manifest.files) {
    $sourcePath = Join-Path $PSScriptRoot $file.relative_path
    $destPath = Join-Path $TargetPath $file.relative_path

    # Ensure directory exists
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    Copy-Item -Path $sourcePath -Destination $destPath -Force
    Write-Host "  Installed: $($file.relative_path)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify settings.json has your API credentials" -ForegroundColor White
Write-Host "  2. Restart Claude Code to load the new configuration" -ForegroundColor White
Write-Host "  3. Use /orchestrator to access the dual-profile system" -ForegroundColor White
Write-Host ""
Write-Host "Backup location: $BackupPath" -ForegroundColor Gray
Write-Host ""
'@
}

function New-ManifestJson {
    param(
        [string]$Version,
        [string]$ExportDate,
        [int]$FileCount,
        [int]$TotalSize,
        [array]$Files
    )

    $manifest = [PSCustomObject]@{
        version = $Version
        export_date = $ExportDate
        file_count = $FileCount
        total_size_bytes = $TotalSize
        total_size_mb = [math]::Round($TotalSize / 1MB, 2)
        system_info = @{
            agents = 43
            skills = 26
            rules_files = 11
            profiles = @("settings.json", "settings-anthropic.json", "settings-glm.json")
        }
        files = $Files
    }

    return $manifest | ConvertTo-Json -Depth 10
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CCA/CCG Dual System Exporter" -ForegroundColor Cyan
Write-Host "  Version $SystemVersion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify source directory exists
if (-not (Test-Path $ClaudeBasePath)) {
    Write-Log "Claude directory not found: $ClaudeBasePath" -Level ERROR
    exit 1
}

Write-Log "Source directory: $ClaudeBasePath" -Level INFO

# Determine output path
if ([string]::IsNullOrEmpty($OutputPath)) {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $OutputPath = Join-Path $DesktopPath "claude-dual-system-$ExportDate.zip"
}

$OutputDir = Split-Path $OutputPath -Parent
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Log "Created output directory: $OutputDir" -Level INFO
}

Write-Log "Output file: $OutputPath" -Level INFO

# Create temp directory for staging
$TempDir = Join-Path $env:TEMP "claude-export-$ExportDate"
if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
Write-Log "Temp staging directory: $TempDir" -Level INFO

# =============================================================================
# COLLECT FILES
# =============================================================================

Write-Host ""
Write-Log "Collecting files..." -Level INFO

$filesToInclude = [System.Collections.Generic.List[PSObject]]::new()
$totalSize = 0

# Collect from included directories
foreach ($dir in $IncludeDirectories) {
    $sourceDir = Join-Path $ClaudeBasePath $dir
    if (Test-Path $sourceDir) {
        Write-Log "Scanning directory: $dir" -Level INFO

        $items = Get-ChildItem -Path $sourceDir -Recurse -File -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            $relativePath = $item.FullName.Substring($ClaudeBasePath.Length + 1)

            # Check if file should be excluded
            if (Test-ShouldExcludeFile -FileName $item.Name -ExcludePatterns $ExcludeFiles) {
                Write-Log "  Excluding: $relativePath" -Level WARN
                continue
            }

            # Check if parent directory should be excluded
            $parentDirs = $relativePath.Split('\')
            $shouldExclude = $false
            foreach ($excludeDir in $ExcludeDirectories) {
                if ($parentDirs -contains $excludeDir) {
                    $shouldExclude = $true
                    break
                }
            }

            if (-not $shouldExclude) {
                $fileInfo = [PSCustomObject]@{
                    RelativePath = $relativePath
                    FullName = $item.FullName
                    Size = $item.Length
                }
                $filesToInclude.Add($fileInfo)
                $totalSize += $item.Length
            }
        }
    } else {
        Write-Log "Directory not found (skipped): $dir" -Level WARN
    }
}

# Collect root files
foreach ($file in $IncludeRootFiles) {
    $sourceFile = Join-Path $ClaudeBasePath $file
    if (Test-Path $sourceFile) {
        $item = Get-Item $sourceFile
        $fileInfo = [PSCustomObject]@{
            RelativePath = $file
            FullName = $item.FullName
            Size = $item.Length
        }
        $filesToInclude.Add($fileInfo)
        $totalSize += $item.Length
        Write-Log "Including root file: $file" -Level INFO
    }
}

Write-Log "Total files to include: $($filesToInclude.Count)" -Level SUCCESS
Write-Log "Total size: $([math]::Round($totalSize / 1KB, 2)) KB" -Level INFO

# =============================================================================
# COPY TO TEMP DIRECTORY
# =============================================================================

Write-Host ""
Write-Log "Copying files to staging directory..." -Level INFO

$manifestFiles = @()

foreach ($file in $filesToInclude) {
    $destPath = Join-Path $TempDir $file.RelativePath
    $destDir = Split-Path $destPath -Parent

    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    Copy-Item -Path $file.FullName -Destination $destPath -Force

    # Calculate hash for manifest
    $hash = Get-FileHashSHA256 -FilePath $destPath

    $manifestFiles += [PSCustomObject]@{
        relative_path = $file.RelativePath
        size_bytes = $file.Size
        hash = $hash
    }
}

Write-Log "Files copied: $($filesToInclude.Count)" -Level SUCCESS

# =============================================================================
# CREATE MANIFEST
# =============================================================================

Write-Host ""
Write-Log "Creating manifest..." -Level INFO

$manifestContent = New-ManifestJson `
    -Version $SystemVersion `
    -ExportDate $ExportDate `
    -FileCount $filesToInclude.Count `
    -TotalSize $totalSize `
    -Files $manifestFiles

$manifestPath = Join-Path $TempDir "manifest.json"
$manifestContent | Out-File -FilePath $manifestPath -Encoding UTF8 -Force

Write-Log "Manifest created: manifest.json" -Level SUCCESS

# =============================================================================
# CREATE INSTALL SCRIPT
# =============================================================================

Write-Log "Creating installation script..." -Level INFO

$installScriptContent = New-InstallScript -TargetZipName (Split-Path $OutputPath -Leaf)
$installScriptPath = Join-Path $TempDir "install-dual-system.ps1"
$installScriptContent | Out-File -FilePath $installScriptPath -Encoding UTF8 -Force

Write-Log "Install script created: install-dual-system.ps1" -Level SUCCESS

# =============================================================================
# CREATE README
# =============================================================================

Write-Log "Creating README..." -Level INFO

$readmeContent = @"
# CCA/CCG Dual System - Portable Archive

## Version: $SystemVersion
## Export Date: $ExportDate

## Contents

This archive contains the complete CCA/CCG dual-profile system:

- **43 Agents** (6 core + 22 L1 + 15 L2)
- **26 Skills** (including orchestrator)
- **11 Rules Files** (common, python, typescript, go)
- **3 Profile Configurations**

## Installation

1. Extract this ZIP archive to a temporary location
2. Run ``install-dual-system.ps1`` as Administrator (optional)
3. Or manually copy files to ``~/.claude/`` directory

## Files Included

- ``manifest.json`` - File list with SHA256 hashes
- ``install-dual-system.ps1`` - Automated installer
- ``agents/`` - Agent definitions
- ``skills/`` - Skills including orchestrator
- ``rules/`` - Context-aware rules engine
- ``learnings/`` - System learnings
- ``templates/`` - Task templates
- ``workflows/`` - Workflow definitions
- ``hooks/`` - Event hooks
- ``commands/`` - Slash commands
- ``docs/`` - Documentation

## Files Excluded (for portability/security)

- ``projects/`` - Project-specific memory
- ``backups/`` - Local backups
- ``cache/`` - Temporary cache files
- ``logs/`` - Log files
- ``.credentials.json`` - Sensitive credentials
- ``.env`` - Environment variables
- ``*.jsonl`` - History files

## Post-Installation

1. Verify your API credentials are set in ``settings.json``
2. Restart Claude Code to load the new configuration
3. Use ``/orchestrator`` to access the dual-profile system

## Verification

Run the installer to verify file integrity, or manually check:

``````powershell
Get-Content manifest.json | ConvertFrom-Json | Select-Object -ExpandProperty files | ForEach-Object {
    $hash = (Get-FileHash -Path $_.relative_path -Algorithm SHA256).Hash
    if ($hash -ne $_.hash) { Write-Warning "Hash mismatch: $($_.relative_path)" }
}
``````
"@

$readmePath = Join-Path $TempDir "README.md"
$readmeContent | Out-File -FilePath $readmePath -Encoding UTF8 -Force

Write-Log "README created: README.md" -Level SUCCESS

# =============================================================================
# CREATE ZIP ARCHIVE
# =============================================================================

Write-Host ""
Write-Log "Creating ZIP archive..." -Level INFO

# Remove existing zip if present
if (Test-Path $OutputPath) {
    Remove-Item -Path $OutputPath -Force
    Write-Log "Removed existing archive" -Level INFO
}

# Create zip
Compress-Archive -Path "$TempDir\*" -DestinationPath $OutputPath -CompressionLevel Optimal -Force

$zipSize = (Get-Item $OutputPath).Length
Write-Log "ZIP archive created: $OutputPath" -Level SUCCESS
Write-Log "Archive size: $([math]::Round($zipSize / 1MB, 2)) MB" -Level INFO

# =============================================================================
# CLEANUP
# =============================================================================

Write-Host ""
Write-Log "Cleaning up temporary files..." -Level INFO

Remove-Item -Path $TempDir -Recurse -Force
Write-Log "Temporary directory removed" -Level SUCCESS

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Export Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files exported: $($filesToInclude.Count)" -ForegroundColor White
Write-Host "  Original size:  $([math]::Round($totalSize / 1KB, 2)) KB" -ForegroundColor White
Write-Host "  Archive size:   $([math]::Round($zipSize / 1MB, 2)) MB" -ForegroundColor White
Write-Host "  Compression:    $([math]::Round((1 - ($zipSize / $totalSize)) * 100, 1))%" -ForegroundColor White
Write-Host ""
Write-Host "Output:" -ForegroundColor Cyan
Write-Host "  $OutputPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "Contents:" -ForegroundColor Cyan
Write-Host "  - manifest.json (file list with hashes)" -ForegroundColor White
Write-Host "  - install-dual-system.ps1 (installer)" -ForegroundColor White
Write-Host "  - README.md (instructions)" -ForegroundColor White
Write-Host "  - All portable system files" -ForegroundColor White
Write-Host ""

# Return path for programmatic use
return $OutputPath
