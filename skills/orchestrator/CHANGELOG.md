# Changelog - Claude Orchestrator Plugin

All notable changes to the Orchestrator are documented here in reverse chronological order (most recent first).

---

## [V12.9.3] GLM-5 FULL MIGRATION - 2026-03-06

### Added
- Full GLM-5 migration for CCG profile (Z.AI)
- GLM-5 parameters: temperature=1.0, top_p=0.95
- Deep thinking enabled: thinking={type: "enabled"}
- Max context: 200K, Max output: 128K
- Streaming support: stream=True, tool_stream=True
- VERSION.json: glm5 configuration block
- settings.json: GLM5_* environment variables

### Updated
- docs/glm-ocr-integration.md: V2.0.0 with GLM-5 features
- Migration checklist completed
- 3 new practical examples added

---

## [V12.9.2] GLM-OCR INTEGRATION - 2026-03-06

### Added
- GLM-OCR integration per profilo CCG (Z.AI)
- docs/glm-ocr-integration.md - Documentazione completa
- SKILL.md: Sezione GLM-OCR Tools con routing
- settings.json: zai-mcp-server wildcard permissions (8 tool OCR)

### Tool MCP Abilitati
- extract_text_from_screenshot (OCR principale)
- analyze_image (analisi immagini)
- analyze_video (analisi video)
- diagnose_error_screenshot (diagnostica errori)
- ui_to_artifact (UI → codice)
- analyze_data_visualization (grafici)
- ui_diff_check (confronto UI)
- understand_technical_diagram (diagrammi tecnici)

---

## [V12.9.1] CONSOLIDATION FIX - 2026-03-06

### Fixed
- VERSION.json: 12.8.0 → 12.9.0 (version alignment)
- SKILL.md footer: V12.8 → V12.9 INTERACTIVE REQUIREMENTS
- docs/INDEX.md: V12.0 → V12.9 (header, changelog, footer)
- docs/changelog.md: V12.0 → V12.9 (header)
- Skills count: 26 → 27 standardizzato in 6 file
- Rules count: 10 → 11 in docs/INDEX.md
- Docs count: 17 → 22 in manifest e INDEX.md
- orchestrator-manifest.json: prompt-engineering-patterns aggiunto

---

## [V12.9] INTERACTIVE REQUIREMENTS GATHERING - 2026-03-06

### Added
- STEP 0.7 INTERACTIVE REQUIREMENTS GATHERING per richieste complesse
- Domande multiple interattive con AskUserQuestion
- 6 categorie di domande: WHAT, WHERE, WHY, SCOPE, PRIORITY, CONSTRAINTS
- Ciclo di raccolta requisiti PRIMA di eseguire task
- Anti-improvvisazione forzata per contesto incompleto

---

## [V12.8] COMPLEXITY SCORING - 2026-03-06

### Added
- STEP 4.5 COMPLEXITY SCORING for dynamic model assignment
- 5-criteria scoring (0-10) replaces static "inherit" model
- Score 0-6: haiku, Score 7-10: opus

---

## [V12.7] OUTPUT_MODE - 2026-03-06

### Added
- OUTPUT_MODE configuration (verbose/compact/silent)
- Default: compact
- Controls subagent output verbosity

### Updated
- EXECUTION RULES with rule 0

---

## [V12.6.1] AUDIT FIX - 2026-03-04

### Fixed
- System Coordinator added to routing table
- Skills count corrected to 30
- V12.1 version duplication resolved
- Learnings directory created
- CHANGELOG.md regenerated

---

## [V12.6] NO-IMPROVISE - 2026-03-04

### Added
- Mandatory NO-IMPROVISE protocol: 100% context required before execution
- Mandatory clarifying questions if context incomplete
- NO assumptions/inventions directive
- Programmer approval required for existing function modifications

### Enhanced
- EXECUTION RULES with rules 4-5 added
- Extended SUBAGENT PROTOCOL with NO-IMPROVISE enforcement

---

## [V12.5.2] - 2026-03-03

### Changed
- Cleanup runs only at session end (Step 11), never at startup
- Extended temp patterns coverage

### Fixed
- Clean session state maintained
- Clean exit implementation

---

## [V12.5] ROBUST CLEANUP - 2026-03-03

### Added
- STEP 0.6 STARTUP CLEANUP with 25+ temp patterns
- STEP 11.5 EMERGENCY CLEANUP with signal handlers
- Enhanced SESSION HOOKS with cleanup hooks

### Enhanced
- STEP 11 with recursive scan
- Logging and timeout handling
- Orphan temp files cleanup

### Fixed
- Orphan temp files accumulation issue resolved

---

## [V12.4] REQUEST PRE-PROCESSING - 2026-03-03

### Added
- STEP 0.5 for request pre-processing with complexity evaluation
- New skill: prompt-engineering-patterns for expanding vague requests

### Updated
- Skills catalog: 31 total

---

## [V12.3] SKILL INTEGRATION - 2026-03-03

### Added
- python-performance-optimization to catalog
- New SKILL INVOCATION section documenting skill vs agent usage patterns

### Enhanced
- Explicit skill mapping in slash commands
- Skill tool invocation in Step 9

### Updated
- Skills catalog: 27 skills

---

## [V12.2] PROCESS MANAGER - 2026-02-28

### Added
- Centralized ProcessManager for Windows orphan process prevention
- New file: lib/process_manager.py
- New rules: rules/common/process-management.md (100 rules)
- Tests: lib/tests/test_process_manager.py (45 tests)

### Modified
- MCP server integrated with ProcessManager

---

## [V12.1.1] VERBOSE START - 2026-02-28

### Changed
- SILENT_START default changed to false
- Table now shown at both Step 5 AND Step 12 for better visibility

---

## [V12.1.0] SILENT START - 2026-02-28

### Added
- CONFIGURATION section with SILENT_START option (default: true)
- Table always appears in FINAL REPORT (Step 12)

### Modified
- RULE 3 and STEP 5 to skip initial table output when silent

---

## [V12.0.3] FULL COHERENCE - 2026-02-27

### Fixed
- All 20 verification checks passed
- 100% coherence achieved

### Added
- VERSION HISTORY clarification note
- Token Budget verified

---

## [V12.0.2] AUTO-FIX - 2026-02-27

### Fixed
- Agent count 43 verified
- Skills count 26 verified
- Slash commands routing corrected
- 5 docs V11->V12 version alignment
- Deprecated refs removed
- Workflow headers standardized
- Agent structure standardization

---

## [V12.0.1] POST-AUDIT FIX - 2026-02-27

### Fixed
- Agent count verified (43)
- MCP prefix standardization (web-reader)
- Model inheritance docs (Opus 4.6 parent)
- Multi-keyword matching rules
- L2 model declarations (sonnet->inherit)
- Docs version alignment to V12.0

---

## [V12.0] DEEP AUDIT - 2026-02-26

### Fixed
- Windows NUL code syntax
- Version alignment (V12.0)
- MCP web-reader prefix
- Deprecated docs removed from REFERENCE
- taskkill made optional
- Token budget updated

---

## [V11.3] AUDIT FIX - 2026-02-26

### Fixed
- Step linear ordering (8→9→10→11→12)
- Skills catalog (26)
- NUL code fix
- L2→L1 mapping
- Error recovery post-retry

### Enhanced
- MCP section rewrite (native vs MCP)
- Rules expanded
- 4 ghost agents created

---

## [V11.2] AUDIT FIX - 2026-02-26

### Fixed
- Step ordering (verify->doc->cleanup)
- Agent count (43)
- 4 orphan agents routed
- Routing dedup
- Model column clarity

---

## [V11.1] BUGFIX - 2026-02-26

### Fixed
- Step ordering
- Unified learning format
- Routing fixes
- Rules injection
- Steps renumbered 1-13

---

## [V11.0] NEW GEN - 2026-02-26

### Added
- Continuous Learning system
- Rules Engine
- Session Hooks
- 24 skills
- Slash Commands
- Verification loop
- Strategic Compact

### Reduced
- Size optimization: ~490 lines vs 1082 in previous version

---

## [V10.2] ULTRA - 2026-02-21

### Added
- Notification Expert agent
- Context Injection system
- Inter-Teammate Communication

### Enhanced
- Fallback chains

---

## [V10.0] ULTRA - 2026-02-21

### Added
- Memory integration
- Health Check system
- Observability features
- Error Recovery protocol

---

## [V8.0] SLIM - 2026-02-15

### Added
- Agent Teams support
- 39 agents

---

## [V7.0] - 2026-02-10

### Added
- MCP Integration
- LSP support

---

## [V5.0-6.0] - 2026-01-28

### Added
- Windows support
- Parallel execution

---

**Current Version: V12.8**
*Last updated: 2026-03-06*
