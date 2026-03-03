"use strict";
/**
 * TOKEN BUDGET MANAGER - Gestione Preventiva Token con Auto-Decomposizione
 *
 * REGOLA FONDAMENTALE:
 * Mantenere SEMPRE l'utilizzo token sotto il 50-70% del limite massimo
 * perché oltre questa soglia si degradano:
 * - Performance (latenza maggiore)
 * - Qualità risultato (contesto troppo lungo = confusione)
 * - Costi (più token = più costi)
 *
 * STRATEGIA:
 * 1. Monitoraggio continuo utilizzo token
 * 2. Warning a 50% (soglia gialla)
 * 3. Auto-decomposizione a 70% (soglia rossa)
 * 4. Clear forzato a 85% (soglia critica)
 *
 * @version 1.0
 * @date 2026-02-03
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWithBudgetCheck = exports.getGlobalTokenBudgetManager = exports.createTokenBudgetManager = exports.TokenBudgetManager = void 0;
const events_1 = require("events");
// =============================================================================
// TOKEN BUDGET MANAGER
// =============================================================================
class TokenBudgetManager extends events_1.EventEmitter {
    config;
    currentTokens = 0;
    stats;
    usageHistory = [];
    lastZone = 'GREEN';
    constructor(config = {}) {
        super();
        this.config = {
            maxTokensPerConversation: 200000, // Claude's context window
            greenThresholdPercent: 50,
            yellowThresholdPercent: 70,
            redThresholdPercent: 85,
            criticalThresholdPercent: 95,
            autoDecomposeOnRed: true,
            autoClearOnCritical: true,
            avgTokensPerTurn: 2000,
            enablePredictiveDecomposition: true,
            minSubTaskTokens: 5000,
            logTokenUsage: true,
            ...config
        };
        this.stats = {
            peakUsagePercent: 0,
            avgUsagePercent: 0,
            decompositionsTriggered: 0,
            clearsTriggered: 0,
            warningsIssued: 0,
            tokensOverBudget: 0,
            samples: 0
        };
    }
    // ===========================================================================
    // CORE BUDGET TRACKING
    // ===========================================================================
    /**
     * Ottiene lo stato corrente del budget token
     */
    getBudget() {
        const usagePercent = (this.currentTokens / this.config.maxTokensPerConversation) * 100;
        const zone = this.calculateZone(usagePercent);
        const remainingTokens = this.config.maxTokensPerConversation - this.currentTokens;
        const estimatedTurnsRemaining = Math.floor(remainingTokens / this.config.avgTokensPerTurn);
        return {
            maxTokens: this.config.maxTokensPerConversation,
            currentTokens: this.currentTokens,
            usagePercent,
            zone,
            remainingTokens,
            estimatedTurnsRemaining
        };
    }
    /**
     * Calcola la zona basata sulla percentuale di utilizzo
     */
    calculateZone(usagePercent) {
        if (usagePercent >= this.config.criticalThresholdPercent)
            return 'CRITICAL';
        if (usagePercent >= this.config.redThresholdPercent)
            return 'RED';
        if (usagePercent >= this.config.yellowThresholdPercent)
            return 'YELLOW';
        return 'GREEN';
    }
    /**
     * Aggiorna il conteggio token e verifica le soglie
     */
    updateTokenCount(newTokens) {
        this.currentTokens = newTokens;
        const budget = this.getBudget();
        // Update stats
        this.updateStats(budget.usagePercent);
        // Check zone transitions
        const action = this.checkZoneAndAct(budget);
        if (this.config.logTokenUsage) {
            this.logBudgetStatus(budget);
        }
        return { budget, ...action };
    }
    /**
     * Aggiunge token al conteggio
     */
    addTokens(tokens) {
        return this.updateTokenCount(this.currentTokens + tokens);
    }
    /**
     * Resetta il conteggio token (dopo clear)
     */
    resetTokenCount() {
        this.currentTokens = 0;
        this.lastZone = 'GREEN';
        this.stats.clearsTriggered++;
        if (this.config.logTokenUsage) {
            console.log('[TOKEN BUDGET] Token count reset - Context cleared');
        }
        this.emit('tokensReset');
    }
    // ===========================================================================
    // ZONE ACTIONS
    // ===========================================================================
    /**
     * Verifica la zona e determina l'azione appropriata
     */
    checkZoneAndAct(budget) {
        const zoneChanged = budget.zone !== this.lastZone;
        this.lastZone = budget.zone;
        switch (budget.zone) {
            case 'GREEN':
                return { action: 'none' };
            case 'YELLOW':
                if (zoneChanged) {
                    this.stats.warningsIssued++;
                    this.emit('warningZone', budget);
                    return {
                        action: 'warn',
                        message: `WARNING: Token usage at ${budget.usagePercent.toFixed(1)}% - ` +
                            `Consider wrapping up or decomposing complex tasks`
                    };
                }
                return { action: 'none' };
            case 'RED':
                if (this.config.autoDecomposeOnRed) {
                    this.stats.decompositionsTriggered++;
                    this.emit('decomposeRequired', budget);
                    return {
                        action: 'decompose',
                        message: `ALERT: Token usage at ${budget.usagePercent.toFixed(1)}% - ` +
                            `Auto-decomposition triggered. Splitting remaining tasks.`
                    };
                }
                return {
                    action: 'warn',
                    message: `ALERT: Token usage at ${budget.usagePercent.toFixed(1)}% - ` +
                        `Consider decomposing tasks manually`
                };
            case 'CRITICAL':
                if (this.config.autoClearOnCritical) {
                    this.emit('criticalClearRequired', budget);
                    return {
                        action: 'clear',
                        message: `CRITICAL: Token usage at ${budget.usagePercent.toFixed(1)}% - ` +
                            `Forcing context clear to prevent degradation`
                    };
                }
                return {
                    action: 'warn',
                    message: `CRITICAL: Token usage at ${budget.usagePercent.toFixed(1)}% - ` +
                        `Performance degradation imminent!`
                };
            default:
                return { action: 'none' };
        }
    }
    // ===========================================================================
    // TASK DECOMPOSITION
    // ===========================================================================
    /**
     * Decompone un task in sotto-task per rispettare il budget token
     */
    decomposeTask(task, reason = 'token_limit_approaching') {
        console.log(`[TOKEN BUDGET] Decomposing task: ${task.id}`);
        console.log(`  Reason: ${reason}`);
        console.log(`  Estimated tokens: ${task.estimatedTokens}`);
        // Determine best split strategy
        const strategy = this.determineSplitStrategy(task);
        // Generate sub-tasks based on strategy
        const subTasks = this.generateSubTasks(task, strategy);
        // Calculate token savings
        const estimatedTokenSavings = task.estimatedTokens -
            subTasks.reduce((sum, st) => sum + st.estimatedTokens, 0) * 0.3; // 30% overhead per subtask
        const result = {
            originalTask: task,
            subTasks,
            reason,
            estimatedTokenSavings: Math.max(0, estimatedTokenSavings),
            splitStrategy: strategy
        };
        console.log(`  Split into ${subTasks.length} sub-tasks using strategy: ${strategy}`);
        console.log(`  Estimated token savings: ${estimatedTokenSavings.toFixed(0)}`);
        this.emit('taskDecomposed', result);
        return result;
    }
    /**
     * Determina la migliore strategia di split per un task
     */
    determineSplitStrategy(task) {
        const description = task.description.toLowerCase();
        // Check for hints in task
        if (task.subTaskHints && task.subTaskHints.length > 0) {
            return 'by_subtask';
        }
        // Check description patterns
        if (description.includes('component') || description.includes('module')) {
            return 'by_component';
        }
        if (description.includes('implement') && description.includes('test')) {
            return 'by_phase';
        }
        if (description.includes('multiple') || description.includes('several')) {
            return 'by_subtask';
        }
        // Based on complexity
        if (task.complexity === 'extreme') {
            return 'by_phase';
        }
        if (task.complexity === 'high') {
            return 'by_component';
        }
        // Default for medium/low complexity
        return 'sequential_chunks';
    }
    /**
     * Genera sub-tasks basati sulla strategia
     */
    generateSubTasks(task, strategy) {
        const subTasks = [];
        const baseId = task.id;
        const targetTokensPerSubTask = Math.max(this.config.minSubTaskTokens, Math.floor(task.estimatedTokens / 3));
        switch (strategy) {
            case 'by_phase':
                subTasks.push(this.createSubTask(baseId, 1, 'Analysis', task, 'Analyze requirements and design approach', targetTokensPerSubTask * 0.8), this.createSubTask(baseId, 2, 'Implementation', task, 'Implement the core functionality', targetTokensPerSubTask * 1.2), this.createSubTask(baseId, 3, 'Testing', task, 'Write tests and validate implementation', targetTokensPerSubTask * 0.8), this.createSubTask(baseId, 4, 'Integration', task, 'Integrate and finalize', targetTokensPerSubTask * 0.5));
                break;
            case 'by_component':
                // Extract component hints or create generic ones
                const components = task.subTaskHints || ['Component A', 'Component B', 'Component C'];
                components.forEach((comp, i) => {
                    subTasks.push(this.createSubTask(baseId, i + 1, comp, task, `Implement ${comp}`, targetTokensPerSubTask));
                });
                break;
            case 'by_priority':
                subTasks.push(this.createSubTask(baseId, 1, 'Critical', task, 'Handle critical/core functionality first', targetTokensPerSubTask), this.createSubTask(baseId, 2, 'Important', task, 'Handle important but non-critical items', targetTokensPerSubTask), this.createSubTask(baseId, 3, 'Nice-to-have', task, 'Handle optional enhancements', targetTokensPerSubTask * 0.5));
                break;
            case 'by_subtask':
                // Use hints if available
                if (task.subTaskHints && task.subTaskHints.length > 0) {
                    task.subTaskHints.forEach((hint, i) => {
                        subTasks.push(this.createSubTask(baseId, i + 1, hint, task, hint, targetTokensPerSubTask));
                    });
                }
                else {
                    // Generate generic subtasks
                    const numSubTasks = Math.ceil(task.estimatedTokens / targetTokensPerSubTask);
                    for (let i = 0; i < Math.min(numSubTasks, 5); i++) {
                        subTasks.push(this.createSubTask(baseId, i + 1, `Part ${i + 1}`, task, `Handle part ${i + 1} of ${task.description}`, targetTokensPerSubTask));
                    }
                }
                break;
            case 'sequential_chunks':
            default:
                const numChunks = Math.ceil(task.estimatedTokens / targetTokensPerSubTask);
                for (let i = 0; i < Math.min(numChunks, 4); i++) {
                    subTasks.push(this.createSubTask(baseId, i + 1, `Chunk ${i + 1}/${numChunks}`, task, `Process chunk ${i + 1} of the task`, targetTokensPerSubTask));
                }
                break;
        }
        return subTasks;
    }
    /**
     * Crea un sub-task
     */
    createSubTask(baseId, index, name, parentTask, description, estimatedTokens) {
        return {
            id: `${baseId}-sub${index}`,
            description: `[${name}] ${description}`,
            estimatedTokens: Math.round(estimatedTokens),
            complexity: this.reduceComplexity(parentTask.complexity),
            canBeDecomposed: estimatedTokens > this.config.minSubTaskTokens * 2
        };
    }
    /**
     * Riduce il livello di complessità
     */
    reduceComplexity(complexity) {
        switch (complexity) {
            case 'extreme': return 'high';
            case 'high': return 'medium';
            case 'medium': return 'low';
            default: return 'low';
        }
    }
    // ===========================================================================
    // PREDICTIVE ANALYSIS
    // ===========================================================================
    /**
     * Verifica se un task può essere eseguito senza superare le soglie
     */
    canExecuteTask(estimatedTokens) {
        const projectedTokens = this.currentTokens + estimatedTokens;
        const projectedPercent = (projectedTokens / this.config.maxTokensPerConversation) * 100;
        const projectedZone = this.calculateZone(projectedPercent);
        let canExecute = true;
        let recommendation = 'Task can be executed safely';
        if (projectedZone === 'CRITICAL') {
            canExecute = false;
            recommendation = 'Task would exceed critical threshold. Clear context or decompose first.';
        }
        else if (projectedZone === 'RED') {
            canExecute = true;
            recommendation = 'Task will trigger auto-decomposition. Consider decomposing manually first.';
        }
        else if (projectedZone === 'YELLOW') {
            canExecute = true;
            recommendation = 'Task will enter warning zone. Plan for context clear soon.';
        }
        return { canExecute, projectedZone, recommendation };
    }
    /**
     * Stima i token necessari per un task basandosi sulla descrizione
     */
    estimateTaskTokens(description, complexity) {
        // Base estimation on description length
        const baseTokens = Math.ceil(description.length / 4);
        // Complexity multipliers
        const complexityMultiplier = {
            'low': 2,
            'medium': 4,
            'high': 8,
            'extreme': 15
        };
        // Response estimation (typical assistant response)
        const responseEstimate = this.config.avgTokensPerTurn * complexityMultiplier[complexity];
        return baseTokens + responseEstimate;
    }
    // ===========================================================================
    // STATISTICS & LOGGING
    // ===========================================================================
    /**
     * Aggiorna le statistiche
     */
    updateStats(usagePercent) {
        this.usageHistory.push(usagePercent);
        this.stats.samples++;
        this.stats.peakUsagePercent = Math.max(this.stats.peakUsagePercent, usagePercent);
        this.stats.avgUsagePercent =
            this.usageHistory.reduce((a, b) => a + b, 0) / this.usageHistory.length;
        if (usagePercent > 100) {
            this.stats.tokensOverBudget += (usagePercent - 100) * this.config.maxTokensPerConversation / 100;
        }
    }
    /**
     * Log dello stato del budget
     */
    logBudgetStatus(budget) {
        const zoneColors = {
            'GREEN': '\x1b[32m',
            'YELLOW': '\x1b[33m',
            'RED': '\x1b[31m',
            'CRITICAL': '\x1b[41m\x1b[37m'
        };
        const reset = '\x1b[0m';
        const bar = this.createProgressBar(budget.usagePercent);
        const zoneColor = zoneColors[budget.zone];
        console.log(`[TOKEN BUDGET] ${bar} ` +
            `${zoneColor}${budget.usagePercent.toFixed(1)}%${reset} ` +
            `(${budget.currentTokens.toLocaleString()}/${budget.maxTokens.toLocaleString()}) ` +
            `Zone: ${zoneColor}${budget.zone}${reset} ` +
            `~${budget.estimatedTurnsRemaining} turns remaining`);
    }
    /**
     * Crea una barra di progresso visuale
     */
    createProgressBar(percent) {
        const width = 20;
        const filled = Math.min(width, Math.round((percent / 100) * width));
        const empty = width - filled;
        let bar = '';
        for (let i = 0; i < filled; i++) {
            if (i < width * 0.5)
                bar += '\x1b[32m█\x1b[0m'; // Green
            else if (i < width * 0.7)
                bar += '\x1b[33m█\x1b[0m'; // Yellow
            else if (i < width * 0.85)
                bar += '\x1b[31m█\x1b[0m'; // Red
            else
                bar += '\x1b[41m█\x1b[0m'; // Critical
        }
        bar += '░'.repeat(empty);
        return `[${bar}]`;
    }
    /**
     * Ottiene le statistiche
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Genera report
     */
    generateReport() {
        const budget = this.getBudget();
        return `
=== TOKEN BUDGET MANAGER REPORT ===

CURRENT STATUS
  Current Tokens:     ${budget.currentTokens.toLocaleString()}
  Max Tokens:         ${budget.maxTokens.toLocaleString()}
  Usage:              ${budget.usagePercent.toFixed(1)}%
  Zone:               ${budget.zone}
  Remaining:          ${budget.remainingTokens.toLocaleString()}
  Est. Turns Left:    ${budget.estimatedTurnsRemaining}

THRESHOLDS
  Green (Safe):       0-${this.config.greenThresholdPercent}%
  Yellow (Warning):   ${this.config.greenThresholdPercent}-${this.config.yellowThresholdPercent}%
  Red (Decompose):    ${this.config.yellowThresholdPercent}-${this.config.redThresholdPercent}%
  Critical (Clear):   ${this.config.redThresholdPercent}%+

STATISTICS
  Peak Usage:         ${this.stats.peakUsagePercent.toFixed(1)}%
  Avg Usage:          ${this.stats.avgUsagePercent.toFixed(1)}%
  Warnings Issued:    ${this.stats.warningsIssued}
  Decompositions:     ${this.stats.decompositionsTriggered}
  Clears Triggered:   ${this.stats.clearsTriggered}
  Tokens Over Budget: ${this.stats.tokensOverBudget.toLocaleString()}

RECOMMENDATIONS
${this.generateRecommendations()}
=====================================
    `.trim();
    }
    /**
     * Genera raccomandazioni basate sulle statistiche
     */
    generateRecommendations() {
        const recommendations = [];
        if (this.stats.peakUsagePercent > 85) {
            recommendations.push('  - Consider decomposing complex tasks earlier');
        }
        if (this.stats.decompositionsTriggered > 3) {
            recommendations.push('  - Tasks are frequently too large. Pre-decompose at planning stage.');
        }
        if (this.stats.clearsTriggered > 2) {
            recommendations.push('  - Context clears are frequent. Improve task scoping.');
        }
        if (this.stats.avgUsagePercent > 60) {
            recommendations.push('  - Average usage is high. Consider more aggressive decomposition.');
        }
        if (recommendations.length === 0) {
            recommendations.push('  - Token management is optimal. No recommendations.');
        }
        return recommendations.join('\n');
    }
    /**
     * Reset manager
     */
    reset() {
        this.currentTokens = 0;
        this.lastZone = 'GREEN';
        this.usageHistory = [];
        this.stats = {
            peakUsagePercent: 0,
            avgUsagePercent: 0,
            decompositionsTriggered: 0,
            clearsTriggered: 0,
            warningsIssued: 0,
            tokensOverBudget: 0,
            samples: 0
        };
    }
}
exports.TokenBudgetManager = TokenBudgetManager;
// =============================================================================
// FACTORY & SINGLETON
// =============================================================================
function createTokenBudgetManager(config) {
    return new TokenBudgetManager(config);
}
exports.createTokenBudgetManager = createTokenBudgetManager;
let globalTokenBudgetManager = null;
function getGlobalTokenBudgetManager() {
    if (!globalTokenBudgetManager) {
        globalTokenBudgetManager = createTokenBudgetManager({
            maxTokensPerConversation: 200000,
            greenThresholdPercent: 50,
            yellowThresholdPercent: 70,
            autoDecomposeOnRed: true,
            autoClearOnCritical: true,
            logTokenUsage: true
        });
    }
    return globalTokenBudgetManager;
}
exports.getGlobalTokenBudgetManager = getGlobalTokenBudgetManager;
// =============================================================================
// INTEGRATION HELPERS
// =============================================================================
/**
 * Wrapper per esecuzione con controllo budget
 */
async function executeWithBudgetCheck(taskDescription, estimatedTokens, executor, onDecompose) {
    const budgetManager = getGlobalTokenBudgetManager();
    // Check if we can execute
    const check = budgetManager.canExecuteTask(estimatedTokens);
    if (!check.canExecute) {
        console.log(`[BUDGET] Cannot execute: ${check.recommendation}`);
        if (onDecompose) {
            const task = {
                id: `task-${Date.now()}`,
                description: taskDescription,
                estimatedTokens,
                complexity: estimatedTokens > 10000 ? 'high' : 'medium',
                canBeDecomposed: true
            };
            const decomposition = budgetManager.decomposeTask(task);
            await onDecompose(decomposition);
        }
        return null;
    }
    // Execute and update token count
    const result = await executor();
    budgetManager.addTokens(estimatedTokens);
    return result;
}
exports.executeWithBudgetCheck = executeWithBudgetCheck;
//# sourceMappingURL=TokenBudgetManager.js.map