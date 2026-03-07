/**
 * Smart Model Selector
 * Assegnazione intelligente dei modelli in base a complessità e tipo di task
 *
 * REGOLA FONDAMENTALE:
 * - Orchestrator: SEMPRE Opus
 * - Altri task: In base a complessità
 */

export type ModelType = 'haiku' | 'sonnet' | 'opus';

export interface TaskAnalysis {
    complexity: 'low' | 'medium' | 'high' | 'critical';
    requiresLateralThinking: boolean;
    isRepetitive: boolean;
    isLoopTask: boolean;
    domain: string;
    estimatedTokens: number;
}

export interface ModelSelectionResult {
    model: ModelType;
    reason: string;
    confidence: number;
}

// Keywords che indicano alta complessità
const HIGH_COMPLEXITY_KEYWORDS = [
    'architect', 'design', 'refactor', 'optimize', 'security', 'auth',
    'migration', 'integration', 'strategy', 'analysis', 'debug complex',
    'performance', 'scalability', 'distributed', 'concurrent', 'async'
];

// Keywords che indicano task ripetitivi
const REPETITIVE_KEYWORDS = [
    'format', 'lint', 'validate', 'check', 'verify', 'test run',
    'build', 'compile', 'deploy', 'copy', 'move', 'rename',
    'document', 'log', 'report', 'export', 'import', 'sync'
];

// Keywords che indicano necessità di pensiero laterale
const LATERAL_THINKING_KEYWORDS = [
    'innovate', 'creative', 'alternative', 'explore', 'brainstorm',
    'solve', 'investigate', 'research', 'analyze root cause',
    'propose', 'suggest', 'recommend', 'evaluate options'
];

// Domini e modello preferito
const DOMAIN_MODEL_MAP: Record<string, ModelType> = {
    'orchestrator': 'opus',      // SEMPRE Opus
    'architecture': 'opus',
    'security': 'opus',
    'strategy': 'opus',
    'gui': 'sonnet',
    'database': 'sonnet',
    'api': 'sonnet',
    'testing': 'sonnet',
    'integration': 'sonnet',
    'documentation': 'haiku',
    'formatting': 'haiku',
    'validation': 'haiku',
    'logging': 'haiku',
    'reporting': 'haiku'
};

export class SmartModelSelector {

    /**
     * Analizza un task e determina la sua complessità
     */
    analyzeTask(description: string, agentFile: string, context?: {
        parentModel?: ModelType;
        depth?: number;
        isSubtask?: boolean;
    }): TaskAnalysis {
        const lowerDesc = description.toLowerCase();
        const lowerAgent = agentFile.toLowerCase();

        // Determina dominio
        let domain = 'general';
        for (const [key, _] of Object.entries(DOMAIN_MODEL_MAP)) {
            if (lowerAgent.includes(key) || lowerDesc.includes(key)) {
                domain = key;
                break;
            }
        }

        // Check complessità
        const hasHighComplexity = HIGH_COMPLEXITY_KEYWORDS.some(k =>
            lowerDesc.includes(k) || lowerAgent.includes(k)
        );

        // Check ripetitività
        const isRepetitive = REPETITIVE_KEYWORDS.some(k => lowerDesc.includes(k));

        // Check pensiero laterale
        const requiresLateralThinking = LATERAL_THINKING_KEYWORDS.some(k =>
            lowerDesc.includes(k)
        );

        // Check se è un loop task (subtask di stesso tipo del parent)
        const isLoopTask = context?.isSubtask &&
                          context?.depth !== undefined &&
                          context.depth > 1;

        // Determina complessità finale
        let complexity: TaskAnalysis['complexity'];

        if (domain === 'orchestrator' || domain === 'architecture' || domain === 'security') {
            complexity = 'critical';
        } else if (hasHighComplexity || requiresLateralThinking) {
            complexity = 'high';
        } else if (isRepetitive || isLoopTask) {
            complexity = 'low';
        } else {
            complexity = 'medium';
        }

        // Stima token
        const estimatedTokens = this.estimateTokens(description, complexity);

        return {
            complexity,
            requiresLateralThinking,
            isRepetitive,
            isLoopTask: isLoopTask ?? false,
            domain,
            estimatedTokens
        };
    }

    /**
     * Seleziona il modello ottimale per un task
     */
    selectModel(
        description: string,
        agentFile: string,
        context?: {
            parentModel?: ModelType;
            depth?: number;
            isSubtask?: boolean;
            forceModel?: ModelType;
        }
    ): ModelSelectionResult {

        // Se forzato, usa quello
        if (context?.forceModel) {
            return {
                model: context.forceModel,
                reason: 'Model forced by configuration',
                confidence: 1.0
            };
        }

        // Analizza task
        const analysis = this.analyzeTask(description, agentFile, context);

        // REGOLA 1: Orchestrator SEMPRE Opus
        if (analysis.domain === 'orchestrator') {
            return {
                model: 'opus',
                reason: 'Orchestrator tasks ALWAYS use Opus',
                confidence: 1.0
            };
        }

        // REGOLA 2: Task ripetitivi o loop -> Haiku
        if (analysis.isRepetitive || analysis.isLoopTask) {
            return {
                model: 'haiku',
                reason: `Repetitive/loop task (${analysis.isLoopTask ? 'depth ' + context?.depth : 'pattern detected'})`,
                confidence: 0.9
            };
        }

        // REGOLA 3: Complessità critica -> Opus
        if (analysis.complexity === 'critical') {
            return {
                model: 'opus',
                reason: `Critical complexity: ${analysis.domain} domain`,
                confidence: 0.95
            };
        }

        // REGOLA 4: Richiede pensiero laterale -> Opus
        if (analysis.requiresLateralThinking) {
            return {
                model: 'opus',
                reason: 'Task requires lateral thinking',
                confidence: 0.85
            };
        }

        // REGOLA 5: Alta complessità -> Sonnet
        if (analysis.complexity === 'high') {
            return {
                model: 'sonnet',
                reason: 'High complexity task',
                confidence: 0.85
            };
        }

        // REGOLA 6: Bassa complessità -> Haiku
        if (analysis.complexity === 'low') {
            return {
                model: 'haiku',
                reason: 'Low complexity task',
                confidence: 0.9
            };
        }

        // REGOLA 7: Dominio specifico
        const domainModel = DOMAIN_MODEL_MAP[analysis.domain];
        if (domainModel) {
            return {
                model: domainModel,
                reason: `Domain-specific: ${analysis.domain}`,
                confidence: 0.8
            };
        }

        // DEFAULT: Sonnet (bilanciato)
        return {
            model: 'sonnet',
            reason: 'Default balanced choice',
            confidence: 0.7
        };
    }

    /**
     * Stima token necessari
     */
    private estimateTokens(description: string, complexity: TaskAnalysis['complexity']): number {
        const baseTokens = description.length * 2; // Rough estimate

        const multipliers: Record<TaskAnalysis['complexity'], number> = {
            'low': 500,
            'medium': 1000,
            'high': 2000,
            'critical': 3000
        };

        return baseTokens + multipliers[complexity];
    }

    /**
     * Ottieni statistiche sui modelli usati
     */
    getModelDistribution(tasks: Array<{ model: ModelType }>): Record<ModelType, number> {
        const distribution: Record<ModelType, number> = {
            'haiku': 0,
            'sonnet': 0,
            'opus': 0
        };

        for (const task of tasks) {
            distribution[task.model]++;
        }

        return distribution;
    }

    /**
     * Calcola costo stimato
     */
    estimateCost(model: ModelType, tokens: number): number {
        const rates: Record<ModelType, { input: number; output: number }> = {
            'haiku': { input: 0.00025, output: 0.00125 },
            'sonnet': { input: 0.003, output: 0.015 },
            'opus': { input: 0.015, output: 0.075 }
        };

        const rate = rates[model];
        // Assume 70% input, 30% output ratio
        const inputTokens = tokens * 0.7;
        const outputTokens = tokens * 0.3;

        return (inputTokens / 1000000 * rate.input) + (outputTokens / 1000000 * rate.output);
    }
}

// Singleton instance
export const modelSelector = new SmartModelSelector();
