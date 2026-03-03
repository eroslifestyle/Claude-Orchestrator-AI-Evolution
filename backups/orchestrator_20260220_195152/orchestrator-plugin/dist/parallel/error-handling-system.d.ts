/**
 * ADVANCED ERROR HANDLING & RETRY SYSTEM V7.0
 *
 * Sistema avanzato per gestione errori e retry con:
 * - Intelligent error classification e recovery
 * - Adaptive retry strategies con circuit breaker
 * - Error correlation e root cause analysis
 * - Automatic escalation e fallback mechanisms
 * - Resilience patterns e self-healing capabilities
 *
 * @author Livello 5 Error Recovery Expert
 * @version 7.0.0-resilient
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { ModelType } from '../types';
import type { ExecutionBatch } from './parallel-execution-engine';
export interface ErrorHandlingConfig {
    retryConfig: RetryConfiguration;
    circuitBreakerConfig: CircuitBreakerConfiguration;
    escalationConfig: EscalationConfiguration;
    correlationConfig: ErrorCorrelationConfiguration;
    recoveryConfig: RecoveryConfiguration;
    alertConfig: ErrorAlertConfiguration;
}
export interface RetryConfiguration {
    maxAttempts: number;
    strategies: RetryStrategyConfig[];
    backoffConfig: BackoffConfiguration;
    timeoutConfig: TimeoutConfiguration;
    conditionConfig: RetryConditionConfiguration;
}
export interface RetryStrategyConfig {
    name: string;
    strategy: 'exponential' | 'linear' | 'adaptive' | 'custom';
    minDelay: number;
    maxDelay: number;
    jitterEnabled: boolean;
    jitterAmount: number;
    applicableErrorTypes: string[];
}
export interface BackoffConfiguration {
    baseDelay: number;
    multiplier: number;
    maxDelay: number;
    jitter: boolean;
    jitterType: 'full' | 'equal' | 'decorrelated';
}
export interface TimeoutConfiguration {
    initialTimeout: number;
    maxTimeout: number;
    timeoutIncreaseFactor: number;
    adaptiveTimeout: boolean;
}
export interface RetryConditionConfiguration {
    retryableErrors: RetryableErrorConfig[];
    nonRetryableErrors: string[];
    customConditions: CustomRetryCondition[];
}
export interface RetryableErrorConfig {
    errorType: string;
    errorPattern?: RegExp;
    maxRetries: number;
    customStrategy?: string;
    escalationThreshold?: number;
}
export interface CustomRetryCondition {
    name: string;
    condition: (error: ExecutionError, attempt: number, context: ErrorContext) => boolean;
    strategy?: string;
}
export interface CircuitBreakerConfiguration {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
    halfOpenMaxAttempts: number;
    circuitLevels: CircuitLevel[];
}
export interface CircuitLevel {
    name: string;
    scope: 'task' | 'agent' | 'model' | 'system';
    failureThreshold: number;
    recoveryTimeout: number;
    fallbackAction: FallbackAction;
}
export interface FallbackAction {
    type: 'model_switch' | 'agent_switch' | 'skip_task' | 'degrade_requirements' | 'manual_intervention';
    parameters: Record<string, any>;
    timeout: number;
}
export interface EscalationConfiguration {
    enabled: boolean;
    escalationLevels: EscalationLevel[];
    automaticEscalation: boolean;
    escalationDelay: number;
    maxEscalationLevel: number;
}
export interface EscalationLevel {
    level: number;
    name: string;
    trigger: EscalationTrigger;
    action: EscalationAction;
    notificationConfig: NotificationConfiguration;
}
export interface EscalationTrigger {
    errorCount: number;
    errorRate: number;
    timeWindow: number;
    specificErrors?: string[];
    severity?: ErrorSeverity;
}
export interface EscalationAction {
    type: 'model_upgrade' | 'resource_increase' | 'manual_review' | 'abort_execution' | 'custom';
    parameters: Record<string, any>;
    automatic: boolean;
    requiresApproval: boolean;
}
export interface NotificationConfiguration {
    channels: ('email' | 'slack' | 'webhook' | 'console')[];
    recipients: string[];
    template: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
}
export interface ErrorCorrelationConfiguration {
    enabled: boolean;
    correlationWindow: number;
    correlationThreshold: number;
    patternDetection: PatternDetectionConfig;
    rootCauseAnalysis: RootCauseAnalysisConfig;
}
export interface PatternDetectionConfig {
    enabledPatterns: ('temporal' | 'resource' | 'task_type' | 'agent_type' | 'model_type')[];
    minOccurrences: number;
    confidenceThreshold: number;
    learningEnabled: boolean;
}
export interface RootCauseAnalysisConfig {
    enabledMethods: ('statistical' | 'ml_based' | 'rule_based' | 'correlation')[];
    analysisDepth: number;
    confidenceThreshold: number;
    historicalDataPeriod: number;
}
export interface RecoveryConfiguration {
    recoveryStrategies: RecoveryStrategy[];
    selfHealingEnabled: boolean;
    preventiveActions: PreventiveAction[];
    recoveryTimeout: number;
}
export interface RecoveryStrategy {
    name: string;
    applicableErrors: string[];
    recoverySteps: RecoveryStep[];
    successThreshold: number;
    maxRecoveryAttempts: number;
}
export interface RecoveryStep {
    name: string;
    action: 'restart_task' | 'clear_cache' | 'reset_resources' | 'switch_environment' | 'custom';
    parameters: Record<string, any>;
    timeout: number;
    rollbackOnFailure: boolean;
}
export interface PreventiveAction {
    name: string;
    trigger: PreventiveTrigger;
    action: PreventiveActionType;
    enabled: boolean;
}
export interface PreventiveTrigger {
    type: 'error_rate' | 'resource_usage' | 'performance_degradation' | 'pattern_detected';
    threshold: number;
    timeWindow: number;
}
export interface PreventiveActionType {
    type: 'scale_resources' | 'redistribute_load' | 'switch_models' | 'enable_degraded_mode';
    parameters: Record<string, any>;
}
export interface ErrorAlertConfiguration {
    enabledAlerts: ErrorAlertType[];
    alertThresholds: AlertThreshold[];
    notificationConfig: NotificationConfiguration;
    alertDeduplication: boolean;
    alertGrouping: boolean;
}
export interface ErrorAlertType {
    name: string;
    condition: string;
    severity: ErrorSeverity;
    cooldownPeriod: number;
}
export interface AlertThreshold {
    metric: 'error_rate' | 'error_count' | 'escalation_count' | 'circuit_breaker_trips';
    threshold: number;
    timeWindow: number;
    severity: ErrorSeverity;
}
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'transient' | 'permanent' | 'configuration' | 'resource' | 'external' | 'internal';
export type ErrorSource = 'api' | 'network' | 'system' | 'validation' | 'timeout' | 'resource' | 'logic';
export interface ExecutionError {
    id: string;
    type: string;
    category: ErrorCategory;
    source: ErrorSource;
    severity: ErrorSeverity;
    message: string;
    originalError?: Error;
    context: ErrorContext;
    timestamp: Date;
    retryable: boolean;
    escalationRequired: boolean;
    correlationId?: string;
    metadata: Record<string, any>;
}
export interface ErrorContext {
    taskId?: string;
    batchId?: string;
    agentId?: string;
    model?: ModelType;
    attempt: number;
    executionPhase: 'preparation' | 'execution' | 'validation' | 'completion';
    resourceState: ResourceState;
    systemState: SystemState;
    userContext?: Record<string, any>;
}
export interface ResourceState {
    memoryUsage: number;
    cpuUsage: number;
    tokensUsed: number;
    costAccrued: number;
    concurrentTasks: number;
}
export interface SystemState {
    uptime: number;
    loadAverage: number;
    errorRate: number;
    activeCircuitBreakers: string[];
    degradedComponents: string[];
}
export interface RetryAttempt {
    attemptNumber: number;
    timestamp: Date;
    error: ExecutionError;
    strategy: string;
    delay: number;
    outcome: 'success' | 'failure' | 'timeout' | 'aborted';
    executionTime: number;
    resourceUsage: ResourceState;
}
export interface CircuitBreakerState {
    name: string;
    scope: string;
    state: 'closed' | 'open' | 'half_open';
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
    stateChangeHistory: CircuitStateChange[];
}
export interface CircuitStateChange {
    fromState: string;
    toState: string;
    timestamp: Date;
    reason: string;
    triggeringError?: ExecutionError;
}
export interface ErrorPattern {
    id: string;
    name: string;
    pattern: PatternDefinition;
    confidence: number;
    occurrences: number;
    firstSeen: Date;
    lastSeen: Date;
    impact: number;
    suggestedActions: string[];
}
export interface PatternDefinition {
    type: 'temporal' | 'resource' | 'task_sequence' | 'error_correlation';
    parameters: Record<string, any>;
    matcher: (error: ExecutionError, history: ExecutionError[]) => boolean;
}
export interface RootCauseAnalysis {
    id: string;
    errorId: string;
    analysisMethod: string;
    confidence: number;
    rootCause: RootCause;
    contributingFactors: ContributingFactor[];
    recommendations: Recommendation[];
    timestamp: Date;
}
export interface RootCause {
    type: string;
    description: string;
    evidence: Evidence[];
    probability: number;
}
export interface ContributingFactor {
    name: string;
    impact: number;
    description: string;
    evidence: Evidence[];
}
export interface Evidence {
    type: 'metric' | 'log' | 'correlation' | 'pattern';
    description: string;
    value: any;
    confidence: number;
}
export interface Recommendation {
    type: 'immediate' | 'short_term' | 'long_term';
    action: string;
    description: string;
    priority: number;
    estimatedImpact: number;
    implementation: string[];
}
export declare class AdvancedErrorHandlingSystem extends EventEmitter {
    private config;
    private logger;
    private errorHistory;
    private retryManager;
    private circuitBreakerManager;
    private escalationManager;
    private correlationEngine;
    private recoveryEngine;
    private alertManager;
    private patternDetector;
    private rootCauseAnalyzer;
    constructor(config: ErrorHandlingConfig);
    /**
     * HANDLE EXECUTION ERROR
     * Main entry point for error handling with comprehensive analysis
     */
    handleError(error: Error | ExecutionError, context: ErrorContext): Promise<ErrorHandlingResult>;
    /**
     * HANDLE BATCH ERROR
     * Specialized handling for batch-level errors
     */
    handleBatchError(error: Error | ExecutionError, batch: ExecutionBatch, context: ErrorContext): Promise<BatchErrorHandlingResult>;
    /**
     * PREVENTIVE ERROR MANAGEMENT
     * Proactive error prevention based on monitoring
     */
    performPreventiveChecks(context: SystemMonitoringContext): Promise<PreventiveActionResult[]>;
    private classifyError;
    private determineErrorType;
    private determineErrorCategory;
    private determineErrorSource;
    private determineErrorSeverity;
    private isRetryable;
    private requiresEscalation;
    private extractErrorMetadata;
    private isExecutionError;
    private generateErrorId;
    private executeRetry;
    private executeWithRetry;
    private delay;
    private analyzeBatchError;
    private determineBatchRecoveryStrategy;
    private setupEventListeners;
    private recordError;
    private getErrorHistory;
    private createCircuitBreakerResult;
    private createEscalationResult;
    private createFailureResult;
    private createCriticalFailureResult;
    private performAsyncRootCauseAnalysis;
    private retryEntireBatch;
    private retryFailedTasks;
    private acceptPartialCompletion;
    private abortBatch;
    private escalateBatchError;
    private analyzeCommonErrors;
    private analyzeResourceImpact;
    private analyzeDependencyImpact;
    private assessRecoveryFeasibility;
    private evaluatePreventiveTrigger;
    private executePreventiveAction;
}
export interface ErrorHandlingResult {
    success: boolean;
    action?: string;
    error?: ExecutionError;
    retryAttempt?: RetryAttempt;
    result?: any;
    handlingTime?: number;
    metadata?: Record<string, any>;
    nextAction?: string;
}
export interface BatchErrorHandlingResult {
    success: boolean;
    action: string;
    batchId: string;
    error?: ExecutionError;
    strategy?: BatchRecoveryStrategy;
}
export interface RetryDecision {
    shouldRetry: boolean;
    reason: string;
    attemptNumber: number;
    strategy: string;
    delay: number;
}
export interface BatchErrorAnalysis {
    batchId: string;
    totalTasks: number;
    failedTasks: number;
    completedTasks: number;
    failureRate: number;
    commonErrors: any[];
    resourceImpact: number;
    dependencyImpact: number;
    recoveryFeasibility: number;
}
export interface BatchRecoveryStrategy {
    action: 'retry_batch' | 'retry_failed_tasks' | 'partial_completion' | 'abort_batch';
    reason: string;
    priority: 'low' | 'medium' | 'high';
    estimatedSuccessRate: number;
}
export interface SystemMonitoringContext {
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    activeConnections: number;
    queueSize: number;
}
export interface PreventiveActionResult {
    actionName: string;
    triggered: boolean;
    actionTaken: boolean;
    impact: number;
    details: any;
}
export default AdvancedErrorHandlingSystem;
//# sourceMappingURL=error-handling-system.d.ts.map