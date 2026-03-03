# Expert Injector - Caricamento Contenuto Expert

## Scopo
Carica i file .md degli expert e inietta il loro contenuto nei prompt dei Task agent.

---

## EXPERT FILE LOCATIONS

Gli expert files sono in `c:/Users/LeoDg/.claude/agents/`:

```
agents/
├── core/
│   ├── analyzer.md
│   ├── coder.md
│   ├── documenter.md
│   ├── orchestrator.md
│   ├── reviewer.md
│   └── system-coordinator.md
├── experts/
│   ├── ai-integration-expert.md
│   ├── architect-expert.md
│   ├── claude-systems-expert.md
│   ├── database-expert.md
│   ├── devops-expert.md
│   ├── gui-super-expert.md
│   ├── integration-expert.md
│   ├── languages-expert.md
│   ├── mobile-expert.md
│   ├── mql-expert.md
│   ├── n8n-expert.md
│   ├── security-unified-expert.md
│   ├── social-identity-expert.md
│   ├── tester-expert.md
│   └── trading-strategy-expert.md
└── experts/L2/
    ├── ai-model-specialist.md
    ├── api-endpoint-builder.md
    ├── architect-design-specialist.md
    ├── claude-prompt-optimizer.md
    ├── db-query-optimizer.md
    ├── devops-pipeline-specialist.md
    ├── gui-layout-specialist.md
    ├── languages-refactor-specialist.md
    ├── mobile-ui-specialist.md
    ├── mql-optimization.md
    ├── n8n-workflow-builder.md
    ├── security-auth-specialist.md
    ├── social-oauth-specialist.md
    ├── test-unit-specialist.md
    └── trading-risk-calculator.md
```

---

## EXPERT TO FILE MAPPING

```yaml
# L1 Experts
"AI Integration Expert": "agents/experts/ai-integration-expert.md"
"Architect Expert": "agents/experts/architect-expert.md"
"Claude Systems Expert": "agents/experts/claude-systems-expert.md"
"Database Expert": "agents/experts/database-expert.md"
"DevOps Expert": "agents/experts/devops-expert.md"
"GUI Super Expert": "agents/experts/gui-super-expert.md"
"Integration Expert": "agents/experts/integration-expert.md"
"Languages Expert": "agents/experts/languages-expert.md"
"Mobile Expert": "agents/experts/mobile-expert.md"
"MQL Expert": "agents/experts/mql-expert.md"
"N8N Expert": "agents/experts/n8n-expert.md"
"Security Unified Expert": "agents/experts/security-unified-expert.md"
"Social Identity Expert": "agents/experts/social-identity-expert.md"
"Tester Expert": "agents/experts/tester-expert.md"
"Trading Strategy Expert": "agents/experts/trading-strategy-expert.md"

# L2 Specialists
"AI Model Specialist": "agents/experts/L2/ai-model-specialist.md"
"API Endpoint Builder L2": "agents/experts/L2/api-endpoint-builder.md"
"Architect Design Specialist": "agents/experts/L2/architect-design-specialist.md"
"Claude Prompt Optimizer L2": "agents/experts/L2/claude-prompt-optimizer.md"
"DB Query Optimizer L2": "agents/experts/L2/db-query-optimizer.md"
"DevOps Pipeline Specialist": "agents/experts/L2/devops-pipeline-specialist.md"
"GUI Layout Specialist L2": "agents/experts/L2/gui-layout-specialist.md"
"Languages Refactor Specialist": "agents/experts/L2/languages-refactor-specialist.md"
"Mobile UI Specialist L2": "agents/experts/L2/mobile-ui-specialist.md"
"MQL Optimization L2": "agents/experts/L2/mql-optimization.md"
"N8N Workflow Builder L2": "agents/experts/L2/n8n-workflow-builder.md"
"Security Auth Specialist L2": "agents/experts/L2/security-auth-specialist.md"
"Social OAuth Specialist": "agents/experts/L2/social-oauth-specialist.md"
"Test Unit Specialist L2": "agents/experts/L2/test-unit-specialist.md"
"Trading Risk Calculator L2": "agents/experts/L2/trading-risk-calculator.md"

# Core Agents
"Analyzer": "agents/core/analyzer.md"
"Coder": "agents/core/coder.md"
"Documenter": "agents/core/documenter.md"
"Reviewer": "agents/core/reviewer.md"
```

---

## INJECTION PATTERN

### Come Iniettare Expert Knowledge

Quando il Task tool viene chiamato, il prompt deve includere il contenuto dell'expert file:

```
PROMPT STRUCTURE:
================

## EXPERT KNOWLEDGE
{contenuto del file expert.md caricato}

## TASK CONTEXT
Richiesta originale: {user_request}
Wave: {wave_number}
Task ID: {task_id}

## ISTRUZIONI SPECIFICHE
{descrizione dettagliata del task}

## OUTPUT ATTESO
{formato output richiesto}
```

### Esempio Concreto

```
PROMPT per GUI Super Expert:

## EXPERT KNOWLEDGE
[Contenuto di gui-super-expert.md viene caricato qui]
- Specializzazione: PyQt5/PyQt6, Tkinter, responsive design
- Pattern: MVC, Signal/Slot, Layout management
- Best practices: Theme consistency, accessibility, performance
...

## TASK CONTEXT
Richiesta originale: "Crea sistema auth con GUI login"
Wave: W2 (Implementation)
Task ID: T7

## ISTRUZIONI SPECIFICHE
Implementa un form di login con:
- Campo username/email
- Campo password (masked)
- Checkbox "Remember me"
- Button Login
- Link "Forgot password"
- Validazione real-time
- Stile dark mode compatible

## OUTPUT ATTESO
File Python con classe LoginForm che estende QWidget
```

---

## DYNAMIC EXPERT SELECTION

### Quando Usare L1 vs L2

```
COMPLEXITY CHECK:
- Task semplice (add button, fix layout) -> L2 Specialist
- Task medio (form completo, validation) -> L1 Expert
- Task complesso (intera feature multi-componente) -> L1 Expert + L2 support

EXAMPLE:
"Aggiungi un bottone al form"
  -> GUI Layout Specialist L2 (haiku)

"Crea form di registrazione completo"
  -> GUI Super Expert (sonnet)

"Redesign intera UI con nuovo design system"
  -> GUI Super Expert (opus) + GUI Layout Specialist L2 (support)
```

### Escalation Pattern

```
L2 non riesce -> Escala a L1
L1 non riesce -> Escala a Opus con context extra
Opus non riesce -> Chiedi input utente
```

---

## PROMPT TEMPLATES PER DOMINIO

### Database Tasks
```
## EXPERT: Database Expert
## SPECIALIZATION: {sqlite|postgres|mysql}

Task: {description}
Schema esistente: {schema_info from analysis}
Constraints: {performance, compatibility}

Implementa: {specific requirements}
```

### Security Tasks
```
## EXPERT: Security Unified Expert
## CRITICALITY: HIGH

Task: {description}
Threat model: {identified threats}
Compliance: {gdpr, pci-dss, etc}

Implementa: {specific requirements}
NOTA: Mai compromettere sicurezza per velocita
```

### GUI Tasks
```
## EXPERT: GUI Super Expert
## FRAMEWORK: {PyQt5|Tkinter|etc}

Task: {description}
Design system: {existing patterns}
Accessibility: {requirements}

Implementa: {specific requirements}
```

### API Tasks
```
## EXPERT: Integration Expert
## PROTOCOL: {REST|GraphQL|WebSocket}

Task: {description}
Existing endpoints: {from analysis}
Auth method: {jwt|oauth|api-key}

Implementa: {specific requirements}
```

---

## FALLBACK CHAIN

Se un expert non e disponibile come subagent_type:

```
1. Prova: Task(subagent_type="Expert Name", ...)
2. Fallback: Task(subagent_type="general-purpose", prompt="[EXPERT CONTEXT]\n...")
3. Ultimate: Carica expert.md content e inietta nel prompt di general-purpose
```

Il fallback a `general-purpose` con expert context iniettato funziona sempre
perche l'agent riceve la conoscenza dell'expert tramite il prompt.
