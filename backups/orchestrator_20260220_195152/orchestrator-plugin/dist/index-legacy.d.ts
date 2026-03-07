/**
 * Orchestrator Plugin - Main Entry Point
 *
 * This is the main entry point for the Claude Code Orchestrator Plugin.
 * It provides intelligent multi-agent orchestration capabilities with
 * automatic agent selection, parallelism management, and cost optimization.
 *
 * @version 1.0.0
 * @author Development Team
 */
import type { OrchestratorOptions, OrchestratorResult, ExecutionPlan, PluginCommand, CommandHandler, SessionSummary } from './types';
export declare const PLUGIN_INFO: {
    readonly name: "orchestrator-plugin";
    readonly version: "1.0.0";
    readonly description: "Intelligent multi-agent orchestration for Claude Code";
    readonly author: "Development Team";
};
/**
 * Main Orchestrator Plugin class
 * Implements the Claude Code plugin interface
 */
export declare class OrchestratorPlugin {
    private engine;
    private config;
    constructor();
    /**
     * Get plugin metadata
     */
    getPluginInfo(): {
        readonly name: "orchestrator-plugin";
        readonly version: "1.0.0";
        readonly description: "Intelligent multi-agent orchestration for Claude Code";
        readonly author: "Development Team";
    };
    /**
     * Get available commands
     */
    getCommands(): PluginCommand[];
    /**
     * Handle /orchestrator command
     */
    private handleOrchestrateCommand;
    /**
     * Handle /orchestrator-preview command
     */
    private handlePreviewCommand;
    /**
     * Handle /orchestrator-resume command
     */
    private handleResumeCommand;
    /**
     * Handle /orchestrator-list command
     */
    private handleListCommand;
    /**
     * Handle /orchestrator-status command
     */
    private handleStatusCommand;
    /**
     * Parse orchestrate command arguments
     */
    private parseOrchestrateArgs;
    /**
     * Parse time limit string (e.g., "30m", "1h", "90s")
     */
    private parseTimeLimit;
    /**
     * Show orchestrate command help
     */
    private showOrchestrateHelp;
    /**
     * Format orchestration result for display
     */
    private formatOrchestrateResult;
    /**
     * Format execution plan for preview
     */
    private formatExecutionPlan;
    /**
     * Format error message
     */
    private formatError;
    private getRecentSessions;
    private getSessionStatus;
    private formatSessionList;
    private getTimeAgo;
    private formatCurrentStatus;
    private formatSessionStatus;
    private getOverallComplexity;
    private estimateFileCount;
}
/**
 * Plugin factory function
 * This is called by Claude Code to initialize the plugin
 */
export declare function createPlugin(): OrchestratorPlugin;
/**
 * Export types for external usage
 */
export type { OrchestratorOptions, OrchestratorResult, ExecutionPlan, PluginCommand, CommandHandler, SessionSummary, };
/**
 * Default export
 */
export default OrchestratorPlugin;
//# sourceMappingURL=index-legacy.d.ts.map