"""Tests for Prometheus Exporter V17."""

from __future__ import annotations

import threading
import time
import unittest
from unittest.mock import MagicMock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from lib.v17.prometheus_exporter import (
    PrometheusExporter,
    PrometheusMetricsRegistry,
    PrometheusDashboardIntegration,
    MetricType,
    Histogram,
    HistogramBucket,
    get_exporter,
    start_exporter,
    stop_exporter,
    prometheus_counter,
    prometheus_histogram,
)


class TestPrometheusMetricsRegistry(unittest.TestCase):
    """Test PrometheusMetricsRegistry."""

    def setUp(self):
        """Set up test fixtures."""
        self.registry = PrometheusMetricsRegistry(namespace="test")

    def test_register_counter(self):
        """Test counter registration."""
        key = self.registry.register_counter("requests_total", description="Total requests")
        self.assertIn("test_requests_total", key)

    def test_register_gauge(self):
        """Test gauge registration."""
        key = self.registry.register_gauge("latency_seconds", description="Current latency")
        self.assertIn("test_latency_seconds", key)

    def test_register_histogram(self):
        """Test histogram registration."""
        key = self.registry.register_histogram("request_duration", description="Request duration")
        self.assertIn("test_request_duration", key)

    def test_increment_counter(self):
        """Test counter increment."""
        self.registry.register_counter("requests_total")
        self.registry.increment_counter("requests_total", 5)

        metrics = self.registry.get_all_metrics()
        self.assertIn("requests_total", metrics["counters"])
        # The key includes namespace
        found = any("requests_total" in k for k in metrics["counters"].keys())
        self.assertTrue(found)

    def test_set_gauge(self):
        """Test gauge set."""
        self.registry.register_gauge("latency_seconds")
        self.registry.set_gauge("latency_seconds", 0.5)

        metrics = self.registry.get_all_metrics()
        found = any("latency_seconds" in k for k in metrics["gauges"].keys())
        self.assertTrue(found)

    def test_observe_histogram(self):
        """Test histogram observation."""
        self.registry.register_histogram("request_duration")
        self.registry.observe_histogram("request_duration", 0.1)
        self.registry.observe_histogram("request_duration", 0.3)
        self.registry.observe_histogram("request_duration", 1.5)

        metrics = self.registry.get_all_metrics()
        found = any("request_duration" in k for k in metrics["histograms"].keys())
        self.assertTrue(found)

        # Check histogram values
        for key, hist in metrics["histograms"].items():
            if "request_duration" in key:
                self.assertEqual(hist["count"], 3)
                self.assertAlmostEqual(hist["sum"], 1.9, places=1)
                break

    def test_export_format(self):
        """Test Prometheus export format."""
        self.registry.register_counter("requests_total", description="Total requests")
        self.registry.increment_counter("requests_total", 10)

        output = self.registry.export()

        self.assertIn("# HELP test_requests_total Total requests", output)
        self.assertIn("# TYPE test_requests_total counter", output)
        self.assertIn("test_requests_total", output)

    def test_export_gauge_format(self):
        """Test gauge export format."""
        self.registry.register_gauge("latency_seconds", description="Current latency")
        self.registry.set_gauge("latency_seconds", 0.5)

        output = self.registry.export()

        self.assertIn("# HELP test_latency_seconds Current latency", output)
        self.assertIn("# TYPE test_latency_seconds gauge", output)

    def test_export_histogram_format(self):
        """Test histogram export format."""
        self.registry.register_histogram(
            "request_duration",
            buckets=[0.1, 0.5, 1.0],
            description="Request duration"
        )
        self.registry.observe_histogram("request_duration", 0.2)

        output = self.registry.export()

        self.assertIn("# TYPE test_request_duration histogram", output)
        self.assertIn("test_request_duration_bucket", output)
        self.assertIn("test_request_duration_sum", output)
        self.assertIn("test_request_duration_count", output)
        self.assertIn('le="0.1"', output)
        self.assertIn('le="+Inf"', output)

    def test_labels(self):
        """Test metric labels."""
        self.registry.register_counter("requests_total", labels={"method": "GET"})
        self.registry.increment_counter("requests_total", labels={"method": "GET"})

        output = self.registry.export()

        self.assertIn('method="GET"', output)

    def test_export_metric_generic(self):
        """Test generic export_metric interface."""
        self.registry.export_metric("generic_counter", 100, "counter")
        self.registry.export_metric("generic_gauge", 50.5, "gauge")
        self.registry.export_metric("generic_histogram", 0.5, "histogram")

        metrics = self.registry.get_all_metrics()
        self.assertTrue(any("generic_counter" in k for k in metrics["counters"].keys()))
        self.assertTrue(any("generic_gauge" in k for k in metrics["gauges"].keys()))
        self.assertTrue(any("generic_histogram" in k for k in metrics["histograms"].keys()))


class TestPrometheusExporter(unittest.TestCase):
    """Test PrometheusExporter."""

    def setUp(self):
        """Set up test fixtures."""
        self.exporter = PrometheusExporter(port=19090, namespace="test_exporter")

    def tearDown(self):
        """Clean up after tests."""
        self.exporter.stop()

    def test_initialization(self):
        """Test exporter initialization."""
        self.assertIsNotNone(self.exporter.registry)
        self.assertEqual(self.exporter._port, 19090)
        self.assertFalse(self.exporter.is_running)

    def test_increment_counter(self):
        """Test counter increment through exporter."""
        self.exporter.increment_counter("requests_total", 10)

        metrics = self.exporter.get_metrics()
        self.assertIn("requests_total", metrics)

    def test_set_gauge(self):
        """Test gauge set through exporter."""
        self.exporter.set_gauge("latency_seconds", 0.5)

        metrics = self.exporter.get_metrics()
        self.assertIn("latency_seconds", metrics)

    def test_observe_histogram(self):
        """Test histogram observation through exporter."""
        self.exporter.register_histogram("request_duration", buckets=[0.1, 0.5, 1.0])
        self.exporter.observe_histogram("request_duration", 0.3)

        metrics = self.exporter.registry.get_all_metrics()
        found = any("request_duration" in k for k in metrics["histograms"].keys())
        self.assertTrue(found)

    def test_export_metric(self):
        """Test generic export_metric interface."""
        self.exporter.export_metric("test_metric", 42.0, "gauge")

        metrics = self.exporter.get_metrics()
        self.assertIn("test_metric", metrics)

    def test_get_metrics(self):
        """Test get_metrics returns Prometheus format."""
        self.exporter.increment_counter("requests_total")

        metrics = self.exporter.get_metrics()

        self.assertIn("# TYPE", metrics)

    def test_get_url(self):
        """Test URL generation."""
        url = self.exporter.get_url("/metrics")
        self.assertEqual(url, "http://0.0.0.0:19090/metrics")

    def test_start_stop(self):
        """Test start and stop server."""
        self.exporter.start()

        # Give server time to start
        time.sleep(0.5)

        self.assertTrue(self.exporter.is_running)

        self.exporter.stop()
        self.assertFalse(self.exporter.is_running)


class TestPrometheusDashboardIntegration(unittest.TestCase):
    """Test PrometheusDashboardIntegration."""

    def setUp(self):
        """Set up test fixtures."""
        self.exporter = PrometheusExporter(namespace="test_integration")
        self.integration = PrometheusDashboardIntegration(self.exporter)

    def test_get_prometheus_metrics(self):
        """Test Prometheus format retrieval."""
        self.exporter.increment_counter("requests_total")

        metrics = self.integration.get_prometheus_metrics()

        self.assertIn("# TYPE", metrics)

    def test_get_json_metrics(self):
        """Test JSON format retrieval."""
        self.exporter.set_gauge("latency_seconds", 0.5)

        metrics = self.integration.get_json_metrics()

        self.assertIn("counters", metrics)
        self.assertIn("gauges", metrics)
        self.assertIn("histograms", metrics)

    def test_collect_from_collector(self):
        """Test collecting from MetricsCollector."""
        # Mock collector
        mock_metric = MagicMock()
        mock_metric.name = "test_metric"
        mock_metric.value = 100.0
        mock_metric.labels = {"service": "test"}
        mock_metric.metric_type = MagicMock()
        mock_metric.metric_type.value = "gauge"

        mock_collector = MagicMock()
        mock_collector.get_all_metrics.return_value = [mock_metric]

        self.integration.collect_from_collector(mock_collector)

        metrics = self.exporter.get_metrics()
        self.assertIn("test_metric", metrics)


class TestGlobalFunctions(unittest.TestCase):
    """Test global functions."""

    def tearDown(self):
        """Clean up after tests."""
        stop_exporter()

    def test_get_exporter_singleton(self):
        """Test get_exporter returns singleton."""
        exporter1 = get_exporter(port=19091)
        exporter2 = get_exporter(port=19091)

        self.assertIs(exporter1, exporter2)

    def test_start_exporter(self):
        """Test start_exporter starts server."""
        exporter = start_exporter(port=19092)

        time.sleep(0.5)

        self.assertTrue(exporter.is_running)

        exporter.stop()

    def test_stop_exporter(self):
        """Test stop_exporter stops server."""
        exporter = start_exporter(port=19093)
        time.sleep(0.5)

        stop_exporter()

        self.assertFalse(exporter.is_running)


class TestDecorators(unittest.TestCase):
    """Test metric decorators."""

    def setUp(self):
        """Set up test fixtures."""
        self.exporter = PrometheusExporter(namespace="test_decorator")

    def test_prometheus_counter_decorator(self):
        """Test prometheus_counter decorator."""
        @prometheus_counter("function_calls")
        def test_func():
            return "result"

        # Patch get_exporter to use our test exporter
        with patch('lib.v17.prometheus_exporter.get_exporter', return_value=self.exporter):
            result = test_func()

        self.assertEqual(result, "result")

    def test_prometheus_histogram_decorator(self):
        """Test prometheus_histogram decorator."""
        @prometheus_histogram("function_duration")
        def test_func():
            time.sleep(0.01)
            return "result"

        # Patch get_exporter to use our test exporter
        with patch('lib.v17.prometheus_exporter.get_exporter', return_value=self.exporter):
            result = test_func()

        self.assertEqual(result, "result")


class TestMetricTypes(unittest.TestCase):
    """Test metric type enums and dataclasses."""

    def test_metric_type_enum(self):
        """Test MetricType enum values."""
        self.assertEqual(MetricType.COUNTER.value, "counter")
        self.assertEqual(MetricType.GAUGE.value, "gauge")
        self.assertEqual(MetricType.HISTOGRAM.value, "histogram")
        self.assertEqual(MetricType.UNTYPED.value, "untyped")

    def test_histogram_bucket(self):
        """Test HistogramBucket dataclass."""
        bucket = HistogramBucket(upper_bound=0.5, count=10)

        self.assertEqual(bucket.upper_bound, 0.5)
        self.assertEqual(bucket.count, 10)

    def test_histogram_dataclass(self):
        """Test Histogram dataclass."""
        buckets = [HistogramBucket(upper_bound=0.5, count=10)]
        histogram = Histogram(name="test", buckets=buckets, sum=5.0, count=10)

        self.assertEqual(histogram.name, "test")
        self.assertEqual(len(histogram.buckets), 1)
        self.assertEqual(histogram.sum, 5.0)
        self.assertEqual(histogram.count, 10)


if __name__ == "__main__":
    unittest.main()
