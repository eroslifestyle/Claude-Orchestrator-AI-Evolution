# CCH AGENT COMPATIBILITY TABLE - Quick Reference

> **Versione:** 1.0
> **Data:** 1 Febbraio 2026
> **Scopo:** Tabella compatibilità agent per migrazione CCH
> **Formato:** CSV-ready per project tracking tools

---

## LEGENDA

### Compatibility Levels
- **YES** = Compatibile, modifiche minime (< 4h)
- **PARTIAL** = Parzialmente compatibile, modifiche medie (4-8h)
- **NO** = Non compatibile, rewrite/estensione richiesta (> 8h)

### Migration Effort
- **LOW** = < 4 ore per agent
- **MEDIUM** = 4-8 ore per agent
- **HIGH** = > 8 ore per agent

### Priority
- **P0** = Critical path (orchestrator)
- **P1** = High priority (core agents)
- **P2** = Medium priority (experts usati frequentemente)
- **P3** = Low priority (experts usati raramente)

---

## TABELLA COMPATIBILITÀ COMPLETA

### CSV Format (per Excel/Project Tools)

```csv
Agent_ID,Agent_Name,File_Path,Type,Compatibility,Migration_Effort_Hours,Priority,Breaking_Changes_Count,Recommended_Phase,Dependencies
CORE-001,Orchestrator,core/orchestrator.md,CORE,NO,20,P0,15,2,Plugin
CORE-002,Analyzer,core/analyzer.md,CORE,PARTIAL,6,P1,3,3,None
CORE-003,Coder,core/coder.md,CORE,PARTIAL,6,P1,3,3,CORE-002
CORE-004,Reviewer,core/reviewer.md,CORE,PARTIAL,6,P1,3,3,CORE-003
CORE-005,Documenter,core/documenter.md,CORE,PARTIAL,6,P1,3,3,CORE-004
CORE-006,System_Coordinator,core/system_coordinator.md,CORE,PARTIAL,6,P1,3,3,None
EXP-001,GUI_Super_Expert,experts/gui-super-expert.md,EXPERT,YES,4,P2,1,4,None
EXP-002,Integration_Expert,experts/integration_expert.md,EXPERT,YES,4,P1,1,4,None
EXP-003,Database_Expert,experts/database_expert.md,EXPERT,YES,4,P1,1,4,None
EXP-004,Security_Unified_Expert,experts/security_unified_expert.md,EXPERT,YES,6,P1,2,4,None
EXP-005,Trading_Strategy_Expert,experts/trading_strategy_expert.md,EXPERT,YES,4,P2,1,4,None
EXP-006,MQL_Expert,experts/mql_expert.md,EXPERT,YES,4,P2,1,4,None
EXP-007,Tester_Expert,experts/tester_expert.md,EXPERT,YES,6,P1,2,4,None
EXP-008,Architect_Expert,experts/architect_expert.md,EXPERT,YES,4,P2,1,4,None
EXP-009,DevOps_Expert,experts/devops_expert.md,EXPERT,YES,4,P2,1,4,None
EXP-010,Languages_Expert,experts/languages_expert.md,EXPERT,YES,4,P2,1,4,None
EXP-011,AI_Integration_Expert,experts/ai_integration_expert.md,EXPERT,YES,6,P2,2,4,None
EXP-012,Claude_Systems_Expert,experts/claude_systems_expert.md,EXPERT,YES,4,P2,1,4,None
EXP-013,Mobile_Expert,experts/mobile_expert.md,EXPERT,YES,4,P3,1,4,None
EXP-014,N8N_Expert,experts/n8n_expert.md,EXPERT,YES,4,P3,1,4,None
EXP-015,Social_Identity_Expert,experts/social_identity_expert.md,EXPERT,YES,4,P2,1,4,None
EXP-016,API_Design_Specialist,experts/api-design-specialist.md,EXPERT,YES,4,P3,1,4,None
EXP-017,DB_Schema_Designer,experts/db-schema-designer.md,EXPERT,YES,4,P3,1,4,None
EXP-018,GUI_Layout_Specialist,experts/gui-layout-specialist.md,EXPERT,YES,4,P3,1,4,None
EXP-019,Integration_Coordinator,experts/integration-coordinator.md,EXPERT,YES,6,P2,2,4,None
EXP-020,Security_Auth_Specialist,experts/security-auth-specialist.md,EXPERT,YES,4,P2,1,4,None
EXP-021,Documenter_Expert,experts/documenter_expert.md,EXPERT,PARTIAL,6,P3,3,4,None
PLUGIN-001,Orchestrator_Core,plugins/orchestrator-plugin/src/orchestrator-core.ts,PLUGIN,NO,16,P0,12,2,CORE-001
PLUGIN-002,Orchestrator_Engine,plugins/orchestrator-plugin/src/core/orchestrator-engine.ts,PLUGIN,PARTIAL,8,P1,6,2,PLUGIN-001
PLUGIN-003,Agent_Router,plugins/orchestrator-plugin/src/routing/AgentRouter.ts,PLUGIN,PARTIAL,6,P1,4,2,PLUGIN-002
PLUGIN-004,Types_Index,plugins/orchestrator-plugin/src/types/index.ts,PLUGIN,PARTIAL,4,P1,3,2,PLUGIN-003
```

---

## TABLE VIEW (Markdown)

### Core Agents (6)

| ID | Agent | Compatibility | Effort (h) | Priority | Phase | Dependencies |
|----|-------|---------------|------------|----------|-------|--------------|
| CORE-001 | **Orchestrator** | 🔴 NO | 20 | P0 | 2 | Plugin |
| CORE-002 | Analyzer | 🟡 PARTIAL | 6 | P1 | 3 | None |
| CORE-003 | Coder | 🟡 PARTIAL | 6 | P1 | 3 | CORE-002 |
| CORE-004 | Reviewer | 🟡 PARTIAL | 6 | P1 | 3 | CORE-003 |
| CORE-005 | Documenter | 🟡 PARTIAL | 6 | P1 | 3 | CORE-004 |
| CORE-006 | System Coordinator | 🟡 PARTIAL | 6 | P1 | 3 | None |

**Subtotal Core:** 50 hours

### Expert Agents (21)

| ID | Agent | Compatibility | Effort (h) | Priority | Phase | Dependencies |
|----|-------|---------------|------------|----------|-------|--------------|
| EXP-001 | GUI Super Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-002 | Integration Expert | 🟢 YES | 4 | P1 | 4 | None |
| EXP-003 | Database Expert | 🟢 YES | 4 | P1 | 4 | None |
| EXP-004 | Security Unified Expert | 🟢 YES | 6 | P1 | 4 | None |
| EXP-005 | Trading Strategy Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-006 | MQL Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-007 | Tester Expert | 🟢 YES | 6 | P1 | 4 | None |
| EXP-008 | Architect Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-009 | DevOps Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-010 | Languages Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-011 | AI Integration Expert | 🟢 YES | 6 | P2 | 4 | None |
| EXP-012 | Claude Systems Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-013 | Mobile Expert | 🟢 YES | 4 | P3 | 5 | None |
| EXP-014 | N8N Expert | 🟢 YES | 4 | P3 | 5 | None |
| EXP-015 | Social Identity Expert | 🟢 YES | 4 | P2 | 4 | None |
| EXP-016 | API Design Specialist | 🟢 YES | 4 | P3 | 5 | None |
| EXP-017 | DB Schema Designer | 🟢 YES | 4 | P3 | 5 | None |
| EXP-018 | GUI Layout Specialist | 🟢 YES | 4 | P3 | 5 | None |
| EXP-019 | Integration Coordinator | 🟢 YES | 6 | P2 | 4 | None |
| EXP-020 | Security Auth Specialist | 🟢 YES | 4 | P2 | 4 | None |
| EXP-021 | Documenter Expert | 🟡 PARTIAL | 6 | P3 | 5 | None |

**Subtotal Experts:** 90 hours

### Plugin Components (4)

| ID | Component | Compatibility | Effort (h) | Priority | Phase | Dependencies |
|----|-----------|---------------|------------|----------|-------|--------------|
| PLUGIN-001 | Orchestrator Core | 🔴 NO | 16 | P0 | 2 | CORE-001 |
| PLUGIN-002 | Orchestrator Engine | 🟡 PARTIAL | 8 | P1 | 2 | PLUGIN-001 |
| PLUGIN-003 | Agent Router | 🟡 PARTIAL | 6 | P1 | 2 | PLUGIN-002 |
| PLUGIN-004 | Types Index | 🟡 PARTIAL | 4 | P1 | 2 | PLUGIN-003 |

**Subtotal Plugin:** 34 hours

---

## SUMMARY STATISTICS

### By Compatibility

| Compatibility | Count | Percentage | Total Hours |
|---------------|-------|------------|-------------|
| 🔴 NO | 2 | 7.4% | 36h |
| 🟡 PARTIAL | 9 | 33.3% | 52h |
| 🟢 YES | 16 | 59.3% | 68h |
| **TOTAL** | **27** | **100%** | **156h** |

### By Type

| Type | Count | Total Hours | Avg Hours |
|------|-------|-------------|-----------|
| Core | 6 | 50h | 8.3h |
| Expert | 21 | 90h | 4.3h |
| Plugin | 4 | 34h | 8.5h |

### By Priority

| Priority | Count | Total Hours |
|----------|-------|-------------|
| P0 (Critical) | 2 | 36h |
| P1 (High) | 11 | 60h |
| P2 (Medium) | 10 | 46h |
| P3 (Low) | 4 | 14h |

### By Phase

| Phase | Count | Total Hours | Duration (w/ 4 devs) |
|-------|-------|-------------|---------------------|
| Phase 1 (Foundation) | 0 | 0h | - (CCH core only) |
| Phase 2 (Orchestrator) | 4 | 70h | 2 weeks |
| Phase 3 (Core Agents) | 5 | 30h | 1 week |
| Phase 4 (Experts Batch 1) | 13 | 62h | 1.5 weeks |
| Phase 5 (Experts Batch 2) | 5 | 22h | 0.5 week |
| **TOTAL** | **27** | **184h** | **~6 weeks** |

---

## BREAKING CHANGES SUMMARY

### By Category

| Category | Count | Most Affected |
|----------|-------|---------------|
| Message Protocol | 27 | All agents |
| Routing System | 3 | Orchestrator + Plugin |
| Context Management | 7 | Core agents |
| Fault Tolerance | 12 | Integration/DB/API experts |
| Observability | 27 | All agents (non-breaking) |

### By Severity

| Severity | Count | Agents |
|----------|-------|--------|
| 🔴 Critical | 2 | Orchestrator, Orchestrator Core |
| 🟡 Medium | 9 | Analyzer, Coder, Reviewer, Documenter, System Coordinator, + 4 plugin/experts |
| 🟢 Low | 16 | All YES-compatibility experts |

---

## DEPENDENCY GRAPH

```
                    ┌──────────────────────┐
                    │   PLUGIN-001         │
                    │   Orchestrator Core  │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │   PLUGIN-002         │
                    │   Orchestrator Engine│
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────┴────────┐    ┌────────┴────────┐    ┌────────┴────────┐
│  PLUGIN-003    │    │  PLUGIN-004     │    │   CORE-001      │
│  Agent Router  │    │  Types Index    │    │   Orchestrator  │
└────────────────┘    └─────────────────┘    └────────┬────────┘
                                                     │
                  ┌──────────────────────────────────┼──────────────────────┐
                  │                                  │                      │
         ┌────────┴────────┐              ┌──────────┴─────────┐    ┌────────┴────────┐
         │   CORE-002      │              │   CORE-006         │    │   CORE-003      │
         │   Analyzer      │              │   System Coordin.  │    │   Coder         │
         └─────────────────┘              └────────────────────┘    └────────┬────────┘
                                                                           │
                                                                  ┌────────┴────────┐
                                                                  │   CORE-004      │
                                                                  │   Reviewer      │
                                                                  └────────┬────────┘
                                                                           │
                                                                  ┌────────┴────────┐
                                                                  │   CORE-005      │
                                                                  │   Documenter    │
                                                                  └─────────────────┘

All EXPERT agents (21) are INDEPENDENT - can be migrated in parallel
```

---

## MIGRATION SEQUENCE RECOMMENDED

### Sprint 1 (Week 2): Critical Path
```
1. PLUGIN-001: Orchestrator Core (16h)
2. CORE-001: Orchestrator (20h)
3. PLUGIN-002: Orchestrator Engine (8h)
4. PLUGIN-003: Agent Router (6h)
5. PLUGIN-004: Types Index (4h)

Total: 54h (1.5 weeks with 4 developers)
```

### Sprint 2 (Week 3): Core Agents
```
1. CORE-002: Analyzer (6h)
2. CORE-006: System Coordinator (6h)
3. CORE-003: Coder (6h)
4. CORE-004: Reviewer (6h)
5. CORE-005: Documenter (6h)

Total: 30h (1 week with 4 developers)
```

### Sprint 3 (Week 4-5): Expert Agents Batch 1
```
Priority P1 + P2 experts (13 agents):
- EXP-002, EXP-003, EXP-004, EXP-007 (P1)
- EXP-001, EXP-005, EXP-006, EXP-008, EXP-009, EXP-010,
  EXP-011, EXP-012, EXP-015, EXP-019, EXP-020 (P2)

Total: 62h (1.5 weeks with 4 developers)
```

### Sprint 4 (Week 5-6): Expert Agents Batch 2
```
Priority P3 + Partial experts (5 agents):
- EXP-013, EXP-014, EXP-016, EXP-017, EXP-018 (P3)
- EXP-021 (Partial)

Total: 22h (0.5 week with 4 developers)
```

---

## TRACKING TEMPLATE

### Per-Agent Migration Checklist

```markdown
## [AGENT_ID] - [AGENT_NAME] Migration

- [ ] **Pre-Migration**
  - [ ] Read current agent file
  - [ ] Document current behavior
  - [ ] Identify breaking changes
  - [ ] Estimate effort (confirm with table)

- [ ] **Migration**
  - [ ] Implement CCH message wrapper
  - [ ] Add UMQ subscription/publishing
  - [ ] Integrate with OM (metrics/tracing)
  - [ ] Add FTL (if applicable)
  - [ ] Update dependencies

- [ ] **Testing**
  - [ ] Unit tests pass
  - [ ] Integration tests pass
  - [ ] Manual testing complete
  - [ ] Performance validated

- [ ] **Post-Migration**
  - [ ] Documentation updated
  - [ ] Code review complete
  - [ ] Deployed to staging
  - [ ] Monitor for 48h
  - [ ] Ready for production

**Notes:**
- Breaking changes: [count]
- Dependencies: [list]
- Estimated hours: [hours]
- Actual hours: [hours]
- Status: [NOT_STARTED | IN_PROGRESS | COMPLETE]
```

---

## EXPORT TOOLS

### JIRA CSV Import Format
```csv
Summary,Issue Type,Priority,Description,Original Estimate,Components
"Orchestrator Migration - Rewrite routing system",Task,High,"Migrate orchestrator.md to CCH message protocol",20h,Migration
"Analyzer Agent Migration",Task,Medium,"Add CCH message wrapper to analyzer.md",6h,Migration
"Coder Agent Migration",Task,Medium,"Integrate coder.md with UMQ",6h,Migration
...
```

### Excel/Google Sheets Format
```csv
Agent ID,Agent Name,Type,Compatibility,Hours,Phase,Start Date,End Date,Assigned To,Status
CORE-001,Orchestrator,CORE,NO,20,2,"2026-02-08","2026-02-12",[Developer],Not Started
CORE-002,Analyzer,CORE,PARTIAL,6,3,"2026-02-15","2026-02-16",[Developer],Not Started
...
```

---

**Documento Generato:** 1 Febbraio 2026
**Versione:** 1.0
**Autore:** Claude Code Analysis Engine
**Status:** READY FOR PROJECT MANAGEMENT

**Usage Instructions:**
1. Copy CSV sections to your project tracking tool
2. Use Markdown table for documentation
3. Use dependency graph for planning
4. Use tracking template for per-agent progress
