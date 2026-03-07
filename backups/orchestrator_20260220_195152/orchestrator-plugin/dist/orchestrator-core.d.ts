/**
 * ORCHESTRATOR CORE V5.1 - Sistema Multi-Agent REAL IMPLEMENTATION
 *
 * Implementazione completa con integrazione Task tool reale e progress tracking
 *
 * REGOLE FONDAMENTALI:
 * #1: MAI codifica direttamente - SEMPRE delega
 * #2: SEMPRE comunica tabella agent PRIMA di lanciare
 * #3: Parallelismo massimo per task indipendenti
 * #4: Usa Ralph Loop per task iterativi
 * #5: OGNI processo DEVE concludersi con documenter expert agent
 * #6: PRIMA di ogni task, verifica ERRORI RISOLTI
 */
interface KeywordAnalysis {
    keywords: string[];
    domini: string[];
    complessita: 'bassa' | 'media' | 'alta';
    fileCount: number;
    isMultiDominio: boolean;
}
interface AgentTask {
    id: string;
    description: string;
    agentExpertFile: string;
    model: 'haiku' | 'sonnet' | 'opus';
    specialization: string;
    dependencies: string[];
    priority: 'CRITICA' | 'ALTA' | 'MEDIA';
    level: 1 | 2 | 3;
    parentTaskId?: string;
    subTasks?: AgentTask[];
    allowSubSpawning?: boolean;
    complexityThreshold?: number;
    maxSubTasks?: number;
    spawnRules?: SubTaskSpawnRule[];
    depth?: number;
    childTaskIds?: string[];
    maxDepth?: number;
    path?: string;
    rootTaskId?: string;
}
interface SubTaskSpawnRule {
    triggerKeywords: string[];
    targetExpertFile: string;
    maxComplexity: number;
    description: string;
}
interface ExecutionPlan {
    tasks: AgentTask[];
    parallelBatches: AgentTask[][];
    totalAgents: number;
    stimatedTime: string;
    documenterTask: AgentTask;
    hierarchicalStructure: {
        level1Tasks: AgentTask[];
        level2Tasks: AgentTask[];
        level3Tasks: AgentTask[];
        totalLevels: number;
        maxParallelism: number;
    };
}
declare class OrchestratorV51 {
    private quickFixer;
    constructor();
    /**
     * STEP 1: ANALISI TASK + KEYWORD EXTRACTION
     * Seguendo esattamente orchestrator.md workflow
     */
    analyzeTask(userRequest: string): KeywordAnalysis;
    /**
     * STEP 2: ROUTING AGENT EXPERT FILE
     * Usa MAPPATURA KEYWORD → EXPERT FILE
     */
    routeToAgents(analysis: KeywordAnalysis, userRequest: string): AgentTask[];
    private generateTaskDescription;
    private getSpecialization;
    /**
     * STEP 3: COMUNICAZIONE PRE-LANCIO
     * MOSTRA tabella agent all'utente (9 colonne COMPLETE)
     * REGOLA #2: SEMPRE comunica tabella agent PRIMA di lanciare
     */
    displayExecutionPlan(tasks: AgentTask[]): void;
    /**
     * 🚀 PARALLELISMO A 3 LIVELLI - GENERAZIONE GERARCHICA SUB-TASKS
     * Analizza ogni task principale e genera sub-tasks quando necessario
     */
    generateHierarchicalTasks(tasks: AgentTask[]): Promise<AgentTask[]>;
    /**
     * Analizza complessità di un task per decisioni di spawning
     */
    private analyzeTaskComplexity;
    /**
     * Genera sub-tasks intelligenti basati sul task parent
     */
    private generateSubTasks;
    /**
     * Regole di spawning per diversi tipi di expert
     */
    private getSpawnRules;
    /**
     * Visualizza struttura gerarchica
     */
    private displayHierarchy;
    /**
     * STEP 4: ESECUZIONE PARALLELA A 3 LIVELLI
     * Esegue la gerarchia completa rispettando le dipendenze inter-livello
     * REGOLA #3: Parallelismo massimo per task indipendenti (a ogni livello)
     */
    executeParallel(tasks: AgentTask[]): Promise<void>;
    /**
     * Esegue un livello specifico di task in parallelo
     */
    private executeTaskLevel;
    /**
     * Esegue singolo agent tramite Task tool
     * Implementazione base - da espandere per Task tool reale
     */
    private executeAgent;
    /**
     * STEP 5: MERGE & REPORT
     * Unisci risultati da tutti gli agent
     */
    /**
     * STEP 5: MERGE & REPORT GERARCHICO
     * Report esteso con statistiche per tutti i 3 livelli
     */
    generateFinalReportHierarchical(tasks: AgentTask[]): void;
    private estimateTimeHierarchical;
    private estimateCostHierarchical;
    private calculateSequentialTime;
    private calculateParallelTime;
    private estimateCostForLevel;
    generateFinalReport(tasks: AgentTask[]): void;
    private truncateText;
    private estimateTime;
    private estimateCost;
    private simulateExecution;
    /**
     * MAIN ORCHESTRATION METHOD
     * Esegue tutto il workflow V5.1 seguendo le 6 REGOLE FONDAMENTALI
     */
    orchestrate(userRequest: string): Promise<void>;
}
export { OrchestratorV51, type KeywordAnalysis, type AgentTask, type ExecutionPlan };
//# sourceMappingURL=orchestrator-core.d.ts.map