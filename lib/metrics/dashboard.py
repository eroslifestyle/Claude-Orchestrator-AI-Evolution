"""Metrics Dashboard for Orchestrator V15.0.4.

Real-time dashboard with FastAPI and WebSocket support.

Features:
- REST API for metrics queries
- WebSocket for real-time updates
- JSON response format
- CORS configuration
- Health check endpoint

API Endpoints:
- GET /metrics - Prometheus format export
- GET /api/v1/metrics - JSON format
- GET /api/v1/metrics/{name} - Single metric
- GET /api/v1/stats/agents - Agent statistics
- GET /api/v1/stats/cache - Cache statistics
- WS /ws - Real-time updates
- GET /health - Health check
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

# Try to import FastAPI components
try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import PlainTextResponse
    from uvicorn import Server, Config
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    logger.warning("FastAPI not available. Dashboard disabled.")

from lib.metrics.collector import MetricsCollector, get_collector
from lib.metrics.exporter import PrometheusExporter, get_exporter


@dataclass
class DashboardConfig:
    """Dashboard configuration.

    Attributes:
        host: Bind host (default: 0.0.0.0)
        port: Bind port (default: 8080)
        cors_origins: Allowed CORS origins
        update_interval_seconds: WebSocket update interval
        title: Dashboard title
    """
    host: str = "0.0.0.0"
    port: int = 8080
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    update_interval_seconds: float = 1.0
    title: str = "Orchestrator Metrics Dashboard"


class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""

    def __init__(self) -> None:
        self._connections: Set[Any] = set()
        self._lock = threading.Lock()

    async def connect(self, websocket: Any) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        with self._lock:
            self._connections.add(websocket)

    def disconnect(self, websocket: Any) -> None:
        """Remove a WebSocket connection."""
        with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, message: str) -> None:
        """Broadcast message to all connections."""
        with self._lock:
            connections = list(self._connections)

        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.debug(f"Failed to send to connection: {e}")


class MetricsDashboard:
    """FastAPI-based metrics dashboard with WebSocket support.

    Example:
        >>> dashboard = MetricsDashboard()
        >>> dashboard.start(port=8080)
        >>> # ... later ...
        >>> dashboard.stop()
    """

    def __init__(
        self,
        collector: Optional[MetricsCollector] = None,
        config: Optional[DashboardConfig] = None,
    ) -> None:
        """Initialize the dashboard.

        Args:
            collector: MetricsCollector to use (default: singleton)
            config: Dashboard configuration
        """
        if not FASTAPI_AVAILABLE:
            raise RuntimeError(
                "FastAPI not available. Install with: pip install fastapi uvicorn"
            )

        self._collector = collector or get_collector()
        self._config = config or DashboardConfig()
        self._exporter = get_exporter(self._collector)
        self._manager = ConnectionManager()

        self._app: Optional[Any] = None
        self._server: Optional[Any] = None
        self._server_thread: Optional[threading.Thread] = None
        self._running = False
        self._update_task: Optional[asyncio.Task] = None

    def _create_app(self) -> Any:
        """Create the FastAPI application."""
        from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
        from fastapi.middleware.cors import CORSMiddleware
        from fastapi.responses import PlainTextResponse

        @asynccontextmanager
        async def lifespan(app: FastAPI):
            """Manage application lifecycle."""
            # Startup
            self._running = True
            self._update_task = asyncio.create_task(self._broadcast_updates())
            yield
            # Shutdown
            self._running = False
            if self._update_task:
                self._update_task.cancel()
                try:
                    await self._update_task
                except asyncio.CancelledError:
                    pass

        app = FastAPI(
            title=self._config.title,
            version="15.0.4",
            lifespan=lifespan,
        )

        # CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=self._config.cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["*"],
        )

        # Store reference for WebSocket handler
        dashboard = self

        @app.get("/health", tags=["Health"])
        async def health_check() -> Dict[str, Any]:
            """Health check endpoint."""
            return {
                "status": "healthy",
                "version": "15.0.4",
                "metrics_count": len(self._collector.get_all_metrics()),
            }

        @app.get("/metrics", tags=["Metrics"], response_class=PlainTextResponse)
        async def prometheus_metrics() -> str:
            """Prometheus format metrics export."""
            return self._exporter.export()

        @app.get("/api/v1/metrics", tags=["API"])
        async def list_metrics() -> Dict[str, Any]:
            """Get all metrics in JSON format."""
            metrics = self._collector.get_all_metrics()
            return {
                "data": [
                    {
                        "name": m.name,
                        "value": m.value,
                        "labels": m.labels,
                        "type": m.metric_type.value,
                        "description": m.description,
                        "timestamp": m.timestamp,
                    }
                    for m in metrics
                ],
                "meta": {
                    "count": len(metrics),
                    "collector_version": "15.0.4",
                }
            }

        @app.get("/api/v1/metrics/{metric_name}", tags=["API"])
        async def get_metric(metric_name: str) -> Dict[str, Any]:
            """Get a specific metric by name."""
            metric = self._collector.get_metric(metric_name)
            if metric is None:
                raise HTTPException(status_code=404, detail="Metric not found")
            return {
                "data": {
                    "name": metric.name,
                    "value": metric.value,
                    "labels": metric.labels,
                    "type": metric.metric_type.value,
                    "description": metric.description,
                }
            }

        @app.get("/api/v1/stats/agents", tags=["API"])
        async def agent_stats() -> Dict[str, Any]:
            """Get aggregated agent performance statistics."""
            # Get unique agents from metrics
            agents_data: Dict[str, Dict[str, Any]] = {}

            for metric in self._collector.get_all_metrics():
                if "agent" in metric.labels:
                    agent = metric.labels["agent"]
                    if agent not in agents_data:
                        agents_data[agent] = self._collector.get_agent_stats(agent)

            return {
                "data": list(agents_data.values()),
                "meta": {
                    "agent_count": len(agents_data),
                }
            }

        @app.get("/api/v1/stats/cache", tags=["API"])
        async def cache_stats() -> Dict[str, Any]:
            """Get cache performance statistics."""
            # Get unique cache types from metrics
            cache_types: set[str] = set()

            for metric in self._collector.get_all_metrics():
                if "cache_type" in metric.labels:
                    cache_types.add(metric.labels["cache_type"])

            cache_data = [
                self._collector.get_cache_stats(ct)
                for ct in cache_types
            ]

            # If no cache types found, return default stats
            if not cache_data:
                cache_data = [self._collector.get_cache_stats("default")]

            return {
                "data": cache_data,
                "meta": {
                    "cache_type_count": len(cache_data),
                }
            }

        @app.get("/api/v1/stats/summary", tags=["API"])
        async def summary_stats() -> Dict[str, Any]:
            """Get overall system summary."""
            metrics = self._collector.get_all_metrics()

            # Count by type
            type_counts: Dict[str, int] = {}
            for m in metrics:
                t = m.metric_type.value
                type_counts[t] = type_counts.get(t, 0) + 1

            return {
                "data": {
                    "total_metrics": len(metrics),
                    "metrics_by_type": type_counts,
                    "collector_status": "active",
                }
            }

        @app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for real-time updates."""
            await dashboard._manager.connect(websocket)
            try:
                while dashboard._running:
                    # Keep connection alive, wait for client messages
                    data = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=30.0
                    )
                    # Handle ping/pong
                    if data == "ping":
                        await websocket.send_text("pong")
            except WebSocketDisconnect:
                pass
            except asyncio.TimeoutError:
                # Send periodic ping
                try:
                    await websocket.send_text("ping")
                except Exception:
                    pass
            except Exception as e:
                logger.debug(f"WebSocket error: {e}")
            finally:
                dashboard._manager.disconnect(websocket)

        return app

    async def _broadcast_updates(self) -> None:
        """Periodically broadcast metric updates to WebSocket clients."""
        while self._running:
            try:
                # Get current metrics summary
                metrics = self._collector.get_all_metrics()
                summary = {
                    "type": "metrics_update",
                    "timestamp": asyncio.get_event_loop().time(),
                    "count": len(metrics),
                    "sample_metrics": [
                        {
                            "name": m.name,
                            "value": m.value,
                            "labels": m.labels,
                        }
                        for m in metrics[:10]  # Limit to 10 for bandwidth
                    ],
                }
                await self._manager.broadcast(json.dumps(summary))
            except Exception as e:
                logger.debug(f"Broadcast error: {e}")

            await asyncio.sleep(self._config.update_interval_seconds)

    def start(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        block: bool = False,
    ) -> None:
        """Start the dashboard server.

        Args:
            host: Override config host
            port: Override config port
            block: If True, block until server stops
        """
        from uvicorn import Server, Config

        if self._running:
            logger.warning("Dashboard already running")
            return

        host = host or self._config.host
        port = port or self._config.port

        self._app = self._create_app()
        config = Config(
            self._app,
            host=host,
            port=port,
            log_level="warning",
        )
        self._server = Server(config)

        if block:
            self._running = True
            asyncio.run(self._server.serve())
        else:
            # Run in background thread
            def run_server():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                self._running = True
                loop.run_until_complete(self._server.serve())

            self._server_thread = threading.Thread(target=run_server, daemon=True)
            self._server_thread.start()

        logger.info(f"Metrics dashboard started on http://{host}:{port}")

    def stop(self) -> None:
        """Stop the dashboard server."""
        if not self._running:
            return

        self._running = False

        if self._server:
            self._server.should_exit = True

        if self._server_thread and self._server_thread.is_alive():
            self._server_thread.join(timeout=5.0)

        logger.info("Metrics dashboard stopped")

    @property
    def is_running(self) -> bool:
        """Check if the dashboard is running."""
        return self._running

    def get_url(self, path: str = "") -> str:
        """Get the dashboard URL.

        Args:
            path: Optional path to append

        Returns:
            Full URL string
        """
        return f"http://{self._config.host}:{self._config.port}{path}"


# Global dashboard instance
_dashboard: Optional[MetricsDashboard] = None
_dashboard_lock = threading.Lock()


def start_dashboard(
    port: int = 8080,
    host: str = "0.0.0.0",
    collector: Optional[MetricsCollector] = None,
) -> MetricsDashboard:
    """Start the metrics dashboard.

    Args:
        port: Port to bind to
        host: Host to bind to
        collector: Optional MetricsCollector to use

    Returns:
        MetricsDashboard instance
    """
    global _dashboard

    with _dashboard_lock:
        if _dashboard is not None and _dashboard.is_running:
            logger.warning("Dashboard already running")
            return _dashboard

        config = DashboardConfig(host=host, port=port)
        _dashboard = MetricsDashboard(collector=collector, config=config)
        _dashboard.start()
        return _dashboard


def stop_dashboard() -> None:
    """Stop the metrics dashboard."""
    global _dashboard

    with _dashboard_lock:
        if _dashboard is not None:
            _dashboard.stop()
            _dashboard = None
