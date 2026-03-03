/**
 * CCH (Central Communication Hub) Module - Barrel Export
 *
 * Provides context pooling, fault tolerance, observability, routing,
 * message queue, and the main hub orchestrator.
 *
 * @version 1.0.0
 * @date 01 February 2026
 */
export { CentralCommunicationHub, createHub, createHubLazy, createDevHub, createProductionHub, getHub, resetHub, type CCHConfig, type HubStats, type TaskExecutionResult, type AgentExecutionContext, type HubEventHandler } from './CentralCommunicationHub';
export { ContextPoolManager, getContextPoolManager, resetContextPoolManager, createContextPoolManager, createLowMemoryPoolManager, createHighThroughputPoolManager, type CleanContext, type ContextState, type PoolStats, type AgentTypeStats, type ContextPoolConfig, type AcquisitionResult } from './pool/ContextPoolManager';
export { FaultToleranceLayer, createFaultToleranceLayer, CircuitBreakerOpenError, RetryExhaustedError, type CircuitState, type FailureType, type RetryPolicy, type CircuitBreakerConfig, type FaultToleranceConfig, type DeadLetterMessage, type ServiceMetrics, type HealthStatus, type ServiceHealth } from './fault/FaultToleranceLayer';
export { ObservabilityModule, createObservability, getObservability, resetObservability, type Metric, type MetricData, type Span, type LogEntry, type Alert, type AlertRule, type ObservabilityConfig } from './observability/ObservabilityModule';
export { UnifiedRouterEngine, createUnifiedRouterEngine, type RoutingDecision, type TaskRequest, type RouterStats, type UnifiedRouterConfig, type AgentRegistryEntry } from './routing/UnifiedRouterEngine';
export { UnifiedMessageQueue, createUMQ, type CCHMessage, type MessageHandler, type Subscription, type QueueStats, type MessagePriority, type MessageStatus, type MessageHeader } from './queue/UnifiedMessageQueue';
export { CentralCommunicationHub as default } from './CentralCommunicationHub';
export type { UMQConfig, UREConfig, CPMConfig, FTLConfig, LRUCacheEntry, HubOptions, HubEventType, HubEvent, HubStartedEventData, HubStoppedEventData, ComponentStatus, ComponentsStatus } from './types';
//# sourceMappingURL=index.d.ts.map