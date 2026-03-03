# Skills Integration - Orchestrator V13.0 UNIFIED

## Panoramica

- **Totale skill:** 29
- **Categorie:** 5 (Core, Utility, Workflow, Language, Learning)
- **Registry:** `~/.claude/skills/registry.json`
- **Nuovo:** python-performance-optimization skill (Language)

- **Orchestrator:** V13.0 UNIFIED

---

## Funzionalita V13.0 UNIFIED

| Funzionalita | Font | Descrizione |
|-------------|------|-------------|
| **Fallback 6-Livelli** | V6.1 ULTRA | 100% success rate garantito |
| **Anti-Failure Protocol** | V6.1 ULTRA | Pre-validation, retry, escalation, circuit breaker |
| **Messaggio Attivazione** | orchestrator-supremo | Output visivo all'avvio |
| **Model Selection** | V6.1 ULTRA | Guida intelligente haiku/sonnet/opus |
| **Escalation Automatica** | V6.1 ULTRA | haiku->sonnet->opus->direct |
| **Language Detection** | V13.0 | STEP 0 obbligatorio |
| **Parallelismo Illimitato** | orchestrator-supremo | Nessun limite task paralleli |

---

## Categorie

### Core (8 skill)

Skill essenziali sempre disponibili:

| Skill | Descrizione |
|-------|-------------|
| `orchestrator` | Multi-agent coordination, task decomposition, routing |
| `code-review` | Code quality analysis, best practices check |
| `git-workflow` | Commit, branch, PR management |
| `testing-strategy` | Test planning, coverage analysis |
| `debugging` | Debug investigation, root cause analysis |
| `api-design` | REST/GraphQL API design patterns |
| `remotion-best-practices` | Video generation with Remotion |
| `keybindings-help` | Keyboard shortcuts reference |

### Utility (6 skill)

Tool di supporto per gestione sessione

| Skill | Descrizione |
|-------|-------------|
| `strategic-compact` | Context compression when reaching capacity |
| `verification-loop` | Change verification and validation |
| `checkpoint` | Session state save/restore |
| `sessions` | Session history management |
| `status` | System health check |
| `metrics` | Session metrics collection |

### Workflow (9 skill)

Processi strutturati per sviluppo

| Skill | Descrizione |
|-------|-------------|
| `plan` | Implementation planning |
| `tdd-workflow` | Test-driven development cycle |
| `security-scan` | Security audit and vulnerability check |
| `refactor-clean` | Code cleanup and refactoring |
| `build-fix` | Build error resolution |
| `multi-plan` | Multi-approach planning |
| `fix` | Bug fixing workflow |
| `cleanup` | Temp file cleanup |
| `simplify` | Code simplification |

### Language (4 skill)

Auto-attivate in base al linguaggio rilevato:

| Skill | Trigger | Descrizione |
|-------|---------|-------------|
| `python-patterns` | `.py` files | PEP 8, type hints, async patterns |
| `typescript-patterns` | `.ts`, `.tsx` files | Strict mode, zod, discriminated unions |
| `go-patterns` | `.go` files | Error handling, interfaces, concurrency |
| `python-performance-optimization` | `.py` + performance keywords | cProfile, memory profiler, benchmarking |

### Learning (2 skill)

Cattura e promozione pattern appresi

| Skill | Descrizione |
|-------|-------------|
| `learn` | Capture patterns from session work |
| `evolve` | Promote learned patterns to skills |

---

## Slash Commands

| Command | Skill | Descrizione |
|---------|-------|-------------|
| `/orchestrator` | orchestrator | Multi-agent coordination |
| `/plan` | plan | Implementation planning |
| `/fix` | fix | Bug fixing |
| `/build-fix` | build-fix | Build error resolution |
| `/review` | code-review | Code quality analysis |
| `/security-scan` | security-scan | Security audit |
| `/tdd` | tdd-workflow | Test-driven development |
| `/refactor` | refactor-clean | Code cleanup |
| `/debug` | debugging | Debug investigation |
| `/learn` | learn | Capture patterns |
| `/evolve` | evolve | Promote skills |
| `/checkpoint` | checkpoint | Save state |
| `/metrics` | metrics | Session metrics |
| `/status` | status | System health |
| `/cleanup` | cleanup | Temp file cleanup |
| `/sessions` | sessions | Session history |
| `/api-design` | api-design | API design |
| `/multi-plan` | multi-plan | Multi-approach planning |
| `/keybindings` | keybindings-help | Keyboard shortcuts |
| `/simplify` | simplify | Code simplification |
| `/verification-loop` | verification-loop | Change verification |
| `/python-perf` | python-performance-optimization | Python profiling |

---

## Routing Automatico

L'orchestrator instrada automaticamente le richieste alle skill appropriate basandosi su keywords:

### Keyword Routing Table

```
"git commit"        -> git-workflow
"fix build error"   -> build-fix
"review code"       -> code-review
"test"              -> testing-strategy
"debug"             -> debugging
"api endpoint"      -> api-design
"security audit"    -> security-scan
"refactor"          -> refactor-clean
"checkpoint"        -> checkpoint
"session history"   -> sessions
"metrics"           -> metrics
"plan implementation" -> plan
"profile"           -> python-performance-optimization
"optimization"       -> python-performance-optimization
"performance"       -> python-performance-optimization
"benchmarking"      -> python-performance-optimization
"cProfile"          -> python-performance-optimization
"memory"            -> python-performance-optimization
```

### Language Auto-Activation
```
".py" files    -> python-patterns (auto)
".ts" files    -> typescript-patterns (auto)
".tsx" files   -> typescript-patterns (auto)
".go" files    -> go-patterns (auto)
```

### Multi-Keyword Matching

Quando una richiesta matcha piu keywords:
1. Estrai TUTTE le keywords dalla richiesta
2. Conta i match per ogni skill
3. Seleziona la skill con il maggior numero di match
4. In caso di pareggio, usa l'ordine della tabella

---

## Integrazione con Orchestrator

### Step 0: Language Detection (NUOVO - V13.0)

**OBBLIGATORIO** - Esegue come primo di qualsiasi altra cosa.

Rileva lingua utente eOS locale e e memorizza come RESPONSE_lang per tutta la sessione tutte le risposte in quella lingua.

### Step 2: Memory Load
Durante il caricamento della memoria, l'orchestrator carica anche `instincts.json` per i pattern appresi con confidence >= 0.5.
### Step 3: Rules Loading
Le skill Language vengono caricate automaticamente in base ai file types rilevati nel PROJECT_PATH
### Step 9: Learning Capture
Al termine di ogni sessione con codice modificato:
1. Documenter invoca `/learn` internamente
2. Pattern catturati in `~/.claude/learnings/instincts.json`
3. Confidence incrementa +0.2 per conferma (max 0.9)
4. Promozione manuale via `/evolve` (richiede confidence >= 0.7)

---

## File di Sistema
| File | Path | Descrizione |
|------|------|-------------|
| Registry | `~/.claude/skills/registry.json` | Registry unificato 29 skill |
| Skills Dir | `~/.claude/skills/` | Directory skill (29 subdirectories) |
| Learnings | `~/.claude/learnings/instincts.json` | Pattern appresi |
| Learned Skills | `~/.claude/skills/learned/` | Skill promosse da /evolve |
| Language Rule | `~/.claude/rules/common/language-response.md` | Regola risposta lingua |
| Orchestrator | `~/.claude/skills/orchestrator/SKILL.md` | V13.0 UNIFIED |

---

## Skill Structure
Ogni skill ha la seguente struttura:
```
~/.claude/skills/{skill_name}/
  SKILL.md          # Definizione skill
  (optional files)  # Templates, configs, ecc.
```

### SKILL.md Format
```markdown
# {Skill Name}

## Description
[Breve descrizione]

## Activation
[Come si attiva: slash command, keyword, auto]

## Parameters
[Parametri accettati]

## Examples
[Esempi di utilizzo]

## Rules
[Regole specifiche della skill]
```

---

## Sistema Fallback 6-Livelli (da V6.1 ULTRA)
| Livello | Descrizione |
|--------|-------------|
| **Level 1: EXACT MATCH** | Agent richiesto esiste? SI = usa quello |
| **Level 2: L2 -> L1 PARENT** | Sub-agent fallback al parent L1 |
| **Level 3: DOMAIN PATTERN** | Pattern matching (gui-*, db-*, ecc.) |
| **Level 4: CORE AGENT** | Fallback ad agent core (Analyzer, Coder, Reviewer, Documenter) |
| **Level 5: UNIVERSAL CODER** | Coder come agent universale |
| **Level 6: ORCHESTRATOR DIRECT** | Esecuzione diret (100% garantito) |

---

## Version

- **Skills Integration:** V2.0
- **Orchestrator:** V13.0 UNIFIED
- **Last Updated:** 2026-03-03
