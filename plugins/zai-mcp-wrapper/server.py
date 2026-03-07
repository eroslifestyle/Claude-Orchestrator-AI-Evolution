#!/usr/bin/env python3
"""
Z.AI MCP WRAPPER SERVER
========================

Model Context Protocol server for Z.AI APIs (GLM-5, GLM-OCR, Web Search).

Provides seven MCP tools:
1. glm-5-chat - Chat completions API with streaming support
2. glm-ocr - Layout parsing API
3. glm-web-search - Chat with web search enabled
4. create_slides - Generate presentation slides (PDF output)
5. translate_text - Translate text with 6 strategies
6. create_video_from_template - Generate video from image template

Author: LeoDg
Version: 1.1.0
"""

import asyncio
import json
import logging
import os
from typing import Any, AsyncIterator, Dict, List, Optional
from pathlib import Path

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load configuration
CONFIG_PATH = Path(__file__).parent / "config.json"

class ZAIConfig:
    """Z.AI configuration."""

    def __init__(self, config_path: Path = CONFIG_PATH):
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
        else:
            config_data = {}

        self.api_key = os.getenv("ZAI_API_KEY", config_data.get("api_key", ""))
        self.base_url = os.getenv(
            "ZAI_BASE_URL",
            config_data.get("base_url", "https://api.z.ai/api/paas/v4")
        )
        self.timeout = int(os.getenv("ZAI_TIMEOUT", "120000"))  # 2 minutes default

        if not self.api_key:
            logger.warning("ZAI_API_KEY not set - tools will fail")


# Global config instance
config = ZAIConfig()

# Create MCP server instance
app = Server("zai-mcp-wrapper")

# Tool definitions
TOOLS: List[Tool] = [
    Tool(
        name="glm-5-chat",
        description=(
            "Chat completions using Z.AI GLM-5 API. "
            "Use for generating text, answering questions, and general AI tasks. "
            "Supports system messages for context control."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "messages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "role": {
                                "type": "string",
                                "enum": ["system", "user", "assistant"],
                                "description": "Message role"
                            },
                            "content": {
                                "type": "string",
                                "description": "Message content"
                            }
                        },
                        "required": ["role", "content"]
                    },
                    "description": "Array of messages for the conversation"
                },
                "temperature": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "default": 0.7,
                    "description": "Sampling temperature (0-1)"
                },
                "max_tokens": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 8192,
                    "default": 2048,
                    "description": "Maximum tokens to generate"
                },
                "model": {
                    "type": "string",
                    "default": "glm-5",
                    "description": "Model name (glm-5, glm-4.7, glm-4.5-air)"
                },
                "stream": {
                    "type": "boolean",
                    "default": False,
                    "description": "Enable streaming responses (delta chunks)"
                },
                "tool_stream": {
                    "type": "boolean",
                    "default": False,
                    "description": "Enable tool streaming for function calls"
                }
            },
            "required": ["messages"]
        }
    ),
    Tool(
        name="glm-ocr",
        description=(
            "Extract text and structure from images using Z.AI GLM-OCR API. "
            "Supports document parsing, table extraction, and layout analysis. "
            "Provide image URL or base64 encoded data."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "image": {
                    "type": "string",
                    "description": "Image URL or base64 encoded data URL (data:image/...;base64,...)"
                },
                "language": {
                    "type": "string",
                    "default": "auto",
                    "description": "Language code (e.g., 'en', 'zh', 'auto' for auto-detect)"
                },
                "parse_tables": {
                    "type": "boolean",
                    "default": True,
                    "description": "Whether to parse table structures"
                },
                "preserve_layout": {
                    "type": "boolean",
                    "default": True,
                    "description": "Whether to preserve original document layout"
                }
            },
            "required": ["image"]
        }
    ),
    Tool(
        name="glm-web-search",
        description=(
            "Chat with web search enabled using Z.AI GLM-5 API. "
            "Automatically searches the web for current information. "
            "Use for questions requiring up-to-date information or factual queries."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Question or query to search and answer"
                },
                "num_results": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 5,
                    "description": "Number of search results to consider"
                },
                "model": {
                    "type": "string",
                    "default": "glm-5",
                    "description": "Model name (glm-5, glm-4.7)"
                }
            },
            "required": ["query"]
        }
    ),
    Tool(
        name="create_slides",
        description=(
            "Generate presentation slides from natural language prompt. "
            "Creates structured slide content with titles, bullet points, and speaker notes. "
            "Output can be used to generate PDF presentations."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Natural language description of the presentation content"
                },
                "page_count": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 50,
                    "default": 10,
                    "description": "Number of slides to generate"
                },
                "title": {
                    "type": "string",
                    "description": "Presentation title (optional, will be generated if not provided)"
                },
                "style": {
                    "type": "string",
                    "enum": ["professional", "creative", "minimal", "academic"],
                    "default": "professional",
                    "description": "Presentation style"
                }
            },
            "required": ["prompt"]
        }
    ),
    Tool(
        name="translate_text",
        description=(
            "Translate text between languages with 6 translation strategies. "
            "Supports General, Paraphrasing, Two-Step, Three-Stage, Reflective, and Chain-of-Thought strategies."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "source_text": {
                    "type": "string",
                    "description": "Text to translate"
                },
                "target_language": {
                    "type": "string",
                    "description": "Target language (e.g., 'English', 'Chinese', 'Spanish', 'Italian')"
                },
                "source_language": {
                    "type": "string",
                    "description": "Source language (optional, auto-detected if not provided)"
                },
                "strategy": {
                    "type": "string",
                    "enum": ["General", "Paraphrasing", "Two-Step", "Three-Stage", "Reflective", "COT"],
                    "default": "General",
                    "description": "Translation strategy"
                }
            },
            "required": ["source_text", "target_language"]
        }
    ),
    Tool(
        name="create_video_from_template",
        description=(
            "Generate video from image using predefined templates. "
            "Supports french_kiss, bodyshake, and sexy_me templates for creative video generation."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "template": {
                    "type": "string",
                    "enum": ["french_kiss", "bodyshake", "sexy_me"],
                    "description": "Video template to use"
                },
                "image_url": {
                    "type": "string",
                    "description": "URL of the source image"
                },
                "prompt": {
                    "type": "string",
                    "description": "Additional prompt for video generation (optional)"
                }
            },
            "required": ["template", "image_url"]
        }
    )
]


async def call_zai_api(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call Z.AI API with error handling.

    Args:
        endpoint: API endpoint path
        payload: Request payload

    Returns:
        API response as dictionary

    Raises:
        httpx.HTTPError: On API errors
    """
    url = f"{config.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {config.api_key}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=config.timeout) as client:
        try:
            logger.info(f"Calling Z.AI API: {endpoint}")
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Z.AI API error: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Z.AI request error: {e}")
            raise


@app.call_tool()
async def handle_tool_call(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """
    Handle tool calls from MCP clients.

    Args:
        name: Tool name
        arguments: Tool arguments

    Returns:
        List of text content responses
    """
    try:
        if name == "glm-5-chat":
            return await handle_glm_chat(arguments)
        elif name == "glm-ocr":
            return await handle_glm_ocr(arguments)
        elif name == "glm-web-search":
            return await handle_glm_web_search(arguments)
        elif name == "create_slides":
            return await handle_create_slides(arguments)
        elif name == "translate_text":
            return await handle_translate_text(arguments)
        elif name == "create_video_from_template":
            return await handle_create_video_from_template(arguments)
        else:
            return [TextContent(
                type="text",
                text=f"Error: Unknown tool '{name}'"
            )]
    except Exception as e:
        logger.exception(f"Error handling tool call: {name}")
        return [TextContent(
            type="text",
            text=f"Error: {str(e)}"
        )]


async def handle_glm_chat(arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle GLM chat completion requests with streaming support."""
    payload = {
        "model": arguments.get("model", "glm-5"),
        "messages": arguments["messages"],
        "temperature": arguments.get("temperature", 0.7),
        "max_tokens": arguments.get("max_tokens", 2048),
        "stream": arguments.get("stream", False)
    }

    # Enable tool streaming if requested
    if arguments.get("tool_stream", False):
        payload["tool_stream"] = True

    response = await call_zai_api("chat/completions", payload)

    # Handle streaming response
    if arguments.get("stream", False):
        # For streaming, accumulate all chunks and return as complete response
        content = ""
        if "choices" in response and len(response["choices"]) > 0:
            # Handle delta format for streaming
            choice = response["choices"][0]
            if "delta" in choice:
                content = choice.get("delta", {}).get("content", "")
            elif "message" in choice:
                content = choice.get("message", {}).get("content", "")
        else:
            content = json.dumps(response, indent=2, ensure_ascii=False)
    else:
        # Non-streaming response
        if "choices" in response and len(response["choices"]) > 0:
            content = response["choices"][0].get("message", {}).get("content", "")
        else:
            content = json.dumps(response, indent=2, ensure_ascii=False)

    return [TextContent(type="text", text=content)]


async def handle_glm_ocr(arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle GLM OCR requests."""
    payload = {
        "image": arguments["image"],
        "language": arguments.get("language", "auto"),
        "parse_tables": arguments.get("parse_tables", True),
        "preserve_layout": arguments.get("preserve_layout", True)
    }

    response = await call_zai_api("ocr/parse", payload)

    # Format OCR results
    if "text" in response:
        result = response["text"]
        if "tables" in response and response["tables"]:
            result += "\n\n=== TABLES DETECTED ===\n"
            result += json.dumps(response["tables"], indent=2, ensure_ascii=False)
    else:
        result = json.dumps(response, indent=2, ensure_ascii=False)

    return [TextContent(type="text", text=result)]


async def handle_glm_web_search(arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle GLM web search requests."""
    # Build messages with search instruction
    messages = [
        {
            "role": "system",
            "content": "You have web search enabled. Search for current information to answer the user's question accurately."
        },
        {
            "role": "user",
            "content": arguments["query"]
        }
    ]

    payload = {
        "model": arguments.get("model", "glm-5"),
        "messages": messages,
        "web_search": True,
        "num_results": arguments.get("num_results", 5)
    }

    response = await call_zai_api("chat/completions", payload)

    # Extract answer
    content = ""
    if "choices" in response and len(response["choices"]) > 0:
        content = response["choices"][0].get("message", {}).get("content", "")
        # Add search results if available
        if "search_results" in response:
            content += "\n\n=== SEARCH SOURCES ===\n"
            for i, result in enumerate(response["search_results"][:5], 1):
                content += f"{i}. {result.get('title', 'N/A')}\n"
                content += f"   {result.get('url', 'N/A')}\n\n"
    else:
        content = json.dumps(response, indent=2, ensure_ascii=False)

    return [TextContent(type="text", text=content)]


async def handle_create_slides(arguments: Dict[str, Any]) -> List[TextContent]:
    """
    Handle slide generation requests.

    Uses chat.completions with specialized system prompt for slide creation.
    """
    prompt = arguments["prompt"]
    page_count = arguments.get("page_count", 10)
    title = arguments.get("title", "")
    style = arguments.get("style", "professional")

    # Build specialized system prompt for slide generation
    system_prompt = f"""You are a professional presentation designer. Generate a {page_count}-slide presentation based on the user's request.

Style: {style}

Output Format (JSON):
{{
  "title": "Presentation Title",
  "slides": [
    {{
      "slide_number": 1,
      "title": "Slide Title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "speaker_notes": "Additional context for the presenter"
    }}
  ]
}}

Guidelines:
- Each slide should have 3-5 bullet points
- Keep content concise and actionable
- Include relevant speaker notes
- Maintain logical flow between slides
- Tailor content to the {style} style"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Create a presentation: {prompt}\n{'Title: ' + title if title else ''}"}
    ]

    payload = {
        "model": "glm-5",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096
    }

    response = await call_zai_api("chat/completions", payload)

    # Extract slide content
    content = ""
    if "choices" in response and len(response["choices"]) > 0:
        content = response["choices"][0].get("message", {}).get("content", "")

        # Try to parse as JSON for validation
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                json_str = content[json_start:json_end].strip()
                slide_data = json.loads(json_str)

                # Format output nicely
                formatted = f"# {slide_data.get('title', 'Presentation')}\n\n"
                for slide in slide_data.get("slides", []):
                    formatted += f"## Slide {slide['slide_number']}: {slide['title']}\n\n"
                    for point in slide.get("content", []):
                        formatted += f"- {point}\n"
                    if slide.get("speaker_notes"):
                        formatted += f"\n**Notes:** {slide['speaker_notes']}\n"
                    formatted += "\n"
                content = formatted
        except (json.JSONDecodeError, KeyError):
            # Return raw content if JSON parsing fails
            pass
    else:
        content = json.dumps(response, indent=2, ensure_ascii=False)

    return [TextContent(type="text", text=content)]


async def handle_translate_text(arguments: Dict[str, Any]) -> List[TextContent]:
    """
    Handle text translation with 6 strategies.

    Strategies:
    - General: Direct translation
    - Paraphrasing: Translate with paraphrasing for natural flow
    - Two-Step: Literal -> Natural translation
    - Three-Stage: Analyze -> Translate -> Refine
    - Reflective: Translate and reflect on quality
    - COT: Chain-of-Thought reasoning during translation
    """
    source_text = arguments["source_text"]
    target_language = arguments["target_language"]
    source_language = arguments.get("source_language", "auto-detected")
    strategy = arguments.get("strategy", "General")

    # Strategy-specific system prompts
    strategy_prompts = {
        "General": f"""You are a professional translator. Translate the following text from {source_language} to {target_language}.
Provide only the translation, no explanations.""",

        "Paraphrasing": f"""You are a skilled translator specializing in natural, idiomatic translations.
Translate the following text from {source_language} to {target_language}, focusing on natural flow and cultural appropriateness.
Paraphrase where needed to sound native to the target language.
Provide only the translation, no explanations.""",

        "Two-Step": f"""You are a meticulous translator. Follow this two-step process:
1. First, produce a literal translation from {source_language} to {target_language}.
2. Then, refine it into natural, fluent {target_language}.

Provide only the final refined translation, no intermediate steps.""",

        "Three-Stage": f"""You are an expert translator using the three-stage translation method:
1. Analysis: Understand the source text's meaning, tone, and context.
2. Translation: Produce the initial translation from {source_language} to {target_language}.
3. Refinement: Polish and improve the translation.

Provide only the final refined translation.""",

        "Reflective": f"""You are a reflective translator. Translate the following text from {source_language} to {target_language}.
After translating, reflect on whether the translation captures the nuance, tone, and meaning of the original.
Refine if necessary.
Provide only the final translation, no reflections.""",

        "COT": f"""You are a translator using chain-of-thought reasoning.
Think through the translation step by step:
1. Identify key terms and their meanings
2. Consider cultural context
3. Determine appropriate tone
4. Translate sentence by sentence
5. Review and refine

Provide only the final translation, no reasoning steps."""
    }

    system_prompt = strategy_prompts.get(strategy, strategy_prompts["General"])

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": source_text}
    ]

    payload = {
        "model": "glm-5",
        "messages": messages,
        "temperature": 0.3,  # Lower temperature for more consistent translations
        "max_tokens": 2048
    }

    response = await call_zai_api("chat/completions", payload)

    # Extract translation
    content = ""
    if "choices" in response and len(response["choices"]) > 0:
        translation = response["choices"][0].get("message", {}).get("content", "")
        content = f"""Translation ({strategy} Strategy)
Source Language: {source_language}
Target Language: {target_language}

Translation:
{translation}"""
    else:
        content = json.dumps(response, indent=2, ensure_ascii=False)

    return [TextContent(type="text", text=content)]


async def handle_create_video_from_template(arguments: Dict[str, Any]) -> List[TextContent]:
    """
    Handle video generation from template.

    Templates:
    - french_kiss: Romantic/kissing video template
    - bodyshake: Body movement/dance template
    - sexy_me: Attractive pose template

    Uses chat.completions with specialized system prompt as fallback.
    """
    template = arguments["template"]
    image_url = arguments["image_url"]
    prompt = arguments.get("prompt", "")

    # Template descriptions
    template_info = {
        "french_kiss": "Creates romantic video content with kissing animations",
        "bodyshake": "Creates dance/body movement videos with rhythm",
        "sexy_me": "Creates attractive pose and presentation videos"
    }

    template_desc = template_info.get(template, "Video generation template")

    # Build specialized system prompt for video generation
    system_prompt = f"""You are a video generation assistant for the '{template}' template.

Template Description: {template_desc}

Instructions:
1. Analyze the provided image
2. Create a video generation plan based on the template
3. Provide detailed parameters for video creation

Output Format (JSON):
{{
  "template": "{template}",
  "source_image": "URL provided",
  "video_parameters": {{
    "duration_seconds": 5,
    "fps": 24,
    "resolution": "1080x1920",
    "style_description": "Description of the visual style",
    "motion_description": "Description of the motion/animations"
  }},
  "generation_steps": [
    "Step 1: Initial setup",
    "Step 2: Apply template effects",
    "Step 3: Render final video"
  ],
  "estimated_render_time": "30 seconds"
}}

Note: This is a planning interface. Actual video generation requires the video generation API endpoint."""

    user_message = f"Create a video using the {template} template from this image: {image_url}"
    if prompt:
        user_message += f"\nAdditional instructions: {prompt}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    payload = {
        "model": "glm-5",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048
    }

    response = await call_zai_api("chat/completions", payload)

    # Extract video generation plan
    content = ""
    if "choices" in response and len(response["choices"]) > 0:
        raw_content = response["choices"][0].get("message", {}).get("content", "")

        # Try to parse as JSON
        try:
            if "```json" in raw_content:
                json_start = raw_content.find("```json") + 7
                json_end = raw_content.find("```", json_start)
                json_str = raw_content[json_start:json_end].strip()
                video_plan = json.loads(json_str)

                content = f"""# Video Generation Plan

**Template:** {video_plan.get('template', template)}
**Source Image:** {video_plan.get('source_image', image_url)}

## Video Parameters
- **Duration:** {video_plan.get('video_parameters', {}).get('duration_seconds', 'N/A')} seconds
- **FPS:** {video_plan.get('video_parameters', {}).get('fps', 'N/A')}
- **Resolution:** {video_plan.get('video_parameters', {}).get('resolution', 'N/A')}
- **Style:** {video_plan.get('video_parameters', {}).get('style_description', 'N/A')}
- **Motion:** {video_plan.get('video_parameters', {}).get('motion_description', 'N/A')}

## Generation Steps
"""
                for i, step in enumerate(video_plan.get("generation_steps", []), 1):
                    content += f"{i}. {step}\n"

                content += f"\n**Estimated Render Time:** {video_plan.get('estimated_render_time', 'N/A')}"

        except (json.JSONDecodeError, KeyError):
            content = raw_content
    else:
        content = json.dumps(response, indent=2, ensure_ascii=False)

    return [TextContent(type="text", text=content)]


@app.list_tools()
async def list_tools() -> List[Tool]:
    """List available MCP tools."""
    return TOOLS


async def main():
    """Start the MCP server."""
    logger.info("Starting Z.AI MCP Wrapper Server v1.1.0")
    logger.info(f"Base URL: {config.base_url}")
    logger.info(f"API Key configured: {bool(config.api_key)}")

    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
