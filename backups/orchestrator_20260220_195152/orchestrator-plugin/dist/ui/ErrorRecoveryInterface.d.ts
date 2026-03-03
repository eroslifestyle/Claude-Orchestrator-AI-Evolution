/**
 * Error Handling & Recovery UI for Claude Code Orchestrator Plugin
 *
 * Provides guided troubleshooting, error pattern detection,
 * and integration with Learning Engine for error prevention.
 *
 * @version 1.0.0
 * @author Development Team
 */
import { LearningEngine } from '../learning/LearningEngine';
import type { OrchestratorError, TroubleshootingSession, RecoveryOptions, PluginConfig } from '../types';
/**
 * Main Error Recovery Interface
 */
export declare class ErrorRecoveryInterface {
    private readonly logger;
    private readonly patternDetector;
    private readonly strategyEngine;
    private readonly guidedInterface;
    private readonly learningEngine;
    private recoveryHistory;
    constructor(learningEngine?: LearningEngine, config?: PluginConfig);
    /**
     * Handle orchestration error with guided recovery
     */
    handleError(error: OrchestratorError): Promise<RecoveryOptions>;
    /**
     * Attempt automatic recovery
     */
    private attemptAutoRecovery;
    /**
     * Check if automatic recovery is possible
     */
    private canAutoRecover;
    /**
     * Find similar previous troubleshooting sessions
     */
    private findSimilarSessions;
    /**
     * Determine if guided recovery should be offered
     */
    private shouldProceedWithGuided;
    /**
     * Get recovery history
     */
    getRecoveryHistory(): TroubleshootingSession[];
    /**
     * Get recovery statistics
     */
    getRecoveryStatistics(): {
        totalSessions: number;
        successRate: number;
        averageTime: number;
        topPatterns: string[];
    };
}
/**
 * Export Error Recovery Interface
 */
export default ErrorRecoveryInterface;
//# sourceMappingURL=ErrorRecoveryInterface.d.ts.map