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

// ============================================================================
// IMPORTS
// ============================================================================

import { promises as fs } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

// Import all CCH components
import {
  UnifiedMessageQueue,
  createUMQ,
  type CCHMessage,
  type MessageHandler,
  type Subscription,
  type QueueStats,
  MessagePriority,
  type UMQConfig
} from './queue/UnifiedMessageQueue';

import {
  UnifiedRouterEngine,
  createUnifiedRouterEngine,
  type RoutingDecision,
  type TaskRequest,
  type RouterStats,
  type UnifiedRouterConfig
} from './routing/UnifiedRouterEngine';

import {
  ContextPoolManager,
  createContextPoolManager,
  type CleanContext,
  type PoolStats,
  type ContextPoolConfig
} from './pool/ContextPoolManager';

import {
  FaultToleranceLayer,
  createFaultToleranceLayer,
  type CircuitState,
  type RetryPolicy,
  type FaultToleranceConfig,
  type HealthStatus,
  type ServiceMetrics
} from './fault/FaultToleranceLayer';

import {
  ObservabilityModule,
  createObservability,
  type ObservabilityConfig,
  type Alert,
  type AlertRule
} from './observability/ObservabilityModule';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// HUB EVENT TYPES
// ============================================================================

/**
 * Hub event types - lifecycle events emitted by the hub
 */
export enum HubEventType {
  /** Hub has been initialized and is ready */
  HUB_STARTED = 'hub_started',
  /** Hub is shutting down */
  HUB_STOPPED = 'hub_stopped',
  /** A component initialization failed */
  COMPONENT_INIT_FAILED = 'component_init_failed',
  /** A circuit breaker has opened */
  CIRCUIT_OPENED = 'circuit_opened',
  /** A circuit breaker has closed (recovered) */
  CIRCUIT_CLOSED = 'circuit_closed',
  /** Message has been published */
  MESSAGE_PUBLISHED = 'message_published',
  /** Message has been delivered */
  MESSAGE_DELIVERED = 'message_delivered',
  /** Message processing failed */
  MESSAGE_FAILED = 'message_failed',
  /** Routing decision made */
  ROUTING_DECISION = 'routing_decision',
  /** Context pool threshold reached */
  POOL_THRESHOLD = 'pool_threshold',
  /** Health status changed */
  HEALTH_STATUS_CHANGED = 'health_status_changed',
  /** Alert triggered */
  ALERT_TRIGGERED = 'alert_triggered'
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

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_STORAGE_PATH = './cch-data';

const DEFAULT_CONFIG: Required<CCHConfig> = {
  storagePath: DEFAULT_STORAGE_PATH,
  umq: {
    storagePath: DEFAULT_STORAGE_PATH,
    dbName: 'cch-umq',
    maxRetries: 3,
    retryBaseDelay: 1000,
    retryMaxDelay: 60000,
    cleanupInterval: 300000,
    defaultTTL: 3600000,
    maxBatchSize: 100,
    pollingInterval: 100,
    logLevel: 'info',
    enableMetrics: true
  },
  ure: {
    maxCacheEntries: 1000,
    cacheTTL: 3600000,
    cachingEnabled: true,
    metricsEnabled: true,
    agentRegistryPath: '',
    minConfidence: 0.3
  },
  cpm: {
    minPoolSize: 5,
    maxPoolSize: 50,
    preloadEnabled: true,
    preloadCount: 10,
    contextTTL: 300000,
    cleanupInterval: 60000,
    lruEvictionEnabled: true,
    memoryMonitoringEnabled: true,
    maxMemoryBytes: 52428800,
    detailedMetricsEnabled: true,
    autoCleanupEnabled: true,
    lockTimeout: 5000,
    useWeakMap: true
  },
  ftl: {
    defaultRetryPolicy: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      multiplier: 2,
      jitter: true
    },
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      slidingWindowSize: 100,
      halfOpenMaxCalls: 3
    },
    healthCheckInterval: 30000,
    dlqEnabled: true
  },
  om: {
    maxMetrics: 10000,
    metricsRetentionMs: 3600000,
    metricsFlushIntervalMs: 60000,
    samplingRate: 0.01,
    maxSpans: 50000,
    spanRetentionMs: 3600000,
    logLevel: 'info',
    maxLogs: 50000,
    logRetentionMs: 3600000,
    alertCheckIntervalMs: 30000,
    exportPath: './cch-observability-export',
    autoExport: false,
    exportIntervalMs: 300000
  },
  autoInit: true,
  enableShutdownHooks: true
};

// ============================================================================
// CENTRAL COMMUNICATION HUB - MAIN CLASS
// ============================================================================

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
export class CentralCommunicationHub {
  // ==========================================================================
  // PRIVATE PROPERTIES
  // ==========================================================================

  /** Component instances */
  private umq: UnifiedMessageQueue | null = null;
  private ure: UnifiedRouterEngine | null = null;
  private cpm: ContextPoolManager | null = null;
  private ftl: FaultToleranceLayer | null = null;
  private om: ObservabilityModule | null = null;

  /** Configuration */
  private config: Required<CCHConfig>;

  /** State tracking */
  private initialized: boolean = false;
  private startTime: number = 0;
  private shutdownInProgress: boolean = false;

  /** Active subscriptions tracking */
  private activeSubscriptions: Map<string, Subscription> = new Map();

  /** Shutdown hooks tracking */
  private shutdownHooks: Array<() => Promise<void>> = [];

  /** Event emitter for hub lifecycle events */
  private eventEmitter: EventEmitter = new EventEmitter();

  /** Track initialization start time for events */
  private initStartTime: number = 0;

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(config: CCHConfig = {}) {
    // Merge with defaults
    this.config = this.mergeConfig(config);
    this.startTime = Date.now();

    // Setup shutdown hooks if enabled
    if (this.config.enableShutdownHooks) {
      this.setupShutdownHooks();
    }

    // Auto-initialize if configured
    if (this.config.autoInit) {
      // We'll initialize async, but the constructor can't be async
      // Callers should await initialize() explicitly
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize all CCH components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initStartTime = Date.now();
    const initSpan = this.om?.startSpan('cch.initialize');
    const components: string[] = [];

    try {
      // Ensure storage directory exists
      await fs.mkdir(this.config.storagePath, { recursive: true });

      // Initialize UMQ first (other components may publish messages)
      this.om?.info('Initializing UnifiedMessageQueue');
      this.umq = new UnifiedMessageQueue(this.config.umq);
      await this.umq.initialize();
      components.push('UMQ');

      // Initialize URE
      this.om?.info('Initializing UnifiedRouterEngine');
      this.ure = createUnifiedRouterEngine(this.config.ure);
      components.push('URE');

      // Initialize CPM
      this.om?.info('Initializing ContextPoolManager');
      this.cpm = createContextPoolManager(this.config.cpm);
      components.push('CPM');

      // Initialize FTL
      this.om?.info('Initializing FaultToleranceLayer');
      this.ftl = createFaultToleranceLayer(this.config.ftl);
      components.push('FTL');

      // Initialize OM last (others may use it)
      this.om = createObservability(this.config.om);
      components.push('OM');

      this.initialized = true;
      this.startTime = Date.now();

      this.om?.info('CentralCommunicationHub initialized', {
        storagePath: this.config.storagePath
      });

      // Record initialization metric
      this.om?.increment('cch.initializations', 1, { status: 'success' });

      if (initSpan) {
        this.om?.finishSpan(initSpan);
      }

      // Emit hub_started event
      this.emitHubStarted(components);
    } catch (error) {
      this.om?.error('Failed to initialize CCH', { error });

      // Record initialization failure metric
      this.om?.increment('cch.initializations', 1, { status: 'failed' });

      if (initSpan) {
        initSpan.status = 'error';
        this.om?.finishSpan(initSpan);
      }

      throw error;
    }
  }

  /**
   * Ensure the hub is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'CentralCommunicationHub not initialized. ' +
        'Call initialize() first or set autoInit: true in config.'
      );
    }
    if (!this.umq || !this.ure || !this.cpm || !this.ftl || !this.om) {
      throw new Error('CentralCommunicationHub components not properly initialized');
    }
  }

  // ==========================================================================
  // MESSAGE QUEUE API (UMQ)
  // ==========================================================================

  /**
   * Publish a message to a topic
   *
   * @param topic - Topic to publish to (supports hierarchy with dots)
   * @param message - Message payload
   * @param priority - Message priority (optional)
   */
  async publish(
    topic: string,
    message: unknown,
    priority?: MessagePriority
  ): Promise<void> {
    this.ensureInitialized();

    const span = this.om?.startSpan('cch.publish');

    const cchMessage: CCHMessage = {
      id: '', // Will be generated by UMQ
      topic,
      payload: message,
      timestamp: Date.now(),
      priority: priority ?? MessagePriority.NORMAL,
      retryCount: 0,
      headers: {},
      idempotencyKey: undefined
    };

    await this.umq!.publish(topic, cchMessage);

    this.om?.increment('cch.messages.published', 1, { topic });
    this.om?.debug('Message published', { topic, messageId: cchMessage.id });

    if (span) {
      this.om?.finishSpan(span);
    }
  }

  /**
   * Subscribe to a topic pattern
   *
   * @param topicPattern - Pattern (supports *, #, > wildcards)
   * @param handler - Message handler function
   * @returns Subscription object with unsubscribe method
   */
  subscribe(topicPattern: string, handler: MessageHandler): Subscription {
    this.ensureInitialized();

    const subscription = this.umq!.subscribe(topicPattern, async (message) => {
      const span = this.om?.startSpan('cch.message_handler');
      if (span) {
        span.tags.topic = message.topic;
      }

      this.om?.increment('cch.messages.delivered', 1, { topic: message.topic });

      try {
        await handler(message);
        this.om?.increment('cch.messages.handled', 1, { topic: message.topic });
      } catch (error) {
        this.om?.error('Message handler error', { error, topic: message.topic });
        this.om?.increment('cch.messages.errors', 1, { topic: message.topic });
        throw error;
      } finally {
        if (span) {
          this.om?.finishSpan(span);
        }
      }
    });

    this.activeSubscriptions.set(subscription.id, subscription);

    this.om?.info('Subscription created', {
      subscriptionId: subscription.id,
      topicPattern
    });

    return subscription;
  }

  /**
   * Unsubscribe from a topic
   *
   * @param subscriptionId - ID of subscription to remove
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(subscriptionId);
      this.om?.info('Subscription removed', { subscriptionId });
    }
  }

  /**
   * Get message queue statistics
   */
  getQueueStats(): QueueStats {
    this.ensureInitialized();
    return this.umq!.getStats();
  }

  // ==========================================================================
  // ROUTING API (URE)
  // ==========================================================================

  /**
   * Route a request to the appropriate agent
   *
   * @param request - Task request to route
   * @returns Routing decision with agent, model, and confidence
   */
  route(request: TaskRequest): RoutingDecision {
    this.ensureInitialized();

    const span = this.om?.startSpan('cch.route');

    const decision = this.ure!.route(request);

    this.om?.increment('cch.routing.requests', 1, {
      agent: decision.agentFile,
      model: decision.model,
      cacheHit: String(decision.cacheHit)
    });

    this.om?.debug('Routing decision made', {
      agent: decision.agentFile,
      model: decision.model,
      confidence: decision.confidence,
      cacheHit: decision.cacheHit
    });

    if (span) {
      this.om?.finishSpan(span);
    }

    return decision;
  }

  /**
   * Route and acquire context for execution
   *
   * @param request - Task request
   * @returns Agent execution context
   */
  async routeAndAcquire(request: TaskRequest): Promise<AgentExecutionContext> {
    this.ensureInitialized();

    const span = this.om?.startSpan('cch.route_and_acquire');

    // Get routing decision
    const routing = this.route(request);

    // Extract agent type from agent file
    const agentType = this.extractAgentType(routing.agentFile);

    // Acquire context from pool
    const cleanContext = await this.cpm!.acquire(agentType);

    this.om?.increment('cch.contexts.acquired', 1, { agentType });
    this.om?.histogram('cch.contexts.acquisition_time', cleanContext.lastUsed, { agentType });

    const executionContext: AgentExecutionContext = {
      agentType,
      cleanContext,
      routing,
      traceId: this.om!.getTraceId() ?? '',
      correlationId: this.om!.getCorrelationId()
    };

    if (span) {
      this.om?.finishSpan(span);
    }

    return executionContext;
  }

  /**
   * Invalidate routing cache
   *
   * @param pattern - Regex pattern for cache invalidation
   */
  invalidateCache(pattern: string): void {
    this.ensureInitialized();
    this.ure!.invalidate(pattern);
    this.om?.info('Cache invalidated', { pattern });
  }

  /**
   * Warmup routing cache with requests
   *
   * @param requests - Requests to pre-cache
   */
  async warmupCache(requests: TaskRequest[]): Promise<void> {
    this.ensureInitialized();
    await this.ure!.warmup(requests);
    this.om?.info('Cache warmed up', { requestCount: requests.length });
  }

  /**
   * Get router statistics
   */
  getRouterStats(): RouterStats {
    this.ensureInitialized();
    return this.ure!.getStats();
  }

  // ==========================================================================
  // CONTEXT POOL API (CPM)
  // ==========================================================================

  /**
   * Acquire a context for an agent type
   *
   * @param agentType - Type of agent
   * @returns Clean context
   */
  async acquireContext(agentType: string): Promise<CleanContext> {
    this.ensureInitialized();

    const span = this.om?.startSpan('cch.acquire_context');
    if (span) {
      span.tags.agentType = agentType;
    }

    const startTime = performance.now();
    const context = await this.cpm!.acquire(agentType);
    const acquisitionTime = performance.now() - startTime;

    this.om?.histogram('cch.contexts.acquisition_time', acquisitionTime, { agentType });
    this.om?.increment('cch.contexts.acquired', 1, { agentType });

    if (span) {
      this.om?.finishSpan(span);
    }

    return context;
  }

  /**
   * Release a context back to the pool
   *
   * @param context - Context to release
   */
  async releaseContext(context: CleanContext): Promise<void> {
    this.ensureInitialized();

    await this.cpm!.release(context);

    this.om?.increment('cch.contexts.released', 1, { agentType: context.agentType });
  }

  /**
   * Preload contexts for agent types
   *
   * @param agentTypes - Agent types to preload
   */
  async preloadContexts(agentTypes: string[]): Promise<void> {
    this.ensureInitialized();
    await this.cpm!.preload(agentTypes);
    this.om?.info('Contexts preloaded', { agentTypes });
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): PoolStats {
    this.ensureInitialized();
    return this.cpm!.getStats();
  }

  // ==========================================================================
  // FAULT TOLERANCE API (FTL)
  // ==========================================================================

  /**
   * Execute a function with fault tolerance (circuit breaker + retry)
   *
   * @param service - Service name for circuit breaker
   * @param fn - Function to execute
   * @param retryPolicy - Optional retry policy override
   * @returns Function result
   */
  async execute<T>(
    service: string,
    fn: () => Promise<T>,
    retryPolicy?: RetryPolicy
  ): Promise<T> {
    this.ensureInitialized();

    const span = this.om?.startSpan('cch.execute');
    if (span) {
      span.tags.service = service;
    }

    this.om?.increment('cch.executions.started', 1, { service });

    const startTime = performance.now();

    try {
      const result = await this.ftl!.execute(service, fn, retryPolicy);

      const duration = performance.now() - startTime;
      this.om?.histogram('cch.executions.duration', duration, { service, status: 'success' });
      this.om?.increment('cch.executions.completed', 1, { service, status: 'success' });

      if (span) {
        this.om?.finishSpan(span);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.om?.histogram('cch.executions.duration', duration, { service, status: 'error' });
      this.om?.increment('cch.executions.failed', 1, { service });
      this.om?.error('Execution failed', { error, service });

      if (span) {
        span.status = 'error';
        this.om?.finishSpan(span);
      }

      throw error;
    }
  }

  /**
   * Execute with routing and context acquisition
   *
   * @param request - Task request
   * @param fn - Function to execute with context
   * @returns Execution result
   */
  async executeWithRouting<T>(
    request: TaskRequest,
    fn: (context: AgentExecutionContext) => Promise<T>
  ): Promise<TaskExecutionResult<T>> {
    this.ensureInitialized();

    const span = this.om?.startSpan('cch.execute_with_routing');
    const startTime = performance.now();

    try {
      // Route and acquire context
      const execContext = await this.routeAndAcquire(request);

      // Execute with fault tolerance
      const result = await this.execute(
        execContext.agentType,
        () => fn(execContext)
      );

      // Release context
      await this.releaseContext(execContext.cleanContext);

      const executionTime = performance.now() - startTime;

      this.om?.histogram('cch.executions.total_time', executionTime, {
        agentType: execContext.agentType,
        status: 'success'
      });

      const taskResult: TaskExecutionResult<T> = {
        success: true,
        data: result,
        routing: execContext.routing,
        context: execContext.cleanContext,
        executionTime,
        retries: 0,
        traceId: execContext.traceId
      };

      if (span) {
        this.om?.finishSpan(span);
      }

      return taskResult;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.om?.error('Execute with routing failed', { error });

      if (span) {
        span.status = 'error';
        this.om?.finishSpan(span);
      }

      return {
        success: false,
        error: errorMessage,
        executionTime,
        retries: 0
      };
    }
  }

  /**
   * Get circuit state for a service
   *
   * @param service - Service name
   */
  getCircuitState(service: string): CircuitState {
    this.ensureInitialized();
    return this.ftl!.getCircuitState(service);
  }

  /**
   * Reset circuit breaker for a service
   *
   * @param service - Service name
   */
  resetCircuit(service: string): void {
    this.ensureInitialized();
    this.ftl!.resetCircuit(service);
    this.om?.info('Circuit reset', { service });
  }

  /**
   * Get health status
   */
  getHealth(): HealthStatus {
    this.ensureInitialized();
    return this.ftl!.getHealth();
  }

  /**
   * Get service metrics
   *
   * @param service - Service name
   */
  getServiceMetrics(service: string): ServiceMetrics | undefined {
    this.ensureInitialized();
    return this.ftl!.getServiceMetrics(service);
  }

  // ==========================================================================
  // OBSERVABILITY API (OM)
  // ==========================================================================

  /**
   * Record a counter metric
   *
   * @param name - Metric name
   * @param value - Value to increment by
   * @param tags - Metric tags
   */
  increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.ensureInitialized();
    this.om!.increment(name, value, tags);
  }

  /**
   * Record a gauge metric
   *
   * @param name - Metric name
   * @param value - Gauge value
   * @param tags - Metric tags
   */
  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.ensureInitialized();
    this.om!.gauge(name, value, tags);
  }

  /**
   * Record a histogram value
   *
   * @param name - Metric name
   * @param value - Value to record
   * @param tags - Metric tags
   */
  histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.ensureInitialized();
    this.om!.histogram(name, value, tags);
  }

  /**
   * Log a message
   *
   * @param level - Log level
   * @param message - Message text
   * @param context - Additional context
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
    if (this.om) {
      this.om.log(level, message, context);
    }
  }

  /**
   * Check for triggered alerts
   *
   * @returns Array of triggered alerts
   */
  checkAlerts(): Alert[] {
    this.ensureInitialized();
    return this.om!.checkAlerts();
  }

  /**
   * Add an alert rule
   *
   * @param rule - Alert rule configuration
   */
  addAlertRule(rule: AlertRule): void {
    this.ensureInitialized();
    this.om!.addAlertRule(rule);
  }

  /**
   * Export observability data
   *
   * @param format - Export format (json or prometheus)
   * @returns Exported data string
   */
  exportObservabilityData(format: 'json' | 'prometheus' = 'json'): string {
    this.ensureInitialized();
    return this.om!.exportMetrics(format);
  }

  // ==========================================================================
  // AGGREGATED STATISTICS
  // ==========================================================================

  /**
   * Get comprehensive hub statistics
   */
  getStats(): HubStats {
    this.ensureInitialized();

    return {
      timestamp: Date.now(),
      queue: this.umq!.getStats(),
      router: this.ure!.getStats(),
      pool: this.cpm!.getStats(),
      health: this.ftl!.getHealth(),
      activeAlerts: this.om!.getActiveAlerts(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get a human-readable status summary
   */
  getStatusSummary(): string {
    if (!this.initialized) {
      return 'CentralCommunicationHub: NOT INITIALIZED';
    }

    const stats = this.getStats();
    const uptimeSeconds = Math.floor(stats.uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    const uptimeStr = uptimeHours > 0
      ? `${uptimeHours}h ${uptimeMinutes % 60}m`
      : `${uptimeMinutes}m ${uptimeSeconds % 60}s`;

    const queueHitRate = (stats.queue.totalProcessed / Math.max(1, stats.queue.totalPublished) * 100).toFixed(1);
    const routerHitRate = (stats.router.cacheHitRate * 100).toFixed(1);
    const poolHitRate = (stats.pool.hitRate * 100).toFixed(1);

    return `
================================================================================
                    CENTRAL COMMUNICATION HUB STATUS
================================================================================

UPTIME: ${uptimeStr} | HEALTH: ${stats.health.status.toUpperCase()}

--------------------------------------------------------------------------------
MESSAGE QUEUE (UMQ)
--------------------------------------------------------------------------------
  Pending:       ${stats.queue.pendingMessages}
  Delivered:     ${stats.queue.deliveredMessages}
  Acked:         ${stats.queue.ackedMessages}
  Dead Letter:   ${stats.queue.deadLetterMessages}
  Throughput:    ${stats.queue.messagesPerSecond} msg/sec
  Avg Latency:   ${stats.queue.averageLatencyMs}ms

--------------------------------------------------------------------------------
ROUTER (URE)
--------------------------------------------------------------------------------
  Total Routes:  ${stats.router.totalRequests}
  Cache Hits:    ${stats.router.cacheHits} (${routerHitRate}%)
  Cache Misses:  ${stats.router.cacheMisses}
  Avg Time:      ${stats.router.avgDecisionTime.toFixed(2)}ms

--------------------------------------------------------------------------------
CONTEXT POOL (CPM)
--------------------------------------------------------------------------------
  Total Contexts:    ${stats.pool.totalContexts}
  Available:         ${stats.pool.availableContexts}
  Acquired:          ${stats.pool.acquiredContexts}
  Hit Rate:          ${poolHitRate}%
  Created:           ${stats.pool.contextsCreated}
  Reused:            ${stats.pool.contextsReused}
  Memory:            ${(stats.pool.estimatedMemoryUsage / 1024 / 1024).toFixed(2)} MB

--------------------------------------------------------------------------------
FAULT TOLERANCE (FTL)
--------------------------------------------------------------------------------
  Health Status:     ${stats.health.status}
  Healthy Services:  ${stats.health.globalMetrics.healthyServices}
  Degraded Services: ${stats.health.globalMetrics.degradedServices}
  Unhealthy Services: ${stats.health.globalMetrics.unhealthyServices}

--------------------------------------------------------------------------------
OBSERVABILITY (OM)
--------------------------------------------------------------------------------
  Active Alerts:     ${stats.activeAlerts.length}

================================================================================
`.trim();
  }

  // ==========================================================================
  // LIFECYCLE MANAGEMENT
  // ==========================================================================

  /**
   * Graceful shutdown of all components
   */
  async shutdown(): Promise<void> {
    if (this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;
    this.om?.warn('Initiating CCH shutdown');

    const shutdownSpan = this.om?.startSpan('cch.shutdown');
    const shutdownStartTime = Date.now();

    try {
      // Get active messages count before shutdown
      const queueStats = this.umq?.getStats();
      const activeMessages = queueStats?.pendingMessages || 0;

      // Unsubscribe all active subscriptions
      for (const [id, subscription] of this.activeSubscriptions) {
        subscription.unsubscribe();
      }
      this.activeSubscriptions.clear();

      // Shutdown in reverse order of initialization
      if (this.ftl) {
        this.om?.debug('Shutting down FaultToleranceLayer');
        this.ftl.shutdown();
      }

      if (this.cpm) {
        this.om?.debug('Shutting down ContextPoolManager');
        this.cpm.shutdown();
      }

      if (this.umq) {
        this.om?.debug('Shutting down UnifiedMessageQueue');
        await this.umq.shutdown();
      }

      if (this.om) {
        this.om?.info('Shutting down ObservabilityModule');
        this.om.shutdown();
      }

      // Execute shutdown hooks
      for (const hook of this.shutdownHooks) {
        await hook();
      }
      this.shutdownHooks = [];

      this.initialized = false;

      if (shutdownSpan) {
        this.om?.finishSpan(shutdownSpan);
      }

      console.info('[CCH] Shutdown complete');

      // Emit hub_stopped event
      this.emitHubStopped('manual', shutdownStartTime, activeMessages);
    } catch (error) {
      console.error('[CCH] Error during shutdown:', error);

      // Emit hub_stopped event with error reason
      const shutdownDuration = Date.now() - shutdownStartTime;
      this.emitHubStopped('error', shutdownStartTime, 0);

      throw error;
    }
  }

  /**
   * Register a shutdown hook
   *
   * @param hook - Function to run during shutdown
   */
  registerShutdownHook(hook: () => Promise<void>): void {
    this.shutdownHooks.push(hook);
  }

  // ==========================================================================
  // EVENT MANAGEMENT
  // ==========================================================================

  /**
   * Register an event listener for hub lifecycle events
   *
   * @param eventType - Type of event to listen for
   * @param handler - Handler function to call when event occurs
   * @returns Unsubscribe function
   */
  on<T = Record<string, unknown>>(eventType: HubEventType, handler: HubEventHandler<T>): () => void {
    this.eventEmitter.on(eventType, handler);
    return () => this.eventEmitter.off(eventType, handler);
  }

  /**
   * Register a one-time event listener
   *
   * @param eventType - Type of event to listen for
   * @param handler - Handler function to call when event occurs
   */
  once<T = Record<string, unknown>>(eventType: HubEventType, handler: HubEventHandler<T>): void {
    this.eventEmitter.once(eventType, handler);
  }

  /**
   * Remove all event listeners for a specific event type
   *
   * @param eventType - Type of event to remove listeners for
   */
  off(eventType: HubEventType): void {
    this.eventEmitter.removeAllListeners(eventType);
  }

  /**
   * Emit a hub event
   *
   * @param event - Event to emit
   */
  private emitEvent<T = Record<string, unknown>>(event: HubEvent<T>): void {
    this.eventEmitter.emit(event.type, event);
  }

  /**
   * Emit hub_started event when initialization completes successfully
   *
   * @param components - List of initialized components
   */
  private emitHubStarted(components: string[]): void {
    const initDuration = Date.now() - this.initStartTime;

    const event: HubEvent<HubStartedEventData> = {
      type: HubEventType.HUB_STARTED,
      timestamp: Date.now(),
      source: 'CCH',
      data: {
        initDuration,
        components,
        storagePath: this.config.storagePath
      }
    };

    this.emitEvent(event);
    this.om?.info('Hub event emitted', { eventType: HubEventType.HUB_STARTED, data: event.data });
  }

  /**
   * Emit hub_stopped event when shutdown completes
   *
   * @param reason - Reason for shutdown
   * @param shutdownStartTime - When shutdown started
   * @param activeMessages - Number of active messages at shutdown
   */
  private emitHubStopped(
    reason: 'manual' | 'error' | 'signal',
    shutdownStartTime: number,
    activeMessages: number
  ): void {
    const shutdownDuration = Date.now() - shutdownStartTime;

    const event: HubEvent<HubStoppedEventData> = {
      type: HubEventType.HUB_STOPPED,
      timestamp: Date.now(),
      source: 'CCH',
      data: {
        reason,
        shutdownDuration,
        activeMessages
      }
    };

    this.emitEvent(event);
    this.om?.info('Hub event emitted', { eventType: HubEventType.HUB_STOPPED, data: event.data });
  }

  /**
   * Get event emitter for advanced event handling
   *
   * @returns The internal EventEmitter instance
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Extract agent type from agent file path
   */
  private extractAgentType(agentFile: string): string {
    // Extract from path like '.claude-plugin/agents/gui-super-expert.md'
    const matches = agentFile.match(/\/([a-z-]+)\.md$/i);
    if (matches && matches[1]) {
      return matches[1].replace(/-/g, '_');
    }
    return 'default';
  }

  /**
   * Merge user config with defaults
   */
  private mergeConfig(userConfig: CCHConfig): Required<CCHConfig> {
    const merged = { ...DEFAULT_CONFIG };

    if (userConfig.storagePath) {
      merged.storagePath = userConfig.storagePath;
    }

    if (userConfig.umq) {
      merged.umq = { ...DEFAULT_CONFIG.umq, ...userConfig.umq };
      merged.umq.storagePath = merged.storagePath;
    }

    if (userConfig.ure) {
      merged.ure = { ...DEFAULT_CONFIG.ure, ...userConfig.ure };
    }

    if (userConfig.cpm) {
      merged.cpm = { ...DEFAULT_CONFIG.cpm, ...userConfig.cpm };
    }

    if (userConfig.ftl) {
      merged.ftl = { ...DEFAULT_CONFIG.ftl, ...userConfig.ftl };
    }

    if (userConfig.om) {
      merged.om = { ...DEFAULT_CONFIG.om, ...userConfig.om };
    }

    if (userConfig.autoInit !== undefined) {
      merged.autoInit = userConfig.autoInit;
    }

    if (userConfig.enableShutdownHooks !== undefined) {
      merged.enableShutdownHooks = userConfig.enableShutdownHooks;
    }

    return merged;
  }

  /**
   * Setup process shutdown hooks
   */
  private setupShutdownHooks(): void {
    const shutdownHandler = async () => {
      await this.shutdown();
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    this.registerShutdownHook(async () => {
      process.off('SIGINT', shutdownHandler);
      process.off('SIGTERM', shutdownHandler);
    });
  }

  // ==========================================================================
  // COMPONENT ACCESS (Advanced usage)
  // ==========================================================================

  /**
   * Get direct access to UMQ instance
   */
  getUMQ(): UnifiedMessageQueue {
    this.ensureInitialized();
    return this.umq!;
  }

  /**
   * Get direct access to URE instance
   */
  getURE(): UnifiedRouterEngine {
    this.ensureInitialized();
    return this.ure!;
  }

  /**
   * Get direct access to CPM instance
   */
  getCPM(): ContextPoolManager {
    this.ensureInitialized();
    return this.cpm!;
  }

  /**
   * Get direct access to FTL instance
   */
  getFTL(): FaultToleranceLayer {
    this.ensureInitialized();
    return this.ftl!;
  }

  /**
   * Get direct access to OM instance
   */
  getOM(): ObservabilityModule {
    this.ensureInitialized();
    return this.om!;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create and initialize a CentralCommunicationHub
 *
 * @param config - Hub configuration
 * @returns Initialized hub instance
 */
export async function createHub(config?: CCHConfig): Promise<CentralCommunicationHub> {
  const hub = new CentralCommunicationHub(config);
  await hub.initialize();
  return hub;
}

/**
 * Create a hub with auto-init disabled (lazy initialization)
 *
 * @param config - Hub configuration
 * @returns Hub instance (call initialize() before use)
 */
export function createHubLazy(config?: CCHConfig): CentralCommunicationHub {
  return new CentralCommunicationHub({ ...config, autoInit: false });
}

/**
 * Create a hub optimized for development
 */
export async function createDevHub(): Promise<CentralCommunicationHub> {
  return createHub({
    storagePath: './cch-dev-data',
    umq: {
      logLevel: 'debug',
      pollingInterval: 50,
      cleanupInterval: 60000
    },
    ure: {
      cachingEnabled: true,
      maxCacheEntries: 100
    },
    cpm: {
      minPoolSize: 2,
      maxPoolSize: 10,
      preloadCount: 3,
      autoCleanupEnabled: true
    },
    om: {
      logLevel: 'debug',
      maxMetrics: 1000,
      maxLogs: 1000
    }
  });
}

/**
 * Create a hub optimized for production
 */
export async function createProductionHub(): Promise<CentralCommunicationHub> {
  return createHub({
    storagePath: './cch-data',
    umq: {
      logLevel: 'info',
      enableMetrics: true
    },
    ure: {
      cachingEnabled: true,
      maxCacheEntries: 1000
    },
    cpm: {
      preloadEnabled: true,
      preloadCount: 20
    },
    ftl: {
      dlqEnabled: true
    },
    om: {
      logLevel: 'info',
      autoExport: true
    }
  });
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultHub: CentralCommunicationHub | null = null;

/**
 * Get or create the default hub instance
 *
 * @param config - Configuration (only used on first call)
 * @returns Hub instance
 */
export async function getHub(config?: CCHConfig): Promise<CentralCommunicationHub> {
  if (!defaultHub) {
    defaultHub = await createHub(config);
  }
  return defaultHub;
}

/**
 * Reset the default hub instance
 */
export async function resetHub(): Promise<void> {
  if (defaultHub) {
    await defaultHub.shutdown();
    defaultHub = null;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default CentralCommunicationHub;
