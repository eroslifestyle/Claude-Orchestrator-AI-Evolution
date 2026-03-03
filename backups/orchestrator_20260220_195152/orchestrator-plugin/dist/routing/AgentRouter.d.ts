/**
 * AgentRouter - Intelligent Agent Routing System
 *
 * Implementazione Architect Expert con design pattern modulare per
 * mappatura keyword → agent path con confidence-based selection.
 *
 * @version 1.0 - Fase 2 Implementation
 * @author Architect Expert Agent
 * @date 30 Gennaio 2026
 */
import type { ClassifiedDomain, ExtractedKeyword, ComplexityLevel } from '../analysis/types';
import type { ModelType, PriorityLevel } from '../types';
interface AgentDefinition {
    name: string;
    filePath: string;
    role: string;
    specialization: string;
    keywords: string[];
    defaultModel: ModelType;
    priority: PriorityLevel;
    size_kb: number;
    version: string;
    model_updated?: string;
}
export interface RoutingDecision {
    primaryAgent: AgentDefinition;
    fallbackAgents: AgentDefinition[];
    confidence: number;
    reasoning: string;
    executionStrategy: ExecutionStrategy;
    estimatedCost: number;
    estimatedTimeMinutes: number;
}
interface ExecutionStrategy {
    type: 'sequential' | 'parallel' | 'hybrid';
    batches: AgentBatch[];
    maxConcurrency: number;
    timeoutMinutes: number;
    retryPolicy: RetryPolicy;
    escalationRules: EscalationRule[];
}
interface AgentBatch {
    agents: AgentDefinition[];
    dependencies: string[];
    priority: number;
    parallelizable: boolean;
}
interface RetryPolicy {
    maxRetries: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    initialDelayMs: number;
    maxDelayMs: number;
    retryableErrors: string[];
}
interface EscalationRule {
    trigger: EscalationTrigger;
    action: EscalationAction;
    threshold: number;
    cooldownMinutes: number;
}
type EscalationTrigger = 'failure_count' | 'processing_time' | 'confidence_low' | 'complexity_high';
type EscalationAction = 'upgrade_model' | 'add_specialist' | 'reduce_scope' | 'request_human';
interface FallbackStrategy {
    strategy: 'graceful_degradation' | 'alternative_routing' | 'emergency_mode';
    fallbackAgent: AgentDefinition;
    confidenceThreshold: number;
    maxFallbackDepth: number;
}
interface RoutingMetrics {
    totalRoutings: number;
    successRate: number;
    averageConfidence: number;
    agentUsageStats: Map<string, number>;
    fallbackUsageRate: number;
    escalationRate: number;
}
interface ValidationResult {
    valid: boolean;
    issues: string[];
    recommendations: string[];
}
export declare class AgentRouter {
    private logger;
    private agentRegistry;
    private domainMappings;
    private routingHistory;
    private metrics;
    private fallbackStrategy;
    constructor();
    /**
     * Route keywords to appropriate agents with confidence-based selection
     */
    routeToAgents(domains: ClassifiedDomain[], keywords: ExtractedKeyword[], complexity?: ComplexityLevel): Promise<RoutingDecision>;
    /**
     * Get alternative routing options for a domain
     */
    getAlternativeRouting(domain: ClassifiedDomain): AgentDefinition[];
    /**
     * Validate routing decision before execution
     */
    validateRouting(decision: RoutingDecision): ValidationResult;
    /**
     * Get routing metrics and statistics
     */
    getMetrics(): RoutingMetrics;
    private selectPrimaryAgent;
    private selectFallbackAgents;
    private calculateRoutingConfidence;
    private buildExecutionStrategy;
    private createExecutionBatches;
    private createRetryPolicy;
    private createEscalationRules;
    private calculateAgentScore;
    private calculateAgentMatchScore;
    private generateRoutingReasoning;
    private estimateExecution;
    private createEmergencyRouting;
    private calculateTimeout;
    private initializeAgentRegistry;
    private initializeDomainMappings;
    private initializeFallbackStrategy;
    private initializeMetrics;
    private updateMetrics;
}
export declare function createAgentRouter(): AgentRouter;
export type { ExecutionStrategy, AgentDefinition, FallbackStrategy, RoutingMetrics };
//# sourceMappingURL=AgentRouter.d.ts.map