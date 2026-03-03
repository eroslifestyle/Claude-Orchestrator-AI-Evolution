"use strict";
/**
 * ORCHESTRATOR PLUGIN v4.0 - EMPEROR EDITION
 * ===========================================
 * Entry point unificato per l'orchestrator snello e performante.
 *
 * CONSOLIDATO DA 71 FILE → 9 FILE CORE
 *
 * @version 4.0.0-EMPEROR
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMANDS = exports.quickOrchestrate = exports.PLUGIN_INFO = exports.suggestModel = exports.suggestAgent = exports.analyzeTask = exports.taskAnalyzer = exports.TaskAnalyzer = exports.withFallback = exports.retry = exports.resilience = exports.ResilienceManager = exports.runBatched = exports.runParallel = exports.parallelExecutor = exports.ParallelExecutor = exports.autoDocumenter = exports.AutoDocumenter = exports.modelSelector = exports.SmartModelSelector = exports.agentDiscovery = exports.AgentDiscovery = exports.analyzeRequest = exports.runOrchestration = exports.orchestrator = exports.OrchestratorV4 = void 0;
// =============================================================================
// CORE EXPORTS
// =============================================================================
// Orchestrator Engine (principale)
var orchestrator_v4_unified_1 = require("./orchestrator-v4-unified");
Object.defineProperty(exports, "OrchestratorV4", { enumerable: true, get: function () { return orchestrator_v4_unified_1.OrchestratorV4; } });
Object.defineProperty(exports, "orchestrator", { enumerable: true, get: function () { return orchestrator_v4_unified_1.orchestrator; } });
Object.defineProperty(exports, "runOrchestration", { enumerable: true, get: function () { return orchestrator_v4_unified_1.runOrchestration; } });
Object.defineProperty(exports, "analyzeRequest", { enumerable: true, get: function () { return orchestrator_v4_unified_1.analyzeRequest; } });
// Agent Discovery
var agent_discovery_1 = require("./agent-discovery");
Object.defineProperty(exports, "AgentDiscovery", { enumerable: true, get: function () { return agent_discovery_1.AgentDiscovery; } });
Object.defineProperty(exports, "agentDiscovery", { enumerable: true, get: function () { return agent_discovery_1.agentDiscovery; } });
// Smart Model Selection
var smart_model_selector_1 = require("./smart-model-selector");
Object.defineProperty(exports, "SmartModelSelector", { enumerable: true, get: function () { return smart_model_selector_1.SmartModelSelector; } });
Object.defineProperty(exports, "modelSelector", { enumerable: true, get: function () { return smart_model_selector_1.modelSelector; } });
// Auto Documentation
var auto_documenter_1 = require("./auto-documenter");
Object.defineProperty(exports, "AutoDocumenter", { enumerable: true, get: function () { return auto_documenter_1.AutoDocumenter; } });
Object.defineProperty(exports, "autoDocumenter", { enumerable: true, get: function () { return auto_documenter_1.autoDocumenter; } });
// =============================================================================
// SUPPORT MODULES
// =============================================================================
// Parallel Execution
var parallel_executor_1 = require("./parallel-executor");
Object.defineProperty(exports, "ParallelExecutor", { enumerable: true, get: function () { return parallel_executor_1.ParallelExecutor; } });
Object.defineProperty(exports, "parallelExecutor", { enumerable: true, get: function () { return parallel_executor_1.parallelExecutor; } });
Object.defineProperty(exports, "runParallel", { enumerable: true, get: function () { return parallel_executor_1.runParallel; } });
Object.defineProperty(exports, "runBatched", { enumerable: true, get: function () { return parallel_executor_1.runBatched; } });
// Resilience & Recovery
var resilience_1 = require("./resilience");
Object.defineProperty(exports, "ResilienceManager", { enumerable: true, get: function () { return resilience_1.ResilienceManager; } });
Object.defineProperty(exports, "resilience", { enumerable: true, get: function () { return resilience_1.resilience; } });
Object.defineProperty(exports, "retry", { enumerable: true, get: function () { return resilience_1.retry; } });
Object.defineProperty(exports, "withFallback", { enumerable: true, get: function () { return resilience_1.withFallback; } });
// Task Analysis
var task_analyzer_1 = require("./task-analyzer");
Object.defineProperty(exports, "TaskAnalyzer", { enumerable: true, get: function () { return task_analyzer_1.TaskAnalyzer; } });
Object.defineProperty(exports, "taskAnalyzer", { enumerable: true, get: function () { return task_analyzer_1.taskAnalyzer; } });
Object.defineProperty(exports, "analyzeTask", { enumerable: true, get: function () { return task_analyzer_1.analyzeTask; } });
Object.defineProperty(exports, "suggestAgent", { enumerable: true, get: function () { return task_analyzer_1.suggestAgent; } });
Object.defineProperty(exports, "suggestModel", { enumerable: true, get: function () { return task_analyzer_1.suggestModel; } });
// =============================================================================
// PLUGIN INFO
// =============================================================================
exports.PLUGIN_INFO = {
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
};
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
async function quickOrchestrate(tasks, options) {
    const module = await Promise.resolve().then(() => __importStar(require('./orchestrator-v4-unified')));
    const orch = new module.OrchestratorV4(options);
    for (const description of tasks) {
        orch.addTask({ description });
    }
    return await orch.execute();
}
exports.quickOrchestrate = quickOrchestrate;
// =============================================================================
// CLI COMMANDS (for skill integration)
// =============================================================================
exports.COMMANDS = {
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
};
// =============================================================================
// DEFAULT EXPORT
// =============================================================================
const orchestrator_v4_unified_2 = require("./orchestrator-v4-unified");
exports.default = orchestrator_v4_unified_2.OrchestratorV4;
//# sourceMappingURL=index.js.map