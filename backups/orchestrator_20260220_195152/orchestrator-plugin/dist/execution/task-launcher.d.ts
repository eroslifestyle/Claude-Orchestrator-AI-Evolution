/**
 * Task Launcher - Real Task Tool Integration
 *
 * Sostituisce la simulazione con chiamate reali al Task tool di Claude Code
 * Implementa PROTOCOL.md compliance e error handling avanzato
 */
import type { ModelType, PriorityLevel } from '../types';
export interface AgentTask {
    id: string;
    description: string;
    agentExpertFile: string;
    model: ModelType;
    specialization: string;
    dependencies: string[];
    priority: PriorityLevel;
    level?: 1 | 2 | 3;
    parentTaskId?: string;
    depth?: number;
    childTaskIds?: string[];
    maxDepth?: number;
    path?: string;
    rootTaskId?: string;
}
export interface TaskResult {
    success: boolean;
    taskId: string;
    agentFile: string;
    model: string;
    duration: number;
    output: string;
    filesModified?: string[];
    issues?: string[];
    cost?: number;
    tokens?: number;
    error?: string;
    protocol?: ProtocolResponse;
}
export interface ProtocolResponse {
    header: {
        agent: string;
        taskId: string;
        status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
        model: string;
        timestamp: string;
    };
    summary: string;
    filesModified: string[];
    issues: {
        type: string;
        description: string;
        severity: string;
    }[];
    recommendations: string[];
    handoff?: {
        to: string;
        context: string;
        reason: string;
    };
    metrics?: {
        duration: number;
        tokensUsed: number;
        cost: number;
    };
}
export declare class TaskLauncher {
    private logger;
    private maxRetries;
    private retryDelay;
    constructor();
    /**
     * Lancia un singolo agent task tramite Task tool reale
     */
    executeTask(task: AgentTask): Promise<TaskResult>;
    /**
     * Carica content di un agent file
     */
    private loadAgentFile;
    /**
     * Prepara instructions complete per il Task tool
     */
    private prepareInstructions;
    /**
     * Lancia il Task tool REALE di Claude Code
     */
    private launchRealTask;
    /**
     * Mappa agent file a subagent_type per Task tool
     */
    private mapToSubagentType;
    /**
     * Wrapper per chiamata Task tool reale (da implementare)
     */
    private callClaudeCodeTaskTool;
    /**
     * Parse response secondo PROTOCOL.md
     */
    private parseProtocolResponse;
    /**
     * Genera mock response realistico per testing
     */
    private generateMockProtocolResponse;
    /**
     * Stima costo basato su modello e durata
     */
    private estimateCost;
    /**
     * Delay helper per retry logic
     */
    private delay;
    /**
     * Batch execution per multiple tasks in parallelo
     */
    executeBatch(tasks: AgentTask[]): Promise<TaskResult[]>;
}
//# sourceMappingURL=task-launcher.d.ts.map