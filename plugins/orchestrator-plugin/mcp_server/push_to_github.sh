#!/bin/bash
# ============================================================================
# Orchestrator MCP Server - GitHub Push Script
# ============================================================================
#
# 1. Crea il repo su GitHub: https://github.com/new
#    - Nome: orchestrator-mcp-server
#    - Public
#    - Non aggiungere README/gitignore (già presenti)
#
# 2. Copia l'URL del tuo repo (es: https://github.com/TUO_USERNAME/orchestrator-mcp-server)
#
# 3. Esegui questo script e incolla l'URL quando richiesto
#
# ============================================================================

echo ""
echo "========================================================================"
echo "  Orchestrator MCP Server - GitHub Push"
echo "========================================================================"
echo ""
echo "Prima di continuare, assicurati di aver creato il repo su GitHub:"
echo "  https://github.com/new"
echo ""
echo "  Repository name: orchestrator-mcp-server"
echo "  Description: MCP server for Claude Code Orchestrator Plugin"
echo "  Visibility: Public"
echo "  [ ] Non aggiungere README, .gitignore o license"
echo ""
echo "========================================================================"
echo ""

read -p "Incolla l'URL del tuo repository GitHub: " GITHUB_URL

if [ -z "$GITHUB_URL" ]; then
    echo ""
    echo "ERRORE: Devi inserire l'URL del repository"
    echo "Esempio: https://github.com/LeoDg/orchestrator-mcp-server"
    exit 1
fi

echo ""
echo "========================================================================"
echo "  Configurazione remote e push..."
echo "========================================================================"
echo ""

cd "$(dirname "$0")"

git remote add origin "$GITHUB_URL" 2>/dev/null
git remote set-url origin "$GITHUB_URL"
git branch -M main

echo ""
echo "Push in corso..."
echo ""

if git push -u origin main; then
    echo ""
    echo "========================================================================"
    echo "  ✅ SUCCESSO! Repo pubblicato su GitHub!"
    echo ""
    echo "  URL: $GITHUB_URL"
    echo ""
    echo "  Prossimi passi:"
    echo "  1. Aggiorna .mcp.json con il tuo URL corretto"
    echo "  2. Riavvia Claude Code"
    echo "  3. Gli strumenti MCP saranno disponibili"
    echo "========================================================================"
else
    echo ""
    echo "========================================================================"
    echo "  ❌ ERRORE durante il push"
    echo ""
    echo "  Possibili cause:"
    echo "  - Repo non creato su GitHub"
    echo "  - URL errato"
    echo "  - Problemi di autenticazione (usa GitHub PAT o SSH key)"
    echo ""
    echo "  Per configurare Git con credenziali:"
    echo "  git config --global credential.helper store"
    echo "========================================================================"
    exit 1
fi
