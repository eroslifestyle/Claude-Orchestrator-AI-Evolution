"""Metrics Dashboard V17 for Orchestrator.

Real-time metrics dashboard with WebSocket broadcasting, Prometheus export,
and alert management.

Features:
- WebSocket server for real-time metric updates
- Prometheus-compatible metrics export
- Alert rules with configurable thresholds (80%, 95%)
- Grafana-ready metric format
- Thread-safe metric collection
- Async-compatible design

Architecture:
    MetricsDashboard
    ├── WebSocketServer (port 8765)
    ├── PrometheusExporter
    └── AlertManager
        ├── AlertRule (threshold + severity)
        └── AlertState (active/inactive)

Example:
    dashboard = MetricsDashboard(port=8765)
    await dashboard.start()

    # Add alert rule
    dashboard.add_alert(AlertRule(
        name="cpu_high",
        threshold=0.80,
        severity="warning",
        metric_name="cpu_usage"
    ))

    # Broadcast metric
    await dashboard.broadcast({
        "name": "cpu_usage",
        "value": 0.85,
        "labels": {"host": "server1"}
    })

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
from datetime import datetime
from enum import Enum
from typing import (
    Any,
    AsyncIterator,
    Callable,
    Dict,
    List,
    Optional,
    Set,
    Tuple,
    Union,
)

logger = logging.getLogger(__name__)

# Try to import websockets for WebSocket support
try:
    import websockets
    from websockets.server import serve, WebSocketServerProtocol
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    WebSocketServerProtocol = Any  # type: ignore
    logger.debug("websockets not available. Using fallback implementation.")


class AlertSeverity(Enum):
    """Alert severity levels."""
    WARNING = "warning"
    CRITICAL = "critical"
    INFO = "info"


class AlertState(Enum):
    """Alert state."""
    INACTIVE = "inactive"
    ACTIVE = "active"
    FIRING = "firing"
    RESOLVED = "resolved"


@dataclass
class AlertRule:
    """Alert rule configuration.

    Attributes:
        name: Unique alert rule name
        threshold: Threshold value (0.0-1.0 for percentages)
        severity: Alert severity level
        metric_name: Metric to monitor
        comparison: Comparison operator (gt, lt, gte, lte, eq)
        duration_seconds: Duration before alert fires
        labels: Additional labels for the alert
        annotations: Human-readable descriptions
    """
    name: str
    threshold: float
    severity: str = "warning"  # "warning", "critical", "info"
    metric_name: str = ""
    comparison: str = "gt"  # gt, lt, gte, lte, eq
    duration_seconds: float = 0.0
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate alert rule."""
        if not self.metric_name:
            self.metric_name = self.name

        # Normalize severity
        if isinstance(self.severity, str):
            self.severity = self.severity.lower()
            if self.severity not in ("warning", "critical", "info"):
                self.severity = "warning"

        # Normalize comparison
        valid_comparisons = ("gt", "lt", "gte", "lte", "eq")
        if self.comparison not in valid_comparisons:
            self.comparison = "gt"

    def evaluate(self, value: float) -> bool:
        """Evaluate if value triggers the alert.

        Args:
            value: Current metric value

        Returns:
            True if alert should fire
        """
        ops = {
            "gt": lambda v, t: v > t,
            "lt": lambda v, t: v < t,
            "gte": lambda v, t: v >= t,
            "lte": lambda v, t: v <= t,
            "eq": lambda v, t: v == t,
        }
        return ops[self.comparison](value, self.threshold)


@dataclass
class AlertInstance:
    """Active alert instance."""
    rule: AlertRule
    state: AlertState = AlertState.INACTIVE
    fired_at: Optional[float] = None
    resolved_at: Optional[float] = None
    current_value: float = 0.0
    labels: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "rule_name": self.rule.name,
            "state": self.state.value,
            "severity": self.rule.severity,
            "threshold": self.rule.threshold,
            "current_value": self.current_value,
            "fired_at": self.fired_at,
            "resolved_at": self.resolved_at,
            "labels": {**self.rule.labels, **self.labels},
            "annotations": self.rule.annotations,
        }


@dataclass
class MetricSample:
    """A single metric sample."""
    name: str
    value: float
    labels: Dict[str, str] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    metric_type: str = "gauge"  # counter, gauge, histogram

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "value": self.value,
            "labels": self.labels,
            "timestamp": self.timestamp,
            "type": self.metric_type,
        }

    def to_prometheus(self) -> str:
        """Convert to Prometheus format."""
        labels_str = ""
        if self.labels:
            labels_str = "{" + ",".join(
                f'{k}="{v}"' for k, v in self.labels.items()
            ) + "}"
        return f"{self.name}{labels_str} {self.value}"


class AlertManager:
    """Manages alert rules and alert states.

    Features:
    - Add/remove alert rules
    - Evaluate metrics against rules
    - Track alert state transitions
    - Alert deduplication
    """

    def __init__(self) -> None:
        """Initialize alert manager."""
        self._rules: Dict[str, AlertRule] = {}
        self._alerts: Dict[str, AlertInstance] = {}
        self._lock = threading.RLock()
        self._alert_callbacks: List[Callable[[AlertInstance], None]] = []

    def add_alert(self, rule: AlertRule) -> None:
        """Add or update an alert rule.

        Args:
            rule: Alert rule to add
        """
        with self._lock:
            self._rules[rule.name] = rule
            # Initialize alert instance if not exists
            if rule.name not in self._alerts:
                self._alerts[rule.name] = AlertInstance(rule=rule)
            else:
                # Update rule reference
                self._alerts[rule.name].rule = rule
        logger.info(f"Alert rule added: {rule.name} (threshold={rule.threshold})")

    def remove_alert(self, name: str) -> bool:
        """Remove an alert rule.

        Args:
            name: Alert rule name

        Returns:
            True if removed, False if not found
        """
        with self._lock:
            if name in self._rules:
                del self._rules[name]
                if name in self._alerts:
                    del self._alerts[name]
                logger.info(f"Alert rule removed: {name}")
                return True
            return False

    def evaluate_metric(self, metric: MetricSample) -> List[AlertInstance]:
        """Evaluate a metric against all relevant rules.

        Args:
            metric: Metric sample to evaluate

        Returns:
            List of alert instances that changed state
        """
        changed_alerts: List[AlertInstance] = []

        with self._lock:
            for rule_name, rule in self._rules.items():
                if rule.metric_name != metric.name:
                    continue

                alert = self._alerts.get(rule_name)
                if not alert:
                    continue

                alert.current_value = metric.value

                # Check if threshold is breached
                is_breached = rule.evaluate(metric.value)

                # Handle state transitions
                if is_breached and alert.state in (AlertState.INACTIVE, AlertState.RESOLVED):
                    # Transition to active/firing
                    if rule.duration_seconds > 0:
                        alert.state = AlertState.ACTIVE
                        alert.fired_at = time.time()
                    else:
                        alert.state = AlertState.FIRING
                        alert.fired_at = time.time()
                    changed_alerts.append(alert)
                    self._notify_callbacks(alert)

                elif not is_breached and alert.state in (AlertState.ACTIVE, AlertState.FIRING):
                    # Transition to resolved
                    alert.state = AlertState.RESOLVED
                    alert.resolved_at = time.time()
                    changed_alerts.append(alert)
                    self._notify_callbacks(alert)

        return changed_alerts

    def get_active_alerts(self) -> List[AlertInstance]:
        """Get all active/firing alerts.

        Returns:
            List of active alert instances
        """
        with self._lock:
            return [
                alert for alert in self._alerts.values()
                if alert.state in (AlertState.ACTIVE, AlertState.FIRING)
            ]

    def get_all_alerts(self) -> List[Dict[str, Any]]:
        """Get all alert instances as dictionaries.

        Returns:
            List of alert dictionaries
        """
        with self._lock:
            return [alert.to_dict() for alert in self._alerts.values()]

    def add_callback(self, callback: Callable[[AlertInstance], None]) -> None:
        """Add a callback to be called on alert state changes.

        Args:
            callback: Function to call on alert changes
        """
        self._alert_callbacks.append(callback)

    def _notify_callbacks(self, alert: AlertInstance) -> None:
        """Notify all callbacks of an alert change."""
        for callback in self._alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")


class PrometheusExporter:
    """Prometheus-compatible metrics exporter.

    Provides /metrics endpoint format for Prometheus scraping.
    """

    def __init__(self, namespace: str = "orchestrator") -> None:
        """Initialize Prometheus exporter.

        Args:
            namespace: Metric name prefix
        """
        self._namespace = namespace
        self._metrics: Dict[str, MetricSample] = {}
        self._lock = threading.RLock()

    def update_metric(self, metric: MetricSample) -> None:
        """Update or add a metric.

        Args:
            metric: Metric sample to update
        """
        key = self._make_key(metric.name, metric.labels)
        with self._lock:
            self._metrics[key] = metric

    def update_metrics(self, metrics: List[MetricSample]) -> None:
        """Update multiple metrics.

        Args:
            metrics: List of metric samples
        """
        for metric in metrics:
            self.update_metric(metric)

    def get_metrics_text(self) -> str:
        """Get all metrics in Prometheus text format.

        Returns:
            Prometheus-formatted metrics string
        """
        lines: List[str] = []

        with self._lock:
            # Group metrics by name
            grouped: Dict[str, List[MetricSample]] = defaultdict(list)
            for metric in self._metrics.values():
                grouped[metric.name].append(metric)

            # Format each metric group
            for name, samples in sorted(grouped.items()):
                full_name = f"{self._namespace}_{name}"

                # Add HELP and TYPE comments
                first_sample = samples[0]
                lines.append(f"# HELP {full_name} {name} metric")
                lines.append(f"# TYPE {full_name} {first_sample.metric_type}")

                # Add metric values
                for sample in samples:
                    labels_str = ""
                    if sample.labels:
                        labels_str = "{" + ",".join(
                            f'{k}="{v}"' for k, v in sample.labels.items()
                        ) + "}"
                    lines.append(f"{full_name}{labels_str} {sample.value}")

                lines.append("")  # Empty line between metric groups

        return "\n".join(lines)

    def export(self) -> bytes:
        """Export metrics as bytes for HTTP response.

        Returns:
            Prometheus-formatted metrics as bytes
        """
        return self.get_metrics_text().encode("utf-8")

    def get_metrics(self) -> Dict[str, Any]:
        """Get all metrics as dictionary (JSON-friendly).

        Returns:
            Dictionary of metrics
        """
        with self._lock:
            return {
                "namespace": self._namespace,
                "metrics": [m.to_dict() for m in self._metrics.values()],
                "count": len(self._metrics),
                "timestamp": time.time(),
            }

    def _make_key(self, name: str, labels: Dict[str, str]) -> str:
        """Create a unique key for a metric."""
        if labels:
            labels_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
            return f"{name}:{labels_str}"
        return name


class WebSocketServer:
    """WebSocket server for real-time metric broadcasting.

    Provides bidirectional communication with dashboard clients.
    """

    def __init__(self, port: int = 8765, host: str = "localhost") -> None:
        """Initialize WebSocket server.

        Args:
            port: Server port
            host: Server host
        """
        self._port = port
        self._host = host
        self._clients: Set[WebSocketServerProtocol] = set()
        self._server: Any = None
        self._running = False
        self._lock = threading.RLock()
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._on_connect_callbacks: List[Callable[[Any], None]] = []
        self._on_message_callbacks: List[Callable[[Any, str], None]] = []

    @property
    def port(self) -> int:
        """Server port."""
        return self._port

    @property
    def client_count(self) -> int:
        """Number of connected clients."""
        with self._lock:
            return len(self._clients)

    async def start(self) -> None:
        """Start the WebSocket server."""
        if not WEBSOCKETS_AVAILABLE:
            logger.warning("websockets library not available. Using mock server.")
            self._running = True
            return

        async def handler(websocket: WebSocketServerProtocol, path: str) -> None:
            """Handle WebSocket connection."""
            await self._handle_client(websocket)

        self._server = await serve(
            handler,
            self._host,
            self._port,
            ping_interval=20,
            ping_timeout=10,
        )
        self._running = True
        logger.info(f"WebSocket server started on {self._host}:{self._port}")

    async def stop(self) -> None:
        """Stop the WebSocket server."""
        self._running = False

        if self._server:
            self._server.close()
            await self._server.wait_closed()
            logger.info("WebSocket server stopped")

    async def _handle_client(self, websocket: WebSocketServerProtocol) -> None:
        """Handle a WebSocket client connection.

        Args:
            websocket: WebSocket connection
        """
        with self._lock:
            self._clients.add(websocket)
        client_id = id(websocket)
        logger.info(f"Client connected: {client_id} (total: {self.client_count})")

        # Notify connect callbacks
        for callback in self._on_connect_callbacks:
            try:
                callback(websocket)
            except Exception as e:
                logger.error(f"Connect callback error: {e}")

        try:
            async for message in websocket:
                # Handle incoming messages
                for callback in self._on_message_callbacks:
                    try:
                        callback(websocket, message)
                    except Exception as e:
                        logger.error(f"Message callback error: {e}")
        except Exception as e:
            logger.debug(f"Client disconnected with error: {e}")
        finally:
            with self._lock:
                self._clients.discard(websocket)
            logger.info(f"Client disconnected: {client_id} (total: {self.client_count})")

    async def broadcast(self, message: Union[str, Dict[str, Any]]) -> None:
        """Broadcast a message to all connected clients.

        Args:
            message: Message to broadcast (string or dict)
        """
        if not self._running:
            return

        with self._lock:
            if not self._clients:
                return

            if isinstance(message, dict):
                message_str = json.dumps(message)
            else:
                message_str = message

            # Send to all clients
            disconnected = set()
            for client in self._clients:
                try:
                    await client.send(message_str)
                except Exception as e:
                    logger.debug(f"Failed to send to client: {e}")
                    disconnected.add(client)

            # Remove disconnected clients
            self._clients -= disconnected

    async def send_to(self, websocket: Any, message: Union[str, Dict[str, Any]]) -> bool:
        """Send a message to a specific client.

        Args:
            websocket: Target client
            message: Message to send

        Returns:
            True if sent successfully
        """
        try:
            if isinstance(message, dict):
                await websocket.send(json.dumps(message))
            else:
                await websocket.send(message)
            return True
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False

    def on_connect(self, callback: Callable[[Any], None]) -> None:
        """Register a callback for client connections."""
        self._on_connect_callbacks.append(callback)

    def on_message(self, callback: Callable[[Any, str], None]) -> None:
        """Register a callback for incoming messages."""
        self._on_message_callbacks.append(callback)


class MetricsDashboard:
    """Main metrics dashboard with WebSocket and Prometheus export.

    Central hub for metric collection, alerting, and distribution.

    Example:
        dashboard = MetricsDashboard(port=8765)
        await dashboard.start()

        # Record metric
        await dashboard.record_metric("cpu_usage", 0.75, {"host": "server1"})

        # Add alert
        dashboard.add_alert(AlertRule(
            name="cpu_high",
            threshold=0.80,
            severity="warning",
            metric_name="cpu_usage"
        ))

        # Get Prometheus export
        metrics_text = dashboard.get_prometheus_metrics()
    """

    # Default alert thresholds
    DEFAULT_THRESHOLDS = {
        "cpu_usage": {"warning": 0.80, "critical": 0.95},
        "memory_usage": {"warning": 0.80, "critical": 0.95},
        "error_rate": {"warning": 0.05, "critical": 0.10},
        "latency_p99": {"warning": 1.0, "critical": 5.0},  # seconds
        "queue_depth": {"warning": 100, "critical": 500},
    }

    def __init__(
        self,
        port: int = 8765,
        host: str = "localhost",
        namespace: str = "orchestrator",
    ) -> None:
        """Initialize metrics dashboard.

        Args:
            port: WebSocket server port
            host: WebSocket server host
            namespace: Prometheus metric namespace
        """
        self._port = port
        self._host = host

        # Components
        self._ws_server = WebSocketServer(port=port, host=host)
        self._prometheus = PrometheusExporter(namespace=namespace)
        self._alert_manager = AlertManager()

        # Metric storage
        self._metrics: Dict[str, MetricSample] = {}
        self._metrics_history: Dict[str, List[MetricSample]] = defaultdict(list)
        self._max_history = 1000

        # State
        self._running = False
        self._lock = threading.RLock()

        # Setup alert callback to broadcast alerts
        self._alert_manager.add_callback(self._on_alert_change)

        # Add default alert rules
        self._setup_default_alerts()

    @property
    def port(self) -> int:
        """WebSocket server port."""
        return self._port

    @property
    def is_running(self) -> bool:
        """Check if dashboard is running."""
        return self._running

    @property
    def client_count(self) -> int:
        """Number of connected WebSocket clients."""
        return self._ws_server.client_count

    def _setup_default_alerts(self) -> None:
        """Setup default alert rules from DEFAULT_THRESHOLDS."""
        for metric_name, thresholds in self.DEFAULT_THRESHOLDS.items():
            # Warning level
            if "warning" in thresholds:
                self._alert_manager.add_alert(AlertRule(
                    name=f"{metric_name}_warning",
                    threshold=thresholds["warning"],
                    severity="warning",
                    metric_name=metric_name,
                    annotations={"summary": f"{metric_name} approaching limit"},
                ))

            # Critical level
            if "critical" in thresholds:
                self._alert_manager.add_alert(AlertRule(
                    name=f"{metric_name}_critical",
                    threshold=thresholds["critical"],
                    severity="critical",
                    metric_name=metric_name,
                    annotations={"summary": f"{metric_name} at critical level"},
                ))

    async def start(self) -> None:
        """Start the metrics dashboard."""
        if self._running:
            logger.warning("Dashboard already running")
            return

        await self._ws_server.start()
        self._running = True
        logger.info(f"Metrics dashboard started on port {self._port}")

    async def stop(self) -> None:
        """Stop the metrics dashboard."""
        if not self._running:
            return

        await self._ws_server.stop()
        self._running = False
        logger.info("Metrics dashboard stopped")

    async def broadcast(self, metric: Dict[str, Any]) -> None:
        """Broadcast a metric update to all connected clients.

        Args:
            metric: Metric dictionary with name, value, labels
        """
        message = {
            "type": "metric_update",
            "data": metric,
            "timestamp": time.time(),
        }
        await self._ws_server.broadcast(message)

    async def broadcast_alert(self, alert: AlertInstance) -> None:
        """Broadcast an alert update to all connected clients.

        Args:
            alert: Alert instance to broadcast
        """
        message = {
            "type": "alert_update",
            "data": alert.to_dict(),
            "timestamp": time.time(),
        }
        await self._ws_server.broadcast(message)

    async def record_metric(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None,
        metric_type: str = "gauge",
    ) -> None:
        """Record a metric value and broadcast it.

        Args:
            name: Metric name
            value: Metric value
            labels: Optional labels
            metric_type: Metric type (counter, gauge, histogram)
        """
        labels = labels or {}
        metric = MetricSample(
            name=name,
            value=value,
            labels=labels,
            metric_type=metric_type,
        )

        # Store metric
        with self._lock:
            self._metrics[name] = metric
            self._metrics_history[name].append(metric)

            # Trim history
            if len(self._metrics_history[name]) > self._max_history:
                self._metrics_history[name] = self._metrics_history[name][-self._max_history:]

        # Update Prometheus exporter
        self._prometheus.update_metric(metric)

        # Evaluate alerts
        changed_alerts = self._alert_manager.evaluate_metric(metric)

        # Broadcast metric update
        await self.broadcast(metric.to_dict())

        # Broadcast any alert changes
        for alert in changed_alerts:
            await self.broadcast_alert(alert)

    def get_metrics(self) -> Dict[str, Any]:
        """Get all current metrics.

        Returns:
            Dictionary of all metrics
        """
        with self._lock:
            return {
                name: metric.to_dict()
                for name, metric in self._metrics.items()
            }

    def get_metric(self, name: str) -> Optional[MetricSample]:
        """Get a specific metric by name.

        Args:
            name: Metric name

        Returns:
            Metric sample or None if not found
        """
        with self._lock:
            return self._metrics.get(name)

    def get_metric_history(self, name: str, limit: int = 100) -> List[MetricSample]:
        """Get metric history.

        Args:
            name: Metric name
            limit: Maximum number of samples

        Returns:
            List of metric samples
        """
        with self._lock:
            history = self._metrics_history.get(name, [])
            return history[-limit:]

    def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format.

        Returns:
            Prometheus-formatted metrics string
        """
        return self._prometheus.get_metrics_text()

    def get_prometheus_export(self) -> bytes:
        """Get metrics as bytes for HTTP /metrics endpoint.

        Returns:
            Prometheus-formatted metrics as bytes
        """
        return self._prometheus.export()

    def add_alert(self, rule: AlertRule) -> None:
        """Add an alert rule.

        Args:
            rule: Alert rule to add
        """
        self._alert_manager.add_alert(rule)

    def remove_alert(self, name: str) -> bool:
        """Remove an alert rule.

        Args:
            name: Alert rule name

        Returns:
            True if removed
        """
        return self._alert_manager.remove_alert(name)

    def get_alerts(self) -> List[Dict[str, Any]]:
        """Get all alert instances.

        Returns:
            List of alert dictionaries
        """
        return self._alert_manager.get_all_alerts()

    def get_active_alerts(self) -> List[AlertInstance]:
        """Get all active/firing alerts.

        Returns:
            List of active alert instances
        """
        return self._alert_manager.get_active_alerts()

    def _on_alert_change(self, alert: AlertInstance) -> None:
        """Callback for alert state changes.

        Args:
            alert: Changed alert instance
        """
        # Log alert change
        if alert.state == AlertState.FIRING:
            logger.warning(
                f"Alert FIRING: {alert.rule.name} "
                f"(value={alert.current_value}, threshold={alert.rule.threshold})"
            )
        elif alert.state == AlertState.RESOLVED:
            logger.info(f"Alert RESOLVED: {alert.rule.name}")

    def get_status(self) -> Dict[str, Any]:
        """Get dashboard status summary.

        Returns:
            Status dictionary
        """
        with self._lock:
            return {
                "running": self._running,
                "port": self._port,
                "clients": self.client_count,
                "metrics_count": len(self._metrics),
                "alerts_count": len(self._alert_manager._alerts),
                "active_alerts": len(self.get_active_alerts()),
                "uptime": time.time(),  # Could track actual start time
            }

    def get_grafana_dashboard(self) -> Dict[str, Any]:
        """Generate Grafana dashboard JSON.

        Returns:
            Grafana dashboard configuration
        """
        # Basic Grafana dashboard template
        dashboard = {
            "dashboard": {
                "title": "Orchestrator V17 Metrics",
                "uid": "orchestrator-v17",
                "panels": [],
                "refresh": "10s",
                "time": {"from": "now-1h", "to": "now"},
            },
            "overwrite": True,
        }

        # Add panels for each metric category
        panel_id = 1
        y_pos = 0

        for metric_name in sorted(self._metrics.keys()):
            panel = {
                "id": panel_id,
                "title": metric_name.replace("_", " ").title(),
                "type": "gauge",
                "gridPos": {"h": 4, "w": 6, "x": (panel_id - 1) % 4 * 6, "y": y_pos},
                "targets": [
                    {
                        "expr": f"orchestrator_{metric_name}",
                        "refId": "A",
                    }
                ],
                "fieldConfig": {
                    "defaults": {
                        "thresholds": {
                            "mode": "absolute",
                            "steps": [
                                {"color": "green", "value": None},
                                {"color": "yellow", "value": 0.8},
                                {"color": "red", "value": 0.95},
                            ],
                        },
                        "unit": "percentunit",
                    },
                },
            }
            dashboard["dashboard"]["panels"].append(panel)
            panel_id += 1

            if panel_id % 4 == 1:
                y_pos += 4

        return dashboard


# Singleton instance
_dashboard_instance: Optional[MetricsDashboard] = None
_dashboard_lock = threading.Lock()


def get_dashboard(port: int = 8765) -> MetricsDashboard:
    """Get or create the singleton dashboard instance.

    Args:
        port: Dashboard port (only used on first call)

    Returns:
        MetricsDashboard instance
    """
    global _dashboard_instance

    with _dashboard_lock:
        if _dashboard_instance is None:
            _dashboard_instance = MetricsDashboard(port=port)
        return _dashboard_instance


# Convenience functions for quick metric recording
async def record_metric(
    name: str,
    value: float,
    labels: Optional[Dict[str, str]] = None,
) -> None:
    """Record a metric using the singleton dashboard.

    Args:
        name: Metric name
        value: Metric value
        labels: Optional labels
    """
    dashboard = get_dashboard()
    await dashboard.record_metric(name, value, labels)


def add_alert(rule: AlertRule) -> None:
    """Add an alert rule to the singleton dashboard.

    Args:
        rule: Alert rule to add
    """
    dashboard = get_dashboard()
    dashboard.add_alert(rule)


def get_metrics() -> Dict[str, Any]:
    """Get all metrics from the singleton dashboard.

    Returns:
        Dictionary of metrics
    """
    dashboard = get_dashboard()
    return dashboard.get_metrics()
