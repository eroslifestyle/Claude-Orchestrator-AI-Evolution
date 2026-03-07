## [2026-02-18] Orchestrator SKILL.md - Agent Teams Gap Fix

### Modifiche applicate
- Aggiunta sezione PREREQUISITES con configurazione settings.json per abilitare Agent Teams (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env var + teammateMode)
- Aggiunto disclaimer EXPERIMENTAL FEATURE
- Aggiunto SPAWNING NOTE: teammates via linguaggio naturale, Claude decide autonomamente
- Aggiunto CONTEXT INHERITANCE note: teammates non ereditano la history del lead
- Aggiunta sezione KNOWN LIMITATIONS con 7 limitazioni documentate
- Aggiunto Windows warning: /resume non ripristina teammates in-process

### File modificati
- C:\Users\LeoDg\.claude\skills\orchestrator\SKILL.md
- C:\Users\LeoDg\.claude\.claude-anthropic\skills\orchestrator\SKILL.md

### Motivazione
Completamento della documentazione ufficiale per la feature Agent Teams con configurazione sperimentale e limitazioni note.

---

## [2026-02-16] Sincronizzazione Completa GLM — Doppia Istanza VS Code

### Sincronizzazione assets da Anthropic → GLM
- agents/: 158 file copiati (39 agenti L0/L1/L2 — Analyzer, Coder, Reviewer, Documenter + 18 L1 Expert + 15 L2 Specialist)
- skills/: 50 file copiati (7 skills — orchestrator, api-design, code-review, debugging, git-workflow, testing-strategy, remotion-best-practices)
- plugins/: orchestrator-plugin v7.0 copiato completo
- CLAUDE.md: orchestrator mode identico (obbligatorio per tutte le richieste)
- settings.local.json: MCP plugins identici (web-reader, web-search-prime, canva, slack, orchestrator-mcp, playwright)

### Verifica integrità
- Entrambe le istanze Anthropic e GLM ora hanno struttura identica
- settings.json GLM preservato: model=glm-5, BASE_URL=https://api.z.ai/api/anthropic
- settings.local.json: MCP config identica (6 plugin attivi)
- Nessun conflitto tra provider (isolamento completo)

### Setup Dual Provider
**Istanza Anthropic (default):**
```powershell
code E:\Dropbox\1_Forex\Programmazione\NexusArb
# Usa ~/.claude/settings.json (Anthropic Pro, claude-3-5-sonnet-20241022)
```

**Istanza GLM-5:**
```powershell
vsg E:\Dropbox\1_Forex\Programmazione\NexusArb
# Usa ~/.claude-glm-home/.claude/settings.json (GLM-5, Z.ai token)
```

### Doppia istanza simultanea possibile
Entrambe le sessioni possono girare in parallelo senza conflitti. HOME override isolato per `vsg`.

## [2026-02-16] Dual Provider Setup - Completato

### Modifiche precedenti
- `~/.claude-glm-home/.claude/settings.json`: Rimossa ANTHROPIC_API_KEY duplicata, permissions ristrette
- `~/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1`: `ccg` aggiornato con `--settings` nativo
- `~/Documents/PowerShell/Microsoft.PowerShell_profile.ps1`: `ccg` aggiornato (identico PS7)
- Directory create: `.claude-glm-home/AppData/Roaming`, `.claude-glm-home/.vscode-data`

### Fix critico
`ccg` ora usa `--settings "$glmHome\.claude\settings.json"` invece di HOME override.
HOME/USERPROFILE/APPDATA override mantenuto solo per `vsg` (VS Code extension).

### Test precedenti
Tutti e 4 i test automatici passati:
- TEST 1: `claude --print "..."` → risponde claude-3-5-sonnet-20241022 ✅
- TEST 2: `ccg --print "..."` → risponde glm-5 ✅
- TEST 3: Config integrity (BASE_URL="") ✅
- TEST 4: GLM settings (API_KEY rimossa, model=glm-5) ✅
