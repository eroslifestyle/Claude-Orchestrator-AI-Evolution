"use strict";
/**
 * Progress Tracker - Real-time Orchestration Monitoring
 *
 * Tracks progress di tutti i task a 3 livelli con metrics real-time
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressTracker = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
class ProgressTracker extends events_1.EventEmitter {
    logger;
    sessionId;
    tasks;
    startTime;
    results;
    constructor(sessionId) {
        super();
        this.logger = new logger_1.PluginLogger('ProgressTracker');
        this.sessionId = sessionId;
        this.tasks = new Map();
        this.results = new Map();
        this.startTime = new Date();
        this.logger.info(`📊 Progress tracker initialized for session: ${sessionId}`);
    }
    /**
     * Inizializza tracking per tutti i task
     */
    initializeTasks(allTasks) {
        this.logger.info(`🔄 Initializing progress tracking for ${allTasks.length} tasks`);
        for (const task of allTasks) {
            const taskProgress = {
                taskId: task.id,
                agentFile: task.agentExpertFile,
                model: task.model,
                level: task.level,
                status: 'pending',
                progress: 0
            };
            this.tasks.set(task.id, taskProgress);
        }
        this.emitProgressUpdate();
    }
    /**
     * Segna inizio esecuzione di un task
     */
    startTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            this.logger.warn(`Task ${taskId} not found for start tracking`);
            return;
        }
        task.status = 'running';
        task.progress = 10;
        task.startTime = new Date();
        this.tasks.set(taskId, task);
        this.logger.debug(`▶️ Started tracking task ${taskId}`);
        this.emitProgressUpdate();
    }
    /**
     * Aggiorna progress di un task durante esecuzione
     */
    updateTaskProgress(taskId, progress) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        task.progress = Math.min(progress, 95); // Never 100% until complete
        this.tasks.set(taskId, task);
        this.emitProgressUpdate();
    }
    /**
     * Completa tracking di un task
     */
    completeTask(taskId, result) {
        const task = this.tasks.get(taskId);
        if (!task) {
            this.logger.warn(`Task ${taskId} not found for completion tracking`);
            return;
        }
        task.status = result.success ? 'completed' : 'failed';
        task.progress = 100;
        task.endTime = new Date();
        task.duration = result.duration;
        task.cost = result.cost;
        task.tokens = result.tokens;
        this.tasks.set(taskId, task);
        this.results.set(taskId, result);
        this.logger.info(`${result.success ? '✅' : '❌'} Completed task ${taskId} in ${result.duration}ms`);
        this.emitProgressUpdate();
    }
    /**
     * Aggiorna stage corrente (LEVEL 1, LEVEL 2, etc.)
     */
    updateStage(stageName, stageProgress) {
        this.logger.info(`📈 Stage update: ${stageName} - ${stageProgress}%`);
        this.emitProgressUpdate();
    }
    /**
     * Calcola metrics complete
     */
    calculateMetrics() {
        const allTasks = Array.from(this.tasks.values());
        const completedTasks = allTasks.filter(t => t.status === 'completed');
        const failedTasks = allTasks.filter(t => t.status === 'failed');
        const runningTasks = allTasks.filter(t => t.status === 'running');
        const totalTime = Date.now() - this.startTime.getTime();
        const totalCost = completedTasks.reduce((sum, task) => sum + (task.cost || 0), 0);
        const totalTokens = completedTasks.reduce((sum, task) => sum + (task.tokens || 0), 0);
        const avgTaskTime = completedTasks.length > 0
            ? completedTasks.reduce((sum, task) => sum + (task.duration || 0), 0) / completedTasks.length
            : 0;
        const successRate = allTasks.length > 0
            ? completedTasks.length / (completedTasks.length + failedTasks.length)
            : 0;
        // Calculate parallel efficiency
        const maxPossibleParallel = Math.max(allTasks.filter(t => t.level === 1).length, allTasks.filter(t => t.level === 2).length, allTasks.filter(t => t.level === 3).length);
        const parallelEfficiency = runningTasks.length / Math.max(maxPossibleParallel, 1);
        return {
            totalTime,
            totalCost,
            totalTokens,
            averageTaskTime: avgTaskTime,
            successRate,
            parallelEfficiency,
            costPerTask: allTasks.length > 0 ? totalCost / allTasks.length : 0,
            tokensPerTask: allTasks.length > 0 ? totalTokens / allTasks.length : 0,
            currentParallelTasks: runningTasks.length,
            maxParallelTasks: maxPossibleParallel,
            levelMetrics: {
                level1: this.calculateLevelMetrics(1),
                level2: this.calculateLevelMetrics(2),
                level3: this.calculateLevelMetrics(3)
            }
        };
    }
    /**
     * Calcola metrics per singolo livello
     */
    calculateLevelMetrics(level) {
        const levelTasks = Array.from(this.tasks.values()).filter(t => t.level === level);
        const completedTasks = levelTasks.filter(t => t.status === 'completed');
        return {
            totalTasks: levelTasks.length,
            completedTasks: completedTasks.length,
            avgDuration: completedTasks.length > 0
                ? completedTasks.reduce((sum, task) => sum + (task.duration || 0), 0) / completedTasks.length
                : 0,
            avgCost: completedTasks.length > 0
                ? completedTasks.reduce((sum, task) => sum + (task.cost || 0), 0) / completedTasks.length
                : 0,
            avgTokens: completedTasks.length > 0
                ? completedTasks.reduce((sum, task) => sum + (task.tokens || 0), 0) / completedTasks.length
                : 0,
            successRate: levelTasks.length > 0
                ? completedTasks.length / levelTasks.length
                : 0
        };
    }
    /**
     * Emette update progress
     */
    emitProgressUpdate() {
        const allTasks = Array.from(this.tasks.values());
        const completedTasks = allTasks.filter(t => t.status === 'completed');
        const failedTasks = allTasks.filter(t => t.status === 'failed');
        const runningTasks = allTasks.filter(t => t.status === 'running');
        const totalTasks = allTasks.length;
        const finishedTasks = completedTasks.length + failedTasks.length;
        const overallProgress = totalTasks > 0 ? (finishedTasks / totalTasks) * 100 : 0;
        // Determine current stage
        let currentStage = 'Initializing';
        let stageProgress = 0;
        const level1Tasks = allTasks.filter(t => t.level === 1);
        const level2Tasks = allTasks.filter(t => t.level === 2);
        const level3Tasks = allTasks.filter(t => t.level === 3);
        const level1Running = level1Tasks.some(t => t.status === 'running');
        const level2Running = level2Tasks.some(t => t.status === 'running');
        const level3Running = level3Tasks.some(t => t.status === 'running');
        if (level3Running) {
            currentStage = 'Level 3 - Micro Tasks';
            const level3Completed = level3Tasks.filter(t => t.status === 'completed').length;
            stageProgress = level3Tasks.length > 0 ? (level3Completed / level3Tasks.length) * 100 : 0;
        }
        else if (level2Running) {
            currentStage = 'Level 2 - Sub Tasks';
            const level2Completed = level2Tasks.filter(t => t.status === 'completed').length;
            stageProgress = level2Tasks.length > 0 ? (level2Completed / level2Tasks.length) * 100 : 0;
        }
        else if (level1Running) {
            currentStage = 'Level 1 - Principal Tasks';
            const level1Completed = level1Tasks.filter(t => t.status === 'completed').length;
            stageProgress = level1Tasks.length > 0 ? (level1Completed / level1Tasks.length) * 100 : 0;
        }
        else if (overallProgress === 100) {
            currentStage = 'Documentation & Finalization';
            stageProgress = 100;
        }
        const progressUpdate = {
            sessionId: this.sessionId,
            totalTasks,
            completedTasks: completedTasks.length,
            failedTasks: failedTasks.length,
            currentStage,
            stageProgress,
            overallProgress,
            currentTasks: runningTasks,
            metrics: this.calculateMetrics(),
            timestamp: new Date()
        };
        this.emit('progress', progressUpdate);
    }
    /**
     * Display progress in console format
     */
    displayProgress() {
        const update = this.getLastProgressUpdate();
        if (!update)
            return;
        console.log('\n📊 REAL-TIME PROGRESS TRACKING');
        console.log(`├─ Session: ${this.sessionId}`);
        console.log(`├─ Overall Progress: ${update.overallProgress.toFixed(1)}%`);
        console.log(`├─ Current Stage: ${update.currentStage}`);
        console.log(`├─ Stage Progress: ${update.stageProgress.toFixed(1)}%`);
        console.log(`├─ Completed: ${update.completedTasks}/${update.totalTasks} tasks`);
        console.log(`├─ Failed: ${update.failedTasks} tasks`);
        console.log(`├─ Running: ${update.currentTasks.length} parallel tasks`);
        console.log(`├─ Total Time: ${(update.metrics.totalTime / 1000).toFixed(1)}s`);
        console.log(`├─ Total Cost: $${update.metrics.totalCost.toFixed(3)}`);
        console.log(`├─ Total Tokens: ${update.metrics.totalTokens}`);
        console.log(`└─ Success Rate: ${(update.metrics.successRate * 100).toFixed(1)}%`);
        if (update.currentTasks.length > 0) {
            console.log('\n⚡ ACTIVE TASKS:');
            update.currentTasks.forEach(task => {
                console.log(`├─ ${task.taskId}: ${task.progress}% - ${task.agentFile} (${task.model})`);
            });
        }
    }
    /**
     * Get ultimo progress update
     */
    getLastProgressUpdate() {
        const allTasks = Array.from(this.tasks.values());
        if (allTasks.length === 0)
            return null;
        const completedTasks = allTasks.filter(t => t.status === 'completed');
        const failedTasks = allTasks.filter(t => t.status === 'failed');
        const runningTasks = allTasks.filter(t => t.status === 'running');
        return {
            sessionId: this.sessionId,
            totalTasks: allTasks.length,
            completedTasks: completedTasks.length,
            failedTasks: failedTasks.length,
            currentStage: 'Current',
            stageProgress: 0,
            overallProgress: allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0,
            currentTasks: runningTasks,
            metrics: this.calculateMetrics(),
            timestamp: new Date()
        };
    }
    /**
     * Generate final report
     */
    generateFinalReport() {
        const update = this.getLastProgressUpdate();
        if (!update)
            return;
        console.log('\n🎯 FINAL PROGRESS REPORT');
        console.log('✨ ORCHESTRATION EXECUTION COMPLETE\n');
        console.log('📈 EXECUTION STATISTICS:');
        console.log(`├─ Total Tasks: ${update.totalTasks}`);
        console.log(`├─ Successful: ${update.completedTasks} (${(update.metrics.successRate * 100).toFixed(1)}%)`);
        console.log(`├─ Failed: ${update.failedTasks}`);
        console.log(`├─ Total Duration: ${(update.metrics.totalTime / 1000).toFixed(1)} seconds`);
        console.log(`├─ Average Task Time: ${(update.metrics.averageTaskTime / 1000).toFixed(1)} seconds`);
        console.log(`└─ Parallel Efficiency: ${(update.metrics.parallelEfficiency * 100).toFixed(1)}%`);
        console.log('\n💰 COST ANALYSIS:');
        console.log(`├─ Total Cost: $${update.metrics.totalCost.toFixed(3)}`);
        console.log(`├─ Cost per Task: $${update.metrics.costPerTask.toFixed(3)}`);
        console.log(`├─ Total Tokens: ${update.metrics.totalTokens}`);
        console.log(`└─ Tokens per Task: ${update.metrics.tokensPerTask.toFixed(0)}`);
        console.log('\n🌳 LEVEL BREAKDOWN:');
        console.log(`├─ Level 1: ${update.metrics.levelMetrics.level1.completedTasks}/${update.metrics.levelMetrics.level1.totalTasks} tasks`);
        console.log(`├─ Level 2: ${update.metrics.levelMetrics.level2.completedTasks}/${update.metrics.levelMetrics.level2.totalTasks} tasks`);
        console.log(`└─ Level 3: ${update.metrics.levelMetrics.level3.completedTasks}/${update.metrics.levelMetrics.level3.totalTasks} tasks`);
    }
}
exports.ProgressTracker = ProgressTracker;
//# sourceMappingURL=progress-tracker.js.map