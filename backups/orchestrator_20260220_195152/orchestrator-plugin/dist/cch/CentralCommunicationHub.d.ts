/**
 * CENTRAL COMMUNICATION HUB (CCH)
 * ================================
 *
 * Main orchestration hub that integrates all CCH components:
 * - UnifiedMessageQueue (UMQ) - Message queue with pub/sub
 * - UnifiedRouterEngine (URE) - LRU-cached routing
 * - ContextPoolManager (CPM) - Context pooling for performance
 * - FaultToleranceLayer (FTL) - Circuit breaker + retry
 * - ObservabilityModule (OM) - Metrics, tracing, logging, alerting
 *
 * PERFORMANCE TARGETS:
 * - Throughput: >100 messages/second
 * - Latency: <100ms for routing decisions
 * - Cache hit rate: >80%
 * - Context acquisition: <10ms
 *
 * @version 1.0.0 - Production Ready
 * @author CCH Team
 * @date 01 February 2026
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import { UnifiedMessageQueue, type MessageHandler, type Subscription, type QueueStats, MessagePriority, type UMQConfig } from './queue/UnifiedMessageQueue';
import { UnifiedRouterEngine, type RoutingDecision, type TaskRequest, type RouterStats, type UnifiedRouterConfig } from './routing/UnifiedRouterEngine';
import { ContextPoolManager, type CleanContext, type PoolStats, type ContextPoolConfig } from './pool/ContextPoolManager';
import { FaultToleranceLayer, type CircuitState, type RetryPolicy, type FaultToleranceConfig, type HealthStatus, type ServiceMetrics } from './fault/FaultToleranceLayer';
import { ObservabilityModule, type ObservabilityConfig, type Alert, type AlertRule } from './observability/ObservabilityModule';
/**
 * Hub configuration options
 */
export interface CCHConfig {
    /** Storage path for persistence */
    storagePath?: string;
    /** UMQ configuration */
    umq?: Partial<UMQConfig>;
    /** URE configuration */
    ure?: Partial<UnifiedRouterConfig>;
    /** CPM configuration */
    cpm?: Partial<ContextPoolConfig>;
    /** FTL configuration */
    ftl?: Partial<FaultToleranceConfig>;
    /** OM configuration */
    om?: Partial<ObservabilityConfig>;
    /** Enable automatic initialization */
    autoInit?: boolean;
    /** Enable graceful shutdown hooks */
    enableShutdownHooks?: boolean;
}
/**
 * Hub statistics aggregate
 */
export interface HubStats {
    /** Timestamp of stats collection */
    timestamp: number;
    /** UMQ statistics */
    queue: QueueStats;
    /** URE statistics */
    router: RouterStats;
    /** CPM statistics */
    pool: PoolStats;
    /** FTL health status */
    health: HealthStatus;
    /** Active alerts from OM */
    activeAlerts: Alert[];
    /** Uptime in milliseconds */
    uptime: number;
}
/**
 * Task execution result
 */
export interface TaskExecutionResult<T = unknown> {
    /** Whether execution succeeded */
    success: boolean;
    /** Result data if successful */
    data?: T;
    /** Error message if failed */
    error?: string;
    /** Routing decision used */
    routing?: RoutingDecision;
    /** Context used */
    context?: CleanContext;
    /** Execution time in milliseconds */
    executionTime: number;
    /** Number of retries attempted */
    retries: number;
    /** Trace ID for observability */
    traceId?: string;
}
/**
 * Agent execution context
 */
export interface AgentExecutionContext {
    /** Agent type identifier */
    agentType: string;
    /** Clean context from pool */
    cleanContext: CleanContext;
    /** Routing decision */
    routing: RoutingDecision;
    /** Trace ID */
    traceId: string;
    /** Correlation ID */
    correlationId: string;
}
/**
 * Hub event types - lifecycle events emitted by the hub
 */
export declare enum HubEventType {
    /** Hub has been initialized and is ready */
    HUB_STARTED = "hub_started",
    /** Hub is shutting down */
    HUB_STOPPED = "hub_stopped",
    /** A component initialization failed */
    COMPONENT_INIT_FAILED = "component_init_failed",
    /** A circuit breaker has opened */
    CIRCUIT_OPENED = "circuit_opened",
    /** A circuit breaker has closed (recovered) */
    CIRCUIT_CLOSED = "circuit_closed",
    /** Message has been published */
    MESSAGE_PUBLISHED = "message_published",
    /** Message has been delivered */
    MESSAGE_DELIVERED = "message_delivered",
    /** Message processing failed */
    MESSAGE_FAILED = "message_failed",
    /** Routing decision made */
    ROUTING_DECISION = "routing_decision",
    /** Context pool threshold reached */
    POOL_THRESHOLD = "pool_threshold",
    /** Health status changed */
    HEALTH_STATUS_CHANGED = "health_status_changed",
    /** Alert triggered */
    ALERT_TRIGGERED = "alert_triggered"
}
/**
 * Base hub event interface
 */
export interface HubEvent<T = Record<string, unknown>> {
    /** Event type */
    type: HubEventType;
    /** Timestamp when the event occurred */
    timestamp: number;
    /** Event source component */
    source?: string;
    /** Additional event-specific data */
    data?: T;
}
/**
 * Hub event handler function type
 */
export type HubEventHandler<T = Record<string, unknown>> = (event: HubEvent<T>) => void | Promise<void>;
/**
 * Hub started event data
 */
export interface HubStartedEventData {
    /** Hub initialization duration in milliseconds */
    initDuration: number;
    /** Components that were initialized */
    components: string[];
    /** Storage path used */
    storagePath: string;
}
/**
 * Hub stopped event data
 */
export interface HubStoppedEventData {
    /** Reason for shutdown */
    reason: 'manual' | 'error' | 'signal';
    /** Shutdown duration in milliseconds */
    shutdownDuration: number;
    /** Active messages at shutdown time */
    activeMessages: number;
}
/**
 * CentralCommunicationHub - Main orchestration hub for all CCH components
 *
 * This class provides a unified API for:
 * - Message pub/sub with UMQ
 * - Request routing with URE
 * - Context management with CPM
 * - Fault-tolerant execution with FTL
 * - Observability with OM
 */
export declare class CentralCommunicationHub {
    /** Component instances */
    private umq;
    private ure;
    private cpm;
    private ftl;
    private om;
    /** Configuration */
    private config;
    /** State tracking */
    private initialized;
    private startTime;
    private shutdownInProgress;
    /** Active subscriptions tracking */
    private activeSubscriptions;
    /** Shutdown hooks tracking */
    private shutdownHooks;
    /** Event emitter for hub lifecycle events */
    private eventEmitter;
    /** Track initialization start time for events */
    private initStartTime;
    constructor(config?: CCHConfig);
    /**
     * Initialize all CCH components
     */
    initialize(): Promise<void>;
    /**
     * Ensure the hub is initialized
     */
    private ensureInitialized;
    /**
     * Publish a message to a topic
     *
     * @param topic - Topic to publish to (supports hierarchy with dots)
     * @param message - Message payload
     * @param priority - Message priority (optional)
     */
    publish(topic: string, message: unknown, priority?: MessagePriority): Promise<void>;
    /**
     * Subscribe to a topic pattern
     *
     * @param topicPattern - Pattern (supports *, #, > wildcards)
     * @param handler - Message handler function
     * @returns Subscription object with unsubscribe method
     */
    subscribe(topicPattern: string, handler: MessageHandler): Subscription;
    /**
     * Unsubscribe from a topic
     *
     * @param subscriptionId - ID of subscription to remove
     */
    unsubscribe(subscriptionId: string): void;
    /**
     * Get message queue statistics
     */
    getQueueStats(): QueueStats;
    /**
     * Route a request to the appropriate agent
     *
     * @param request - Task request to route
     * @returns Routing decision with agent, model, and confidence
     */
    route(request: TaskRequest): RoutingDecision;
    /**
     * Route and acquire context for execution
     *
     * @param request - Task request
     * @returns Agent execution context
     */
    routeAndAcquire(request: TaskRequest): Promise<AgentExecutionContext>;
    /**
     * Invalidate routing cache
     *
     * @param pattern - Regex pattern for cache invalidation
     */
    invalidateCache(pattern: string): void;
    /**
     * Warmup routing cache with requests
     *
     * @param requests - Requests to pre-cache
     */
    warmupCache(requests: TaskRequest[]): Promise<void>;
    /**
     * Get router statistics
     */
    getRouterStats(): RouterStats;
    /**
     * Acquire a context for an agent type
     *
     * @param agentType - Type of agent
     * @returns Clean context
     */
    acquireContext(agentType: string): Promise<CleanContext>;
    /**
     * Release a context back to the pool
     *
     * @param context - Context to release
     */
    releaseContext(context: CleanContext): Promise<void>;
    /**
     * Preload contexts for agent types
     *
     * @param agentTypes - Agent types to preload
     */
    preloadContexts(agentTypes: string[]): Promise<void>;
    /**
     * Get pool statistics
     */
    getPoolStats(): PoolStats;
    /**
     * Execute a function with fault tolerance (circuit breaker + retry)
     *
     * @param service - Service name for circuit breaker
     * @param fn - Function to execute
     * @param retryPolicy - Optional retry policy override
     * @returns Function result
     */
    execute<T>(service: string, fn: () => Promise<T>, retryPolicy?: RetryPolicy): Promise<T>;
    /**
     * Execute with routing and context acquisition
     *
     * @param request - Task request
     * @param fn - Function to execute with context
     * @returns Execution result
     */
    executeWithRouting<T>(request: TaskRequest, fn: (context: AgentExecutionContext) => Promise<T>): Promise<TaskExecutionResult<T>>;
    /**
     * Get circuit state for a service
     *
     * @param service - Service name
     */
    getCircuitState(service: string): CircuitState;
    /**
     * Reset circuit breaker for a service
     *
     * @param service - Service name
     */
    resetCircuit(service: string): void;
    /**
     * Get health status
     */
    getHealth(): HealthStatus;
    /**
     * Get service metrics
     *
     * @param service - Service name
     */
    getServiceMetrics(service: string): ServiceMetrics | undefined;
    /**
     * Record a counter metric
     *
     * @param name - Metric name
     * @param value - Value to increment by
     * @param tags - Metric tags
     */
    increment(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Record a gauge metric
     *
     * @param name - Metric name
     * @param value - Gauge value
     * @param tags - Metric tags
     */
    gauge(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Record a histogram value
     *
     * @param name - Metric name
     * @param value - Value to record
     * @param tags - Metric tags
     */
    histogram(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Log a message
     *
     * @param level - Log level
     * @param message - Message text
     * @param context - Additional context
     */
    log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void;
    /**
     * Check for triggered alerts
     *
     * @returns Array of triggered alerts
     */
    checkAlerts(): Alert[];
    /**
     * Add an alert rule
     *
     * @param rule - Alert rule configuration
     */
    addAlertRule(rule: AlertRule): void;
    /**
     * Export observability data
     *
     * @param format - Export format (json or prometheus)
     * @returns Exported data string
     */
    exportObservabilityData(format?: 'json' | 'prometheus'): string;
    /**
     * Get comprehensive hub statistics
     */
    getStats(): HubStats;
    /**
     * Get a human-readable status summary
     */
    getStatusSummary(): string;
    /**
     * Graceful shutdown of all components
     */
    shutdown(): Promise<void>;
    /**
     * Register a shutdown hook
     *
     * @param hook - Function to run during shutdown
     */
    registerShutdownHook(hook: () => Promise<void>): void;
    /**
     * Register an event listener for hub lifecycle events
     *
     * @param eventType - Type of event to listen for
     * @param handler - Handler function to call when event occurs
     * @returns Unsubscribe function
     */
    on<T = Record<string, unknown>>(eventType: HubEventType, handler: HubEventHandler<T>): () => void;
    /**
     * Register a one-time event listener
     *
     * @param eventType - Type of event to listen for
     * @param handler - Handler function to call when event occurs
     */
    once<T = Record<string, unknown>>(eventType: HubEventType, handler: HubEventHandler<T>): void;
    /**
     * Remove all event listeners for a specific event type
     *
     * @param eventType - Type of event to remove listeners for
     */
    off(eventType: HubEventType): void;
    /**
     * Emit a hub event
     *
     * @param event - Event to emit
     */
    private emitEvent;
    /**
     * Emit hub_started event when initialization completes successfully
     *
     * @param components - List of initialized components
     */
    private emitHubStarted;
    /**
     * Emit hub_stopped event when shutdown completes
     *
     * @param reason - Reason for shutdown
     * @param shutdownStartTime - When shutdown started
     * @param activeMessages - Number of active messages at shutdown
     */
    private emitHubStopped;
    /**
     * Get event emitter for advanced event handling
     *
     * @returns The internal EventEmitter instance
     */
    getEventEmitter(): EventEmitter;
    /**
     * Extract agent type from agent file path
     */
    private extractAgentType;
    /**
     * Merge user config with defaults
     */
    private mergeConfig;
    /**
     * Setup process shutdown hooks
     */
    private setupShutdownHooks;
    /**
     * Get direct access to UMQ instance
     */
    getUMQ(): UnifiedMessageQueue;
    /**
     * Get direct access to URE instance
     */
    getURE(): UnifiedRouterEngine;
    /**
     * Get direct access to CPM instance
     */
    getCPM(): ContextPoolManager;
    /**
     * Get direct access to FTL instance
     */
    getFTL(): FaultToleranceLayer;
    /**
     * Get direct access to OM instance
     */
    getOM(): ObservabilityModule;
}
/**
 * Create and initialize a CentralCommunicationHub
 *
 * @param config - Hub configuration
 * @returns Initialized hub instance
 */
export declare function createHub(config?: CCHConfig): Promise<CentralCommunicationHub>;
/**
 * Create a hub with auto-init disabled (lazy initialization)
 *
 * @param config - Hub configuration
 * @returns Hub instance (call initialize() before use)
 */
export declare function createHubLazy(config?: CCHConfig): CentralCommunicationHub;
/**
 * Create a hub optimized for development
 */
export declare function createDevHub(): Promise<CentralCommunicationHub>;
/**
 * Create a hub optimized for production
 */
export declare function createProductionHub(): Promise<CentralCommunicationHub>;
/**
 * Get or create the default hub instance
 *
 * @param config - Configuration (only used on first call)
 * @returns Hub instance
 */
export declare function getHub(config?: CCHConfig): Promise<CentralCommunicationHub>;
/**
 * Reset the default hub instance
 */
export declare function resetHub(): Promise<void>;
export default CentralCommunicationHub;
//# sourceMappingURL=CentralCommunicationHub.d.ts.map