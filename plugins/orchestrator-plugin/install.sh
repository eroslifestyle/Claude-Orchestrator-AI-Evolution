#!/bin/bash
# install.sh - Orchestrator Plugin Installer for Linux/Mac
# Run: curl -fsSL https://raw.githubusercontent.com/eroslifestyle/orchestrator-plugin/main/install.sh | bash

set -e

echo ""
echo "=============================================================="
echo "     ORCHESTRATOR PLUGIN INSTALLER v2.1.0"
echo "     Multi-Agent Orchestration for Claude Code"
echo "=============================================================="
echo ""

# Paths
CLAUDE_DIR="$HOME/.claude"
PLUGINS_DIR="$CLAUDE_DIR/plugins"
ORCHESTRATOR_DIR="$PLUGINS_DIR/orchestrator-plugin"
SETTINGS_PATH="$CLAUDE_DIR/settings.local.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check Python
echo -e "${YELLOW}[1/6] Checking Python...${NC}"
if command -v python3 &> /dev/null; then
    PY_VER=$(python3 --version 2>&1)
    if [[ $PY_VER =~ 3\.(1[0-9]|[2-9][0-9]) ]]; then
        echo -e "      ${GREEN}OK: $PY_VER${NC}"
    else
        echo -e "      ${RED}FAIL: Python 3.10+ required, found: $PY_VER${NC}"
        exit 1
    fi
else
    echo -e "      ${RED}FAIL: Python 3.10+ not found${NC}"
    echo -e "      Install from: https://www.python.org/downloads/"
    exit 1
fi

# Step 2: Install UV
echo -e "${YELLOW}[2/6] Installing UV...${NC}"
if command -v uv &> /dev/null; then
    UV_VER=$(uv --version 2>&1)
    echo -e "      ${GREEN}OK: UV already installed ($UV_VER)${NC}"
else
    echo -e "      Installing UV..."
    curl -LsSf https://astral.sh/uv/install.sh | sh

    # Add to PATH for current session
    export PATH="$HOME/.local/bin:$PATH"

    # Verify installation
    if command -v uv &> /dev/null; then
        UV_VER=$(uv --version 2>&1)
        echo -e "      ${GREEN}OK: UV installed ($UV_VER)${NC}"
    else
        # Try pip install as fallback
        echo -e "      Trying pip install..."
        pip3 install uv --quiet
        if command -v uv &> /dev/null; then
            echo -e "      ${GREEN}OK: UV installed via pip${NC}"
        else
            echo -e "      ${RED}FAIL: UV installation failed${NC}"
            exit 1
        fi
    fi
fi

# Step 3: Create directories
echo -e "${YELLOW}[3/6] Creating directories...${NC}"
mkdir -p "$CLAUDE_DIR"
mkdir -p "$PLUGINS_DIR"
echo -e "      ${GREEN}OK: Directories created${NC}"

# Step 4: Clone/Update repository
echo -e "${YELLOW}[4/6] Downloading Orchestrator Plugin...${NC}"
if [ -d "$ORCHESTRATOR_DIR" ]; then
    echo -e "      Updating existing installation..."
    cd "$ORCHESTRATOR_DIR"
    git pull origin main 2>/dev/null || git fetch origin && git reset --hard origin/main
    cd - > /dev/null
else
    git clone https://github.com/eroslifestyle/orchestrator-plugin.git "$ORCHESTRATOR_DIR"
fi

if [ -d "$ORCHESTRATOR_DIR" ]; then
    echo -e "      ${GREEN}OK: Plugin downloaded${NC}"
else
    echo -e "      ${RED}FAIL: Clone failed${NC}"
    exit 1
fi

# Step 5: Create/Update settings.local.json
echo -e "${YELLOW}[5/6] Configuring Claude Code...${NC}"

if [ -f "$SETTINGS_PATH" ]; then
    # Check if orchestrator is already in the list
    if grep -q '"orchestrator"' "$SETTINGS_PATH"; then
        echo -e "      ${GREEN}OK: settings.local.json already configured${NC}"
    else
        # Try to add orchestrator to existing list (simple approach)
        # Create backup
        cp "$SETTINGS_PATH" "$SETTINGS_PATH.bak"

        # Create new settings file
        cat > "$SETTINGS_PATH" << 'EOF'
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
EOF
        echo -e "      ${GREEN}OK: settings.local.json updated${NC}"
    fi
else
    cat > "$SETTINGS_PATH" << 'EOF'
{
  "enabledMcpjsonServers": [
    "orchestrator"
  ],
  "enableAllProjectMcpServers": true
}
EOF
    echo -e "      ${GREEN}OK: settings.local.json created${NC}"
fi

# Step 6: Create skills directory and SKILL.md
echo -e "${YELLOW}[6/6] Setting up skills...${NC}"
SKILLS_DIR="$ORCHESTRATOR_DIR/skills/orchestrator"
mkdir -p "$SKILLS_DIR"

cat > "$SKILLS_DIR/SKILL.md" << 'EOF'
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
EOF
echo -e "      ${GREEN}OK: Skill created${NC}"

# Verification
echo ""
echo -e "${CYAN}[VERIFICATION]${NC}"

ALL_OK=true

check_file() {
    if [ -f "$1" ]; then
        echo -e "  ${GREEN}[OK]${NC} $2"
    else
        echo -e "  ${RED}[FAIL]${NC} $2"
        ALL_OK=false
    fi
}

check_file "$SETTINGS_PATH" "settings.local.json"
check_file "$ORCHESTRATOR_DIR/.mcp.json" ".mcp.json"
check_file "$ORCHESTRATOR_DIR/.claude-plugin/plugin.json" "plugin.json"
check_file "$ORCHESTRATOR_DIR/mcp_server/server.py" "mcp_server/server.py"
check_file "$SKILLS_DIR/SKILL.md" "skills/orchestrator/SKILL.md"

# Done
echo ""
if [ "$ALL_OK" = true ]; then
    echo "=============================================================="
    echo "     INSTALLATION COMPLETE!"
    echo "=============================================================="
    echo ""
    echo "  Next steps:"
    echo "  1. Restart VS Code / Claude Code completely"
    echo "  2. Test with: /orchestrator Test di verifica"
    echo ""
    echo "  MCP Tools available after restart:"
    echo "  - mcp__orchestrator__orchestrator_analyze"
    echo "  - mcp__orchestrator__orchestrator_execute"
    echo "  - mcp__orchestrator__orchestrator_agents"
    echo "  - mcp__orchestrator__orchestrator_status"
    echo "  - mcp__orchestrator__orchestrator_preview"
    echo ""
    echo "=============================================================="
else
    echo "=============================================================="
    echo "     INSTALLATION INCOMPLETE"
    echo "=============================================================="
    echo ""
    echo "  Some files are missing. Check the errors above."
    echo "  Make sure the repository contains all required files."
    echo ""
    echo "=============================================================="
fi
