"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestModel = exports.suggestAgent = exports.analyzeTask = exports.taskAnalyzer = exports.TaskAnalyzer = void 0;
// =============================================================================
// DOMAIN MAPPINGS - Inline, no file esterni
// =============================================================================
const DOMAIN_MAPPINGS = {
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
class TaskAnalyzer {
    cache = new Map();
    /**
     * Analizza una descrizione di task
     */
    analyze(description) {
        // Check cache
        const cacheKey = description.toLowerCase().trim();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const keywords = this.extractKeywords(description);
        const domains = this.detectDomains(keywords);
        const complexity = this.assessComplexity(description, keywords);
        const { agent, model, confidence } = this.determineBestAgent(domains, complexity);
        const result = {
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
    extractKeywords(text) {
        const lower = text.toLowerCase();
        const keywords = new Set();
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
    detectDomains(keywords) {
        const domainScores = new Map();
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
    assessComplexity(description, keywords) {
        const lower = description.toLowerCase();
        // Check indicatori diretti
        for (const [level, indicators] of Object.entries(COMPLEXITY_INDICATORS)) {
            for (const indicator of indicators) {
                if (lower.includes(indicator)) {
                    return level;
                }
            }
        }
        // Euristica basata su keywords
        const domainCount = this.detectDomains(keywords).length;
        if (domainCount >= 3)
            return 'high';
        if (domainCount >= 2)
            return 'medium';
        // Check lunghezza descrizione
        if (description.length > 200)
            return 'medium';
        if (description.length > 500)
            return 'high';
        return 'low';
    }
    /**
     * Determina il miglior agent
     */
    determineBestAgent(domains, complexity) {
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
        }
        else if (complexity === 'low' && model !== 'opus') {
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
    getModelForComplexity(complexity) {
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
    isSignificantWord(word) {
        const stopWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'can', 'all', 'are', 'was', 'were'];
        return !stopWords.includes(word) && word.length > 3;
    }
    /**
     * Genera reasoning
     */
    generateReasoning(domains, complexity, agent, model) {
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
    suggestAgent(description) {
        return this.analyze(description).suggestedAgent;
    }
    /**
     * Suggerisci modello per descrizione
     */
    suggestModel(description) {
        return this.analyze(description).suggestedModel;
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}
exports.TaskAnalyzer = TaskAnalyzer;
// =============================================================================
// SINGLETON & CONVENIENCE
// =============================================================================
exports.taskAnalyzer = new TaskAnalyzer();
function analyzeTask(description) {
    return exports.taskAnalyzer.analyze(description);
}
exports.analyzeTask = analyzeTask;
function suggestAgent(description) {
    return exports.taskAnalyzer.suggestAgent(description);
}
exports.suggestAgent = suggestAgent;
function suggestModel(description) {
    return exports.taskAnalyzer.suggestModel(description);
}
exports.suggestModel = suggestModel;
//# sourceMappingURL=task-analyzer.js.map