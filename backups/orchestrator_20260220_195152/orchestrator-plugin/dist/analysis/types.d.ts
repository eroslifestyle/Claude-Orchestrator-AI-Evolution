/**
 * Analysis Layer Types - Sistema 3-Tier Pragmatico Bilanciato
 *
 * ARCHITETTURA:
 * - Tier 1 (Fast Path): Enhanced regex, <10ms, 70% copertura
 * - Tier 2 (Smart Path): Synonyms + NLP, <50ms, 90% copertura
 * - Tier 3 (Deep Path): Claude LLM, <2s, 100% copertura
 *
 * @version 1.0 - Pragmatic Balance Approach
 * @author Analysis Layer Implementation Team
 * @date 30 Gennaio 2026
 */
/**
 * Tier di analisi disponibili
 */
export type AnalysisTier = 'fast' | 'smart' | 'deep';
/**
 * Configurazione per ogni tier
 */
export interface TierConfig {
    enabled: boolean;
    timeoutMs: number;
    maxRetries: number;
    fallbackTier?: AnalysisTier;
}
/**
 * Configurazione completa Analysis Engine
 */
export interface AnalysisEngineConfig {
    tiers: {
        fast: TierConfig;
        smart: TierConfig;
        deep: TierConfig;
    };
    caching: CacheConfig;
    performance: PerformanceConfig;
}
/**
 * Keyword estratta con metadati
 */
export interface ExtractedKeyword {
    /** Testo della keyword */
    text: string;
    /** Confidence 0.0-1.0 */
    confidence: number;
    /** Posizione nel testo (indice carattere) */
    position: number;
    /** Lunghezza keyword */
    length: number;
    /** Dominio rilevato */
    domain?: string;
    /** Source della detection */
    source: KeywordSource;
    /** Synonyms trovati */
    synonyms: string[];
    /** Context circostante (5 parole prima/dopo) */
    context: string;
    /** Match type */
    matchType: KeywordMatchType;
}
/**
 * Source di detection della keyword
 */
export type KeywordSource = 'exact' | 'fuzzy' | 'stem' | 'synonym' | 'phrase' | 'context' | 'nlp' | 'llm' | 'llm_context';
/**
 * Tipo di match per la keyword
 */
export type KeywordMatchType = 'direct' | 'partial' | 'inferred';
/**
 * Risultato completo estrazione keyword
 */
export interface KeywordExtractionResult {
    /** Keywords estratte */
    keywords: ExtractedKeyword[];
    /** Tier utilizzato per extraction */
    tier: AnalysisTier;
    /** Tempo di processing in ms */
    processingTimeMs: number;
    /** Confidence complessiva */
    overallConfidence: number;
    /** Metadati di debug */
    metadata: ExtractionMetadata;
}
/**
 * Metadati per debugging
 */
export interface ExtractionMetadata {
    /** Input text processato */
    inputText: string;
    /** Tokens generati */
    tokens: string[];
    /** Tier attempts fatti */
    tierAttempts: AnalysisTier[];
    /** Cache hit/miss */
    cacheHit: boolean;
    /** Statistiche performance */
    stats: {
        totalTokens: number;
        uniqueTokens: number;
        keywordsFound: number;
        averageConfidence: number;
    };
}
/**
 * Dominio classificato con metadati
 */
export interface ClassifiedDomain {
    /** Nome dominio (es: 'gui', 'database') */
    name: string;
    /** Confidence 0.0-1.0 */
    confidence: number;
    /** Keywords che hanno triggerato questo dominio */
    matchedKeywords: string[];
    /** Agent suggerito per questo dominio */
    suggestedAgent: string;
    /** Model suggerito */
    suggestedModel: 'haiku' | 'sonnet' | 'opus' | 'auto';
    /** Priorità OWASP-style */
    priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
    /** Peso relativo nel task */
    weight: number;
}
/**
 * Risultato classificazione domini
 */
export interface DomainClassificationResult {
    /** Dominio primario */
    primaryDomain: ClassifiedDomain;
    /** Domini secondari */
    secondaryDomains: ClassifiedDomain[];
    /** È multi-dominio? */
    isMultiDomain: boolean;
    /** Confidence complessiva */
    overallConfidence: number;
    /** Tier utilizzato */
    tier: AnalysisTier;
    /** Tempo processing */
    processingTimeMs: number;
    /** Metadati */
    metadata: ClassificationMetadata;
}
/**
 * Metadati classificazione
 */
export interface ClassificationMetadata {
    /** Algoritmo utilizzato */
    algorithm: 'config-driven' | 'nlp-enhanced' | 'llm-analysis';
    /** Soglie applicate */
    thresholds: {
        primaryDomainMin: number;
        multiDomainThreshold: number;
        confidenceMin: number;
    };
    /** Conflitti rilevati */
    conflicts: DomainConflict[];
}
/**
 * Conflitto tra domini
 */
export interface DomainConflict {
    domain1: string;
    domain2: string;
    conflictType: 'incompatible' | 'overlapping' | 'precedence';
    severity: 'warning' | 'error';
    resolution: string;
}
/**
 * Livelli di complessità
 */
export type ComplexityLevel = 'low' | 'medium' | 'high' | 'extreme';
/**
 * Fattore di complessità
 */
export interface ComplexityFactor {
    /** Tipo fattore */
    type: ComplexityFactorType;
    /** Peso 0.0-1.0 */
    weight: number;
    /** Score 0.0-1.0 */
    score: number;
    /** Descrizione human-readable */
    description: string;
    /** Impatto su time/cost */
    impact: {
        timeMultiplier: number;
        costMultiplier: number;
    };
}
/**
 * Tipi di fattori di complessità
 */
export type ComplexityFactorType = 'domain_count' | 'keyword_density' | 'dependency_depth' | 'ambiguity_level' | 'security_sensitivity' | 'integration_complexity' | 'performance_requirements' | 'resource_intensity';
/**
 * Assessment complessità completo
 */
export interface ComplexityAssessment {
    /** Livello finale */
    level: ComplexityLevel;
    /** Score numerico 0.0-1.0 */
    score: number;
    /** Fattori che contribuiscono */
    factors: ComplexityFactor[];
    /** Model raccomandato */
    recommendedModel: 'haiku' | 'sonnet' | 'opus';
    /** Stime */
    estimates: {
        timeMinutes: number;
        costDollars: number;
        agentCount: number;
        parallelizability: number;
    };
    /** Should spawn sub-tasks? */
    shouldSpawnSubtasks: boolean;
    /** Max sub-tasks raccomandati */
    maxSubtasks: number;
    /** Tier utilizzato */
    tier: AnalysisTier;
    /** Processing time */
    processingTimeMs: number;
}
/**
 * Configurazione cache
 */
export interface CacheConfig {
    enabled: boolean;
    /** TTL in secondi */
    ttlSeconds: number;
    /** Max entries */
    maxEntries: number;
    /** Cache strategy */
    strategy: 'lru' | 'lfu' | 'ttl';
}
/**
 * Configurazione performance
 */
export interface PerformanceConfig {
    /** Timeout default per tier (ms) */
    defaultTimeout: number;
    /** Max parallel tasks */
    maxParallel: number;
    /** Memory limit (MB) */
    memoryLimitMB: number;
    /** Enable profiling */
    profiling: boolean;
}
/**
 * Configurazione synonym dictionary
 */
export interface SynonymConfig {
    /** File path del dictionary */
    dictionaryPath: string;
    /** Lazy loading? */
    lazyLoad: boolean;
    /** Cache synonyms in memory */
    cacheInMemory: boolean;
    /** Max synonym depth (prevent loops) */
    maxDepth: number;
}
/**
 * Configurazione phrase patterns
 */
export interface PhrasePatternConfig {
    /** File patterns path */
    patternsPath: string;
    /** Max phrase length (words) */
    maxPhraseLength: number;
    /** Case sensitive */
    caseSensitive: boolean;
    /** Enable fuzzy phrase matching */
    fuzzyMatching: boolean;
}
/**
 * Configurazione context rules
 */
export interface ContextRuleConfig {
    /** Rules file path */
    rulesPath: string;
    /** Context window size (words) */
    contextWindow: number;
    /** Enable rule chaining */
    ruleChaining: boolean;
    /** Max rule depth */
    maxRuleDepth: number;
}
/**
 * Risultato completo analisi (tutti i tier)
 */
export interface AnalysisResult {
    /** Keywords estratte */
    keywords: KeywordExtractionResult;
    /** Domini classificati */
    domains: DomainClassificationResult;
    /** Complessità assessed */
    complexity: ComplexityAssessment;
    /** Processing summary */
    summary: AnalysisSummary;
    /** Success/failure */
    success: boolean;
    /** Errori eventuali */
    errors: AnalysisError[];
    /** Warnings */
    warnings: string[];
}
/**
 * Summary dell'analisi
 */
export interface AnalysisSummary {
    /** Input original */
    originalText: string;
    /** Tier utilizzati */
    tiersUsed: AnalysisTier[];
    /** Tempo totale */
    totalTimeMs: number;
    /** Confidence media */
    averageConfidence: number;
    /** Recommendation finale */
    recommendation: {
        primaryAgent: string;
        model: 'haiku' | 'sonnet' | 'opus' | 'auto';
        estimatedDifficulty: ComplexityLevel;
        shouldParallelize: boolean;
    };
}
/**
 * Errore durante analisi
 */
export interface AnalysisError {
    /** Tier dove è avvenuto */
    tier: AnalysisTier;
    /** Tipo errore */
    type: string;
    /** Messaggio */
    message: string;
    /** Stack trace */
    stack?: string;
    /** Recoverable? */
    recoverable: boolean;
}
/**
 * Configurazione Tier 1 (Fast Path)
 */
export interface FastPathConfig {
    /** Regex patterns file */
    patternsFile: string;
    /** Enable word boundaries */
    wordBoundaries: boolean;
    /** Case sensitivity */
    caseSensitive: boolean;
    /** Max input length (chars) */
    maxInputLength: number;
    /** Dictionary fallback */
    dictionaryFallback: boolean;
}
/**
 * Configurazione Tier 2 (Smart Path)
 */
export interface SmartPathConfig {
    /** Synonym dictionary config */
    synonyms: SynonymConfig;
    /** Phrase patterns config */
    phrases: PhrasePatternConfig;
    /** Context rules config */
    contextRules: ContextRuleConfig;
    /** Enable NLP */
    enableNLP: boolean;
    /** NLP model path */
    nlpModelPath?: string;
}
/**
 * Configurazione Tier 3 (Deep Path)
 */
export interface DeepPathConfig {
    /** LLM provider */
    llmProvider: 'claude' | 'openai' | 'local';
    /** Model name */
    modelName: string;
    /** API endpoint */
    endpoint?: string;
    /** API key */
    apiKey?: string;
    /** Max tokens */
    maxTokens: number;
    /** Temperature */
    temperature: number;
    /** Fallback behavior */
    fallbackBehavior: 'fail' | 'use-smart' | 'use-fast';
}
/**
 * Generic result with success/error
 */
export type TierResult<T> = {
    success: true;
    data: T;
    tier: AnalysisTier;
    timeMs: number;
} | {
    success: false;
    error: AnalysisError;
    tier: AnalysisTier;
    timeMs: number;
};
/**
 * Promise che può fallire con graceful degradation
 */
export type GracefulPromise<T> = Promise<TierResult<T>>;
/**
 * Cache key generator type
 */
export type CacheKeyGenerator = (input: string, options?: any) => string;
/**
 * Metrics collector interface
 */
export interface AnalysisMetrics {
    /** Tier usage stats */
    tierUsage: Record<AnalysisTier, number>;
    /** Average response times */
    averageResponseTime: Record<AnalysisTier, number>;
    /** Cache hit rates */
    cacheHitRate: number;
    /** Error rates */
    errorRate: Record<AnalysisTier, number>;
    /** Throughput (requests/second) */
    throughput: number;
}
/**
 * Configurazione per auto-documentazione
 */
export interface DocumentationConfig {
    /** Abilita auto-documentazione */
    enabled: boolean;
    /** Formato output */
    outputFormat: 'markdown' | 'html' | 'json';
    /** Livello dettaglio */
    detailLevel: 'basic' | 'detailed' | 'comprehensive';
    /** Include esempi */
    includeExamples: boolean;
    /** Include metadati */
    includeMetadata: boolean;
    /** Lingua documentazione */
    language: 'it' | 'en';
    /** Output directory */
    outputDirectory: string;
    /** Template personalizzato */
    templatePath?: string;
}
/**
 * Output documentazione generata
 */
export interface DocumentationOutput {
    /** Contenuto documentazione */
    content: string;
    /** Metadati documentazione */
    metadata: {
        /** Timestamp generazione */
        generatedAt: Date;
        /** Versione */
        version: string;
        /** Autore */
        author: string;
        /** Numero sezioni */
        sectionCount: number;
        /** Numero parole */
        wordCount: number;
    };
    /** Sezioni documentazione */
    sections: DocumentationSection[];
    /** Success flag */
    success: boolean;
    /** Errori eventuali */
    errors?: string[];
}
/**
 * Sezione documentazione
 */
interface DocumentationSection {
    /** Titolo sezione */
    title: string;
    /** Contenuto sezione */
    content: string;
    /** Livello gerarchia */
    level: number;
    /** Sottosezioni */
    subsections?: DocumentationSection[];
}
/**
 * Metriche auto-documentazione
 */
export interface AutoDocumentationMetrics {
    /** Documentazione generate */
    totalGenerated: number;
    /** Documentazione fallite */
    totalFailed: number;
    /** Tempo medio generazione (ms) */
    averageGenerationTimeMs: number;
    /** Dimensione media documentazione (bytes) */
    averageSizeBytes: number;
    /** Ultima generazione */
    lastGeneratedAt?: Date;
    /** Stats per formato */
    byFormat: Record<string, number>;
    /** Coverage percentuale */
    coveragePercentage: number;
}
/**
 * Chiamata agente esperto per documentazione
 */
export interface ExpertAgentCall {
    /** ID chiamata */
    id: string;
    /** Tipo agente */
    agentType: string;
    /** Modello usato */
    model: 'haiku' | 'sonnet' | 'opus';
    /** Prompt inviato */
    prompt: string;
    /** Risposta ricevuta */
    response: string;
    /** Timestamp chiamata */
    timestamp: Date;
    /** Durata (ms) */
    durationMs: number;
    /** Success flag */
    success: boolean;
    /** Token usati */
    tokensUsed: {
        input: number;
        output: number;
        total: number;
    };
    /** Costo stimato */
    costUsd?: number;
}
/**
 * Contesto integrazione
 */
export interface IntegrationContext {
    /** ID integrazione */
    integrationId: string;
    /** Tipo integrazione */
    type: 'api' | 'websocket' | 'event' | 'batch';
    /** Endpoint target */
    endpoint: string;
    /** Timeout configurazione */
    timeout: number;
    /** Retry configuration */
    retryConfig: RetryConfig;
    /** Rate limit configuration */
    rateLimitConfig: RateLimitConfig;
    /** Metadata aggiuntivi */
    metadata: Record<string, any>;
}
/**
 * Risultato operazione con resilienza
 */
export interface IntegrationResilienceResult {
    /** Success flag */
    success: boolean;
    /** Dati risposta */
    data?: any;
    /** Errori */
    errors: IntegrationError[];
    /** Tentativi fatti */
    attempts: number;
    /** Tempo totale (ms) */
    totalTimeMs: number;
    /** Strategia usata */
    strategy: 'retry' | 'fallback' | 'circuit-breaker' | 'bulkhead';
    /** Metrics */
    metrics: {
        /** Retry fatti */
        retryCount: number;
        /** Fallback attivato */
        fallbackActivated: boolean;
        /** Circuit breaker stato */
        circuitBreakerState: 'closed' | 'open' | 'half-open';
    };
    /** Resilience ID */
    resilienceId?: string;
    /** Failure analysis */
    failureAnalysis?: FailureAnalysis;
    /** Strategies applied */
    strategiesApplied?: ResilienceStrategy[];
    /** Resilience time (ms) */
    resilienceTime?: number;
}
/**
 * Errore integrazione
 */
interface IntegrationError {
    /** Tipo errore */
    type: 'timeout' | 'rate_limit' | 'connection' | 'validation' | 'unknown';
    /** Messaggio */
    message: string;
    /** Timestamp */
    timestamp: Date;
    /** Recoverable */
    recoverable: boolean;
}
/**
 * Configurazione endpoint API
 */
export interface ApiEndpoint {
    /** URL base */
    baseUrl: string;
    /** Path */
    path: string;
    /** Metodo HTTP */
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    /** Headers */
    headers: Record<string, string>;
    /** Timeout (ms) */
    timeout: number;
    /** Authentication */
    authentication?: {
        type: 'bearer' | 'api-key' | 'basic' | 'oauth2';
        token?: string;
        apiKey?: string;
        username?: string;
        password?: string;
    };
}
/**
 * Configurazione rate limiting
 */
export interface RateLimitConfig {
    /** Max richieste per finestra */
    maxRequests?: number;
    /** Finestra tempo (ms) */
    windowMs?: number;
    /** Strategy */
    strategy?: 'sliding-window' | 'token-bucket' | 'fixed-window';
    /** Backoff multiplier */
    backoffMultiplier?: number;
    /** Max wait time (ms) */
    maxWaitTimeMs?: number;
}
/**
 * Configurazione retry
 */
export interface RetryConfig {
    /** Max tentativi */
    maxAttempts?: number;
    /** Delay iniziale (ms) */
    initialDelayMs?: number;
    /** Base delay (ms) - alias for initialDelayMs */
    baseDelay?: number;
    /** Max delay (ms) */
    maxDelayMs?: number;
    /** Max delay (ms) - alias for maxDelayMs */
    maxDelay?: number;
    /** Strategy */
    strategy?: 'exponential' | 'linear' | 'fixed';
    /** Backoff multiplier */
    backoffMultiplier?: number;
    /** Retryable status codes */
    retryableStatusCodes?: number[];
    /** Retryable error types */
    retryableErrorTypes?: string[];
    /** Retryable errors */
    retryableErrors?: string[];
}
/**
 * Integration health status with extended properties
 */
export interface IntegrationHealth {
    status: 'healthy' | 'degraded' | 'down';
    lastCheck?: Date;
    successCount?: number;
    lastSuccess?: Date;
    failureCount?: number;
    lastFailure?: Date;
    lastError?: unknown;
    successRate?: number;
    responseTime?: number;
}
/**
 * Rate limit state
 */
export interface RateLimitState {
    requests: number;
    windowStart: number;
    blocked?: boolean;
    resetTime?: number;
    endpoint?: string;
}
/**
 * API call configuration
 */
export interface ApiCall {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    timeout?: number;
    data?: unknown;
    rateLimitConfig?: RateLimitConfig;
    retryConfig?: RetryConfig;
}
/**
 * API call result (generic type)
 */
export interface ApiCallResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    statusCode?: number;
    headers?: Record<string, string>;
}
/**
 * Integration failure pattern
 */
export interface IntegrationFailurePattern {
    id?: string;
    pattern?: string;
    type?: string;
    frequency?: number;
    indicators?: string[];
    confidence?: number;
    severity?: 'low' | 'medium' | 'high';
    lastOccurred?: Date;
}
/**
 * Failure analysis
 */
export interface FailureAnalysis {
    pattern?: IntegrationFailurePattern;
    recoveryActions?: RecoveryAction[];
    suggestedAction?: string;
    rootCause?: string;
}
/**
 * Recovery action
 */
export interface RecoveryAction {
    action: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    estimatedCost?: number;
}
/**
 * Resilience strategy
 */
export interface ResilienceStrategy {
    type: 'retry' | 'fallback' | 'circuit-breaker' | 'bulkhead';
    config?: Record<string, unknown>;
    priority?: number;
}
/**
 * Integration metrics
 */
export interface IntegrationMetrics {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageResponseTime: number;
    lastCallTimestamp?: Date;
}
/**
 * Cross-platform config
 */
export interface CrossPlatformConfig {
    platform: 'windows' | 'macos' | 'linux';
    platformSpecificPaths?: Record<string, string>;
    compatibilityMode?: boolean;
}
/**
 * Plugin integration
 */
export interface PluginIntegration {
    id: string;
    name: string;
    version: string;
    enabled: boolean;
    config?: Record<string, unknown>;
}
/**
 * Breaker config
 */
export interface BreakerConfig {
    threshold: number;
    timeout: number;
    resetTimeout?: number;
}
export {};
//# sourceMappingURL=types.d.ts.map