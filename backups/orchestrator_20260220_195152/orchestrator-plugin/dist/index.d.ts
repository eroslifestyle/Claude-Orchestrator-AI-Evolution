/**
 * ORCHESTRATOR PLUGIN v4.0 - EMPEROR EDITION
 * ===========================================
 * Entry point unificato per l'orchestrator snello e performante.
 *
 * CONSOLIDATO DA 71 FILE → 9 FILE CORE
 *
 * @version 4.0.0-EMPEROR
 */
import type { OrchestratorConfig, ExecutionStats } from './orchestrator-v4-unified';
export { OrchestratorV4, orchestrator, runOrchestration, analyzeRequest, type TaskConfig, type Task, type OrchestratorConfig, type ExecutionStats, type SessionReport, type ModelType, type TaskStatus, type PriorityLevel } from './orchestrator-v4-unified';
export { AgentDiscovery, agentDiscovery, type AgentInfo, type PluginInfo, type DiscoveryResult } from './agent-discovery';
export { SmartModelSelector, modelSelector, type TaskAnalysis, type ModelSelectionResult } from './smart-model-selector';
export { AutoDocumenter, autoDocumenter, type TaskDocumentation, type SessionReport as DocSessionReport, type ErrorCatalogEntry } from './auto-documenter';
export { ParallelExecutor, parallelExecutor, runParallel, runBatched, type ParallelTask, type ParallelResult, type ResourceMetrics } from './parallel-executor';
export { ResilienceManager, resilience, retry, withFallback, type RetryOptions, type CircuitBreakerState, type FallbackChain } from './resilience';
export { TaskAnalyzer, taskAnalyzer, analyzeTask, suggestAgent, suggestModel, type AnalysisResult, type ComplexityLevel } from './task-analyzer';
export declare const PLUGIN_INFO: {
    readonly name: "orchestrator-plugin";
    readonly version: "4.0.0-EMPEROR";
    readonly description: "Ultra-efficient multi-agent orchestration - The Emperor of Problem Solving";
    readonly features: readonly ["Smart Model Selection (Opus/Sonnet/Haiku)", "Agent Discovery & Fallback", "Auto Documentation", "Parallel Execution (128+ agents)", "Resilience & Recovery", "Streaming Results", "Lazy Loading"];
    readonly consolidation: {
        readonly before: "71 files, 2.4MB";
        readonly after: "9 files, ~300KB";
        readonly reduction: "87%";
    };
};
/**
 * Quick start function for immediate use
 *
 * @example
 * ```typescript
 * import { quickOrchestrate } from 'orchestrator-plugin';
 *
 * const result = await quickOrchestrate([
 *   'Create a PyQt5 GUI for user management',
 *   'Add SQLite database for persistence',
 *   'Implement JWT authentication'
 * ]);
 * ```
 */
export declare function quickOrchestrate(tasks: string[], options?: Partial<OrchestratorConfig>): Promise<ExecutionStats>;
export declare const COMMANDS: {
    readonly orchestrator: {
        readonly name: "orchestrator";
        readonly description: "Orchestrate multi-agent task execution";
        readonly usage: "/orchestrator \"<description>\"";
    };
    readonly 'orchestrator-preview': {
        readonly name: "orchestrator-preview";
        readonly description: "Preview execution plan without running";
        readonly usage: "/orchestrator-preview \"<description>\"";
    };
    readonly 'orchestrator-status': {
        readonly name: "orchestrator-status";
        readonly description: "Show orchestration status";
        readonly usage: "/orchestrator-status";
    };
};
import { OrchestratorV4 } from './orchestrator-v4-unified';
export default OrchestratorV4;
//# sourceMappingURL=index.d.ts.map