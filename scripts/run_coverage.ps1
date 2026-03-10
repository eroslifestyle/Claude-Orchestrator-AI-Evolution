# Coverage Runner Script (Windows PowerShell)
# Runs pytest with coverage and generates report

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LibDir = Join-Path (Split-Path -Parent $ScriptDir) "lib"

Set-Location $LibDir

Write-Host "Running coverage report..."
python tests/coverage_runner.py

Write-Host "Coverage report complete."
