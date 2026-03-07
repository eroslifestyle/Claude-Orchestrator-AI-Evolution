---
name: learn
description: Capture a learning pattern from the current session with confidence scoring. Use when the user says /learn or when a reusable pattern is discovered.
user-invokable: true
allowed-tools: Read, Write, Edit, Glob
metadata:
  keywords: [learn, pattern, instinct, capture]
---

# Learn Skill - Continuous Learning System

## Purpose

Capture reusable patterns discovered during sessions as "instincts" with confidence scoring.
Instincts start weak (0.3) and grow stronger with repeated confirmation (max 0.9).

## Trigger

- User types `/learn` followed by a pattern description
- User types `/learn` with no args (auto-detect from current session context)

## Algorithm

1. **Parse input**: Extract the pattern description and optional tags from user input
2. **Read instincts file**: Load `~/.claude/learnings/instincts.json`
   - If file is empty or missing, initialize with default structure
3. **Check for duplicates**: Compare new pattern against existing instincts
   - Fuzzy match: if 60%+ of significant words (4+ chars) overlap, treat as existing
   - If match found: increment confidence by 0.2 (cap at 0.9), add new evidence entry, update last_confirmed
   - If no match: create new instinct with confidence 0.3
4. **Generate instinct object** (for new patterns):
   ```json
   {
     "id": "inst_NNN",
     "pattern": "<pattern description>",
     "confidence": 0.3,
     "evidence": ["session_YYYY-MM-DD: <context>"],
     "created": "YYYY-MM-DD",
     "last_confirmed": "YYYY-MM-DD",
     "tags": ["<auto-detected-or-user-provided>"],
     "source": "user|auto",
     "evolved_to": null
   }
   ```
5. **Save**: Write updated instincts.json, increment metadata.total_learned
6. **Display**: Show the saved/updated instinct to the user in a clear format

## ID Generation

- Format: `inst_NNN` where NNN is zero-padded 3-digit sequential number
- Read existing instincts, find max ID number, increment by 1
- First instinct: `inst_001`

## Tag Auto-Detection

If user does not provide tags, infer from pattern text using these keyword groups:

| Keywords in pattern | Tag |
|---|---|
| parallel, concurrent, async, simultaneous | `parallelism` |
| glob, grep, search, find | `search` |
| performance, fast, speed, optimize | `performance` |
| test, assert, verify, check | `testing` |
| error, fix, bug, debug | `debugging` |
| git, commit, branch, merge | `git` |
| file, read, write, edit | `file-ops` |
| security, auth, token, secret | `security` |
| cache, memory, resource | `resources` |

Assign up to 3 tags. If no keywords match primary categories, try secondary:

| Keywords | Tag |
|---|---|
| checkpoint, session, memory, context | `session-management` |
| architecture, design, structure | `architecture` |
| workflow, process, pipeline | `workflow` |

If still no match, use `["general"]` (last resort).

## Fuzzy Match Logic

```
significant_words(text) = [word.lower() for word in text.split() if len(word) >= 4]
# Jaccard similarity (intersection/union) is symmetric and handles
# different-length patterns better than precision-style overlap
jaccard(a, b) = len(set(significant_words(a)) & set(significant_words(b))) / len(set(significant_words(a)) | set(significant_words(b)))
is_duplicate = jaccard >= 0.6
```

## Confidence Scale

| Observation | Confidence | Meaning |
|---|---|---|
| 1st (creation) | 0.3 | New pattern, first discovery |
| 2nd (confirmed once) | 0.5 | Same pattern seen again (+0.2) |
| 3rd (confirmed twice) | 0.7 | Evolution candidate (+0.2, 3+ confirms) |
| 4th+ (confirmed 3+) | 0.9 | Verified pattern (+0.2, capped at 0.9) |

Formula: `new_confidence = min(current_confidence + 0.2, 0.9)`
Contradiction: `new_confidence = max(current_confidence - 0.2, 0.0)` -> archive at 0.0

## Output Format

```
INSTINCT CAPTURED

ID:         inst_NNN
Pattern:    <description>
Confidence: 0.X [NEW | +0.2 CONFIRMED]
Tags:       tag1, tag2
Evidence:   N entries

Tip: Use /evolve when you have 3+ instincts at 0.7+ to create reusable skills.
```

## Corruption Detection and Recovery

**Detection criteria:** instincts.json is corrupted if:
- Invalid JSON syntax
- Missing "version" field
- Missing "instincts" array
- File size > 10MB

**Recovery:**
1. Back up as `instincts.json.YYYYMMDD_HHMMSS.bak` (timestamped, not overwrite)
2. Keep max 3 backups (delete oldest)
3. Reinitialize with fresh schema
4. Log: "Recovered from corrupted instincts.json"

## Error Handling

- If no pattern text provided and no session context available, ask user to describe the pattern
- Maximum 500 instincts in file; if exceeded, archive instincts with confidence < 0.3 that are older than 30 days
