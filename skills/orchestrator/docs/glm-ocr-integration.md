# GLM-5 Integration for CCG Profile

> Z.AI MCP Server integration con GLM-5 per profilo CCG

## Panoramica GLM-5

GLM-5 e il modello di nuova generazione di Z.AI con:
- **Max Context**: 200K token
- **Max Output**: 128K token
- **Deep Thinking**: Ragionamento complesso abilitato
- **Tool Streaming**: Output streaming in tempo reale durante tool calls
- **Superior Code Performance**: Performance codice avanzate

## Parametri GLM-5

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `temperature` | 1.0 | Casualta output (piu alto = piu creativo) |
| `top_p` | 0.95 | Nucleus sampling |
| `max_context` | 200000 | Contesto massimo in token |
| `max_output` | 128000 | Output massimo in token |
| `thinking` | enabled | Deep thinking per ragionamento complesso |

## Tool MCP Disponibili (zai-mcp-server)

| Tool | Funzione | Use Case |
|------|----------|----------|
| `extract_text_from_screenshot` | OCR principale | Estrarre testo da screenshot |
| `analyze_image` | Analisi generica | Comprensione immagini |
| `analyze_video` | Analisi video | Analizzare contenuto video |
| `diagnose_error_screenshot` | Diagnostica errori | Analizzare stack trace screenshot |
| `ui_to_artifact` | UI a Codice | Generare codice da UI screenshot |
| `analyze_data_visualization` | Analizza grafici | Estrarre insight da chart |
| `ui_diff_check` | Confronta UI | Verificare implementazione vs design |
| `understand_technical_diagram` | Capisce diagrammi | Architettura, flowchart, UML |

## Come Usare

### Per OCR Semplice

```
mcp__zai-mcp-server__extract_text_from_screenshot(
  image_source: "path/to/screenshot.png",
  prompt: "Estrai tutto il testo",
  programming_language: "python"  # opzionale
)
```

### Per Analisi UI

```
mcp__zai-mcp-server__ui_to_artifact(
  image_source: "path/to/ui.png",
  output_type: "code",  # code, prompt, spec, description
  prompt: "Genera componente React"
)
```

### Per Diagnostica Errori

```
mcp__zai-mcp-server__diagnose_error_screenshot(
  image_source: "path/to/error.png",
  prompt: "Diagnostica l'errore",
  context: "during npm install"  # opzionale
)
```

## Configurazione Profilo CCG

### settings.json

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5",
    "GLM5_TEMPERATURE": "1.0",
    "GLM5_TOP_P": "0.95",
    "GLM5_MAX_CONTEXT": "200000",
    "GLM5_MAX_OUTPUT": "128000",
    "GLM5_THINKING_ENABLED": "true"
  },
  "permissions": {
    "allow": ["mcp__zai-mcp-server__*"]
  }
}
```

## Deep Thinking

GLM-5 supporta deep thinking per task complessi:

```python
# Esempio API call con deep thinking
response = client.chat.completions.create(
    model="glm-5",
    messages=[{"role": "user", "content": "Design a microservice architecture"}],
    thinking={"type": "enabled"}  # Abilita ragionamento profondo
)
```

### Quando Usare Deep Thinking

| Task | Thinking | Motivo |
|------|----------|--------|
| Architettura sistema | enabled | Ragionamento complesso |
| Refactoring cross-module | enabled | Analisi dipendenze |
| Security audit | enabled | Analisi vulnerabilita |
| Bug fix semplice | disabled | Sufficiente senza |
| Fix typo | disabled | Non necessario |

## Streaming Tool Calls

GLM-5 supporta streaming durante tool calls:

```python
response = client.chat.completions.create(
    model="glm-5",
    messages=[...],
    tools=[...],
    stream=True,        # Abilita streaming response
    tool_stream=True    # Abilita streaming tool parameters
)
```

## Routing nell'Orchestrator

Per usare GLM-5 con l'orchestrator:

1. **Analisi screenshot** -> Analyzer + `extract_text_from_screenshot`
2. **UI a Codice** -> Coder + `ui_to_artifact`
3. **Diagnostica errori** -> Tester + `diagnose_error_screenshot`
4. **Analisi grafici** -> Analyzer + `analyze_data_visualization`
5. **Diagrammi tecnici** -> Architect + `understand_technical_diagram`

## API Reference

- **Endpoint**: `https://api.z.ai/api/anthropic`
- **Model**: `glm-5`
- **SDK**: `pip install zai-sdk`
- **Docs**: https://docs.z.ai/guides/overview/migrate-to-glm-new

## Esempi Pratici

### Esempio 1: OCR Codice Sorgente

```python
# Input: screenshot di codice
response = extract_text_from_screenshot(
    image_source="code_screenshot.png",
    prompt="Estrai il codice Python",
    programming_language="python"
)
# Output: codice estratto formattato
```

### Esempio 2: UI to React

```python
# Input: screenshot di UI
response = ui_to_artifact(
    image_source="ui_design.png",
    output_type="code",
    prompt="Genera componente React con TypeScript"
)
# Output: codice React
```

### Esempio 3: Analisi Diagramma Architettura

```python
# Input: screenshot diagramma
response = understand_technical_diagram(
    image_source="architecture.png",
    prompt="Spiega l'architettura del sistema",
    diagram_type="architecture"
)
# Output: spiegazione architettura
```

## Migration Checklist

- [x] Update model identifier to `glm-5`
- [x] Sampling parameters: `temperature=1.0`, `top_p=0.95`
- [x] Deep thinking enabled for complex tasks
- [x] MCP tools permissions configured
- [x] zai-mcp-server tools integrated
- [x] Max context 200K, max output 128K

---

**Version:** 2.0.0 | **Last Updated:** 2026-03-06
**GLM-5 Migration:** Complete
