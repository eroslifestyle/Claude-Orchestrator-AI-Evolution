"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedErrorHandlingSystem = void 0;
const events_1 = require("events");
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
// ============================================================================
// MAIN ERROR HANDLING SYSTEM
// ============================================================================
class AdvancedErrorHandlingSystem extends events_1.EventEmitter {
    config;
    logger;
    errorHistory = new Map();
    retryManager;
    circuitBreakerManager;
    escalationManager;
    correlationEngine;
    recoveryEngine;
    alertManager;
    patternDetector;
    rootCauseAnalyzer;
    constructor(config) {
        super();
        this.config = config;
        this.logger = new logger_1.PluginLogger('ErrorHandlingSystem');
        this.retryManager = new RetryManager(config.retryConfig);
        this.circuitBreakerManager = new CircuitBreakerManager(config.circuitBreakerConfig);
        this.escalationManager = new EscalationManager(config.escalationConfig);
        this.correlationEngine = new ErrorCorrelationEngine(config.correlationConfig);
        this.recoveryEngine = new RecoveryEngine(config.recoveryConfig);
        this.alertManager = new ErrorAlertManager(config.alertConfig);
        this.patternDetector = new ErrorPatternDetector(config.correlationConfig.patternDetection);
        this.rootCauseAnalyzer = new RootCauseAnalyzer(config.correlationConfig.rootCauseAnalysis);
        this.setupEventListeners();
        this.logger.info('🛡️ Advanced Error Handling System V7.0 initialized');
    }
    /**
     * HANDLE EXECUTION ERROR
     * Main entry point for error handling with comprehensive analysis
     */
    async handleError(error, context) {
        const startTime = perf_hooks_1.performance.now();
        // Classify and enrich error
        const executionError = await this.classifyError(error, context);
        this.logger.warn(`🔍 Handling error: ${executionError.type} - ${executionError.message}`);
        try {
            // Record error in history
            this.recordError(executionError);
            // Check circuit breakers
            const circuitState = await this.circuitBreakerManager.checkCircuitBreaker(executionError);
            if (circuitState.state === 'open') {
                return this.createCircuitBreakerResult(executionError, circuitState);
            }
            // Perform error correlation and pattern detection
            const correlationResult = await this.correlationEngine.correlateError(executionError, this.getErrorHistory());
            const patterns = await this.patternDetector.detectPatterns(executionError, this.getErrorHistory());
            // Determine retry strategy
            const retryDecision = await this.retryManager.shouldRetry(executionError, context);
            if (retryDecision.shouldRetry) {
                // Execute retry with appropriate strategy
                const retryResult = await this.executeRetry(executionError, retryDecision, context);
                if (retryResult.success) {
                    await this.circuitBreakerManager.recordSuccess(executionError);
                    return retryResult;
                }
                else {
                    await this.circuitBreakerManager.recordFailure(executionError);
                }
            }
            // Check for escalation requirements
            const escalationDecision = await this.escalationManager.shouldEscalate(executionError, context);
            if (escalationDecision.shouldEscalate) {
                const escalationResult = await this.escalationManager.escalate(executionError, escalationDecision, context);
                return this.createEscalationResult(executionError, escalationResult);
            }
            // Attempt recovery
            const recoveryResult = await this.recoveryEngine.attemptRecovery(executionError, context);
            if (recoveryResult.success) {
                return recoveryResult;
            }
            // Generate alerts if necessary
            await this.alertManager.processError(executionError, context);
            // Perform root cause analysis for persistent errors
            if (correlationResult.isCorrelated || patterns.length > 0) {
                this.performAsyncRootCauseAnalysis(executionError, correlationResult, patterns);
            }
            const handlingTime = perf_hooks_1.performance.now() - startTime;
            this.logger.error(`💥 Error handling completed unsuccessfully in ${handlingTime.toFixed(2)}ms`);
            return this.createFailureResult(executionError, handlingTime);
        }
        catch (handlingError) {
            this.logger.error('💥 Critical error in error handling system:', handlingError);
            return this.createCriticalFailureResult(executionError, handlingError);
        }
    }
    /**
     * HANDLE BATCH ERROR
     * Specialized handling for batch-level errors
     */
    async handleBatchError(error, batch, context) {
        const executionError = await this.classifyError(error, context);
        executionError.context.batchId = batch.id;
        this.logger.warn(`🔍 Handling batch error for ${batch.id}: ${executionError.type}`);
        // Analyze batch-specific patterns
        const batchAnalysis = await this.analyzeBatchError(executionError, batch);
        // Determine batch recovery strategy
        const recoveryStrategy = await this.determineBatchRecoveryStrategy(executionError, batch, batchAnalysis);
        switch (recoveryStrategy.action) {
            case 'retry_batch':
                return this.retryEntireBatch(batch, recoveryStrategy);
            case 'retry_failed_tasks':
                return this.retryFailedTasks(batch, recoveryStrategy);
            case 'partial_completion':
                return this.acceptPartialCompletion(batch, recoveryStrategy);
            case 'abort_batch':
                return this.abortBatch(batch, executionError);
            default:
                return this.escalateBatchError(batch, executionError);
        }
    }
    /**
     * PREVENTIVE ERROR MANAGEMENT
     * Proactive error prevention based on monitoring
     */
    async performPreventiveChecks(context) {
        const results = [];
        for (const preventiveAction of this.config.recoveryConfig.preventiveActions) {
            if (!preventiveAction.enabled)
                continue;
            const triggerResult = await this.evaluatePreventiveTrigger(preventiveAction.trigger, context);
            if (triggerResult.triggered) {
                const actionResult = await this.executePreventiveAction(preventiveAction.action, context);
                results.push({
                    actionName: preventiveAction.name,
                    triggered: true,
                    actionTaken: actionResult.success,
                    impact: actionResult.impact,
                    details: actionResult.details
                });
            }
        }
        return results;
    }
    // ========================================================================
    // ERROR CLASSIFICATION AND ENRICHMENT
    // ========================================================================
    async classifyError(error, context) {
        if (this.isExecutionError(error)) {
            return error;
        }
        const errorType = this.determineErrorType(error);
        const category = this.determineErrorCategory(error, errorType);
        const source = this.determineErrorSource(error, context);
        const severity = this.determineErrorSeverity(error, context);
        const executionError = {
            id: this.generateErrorId(),
            type: errorType,
            category,
            source,
            severity,
            message: error.message || 'Unknown error',
            originalError: error,
            context,
            timestamp: new Date(),
            retryable: this.isRetryable(errorType, category),
            escalationRequired: this.requiresEscalation(severity, category),
            metadata: this.extractErrorMetadata(error, context)
        };
        // Enrich with correlation ID if part of a pattern
        const correlationId = await this.correlationEngine.getCorrelationId(executionError);
        if (correlationId) {
            executionError.correlationId = correlationId;
        }
        return executionError;
    }
    determineErrorType(error) {
        // Error type classification logic
        const errorMessage = error.message.toLowerCase();
        const errorName = error.name.toLowerCase();
        if (errorMessage.includes('timeout') || errorName.includes('timeout')) {
            return 'timeout_error';
        }
        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            return 'network_error';
        }
        if (errorMessage.includes('api') || errorMessage.includes('request')) {
            return 'api_error';
        }
        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return 'validation_error';
        }
        if (errorMessage.includes('resource') || errorMessage.includes('memory') || errorMessage.includes('cpu')) {
            return 'resource_error';
        }
        if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            return 'permission_error';
        }
        return 'unknown_error';
    }
    determineErrorCategory(error, errorType) {
        const transientTypes = ['timeout_error', 'network_error', 'api_error'];
        const permanentTypes = ['validation_error', 'permission_error'];
        const resourceTypes = ['resource_error'];
        if (transientTypes.includes(errorType))
            return 'transient';
        if (permanentTypes.includes(errorType))
            return 'permanent';
        if (resourceTypes.includes(errorType))
            return 'resource';
        return 'internal';
    }
    determineErrorSource(error, context) {
        // Determine error source based on context and error characteristics
        if (context.executionPhase === 'validation')
            return 'validation';
        if (error.message.includes('timeout'))
            return 'timeout';
        if (error.message.includes('network'))
            return 'network';
        if (error.message.includes('api'))
            return 'api';
        if (error.message.includes('resource'))
            return 'resource';
        return 'system';
    }
    determineErrorSeverity(error, context) {
        // Severity determination logic
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
            return 'critical';
        }
        if (context.attempt > 3) {
            return 'high';
        }
        if (errorMessage.includes('warning')) {
            return 'low';
        }
        return 'medium';
    }
    isRetryable(errorType, category) {
        const nonRetryableTypes = ['validation_error', 'permission_error'];
        const nonRetryableCategories = ['permanent', 'configuration'];
        return !nonRetryableTypes.includes(errorType) && !nonRetryableCategories.includes(category);
    }
    requiresEscalation(severity, category) {
        return severity === 'critical' || (severity === 'high' && category === 'permanent');
    }
    extractErrorMetadata(error, context) {
        return {
            stack: error.stack,
            errorConstructor: error.constructor.name,
            contextPhase: context.executionPhase,
            resourceUsage: context.resourceState,
            systemState: context.systemState
        };
    }
    isExecutionError(error) {
        return error && typeof error === 'object' && 'id' in error && 'type' in error && 'category' in error;
    }
    generateErrorId() {
        return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    // ========================================================================
    // RETRY EXECUTION
    // ========================================================================
    async executeRetry(error, retryDecision, context) {
        const attempt = {
            attemptNumber: retryDecision.attemptNumber,
            timestamp: new Date(),
            error,
            strategy: retryDecision.strategy,
            delay: retryDecision.delay,
            outcome: 'failure',
            executionTime: 0,
            resourceUsage: context.resourceState
        };
        try {
            // Apply retry delay
            if (retryDecision.delay > 0) {
                this.logger.debug(`⏳ Applying retry delay: ${retryDecision.delay}ms`);
                await this.delay(retryDecision.delay);
            }
            const startTime = perf_hooks_1.performance.now();
            // Execute the retry operation (this would call the actual task execution)
            const retryResult = await this.executeWithRetry(context, retryDecision);
            attempt.executionTime = perf_hooks_1.performance.now() - startTime;
            if (retryResult.success) {
                attempt.outcome = 'success';
                this.logger.info(`✅ Retry successful for ${error.type} after ${attempt.attemptNumber} attempts`);
                return {
                    success: true,
                    action: 'retry_succeeded',
                    error,
                    retryAttempt: attempt,
                    result: retryResult.result,
                    handlingTime: attempt.executionTime,
                    metadata: {
                        retryStrategy: retryDecision.strategy,
                        totalAttempts: attempt.attemptNumber
                    }
                };
            }
            else {
                attempt.outcome = 'failure';
                this.logger.warn(`❌ Retry failed for ${error.type}, attempt ${attempt.attemptNumber}`);
                return {
                    success: false,
                    action: 'retry_failed',
                    error,
                    retryAttempt: attempt,
                    handlingTime: attempt.executionTime,
                    nextAction: 'escalate'
                };
            }
        }
        catch (retryError) {
            attempt.outcome = 'aborted';
            attempt.executionTime = perf_hooks_1.performance.now();
            this.logger.error(`💥 Retry execution failed:`, retryError);
            return {
                success: false,
                action: 'retry_aborted',
                error,
                retryAttempt: attempt,
                handlingTime: attempt.executionTime,
                nextAction: 'escalate'
            };
        }
    }
    async executeWithRetry(context, retryDecision) {
        // This is a placeholder for actual retry execution
        // In real implementation, this would call the task execution again
        // Simulate retry with improved success probability
        const baseSuccessRate = 0.3;
        const improvementPerAttempt = 0.2;
        const successRate = Math.min(0.9, baseSuccessRate + (retryDecision.attemptNumber - 1) * improvementPerAttempt);
        return new Promise((resolve) => {
            setTimeout(() => {
                const success = Math.random() < successRate;
                resolve({
                    success,
                    result: success ? { retried: true, attempt: retryDecision.attemptNumber } : undefined
                });
            }, 100 + Math.random() * 500); // Simulate execution time
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ========================================================================
    // BATCH ERROR HANDLING METHODS
    // ========================================================================
    async analyzeBatchError(error, batch) {
        const failedTasks = Array.from(batch.results.values()).filter(r => r.status === 'failed');
        const completedTasks = Array.from(batch.results.values()).filter(r => r.status === 'completed');
        return {
            batchId: batch.id,
            totalTasks: batch.tasks.length,
            failedTasks: failedTasks.length,
            completedTasks: completedTasks.length,
            failureRate: failedTasks.length / batch.tasks.length,
            commonErrors: this.analyzeCommonErrors(failedTasks),
            resourceImpact: this.analyzeResourceImpact(batch),
            dependencyImpact: this.analyzeDependencyImpact(batch),
            recoveryFeasibility: this.assessRecoveryFeasibility(batch, error)
        };
    }
    async determineBatchRecoveryStrategy(error, batch, analysis) {
        // Determine the best recovery strategy based on analysis
        if (analysis.failureRate < 0.2) {
            return {
                action: 'retry_failed_tasks',
                reason: 'Low failure rate - retry only failed tasks',
                priority: 'high',
                estimatedSuccessRate: 0.8
            };
        }
        if (analysis.failureRate < 0.5 && analysis.recoveryFeasibility > 0.7) {
            return {
                action: 'partial_completion',
                reason: 'Moderate failure rate - accept partial completion',
                priority: 'medium',
                estimatedSuccessRate: 0.6
            };
        }
        if (analysis.commonErrors.length > 0 && analysis.recoveryFeasibility > 0.5) {
            return {
                action: 'retry_batch',
                reason: 'Common error pattern detected - retry entire batch with adjustments',
                priority: 'medium',
                estimatedSuccessRate: 0.7
            };
        }
        return {
            action: 'abort_batch',
            reason: 'High failure rate and low recovery feasibility',
            priority: 'low',
            estimatedSuccessRate: 0.1
        };
    }
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    setupEventListeners() {
        this.on('errorHandled', (result) => {
            this.logger.debug(`Error handling completed: ${result.action}`);
        });
        this.on('patternDetected', (pattern) => {
            this.logger.warn(`⚠️ Error pattern detected: ${pattern.name} (confidence: ${pattern.confidence})`);
        });
        this.on('escalationTriggered', (escalation) => {
            this.logger.error(`🚨 Escalation triggered: ${escalation.level} - ${escalation.reason}`);
        });
    }
    recordError(error) {
        const key = error.context.taskId || error.context.batchId || 'system';
        const errors = this.errorHistory.get(key) || [];
        errors.push(error);
        // Keep only recent errors
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        const recentErrors = errors.filter(e => e.timestamp.getTime() > cutoffTime);
        this.errorHistory.set(key, recentErrors);
    }
    getErrorHistory() {
        const allErrors = [];
        for (const errors of this.errorHistory.values()) {
            allErrors.push(...errors);
        }
        return allErrors.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    createCircuitBreakerResult(error, circuitState) {
        return {
            success: false,
            action: 'circuit_breaker_open',
            error,
            handlingTime: 0,
            metadata: {
                circuitBreaker: circuitState.name,
                nextAttemptTime: circuitState.nextAttemptTime
            },
            nextAction: 'wait'
        };
    }
    createEscalationResult(error, escalationResult) {
        return {
            success: false,
            action: 'escalated',
            error,
            handlingTime: 0,
            metadata: {
                escalationLevel: escalationResult.level,
                escalationAction: escalationResult.action
            },
            nextAction: 'manual_intervention'
        };
    }
    createFailureResult(error, handlingTime) {
        return {
            success: false,
            action: 'unrecoverable',
            error,
            handlingTime,
            nextAction: 'abort'
        };
    }
    createCriticalFailureResult(error, handlingError) {
        return {
            success: false,
            action: 'critical_failure',
            error,
            handlingTime: 0,
            metadata: {
                handlingError: handlingError.message
            },
            nextAction: 'emergency_stop'
        };
    }
    async performAsyncRootCauseAnalysis(error, correlation, patterns) {
        // Perform root cause analysis asynchronously
        setTimeout(async () => {
            try {
                const analysis = await this.rootCauseAnalyzer.analyze(error, correlation, patterns);
                this.emit('rootCauseAnalyzed', analysis);
            }
            catch (analysisError) {
                this.logger.error('Root cause analysis failed:', analysisError);
            }
        }, 0);
    }
    // Placeholder methods for batch recovery strategies
    async retryEntireBatch(batch, strategy) {
        return { success: false, action: 'retry_batch', batchId: batch.id, strategy };
    }
    async retryFailedTasks(batch, strategy) {
        return { success: false, action: 'retry_failed_tasks', batchId: batch.id, strategy };
    }
    async acceptPartialCompletion(batch, strategy) {
        return { success: true, action: 'partial_completion', batchId: batch.id, strategy };
    }
    async abortBatch(batch, error) {
        return { success: false, action: 'abort_batch', batchId: batch.id, error };
    }
    async escalateBatchError(batch, error) {
        return { success: false, action: 'escalate_batch', batchId: batch.id, error };
    }
    // Placeholder analysis methods
    analyzeCommonErrors(failedTasks) { return []; }
    analyzeResourceImpact(batch) { return 0.5; }
    analyzeDependencyImpact(batch) { return 0.3; }
    assessRecoveryFeasibility(batch, error) { return 0.6; }
    // Preventive action methods
    async evaluatePreventiveTrigger(trigger, context) {
        return { triggered: false };
    }
    async executePreventiveAction(action, context) {
        return { success: true, impact: 0.1, details: {} };
    }
}
exports.AdvancedErrorHandlingSystem = AdvancedErrorHandlingSystem;
// ============================================================================
// SUPPORTING CLASSES (PLACEHOLDER IMPLEMENTATIONS)
// ============================================================================
class RetryManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async shouldRetry(error, context) {
        const maxAttempts = this.config.maxAttempts;
        const currentAttempt = context.attempt;
        if (currentAttempt >= maxAttempts || !error.retryable) {
            return {
                shouldRetry: false,
                reason: currentAttempt >= maxAttempts ? 'max_attempts_exceeded' : 'non_retryable_error',
                attemptNumber: currentAttempt,
                strategy: 'none',
                delay: 0
            };
        }
        const strategy = this.selectRetryStrategy(error);
        const delay = this.calculateDelay(currentAttempt, strategy);
        return {
            shouldRetry: true,
            reason: 'retryable_error',
            attemptNumber: currentAttempt + 1,
            strategy: strategy.name,
            delay
        };
    }
    selectRetryStrategy(error) {
        const applicableStrategies = this.config.strategies.filter(s => s.applicableErrorTypes.includes(error.type) || s.applicableErrorTypes.includes('all'));
        return applicableStrategies[0] || this.config.strategies[0];
    }
    calculateDelay(attempt, strategy) {
        let delay;
        switch (strategy.strategy) {
            case 'exponential':
                delay = Math.min(strategy.minDelay * Math.pow(2, attempt - 1), strategy.maxDelay);
                break;
            case 'linear':
                delay = Math.min(strategy.minDelay * attempt, strategy.maxDelay);
                break;
            case 'adaptive':
                delay = this.calculateAdaptiveDelay(attempt, strategy);
                break;
            default:
                delay = strategy.minDelay;
        }
        if (strategy.jitterEnabled) {
            const jitter = delay * strategy.jitterAmount * (Math.random() - 0.5);
            delay = Math.max(0, delay + jitter);
        }
        return Math.floor(delay);
    }
    calculateAdaptiveDelay(attempt, strategy) {
        // Adaptive delay based on recent success rates
        const baseDelay = strategy.minDelay * Math.pow(1.5, attempt - 1);
        return Math.min(baseDelay, strategy.maxDelay);
    }
}
// Placeholder implementations for other supporting classes
class CircuitBreakerManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async checkCircuitBreaker(error) {
        return { name: 'default', scope: 'system', state: 'closed', failureCount: 0, successCount: 0, stateChangeHistory: [] };
    }
    async recordSuccess(error) { }
    async recordFailure(error) { }
}
class EscalationManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async shouldEscalate(error, context) {
        return { shouldEscalate: error.escalationRequired };
    }
    async escalate(error, decision, context) {
        return { level: 1, action: 'manual_review' };
    }
}
class ErrorCorrelationEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    async correlateError(error, history) {
        return { isCorrelated: false };
    }
    async getCorrelationId(error) {
        return undefined;
    }
}
class RecoveryEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    async attemptRecovery(error, context) {
        return { success: false };
    }
}
class ErrorAlertManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async processError(error, context) { }
}
class ErrorPatternDetector {
    config;
    constructor(config) {
        this.config = config;
    }
    async detectPatterns(error, history) {
        return [];
    }
}
class RootCauseAnalyzer {
    config;
    constructor(config) {
        this.config = config;
    }
    async analyze(error, correlation, patterns) {
        return {
            id: 'analysis-1',
            errorId: error.id,
            analysisMethod: 'statistical',
            confidence: 0.7,
            rootCause: { type: 'resource_exhaustion', description: 'System running out of memory', evidence: [], probability: 0.8 },
            contributingFactors: [],
            recommendations: [],
            timestamp: new Date()
        };
    }
}
exports.default = AdvancedErrorHandlingSystem;
//# sourceMappingURL=error-handling-system.js.map