---
description: ORCHESTRATOR V7 - Sistema di esecuzione multi-agent parallela con wave-based execution
allowed-tools: Task(*), Bash(*), Read(*), Write(*), Glob(*), Grep(*)
when: UserPromptSubmit
priority: 999
---

# ORCHESTRATOR V7 - WAVE-BASED PARALLEL EXECUTION

## ATTIVAZIONE

Questo hook si attiva su OGNI messaggio dell'utente che richiede orchestrazione.

### Segnali di Attivazione
- Verbi: "implementa", "crea", "aggiungi", "modifica", "fixa", "analizza", "ottimizza", "refactor", "testa"
- Multi-step: "e poi", "dopo", "anche", "inoltre"
- Multi-componente: "front", "back", "api", "db", "ui", "server", "client"
- Bug multipli: "fix questi N bug", "risolvi questi problemi"

### Skip Orchestration (task semplici)
- Domande informative: "cos'e", "come funziona", "spiega"
- Letture singole: "leggi il file X"
- Comandi diretti: "esegui npm install"

---

## EXECUTION FLOW

### STEP 1: Analisi Richiesta

Analizza la richiesta utente ed estrai:
- **Keywords**: Termini tecnici che identificano domini
- **Domini**: security, gui, database, api, devops, mql, trading, etc.
- **Complessita**: LOW (1 dominio) | MEDIUM (2) | HIGH (3-4) | CRITICAL (5+)
- **Dipendenze**: Quali task dipendono da altri

### STEP 2: Decomposizione in Task

Usando la logica di `decomposer.md`:
1. Mappa keywords ai domini
2. Crea task tree con wave
3. Assegna expert e model a ogni task
4. Identifica dipendenze

### STEP 3: Wave Execution

**REGOLA FONDAMENTALE**: Per eseguire N task in parallelo, invia UN SINGOLO messaggio con N chiamate Task tool.

```
Wave 1 (Analysis) -> Tutti i task Explore in parallelo (haiku)
    |
    v [SYNC]
Wave 2 (Implementation) -> Tutti i task Expert in parallelo (sonnet/opus)
    |
    v [SYNC]
Wave 3 (Integration) -> Architect Expert (opus)
    |
    v [SYNC]
Wave 4 (Validation) -> Reviewer + Tester in parallelo (sonnet)
    |
    v [SYNC]
Wave 5 (Documentation) -> Documenter (haiku)
```

---

## MODEL SELECTION (INTELLIGENTE)

### Haiku (veloce, economico)
- Wave 1: Analysis/Discovery
- Task ripetitivi
- Documentazione
- Task meccanici

### Sonnet (bilanciato)
- Wave 2: Implementation standard
- GUI, API, Database
- Testing
- Review

### Opus (massima qualita)
- Security tasks (SEMPRE)
- Architecture decisions
- Integration complessa
- Task critici

---

## OUTPUT FORMAT

Quando l'orchestrator si attiva, produce:

```
ORCHESTRATOR V7 - PARALLEL EXECUTION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALISI RICHIESTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Richiesta: {user_request}
Complessita: {LOW|MEDIUM|HIGH|CRITICAL}
Domini: {lista domini identificati}
Task totali: {N}
Waves: {W}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK DECOMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wave 1 (Analysis):
  [T1] {task}  ->  Explore (haiku)
  [T2] {task}  ->  Explore (haiku)
  [T3] {task}  ->  Explore (haiku)

Wave 2 (Implementation):
  [T4] {task}  ->  {Expert} (sonnet)
  [T5] {task}  ->  {Expert} (sonnet)
  [T6] {task}  ->  {Expert} (opus)

Wave 3 (Integration):
  [T7] {task}  ->  Architect Expert (opus)

Wave 4 (Validation):
  [T8] {task}  ->  Reviewer (sonnet)
  [T9] {task}  ->  Tester Expert (sonnet)

Wave 5 (Documentation):
  [T10] {task}  ->  Documenter (haiku)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION TABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Wave | Task | Agent              | Model  | Status |
|------|------|--------------------|--------|--------|
| W1   | T1   | Explore            | haiku  | ...    |
| W1   | T2   | Explore            | haiku  | ...    |
| W2   | T4   | Database Expert    | sonnet | ...    |
| W2   | T5   | GUI Super Expert   | sonnet | ...    |
| W3   | T7   | Architect Expert   | opus   | ...    |

Max parallelo: {N} task in Wave {X}
Speedup stimato: {X}x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTING WAVE 1...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## SPECIAL CASE: N FIX PARALLELI

Quando l'utente chiede di fixare N bug:

```
INPUT: "Fix questi 10 bug"

ANALYSIS:
- Bug indipendenti? -> TUTTI in Wave 1 parallela
- Bug con dipendenze? -> Raggruppa per dipendenze

EXECUTION (se indipendenti):

Wave 1 (10 task paralleli):
  [F1]  Fix bug 1   -> Expert (sonnet)
  [F2]  Fix bug 2   -> Expert (sonnet)
  ...
  [F10] Fix bug 10  -> Expert (sonnet)

Wave 2 (dopo tutti i fix):
  [R1]  Review      -> Reviewer (sonnet)
  [T1]  Test        -> Tester (sonnet)

SPEEDUP: 10 fix in ~15s invece di ~150s = 10x
```

---

## EXPERT AGENTS DISPONIBILI

### L1 Experts
- AI Integration Expert
- Architect Expert
- Database Expert
- DevOps Expert
- GUI Super Expert
- Integration Expert
- Languages Expert
- Mobile Expert
- MQL Expert
- N8N Expert
- Security Unified Expert
- Social Identity Expert
- Tester Expert
- Trading Strategy Expert

### L2 Specialists
- AI Model Specialist
- API Endpoint Builder L2
- Architect Design Specialist
- DB Query Optimizer L2
- DevOps Pipeline Specialist
- GUI Layout Specialist L2
- MQL Optimization L2
- Security Auth Specialist L2
- Test Unit Specialist L2
- Trading Risk Calculator L2

### Core Agents
- Analyzer
- Coder
- Documenter
- Reviewer
- Explore (ricerca)
- Plan (architettura)

---

## IMPLEMENTAZIONE

Per lanciare task paralleli, Claude deve inviare UN SINGOLO messaggio
contenente MULTIPLE chiamate Task tool. Esempio per Wave 1 con 4 task:

```
// UN messaggio, QUATTRO Task tool calls
Task(subagent_type="Explore", model="haiku", prompt="Analizza struttura codebase...")
Task(subagent_type="Explore", model="haiku", prompt="Analizza pattern security...")
Task(subagent_type="Explore", model="haiku", prompt="Analizza componenti GUI...")
Task(subagent_type="Explore", model="haiku", prompt="Analizza schema database...")

// TUTTI e 4 partono SIMULTANEAMENTE!
```

Dopo il completamento di Wave 1, procedi con Wave 2, e cosi via.

**SEMPRE rispettare dipendenze: Wave N+1 inizia solo dopo Wave N completata.**
