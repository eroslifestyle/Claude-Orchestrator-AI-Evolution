# Z.AI MCP Server Architecture V12.7

> **Versione:** 1.0.0
> **Data:** 2026-03-07
> **Autore:** Architecture Expert Agent
> **Status:** Design Proposal

---

## 📋 INDICE

1. [Overview](#overview)
2. [Architettura Stream Tool](#1-architettura-stream-tool)
3. [Architettura Slide Agent](#2-architettura-slide-agent)
4. [Architettura Translation Agent](#3-architettura-translation-agent)
5. [Architettura Video Template Agent](#4-architettura-video-template-agent)
6. [Gestione Endpoint Non Documentati](#5-gestione-endpoint-non-documentati)
7. [Aggiornamenti Configurazione](#6-aggiornamenti-configurazione)
8. [Schema Completo Implementazione](#7-schema-completo-implementazione)

---

## Overview

### Scopo

Estendere il server MCP esistente con 4 nuove funzionalità Z.AI:
1. **Stream Tool** - Feature di streaming per chat.completions
2. **Slide Agent** - Generazione presentazioni (PDF)
3. **Translation Agent** - Traduzione con 6 strategie
4. **Video Template Agent** - Generazione video da template

### Wrapper Esistente (3 Tool)

```python
# Tool attuali in zai-mcp-server
TOOLS = [
    {"name": "glm-5-chat", "endpoint": "/chat/completions"},
    {"name": "glm-ocr", "endpoint": "/ocr"},
    {"name": "glm-web-search", "endpoint": "/web/search"}
]
```

### Stack Tecnologico

- **Language:** Python 3.10+
- **Async Runtime:** asyncio + aiohttp
- **MCP Protocol:** stdio transport
- **JSON Schema:** Validazione input/output
- **Binary Handling:** base64 per immagini, PDF, video

---

## 1. ARCHITETTURA STREAM TOOL

### 1.1 Tipo di Feature

**NON è un nuovo tool separato** - è una **feature del modello** esistente `glm-5-chat`.

### 1.2 Modifica a `glm-5-chat`

```python
# File: zai_mcp_server/handlers/chat_handler.py

from typing import AsyncGenerator, List, Dict, Optional, Any
import asyncio
import json

async def handle_glm_5_chat_stream(
    messages: List[Dict[str, Any]],
    model: str = "glm-5",
    stream: bool = True,
    tool_stream: bool = True,
    api_key: str = None,
    **kwargs
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Chat con streaming delta (SSE-like).

    Yields:
        Dict con struttura:
        {
            "type": "reasoning" | "content" | "tool_call" | "done",
            "delta": str | Dict,
            "finish_reason": Optional[str],
            "usage": Optional[Dict]
        }
    """
    endpoint = f"{BASE_URL}/chat/completions"

    payload = {
        "model": model,
        "messages": messages,
        "stream": stream,
        "tool_stream": tool_stream,
        **kwargs
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            endpoint,
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=300)
        ) as response:
            response.raise_for_status()

            async for line in response.content:
                line = line.decode('utf-8').strip()

                if not line or line == ':keepalive':
                    continue

                if line.startswith('data: '):
                    data_str = line[6:]  # Rimuovi 'data: '

                    if data_str == '[DONE]':
                        yield {"type": "done", "finish_reason": "stop"}
                        break

                    try:
                        delta_data = json.loads(data_str)

                        # Estrai delta dal formato risposta
                        choices = delta_data.get("choices", [])
                        if not choices:
                            continue

                        choice = choices[0]
                        delta = choice.get("delta", {})

                        # Tipi di delta possibili
                        if "reasoning_content" in delta:
                            yield {
                                "type": "reasoning",
                                "delta": delta["reasoning_content"]
                            }

                        if "content" in delta:
                            yield {
                                "type": "content",
                                "delta": delta["content"]
                            }

                        if "tool_calls" in delta:
                            yield {
                                "type": "tool_call",
                                "delta": delta["tool_calls"]
                            }

                        # Meta info (usage, finish_reason)
                        if "finish_reason" in choice:
                            yield {
                                "type": "meta",
                                "finish_reason": choice["finish_reason"],
                                "usage": delta_data.get("usage")
                            }

                    except json.JSONDecodeError:
                        # Skip malformed chunks
                        continue
```

### 1.3 Modifica Tool Definition

```python
# File: zai_mcp_server/tools.py

TOOLS = [
    {
        "name": "glm-5-chat",
        "description": "Advanced chat with optional streaming support",
        "inputSchema": {
            "type": "object",
            "properties": {
                "messages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "role": {"type": "string", "enum": ["user", "assistant", "system"]},
                            "content": {"type": "string"}
                        },
                        "required": ["role", "content"]
                    }
                },
                "model": {
                    "type": "string",
                    "default": "glm-5",
                    "enum": ["glm-4.6", "glm-4.7", "glm-5"]
                },
                "stream": {
                    "type": "boolean",
                    "default": False,
                    "description": "Enable streaming output"
                },
                "tool_stream": {
                    "type": "boolean",
                    "default": False,
                    "description": "Stream tool calls during generation"
                },
                "temperature": {"type": "number", "minimum": 0, "maximum": 2},
                "max_tokens": {"type": "integer", "minimum": 1}
            },
            "required": ["messages"]
        }
    },
    # ... altri tool esistenti
]
```

### 1.4 Timeout Considerations

```python
STREAM_TIMEOUTS = {
    "reasoning": 60,  # Timeout per ragionamento
    "content": 30,    # Timeout per content chunk
    "total": 300      # Timeout totale richiesta
}
```

---

## 2. ARCHITETTURA SLIDE AGENT

### 2.1 Nuovo Tool Definition

```python
# File: zai_mcp_server/tools.py

{
    "name": "create_slides",
    "description": "Generate presentation slides from text prompt. Returns PDF file.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "minLength": 10,
                "maxLength": 5000,
                "description": "Topic description for slides generation"
            },
            "page_count": {
                "type": "integer",
                "minimum": 1,
                "maximum": 50,
                "default": 10,
                "description": "Number of slides to generate"
            },
            "language": {
                "type": "string",
                "default": "en",
                "description": "Output language (e.g., en, it, zh)"
            },
            "style": {
                "type": "string",
                "enum": ["professional", "creative", "minimalist", "academic"],
                "default": "professional"
            }
        },
        "required": ["prompt"]
    }
}
```

### 2.2 Handler Implementation

```python
# File: zai_mcp_server/handlers/slides_handler.py

import base64
import hashlib
from pathlib import Path
from typing import Dict, Optional
import aiohttp
import asyncio

CACHE_DIR = Path.home() / ".cache" / "zai_mcp" / "slides"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

async def handle_create_slides(
    prompt: str,
    page_count: Optional[int] = 10,
    language: str = "en",
    style: str = "professional",
    api_key: str = None
) -> Dict[str, any]:
    """
    Genera slides PDF da prompt testuale.

    Endpoint NON documentato - usa fallback a chat.completions.
    """
    # Genera cache key
    cache_key = hashlib.sha256(
        f"{prompt}:{page_count}:{language}:{style}".encode()
    ).hexdigest()

    cache_file = CACHE_DIR / f"{cache_key}.pdf"

    # Check cache
    if cache_file.exists():
        return {
            "status": "success",
            "cached": True,
            "format": "pdf",
            "data": base64.b64encode(cache_file.read_bytes()).decode('utf-8'),
            "size_bytes": cache_file.stat().st_size,
            "page_count": page_count
        }

    # Endpoint strategy (vedi sezione 5)
    endpoint = determine_slides_endpoint()

    payload = {
        "prompt": prompt,
        "page_count": page_count,
        "language": language,
        "style": style,
        "format": "pdf"
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=120)  # 2 min per generazione PDF
            ) as response:
                response.raise_for_status()

                # Assume risposta binaria PDF
                pdf_data = await response.read()

                # Cache
                cache_file.write_bytes(pdf_data)

                return {
                    "status": "success",
                    "cached": False,
                    "format": "pdf",
                    "data": base64.b64encode(pdf_data).decode('utf-8'),
                    "size_bytes": len(pdf_data),
                    "page_count": page_count
                }

    except aiohttp.ClientError as e:
        # Fallback: usa chat.completions per generare outline
        return await generate_slides_outline_fallback(
            prompt, page_count, language, style, api_key
        )


async def generate_slides_outline_fallback(
    prompt: str,
    page_count: int,
    language: str,
    style: str,
    api_key: str
) -> Dict:
    """
    Fallback quando endpoint slide non disponibile.
    Genera outline testuale via chat.completions.
    """
    system_prompt = f"""You are a presentation generator.
Generate {page_count} slides outline in {language} language.
Style: {style}.
Format: Markdown with slide titles and bullet points."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Create presentation about: {prompt}"}
    ]

    # Chiama chat.completions (handler esistente)
    from .chat_handler import handle_glm_5_chat

    result = await handle_glm_5_chat(
        messages=messages,
        model="glm-5",
        api_key=api_key
    )

    return {
        "status": "fallback",
        "format": "markdown",
        "data": result["content"],
        "note": "PDF endpoint unavailable, generated outline instead"
    }
```

### 2.3 Timeout Strategy

```python
SLIDES_TIMEOUTS = {
    "outline": 30,      # Fallback outline generation
    "pdf_generation": 120,  # Full PDF generation
    "complex": 300      # Slides con immagini complesse
}
```

---

## 3. ARCHITETTURA TRANSLATION AGENT

### 3.1 Nuovo Tool Definition

```python
# File: zai_mcp_server/tools.py

{
    "name": "translate_text",
    "description": "Translate text with 6 different strategies (General, Paraphrasing, Two-Step, Three-Stage, Reflective, COT)",
    "inputSchema": {
        "type": "object",
        "properties": {
            "source_text": {
                "type": "string",
                "minLength": 1,
                "maxLength": 10000,
                "description": "Text to translate"
            },
            "target_language": {
                "type": "string",
                "description": "Target language code (e.g., en, it, zh, es, fr, de)"
            },
            "source_language": {
                "type": "string",
                "description": "Source language (auto-detect if omitted)"
            },
            "strategy": {
                "type": "string",
                "enum": [
                    "General",
                    "Paraphrasing",
                    "Two-Step",
                    "Three-Stage",
                    "Reflective",
                    "COT"
                ],
                "default": "General",
                "description": "Translation strategy"
            },
            "include_pronunciation": {
                "type": "boolean",
                "default": False,
                "description": "Include pronunciation guide for target text"
            },
            "include_reasoning": {
                "type": "boolean",
                "default": False,
                "description": "Include translation reasoning process"
            }
        },
        "required": ["source_text", "target_language"]
    }
}
```

### 3.2 Handler Implementation

```python
# File: zai_mcp_server/handlers/translation_handler.py

from typing import Dict, Optional, Literal
import aiohttp

TranslationStrategy = Literal[
    "General", "Paraphrasing", "Two-Step",
    "Three-Stage", "Reflective", "COT"
]

STRATEGY_PROMPTS = {
    "General": "Translate the following text from {source} to {target}. Provide accurate, natural translation.",

    "Paraphrasing": """Translate and then paraphrase the translation in {target}.
Provide two versions:
1. Direct translation
2. Paraphrased version with same meaning but different wording""",

    "Two-Step": """Use two-step translation process:
Step 1: Translate from {source} to {target}
Step 2: Refine the translation for natural flow and accuracy""",

    "Three-Stage": """Use three-stage translation:
Stage 1: Literal translation
Stage 2: Cultural adaptation
Stage 3: Final polish for naturalness""",

    "Reflective": """Translate with reflection:
1. Provide initial translation
2. Reflect on potential issues
3. Provide improved translation based on reflection""",

    "COT": """Translate using Chain of Thought reasoning:
- Analyze source text meaning
- Identify cultural nuances
- Step-by-step translation
- Verify accuracy
- Final translation"""
}

async def handle_translate_text(
    source_text: str,
    target_language: str,
    source_language: Optional[str] = "auto",
    strategy: TranslationStrategy = "General",
    include_pronunciation: bool = False,
    include_reasoning: bool = False,
    api_key: str = None
) -> Dict[str, any]:
    """
    Traduce testo con strategia specificata.
    """
    endpoint = determine_translation_endpoint()

    # Costruisci prompt basato su strategia
    prompt_template = STRATEGY_PROMPTS[strategy]

    source_display = source_language if source_language != "auto" else "detected language"

    system_prompt = prompt_template.format(
        source=source_display,
        target=target_language
    )

    if include_pronunciation:
        system_prompt += "\n\nInclude pronunciation guide for the translated text."

    if include_reasoning:
        system_prompt += "\n\nShow your reasoning process."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": source_text}
    ]

    # Chiama chat.completions con strategia specifica
    from .chat_handler import handle_glm_5_chat

    result = await handle_glm_5_chat(
        messages=messages,
        model="glm-5",
        temperature=0.3,  # Bassa temperatura per traduzione accurata
        api_key=api_key
    )

    response = {
        "status": "success",
        "strategy": strategy,
        "source_language": source_language,
        "target_language": target_language,
        "translated_text": result["content"]
    }

    if include_reasoning:
        response["reasoning"] = extract_reasoning_from_response(result)

    if include_pronunciation:
        response["pronunciation"] = extract_pronunciation(result["content"])

    return response


def extract_reasoning_from_response(result: Dict) -> str:
    """Estrae reasoning dalla risposta (se presente in reasoning_content)"""
    # Implementazione dipende dal formato risposta
    return result.get("reasoning", "")


def extract_pronunciation(translated_text: str) -> str:
    """Estrae o genera pronuncia (feature opzionale)"""
    # Per lingue non-latine, potrebbe richiedere tool separato
    return "[Pronunciation feature - implement with phonetic API]"
```

### 3.3 Timeout per Strategy

```python
TRANSLATION_TIMEOUTS = {
    "General": 10,
    "Paraphrasing": 20,
    "Two-Step": 15,
    "Three-Stage": 30,
    "Reflective": 25,
    "COT": 40
}
```

---

## 4. ARCHITETTURA VIDEO TEMPLATE AGENT

### 4.1 Nuovo Tool Definition

```python
# File: zai_mcp_server/tools.py

{
    "name": "create_video_from_template",
    "description": "Generate video from image using predefined templates (french_kiss, bodyshake, sexy_me)",
    "inputSchema": {
        "type": "object",
        "properties": {
            "template": {
                "type": "string",
                "enum": ["french_kiss", "bodyshake", "sexy_me"],
                "description": "Video template to apply"
            },
            "image": {
                "type": "string",
                "description": "Image as base64 string or file path"
            },
            "image_format": {
                "type": "string",
                "enum": ["base64", "url", "path"],
                "default": "base64"
            },
            "prompt": {
                "type": "string",
                "maxLength": 500,
                "description": "Optional prompt to guide video generation"
            },
            "duration": {
                "type": "number",
                "minimum": 1,
                "maximum": 10,
                "default": 5,
                "description": "Video duration in seconds"
            },
            "resolution": {
                "type": "string",
                "enum": ["480p", "720p", "1080p"],
                "default": "720p"
            }
        },
        "required": ["template", "image"]
    }
}
```

### 4.2 Handler Implementation

```python
# File: zai_mcp_server/handlers/video_handler.py

import base64
import mimetypes
from pathlib import Path
from typing import Dict, Literal, Union
import aiohttp

VideoTemplate = Literal["french_kiss", "bodyshake", "sexy_me"]

async def handle_create_video_from_template(
    template: VideoTemplate,
    image: str,
    image_format: str = "base64",
    prompt: Optional[str] = None,
    duration: float = 5.0,
    resolution: str = "720p",
    api_key: str = None
) -> Dict[str, any]:
    """
    Genera video da immagine usando template.
    """
    # Prepara immagine per upload
    image_data, image_mime = prepare_image_data(image, image_format)

    endpoint = determine_video_template_endpoint()

    # Multipart form-data per upload immagine
    form_data = aiohttp.FormData()

    form_data.add_field(
        "image",
        image_data,
        filename=f"input.{image_mime.split('/')[-1]}",
        content_type=image_mime
    )

    form_data.add_field("template", template)
    form_data.add_field("duration", str(duration))
    form_data.add_field("resolution", resolution)

    if prompt:
        form_data.add_field("prompt", prompt)

    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint,
                data=form_data,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=300)  # 5 min per render video
            ) as response:
                response.raise_for_status()

                video_data = await response.read()

                return {
                    "status": "success",
                    "template": template,
                    "format": "mp4",
                    "data": base64.b64encode(video_data).decode('utf-8'),
                    "size_bytes": len(video_data),
                    "duration": duration,
                    "resolution": resolution
                }

    except aiohttp.ClientError as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Video generation failed. Template endpoint may be unavailable."
        }


def prepare_image_data(
    image: str,
    image_format: str
) -> tuple[bytes, str]:
    """
    Prepara dati immagine per upload.

    Returns:
        (image_bytes, mime_type)
    """
    if image_format == "base64":
        # Rimuovi header data:image/...;base64, se presente
        if "," in image:
            image = image.split(",", 1)[1]

        image_bytes = base64.b64decode(image)

        # Detect MIME dal magic bytes
        if image_bytes[:3] == b'\xff\xd8\xff':
            mime_type = "image/jpeg"
        elif image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
            mime_type = "image/png"
        else:
            mime_type = "image/jpeg"  # Default

        return image_bytes, mime_type

    elif image_format == "path":
        path = Path(image)
        image_bytes = path.read_bytes()
        mime_type, _ = mimetypes.guess_type(path.name)
        return image_bytes, mime_type or "image/jpeg"

    elif image_format == "url":
        # Scarica da URL
        raise NotImplementedError("URL download not yet implemented")

    else:
        raise ValueError(f"Invalid image_format: {image_format}")
```

### 4.3 Timeout per Video Generation

```python
VIDEO_TIMEOUTS = {
    "french_kiss": 180,   # 3 min
    "bodyshake": 240,     # 4 min (più complesso)
    "sexy_me": 300        # 5 min (più complesso)
}
```

---

## 5. GESTIONE ENDPOINT NON DOCUMENTATI

### 5.1 Problema

Slide, Translation e Video Template agents hanno endpoint **NON documentati** nella API Z.AI ufficiale.

### 5.2 Strategia Multi-Layer

```python
# File: zai_mcp_server/utils/endpoint_resolver.py

from typing import Optional
import os

# Configurazione base URL
BASE_URL = os.getenv("ZAI_BASE_URL", "https://api.z.ai/v1")

# Endpoint documentati (certezza)
KNOWN_ENDPOINTS = {
    "chat_completions": f"{BASE_URL}/chat/completions",
    "ocr": f"{BASE_URL}/ocr",
    "web_search": f"{BASE_URL}/web/search"
}

# Endpoint ipotetici (da verificare)
HYPOTHETICAL_ENDPOINTS = {
    "slides": f"{BASE_URL}/slides/generate",
    "slides_agent": f"{BASE_URL}/agents/slides",
    "translation": f"{BASE_URL}/translation",
    "translation_agent": f"{BASE_URL}/agents/translate",
    "video_template": f"{BASE_URL}/video/template",
    "video_agent": f"{BASE_URL}/agents/video"
}

# Endpoint generico agent routing
AGENT_ROUTER_ENDPOINT = f"{BASE_URL}/agents/invoke"


def determine_slides_endpoint() -> str:
    """Determina endpoint per slide generation."""
    # Priorità: config env > hypothethical > fallback
    return os.getenv("ZAI_SLIDES_ENDPOINT") or HYPOTHETICAL_ENDPOINTS["slides"]


def determine_translation_endpoint() -> str:
    """Determina endpoint per translation."""
    return os.getenv("ZAI_TRANSLATION_ENDPOINT") or HYPOTHETICAL_ENDPOINTS["translation"]


def determine_video_template_endpoint() -> str:
    """Determina endpoint per video template."""
    return os.getenv("ZAI_VIDEO_ENDPOINT") or HYPOTHETICAL_ENDPOINTS["video_template"]


async def try_agent_router(
    agent_name: str,
    payload: Dict,
    api_key: str
) -> Optional[Dict]:
    """
    Tenta di usare endpoint generico agent router.

    Molte API hanno endpoint /agents/{name} o /agents/invoke con agent parameter.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload["agent"] = agent_name

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                AGENT_ROUTER_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    return await response.json()
    except Exception:
        pass

    return None
```

### 5.3 Fallback Strategy

```python
# File: zai_mcp_server/handlers/fallback_handler.py

async def handle_with_fallback(
    handler_func,
    *args,
    fallback_func=None,
    **kwargs
) -> Dict:
    """
    Esegue handler con fallback su errore.

    Flow:
    1. Try primary endpoint
    2. If 404/405, try agent router
    3. If both fail, use fallback_func (chat.completions based)
    """
    try:
        return await handler_func(*args, **kwargs)

    except aiohttp.ClientResponseError as e:
        if e.status in (404, 405):
            # Endpoint non esiste, prova agent router
            result = await try_agent_router_fallback(*args, **kwargs)
            if result:
                return result

            # Usa fallback function
            if fallback_func:
                return await fallback_func(*args, **kwargs)

        raise

    except aiohttp.ClientError:
        # Network error, propaga
        raise
```

### 5.4 Configurazione Ambiente

```bash
# .env schema
ZAI_BASE_URL=https://api.z.ai/v1
ZAI_API_KEY=your_key_here

# Endpoint overrides (se si scoprono URL corretti)
ZAI_SLIDES_ENDPOINT=https://api.z.ai/v1/slides/generate
ZAI_TRANSLATION_ENDPOINT=https://api.z.ai/v1/translate
ZAI_VIDEO_ENDPOINT=https://api.z.ai/v1/video/template

# Feature flags
ZAI_ENABLE_SLIDES=true
ZAI_ENABLE_TRANSLATION=true
ZAI_ENABLE_VIDEO=false  # Disabilita se non funziona
```

---

## 6. AGGIORNAMENTI CONFIGURAZIONE

### 6.1 Tool Sets (JSON)

```json
// File: config/tool_sets.json

{
  "version": "12.7",
  "tool_sets": {
    "default": {
      "description": "Standard Z.AI tools",
      "tools": [
        "glm-5-chat",
        "glm-ocr",
        "glm-web-search",
        "create_slides",
        "translate_text",
        "create_video_from_template"
      ]
    },
    "lite": {
      "description": "Minimal set (text only)",
      "tools": [
        "glm-5-chat",
        "translate_text"
      ]
    },
    "full": {
      "description": "All available tools",
      "tools": [
        "glm-5-chat",
        "glm-ocr",
        "glm-web-search",
        "create_slides",
        "translate_text",
        "create_video_from_template"
      ]
    }
  },

  "tool_configuration": {
    "glm-5-chat": {
      "enabled": true,
      "default_model": "glm-5",
      "streaming_enabled": true
    },
    "create_slides": {
      "enabled": true,
      "max_pages": 50,
      "timeout_seconds": 120
    },
    "translate_text": {
      "enabled": true,
      "default_strategy": "General",
      "supported_languages": ["en", "it", "zh", "es", "fr", "de", "ja", "ko"]
    },
    "create_video_from_template": {
      "enabled": false,
      "templates": ["french_kiss", "bodyshake", "sexy_me"],
      "timeout_seconds": 300
    }
  }
}
```

### 6.2 Config.py Updates

```python
# File: zai_mcp_server/config.py

from dataclasses import dataclass
from typing import Dict, Any
import os
import json

@dataclass
class ToolConfig:
    """Configurazione singolo tool."""
    enabled: bool = True
    timeout: int = 30
    max_retries: int = 3
    config: Dict[str, Any] = None

@dataclass
class ServerConfig:
    """Configurazione server MCP."""
    base_url: str = "https://api.z.ai/v1"
    api_key: str = None
    tool_set: str = "default"

    # Tool configs
    chat: ToolConfig = None
    ocr: ToolConfig = None
    web_search: ToolConfig = None
    slides: ToolConfig = None
    translation: ToolConfig = None
    video: ToolConfig = None

    def __post_init__(self):
        # Inizializza default configs
        if self.chat is None:
            self.chat = ToolConfig(enabled=True, timeout=60)

        if self.slides is None:
            self.slides = ToolConfig(
                enabled=True,
                timeout=120,
                config={"max_pages": 50}
            )

        if self.translation is None:
            self.translation = ToolConfig(
                enabled=True,
                timeout=40,
                config={"default_strategy": "General"}
            )

        if self.video is None:
            self.video = ToolConfig(
                enabled=False,  # Default disabilitato
                timeout=300,
                config={"templates": ["french_kiss", "bodyshake", "sexy_me"]}
            )

    @classmethod
    def from_env(cls) -> "ServerConfig":
        """Carica config da environment variables."""
        api_key = os.getenv("ZAI_API_KEY")
        if not api_key:
            raise ValueError("ZAI_API_KEY environment variable required")

        return cls(
            base_url=os.getenv("ZAI_BASE_URL", "https://api.z.ai/v1"),
            api_key=api_key,
            tool_set=os.getenv("ZAI_TOOL_SET", "default")
        )

    @classmethod
    def from_file(cls, path: str) -> "ServerConfig":
        """Carica config da file JSON."""
        with open(path) as f:
            data = json.load(f)

        # Parse tool sets
        # Implementazione dipende da formato tool_sets.json
        # ...

        return cls()
```

### 6.3 MCP Server Config

```python
# File: zai_mcp_server/__init__.py

from mcp.server import Server
from .config import ServerConfig
from .tools import TOOLS

# Crea server MCP
app = Server("zai-mcp-server")

# Carica configurazione
config = ServerConfig.from_env()

# Registra tools abilitati
for tool_def in TOOLS:
    tool_name = tool_def["name"]

    # Check se tool è abilitato
    tool_config = getattr(config, tool_name, None)
    if tool_config and not tool_config.enabled:
        continue

    # Registra tool handler
    handler = get_tool_handler(tool_name)

    @app.call_tool()
    async def call_tool(name: str, arguments: dict):
        if name == tool_name:
            return await handler(**arguments, api_key=config.api_key)

    @app.list_tools()
    async def list_tools():
        return [tool_def]
```

---

## 7. SCHEMA COMPLETO IMPLEMENTAZIONE

### 7.1 Struttura File

```
zai-mcp-server/
├── __init__.py                 # Server MCP entry point
├── config.py                   # Configurazione
├── tools.py                    # Tool definitions
├── handlers/
│   ├── __init__.py
│   ├── chat_handler.py         # glm-5-chat + streaming
│   ├── slides_handler.py       # create_slides
│   ├── translation_handler.py  # translate_text
│   ├── video_handler.py        # create_video_from_template
│   └── fallback_handler.py     # Fallback strategies
├── utils/
│   ├── __init__.py
│   ├── endpoint_resolver.py    # Endpoint discovery
│   ├── binary_handler.py       # Base64, file I/O
│   └── cache.py                # Caching layer
├── tests/
│   ├── test_chat_stream.py
│   ├── test_slides.py
│   ├── test_translation.py
│   └── test_video.py
├── config/
│   ├── tool_sets.json          # Tool configuration
│   └── endpoints.json          # Endpoint mapping
├── requirements.txt
├── setup.py
└── README.md
```

### 7.2 Dipendenze

```txt
# requirements.txt
aiohttp>=3.9.0
mcp>=0.1.0
pydantic>=2.0.0
python-dotenv>=1.0.0
```

### 7.3 Setup.py

```python
# setup.py
from setuptools import setup, find_packages

setup(
    name="zai-mcp-server",
    version="12.7.0",
    packages=find_packages(),
    install_requires=[
        "aiohttp>=3.9.0",
        "mcp>=0.1.0",
        "pydantic>=2.0.0",
        "python-dotenv>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "zai-mcp-server=zai_mcp_server:main",
        ],
    },
)
```

### 7.4 Checklist Implementazione

- [ ] **Stream Tool**
  - [ ] Modifica `glm-5-chat` handler per supportare `stream=True`
  - [ ] Implementa SSE parsing
  - [ ] Test con `glm-4.6`, `glm-4.7`, `glm-5`

- [ ] **Slide Agent**
  - [ ] Implementa `create_slides` handler
  - [ ] Aggiungi cache layer per PDF
  - [ ] Implementa fallback a chat.completions (outline)
  - [ ] Test con vari `page_count`

- [ ] **Translation Agent**
  - [ ] Implementa `translate_text` handler
  - [ ] Aggiungi 6 strategy prompts
  - [ ] Implementa estrazione reasoning/pronunciation
  - [ ] Test tutte le strategie

- [ ] **Video Template Agent**
  - [ ] Implementa `create_video_from_template` handler
  - [ ] Gestione multipart upload immagine
  - [ ] Test con 3 template
  - [ ] Benchmark timeout per template

- [ ] **Endpoint Discovery**
  - [ ] Implementa `try_agent_router` fallback
  - [ ] Documenta endpoint corretti una volta scoperti
  - [ ] Aggiungi feature flags per tool sperimentali

- [ ] **Configurazione**
  - [ ] `tool_sets.json` con presets
  - [ ] Environment variables per override
  - [ ] Timeout configurabili per tool

- [ ] **Testing**
  - [ ] Unit tests per tutti handler
  - [ ] Integration tests con API mock
  - [ ] End-to-end tests con API reale (se disponibile)

---

## APPENDICE A: Esempi Utilizzo

### A.1 Stream Tool

```python
# Client side
async def stream_chat():
    async for chunk in handle_glm_5_chat_stream(
        messages=[{"role": "user", "content": "Explain quantum computing"}],
        stream=True,
        tool_stream=True,
        api_key="..."
    ):
        if chunk["type"] == "reasoning":
            print(f"[THINKING] {chunk['delta']}")
        elif chunk["type"] == "content":
            print(f"[CONTENT] {chunk['delta']}")
        elif chunk["type"] == "done":
            print(f"[DONE] finish_reason: {chunk['finish_reason']}")
```

### A.2 Translation

```python
result = await handle_translate_text(
    source_text="Hello, world!",
    target_language="it",
    strategy="Three-Stage",
    include_reasoning=True,
    api_key="..."
)

print(result["translated_text"])
# Output: "Ciao, mondo!"

print(result["reasoning"])
# Output: "Stage 1: Literal: Hello, world -> Salve, mondo
#          Stage 2: Cultural: 'Salve' is formal, use 'Ciao' for informal
#          Stage 3: Final polish: Ciao, mondo!"
```

### A.3 Video Template

```python
with open("photo.jpg", "rb") as f:
    image_base64 = base64.b64encode(f.read()).decode()

result = await handle_create_video_from_template(
    template="french_kiss",
    image=image_base64,
    image_format="base64",
    prompt="Make it dramatic",
    duration=5,
    api_key="..."
)

# Save video
video_data = base64.b64decode(result["data"])
Path("output.mp4").write_bytes(video_data)
```

---

## APPENDICE B: Note Implementazione

### B.1 Error Handling

Tutti handler devono:

1. **Wrappare aiohttp exceptions** in errori semantic:
   ```python
   class ZAIAPIError(Exception):
       """Base error for Z.AI API"""

   class ZAIEndpointNotFoundError(ZAIAPIError):
       """Endpoint non trovato (404)"""

   class ZAIAuthenticationError(ZAIAPIError):
       """API key invalida (401)"""

   class ZAIRateLimitError(ZAIAPIError):
       """Rate limit (429)"""
   ```

2. **Implementare retry con backoff** per errori temporanei
3. **Loggere tutti errori** con context (tool, params, endpoint)

### B.2 Binary Handling

- **Base64 encoding** per tutti file (PDF, MP4, immagini)
- **Max file size**: 10MB per upload
- **Chunked streaming** per file grandi

### B.3 Cache Strategy

```python
# Cache config
CACHE_CONFIG = {
    "slides": {
        "enabled": True,
        "ttl": 86400,  # 24 hours
        "max_size_mb": 500
    },
    "video": {
        "enabled": False,  # Video troppo grandi
        "ttl": 0
    },
    "translation": {
        "enabled": True,
        "ttl": 3600,  # 1 hour
        "max_entries": 1000
    }
}
```

---

## CONCLUSIONI

Questa architettura fornisce:

1. ✅ **Streaming support** per glm-5-chat (feature modello)
2. ✅ **3 nuovi tool** con fallback strategies
3. ✅ **Gestione endpoint non documentati** con multi-layer strategy
4. ✅ **Configurazione flessibile** con tool sets e env vars
5. ✅ **Error handling robusto** con retry e fallback
6. ✅ **Binary handling** per PDF, MP4, immagini
7. ✅ **Timeout appropriati** per ogni tipo di operazione

### Prossimi Passi

1. **Discovery endpoint** - Contattare Z.AI per URL corretti
2. **Implementazione handler** - Seguire schema architetturale
3. **Testing suite** - Unit + integration tests
4. **Documentation** - User guide per ogni tool
5. **Performance tuning** - Benchmark e ottimizzazioni

---

**Versione:** 1.0.0
**Stato:** Design Complete - Ready for Implementation
