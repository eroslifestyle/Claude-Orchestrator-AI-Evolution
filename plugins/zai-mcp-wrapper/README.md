# Z.AI MCP Wrapper

Model Context Protocol (MCP) wrapper for Z.AI APIs, providing GLM-5 Chat, OCR, Web Search, Slides, Translation, and Video Generation tools to Claude Code.

## Version
1.1.0

## Overview

This MCP server exposes seven Z.AI tools as MCP tools:

| Tool | Description | Endpoint |
|------|-------------|----------|
| `glm-5-chat` | Chat completions with streaming support | `chat/completions` |
| `glm-ocr` | Image OCR with layout and table parsing | `ocr/parse` |
| `glm-web-search` | Chat with web search enabled | `chat/completions` + search |
| `create_slides` | Generate presentation slides (PDF format) | `chat/completions` (specialized) |
| `translate_text` | Translate text with 6 strategies | `chat/completions` (specialized) |
| `create_video_from_template` | Generate video from image template | `chat/completions` (specialized) |

## Installation

### 1. Set Environment Variables

Create or edit `~/.claude/.env`:

```bash
# Z.AI API Configuration
ZAI_API_KEY=your_zai_api_key_here
ZAI_BASE_URL=https://api.z.ai/api/paas/v4  # Optional, uses default if not set
ZAI_TIMEOUT=120000  # Optional, timeout in milliseconds (2 minutes)
```

### 2. Register MCP Server

Add to your Claude Code `settings.json`:

```json
{
  "mcpServers": {
    "zai-mcp-wrapper": {
      "command": "python",
      "args": ["C:/Users/LeoDg/.claude/plugins/zai-mcp-wrapper/server.py"],
      "env": {
        "ZAI_API_KEY": "${ZAI_API_KEY}",
        "ZAI_BASE_URL": "${ZAI_BASE_URL}"
      }
    }
  }
}
```

### 3. Install Dependencies

```bash
pip install httpx mcp
```

Or using pipx for isolated installation:

```bash
pipx install httpx mcp
```

## Usage

### glm-5-chat

Basic chat completion with GLM-5, now with streaming support:

```python
# MCP Tool Call
{
  "name": "glm-5-chat",
  "arguments": {
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    "temperature": 0.7,
    "max_tokens": 2048,
    "model": "glm-5",
    "stream": false,        # Enable streaming: true/false
    "tool_stream": false    # Enable tool streaming: true/false
  }
}
```

**New Parameters:**
- `stream` (optional): Enable streaming responses with delta chunks, default false
- `tool_stream` (optional): Enable tool streaming for function calls, default false

**Other Parameters:**
- `messages` (required): Array of message objects with `role` and `content`
- `temperature` (optional): Sampling temperature 0-1, default 0.7
- `max_tokens` (optional): Maximum tokens to generate, default 2048
- `model` (optional): Model name, default "glm-5"

**Available Models:**
- `glm-5` - Most capable model (recommended)
- `glm-4.7` - Balanced performance
- `glm-4.5-air` - Fast, efficient model

### glm-ocr

Extract text and structure from images:

```python
# MCP Tool Call
{
  "name": "glm-ocr",
  "arguments": {
    "image": "https://example.com/document.jpg",  # URL or base64
    "language": "auto",
    "parse_tables": true,
    "preserve_layout": true
  }
}
```

**Parameters:**
- `image` (required): Image URL or base64 data URL
- `language` (optional): Language code ("en", "zh", "auto"), default "auto"
- `parse_tables` (optional): Parse table structures, default true
- `preserve_layout` (optional): Preserve document layout, default true

**Supported Image Formats:**
- JPEG, PNG, GIF, BMP
- Max file size: 10MB
- Base64 format: `data:image/jpeg;base64,/9j/4AAQSkZJRg...`

### glm-web-search

Chat with web search for current information:

```python
# MCP Tool Call
{
  "name": "glm-web-search",
  "arguments": {
    "query": "What are the latest AI developments in 2026?",
    "num_results": 5,
    "model": "glm-5"
  }
}
```

**Parameters:**
- `query` (required): Question or search query
- `num_results` (optional): Number of search results 1-10, default 5
- `model` (optional): Model name, default "glm-5"

**Response includes:**
- AI-generated answer based on search results
- Source URLs and titles for verification

### create_slides

Generate presentation slides from natural language:

```python
# MCP Tool Call
{
  "name": "create_slides",
  "arguments": {
    "prompt": "Create a presentation about renewable energy trends in 2026",
    "page_count": 10,
    "title": "Renewable Energy 2026",
    "style": "professional"
  }
}
```

**Parameters:**
- `prompt` (required): Natural language description of presentation content
- `page_count` (optional): Number of slides 1-50, default 10
- `title` (optional): Presentation title (auto-generated if not provided)
- `style` (optional): Presentation style, default "professional"

**Available Styles:**
- `professional` - Business-oriented, clean design
- `creative` - Vibrant, artistic presentation
- `minimal` - Minimalist, content-focused
- `academic` - Research/academic presentation style

**Output Format:**
- Structured slide content with titles and bullet points
- Speaker notes for each slide
- JSON format ready for PDF generation

### translate_text

Translate text with 6 different strategies:

```python
# MCP Tool Call
{
  "name": "translate_text",
  "arguments": {
    "source_text": "The quick brown fox jumps over the lazy dog.",
    "target_language": "Italian",
    "source_language": "English",
    "strategy": "General"
  }
}
```

**Parameters:**
- `source_text` (required): Text to translate
- `target_language` (required): Target language (e.g., "Italian", "Chinese", "Spanish")
- `source_language` (optional): Source language (auto-detected if not provided)
- `strategy` (optional): Translation strategy, default "General"

**Translation Strategies:**
- `General` - Direct, straightforward translation
- `Paraphrasing` - Natural, idiomatic translation with cultural adaptation
- `Two-Step` - Literal translation refined to natural language
- `Three-Stage` - Analyze -> Translate -> Refine process
- `Reflective` - Translation with quality reflection and refinement
- `COT` - Chain-of-Thought reasoning for complex translations

**Example:**
```
Input: "Hello, world!"
Strategy: Paraphrasing
Output: "Salve, mondo!" (Italian)
```

### create_video_from_template

Generate videos from images using predefined templates:

```python
# MCP Tool Call
{
  "name": "create_video_from_template",
  "arguments": {
    "template": "french_kiss",
    "image_url": "https://example.com/portrait.jpg",
    "prompt": "Romantic sunset scene"
  }
}
```

**Parameters:**
- `template` (required): Video template to use
- `image_url` (required): URL of the source image
- `prompt` (optional): Additional instructions for video generation

**Available Templates:**
- `french_kiss` - Romantic video with kissing animations
- `bodyshake` - Dance/body movement videos with rhythm
- `sexy_me` - Attractive pose and presentation videos

**Output:**
- Video generation plan with parameters
- Duration, FPS, and resolution specifications
- Step-by-step generation instructions
- Estimated render time

## Configuration

### config.json

The `config.json` file provides default configuration:

```json
{
  "version": "1.1.0",
  "api": {
    "base_url": "https://api.z.ai/api/paas/v4",
    "timeout_ms": 120000,
    "authentication": "Bearer Token"
  },
  "models": {
    "default": "glm-5",
    "available": ["glm-5", "glm-4.7", "glm-4.5-air"]
  },
  "slide_styles": {
    "available": ["professional", "creative", "minimal", "academic"],
    "default": "professional"
  },
  "translation_strategies": {
    "available": ["General", "Paraphrasing", "Two-Step", "Three-Stage", "Reflective", "COT"],
    "default": "General"
  },
  "video_templates": {
    "available": ["french_kiss", "bodyshake", "sexy_me"]
  }
}
```

### Environment Variables Override

Environment variables take precedence over `config.json`:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ZAI_API_KEY` | API authentication key | - | **Yes** |
| `ZAI_BASE_URL` | API base URL | `https://api.z.ai/api/paas/v4` | No |
| `ZAI_TIMEOUT` | Request timeout (ms) | `120000` | No |

## Fallback Strategy

For tools without dedicated API endpoints, the wrapper uses a specialized system prompt fallback:

1. **Primary**: Dedicated endpoint if available
2. **Fallback 1**: `chat.completions` with specialized system prompt
3. **Fallback 2**: Mock response with implementation notification

This ensures all tools remain functional even as new endpoints are added to the Z.AI API.

## Error Handling

The wrapper handles errors gracefully:

- **Missing API Key**: Returns error message, logs warning
- **HTTP Errors**: Returns status code and error details
- **Timeout**: Returns timeout error after configured duration
- **Invalid Input**: Returns validation error with details
- **Streaming Errors**: Gracefully falls back to non-streaming mode

## Integration with Orchestrator

The Z.AI MCP wrapper integrates with Claude Code Orchestrator:

**Profile `ccg` (GLM-5 via Z.AI):**
- Automatically loads `zai-mcp-wrapper` MCP server
- Tools available: `glm-5-chat`, `glm-ocr`, `glm-web-search`, `create_slides`, `translate_text`, `create_video_from_template`
- Uses GLM-5, GLM-4.7, GLM-4.5-Air models via Z.AI APIs

**Profile `cca` (Anthropic Claude Opus 4.6):**
- Uses native Anthropic tools only
- Z.AI wrapper not loaded

## Troubleshooting

### Tools Not Available

**Problem:** MCP tools don't appear in Claude Code

**Solutions:**
1. Verify `ZAI_API_KEY` is set in environment
2. Check MCP server registration in `settings.json`
3. Restart Claude Code after configuration changes
4. Check logs: `tail -f ~/.claude/logs/mcp.log`

### Authentication Errors

**Problem:** 401 Unauthorized errors

**Solutions:**
1. Verify API key is valid: `echo $ZAI_API_KEY`
2. Check for extra whitespace in key
3. Regenerate API key if expired

### Timeout Errors

**Problem:** Requests timeout after 2 minutes

**Solutions:**
1. Increase `ZAI_TIMEOUT` environment variable
2. Check network connectivity to `api.z.ai`
3. Reduce request complexity (fewer messages, smaller images)

### Streaming Issues

**Problem:** Streaming responses not working

**Solutions:**
1. Ensure `stream: true` is set in tool call
2. Check if API supports streaming for the endpoint
3. Fall back to non-streaming mode if needed

## Development

### Running Standalone

For testing without MCP:

```bash
python server.py
```

### Logging

Logs are written to stdout with format:
```
2026-03-07 10:30:00 - zai-mcp-wrapper - INFO - Calling Z.AI API: chat/completions
```

Set log level via environment:
```bash
export LOG_LEVEL=DEBUG
python server.py
```

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Z.AI Documentation: https://docs.z.ai
- MCP Protocol: https://modelcontextprotocol.io
- Claude Code: https://claude.ai/code

## Changelog

### v1.1.0 (2026-03-07)
- Added streaming support to `glm-5-chat` (stream, tool_stream parameters)
- Added `create_slides` tool for presentation generation
- Added `translate_text` tool with 6 translation strategies
- Added `create_video_from_template` tool with 3 templates
- Updated config.json with new tool configurations
- Enhanced fallback strategy for undocumented endpoints

### v1.0.0 (2026-03-07)
- Initial release
- GLM-5 Chat completions
- GLM-OCR image parsing
- GLM Web Search integration
- MCP stdio transport
