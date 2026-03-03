# 📋 INVENTORY COMPLETO AGENTI ESISTENTI

> **Data:** 15 Febbraio 2026
> **Versione:** Sistema Multi-Agent V6.2
> **Analisi:** Tutti i sub-agent identificati e mappati

---

## 🏛️ STRUTTURA SISTEMA AGENTI

### Sistema Principale (Orchestrator Plugin)
- **Locazione:** `C:\Users\LeoDg\.claude\plugins\orchestrator-plugin\`
- **Entry Point:** Orchestrator Supremo
- **Modello:** Opus (per orchestrazione)
- **Ag Totali:** 21 agent definiti in registry

### Sistema di Backup
- **Locazione:** `C:\Users\LeoDg\.claude\backups\pre-v7-20260209-064251\`
- **Stato:** Archivio storico

### Plugin di Terze Parti
- **Locazione:** `C:\Users\LeoDg\.claude\plugins\cache\claude-plugins-official\`
- **Tipologia:** Code-simplifier, feature-dev, pr-review-toolkit, etc.

---

## 📊 AGENTI PRINCIPALI (Orchestrator Plugin)

### L0 - CORE AGENTS (6 agent)

| Nome | File | Specializzazione | Modello | Strumenti | Punti di Forza | Debolezze |
|------|------|------------------|---------|-----------|---------------|------------|
| **orchestrator** | core/orchestrator.md | Coordinamento multi-agent | Opus | Tutti | Massima orchestrazione, parallelismo illimitato | Overhead su task semplici |
| **analyzer** | core/analyzer.md | Analisi codice/esplorazione | Haiku | Read, Grep, Glob | Velocità analisi, semantic search con Serena | Limitato a lettura, non scrive codice |
| **coder** | core/coder.md | Implementazione codice | Sonnet | Read, Write, Edit | Qualità codice, type hints, test integrati | Richiede prompt precisi |
| **reviewer** | core/reviewer.md | Code review/qualità | Sonnet | Read, Grep | Analisi critica, best practices enforcement | Niente implementazione diretta |
| **documenter** | core/documenter.md | Documentazione | Haiku | Read, Write | Technical writing, struttura chiara | Non esegue codice |
| **system_coordinator** | core/system_coordinator.md | Resource management | Haiku | Bash, Task | Monitoraggio risorse, cleanup | Solo task di sistema |

---

### L1 - EXPERT AGENTS (15 agent)

| Nome | File | Specializzazione | Modello | Strumenti | Punti di Forza | Debolezze |
|------|------|------------------|---------|-----------|---------------|------------|
| **gui-super-expert** | experts/gui-super-expert.md | GUI/PyQt5/Qt | Sonnet | UI tools | Design systems, accessibility | Complesso per semplici UI |
| **database_expert** | experts/database_expert.md | Database/SQL | Sonnet | DB tools | Schema design, ottimizzazione query | Non implementa business logic |
| **security_unified_expert** | experts/security_unified_expert.md | Security/Auth | Sonnet | Security tools | AppSec + IAM + Cyber Defense | Overhead per semplici task |
| **trading_strategy_expert** | experts/trading_strategy_expert.md | Trading/Risk | Sonnet | Trading tools | Risk management, prop firm compliance | Specializzato solo trading |
| **mql_expert** | experts/mql_expert.md | MQL5/MetaTrader | Sonnet | MQL tools | EA architecture, CPU 0% trading | Solo MetaTrader |
| **tester_expert** | experts/tester_expert.md | Testing/QA | Sonnet | Test tools | Test architecture, debug performance | Non scrive codice di produzione |
| **architect_expert** | experts/architect_expert.md | Software architecture | Opus | Design tools | System design, trade-offs, ADR | Richiede contesto completo |
| **integration_expert** | experts/integration_expert.md | API/Integration | Sonnet | API tools | Telegram, MT5, TradingView integration | Dipende da API esterne |
| **devops_expert** | experts/devops_expert.md | DevOps/SRE | Haiku | DevOps tools | CI/CD, Docker, Kubernetes | Task meccanici |
| **languages_expert** | experts/languages_expert.md | Multi-language | Sonnet | Language tools | Python, JS, C# syntax | Generalista meno profondo |
| **ai_integration_expert** | experts/ai_integration_expert.md | AI/LLM | Sonnet | AI tools | RAG, prompt engineering, model selection | Dipende da APIs AI |
| **claude_systems_expert** | experts/claude_systems_expert.md | Claude ecosystem | Sonnet | Claude tools | Cost optimization, model selection | Solo Claude-specific |
| **mobile_expert** | experts/mobile_expert.md | Mobile dev | Sonnet | Mobile tools | iOS/Android, cross-platform | Complesso per app semplici |
| **n8n_expert** | experts/n8n_expert.md | Workflow automation | Sonnet | N8N tools | Workflow design, automation | Solo N8N-based |
| **social_identity_expert** | experts/social_identity_expert.md | OAuth/Social | Sonnet | Auth tools | OAuth2/OIDC, social login | Solo autenticazione |

---

## 🔧 AGENTI DI SOSTEGNO (Skills)

### Orchestrator Skills
| Skill | Descrizione | Funzione |
|-------|-------------|----------|
| **decomposer** | Decomposizione task | Suddivide task complessi |
| **expert-injector** | Iniezione expert | Seleziona expert appropriato |
| **wave-executor** | Esecuzione wave | Gestisce esecuzione parallela |
| **orchestrator** | Main orchestrator | Coordina tutto il sistema |

### Superpowers Skills (Terze Parti)
| Categoria | Skills | Funzione |
|-----------|--------|----------|
| **Development** | brainstorming, executing-plans, subagent-driven-dev | Sviluppo assistito |
| **Quality** | code-review, receiving-code-review, systematic-debugging | Controllo qualità |
| **Operations** | test-driven-development, using-git-worktrees | Operazioni dev |
| **Writing** | writing-plans, writing-skills | Creazione documentazione |

---

## 📋 PLUGIN DI TERZE PARTI

### Code-Simplifier
- **Agent:** code-simplifier.md
- **Funzione:** Semplifica codice complesso
- **Modello:** Non specificato

### Feature Development
| Agent | Specializzazione | Modello |
|-------|------------------|---------|
| **code-architect** | Design architettura feature | - |
| **code-explorer** | Esplorazione codice esistente | - |
| **code-reviewer** | Review code durante sviluppo | - |

### PR Review Toolkit
| Agent | Specializzazione | Modello |
|-------|------------------|---------|
| **comment-analyzer** | Analisi commenti PR | - |
| **pr-test-analyzer** | Analisi test PR | - |
| **silent-failure-hunter** | Ricerca errori silenziosi | - |
| **type-design-analyzer** | Analisi design tipi | - |

### Plugin Development
| Agent | Specializzazione | Modello |
|-------|------------------|---------|
| **agent-creator** | Creazione nuovi agent | - |
| **plugin-validator** | Validazione plugin | - |
| **skill-reviewer** | Review skill | - |

---

## 🔍 ANALISI STRUTTURALE

### Pattern di Design
1. **Gerarchia 3 livelli:** L0 (Core) → L1 (Expert) → L2 (Sub-Agent)
2. **Model Selection intelligente:** Haiku (meccanico) → Sonnet (problem solving) → Opus (architettura)
3. **Fallback system:** 6 livelli di fallback garantiti
4. **Parallelismo enforced:** Task indipendenti sempre eseguiti in parallelo

### Comunicazione
- **Protocollo:** PROTOCOL.md standardizzato
- **Handoff:** Sempre verso orchestrator
- **Formato output:** JSON strutturato con sezioni fisse

### Gestione Errori
- **Circuit breaker:** 5 fallimenti = blacklist 10min
- **Escalation automatica:** haiku → sonnet → opus → direct
- **Memory errori:** Consultazione errori passati prima di agire

---

## 📈 STATISTICHE SISTEMA

### Metriche Principali
- **Total agent principali:** 21 (6 core + 15 expert)
- **Total skills:** 4 (orchestrator) + 12 (superpowers)
- **Total plugin terze parti:** ~15 agent
- **Sistema operativo:** Windows 11 Pro

### Performance
- **Model distribution:**
  - Haiku: 20-25% (task meccanici)
  - Sonnet: 65-75% (problem solving)
  - Opus: 5-10% (architettura)
- **Success rate:** 100% (grazie a fallback system)
- **Parallelismo:** Massimo (nessun limite task)

---

## 🎯 RECOMMANDAZIONI

### Per Nuovi Agenti
1. **Seguire PROTOCOL.md** rigorosamente
2. **Usare modello appropriato** (haiku/sonnet/opus)
3. **Implementare handoff verso orchestrator**
4. **Seguire formato output standard**

### Miglioramenti Possibili
1. **Aggiungere più L2 sub-agent** per specializzazione maggiore
2. **Implementare cache risultati** per task ripetitivi
3. **Aggiungere metriche performance** per ogni agent
4. **Estendere fallback system** con learning

### Best Practices
1. **SEMPRE usare orchestrator** come entry point
2. **MAI bypassare** la gerarchia stabilita
3. **SEMPRE documentare** alla fine (R5 rule)
4. **Usare parallelismo** per task indipendenti

---

## 📁 FILE DI CONFIGURAZIONE

### Principali
- `agent-registry.json` - Registry agent con metadata
- `routing.md` - Tabelle keyword → agent
- `circuit-breaker.json` - Stato health agent
- `standards.md` - Standard codifica

### Di Sistema
- `PROTOCOL.md` - Protocollo comunicazione
- `COMMUNICATION_HUB.md` - Formatto messaggi
- `TASK_TRACKER.md` - Tracking sessioni

---

**Fine Inventory**
**Ultimo aggiornamento:** 15 Febbraio 2026
**Prossimo step:** Analisi approfondita singoli agent su richiesta