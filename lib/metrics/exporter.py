"""Prometheus Exporter for Orchestrator V15.0.4.

Exports metrics in Prometheus text format for scraping.

Features:
- Standard Prometheus text exposition format
- HELP and TYPE annotations
- Label support
- Histogram bucket export
- Efficient string building
"""

from __future__ import annotations

from typing import Optional, TextIO
import time
import logging

from lib.metrics.collector import (
    MetricsCollector,
    MetricType,
    MetricValue,
    get_collector,
)

logger = logging.getLogger(__name__)


class PrometheusExporter:
    """Export metrics in Prometheus text format.

    Follows Prometheus exposition format specification:
    https://prometheus.io/docs/instrumenting/exposition_formats/

    Example:
        >>> exporter = PrometheusExporter(collector)
        >>> output = exporter.export()
        >>> print(output)
        # HELP orchestrator_agent_tasks_total Total number of agent tasks
        # TYPE orchestrator_agent_tasks_total counter
        orchestrator_agent_tasks_total{agent="Coder",status="success"} 42.0
    """

    # Content type for HTTP responses
    CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"

    def __init__(
        self,
        collector: Optional[MetricsCollector] = None,
        include_timestamps: bool = False,
    ):
        """Initialize the exporter.

        Args:
            collector: MetricsCollector to export (default: singleton)
            include_timestamps: Include Unix timestamps in output
        """
        self._collector = collector or get_collector()
        self._include_timestamps = include_timestamps

    def export(self) -> str:
        """Export all metrics in Prometheus text format.

        Returns:
            String containing all metrics in Prometheus format
        """
        metrics = self._collector.get_all_metrics()
        lines: list[str] = []

        # Group metrics by base name for TYPE/HELP headers
        seen_names: set[str] = set()

        for metric in sorted(metrics, key=lambda m: m.name):
            base_name = self._get_base_name(metric.name)

            # Add TYPE and HELP headers for new metric families
            if base_name not in seen_names:
                seen_names.add(base_name)

                # Add HELP if description available
                if metric.description:
                    lines.append(f"# HELP {base_name} {metric.description}")

                # Add TYPE
                metric_type = self._get_prometheus_type(metric)
                lines.append(f"# TYPE {base_name} {metric_type}")

            # Format the metric line
            line = self._format_metric(metric)
            if line:
                lines.append(line)

        return "\n".join(lines) + "\n" if lines else ""

    def _get_base_name(self, name: str) -> str:
        """Get the base metric name (without _bucket, _sum, _count suffixes).

        Handles edge cases where suffix-like strings are part of the name,
        e.g., "bucket_count" should not become "bucket".
        """
        # Order matters: check longer suffixes first
        for suffix in ("_bucket", "_sum", "_count"):
            if name.endswith(suffix):
                base = name[:-len(suffix)]
                # Ensure the suffix is actually a suffix, not part of the name
                # e.g., "bucket_count" should not become "bucket"
                if suffix == "_count" and base.endswith("_bucket"):
                    continue  # Skip, this is part of the name
                return base
        return name

    def _get_prometheus_type(self, metric: MetricValue) -> str:
        """Get Prometheus metric type string."""
        # Histogram components are all counters
        if metric.name.endswith(("_bucket", "_sum", "_count")):
            return "counter"
        return metric.metric_type.value

    def _format_metric(self, metric: MetricValue) -> str:
        """Format a single metric line.

        Args:
            metric: MetricValue to format

        Returns:
            Formatted metric line or empty string
        """
        labels_str = self._format_labels(metric.labels)
        timestamp_str = ""

        if self._include_timestamps:
            # Convert to milliseconds for Prometheus
            timestamp_str = f" {int(metric.timestamp * 1000)}"

        return f"{metric.name}{labels_str} {metric.value}{timestamp_str}"

    def _format_labels(self, labels: dict[str, str]) -> str:
        """Format labels in Prometheus format.

        Args:
            labels: Dict of label name -> value

        Returns:
            Labels string like {agent="Coder",status="success"} or ""
        """
        if not labels:
            return ""

        parts = []
        for name, value in sorted(labels.items()):
            # Escape special characters in label values
            escaped = self._escape_label_value(value)
            parts.append(f'{name}="{escaped}"')

        return "{" + ", ".join(parts) + "}"

    def _escape_label_value(self, value: str) -> str:
        """Escape special characters in label values.

        Prometheus requires escaping: backslash, double quote, newline
        """
        value = value.replace("\\", "\\\\")
        value = value.replace('"', '\\"')
        value = value.replace("\n", "\\n")
        return value

    def export_to_file(self, file: TextIO) -> int:
        """Export metrics to a file-like object.

        Args:
            file: File-like object to write to

        Returns:
            Number of bytes written
        """
        content = self.export()
        file.write(content)
        return len(content.encode("utf-8"))

    def get_content_type(self) -> str:
        """Get the Content-Type header value for HTTP responses."""
        return self.CONTENT_TYPE


# Convenience function
def get_exporter(collector: Optional[MetricsCollector] = None) -> PrometheusExporter:
    """Get a PrometheusExporter instance.

    Args:
        collector: Optional MetricsCollector to use

    Returns:
        PrometheusExporter instance
    """
    return PrometheusExporter(collector)
