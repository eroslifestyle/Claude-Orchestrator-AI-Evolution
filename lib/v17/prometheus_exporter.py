"""Prometheus Exporter V17 for Orchestrator.

Provides HTTP /metrics endpoint with standard Prometheus formats.

Features:
- Counter, Gauge, Histogram formats
- HTTP server with /metrics endpoint
- Integration with metrics_dashboard.py
- Async-compatible design
- Thread-safe metric collection

Prometheus Format Examples:
    # Counter
    # HELP requests_total Total requests processed
    # TYPE requests_total counter
    requests_total{method="GET"} 1234

    # Gauge
    # HELP latency_seconds Current latency
    # TYPE latency_seconds gauge
    latency_seconds 0.5

    # Histogram
    # HELP request_duration_seconds Request duration
    # TYPE request_duration_seconds histogram
    request_duration_seconds_bucket{le="0.1"} 10
    request_duration_seconds_bucket{le="0.5"} 25
    request_duration_seconds_bucket{le="1.0"} 40
    request_duration_seconds_bucket{le="+Inf"} 50
    request_duration_seconds_sum 25.5
    request_duration_seconds_count 50

Version: V17.0.0
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any, Callable, Dict, List, Optional, Set, Union

logger = logging.getLogger(__name__)

# Try to import httpx/aiohttp for async HTTP
try:
    import aiohttp
    from aiohttp import web
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    logger.debug("aiohttp not available. Using sync HTTP server.")


class MetricType(Enum):
    """Prometheus metric types."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    UNTYPED = "untyped"


@dataclass
class MetricValue:
    """A single metric value with labels."""
    name: str
    value: float
    labels: Dict[str, str] = field(default_factory=dict)
    timestamp: Optional[float] = None


@dataclass
class HistogramBucket:
    """Histogram bucket configuration."""
    upper_bound: float  # le value (+Inf for infinity)
    count: int = 0


@dataclass
class Histogram:
    """Histogram metric data."""
    name: str
    buckets: List[HistogramBucket]
    sum: float = 0.0
    count: int = 0
    labels: Dict[str, str] = field(default_factory=dict)


class PrometheusMetricsRegistry:
    """Thread-safe registry for Prometheus metrics.

    Manages counters, gauges, and histograms with proper formatting.
    """

    def __init__(self, namespace: str = "orchestrator_v17"):
        """Initialize the registry.

        Args:
            namespace: Prefix for all metric names
        """
        self._namespace = namespace
        self._lock = threading.RLock()

        # Metric storage
        self._counters: Dict[str, float] = defaultdict(float)
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, Histogram] = {}
        self._counter_labels: Dict[str, Dict[str, str]] = {}
        self._gauge_labels: Dict[str, Dict[str, str]] = {}

        # Metadata
        self._descriptions: Dict[str, str] = {}
        self._types: Dict[str, MetricType] = {}

    def _make_key(self, name: str, labels: Optional[Dict[str, str]] = None) -> str:
        """Create a unique key for a metric with labels."""
        if not labels:
            return f"{self._namespace}_{name}"

        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{self._namespace}_{name}{{{label_str}}}"

    def _full_name(self, name: str) -> str:
        """Get full metric name with namespace."""
        return f"{self._namespace}_{name}"

    def register_counter(
        self,
        name: str,
        description: str = "",
        labels: Optional[Dict[str, str]] = None,
    ) -> str:
        """Register a counter metric.

        Args:
            name: Metric name
            description: HELP text
            labels: Optional labels

        Returns:
            Full metric key
        """
        with self._lock:
            full_name = self._full_name(name)
            key = self._make_key(name, labels)

            self._types[full_name] = MetricType.COUNTER
            if description:
                self._descriptions[full_name] = description

            if labels:
                self._counter_labels[key] = labels

            return key

    def register_gauge(
        self,
        name: str,
        description: str = "",
        labels: Optional[Dict[str, str]] = None,
    ) -> str:
        """Register a gauge metric.

        Args:
            name: Metric name
            description: HELP text
            labels: Optional labels

        Returns:
            Full metric key
        """
        with self._lock:
            full_name = self._full_name(name)
            key = self._make_key(name, labels)

            self._types[full_name] = MetricType.GAUGE
            if description:
                self._descriptions[full_name] = description

            if labels:
                self._gauge_labels[key] = labels

            return key

    def register_histogram(
        self,
        name: str,
        buckets: Optional[List[float]] = None,
        description: str = "",
        labels: Optional[Dict[str, str]] = None,
    ) -> str:
        """Register a histogram metric.

        Args:
            name: Metric name
            buckets: Bucket boundaries (default: Prometheus defaults)
            description: HELP text
            labels: Optional labels

        Returns:
            Full metric key
        """
        if buckets is None:
            # Default Prometheus buckets
            buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]

        with self._lock:
            full_name = self._full_name(name)
            key = self._make_key(name, labels)

            self._types[full_name] = MetricType.HISTOGRAM
            if description:
                self._descriptions[full_name] = description

            histogram_buckets = [
                HistogramBucket(upper_bound=b, count=0)
                for b in sorted(buckets)
            ]
            # Add +Inf bucket
            histogram_buckets.append(HistogramBucket(upper_bound=float("inf"), count=0))

            self._histograms[key] = Histogram(
                name=full_name,
                buckets=histogram_buckets,
                labels=labels or {},
            )

            return key

    def increment_counter(self, name: str, value: int = 1, labels: Optional[Dict[str, str]] = None) -> None:
        """Increment a counter.

        Args:
            name: Metric name (without namespace)
            value: Increment value (default: 1)
            labels: Optional labels
        """
        key = self._make_key(name, labels)
        with self._lock:
            self._counters[key] += value

    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Set a gauge value.

        Args:
            name: Metric name (without namespace)
            value: Gauge value
            labels: Optional labels
        """
        key = self._make_key(name, labels)
        with self._lock:
            self._gauges[key] = value
            if labels:
                self._gauge_labels[key] = labels

    def observe_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Observe a value in a histogram.

        Args:
            name: Metric name (without namespace)
            value: Observed value
            labels: Optional labels
        """
        key = self._make_key(name, labels)
        with self._lock:
            if key not in self._histograms:
                # Auto-register with default buckets
                self.register_histogram(name, labels=labels)

            histogram = self._histograms[key]
            histogram.sum += value
            histogram.count += 1

            # Increment appropriate buckets
            for bucket in histogram.buckets:
                if value <= bucket.upper_bound:
                    bucket.count += 1

    def export_metric(self, name: str, value: float, metric_type: str = "gauge", labels: Optional[Dict[str, str]] = None) -> None:
        """Export a metric (generic interface).

        Args:
            name: Metric name
            value: Metric value
            metric_type: "counter", "gauge", or "histogram"
            labels: Optional labels
        """
        metric_type = metric_type.lower()

        if metric_type == "counter":
            self.register_counter(name, labels=labels)
            key = self._make_key(name, labels)
            with self._lock:
                self._counters[key] = value
        elif metric_type == "gauge":
            self.register_gauge(name, labels=labels)
            self.set_gauge(name, value, labels)
        elif metric_type == "histogram":
            self.register_histogram(name, labels=labels)
            self.observe_histogram(name, value, labels)
        else:
            logger.warning(f"Unknown metric type: {metric_type}")

    def _format_labels(self, labels: Dict[str, str]) -> str:
        """Format labels for Prometheus output."""
        if not labels:
            return ""

        def escape(v: str) -> str:
            return v.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

        parts = [f'{k}="{escape(v)}"' for k, v in sorted(labels.items())]
        return "{" + ", ".join(parts) + "}"

    def _format_histogram(self, histogram: Histogram) -> List[str]:
        """Format histogram for Prometheus output."""
        lines = []
        labels_str = self._format_labels(histogram.labels)

        # Bucket lines
        for bucket in histogram.buckets:
            le_value = "+Inf" if bucket.upper_bound == float("inf") else str(bucket.upper_bound)
            bucket_labels = dict(histogram.labels) if histogram.labels else {}
            bucket_labels["le"] = le_value
            bucket_labels_str = self._format_labels(bucket_labels)
            lines.append(f"{histogram.name}_bucket{bucket_labels_str} {bucket.count}")

        # Sum and count
        lines.append(f"{histogram.name}_sum{labels_str} {histogram.sum}")
        lines.append(f"{histogram.name}_count{labels_str} {histogram.count}")

        return lines

    def export(self) -> str:
        """Export all metrics in Prometheus text format.

        Returns:
            Prometheus-formatted metrics string
        """
        lines = []
        seen_families: Set[str] = set()

        with self._lock:
            # Group by metric family
            all_metrics: Dict[str, List[tuple]] = defaultdict(list)

            # Counters
            for key, value in self._counters.items():
                # Extract base name from key
                base = key.split("{")[0] if "{" in key else key
                labels = self._counter_labels.get(key, {})
                all_metrics[base].append(("counter", value, labels))

            # Gauges
            for key, value in self._gauges.items():
                base = key.split("{")[0] if "{" in key else key
                labels = self._gauge_labels.get(key, {})
                all_metrics[base].append(("gauge", value, labels))

            # Sort by metric name
            for base_name in sorted(all_metrics.keys()):
                # Remove namespace prefix for type lookup
                short_name = base_name.replace(f"{self._namespace}_", "", 1)

                # Add HELP if available
                if base_name in self._descriptions:
                    lines.append(f"# HELP {base_name} {self._descriptions[base_name]}")

                # Add TYPE
                metric_type = self._types.get(base_name, MetricType.UNTYPED)
                lines.append(f"# TYPE {base_name} {metric_type.value}")

                # Add metric values
                for mtype, value, labels in all_metrics[base_name]:
                    labels_str = self._format_labels(labels)
                    lines.append(f"{base_name}{labels_str} {value}")

            # Histograms
            for key, histogram in sorted(self._histograms.items()):
                base_name = histogram.name

                if base_name not in seen_families:
                    seen_families.add(base_name)
                    if base_name in self._descriptions:
                        lines.append(f"# HELP {base_name} {self._descriptions[base_name]}")
                    lines.append(f"# TYPE {base_name} histogram")

                lines.extend(self._format_histogram(histogram))

        return "\n".join(lines) + "\n" if lines else ""

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all metrics as a dictionary (for JSON export).

        Returns:
            Dict with counters, gauges, and histograms
        """
        with self._lock:
            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": {
                    k: {
                        "name": v.name,
                        "sum": v.sum,
                        "count": v.count,
                        "buckets": [
                            {"le": b.upper_bound, "count": b.count}
                            for b in v.buckets
                        ],
                    }
                    for k, v in self._histograms.items()
                },
            }


class PrometheusRequestHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Prometheus metrics."""

    registry: PrometheusMetricsRegistry = None

    def log_message(self, format: str, *args) -> None:
        """Suppress default logging."""
        pass

    def do_GET(self) -> None:
        """Handle GET requests."""
        if self.path == "/metrics":
            self._handle_metrics()
        elif self.path == "/health":
            self._handle_health()
        else:
            self._handle_404()

    def _handle_metrics(self) -> None:
        """Return Prometheus metrics."""
        try:
            content = self.registry.export()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
            self.send_error(500, str(e))

    def _handle_health(self) -> None:
        """Return health status."""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        response = json.dumps({"status": "healthy", "version": "17.0.0"})
        self.wfile.write(response.encode("utf-8"))

    def _handle_404(self) -> None:
        """Return 404 for unknown paths."""
        self.send_error(404, "Not Found")


class PrometheusExporter:
    """Prometheus Exporter with HTTP endpoint.

    Provides /metrics endpoint for Prometheus scraping.

    Example:
        >>> exporter = PrometheusExporter(port=9090)
        >>> exporter.start()
        >>> exporter.increment_counter("requests_total")
        >>> exporter.set_gauge("latency_seconds", 0.5)
        >>> # Prometheus scrapes http://localhost:9090/metrics
        >>> exporter.stop()
    """

    DEFAULT_PORT = 9090
    DEFAULT_HOST = "0.0.0.0"

    def __init__(
        self,
        port: int = DEFAULT_PORT,
        host: str = DEFAULT_HOST,
        namespace: str = "orchestrator_v17",
        registry: Optional[PrometheusMetricsRegistry] = None,
    ):
        """Initialize the Prometheus exporter.

        Args:
            port: HTTP server port (default: 9090)
            host: HTTP server host (default: 0.0.0.0)
            namespace: Metric namespace prefix
            registry: Optional pre-configured registry
        """
        self._port = port
        self._host = host
        self._namespace = namespace
        self._registry = registry or PrometheusMetricsRegistry(namespace)

        self._server: Optional[HTTPServer] = None
        self._server_thread: Optional[threading.Thread] = None
        self._running = False

        # Async support
        self._async_app: Optional[Any] = None
        self._async_runner: Optional[Any] = None

    @property
    def registry(self) -> PrometheusMetricsRegistry:
        """Get the metrics registry."""
        return self._registry

    @property
    def is_running(self) -> bool:
        """Check if the server is running."""
        return self._running

    def export_metric(self, name: str, value: float, metric_type: str = "gauge", labels: Optional[Dict[str, str]] = None) -> None:
        """Export a metric (generic interface).

        Args:
            name: Metric name
            value: Metric value
            metric_type: "counter", "gauge", or "histogram"
            labels: Optional labels
        """
        self._registry.export_metric(name, value, metric_type, labels)

    def increment_counter(self, name: str, value: int = 1, labels: Optional[Dict[str, str]] = None) -> None:
        """Increment a counter.

        Args:
            name: Counter name
            value: Increment amount (default: 1)
            labels: Optional labels
        """
        self._registry.increment_counter(name, value, labels)

    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Set a gauge value.

        Args:
            name: Gauge name
            value: Gauge value
            labels: Optional labels
        """
        self._registry.set_gauge(name, value, labels)

    def observe_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Observe a value in a histogram.

        Args:
            name: Histogram name
            value: Observed value
            labels: Optional labels
        """
        self._registry.observe_histogram(name, value, labels)

    def register_histogram(self, name: str, buckets: Optional[List[float]] = None, description: str = "", labels: Optional[Dict[str, str]] = None) -> str:
        """Register a histogram with custom buckets.

        Args:
            name: Histogram name
            buckets: Custom bucket boundaries
            description: HELP description
            labels: Optional labels

        Returns:
            Metric key
        """
        return self._registry.register_histogram(name, buckets, description, labels)

    def start(self, block: bool = False) -> None:
        """Start the HTTP server.

        Args:
            block: If True, block until server stops
        """
        if self._running:
            logger.warning("Prometheus exporter already running")
            return

        # Configure request handler with our registry
        PrometheusRequestHandler.registry = self._registry

        self._server = HTTPServer((self._host, self._port), PrometheusRequestHandler)
        self._running = True

        if block:
            logger.info(f"Prometheus exporter running on http://{self._host}:{self._port}/metrics")
            self._server.serve_forever()
        else:
            self._server_thread = threading.Thread(target=self._run_server, daemon=True)
            self._server_thread.start()
            logger.info(f"Prometheus exporter started on http://{self._host}:{self._port}/metrics")

    def _run_server(self) -> None:
        """Run the server in a background thread."""
        try:
            self._server.serve_forever()
        except Exception as e:
            logger.error(f"Server error: {e}")
        finally:
            self._running = False

    def stop(self) -> None:
        """Stop the HTTP server."""
        if not self._running:
            return

        self._running = False

        if self._server:
            self._server.shutdown()
            self._server = None

        if self._server_thread and self._server_thread.is_alive():
            self._server_thread.join(timeout=5.0)

        logger.info("Prometheus exporter stopped")

    def get_metrics(self) -> str:
        """Get metrics in Prometheus format without starting server.

        Returns:
            Prometheus-formatted metrics string
        """
        return self._registry.export()

    def get_url(self, path: str = "/metrics") -> str:
        """Get the metrics URL.

        Args:
            path: URL path (default: /metrics)

        Returns:
            Full URL string
        """
        return f"http://{self._host}:{self._port}{path}"

    # Async support methods
    async def start_async(self) -> None:
        """Start async HTTP server (requires aiohttp)."""
        if not AIOHTTP_AVAILABLE:
            raise RuntimeError("aiohttp required for async server. Install with: pip install aiohttp")

        if self._running:
            return

        registry = self._registry

        async def handle_metrics(request: web.Request) -> web.Response:
            return web.Response(
                text=registry.export(),
                content_type="text/plain",
                headers={"Content-Type": "text/plain; version=0.0.4; charset=utf-8"},
            )

        async def handle_health(request: web.Request) -> web.Response:
            return web.json_response({"status": "healthy", "version": "17.0.0"})

        app = web.Application()
        app.router.add_get("/metrics", handle_metrics)
        app.router.add_get("/health", handle_health)

        self._async_runner = web.AppRunner(app)
        await self._async_runner.setup()

        site = web.TCPSite(self._async_runner, self._host, self._port)
        await site.start()

        self._running = True
        logger.info(f"Async Prometheus exporter started on http://{self._host}:{self._port}/metrics")

    async def stop_async(self) -> None:
        """Stop async HTTP server."""
        if self._async_runner:
            await self._async_runner.cleanup()
            self._async_runner = None
        self._running = False


# Integration with metrics_dashboard.py
class PrometheusDashboardIntegration:
    """Integration bridge between PrometheusExporter and MetricsDashboard.

    Allows using PrometheusExporter with existing dashboard infrastructure.
    """

    def __init__(self, exporter: PrometheusExporter):
        """Initialize integration.

        Args:
            exporter: PrometheusExporter instance
        """
        self._exporter = exporter

    def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format.

        Returns:
            Prometheus-formatted metrics
        """
        return self._exporter.get_metrics()

    def get_json_metrics(self) -> Dict[str, Any]:
        """Get metrics in JSON format.

        Returns:
            JSON-compatible dict
        """
        return self._exporter.registry.get_all_metrics()

    def collect_from_collector(self, collector: Any) -> None:
        """Collect metrics from a MetricsCollector instance.

        Args:
            collector: MetricsCollector with get_all_metrics() method
        """
        if hasattr(collector, "get_all_metrics"):
            for metric in collector.get_all_metrics():
                metric_type = getattr(metric, "metric_type", None)
                if metric_type:
                    metric_type = metric_type.value if hasattr(metric_type, "value") else str(metric_type)

                self._exporter.export_metric(
                    name=metric.name,
                    value=metric.value,
                    metric_type=metric_type or "gauge",
                    labels=getattr(metric, "labels", None),
                )


# Global exporter instance
_exporter: Optional[PrometheusExporter] = None
_exporter_lock = threading.Lock()


def get_exporter(port: int = 9090, namespace: str = "orchestrator_v17") -> PrometheusExporter:
    """Get or create the global PrometheusExporter instance.

    Args:
        port: HTTP port
        namespace: Metric namespace

    Returns:
        PrometheusExporter instance
    """
    global _exporter

    with _exporter_lock:
        if _exporter is None:
            _exporter = PrometheusExporter(port=port, namespace=namespace)
        return _exporter


def start_exporter(port: int = 9090, namespace: str = "orchestrator_v17") -> PrometheusExporter:
    """Start the global Prometheus exporter.

    Args:
        port: HTTP port
        namespace: Metric namespace

    Returns:
        Running PrometheusExporter instance
    """
    exporter = get_exporter(port, namespace)
    if not exporter.is_running:
        exporter.start()
    return exporter


def stop_exporter() -> None:
    """Stop the global Prometheus exporter."""
    global _exporter

    with _exporter_lock:
        if _exporter is not None:
            _exporter.stop()
            _exporter = None


# Decorator for easy metric instrumentation
def prometheus_counter(name: str, labels: Optional[Dict[str, str]] = None):
    """Decorator to count function calls.

    Args:
        name: Counter name
        labels: Optional labels

    Example:
        >>> @prometheus_counter("function_calls", labels={"module": "myapp"})
        ... def my_function():
        ...     pass
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            get_exporter().increment_counter(name, labels=labels)
            return func(*args, **kwargs)
        return wrapper
    return decorator


def prometheus_histogram(name: str, labels: Optional[Dict[str, str]] = None):
    """Decorator to measure function execution time.

    Args:
        name: Histogram name
        labels: Optional labels

    Example:
        >>> @prometheus_histogram("function_duration_seconds")
        ... def my_function():
        ...     pass
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                duration = time.perf_counter() - start
                get_exporter().observe_histogram(name, duration, labels=labels)
        return wrapper
    return decorator


__all__ = [
    # Core classes
    "PrometheusExporter",
    "PrometheusMetricsRegistry",
    "PrometheusDashboardIntegration",
    "MetricType",
    "MetricValue",
    "Histogram",
    "HistogramBucket",

    # Functions
    "get_exporter",
    "start_exporter",
    "stop_exporter",

    # Decorators
    "prometheus_counter",
    "prometheus_histogram",
]
