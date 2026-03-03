@echo off
REM ============================================================================
REM Orchestrator MCP Server - GitHub Push Script
REM ============================================================================
REM
REM 1. Crea il repo su GitHub: https://github.com/new
REM    - Nome: orchestrator-mcp-server
REM    - Public
REM    - Non aggiungere README/gitignore (già presenti)
REM
REM 2. Copia l'URL del tuo repo (es: https://github.com/TUO_USERNAME/orchestrator-mcp-server)
REM
REM 3. Esegui questo script e incolla l'URL quando richiesto
REM
REM ============================================================================

echo.
echo ========================================================================
echo   Orchestrator MCP Server - GitHub Push
echo ========================================================================
echo.
echo Prima di continuare, assicurati di aver creato il repo su GitHub:
echo   https://github.com/new
echo.
echo   Repository name: orchestrator-mcp-server
echo   Description: MCP server for Claude Code Orchestrator Plugin
echo   Visibility: Public
echo   [ ] Non aggiungere README, .gitignore o license
echo.
echo ========================================================================
echo.

set /p GITHUB_URL="Incolla l'URL del tuo repository GitHub: "

if "%GITHUB_URL%"=="" (
    echo.
    echo ERRORE: Devi inserire l'URL del repository
    echo Esempio: https://github.com/LeoDg/orchestrator-mcp-server
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo   Configurazione remote e push...
echo ========================================================================
echo.

cd /d "%~dp0"

git remote add origin %GITHUB_URL% 2>nul
git remote set-url origin %GITHUB_URL%
git branch -M main

echo.
echo Push in corso...
echo.

git push -u origin main

echo.
echo ========================================================================
if %ERRORLEVEL% EQU 0 (
    echo   ✅ SUCCESSO! Repo pubblicato su GitHub!
    echo.
    echo   URL: %GITHUB_URL%
    echo.
    echo   Prossimi passi:
    echo   1. Aggiorna .mcp.json con il tuo URL corretto
    echo   2. Riavvia Claude Code
    echo   3. Gli strumenti MCP saranno disponibili
) else (
    echo   ❌ ERRORE durante il push
    echo.
    echo   Possibili cause:
    echo   - Repo non creato su GitHub
    echo   - URL errato
    echo   - Problemi di autenticazione (usa GitHub PAT o SSH key)
    echo.
    echo   Per configurare Git con credenziali:
    echo   git config --global credential.helper store
)
echo ========================================================================
echo.
pause
