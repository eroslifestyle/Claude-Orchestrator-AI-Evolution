# Claude Tool Calling Integration - V16.0

> **IL CUORE dell'Orchestrator V16**

## Panoramica

L'Orchestrator V16 integra 3 componenti Claude API come nucleo del sistema:

| Componente | Tipo | Descrizione |
|------------|------|-------------|
| **Programmatic Tool Calling** | Core | Esecuzione tool in container sandboxed con codice Python |
| **Tool Search Tool** | Discovery | Ricerca dinamica tool con deferred loading per 10,000+ tool |
| **Fine-Grained Tool Streaming** | Streaming | Streaming parametri tool senza buffering |

## Architettura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR V16 CORE                           │
│                    Claude Tool Calling Engine                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │   USER      │───▶│  Orchestrator    │───▶│  OrchestratorClaudeCore │  │
│  │  REQUEST    │    │  Facade V16      │    │  (claude_tool_core.py)  │  │
│  └─────────────┘    └──────────────────┘    └───────────────────────┘  │
│                                                        │                │
│                                                        ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     CLAUDE TOOL REGISTRY                            │ │
│  │   • 10,000+ tools supportati                                            │ │
│  │   • Ricerca regex (Python re.search)                                   │ │
│  │   • Ricerca BM25 (natural language)                                    │ │
│  │   • Deferred loading (85%+ token savings)                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                        │                │
│                                                        ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     CONTAINER MANAGER                                │ │
│  │   • Container sandboxed per esecuzione codice                        │ │
│  │   • TTL automatico (4.5 min default)                                 │ │
│  │   • Container reuse per sessioni                                      │ │
│  │   • Cleanup automatico container scaduti                              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                        │                │
│                                                        ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     PROGRAMMATIC EXECUTOR                            │ │
│  │   • Zero round-trip per chiamate multiple                             │ │
│  │   • Token savings con filtering interno                               │ │
│  │   • Logica condizionale in Python                                      │ │
│  │   • Parallelismo nativo async                                          │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Componenti

### 1. OrchestratorClaudeCore

Punto di integrazione principale per Orchestrator V16.

```python
from lib.facade import claude_core

# Inizializza
core = claude_core.OrchestratorClaudeCore()
await core.initialize()

# Registra tool
core.register_tool(claude_core.create_programmatic_tool(
    name="query_database",
    description="Execute SQL query",
    input_schema={"type": "object", "properties": {"sql": {"type": "string"}}}
))

# Cerca tool
results = core.search_tools("database query")
print(f"Trovati: {[r.tool_name for r in results.tool_references]}")

# Esegui in modalita programmatic
results = await core.execute_programmatic([
    {"name": "query_database", "input": {"sql": "SELECT * FROM users"}}
])
```

### 2. ClaudeToolRegistry

Registry centralizzato per 10,000+ tool.

```python
from lib.facade import claude_core

registry = claude_core.ClaudeToolRegistry(max_tools=10000)

# Registra tool standard
registry.register(claude_core.create_standard_tool(
    name="get_weather",
    description="Get weather for location",
    input_schema={"type": "object", "properties": {"location": {"type": "string"}}}
))

# Registra tool deferred (caricato on-demand)
registry.register(claude_core.ClaudeToolConfig(
    name="expensive_tool",
    description="Tool caricato solo quando necessario",
    input_schema={},
    defer_loading=True,
    allowed_callers=[claude_core.ToolCaller.CODE_EXECUTION.value]
))

# Ricerca regex
results = registry.search_regex("weather.*")
print(f"Matches: {[r.tool_name for r in results.tool_references]}")

# Ricerca BM25 (natural language)
results = registry.search_bm25("get weather information")
print(f"Matches: {[r.tool_name for r in results.tool_references]}")
```

### 3. ClaudeContainerManager

Gestisce container sandboxed per esecuzione codice.

```python
from lib.facade import claude_core

manager = claude_core.ClaudeContainerManager(default_ttl=270)

# Crea container
container = await manager.create_container()
print(f"Container ID: {container.container_id}")

# Carica tool nel container
await manager.load_tool(container.container_id, "get_weather", registry)

# Esegui codice
result = await manager.execute_code(
    container.container_id,
    "result = await get_weather(location='Rome')\nprint(result)"
)

# Riutilizza container
same_container = await manager.reuse_or_create(container.container_id)

# Cleanup container scaduti
removed = await manager.cleanup_expired()
print(f"Rimossi {removed} container scaduti")
```

### 4. ProgrammaticToolExecutor

Esegue tool in modalita programmatica (zero round-trip).

```python
from lib.facade import claude_core

executor = claude_core.ProgrammaticToolExecutor(registry, container_manager)

# Esegui batch di tool calls (1 round-trip per N chiamate)
results = await executor.execute_batch([
    {"name": "get_weather", "input": {"location": "Rome"}},
    {"name": "get_weather", "input": {"location": "Paris"}},
    {"name": "get_weather", "input": {"location": "London"}},
])
print(f"3 chiamate, 1 solo round-trip!")

# Esegui con filtro (token savings)
result = await executor.execute_with_filter(
    "get_all_data",
    "lambda x: x['value'] > 100"
)

# Esegui con logica condizionale
result = await executor.execute_conditional([
    {"condition": "temperature > 30", "tool": "get_heat_advisory", "arguments": {}},
    {"condition": "temperature < 0", "tool": "get_cold_advisory", "arguments": {}},
])
```

### 5. FineGrainedStreaming

Streaming parametri tool senza buffering.

```python
from lib.facade import claude_core

# Crea tool con streaming abilitato
tool = claude_core.create_streaming_tool(
    name="generate_large_report",
    description="Generate report with large parameters",
    input_schema={"type": "object", "properties": {"data": {"type": "array"}}}
)

# Gestisci JSON incompleti
partial = '{"name": "test", "value":'
handled = claude_core.FineGrainedStreaming.handle_incomplete_json(partial)
print(f"Handled: {handled}")

# Parse chunks streaming
chunks = ['{"name":', ' "test"', ', "value":', ' 123}']
parsed = claude_core.FineGrainedStreaming.parse_streaming_chunks(chunks)
print(f"Parsed: {parsed}")
```

## Convenience Functions

### create_programmatic_tool

Crea un tool per esecuzione programmatica.

```python
tool = claude_core.create_programmatic_tool(
    name="query_api",
    description="Query external API",
    input_schema={
        "type": "object",
        "properties": {
            "endpoint": {"type": "string"},
            "params": {"type": "object"}
        }
    },
    eager_streaming=True  # Opzionale: abilita streaming
)
```

### create_standard_tool

Crea un tool standard (chiamata diretta).

```python
tool = claude_core.create_standard_tool(
    name="simple_lookup",
    description="Simple lookup operation",
    input_schema={"type": "object", "properties": {"key": {"type": "string"}}}
)
```

### create_streaming_tool

Crea un tool con fine-grained streaming.

```python
tool = claude_core.create_streaming_tool(
    name="stream_large_data",
    description="Stream large data payloads",
    input_schema={"type": "object", "properties": {"data": {"type": "array"}}}
)
```

## Configurazione

```python
# Configurazione globale
config = {
    "max_tools": 10000,           # Massimo tool nel catalogo
    "container_ttl": 270,         # TTL container (4.5 min)
    "search_variant": "bm25",     # Variante ricerca (regex/bm25)
    "streaming_enabled": True,    # Fine-grained streaming
}

core = claude_core.OrchestratorClaudeCore(config)
await core.initialize()
```

## Integrazione con Orchestrator

Il modulo si integra automaticamente con:

- **43 Agenti**: Ogni agente può usare programmatic tool calling
- **32 Skills**: Skills possono registrare tool nel registry
- **MCP Tools**: MCP tools vengono wrappati come ClaudeToolConfig
- **Facade API**: Esportato come namespace `claude_core`

## Reference

- [Programmatic Tool Calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
- [Tool Search Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [Fine-Grained Tool Streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V16.0.0 | 2026-03-09 | Initial release - 3 Claude Tool Calling components as core |
