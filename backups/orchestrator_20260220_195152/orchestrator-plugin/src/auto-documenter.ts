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
    filesModified: Array<{ path: string; changes: string }>;
    fixesApplied: Array<{ bug: string; solution: string }>;
    errorsEncountered: Array<{ code: string; message: string; resolution: string }>;
    dependencies: { requires: string[]; unlocks: string[] };
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

export class AutoDocumenter extends EventEmitter {
    private taskDocs: Map<string, TaskDocumentation> = new Map();
    private errorCatalog: Map<string, ErrorCatalogEntry> = new Map();
    private sessionId: string;
    private sessionStartTime: number;
    private knowledgeBase: Map<string, string[]> = new Map();

    constructor() {
        super();
        this.sessionId = `session_${Date.now()}`;
        this.sessionStartTime = Date.now();
    }

    /**
     * Documenta un task completato
     */
    documentTask(doc: TaskDocumentation): string {
        this.taskDocs.set(doc.taskId, doc);

        // Aggiorna catalogo errori se ci sono errori
        for (const error of doc.errorsEncountered) {
            this.updateErrorCatalog(error, doc.taskId);
        }

        // Aggiorna knowledge base
        this.updateKnowledgeBase(doc);

        // Emetti evento
        this.emit('taskDocumented', doc);

        // Genera markdown
        return this.generateTaskMarkdown(doc);
    }

    /**
     * Genera markdown per un singolo task
     */
    private generateTaskMarkdown(doc: TaskDocumentation): string {
        const timestamp = new Date(doc.timestamp).toISOString();
        const statusEmoji = doc.status === 'SUCCESS' ? '✅' : doc.status === 'FAILED' ? '❌' : '⚠️';

        let md = `## [${doc.taskId}] - ${doc.description}
**Data**: ${timestamp}
**Agent**: ${doc.agentUsed}
**Modello**: ${doc.modelUsed}
**Durata**: ${doc.duration}ms
**Status**: ${statusEmoji} ${doc.status}

### Lavoro Svolto
${doc.workDone.map(w => `- ${w}`).join('\n')}

`;

        if (doc.filesModified.length > 0) {
            md += `### Modifiche Apportate
${doc.filesModified.map(f => `- **File**: \`${f.path}\` - ${f.changes}`).join('\n')}

`;
        }

        if (doc.fixesApplied.length > 0) {
            md += `### Fix Applicati
${doc.fixesApplied.map(f => `- **${f.bug}** -> ${f.solution}`).join('\n')}

`;
        }

        if (doc.errorsEncountered.length > 0) {
            md += `### Errori Incontrati
${doc.errorsEncountered.map(e => `- **[${e.code}]** ${e.message} -> Risolto: ${e.resolution}`).join('\n')}

`;
        }

        md += `### Lessons Learned
#### DA FARE (Best Practices)
${doc.lessonsLearned.bestPractices.map(p => `- ${p}`).join('\n') || '- Nessuna nuova best practice identificata'}

#### DA NON FARE (Anti-Patterns)
${doc.lessonsLearned.antiPatterns.map(p => `- ${p}`).join('\n') || '- Nessun anti-pattern identificato'}

### Dipendenze
- **Richiede**: ${doc.dependencies.requires.length > 0 ? doc.dependencies.requires.join(', ') : 'Nessuna'}
- **Sblocca**: ${doc.dependencies.unlocks.length > 0 ? doc.dependencies.unlocks.join(', ') : 'Nessuno'}

`;

        if (doc.notes) {
            md += `### Note per Sessioni Future
${doc.notes}

`;
        }

        md += '---\n\n';

        return md;
    }

    /**
     * Aggiorna il catalogo errori
     */
    private updateErrorCatalog(
        error: { code: string; message: string; resolution: string },
        taskId: string
    ): void {
        const existing = this.errorCatalog.get(error.code);

        if (existing) {
            existing.frequency++;
            existing.lastOccurrence = Date.now();
            existing.relatedTasks.push(taskId);
        } else {
            this.errorCatalog.set(error.code, {
                errorCode: error.code,
                errorName: error.message.split(':')[0] || error.code,
                firstOccurrence: Date.now(),
                lastOccurrence: Date.now(),
                frequency: 1,
                symptoms: [error.message],
                rootCause: 'Da investigare',
                solution: error.resolution,
                prevention: [],
                relatedTasks: [taskId]
            });
        }
    }

    /**
     * Aggiorna la knowledge base
     */
    private updateKnowledgeBase(doc: TaskDocumentation): void {
        // Estrai dominio dall'agent
        const domain = doc.agentUsed.replace('experts/', '').replace('_expert.md', '').replace('.md', '');

        if (!this.knowledgeBase.has(domain)) {
            this.knowledgeBase.set(domain, []);
        }

        const knowledge = this.knowledgeBase.get(domain)!;

        // Aggiungi best practices
        for (const practice of doc.lessonsLearned.bestPractices) {
            if (!knowledge.includes(practice)) {
                knowledge.push(`[BEST] ${practice}`);
            }
        }

        // Aggiungi anti-patterns
        for (const antiPattern of doc.lessonsLearned.antiPatterns) {
            if (!knowledge.includes(antiPattern)) {
                knowledge.push(`[ANTI] ${antiPattern}`);
            }
        }
    }

    /**
     * Genera report di sessione
     */
    generateSessionReport(): SessionReport {
        const tasks = Array.from(this.taskDocs.values());
        const endTime = Date.now();

        const completed = tasks.filter(t => t.status === 'SUCCESS').length;
        const failed = tasks.filter(t => t.status === 'FAILED').length;

        // Calcola errori comuni
        const errorCounts = new Map<string, { count: number; solution: string }>();
        for (const task of tasks) {
            for (const error of task.errorsEncountered) {
                const existing = errorCounts.get(error.code);
                if (existing) {
                    existing.count++;
                } else {
                    errorCounts.set(error.code, { count: 1, solution: error.resolution });
                }
            }
        }

        const commonErrors = Array.from(errorCounts.entries())
            .filter(([_, data]) => data.count > 1)
            .map(([code, data]) => ({
                error: code,
                occurrences: data.count,
                solution: data.solution,
                prevention: 'Implementare check preventivo'
            }));

        // Calcola distribuzione modelli
        const modelDist: Record<string, number> = { 'haiku': 0, 'sonnet': 0, 'opus': 0 };
        for (const task of tasks) {
            modelDist[task.modelUsed] = (modelDist[task.modelUsed] || 0) + 1;
        }

        // Raccogli knowledge updates
        const newPatterns: string[] = [];
        const antiPatterns: string[] = [];
        for (const task of tasks) {
            newPatterns.push(...task.lessonsLearned.bestPractices);
            antiPatterns.push(...task.lessonsLearned.antiPatterns);
        }

        // Genera executive summary
        const executiveSummary = this.generateExecutiveSummary(tasks, completed, failed);

        // Genera raccomandazioni
        const recommendations = this.generateRecommendations(tasks, commonErrors);

        return {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            endTime,
            totalDuration: endTime - this.sessionStartTime,
            tasksCompleted: completed,
            tasksFailed: failed,
            successRate: tasks.length > 0 ? (completed / tasks.length) * 100 : 0,
            executiveSummary,
            tasks,
            commonErrors,
            knowledgeUpdates: {
                newPatterns: Array.from(new Set(newPatterns)),
                confirmedAntiPatterns: Array.from(new Set(antiPatterns)),
                optimalConfigs: []
            },
            recommendations,
            modelDistribution: modelDist,
            totalCost: 0 // Da calcolare basato sui modelli usati
        };
    }

    /**
     * Genera executive summary
     */
    private generateExecutiveSummary(
        tasks: TaskDocumentation[],
        completed: number,
        failed: number
    ): string {
        const total = tasks.length;
        const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

        let summary = `Sessione completata con ${completed}/${total} task riusciti (${successRate}% success rate). `;

        if (failed > 0) {
            summary += `${failed} task hanno richiesto intervento. `;
        }

        const uniqueDomains = new Set(tasks.map(t =>
            t.agentUsed.replace('experts/', '').replace('_expert.md', '')
        ));
        const domains = Array.from(uniqueDomains);
        summary += `Domini coinvolti: ${domains.join(', ')}.`;

        return summary;
    }

    /**
     * Genera raccomandazioni
     */
    private generateRecommendations(
        tasks: TaskDocumentation[],
        commonErrors: SessionReport['commonErrors']
    ): string[] {
        const recommendations: string[] = [];

        // Raccomandazione su errori frequenti
        if (commonErrors.length > 0) {
            recommendations.push(
                `Implementare check preventivi per: ${commonErrors.map(e => e.error).join(', ')}`
            );
        }

        // Raccomandazione su task falliti
        const failedTasks = tasks.filter(t => t.status === 'FAILED');
        if (failedTasks.length > 0) {
            const uniqueAgents = new Set(failedTasks.map(t => t.agentUsed));
            recommendations.push(
                `Rivedere la strategia per task di tipo: ${Array.from(uniqueAgents).join(', ')}`
            );
        }

        // Raccomandazione su modelli
        const modelUsage = tasks.reduce((acc, t) => {
            acc[t.modelUsed] = (acc[t.modelUsed] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        if (modelUsage['opus'] > tasks.length * 0.5) {
            recommendations.push(
                'Valutare se alcuni task Opus possono essere degradati a Sonnet per ottimizzare costi'
            );
        }

        return recommendations;
    }

    /**
     * Genera markdown del report di sessione
     */
    generateSessionMarkdown(): string {
        const report = this.generateSessionReport();
        const startDate = new Date(report.startTime).toISOString();
        const duration = this.formatDuration(report.totalDuration);

        let md = `# SESSION REPORT - ${report.sessionId}

**Data Inizio**: ${startDate}
**Durata Totale**: ${duration}
**Task Completati**: ${report.tasksCompleted}/${report.tasksCompleted + report.tasksFailed}
**Success Rate**: ${report.successRate.toFixed(1)}%

## Executive Summary
${report.executiveSummary}

## Distribuzione Modelli
| Modello | Task | Percentuale |
|---------|------|-------------|
| Opus    | ${report.modelDistribution['opus'] || 0} | ${((report.modelDistribution['opus'] || 0) / (report.tasksCompleted + report.tasksFailed) * 100).toFixed(1)}% |
| Sonnet  | ${report.modelDistribution['sonnet'] || 0} | ${((report.modelDistribution['sonnet'] || 0) / (report.tasksCompleted + report.tasksFailed) * 100).toFixed(1)}% |
| Haiku   | ${report.modelDistribution['haiku'] || 0} | ${((report.modelDistribution['haiku'] || 0) / (report.tasksCompleted + report.tasksFailed) * 100).toFixed(1)}% |

## Tasks Eseguiti
| ID | Descrizione | Agent | Modello | Durata | Status |
|----|-------------|-------|---------|--------|--------|
${report.tasks.map(t => `| ${t.taskId} | ${t.description.substring(0, 30)}... | ${t.agentUsed.replace('experts/', '')} | ${t.modelUsed} | ${t.duration}ms | ${t.status} |`).join('\n')}

`;

        if (report.commonErrors.length > 0) {
            md += `## Errori Comuni Incontrati
| Errore | Occorrenze | Soluzione | Prevenzione |
|--------|------------|-----------|-------------|
${report.commonErrors.map(e => `| ${e.error} | ${e.occurrences} | ${e.solution} | ${e.prevention} |`).join('\n')}

`;
        }

        md += `## Knowledge Base Updates

### Nuovi Pattern Identificati
${report.knowledgeUpdates.newPatterns.map(p => `- ${p}`).join('\n') || '- Nessuno'}

### Anti-Pattern Confermati
${report.knowledgeUpdates.confirmedAntiPatterns.map(p => `- ${p}`).join('\n') || '- Nessuno'}

## Raccomandazioni
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'Nessuna raccomandazione specifica.'}

---
*Report generato automaticamente da Auto Documenter*
`;

        return md;
    }

    /**
     * Genera catalogo errori in markdown
     */
    generateErrorCatalogMarkdown(): string {
        const errors = Array.from(this.errorCatalog.values());

        if (errors.length === 0) {
            return '# Error Catalog\n\nNessun errore catalogato in questa sessione.\n';
        }

        let md = `# Error Catalog

Ultimo aggiornamento: ${new Date().toISOString()}

`;

        for (const error of errors) {
            md += `## [${error.errorCode}] - ${error.errorName}
**Prima Occorrenza**: ${new Date(error.firstOccurrence).toISOString()}
**Ultima Occorrenza**: ${new Date(error.lastOccurrence).toISOString()}
**Frequenza**: ${error.frequency} volte

### Sintomi
${error.symptoms.map(s => `- ${s}`).join('\n')}

### Causa Root
${error.rootCause}

### Soluzione
${error.solution}
${error.solutionCode ? `\n\`\`\`\n${error.solutionCode}\n\`\`\`` : ''}

### Prevenzione
${error.prevention.map(p => `- ${p}`).join('\n') || '- Da definire'}

### Task Correlati
${error.relatedTasks.map(t => `- ${t}`).join('\n')}

---

`;
        }

        return md;
    }

    /**
     * Helper per formattare durata
     */
    private formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
        return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
    }

    /**
     * Reset per nuova sessione
     */
    reset(): void {
        this.taskDocs.clear();
        this.errorCatalog.clear();
        this.sessionId = `session_${Date.now()}`;
        this.sessionStartTime = Date.now();
    }

    /**
     * Ottieni knowledge base per dominio
     */
    getKnowledgeForDomain(domain: string): string[] {
        return this.knowledgeBase.get(domain) || [];
    }

    /**
     * Ottieni tutti gli errori per prevenzione
     */
    getErrorsToPrevent(): ErrorCatalogEntry[] {
        return Array.from(this.errorCatalog.values())
            .filter(e => e.frequency > 1)
            .sort((a, b) => b.frequency - a.frequency);
    }
}

// Singleton instance
export const autoDocumenter = new AutoDocumenter();
