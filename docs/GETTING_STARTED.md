---
title: Getting Started - Orchestrator V15.1.0
version: V15.1.0
last_updated: 2026-03-08
language: it
module: orchestrator
tags: [getting-started, quickstart, tutorial, beginner]
---

# Getting Started - Orchestrator V15.1.0

> Guida introduttiva per iniziare a utilizzare l'Orchestrator AI-Native

---

## Indice

1. [Prerequisiti](#prerequisiti)
2. [Installazione](#installazione)
3. [Quick Start](#quick-start)
4. [Concetti Base](#concetti-base)
5. [Primi Passi](#primi-passi)
6. [Workflow Comuni](#workflow-comuni)
7. [Troubleshooting](#troubleshooting)
8. [Prossimi Passi](#proximi-passi)

---

## Prerequisiti

### Sistema Operativo

| OS | Supporto | Note |
|----|----------|------|
| Windows 10/11 | Completo | Job Objects per cleanup |
| Linux | Completo | Process groups |
| macOS | Completo | Process groups |

### Software Richiesto

- **Claude Code CLI** (cca o ccg profile)
- **Git** per version control
- **Python 3.10+** per moduli core

### Configurazione

Assicurati che il file `CLAUDE.md` sia presente nella root del progetto:

```
PROJECT_PATH/
  CLAUDE.md      # Istruzioni progetto
  .claude/
    agents/      # 43 agenti
    skills/      # 32 skill
    rules/       # 11 file regole
    lib/         # Moduli core
```

---

## Installazione

### Passo 1: Verifica Installazione

```bash
# Verifica che Claude Code sia installato
claude --version

# Verifica orchestrator skill
ls ~/.claude/skills/orchestrator/SKILL.md
```

### Passo 2: Configurazione Progetto

L'orchestrator e gia integrato in Claude Code. Non serve installazione aggiuntiva.

Per verificare che tutto funzioni:

```bash
# Nella directory del progetto
claude

# Dall'interno di Claude Code, invoca:
/orchestrator "check project status"
```

---

## Quick Start

### Il Tuo Primo Task

```bash
# Esempio: fix di un bug
/orchestrator "fix the null pointer exception in login.py"
```

### Cosa Succede

1. **Analisi**: L'orchestrator analizza la richiesta
2. **Routing**: Seleziona l'agente migliore (es. Coder)
3. **Delega**: Passa il task al subagent
4. **Esecuzione**: Il subagent completa il lavoro
5. **Verifica**: Review automatica delle modifiche
6. **Report**: Tabella finale con risultati

---

## Concetti Base

### Cos'e l'Orchestrator

Un sistema **AI-Native** che delega tutto il lavoro a subagenti specializzati. Non esegue mai lavoro direttamente.

**Principio fondamentale:**
> Commander, not soldier. L'orchestrator coordina, gli agenti eseguono.

### Come Funziona il Routing

L'orchestrator utilizza **RoutingEngineV2** con 4-layer keyword matching:

| Task | Agente Selezionato |
|------|-------------------|
| "fix bug" | Coder |
| "add test" | Tester Expert |
| "optimize query" | DB Query Optimizer |
| "security audit" | Security Expert |
| "document API" | Documenter |

### Agenti Disponibili (43 Totali)

**Core Agents (6):**
| Agente | Ruolo |
|--------|-------|
| orchestrator | Coordinamento centrale |
| analyzer | Analisi codice |
| coder | Implementazione |
| reviewer | Validazione qualita |
| documenter | Documentazione |
| system_coordinator | Gestione risorse |

**L1 Experts (22):** Specialisti per domini (database, security, GUI, ecc.)

**L2 Specialists (15):** Sub-specialisti (query optimizer, auth specialist, ecc.)

Vedi [agents/INDEX.md](../agents/INDEX.md) per lista completa.

### Skills Disponibili (32 Totali)

| Categoria | Skills |
|-----------|--------|
| Core | orchestrator, code-review, git-workflow, testing-strategy |
| Workflow | plan, tdd-workflow, security-scan, refactor-clean, fix |
| Utility | checkpoint, sessions, status, metrics |
| Language | python-patterns, typescript-patterns, go-patterns |
| Learning | learn, evolve |

---

## Primi Passi

### Task Semplice

```bash
# Analisi codice
/orchestrator "analyze the authentication module"

# Fix bug
/orchestrator "fix the timeout issue in api_client.py"

# Aggiungi test
/orchestrator "add unit tests for UserService"
```

### Output Atteso

```
| # | Task | Agent | Model | Mode | Status |
|---|------|-------|-------|------|--------|
| 1 | Analyze auth module | analyzer | haiku | SUBAGENT | SUCCESS |
```

### Task con Path Specifico

```bash
/orchestrator "fix bug in /projects/myapp/src/login.py"
```

---

## Workflow Comuni

### 1. Task Semplice (1 operazione)

```bash
/orchestrator "add input validation to email field"
```

**Flusso:** Delega singola -> Coder -> Review -> Done

### 2. Task Complesso (multi-step)

```bash
/orchestrator "implement user registration with email verification"
```

**Flusso:**
1. Analyzer esplora codice esistente
2. Architect definisce struttura
3. Coder implementa
4. Reviewer verifica
5. Documenter aggiorna docs

### 3. Task Multi-file

```bash
/orchestrator "refactor the API layer to use dependency injection"
```

**Flusso:** Team di agenti in parallelo, ogni file gestito da agente diverso.

### 4. Debugging

```bash
/orchestrator "debug why payments fail in production"
```

**Flusso:**
1. Analyzer identifica errori nei log
2. Security Expert verifica vulnerabilita
3. Coder applica fix
4. Tester Expert aggiunge test di regressione

---

## Troubleshooting

### Errori Comuni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| "Agent unavailable" | Agente non trovato | Fallback automatico a Coder |
| "Task timeout" | Task >5 min | Restart con contesto fresco |
| "File conflict" | Accesso concorrente | Sequential con lock |
| "Rate limit (429)" | Troppe API call | Exponential backoff |

### FAQ

**Q: L'orchestrator non risponde?**
A: Verifica che il skill sia caricato: `ls ~/.claude/skills/orchestrator/SKILL.md`

**Q: Task fallisce ripetutamente?**
A: Controlla i log in `docs/worklog.md` per errori ricorrenti.

**Q: Come cambio agente?**
A: L'orchestrator seleziona automaticamente. Per forzare, sii piu specifico: "use database expert to optimize query"

**Q: Posso vedere cosa sta facendo?**
A: Si, ogni step mostra la tabella task con status aggiornato.

### Come Ottenere Aiuto

```bash
# Help inline
/orchestrator "help"

# Status sistema
/orchestrator "show system status"

# Metriche
/orchestrator "show metrics"
```

---

## Prossimi Passi

### Documentazione Avanzata

- [ARCHITECTURE.md](orchestrator/ARCHITECTURE.md) - Architettura sistema
- [agents/INDEX.md](../agents/INDEX.md) - Tutti gli agenti
- [rules/README.md](../rules/README.md) - Sistema regole

### Skills Utili

```bash
/code-review "review my changes"
/testing-strategy "suggest test coverage"
/security-scan "check for vulnerabilities"
```

### Best Practices

1. **Sii specifico**: "fix bug in login.py line 42" > "fix bug"
2. **Usa path assoluti**: Evita ambiguita
3. **Verifica risultati**: Controlla sempre la tabella finale
4. **Documenta**: Aggiorna docs dopo modifiche importanti

---

**Status:** Production Ready
**Version:** V15.1.0
**Performance:** 9000+ ops/sec, 0% error rate
