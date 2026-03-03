/**
 * ObservabilityModule - Production-ready observability solution
 * Provides metrics collection, distributed tracing, structured logging, and alerting
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  tags: Record<string, string>;
  timestamp: number;
  sum?: number;
  count?: number;
  min?: number;
  max?: number;
}

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  duration?: number;
  tags: Record<string, string>;
  status: 'ok' | 'error';
  logs?: Array<{ timestamp: number; message: string; level: string }>;
}

interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  correlationId: string;
}

interface AlertRule {
  id: string;
  name: string;
  type: 'threshold' | 'rate_increase' | 'anomaly';
  metricName: string;
  threshold?: number;
  comparison?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  windowMs?: number;
  rateThreshold?: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldownMs: number;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metricName: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

interface HistogramBucket {
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[];
}

interface ObservabilityConfig {
  // Metrics configuration
  maxMetrics?: number;
  metricsRetentionMs?: number;
  metricsFlushIntervalMs?: number;

  // Tracing configuration
  samplingRate?: number; // 0.0 to 1.0, default 0.01 (1%)
  maxSpans?: number;
  spanRetentionMs?: number;

  // Logging configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  maxLogs?: number;
  logRetentionMs?: number;

  // Alerting configuration
  alertCheckIntervalMs?: number;

  // Export configuration
  exportPath?: string;
  autoExport?: boolean;
  exportIntervalMs?: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a random hex string of specified length
 */
function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a unique trace ID (16 bytes = 32 hex chars)
 */
function generateTraceId(): string {
  return randomHex(32);
}

/**
 * Generate a unique span ID (8 bytes = 16 hex chars)
 */
function generateSpanId(): string {
  return randomHex(16);
}

/**
 * Generate W3C traceparent header format
 * Format: version-traceId-parentId-flags
 * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */
function generateTraceParent(traceId: string, spanId: string): string {
  return `00-${traceId}-${spanId}-01`;
}

/**
 * Parse W3C traceparent header
 */
function parseTraceParent(traceParent: string): { traceId: string; spanId: string } | null {
  const parts = traceParent.split('-');
  if (parts.length !== 4 || parts[0] !== '00') {
    return null;
  }
  return {
    traceId: parts[1],
    spanId: parts[2]
  };
}

/**
 * Get correlation ID from context or generate new one
 */
function getCorrelationId(context?: Record<string, unknown>): string {
  if (context?.correlationId && typeof context.correlationId === 'string') {
    return context.correlationId;
  }
  return randomHex(16);
}

/**
 * Normalize metric name (convert to dot notation, lowercase)
 */
function normalizeMetricName(name: string): string {
  return name
    .replace(/[/\s]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
}

/**
 * Hash tags for metric aggregation
 */
function hashTags(tags: Record<string, string>): string {
  const sortedKeys = Object.keys(tags).sort();
  return sortedKeys.map(k => `${k}:${tags[k]}`).join(',');
}

/**
 * Debounce function to limit execution frequency
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitMs);
  };
}

// =============================================================================
// ROLLING BUFFER IMPLEMENTATION
// =============================================================================

/**
 * Thread-safe rolling buffer for efficient memory usage
 * Automatically evicts oldest entries when capacity is reached
 */
class RollingBuffer<T> {
  private buffer: Map<string, T>;
  private timestamps: Map<string, number>;
  private maxEntries: number;
  private retentionMs: number;

  constructor(maxEntries: number, retentionMs: number) {
    this.buffer = new Map();
    this.timestamps = new Map();
    this.maxEntries = maxEntries;
    this.retentionMs = retentionMs;
  }

  /**
   * Set a value in the buffer
   */
  set(key: string, value: T): void {
    const now = Date.now();
    this.cleanup(now);

    // Evict oldest if at capacity
    if (this.buffer.size >= this.maxEntries && !this.buffer.has(key)) {
      let oldestKey = '';
      let oldestTime = Infinity;

      for (const [k, ts] of this.timestamps) {
        if (ts < oldestTime) {
          oldestTime = ts;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.buffer.delete(oldestKey);
        this.timestamps.delete(oldestKey);
      }
    }

    this.buffer.set(key, value);
    this.timestamps.set(key, now);
  }

  /**
   * Get a value from the buffer
   */
  get(key: string): T | undefined {
    const now = Date.now();
    this.cleanup(now);
    return this.buffer.get(key);
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    const now = Date.now();
    this.cleanup(now);
    return this.buffer.has(key);
  }

  /**
   * Delete a key
   */
  delete(key: string): boolean {
    this.buffer.delete(key);
    return this.timestamps.delete(key);
  }

  /**
   * Get all values
   */
  values(): T[] {
    const now = Date.now();
    this.cleanup(now);
    return Array.from(this.buffer.values());
  }

  /**
   * Get all entries
   */
  entries(): [string, T][] {
    const now = Date.now();
    this.cleanup(now);
    return Array.from(this.buffer.entries()).map(([k, v]) => [k, v] as [string, T]);
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.size;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.buffer.clear();
    this.timestamps.clear();
  }

  /**
   * Remove expired entries based on retention time
   */
  private cleanup(now: number): void {
    const cutoffTime = now - this.retentionMs;
    for (const [key, timestamp] of this.timestamps) {
      if (timestamp < cutoffTime) {
        this.buffer.delete(key);
        this.timestamps.delete(key);
      }
    }
  }

  /**
   * Get entries within time window
   */
  getInTimeWindow(windowMs: number): T[] {
    const now = Date.now();
    const cutoffTime = now - windowMs;
    const result: T[] = [];

    for (const [key, timestamp] of this.timestamps) {
      if (timestamp >= cutoffTime) {
        const value = this.buffer.get(key);
        if (value) result.push(value);
      }
    }

    return result;
  }
}

// =============================================================================
// METRICS STORAGE
// =============================================================================

/**
 * Thread-safe metrics storage with aggregation
 */
class MetricsStorage {
  private counters: RollingBuffer<MetricData>;
  private gauges: RollingBuffer<MetricData>;
  private histograms: RollingBuffer<MetricData>;
  private histogramBuckets: Map<string, HistogramBucket>;

  constructor(maxMetrics: number, retentionMs: number) {
    this.counters = new RollingBuffer(maxMetrics, retentionMs);
    this.gauges = new RollingBuffer(maxMetrics, retentionMs);
    this.histograms = new RollingBuffer(maxMetrics, retentionMs);
    this.histogramBuckets = new Map();
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number, tags: Record<string, string>): void {
    const key = `${name}:${hashTags(tags)}`;
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
      this.counters.set(key, existing);
    } else {
      this.counters.set(key, {
        name,
        type: 'counter',
        value,
        tags,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, tags: Record<string, string>): void {
    const key = `${name}:${hashTags(tags)}`;
    this.gauges.set(key, {
      name,
      type: 'gauge',
      value,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, tags: Record<string, string>): void {
    const key = `${name}:${hashTags(tags)}`;
    const bucketKey = `hist:${key}`;

    let bucket = this.histogramBuckets.get(bucketKey);
    if (!bucket) {
      bucket = { count: 0, sum: 0, min: Infinity, max: -Infinity, values: [] };
      this.histogramBuckets.set(bucketKey, bucket);
    }

    bucket.count++;
    bucket.sum += value;
    bucket.min = Math.min(bucket.min, value);
    bucket.max = Math.max(bucket.max, value);
    bucket.values.push(value);

    // Keep only last 1000 values for memory efficiency
    if (bucket.values.length > 1000) {
      bucket.values.shift();
    }

    this.histograms.set(key, {
      name,
      type: 'histogram',
      value,
      tags,
      timestamp: Date.now(),
      count: bucket.count,
      sum: bucket.sum,
      min: bucket.min,
      max: bucket.max
    });
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): MetricData[] {
    return [
      ...this.counters.values(),
      ...this.gauges.values(),
      ...this.histograms.values()
    ];
  }

  /**
   * Get metrics by name pattern
   */
  getMetricsByPattern(pattern: string): MetricData[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return this.getAllMetrics().filter(m => regex.test(m.name));
  }

  /**
   * Get metrics in time window
   */
  getMetricsInTimeWindow(windowMs: number): MetricData[] {
    // For simplicity, return current snapshot
    // In production, you'd store time-series data
    return this.getAllMetrics();
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.histogramBuckets.clear();
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, tags: Record<string, string>): { count: number; sum: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } | null {
    const key = `${name}:${hashTags(tags)}`;
    const bucketKey = `hist:${key}`;
    const bucket = this.histogramBuckets.get(bucketKey);

    if (!bucket || bucket.count === 0) return null;

    const sorted = [...bucket.values].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      count: bucket.count,
      sum: bucket.sum,
      min: bucket.min,
      max: bucket.max,
      avg: bucket.sum / bucket.count,
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }
}

// =============================================================================
// TRACE STORAGE
// =============================================================================

/**
 * Storage for distributed tracing spans
 */
class TraceStorage {
  private spans: RollingBuffer<Span>;
  private activeSpans: Map<string, Span>; // spanId -> Span
  private traceIndex: Map<string, Set<string>>; // traceId -> Set of spanIds

  constructor(maxSpans: number, retentionMs: number) {
    this.spans = new RollingBuffer(maxSpans, retentionMs);
    this.activeSpans = new Map();
    this.traceIndex = new Map();
  }

  /**
   * Start a new span
   */
  startSpan(span: Span): void {
    this.activeSpans.set(span.spanId, span);

    if (!this.traceIndex.has(span.traceId)) {
      this.traceIndex.set(span.traceId, new Set());
    }
    this.traceIndex.get(span.traceId)!.add(span.spanId);
  }

  /**
   * Finish a span
   */
  finishSpan(span: Span): void {
    const now = Date.now();
    span.duration = now - span.startTime;

    this.activeSpans.delete(span.spanId);
    this.spans.set(span.spanId, span);
  }

  /**
   * Get an active span by ID
   */
  getActiveSpan(spanId: string): Span | undefined {
    return this.activeSpans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTrace(traceId: string): Span[] {
    const spanIds = this.traceIndex.get(traceId);
    if (!spanIds) return [];

    const result: Span[] = [];
    for (const spanId of spanIds) {
      const span = this.spans.get(spanId) || this.activeSpans.get(spanId);
      if (span) result.push(span);
    }

    return result.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get all completed spans
   */
  getAllSpans(): Span[] {
    return this.spans.values();
  }

  /**
   * Get spans in time window
   */
  getSpansInTimeWindow(windowMs: number): Span[] {
    return this.spans.getInTimeWindow(windowMs);
  }

  /**
   * Clear all spans
   */
  clear(): void {
    this.spans.clear();
    this.activeSpans.clear();
    this.traceIndex.clear();
  }
}

// =============================================================================
// LOG STORAGE
// =============================================================================

/**
 * Storage for structured logs
 */
class LogStorage {
  private logs: RollingBuffer<LogEntry>;
  private correlationIndex: Map<string, string[]>; // correlationId -> array of log keys

  constructor(maxLogs: number, retentionMs: number) {
    this.logs = new RollingBuffer(maxLogs, retentionMs);
    this.correlationIndex = new Map();
  }

  /**
   * Add a log entry
   */
  add(entry: LogEntry): void {
    const key = `log:${entry.timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    this.logs.set(key, entry);

    // Index by correlation ID
    const corrId = entry.correlationId;
    if (!this.correlationIndex.has(corrId)) {
      this.correlationIndex.set(corrId, []);
    }
    this.correlationIndex.get(corrId)!.push(key);
  }

  /**
   * Get logs by correlation ID
   */
  getByCorrelationId(correlationId: string): LogEntry[] {
    const keys = this.correlationIndex.get(correlationId);
    if (!keys) return [];

    const result: LogEntry[] = [];
    for (const key of keys) {
      const entry = this.logs.get(key);
      if (entry) result.push(entry);
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get logs by trace ID
   */
  getByTraceId(traceId: string): LogEntry[] {
    return this.logs.values().filter(log => log.traceId === traceId);
  }

  /**
   * Get all logs
   */
  getAll(): LogEntry[] {
    return this.logs.values();
  }

  /**
   * Query logs with filters
   */
  query(filters: {
    level?: string;
    minLevel?: string;
    startTime?: number;
    endTime?: number;
    messagePattern?: string;
  } = {}): LogEntry[] {
    let result = this.logs.values();

    if (filters.level) {
      result = result.filter(log => log.level === filters.level);
    }

    if (filters.minLevel) {
      const levels = ['debug', 'info', 'warn', 'error'];
      const minIdx = levels.indexOf(filters.minLevel);
      result = result.filter(log => levels.indexOf(log.level) >= minIdx);
    }

    if (filters.startTime) {
      result = result.filter(log => log.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      result = result.filter(log => log.timestamp <= filters.endTime!);
    }

    if (filters.messagePattern) {
      const regex = new RegExp(filters.messagePattern, 'i');
      result = result.filter(log => regex.test(log.message));
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs.clear();
    this.correlationIndex.clear();
  }
}

// =============================================================================
// ALERTING ENGINE
// =============================================================================

/**
 * Alerting engine with threshold, rate, and anomaly detection
 */
class AlertingEngine {
  private rules: Map<string, AlertRule>;
  private activeAlerts: Map<string, Alert>;
  private lastAlertTimes: Map<string, number>;
  private metricHistory: Map<string, Array<{ value: number; timestamp: number }>>;
  private maxHistorySize: number;

  constructor() {
    this.rules = new Map();
    this.activeAlerts = new Map();
    this.lastAlertTimes = new Map();
    this.metricHistory = new Map();
    this.maxHistorySize = 100;
  }

  /**
   * Add or update an alert rule
   */
  setRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Update metric history
   */
  updateMetricHistory(name: string, value: number): void {
    if (!this.metricHistory.has(name)) {
      this.metricHistory.set(name, []);
    }

    const history = this.metricHistory.get(name)!;
    history.push({ value, timestamp: Date.now() });

    // Keep only recent history
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Get metric history
   */
  getMetricHistory(name: string, windowMs?: number): Array<{ value: number; timestamp: number }> {
    const history = this.metricHistory.get(name);
    if (!history) return [];

    if (!windowMs) return history;

    const cutoff = Date.now() - windowMs;
    return history.filter(h => h.timestamp >= cutoff);
  }

  /**
   * Evaluate alert rules and return triggered alerts
   */
  evaluate(metrics: MetricsStorage): Alert[] {
    const newAlerts: Alert[] = [];
    const now = Date.now();

    // Update metric history from current metrics
    for (const metric of metrics.getAllMetrics()) {
      this.updateMetricHistory(metric.name, metric.value);
    }

    // Evaluate each rule
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlert = this.lastAlertTimes.get(rule.id);
      if (lastAlert && now - lastAlert < rule.cooldownMs) {
        continue;
      }

      const alert = this.evaluateRule(rule, metrics);
      if (alert) {
        newAlerts.push(alert);
        this.activeAlerts.set(alert.id, alert);
        this.lastAlertTimes.set(rule.id, now);
      }
    }

    return newAlerts;
  }

  /**
   * Evaluate a single alert rule
   */
  private evaluateRule(rule: AlertRule, metrics: MetricsStorage): Alert | null {
    const matchingMetrics = metrics.getMetricsByPattern(rule.metricName);

    if (matchingMetrics.length === 0) return null;

    const aggregatedValue = this.aggregateMetrics(matchingMetrics);

    switch (rule.type) {
      case 'threshold':
        return this.evaluateThresholdRule(rule, aggregatedValue);
      case 'rate_increase':
        return this.evaluateRateRule(rule);
      case 'anomaly':
        return this.evaluateAnomalyRule(rule);
      default:
        return null;
    }
  }

  /**
   * Aggregate multiple metric values
   */
  private aggregateMetrics(metrics: MetricData[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  /**
   * Evaluate threshold-based rule
   */
  private evaluateThresholdRule(rule: AlertRule, value: number): Alert | null {
    if (rule.threshold === undefined) return null;

    let triggered = false;
    switch (rule.comparison) {
      case 'gt':
        triggered = value > rule.threshold;
        break;
      case 'lt':
        triggered = value < rule.threshold;
        break;
      case 'eq':
        triggered = value === rule.threshold;
        break;
      case 'gte':
        triggered = value >= rule.threshold;
        break;
      case 'lte':
        triggered = value <= rule.threshold;
        break;
    }

    if (!triggered) return null;

    return {
      id: `alert-${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Threshold alert: ${rule.metricName} is ${value} (threshold: ${rule.threshold})`,
      metricName: rule.metricName,
      currentValue: value,
      threshold: rule.threshold,
      timestamp: Date.now(),
      metadata: { ruleType: 'threshold' }
    };
  }

  /**
   * Evaluate rate increase rule
   */
  private evaluateRateRule(rule: AlertRule): Alert | null {
    const history = this.getMetricHistory(rule.metricName, rule.windowMs || 60000);
    if (history.length < 2) return null;

    const recent = history.slice(-Math.floor(history.length / 2));
    const older = history.slice(0, Math.floor(history.length / 2));

    const recentAvg = recent.reduce((s, h) => s + h.value, 0) / recent.length;
    const olderAvg = older.reduce((s, h) => s + h.value, 0) / older.length;

    if (olderAvg === 0) return null;

    const rateIncrease = ((recentAvg - olderAvg) / olderAvg) * 100;
    const threshold = rule.rateThreshold || 50;

    if (rateIncrease < threshold) return null;

    return {
      id: `alert-${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Rate increase alert: ${rule.metricName} increased by ${rateIncrease.toFixed(1)}%`,
      metricName: rule.metricName,
      currentValue: recentAvg,
      threshold: threshold,
      timestamp: Date.now(),
      metadata: { ruleType: 'rate_increase', rateIncrease, recentAvg, olderAvg }
    };
  }

  /**
   * Evaluate anomaly detection rule using Z-score
   */
  private evaluateAnomalyRule(rule: AlertRule): Alert | null {
    const history = this.getMetricHistory(rule.metricName, 300000); // 5 minutes
    if (history.length < 10) return null;

    const values = history.map(h => h.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return null;

    const currentValue = values[values.length - 1];
    const zScore = Math.abs((currentValue - mean) / stdDev);

    // Alert if Z-score > 3 (statistically significant anomaly)
    if (zScore < 3) return null;

    return {
      id: `alert-${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Anomaly detected: ${rule.metricName} has Z-score of ${zScore.toFixed(2)}`,
      metricName: rule.metricName,
      currentValue: currentValue,
      threshold: 3,
      timestamp: Date.now(),
      metadata: { ruleType: 'anomaly', zScore, mean, stdDev }
    };
  }

  /**
   * Clear active alerts
   */
  clearAlerts(): void {
    this.activeAlerts.clear();
  }

  /**
   * Clear metric history
   */
  clearHistory(): void {
    this.metricHistory.clear();
  }
}

// =============================================================================
// PROMETHEUS EXPORTER
// =============================================================================

/**
 * Export metrics in Prometheus format
 */
class PrometheusExporter {
  /**
   * Convert metrics to Prometheus text format
   */
  static export(metrics: MetricData[]): string {
    const lines: string[] = [];

    // Group metrics by name and type
    const grouped = new Map<string, { type: string; metrics: MetricData[] }>();

    for (const metric of metrics) {
      const key = metric.name;
      if (!grouped.has(key)) {
        grouped.set(key, { type: metric.type, metrics: [] });
      }
      grouped.get(key)!.metrics.push(metric);
    }

    // Generate Prometheus format
    for (const [name, data] of grouped) {
      // Type hint
      lines.push(`# TYPE ${name} ${data.type}`);

      // Unit hint (could be added via metadata in future)
      // lines.push(`# UNIT ${name} <unit>`);

      // Metrics with labels
      for (const metric of data.metrics) {
        const labels = this.formatLabels(metric.tags);
        const value = metric.type === 'histogram'
          ? this.formatHistogramMetric(metric)
          : metric.value.toString();

        if (metric.type === 'histogram') {
          // Histogram gets special treatment
          const stats = this.extractHistogramStats(metric);
          if (stats) {
            if (labels) {
              lines.push(`${name}_count${labels} ${stats.count}`);
              lines.push(`${name}_sum${labels} ${stats.sum}`);
              lines.push(`${name}_bucket{le="+Inf"}${labels.slice(1, -1)} ${stats.count}`);
            }
          }
        } else {
          lines.push(`${name}${labels} ${value}`);
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Format tags as Prometheus labels
   */
  private static formatLabels(tags: Record<string, string>): string {
    const entries = Object.entries(tags).map(([k, v]) => {
      // Escape label values
      const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      return `${k}="${escaped}"`;
    });

    return entries.length > 0 ? `{${entries.join(',')}}` : '';
  }

  /**
   * Format histogram metric
   */
  private static formatHistogramMetric(metric: MetricData): string {
    const parts: string[] = [];
    if (metric.count !== undefined) parts.push(`count:${metric.count}`);
    if (metric.sum !== undefined) parts.push(`sum:${metric.sum}`);
    if (metric.min !== undefined) parts.push(`min:${metric.min}`);
    if (metric.max !== undefined) parts.push(`max:${metric.max}`);
    return parts.length > 0 ? `{${parts.join(',')}}` : '';
  }

  /**
   * Extract histogram stats from metric data
   */
  private static extractHistogramStats(metric: MetricData): { count: number; sum: number } | null {
    if (metric.type !== 'histogram') return null;
    return {
      count: metric.count || 1,
      sum: metric.sum || metric.value
    };
  }
}

// =============================================================================
// JSON EXPORTER
// =============================================================================

/**
 * Export metrics in JSON format
 */
class JsonExporter {
  /**
   * Convert metrics to JSON format
   */
  static export(metrics: MetricData[], spans?: Span[], logs?: LogEntry[]): string {
    const output = {
      timestamp: Date.now(),
      metrics: {
        counters: metrics.filter(m => m.type === 'counter'),
        gauges: metrics.filter(m => m.type === 'gauge'),
        histograms: metrics.filter(m => m.type === 'histogram')
      },
      traces: spans?.map(s => ({
        traceId: s.traceId,
        spanId: s.spanId,
        parentSpanId: s.parentSpanId,
        operation: s.operation,
        startTime: s.startTime,
        duration: s.duration,
        tags: s.tags,
        status: s.status
      })) || [],
      logs: logs?.map(l => ({
        timestamp: l.timestamp,
        level: l.level,
        message: l.message,
        context: l.context,
        traceId: l.traceId,
        spanId: l.spanId,
        correlationId: l.correlationId
      })) || []
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Export for dashboard consumption
   */
  static exportDashboard(metrics: MetricData[], spans?: Span[]): string {
    // Calculate some summary stats
    const totalSpans = spans?.length || 0;
    const errorSpans = spans?.filter(s => s.status === 'error').length || 0;
    const avgDuration = spans && spans.length > 0
      ? spans.reduce((sum, s) => sum + (s.duration || 0), 0) / spans.length
      : 0;

    const output = {
      timestamp: Date.now(),
      summary: {
        totalMetrics: metrics.length,
        totalSpans,
        errorRate: totalSpans > 0 ? (errorSpans / totalSpans) * 100 : 0,
        avgSpanDuration: avgDuration
      },
      metrics: metrics.map(m => ({
        name: m.name,
        type: m.type,
        value: m.value,
        tags: m.tags
      })),
      recentTraces: spans?.slice(-10).map(s => ({
        traceId: s.traceId,
        operation: s.operation,
        duration: s.duration,
        status: s.status
      })) || []
    };

    return JSON.stringify(output, null, 2);
  }
}

// =============================================================================
// MAIN OBSERVABILITY MODULE
// =============================================================================

export class ObservabilityModule {
  private metrics: MetricsStorage;
  private traces: TraceStorage;
  private logs: LogStorage;
  private alerts: AlertingEngine;
  private config: Required<ObservabilityConfig>;

  private currentTraceId?: string;
  private currentSpanId?: string;
  private correlationId: string;

  private flushTimer?: ReturnType<typeof setInterval>;
  private alertTimer?: ReturnType<typeof setInterval>;
  private exportTimer?: ReturnType<typeof setInterval>;

  private isShutdown: boolean = false;

  // Async operation queues for thread safety
  private metricQueue: Array<() => void> = [];
  private logQueue: Array<() => void> = [];
  private isProcessingQueue: boolean = false;

  constructor(config: ObservabilityConfig = {}) {
    // Apply defaults
    this.config = {
      maxMetrics: config.maxMetrics || 10000,
      metricsRetentionMs: config.metricsRetentionMs || 3600000, // 1 hour
      metricsFlushIntervalMs: config.metricsFlushIntervalMs || 60000, // 1 minute
      samplingRate: config.samplingRate || 0.01, // 1%
      maxSpans: config.maxSpans || 50000,
      spanRetentionMs: config.spanRetentionMs || 3600000, // 1 hour
      logLevel: config.logLevel || 'info',
      maxLogs: config.maxLogs || 50000,
      logRetentionMs: config.logRetentionMs || 3600000, // 1 hour
      alertCheckIntervalMs: config.alertCheckIntervalMs || 30000, // 30 seconds
      exportPath: config.exportPath || './observability-export',
      autoExport: config.autoExport || false,
      exportIntervalMs: config.exportIntervalMs || 300000 // 5 minutes
    };

    this.metrics = new MetricsStorage(
      this.config.maxMetrics,
      this.config.metricsRetentionMs
    );

    this.traces = new TraceStorage(
      this.config.maxSpans,
      this.config.spanRetentionMs
    );

    this.logs = new LogStorage(
      this.config.maxLogs,
      this.config.logRetentionMs
    );

    this.alerts = new AlertingEngine();

    // Generate initial correlation ID
    this.correlationId = randomHex(16);

    // Setup default alert rules
    this.setupDefaultAlerts();

    // Start timers
    this.startTimers();

    // Setup async queue processing
    this.setupQueueProcessing();
  }

  // ===========================================================================
  // METRICS API
  // ===========================================================================

  /**
   * Increment a counter metric
   */
  increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    if (this.isShutdown) return;

    const normalized = normalizeMetricName(name);
    this.enqueueMetric(() => {
      this.metrics.incrementCounter(normalized, value, tags);
    });
  }

  /**
   * Set a gauge metric
   */
  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    if (this.isShutdown) return;

    const normalized = normalizeMetricName(name);
    this.enqueueMetric(() => {
      this.metrics.setGauge(normalized, value, tags);
    });
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    if (this.isShutdown) return;

    const normalized = normalizeMetricName(name);
    this.enqueueMetric(() => {
      this.metrics.recordHistogram(normalized, value, tags);
    });
  }

  /**
   * Get current metric value
   */
  getMetric(name: string, tags: Record<string, string> = {}): MetricData | undefined {
    const normalized = normalizeMetricName(name);
    const key = `${normalized}:${hashTags(tags)}`;
    return this.metrics.getAllMetrics().find(m =>
      m.name === normalized && JSON.stringify(m.tags) === JSON.stringify(tags)
    );
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, tags: Record<string, string> = {}) {
    const normalized = normalizeMetricName(name);
    return this.metrics.getHistogramStats(normalized, tags);
  }

  // ===========================================================================
  // TRACING API
  // ===========================================================================

  /**
   * Start a new span
   */
  startSpan(operation: string, parent?: Span): Span {
    if (this.isShutdown) {
      return this.createErrorSpan(operation);
    }

    // Determine trace ID
    let traceId: string;
    if (parent) {
      traceId = parent.traceId;
    } else if (this.currentTraceId) {
      traceId = this.currentTraceId;
    } else {
      traceId = generateTraceId();
      this.currentTraceId = traceId;
    }

    const spanId = generateSpanId();
    const parentSpanId = parent?.spanId || this.currentSpanId;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      operation,
      startTime: Date.now(),
      tags: {},
      status: 'ok',
      logs: []
    };

    this.traces.startSpan(span);
    this.currentSpanId = spanId;

    return span;
  }

  /**
   * Finish a span
   */
  finishSpan(span: Span): void {
    if (this.isShutdown) return;

    span.duration = Date.now() - span.startTime;
    this.traces.finishSpan(span);

    // Clear current span if it matches
    if (this.currentSpanId === span.spanId) {
      this.currentSpanId = undefined;
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Span[] {
    return this.traces.getTrace(traceId);
  }

  /**
   * Get all spans
   */
  getAllSpans(): Span[] {
    return this.traces.getAllSpans();
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): { traceId: string; spanId: string } | null {
    const traceParent = headers['traceparent'] || headers['trace-parent'];
    if (traceParent) {
      return parseTraceParent(traceParent);
    }
    return null;
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(span: Span, headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      'traceparent': generateTraceParent(span.traceId, span.spanId)
    };
  }

  /**
   * Create a child span from trace context
   */
  startSpanFromContext(operation: string, traceContext: { traceId: string; spanId: string }): Span {
    this.currentTraceId = traceContext.traceId;
    this.currentSpanId = traceContext.spanId;

    return this.startSpan(operation);
  }

  // ===========================================================================
  // LOGGING API
  // ===========================================================================

  /**
   * Log a message with structured context
   */
  log(level: string, message: string, context?: Record<string, unknown>): void {
    if (this.isShutdown) return;

    // Check log level
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIdx = levels.indexOf(this.config.logLevel);
    const messageLevelIdx = levels.indexOf(level.toLowerCase());

    if (messageLevelIdx < currentLevelIdx) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level: level.toLowerCase(),
      message,
      context,
      traceId: this.currentTraceId,
      spanId: this.currentSpanId,
      correlationId: getCorrelationId(context)
    };

    this.enqueueLog(() => {
      this.logs.add(entry);
    });
  }

  /**
   * Debug level log
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Info level log
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Warning level log
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Error level log
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  /**
   * Get logs by correlation ID
   */
  getLogsByCorrelationId(correlationId: string): LogEntry[] {
    return this.logs.getByCorrelationId(correlationId);
  }

  /**
   * Get logs by trace ID
   */
  getLogsByTraceId(traceId: string): LogEntry[] {
    return this.logs.getByTraceId(traceId);
  }

  /**
   * Query logs
   */
  queryLogs(filters: {
    level?: string;
    minLevel?: string;
    startTime?: number;
    endTime?: number;
    messagePattern?: string;
  } = {}): LogEntry[] {
    return this.logs.query(filters);
  }

  // ===========================================================================
  // ALERTING API
  // ===========================================================================

  /**
   * Check and return triggered alerts
   */
  checkAlerts(): Alert[] {
    if (this.isShutdown) return [];

    const newAlerts = this.alerts.evaluate(this.metrics);

    // Log new alerts
    for (const alert of newAlerts) {
      this.warn(`Alert triggered: ${alert.message}`, {
        alertId: alert.id,
        ruleId: alert.ruleId,
        severity: alert.severity,
        metricName: alert.metricName,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
    }

    return newAlerts;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.getActiveAlerts();
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alerts.setRule(rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    return this.alerts.removeRule(ruleId);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return this.alerts.getRules();
  }

  /**
   * Clear active alerts
   */
  clearAlerts(): void {
    this.alerts.clearAlerts();
  }

  // ===========================================================================
  // EXPORT API
  // ===========================================================================

  /**
   * Export metrics in specified format
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    const metrics = this.metrics.getAllMetrics();
    const spans = this.traces.getAllSpans();
    const logs = this.logs.getAll();

    switch (format) {
      case 'prometheus':
        return PrometheusExporter.export(metrics);
      case 'json':
        return JsonExporter.export(metrics, spans, logs);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export dashboard data
   */
  exportDashboard(): string {
    return JsonExporter.exportDashboard(
      this.metrics.getAllMetrics(),
      this.traces.getAllSpans()
    );
  }

  /**
   * Export to file (async)
   */
  async exportToFile(
    format: 'json' | 'prometheus' = 'json',
    path?: string
  ): Promise<void> {
    const exportPath = path || this.config.exportPath;
    const data = this.exportMetrics(format);

    // In a real implementation, this would write to filesystem
    // For now, we'll just log the intent
    this.info(`Exporting observability data to ${exportPath}.${format}`, {
      format,
      size: data.length
    });

    // Simulated async export
    return Promise.resolve();
  }

  // ===========================================================================
  // CONTEXT MANAGEMENT
  // ===========================================================================

  /**
   * Set current trace ID
   */
  setTraceId(traceId: string): void {
    this.currentTraceId = traceId;
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string | undefined {
    return this.currentTraceId;
  }

  /**
   * Set current span ID
   */
  setSpanId(spanId: string): void {
    this.currentSpanId = spanId;
  }

  /**
   * Get current span ID
   */
  getSpanId(): string | undefined {
    return this.currentSpanId;
  }

  /**
   * Set correlation ID
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Clear trace context
   */
  clearTraceContext(): void {
    this.currentTraceId = undefined;
    this.currentSpanId = undefined;
  }

  /**
   * Run operation within a trace context
   */
  async withTrace<T>(
    operation: string,
    fn: (span: Span) => Promise<T> | T,
    parent?: Span
  ): Promise<T> {
    const span = this.startSpan(operation, parent);

    try {
      const result = await fn(span);
      span.status = 'ok';
      return result;
    } catch (error) {
      span.status = 'error';
      span.tags.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.finishSpan(span);
    }
  }

  // ===========================================================================
  // LIFECYCLE MANAGEMENT
  // ===========================================================================

  /**
   * Shutdown the observability module
   */
  shutdown(): void {
    this.isShutdown = true;

    // Stop timers
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.alertTimer) clearInterval(this.alertTimer);
    if (this.exportTimer) clearInterval(this.exportTimer);

    // Final flush
    this.flush();

    this.info('Observability module shut down');
  }

  /**
   * Flush pending operations
   */
  flush(): void {
    // Process any remaining queue items
    while (this.metricQueue.length > 0) {
      const fn = this.metricQueue.shift();
      if (fn) fn();
    }

    while (this.logQueue.length > 0) {
      const fn = this.logQueue.shift();
      if (fn) fn();
    }
  }

  /**
   * Reset all stored data
   */
  reset(): void {
    this.metrics.clear();
    this.traces.clear();
    this.logs.clear();
    this.alerts.clearAlerts();
    this.alerts.clearHistory();
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Setup default alert rules
   */
  private setupDefaultAlerts(): void {
    // High error rate alert
    this.alerts.setRule({
      id: 'default-error-rate',
      name: 'High Error Rate',
      type: 'threshold',
      metricName: 'errors.total',
      threshold: 10,
      comparison: 'gte',
      severity: 'warning',
      enabled: true,
      cooldownMs: 60000
    });

    // Latency anomaly alert
    this.alerts.setRule({
      id: 'default-latency-anomaly',
      name: 'Latency Anomaly',
      type: 'anomaly',
      metricName: 'http.request.duration',
      severity: 'warning',
      enabled: true,
      cooldownMs: 120000
    });

    // Memory usage alert
    this.alerts.setRule({
      id: 'default-memory-high',
      name: 'High Memory Usage',
      type: 'threshold',
      metricName: 'process.memory.usage',
      threshold: 0.9,
      comparison: 'gt',
      severity: 'critical',
      enabled: true,
      cooldownMs: 300000
    });
  }

  /**
   * Start periodic timers
   */
  private startTimers(): void {
    // Metrics flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.metricsFlushIntervalMs);

    // Alert check timer
    this.alertTimer = setInterval(() => {
      this.checkAlerts();
    }, this.config.alertCheckIntervalMs);

    // Auto-export timer
    if (this.config.autoExport) {
      this.exportTimer = setInterval(() => {
        this.exportToFile('json').catch(err => {
          this.error(`Export failed: ${err}`);
        });
      }, this.config.exportIntervalMs);
    }
  }

  /**
   * Setup async queue processing
   */
  private setupQueueProcessing(): void {
    // Process metrics queue periodically
    setInterval(() => {
      this.processQueue(this.metricQueue);
    }, 100);

    // Process logs queue periodically
    setInterval(() => {
      this.processQueue(this.logQueue);
    }, 100);
  }

  /**
   * Process queued operations
   */
  private processQueue(queue: Array<() => void>): void {
    const batchSize = 100;
    let processed = 0;

    while (queue.length > 0 && processed < batchSize) {
      const fn = queue.shift();
      if (fn) {
        try {
          fn();
          processed++;
        } catch (error) {
          // Log error but continue processing
          console.error('Error processing queued operation:', error);
        }
      }
    }
  }

  /**
   * Enqueue metric operation
   */
  private enqueueMetric(fn: () => void): void {
    this.metricQueue.push(fn);
  }

  /**
   * Enqueue log operation
   */
  private enqueueLog(fn: () => void): void {
    this.logQueue.push(fn);
  }

  /**
   * Create an error span (used when shutdown)
   */
  private createErrorSpan(operation: string): Span {
    return {
      traceId: 'shutdown',
      spanId: 'shutdown',
      operation,
      startTime: Date.now(),
      tags: {},
      status: 'error'
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new ObservabilityModule instance
 */
export function createObservability(config?: ObservabilityConfig): ObservabilityModule {
  return new ObservabilityModule(config);
}

// =============================================================================
// DEFAULT SINGLETON
// =============================================================================

let defaultInstance: ObservabilityModule | null = null;

/**
 * Get or create the default observability instance
 */
export function getObservability(config?: ObservabilityConfig): ObservabilityModule {
  if (!defaultInstance) {
    defaultInstance = new ObservabilityModule(config);
  }
  return defaultInstance;
}

/**
 * Reset the default observability instance
 */
export function resetObservability(): void {
  if (defaultInstance) {
    defaultInstance.shutdown();
    defaultInstance = null;
  }
}

// =============================================================================
// RE-EXPORT TYPES
// =============================================================================

export type {
  Metric,
  MetricData,
  Span,
  LogEntry,
  Alert,
  AlertRule,
  ObservabilityConfig
};
