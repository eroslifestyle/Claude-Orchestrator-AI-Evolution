/**
 * DYNAMIC SUB-TASK SPAWNING SYSTEM V6.0 - AI-POWERED TASK DECOMPOSITION
 *
 * Revolutionary automatic task decomposition that enables 64+ agent coordination
 * through intelligent sub-task generation and recursive spawning with depth control
 *
 * REVOLUTIONARY CAPABILITIES:
 * - AI-powered automatic task decomposition in real-time
 * - Intelligent spawning criteria detection with ML-based analysis
 * - Recursive sub-task generation with smart depth control
 * - Context-aware task complexity assessment
 * - Dynamic spawning rules optimization based on performance
 * - Cost-aware spawning decisions with ROI analysis
 *
 * PERFORMANCE TARGETS:
 * - Task Decomposition: Basic 3 branches → 16+ dynamic branches
 * - Sub-Task Spawning: Manual 2 levels → Automatic N-levels
 * - Spawning Intelligence: Rule-based → AI-driven adaptive
 * - Complexity Handling: Linear → Exponential capability scaling
 * - Cost Optimization: Static → Dynamic ROI-based decisions
 *
 * @author Revolutionary Languages Expert (languages_expert.md)
 * @version 6.0.0-revolutionary
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface SpawnableTask {
    id: string;
    description: string;
    complexity: number;
    domain: string;
    keywords: string[];
    dependencies: string[];
    estimatedEffort: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    contextData: TaskContext;
    spawnHistory: SpawnHistory;
}
export interface TaskContext {
    userRequest: string;
    projectContext: ProjectContext;
    technicalRequirements: TechnicalRequirement[];
    constraintData: ConstraintData;
    similarTasks: SimilarTask[];
    environmentInfo: EnvironmentInfo;
}
export interface ProjectContext {
    codebaseSize: string;
    technologies: string[];
    architecture: string;
    teamSize: number;
    timeline: string;
    budget: number;
}
export interface TechnicalRequirement {
    type: 'performance' | 'security' | 'scalability' | 'maintainability' | 'usability';
    level: 'basic' | 'advanced' | 'expert';
    details: string;
    estimatedComplexity: number;
}
export interface ConstraintData {
    timeConstraints: TimeConstraint[];
    resourceConstraints: ResourceConstraint[];
    qualityConstraints: QualityConstraint[];
    businessConstraints: BusinessConstraint[];
}
export interface TimeConstraint {
    type: 'deadline' | 'milestone' | 'sprint';
    date: Date;
    criticality: number;
    flexibility: number;
}
export interface ResourceConstraint {
    type: 'budget' | 'agents' | 'tokens' | 'memory' | 'cpu';
    limit: number;
    current: number;
    threshold: number;
}
export interface QualityConstraint {
    type: 'test-coverage' | 'performance-score' | 'security-score' | 'maintainability';
    minimum: number;
    target: number;
    weight: number;
}
export interface BusinessConstraint {
    type: 'compliance' | 'policy' | 'stakeholder' | 'market-timing';
    description: string;
    impact: 'low' | 'medium' | 'high';
    flexibility: number;
}
export interface SimilarTask {
    taskDescription: string;
    complexity: number;
    actualSubTasks: SubTaskRecord[];
    performance: HistoricalPerformance;
    lessonLeearned: string[];
}
export interface SubTaskRecord {
    description: string;
    agent: string;
    duration: number;
    cost: number;
    success: boolean;
    qualityScore: number;
}
export interface HistoricalPerformance {
    totalDuration: number;
    totalCost: number;
    successRate: number;
    qualityScore: number;
    agentsUsed: number;
    challengesFaced: string[];
    optimizationOpportunities: string[];
}
export interface EnvironmentInfo {
    availableAgents: number;
    currentLoad: number;
    resourcePressure: number;
    performanceMetrics: PerformanceSnapshot;
    systemHealth: SystemHealth;
}
export interface PerformanceSnapshot {
    averageTaskTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
    resourceUtilization: number;
    costPerTask: number;
}
export interface SystemHealth {
    cpu: number;
    memory: number;
    diskIO: number;
    networkLatency: number;
    errorCount: number;
    alertLevel: 'green' | 'yellow' | 'red';
}
export interface SpawnHistory {
    previousSpawnings: SpawnRecord[];
    learningData: LearningData;
    optimizationHistory: OptimizationRecord[];
}
export interface SpawnRecord {
    timestamp: Date;
    triggerReason: string;
    subTasksGenerated: number;
    decisionFactors: DecisionFactor[];
    outcome: SpawnOutcome;
}
export interface DecisionFactor {
    factor: string;
    weight: number;
    value: number;
    rationale: string;
}
export interface SpawnOutcome {
    success: boolean;
    actualDuration: number;
    actualCost: number;
    actualQuality: number;
    agentsEfficiency: number;
    lessonsLearned: string[];
    recommendedAdjustments: string[];
}
export interface LearningData {
    patterns: Pattern[];
    successFactors: SuccessFactor[];
    failureFactors: FailureFactor[];
    optimizationTips: OptimizationTip[];
}
export interface Pattern {
    patternType: 'complexity' | 'domain' | 'technology' | 'team-size';
    trigger: string;
    action: string;
    successRate: number;
    confidence: number;
}
export interface SuccessFactor {
    factor: string;
    correlation: number;
    contexts: string[];
    evidence: number;
}
export interface FailureFactor {
    factor: string;
    correlation: number;
    preventionStrategy: string;
    earlyWarningSignals: string[];
}
export interface OptimizationTip {
    scenario: string;
    recommendation: string;
    expectedImprovement: number;
    applicability: number;
}
export interface OptimizationRecord {
    timestamp: Date;
    originalApproach: string;
    optimizedApproach: string;
    improvement: number;
    metrics: OptimizationMetric[];
}
export interface OptimizationMetric {
    name: string;
    before: number;
    after: number;
    unit: string;
    improvementPercentage: number;
}
export interface SpawningDecision {
    shouldSpawn: boolean;
    confidence: number;
    recommendedSubTasks: RecommendedSubTask[];
    reasoning: SpawningReasoning;
    costBenefit: CostBenefitAnalysis;
    riskAssessment: RiskAssessment;
    alternativeApproaches: AlternativeApproach[];
}
export interface RecommendedSubTask {
    description: string;
    agent: string;
    model: 'haiku' | 'sonnet' | 'opus';
    estimatedDuration: number;
    estimatedCost: number;
    complexity: number;
    priority: number;
    dependencies: string[];
    successProbability: number;
    qualityExpectation: number;
}
export interface SpawningReasoning {
    primaryFactors: ReasoningFactor[];
    secondaryFactors: ReasoningFactor[];
    assumptions: Assumption[];
    riskMitigation: RiskMitigation[];
    fallbackPlans: FallbackPlan[];
}
export interface ReasoningFactor {
    factor: string;
    weight: number;
    evidence: string[];
    confidence: number;
}
export interface Assumption {
    assumption: string;
    confidence: number;
    impact: 'low' | 'medium' | 'high';
    validation: string;
}
export interface RiskMitigation {
    risk: string;
    probability: number;
    impact: number;
    mitigation: string;
    contingency: string;
}
export interface FallbackPlan {
    scenario: string;
    trigger: string;
    actions: string[];
    estimatedDelay: number;
    estimatedCost: number;
}
export interface CostBenefitAnalysis {
    estimatedCosts: CostBreakdown;
    estimatedBenefits: BenefitBreakdown;
    netValue: number;
    roi: number;
    paybackPeriod: number;
    sensitivityAnalysis: SensitivityAnalysis;
}
export interface CostBreakdown {
    directCosts: DirectCost[];
    indirectCosts: IndirectCost[];
    riskCosts: RiskCost[];
    totalEstimatedCost: number;
}
export interface DirectCost {
    category: 'agents' | 'tokens' | 'compute' | 'monitoring';
    amount: number;
    unit: string;
    rationale: string;
}
export interface IndirectCost {
    category: 'coordination' | 'overhead' | 'learning' | 'validation';
    amount: number;
    unit: string;
    rationale: string;
}
export interface RiskCost {
    risk: string;
    probability: number;
    cost: number;
    expectedValue: number;
}
export interface BenefitBreakdown {
    timeToValue: number;
    qualityImprovement: number;
    scalabilityGain: number;
    learningValue: number;
    reuseValue: number;
    totalEstimatedBenefit: number;
}
export interface SensitivityAnalysis {
    variables: SensitivityVariable[];
    scenarios: SensitivityScenario[];
}
export interface SensitivityVariable {
    name: string;
    baseValue: number;
    variationRange: {
        min: number;
        max: number;
    };
    impactOnROI: number;
}
export interface SensitivityScenario {
    name: 'optimistic' | 'realistic' | 'pessimistic';
    probability: number;
    netValue: number;
    roi: number;
    keyAssumptions: string[];
}
export interface RiskAssessment {
    technicalRisks: TechnicalRisk[];
    resourceRisks: ResourceRisk[];
    timelineRisks: TimelineRisk[];
    qualityRisks: QualityRisk[];
    overallRiskScore: number;
    riskToleranceRecommendation: 'low' | 'medium' | 'high';
}
export interface TechnicalRisk {
    risk: string;
    probability: number;
    impact: number;
    complexity: 'low' | 'medium' | 'high';
    mitigation: string;
    indicators: string[];
}
export interface ResourceRisk {
    resource: 'agents' | 'budget' | 'tokens' | 'time';
    currentUsage: number;
    projectedUsage: number;
    limit: number;
    riskLevel: number;
    contingencyPlan: string;
}
export interface TimelineRisk {
    milestone: string;
    baselineDate: Date;
    riskAdjustedDate: Date;
    delayProbability: number;
    impactOfDelay: number;
    accelerationOptions: string[];
}
export interface QualityRisk {
    qualityAspect: 'correctness' | 'performance' | 'security' | 'usability';
    targetScore: number;
    riskAdjustedScore: number;
    riskFactors: string[];
    qualityAssurancePlan: string;
}
export interface AlternativeApproach {
    name: string;
    description: string;
    tradeoffs: Tradeoff[];
    estimatedOutcome: EstimatedOutcome;
    recommendationScore: number;
}
export interface Tradeoff {
    aspect: 'time' | 'cost' | 'quality' | 'complexity' | 'risk';
    direction: 'better' | 'worse' | 'neutral';
    magnitude: number;
    description: string;
}
export interface EstimatedOutcome {
    duration: number;
    cost: number;
    quality: number;
    successProbability: number;
    confidence: number;
}
export interface ResourceAnalysisResult {
    resourcePressure: number;
    constraints: ResourceConstraint[];
    capacityAvailable: boolean;
    estimatedResourceUsage: {
        budget: number;
        agents: number;
        tokens: number;
        memory: number;
        cpu: number;
    };
    recommendations: ResourceRecommendation[];
}
export interface ResourceRecommendation {
    type: 'info' | 'warning' | 'error';
    message: string;
    suggestion: string;
}
/**
 * Revolutionary Dynamic Sub-Task Spawning System
 * AI-powered automatic task decomposition for 64+ agent coordination
 */
export declare class DynamicSubTaskSpawner extends EventEmitter {
    private config;
    private learningDatabase;
    private performanceHistory;
    private optimizationRules;
    private spawnCounter;
    constructor(config: SpawnerConfig);
    /**
     * REVOLUTIONARY MAIN METHOD: AI-Powered Task Analysis and Spawning
     * Analyzes task complexity and intelligently decides on sub-task generation
     */
    analyzeAndSpawn(task: SpawnableTask): Promise<SpawningDecision>;
    /**
     * STEP 1: Deep Context Analysis
     * Analyzes the rich context surrounding the task for intelligent decision making
     */
    private analyzeTaskContext;
    /**
     * STEP 2: AI-Powered Complexity Assessment
     * Uses machine learning-inspired approach to assess true task complexity
     */
    private assessComplexityIntelligently;
    /**
     * STEP 3: Historical Pattern Recognition
     * Analyzes historical data to identify patterns and optimize decisions
     */
    private analyzeHistoricalPatterns;
    /**
     * STEP 4: Resource and Constraint Analysis
     * Analyzes resource availability and constraints
     */
    private analyzeResourceConstraints;
    /**
     * STEP 7: AI Decision Making
     * Makes intelligent spawning decision based on all analyzed factors
     */
    private makeIntelligentSpawningDecision;
    /**
     * Generate intelligent sub-task recommendations
     */
    private generateRecommendedSubTasks;
    private calculateOptimalSubTaskCount;
    private getDecompositionStrategy;
    private calculateTimePressure;
    private calculateResourcePressure;
    private calculateQualityPressure;
    private determineDecompositionStrategy;
    private calculatePatternApplicability;
    private calculateKeywordOverlap;
    private performCostBenefitAnalysis;
    private assessRisks;
    private generateAlternativeApproaches;
    private createSafetyFallbackDecision;
    private initializeIntelligentSpawning;
    private loadHistoricalData;
    private learnFromDecision;
}
interface SpawnerConfig {
    maxSubTasks: number;
    complexityThreshold: number;
    costThreshold: number;
    riskTolerance: number;
    learningEnabled: boolean;
}
export default DynamicSubTaskSpawner;
//# sourceMappingURL=DynamicSubTaskSpawner.d.ts.map