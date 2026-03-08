"""Unit tests for Metrics Module.

Tests for:
- MetricsCollector: collection, aggregation, stats
- PrometheusExporter: format, labels, histograms
- MetricsDashboard: API endpoints, WebSocket (mocked)
"""

from __future__ import annotations

import pytest
import threading
import time

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


class TestMetricsCollector:
    """Tests for MetricsCollector class."""

    def setup_method(self) -> None:
        """Reset collector before each test."""
        reset_collector()
        self.collector = MetricsCollector()

    def test_initialization(self) -> None:
        """Test collector initializes correctly."""
        assert self.collector is not None
        assert self.collector._prefix == "orchestrator_"
        assert len(self.collector._descriptions) > 0

    def test_singleton_accessor(self) -> None:
        """Test singleton pattern works correctly."""
        c1 = get_collector()
        c2 = get_collector()
        assert c1 is c2

    def test_record_agent_task_success(self) -> None:
        """Test recording successful agent task."""
        self.collector.record_agent_task(
            agent="Coder",
            duration=1.5,
            success=True,
        )

        stats = self.collector.get_agent_stats("Coder")
        assert stats["success_count"] == 1
        assert stats["failure_count"] == 0
        assert stats["success_rate"] == 1.0
        assert stats["avg_duration"] == 1.5

    def test_record_agent_task_failure(self) -> None:
        """Test recording failed agent task."""
        self.collector.record_agent_task(
            agent="Coder",
            duration=2.0,
            success=False,
        )

        stats = self.collector.get_agent_stats("Coder")
        assert stats["success_count"] == 0
        assert stats["failure_count"] == 1
        assert stats["success_rate"] == 0.0

    def test_record_multiple_agent_tasks(self) -> None:
        """Test multiple agent tasks aggregate correctly."""
        # 3 successes, 1 failure
        self.collector.record_agent_task("Coder", 1.0, True)
        self.collector.record_agent_task("Coder", 2.0, True)
        self.collector.record_agent_task("Coder", 3.0, True)
        self.collector.record_agent_task("Coder", 4.0, False)

        stats = self.collector.get_agent_stats("Coder")
        assert stats["success_count"] == 3
        assert stats["failure_count"] == 1
        assert stats["total_count"] == 4
        assert stats["success_rate"] == 0.75
        # Average of 1, 2, 3, 4 = 2.5
        assert stats["avg_duration"] == 2.5

    def test_record_cache_hit(self) -> None:
        """Test recording cache hits and misses."""
        self.collector.record_cache_hit(True)
        self.collector.record_cache_hit(True)
        self.collector.record_cache_hit(False)

        stats = self.collector.get_cache_stats()
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == pytest.approx(0.6667, rel=0.01)

    def test_record_cache_hit_by_type(self) -> None:
        """Test cache stats by type."""
        self.collector.record_cache_hit(True, cache_type="budget")
        self.collector.record_cache_hit(False, cache_type="budget")
        self.collector.record_cache_hit(True, cache_type="predictive")

        budget_stats = self.collector.get_cache_stats("budget")
        assert budget_stats["hits"] == 1
        assert budget_stats["misses"] == 1

        pred_stats = self.collector.get_cache_stats("predictive")
        assert pred_stats["hits"] == 1
        assert pred_stats["misses"] == 0

    def test_record_budget_tokens(self) -> None:
        """Test recording token budget usage."""
        self.collector.record_budget_tokens(500, tier="medium")
        self.collector.record_budget_tokens(1000, tier="complex")

        metrics = self.collector.get_all_metrics()
        budget_metrics = [
            m for m in metrics
            if "budget_tokens_total" in m.name
        ]
        assert len(budget_metrics) >= 2

    def test_record_rate_limit(self) -> None:
        """Test recording rate limit checks."""
        self.collector.record_rate_limit(True, endpoint="api")
        self.collector.record_rate_limit(True, endpoint="api")
        self.collector.record_rate_limit(False, endpoint="api")

        metrics = self.collector.get_all_metrics()
        rate_metrics = [
            m for m in metrics
            if "rate_limit_requests_total" in m.name
        ]
        # Should have 2 entries: allowed and rejected
        assert len(rate_metrics) >= 2

    def test_set_rate_limit_tokens(self) -> None:
        """Test setting rate limiter token gauge."""
        self.collector.set_rate_limit_tokens(50.0, bucket="default")

        metric = self.collector.get_metric(
            "orchestrator_rate_limit_current_tokens",
            {"bucket": "default"}
        )
        assert metric is not None
        assert metric.value == 50.0

    def test_record_ab_variant(self) -> None:
        """Test recording A/B variant requests."""
        self.collector.set_ab_experiments_active(2)
        self.collector.record_ab_variant_request("test_exp", "control")
        self.collector.record_ab_variant_request("test_exp", "treatment")
        self.collector.record_ab_variant_request("test_exp", "control")

        metrics = self.collector.get_all_metrics()

        # Check active experiments gauge
        active_metric = next(
            (m for m in metrics if "ab_experiments_active" in m.name),
            None
        )
        assert active_metric is not None
        assert active_metric.value == 2

    def test_record_lock_acquisition(self) -> None:
        """Test recording lock acquisitions."""
        self.collector.record_lock_acquisition(
            lock_name="file_lock",
            wait_seconds=0.05,
            success=True,
        )
        self.collector.record_lock_acquisition(
            lock_name="file_lock",
            wait_seconds=0.02,
            success=True,
        )

        metrics = self.collector.get_all_metrics()

        # Check lock acquisitions counter
        lock_metrics = [
            m for m in metrics
            if "lock_acquisitions_total" in m.name
        ]
        assert len(lock_metrics) >= 1

    def test_get_all_metrics(self) -> None:
        """Test retrieving all metrics."""
        # Record some data
        self.collector.record_agent_task("Coder", 1.0, True)
        self.collector.record_cache_hit(True)

        metrics = self.collector.get_all_metrics()
        assert len(metrics) > 0

        # Check metric structure
        for m in metrics:
            assert isinstance(m.name, str)
            assert isinstance(m.value, (int, float))
            assert isinstance(m.labels, dict)
            assert isinstance(m.metric_type, MetricType)

    def test_get_metric_by_name(self) -> None:
        """Test retrieving specific metric."""
        self.collector.record_agent_task("Coder", 1.0, True)

        metric = self.collector.get_metric(
            "orchestrator_agent_tasks_total",
            {"agent": "Coder", "status": "success"}
        )
        assert metric is not None
        assert metric.value == 1

    def test_get_nonexistent_metric(self) -> None:
        """Test retrieving non-existent metric returns None."""
        metric = self.collector.get_metric("nonexistent_metric")
        assert metric is None

    def test_clear_metrics(self) -> None:
        """Test clearing all metrics."""
        self.collector.record_agent_task("Coder", 1.0, True)
        self.collector.record_cache_hit(True)

        assert len(self.collector.get_all_metrics()) > 0

        self.collector.clear()
        # After clear, counters and gauges are empty
        # but standard metrics are re-registered
        metrics = self.collector.get_all_metrics()
        # Should only have histograms (which have no samples)
        counter_metrics = [
            m for m in metrics
            if m.metric_type == MetricType.COUNTER
        ]
        assert len(counter_metrics) == 0

    def test_thread_safety(self) -> None:
        """Test collector is thread-safe."""
        errors = []

        def record_tasks(agent: str, count: int) -> None:
            try:
                for i in range(count):
                    self.collector.record_agent_task(agent, 0.1, True)
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=record_tasks, args=(f"Agent{i}", 100))
            for i in range(5)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0

        # Verify all 500 tasks were recorded
        total = 0
        for i in range(5):
            stats = self.collector.get_agent_stats(f"Agent{i}")
            total += stats["success_count"]
        assert total == 500


class TestPrometheusExporter:
    """Tests for PrometheusExporter class."""

    def setup_method(self) -> None:
        """Reset collector before each test."""
        reset_collector()
        self.collector = MetricsCollector()
        self.exporter = PrometheusExporter(self.collector)

    def test_export_empty(self) -> None:
        """Test export with no metrics."""
        output = self.exporter.export()
        # Should return empty string when no metrics recorded
        assert output == ""

    def test_export_with_counter(self) -> None:
        """Test export of counter metric."""
        self.collector.record_agent_task("Coder", 1.0, True)

        output = self.exporter.export()
        assert "orchestrator_agent_tasks_total" in output
        assert "# TYPE" in output
        assert "# HELP" in output
        assert 'agent="Coder"' in output
        assert 'status="success"' in output

    def test_export_with_gauge(self) -> None:
        """Test export of gauge metric."""
        self.collector.set_rate_limit_tokens(50.0, bucket="default")

        output = self.exporter.export()
        assert "orchestrator_rate_limit_current_tokens" in output
        assert 'bucket="default"' in output

    def test_export_with_labels(self) -> None:
        """Test labels are formatted correctly."""
        self.collector.record_agent_task(
            agent="Analyzer",
            duration=1.0,
            success=True,
            task_type="code_review",
        )

        output = self.exporter.export()
        assert 'agent="Analyzer"' in output
        assert 'task_type="code_review"' in output

    def test_content_type(self) -> None:
        """Test content type is correct."""
        ct = self.exporter.get_content_type()
        assert "text/plain" in ct
        assert "version=0.0.4" in ct

    def test_histogram_export(self) -> None:
        """Test histogram metric export."""
        # Record multiple durations for histogram
        self.collector.record_agent_task("Coder", 0.1, True)
        self.collector.record_agent_task("Coder", 0.5, True)
        self.collector.record_agent_task("Coder", 1.0, True)

        output = self.exporter.export()
        # Should have bucket, sum, count
        assert "orchestrator_agent_duration_seconds_bucket" in output
        assert "orchestrator_agent_duration_seconds_sum" in output
        assert "orchestrator_agent_duration_seconds_count" in output
        assert 'le=' in output  # Bucket label

    def test_label_escaping(self) -> None:
        """Test special characters in labels are escaped."""
        # This tests internal escaping method
        escaped = self.exporter._escape_label_value('test"value')
        assert escaped == 'test\\"value'

        escaped = self.exporter._escape_label_value('test\\value')
        assert escaped == 'test\\\\value'

        escaped = self.exporter._escape_label_value('test\nvalue')
        assert escaped == 'test\\nvalue'

    def test_exporter_with_custom_collector(self) -> None:
        """Test exporter can use custom collector."""
        custom_collector = MetricsCollector(prefix="custom_")
        custom_collector.record_agent_task("TestAgent", 1.0, True)

        exporter = PrometheusExporter(custom_collector)
        output = exporter.export()

        assert "custom_agent_tasks_total" in output


class TestMetricValue:
    """Tests for MetricValue dataclass."""

    def test_to_dict(self) -> None:
        """Test MetricValue serialization."""
        mv = MetricValue(
            name="test_metric",
            value=42.0,
            labels={"agent": "Coder"},
            metric_type=MetricType.COUNTER,
            description="Test metric",
        )

        d = mv.to_dict()
        assert d["name"] == "test_metric"
        assert d["value"] == 42.0
        assert d["labels"] == {"agent": "Coder"}
        assert d["metric_type"] == "counter"
        assert d["description"] == "Test metric"

    def test_default_values(self) -> None:
        """Test MetricValue default values."""
        mv = MetricValue(name="test", value=1.0)

        assert mv.labels == {}
        assert mv.metric_type == MetricType.GAUGE
        assert mv.description == ""
        assert mv.timestamp > 0


class TestMetricType:
    """Tests for MetricType enum."""

    def test_metric_types(self) -> None:
        """Test all metric types exist."""
        assert MetricType.COUNTER.value == "counter"
        assert MetricType.GAUGE.value == "gauge"
        assert MetricType.HISTOGRAM.value == "histogram"


# Integration tests
class TestMetricsIntegration:
    """Integration tests for the metrics module."""

    def setup_method(self) -> None:
        """Reset state before each test."""
        reset_collector()

    def test_full_workflow(self) -> None:
        """Test complete metrics workflow."""
        collector = get_collector()

        # Simulate some work
        collector.record_agent_task("Coder", 1.5, True)
        collector.record_agent_task("Coder", 2.0, False)
        collector.record_agent_task("Analyzer", 0.5, True)
        collector.record_cache_hit(True)
        collector.record_cache_hit(False)
        collector.record_budget_tokens(500, tier="medium")
        collector.record_rate_limit(True, endpoint="api")

        # Export to Prometheus
        exporter = get_exporter(collector)
        output = exporter.export()

        # Verify output contains all metrics
        assert "agent_tasks_total" in output
        assert "cache_hits_total" in output
        assert "cache_misses_total" in output
        assert "budget_tokens_total" in output
        assert "rate_limit_requests_total" in output

        # Get stats
        coder_stats = collector.get_agent_stats("Coder")
        assert coder_stats["total_count"] == 2
        assert coder_stats["success_rate"] == 0.5

        cache_stats = collector.get_cache_stats()
        assert cache_stats["hit_rate"] == 0.5
