/**
 * TASK ANALYZER - Consolidated
 * ============================
 * Analisi task consolidata da:
 * - analysis/analysis-engine.ts
 * - analysis/KeywordExtractor.ts
 * - analysis/EnhancedKeywordExtractor.ts
 * - analysis/tiers/fast/smart/deep
 *
 * NO dipendenze esterne (no 'natural') - usa regex e pattern matching.
 *
 * @version 4.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ModelType = 'haiku' | 'sonnet' | 'opus';

export interface AnalysisResult {
    keywords: string[];
    domains: string[];
    complexity: ComplexityLevel;
    suggestedAgent: string;
    suggestedModel: ModelType;
    confidence: number;
    reasoning: string;
}

export interface DomainMapping {
    keywords: string[];
    agent: string;
    model: ModelType;
    priority: number;
}

// =============================================================================
// DOMAIN MAPPINGS - Inline, no file esterni
// =============================================================================

const DOMAIN_MAPPINGS: Record<string, DomainMapping> = {
    gui: {
        keywords: ['gui', 'pyqt', 'pyqt5', 'qt', 'widget', 'ui', 'ux', 'frontend', 'layout', 'window', 'button', 'dialog'],
        agent: 'experts/gui-super-expert.md',
        model: 'sonnet',
        priority: 1
    },
    database: {
        keywords: ['database', 'db', 'sql', 'sqlite', 'postgres', 'mysql', 'query', 'schema', 'migration', 'orm'],
        agent: 'experts/database_expert.md',
        model: 'sonnet',
        priority: 1
    },
    security: {
        keywords: ['security', 'auth', 'authentication', 'authorization', 'jwt', 'token', 'encrypt', 'hash', 'password', 'session'],
        agent: 'experts/security_unified_expert.md',
        model: 'opus',
        priority: 0
    },
    api: {
        keywords: ['api', 'rest', 'graphql', 'endpoint', 'request', 'response', 'http', 'webhook', 'route'],
        agent: 'experts/api-design-specialist.md',
        model: 'sonnet',
        priority: 1
    },
    integration: {
        keywords: ['telegram', 'discord', 'slack', 'webhook', 'integration', 'connect', 'metatrader', 'mt4', 'mt5', 'ctrader'],
        agent: 'experts/integration_expert.md',
        model: 'sonnet',
        priority: 1
    },
    trading: {
        keywords: ['trading', 'strategy', 'risk', 'position', 'order', 'trade', 'forex', 'stock', 'crypto'],
        agent: 'experts/trading_strategy_expert.md',
        model: 'sonnet',
        priority: 1
    },
    mql: {
        keywords: ['mql', 'mql4', 'mql5', 'expert advisor', 'ea', 'indicator', 'metatrader'],
        agent: 'experts/mql_expert.md',
        model: 'sonnet',
        priority: 1
    },
    architecture: {
        keywords: ['architecture', 'design', 'pattern', 'refactor', 'structure', 'module', 'system', 'scalable'],
        agent: 'experts/architect_expert.md',
        model: 'opus',
        priority: 0
    },
    testing: {
        keywords: ['test', 'testing', 'unit', 'integration', 'e2e', 'pytest', 'jest', 'debug', 'bug', 'fix', 'error'],
        agent: 'experts/tester_expert.md',
        model: 'sonnet',
        priority: 1
    },
    devops: {
        keywords: ['devops', 'docker', 'kubernetes', 'k8s', 'ci', 'cd', 'deploy', 'pipeline', 'container'],
        agent: 'experts/devops_expert.md',
        model: 'haiku',
        priority: 2
    },
    ai: {
        keywords: ['ai', 'llm', 'machine learning', 'ml', 'neural', 'model', 'prompt', 'embedding', 'rag'],
        agent: 'experts/ai_integration_expert.md',
        model: 'sonnet',
        priority: 1
    },
    claude: {
        keywords: ['claude', 'anthropic', 'claude code', 'mcp', 'tool'],
        agent: 'experts/claude_systems_expert.md',
        model: 'sonnet',
        priority: 1
    },
    documentation: {
        keywords: ['document', 'doc', 'readme', 'changelog', 'comment', 'jsdoc', 'markdown'],
        agent: 'experts/documenter_expert.md',
        model: 'haiku',
        priority: 3
    },
    mobile: {
        keywords: ['mobile', 'ios', 'android', 'react native', 'flutter', 'app', 'swift', 'kotlin'],
        agent: 'experts/mobile_expert.md',
        model: 'sonnet',
        priority: 1
    },
    automation: {
        keywords: ['n8n', 'automation', 'workflow', 'zapier', 'automate', 'schedule', 'cron'],
        agent: 'experts/n8n_expert.md',
        model: 'haiku',
        priority: 2
    }
};

// Complexity indicators
const COMPLEXITY_INDICATORS = {
    low: ['simple', 'basic', 'quick', 'small', 'minor', 'trivial', 'easy'],
    medium: ['standard', 'normal', 'typical', 'regular', 'moderate'],
    high: ['complex', 'advanced', 'difficult', 'challenging', 'sophisticated'],
    critical: ['critical', 'security', 'architecture', 'migration', 'refactor', 'optimize', 'performance']
};

// =============================================================================
// TASK ANALYZER
// =============================================================================

export class TaskAnalyzer {
    private cache: Map<string, AnalysisResult> = new Map();

    /**
     * Analizza una descrizione di task
     */
    analyze(description: string): AnalysisResult {
        // Check cache
        const cacheKey = description.toLowerCase().trim();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const keywords = this.extractKeywords(description);
        const domains = this.detectDomains(keywords);
        const complexity = this.assessComplexity(description, keywords);
        const { agent, model, confidence } = this.determineBestAgent(domains, complexity);

        const result: AnalysisResult = {
            keywords,
            domains,
            complexity,
            suggestedAgent: agent,
            suggestedModel: model,
            confidence,
            reasoning: this.generateReasoning(domains, complexity, agent, model)
        };

        // Cache result
        this.cache.set(cacheKey, result);

        return result;
    }

    /**
     * Estrae keywords dal testo
     */
    extractKeywords(text: string): string[] {
        const lower = text.toLowerCase();
        const keywords: Set<string> = new Set();

        // Cerca tutte le keyword note
        for (const domain of Object.values(DOMAIN_MAPPINGS)) {
            for (const kw of domain.keywords) {
                if (lower.includes(kw)) {
                    keywords.add(kw);
                }
            }
        }

        // Estrai anche parole singole significative (>3 caratteri)
        const words = lower
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);

        for (const word of words) {
            if (this.isSignificantWord(word)) {
                keywords.add(word);
            }
        }

        return Array.from(keywords);
    }

    /**
     * Rileva i domini coinvolti
     */
    detectDomains(keywords: string[]): string[] {
        const domainScores: Map<string, number> = new Map();

        for (const keyword of keywords) {
            for (const [domain, mapping] of Object.entries(DOMAIN_MAPPINGS)) {
                if (mapping.keywords.includes(keyword)) {
                    const current = domainScores.get(domain) || 0;
                    domainScores.set(domain, current + 1);
                }
            }
        }

        // Ordina per score e ritorna
        return Array.from(domainScores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([domain]) => domain);
    }

    /**
     * Valuta la complessità
     */
    assessComplexity(description: string, keywords: string[]): ComplexityLevel {
        const lower = description.toLowerCase();

        // Check indicatori diretti
        for (const [level, indicators] of Object.entries(COMPLEXITY_INDICATORS)) {
            for (const indicator of indicators) {
                if (lower.includes(indicator)) {
                    return level as ComplexityLevel;
                }
            }
        }

        // Euristica basata su keywords
        const domainCount = this.detectDomains(keywords).length;

        if (domainCount >= 3) return 'high';
        if (domainCount >= 2) return 'medium';

        // Check lunghezza descrizione
        if (description.length > 200) return 'medium';
        if (description.length > 500) return 'high';

        return 'low';
    }

    /**
     * Determina il miglior agent
     */
    private determineBestAgent(
        domains: string[],
        complexity: ComplexityLevel
    ): { agent: string; model: ModelType; confidence: number } {
        if (domains.length === 0) {
            return {
                agent: 'core/coder.md',
                model: this.getModelForComplexity(complexity),
                confidence: 0.5
            };
        }

        // Prendi il dominio principale
        const primaryDomain = domains[0];
        const mapping = DOMAIN_MAPPINGS[primaryDomain];

        if (!mapping) {
            return {
                agent: 'core/coder.md',
                model: this.getModelForComplexity(complexity),
                confidence: 0.5
            };
        }

        // Aggiusta modello per complessità
        let model = mapping.model;
        if (complexity === 'critical' || complexity === 'high') {
            model = 'opus';
        } else if (complexity === 'low' && model !== 'opus') {
            model = 'haiku';
        }

        const confidence = Math.min(0.95, 0.6 + (domains.length * 0.1));

        return {
            agent: mapping.agent,
            model,
            confidence
        };
    }

    /**
     * Modello per complessità
     */
    private getModelForComplexity(complexity: ComplexityLevel): ModelType {
        switch (complexity) {
            case 'critical': return 'opus';
            case 'high': return 'opus';
            case 'medium': return 'sonnet';
            case 'low': return 'haiku';
        }
    }

    /**
     * Check se parola è significativa
     */
    private isSignificantWord(word: string): boolean {
        const stopWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'can', 'all', 'are', 'was', 'were'];
        return !stopWords.includes(word) && word.length > 3;
    }

    /**
     * Genera reasoning
     */
    private generateReasoning(
        domains: string[],
        complexity: ComplexityLevel,
        agent: string,
        model: ModelType
    ): string {
        if (domains.length === 0) {
            return `No specific domain detected. Using default agent with ${model} model.`;
        }

        return `Detected domains: ${domains.join(', ')}. ` +
               `Complexity: ${complexity}. ` +
               `Selected ${agent} with ${model} model for optimal performance.`;
    }

    /**
     * Suggerisci agent per descrizione
     */
    suggestAgent(description: string): string {
        return this.analyze(description).suggestedAgent;
    }

    /**
     * Suggerisci modello per descrizione
     */
    suggestModel(description: string): ModelType {
        return this.analyze(description).suggestedModel;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}

// =============================================================================
// SINGLETON & CONVENIENCE
// =============================================================================

export const taskAnalyzer = new TaskAnalyzer();

export function analyzeTask(description: string): AnalysisResult {
    return taskAnalyzer.analyze(description);
}

export function suggestAgent(description: string): string {
    return taskAnalyzer.suggestAgent(description);
}

export function suggestModel(description: string): ModelType {
    return taskAnalyzer.suggestModel(description);
}
