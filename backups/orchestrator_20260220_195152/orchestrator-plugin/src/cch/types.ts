/**
 * CCH (Central Communication Hub) - Common Type Definitions
 *
 * Centralized type definitions for all CCH components.
 * This file provides unified exports and type aliases for consistency.
 *
 * @module CCH/Types
 * @version 1.0.0
 * @date 02 February 2026
 */

// =============================================================================
// TYPE ALIASES FOR CONFIGURATION INTERFACES
// =============================================================================

/**
 * Type alias for UMQ configuration
 * Re-exported from UnifiedMessageQueue for convenience
 */
export type UMQConfig = import('./queue/UnifiedMessageQueue').UMQConfig;

/**
 * Type alias for URE configuration
 * Re-exported from UnifiedRouterEngine for convenience
 */
export type UREConfig = import('./routing/UnifiedRouterEngine').UnifiedRouterConfig;

/**
 * Type alias for CPM configuration
 * Re-exported from ContextPoolManager for convenience
 */
export type CPMConfig = import('./pool/ContextPoolManager').ContextPoolConfig;

/**
 * Type alias for FTL configuration
 * Re-exported from FaultToleranceLayer for convenience
 */
export type FTLConfig = import('./fault/FaultToleranceLayer').FaultToleranceConfig;

/**
 * Type alias for LRUCacheEntry from URE
 * Re-exported from UnifiedRouterEngine for convenience
 */
export type LRUCacheEntry<V = unknown> = {
  value: V;
  key: string;
  prev: LRUCacheEntry<V> | null;
  next: LRUCacheEntry<V> | null;
  expiresAt: number;
  accessCount: number;
};

// =============================================================================
// HUB SPECIFIC TYPES
// =============================================================================

/**
 * Hub initialization options
 * Extends CCHConfig with additional hub-specific options
 */
export interface HubOptions {
  /** Storage path for persistence */
  storagePath?: string;
  /** UMQ configuration */
  umq?: Partial<UMQConfig>;
  /** URE configuration */
  ure?: Partial<UREConfig>;
  /** CPM configuration */
  cpm?: Partial<CPMConfig>;
  /** FTL configuration */
  ftl?: Partial<import('./fault/FaultToleranceLayer').FaultToleranceConfig>;
  /** OM configuration */
  om?: Partial<import('./observability/ObservabilityModule').ObservabilityConfig>;
  /** Enable automatic initialization */
  autoInit?: boolean;
  /** Enable graceful shutdown hooks */
  enableShutdownHooks?: boolean;
  /** Emit hub lifecycle events */
  emitEvents?: boolean;
  /** Enable debug mode */
  debugMode?: boolean;
}

/**
 * Hub lifecycle event types
 * Defines the events emitted by the CentralCommunicationHub
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
 * Hub event payload
 * Base interface for all hub events
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

// =============================================================================
// RE-EXPORTED TYPES FROM ALL CCH COMPONENTS
// =============================================================================

// -------------------------------------------------------------------------
// From UnifiedMessageQueue (UMQ)
// -------------------------------------------------------------------------

export type { CCHMessage, MessageHandler, Subscription, QueueStats, MessagePriority, MessageStatus, MessageHeader }
  from './queue/UnifiedMessageQueue';

// -------------------------------------------------------------------------
// From UnifiedRouterEngine (URE)
// -------------------------------------------------------------------------

export type { RoutingDecision, TaskRequest, RouterStats, AgentRegistryEntry }
  from './routing/UnifiedRouterEngine';

// -------------------------------------------------------------------------
// From ContextPoolManager (CPM)
// -------------------------------------------------------------------------

export type { CleanContext, ContextState, PoolStats, AgentTypeStats, AcquisitionResult }
  from './pool/ContextPoolManager';

// -------------------------------------------------------------------------
// From FaultToleranceLayer (FTL)
// -------------------------------------------------------------------------

export type { CircuitState, FailureType, RetryPolicy, CircuitBreakerConfig, FaultToleranceConfig, DeadLetterMessage, ServiceMetrics, HealthStatus, ServiceHealth }
  from './fault/FaultToleranceLayer';

// -------------------------------------------------------------------------
// From ObservabilityModule (OM)
// -------------------------------------------------------------------------

export type { Metric, MetricData, Span, LogEntry, Alert, AlertRule, ObservabilityConfig }
  from './observability/ObservabilityModule';

// -------------------------------------------------------------------------
// From CentralCommunicationHub (CCH)
// -------------------------------------------------------------------------

export type { CCHConfig, HubStats, TaskExecutionResult, AgentExecutionContext }
  from './CentralCommunicationHub';

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Deep partial type - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract promise return type
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

// =============================================================================
// COMPONENT STATUS TYPES
// =============================================================================

/**
 * Individual component status
 */
export interface ComponentStatus {
  /** Component name */
  name: string;
  /** Whether component is initialized */
  initialized: boolean;
  /** Current health status */
  health: 'healthy' | 'degraded' | 'unhealthy';
  /** Last error if any */
  lastError?: string;
  /** Uptime in milliseconds */
  uptime: number;
}

/**
 * All CCH components status
 */
export interface ComponentsStatus {
  /** UMQ status */
  umq: ComponentStatus;
  /** URE status */
  ure: ComponentStatus;
  /** CPM status */
  cpm: ComponentStatus;
  /** FTL status */
  ftl: ComponentStatus;
  /** OM status */
  om: ComponentStatus;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

// Note: This module only exports types, no default export
