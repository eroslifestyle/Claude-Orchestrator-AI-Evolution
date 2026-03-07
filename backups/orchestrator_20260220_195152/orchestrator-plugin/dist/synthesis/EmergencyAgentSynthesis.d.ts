/**
 * Emergency Agent Synthesis Engine
 *
 * Dynamically creates working agents when files are missing or corrupted.
 * Ensures ZERO scenario can fail due to missing agent capabilities.
 *
 * KEY INNOVATION: Template-based agent creation that guarantees
 * functional agent generation for ANY task keywords combination.
 *
 * @version 1.0.0 - ZERO FAILURE TOLERANCE
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { TaskContext, SynthesizedAgent, SynthesisResult, EmergencySynthesisConfig } from '../types';
/**
 * Emergency Agent Synthesis Engine - Main Class
 * Coordinates the synthesis of emergency agents
 */
export declare class EmergencyAgentSynthesis extends EventEmitter {
    private readonly logger;
    private readonly keywordAnalyzer;
    private readonly templateGenerator;
    private readonly config;
    private readonly synthesisCache;
    private readonly synthesisHistory;
    constructor(config?: Partial<EmergencySynthesisConfig>);
    /**
     * Main synthesis method - creates agent from task context
     */
    synthesizeAgent(taskContext: TaskContext): Promise<SynthesizedAgent>;
    /**
     * Create synthesized agent from template
     */
    private createSynthesizedAgent;
    /**
     * Create minimal fallback agent
     */
    private createMinimalAgent;
    /**
     * Generate agent file content from template
     */
    private generateAgentContent;
    /**
     * Generate cache key for task context
     */
    private generateCacheKey;
    /**
     * Get synthesis statistics
     */
    getSynthesisStatistics(): {
        totalSyntheses: number;
        successRate: number;
        averageTime: number;
        cacheHitRate: number;
        domainDistribution: Record<string, number>;
        complexityDistribution: Record<string, number>;
    };
    /**
     * Clear synthesis cache
     */
    clearCache(): void;
    /**
     * Get synthesis history
     */
    getSynthesisHistory(): SynthesisResult[];
}
/**
 * Export Emergency Agent Synthesis Engine
 */
export default EmergencyAgentSynthesis;
//# sourceMappingURL=EmergencyAgentSynthesis.d.ts.map