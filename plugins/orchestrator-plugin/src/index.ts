/**
 * ORCHESTRATOR PLUGIN v4.0 - EMPEROR EDITION
 * ===========================================
 * Entry point unificato per l'orchestrator snello e performante.
 *
 * CONSOLIDATO DA 71 FILE → 9 FILE CORE
 *
 * @version 4.0.0-EMPEROR
 */

// Import types for internal use
import type { OrchestratorConfig, ExecutionStats } from './orchestrator-v4-unified';

// =============================================================================
// CORE EXPORTS
// =============================================================================

// Orchestrator Engine (principale)
export {
    OrchestratorV4,
    orchestrator,
    runOrchestration,
    analyzeRequest,
    type TaskConfig,
    type Task,
    type OrchestratorConfig,
    type ExecutionStats,
    type SessionReport,
    type ModelType,
    type TaskStatus,
    type PriorityLevel
} from './orchestrator-v4-unified';

// Agent Discovery
export {
    AgentDiscovery,
    agentDiscovery,
    type AgentInfo,
    type PluginInfo,
    type DiscoveryResult
} from './agent-discovery';

// Smart Model Selection
export {
    SmartModelSelector,
    modelSelector,
    type TaskAnalysis,
    type ModelSelectionResult
} from './smart-model-selector';

// Auto Documentation
export {
    AutoDocumenter,
    autoDocumenter,
    type TaskDocumentation,
    type SessionReport as DocSessionReport,
    type ErrorCatalogEntry
} from './auto-documenter';

// =============================================================================
// SUPPORT MODULES
// =============================================================================

// Parallel Execution
export {
    ParallelExecutor,
    parallelExecutor,
    runParallel,
    runBatched,
    type ParallelTask,
    type ParallelResult,
    type ResourceMetrics
} from './parallel-executor';

// Resilience & Recovery
export {
    ResilienceManager,
    resilience,
    retry,
    withFallback,
    type RetryOptions,
    type CircuitBreakerState,
    type FallbackChain
} from './resilience';

// Task Analysis
export {
    TaskAnalyzer,
    taskAnalyzer,
    analyzeTask,
    suggestAgent,
    suggestModel,
    type AnalysisResult,
    type ComplexityLevel
} from './task-analyzer';

// =============================================================================
// PLUGIN INFO
// =============================================================================

export const PLUGIN_INFO = {
    name: 'orchestrator-plugin',
    version: '4.0.0-EMPEROR',
    description: 'Ultra-efficient multi-agent orchestration - The Emperor of Problem Solving',
    features: [
        'Smart Model Selection (Opus/Sonnet/Haiku)',
        'Agent Discovery & Fallback',
        'Auto Documentation',
        'Parallel Execution (128+ agents)',
        'Resilience & Recovery',
        'Streaming Results',
        'Lazy Loading'
    ],
    consolidation: {
        before: '71 files, 2.4MB',
        after: '9 files, ~300KB',
        reduction: '87%'
    }
} as const;

// =============================================================================
// QUICK START
// =============================================================================

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
export async function quickOrchestrate(
    tasks: string[],
    options?: Partial<OrchestratorConfig>
): Promise<ExecutionStats> {
    const module = await import('./orchestrator-v4-unified');
    const orch = new module.OrchestratorV4(options);

    for (const description of tasks) {
        orch.addTask({ description });
    }

    return await orch.execute();
}

// =============================================================================
// CLI COMMANDS (for skill integration)
// =============================================================================

export const COMMANDS = {
    orchestrator: {
        name: 'orchestrator',
        description: 'Orchestrate multi-agent task execution',
        usage: '/orchestrator "<description>"'
    },
    'orchestrator-preview': {
        name: 'orchestrator-preview',
        description: 'Preview execution plan without running',
        usage: '/orchestrator-preview "<description>"'
    },
    'orchestrator-status': {
        name: 'orchestrator-status',
        description: 'Show orchestration status',
        usage: '/orchestrator-status'
    }
} as const;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

import { OrchestratorV4 } from './orchestrator-v4-unified';
export default OrchestratorV4;
