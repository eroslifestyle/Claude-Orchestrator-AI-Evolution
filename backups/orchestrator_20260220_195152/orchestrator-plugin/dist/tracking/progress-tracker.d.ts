/**
 * Progress Tracker - Real-time Orchestration Monitoring
 *
 * Tracks progress di tutti i task a 3 livelli con metrics real-time
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { AgentTask } from '../types';
import type { TaskResult } from '../execution/task-launcher';
export interface ProgressUpdate {
    sessionId: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    currentStage: string;
    stageProgress: number;
    overallProgress: number;
    currentTasks: TaskProgress[];
    metrics: ProgressMetrics;
    timestamp: Date;
}
export interface TaskProgress {
    taskId: string;
    agentFile: string;
    model: string;
    level: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    cost?: number;
    tokens?: number;
}
export interface ProgressMetrics {
    totalTime: number;
    totalCost: number;
    totalTokens: number;
    averageTaskTime: number;
    successRate: number;
    parallelEfficiency: number;
    costPerTask: number;
    tokensPerTask: number;
    currentParallelTasks: number;
    maxParallelTasks: number;
    levelMetrics: {
        level1: LevelMetrics;
        level2: LevelMetrics;
        level3: LevelMetrics;
    };
}
export interface LevelMetrics {
    totalTasks: number;
    completedTasks: number;
    avgDuration: number;
    avgCost: number;
    avgTokens: number;
    successRate: number;
}
export declare class ProgressTracker extends EventEmitter {
    private logger;
    private sessionId;
    private tasks;
    private startTime;
    private results;
    constructor(sessionId: string);
    /**
     * Inizializza tracking per tutti i task
     */
    initializeTasks(allTasks: AgentTask[]): void;
    /**
     * Segna inizio esecuzione di un task
     */
    startTask(taskId: string): void;
    /**
     * Aggiorna progress di un task durante esecuzione
     */
    updateTaskProgress(taskId: string, progress: number): void;
    /**
     * Completa tracking di un task
     */
    completeTask(taskId: string, result: TaskResult): void;
    /**
     * Aggiorna stage corrente (LEVEL 1, LEVEL 2, etc.)
     */
    updateStage(stageName: string, stageProgress: number): void;
    /**
     * Calcola metrics complete
     */
    private calculateMetrics;
    /**
     * Calcola metrics per singolo livello
     */
    private calculateLevelMetrics;
    /**
     * Emette update progress
     */
    private emitProgressUpdate;
    /**
     * Display progress in console format
     */
    displayProgress(): void;
    /**
     * Get ultimo progress update
     */
    getLastProgressUpdate(): ProgressUpdate | null;
    /**
     * Generate final report
     */
    generateFinalReport(): void;
}
//# sourceMappingURL=progress-tracker.d.ts.map