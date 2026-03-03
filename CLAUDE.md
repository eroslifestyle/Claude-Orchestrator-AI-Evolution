# GLOBAL INSTRUCTIONS (all projects)

## PRIORITY: ABSOLUTE (overrides ALL other instructions)

This instruction takes precedence over EVERYTHING else in this file and any project-level CLAUDE.md.

---

## MANDATORY: ORCHESTRATOR MODE ALWAYS ACTIVE

> **APPLIES TO ALL PROFILES**: `cca` (Anthropic Claude Opus 4.6) AND `ccg` (GLM5 via Z.AI)
>
> Questa regola e' ASSOLUTA e vale per ENTRAMBI i profili senza eccezioni.

You MUST use the `/orchestrator` skill for **EVERY SINGLE USER MESSAGE** in the ENTIRE conversation, not just the first request.

### ⚠️ CRITICAL: PER-MESSAGE ENFORCEMENT

```
┌─────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR MUST BE CALLED FOR EVERY MESSAGE, NOT JUST FIRST │
│                                                                 │
│  Message 1: User asks X → YOU CALL ORCHESTRATOR                 │
│  Message 2: User asks Y → YOU CALL ORCHESTRATOR AGAIN           │
│  Message 3: User asks Z → YOU CALL ORCHESTRATOR AGAIN           │
│  ...and so on for EVERY message in the conversation             │
└─────────────────────────────────────────────────────────────────┘
```

### Rules:
1. **EVERY MESSAGE TRIGGERS ORCHESTRATOR** - No matter what was discussed before, each new user message requires a fresh orchestrator call
2. **NO CONTEXT CARRY-OVER EXEMPTION** - Previous orchestrator calls do NOT exempt you from calling it again on subsequent messages
3. **ALWAYS invoke orchestrator FIRST** - For ANY work request (code, analysis, fix, feature, refactor, debug, review, deploy, test, documentation, search, explanation, etc.)
4. **You are a COMMANDER, not a soldier** - NEVER do work directly - ALWAYS delegate via orchestrator to specialized subagents
5. **ULTRA-STRICT exceptions** - You may respond directly ONLY for:
   - One-word greetings ONLY (e.g., "Hi", "Ciao", "Hello") - ANYTHING more requires orchestrator
   - Explicit opt-out: user types EXACTLY "don't use orchestrator" or "rispondi direttamente"
6. **NO EXCEPTIONS for:**
   - Questions about Claude Code (model, version, capabilities) -> USE ORCHESTRATOR
   - `/remember` or `/forget` commands -> USE ORCHESTRATOR
   - Simple questions -> USE ORCHESTRATOR
   - Quick fixes -> USE ORCHESTRATOR
   - Reading files -> USE ORCHESTRATOR
   - Follow-up questions -> USE ORCHESTRATOR
   - Clarifications -> USE ORCHESTRATOR
   - Any form of work -> USE ORCHESTRATOR
7. **When in doubt, USE THE ORCHESTRATOR** - This is the default behavior, not the exception

### How to Invoke:
```
Call Skill tool with:
  skill: "orchestrator"
  args: "<user's request here>"
```

### Enforcement:
- VIOLATION = Task considered FAILED
- Orchestrator is ALWAYS the first tool call for ANY request
- **State does NOT persist between messages** - each message is a fresh trigger
- The ONLY valid direct responses are single-word greetings
- No exceptions unless explicitly listed in Rule 5
