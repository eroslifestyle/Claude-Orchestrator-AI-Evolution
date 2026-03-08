"""Metrics Module for Orchestrator V15.0.4.

Provides real-time metrics collection, Prometheus export, and dashboard.

Namespaces:
    - collector: Metrics collection from all orchestrator modules
    - exporter: Prometheus format export
    - dashboard: FastAPI + WebSocket real-time dashboard

Usage:
    from lib.metrics import get_collector, get_exporter, start_dashboard

    # Collect metrics
    collector = get_collector()
    collector.record_agent_task("Coder", duration=1.5, success=True)

    # Export to Prometheus
    exporter = get_exporter(collector)
    prometheus_output = exporter.export()

    # Start dashboard
    start_dashboard(port=8080)
"""

from __future__ import annotations

from lib.metrics.collector import (
    MetricsCollector,
    MetricType,
    MetricValue,
    get_collector,
    reset_collector,
)
from lib.metrics.exporter import (
    PrometheusExporter,
    get_exporter,
)
from lib.metrics.dashboard import (
    MetricsDashboard,
    start_dashboard,
    stop_dashboard,
)


class CollectorNamespace:
    """Namespace for metrics collection.

    Classes:
        MetricsCollector: Central metrics collection and aggregation
        MetricType: Enum for metric types (COUNTER, GAUGE, HISTOGRAM)
        MetricValue: Individual metric value with labels

    Functions:
        get_collector: Singleton accessor
        reset_collector: Reset singleton (for testing)
    """

    MetricsCollector = MetricsCollector
    MetricType = MetricType
    MetricValue = MetricValue
    get_collector = staticmethod(get_collector)
    reset_collector = staticmethod(reset_collector)


collector = CollectorNamespace()


class ExporterNamespace:
    """Namespace for Prometheus export.

    Classes:
        PrometheusExporter: Export metrics in Prometheus text format

    Functions:
        get_exporter: Get exporter for a collector
    """

    PrometheusExporter = PrometheusExporter
    get_exporter = staticmethod(get_exporter)


exporter = ExporterNamespace()


class DashboardNamespace:
    """Namespace for real-time dashboard.

    Classes:
        MetricsDashboard: FastAPI + WebSocket dashboard

    Functions:
        start_dashboard: Start dashboard server
        stop_dashboard: Stop dashboard server
    """

    MetricsDashboard = MetricsDashboard
    start_dashboard = staticmethod(start_dashboard)
    stop_dashboard = staticmethod(stop_dashboard)


dashboard = DashboardNamespace()


__all__ = [
    # Collector
    "MetricsCollector",
    "MetricType",
    "MetricValue",
    "get_collector",
    "reset_collector",
    "collector",
    # Exporter
    "PrometheusExporter",
    "get_exporter",
    "exporter",
    # Dashboard
    "MetricsDashboard",
    "start_dashboard",
    "stop_dashboard",
    "dashboard",
]

__version__ = "15.0.4"
