/**
 * Advanced CLI Interface for Claude Code Orchestrator Plugin
 *
 * Provides interactive mode with command completion, rich formatting,
 * and session persistence for optimal user experience.
 *
 * @version 1.0.0
 * @author Development Team
 */
import { OrchestratorV4 as OrchestratorEngine } from '../orchestrator-v4-unified';
/**
 * Advanced CLI Interface with Interactive Features
 */
export declare class CLIInterface {
    private readonly logger;
    private readonly engine;
    private readonly sessionPath;
    private readonly historyPath;
    private rl;
    private session;
    private history;
    private currentSpinner;
    private isInteractiveMode;
    private performanceMetrics;
    constructor(engine: OrchestratorEngine);
    /**
     * Start Interactive Mode
     */
    startInteractiveMode(): Promise<void>;
    /**
     * Execute Single Command (Non-Interactive)
     */
    executeCommand(command: string, args: string[]): Promise<string>;
    /**
     * Handle Interactive Command
     */
    private handleInteractiveCommand;
    /**
     * Process Orchestrator Commands
     */
    private processCommand;
    /**
     * Handle Orchestrate Command with Rich UI
     */
    private handleOrchestrateCommand;
    /**
     * Handle Preview Command
     */
    private handlePreviewCommand;
    /**
     * Auto-completion Handler
     */
    private completer;
    /**
     * Get history entries helper
     */
    private getHistoryEntries;
    /**
     * Get Contextual Suggestions
     */
    private getContextualSuggestions;
    /**
     * Update Progress During Orchestration
     */
    private updateProgress;
    /**
     * Confirm Execution in Interactive Mode
     */
    private confirmExecution;
    /**
     * Display Welcome Message
     */
    private displayWelcome;
    /**
     * Display Help Information
     */
    private displayHelp;
    /**
     * Parse Command Arguments
     */
    private parseCommand;
    /**
     * Parse Orchestrate Arguments
     */
    private parseOrchestrateArgs;
    /**
     * Parse Time Limit String
     */
    private parseTimeLimit;
    /**
     * Add Command to History
     */
    private addToHistory;
    /**
     * Display Command History
     */
    private displayHistory;
    /**
     * Display Session Information
     */
    private displaySessionInfo;
    /**
     * Display Performance Metrics
     */
    private displayPerformanceMetrics;
    /**
     * Calculate Success Rate
     */
    private calculateSuccessRate;
    /**
     * Calculate Average Response Time
     */
    private calculateAvgResponseTime;
    /**
     * Load Session Data
     */
    private loadSession;
    /**
     * Load Command History
     */
    private loadHistory;
    /**
     * Load Readline History
     */
    private loadReadlineHistory;
    /**
     * Save Session Data
     */
    private saveSession;
    /**
     * Save Command History
     */
    private saveHistory;
    /**
     * Generate Session ID
     */
    private generateSessionId;
    private formatHelp;
    private formatError;
    private formatExecutionPlan;
    private formatOrchestrateResult;
    private handleResumeCommand;
    private handleListCommand;
    private handleStatusCommand;
}
/**
 * Export CLI Interface
 */
export default CLIInterface;
//# sourceMappingURL=CLIInterface.d.ts.map