"use strict";
/**
 * INTEGRATED STRESS TEST RUNNER
 *
 * Esegue stress test completo con TUTTE le regole implementate:
 * 1. REGOLA PARALLELA: Esecuzione simultanea multi-agent multi-task
 * 2. REGOLA CONTEXT CLEAR: Clear conversazione prima di ogni agent
 * 3. REGOLA VISUALIZZAZIONE: Messaggi completi di tutto il lavoro
 *
 * @version 1.0
 * @date 2026-02-03
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.runIntegratedStressTest = void 0;
const perf_hooks_1 = require("perf_hooks");
// Import moduli
const ParallelExecutionRule_1 = require("./execution/ParallelExecutionRule");
const AgentContextManager_1 = require("./execution/AgentContextManager");
const OrchestratorVisualizer_1 = require("./logging/OrchestratorVisualizer");
const ErrorRecoveryManager_1 = require("./execution/ErrorRecoveryManager");
const TokenBudgetManager_1 = require("./execution/TokenBudgetManager");
const DEFAULT_CONFIG = {
    totalTasks: 50,
    maxConcurrentAgents: 32,
    taskDurationMs: { min: 50, max: 200 },
    failureRate: 0.05,
    withDependencies: true,
    dependencyProbability: 0.3,
    verbose: true
};
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
// =============================================================================
// TASK GENERATOR
// =============================================================================
function generateTestTasks(config) {
    const tasks = [];
    const domains = ['GUI', 'Database', 'API', 'Security', 'Testing', 'Documentation'];
    const models = ['opus', 'sonnet', 'haiku'];
    const priorities = ['CRITICA', 'ALTA', 'MEDIA', 'BASSA'];
    for (let i = 0; i < config.totalTasks; i++) {
        const domain = domains[i % domains.length];
        const dependencies = [];
        // Add dependencies based on configuration
        if (config.withDependencies && i > 0 && Math.random() < config.dependencyProbability) {
            // Depend on a random previous task
            const depCount = Math.min(Math.floor(Math.random() * 3) + 1, i);
            for (let d = 0; d < depCount; d++) {
                const depIndex = Math.floor(Math.random() * i);
                const depId = `task-${depIndex.toString().padStart(3, '0')}`;
                if (!dependencies.includes(depId)) {
                    dependencies.push(depId);
                }
            }
        }
        const task = {
            id: `task-${i.toString().padStart(3, '0')}`,
            description: `${domain} Task ${i + 1} - Automated stress test workload`,
            status: 'pending',
            dependencies,
            priority: priorities[Math.floor(i / (config.totalTasks / 4)) % 4],
            estimatedDurationMs: config.taskDurationMs.min +
                Math.random() * (config.taskDurationMs.max - config.taskDurationMs.min),
            agentType: `${domain.toLowerCase()}-expert`,
            model: models[i % 3]
        };
        tasks.push(task);
    }
    return tasks;
}
// =============================================================================
// TASK EXECUTOR WITH RETRY
// =============================================================================
async function executeTaskWithRetry(task, contextManager, recoveryManager, config, attemptNumber = 1, currentModel = 'sonnet') {
    const startTime = perf_hooks_1.performance.now();
    // REGOLA 1: Clear context PRIMA dell'esecuzione
    const prepResult = await contextManager.prepareForExecution(task.id, task.description);
    if (prepResult.wasCleared && config.verbose) {
        OrchestratorVisualizer_1.visualizer.contextClear(task.id, prepResult.clearResult?.previousTokenCount || 0, 'pre_execution');
    }
    // REGOLA 3: Log inizio task
    OrchestratorVisualizer_1.visualizer.taskStart(task.id, task.agentType);
    try {
        // Simula esecuzione con variabilità
        const executionTime = task.estimatedDurationMs * (0.8 + Math.random() * 0.4);
        await new Promise(resolve => setTimeout(resolve, executionTime));
        // Simula successo/fallimento (meno probabilità di fallire con retry)
        // Ogni retry aumenta la probabilità di successo
        const adjustedFailureRate = config.failureRate / attemptNumber;
        const success = Math.random() > adjustedFailureRate;
        if (success) {
            // Aggiungi risposta al contesto
            contextManager.addAssistantResponse(task.id, `Task ${task.id} completed successfully`);
            return {
                success: true,
                attempts: attemptNumber,
                result: {
                    taskId: task.id,
                    duration: perf_hooks_1.performance.now() - startTime,
                    tokensUsed: Math.floor(Math.random() * 1000) + 100,
                    model: currentModel
                }
            };
        }
        else {
            throw new Error(`Simulated failure for task ${task.id} (attempt ${attemptNumber})`);
        }
    }
    catch (error) {
        // REGOLA 4: Error Recovery con Retry
        const recoveryResult = await recoveryManager.handleError(task.id, task.agentType, error, currentModel, task.description, attemptNumber);
        if (config.verbose) {
            console.log(`[RECOVERY] Task ${task.id}: ${recoveryResult.action} - ${recoveryResult.message}`);
        }
        // Esegui azione di recovery
        switch (recoveryResult.action) {
            case 'RETRY':
                // Riprova con lo stesso model
                return executeTaskWithRetry(task, contextManager, recoveryManager, config, attemptNumber + 1, currentModel);
            case 'ESCALATE_MODEL':
                // Riprova con model superiore
                const newModel = recoveryResult.newModel || 'opus';
                if (config.verbose) {
                    console.log(`[ESCALATION] Task ${task.id}: ${currentModel} -> ${newModel}`);
                }
                return executeTaskWithRetry(task, contextManager, recoveryManager, config, attemptNumber + 1, newModel);
            case 'FALLBACK_AGENT':
                // Riprova con agent alternativo (simula cambiando task type)
                const modifiedTask = { ...task, agentType: recoveryResult.newAgentId || 'general-coder' };
                return executeTaskWithRetry(modifiedTask, contextManager, recoveryManager, config, attemptNumber + 1, currentModel);
            case 'SKIP':
            case 'ABORT':
            default:
                return {
                    success: false,
                    attempts: attemptNumber,
                    error: error
                };
        }
    }
}
// Wrapper per compatibilità
async function executeTask(task, contextManager, recoveryManager, config) {
    const result = await executeTaskWithRetry(task, contextManager, recoveryManager, config);
    return {
        success: result.success,
        result: result.result,
        error: result.error
    };
}
// =============================================================================
// MAIN STRESS TEST
// =============================================================================
async function runIntegratedStressTest(userConfig = {}) {
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    INTEGRATED ORCHESTRATOR STRESS TEST                       ║
║                                                                              ║
║  Testing ALL rules:                                                          ║
║    [x] PARALLEL EXECUTION - Multi-agent simultaneous execution               ║
║    [x] CONTEXT CLEAR - Clean context before each agent                       ║
║    [x] FULL VISUALIZATION - Complete activity logging                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
    // Initialize components
    const parallelRule = (0, ParallelExecutionRule_1.createParallelExecutionRule)({
        maxConcurrentAgents: config.maxConcurrentAgents,
        enableAggressiveParallel: true,
        respectOnlyHardDependencies: true
    });
    const contextManager = (0, AgentContextManager_1.createAgentContextManager)({
        clearBeforeEachExecution: true,
        logClearEvents: config.verbose,
        maxTokensBeforeAutoClear: 50000
    });
    const vis = (0, OrchestratorVisualizer_1.createOrchestratorVisualizer)({
        enabled: true,
        showTimestamps: true,
        showAgentActivity: true,
        showTaskProgress: true,
        showPerformanceMetrics: true,
        showContextEvents: config.verbose,
        showDependencyFlow: config.verbose,
        showErrors: true,
        colorOutput: true,
        minLogLevel: config.verbose ? 'DEBUG' : 'INFO'
    });
    // REGOLA 4: Error Recovery Manager con retry e escalation
    const recoveryManager = (0, ErrorRecoveryManager_1.createErrorRecoveryManager)({
        maxRetries: 3,
        retryDelayMs: 100, // Ridotto per test
        retryBackoffMultiplier: 1.5,
        enableAutoEscalation: true,
        escalationThreshold: 2,
        circuitBreakerThreshold: 10
    });
    // REGOLA 5: Token Budget Manager
    const tokenBudget = (0, TokenBudgetManager_1.createTokenBudgetManager)({
        maxTokensPerConversation: 200000,
        greenThresholdPercent: 50,
        yellowThresholdPercent: 70,
        autoDecomposeOnRed: true,
        logTokenUsage: config.verbose
    });
    const errors = [];
    let totalRetries = 0;
    let totalEscalations = 0;
    const sessionId = `stress-test-${Date.now()}`;
    try {
        // FASE 1: Generazione task
        console.log('\n[PHASE 1] Generating test tasks...');
        const tasks = generateTestTasks(config);
        console.log(`  Generated ${tasks.length} tasks`);
        console.log(`  With dependencies: ${tasks.filter(t => t.dependencies.length > 0).length}`);
        console.log(`  Priority distribution:`);
        console.log(`    CRITICA: ${tasks.filter(t => t.priority === 'CRITICA').length}`);
        console.log(`    ALTA:    ${tasks.filter(t => t.priority === 'ALTA').length}`);
        console.log(`    MEDIA:   ${tasks.filter(t => t.priority === 'MEDIA').length}`);
        console.log(`    BASSA:   ${tasks.filter(t => t.priority === 'BASSA').length}`);
        // FASE 2: Build execution plan
        console.log('\n[PHASE 2] Building parallel execution plan...');
        const plan = parallelRule.buildParallelExecutionPlan(tasks);
        console.log(`  Total batches: ${plan.totalBatches}`);
        console.log(`  Max parallelism: ${plan.maxParallelism} agents`);
        console.log(`  Critical path length: ${plan.criticalPath.length} tasks`);
        console.log(`  Expected speedup: ${plan.speedupFactor.toFixed(2)}x`);
        console.log(`  Estimated total time: ${plan.estimatedTotalTimeMs.toFixed(0)}ms`);
        console.log(`  Sequential estimate: ${plan.estimatedSequentialTimeMs.toFixed(0)}ms`);
        // FASE 3: Start session visualization
        vis.startSession(sessionId, tasks.length, config.maxConcurrentAgents);
        // Log task creation
        for (const task of tasks) {
            vis.logTaskCreated(task.id, task.description, task.dependencies);
        }
        // FASE 4: Execute with all rules active
        console.log('\n[PHASE 3] Executing with parallel rule + context clear + visualization...\n');
        const executionStartTime = perf_hooks_1.performance.now();
        let totalTokensCleared = 0;
        // Hook context clear events
        contextManager.on('contextCleared', (event) => {
            totalTokensCleared += event.previousTokenCount;
        });
        // Execute con TUTTE le regole attive
        const metrics = await parallelRule.executeWithMaxParallelism(async (task) => {
            vis.logAgentStart(task.id, task.id, task.description);
            const startTime = perf_hooks_1.performance.now();
            // Usa executeTaskWithRetry per avere retry automatici
            const result = await executeTaskWithRetry(task, contextManager, recoveryManager, config, 1, // attemptNumber iniziale
            task.model // model iniziale dal task
            );
            const duration = perf_hooks_1.performance.now() - startTime;
            // Traccia retry ed escalation
            if (result.attempts > 1) {
                totalRetries += result.attempts - 1;
                if (config.verbose) {
                    console.log(`[RETRY SUCCESS] Task ${task.id} completed after ${result.attempts} attempts`);
                }
            }
            vis.logAgentComplete(task.id, task.id, result.success, Math.round(duration));
            vis.logTaskComplete(task.id, result.success, Math.round(duration));
            if (!result.success && result.error) {
                errors.push(result.error);
                vis.logError('Task execution failed after all retries', result.error, { taskId: task.id });
            }
            return { success: result.success, result: result.result, error: result.error };
        });
        const totalDuration = perf_hooks_1.performance.now() - executionStartTime;
        // FASE 5: End session and show report
        const contextStats = contextManager.getStats();
        vis.endSession({
            totalDurationMs: Math.round(totalDuration),
            tasksCompleted: metrics.tasksCompleted,
            tasksFailed: metrics.tasksFailed,
            maxConcurrencyReached: metrics.maxConcurrentReached,
            avgConcurrency: metrics.avgConcurrency,
            speedupFactor: metrics.actualSpeedup,
            totalTokensCleared: contextStats.totalTokensSaved
        });
        // Get recovery stats
        const recoveryStats = recoveryManager.getStats();
        // Print detailed metrics
        console.log('\n' + '='.repeat(80));
        console.log(' DETAILED METRICS');
        console.log('='.repeat(80));
        console.log(`
EXECUTION STATISTICS
  Actual Duration:     ${totalDuration.toFixed(0)}ms
  Sequential Estimate: ${plan.estimatedSequentialTimeMs.toFixed(0)}ms
  Actual Speedup:      ${metrics.actualSpeedup.toFixed(2)}x

CONTEXT MANAGEMENT
  Total Clears:        ${contextStats.totalClears}
  Tokens Saved:        ${contextStats.totalTokensSaved}
  Avg Before Clear:    ${contextStats.avgTokensBeforeClear.toFixed(0)}

AGENT UTILIZATION
  Max Concurrent:      ${metrics.maxConcurrentReached}/${config.maxConcurrentAgents}
  Avg Concurrent:      ${metrics.avgConcurrency.toFixed(2)}
  Utilization:         ${((metrics.avgConcurrency / config.maxConcurrentAgents) * 100).toFixed(1)}%

ERROR RECOVERY (REGOLA 4)
  Total Errors:        ${recoveryStats.totalErrors}
  Recovered:           ${recoveryStats.recoveredErrors}
  Retries Executed:    ${recoveryStats.retries}
  Escalations:         ${recoveryStats.escalations}
  Fallbacks:           ${recoveryStats.fallbacks}
  Recovery Rate:       ${recoveryStats.totalErrors > 0 ? ((recoveryStats.recoveredErrors / recoveryStats.totalErrors) * 100).toFixed(1) : 100}%

TASK RESULTS
  Completed:           ${metrics.tasksCompleted}
  Failed:              ${metrics.tasksFailed}
  Success Rate:        ${((metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed)) * 100).toFixed(1)}%

FINAL ERRORS (after all retries)
  Unrecoverable:       ${errors.length}
  Error Rate:          ${((errors.length / config.totalTasks) * 100).toFixed(1)}%
`);
        return {
            success: metrics.tasksFailed === 0, // 100% success = true
            metrics: {
                ...metrics,
                totalDurationMs: totalDuration,
                contextClears: contextStats.totalClears,
                tokensSaved: contextStats.totalTokensSaved,
                recovery: {
                    totalErrors: recoveryStats.totalErrors,
                    recovered: recoveryStats.recoveredErrors,
                    retries: recoveryStats.retries,
                    escalations: recoveryStats.escalations,
                    recoveryRate: recoveryStats.totalErrors > 0
                        ? (recoveryStats.recoveredErrors / recoveryStats.totalErrors) * 100
                        : 100
                },
                plan: {
                    batches: plan.totalBatches,
                    maxParallelism: plan.maxParallelism,
                    expectedSpeedup: plan.speedupFactor,
                    criticalPathLength: plan.criticalPath.length
                }
            },
            errors
        };
    }
    catch (error) {
        console.error('FATAL ERROR:', error);
        errors.push(error);
        return {
            success: false,
            metrics: {},
            errors
        };
    }
    finally {
        // Cleanup
        parallelRule.reset();
        contextManager.destroy();
        recoveryManager.reset();
        vis.reset();
    }
}
exports.runIntegratedStressTest = runIntegratedStressTest;
// =============================================================================
// CLI ENTRY POINT
// =============================================================================
async function main() {
    console.log('Starting Integrated Orchestrator Stress Test...\n');
    // Parse command line arguments
    const args = process.argv.slice(2);
    const config = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--tasks':
                config.totalTasks = parseInt(args[++i]);
                break;
            case '--agents':
                config.maxConcurrentAgents = parseInt(args[++i]);
                break;
            case '--failure-rate':
                config.failureRate = parseFloat(args[++i]);
                break;
            case '--no-deps':
                config.withDependencies = false;
                break;
            case '--quiet':
                config.verbose = false;
                break;
        }
    }
    try {
        const result = await runIntegratedStressTest(config);
        console.log('\n' + '='.repeat(80));
        if (result.success) {
            console.log(' TEST PASSED - All rules working correctly');
        }
        else {
            console.log(' TEST FAILED - See errors above');
        }
        console.log('='.repeat(80) + '\n');
        process.exit(result.success ? 0 : 1);
    }
    catch (error) {
        console.error('Unexpected error:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=run-integrated-stress-test.js.map