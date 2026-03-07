"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWithBudgetCheck = exports.getGlobalTokenBudgetManager = exports.createTokenBudgetManager = exports.TokenBudgetManager = exports.getGlobalRecoveryManager = exports.createErrorRecoveryManager = exports.ErrorRecoveryManager = exports.executeBatchWithCleanContexts = exports.executeWithCleanContext = exports.getGlobalContextManager = exports.createAgentContextManager = exports.AgentContextManager = exports.applyParallelExecutionRule = exports.createParallelExecutionRule = exports.ParallelExecutionRule = void 0;
// Parallel Execution
var ParallelExecutionRule_1 = require("./ParallelExecutionRule");
Object.defineProperty(exports, "ParallelExecutionRule", { enumerable: true, get: function () { return ParallelExecutionRule_1.ParallelExecutionRule; } });
Object.defineProperty(exports, "createParallelExecutionRule", { enumerable: true, get: function () { return ParallelExecutionRule_1.createParallelExecutionRule; } });
Object.defineProperty(exports, "applyParallelExecutionRule", { enumerable: true, get: function () { return ParallelExecutionRule_1.applyParallelExecutionRule; } });
// Context Management
var AgentContextManager_1 = require("./AgentContextManager");
Object.defineProperty(exports, "AgentContextManager", { enumerable: true, get: function () { return AgentContextManager_1.AgentContextManager; } });
Object.defineProperty(exports, "createAgentContextManager", { enumerable: true, get: function () { return AgentContextManager_1.createAgentContextManager; } });
Object.defineProperty(exports, "getGlobalContextManager", { enumerable: true, get: function () { return AgentContextManager_1.getGlobalContextManager; } });
Object.defineProperty(exports, "executeWithCleanContext", { enumerable: true, get: function () { return AgentContextManager_1.executeWithCleanContext; } });
Object.defineProperty(exports, "executeBatchWithCleanContexts", { enumerable: true, get: function () { return AgentContextManager_1.executeBatchWithCleanContexts; } });
// Error Recovery
var ErrorRecoveryManager_1 = require("./ErrorRecoveryManager");
Object.defineProperty(exports, "ErrorRecoveryManager", { enumerable: true, get: function () { return ErrorRecoveryManager_1.ErrorRecoveryManager; } });
Object.defineProperty(exports, "createErrorRecoveryManager", { enumerable: true, get: function () { return ErrorRecoveryManager_1.createErrorRecoveryManager; } });
Object.defineProperty(exports, "getGlobalRecoveryManager", { enumerable: true, get: function () { return ErrorRecoveryManager_1.getGlobalRecoveryManager; } });
// Token Budget Management
var TokenBudgetManager_1 = require("./TokenBudgetManager");
Object.defineProperty(exports, "TokenBudgetManager", { enumerable: true, get: function () { return TokenBudgetManager_1.TokenBudgetManager; } });
Object.defineProperty(exports, "createTokenBudgetManager", { enumerable: true, get: function () { return TokenBudgetManager_1.createTokenBudgetManager; } });
Object.defineProperty(exports, "getGlobalTokenBudgetManager", { enumerable: true, get: function () { return TokenBudgetManager_1.getGlobalTokenBudgetManager; } });
Object.defineProperty(exports, "executeWithBudgetCheck", { enumerable: true, get: function () { return TokenBudgetManager_1.executeWithBudgetCheck; } });
//# sourceMappingURL=index.js.map