/**
 * EXECUTION MODULE INDEX
 *
 * Esporta tutti i moduli di esecuzione dell'orchestrator:
 * - ParallelExecutionRule: Esecuzione parallela multi-agent
 * - AgentContextManager: Gestione contesto e clear automatico
 * - ErrorRecoveryManager: Gestione errori, recovery ed escalation
 *
 * @version 1.0
 * @date 2026-02-03
 */
export { ParallelExecutionRule, createParallelExecutionRule, applyParallelExecutionRule, type TaskNode, type ExecutionBatch, type ParallelExecutionPlan, type ExecutionMetrics, type ParallelRuleConfig } from './ParallelExecutionRule';
export { AgentContextManager, createAgentContextManager, getGlobalContextManager, executeWithCleanContext, executeBatchWithCleanContexts, type AgentContext, type ConversationTurn, type ContextClearResult, type ContextClearReason, type ContextManagerConfig, type ContextStats } from './AgentContextManager';
export { ErrorRecoveryManager, createErrorRecoveryManager, getGlobalRecoveryManager, type ModelTier, type ErrorSeverity, type RecoveryAction, type TaskError, type RecoveryResult, type EscalationRule, type CircuitBreakerState, type RecoveryManagerConfig, type RecoveryStats } from './ErrorRecoveryManager';
export { TokenBudgetManager, createTokenBudgetManager, getGlobalTokenBudgetManager, executeWithBudgetCheck, type TokenZone, type TokenBudget, type TokenThresholds, type DecompositionResult, type TaskForDecomposition, type DecompositionReason, type SplitStrategy, type TokenBudgetConfig, type TokenStats } from './TokenBudgetManager';
//# sourceMappingURL=index.d.ts.map