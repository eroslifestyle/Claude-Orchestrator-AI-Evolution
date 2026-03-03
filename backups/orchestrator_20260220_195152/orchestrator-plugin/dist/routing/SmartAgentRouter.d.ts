/**
 * SmartAgentRouter - Intelligent Agent Routing con Search Intelligence
 *
 * Implementazione Architect Expert con revolutionary search-powered routing
 * per optimal agent selection basata su Serena search insights.
 *
 * @version 2.0 - Serena Intelligence Integration
 * @author Architect Expert Agent (T3)
 * @date 30 Gennaio 2026
 */
import type { ClassifiedDomain, ExtractedKeyword, ComplexityLevel } from '../analysis/types';
import type { ModelType, AgentConfig } from '../types';
import { PluginLogger } from '../utils/logger';
import { SerenaSearchIntegration } from '../integrations/SerenaSearchIntegration';
import { EnhancedKeywordExtractor } from '../analysis/EnhancedKeywordExtractor';
export interface SearchIntelligenceData {
    codebaseComplexity: CodebaseComplexity;
    dependencyAnalysis: DependencyAnalysis;
    performanceProfile: PerformanceProfile;
    agentCapabilityMapping: AgentCapabilityMapping;
    routingOptimization: RoutingOptimization;
}
export interface CodebaseComplexity {
    totalFiles: number;
    codeLines: number;
    languageDistribution: Record<string, number>;
    dependencyDepth: number;
    cyclomaticComplexity: number;
    technicalDebtScore: number;
}
export interface DependencyAnalysis {
    crossFileReferences: number;
    circularDependencies: string[];
    hotspotFiles: string[];
    isolatedModules: string[];
    dependencyStrength: Record<string, number>;
}
export interface PerformanceProfile {
    searchTimeByPattern: Record<string, number>;
    agentResponseTimes: Record<string, number>;
    modelEfficiency: Record<ModelType, number>;
    parallelismOpportunities: number;
    bottleneckPrediction: string[];
}
export interface AgentCapabilityMapping {
    agentSpecializations: Record<string, AgentSpecialization>;
    domainCoverage: Record<string, string[]>;
    complexityHandling: Record<string, ComplexityLevel[]>;
    collaborationPatterns: AgentCollaboration[];
    exclusionRules: AgentExclusion[];
}
interface AgentSpecialization {
    agent: string;
    coreStrengths: string[];
    supportingSkills: string[];
    performanceMetrics: AgentPerformanceMetrics;
    preferredComplexity: ComplexityLevel;
    collaboratesWellWith: string[];
    hasConflictsWith: string[];
}
interface AgentPerformanceMetrics {
    averageTime: number;
    successRate: number;
    qualityScore: number;
    costEfficiency: number;
    userSatisfaction: number;
}
interface AgentCollaboration {
    primaryAgent: string;
    secondaryAgent: string;
    collaborationType: 'sequential' | 'parallel' | 'review';
    successRate: number;
    avgImprovementPercent: number;
    bestUseCases: string[];
}
interface AgentExclusion {
    agent1: string;
    agent2: string;
    conflictType: 'methodology' | 'output_format' | 'dependency';
    severity: 'critical' | 'warning' | 'preference';
    workaround?: string;
}
interface RoutingOptimization {
    fastPathTriggers: string[];
    complexityThresholds: Record<ComplexityLevel, number>;
    loadBalancingRules: LoadBalancingRule[];
    failoverStrategies: FailoverStrategy[];
    adaptiveLearning: AdaptiveLearningData;
}
interface LoadBalancingRule {
    condition: string;
    strategy: 'round_robin' | 'least_loaded' | 'capability_based';
    agentPool: string[];
    weightFactors: Record<string, number>;
}
interface FailoverStrategy {
    triggerCondition: 'agent_failure' | 'timeout' | 'quality_threshold';
    fallbackAgent: string;
    escalationModel?: ModelType;
    preserveContext: boolean;
    maxRetries: number;
}
interface AdaptiveLearningData {
    routingDecisions: SmartRoutingDecision[];
    outcomeCorrelations: OutcomeCorrelation[];
    adaptationRules: AdaptationRule[];
    confidenceThreshold: number;
}
interface OutcomeCorrelation {
    inputPattern: string;
    routingChoice: string;
    outcomeQuality: number;
    frequency: number;
    reliability: number;
}
interface AdaptationRule {
    pattern: string;
    originalRouting: string;
    improvedRouting: string;
    improvementMagnitude: number;
    confidence: number;
    applicableContexts: string[];
}
export interface SmartRoutingDecision {
    selectedAgent: AgentConfig;
    selectedModel: ModelType;
    supportingAgents: AgentConfig[];
    routingStrategy: SmartRoutingStrategy;
    confidence: number;
    reasoning: string;
    alternatives: AlternativeRouting[];
    performancePrediction: PerformancePrediction;
    riskAssessment: RiskAssessment;
}
export interface SmartRoutingStrategy {
    executionType: 'single' | 'parallel' | 'sequential' | 'hybrid';
    dependencyHandling: 'strict' | 'flexible' | 'adaptive';
    failoverEnabled: boolean;
    qualityGates: QualityGate[];
    optimizationHints: string[];
}
export interface AlternativeRouting {
    agent: string;
    model: ModelType;
    confidence: number;
    tradeoffs: string[];
    whenToPrefer: string;
}
export interface PerformancePrediction {
    estimatedTime: number;
    estimatedCost: number;
    qualityExpectation: number;
    successProbability: number;
    bottleneckLikelihood: number;
}
export interface RiskAssessment {
    overallRisk: 'low' | 'medium' | 'high';
    specificRisks: SpecificRisk[];
    mitigationStrategies: string[];
    contingencyPlan: string;
}
export interface SpecificRisk {
    type: 'complexity' | 'dependency' | 'resource' | 'integration' | 'quality';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    probability: number;
    impact: string;
    mitigation: string;
}
export interface QualityGate {
    name: string;
    condition: string;
    threshold: number;
    action: 'continue' | 'retry' | 'escalate' | 'abort';
    escalationTarget?: string;
}
export declare class SmartAgentRouter {
    private logger;
    private serenaIntegration;
    private enhancedExtractor;
    private availableAgents;
    private searchIntelligence;
    private agentRegistry;
    private routingHistory;
    private performanceCache;
    constructor(logger: PluginLogger, serenaIntegration: SerenaSearchIntegration, enhancedExtractor: EnhancedKeywordExtractor, availableAgents: AgentConfig[]);
    /**
     * Revolutionary intelligent routing con Serena search insights
     */
    routeIntelligent(userInput: string, domains: ClassifiedDomain[], keywords: ExtractedKeyword[], complexity: ComplexityLevel): Promise<SmartRoutingDecision>;
    /**
     * Gather comprehensive search intelligence about codebase
     */
    private gatherSearchIntelligence;
    /**
     * Intelligent agent selection based on search insights
     */
    private performIntelligentAgentSelection;
    private analyzeCodebaseComplexity;
    private analyzeDependencies;
    private gatherPerformanceProfile;
    private updateAgentCapabilityMapping;
    private optimizeRoutingStrategies;
    private selectPrimaryAgent;
    private selectSupportingAgents;
    private optimizeModelSelection;
    private generateSmartRoutingStrategy;
    private predictPerformance;
    private assessRisks;
    private findRelevantAgentsForKeyword;
    private getAgentsForPatternType;
    private filterAgentsByComplexity;
    private calculateOverallConfidence;
    private generateRoutingReasoning;
    private generateAlternativeRoutings;
    private learnFromRoutingDecision;
    private cachePerformancePrediction;
    private generateCacheKey;
    private fallbackToTraditionalRouting;
    private initializeSearchIntelligence;
    private initializeIntelligentRouting;
    private analyzeLanguageDistribution;
    private calculateDependencyDepth;
    private estimateCyclomaticComplexity;
    private identifyHotspotFiles;
    private detectCircularDependencies;
    private getHistoricalAgentPerformance;
    private getModelEfficiencyMetrics;
    private predictPerformanceBottlenecks;
    private inferSupportingSkills;
    private getAgentPerformanceMetrics;
    private inferPreferredComplexity;
    private getCollaborationPartners;
    private getConflictingAgents;
    private buildDomainCoverage;
    private buildComplexityHandling;
    private getSuccessfulCollaborations;
    private getExclusionRules;
    private generateLoadBalancingRules;
    private generateFailoverStrategies;
    private getAdaptiveLearningData;
    private generateQualityGates;
    private generateOptimizationHints;
    private getBaseExecutionTime;
    private calculateEstimatedCost;
    private calculateSuccessProbability;
    private calculateOverallRisk;
    getSearchIntelligence(): SearchIntelligenceData;
    getRoutingHistory(): SmartRoutingDecision[];
    clearCache(): void;
}
export declare function createSmartAgentRouter(logger: PluginLogger, serenaIntegration: SerenaSearchIntegration, enhancedExtractor: EnhancedKeywordExtractor, availableAgents: AgentConfig[]): SmartAgentRouter;
export {};
//# sourceMappingURL=SmartAgentRouter.d.ts.map