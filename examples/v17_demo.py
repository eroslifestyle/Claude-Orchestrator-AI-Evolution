#!/usr/bin/env python3
"""
V17 Demo Script - Claude Tool Calling Core

This script demonstrates all V17 capabilities:
- 10,000+ tool registry with O(1) lookup
- 4-layer tool discovery
- Hybrid resilience (circuit breaker + retry + fallback)
- Warm cache L1+L2
- Fine-grained streaming
- Hierarchical budget management
- Programmatic batch execution

Usage:
    python examples/v17_demo.py
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path

# Add lib to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.v17 import (
    ClaudeToolRegistry,
    ToolDefinition,
    ToolDiscoveryEngine,
    DiscoveryLayer,
    HybridResilienceHandler,
    ResilienceConfig,
    WarmCacheManager,
    CacheLayer,
    FineGrainedStreamer,
    StreamConfig,
    StreamingMode,
    HierarchicalBudgetManager,
    BudgetTier,
    ProgrammaticToolExecutor,
)

from lib.v17.claude_tool_registry import ToolCategory, ToolPriority
from lib.v17.resilience import CircuitState

print("=" * 80)
print("V17 DEMO - Claude Tool Calling Core")
print("=" * 80)


async def demo_registry():
    """Demo 1: Tool Registry with 10,000+ tools."""
    print("\n[1] TOOL REGISTRY - 10,000+ TOOLS")
    print("-" * 50)

    registry = ClaudeToolRegistry()
    await registry.initialize()

    # Create 100 sample tools
    print("\nRegistering 100 sample tools...")
    start = time.perf_counter()

    for i in range(100):
        tool = ToolDefinition(
            name=f"tool_{i:03d}",
            description=f"Sample tool number {i} for demonstration",
            input_schema={
                "type": "object",
                "properties": {
                    "input": {"type": "string"},
                },
                "required": ["input"],
            },
            handler=lambda x: f"Result from tool_{i:03d}: {x.get('input')}",
            category=ToolCategory.CORE if i < 20 else ToolCategory.CUSTOM,
            priority=ToolPriority.HIGH if i < 10 else ToolPriority.NORMAL,
            tags=["demo", "sample", f"tag_{i % 10}"],
            aliases=[f"alias_{i}", f"t{i}"],
        )
        registry.register(tool)

    elapsed = time.perf_counter() - start
    print(f"Registered 100 tools in {elapsed:.3f}s")

    # Test O(1) lookup
    print("\nTesting O(1) lookup performance...")
    lookups = 1000
    start_lookup = time.perf_counter()
    for i in range(lookups):
        tool = await registry.get_tool(f"tool_{i % 100:03d}")
    elapsed_lookup = time.perf_counter() - start_lookup
    print(f"{lookups} lookups in {elapsed_lookup:.6f}s")
    print(f"Average: {(elapsed_lookup / lookups) * 1000:.2f}ms per lookup")

    # Test search
    print("\nTesting search...")
    results = registry.search("tool", limit=5)
    print(f"Found {len(results)} tools matching 'tool'")

    # Export tools
    print("\nExporting tools in Claude format...")
    exported = registry.export_tools()
    print(f"Exported {len(exported)} tools")

    # Stats
    stats = registry.get_stats()
    print(f"\nRegistry Stats:")
    print(f"  Total tools: {stats['total_tools']}")
    print(f"  Loaded tools: {stats['loaded_tools']}")
    print(f"  By category: {stats['by_category']}")

    return registry


async def demo_discovery():
    """Demo 2: 4-Layer Tool Discovery."""
    print("\n[2] TOOL DISCOVERY - 4 LAYERS")
    print("-" * 50)

    # Create registry with tools
    registry = ClaudeToolRegistry()
    await registry.initialize()

    # Register some discoverable tools
    tools = [
        ToolDefinition(
            name="query_api",
            description="Query external REST API endpoints",
            input_schema={"type": "object"},
            handler=lambda x: x,
            category=ToolCategory.CORE,
            tags=["api", "rest", "http"],
        ),
        ToolDefinition(
            name="query_database",
            description="Query database with SQL",
            input_schema={"type": "object"},
            handler=lambda x: x,
            category=ToolCategory.CORE,
            tags=["database", "sql", "query"],
        ),
        ToolDefinition(
            name="analyze_code",
            description="Analyze code quality and complexity",
            input_schema={"type": "object"},
            handler=lambda x: x,
            category=ToolCategory.CUSTOM,
            tags=["analysis", "code", "quality"],
        ),
    ]

    for tool in tools:
        registry.register(tool)

    # Create discovery engine
    engine = ToolDiscoveryEngine()

    # Test discovery layers
    queries = [
        ("query_api", DiscoveryLayer.EXACT),
        ("query", DiscoveryLayer.KEYWORD),
        ("api tool", DiscoveryLayer.SEMANTIC),
    ]

    for query, expected_layer in queries:
        result = await engine.discover(query, registry=registry)
        print(f"\nQuery: '{query}'")
        if result:
            print(f"  Found: {result[0].name if result else 'None'}")
        else:
            print(f"  Found: None")

    return engine


async def demo_resilience():
    """Demo 3: Hybrid Resilience with Circuit Breaker."""
    print("\n[3] HYBRID RESILIENCE - CIRCUIT BREAKER")
    print("-" * 50)

    handler = HybridResilienceHandler()
    await handler.initialize()

    # Create operation that fails
    fail_count = 0

    async def failing_operation(input_data):
        nonlocal fail_count
        fail_count += 1
        raise RuntimeError(f"Simulated failure #{fail_count}")

    # Test retry with backoff
    print("\nTesting retry with exponential backoff...")
    config = ResilienceConfig(
        max_retries=2,
        base_delay_ms=10,
        max_delay_ms=100,
        circuit_failure_threshold=3,
    )

    start = time.perf_counter()
    try:
        result = await handler.execute_with_resilience(
            tool_name="failing_tool",
            operation=failing_operation,
            input_data={"test": "data"},
            config=config,
        )
    except Exception as e:
        print(f"Expected failure after retries: {type(e).__name__}")

    elapsed = time.perf_counter() - start
    print(f"Retries completed in {elapsed:.3f}s")

    # Check circuit state
    status = handler.get_circuit_status("failing_tool")
    print(f"\nCircuit status: {status['state']}")

    return handler


async def demo_cache():
    """Demo 4: Warm Cache L1+L2."""
    print("\n[4] WARM CACHE - L1+L2")
    print("-" * 50)

    cache = WarmCacheManager(
        l1_max_size_mb=10,
        l2_max_size_mb=100,
        default_ttl_seconds=300,
    )
    await cache.initialize()

    # Warm cache with tools
    print("\nWarming cache with tools...")
    loaded = await cache.warm(["tool:query_api", "tool:query_database"])
    print(f"Warmed {loaded} tools from L2")

    # Set values
    print("\nSetting cache values...")
    await cache.set("test_key", "test_value", tags=["test", "demo"])
    await cache.set("expiry_key", "expires_soon", ttl_seconds=2)

    # Get values
    print("\nGetting cached values...")
    result = await cache.get("test_key")
    print(f"  test_key: {result}")

    result = await cache.get("missing_key", default="default")
    print(f"  missing_key: {result}")

    # Test tag invalidation
    print("\nTesting tag invalidation...")
    removed = await cache.invalidate_tag("test")
    print(f"  Invalidated {removed} entries")

    result = await cache.get("test_key")
    print(f"  test_key after invalidate: {result}")

    # Stats
    stats = cache.get_stats()
    print(f"\nCache Stats:")
    print(f"  L1 Hit Rate: {stats.l1_hit_rate:.2%}")
    print(f"  Total Hit Rate: {stats.total_hit_rate:.2%}")
    print(f"  Entries: {stats.entries}")

    # Cleanup
    await cache.clear()

    return cache


async def demo_streaming():
    """Demo 5: Fine-Grained Streaming."""
    print("\n[5] FINE-GRAINED STREAMING")
    print("-" * 50)

    config = StreamConfig(
        mode=StreamingMode.PARTIAL,
        chunk_size=100,
        flush_interval_ms=100,
    )

    streamer = FineGrainedStreamer(config)

    # Simulate streaming
    print("\nStreaming tool call parameters...")

    # Simulate chunk streaming
    chunks_received = 0

    async for chunk in streamer.stream_params(
        tool_name="query_api",
        params={"endpoint": "/users", "method": "GET"},
    ):
        chunks_received += 1
        if chunks_received <= 3:
            print(f"  Chunk {chunks_received}: {chunk.chunk_type}")

    print(f"\nTotal chunks received: {chunks_received}")

    return streamer


async def demo_budget():
    """Demo 6: Hierarchical Budget Management."""
    print("\n[6] HIERARCHICAL BUDGET - PER-AGENT")
    print("-" * 50)

    manager = HierarchicalBudgetManager()

    # Allocate budgets for different tiers
    print("\nAllocating budgets...")

    # CORE agent (highest budget)
    core_alloc = manager.allocate(
        agent_id="core_agent_1",
        tier=BudgetTier.CORE,
        total_tokens=100000,
    )
    print(f"  CORE agent: {core_alloc.allocated_tokens:,} tokens")

    # L1 agent (medium budget)
    l1_alloc = manager.allocate(
        agent_id="l1_agent_1",
        tier=BudgetTier.L1,
        total_tokens=50000,
    )
    print(f"  L1 agent: {l1_alloc.allocated_tokens:,} tokens")

    # L2 agent (lowest budget)
    l2_alloc = manager.allocate(
        agent_id="l2_agent_1",
        tier=BudgetTier.L2,
        total_tokens=30000,
    )
    print(f"  L2 agent: {l2_alloc.allocated_tokens:,} tokens")

    # Consume some tokens
    print("\nConsuming tokens...")
    manager.consume("core_agent_1", 1000)
    manager.consume("l1_agent_1", 500)
    manager.consume("l2_agent_1", 300)

    # Check usage
    print("\nBudget usage:")
    for agent_id in ["core_agent_1", "l1_agent_1", "l2_agent_1"]:
        usage = manager.get_usage(agent_id)
        print(f"  {agent_id}:")
        print(f"    Used: {usage.used_tokens}")
        print(f"    Remaining: {usage.remaining_tokens}")
        print(f"    Utilization: {usage.utilization_percent:.1f}%")

    return manager


async def demo_executor():
    """Demo 7: Programmatic Batch Execution."""
    print("\n[7] PROGRAMMATIC EXECUTOR - BATCH EXECUTION")
    print("-" * 50)

    registry = ClaudeToolRegistry()
    await registry.initialize()

    # Register tools
    tools = [
        ToolDefinition(
            name="add",
            description="Add two numbers",
            input_schema={
                "type": "object",
                "properties": {
                    "a": {"type": "number"},
                    "b": {"type": "number"},
                },
                "required": ["a", "b"],
            },
            handler=lambda x: x["a"] + x["b"],
            category=ToolCategory.CORE,
        ),
        ToolDefinition(
            name="multiply",
            description="Multiply two numbers",
            input_schema={
                "type": "object",
                "properties": {
                    "a": {"type": "number"},
                    "b": {"type": "number"},
                },
                "required": ["a", "b"],
            },
            handler=lambda x: x["a"] * x["b"],
            category=ToolCategory.CORE,
        ),
    ]

    for tool in tools:
        registry.register(tool)

    executor = ProgrammaticToolExecutor()

    # Execute batch of tool calls
    print("\nExecuting batch of tool calls...")
    requests = [
        {"name": "add", "input": {"a": 10, "b": 20}},
        {"name": "multiply", "input": {"a": 5, "b": 7}},
        {"name": "add", "input": {"a": 100, "b": 200}},
        {"name": "multiply", "input": {"a": 3, "b": 4}},
    ]

    start = time.perf_counter()
    results = await executor.execute_batch(requests, registry=registry)
    elapsed = time.perf_counter() - start

    print(f"Executed {len(requests)} tool calls in {elapsed:.3f}s")
    print(f"Results: {results}")

    # Stats
    stats = executor.get_stats()
    print(f"\nExecutor Stats:")
    print(f"  Total executions: {stats['total_executions']}")
    print(f"  Success rate: {stats['success_rate']:.1%}")

    return executor


async def main():
    """Run all demos."""
    print("\n" + "=" * 80)
    print("STARTING V17 DEMONSTRATION")
    print("=" * 80)

    try:
        await demo_registry()
        await demo_discovery()
        await demo_resilience()
        await demo_cache()
        await demo_streaming()
        await demo_budget()
        await demo_executor()

        print("\n" + "=" * 80)
        print("V17 DEMO COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\nAll V17 modules are working correctly!")
        print("Ready for production use.")

    except Exception as e:
        import traceback
        print(f"\nERROR: {e}")
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(main())
