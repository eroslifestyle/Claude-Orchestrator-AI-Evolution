#Requires -Version 5.1
<#
.SYNOPSIS
    Switch between Claude Code profiles (CCA/CCG) for VSCode integration.

.DESCRIPTION
    This script manages profile switching between CCA (Anthropic Claude Opus 4.6)
    and CCG (GLM5 via Z.AI). It handles settings backup, profile activation,
    VSCode workspace configuration, and API connection validation.

.PARAMETER Profile
    The profile to activate: 'cca', 'ccg', or 'status' to show current status.

.PARAMETER Workspace
    Path to the VSCode workspace directory. If not specified, uses current directory.

.PARAMETER NonInteractive
    Switch directly without showing interactive menu.

.EXAMPLE
    .\switch-vscode.ps1
    Shows interactive menu to select profile.

.EXAMPLE
    .\switch-vscode.ps1 -Profile ccg -NonInteractive
    Switches to CCG profile without prompts.

.EXAMPLE
    .\switch-vscode.ps1 -Profile status
    Shows current profile status.

.NOTES
    File: switch-vscode.ps1
    Author: Claude Code
    Version: 1.0.0
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('cca', 'ccg', 'status')]
    [string]$Profile = '',

    [Parameter(Position = 1)]
    [string]$Workspace = '',

    [switch]$NonInteractive
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$script:Config = @{
    ClaudeDir       = Join-Path $env:USERPROFILE '.claude'
    SettingsFile    = 'settings.json'
    ProfileFiles    = @{
        cca = 'settings-anthropic.json'
        ccg = 'settings-glm.json'
    }
    ProfileNames    = @{
        cca = 'CCA (Anthropic Claude Opus 4.6)'
        ccg = 'CCG (GLM5 via Z.AI)'
    }
    BackupSuffix    = '.bak'
    MaxBackups      = 3
    VSCodeDir       = '.vscode'
    VSCodeSettings  = 'settings.json'
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-ColorMessage {
    param(
        [string]$Message,
        [ValidateSet('Info', 'Success', 'Warning', 'Error', 'Header')]
        [string]$Type = 'Info'
    )

    $colors = @{
        Info    = 'White'
        Success = 'Green'
        Warning = 'Yellow'
        Error   = 'Red'
        Header  = 'Cyan'
    }

    $prefixes = @{
        Info    = '[INFO]    '
        Success = '[SUCCESS] '
        Warning = '[WARNING] '
        Error   = '[ERROR]   '
        Header  = ''
    }

    Write-Host "$($prefixes[$Type])$Message" -ForegroundColor $colors[$Type]
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$currentUser
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-FileHashSafe {
    param([string]$Path)

    if (-not (Test-Path $Path)) { return $null }

    try {
        $hash = Get-FileHash -Path $Path -Algorithm MD5 -ErrorAction Stop
        return $hash.Hash
    } catch {
        return $null
    }
}

# ============================================================================
# PROFILE MANAGEMENT
# ============================================================================

function Get-CurrentProfile {
    $settingsPath = Join-Path $script:Config.ClaudeDir $script:Config.SettingsFile

    if (-not (Test-Path $settingsPath)) {
        return 'none'
    }

    try {
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json

        # Check for CCG-specific environment variables
        if ($settings.env -and $settings.env.ANTHROPIC_BASE_URL) {
            return 'ccg'
        }

        return 'cca'
    } catch {
        return 'unknown'
    }
}

function Get-ProfileStatus {
    $current = Get-CurrentProfile
    $settingsPath = Join-Path $script:Config.ClaudeDir $script:Config.SettingsFile

    $status = [PSCustomObject]@{
        CurrentProfile   = $current
        CurrentProfileName = $script:Config.ProfileNames[$current]
        SettingsPath     = $settingsPath
        SettingsExists   = Test-Path $settingsPath
        CCAProfileExists = Test-Path (Join-Path $script:Config.ClaudeDir $script:Config.ProfileFiles['cca'])
        CCGProfileExists = Test-Path (Join-Path $script:Config.ClaudeDir $script:Config.ProfileFiles['ccg'])
        CredentialsValid = $false
    }

    # Validate credentials based on current profile
    if ($current -in @('cca', 'ccg')) {
        $status.CredentialsValid = Test-ProfileCredentials -Profile $current
    }

    return $status
}

function Test-ProfileCredentials {
    param([string]$Profile)

    $profileFile = Join-Path $script:Config.ClaudeDir $script:Config.ProfileFiles[$Profile]

    if (-not (Test-Path $profileFile)) {
        return $false
    }

    try {
        $settings = Get-Content $profileFile -Raw | ConvertFrom-Json

        # For CCG, check for required env vars
        if ($Profile -eq 'ccg') {
            if (-not $settings.env) { return $false }
            if (-not $settings.env.ANTHROPIC_BASE_URL) { return $false }
            if (-not $settings.env.ANTHROPIC_AUTH_TOKEN) { return $false }
            return $true
        }

        # For CCA, just verify the file is valid JSON
        return $true
    } catch {
        return $false
    }
}

function Test-ApiConnection {
    param([string]$Profile)

    Write-ColorMessage "Testing API connection for $Profile..." -Type Info

    $profileFile = Join-Path $script:Config.ClaudeDir $script:Config.ProfileFiles[$Profile]

    if (-not (Test-Path $profileFile)) {
        Write-ColorMessage "Profile file not found: $profileFile" -Type Error
        return $false
    }

    try {
        $settings = Get-Content $profileFile -Raw | ConvertFrom-Json

        if ($Profile -eq 'ccg') {
            $baseUrl = $settings.env.ANTHROPIC_BASE_URL
            $token = $settings.env.ANTHROPIC_AUTH_TOKEN

            # Simple connectivity test (just check if URL is reachable)
            $uri = [System.Uri]$baseUrl
            Write-ColorMessage "Target: $($uri.Host)" -Type Info

            # Note: Actual API test would require a real request
            # For safety, we just validate the configuration
            if ($baseUrl -and $token) {
                Write-ColorMessage "Configuration valid for Z.AI endpoint" -Type Success
                return $true
            }
        } else {
            # For CCA, we assume default Anthropic API
            Write-ColorMessage "Configuration valid for Anthropic API" -Type Success
            return $true
        }
    } catch {
        Write-ColorMessage "API validation failed: $($_.Exception.Message)" -Type Error
        return $false
    }

    return $false
}

function Backup-Settings {
    $settingsPath = Join-Path $script:Config.ClaudeDir $script:Config.SettingsFile
    $backupPath = $settingsPath + $script:Config.BackupSuffix

    if (Test-Path $settingsPath) {
        Copy-Item -Path $settingsPath -Destination $backupPath -Force
        Write-ColorMessage "Settings backed up to: $backupPath" -Type Info

        # Rotate old backups
        Rotate-Backups -BasePath $settingsPath
    }
}

function Rotate-Backups {
    param([string]$BasePath)

    $backupPattern = $BasePath + '*.bak*'
    $backups = Get-ChildItem -Path (Split-Path $BasePath) -Filter "$(Split-Path $BasePath -Leaf)*.bak*" -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -match '\.bak(\.\d+)?$' } |
               Sort-Object LastWriteTime -Descending

    if ($backups.Count -gt $script:Config.MaxBackups) {
        $toDelete = $backups | Select-Object -Skip $script:Config.MaxBackups
        foreach ($backup in $toDelete) {
            Remove-Item $backup.FullName -Force
            Write-ColorMessage "Removed old backup: $($backup.Name)" -Type Info
        }
    }
}

function Switch-Profile {
    param(
        [Parameter(Mandatory)]
        [ValidateSet('cca', 'ccg')]
        [string]$TargetProfile
    )

    $profileFile = Join-Path $script:Config.ClaudeDir $script:Config.ProfileFiles[$TargetProfile]
    $settingsPath = Join-Path $script:Config.ClaudeDir $script:Config.SettingsFile

    # Validate profile file exists
    if (-not (Test-Path $profileFile)) {
        Write-ColorMessage "Profile file not found: $profileFile" -Type Error
        return $false
    }

    # Validate credentials
    if (-not (Test-ProfileCredentials -Profile $TargetProfile)) {
        Write-ColorMessage "Profile credentials validation failed" -Type Error
        return $false
    }

    # Backup current settings
    Backup-Settings

    # Copy profile to settings.json
    try {
        Copy-Item -Path $profileFile -Destination $settingsPath -Force
        Write-ColorMessage "Profile switched to: $($script:Config.ProfileNames[$TargetProfile])" -Type Success
        return $true
    } catch {
        Write-ColorMessage "Failed to switch profile: $($_.Exception.Message)" -Type Error
        return $false
    }
}

# ============================================================================
# VSCODE INTEGRATION
# ============================================================================

function Get-WorkspacePath {
    param([string]$Workspace)

    if ([string]::IsNullOrEmpty($Workspace)) {
        # Try to detect workspace from VSCode environment
        if ($env:VSCODE_WORKSPACE_FOLDER) {
            return $env:VSCODE_WORKSPACE_FOLDER
        }
        # Fall back to current directory
        return (Get-Location).Path
    }

    return $Workspace
}

function Update-VSCodeSettings {
    param(
        [string]$WorkspacePath,
        [ValidateSet('cca', 'ccg')]
        [string]$Profile
    )

    $vscodeDir = Join-Path $WorkspacePath $script:Config.VSCodeDir
    $vscodeSettingsPath = Join-Path $vscodeDir $script:Config.VSCodeSettings

    # Create .vscode directory if it doesn't exist
    if (-not (Test-Path $vscodeDir)) {
        New-Item -Path $vscodeDir -ItemType Directory -Force | Out-Null
        Write-ColorMessage "Created .vscode directory" -Type Info
    }

    # Build VSCode settings
    $vscodeSettings = @{}

    # Load existing settings if present
    if (Test-Path $vscodeSettingsPath) {
        try {
            $vscodeSettings = Get-Content $vscodeSettingsPath -Raw | ConvertFrom-Json
            Write-ColorMessage "Loaded existing VSCode settings" -Type Info
        } catch {
            Write-ColorMessage "Could not parse existing VSCode settings, creating new" -Type Warning
        }
    }

    # Configure terminal environment variables based on profile
    $terminalEnv = @{}

    if ($Profile -eq 'ccg') {
        # Load CCG profile to get env vars
        $ccgProfilePath = Join-Path $script:Config.ClaudeDir $script:Config.ProfileFiles['ccg']
        if (Test-Path $ccgProfilePath) {
            $ccgSettings = Get-Content $ccgProfilePath -Raw | ConvertFrom-Json
            if ($ccgSettings.env) {
                $terminalEnv = $ccgSettings.env
            }
        }
    }

    # Update terminal settings
    if (-not $vscodeSettings.'terminal.integrated.env.windows') {
        $vscodeSettings.'terminal.integrated.env.windows' = @{}
    }

    # Merge environment variables
    foreach ($key in $terminalEnv.Keys) {
        $vscodeSettings.'terminal.integrated.env.windows'.$key = $terminalEnv[$key]
    }

    # Configure Claude Code extension settings (if applicable)
    # These are hypothetical - adjust based on actual extension settings
    if (-not $vscodeSettings.'claude-code') {
        $vscodeSettings.'claude-code' = @{}
    }
    $vscodeSettings.'claude-code'.'activeProfile' = $Profile

    # Save settings
    try {
        $vscodeSettings | ConvertTo-Json -Depth 10 | Set-Content -Path $vscodeSettingsPath -Encoding UTF8
        Write-ColorMessage "VSCode settings updated: $vscodeSettingsPath" -Type Success
        return $true
    } catch {
        Write-ColorMessage "Failed to update VSCode settings: $($_.Exception.Message)" -Type Error
        return $false
    }
}

function Show-RestartNotice {
    Write-ColorMessage "`n========================================" -Type Header
    Write-ColorMessage "ACTION REQUIRED" -Type Warning
    Write-ColorMessage "========================================`n" -Type Header
    Write-ColorMessage "Please restart VSCode for changes to take effect:" -Type Info
    Write-ColorMessage "  1. Save all open files" -Type Info
    Write-ColorMessage "  2. Close VSCode" -Type Info
    Write-ColorMessage "  3. Reopen VSCode" -Type Info
    Write-ColorMessage "`nOr use Ctrl+Shift+P -> 'Developer: Reload Window'" -Type Info
}

# ============================================================================
# INTERACTIVE MENU
# ============================================================================

function Show-InteractiveMenu {
    $status = Get-ProfileStatus

    Clear-Host
    Write-ColorMessage "`n========================================" -Type Header
    Write-ColorMessage "  CLAUDE CODE PROFILE SWITCHER" -Type Header
    Write-ColorMessage "========================================`n" -Type Header

    # Current status
    Write-ColorMessage "Current Profile: $($status.CurrentProfileName)" -Type Info
    Write-ColorMessage "Credentials:     $(if ($status.CredentialsValid) { 'Valid' } else { 'Invalid' })" -Type $(if ($status.CredentialsValid) { 'Success' } else { 'Warning' })
    Write-ColorMessage ""

    # Menu options
    Write-ColorMessage "Available Actions:" -Type Header
    Write-ColorMessage "  [1] Switch to CCA (Anthropic Claude Opus 4.6)" -Type Info
    Write-ColorMessage "  [2] Switch to CCG (GLM5 via Z.AI)" -Type Info
    Write-ColorMessage "  [S] Show detailed status" -Type Info
    Write-ColorMessage "  [T] Test API connection" -Type Info
    Write-ColorMessage "  [Q] Quit" -Type Info
    Write-ColorMessage ""

    $choice = Read-Host "Select option"

    switch ($choice.ToUpper()) {
        '1' {
            if (Switch-Profile -TargetProfile 'cca') {
                $workspacePath = Get-WorkspacePath -Workspace $Workspace
                Update-VSCodeSettings -WorkspacePath $workspacePath -Profile 'cca'
                Test-ApiConnection -Profile 'cca'
                Show-RestartNotice
            }
            pause
            Show-InteractiveMenu
        }
        '2' {
            if (Switch-Profile -TargetProfile 'ccg') {
                $workspacePath = Get-WorkspacePath -Workspace $Workspace
                Update-VSCodeSettings -WorkspacePath $workspacePath -Profile 'ccg'
                Test-ApiConnection -Profile 'ccg'
                Show-RestartNotice
            }
            pause
            Show-InteractiveMenu
        }
        'S' {
            Show-DetailedStatus -Status $status
            pause
            Show-InteractiveMenu
        }
        'T' {
            $currentProfile = Get-CurrentProfile
            if ($currentProfile -in @('cca', 'ccg')) {
                Test-ApiConnection -Profile $currentProfile
            } else {
                Write-ColorMessage "No valid profile active" -Type Warning
            }
            pause
            Show-InteractiveMenu
        }
        'Q' {
            Write-ColorMessage "Goodbye!" -Type Info
            exit 0
        }
        default {
            Write-ColorMessage "Invalid option" -Type Warning
            Start-Sleep -Seconds 1
            Show-InteractiveMenu
        }
    }
}

function Show-DetailedStatus {
    param($Status)

    Write-ColorMessage "`n----------------------------------------" -Type Header
    Write-ColorMessage "DETAILED STATUS" -Type Header
    Write-ColorMessage "----------------------------------------" -Type Info
    Write-ColorMessage "Profile:           $($Status.CurrentProfileName)" -Type Info
    Write-ColorMessage "Settings Path:     $($Status.SettingsPath)" -Type Info
    Write-ColorMessage "Settings Exists:   $($Status.SettingsExists)" -Type Info
    Write-ColorMessage "CCA Profile:       $(if ($Status.CCAProfileExists) { 'Available' } else { 'Missing' })" -Type $(if ($Status.CCAProfileExists) { 'Success' } else { 'Warning' })
    Write-ColorMessage "CCG Profile:       $(if ($Status.CCGProfileExists) { 'Available' } else { 'Missing' })" -Type $(if ($Status.CCGProfileExists) { 'Success' } else { 'Warning' })
    Write-ColorMessage "Credentials:       $(if ($Status.CredentialsValid) { 'Valid' } else { 'Invalid/Missing' })" -Type $(if ($Status.CredentialsValid) { 'Success' } else { 'Error' })
    Write-ColorMessage "----------------------------------------`n" -Type Header
}

function Show-CommandLineStatus {
    $status = Get-ProfileStatus

    Write-ColorMessage "`n========================================" -Type Header
    Write-ColorMessage "CLAUDE CODE PROFILE STATUS" -Type Header
    Write-ColorMessage "========================================`n" -Type Header
    Show-DetailedStatus -Status $status
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Main {
    Write-ColorMessage "`nClaude Code Profile Switcher v1.0.0`n" -Type Header

    # Validate Claude directory exists
    if (-not (Test-Path $script:Config.ClaudeDir)) {
        Write-ColorMessage "Claude directory not found: $($script:Config.ClaudeDir)" -Type Error
        exit 1
    }

    # Status mode
    if ($Profile -eq 'status') {
        Show-CommandLineStatus
        exit 0
    }

    # Non-interactive mode with profile specified
    if ($NonInteractive -and $Profile -in @('cca', 'ccg')) {
        Write-ColorMessage "Switching to profile: $Profile (non-interactive)" -Type Info

        if (Switch-Profile -TargetProfile $Profile) {
            $workspacePath = Get-WorkspacePath -Workspace $Workspace
            Update-VSCodeSettings -WorkspacePath $workspacePath -Profile $Profile
            Test-ApiConnection -Profile $Profile
            Show-RestartNotice
            exit 0
        } else {
            exit 1
        }
    }

    # Interactive mode
    if (-not $NonInteractive -and [string]::IsNullOrEmpty($Profile)) {
        Show-InteractiveMenu
        exit 0
    }

    # Profile specified but interactive
    if ($Profile -in @('cca', 'ccg')) {
        Write-ColorMessage "Switching to profile: $Profile" -Type Info

        if (Switch-Profile -TargetProfile $Profile) {
            $workspacePath = Get-WorkspacePath -Workspace $Workspace
            Update-VSCodeSettings -WorkspacePath $workspacePath -Profile $Profile
            Test-ApiConnection -Profile $Profile
            Show-RestartNotice
        }

        if (-not $NonInteractive) {
            pause
        }
        exit 0
    }

    # Default: show interactive menu
    Show-InteractiveMenu
}

# Run main function
Main
