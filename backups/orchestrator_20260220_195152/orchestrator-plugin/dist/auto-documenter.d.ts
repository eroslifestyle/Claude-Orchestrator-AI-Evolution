/**
 * Auto Documenter
 * Sistema di documentazione automatica post-task
 *
 * Genera documentazione per:
 * - Ogni task completato
 * - Report di sessione
 * - Knowledge base
 * - Catalogo errori
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface TaskDocumentation {
    taskId: string;
    taskPath: string;
    description: string;
    agentUsed: string;
    modelUsed: string;
    duration: number;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    workDone: string[];
    filesModified: Array<{
        path: string;
        changes: string;
    }>;
    fixesApplied: Array<{
        bug: string;
        solution: string;
    }>;
    errorsEncountered: Array<{
        code: string;
        message: string;
        resolution: string;
    }>;
    dependencies: {
        requires: string[];
        unlocks: string[];
    };
    lessonsLearned: {
        bestPractices: string[];
        antiPatterns: string[];
    };
    notes: string;
    timestamp: number;
}
export interface SessionReport {
    sessionId: string;
    startTime: number;
    endTime: number;
    totalDuration: number;
    tasksCompleted: number;
    tasksFailed: number;
    successRate: number;
    executiveSummary: string;
    tasks: TaskDocumentation[];
    commonErrors: Array<{
        error: string;
        occurrences: number;
        solution: string;
        prevention: string;
    }>;
    knowledgeUpdates: {
        newPatterns: string[];
        confirmedAntiPatterns: string[];
        optimalConfigs: string[];
    };
    recommendations: string[];
    modelDistribution: Record<string, number>;
    totalCost: number;
}
export interface ErrorCatalogEntry {
    errorCode: string;
    errorName: string;
    firstOccurrence: number;
    lastOccurrence: number;
    frequency: number;
    symptoms: string[];
    rootCause: string;
    solution: string;
    solutionCode?: string;
    prevention: string[];
    relatedTasks: string[];
}
export declare class AutoDocumenter extends EventEmitter {
    private taskDocs;
    private errorCatalog;
    private sessionId;
    private sessionStartTime;
    private knowledgeBase;
    constructor();
    /**
     * Documenta un task completato
     */
    documentTask(doc: TaskDocumentation): string;
    /**
     * Genera markdown per un singolo task
     */
    private generateTaskMarkdown;
    /**
     * Aggiorna il catalogo errori
     */
    private updateErrorCatalog;
    /**
     * Aggiorna la knowledge base
     */
    private updateKnowledgeBase;
    /**
     * Genera report di sessione
     */
    generateSessionReport(): SessionReport;
    /**
     * Genera executive summary
     */
    private generateExecutiveSummary;
    /**
     * Genera raccomandazioni
     */
    private generateRecommendations;
    /**
     * Genera markdown del report di sessione
     */
    generateSessionMarkdown(): string;
    /**
     * Genera catalogo errori in markdown
     */
    generateErrorCatalogMarkdown(): string;
    /**
     * Helper per formattare durata
     */
    private formatDuration;
    /**
     * Reset per nuova sessione
     */
    reset(): void;
    /**
     * Ottieni knowledge base per dominio
     */
    getKnowledgeForDomain(domain: string): string[];
    /**
     * Ottieni tutti gli errori per prevenzione
     */
    getErrorsToPrevent(): ErrorCatalogEntry[];
}
export declare const autoDocumenter: AutoDocumenter;
//# sourceMappingURL=auto-documenter.d.ts.map