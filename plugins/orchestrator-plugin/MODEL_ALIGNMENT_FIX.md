# MODEL CONFIGURATION ALIGNMENT - FIX REPORT

**Date:** 2026-03-06
**Fix:** Align model mappings across all configuration files
**Status:** ✅ COMPLETED

---

## 🎯 PROBLEM IDENTIFIED

The orchestration system had **inconsistent model mappings**:

### Before Fix:
```
settings-ccg.json:
  SONNET_MODEL: "glm-5"        ❌ WRONG - should be glm-4.7
  HAIKU_MODEL: "glm-4.7"      ❌ WRONG - should be glm-4.5-air

orchestrator-config.json:
  sonnet → "glm-4.7"           ✅ CORRECT
  haiku → "glm-4.7"            ❌ WRONG - should be glm-4.5-air
```

**Impact:** When orchestrator requested "sonnet" or "haiku",
you might get wrong model (haiku → glm-4.7 instead of glm-4.5-air).

---

## ✅ SOLUTION APPLIED

### After Fix:
```
settings.json & settings-ccg.json (ALIGNED):
  OPUS_MODEL:   "glm-5"        ✅
  SONNET_MODEL: "glm-4.7"      ✅ FIXED
  HAIKU_MODEL:  "glm-4.5-air"  ✅ FIXED

orchestrator-config.json (ALIGNED):
  opus → "glm-5"               ✅
  sonnet → "glm-4.7"           ✅
  haiku → "glm-4.5-air"        ✅ FIXED
```

---

## 📊 MODEL REFERENCE TABLE

| Label | Actual Model | Speed | Cost | Use Case |
|-------|--------------|-------|------|----------|
| **opus** | glm-5 | Medium | 25x | Architecture, Security, Complex |
| **sonnet** | glm-4.7 | Fast | 5x | Coding, Debugging, Expert tasks |
| **haiku** | **glm-4.5-air** | **Fastest** | **1x** | Mechanical, Analysis, Documentation |

---

## 🔧 FILES MODIFIED

1. **settings-ccg.json**
   - Fixed: `SONNET_MODEL: "glm-4.7"`
   - Fixed: `HAIKU_MODEL: "glm-4.5-air"`

2. **orchestrator-config.json**
   - Fixed: `haiku: "glm-4.5-air"`

3. **model_selector.py**
   - Added: `actual_model` field to MODEL_CAPABILITIES

---

## 🚀 IMPACT

### Before Fix:
```
Request: "Use haiku for analysis"
Expected: glm-4.5-air (fastest, cheapest)
Got:      glm-4.7 (wrong!)
```

### After Fix:
```
Request: "Use haiku for analysis"
Expected: glm-4.5-air (fastest, cheapest)
Got:      glm-4.5-air ✅ CORRECT
```

---

## 📋 BEHAVIOR COMPARISON

### Profilo cca (Anthropic):
```
opus   → claude-opus-4-6   (25x)
sonnet → claude-sonnet-4-6  (5x)
haiku  → claude-haiku-4-5   (1x)
```

### Profilo ccg (GLM) - NOW FIXED:
```
opus   → glm-5              (25x)
sonnet → glm-4.7            (5x)
haiku  → glm-4.5-air        (1x) ✅ FASTEST
```

---

## ✅ VERIFICATION

All configurations now aligned:
```bash
$ grep "ANTHROPIC_DEFAULT.*MODEL" settings*.json
settings.json:    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5"
settings.json:    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7"
settings.json:    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air"
settings-ccg.json:    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5"
settings-ccg.json:    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7"
settings-ccg.json:    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air"
```

All show **consistent** values! ✅

---

## 📝 SUMMARY

- ✅ **SONNET** now correctly uses glm-4.7 (not glm-5)
- ✅ **HAIKU** now correctly uses glm-4.5-air (fastest)
- ✅ All configuration files aligned
- ✅ Cost mapping now accurate
- ✅ Model selector updated with actual_model field

The orchestration system will now use the **correct models** for each tier!
