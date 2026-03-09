#!/usr/bin/env python3
"""
V16 Demo - Claude Tool Calling Integration

Demonstrates all V16 capabilities:
- Programmatic Tool Calling
- Fine-Grained Streaming
- Tool Search Tool (BM25 + Regex)
- Batch Execution
- Container Management
- Resilience with Error Handling
- Cache Warm and Hit
- Budget Management

Run: python examples/v16_demo.py

Version: V16.0.0
Author: Orchestrator System
Date: 2026-03-09
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add lib to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "lib"))

from claude_tool_core import (
    ClaudeContainerManager,
    ClaudeToolConfig,
    ClaudeToolRegistry,
    FineGrainedStreaming,
    OrchestratorClaudeCore,
    ProgrammaticToolExecutor,
    ToolCaller,
    ToolReference,
    ToolSearchResult,
    ToolSearchVariant,
    create_programmatic_tool,
    create_standard_tool,
    create_streaming_tool,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# =============================================================================
# MOCK TOOLS FOR DEMO
# =============================================================================

@dataclass
class MockToolResult:
    """Result from a mock tool execution."""
    tool_name: str
    success: bool
    data: Dict[str, Any]
    execution_time_ms: float


class MockToolExecutor:
    """Simulates tool execution for demo purposes."""

    def __init__(self):
        self._call_count = 0
        self._fail_rate = 0.0
        self._latency_ms = 10

    async def execute(self, tool_name: str, args: Dict) -> MockToolResult:
        """Execute a mock tool with simulated latency."""
        start = time.time()
        self._call_count += 1

        # Simulate latency
        await asyncio.sleep(self._latency_ms / 1000)

        # Simulate failure rate
        import random
        if random.random() < self._fail_rate:
            return MockToolResult(
                tool_name=tool_name,
                success=False,
                data={"error": "Simulated failure"},
                execution_time_ms=(time.time() - start) * 1000,
            )

        # Generate mock response based on tool
        mock_data = self._generate_mock_data(tool_name, args)

        return MockToolResult(
            tool_name=tool_name,
            success=True,
            data=mock_data,
            execution_time_ms=(time.time() - start) * 1000,
        )

    def _generate_mock_data(self, tool_name: str, args: Dict) -> Dict:
        """Generate realistic mock data for each tool."""
        mock_responses = {
            "get_weather": {
                "temperature": 22,
                "humidity": 65,
                "conditions": "partly_cloudy",
                "location": args.get("location", "Unknown"),
            },
            "query_database": {
                "rows_affected": 5,
                "rows": [{"id": 1, "name": "test"}, {"id": 2, "name": "demo"}],
                "query_time_ms": 12.5,
            },
            "send_email": {
                "message_id": "msg_abc123",
                "status": "sent",
                "recipient": args.get("to", "user@example.com"),
            },
            "fetch_api": {
                "status_code": 200,
                "body": {"success": True, "data": args.get("endpoint", "/api/data")},
            },
            "analyze_sentiment": {
                "score": 0.85,
                "label": "positive",
                "confidence": 0.92,
            },
            "translate_text": {
                "original": args.get("text", ""),
                "translated": f"[Translated: {args.get('text', '')}]",
                "source_lang": args.get("source_lang", "en"),
                "target_lang": args.get("target_lang", "it"),
            },
            "generate_report": {
                "report_id": "rpt_xyz789",
                "pages": 10,
                "format": args.get("format", "pdf"),
            },
            "compress_file": {
                "original_size_kb": 1024,
                "compressed_size_kb": 512,
                "compression_ratio": 0.5,
            },
            "validate_schema": {
                "valid": True,
                "errors": [],
                "warnings": ["Field 'description' is recommended"],
            },
            "schedule_task": {
                "task_id": "task_001",
                "scheduled_at": "2026-03-10T10:00:00Z",
                "status": "pending",
            },
        }
        return mock_responses.get(tool_name, {"result": "ok", "args": args})

    def set_fail_rate(self, rate: float) -> None:
        """Set simulated failure rate (0.0 to 1.0)."""
        self._fail_rate = max(0.0, min(1.0, rate))

    @property
    def call_count(self) -> int:
        return self._call_count


# =============================================================================
# DEMO COMPONENTS
# =============================================================================

class DemoCacheManager:
    """Demo cache manager with warm/hit tracking."""

    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._hits = 0
        self._misses = 0

    def warm(self, key: str, value: Any) -> None:
        """Pre-populate cache (warm cache)."""
        self._cache[key] = value
        logger.info(f"  [Cache] Warmed: {key}")

    def get(self, key: str) -> Optional[Any]:
        """Get from cache, track hit/miss."""
        if key in self._cache:
            self._hits += 1
            logger.info(f"  [Cache] HIT: {key}")
            return self._cache[key]
        self._misses += 1
        logger.info(f"  [Cache] MISS: {key}")
        return None

    def set(self, key: str, value: Any) -> None:
        """Set cache value."""
        self._cache[key] = value

    @property
    def stats(self) -> Dict[str, int]:
        return {
            "hits": self._hits,
            "misses": self._misses,
            "entries": len(self._cache),
            "hit_rate": self._hits / max(1, self._hits + self._misses),
        }


class DemoBudgetManager:
    """Demo budget manager for token tracking."""

    def __init__(self, max_tokens: int = 100000):
        self._max_tokens = max_tokens
        self._used_tokens = 0
        self._requests = 0

    def consume(self, tokens: int) -> bool:
        """Consume tokens, return False if budget exceeded."""
        if self._used_tokens + tokens > self._max_tokens:
            logger.warning(f"  [Budget] Exceeded! Used: {self._used_tokens}, Requested: {tokens}")
            return False
        self._used_tokens += tokens
        self._requests += 1
        logger.info(f"  [Budget] Consumed {tokens} tokens (Total: {self._used_tokens}/{self._max_tokens})")
        return True

    @property
    def remaining(self) -> int:
        return self._max_tokens - self._used_tokens

    @property
    def stats(self) -> Dict[str, int]:
        return {
            "max_tokens": self._max_tokens,
            "used_tokens": self._used_tokens,
            "remaining_tokens": self.remaining,
            "requests": self._requests,
        }


class DemoResilienceHandler:
    """Demo resilience handler with retry and circuit breaker."""

    def __init__(self, max_retries: int = 3, circuit_threshold: int = 5):
        self._max_retries = max_retries
        self._circuit_threshold = circuit_threshold
        self._failures = 0
        self._circuit_open = False
        self._retries_done = 0

    async def execute_with_retry(
        self, func, *args, **kwargs
    ) -> tuple[bool, Any]:
        """Execute with retry logic and circuit breaker."""
        if self._circuit_open:
            logger.warning("  [Resilience] Circuit OPEN - rejecting request")
            return False, {"error": "Circuit breaker open"}

        for attempt in range(self._max_retries):
            try:
                result = await func(*args, **kwargs)
                if result.success:
                    self._failures = 0  # Reset on success
                    return True, result
                else:
                    self._failures += 1
                    self._retries_done += 1
                    logger.warning(
                        f"  [Resilience] Attempt {attempt + 1} failed: {result.data}"
                    )
                    if self._failures >= self._circuit_threshold:
                        self._circuit_open = True
                        logger.error("  [Resilience] Circuit OPENED")
                        return False, {"error": "Circuit breaker opened"}
                    await asyncio.sleep(0.1 * (attempt + 1))  # Backoff
            except Exception as e:
                self._failures += 1
                logger.error(f"  [Resilience] Exception: {e}")

        return False, {"error": "Max retries exceeded"}

    def reset_circuit(self) -> None:
        """Reset circuit breaker."""
        self._circuit_open = False
        self._failures = 0
        logger.info("  [Resilience] Circuit RESET")

    @property
    def stats(self) -> Dict[str, Any]:
        return {
            "failures": self._failures,
            "circuit_open": self._circuit_open,
            "retries_done": self._retries_done,
            "max_retries": self._max_retries,
        }


# =============================================================================
# MAIN DEMO
# =============================================================================

async def demo_initialization() -> OrchestratorClaudeCore:
    """Demo 1: Initialize all V16 components."""
    print("\n" + "=" * 60)
    print("DEMO 1: V16 Component Initialization")
    print("=" * 60)

    # Create core with custom config
    config = {
        "max_tools": 10000,
        "container_ttl": 270,
        "search_variant": "bm25",
    }

    core = OrchestratorClaudeCore(config)
    await core.initialize()

    print(f"  [OK] OrchestratorClaudeCore initialized")
    print(f"  [OK] Registry: {config['max_tools']} tools capacity")
    print(f"  [OK] Container TTL: {config['container_ttl']}s")

    return core


async def demo_tool_registration(core: OrchestratorClaudeCore) -> List[ClaudeToolConfig]:
    """Demo 2: Register 10+ example tools."""
    print("\n" + "=" * 60)
    print("DEMO 2: Register 10+ Example Tools")
    print("=" * 60)

    tools = [
        # Standard tools
        create_standard_tool(
            name="get_weather",
            description="Get current weather for a location",
            input_schema={
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name"},
                    "units": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            },
        ),
        create_standard_tool(
            name="query_database",
            description="Execute SQL query on database",
            input_schema={
                "type": "object",
                "properties": {
                    "sql": {"type": "string", "description": "SQL query"},
                    "database": {"type": "string", "description": "Database name"},
                },
                "required": ["sql"],
            },
        ),
        create_standard_tool(
            name="send_email",
            description="Send an email to recipients",
            input_schema={
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "Recipient email"},
                    "subject": {"type": "string"},
                    "body": {"type": "string"},
                },
                "required": ["to", "subject", "body"],
            },
        ),
        # Programmatic tools (deferred loading)
        create_programmatic_tool(
            name="fetch_api",
            description="Fetch data from external API endpoint",
            input_schema={
                "type": "object",
                "properties": {
                    "endpoint": {"type": "string"},
                    "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE"]},
                    "headers": {"type": "object"},
                },
                "required": ["endpoint"],
            },
        ),
        create_programmatic_tool(
            name="analyze_sentiment",
            description="Analyze sentiment of text content",
            input_schema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to analyze"},
                    "language": {"type": "string"},
                },
                "required": ["text"],
            },
        ),
        create_programmatic_tool(
            name="translate_text",
            description="Translate text between languages",
            input_schema={
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "source_lang": {"type": "string"},
                    "target_lang": {"type": "string"},
                },
                "required": ["text", "target_lang"],
            },
        ),
        # Streaming tools
        create_streaming_tool(
            name="generate_report",
            description="Generate large report document",
            input_schema={
                "type": "object",
                "properties": {
                    "template": {"type": "string"},
                    "data": {"type": "array", "items": {"type": "object"}},
                    "format": {"type": "string", "enum": ["pdf", "html", "docx"]},
                },
                "required": ["template", "data"],
            },
        ),
        create_streaming_tool(
            name="compress_file",
            description="Compress large files",
            input_schema={
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                    "algorithm": {"type": "string", "enum": ["gzip", "lz4", "zstd"]},
                    "level": {"type": "integer", "minimum": 1, "maximum": 9},
                },
                "required": ["file_path"],
            },
        ),
        # More standard tools
        create_standard_tool(
            name="validate_schema",
            description="Validate JSON data against schema",
            input_schema={
                "type": "object",
                "properties": {
                    "data": {"type": "object"},
                    "schema": {"type": "object"},
                },
                "required": ["data", "schema"],
            },
        ),
        create_standard_tool(
            name="schedule_task",
            description="Schedule a task for future execution",
            input_schema={
                "type": "object",
                "properties": {
                    "task_type": {"type": "string"},
                    "scheduled_at": {"type": "string", "format": "date-time"},
                    "payload": {"type": "object"},
                },
                "required": ["task_type", "scheduled_at"],
            },
        ),
        create_standard_tool(
            name="cache_warmup",
            description="Pre-populate cache with data",
            input_schema={
                "type": "object",
                "properties": {
                    "keys": {"type": "array", "items": {"type": "string"}},
                    "ttl_seconds": {"type": "integer"},
                },
                "required": ["keys"],
            },
        ),
        create_standard_tool(
            name="batch_process",
            description="Process multiple items in batch",
            input_schema={
                "type": "object",
                "properties": {
                    "items": {"type": "array"},
                    "operation": {"type": "string"},
                },
                "required": ["items", "operation"],
            },
        ),
    ]

    # Register all tools
    for tool in tools:
        core.register_tool(tool)
        deferred = " (deferred)" if tool.defer_loading else ""
        streaming = " (streaming)" if tool.eager_input_streaming else ""
        print(f"  [OK] Registered: {tool.name}{deferred}{streaming}")

    print(f"\n  Total tools registered: {len(tools)}")
    return tools


async def demo_discovery(core: OrchestratorClaudeCore):
    """Demo 3: Natural language tool discovery."""
    print("\n" + "=" * 60)
    print("DEMO 3: Tool Discovery with Natural Language Queries")
    print("=" * 60)

    queries = [
        ("weather information", ToolSearchVariant.BM25),
        ("send.*email", ToolSearchVariant.REGEX),
        ("database query sql", ToolSearchVariant.BM25),
        ("translate.*", ToolSearchVariant.REGEX),
        ("process data batch", ToolSearchVariant.BM25),
    ]

    for query, variant in queries:
        result = core.search_tools(query, variant)
        variant_name = "BM25" if variant == ToolSearchVariant.BM25 else "REGEX"
        print(f"\n  Query [{variant_name}]: '{query}'")
        print(f"    Time: {result.search_time_ms:.2f}ms")
        print(f"    Results: {[r.tool_name for r in result.tool_references]}")


async def demo_batch_execution(
    core: OrchestratorClaudeCore, mock_executor: MockToolExecutor
):
    """Demo 4: Batch execution of tools."""
    print("\n" + "=" * 60)
    print("DEMO 4: Batch Tool Execution (Zero Round-Trip)")
    print("=" * 60)

    # Batch of tool calls
    batch_calls = [
        {"name": "get_weather", "input": {"location": "Rome"}},
        {"name": "get_weather", "input": {"location": "Paris"}},
        {"name": "get_weather", "input": {"location": "London"}},
        {"name": "query_database", "input": {"sql": "SELECT * FROM users LIMIT 5"}},
        {"name": "analyze_sentiment", "input": {"text": "This product is amazing!"}},
    ]

    print(f"  Executing {len(batch_calls)} tool calls in single batch...")
    start = time.time()

    # Execute through programmatic executor
    results = await core.execute_programmatic(batch_calls)

    elapsed = (time.time() - start) * 1000
    print(f"  Batch completed in {elapsed:.2f}ms")
    print(f"  Results: {len(results)} items")

    # Show individual mock executions
    print("\n  Individual tool results:")
    for call in batch_calls:
        result = await mock_executor.execute(call["name"], call["input"])
        print(f"    {result.tool_name}: {result.data} ({result.execution_time_ms:.2f}ms)")


async def demo_resilience(mock_executor: MockToolExecutor):
    """Demo 5: Resilience with simulated errors."""
    print("\n" + "=" * 60)
    print("DEMO 5: Resilience with Error Handling")
    print("=" * 60)

    resilience = DemoResilienceHandler(max_retries=3, circuit_threshold=3)

    # Simulate 50% failure rate
    mock_executor.set_fail_rate(0.5)

    print("  Testing with 50% simulated failure rate...")

    for i in range(5):
        print(f"\n  Request {i + 1}:")
        success, result = await resilience.execute_with_retry(
            mock_executor.execute, "get_weather", {"location": f"City{i}"}
        )
        status = "SUCCESS" if success else "FAILED"
        print(f"    Status: {status}")
        print(f"    Result: {result}")

    print(f"\n  Resilience Stats: {resilience.stats}")

    # Reset for next demo
    mock_executor.set_fail_rate(0.0)
    resilience.reset_circuit()


async def demo_cache_warm_hit():
    """Demo 6: Cache warm and hit demonstration."""
    print("\n" + "=" * 60)
    print("DEMO 6: Cache Warm and Hit")
    print("=" * 60)

    cache = DemoCacheManager()

    # Warm cache with common queries
    print("  Warming cache...")
    cache.warm("weather:rome", {"temp": 22, "humidity": 65})
    cache.warm("weather:paris", {"temp": 18, "humidity": 70})
    cache.warm("user:123", {"id": 123, "name": "John Doe"})

    # Test cache hits
    print("\n  Testing cache hits...")
    result1 = cache.get("weather:rome")  # HIT
    result2 = cache.get("weather:london")  # MISS
    result3 = cache.get("user:123")  # HIT

    # Set missing value
    if result2 is None:
        cache.set("weather:london", {"temp": 15, "humidity": 80})
        result2 = cache.get("weather:london")  # Now HIT

    print(f"\n  Cache Stats: {cache.stats}")


async def demo_streaming():
    """Demo 7: Fine-grained streaming PARTIAL and FULL."""
    print("\n" + "=" * 60)
    print("DEMO 7: Fine-Grained Streaming (PARTIAL and FULL)")
    print("=" * 60)

    # Simulate streaming chunks
    chunks = [
        '{"name": "generate_report",',
        ' "input": {',
        '"template": "monthly_sales",',
        '"data": [',
        '{"month": "Jan", "sales": 10000},',
        '{"month": "Feb", "sales": 12000}',
        ']}}',
    ]

    print("  Simulating streaming chunks:")
    partial_json = ""
    for i, chunk in enumerate(chunks):
        partial_json += chunk
        print(f"    Chunk {i + 1}: {chunk[:50]}...")

        # Try to parse partial
        parsed = FineGrainedStreaming.parse_streaming_chunks([partial_json])
        if parsed:
            print(f"      Status: COMPLETE - {parsed}")
        else:
            handled = FineGrainedStreaming.handle_incomplete_json(partial_json)
            print(f"      Status: PARTIAL - length={len(partial_json)}")

    # Final parse
    final = FineGrainedStreaming.parse_streaming_chunks(chunks)
    print(f"\n  Final parsed JSON: {json.dumps(final, indent=2)}")


async def demo_budget_management():
    """Demo 8: Budget management."""
    print("\n" + "=" * 60)
    print("DEMO 8: Budget Management")
    print("=" * 60)

    budget = DemoBudgetManager(max_tokens=10000)

    # Simulate token consumption
    operations = [
        ("search_tools", 500),
        ("execute_batch", 2000),
        ("streaming_response", 1500),
        ("tool_registration", 300),
        ("large_batch", 3000),
        ("final_cleanup", 200),
    ]

    print("  Consuming tokens for operations:")
    for op_name, tokens in operations:
        success = budget.consume(tokens)
        status = "OK" if success else "EXCEEDED"
        print(f"    {op_name}: {tokens} tokens [{status}]")

    print(f"\n  Budget Stats: {budget.stats}")


async def demo_end_to_end(
    core: OrchestratorClaudeCore,
    mock_executor: MockToolExecutor,
    cache: DemoCacheManager,
    budget: DemoBudgetManager,
):
    """Demo 9: End-to-end workflow."""
    print("\n" + "=" * 60)
    print("DEMO 9: End-to-End Workflow")
    print("=" * 60)

    print("  Scenario: User asks for weather and sends report email")

    # Step 1: Search for weather tool
    print("\n  Step 1: Search for weather tool...")
    budget.consume(100)
    search_result = core.search_tools("weather", ToolSearchVariant.BM25)
    print(f"    Found: {[r.tool_name for r in search_result.tool_references]}")

    # Step 2: Check cache
    print("\n  Step 2: Check cache for Rome weather...")
    cache_key = "weather:rome"
    cached = cache.get(cache_key)

    if cached:
        print(f"    Cache HIT: {cached}")
        weather_data = cached
    else:
        # Step 3: Execute tool
        print("    Cache MISS - executing tool...")
        budget.consume(500)
        result = await mock_executor.execute("get_weather", {"location": "Rome"})
        weather_data = result.data
        cache.set(cache_key, weather_data)
        print(f"    Result: {weather_data}")

    # Step 4: Search for email tool
    print("\n  Step 4: Search for email tool...")
    budget.consume(100)
    email_search = core.search_tools("send email", ToolSearchVariant.BM25)
    print(f"    Found: {[r.tool_name for r in email_search.tool_references]}")

    # Step 5: Send email with weather report
    print("\n  Step 5: Send email with weather report...")
    budget.consume(300)
    email_result = await mock_executor.execute(
        "send_email",
        {
            "to": "user@example.com",
            "subject": f"Weather Report - Rome ({weather_data['temperature']}C)",
            "body": json.dumps(weather_data, indent=2),
        },
    )
    print(f"    Email sent: {email_result.data}")

    # Step 6: Summary
    print("\n  Workflow Summary:")
    print(f"    Budget remaining: {budget.remaining} tokens")
    print(f"    Cache stats: {cache.stats}")
    print(f"    Mock calls: {mock_executor.call_count}")


async def main():
    """Run all demos."""
    print("\n" + "=" * 60)
    print("V16 DEMO - Claude Tool Calling Integration")
    print("=" * 60)
    print("\nDemonstrates all V16 capabilities:")
    print("  1. Component Initialization")
    print("  2. Tool Registration (10+ tools)")
    print("  3. Natural Language Discovery")
    print("  4. Batch Execution")
    print("  5. Resilience & Error Handling")
    print("  6. Cache Warm & Hit")
    print("  7. Fine-Grained Streaming")
    print("  8. Budget Management")
    print("  9. End-to-End Workflow")

    # Initialize components
    core = await demo_initialization()
    mock_executor = MockToolExecutor()
    cache = DemoCacheManager()
    budget = DemoBudgetManager(max_tokens=50000)

    # Run demos
    await demo_tool_registration(core)
    await demo_discovery(core)
    await demo_batch_execution(core, mock_executor)
    await demo_resilience(mock_executor)
    await demo_cache_warm_hit()
    await demo_streaming()
    await demo_budget_management()

    # Reset for end-to-end
    mock_executor = MockToolExecutor()
    cache = DemoCacheManager()
    budget = DemoBudgetManager(max_tokens=50000)

    await demo_end_to_end(core, mock_executor, cache, budget)

    # Cleanup
    await core.cleanup()

    print("\n" + "=" * 60)
    print("V16 DEMO COMPLETE")
    print("=" * 60)
    print("\nAll capabilities demonstrated successfully!")
    print(f"Total mock tool calls: {mock_executor.call_count}")

    # Final summary
    print("\n  Key Takeaways:")
    print("    - Programmatic Tool Calling eliminates round-trips")
    print("    - Tool Search enables 10,000+ tool discovery")
    print("    - Fine-Grained Streaming reduces latency")
    print("    - Resilience ensures reliability")
    print("    - Cache warm improves performance")
    print("    - Budget management controls costs")


if __name__ == "__main__":
    asyncio.run(main())
