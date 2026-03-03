/**
 * ERROR RECOVERY MANAGER - Gestione Errori ed Escalation Automatica
 *
 * REGOLE IMPLEMENTATE:
 * 1. RETRY AUTOMATICO: Riprova task falliti con backoff esponenziale
 * 2. FALLBACK AGENT: Passa ad agent alternativo se il primario fallisce
 * 3. ESCALATION AUTOMATICA: Scala a model superiore per task critici
 * 4. CIRCUIT BREAKER: Ferma esecuzione se troppi errori consecutivi
 * 5. RECOVERY STRATEGY: Strategie multiple per recupero
 *
 * @version 1.0
 * @date 2026-02-03
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type ModelTier = 'haiku' | 'sonnet' | 'opus';
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecoveryAction =
  | 'RETRY'
  | 'FALLBACK_AGENT'
  | 'ESCALATE_MODEL'
  | 'SKIP'
  | 'ABORT'
  | 'MANUAL_INTERVENTION';

export interface TaskError {
  taskId: string;
  agentId: string;
  error: Error;
  timestamp: number;
  attemptNumber: number;
  severity: ErrorSeverity;
  recoverable: boolean;
  context?: any;
}

export interface RecoveryResult {
  taskId: string;
  action: RecoveryAction;
  success: boolean;
  newAgentId?: string;
  newModel?: ModelTier;
  retryCount?: number;
  message: string;
}

export interface EscalationRule {
  condition: (error: TaskError) => boolean;
  action: RecoveryAction;
  targetModel?: ModelTier;
  fallbackAgent?: string;
  maxRetries?: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  openedAt?: number;
  halfOpenAttempts: number;
}

export interface RecoveryManagerConfig {
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  maxRetryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
  enableAutoEscalation: boolean;
  escalationThreshold: number;  // Failures before escalation
  fallbackAgentMap: Record<string, string>;
  criticalTaskPatterns: string[];
}

export interface RecoveryStats {
  totalErrors: number;
  recoveredErrors: number;
  unrecoverableErrors: number;
  retries: number;
  escalations: number;
  fallbacks: number;
  circuitBreakerTrips: number;
  avgRecoveryTimeMs: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
}

// =============================================================================
// ERROR RECOVERY MANAGER
// =============================================================================

export class ErrorRecoveryManager extends EventEmitter {
  private config: RecoveryManagerConfig;
  private errorHistory: Map<string, TaskError[]> = new Map();  // taskId -> errors
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private escalationRules: EscalationRule[] = [];
  private stats: RecoveryStats;
  private recoveryTimes: number[] = [];

  constructor(config: Partial<RecoveryManagerConfig> = {}) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      retryBackoffMultiplier: 2,
      maxRetryDelayMs: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerResetMs: 60000,
      enableAutoEscalation: true,
      escalationThreshold: 2,
      fallbackAgentMap: {
        'gui-expert': 'general-coder',
        'database-expert': 'general-coder',
        'security-expert': 'general-coder',
        'api-expert': 'integration-expert',
      },
      criticalTaskPatterns: ['security', 'auth', 'payment', 'critical'],
      ...config
    };

    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoverableErrors: 0,
      retries: 0,
      escalations: 0,
      fallbacks: 0,
      circuitBreakerTrips: 0,
      avgRecoveryTimeMs: 0,
      errorsByType: {},
      errorsBySeverity: {
        'LOW': 0,
        'MEDIUM': 0,
        'HIGH': 0,
        'CRITICAL': 0
      }
    };

    this.initializeDefaultEscalationRules();
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Inizializza regole di escalation di default
   */
  private initializeDefaultEscalationRules(): void {
    // Rule 1: Critical errors -> Escalate to Opus
    this.escalationRules.push({
      condition: (error) => error.severity === 'CRITICAL',
      action: 'ESCALATE_MODEL',
      targetModel: 'opus',
      maxRetries: 1
    });

    // Rule 2: Security errors -> Use security specialist or escalate
    this.escalationRules.push({
      condition: (error) => error.error.message.toLowerCase().includes('security'),
      action: 'ESCALATE_MODEL',
      targetModel: 'opus'
    });

    // Rule 3: Timeout errors -> Retry with longer timeout
    this.escalationRules.push({
      condition: (error) => error.error.message.toLowerCase().includes('timeout'),
      action: 'RETRY',
      maxRetries: 2
    });

    // Rule 4: Agent not found -> Use fallback
    this.escalationRules.push({
      condition: (error) => error.error.message.toLowerCase().includes('agent not found'),
      action: 'FALLBACK_AGENT'
    });

    // Rule 5: Multiple failures -> Escalate
    this.escalationRules.push({
      condition: (error) => error.attemptNumber >= this.config.escalationThreshold,
      action: 'ESCALATE_MODEL',
      targetModel: 'sonnet'
    });
  }

  /**
   * Aggiunge regola di escalation custom
   */
  addEscalationRule(rule: EscalationRule): void {
    this.escalationRules.push(rule);
  }

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  /**
   * Registra un errore e determina l'azione di recovery
   */
  async handleError(
    taskId: string,
    agentId: string,
    error: Error,
    currentModel: ModelTier,
    taskDescription: string,
    attemptNumber: number = 1
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    // Classify error
    const severity = this.classifyErrorSeverity(error, taskDescription);
    const recoverable = this.isRecoverable(error, attemptNumber);

    const taskError: TaskError = {
      taskId,
      agentId,
      error,
      timestamp: Date.now(),
      attemptNumber,
      severity,
      recoverable
    };

    // Track error
    this.trackError(taskId, taskError);
    this.stats.totalErrors++;
    this.stats.errorsBySeverity[severity]++;

    // Log error
    console.log(`[ERROR RECOVERY] Task ${taskId} failed (attempt ${attemptNumber})`);
    console.log(`  Severity: ${severity}`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Recoverable: ${recoverable}`);

    this.emit('errorOccurred', taskError);

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(agentId)) {
      console.log(`[CIRCUIT BREAKER] Agent ${agentId} circuit is OPEN`);
      return {
        taskId,
        action: 'ABORT',
        success: false,
        message: `Circuit breaker open for agent ${agentId}`
      };
    }

    // Determine recovery action
    const action = await this.determineRecoveryAction(taskError, currentModel);
    const result = await this.executeRecoveryAction(taskError, action, currentModel);

    // Update stats
    const recoveryTime = Date.now() - startTime;
    this.recoveryTimes.push(recoveryTime);
    this.stats.avgRecoveryTimeMs =
      this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length;

    if (result.success) {
      this.stats.recoveredErrors++;
    } else {
      this.stats.unrecoverableErrors++;
      this.updateCircuitBreaker(agentId, false);
    }

    this.emit('recoveryAttempted', result);
    return result;
  }

  /**
   * Classifica la severità dell'errore
   */
  private classifyErrorSeverity(error: Error, taskDescription: string): ErrorSeverity {
    const message = error.message.toLowerCase();
    const desc = taskDescription.toLowerCase();

    // Check for critical patterns
    for (const pattern of this.config.criticalTaskPatterns) {
      if (desc.includes(pattern)) return 'CRITICAL';
    }

    // Check error type
    if (message.includes('security') || message.includes('auth')) return 'CRITICAL';
    if (message.includes('data loss') || message.includes('corruption')) return 'CRITICAL';
    if (message.includes('timeout') || message.includes('connection')) return 'HIGH';
    if (message.includes('rate limit') || message.includes('quota')) return 'HIGH';
    if (message.includes('not found') || message.includes('invalid')) return 'MEDIUM';

    return 'LOW';
  }

  /**
   * Verifica se l'errore è recuperabile
   */
  private isRecoverable(error: Error, attemptNumber: number): boolean {
    // Non-recoverable errors
    const nonRecoverable = [
      'permission denied',
      'access denied',
      'invalid credentials',
      'configuration error',
      'fatal'
    ];

    const message = error.message.toLowerCase();
    for (const pattern of nonRecoverable) {
      if (message.includes(pattern)) return false;
    }

    // Too many attempts
    if (attemptNumber > this.config.maxRetries) return false;

    return true;
  }

  // ===========================================================================
  // RECOVERY ACTIONS
  // ===========================================================================

  /**
   * Determina l'azione di recovery appropriata
   */
  private async determineRecoveryAction(
    error: TaskError,
    currentModel: ModelTier
  ): Promise<RecoveryAction> {
    // Check escalation rules in order
    for (const rule of this.escalationRules) {
      if (rule.condition(error)) {
        // Check if action is possible
        if (rule.action === 'ESCALATE_MODEL' && currentModel === 'opus') {
          continue; // Already at highest model
        }
        return rule.action;
      }
    }

    // Default actions based on attempt number
    if (error.attemptNumber < this.config.maxRetries) {
      return 'RETRY';
    }

    if (error.attemptNumber === this.config.maxRetries && this.config.enableAutoEscalation) {
      return 'ESCALATE_MODEL';
    }

    if (!error.recoverable) {
      return 'SKIP';
    }

    return 'MANUAL_INTERVENTION';
  }

  /**
   * Esegue l'azione di recovery
   */
  private async executeRecoveryAction(
    error: TaskError,
    action: RecoveryAction,
    currentModel: ModelTier
  ): Promise<RecoveryResult> {
    console.log(`[RECOVERY] Executing action: ${action}`);

    switch (action) {
      case 'RETRY':
        return this.executeRetry(error);

      case 'FALLBACK_AGENT':
        return this.executeFallbackAgent(error);

      case 'ESCALATE_MODEL':
        return this.executeEscalation(error, currentModel);

      case 'SKIP':
        return {
          taskId: error.taskId,
          action: 'SKIP',
          success: true,
          message: `Task ${error.taskId} skipped after ${error.attemptNumber} failures`
        };

      case 'ABORT':
        return {
          taskId: error.taskId,
          action: 'ABORT',
          success: false,
          message: `Task ${error.taskId} aborted - unrecoverable error`
        };

      case 'MANUAL_INTERVENTION':
        this.emit('manualInterventionRequired', error);
        return {
          taskId: error.taskId,
          action: 'MANUAL_INTERVENTION',
          success: false,
          message: 'Manual intervention required'
        };

      default:
        return {
          taskId: error.taskId,
          action: 'SKIP',
          success: false,
          message: 'Unknown recovery action'
        };
    }
  }

  /**
   * Esegue retry con backoff esponenziale
   */
  private async executeRetry(error: TaskError): Promise<RecoveryResult> {
    const delay = Math.min(
      this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, error.attemptNumber - 1),
      this.config.maxRetryDelayMs
    );

    console.log(`[RETRY] Waiting ${delay}ms before retry (attempt ${error.attemptNumber + 1})`);
    await new Promise(resolve => setTimeout(resolve, delay));

    this.stats.retries++;

    return {
      taskId: error.taskId,
      action: 'RETRY',
      success: true,
      retryCount: error.attemptNumber + 1,
      message: `Retry scheduled after ${delay}ms delay`
    };
  }

  /**
   * Esegue fallback a agent alternativo
   */
  private executeFallbackAgent(error: TaskError): RecoveryResult {
    const fallbackAgent = this.config.fallbackAgentMap[error.agentId] || 'general-coder';

    console.log(`[FALLBACK] Switching from ${error.agentId} to ${fallbackAgent}`);
    this.stats.fallbacks++;

    return {
      taskId: error.taskId,
      action: 'FALLBACK_AGENT',
      success: true,
      newAgentId: fallbackAgent,
      message: `Fallback to agent: ${fallbackAgent}`
    };
  }

  /**
   * Esegue escalation a model superiore
   */
  private executeEscalation(error: TaskError, currentModel: ModelTier): RecoveryResult {
    const modelHierarchy: ModelTier[] = ['haiku', 'sonnet', 'opus'];
    const currentIndex = modelHierarchy.indexOf(currentModel);

    if (currentIndex === modelHierarchy.length - 1) {
      // Already at highest model
      return {
        taskId: error.taskId,
        action: 'ESCALATE_MODEL',
        success: false,
        message: 'Already at highest model tier (opus)'
      };
    }

    const newModel = modelHierarchy[currentIndex + 1];
    console.log(`[ESCALATION] Upgrading from ${currentModel} to ${newModel}`);
    this.stats.escalations++;

    this.emit('escalation', {
      taskId: error.taskId,
      fromModel: currentModel,
      toModel: newModel,
      reason: error.error.message
    });

    return {
      taskId: error.taskId,
      action: 'ESCALATE_MODEL',
      success: true,
      newModel,
      message: `Escalated to model: ${newModel}`
    };
  }

  // ===========================================================================
  // CIRCUIT BREAKER
  // ===========================================================================

  /**
   * Verifica stato circuit breaker per un agent
   */
  private isCircuitBreakerOpen(agentId: string): boolean {
    const state = this.circuitBreakers.get(agentId);
    if (!state) return false;

    if (!state.isOpen) return false;

    // Check if should transition to half-open
    const timeSinceOpen = Date.now() - (state.openedAt || 0);
    if (timeSinceOpen >= this.config.circuitBreakerResetMs) {
      console.log(`[CIRCUIT BREAKER] Agent ${agentId} transitioning to HALF-OPEN`);
      state.isOpen = false;
      state.halfOpenAttempts = 0;
      return false;
    }

    return true;
  }

  /**
   * Aggiorna stato circuit breaker
   */
  private updateCircuitBreaker(agentId: string, success: boolean): void {
    let state = this.circuitBreakers.get(agentId);
    if (!state) {
      state = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        halfOpenAttempts: 0
      };
      this.circuitBreakers.set(agentId, state);
    }

    if (success) {
      // Reset on success
      state.failureCount = 0;
      state.isOpen = false;
    } else {
      // Track failure
      state.failureCount++;
      state.lastFailureTime = Date.now();

      if (state.failureCount >= this.config.circuitBreakerThreshold) {
        state.isOpen = true;
        state.openedAt = Date.now();
        this.stats.circuitBreakerTrips++;

        console.log(`[CIRCUIT BREAKER] Agent ${agentId} circuit OPENED after ${state.failureCount} failures`);
        this.emit('circuitBreakerTripped', { agentId, failureCount: state.failureCount });
      }
    }
  }

  // ===========================================================================
  // ERROR TRACKING
  // ===========================================================================

  /**
   * Traccia errore nella history
   */
  private trackError(taskId: string, error: TaskError): void {
    if (!this.errorHistory.has(taskId)) {
      this.errorHistory.set(taskId, []);
    }
    this.errorHistory.get(taskId)!.push(error);

    // Track by type
    const errorType = error.error.constructor.name;
    this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
  }

  /**
   * Ottiene history errori per un task
   */
  getTaskErrors(taskId: string): TaskError[] {
    return this.errorHistory.get(taskId) || [];
  }

  // ===========================================================================
  // STATS & REPORTING
  // ===========================================================================

  /**
   * Ottiene statistiche
   */
  getStats(): RecoveryStats {
    return { ...this.stats };
  }

  /**
   * Genera report
   */
  generateReport(): string {
    const recoveryRate = this.stats.totalErrors > 0
      ? ((this.stats.recoveredErrors / this.stats.totalErrors) * 100).toFixed(1)
      : '0';

    return `
=== ERROR RECOVERY MANAGER REPORT ===

ERROR STATISTICS
  Total Errors:        ${this.stats.totalErrors}
  Recovered:           ${this.stats.recoveredErrors} (${recoveryRate}%)
  Unrecoverable:       ${this.stats.unrecoverableErrors}

RECOVERY ACTIONS
  Retries:             ${this.stats.retries}
  Escalations:         ${this.stats.escalations}
  Fallbacks:           ${this.stats.fallbacks}
  Circuit Breaker:     ${this.stats.circuitBreakerTrips} trips

ERRORS BY SEVERITY
  CRITICAL:            ${this.stats.errorsBySeverity['CRITICAL']}
  HIGH:                ${this.stats.errorsBySeverity['HIGH']}
  MEDIUM:              ${this.stats.errorsBySeverity['MEDIUM']}
  LOW:                 ${this.stats.errorsBySeverity['LOW']}

PERFORMANCE
  Avg Recovery Time:   ${this.stats.avgRecoveryTimeMs.toFixed(0)}ms
=====================================
    `.trim();
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.errorHistory.clear();
    this.circuitBreakers.clear();
    this.recoveryTimes = [];
    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoverableErrors: 0,
      retries: 0,
      escalations: 0,
      fallbacks: 0,
      circuitBreakerTrips: 0,
      avgRecoveryTimeMs: 0,
      errorsByType: {},
      errorsBySeverity: {
        'LOW': 0,
        'MEDIUM': 0,
        'HIGH': 0,
        'CRITICAL': 0
      }
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createErrorRecoveryManager(
  config?: Partial<RecoveryManagerConfig>
): ErrorRecoveryManager {
  return new ErrorRecoveryManager(config);
}

// =============================================================================
// SINGLETON
// =============================================================================

let globalRecoveryManager: ErrorRecoveryManager | null = null;

export function getGlobalRecoveryManager(): ErrorRecoveryManager {
  if (!globalRecoveryManager) {
    globalRecoveryManager = createErrorRecoveryManager({
      enableAutoEscalation: true,
      maxRetries: 3
    });
  }
  return globalRecoveryManager;
}
