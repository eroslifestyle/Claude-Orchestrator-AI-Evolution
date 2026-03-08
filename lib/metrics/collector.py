"""Metrics Collector for Orchestrator V15.0.4.

Collects metrics from all orchestrator modules:
- Agent Performance: tasks, duration, success rate
- Budget & Cache: tokens, hits, misses
- Rate Limiting: requests, current tokens
- A/B Testing: experiments, variants
- Lock Contention: acquisitions, wait time

Features:
- Thread-safe collection
- Label support for multi-dimensional metrics
- Aggregation and statistics
- Memory-efficient with configurable retention
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
import threading
import time
import logging

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Type of metric."""
    COUNTER = "counter"      # Monotonically increasing
    GAUGE = "gauge"          # Can go up and down
    HISTOGRAM = "histogram"  # Distribution of values


@dataclass
class MetricValue:
    """A single metric value with optional labels.

    Attributes:
        name: Metric name
        value: Current value
        labels: Key-value labels for dimensions
        metric_type: Type of metric
        timestamp: When the metric was recorded
        description: Help text for the metric
    """
    name: str
    value: float
    labels: Dict[str, str] = field(default_factory=dict)
    metric_type: MetricType = MetricType.GAUGE
    timestamp: float = field(default_factory=time.time)
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "name": self.name,
            "value": self.value,
            "labels": self.labels,
            "metric_type": self.metric_type.value,
            "timestamp": self.timestamp,
            "description": self.description,
        }


class MetricsCollector:
    """Central metrics collection and aggregation.

    Thread-safe collector supporting:
    - Counter, Gauge, Histogram metric types
    - Multi-dimensional labels
    - Automatic aggregation
    - Configurable retention

    Example:
        >>> collector = MetricsCollector()
        >>> collector.record_agent_task("Coder", 1.5, True)
        >>> collector.record_cache_hit(True)
        >>> stats = collector.get_agent_stats("Coder")
    """

    # Metric name prefixes following Prometheus naming conventions
    PREFIX = "orchestrator_"

    # Default retention for histogram buckets
    DEFAULT_HISTOGRAM_BUCKETS = [
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0
    ]

    def __init__(
        self,
        prefix: str = PREFIX,
        retention_seconds: float = 3600.0,  # 1 hour
        max_histogram_samples: int = 1000,
    ):
        """Initialize the metrics collector.

        Args:
            prefix: Metric name prefix
            retention_seconds: How long to keep detailed samples
            max_histogram_samples: Max samples per histogram
        """
        self._prefix = prefix
        self._retention = retention_seconds
        self._max_samples = max_histogram_samples
        self._lock = threading.RLock()

        # Counters: name -> labels_key -> cumulative value
        self._counters: Dict[str, Dict[str, float]] = defaultdict(
            lambda: defaultdict(float)
        )

        # Gauges: name -> labels_key -> current value
        self._gauges: Dict[str, Dict[str, float]] = defaultdict(
            lambda: defaultdict(float)
        )

        # Histograms: name -> labels_key -> list of samples
        self._histograms: Dict[str, Dict[str, List[float]]] = defaultdict(
            lambda: defaultdict(list)
        )

        # Metric descriptions for Prometheus HELP text
        self._descriptions: Dict[str, str] = {}

        # Track label keys for each metric
        self._label_keys: Dict[str, set] = defaultdict(set)

        # Register standard orchestrator metrics
        self._register_standard_metrics()

    def _register_standard_metrics(self) -> None:
        """Register all standard orchestrator metrics with descriptions."""
        # Agent Performance
        self.register_metric(
            "agent_tasks_total",
            "Total number of agent tasks by status",
            MetricType.COUNTER,
        )
        self.register_metric(
            "agent_duration_seconds",
            "Agent task duration in seconds",
            MetricType.HISTOGRAM,
        )
        self.register_metric(
            "agent_success_rate",
            "Agent success rate (0-1)",
            MetricType.GAUGE,
        )

        # Budget & Cache
        self.register_metric(
            "budget_tokens_total",
            "Total tokens used by budget tier",
            MetricType.COUNTER,
        )
        self.register_metric(
            "cache_hits_total",
            "Total cache hits",
            MetricType.COUNTER,
        )
        self.register_metric(
            "cache_misses_total",
            "Total cache misses",
            MetricType.COUNTER,
        )
        self.register_metric(
            "cache_hit_rate",
            "Cache hit rate (0-1)",
            MetricType.GAUGE,
        )

        # Rate Limiting
        self.register_metric(
            "rate_limit_requests_total",
            "Total rate limit requests by status",
            MetricType.COUNTER,
        )
        self.register_metric(
            "rate_limit_current_tokens",
            "Current tokens in rate limiter bucket",
            MetricType.GAUGE,
        )

        # A/B Testing
        self.register_metric(
            "ab_experiments_active",
            "Number of active A/B experiments",
            MetricType.GAUGE,
        )
        self.register_metric(
            "ab_variant_requests_total",
            "Total requests per A/B variant",
            MetricType.COUNTER,
        )

        # Lock Contention
        self.register_metric(
            "lock_acquisitions_total",
            "Total lock acquisitions by lock name",
            MetricType.COUNTER,
        )
        self.register_metric(
            "lock_wait_seconds",
            "Time spent waiting for locks",
            MetricType.HISTOGRAM,
        )

    def register_metric(
        self,
        name: str,
        description: str,
        metric_type: MetricType,
    ) -> None:
        """Register a metric with its description.

        Args:
            name: Metric name (without prefix)
            description: Help text for the metric
            metric_type: Type of the metric
        """
        full_name = f"{self._prefix}{name}"
        with self._lock:
            self._descriptions[full_name] = description

    def _labels_to_key(self, labels: Dict[str, str]) -> str:
        """Convert labels dict to a hashable key."""
        if not labels:
            return ""
        return ",".join(f"{k}={v}" for k, v in sorted(labels.items()))

    def _record_labels(self, name: str, labels: Dict[str, str]) -> None:
        """Track label keys used for a metric."""
        with self._lock:
            self._label_keys[name].update(labels.keys())

    # =========================================================================
    # Agent Performance Metrics
    # =========================================================================

    def record_agent_task(
        self,
        agent: str,
        duration: float,
        success: bool,
        task_type: Optional[str] = None,
    ) -> None:
        """Record an agent task execution.

        Args:
            agent: Agent name (e.g., "Coder", "Analyzer")
            duration: Task duration in seconds
            success: Whether the task succeeded
            task_type: Optional task type classification
        """
        labels = {"agent": agent}
        if task_type:
            labels["task_type"] = task_type

        # Increment task counter
        status = "success" if success else "failure"
        self._increment_counter(
            "agent_tasks_total",
            {**labels, "status": status}
        )

        # Record duration histogram
        self._record_histogram("agent_duration_seconds", duration, labels)

        # Update success rate gauge
        stats = self.get_agent_stats(agent)
        self._set_gauge("agent_success_rate", stats["success_rate"], labels)

        logger.debug(
            f"Recorded agent task: {agent}, duration={duration:.3f}s, "
            f"success={success}"
        )

    def get_agent_stats(self, agent: str) -> Dict[str, Any]:
        """Get aggregated stats for an agent.

        Args:
            agent: Agent name

        Returns:
            Dict with success_count, failure_count, success_rate, avg_duration
        """
        with self._lock:
            success_key = self._labels_to_key({"agent": agent, "status": "success"})
            failure_key = self._labels_to_key({"agent": agent, "status": "failure"})

            full_name = f"{self._prefix}agent_tasks_total"
            success_count = self._counters[full_name].get(success_key, 0)
            failure_count = self._counters[full_name].get(failure_key, 0)
            total = success_count + failure_count

            success_rate = success_count / total if total > 0 else 0.0

            # Calculate average duration from histogram
            duration_name = f"{self._prefix}agent_duration_seconds"
            label_key = self._labels_to_key({"agent": agent})
            samples = self._histograms[duration_name].get(label_key, [])
            avg_duration = sum(samples) / len(samples) if samples else 0.0

            return {
                "agent": agent,
                "success_count": int(success_count),
                "failure_count": int(failure_count),
                "total_count": int(total),
                "success_rate": round(success_rate, 4),
                "avg_duration": round(avg_duration, 4),
            }

    # =========================================================================
    # Budget & Cache Metrics
    # =========================================================================

    def record_budget_tokens(
        self,
        tokens: int,
        tier: str = "default",
    ) -> None:
        """Record token budget usage.

        Args:
            tokens: Number of tokens used
            tier: Budget tier (simple, medium, complex, very_complex)
        """
        self._increment_counter(
            "budget_tokens_total",
            {"tier": tier},
            amount=tokens,
        )

    def record_cache_hit(self, hit: bool, cache_type: str = "default") -> None:
        """Record a cache hit or miss.

        Args:
            hit: True if cache hit, False if miss
            cache_type: Type of cache (budget, predictive, etc.)
        """
        labels = {"cache_type": cache_type}
        if hit:
            self._increment_counter("cache_hits_total", labels)
        else:
            self._increment_counter("cache_misses_total", labels)

        # Update hit rate gauge
        stats = self.get_cache_stats(cache_type)
        self._set_gauge("cache_hit_rate", stats["hit_rate"], labels)

    def get_cache_stats(self, cache_type: str = "default") -> Dict[str, Any]:
        """Get cache statistics.

        Args:
            cache_type: Type of cache

        Returns:
            Dict with hits, misses, hit_rate
        """
        with self._lock:
            labels = {"cache_type": cache_type}
            hit_key = self._labels_to_key(labels)
            miss_key = self._labels_to_key(labels)

            hits_name = f"{self._prefix}cache_hits_total"
            misses_name = f"{self._prefix}cache_misses_total"

            hits = self._counters[hits_name].get(hit_key, 0)
            misses = self._counters[misses_name].get(miss_key, 0)
            total = hits + misses

            hit_rate = hits / total if total > 0 else 0.0

            return {
                "cache_type": cache_type,
                "hits": int(hits),
                "misses": int(misses),
                "total": int(total),
                "hit_rate": round(hit_rate, 4),
            }

    # =========================================================================
    # Rate Limiting Metrics
    # =========================================================================

    def record_rate_limit(
        self,
        allowed: bool,
        endpoint: str = "default",
    ) -> None:
        """Record a rate limit check.

        Args:
            allowed: True if request was allowed
            endpoint: Endpoint or resource being rate limited
        """
        status = "allowed" if allowed else "rejected"
        self._increment_counter(
            "rate_limit_requests_total",
            {"status": status, "endpoint": endpoint},
        )

    def set_rate_limit_tokens(
        self,
        tokens: float,
        bucket: str = "default",
    ) -> None:
        """Set current rate limiter token count.

        Args:
            tokens: Current token count
            bucket: Token bucket identifier
        """
        self._set_gauge(
            "rate_limit_current_tokens",
            tokens,
            {"bucket": bucket},
        )

    # =========================================================================
    # A/B Testing Metrics
    # =========================================================================

    def set_ab_experiments_active(self, count: int) -> None:
        """Set number of active A/B experiments.

        Args:
            count: Number of active experiments
        """
        self._set_gauge("ab_experiments_active", count)

    def record_ab_variant_request(
        self,
        experiment: str,
        variant: str,
    ) -> None:
        """Record an A/B variant assignment.

        Args:
            experiment: Experiment name
            variant: Variant name (control, treatment)
        """
        self._increment_counter(
            "ab_variant_requests_total",
            {"experiment": experiment, "variant": variant},
        )

    # =========================================================================
    # Lock Contention Metrics
    # =========================================================================

    def record_lock_acquisition(
        self,
        lock_name: str,
        wait_seconds: float = 0.0,
        success: bool = True,
    ) -> None:
        """Record a lock acquisition.

        Args:
            lock_name: Name of the lock
            wait_seconds: Time spent waiting for the lock
            success: Whether acquisition succeeded
        """
        labels = {"lock_name": lock_name, "success": str(success).lower()}
        self._increment_counter("lock_acquisitions_total", labels)

        if wait_seconds > 0:
            self._record_histogram(
                "lock_wait_seconds",
                wait_seconds,
                {"lock_name": lock_name},
            )

    # =========================================================================
    # Low-level Metric Operations
    # =========================================================================

    def _increment_counter(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None,
        amount: float = 1.0,
    ) -> None:
        """Increment a counter metric."""
        labels = labels or {}
        full_name = f"{self._prefix}{name}"
        label_key = self._labels_to_key(labels)
        with self._lock:
            self._record_labels(full_name, labels)
            self._counters[full_name][label_key] += amount

    def _set_gauge(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None,
    ) -> None:
        """Set a gauge metric value."""
        labels = labels or {}
        full_name = f"{self._prefix}{name}"
        label_key = self._labels_to_key(labels)
        with self._lock:
            self._record_labels(full_name, labels)
            self._gauges[full_name][label_key] = value

    def _record_histogram(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None,
    ) -> None:
        """Record a histogram sample."""
        labels = labels or {}
        full_name = f"{self._prefix}{name}"
        label_key = self._labels_to_key(labels)
        with self._lock:
            self._record_labels(full_name, labels)
            samples = self._histograms[full_name][label_key]
            samples.append(value)
            # Enforce max samples limit
            if len(samples) > self._max_samples:
                self._histograms[full_name][label_key] = samples[-self._max_samples:]

    # =========================================================================
    # Retrieval Methods
    # =========================================================================

    def get_all_metrics(self) -> List[MetricValue]:
        """Get all current metric values.

        Returns:
            List of MetricValue objects
        """
        metrics: List[MetricValue] = []

        with self._lock:
            # Collect counters
            for name, label_values in self._counters.items():
                desc = self._descriptions.get(name, "")
                for label_key, value in label_values.items():
                    labels = self._parse_label_key(label_key)
                    metrics.append(MetricValue(
                        name=name,
                        value=value,
                        labels=labels,
                        metric_type=MetricType.COUNTER,
                        description=desc,
                    ))

            # Collect gauges
            for name, label_values in self._gauges.items():
                desc = self._descriptions.get(name, "")
                for label_key, value in label_values.items():
                    labels = self._parse_label_key(label_key)
                    metrics.append(MetricValue(
                        name=name,
                        value=value,
                        labels=labels,
                        metric_type=MetricType.GAUGE,
                        description=desc,
                    ))

            # Collect histogram summaries
            for name, label_samples in self._histograms.items():
                desc = self._descriptions.get(name, "")
                for label_key, samples in label_samples.items():
                    if not samples:
                        continue
                    labels = self._parse_label_key(label_key)

                    # Calculate histogram buckets
                    buckets = self._calculate_buckets(samples)
                    for bucket_upper, count in buckets.items():
                        bucket_labels = {**labels, "le": str(bucket_upper)}
                        metrics.append(MetricValue(
                            name=f"{name}_bucket",
                            value=count,
                            labels=bucket_labels,
                            metric_type=MetricType.COUNTER,
                            description=desc,
                        ))

                    # Add sum and count
                    metrics.append(MetricValue(
                        name=f"{name}_sum",
                        value=sum(samples),
                        labels=labels,
                        metric_type=MetricType.COUNTER,
                        description=f"{desc} (sum)",
                    ))
                    metrics.append(MetricValue(
                        name=f"{name}_count",
                        value=len(samples),
                        labels=labels,
                        metric_type=MetricType.COUNTER,
                        description=f"{desc} (count)",
                    ))

        # Sort metrics alphabetically by name for consistent ordering
        metrics.sort(key=lambda m: m.name)
        return metrics

    def _parse_label_key(self, label_key: str) -> Dict[str, str]:
        """Parse a label key back to a dict."""
        if not label_key:
            return {}
        labels = {}
        for part in label_key.split(","):
            if "=" in part:
                k, v = part.split("=", 1)
                labels[k] = v
        return labels

    def _calculate_buckets(
        self,
        samples: List[float],
    ) -> Dict[float, int]:
        """Calculate histogram bucket counts."""
        buckets: Dict[float, int] = {}
        for bucket in self.DEFAULT_HISTOGRAM_BUCKETS:
            buckets[bucket] = sum(1 for s in samples if s <= bucket)
        buckets[float("inf")] = len(samples)  # +Inf bucket
        return buckets

    def get_metric(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None,
    ) -> Optional[MetricValue]:
        """Get a specific metric value.

        Args:
            name: Metric name (with or without prefix)
            labels: Optional labels to match

        Returns:
            MetricValue if found, None otherwise
        """
        full_name = name if name.startswith(self._prefix) else f"{self._prefix}{name}"
        label_key = self._labels_to_key(labels or {})

        with self._lock:
            # Check counters
            if full_name in self._counters:
                if label_key in self._counters[full_name]:
                    return MetricValue(
                        name=full_name,
                        value=self._counters[full_name][label_key],
                        labels=labels or {},
                        metric_type=MetricType.COUNTER,
                        description=self._descriptions.get(full_name, ""),
                    )

            # Check gauges
            if full_name in self._gauges:
                if label_key in self._gauges[full_name]:
                    return MetricValue(
                        name=full_name,
                        value=self._gauges[full_name][label_key],
                        labels=labels or {},
                        metric_type=MetricType.GAUGE,
                        description=self._descriptions.get(full_name, ""),
                    )

        return None

    def clear(self) -> None:
        """Clear all collected metrics."""
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()
            self._label_keys.clear()

    def cleanup_expired(self) -> int:
        """Remove samples exceeding max_samples limit.

        Returns:
            Number of samples removed
        """
        removed = 0
        with self._lock:
            for name in list(self._histograms.keys()):
                for label_key in list(self._histograms[name].keys()):
                    samples = self._histograms[name][label_key]
                    if len(samples) > self._max_samples:
                        # Keep only the most recent samples
                        excess = len(samples) - self._max_samples
                        self._histograms[name][label_key] = samples[-self._max_samples:]
                        removed += excess
        return removed


# Singleton instance
_collector: Optional[MetricsCollector] = None
_collector_lock = threading.Lock()


def get_collector() -> MetricsCollector:
    """Get the singleton MetricsCollector instance.

    Returns:
        MetricsCollector singleton
    """
    global _collector
    with _collector_lock:
        if _collector is None:
            _collector = MetricsCollector()
        return _collector


def reset_collector() -> None:
    """Reset the singleton collector (for testing)."""
    global _collector
    with _collector_lock:
        if _collector is not None:
            _collector.clear()
        _collector = None
