"""Tests for Metrics Dashboard V17.

Tests cover:
- AlertRule creation and evaluation
- AlertManager functionality
- PrometheusExporter format
- MetricsDashboard integration
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

# Import modules under test
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from metrics_dashboard import (
    AlertRule,
    AlertSeverity,
    AlertState,
    AlertInstance,
    AlertManager,
    PrometheusExporter,
    MetricSample,
    MetricsDashboard,
    WebSocketServer,
    get_dashboard,
    record_metric,
    add_alert,
    get_metrics,
)


class TestAlertRule:
    """Tests for AlertRule dataclass."""

    def test_basic_creation(self) -> None:
        """Test basic alert rule creation."""
        rule = AlertRule(name="cpu_high", threshold=0.80)
        assert rule.name == "cpu_high"
        assert rule.threshold == 0.80
        assert rule.severity == "warning"
        assert rule.comparison == "gt"

    def test_custom_severity(self) -> None:
        """Test custom severity."""
        rule = AlertRule(name="cpu_critical", threshold=0.95, severity="critical")
        assert rule.severity == "critical"

    def test_invalid_severity_normalized(self) -> None:
        """Test invalid severity gets normalized."""
        rule = AlertRule(name="test", threshold=0.5, severity="unknown")
        assert rule.severity == "warning"

    def test_comparison_operators(self) -> None:
        """Test different comparison operators."""
        # Greater than (default)
        rule = AlertRule(name="gt_test", threshold=0.5, comparison="gt")
        assert rule.evaluate(0.6) is True
        assert rule.evaluate(0.5) is False

        # Less than
        rule = AlertRule(name="lt_test", threshold=0.5, comparison="lt")
        assert rule.evaluate(0.4) is True
        assert rule.evaluate(0.5) is False

        # Greater than or equal
        rule = AlertRule(name="gte_test", threshold=0.5, comparison="gte")
        assert rule.evaluate(0.5) is True
        assert rule.evaluate(0.4) is False

        # Less than or equal
        rule = AlertRule(name="lte_test", threshold=0.5, comparison="lte")
        assert rule.evaluate(0.5) is True
        assert rule.evaluate(0.6) is False

        # Equal
        rule = AlertRule(name="eq_test", threshold=0.5, comparison="eq")
        assert rule.evaluate(0.5) is True
        assert rule.evaluate(0.6) is False


class TestAlertInstance:
    """Tests for AlertInstance."""

    def test_to_dict(self) -> None:
        """Test conversion to dictionary."""
        rule = AlertRule(name="test", threshold=0.8, severity="warning")
        alert = AlertInstance(rule=rule, state=AlertState.ACTIVE, current_value=0.85)
        data = alert.to_dict()

        assert data["rule_name"] == "test"
        assert data["state"] == "active"
        assert data["severity"] == "warning"
        assert data["threshold"] == 0.8
        assert data["current_value"] == 0.85


class TestAlertManager:
    """Tests for AlertManager."""

    def test_add_alert(self) -> None:
        """Test adding an alert rule."""
        manager = AlertManager()
        rule = AlertRule(name="cpu_high", threshold=0.80, metric_name="cpu_usage")
        manager.add_alert(rule)

        alerts = manager.get_all_alerts()
        assert len(alerts) == 1
        assert alerts[0]["rule_name"] == "cpu_high"

    def test_remove_alert(self) -> None:
        """Test removing an alert rule."""
        manager = AlertManager()
        rule = AlertRule(name="cpu_high", threshold=0.80)
        manager.add_alert(rule)

        assert manager.remove_alert("cpu_high") is True
        assert manager.remove_alert("nonexistent") is False
        assert len(manager.get_all_alerts()) == 0

    def test_evaluate_metric_firing(self) -> None:
        """Test metric evaluation triggers alert."""
        manager = AlertManager()
        rule = AlertRule(
            name="cpu_high",
            threshold=0.80,
            metric_name="cpu_usage",
        )
        manager.add_alert(rule)

        # Metric below threshold - no alert
        metric = MetricSample(name="cpu_usage", value=0.70)
        changed = manager.evaluate_metric(metric)
        assert len(changed) == 0

        # Metric above threshold - alert fires
        metric = MetricSample(name="cpu_usage", value=0.85)
        changed = manager.evaluate_metric(metric)
        assert len(changed) == 1
        assert changed[0].state == AlertState.FIRING

    def test_evaluate_metric_resolve(self) -> None:
        """Test alert resolution when metric drops."""
        manager = AlertManager()
        rule = AlertRule(name="cpu_high", threshold=0.80, metric_name="cpu_usage")
        manager.add_alert(rule)

        # Fire the alert
        metric = MetricSample(name="cpu_usage", value=0.85)
        manager.evaluate_metric(metric)

        # Resolve the alert
        metric = MetricSample(name="cpu_usage", value=0.70)
        changed = manager.evaluate_metric(metric)
        assert len(changed) == 1
        assert changed[0].state == AlertState.RESOLVED

    def test_get_active_alerts(self) -> None:
        """Test getting active alerts."""
        manager = AlertManager()
        rule = AlertRule(name="cpu_high", threshold=0.80, metric_name="cpu_usage")
        manager.add_alert(rule)

        # No active alerts initially
        assert len(manager.get_active_alerts()) == 0

        # Fire alert
        metric = MetricSample(name="cpu_usage", value=0.85)
        manager.evaluate_metric(metric)

        # Now have active alert
        active = manager.get_active_alerts()
        assert len(active) == 1
        assert active[0].rule.name == "cpu_high"

    def test_callback_invoked(self) -> None:
        """Test callback is invoked on alert change."""
        manager = AlertManager()
        rule = AlertRule(name="cpu_high", threshold=0.80, metric_name="cpu_usage")
        manager.add_alert(rule)

        callback_calls = []
        manager.add_callback(lambda alert: callback_calls.append(alert))

        # Fire alert
        metric = MetricSample(name="cpu_usage", value=0.85)
        manager.evaluate_metric(metric)

        assert len(callback_calls) == 1
        assert callback_calls[0].state == AlertState.FIRING


class TestPrometheusExporter:
    """Tests for PrometheusExporter."""

    def test_update_metric(self) -> None:
        """Test updating a metric."""
        exporter = PrometheusExporter()
        metric = MetricSample(name="cpu_usage", value=0.75)
        exporter.update_metric(metric)

        data = exporter.get_metrics()
        assert data["count"] == 1
        assert len(data["metrics"]) == 1

    def test_get_metrics_text(self) -> None:
        """Test Prometheus text format output."""
        exporter = PrometheusExporter(namespace="test")
        metric = MetricSample(
            name="cpu_usage",
            value=0.75,
            labels={"host": "server1"},
            metric_type="gauge",
        )
        exporter.update_metric(metric)

        text = exporter.get_metrics_text()
        assert "# HELP test_cpu_usage cpu_usage metric" in text
        assert "# TYPE test_cpu_usage gauge" in text
        assert 'test_cpu_usage{host="server1"} 0.75' in text

    def test_export_bytes(self) -> None:
        """Test export as bytes."""
        exporter = PrometheusExporter()
        metric = MetricSample(name="cpu_usage", value=0.75)
        exporter.update_metric(metric)

        data = exporter.export()
        assert isinstance(data, bytes)
        assert b"cpu_usage" in data

    def test_multiple_metrics(self) -> None:
        """Test handling multiple metrics."""
        exporter = PrometheusExporter()
        metrics = [
            MetricSample(name="cpu_usage", value=0.75),
            MetricSample(name="memory_usage", value=0.60),
            MetricSample(name="request_count", value=100, metric_type="counter"),
        ]
        exporter.update_metrics(metrics)

        text = exporter.get_metrics_text()
        assert "cpu_usage" in text
        assert "memory_usage" in text
        assert "request_count" in text


class TestMetricSample:
    """Tests for MetricSample."""

    def test_to_dict(self) -> None:
        """Test conversion to dictionary."""
        metric = MetricSample(name="cpu_usage", value=0.75, labels={"host": "server1"})
        data = metric.to_dict()

        assert data["name"] == "cpu_usage"
        assert data["value"] == 0.75
        assert data["labels"] == {"host": "server1"}
        assert "timestamp" in data
        assert data["type"] == "gauge"

    def test_to_prometheus(self) -> None:
        """Test Prometheus format output."""
        metric = MetricSample(name="cpu_usage", value=0.75, labels={"host": "server1"})
        prom = metric.to_prometheus()
        assert 'cpu_usage{host="server1"} 0.75' == prom

    def test_to_prometheus_no_labels(self) -> None:
        """Test Prometheus format without labels."""
        metric = MetricSample(name="cpu_usage", value=0.75)
        prom = metric.to_prometheus()
        assert "cpu_usage 0.75" == prom


class TestMetricsDashboard:
    """Tests for MetricsDashboard."""

    @pytest.fixture
    def dashboard(self) -> MetricsDashboard:
        """Create a dashboard instance for testing."""
        return MetricsDashboard(port=8765, namespace="test")

    def test_initialization(self, dashboard: MetricsDashboard) -> None:
        """Test dashboard initialization."""
        assert dashboard.port == 8765
        assert dashboard.is_running is False
        assert dashboard.client_count == 0

    def test_default_alerts_created(self, dashboard: MetricsDashboard) -> None:
        """Test default alerts are created."""
        alerts = dashboard.get_alerts()
        alert_names = [a["rule_name"] for a in alerts]

        # Should have warning and critical for each default metric
        assert "cpu_usage_warning" in alert_names
        assert "cpu_usage_critical" in alert_names
        assert "memory_usage_warning" in alert_names
        assert "error_rate_warning" in alert_names

    def test_add_alert(self, dashboard: MetricsDashboard) -> None:
        """Test adding custom alert."""
        rule = AlertRule(name="custom_alert", threshold=0.5, metric_name="custom_metric")
        dashboard.add_alert(rule)

        alerts = dashboard.get_alerts()
        alert_names = [a["rule_name"] for a in alerts]
        assert "custom_alert" in alert_names

    def test_remove_alert(self, dashboard: MetricsDashboard) -> None:
        """Test removing alert."""
        rule = AlertRule(name="temp_alert", threshold=0.5)
        dashboard.add_alert(rule)
        assert dashboard.remove_alert("temp_alert") is True
        assert dashboard.remove_alert("nonexistent") is False

    @pytest.mark.asyncio
    async def test_record_metric(self, dashboard: MetricsDashboard) -> None:
        """Test recording a metric."""
        await dashboard.record_metric("test_metric", 0.5, {"label": "value"})

        metrics = dashboard.get_metrics()
        assert "test_metric" in metrics
        assert metrics["test_metric"]["value"] == 0.5

    def test_get_prometheus_metrics(self, dashboard: MetricsDashboard) -> None:
        """Test getting Prometheus metrics."""
        # Record some metrics
        metric = MetricSample(name="test_metric", value=0.5)
        dashboard._prometheus.update_metric(metric)

        text = dashboard.get_prometheus_metrics()
        assert "test_test_metric" in text

    def test_get_status(self, dashboard: MetricsDashboard) -> None:
        """Test getting dashboard status."""
        status = dashboard.get_status()
        assert "running" in status
        assert "port" in status
        assert "clients" in status
        assert "metrics_count" in status
        assert "active_alerts" in status

    def test_get_grafana_dashboard(self, dashboard: MetricsDashboard) -> None:
        """Test Grafana dashboard generation."""
        # Add a metric
        metric = MetricSample(name="test_metric", value=0.5)
        dashboard._prometheus.update_metric(metric)

        grafana = dashboard.get_grafana_dashboard()
        assert "dashboard" in grafana
        assert grafana["dashboard"]["title"] == "Orchestrator V17 Metrics"
        assert "panels" in grafana["dashboard"]

    def test_metric_history(self, dashboard: MetricsDashboard) -> None:
        """Test metric history tracking."""
        # Manually add to history
        for i in range(10):
            metric = MetricSample(name="test_metric", value=float(i) / 10)
            dashboard._metrics_history["test_metric"].append(metric)

        history = dashboard.get_metric_history("test_metric", limit=5)
        assert len(history) == 5
        # Should get last 5 values
        assert history[-1].value == 0.9


class TestSingleton:
    """Tests for singleton functions."""

    def test_get_dashboard_singleton(self) -> None:
        """Test get_dashboard returns singleton."""
        # Reset singleton
        import metrics_dashboard
        metrics_dashboard._dashboard_instance = None

        d1 = get_dashboard(port=9999)
        d2 = get_dashboard()

        assert d1 is d2
        assert d1.port == 9999

        # Cleanup
        metrics_dashboard._dashboard_instance = None


class TestWebSocketServer:
    """Tests for WebSocketServer."""

    def test_initialization(self) -> None:
        """Test WebSocket server initialization."""
        server = WebSocketServer(port=8765, host="localhost")
        assert server.port == 8765
        assert server.client_count == 0

    def test_callback_registration(self) -> None:
        """Test callback registration."""
        server = WebSocketServer()
        server.on_connect(lambda ws: None)
        server.on_message(lambda ws, msg: None)

        assert len(server._on_connect_callbacks) == 1
        assert len(server._on_message_callbacks) == 1


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
