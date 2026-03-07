# Bimodal Routing System V14.0.2

> **Version:** 14.0.2 AI-Native | **Last Updated:** 2026-03-07
> **Autore:** Orchestrator Team

---

## Overview

Il **Bimodal Routing System** abilita l'Orchestrator V12.7 a operare su due profili distinti:

- **cca**: Anthropic Claude Opus 4.6 (Backend Nativo)
- **ccg**: GLM-5 via Z.AI (API Proxy)

Ogni profilo ha strumenti, modelli e configurazioni specifiche, gestite centralmente tramite `tool_sets.json`.

---

## Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR V12.7                         │
│                   (Profile Detection Layer)                    │
└────────────────────┬────────────────────┬──────────────────────┘
                     │                    │
         ┌───────────▼──────────┐  ┌──────▼──────────────┐
         │   Profile: cca       │  │   Profile: ccg      │
         │   (Anthropic Native) │  │   (Z.AI Proxy)      │
         └───────────┬──────────┘  └──────┬──────────────┘
                     │                    │
         ┌───────────▼──────────┐  ┌──────▼──────────────┐
         │ tool_sets.json       │  │ tool_sets.json      │
         │ - Canva tools        │  │ - Canva tools       │
         │ - Native tools       │  │ - MCP tools         │
         │ - MCP servers        │  │ - Z.AI API          │
         └──────────────────────┘  └─────────────────────┘
```

---

## Componenti

### 1. Profile Detection

**File:** `SKILL.md` - STEP 0.1

Il sistema rileva automaticamente il profilo attivo:

```python
# Detection method
CURRENT_PROVIDER = read_file(".current-provider")
# OR
ACTIVE_PROFILE = settings["claudeCodeModelSettings"]["activeProfile"]
```

**Mapping Profili:**

| Profile | Backend | Modello Default | Tool Chiave |
|---------|---------|-----------------|-------------|
| **cca** | Anthropic Native | Opus 4.6 | Canva (native) |
| **ccg** | Z.AI API Proxy | GLM-5 | Z.AI tools |

### 2. Tool Filtering

**File:** `tool_sets.json`

Configurazione centralizzata degli strumenti disponibili per profilo:

```json
{
  "profiles": {
    "cca": {
      "tools": {
        "available": ["mcp__claude_ai_Canva__*", ...],
        "restricted": []
      }
    },
    "ccg": {
      "tools": {
        "available": ["mcp__claude_ai_Canva__*", ...],
        "restricted": []
      }
    }
  }
}
```

**Regole di Filtering:**
- Strumenti con prefisso `mcp__` sono **native tools** (sempre disponibili)
- Veri server MCP richiedono ToolSearch per subagent
- Canva tools disponibili in **ENTRAMBI** i profili

### 3. MCP Wrapper Z.AI

**File:** `zai-mcp-wrapper/server.py`

Wrapper che espone i tool Z.AI come server MCP locale:

```python
# 7 tool esposti (V12.7.1)
mcp__zai-mcp-server__glm-5-chat()              # Chat completions
mcp__zai-mcp-server__glm-5-chat-stream()       # Chat con streaming
mcp__zai-mcp-server__glm-ocr()                 # OCR immagine
mcp__zai-mcp-server__glm-web-search()          # Web search
mcp__zai-mcp-server__create_slides()           # Generazione presentazioni
mcp__zai-mcp-server__translate_text()          # Traduzione 6 strategie
mcp__zai-mcp-server__create_video_from_template()  # Video da template
```

**Nota:** Z.AI usa **API proxy**, NON protocollo MCP reale.

**Esempi Utilizzo:**

```python
# Chat con streaming
{
  "name": "mcp__zai-mcp-server__glm-5-chat-stream",
  "arguments": {
    "messages": [{"role": "user", "content": "Spiega quantum computing"}],
    "stream": true,
    "temperature": 0.7
  }
}

# Creazione slides
{
  "name": "mcp__zai-mcp-server__create_slides",
  "arguments": {
    "prompt": "Presentazione energie rinnovabili 2026",
    "page_count": 10,
    "style": "professional"
  }
}

# Traduzione con strategia
{
  "name": "mcp__zai-mcp-server__translate_text",
  "arguments": {
    "source_text": "Hello world",
    "target_language": "Italian",
    "strategy": "Paraphrasing"
  }
}

# Video da template
{
  "name": "mcp__zai-mcp-server__create_video_from_template",
  "arguments": {
    "template": "french_kiss",
    "image_url": "https://example.com/image.jpg",
    "prompt": "Romantic sunset"
  }
}
```

### 4. Configuration

**Files:**
- `skills/orchestrator/tool_sets.json` - Configurazione tool
- `zai-mcp-wrapper/config.json` - Configurazione wrapper
- `.current-provider` - Profilo attivo (autogenerato)

---

## Usage

### Switching Profili

Utenti possono cambiare profilo tramite:

```
/orchestrator
Profile: cca (default)
> /switch-profile ccg
Profile: ccg (attivo)
```

### Task Routing

L'orchestrator route automaticamente i task:

```python
# Esempio 1: Task Canva
User: "Crea un design Canva"
Orchestrator: Rileva profilo → Usa tool Canva disponibili
             (cca o ccg, stesso risultato)

# Esempio 2: Task-specifico
User: "Analizza immagine con Z.AI"
Orchestrator: Rileva ccg → Usa mcp__zai-mcp-server__analyze_image

# Esempio 3: Task generico
User: "Scrivi codice Python"
Orchestrator: Usa ACTIVE_PROFILE → Delega a Coder subagent
```

### Tool Availability

| Categoria | cca | ccg | Note |
|-----------|-----|-----|------|
| Canva Design | ✅ | ✅ | Stesso tool set (33 tools) |
| Web Automation | ✅ | ✅ | web_reader + web_search |
| Image Analysis | ✅ | ✅ | analyze_image |
| Orchestrator MCP | ✅ | ✅ | 7 tool orchestrazione |
| Z.AI Specific | ❌ | ✅ | 7 tool esclusivi (V12.7.1) |

**Z.AI Tools (solo ccg):**
1. `glm-5-chat` - Chat completions
2. `glm-5-chat-stream` - Chat con streaming
3. `glm-ocr` - OCR immagini
4. `glm-web-search` - Web search
5. `create_slides` - Generazione presentazioni (PDF)
6. `translate_text` - Traduzione 6 strategie
7. `create_video_from_template` - Video da template

---

## Troubleshooting

### Problema: Tool non disponibile

**Sintomo:** `Tool not found: mcp__xxx__yyy`

**Soluzioni:**
1. Verificare profilo attivo: `cat .current-provider`
2. Controllare `tool_sets.json` per il profilo
3. Riavviare Claude Code dopo cambio profilo

### Problema: Profile detection fallito

**Sintomo:** Orchestrator non rileva profilo corretto

**Soluzioni:**
1. Verificare `.current-provider` esista e sia valido
2. Controllare `settings.json` → `activeProfile`
3. Creare manualmente `.current-provider`: `echo "cca" > .current-provider`

### Problema: Canva tools non funzionano

**Sintomo:** `Error: Canva tool not responding`

**Soluzioni:**
1. Verificare autenticazione Canva (loggato su canva.com)
2. Controllare che `mcp__claude_ai_Canva__*` sia in `tool_sets.json`
3. Riavviare MCP server Canva se necessario

### Problema: Z.AI tools lenti

**Sintomo:** `Timeout waiting for Z.AI API`

**Soluzioni:**
1. Verificare connessione internet
2. Controllare API key Z.AI in settings
3. Aumentare timeout in `zai-mcp-wrapper/config.json`

---

## Technical Details

### Tool Prefix Convention

```
mcp__<server>__<tool>

Esempi:
- mcp__claude_ai_Canva__generate-design  (Native tool, cca/ccg)
- mcp__orchestrator__orchestrator_agents  (MCP server, locale)
- mcp__zai-mcp-server__web_search         (Wrapper, ccg only)
```

**Importante:** Prefisso `mcp__` NON indica sempre un vero server MCP!

### Profile Detection Algorithm

```python
def detect_profile():
    # 1. Check .current-provider file
    if exists(".current-provider"):
        return read_file(".current-provider").strip()

    # 2. Check settings.json
    settings = load_json("settings.json")
    profile = settings.get("claudeCodeModelSettings", {}).get("activeProfile")
    if profile:
        return profile

    # 3. Default to cca
    return "cca"
```

### Tool Filtering Logic

```python
def filter_tools(tools, profile):
    config = load_json("tool_sets.json")
    available = config["profiles"][profile]["tools"]["available"]
    restricted = config["profiles"][profile]["tools"]["restricted"]

    # Include available
    filtered = [t for t in tools if t in available]

    # Exclude restricted
    filtered = [t for t in filtered if t not in restricted]

    return filtered
```

---

## Migration Notes

### Da V12.6 a V12.7

**Nuovi File:**
- `tool_sets.json` - Configurazione tool
- `zai-mcp-wrapper/` - Wrapper Z.AI
- `docs/bimodal-routing.md` - Questa documentazione

**Breaking Changes:**
- Nessuno. Backward compatible.

**Deprecations:**
- Nessuna deprecazione.

### Da V12.7 a V12.7.1

**Nuovi Tool Z.AI (4):**
- `glm-5-chat-stream` - Chat con supporto streaming
- `create_slides` - Generazione automatica presentazioni
- `translate_text` - Traduzione con 6 strategie diverse
- `create_video_from_template` - Video da 3 template

**File Modificati:**
- `tool_sets.json` - Aggiunti 4 tool Z.AI alla sezione ccg
- `zai-mcp-wrapper/server.py` - Implementati nuovi tool
- `zai-mcp-wrapper/config.json` - Configurazione nuovi tool
- `zai-mcp-wrapper/README.md` - Documentazione completa tool

**Comportamento:**
- I nuovi tool sono disponibili SOLO nel profilo ccg
- Non modificano tool esistenti (backward compatible)
- Richiedono ZAI_API_KEY in environment

---

## Future Enhancements

- [ ] Auto-profile switching basato su task type
- [ ] Tool-specific routing (Canva → cca preferito)
- [ ] Profile-specific prompts in subagent
- [ ] Metrics collection per profile

---

## References

- [SKILL.md](../SKILL.md) - Orchestrator principale
- [tool_sets.json](../tool_sets.json) - Configurazione tool
- [README.md](../README.md) - Quick start guide
- [CHANGELOG.md](changelog.md) - Version history

---

**Version:** 2.0.0
**Last Updated:** 2026-03-07
**Maintainer:** Orchestrator Team
**Compatible with:** Orchestrator V13.0 DYNAMIC ARCHITECTURE
