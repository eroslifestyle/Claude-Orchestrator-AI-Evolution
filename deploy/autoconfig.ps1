#Requires -Version 5.1
<#
.SYNOPSIS
    CCA/CCG Auto-Configuration Script
.DESCRIPTION
    Auto-configures Claude Code system for CCA (Anthropic) or CCG (GLM5) profiles
    across different environments (Windows, Linux, macOS).
.PARAMETER Profile
    Profile to configure: 'cca' (Anthropic) or 'ccg' (GLM5)
.PARAMETER ApiKey
    API token to configure in environment
.PARAMETER GithubToken
    GitHub personal access token
.PARAMETER Force
    Overwrite existing configurations
.PARAMETER DryRun
    Show what would be done without executing
.EXAMPLE
    .\autoconfig.ps1 -Profile cca -ApiKey "sk-xxx" -DryRun
.EXAMPLE
    .\autoconfig.ps1 -Profile ccg -ApiKey "zai-xxx" -GithubToken "ghp_xxx"
#>

[CmdletBinding()]
param(
    [ValidateSet("cca", "ccg")]
    [string]$Profile = "cca",

    [string]$ApiKey = "",

    [string]$GithubToken = "",

    [switch]$Force,

    [switch]$DryRun
)

# =============================================================================
# CONFIGURATION
# =============================================================================

$Script:Version = "1.0.0"
$Script:Config = @{
    cca = @{
        Name = "Anthropic Claude Opus 4.6"
        EnvPrefix = "ANTHROPIC"
        ApiKeyEnv = "ANTHROPIC_API_KEY"
        ApiKeyPattern = "sk-ant-"
    }
    ccg = @{
        Name = "GLM5 via Z.AI"
        EnvPrefix = "ZAI"
        ApiKeyEnv = "ZAI_API_KEY"
        ApiKeyPattern = "zai-"
    }
}

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

function Write-Header {
    param([string]$Message)
    $width = 60
    $pad = ($width - $Message.Length) / 2
    Write-Host ""
    Write-Host ("=" * $width) -ForegroundColor Cyan
    Write-Host (" " * [Math]::Floor($pad)) -NoNewline
    Write-Host $Message -ForegroundColor Cyan
    Write-Host ("=" * $width) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Gray -NoNewline
    Write-Host $Message
}

function Write-DryRun {
    param([string]$Message)
    Write-Host "[DRYRUN] " -ForegroundColor Magenta -NoNewline
    Write-Host $Message
}

# =============================================================================
# DETECTION FUNCTIONS
# =============================================================================

function Get-SystemInfo {
    $info = @{
        OS = "Unknown"
        Shell = "Unknown"
        HomePath = ""
        ClaudePath = ""
        PythonInstalled = $false
        PythonVersion = ""
        GitInstalled = $false
        GitVersion = ""
        ClaudeCLIInstalled = $false
        ProfilePath = ""
        ProfileType = ""
    }

    # Detect OS
    if ($IsWindows -or $null -eq $IsWindows) {
        $info.OS = "Windows"
        $info.HomePath = $env:USERPROFILE
        $info.ClaudePath = Join-Path $env:USERPROFILE ".claude"

        # Detect shell
        if ($env:WSL_DISTRO_NAME) {
            $info.Shell = "WSL"
            $info.HomePath = $env:HOME
            $info.ClaudePath = Join-Path $env:HOME ".claude"
        } elseif ($env:TERM_PROGRAM -eq "vscode") {
            $info.Shell = "PowerShell (VSCode)"
        } elseif ($env:TERM -match "xterm|cygwin") {
            $info.Shell = "Git Bash"
        } else {
            $info.Shell = "PowerShell"
        }
    } elseif ($IsLinux) {
        $info.OS = "Linux"
        $info.HomePath = $env:HOME
        $info.ClaudePath = Join-Path $env:HOME ".claude"
        $info.Shell = if ($env:SHELL -match "zsh") { "Zsh" } elseif ($env:SHELL -match "bash") { "Bash" } else { "Shell" }
    } elseif ($IsMacOS) {
        $info.OS = "macOS"
        $info.HomePath = $env:HOME
        $info.ClaudePath = Join-Path $env:HOME ".claude"
        $info.Shell = if ($env:SHELL -match "zsh") { "Zsh" } else { "Bash" }
    }

    # Detect Python
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCmd) {
        $pythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
    }
    if ($pythonCmd) {
        $info.PythonInstalled = $true
        try {
            $pyVersion = & $pythonCmd.Source --version 2>&1
            $info.PythonVersion = ($pyVersion -split " ")[1]
        } catch {
            $info.PythonVersion = "Unknown"
        }
    }

    # Detect Git
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) {
        $info.GitInstalled = $true
        try {
            $info.GitVersion = (& git --version) -replace "git version ", ""
        } catch {
            $info.GitVersion = "Unknown"
        }
    }

    # Detect Claude CLI
    $claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
    if ($claudeCmd) {
        $info.ClaudeCLIInstalled = $true
    }

    # Determine profile path based on shell
    if ($info.OS -eq "Windows") {
        if ($info.Shell -like "*PowerShell*") {
            $info.ProfilePath = $PROFILE
            $info.ProfileType = "PowerShell"
        } elseif ($info.Shell -eq "Git Bash") {
            $info.ProfilePath = Join-Path $info.HomePath ".bashrc"
            $info.ProfileType = "Bash"
        }
    } else {
        if ($info.Shell -eq "Zsh") {
            $info.ProfilePath = Join-Path $info.HomePath ".zshrc"
            $info.ProfileType = "Zsh"
        } else {
            $info.ProfilePath = Join-Path $info.HomePath ".bashrc"
            $info.ProfileType = "Bash"
        }
    }

    return $info
}

function Show-SystemInfo {
    param([hashtable]$Info)

    Write-Header "SYSTEM DETECTION"

    Write-Host "Operating System: " -NoNewline
    Write-Host $Info.OS -ForegroundColor Green

    Write-Host "Shell: " -NoNewline
    Write-Host $Info.Shell -ForegroundColor Green

    Write-Host "Home Path: " -NoNewline
    Write-Host $Info.HomePath -ForegroundColor Green

    Write-Host "Claude Path: " -NoNewline
    Write-Host $Info.ClaudePath -ForegroundColor Green

    Write-Host "Profile: " -NoNewline
    Write-Host "$($Info.ProfileType) ($($Info.ProfilePath))" -ForegroundColor Green

    Write-Host "Python: " -NoNewline
    if ($Info.PythonInstalled) {
        Write-Host "v$($Info.PythonVersion)" -ForegroundColor Green
    } else {
        Write-Host "Not installed" -ForegroundColor Red
    }

    Write-Host "Git: " -NoNewline
    if ($Info.GitInstalled) {
        Write-Host "v$($Info.GitVersion)" -ForegroundColor Green
    } else {
        Write-Host "Not installed" -ForegroundColor Red
    }

    Write-Host "Claude CLI: " -NoNewline
    if ($Info.ClaudeCLIInstalled) {
        Write-Host "Installed" -ForegroundColor Green
    } else {
        Write-Host "Not installed" -ForegroundColor Yellow
    }

    Write-Host ""
}

# =============================================================================
# CONFIGURATION FUNCTIONS
# =============================================================================

function New-ClaudeDirectories {
    param(
        [string]$ClaudePath,
        [bool]$DryRun
    )

    Write-Step "Creating Claude directories"

    $directories = @(
        $ClaudePath
        (Join-Path $ClaudePath "agents")
        (Join-Path $ClaudePath "skills")
        (Join-Path $ClaudePath "skills\orchestrator")
        (Join-Path $ClaudePath "skills\orchestrator\docs")
        (Join-Path $ClaudePath "rules")
        (Join-Path $ClaudePath "rules\common")
        (Join-Path $ClaudePath "rules\python")
        (Join-Path $ClaudePath "rules\typescript")
        (Join-Path $ClaudePath "rules\go")
        (Join-Path $ClaudePath "learnings")
        (Join-Path $ClaudePath "templates")
        (Join-Path $ClaudePath "workflows")
        (Join-Path $ClaudePath "deploy")
        (Join-Path $ClaudePath "memory")
    )

    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            Write-Info "Directory exists: $dir"
        } else {
            if ($DryRun) {
                Write-DryRun "Would create: $dir"
            } else {
                try {
                    New-Item -Path $dir -ItemType Directory -Force | Out-Null
                    Write-Success "Created: $dir"
                } catch {
                    Write-Error "Failed to create: $dir - $_"
                }
            }
        }
    }
}

function Set-EnvironmentVariables {
    param(
        [hashtable]$SystemInfo,
        [string]$Profile,
        [string]$ApiKey,
        [string]$GithubToken,
        [bool]$Force,
        [bool]$DryRun
    )

    Write-Step "Configuring environment variables"

    $profileConfig = $Script:Config[$Profile]
    $envContent = @()

    # Build environment content
    $envContent += "# Claude Code Configuration - $Profile"
    $envContent += "# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $envContent += ""

    if ($ApiKey) {
        $envContent += "# API Keys"
        $envContent += "$($profileConfig.ApiKeyEnv)=$ApiKey"
        if ($GithubToken) {
            $envContent += "GITHUB_TOKEN=$GithubToken"
        }
        $envContent += ""
    }

    $envContent += "# Claude Paths"
    $envContent += "CLAUDE_HOME=$($SystemInfo.ClaudePath)"
    $envContent += "CLAUDE_PROFILE=$Profile"
    $envContent += ""

    $envContent += "# Python (if needed)"
    $envContent += "PYTHONIOENCODING=utf-8"
    $envContent += ""

    # Create .env.template
    $envTemplatePath = Join-Path $SystemInfo.ClaudePath ".env.template"
    $envActualPath = Join-Path $SystemInfo.ClaudePath ".env"

    if ($DryRun) {
        Write-DryRun "Would create: $envTemplatePath"
        if ($ApiKey) {
            Write-DryRun "Would create: $envActualPath (with API keys)"
        }
    } else {
        # Always create template
        $envContent | Out-File -FilePath $envTemplatePath -Encoding UTF8 -Force
        Write-Success "Created: $envTemplatePath"

        # Create actual .env if API key provided
        if ($ApiKey) {
            if ((Test-Path $envActualPath) -and -not $Force) {
                Write-Warning ".env already exists. Use -Force to overwrite."
            } else {
                $envContent | Out-File -FilePath $envActualPath -Encoding UTF8 -Force
                Write-Success "Created: $envActualPath"
            }
        }
    }

    # Update shell profile
    Update-ShellProfile -SystemInfo $SystemInfo -ClaudePath $SystemInfo.ClaudePath -Profile $Profile -Force $Force -DryRun $DryRun
}

function Update-ShellProfile {
    param(
        [hashtable]$SystemInfo,
        [string]$ClaudePath,
        [string]$Profile,
        [bool]$Force,
        [bool]$DryRun
    )

    Write-Step "Updating shell profile"

    $profilePath = $SystemInfo.ProfilePath
    $profileType = $SystemInfo.ProfileType

    if (-not $profilePath) {
        Write-Warning "Could not determine profile path"
        return
    }

    # Build profile additions
    $additions = @()

    if ($profileType -eq "PowerShell") {
        $additions += @(
            "",
            "# Claude Code Configuration",
            '$env:CLAUDE_HOME = "{0}"' -f $ClaudePath,
            '$env:CLAUDE_PROFILE = "{0}"' -f $Profile,
            'if (Test-Path "$env:CLAUDE_HOME\.env") {',
            '    Get-Content "$env:CLAUDE_HOME\.env" | ForEach-Object {',
            '        if ($_ -match "^([^#][^=]+)=(.*)$") {',
            '            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")',
            '        }',
            '    }',
            '}',
            ""
        )
    } else {
        # Bash/Zsh
        $additions += @(
            "",
            "# Claude Code Configuration",
            'export CLAUDE_HOME="{0}"' -f $ClaudePath,
            'export CLAUDE_PROFILE="{0}"' -f $Profile,
            'if [ -f "$CLAUDE_HOME/.env" ]; then',
            '    set -a',
            '    source "$CLAUDE_HOME/.env"',
            '    set +a',
            'fi',
            ""
        )
    }

    $additionBlock = $additions -join "`n"

    # Check if profile exists and has Claude config
    $profileExists = Test-Path $profilePath
    $hasClaudeConfig = $false

    if ($profileExists) {
        $profileContent = Get-Content $profilePath -Raw
        $hasClaudeConfig = $profileContent -match "CLAUDE_HOME"
    }

    if ($DryRun) {
        if (-not $profileExists) {
            Write-DryRun "Would create: $profilePath"
        }
        Write-DryRun "Would add Claude configuration to $profileType profile"
        Write-Host $additionBlock -ForegroundColor Gray
    } else {
        if (-not $profileExists) {
            # Create profile
            $additionBlock | Out-File -FilePath $profilePath -Encoding UTF8 -NoNewline
            Write-Success "Created: $profilePath"
        } elseif ($hasClaudeConfig -and -not $Force) {
            Write-Warning "Profile already has Claude config. Use -Force to overwrite."
        } else {
            if ($hasClaudeConfig) {
                # Remove old config
                $profileContent = Get-Content $profilePath -Raw
                if ($profileType -eq "PowerShell") {
                    $pattern = '(?s)\r?\n# Claude Code Configuration.*?\r?\n\r?\n'
                } else {
                    $pattern = '(?s)\n# Claude Code Configuration.*?\n\n'
                }
                $profileContent = $profileContent -replace $pattern, "`n"
                $profileContent = $profileContent.TrimEnd() + "`n" + $additionBlock
                $profileContent | Out-File -FilePath $profilePath -Encoding UTF8 -NoNewline
            } else {
                # Append new config
                Add-Content -Path $profilePath -Value $additionBlock -Encoding UTF8
            }
            Write-Success "Updated: $profilePath"
        }
    }
}

function New-GitIgnore {
    param(
        [string]$ClaudePath,
        [bool]$DryRun
    )

    Write-Step "Creating .gitignore"

    $gitignorePath = Join-Path $ClaudePath ".gitignore"
    $gitignoreContent = @(
        "# Credentials - NEVER COMMIT",
        ".env",
        ".credentials.json",
        "*.pem",
        "*.key",
        "",
        "# OS files",
        ".DS_Store",
        "Thumbs.db",
        "desktop.ini",
        "",
        "# IDE",
        ".idea/",
        ".vscode/",
        "*.swp",
        "",
        "# Python",
        "__pycache__/",
        "*.py[cod]",
        ".venv/",
        "venv/",
        "",
        "# Node",
        "node_modules/",
        "",
        "# Temp files",
        "*.tmp",
        "*.temp",
        "*.log",
        "nul",
        ""
    )

    if (Test-Path $gitignorePath) {
        Write-Info ".gitignore already exists"
        return
    }

    if ($DryRun) {
        Write-DryRun "Would create: $gitignorePath"
    } else {
        $gitignoreContent | Out-File -FilePath $gitignorePath -Encoding UTF8 -Force
        Write-Success "Created: $gitignorePath"
    }
}

function Test-Configuration {
    param(
        [hashtable]$SystemInfo,
        [string]$Profile
    )

    Write-Header "CONFIGURATION VERIFICATION"

    $issues = @()

    # Check directories
    $requiredDirs = @(
        $SystemInfo.ClaudePath
        Join-Path $SystemInfo.ClaudePath "agents"
        Join-Path $SystemInfo.ClaudePath "skills"
        Join-Path $SystemInfo.ClaudePath "rules"
    )

    foreach ($dir in $requiredDirs) {
        if (Test-Path $dir) {
            Write-Success "Directory: $dir"
        } else {
            Write-Error "Missing directory: $dir"
            $issues += "Missing directory: $dir"
        }
    }

    # Check env files
    $envPath = Join-Path $SystemInfo.ClaudePath ".env"
    $envTemplatePath = Join-Path $SystemInfo.ClaudePath ".env.template"

    if (Test-Path $envTemplatePath) {
        Write-Success "Template: $envTemplatePath"
    } else {
        Write-Warning "Missing template: $envTemplatePath"
    }

    if (Test-Path $envPath) {
        Write-Success "Config: $envPath"
    } else {
        Write-Info "No .env file (create with -ApiKey)"
    }

    # Check profile
    if (Test-Path $SystemInfo.ProfilePath) {
        $profileContent = Get-Content $SystemInfo.ProfilePath -Raw
        if ($profileContent -match "CLAUDE_HOME") {
            Write-Success "Profile configured"
        } else {
            Write-Warning "Profile missing Claude config"
            $issues += "Profile missing Claude config"
        }
    }

    # Check dependencies
    if (-not $SystemInfo.PythonInstalled) {
        Write-Warning "Python not installed - orchestrator requires Python"
        $issues += "Python not installed"
    }

    if (-not $SystemInfo.GitInstalled) {
        Write-Warning "Git not installed"
        $issues += "Git not installed"
    }

    # Summary
    Write-Host ""
    if ($issues.Count -eq 0) {
        Write-Success "Configuration complete for profile: $Profile"
    } else {
        Write-Warning "Configuration completed with $($issues.Count) issues"
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor Yellow
        }
    }

    return $issues.Count -eq 0
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

function Main {
    Write-Header "CCA/CCG AUTO-CONFIG v$Script:Version"

    Write-Info "Profile: $Profile"
    Write-Info "Configuration: $($Script:Config[$Profile].Name)"

    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No changes will be made"
    }

    # Detect system
    $systemInfo = Get-SystemInfo
    Show-SystemInfo -Info $systemInfo

    # Create directories
    New-ClaudeDirectories -ClaudePath $systemInfo.ClaudePath -DryRun $DryRun

    # Configure environment
    Set-EnvironmentVariables `
        -SystemInfo $systemInfo `
        -Profile $Profile `
        -ApiKey $ApiKey `
        -GithubToken $GithubToken `
        -Force $Force `
        -DryRun $DryRun

    # Create gitignore
    New-GitIgnore -ClaudePath $systemInfo.ClaudePath -DryRun $DryRun

    # Verify
    if (-not $DryRun) {
        $success = Test-Configuration -SystemInfo $systemInfo -Profile $Profile
    } else {
        Write-Header "DRY RUN COMPLETE"
        Write-Info "Run without -DryRun to apply changes"
    }

    Write-Header "NEXT STEPS"
    Write-Host "1. Edit .env file with your API keys:" -ForegroundColor Cyan
    Write-Host "   $($systemInfo.ClaudePath)\.env" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Reload your shell profile:" -ForegroundColor Cyan
    if ($systemInfo.ProfileType -eq "PowerShell") {
        Write-Host "   . `$PROFILE" -ForegroundColor Gray
    } else {
        Write-Host "   source $($systemInfo.ProfilePath)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "3. Verify Claude CLI is installed:" -ForegroundColor Cyan
    Write-Host "   claude --version" -ForegroundColor Gray
    Write-Host ""
}

# Run main
Main
