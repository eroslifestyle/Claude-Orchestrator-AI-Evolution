# Wave Executor - Motore di Esecuzione Parallela

## Scopo
Esegue wave di task in parallelo usando il Task tool di Claude Code.

---

## PRINCIPIO FONDAMENTALE

> "If you intend to call multiple tools and there are no dependencies between them,
> make all independent tool calls in parallel."

**UN SINGOLO MESSAGGIO con MULTIPLE Task tool calls = PARALLELISMO REALE**

---

## EXECUTION ENGINE

### Come Lanciare Task Paralleli

Per eseguire N task simultaneamente, Claude deve inviare UN SOLO messaggio
contenente N chiamate Task tool. Questo e l'unico modo per ottenere
parallelismo reale in Claude Code.

### Esempio Wave Analysis (4 task paralleli)

```
// In un SINGOLO messaggio, Claude chiama:

Task #1:
  subagent_type: "Explore"
  model: "haiku"
  description: "Analyze codebase"
  prompt: "Analizza struttura codebase, trova file principali..."

Task #2:
  subagent_type: "Explore"
  model: "haiku"
  description: "Analyze security"
  prompt: "Cerca file sicurezza, auth, JWT..."

Task #3:
  subagent_type: "Explore"
  model: "haiku"
  description: "Analyze GUI"
  prompt: "Trova file GUI/UI, identifica framework..."

Task #4:
  subagent_type: "Explore"
  model: "haiku"
  description: "Analyze database"
  prompt: "Cerca file database, models, schema..."

// TUTTI e 4 partono SIMULTANEAMENTE!
```

---

## WAVE EXECUTION FLOW

### Wave 1: Analysis (sempre haiku, sempre Explore)
```
TRIGGER: Inizio orchestrazione
PARALLEL: SI (tutti insieme)
MODEL: haiku (veloce, economico)
AGENT: Explore (specializzato in ricerca)

Tasks:
- Analyze codebase structure
- Analyze domain-specific patterns
- Identify existing implementations
- Map dependencies
```

### Wave 2: Implementation (expert-specific)
```
TRIGGER: Wave 1 completata
PARALLEL: SI (task indipendenti)
MODEL: sonnet/opus (in base al dominio)
AGENT: Expert specifico per dominio

Tasks (esempio 4 domini):
- Database Expert: Implementa schema/models
- Security Expert: Implementa auth logic
- GUI Expert: Implementa forms/views
- Integration Expert: Implementa API endpoints
```

### Wave 3: Integration (sempre opus, sempre Architect)
```
TRIGGER: Wave 2 completata
PARALLEL: NO (singolo task)
MODEL: opus (massima qualita)
AGENT: Architect Expert

Tasks:
- Integra tutti i componenti
- Risolvi conflitti
- Verifica coerenza architetturale
```

### Wave 4: Validation (reviewer + tester)
```
TRIGGER: Wave 3 completata
PARALLEL: SI
MODEL: sonnet
AGENT: Reviewer, Tester Expert

Tasks:
- Security review
- Code review
- Run tests
- Verify coverage
```

### Wave 5: Documentation (sempre ultimo, sempre haiku)
```
TRIGGER: Wave 4 completata
PARALLEL: NO
MODEL: haiku
AGENT: Documenter

Tasks:
- Update changelog
- Update readme
- Add code comments
```

---

## AVAILABLE SUBAGENT TYPES

Questi sono i subagent_type validi per il Task tool:

### Core Agents
- `Explore` - Ricerca veloce nel codebase
- `general-purpose` - Task generici
- `Plan` - Pianificazione architetturale
- `Bash` - Esecuzione comandi

### Expert Agents (L1)
- `AI Integration Expert` - AI/ML integration
- `Architect Expert` - System architecture
- `Database Expert` - Database design
- `DevOps Expert` - CI/CD, deployment
- `GUI Super Expert` - GUI/UX design
- `Integration Expert` - API integration
- `Languages Expert` - Multi-language coding
- `Mobile Expert` - Mobile development
- `MQL Expert` - MetaTrader development
- `N8N Expert` - Workflow automation
- `Security Unified Expert` - Security
- `Social Identity Expert` - OAuth/OIDC
- `Tester Expert` - Testing/QA
- `Trading Strategy Expert` - Trading systems

### Specialist Agents (L2)
- `AI Model Specialist` - Model selection
- `API Endpoint Builder L2` - REST endpoints
- `Architect Design Specialist` - Design patterns
- `Claude Prompt Optimizer L2` - Prompt engineering
- `DB Query Optimizer L2` - Query optimization
- `DevOps Pipeline Specialist` - CI/CD pipelines
- `GUI Layout Specialist L2` - UI layouts
- `Languages Refactor Specialist` - Refactoring
- `Mobile UI Specialist L2` - Mobile UI
- `MQL Optimization L2` - EA optimization
- `N8N Workflow Builder L2` - Workflow design
- `Security Auth Specialist L2` - Auth security
- `Social OAuth Specialist` - OAuth flows
- `Test Unit Specialist L2` - Unit testing
- `Trading Risk Calculator L2` - Risk management

### Support Agents
- `Analyzer` - Code analysis
- `Coder` - Implementation
- `Documenter` - Documentation
- `Reviewer` - Code review

---

## MODEL SELECTION RULES

### Haiku (veloce, economico)
- Discovery e analysis
- Lettura file
- Task ripetitivi
- Documentazione
- Task semplici e meccanici

### Sonnet (bilanciato)
- Coding standard
- GUI implementation
- API development
- Testing
- Task di complessita media

### Opus (massima qualita)
- Security (SEMPRE)
- Architecture decisions
- Integration complessa
- Task critici
- Decisioni ad alto impatto

---

## EXECUTION OUTPUT FORMAT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WAVE 1: ANALYSIS (4 task paralleli)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[T1] Analyze codebase      Explore   haiku   RUNNING...
[T2] Analyze security      Explore   haiku   RUNNING...
[T3] Analyze GUI           Explore   haiku   RUNNING...
[T4] Analyze database      Explore   haiku   RUNNING...

... esecuzione parallela ...

[T1] Analyze codebase      Explore   haiku   DONE (1.2s)
[T2] Analyze security      Explore   haiku   DONE (0.9s)
[T3] Analyze GUI           Explore   haiku   DONE (1.1s)
[T4] Analyze database      Explore   haiku   DONE (0.8s)

Wave 1 completata in 1.2s (max dei 4)
Tempo sequenziale stimato: 4.0s
Speedup: 3.3x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WAVE 2: IMPLEMENTATION (4 task paralleli)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[T5] Impl DB schema        Database Expert        sonnet   RUNNING...
[T6] Impl auth logic       Security Unified Expert opus    RUNNING...
[T7] Impl GUI forms        GUI Super Expert       sonnet   RUNNING...
[T8] Impl API endpoints    Integration Expert     sonnet   RUNNING...

... esecuzione parallela ...

[T5-T8] ALL DONE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WAVE 3: INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[T9] Integrate all         Architect Expert       opus     RUNNING...
[T9] Integrate all         Architect Expert       opus     DONE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WAVE 4: VALIDATION (2 task paralleli)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[T10] Security review      Reviewer               sonnet   DONE
[T11] Run tests            Tester Expert          sonnet   DONE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WAVE 5: DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[T12] Update docs          Documenter             haiku    DONE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RIEPILOGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task completati: 12/12
Tempo totale: 25s
Tempo sequenziale: 90s
SPEEDUP: 3.6x
```

---

## SPECIAL CASE: 10 FIX PARALLELI

Quando l'utente chiede di fixare N bug:

```
INPUT: "Fix questi 10 bug nel modulo X"

ANALYSIS: Tutti i bug sono indipendenti?
  - SI -> TUTTI in Wave 1 parallela
  - NO -> Raggruppa per dipendenze

EXECUTION (se indipendenti):

Wave 1 (10 task paralleli):
[F1]  Fix bug 1    Expert appropriato   sonnet   RUNNING...
[F2]  Fix bug 2    Expert appropriato   sonnet   RUNNING...
[F3]  Fix bug 3    Expert appropriato   sonnet   RUNNING...
[F4]  Fix bug 4    Expert appropriato   sonnet   RUNNING...
[F5]  Fix bug 5    Expert appropriato   sonnet   RUNNING...
[F6]  Fix bug 6    Expert appropriato   sonnet   RUNNING...
[F7]  Fix bug 7    Expert appropriato   sonnet   RUNNING...
[F8]  Fix bug 8    Expert appropriato   sonnet   RUNNING...
[F9]  Fix bug 9    Expert appropriato   sonnet   RUNNING...
[F10] Fix bug 10   Expert appropriato   sonnet   RUNNING...

TUTTI partono SIMULTANEAMENTE in UN SOLO messaggio!

Wave 2 (dopo tutti i fix):
[R1]  Review all   Reviewer             sonnet   DONE
[T1]  Run tests    Tester Expert        sonnet   DONE

RISULTATO: 10 fix in ~15s invece di ~150s sequenziali = 10x speedup
```

---

## HANDLING DEPENDENCIES

Se i task hanno dipendenze, rispetta la gerarchia:

```
ESEMPIO: Bug 2 dipende da Bug 1

Wave 1: [F1, F3, F4, F5, F6, F7, F8, F9, F10] -> 9 paralleli
Wave 2: [F2] -> dipende da F1
Wave 3: [Review, Test]

SEMPRE massimizzare parallelismo compatibile con dipendenze!
```
