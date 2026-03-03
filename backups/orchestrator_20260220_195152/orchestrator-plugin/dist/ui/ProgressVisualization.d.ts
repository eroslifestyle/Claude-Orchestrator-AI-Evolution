/**
 * Progress Visualization System for Claude Code Orchestrator Plugin
 *
 * Provides real-time progress bars, visual dependency graphs,
 * and live metrics dashboard integration for orchestration tasks.
 *
 * @version 1.0.0
 * @author Development Team
 */
import type { ExecutionPlan, OrchestrationMetrics, ProgressUpdate, VisualizationConfig } from '../types';
/**
 * Main Progress Visualization System
 */
export declare class ProgressVisualization {
    private readonly logger;
    private config;
    private progressBars;
    private dependencyRenderer;
    private liveDashboard;
    private currentSpinner;
    private isVerbose;
    private isRealTime;
    constructor(config?: Partial<VisualizationConfig>);
    /**
     * Initialize visualization for orchestration
     */
    initializeOrchestration(plan: ExecutionPlan): void;
    /**
     * Update task progress
     */
    updateTaskProgress(update: ProgressUpdate): void;
    /**
     * Update orchestration progress
     */
    updateOrchestrationProgress(completedTasks: number, totalTasks: number, currentPhase: string, currentTask?: string): void;
    /**
     * Start orchestration spinner
     */
    startOrchestrationSpinner(message: string): void;
    /**
     * Stop orchestration spinner
     */
    stopOrchestrationSpinner(success: boolean, message?: string): void;
    /**
     * Show dependency graph update
     */
    showDependencyGraphUpdate(): void;
    /**
     * Display final summary
     */
    displayFinalSummary(metrics: OrchestrationMetrics): void;
    /**
     * Export visualization data for analysis
     */
    exportVisualizationData(filePath?: string): string;
    /**
     * Configure visualization settings
     */
    configure(newConfig: Partial<VisualizationConfig>): void;
    /**
     * Get status icon for task state
     */
    private getStatusIcon;
    /**
     * Cleanup resources
     */
    cleanup(): void;
}
/**
 * Export Progress Visualization System
 */
export default ProgressVisualization;
//# sourceMappingURL=ProgressVisualization.d.ts.map