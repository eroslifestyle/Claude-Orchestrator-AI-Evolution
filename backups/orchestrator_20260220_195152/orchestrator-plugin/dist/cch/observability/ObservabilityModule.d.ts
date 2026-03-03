/**
 * ObservabilityModule - Production-ready observability solution
 * Provides metrics collection, distributed tracing, structured logging, and alerting
 */
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
    logs?: Array<{
        timestamp: number;
        message: string;
        level: string;
    }>;
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
interface ObservabilityConfig {
    maxMetrics?: number;
    metricsRetentionMs?: number;
    metricsFlushIntervalMs?: number;
    samplingRate?: number;
    maxSpans?: number;
    spanRetentionMs?: number;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    maxLogs?: number;
    logRetentionMs?: number;
    alertCheckIntervalMs?: number;
    exportPath?: string;
    autoExport?: boolean;
    exportIntervalMs?: number;
}
export declare class ObservabilityModule {
    private metrics;
    private traces;
    private logs;
    private alerts;
    private config;
    private currentTraceId?;
    private currentSpanId?;
    private correlationId;
    private flushTimer?;
    private alertTimer?;
    private exportTimer?;
    private isShutdown;
    private metricQueue;
    private logQueue;
    private isProcessingQueue;
    constructor(config?: ObservabilityConfig);
    /**
     * Increment a counter metric
     */
    increment(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Set a gauge metric
     */
    gauge(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Record a histogram value
     */
    histogram(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Get current metric value
     */
    getMetric(name: string, tags?: Record<string, string>): MetricData | undefined;
    /**
     * Get histogram statistics
     */
    getHistogramStats(name: string, tags?: Record<string, string>): {
        count: number;
        sum: number;
        min: number;
        max: number;
        avg: number;
        p50: number;
        p95: number;
        p99: number;
    };
    /**
     * Start a new span
     */
    startSpan(operation: string, parent?: Span): Span;
    /**
     * Finish a span
     */
    finishSpan(span: Span): void;
    /**
     * Get trace by ID
     */
    getTrace(traceId: string): Span[];
    /**
     * Get all spans
     */
    getAllSpans(): Span[];
    /**
     * Extract trace context from headers
     */
    extractTraceContext(headers: Record<string, string>): {
        traceId: string;
        spanId: string;
    } | null;
    /**
     * Inject trace context into headers
     */
    injectTraceContext(span: Span, headers?: Record<string, string>): Record<string, string>;
    /**
     * Create a child span from trace context
     */
    startSpanFromContext(operation: string, traceContext: {
        traceId: string;
        spanId: string;
    }): Span;
    /**
     * Log a message with structured context
     */
    log(level: string, message: string, context?: Record<string, unknown>): void;
    /**
     * Debug level log
     */
    debug(message: string, context?: Record<string, unknown>): void;
    /**
     * Info level log
     */
    info(message: string, context?: Record<string, unknown>): void;
    /**
     * Warning level log
     */
    warn(message: string, context?: Record<string, unknown>): void;
    /**
     * Error level log
     */
    error(message: string, context?: Record<string, unknown>): void;
    /**
     * Get logs by correlation ID
     */
    getLogsByCorrelationId(correlationId: string): LogEntry[];
    /**
     * Get logs by trace ID
     */
    getLogsByTraceId(traceId: string): LogEntry[];
    /**
     * Query logs
     */
    queryLogs(filters?: {
        level?: string;
        minLevel?: string;
        startTime?: number;
        endTime?: number;
        messagePattern?: string;
    }): LogEntry[];
    /**
     * Check and return triggered alerts
     */
    checkAlerts(): Alert[];
    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Add an alert rule
     */
    addAlertRule(rule: AlertRule): void;
    /**
     * Remove an alert rule
     */
    removeAlertRule(ruleId: string): boolean;
    /**
     * Get all alert rules
     */
    getAlertRules(): AlertRule[];
    /**
     * Clear active alerts
     */
    clearAlerts(): void;
    /**
     * Export metrics in specified format
     */
    exportMetrics(format?: 'json' | 'prometheus'): string;
    /**
     * Export dashboard data
     */
    exportDashboard(): string;
    /**
     * Export to file (async)
     */
    exportToFile(format?: 'json' | 'prometheus', path?: string): Promise<void>;
    /**
     * Set current trace ID
     */
    setTraceId(traceId: string): void;
    /**
     * Get current trace ID
     */
    getTraceId(): string | undefined;
    /**
     * Set current span ID
     */
    setSpanId(spanId: string): void;
    /**
     * Get current span ID
     */
    getSpanId(): string | undefined;
    /**
     * Set correlation ID
     */
    setCorrelationId(correlationId: string): void;
    /**
     * Get correlation ID
     */
    getCorrelationId(): string;
    /**
     * Clear trace context
     */
    clearTraceContext(): void;
    /**
     * Run operation within a trace context
     */
    withTrace<T>(operation: string, fn: (span: Span) => Promise<T> | T, parent?: Span): Promise<T>;
    /**
     * Shutdown the observability module
     */
    shutdown(): void;
    /**
     * Flush pending operations
     */
    flush(): void;
    /**
     * Reset all stored data
     */
    reset(): void;
    /**
     * Setup default alert rules
     */
    private setupDefaultAlerts;
    /**
     * Start periodic timers
     */
    private startTimers;
    /**
     * Setup async queue processing
     */
    private setupQueueProcessing;
    /**
     * Process queued operations
     */
    private processQueue;
    /**
     * Enqueue metric operation
     */
    private enqueueMetric;
    /**
     * Enqueue log operation
     */
    private enqueueLog;
    /**
     * Create an error span (used when shutdown)
     */
    private createErrorSpan;
}
/**
 * Create a new ObservabilityModule instance
 */
export declare function createObservability(config?: ObservabilityConfig): ObservabilityModule;
/**
 * Get or create the default observability instance
 */
export declare function getObservability(config?: ObservabilityConfig): ObservabilityModule;
/**
 * Reset the default observability instance
 */
export declare function resetObservability(): void;
export type { Metric, MetricData, Span, LogEntry, Alert, AlertRule, ObservabilityConfig };
//# sourceMappingURL=ObservabilityModule.d.ts.map