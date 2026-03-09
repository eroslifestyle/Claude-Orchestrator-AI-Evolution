"""
Orchestrator V17 - Claude Tool Calling Core

Questo modulo implementa le nuove Claude Tool Calling capabilities
per l'Orchestrator V17, con supporto per:
- 10,000+ tools con ricerca O(1)
- 4-layer tool discovery
- Hybrid resilience (circuit breaker + retry + fallback)
- Warm cache L1+L2 per tools frequenti
- Fine-grained streaming
- Hierarchical budget management
- Programmatic tool execution

Version: V17.0.0
Author: Orchestrator Team
"""

from .claude_tool_registry import ClaudeToolRegistry, ToolDefinition
from .tool_discovery import ToolDiscoveryEngine, DiscoveryLayer
from .resilience import (
    HybridResilience,
    HybridResilienceHandler,
    ResilienceConfig,
    CircuitState,
    ResilienceResult,
    FallbackChain,
    ResilienceMetrics,
    resilient,
)
from .cache import WarmCacheManager, CacheLayer, CacheEntry, CacheStats
from .streaming import (
    FineGrainedStreamer,
    StreamConfig,
    StreamChunk,
    StreamState,
    StreamingMode,
    StreamedToolCall,
)
from .budget import HierarchicalBudgetManager, BudgetTier
from .executor import ProgrammaticToolExecutor, ExecutionResult
from .prometheus_exporter import (
    PrometheusExporter,
    PrometheusMetricsRegistry,
    PrometheusDashboardIntegration,
    MetricType,
    MetricValue,
    Histogram,
    HistogramBucket,
    get_exporter,
    start_exporter,
    stop_exporter,
    prometheus_counter,
    prometheus_histogram,
)
from .websocket_server import (
    WebSocketServer,
    WebSocketConfig,
    WebSocketClient,
    MessageType,
    create_websocket_server,
)
from .metrics_dashboard import (
    MetricsDashboard,
    AlertRule,
    AlertSeverity,
    AlertState,
    AlertInstance,
    AlertManager,
    MetricSample,
    PrometheusExporter as DashboardPrometheusExporter,
    WebSocketServer as DashboardWebSocketServer,
    get_dashboard,
    record_metric,
    add_alert,
    get_metrics,
)

__all__ = [
    # Registry
    "ClaudeToolRegistry",
    "ToolDefinition",

    # Discovery
    "ToolDiscoveryEngine",
    "DiscoveryLayer",

    # Resilience
    "HybridResilience",
    "HybridResilienceHandler",
    "ResilienceConfig",
    "CircuitState",
    "ResilienceResult",
    "FallbackChain",
    "ResilienceMetrics",
    "resilient",

    # Cache
    "WarmCacheManager",
    "CacheLayer",
    "CacheEntry",
    "CacheStats",

    # Streaming
    "FineGrainedStreamer",
    "StreamConfig",
    "StreamChunk",
    "StreamState",
    "StreamingMode",
    "StreamedToolCall",

    # Budget
    "HierarchicalBudgetManager",
    "BudgetTier",

    # Executor
    "ProgrammaticToolExecutor",
    "ExecutionResult",

    # Prometheus Exporter
    "PrometheusExporter",
    "PrometheusMetricsRegistry",
    "PrometheusDashboardIntegration",
    "MetricType",
    "MetricValue",
    "Histogram",
    "HistogramBucket",
    "get_exporter",
    "start_exporter",
    "stop_exporter",
    "prometheus_counter",
    "prometheus_histogram",

    # WebSocket Server
    "WebSocketServer",
    "WebSocketConfig",
    "WebSocketClient",
    "MessageType",
    "create_websocket_server",

    # Metrics Dashboard
    "MetricsDashboard",
    "AlertRule",
    "AlertSeverity",
    "AlertState",
    "AlertInstance",
    "AlertManager",
    "MetricSample",
    "DashboardPrometheusExporter",
    "DashboardWebSocketServer",
    "get_dashboard",
    "record_metric",
    "add_alert",
    "get_metrics",
]

__version__ = "17.0.0"
