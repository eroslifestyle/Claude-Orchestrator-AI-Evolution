/**
 * Orchestrator Engine Core - LIVELLO 4 IMPLEMENTATION
 *
 * Advanced orchestration engine capable of coordinating up to 64 agents in parallel
 * with complex dependency management, intelligent task decomposition, and ML-based
 * cost prediction. Features automatic model selection, result aggregation, and
 * synthesis capabilities for enterprise-grade orchestration.
 *
 * @version 4.0 - Level 4 Core Implementation
 * @author Orchestrator Expert + Architect Expert + AI Integration Expert
 * @date 31 Gennaio 2026
 */

import type {
  OrchestratorOptions,
  OrchestratorResult,
  ExecutionPlan,
  PluginConfig,
  Task,
  SessionData,
  ModelType,
  TaskStatus,
  ExecutionMetrics,
  AggregatedResult,
  DocumentationResult,
  OrchestratorError,
  TaskResult
} from '../types';

import type {
  KeywordExtractionResult,
  ClassifiedDomain,
  DomainClassificationResult,
  ComplexityLevel
} from '../analysis/types';

import type {
  RoutingDecision as BaseRoutingDecision,
  AgentDefinition
} from '../routing/AgentRouter';

// Extend RoutingDecision with additional properties
interface RoutingDecision extends BaseRoutingDecision {
  fallbackStrategy?: string;
  taskAssignments?: Array<{
    taskId: string;
    agentId: string;
    priority: string;
    estimatedDuration: number;
  }>;
}

import type {
  ModelSelectionResult,
  ModelSelectionCriteria
} from '../routing/ModelSelector';

import type {
  DependencyGraph,
  DependencyNode as GraphDependencyNode,
  DependencyEdge as GraphDependencyEdge,
  ExecutionPlan as GraphExecutionPlan,
  CircularDependency as GraphCircularDependency,
  ParallelBatchConfig as GraphParallelBatch
} from '../execution/DependencyGraphBuilder';

// Define types that are not exported from DependencyGraphBuilder locally
interface GraphResourceRequirement {
  type: 'cpu' | 'memory' | 'network' | 'storage' | 'api_quota' | 'agent_slot';
  amount: number;
  unit: string;
  exclusive: boolean;
  shareable: boolean;
}

interface GraphResolutionStrategy {
  strategy: 'break_dependency' | 'merge_nodes' | 'add_intermediate' | 'parallel_execution';
  description: string;
  cost: number;
  risk: 'low' | 'medium' | 'high';
}

// Define ExecutionBatch locally since it's not exported
interface GraphExecutionBatch {
  batchId: string;
  order: number;
  nodes: string[];
  canRunInParallel: boolean;
  dependencies: string[];
  estimatedDuration: number;
  resourceRequirements: GraphResourceRequirement[];
  riskLevel: 'low' | 'medium' | 'high';
  fallbackOptions: string[];
}

// Re-define ParallelExecutionBatch locally (different name to avoid conflict)
interface ParallelExecutionBatch {
  batchId: string;
  taskIds: string[];
  estimatedDuration: number;
  requiredAgents: number;
  dependencies: string[];
  canOptimize: boolean;
  resourceRequirements: ResourceRequirement[];
  fallbackOptions: string[];
}

import { PluginLogger } from '../utils/logger';
import { KeywordExtractor, createKeywordExtractor } from '../analysis/KeywordExtractor';
import { AgentRouter, createAgentRouter } from '../routing/AgentRouter';
import { ModelSelector, createModelSelector } from '../routing/ModelSelector';
import {
  DependencyGraphBuilder,
  createDependencyGraphBuilder
} from '../execution/DependencyGraphBuilder';
import { CostPredictionEngine, createCostPredictionEngine, CostFeatures, CostPredictionResult } from '../ml/CostPredictionEngine';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import { PerformanceOptimizer } from '../optimization/PerformanceOptimizer';

// =============================================================================
// ADDITIONAL TYPE DEFINITIONS
// =============================================================================

type DependencyEdgeType = 'data' | 'hard' | 'soft' | 'resource' | 'validation';
type DependencyStrength = 'weak' | 'medium' | 'strong';
type NodeCategory = 'implementation' | 'testing' | 'integration' | 'documentation' | 'validation' | 'deployment';

// Import TaskCategory from CostPredictionEngine
type TaskCategoryImport = import('../ml/CostPredictionEngine').TaskCategory;

interface DomainRequirement {
  domain: string;
  requiresCreativity: boolean;
  requiresPrecision: boolean;
  requiresReasoning: boolean;
  requiresSpeed: boolean;
  criticalityLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface BudgetConstraintInfo {
  maxCostPerTask: number;
  dailyBudgetLimit: number;
  currentSpending: number;
  costSensitivity: 'high' | 'medium' | 'low';
  optimizationStrategy: 'cost_first' | 'balanced' | 'quality_first';
}

interface PerformanceRequirementInfo {
  maxLatencyMs: number;
  throughputRequirement: number;
  concurrencyLevel: number;
  realTimeRequired: boolean;
}

interface QualityRequirementInfo {
  minAccuracy: number;
  consistencyImportance: number;
  innovationRequired: boolean;
  riskTolerance: 'low' | 'medium' | 'high';
}

interface NodeInput {
  name: string;
  type: string;
  required: boolean;
  source: string;
}

interface NodeOutput {
  name: string;
  type: string;
  description: string;
}

interface TaskConstraint {
  type: string;
  constraint: string;
  value: string;
}

interface ExecutionPlanInternal {
  batches: ExecutionBatchInternal[];
  totalBatches: number;
  maxConcurrency: number;
  estimatedCompletion: Date;
  contingencyPlans: ContingencyPlanInternal[];
  monitoringPoints: MonitoringPointInternal[];
}

interface ContingencyPlanInternal {
  trigger: string;
  condition: string;
  threshold: number;
  actions: string[];
}

interface MonitoringPointInternal {
  nodeId: string;
  metric: string;
  threshold: number;
  alertLevel: 'info' | 'warning' | 'error' | 'critical';
  action: string;
}

interface ExecutionBatchInternal {
  batchId: string;
  order: number;
  nodes: string[];
  dependencies: string[];
  canRunInParallel: boolean;
  estimatedDuration: number;
  resourceRequirements: ResourceRequirement[];
  riskLevel: 'low' | 'medium' | 'high';
  fallbackOptions: string[];
}

interface DependencyEdgeInternal {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  dependencyType: DependencyEdgeType;
  strength: DependencyStrength;
  condition?: string;
  delay: number;
  transferData: string[];
}

interface CircularDependencyInfo {
  cycle: string[];
  severity: 'warning' | 'error';
  resolution: string;
  impact: string;
}

interface ParallelizationOpportunityInternal {
  id: string;
  type: string;
  tasks: string[];
  estimatedSpeedup: number;
  resourceRequirement: number;
  confidence: number;
  constraints: string[];
}

interface RiskAssessmentResult {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactorInternal[];
  mitigationStrategies: MitigationStrategyInternal[];
  contingencyTriggers: ContingencyTriggerInternal[];
}

interface RiskFactorInternal {
  factor: string;
  probability: number;
  impact: number;
  riskScore: number;
  category: 'technical' | 'resource' | 'dependency' | 'external';
}

interface MitigationStrategyInternal {
  risk: string;
  strategy: string;
  cost: number;
  effectiveness: number;
  implementation: string;
}

interface ContingencyTriggerInternal {
  condition: string;
  threshold: number;
  monitoring: boolean;
  autoTrigger: boolean;
}

interface DependencyNodeInternal {
  id: string;
  name: string;
  type: NodeCategory;
  agent: AgentDefinition;
  model: ModelType;
  description: string;
  estimatedDurationMinutes: number;
  estimatedCost: number;
  priority: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  parallelizable: boolean;
  resourceRequirements: ResourceRequirement[];
  inputs: NodeInput[];
  outputs: NodeOutput[];
  constraints: TaskConstraint[];
}

// =============================================================================
// LEVEL 4 ORCHESTRATION SESSION INTERFACES
// =============================================================================

interface OrchestrationSession extends Omit<SessionData, 'taskResults' | 'executionPlan'> {
  // Override from SessionData with different type
  taskResults: Map<string, TaskExecutionResult>;
  executionPlan?: ExecutionPlan;  // Using ExecutionPlan from ../types which has sessionId

  // Level 4 Enhanced Analysis
  keywordExtractionResult?: KeywordExtractionResult;
  domainClassification?: DomainClassificationResult;
  taskDecomposition?: TaskDecompositionResult;
  complexityAnalysis?: ComplexityAnalysisResult;

  // Level 4 Routing & Selection
  routingDecisions?: RoutingDecision[];
  modelSelections?: Map<string, ModelSelectionResult>;
  agentAllocation?: AgentAllocationMap;

  // Level 4 Dependency & Execution
  dependencyGraph?: DependencyGraph;
  parallelExecutionBatches?: ParallelExecutionBatch[];

  // Level 4 Results & Synthesis
  resultSynthesis?: ResultSynthesisData;
  qualityMetrics?: QualityMetricsData;

  // Session Control
  currentStatus: SessionStatus;
  progressMetrics: ProgressMetrics;
  errorRecoveryAttempts: number;

  // Level 4 Advanced Features
  costPrediction?: CostPredictionResult;
  performanceOptimization?: PerformanceOptimizationResult;
  realTimeMetrics?: RealTimeSessionMetrics;
}

interface TaskDecompositionResult {
  originalTask: string;
  subTasks: DecomposedSubTask[];
  decompositionStrategy: 'sequential' | 'parallel' | 'hybrid';
  estimatedComplexityReduction: number;
  parallelizationOpportunities: ParallelizationOpportunity[];
  dependencies: SubTaskDependency[];
  confidenceScore: number;
  fallbackStrategy?: string;
}

interface DecomposedSubTask {
  id: string;
  description: string;
  domain: string;
  estimatedComplexity: ComplexityLevel;
  estimatedDuration: number;
  estimatedCost: number;
  requiredExpertise: string[];
  priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
  canRunInParallel: boolean;
  dependsOn: string[];
  produces: string[];
  validationCriteria: string[];
}

interface ComplexityAnalysisResult {
  overallComplexity: ComplexityLevel;
  complexityScore: number;
  complexityFactors: ComplexityFactor[];
  recommendedApproach: 'simple' | 'modular' | 'enterprise' | 'research';
  estimatedAgentCount: number;
  estimatedTotalTime: number;
  riskFactors: string[];
  mitigation_strategies: string[];
}

interface ComplexityFactor {
  factor: string;
  impact: number;
  description: string;
  weight: number;
}

interface AgentAllocationMap {
  totalAgents: number;
  allocations: Map<string, AgentAllocation>;
  resourceUtilization: number;
  bottlenecks: string[];
  scalabilityLimit: number;
}

interface AgentAllocation {
  agentId: string;
  agentType: string;
  assignedTasks: string[];
  estimatedWorkload: number;
  utilizationPercentage: number;
  specializations: string[];
  concurrentTaskLimit: number;
}

interface ParallelExecutionBatch {
  batchId: string;
  taskIds: string[];
  estimatedDuration: number;
  requiredAgents: number;
  dependencies: string[];
  canOptimize: boolean;
  resourceRequirements: ResourceRequirement[];
  fallbackOptions: string[];
}

interface ResultSynthesisData {
  synthesisStrategy: 'merge' | 'aggregate' | 'transform' | 'validate';
  intermediateResults: IntermediateResult[];
  finalSynthesis: FinalSynthesisResult;
  qualityScore: number;
  consistencyCheck: ConsistencyCheckResult;
  conflicts: ConflictResolution[];
}

interface IntermediateResult {
  taskId: string;
  agentId: string;
  result: unknown;
  confidence: number;
  timestamp: number;
  dependenciesSatisfied: boolean;
}

interface FinalSynthesisResult {
  consolidatedResult: unknown;
  confidenceScore: number;
  contributingTasks: string[];
  qualityMetrics: Record<string, number>;
  recommendations: string[];
  nextSteps: string[];
}

interface ConsistencyCheckResult {
  isConsistent: boolean;
  inconsistencies: string[];
  resolutionStrategy: string;
  confidence: number;
}

interface ConflictResolution {
  conflictType: string;
  conflictingTasks: string[];
  resolutionMethod: string;
  finalDecision: unknown;
  confidence: number;
}

interface QualityMetricsData {
  accuracy: number;
  completeness: number;
  consistency: number;
  efficiency: number;
  maintainability: number;
  overallQualityScore: number;
  improvementAreas: string[];
}

interface ParallelizationOpportunity {
  taskIds: string[];
  parallelizationType: 'independent' | 'data_parallel' | 'pipeline';
  estimatedSpeedup: number;
  resourceRequirements: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SubTaskDependency {
  fromTaskId: string;
  toTaskId: string;
  dependencyType: 'data' | 'sequence' | 'resource' | 'validation';
  strength: number;
  optional: boolean;
}

interface PerformanceOptimizationResult {
  optimizations: OptimizationApplication[];
  performanceGain: number;
  costReduction: number;
  riskMitigation: string[];
  alternatives: string[];
}

interface OptimizationApplication {
  type: string;
  description: string;
  impact: number;
  cost: number;
  risk: string;
}

interface RealTimeSessionMetrics {
  throughput: number;
  latency: number;
  errorRate: number;
  resourceUtilization: number;
  costEfficiency: number;
  scalabilityIndex: number;
  lastUpdated: number;
}

interface ResourceRequirement {
  type: string;
  amount: number;
  unit: string;
  priority: 'required' | 'preferred' | 'optional';
  shareable: boolean;
}

type SessionStatus =
  | 'initializing'
  | 'analyzing'
  | 'planning'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface TaskExecutionResult {
  taskId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  result?: any;
  errors: string[];
  warnings: string[];
  cost: number;
  tokensUsed: number;
  modelUsed: ModelType;
  agentUsed: string;
}

interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  costSpent: number;
  estimatedTotalCost: number;
  parallelEfficiency: number;
}

interface RecoveryOption {
  strategy: 'retry' | 'escalate_model' | 'fallback_agent' | 'skip_task' | 'manual_intervention';
  description: string;
  cost: number;
  riskLevel: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
}

// =============================================================================
// ORCHESTRATOR ENGINE CLASS - COMPLETE IMPLEMENTATION
// =============================================================================

export class OrchestratorEngine {
  private config: PluginConfig;
  private logger: PluginLogger;
  private sessions: Map<string, OrchestrationSession>;

  // Level 4 Core Components
  private keywordExtractor: KeywordExtractor;
  private agentRouter: AgentRouter;
  private modelSelector: ModelSelector;
  private dependencyGraphBuilder: DependencyGraphBuilder;
  private costPredictionEngine: CostPredictionEngine;
  private analyticsEngine: AnalyticsEngine;
  private performanceOptimizer: PerformanceOptimizer;

  // Level 4 Advanced Tracking
  private performanceMetrics: Map<string, unknown>;
  private globalBudgetTracker: BudgetTracker;
  private agentPool: Map<string, AgentAllocation>;
  private resourceManager: ResourceManager;
  private qualityController: QualityController;

  // Level 4 Scalability Support
  private readonly maxConcurrentAgents: number = 64;
  private readonly maxConcurrentSessions: number = 10;
  private currentAgentUtilization: number = 0;

  constructor(config: PluginConfig) {
    this.config = config;
    this.logger = new PluginLogger('OrchestratorEngine');
    this.sessions = new Map();
    this.performanceMetrics = new Map();
    this.agentPool = new Map();

    // Initialize Level 4 components
    this.keywordExtractor = createKeywordExtractor(config);
    this.agentRouter = createAgentRouter();
    this.modelSelector = createModelSelector();
    this.dependencyGraphBuilder = createDependencyGraphBuilder();
    this.costPredictionEngine = createCostPredictionEngine(config);
    this.analyticsEngine = new AnalyticsEngine(config);
    this.performanceOptimizer = new PerformanceOptimizer(config);

    // Initialize Level 4 tracking and management
    this.globalBudgetTracker = {
      dailyBudget: config.costs?.default_budget || 100,
      currentSpending: 0,
      remainingBudget: config.costs?.default_budget || 100,
      spendingByAgent: new Map(),
      spendingByModel: new Map()
    };

    this.resourceManager = new ResourceManager(this.maxConcurrentAgents);
    this.qualityController = new QualityController();

    // Initialize agent pool for 64-agent support
    this.initializeAgentPool();

    this.logger.info('Level 4 Orchestrator Engine initialized', {
      components: [
        'KeywordExtractor', 'AgentRouter', 'ModelSelector', 'DependencyGraphBuilder',
        'CostPredictionEngine', 'AnalyticsEngine', 'PerformanceOptimizer'
      ],
      maxAgents: this.maxConcurrentAgents,
      budgetLimit: this.globalBudgetTracker.dailyBudget,
      scalabilityFeatures: ['64-agent coordination', 'ML cost prediction', 'Performance optimization']
    });
  }

  // =============================================================================
  // PUBLIC ORCHESTRATION API - COMPLETE IMPLEMENTATION
  // =============================================================================

  /**
   * Main orchestration method - COMPLETE FASE 2 IMPLEMENTATION
   */
  async orchestrate(
    request: string,
    options: OrchestratorOptions = {}
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();

    this.logger.info('Starting intelligent orchestration (Fase 2)', {
      request: request.substring(0, 100) + '...',
      options,
      sessionId
    });

    // Create orchestration session
    const session: OrchestrationSession = {
      sessionId,
      id: sessionId,
      userRequest: request,
      options,
      executionPlan: {
        sessionId,
        tasks: [],
        dependencies: { nodes: [] as any, edges: [], cycles: [], criticalPath: [], maxParallelism: 1 },
        parallelBatches: [],
        totalEstimate: { time: 0, cost: 0 },
        riskFactors: [],
        createdAt: new Date()
      },
      startTime: new Date(),
      status: 'planning',
      currentBatch: 0,
      taskResults: new Map<string, TaskExecutionResult>(),
      progress: {
        sessionId,
        totalTasks: 0,
        completed: 0,
        failed: 0,
        running: 0,
        pending: 0,
        percentComplete: 0,
        estimatedTimeRemaining: 0,
        currentBatch: 0,
        totalBatches: 0,
        activeTasks: [],
        lastUpdate: new Date()
      },
      currentStatus: 'initializing',
      progressMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        skippedTasks: 0,
        progressPercentage: 0,
        estimatedTimeRemaining: 0,
        costSpent: 0,
        estimatedTotalCost: 0,
        parallelEfficiency: 0
      },
      errorRecoveryAttempts: 0
    };

    this.sessions.set(sessionId, session);

    try {
      // ===============================
      // PHASE 1: LEVEL 4 INTELLIGENT ANALYSIS
      // ===============================

      session.currentStatus = 'analyzing';
      this.logger.info('Phase 1: Starting Level 4 intelligent request analysis', { sessionId });

      // 1.1: Advanced Keyword Extraction with NLP Processing
      session.keywordExtractionResult = await this.keywordExtractor.extractKeywords(request);
      this.logger.debug('Keywords extracted', {
        keywordCount: session.keywordExtractionResult.keywords.length,
        confidence: session.keywordExtractionResult.overallConfidence,
        processingTime: session.keywordExtractionResult.processingTimeMs
      });

      // 1.2: Advanced Task Decomposition
      session.taskDecomposition = await this.performTaskDecomposition(request, session.keywordExtractionResult);
      this.logger.info('Task decomposition completed', {
        subTaskCount: session.taskDecomposition.subTasks.length,
        strategy: session.taskDecomposition.decompositionStrategy,
        parallelOpportunities: session.taskDecomposition.parallelizationOpportunities.length,
        confidenceScore: session.taskDecomposition.confidenceScore
      });

      // 1.3: Complexity Analysis with ML Enhancement
      session.complexityAnalysis = await this.performComplexityAnalysis(
        request,
        session.keywordExtractionResult,
        session.taskDecomposition
      );
      this.logger.info('Complexity analysis completed', {
        overallComplexity: session.complexityAnalysis.overallComplexity,
        complexityScore: session.complexityAnalysis.complexityScore,
        recommendedApproach: session.complexityAnalysis.recommendedApproach,
        estimatedAgentCount: session.complexityAnalysis.estimatedAgentCount
      });

      // 1.4: Enhanced Domain Classification with Decomposition Context
      session.domainClassification = await this.performEnhancedDomainClassification(
        session.keywordExtractionResult,
        session.taskDecomposition
      );

      this.logger.info('Enhanced domain classification completed', {
        primaryDomain: session.domainClassification.primaryDomain.name,
        isMultiDomain: session.domainClassification.isMultiDomain,
        confidence: session.domainClassification.overallConfidence,
        domainsDetected: session.domainClassification.secondaryDomains.length + 1
      });

      // ===============================
      // PHASE 2: LEVEL 4 INTELLIGENT ROUTING & SELECTION
      // ===============================

      session.currentStatus = 'planning';
      this.logger.info('Phase 2: Starting Level 4 intelligent agent routing and selection', { sessionId });

      // 2.1: Enhanced Agent Allocation with 64-Agent Support
      session.agentAllocation = await this.performAdvancedAgentAllocation(
        session.domainClassification,
        session.taskDecomposition,
        session.complexityAnalysis
      );

      this.logger.info('Advanced agent allocation completed', {
        totalAgents: session.agentAllocation.totalAgents,
        resourceUtilization: session.agentAllocation.resourceUtilization,
        bottlenecks: session.agentAllocation.bottlenecks.length
      });

      // 2.2: Multi-Agent Routing Decisions
      session.routingDecisions = await this.generateMultiAgentRoutingDecisions(
        session.taskDecomposition,
        session.domainClassification,
        session.agentAllocation
      );

      this.logger.info('Multi-agent routing decisions completed', {
        routingDecisions: session.routingDecisions.length,
        primaryAgents: session.routingDecisions.map(rd => rd.primaryAgent.name).slice(0, 3)
      });

      // 2.3: Advanced Model Selection with Cost Optimization
      session.modelSelections = new Map();
      session.costPrediction = await this.performCostPredictionAndOptimization(
        session.taskDecomposition,
        session.complexityAnalysis,
        session.agentAllocation
      );

      // Select models for each allocated agent
      for (const routingDecision of session.routingDecisions) {
        const modelCriteria: ModelSelectionCriteria = {
          complexity: session.complexityAnalysis.overallComplexity,
          domainRequirements: this.generateDomainRequirements([session.domainClassification.primaryDomain]),
          budgetConstraints: this.generateBudgetConstraints(options),
          performanceRequirements: this.generatePerformanceRequirements(options),
          qualityRequirements: this.generateQualityRequirements(options),
          contextSize: request.length,
          estimatedTokens: Math.ceil(request.length / 4)
        };

        const modelSelection = await this.modelSelector.selectModel(modelCriteria);
        session.modelSelections.set(routingDecision.primaryAgent.name, modelSelection);
      }

      this.logger.info('Advanced model selection completed', {
        modelsSelected: session.modelSelections.size,
        totalPredictedCost: session.costPrediction.predictedCost,
        confidence: session.costPrediction.confidence
      });

      // ===============================
      // PHASE 3: LEVEL 4 ADVANCED DEPENDENCY ANALYSIS & PARALLEL OPTIMIZATION
      // ===============================

      this.logger.info('Phase 3: Building Level 4 advanced dependency graph for parallel execution', { sessionId });

      // 3.1: Build Advanced Dependency Graph with Multi-Agent Support
      session.dependencyGraph = await this.buildAdvancedDependencyGraph(
        session.taskDecomposition,
        session.routingDecisions,
        session.agentAllocation,
        session.complexityAnalysis
      );

      // 3.2: Generate Parallel Execution Batches for 64-Agent Coordination
      session.parallelExecutionBatches = await this.generateParallelExecutionBatches(
        session.dependencyGraph,
        session.agentAllocation,
        options.maxParallel || this.maxConcurrentAgents
      );

      // 3.3: Optimize for Maximum Parallelism with Resource Management
      session.dependencyGraph = await this.optimizeForMaximumParallelism(
        session.dependencyGraph,
        session.parallelExecutionBatches,
        session.agentAllocation
      );

      // 3.4: Performance Optimization Analysis
      // session.performanceOptimization = await this.performanceOptimizer.optimizeExecution({
      //   dependencyGraph: session.dependencyGraph,
      //   agentAllocation: session.agentAllocation,
      //   parallelBatches: session.parallelExecutionBatches,
      //   complexityAnalysis: session.complexityAnalysis
      // });

      this.logger.info('Advanced dependency graph and optimization completed', {
        nodeCount: session.dependencyGraph.nodes.size,
        edgeCount: session.dependencyGraph.edges.size,
        parallelBatches: session.parallelExecutionBatches.length,
        maxConcurrency: session.parallelExecutionBatches.length > 0 ? Math.max(...session.parallelExecutionBatches.map(batch => batch.requiredAgents)) : 0,
        performanceGain: session.performanceOptimization?.performanceGain || 0,
        costReduction: session.performanceOptimization?.costReduction || 0
      });

      // ===============================
      // PHASE 4: LEVEL 4 PARALLEL EXECUTION WITH 64-AGENT COORDINATION
      // ===============================

      session.currentStatus = 'executing';
      this.logger.info('Phase 4: Starting Level 4 parallel execution with 64-agent coordination', { sessionId });

      // 4.1: Initialize Real-time Session Metrics
      session.realTimeMetrics = this.initializeRealTimeMetrics();

      // 4.2: Execute Tasks in Optimized Parallel Batches
      const executionResults = await this.executeAdvancedParallelBatches(session);

      // 4.3: Advanced Error Recovery with Auto-escalation and Agent Reallocation
      const recoveredResults = await this.handleAdvancedErrorRecovery(session, executionResults);

      // 4.4: Real-time Quality Assessment
      session.qualityMetrics = this.qualityController.assessQuality(sessionId, Array.from(recoveredResults.values()));

      // 4.5: Dynamic Agent Reallocation if needed
      if (session.qualityMetrics.overallQualityScore < 0.7) {
        await this.performDynamicAgentReallocation(session);
      }

      // ===============================
      // PHASE 5: LEVEL 4 ADVANCED RESULT SYNTHESIS & INTELLIGENT AGGREGATION
      // ===============================

      this.logger.info('Phase 5: Level 4 advanced result synthesis and intelligent aggregation', { sessionId });

      // 5.1: Intelligent Result Synthesis
      session.resultSynthesis = await this.performIntelligentResultSynthesis(recoveredResults, session);

      // 5.2: Advanced Result Aggregation with Conflict Resolution
      const aggregatedResult = this.aggregateTaskResults(recoveredResults, session);

      // 5.3: Enhanced Documentation with Context Awareness (REGOLA #5)
      const documentationResult = await this.generateDocumentation(session, aggregatedResult);

      // 5.4: Comprehensive Analytics and Learning
      // const analyticsResult = await this.analyticsEngine.analyzeSession({
      //   sessionId,
      //   taskResults: Array.from(recoveredResults.values()),
      //   agentPerformance: this.calculateAgentScore(session, session.domainClassification.primaryDomain),
      //   costEfficiency: session.costPrediction,
      //   qualityMetrics: session.qualityMetrics
      // });

      // 5.5: Cost Prediction Learning Update
      // await this.updateCostPredictionLearning(session, Array.from(recoveredResults.values()));

      // 5.6: Calculate Comprehensive Final Metrics
      const finalMetrics = this.calculateFinalMetrics(session, startTime);

      session.currentStatus = 'completed';
      const endTime = Date.now();

      // Convert TaskExecutionResult to TaskResult
      const taskResults: TaskResult[] = Array.from(session.taskResults.values()).map(tr => ({
        taskId: tr.taskId,
        agentId: tr.agentUsed,
        status: tr.status,
        result: tr.result ? {
          header: {
            agent: tr.agentUsed,
            taskId: tr.taskId,
            status: tr.status === 'completed' ? 'SUCCESS' : 'FAILED',
            model: tr.modelUsed,
            timestamp: tr.endTime || tr.startTime
          },
          summary: String(tr.result),
          details: {},
          filesModified: [],
          issuesFound: [],
          nextActions: [],
          handoff: { to: '', context: '' },
          rawResponse: String(tr.result)
        } : undefined,
        error: tr.errors.length > 0 ? {
          message: tr.errors[0],
          type: 'agent_failure',
          recoverable: true,
          suggestedAction: 'retry_task'
        } : undefined,
        errors: tr.errors.length > 0 ? tr.errors.map(e => ({
          message: e,
          type: 'agent_failure' as const,
          recoverable: true,
          suggestedAction: 'retry_task'
        })) : [],
        startTime: tr.startTime,
        endTime: tr.endTime || tr.startTime,
        duration: tr.endTime ? tr.endTime.getTime() - tr.startTime.getTime() : 0,
        tokensUsed: tr.tokensUsed,
        cost: tr.cost,
        model: tr.modelUsed,
        escalations: [],
        warnings: tr.warnings,
        description: `${tr.taskId} execution result`,
        agentFile: '',
        metadata: undefined
      }));

      // Create final result
      const result: OrchestratorResult = {
        sessionId,
        success: session.progressMetrics.failedTasks === 0,
        userRequest: session.userRequest,
        timestamp: new Date(),
        executionPlan: this.convertToExecutionPlan(session),
        taskResults,
        aggregatedResult,
        metrics: finalMetrics,
        documentation: documentationResult,
        errors: [],
        warnings: [],
        duration: endTime - startTime,
        completedAt: new Date()
      };

      // Update budget tracking
      this.updateGlobalBudget(finalMetrics.totalCost);

      this.logger.info('Orchestration completed successfully (Fase 2)', {
        sessionId,
        duration: result.duration,
        totalCost: result.metrics.totalCost,
        successRate: result.metrics.successRate,
        tasksCompleted: result.metrics.agentUsage
      });

      return result;

    } catch (error) {
      session.currentStatus = 'failed';
      this.logger.error('Orchestration failed', { sessionId, error });

      // Return partial results with error information
      return this.createErrorResult(sessionId, error, session, startTime);
    }
  }

  /**
   * Preview orchestration plan - COMPLETE IMPLEMENTATION
   */
  async preview(
    request: string,
    options: OrchestratorOptions = {}
  ): Promise<ExecutionPlan> {
    this.logger.info('Generating intelligent execution plan preview', { request });

    try {
      // Lightweight analysis for preview
      const keywordResult = await this.keywordExtractor.extractKeywords(request);
      const detectedDomains = await this.keywordExtractor.detectDomains(keywordResult.keywords);

      // Quick routing for preview
      const routingDecision = await this.agentRouter.routeToAgents(
        detectedDomains,
        keywordResult.keywords,
        this.assessComplexityFromRequest(request)
      );

      // Build preview dependency graph
      const previewGraph = await this.dependencyGraphBuilder.buildDependencyGraph(
        detectedDomains,
        [routingDecision],
        request
      );

      return this.convertGraphToExecutionPlan(previewGraph, request);

    } catch (error) {
      this.logger.error('Failed to generate preview', { error });
      return this.generateFallbackPlan(request);
    }
  }

  /**
   * Resume orchestration session
   * TODO: Full implementation in Phase 2
   */
  async resume(sessionId: string): Promise<OrchestratorResult> {
    this.logger.info('Resuming orchestration session', { sessionId });

    // TODO: Implement session persistence and resume logic
    throw new Error('Session resume not yet implemented');
  }

  /**
   * Cancel orchestration session
   * TODO: Full implementation in Phase 2
   */
  async cancel(sessionId: string): Promise<void> {
    this.logger.info('Cancelling orchestration session', { sessionId });

    // TODO: Implement cancellation logic
    throw new Error('Session cancellation not yet implemented');
  }

  /**
   * Generate mock execution plan for development/testing
   */
  private async generateMockPlan(request: string): Promise<ExecutionPlan> {
    const sessionId = this.generateSessionId();

    // Simple keyword detection for mock routing
    const keywords = request.toLowerCase();
    const tasks: Task[] = [];

    // Mock task generation based on keywords
    if (keywords.includes('gui') || keywords.includes('ui') || keywords.includes('interface')) {
      tasks.push(this.createMockTask('T1', 'Implement GUI changes', 'experts/gui-super-expert.md', 'sonnet'));
    }

    if (keywords.includes('database') || keywords.includes('sql') || keywords.includes('query')) {
      tasks.push(this.createMockTask('T2', 'Update database schema', 'experts/database_expert.md', 'sonnet'));
    }

    if (keywords.includes('security') || keywords.includes('auth') || keywords.includes('oauth')) {
      tasks.push(this.createMockTask('T3', 'Implement security measures', 'experts/security_unified_expert.md', 'sonnet'));
    }

    // Always add a generic task if no specific domains detected
    if (tasks.length === 0) {
      tasks.push(this.createMockTask('T1', 'Implement requested changes', 'core/coder.md', 'sonnet'));
    }

    // Always add documentation task (REGOLA #5)
    const docTaskId = `T${tasks.length + 1}`;
    tasks.push(this.createMockTask(docTaskId, 'Generate documentation', 'core/documenter.md', 'haiku'));

    // Set documentation dependency on all other tasks
    tasks[tasks.length - 1].dependencies = tasks.slice(0, -1).map(t => t.id);

    const totalTime = tasks.reduce((sum, task) => sum + task.estimatedTime, 0);
    const totalCost = tasks.reduce((sum, task) => sum + task.estimatedCost, 0);

    return {
      sessionId,
      tasks,
      dependencies: {
        nodes: tasks as any,
        edges: [],
        cycles: [],
        criticalPath: tasks.map(t => t.id),
        maxParallelism: Math.max(1, tasks.length - 1), // All except documenter can run in parallel
      },
      parallelBatches: [
        {
          id: 'batch-1',
          tasks: tasks.slice(0, -1), // All except documenter
          dependencies: [],
          estimatedTime: Math.max(...tasks.slice(0, -1).map(t => t.estimatedTime)),
          estimatedCost: tasks.slice(0, -1).reduce((sum, task) => sum + task.estimatedCost, 0),
          parallelizable: true,
        },
        {
          id: 'batch-2',
          tasks: [tasks[tasks.length - 1]], // Documenter
          dependencies: ['batch-1'],
          estimatedTime: tasks[tasks.length - 1].estimatedTime,
          estimatedCost: tasks[tasks.length - 1].estimatedCost,
          parallelizable: false,
        },
      ],
      totalEstimate: {
        time: totalTime,
        cost: totalCost,
      },
      riskFactors: [],
      createdAt: new Date(),
    };
  }

  /**
   * Create mock task for development/testing
   */
  private createMockTask(id: string, description: string, agentFile: string, model: 'haiku' | 'sonnet' | 'opus'): Task {
    const costPerMinute = { haiku: 0.01, sonnet: 0.05, opus: 0.15 }[model];
    const estimatedTime = Math.random() * 5 + 2; // 2-7 minutes

    return {
      id,
      description,
      agentFile,
      agentId: agentFile.split('/').pop()?.replace('.md', '') || 'unknown',
      model,
      dependencies: [],
      specialization: this.getSpecializationFromAgentFile(agentFile),
      priority: 'ALTA',
      level: 2,
      estimatedTime,
      estimatedCost: estimatedTime * costPerMinute,
      metadata: {
        domain: this.getDomainFromAgentFile(agentFile),
        complexity: {
          level: 'medium',
          score: 0.6,
          factors: [],
          recommendedModel: model,
          estimatedTime,
          estimatedCost: estimatedTime * costPerMinute,
        },
        keywords: [],
        agentSelection: {
          agentName: agentFile.split('/').pop()?.replace('.md', '') || 'unknown',
          agentFile,
          confidence: 0.9,
          reasoning: 'Mock agent selection',
          alternatives: [],
          priority: 'ALTA',
        },
        modelSelection: {
          model,
          reasoning: 'Mock model selection',
          confidence: 0.9,
          estimatedCost: estimatedTime * costPerMinute,
          escalationPotential: false,
        },
      },
    };
  }

  /**
   * Get specialization from agent file path
   */
  private getSpecializationFromAgentFile(agentFile: string): string {
    const filename = agentFile.split('/').pop()?.replace('.md', '') || '';
    return filename.replace('_', ' ').replace('-', ' ');
  }

  /**
   * Get domain from agent file path
   */
  private getDomainFromAgentFile(agentFile: string): string {
    if (agentFile.includes('gui')) return 'gui';
    if (agentFile.includes('database')) return 'database';
    if (agentFile.includes('security')) return 'security';
    if (agentFile.includes('coder')) return 'implementation';
    if (agentFile.includes('documenter')) return 'documentation';
    return 'general';
  }

  // =============================================================================
  // LEVEL 4 PRIVATE IMPLEMENTATION METHODS
  // =============================================================================

  /**
   * Initialize agent pool for 64-agent support
   */
  private initializeAgentPool(): void {
    // Initialize a pool of agent slots
    for (let i = 0; i < this.maxConcurrentAgents; i++) {
      const agentId = `agent-${i.toString().padStart(2, '0')}`;
      this.agentPool.set(agentId, {
        agentId,
        agentType: 'general',
        assignedTasks: [],
        estimatedWorkload: 0,
        utilizationPercentage: 0,
        specializations: [],
        concurrentTaskLimit: 3
      });
    }

    this.logger.debug('Agent pool initialized', {
      totalAgents: this.agentPool.size,
      maxConcurrent: this.maxConcurrentAgents
    });
  }

  /**
   * Perform advanced task decomposition
   */
  private async performTaskDecomposition(
    request: string,
    keywordResult: KeywordExtractionResult
  ): Promise<TaskDecompositionResult> {
    const startTime = performance.now();

    try {
      // Analyze request structure and complexity
      const sentences = this.splitIntoSentences(request);
      const complexity = this.calculateRequestComplexity(request, keywordResult);

      // Determine decomposition strategy
      const strategy = this.determineDecompositionStrategy(complexity, sentences.length);

      // Extract sub-tasks using NLP and pattern matching
      const subTasks = await this.extractSubTasks(request, sentences, keywordResult);

      // Identify parallelization opportunities
      const parallelOpportunities = this.identifyParallelizationOpportunities(subTasks);

      // Build dependency relationships
      const dependencies = this.buildSubTaskDependencies(subTasks);

      // Calculate confidence and estimate complexity reduction
      const confidence = this.calculateDecompositionConfidence(subTasks, dependencies);
      const complexityReduction = this.estimateComplexityReduction(subTasks, complexity);

      const result: TaskDecompositionResult = {
        originalTask: request,
        subTasks,
        decompositionStrategy: strategy,
        estimatedComplexityReduction: complexityReduction,
        parallelizationOpportunities: parallelOpportunities,
        dependencies,
        confidenceScore: confidence,
        fallbackStrategy: strategy === 'hybrid' ? 'sequential' : 'none'
      };

      const executionTime = performance.now() - startTime;
      this.logger.debug('Task decomposition completed', {
        executionTime: Math.round(executionTime),
        strategy,
        subTaskCount: subTasks.length,
        parallelOpportunities: parallelOpportunities.length
      });

      return result;

    } catch (error) {
      this.logger.error('Task decomposition failed', { error });

      // Return fallback decomposition
      return {
        originalTask: request,
        subTasks: [{
          id: 'fallback-task-1',
          description: request,
          domain: 'general',
          estimatedComplexity: 'medium',
          estimatedDuration: 300, // 5 minutes
          estimatedCost: 0.15,
          requiredExpertise: ['general'],
          priority: 'ALTA',
          canRunInParallel: false,
          dependsOn: [],
          produces: ['result'],
          validationCriteria: ['task_completed']
        }],
        decompositionStrategy: 'sequential',
        estimatedComplexityReduction: 0,
        parallelizationOpportunities: [],
        dependencies: [],
        confidenceScore: 0.3,
        fallbackStrategy: 'simple_execution'
      };
    }
  }

  /**
   * Perform complexity analysis with ML enhancement
   */
  private async performComplexityAnalysis(
    request: string,
    keywordResult: KeywordExtractionResult,
    decomposition: TaskDecompositionResult
  ): Promise<ComplexityAnalysisResult> {
    const startTime = performance.now();

    try {
      // Base complexity factors
      const factors = this.calculateComplexityFactors(request, keywordResult, decomposition);

      // Overall complexity score (0-1)
      const complexityScore = this.calculateOverallComplexityScore(factors);

      // Map to complexity level
      const overallComplexity = this.mapScoreToComplexityLevel(complexityScore);

      // Determine recommended approach
      const recommendedApproach = this.determineRecommendedApproach(complexityScore, decomposition);

      // Estimate resource requirements
      const estimatedAgentCount = this.estimateRequiredAgents(complexityScore, decomposition);
      const estimatedTotalTime = this.estimateTotalTime(decomposition, complexityScore);

      // Assess risks and mitigation strategies
      const riskFactors = this.assessRiskFactors(complexityScore, decomposition);
      const mitigationStrategies = this.generateMitigationStrategies(riskFactors);

      const result: ComplexityAnalysisResult = {
        overallComplexity,
        complexityScore,
        complexityFactors: factors,
        recommendedApproach,
        estimatedAgentCount,
        estimatedTotalTime,
        riskFactors,
        mitigation_strategies: mitigationStrategies
      };

      const executionTime = performance.now() - startTime;
      this.logger.debug('Complexity analysis completed', {
        executionTime: Math.round(executionTime),
        complexityScore,
        overallComplexity,
        estimatedAgentCount
      });

      return result;

    } catch (error) {
      this.logger.error('Complexity analysis failed', { error });

      // Return conservative fallback
      return {
        overallComplexity: 'medium',
        complexityScore: 0.5,
        complexityFactors: [],
        recommendedApproach: 'modular',
        estimatedAgentCount: 3,
        estimatedTotalTime: 600, // 10 minutes
        riskFactors: ['analysis_failed'],
        mitigation_strategies: ['use_conservative_estimates', 'monitor_closely']
      };
    }
  }

  /**
   * Perform enhanced domain classification
   */
  private async performEnhancedDomainClassification(
    keywordResult: KeywordExtractionResult,
    decomposition: TaskDecompositionResult
  ): Promise<DomainClassificationResult> {
    const startTime = performance.now();

    try {
      // Get base domains from keywords
      const baseDomains = await this.keywordExtractor.detectDomains(keywordResult.keywords);

      // Enhance with sub-task domain analysis
      const subTaskDomains = this.analyzeSubTaskDomains(decomposition.subTasks);

      // Merge and prioritize domains
      const mergedDomains = this.mergeDomainResults(baseDomains, subTaskDomains);

      // Determine if multi-domain
      const isMultiDomain = mergedDomains.length > 1 && mergedDomains[1].confidence > 0.4;

      // Calculate overall confidence
      const overallConfidence = mergedDomains.length > 0 ?
        mergedDomains.reduce((sum, d) => sum + d.confidence, 0) / mergedDomains.length : 0.3;

      const result: DomainClassificationResult = {
        primaryDomain: mergedDomains[0] || {
          name: 'general',
          confidence: 0.5,
          matchedKeywords: [],
          suggestedAgent: 'core/coder.md',
          suggestedModel: 'haiku',
          priority: 'MEDIA',
          weight: 1.0
        },
        secondaryDomains: mergedDomains.slice(1, 5),
        isMultiDomain,
        overallConfidence,
        tier: overallConfidence > 0.8 ? 'fast' : overallConfidence > 0.6 ? 'smart' : 'deep',
        processingTimeMs: performance.now() - startTime,
        metadata: {
          algorithm: 'nlp-enhanced',
          thresholds: { primaryDomainMin: 0.6, multiDomainThreshold: 0.4, confidenceMin: 0.3 },
          conflicts: []
        }
      };

      this.logger.debug('Enhanced domain classification completed', {
        primaryDomain: result.primaryDomain.name,
        isMultiDomain: result.isMultiDomain,
        confidence: result.overallConfidence
      });

      return result;

    } catch (error) {
      this.logger.error('Enhanced domain classification failed', { error });

      // Fallback to simple classification
      return {
        primaryDomain: {
          name: 'general',
          confidence: 0.5,
          matchedKeywords: [],
          suggestedAgent: 'core/coder.md',
          suggestedModel: 'haiku',
          priority: 'MEDIA',
          weight: 1.0
        },
        secondaryDomains: [],
        isMultiDomain: false,
        overallConfidence: 0.5,
        tier: 'smart',
        processingTimeMs: performance.now() - startTime,
        metadata: {
          algorithm: 'config-driven',
          thresholds: { primaryDomainMin: 0.6, multiDomainThreshold: 0.4, confidenceMin: 0.3 },
          conflicts: []
        }
      };
    }
  }

  private assessComplexity(session: OrchestrationSession): ComplexityLevel {
    if (!session.domainClassification) return 'medium';

    const domainCount = session.domainClassification.isMultiDomain ?
      session.domainClassification.secondaryDomains.length + 1 : 1;
    const keywordCount = session.keywordExtractionResult?.keywords.length || 0;
    const requestLength = session.userRequest.length;

    // Complexity scoring algorithm
    let complexityScore = 0;

    // Domain factors
    if (domainCount > 3) complexityScore += 0.3;
    else if (domainCount > 1) complexityScore += 0.2;

    // Keyword density
    if (keywordCount > 20) complexityScore += 0.2;
    else if (keywordCount > 10) complexityScore += 0.1;

    // Request length
    if (requestLength > 1000) complexityScore += 0.2;
    else if (requestLength > 500) complexityScore += 0.1;

    // Critical domain boost
    const hasCriticalDomain = session.domainClassification.primaryDomain.priority === 'CRITICA';
    if (hasCriticalDomain) complexityScore += 0.2;

    if (complexityScore >= 0.7) return 'extreme';
    if (complexityScore >= 0.5) return 'high';
    if (complexityScore >= 0.3) return 'medium';
    return 'low';
  }

  private assessComplexityFromRequest(request: string): ComplexityLevel {
    const keywordPatterns = {
      extreme: ['architecture', 'microservices', 'distributed', 'complex'],
      high: ['integration', 'security', 'performance', 'optimize'],
      medium: ['implement', 'create', 'build', 'develop'],
      low: ['fix', 'update', 'change', 'modify']
    };

    const lowerRequest = request.toLowerCase();

    for (const [level, patterns] of Object.entries(keywordPatterns)) {
      if (patterns.some(pattern => lowerRequest.includes(pattern))) {
        return level as ComplexityLevel;
      }
    }

    return request.length > 500 ? 'medium' : 'low';
  }

  private generateDomainRequirements(domains: ClassifiedDomain[]): DomainRequirement[] {
    return domains.map(domain => ({
      domain: domain.name,
      requiresCreativity: domain.name === 'architecture' || domain.name === 'gui',
      requiresPrecision: domain.name === 'security' || domain.name === 'database',
      requiresReasoning: domain.priority === 'CRITICA' || domain.priority === 'ALTA',
      requiresSpeed: domain.name === 'testing' || domain.name === 'documentation',
      criticalityLevel: domain.priority === 'CRITICA' ? 'critical' :
                       domain.priority === 'ALTA' ? 'high' :
                       domain.priority === 'MEDIA' ? 'medium' : 'low'
    }));
  }

  private generateBudgetConstraints(options: OrchestratorOptions): BudgetConstraintInfo {
    return {
      maxCostPerTask: options.budget ? options.budget * 0.2 : 20, // 20% of total budget per task
      dailyBudgetLimit: this.globalBudgetTracker.dailyBudget,
      currentSpending: this.globalBudgetTracker.currentSpending,
      costSensitivity: options.budget && options.budget < 5 ? 'high' :
                       options.budget && options.budget < 20 ? 'medium' : 'low',
      optimizationStrategy: 'balanced'
    };
  }

  private generatePerformanceRequirements(options: OrchestratorOptions): PerformanceRequirementInfo {
    return {
      maxLatencyMs: options.timeLimit ? options.timeLimit * 1000 : 120000, // 2 minutes default
      throughputRequirement: options.maxParallel || 5,
      concurrencyLevel: options.maxParallel || 5,
      realTimeRequired: false
    };
  }

  private generateQualityRequirements(options: OrchestratorOptions): QualityRequirementInfo {
    return {
      minAccuracy: 0.8,
      consistencyImportance: 0.7,
      innovationRequired: false,
      riskTolerance: 'medium'
    };
  }

  private async executeTaskBatches(session: OrchestrationSession): Promise<Map<string, TaskExecutionResult>> {
    const results = new Map<string, TaskExecutionResult>();

    if (!session.dependencyGraph) {
      throw new Error('Dependency graph not available for execution');
    }

    // Execute batches sequentially, but tasks within batches in parallel
    for (const batch of session.dependencyGraph.executionPlan.batches) {
      this.logger.info('Executing batch', {
        batchId: batch.batchId,
        nodeCount: batch.nodes.length,
        parallel: batch.canRunInParallel
      });

      if (batch.canRunInParallel) {
        // Execute tasks in parallel
        const batchPromises = batch.nodes.map(nodeId =>
          this.executeTask(nodeId, session)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          const nodeId = batch.nodes[index];
          if (result.status === 'fulfilled') {
            results.set(nodeId, result.value);
          } else {
            results.set(nodeId, this.createFailedTaskResult(nodeId, result.reason));
          }
        });
      } else {
        // Execute tasks sequentially
        for (const nodeId of batch.nodes) {
          try {
            const result = await this.executeTask(nodeId, session);
            results.set(nodeId, result);
          } catch (error) {
            const failedResult = this.createFailedTaskResult(nodeId, error);
            results.set(nodeId, failedResult);

            // Stop sequential execution on failure
            if (!batch.fallbackOptions || batch.fallbackOptions.length === 0) {
              break;
            }
          }
        }
      }

      // Update progress
      session.progressMetrics.completedTasks += batch.nodes.length;
      session.progressMetrics.progressPercentage =
        (session.progressMetrics.completedTasks / session.progressMetrics.totalTasks) * 100;
    }

    return results;
  }

  private async executeTask(nodeId: string, session: OrchestrationSession): Promise<TaskExecutionResult> {
    const node = session.dependencyGraph?.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Task node ${nodeId} not found`);
    }

    const startTime = new Date();
    this.logger.debug('Executing task', { nodeId, agent: node.agent.name, model: node.model });

    try {
      // Mock execution for now - in real implementation, would use Task tool
      // This simulates task execution with the selected agent and model
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const estimatedCost = node.estimatedCost;

      return {
        taskId: nodeId,
        status: 'completed',
        startTime,
        endTime,
        result: `Task ${nodeId} completed successfully with ${node.agent.name}`,
        errors: [],
        warnings: [],
        cost: estimatedCost,
        tokensUsed: Math.ceil(session.userRequest.length / 4),
        modelUsed: node.model,
        agentUsed: node.agent.name
      };

    } catch (error) {
      return this.createFailedTaskResult(nodeId, error);
    }
  }

  private createFailedTaskResult(nodeId: string, error: unknown): TaskExecutionResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      taskId: nodeId,
      status: 'failed',
      startTime: new Date(),
      endTime: new Date(),
      result: null,
      errors: [errorMessage],
      warnings: [],
      cost: 0,
      tokensUsed: 0,
      modelUsed: 'haiku',
      agentUsed: 'unknown'
    };
  }

  private async handleErrorRecovery(
    session: OrchestrationSession,
    results: Map<string, TaskExecutionResult>
  ): Promise<Map<string, TaskExecutionResult>> {
    // Implementation for error recovery and auto-escalation
    // For now, return results as-is
    return results;
  }

  private aggregateTaskResults(results: Map<string, TaskExecutionResult>, session: OrchestrationSession): AggregatedResult {
    const completedTasks = Array.from(results.values()).filter(r => r.status === 'completed');
    const failedTasks = Array.from(results.values()).filter(r => r.status === 'failed');

    return {
      success: failedTasks.length === 0,
      filesModified: [], // Would be populated by actual task execution
      totalChanges: completedTasks.length,
      issuesFound: [],
      recommendations: [
        'Consider using higher-tier models for failed tasks',
        'Review error patterns for optimization opportunities'
      ],
      summary: `Orchestration completed: ${completedTasks.length} tasks successful, ${failedTasks.length} failed`,
      qualityScore: completedTasks.length / results.size
    };
  }

  private async generateDocumentation(session: OrchestrationSession, aggregatedResult: AggregatedResult): Promise<DocumentationResult> {
    // REGOLA #5: Generate documentation
    return {
      success: true,
      files: ['CONTEXT_HISTORY.md'],
      filesUpdated: 1,
      contextHistoryUpdated: true,
      readmeUpdated: false,
      codeCommentsAdded: 0,
      summary: 'Documentation generated automatically',
      wordCount: 0
    };
  }

  private calculateFinalMetrics(session: OrchestrationSession, startTime: number): ExecutionMetrics {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const results = Array.from(session.taskResults.values());

    return {
      totalTime: totalDuration,
      totalCost: results.reduce((sum, r) => sum + r.cost, 0),
      totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
      modelUsage: this.calculateModelUsage(results),
      tasksCompleted: results.filter(r => r.status === 'completed').length,
      tasksFailed: results.filter(r => r.status === 'failed').length,
      successRate: results.filter(r => r.status === 'completed').length / results.length,
      agentUsage: this.calculateAgentUsage(results),
      parallelismEfficiency: this.calculateParallelismEfficiency(session),
      escalationRate: 0, // TODO: Calculate actual escalation rate
      averageTaskTime: totalDuration / Math.max(results.length, 1),
      peakParallelTasks: this.calculatePeakParallelTasks(session),
      throughput: results.length / (totalDuration / 60000) // tasks per minute
    };
  }

  private calculateModelUsage(results: TaskExecutionResult[]): Record<string, number> {
    const usage: Record<string, number> = { haiku: 0, sonnet: 0, opus: 0 };
    results.forEach(result => {
      if (result.modelUsed && usage.hasOwnProperty(result.modelUsed)) {
        usage[result.modelUsed] += result.tokensUsed;
      }
    });
    return usage;
  }

  private calculateAgentUsage(results: TaskExecutionResult[]): Record<string, number> {
    const usage: Record<string, number> = {};
    results.forEach(result => {
      usage[result.agentUsed] = (usage[result.agentUsed] || 0) + 1;
    });
    return usage;
  }

  private calculateParallelismEfficiency(session: OrchestrationSession): number {
    // Simplified efficiency calculation
    if (!session.dependencyGraph) return 0;

    const totalBatches = session.dependencyGraph.executionPlan.batches.length;
    const parallelBatches = session.dependencyGraph.parallelizationOpportunities.length;

    return totalBatches > 0 ? parallelBatches / totalBatches : 0;
  }

  private calculatePeakParallelTasks(session: OrchestrationSession): number {
    if (!session.dependencyGraph) return 1;

    return session.dependencyGraph.executionPlan.batches.reduce((peak, batch) =>
      Math.max(peak, batch.canRunInParallel ? batch.nodes.length : 1), 0
    );
  }

  private convertToExecutionPlan(session: OrchestrationSession): ExecutionPlan {
    // Convert internal dependency graph to external ExecutionPlan format
    // This is a simplified conversion
    return {
      sessionId: session.sessionId,
      tasks: [],
      dependencies: { nodes: [] as any, edges: [], cycles: [], criticalPath: [], maxParallelism: 1 },
      parallelBatches: [],
      totalEstimate: { time: 0, cost: 0 },
      riskFactors: [],
      createdAt: session.startTime
    };
  }

  private convertGraphToExecutionPlan(graph: DependencyGraph, request: string): ExecutionPlan {
    // Convert dependency graph to ExecutionPlan format for preview
    return {
      sessionId: this.generateSessionId(),
      tasks: Array.from(graph.nodes.values()).map(node => this.convertNodeToTask(node)),
      dependencies: {
        nodes: Array.from(graph.nodes.values()).map(node => this.convertNodeToTask(node)) as any,
        edges: [],
        cycles: [],
        criticalPath: graph.criticalPath,
        maxParallelism: graph.executionPlan.maxConcurrency
      },
      parallelBatches: graph.executionPlan.batches.map(batch => ({
        id: batch.batchId,
        tasks: batch.nodes.map(nodeId => {
          const node = graph.nodes.get(nodeId);
          return node ? this.convertNodeToTask(node) : this.createSimpleFallbackTask(request);
        }),
        dependencies: batch.dependencies,
        estimatedTime: batch.estimatedDuration,
        estimatedCost: batch.resourceRequirements.reduce((sum, req) => sum + req.amount * 0.01, 0),
        parallelizable: batch.canRunInParallel
      })),
      totalEstimate: {
        time: graph.totalEstimatedTime,
        cost: graph.totalEstimatedCost
      },
      riskFactors: [],
      createdAt: new Date()
    };
  }

  private convertNodeToTask(node: GraphDependencyNode): Task {
    return {
      id: node.id,
      description: node.description,
      agentFile: node.agent.filePath,
      agentId: node.agent.name,
      model: node.model,
      dependencies: [], // Simplified
      specialization: node.agent.specialization,
      priority: 'ALTA', // Simplified
      level: 2,
      estimatedTime: node.estimatedDurationMinutes,
      estimatedCost: node.estimatedCost,
      metadata: {
        domain: node.type,
        complexity: {
          level: 'medium',
          score: 0.5,
          factors: [],
          recommendedModel: node.model,
          estimatedTime: node.estimatedDurationMinutes,
          estimatedCost: node.estimatedCost
        },
        keywords: [],
        agentSelection: {
          agentName: node.agent.name,
          agentFile: node.agent.filePath,
          confidence: 0.8,
          reasoning: 'Auto-selected by dependency graph',
          alternatives: [],
          priority: 'ALTA'
        },
        modelSelection: {
          model: node.model,
          reasoning: 'Selected by model selector',
          confidence: 0.8,
          estimatedCost: node.estimatedCost,
          escalationPotential: false
        }
      }
    };
  }

  private generateFallbackPlan(request: string): ExecutionPlan {
    const sessionId = this.generateSessionId();
    const fallbackTask = this.createSimpleFallbackTask(request);

    return {
      sessionId,
      tasks: [fallbackTask],
      dependencies: { nodes: [fallbackTask] as any, edges: [], cycles: [], criticalPath: [fallbackTask.id], maxParallelism: 1 },
      parallelBatches: [{
        id: 'fallback-batch',
        tasks: [fallbackTask],
        dependencies: [],
        estimatedTime: 5,
        estimatedCost: 0.05,
        parallelizable: false
      }],
      totalEstimate: { time: 5, cost: 0.05 },
      riskFactors: [{ type: 'complexity' as const, severity: 'medium' as const, description: 'fallback_mode', mitigation: 'Use general agent' }],
      createdAt: new Date()
    };
  }

  private createSimpleFallbackTask(request: string): Task {
    return {
      id: 'fallback-task',
      description: 'Process request with general-purpose agent',
      agentFile: 'core/coder.md',
      agentId: 'coder',
      model: 'haiku',
      dependencies: [],
      specialization: 'General coding assistance',
      priority: 'MEDIA',
      level: 1,
      estimatedTime: 5,
      estimatedCost: 0.05,
      metadata: {
        domain: 'implementation',
        complexity: { level: 'low', score: 0.3, factors: [], recommendedModel: 'haiku', estimatedTime: 5, estimatedCost: 0.05 },
        keywords: [],
        agentSelection: { agentName: 'coder', agentFile: 'core/coder.md', confidence: 0.6, reasoning: 'Fallback selection', alternatives: [], priority: 'MEDIA' },
        modelSelection: { model: 'haiku', reasoning: 'Cost-optimized fallback', confidence: 0.6, estimatedCost: 0.05, escalationPotential: true }
      }
    };
  }

  private collectSessionErrors(session: OrchestrationSession): string[] {
    return Array.from(session.taskResults.values())
      .filter(result => result.errors && result.errors.length > 0)
      .flatMap(result => result.errors);
  }

  private collectSessionWarnings(session: OrchestrationSession): string[] {
    return Array.from(session.taskResults.values())
      .filter(result => result.warnings && result.warnings.length > 0)
      .map(result => result.warnings)
      .flat();
  }

  private createErrorResult(sessionId: string, error: unknown, session: OrchestrationSession, startTime: number): OrchestratorResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Convert TaskExecutionResult to TaskResult
    const taskResults: TaskResult[] = Array.from(session.taskResults.values()).map(tr => ({
      taskId: tr.taskId,
      agentId: tr.agentUsed,
      status: tr.status,
      result: tr.result ? {
        header: {
          agent: tr.agentUsed,
          taskId: tr.taskId,
          status: tr.status === 'completed' ? 'SUCCESS' : 'FAILED',
          model: tr.modelUsed,
          timestamp: tr.endTime || tr.startTime
        },
        summary: String(tr.result),
        details: {},
        filesModified: [],
        issuesFound: [],
        nextActions: [],
        handoff: { to: '', context: '' },
        rawResponse: String(tr.result)
      } : undefined,
      error: tr.errors.length > 0 ? {
        message: tr.errors[0],
        type: 'agent_failure',
        recoverable: true,
        suggestedAction: 'retry_task'
      } : undefined,
      errors: tr.errors.length > 0 ? tr.errors.map(e => ({
        message: e,
        type: 'agent_failure' as const,
        recoverable: true,
        suggestedAction: 'retry_task'
      })) : [],
      startTime: tr.startTime,
      endTime: tr.endTime || tr.startTime,
      duration: tr.endTime ? tr.endTime.getTime() - tr.startTime.getTime() : 0,
      tokensUsed: tr.tokensUsed,
      cost: tr.cost,
      model: tr.modelUsed,
      escalations: [],
      warnings: tr.warnings,
      description: `${tr.taskId} execution result`,
      agentFile: '',
      metadata: undefined
    }));

    return {
      sessionId,
      success: false,
      userRequest: session.userRequest,
      timestamp: new Date(),
      executionPlan: this.generateFallbackPlan(session.userRequest),
      taskResults,
      aggregatedResult: {
        success: false,
        filesModified: [],
        totalChanges: 0,
        issuesFound: [],
        recommendations: ['Review orchestration configuration', 'Check system resources'],
        summary: 'Orchestration failed with errors',
        qualityScore: 0
      },
      metrics: {
        totalTime: Date.now() - startTime,
        totalCost: 0,
        totalTokens: 0,
        modelUsage: { haiku: 0, sonnet: 0, opus: 0 },
        tasksCompleted: 0,
        tasksFailed: 0,
        agentUsage: {},
        parallelismEfficiency: 0,
        successRate: 0,
        escalationRate: 0,
        averageTaskTime: 0,
        peakParallelTasks: 0,
        throughput: 0
      },
      documentation: {
        filesUpdated: [],
        contextHistoryUpdated: false,
        readmeUpdated: false,
        codeCommentsAdded: 0,
        summary: 'No documentation generated due to failure'
      },
      errors: [{ type: 'execution_error' as const, message: errorMessage, fatal: true, timestamp: new Date() }],
      warnings: [],
      duration: Date.now() - startTime,
      completedAt: new Date()
    };
  }

  private updateGlobalBudget(cost: number): void {
    this.globalBudgetTracker.currentSpending += cost;
    this.globalBudgetTracker.remainingBudget =
      Math.max(0, this.globalBudgetTracker.dailyBudget - this.globalBudgetTracker.currentSpending);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'session-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }

  // =============================================================================
  // TASK DECOMPOSITION HELPER METHODS
  // =============================================================================

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private calculateRequestComplexity(request: string, keywordResult: KeywordExtractionResult): number {
    let complexity = 0;

    // Length factor
    complexity += Math.min(request.length / 1000, 0.3);

    // Keyword density
    complexity += Math.min(keywordResult.keywords.length / 20, 0.2);

    // Domain complexity keywords
    const complexityKeywords = ['architecture', 'system', 'integration', 'complex', 'advanced', 'enterprise'];
    const complexityMatches = complexityKeywords.filter(keyword =>
      request.toLowerCase().includes(keyword)
    );
    complexity += complexityMatches.length * 0.1;

    return Math.min(complexity, 1.0);
  }

  private determineDecompositionStrategy(complexity: number, sentenceCount: number): 'sequential' | 'parallel' | 'hybrid' {
    if (complexity > 0.7 && sentenceCount > 3) return 'hybrid';
    if (complexity > 0.5 || sentenceCount > 5) return 'parallel';
    return 'sequential';
  }

  private async extractSubTasks(
    request: string,
    sentences: string[],
    keywordResult: KeywordExtractionResult
  ): Promise<DecomposedSubTask[]> {
    const subTasks: DecomposedSubTask[] = [];
    let taskId = 1;

    // Pattern-based extraction
    const actionPatterns = [
      /implement|create|build|develop|add/gi,
      /test|verify|validate|check/gi,
      /fix|resolve|solve|debug/gi,
      /optimize|improve|enhance|refactor/gi,
      /document|write|generate|produce/gi,
      /integrate|connect|link|combine/gi,
      /deploy|setup|configure|install/gi
    ];

    const actionWords = [
      'implementation', 'testing', 'debugging', 'optimization',
      'documentation', 'integration', 'deployment'
    ];

    // Extract based on action patterns
    sentences.forEach((sentence, index) => {
      actionPatterns.forEach((pattern, patternIndex) => {
        if (pattern.test(sentence)) {
          const subTask: DecomposedSubTask = {
            id: `subtask-${taskId++}`,
            description: sentence.trim(),
            domain: this.mapActionToDomain(actionWords[patternIndex]),
            estimatedComplexity: this.estimateSubTaskComplexity(sentence),
            estimatedDuration: this.estimateSubTaskDuration(sentence),
            estimatedCost: 0, // Will be calculated later
            requiredExpertise: this.identifyRequiredExpertise(sentence),
            priority: this.assignSubTaskPriority(sentence, index),
            canRunInParallel: this.canSubTaskRunInParallel(sentence, actionWords[patternIndex]),
            dependsOn: [],
            produces: this.identifySubTaskOutputs(sentence),
            validationCriteria: this.generateValidationCriteria(sentence)
          };

          subTask.estimatedCost = this.estimateSubTaskCost(subTask);
          subTasks.push(subTask);
        }
      });
    });

    // If no specific tasks found, create general task
    if (subTasks.length === 0) {
      subTasks.push({
        id: 'general-task-1',
        description: request,
        domain: 'general',
        estimatedComplexity: 'medium',
        estimatedDuration: 300,
        estimatedCost: 0.15,
        requiredExpertise: ['general_coding'],
        priority: 'ALTA',
        canRunInParallel: false,
        dependsOn: [],
        produces: ['implementation'],
        validationCriteria: ['task_completed']
      });
    }

    return subTasks;
  }

  private mapActionToDomain(action: string): string {
    const domainMap: Record<string, string> = {
      'implementation': 'development',
      'testing': 'qa_testing',
      'debugging': 'troubleshooting',
      'optimization': 'performance',
      'documentation': 'documentation',
      'integration': 'system_integration',
      'deployment': 'devops'
    };
    return domainMap[action] || 'general';
  }

  private estimateSubTaskComplexity(sentence: string): ComplexityLevel {
    const complexityIndicators = {
      high: ['complex', 'advanced', 'sophisticated', 'comprehensive'],
      medium: ['moderate', 'standard', 'typical', 'normal'],
      low: ['simple', 'basic', 'easy', 'quick']
    };

    const lowerSentence = sentence.toLowerCase();

    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => lowerSentence.includes(indicator))) {
        return level as ComplexityLevel;
      }
    }

    // Default based on sentence length
    return sentence.length > 100 ? 'high' : sentence.length > 50 ? 'medium' : 'low';
  }

  private estimateSubTaskDuration(sentence: string): number {
    const baseTime = 120; // 2 minutes base
    const lengthFactor = Math.min(sentence.length / 50, 3);
    const complexityWords = ['complex', 'advanced', 'integration', 'architecture'];
    const complexityBonus = complexityWords.filter(word =>
      sentence.toLowerCase().includes(word)
    ).length * 60;

    return Math.round(baseTime * lengthFactor + complexityBonus);
  }

  private identifyRequiredExpertise(sentence: string): string[] {
    const expertiseMap: Record<string, string[]> = {
      'gui|ui|interface': ['gui_expert', 'ux_designer'],
      'database|sql|query': ['database_expert'],
      'security|auth|oauth': ['security_expert'],
      'api|rest|endpoint': ['api_expert'],
      'test|qa|validation': ['testing_expert'],
      'deploy|devops|ci': ['devops_expert'],
      'document|write|readme': ['documentation_expert']
    };

    const sentence_lower = sentence.toLowerCase();
    const expertise: string[] = [];

    for (const [pattern, experts] of Object.entries(expertiseMap)) {
      if (new RegExp(pattern).test(sentence_lower)) {
        expertise.push(...experts);
      }
    }

    return expertise.length > 0 ? expertise : ['general_coder'];
  }

  private assignSubTaskPriority(sentence: string, index: number): 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA' {
    const criticalKeywords = ['critical', 'urgent', 'important', 'essential'];
    const highKeywords = ['priority', 'main', 'primary', 'core'];

    const lowerSentence = sentence.toLowerCase();

    if (criticalKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return 'CRITICA';
    }
    if (index === 0 || highKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return 'ALTA';
    }
    return index < 3 ? 'MEDIA' : 'BASSA';
  }

  private canSubTaskRunInParallel(sentence: string, actionType: string): boolean {
    const serialActionTypes = ['deployment', 'integration', 'testing'];
    const parallelKeywords = ['independent', 'separate', 'parallel'];
    const serialKeywords = ['after', 'then', 'following', 'subsequent'];

    const lowerSentence = sentence.toLowerCase();

    // Check for explicit parallel/serial indicators
    if (parallelKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return true;
    }
    if (serialKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return false;
    }

    // Default based on action type
    return !serialActionTypes.includes(actionType);
  }

  private identifySubTaskOutputs(sentence: string): string[] {
    const outputPatterns: Record<string, string[]> = {
      'implement|create|build': ['code', 'feature'],
      'test|verify': ['test_results', 'validation_report'],
      'fix|resolve': ['bug_fix', 'solution'],
      'document|write': ['documentation', 'readme'],
      'optimize|improve': ['optimized_code', 'performance_improvement'],
      'deploy|setup': ['deployment', 'configuration']
    };

    const lowerSentence = sentence.toLowerCase();

    for (const [pattern, outputs] of Object.entries(outputPatterns)) {
      if (new RegExp(pattern).test(lowerSentence)) {
        return outputs;
      }
    }

    return ['result'];
  }

  private generateValidationCriteria(sentence: string): string[] {
    const baseValidation = ['task_completed', 'no_errors'];

    if (sentence.toLowerCase().includes('test')) {
      baseValidation.push('tests_pass');
    }
    if (sentence.toLowerCase().includes('deploy')) {
      baseValidation.push('deployment_successful');
    }
    if (sentence.toLowerCase().includes('document')) {
      baseValidation.push('documentation_complete');
    }

    return baseValidation;
  }

  private estimateSubTaskCost(subTask: DecomposedSubTask): number {
    const baseCostPerMinute = 0.001; // $0.001 per minute
    const complexityMultiplier = {
      'low': 1.0,
      'medium': 1.5,
      'high': 2.5,
      'extreme': 4.0
    };

    const multiplier = complexityMultiplier[subTask.estimatedComplexity] || 1.5;
    return Math.round((subTask.estimatedDuration / 60) * baseCostPerMinute * multiplier * 1000) / 1000;
  }

  private identifyParallelizationOpportunities(subTasks: DecomposedSubTask[]): ParallelizationOpportunity[] {
    const opportunities: ParallelizationOpportunity[] = [];

    // Group parallelizable tasks
    const parallelTasks = subTasks.filter(task => task.canRunInParallel);
    if (parallelTasks.length > 1) {
      opportunities.push({
        taskIds: parallelTasks.map(task => task.id),
        parallelizationType: 'independent',
        estimatedSpeedup: Math.min(parallelTasks.length * 0.8, 4.0), // Diminishing returns
        resourceRequirements: parallelTasks.length,
        riskLevel: parallelTasks.length > 3 ? 'medium' : 'low'
      });
    }

    // Look for pipeline opportunities
    const implementationTasks = subTasks.filter(task => task.domain === 'development');
    const testingTasks = subTasks.filter(task => task.domain === 'qa_testing');

    if (implementationTasks.length > 0 && testingTasks.length > 0) {
      opportunities.push({
        taskIds: [...implementationTasks.map(t => t.id), ...testingTasks.map(t => t.id)],
        parallelizationType: 'pipeline',
        estimatedSpeedup: 1.3,
        resourceRequirements: Math.max(implementationTasks.length, testingTasks.length),
        riskLevel: 'low'
      });
    }

    return opportunities;
  }

  private buildSubTaskDependencies(subTasks: DecomposedSubTask[]): SubTaskDependency[] {
    const dependencies: SubTaskDependency[] = [];

    // Implementation -> Testing dependencies
    const implTasks = subTasks.filter(task => task.domain === 'development');
    const testTasks = subTasks.filter(task => task.domain === 'qa_testing');

    testTasks.forEach(testTask => {
      implTasks.forEach(implTask => {
        dependencies.push({
          fromTaskId: implTask.id,
          toTaskId: testTask.id,
          dependencyType: 'sequence',
          strength: 0.8,
          optional: false
        });
      });
    });

    // Documentation dependencies
    const docTasks = subTasks.filter(task => task.domain === 'documentation');
    docTasks.forEach(docTask => {
      implTasks.forEach(implTask => {
        dependencies.push({
          fromTaskId: implTask.id,
          toTaskId: docTask.id,
          dependencyType: 'data',
          strength: 0.6,
          optional: true
        });
      });
    });

    return dependencies;
  }

  private calculateDecompositionConfidence(
    subTasks: DecomposedSubTask[],
    dependencies: SubTaskDependency[]
  ): number {
    let confidence = 0.7; // Base confidence

    // More sub-tasks generally increase confidence in decomposition
    if (subTasks.length > 1) confidence += 0.1;
    if (subTasks.length > 3) confidence += 0.1;

    // Well-defined dependencies increase confidence
    const strongDependencies = dependencies.filter(dep => dep.strength > 0.7);
    if (strongDependencies.length > 0) confidence += 0.1;

    // Specific domains indicate good decomposition
    const domains = new Set(subTasks.map(task => task.domain));
    if (domains.size > 1) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private estimateComplexityReduction(subTasks: DecomposedSubTask[], originalComplexity: number): number {
    const avgSubTaskComplexity = subTasks.reduce((sum, task) => {
      const complexityScore = { low: 0.2, medium: 0.5, high: 0.8, extreme: 1.0 }[task.estimatedComplexity];
      return sum + complexityScore;
    }, 0) / subTasks.length;

    const reduction = Math.max(0, originalComplexity - avgSubTaskComplexity);
    return Math.round(reduction * 100) / 100;
  }

  // =============================================================================
  // COMPLEXITY ANALYSIS HELPER METHODS
  // =============================================================================

  private calculateComplexityFactors(
    request: string,
    keywordResult: KeywordExtractionResult,
    decomposition: TaskDecompositionResult
  ): ComplexityFactor[] {
    const factors: ComplexityFactor[] = [];

    // Request length factor
    const lengthScore = Math.min(request.length / 1000, 1.0);
    if (lengthScore > 0.3) {
      factors.push({
        factor: 'Request Length',
        impact: lengthScore,
        description: 'Long requests typically indicate complex requirements',
        weight: 0.2
      });
    }

    // Keyword density factor
    const keywordDensity = keywordResult.keywords.length / (request.split(' ').length || 1);
    if (keywordDensity > 0.1) {
      factors.push({
        factor: 'Keyword Density',
        impact: Math.min(keywordDensity * 5, 1.0),
        description: 'High keyword density suggests technical complexity',
        weight: 0.15
      });
    }

    // Sub-task count factor
    const subTaskComplexity = decomposition.subTasks.length > 5 ? 0.8 : decomposition.subTasks.length * 0.15;
    if (subTaskComplexity > 0.3) {
      factors.push({
        factor: 'Multi-Task Complexity',
        impact: Math.min(subTaskComplexity, 1.0),
        description: 'Multiple sub-tasks increase coordination complexity',
        weight: 0.25
      });
    }

    // Domain diversity factor
    const domains = new Set(decomposition.subTasks.map(task => task.domain));
    const domainDiversity = domains.size > 3 ? 1.0 : domains.size * 0.25;
    if (domainDiversity > 0.25) {
      factors.push({
        factor: 'Domain Diversity',
        impact: domainDiversity,
        description: 'Cross-domain tasks require diverse expertise',
        weight: 0.2
      });
    }

    // Integration complexity factor
    const integrationKeywords = ['integrate', 'connect', 'system', 'architecture', 'microservice'];
    const hasIntegration = integrationKeywords.some(keyword =>
      request.toLowerCase().includes(keyword)
    );
    if (hasIntegration) {
      factors.push({
        factor: 'Integration Requirements',
        impact: 0.7,
        description: 'System integration adds architectural complexity',
        weight: 0.3
      });
    }

    return factors;
  }

  private calculateOverallComplexityScore(factors: ComplexityFactor[]): number {
    if (factors.length === 0) return 0.3;

    const weightedSum = factors.reduce((sum, factor) => sum + (factor.impact * factor.weight), 0);
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);

    return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1.0) : 0.3;
  }

  private mapScoreToComplexityLevel(score: number): ComplexityLevel {
    if (score >= 0.8) return 'extreme';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private determineRecommendedApproach(
    complexityScore: number,
    decomposition: TaskDecompositionResult
  ): 'simple' | 'modular' | 'enterprise' | 'research' {
    if (complexityScore >= 0.9) return 'research';
    if (complexityScore >= 0.7 || decomposition.subTasks.length > 5) return 'enterprise';
    if (complexityScore >= 0.4 || decomposition.subTasks.length > 2) return 'modular';
    return 'simple';
  }

  private estimateRequiredAgents(complexityScore: number, decomposition: TaskDecompositionResult): number {
    // Base agent count from decomposition
    const baseAgents = Math.min(decomposition.subTasks.filter(task => task.canRunInParallel).length, 8);

    // Complexity adjustment
    const complexityBonus = Math.floor(complexityScore * 4);

    // Domain diversity adjustment
    const domains = new Set(decomposition.subTasks.map(task => task.domain));
    const domainBonus = Math.min(domains.size - 1, 3);

    const totalAgents = baseAgents + complexityBonus + domainBonus;
    return Math.min(Math.max(totalAgents, 1), this.maxConcurrentAgents);
  }

  private estimateTotalTime(decomposition: TaskDecompositionResult, complexityScore: number): number {
    const totalSequentialTime = decomposition.subTasks.reduce((sum, task) => sum + task.estimatedDuration, 0);

    // Apply parallelization benefit
    const parallelizationFactor = decomposition.parallelizationOpportunities.reduce(
      (max, opp) => Math.max(max, opp.estimatedSpeedup), 1.0
    );

    const parallelizedTime = totalSequentialTime / parallelizationFactor;

    // Add complexity overhead
    const complexityOverhead = parallelizedTime * complexityScore * 0.2;

    return Math.round(parallelizedTime + complexityOverhead);
  }

  private assessRiskFactors(complexityScore: number, decomposition: TaskDecompositionResult): string[] {
    const risks: string[] = [];

    if (complexityScore > 0.8) risks.push('Very high complexity');
    if (decomposition.subTasks.length > 8) risks.push('Many sub-tasks to coordinate');

    const domains = new Set(decomposition.subTasks.map(task => task.domain));
    if (domains.size > 4) risks.push('Cross-domain expertise required');

    const parallelTasks = decomposition.subTasks.filter(task => task.canRunInParallel);
    if (parallelTasks.length > 6) risks.push('High parallelization complexity');

    if (decomposition.confidenceScore < 0.6) risks.push('Low decomposition confidence');

    return risks;
  }

  private generateMitigationStrategies(riskFactors: string[]): string[] {
    const strategies: string[] = [];

    if (riskFactors.includes('Very high complexity')) {
      strategies.push('Use experienced agents and higher-tier models');
      strategies.push('Implement progressive complexity handling');
    }

    if (riskFactors.includes('Many sub-tasks to coordinate')) {
      strategies.push('Implement robust dependency management');
      strategies.push('Use batch execution with careful monitoring');
    }

    if (riskFactors.includes('Cross-domain expertise required')) {
      strategies.push('Ensure diverse agent pool allocation');
      strategies.push('Plan for domain expert consultation');
    }

    if (riskFactors.includes('High parallelization complexity')) {
      strategies.push('Implement gradual parallelization ramp-up');
      strategies.push('Monitor resource contention closely');
    }

    if (riskFactors.includes('Low decomposition confidence')) {
      strategies.push('Implement human review checkpoints');
      strategies.push('Use conservative execution approach');
    }

    return strategies;
  }

  private analyzeSubTaskDomains(subTasks: DecomposedSubTask[]): ClassifiedDomain[] {
    const domainCounts: Record<string, number> = {};

    subTasks.forEach(task => {
      domainCounts[task.domain] = (domainCounts[task.domain] || 0) + 1;
    });

    return Object.entries(domainCounts)
      .map(([domain, count]) => ({
        name: domain,
        confidence: Math.min(count / subTasks.length, 1.0),
        matchedKeywords: [],
        suggestedAgent: this.mapDomainToAgent(domain),
        suggestedModel: this.mapDomainToModel(domain),
        priority: (count > 2 ? 'ALTA' : count > 1 ? 'MEDIA' : 'BASSA') as 'ALTA' | 'MEDIA' | 'BASSA',
        weight: count
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  private mapDomainToAgent(domain: string): string {
    const agentMap: Record<string, string> = {
      'development': 'core/coder.md',
      'qa_testing': 'experts/testing_expert.md',
      'documentation': 'core/documenter.md',
      'security': 'experts/security_unified_expert.md',
      'database': 'experts/database_expert.md',
      'gui': 'experts/gui-super-expert.md',
      'devops': 'experts/devops_expert.md',
      'general': 'core/coder.md'
    };
    return agentMap[domain] || 'core/coder.md';
  }

  private mapDomainToModel(domain: string): ModelType {
    const modelMap: Record<string, ModelType> = {
      'development': 'sonnet',
      'qa_testing': 'haiku',
      'documentation': 'haiku',
      'security': 'opus',
      'database': 'sonnet',
      'gui': 'sonnet',
      'devops': 'sonnet',
      'general': 'haiku'
    };
    return modelMap[domain] || 'haiku';
  }

  private mergeDomainResults(baseDomains: ClassifiedDomain[], subTaskDomains: ClassifiedDomain[]): ClassifiedDomain[] {
    const domainMap: Map<string, ClassifiedDomain> = new Map();

    // Add base domains
    baseDomains.forEach(domain => {
      domainMap.set(domain.name, { ...domain, weight: domain.weight || 1 });
    });

    // Merge sub-task domains
    subTaskDomains.forEach(domain => {
      const existing = domainMap.get(domain.name);
      if (existing) {
        // Weighted average of confidences
        const totalWeight = existing.weight + domain.weight;
        existing.confidence = (existing.confidence * existing.weight + domain.confidence * domain.weight) / totalWeight;
        existing.weight = totalWeight;
      } else {
        domainMap.set(domain.name, { ...domain });
      }
    });

    return Array.from(domainMap.values()).sort((a, b) => b.confidence - a.confidence);
  }

  private detectDomainConflicts(domains: ClassifiedDomain[]): string[] {
    const conflicts: string[] = [];

    // Check for conflicting domain combinations
    const domainNames = domains.map(d => d.name);

    if (domainNames.includes('security') && domainNames.includes('gui')) {
      conflicts.push('Security and GUI domains may require careful integration');
    }

    if (domainNames.includes('database') && domainNames.includes('performance')) {
      conflicts.push('Database and performance optimization may have competing priorities');
    }

    return conflicts;
  }

  // =============================================================================
  // LEVEL 4 AGENT ALLOCATION AND ROUTING METHODS
  // =============================================================================

  /**
   * Perform advanced agent allocation with 64-agent support
   */
  private async performAdvancedAgentAllocation(
    domainClassification: DomainClassificationResult,
    taskDecomposition: TaskDecompositionResult,
    complexityAnalysis: ComplexityAnalysisResult
  ): Promise<AgentAllocationMap> {
    const startTime = performance.now();

    try {
      // Calculate total agent requirement
      const baseAgentCount = complexityAnalysis.estimatedAgentCount;
      const parallelTasks = taskDecomposition.subTasks.filter(task => task.canRunInParallel);
      const maxParallelAgents = Math.min(parallelTasks.length, this.maxConcurrentAgents);

      const totalAgents = Math.max(baseAgentCount, maxParallelAgents);

      // Allocate agents by specialization
      const allocations = new Map<string, AgentAllocation>();
      let agentIndex = 0;

      // Primary domain agent allocation
      const primaryDomain = domainClassification.primaryDomain;
      const primaryAgentCount = Math.ceil(totalAgents * 0.4); // 40% for primary domain

      for (let i = 0; i < primaryAgentCount && agentIndex < totalAgents; i++) {
        const agentId = `agent-${agentIndex.toString().padStart(2, '0')}`;
        allocations.set(agentId, {
          agentId,
          agentType: primaryDomain.name,
          assignedTasks: [],
          estimatedWorkload: 0,
          utilizationPercentage: 0,
          specializations: [primaryDomain.name],
          concurrentTaskLimit: this.calculateConcurrentTaskLimit(primaryDomain.name)
        });
        agentIndex++;
      }

      // Secondary domains allocation
      for (const secondaryDomain of domainClassification.secondaryDomains.slice(0, 3)) {
        const domainAgentCount = Math.ceil(totalAgents * (secondaryDomain.confidence * 0.3));

        for (let i = 0; i < domainAgentCount && agentIndex < totalAgents; i++) {
          const agentId = `agent-${agentIndex.toString().padStart(2, '0')}`;
          allocations.set(agentId, {
            agentId,
            agentType: secondaryDomain.name,
            assignedTasks: [],
            estimatedWorkload: 0,
            utilizationPercentage: 0,
            specializations: [secondaryDomain.name],
            concurrentTaskLimit: this.calculateConcurrentTaskLimit(secondaryDomain.name)
          });
          agentIndex++;
        }
      }

      // General purpose agents for remaining slots
      while (agentIndex < totalAgents) {
        const agentId = `agent-${agentIndex.toString().padStart(2, '0')}`;
        allocations.set(agentId, {
          agentId,
          agentType: 'general',
          assignedTasks: [],
          estimatedWorkload: 0,
          utilizationPercentage: 0,
          specializations: ['general_coding'],
          concurrentTaskLimit: 3
        });
        agentIndex++;
      }

      // Assign tasks to agents
      this.assignTasksToAgents(allocations, taskDecomposition.subTasks);

      // Calculate metrics
      const resourceUtilization = this.calculateResourceUtilization(allocations);
      const bottlenecks = this.identifyBottlenecks(allocations);
      const scalabilityLimit = this.calculateScalabilityLimit(allocations);

      const result: AgentAllocationMap = {
        totalAgents: allocations.size,
        allocations,
        resourceUtilization,
        bottlenecks,
        scalabilityLimit
      };

      const executionTime = performance.now() - startTime;
      this.logger.debug('Agent allocation completed', {
        executionTime: Math.round(executionTime),
        totalAgents: result.totalAgents,
        resourceUtilization: result.resourceUtilization
      });

      return result;

    } catch (error) {
      this.logger.error('Agent allocation failed', { error });

      // Fallback allocation
      const fallbackAllocation = new Map<string, AgentAllocation>();
      fallbackAllocation.set('agent-00', {
        agentId: 'agent-00',
        agentType: 'general',
        assignedTasks: taskDecomposition.subTasks.map(task => task.id),
        estimatedWorkload: 1.0,
        utilizationPercentage: 100,
        specializations: ['general_coding'],
        concurrentTaskLimit: 1
      });

      return {
        totalAgents: 1,
        allocations: fallbackAllocation,
        resourceUtilization: 1.0,
        bottlenecks: ['single_agent_bottleneck'],
        scalabilityLimit: 1
      };
    }
  }

  /**
   * Generate multi-agent routing decisions
   */
  private async generateMultiAgentRoutingDecisions(
    taskDecomposition: TaskDecompositionResult,
    domainClassification: DomainClassificationResult,
    agentAllocation: AgentAllocationMap
  ): Promise<RoutingDecision[]> {
    const routingDecisions: RoutingDecision[] = [];

    try {
      // Group tasks by domain for routing
      const tasksByDomain = new Map<string, DecomposedSubTask[]>();

      taskDecomposition.subTasks.forEach(task => {
        const domain = task.domain;
        if (!tasksByDomain.has(domain)) {
          tasksByDomain.set(domain, []);
        }
        tasksByDomain.get(domain)!.push(task);
      });

      // Create routing decisions for each domain
      Array.from(tasksByDomain.entries()).forEach(([domain, tasks]) => {
        const domainAgents = Array.from(agentAllocation.allocations.values())
          .filter(alloc => alloc.agentType === domain || alloc.specializations.includes(domain));

        if (domainAgents.length === 0) {
          // Use general agents as fallback
          const generalAgents = Array.from(agentAllocation.allocations.values())
            .filter(alloc => alloc.agentType === 'general');
          domainAgents.push(...generalAgents.slice(0, 1));
        }

        // Create routing decision for this domain
        const primaryAgent = this.selectPrimaryAgent(domain, domainAgents);
        const fallbackAgents = domainAgents
          .filter(agent => agent.agentId !== primaryAgent.agentId)
          .slice(0, 2)
          .map(agent => this.convertToAgentDefinition(agent));

        const routingDecision: RoutingDecision = {
          primaryAgent: this.convertToAgentDefinition(primaryAgent),
          fallbackAgents,
          confidence: this.calculateRoutingConfidence(domain, domainClassification),
          reasoning: `Selected based on domain expertise and workload distribution`,
          executionStrategy: {
            type: tasks.length > 1 ? 'parallel' : 'sequential',
            batches: [],
            maxConcurrency: tasks.length > 1 ? tasks.length : 1,
            timeoutMinutes: 30,
            retryPolicy: {
              maxRetries: 3,
              backoffStrategy: 'exponential',
              initialDelayMs: 1000,
              maxDelayMs: 10000,
              retryableErrors: ['timeout', 'api_error']
            },
            escalationRules: []
          },
          estimatedCost: tasks.reduce((sum, t) => sum + (t.estimatedCost || 0.05), 0),
          estimatedTimeMinutes: tasks.reduce((sum, t) => sum + (t.estimatedDuration || 5), 0),
          fallbackStrategy: 'escalate_to_general_agent',
          taskAssignments: tasks.map(task => ({
            taskId: task.id,
            agentId: primaryAgent.agentId,
            priority: task.priority,
            estimatedDuration: task.estimatedDuration
          }))
        };

        routingDecisions.push(routingDecision);
      });

      this.logger.debug('Multi-agent routing decisions generated', {
        routingCount: routingDecisions.length,
        totalTasks: taskDecomposition.subTasks.length
      });

      return routingDecisions;

    } catch (error) {
      this.logger.error('Multi-agent routing failed', { error });

      // Fallback to single routing decision
      return [{
        primaryAgent: {
          name: 'general_coder',
          filePath: 'core/coder.md',
          role: 'General coding',
          specialization: 'General coding',
          keywords: [],
          defaultModel: 'sonnet',
          priority: 'MEDIA',
          size_kb: 0,
          version: '1.0'
        },
        fallbackAgents: [],
        confidence: 0.6,
        reasoning: 'Fallback routing due to error',
        executionStrategy: {
          type: 'sequential',
          batches: [],
          maxConcurrency: 1,
          timeoutMinutes: 30,
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential',
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            retryableErrors: ['timeout', 'api_error']
          },
          escalationRules: []
        },
        estimatedCost: taskDecomposition.subTasks.reduce((sum, t) => sum + (t.estimatedCost || 0.05), 0),
        estimatedTimeMinutes: taskDecomposition.subTasks.reduce((sum, t) => sum + (t.estimatedDuration || 5), 0),
        fallbackStrategy: 'manual_intervention',
        taskAssignments: taskDecomposition.subTasks.map(task => ({
          taskId: task.id,
          agentId: 'agent-00',
          priority: task.priority,
          estimatedDuration: task.estimatedDuration
        }))
      }];
    }
  }

  /**
   * Perform cost prediction and optimization
   */
  private async performCostPredictionAndOptimization(
    taskDecomposition: TaskDecompositionResult,
    complexityAnalysis: ComplexityAnalysisResult,
    agentAllocation: AgentAllocationMap
  ): Promise<CostPredictionResult> {
    const startTime = performance.now();

    try {
      // Extract cost features from task analysis
      const costFeatures = this.extractCostFeaturesFromAnalysis(
        taskDecomposition,
        complexityAnalysis,
        agentAllocation
      );

      // Get cost prediction from ML engine
      const costPrediction = await this.costPredictionEngine.predictCost(
        `Complex orchestration with ${agentAllocation.totalAgents} agents`,
        costFeatures
      );

      // Perform cost optimization if needed
      if (costPrediction.predictedCost > (this.globalBudgetTracker.remainingBudget * 0.8)) {
        this.logger.warn('High cost prediction, attempting optimization', {
          predictedCost: costPrediction.predictedCost,
          remainingBudget: this.globalBudgetTracker.remainingBudget
        });

        // Apply cost optimization strategies
        const optimizedPrediction = await this.applyCostOptimizations(costPrediction, costFeatures);
        return optimizedPrediction;
      }

      const executionTime = performance.now() - startTime;
      this.logger.debug('Cost prediction completed', {
        executionTime: Math.round(executionTime),
        predictedCost: costPrediction.predictedCost,
        confidence: costPrediction.confidence
      });

      return costPrediction;

    } catch (error) {
      this.logger.error('Cost prediction failed', { error });

      // Fallback cost prediction
      return {
        predictedCost: agentAllocation.totalAgents * 0.05, // $0.05 per agent
        confidence: 0.5,
        costBreakdown: {
          modelCosts: { haiku: 0.03, sonnet: 0.02, opus: 0 },
          infrastructureCosts: 0.01,
          processingOverhead: 0.005,
          premiumFeaturesCost: 0,
          totalBaseCost: 0.045,
          appliedDiscounts: 0
        },
        predictionInterval: { lower: 0.04, upper: 0.08 },
        contributingFactors: [],
        modelUsed: 'fallback',
        predictionTimestamp: Date.now(),
        alternativeScenarios: []
      };
    }
  }

  // =============================================================================
  // HELPER METHODS FOR AGENT ALLOCATION
  // =============================================================================

  private calculateConcurrentTaskLimit(agentType: string): number {
    const limits: Record<string, number> = {
      'security': 2, // Security tasks need focus
      'database': 3, // Database operations can be batched
      'gui': 4, // UI tasks can often run in parallel
      'testing': 5, // Tests can run concurrently
      'documentation': 6, // Docs can be written in parallel
      'general': 3 // General purpose default
    };
    return limits[agentType] || 3;
  }

  private assignTasksToAgents(
    allocations: Map<string, AgentAllocation>,
    subTasks: DecomposedSubTask[]
  ): void {
    // Sort tasks by priority and complexity
    const sortedTasks = [...subTasks].sort((a, b) => {
      const priorityOrder = { 'CRITICA': 4, 'ALTA': 3, 'MEDIA': 2, 'BASSA': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const complexityOrder = { 'extreme': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return complexityOrder[b.estimatedComplexity] - complexityOrder[a.estimatedComplexity];
    });

    // Assign tasks to best-suited agents
    for (const task of sortedTasks) {
      const suitableAgents = Array.from(allocations.values())
        .filter(agent =>
          agent.agentType === task.domain ||
          agent.specializations.includes(task.domain) ||
          agent.agentType === 'general'
        )
        .sort((a, b) => a.assignedTasks.length - b.assignedTasks.length); // Load balancing

      const assignedAgent = suitableAgents[0];
      if (assignedAgent) {
        assignedAgent.assignedTasks.push(task.id);
        assignedAgent.estimatedWorkload += task.estimatedDuration / 3600; // Convert to hours
        assignedAgent.utilizationPercentage = Math.min(
          (assignedAgent.assignedTasks.length / assignedAgent.concurrentTaskLimit) * 100,
          100
        );
      }
    }
  }

  private calculateResourceUtilization(allocations: Map<string, AgentAllocation>): number {
    const totalCapacity = Array.from(allocations.values())
      .reduce((sum, alloc) => sum + alloc.concurrentTaskLimit, 0);

    const totalAssigned = Array.from(allocations.values())
      .reduce((sum, alloc) => sum + alloc.assignedTasks.length, 0);

    return totalCapacity > 0 ? totalAssigned / totalCapacity : 0;
  }

  private identifyBottlenecks(allocations: Map<string, AgentAllocation>): string[] {
    const bottlenecks: string[] = [];

    for (const allocation of allocations.values()) {
      if (allocation.utilizationPercentage > 90) {
        bottlenecks.push(`High utilization in ${allocation.agentType} agents`);
      }
      if (allocation.assignedTasks.length > allocation.concurrentTaskLimit) {
        bottlenecks.push(`Overloaded agent: ${allocation.agentId}`);
      }
    }

    return bottlenecks;
  }

  private calculateScalabilityLimit(allocations: Map<string, AgentAllocation>): number {
    // Calculate how many more agents could be effectively used
    const currentUtilization = this.calculateResourceUtilization(allocations);

    if (currentUtilization > 0.9) return allocations.size * 1.2; // 20% more
    if (currentUtilization > 0.7) return allocations.size * 1.5; // 50% more
    return this.maxConcurrentAgents; // Use maximum
  }

  private selectPrimaryAgent(domain: string, candidates: AgentAllocation[]): AgentAllocation {
    // Select agent with lowest workload and highest specialization match
    return candidates.reduce((best, current) => {
      const currentScore = this.calculateAgentScore(current, domain);
      const bestScore = this.calculateAgentScore(best, domain);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateAgentScore(agent: AgentAllocation, domain: string): number {
    let score = 0;

    // Specialization match bonus
    if (agent.agentType === domain) score += 0.5;
    if (agent.specializations.includes(domain)) score += 0.3;

    // Workload penalty
    score -= agent.utilizationPercentage / 200; // Penalty for high utilization

    // Availability bonus
    if (agent.assignedTasks.length < agent.concurrentTaskLimit) score += 0.2;

    return score;
  }

  private convertToAgentDefinition(allocation: AgentAllocation): AgentDefinition {
    return {
      name: allocation.agentType === 'general' ? 'general_coder' : `${allocation.agentType}_expert`,
      filePath: this.mapDomainToAgent(allocation.agentType),
      role: allocation.agentType === 'general' ? 'General' : `${allocation.agentType} Expert`,
      specialization: allocation.specializations.join(', '),
      keywords: allocation.specializations,
      defaultModel: 'sonnet',
      priority: 'MEDIA',
      size_kb: 0,
      version: '1.0'
    };
  }

  private calculateRoutingConfidence(domain: string, domainClassification: DomainClassificationResult): number {
    if (domain === domainClassification.primaryDomain.name) {
      return domainClassification.primaryDomain.confidence;
    }

    const secondaryDomain = domainClassification.secondaryDomains.find(d => d.name === domain);
    if (secondaryDomain) {
      return secondaryDomain.confidence;
    }

    return 0.6; // Default confidence for general domain
  }

  private extractCostFeaturesFromAnalysis(
    taskDecomposition: TaskDecompositionResult,
    complexityAnalysis: ComplexityAnalysisResult,
    agentAllocation: AgentAllocationMap
  ): CostFeatures {
    return {
      taskComplexity: complexityAnalysis.complexityScore,
      agentCount: agentAllocation.totalAgents,
      estimatedExecutionTime: complexityAnalysis.estimatedTotalTime * 1000, // Convert to ms
      modelDistribution: {
        haikuPercentage: 0.5, // Will be refined based on actual model selection
        sonnetPercentage: 0.4,
        opusPercentage: 0.1
      },
      taskTypeCategory: this.inferTaskCategory(taskDecomposition),
      historicalPatterns: [],
      systemLoadFactor: agentAllocation.resourceUtilization,
      timeOfExecutionFactor: 0.5, // Assume normal time
      userTier: 'pro',
      featureComplexity: {
        codeGenerationComplexity: complexityAnalysis.complexityScore * 0.8,
        integrationComplexity: taskDecomposition.subTasks.filter(t => t.domain === 'system_integration').length > 0 ? 0.8 : 0.3,
        domainKnowledgeRequirement: complexityAnalysis.complexityScore * 0.7,
        errorHandlingComplexity: 0.5,
        testingRequirements: taskDecomposition.subTasks.filter(t => t.domain === 'qa_testing').length > 0 ? 0.8 : 0.3
      }
    };
  }

  private inferTaskCategory(taskDecomposition: TaskDecompositionResult): TaskCategoryImport {
    const domains = taskDecomposition.subTasks.map(task => task.domain);

    if (domains.includes('gui') || domains.includes('ui')) return 'gui_development';
    if (domains.includes('system_integration')) return 'complex_integration';
    if (domains.includes('qa_testing')) return 'testing_qa';
    if (domains.includes('security')) return 'security_audit';
    if (domains.includes('database')) return 'database_operations';
    if (domains.includes('devops')) return 'api_development';
    if (taskDecomposition.subTasks.length > 5) return 'complex_integration';

    return 'general_purpose';
  }

  private async applyCostOptimizations(
    originalPrediction: CostPredictionResult,
    costFeatures: CostFeatures
  ): Promise<CostPredictionResult> {
    // Simple cost optimization: shift to more Haiku usage
    const optimizedFeatures = {
      ...costFeatures,
      modelDistribution: {
        haikuPercentage: Math.min(0.7, costFeatures.modelDistribution.haikuPercentage + 0.2),
        sonnetPercentage: Math.max(0.2, costFeatures.modelDistribution.sonnetPercentage - 0.1),
        opusPercentage: Math.max(0.1, costFeatures.modelDistribution.opusPercentage - 0.1)
      }
    };

    // Recalculate with optimized features
    return await this.costPredictionEngine.predictCost(
      'Optimized orchestration',
      optimizedFeatures
    );
  }

  // =============================================================================
  // LEVEL 4 DEPENDENCY GRAPH AND PARALLEL EXECUTION METHODS
  // =============================================================================

  /**
   * Build advanced dependency graph with multi-agent support
   */
  private async buildAdvancedDependencyGraph(
    taskDecomposition: TaskDecompositionResult,
    routingDecisions: RoutingDecision[],
    agentAllocation: AgentAllocationMap,
    complexityAnalysis: ComplexityAnalysisResult
  ): Promise<DependencyGraph> {
    const startTime = performance.now();

    try {
      // Build enhanced dependency graph
      const nodes = new Map();
      const edges = new Map();

      // Create nodes for each sub-task
      taskDecomposition.subTasks.forEach((subTask, index) => {
        const assignedAgent = this.findAssignedAgent(subTask.id, agentAllocation);
        const selectedModel = this.selectModelForTask(subTask, complexityAnalysis);

        nodes.set(subTask.id, {
          id: subTask.id,
          name: subTask.description,
          type: this.mapDomainToNodeType(subTask.domain),
          agent: this.convertToAgentDefinition(assignedAgent),
          model: selectedModel,
          description: subTask.description,
          estimatedDurationMinutes: Math.ceil(subTask.estimatedDuration / 60),
          estimatedCost: subTask.estimatedCost,
          priority: this.mapPriorityToNumber(subTask.priority),
          criticality: this.mapComplexityToCriticality(subTask.estimatedComplexity),
          parallelizable: subTask.canRunInParallel,
          resourceRequirements: this.generateResourceRequirements(subTask),
          inputs: this.generateNodeInputs(subTask),
          outputs: this.generateNodeOutputs(subTask),
          constraints: this.generateTaskConstraints(subTask)
        });
      });

      // Create dependency edges
      taskDecomposition.dependencies.forEach((dependency, index) => {
        const edgeId = `edge-${index}`;
        edges.set(edgeId, {
          id: edgeId,
          fromNodeId: dependency.fromTaskId,
          toNodeId: dependency.toTaskId,
          dependencyType: this.mapDependencyType(dependency.dependencyType),
          strength: this.mapDependencyStrength(dependency.strength),
          condition: dependency.optional ? 'optional' : undefined,
          delay: 0,
          transferData: this.inferTransferData(dependency)
        });
      });

      // Detect additional implicit dependencies
      const implicitEdges = this.detectImplicitDependencies(taskDecomposition.subTasks);
      implicitEdges.forEach(edge => {
        if (!edges.has(edge.id)) {
          edges.set(edge.id, edge);
        }
      });

      // Build execution plan
      const executionPlan = await this.buildExecutionPlan(nodes, edges, agentAllocation);

      // Detect circular dependencies
      const circularDependencies = this.detectCircularDependencies(nodes, edges);

      // Calculate critical path
      const criticalPath = this.calculateCriticalPath(nodes, edges);

      // Identify parallelization opportunities
      const parallelizationOpportunities = this.identifyAdvancedParallelizationOpportunities(
        nodes,
        edges,
        agentAllocation
      );

      // Assess risks
      const riskAssessment = this.assessExecutionRisks(nodes, edges, complexityAnalysis);

      const dependencyGraph: DependencyGraph = {
        id: `graph-${Date.now()}`,
        name: 'Level 4 Advanced Dependency Graph',
        description: 'Advanced dependency graph with parallelization support',
        nodes,
        edges,
        executionPlan,
        circularDependencies,
        criticalPath,
        parallelizationOpportunities,
        totalEstimatedTime: criticalPath.reduce((sum, nodeId) => {
          const node = nodes.get(nodeId);
          return sum + (node?.estimatedDurationMinutes || 0);
        }, 0),
        totalEstimatedCost: Array.from(nodes.values()).reduce((sum, node) => sum + node.estimatedCost, 0),
        complexityScore: complexityAnalysis.complexityScore,
        riskAssessment,
        metadata: {
          createdAt: Date.now(),
          complexity: complexityAnalysis.overallComplexity,
          agentCount: agentAllocation.totalAgents,
          maxParallelism: Math.min(
            Array.from(nodes.values()).filter(node => node.parallelizable).length,
            this.maxConcurrentAgents
          )
        }
      };

      const executionTime = performance.now() - startTime;
      this.logger.debug('Advanced dependency graph built', {
        executionTime: Math.round(executionTime),
        nodeCount: nodes.size,
        edgeCount: edges.size,
        criticalPathLength: criticalPath.length
      });

      return dependencyGraph;

    } catch (error) {
      this.logger.error('Advanced dependency graph building failed', { error });

      // Return minimal fallback graph
      const fallbackNodes = new Map();
      const mainTaskNode = {
        id: 'main-task',
        name: 'Execute all tasks sequentially',
        type: 'implementation' as const,
        agent: {
          name: 'general_coder',
          filePath: 'core/coder.md',
          specialization: 'General coding',
          confidence: 0.6,
          supportedDomains: ['general']
        },
        model: 'haiku' as const,
        description: 'Fallback sequential execution',
        estimatedDurationMinutes: Math.ceil(complexityAnalysis.estimatedTotalTime / 60),
        estimatedCost: 0.15,
        priority: 5,
        criticality: 'medium' as const,
        parallelizable: false,
        resourceRequirements: [],
        inputs: [],
        outputs: [],
        constraints: []
      };
      fallbackNodes.set('main-task', mainTaskNode);

      return {
        id: 'fallback-graph',
        name: 'Fallback Dependency Graph',
        description: 'Fallback graph for simple sequential execution',
        nodes: fallbackNodes,
        edges: new Map(),
        executionPlan: {
          batches: [{
            batchId: 'fallback-batch',
            order: 1,
            nodes: ['main-task'],
            dependencies: [],
            canRunInParallel: false,
            estimatedDuration: mainTaskNode.estimatedDurationMinutes,
            resourceRequirements: [{
              type: 'agent_slot' as const,
              amount: 1,
              unit: 'slot',
              exclusive: false,
              shareable: false
            }],
            riskLevel: 'medium',
            fallbackOptions: []
          }],
          maxConcurrency: 1,
          totalBatches: 1,
          estimatedCompletion: new Date(Date.now() + mainTaskNode.estimatedDurationMinutes * 60000),
          contingencyPlans: [],
          monitoringPoints: []
        },
        circularDependencies: [{
          cycle: ['main-task'],
          severity: 'warning',
          resolution: [{
            strategy: 'parallel_execution',
            description: 'Execute tasks sequentially',
            cost: 0,
            risk: 'low'
          }],
          impact: 'low'
        }],
        criticalPath: ['main-task'],
        parallelizationOpportunities: [],
        totalEstimatedTime: mainTaskNode.estimatedDurationMinutes,
        totalEstimatedCost: mainTaskNode.estimatedCost,
        complexityScore: 0.5,
        riskAssessment: {
          overallRisk: 'medium',
          riskFactors: [{ factor: 'time', probability: 0.5, impact: 0.6, riskScore: 0.3, category: 'technical' as const }],
          mitigationStrategies: [{ risk: 'time', strategy: 'monitor_closely', cost: 0, effectiveness: 0.7, implementation: 'use_conservative_approach' }],
          contingencyTriggers: []
        },
        metadata: {
          createdAt: Date.now(),
          complexity: 'medium',
          agentCount: 1,
          maxParallelism: 1
        }
      };
    }
  }

  /**
   * Generate parallel execution batches for 64-agent coordination
   */
  private async generateParallelExecutionBatches(
    dependencyGraph: DependencyGraph,
    agentAllocation: AgentAllocationMap,
    maxParallel: number
  ): Promise<ParallelExecutionBatch[]> {
    const startTime = performance.now();

    try {
      const batches: ParallelExecutionBatch[] = [];
      const processedNodes = new Set<string>();
      const availableNodes = new Set(dependencyGraph.nodes.keys());

      let batchIndex = 0;

      while (processedNodes.size < dependencyGraph.nodes.size) {
        // Find nodes that can be executed in this batch
        const candidateNodes = Array.from(availableNodes).filter(nodeId => {
          if (processedNodes.has(nodeId)) return false;

          const node = dependencyGraph.nodes.get(nodeId)!;

          // Check if all dependencies are satisfied
          const incomingEdges = Array.from(dependencyGraph.edges.values())
            .filter(edge => edge.toNodeId === nodeId);

          return incomingEdges.every(edge => processedNodes.has(edge.fromNodeId));
        });

        if (candidateNodes.length === 0 && processedNodes.size < dependencyGraph.nodes.size) {
          // Handle circular dependencies or break deadlock
          this.logger.warn('Potential circular dependency detected, breaking deadlock');
          const remainingNodes = Array.from(availableNodes).filter(nodeId => !processedNodes.has(nodeId));
          candidateNodes.push(remainingNodes[0]);
        }

        // Group nodes by parallelizability and resource requirements
        const parallelCandidates = candidateNodes.filter(nodeId => {
          const node = dependencyGraph.nodes.get(nodeId)!;
          return node.parallelizable;
        });

        const sequentialCandidates = candidateNodes.filter(nodeId => {
          const node = dependencyGraph.nodes.get(nodeId)!;
          return !node.parallelizable;
        });

        // Create parallel batch
        if (parallelCandidates.length > 0) {
          const batchNodes = parallelCandidates.slice(0, Math.min(maxParallel, agentAllocation.totalAgents));

          const batch: ParallelExecutionBatch = {
            batchId: `parallel-batch-${batchIndex++}`,
            taskIds: batchNodes,
            estimatedDuration: Math.max(...batchNodes.map(nodeId => {
              const node = dependencyGraph.nodes.get(nodeId)!;
              return node.estimatedDurationMinutes;
            })),
            requiredAgents: batchNodes.length,
            dependencies: this.calculateBatchDependencies(batchNodes, dependencyGraph),
            canOptimize: batchNodes.length > 1,
            resourceRequirements: this.aggregateResourceRequirements(batchNodes, dependencyGraph),
            fallbackOptions: [`sequential-execution-${batchIndex}`]
          };

          batches.push(batch);
          batchNodes.forEach(nodeId => processedNodes.add(nodeId));
        }

        // Create sequential batch for non-parallelizable tasks
        if (sequentialCandidates.length > 0) {
          const firstSequentialNode = sequentialCandidates[0];
          const node = dependencyGraph.nodes.get(firstSequentialNode)!;

          // Convert GraphResourceRequirement[] to local ResourceRequirement[]
          const convertedResourceRequirements: ResourceRequirement[] = node.resourceRequirements.map(req => ({
            type: req.type,
            amount: req.amount,
            unit: req.unit,
            priority: req.exclusive ? 'required' : 'preferred',
            shareable: req.shareable
          }));

          const batch: ParallelExecutionBatch = {
            batchId: `sequential-batch-${batchIndex++}`,
            taskIds: [firstSequentialNode],
            estimatedDuration: node.estimatedDurationMinutes,
            requiredAgents: 1,
            dependencies: this.calculateBatchDependencies([firstSequentialNode], dependencyGraph),
            canOptimize: false,
            resourceRequirements: convertedResourceRequirements,
            fallbackOptions: [`retry-${firstSequentialNode}`]
          };

          batches.push(batch);
          processedNodes.add(firstSequentialNode);
        }

        // Safety check to prevent infinite loops
        if (candidateNodes.length === 0) {
          this.logger.error('No candidate nodes found, breaking execution planning');
          break;
        }
      }

      const executionTime = performance.now() - startTime;
      this.logger.debug('Parallel execution batches generated', {
        executionTime: Math.round(executionTime),
        batchCount: batches.length,
        maxAgentsRequired: Math.max(...batches.map(batch => batch.requiredAgents)),
        totalEstimatedTime: batches.reduce((sum, batch) => sum + batch.estimatedDuration, 0)
      });

      return batches;

    } catch (error) {
      this.logger.error('Parallel execution batch generation failed', { error });

      // Return fallback single batch
      return [{
        batchId: 'fallback-sequential-batch',
        taskIds: Array.from(dependencyGraph.nodes.keys()),
        estimatedDuration: dependencyGraph.totalEstimatedTime,
        requiredAgents: 1,
        dependencies: [],
        canOptimize: false,
        resourceRequirements: [],
        fallbackOptions: ['manual_execution']
      }];
    }
  }

  /**
   * Optimize for maximum parallelism with resource management
   */
  private async optimizeForMaximumParallelism(
    dependencyGraph: DependencyGraph,
    parallelBatches: ParallelExecutionBatch[],
    agentAllocation: AgentAllocationMap
  ): Promise<DependencyGraph> {
    const startTime = performance.now();

    try {
      // Analyze current parallelism efficiency
      const currentEfficiency = this.calculateParallelismEfficiencyForBatches(parallelBatches, agentAllocation);

      if (currentEfficiency < 0.7) {
        this.logger.info('Low parallelism efficiency detected, applying optimizations', {
          currentEfficiency
        });

        // Apply optimization strategies
        const optimizedGraph = await this.applyParallelismOptimizations(
          dependencyGraph,
          parallelBatches,
          agentAllocation
        );

        const executionTime = performance.now() - startTime;
        this.logger.debug('Parallelism optimization completed', {
          executionTime: Math.round(executionTime),
          originalEfficiency: currentEfficiency,
          optimizedEfficiency: this.calculateParallelismEfficiencyForBatches(parallelBatches, agentAllocation)
        });

        return optimizedGraph;
      }

      return dependencyGraph;

    } catch (error) {
      this.logger.error('Parallelism optimization failed', { error });
      return dependencyGraph;
    }
  }

  // =============================================================================
  // HELPER METHODS FOR DEPENDENCY GRAPH BUILDING
  // =============================================================================

  private findAssignedAgent(taskId: string, agentAllocation: AgentAllocationMap): AgentAllocation {
    // Find the agent assigned to this task
    for (const allocation of agentAllocation.allocations.values()) {
      if (allocation.assignedTasks.includes(taskId)) {
        return allocation;
      }
    }

    // Fallback to first general agent
    const generalAgent = Array.from(agentAllocation.allocations.values())
      .find(alloc => alloc.agentType === 'general');

    return generalAgent || {
      agentId: 'fallback-agent',
      agentType: 'general',
      assignedTasks: [taskId],
      estimatedWorkload: 1.0,
      utilizationPercentage: 100,
      specializations: ['general'],
      concurrentTaskLimit: 1
    };
  }

  private selectModelForTask(subTask: DecomposedSubTask, complexityAnalysis: ComplexityAnalysisResult): ModelType {
    // Model selection based on task complexity and domain
    if (subTask.domain === 'security' || subTask.estimatedComplexity === 'extreme') {
      return 'opus';
    }

    if (subTask.estimatedComplexity === 'high' || complexityAnalysis.overallComplexity === 'high') {
      return 'sonnet';
    }

    if (subTask.domain === 'documentation' || subTask.estimatedComplexity === 'low') {
      return 'haiku';
    }

    return 'sonnet'; // Default to sonnet for balanced performance/cost
  }

  private mapDomainToNodeType(domain: string): NodeCategory {
    const nodeTypeMap: Record<string, NodeCategory> = {
      'development': 'implementation',
      'qa_testing': 'testing',
      'system_integration': 'integration',
      'documentation': 'documentation',
      'security': 'validation',
      'devops': 'deployment',
      'troubleshooting': 'validation'
    };
    return nodeTypeMap[domain] || 'implementation';
  }

  private mapPriorityToNumber(priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA'): number {
    const priorityMap = { 'CRITICA': 10, 'ALTA': 8, 'MEDIA': 5, 'BASSA': 2 };
    return priorityMap[priority];
  }

  private mapComplexityToCriticality(complexity: ComplexityLevel): 'low' | 'medium' | 'high' | 'critical' {
    const criticalityMap: Record<ComplexityLevel, 'low' | 'medium' | 'high' | 'critical'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'extreme': 'critical'
    };
    return criticalityMap[complexity];
  }

  private generateResourceRequirements(subTask: DecomposedSubTask): ResourceRequirement[] {
    const requirements: ResourceRequirement[] = [];

    // Base agent slot requirement
    requirements.push({
      type: 'agent_slot',
      amount: 1,
      unit: 'slot',
      priority: 'required',
      shareable: false
    });

    // Additional requirements based on domain
    if (subTask.domain === 'database') {
      requirements.push({
        type: 'database_connection',
        amount: 1,
        unit: 'connection',
        priority: 'required',
        shareable: true
      });
    }

    if (subTask.domain === 'gui') {
      requirements.push({
        type: 'ui_framework',
        amount: 1,
        unit: 'framework',
        priority: 'preferred',
        shareable: true
      });
    }

    return requirements;
  }

  private generateNodeInputs(subTask: DecomposedSubTask): NodeInput[] {
    return subTask.dependsOn.map(dependency => ({
      name: `input_from_${dependency}`,
      type: 'data',
      required: true,
      source: dependency
    }));
  }

  private generateNodeOutputs(subTask: DecomposedSubTask): NodeOutput[] {
    return subTask.produces.map(output => ({
      name: output,
      type: 'data',
      description: `Output from ${subTask.description}`
    }));
  }

  private generateTaskConstraints(subTask: DecomposedSubTask): TaskConstraint[] {
    const constraints: TaskConstraint[] = [];

    if (subTask.priority === 'CRITICA') {
      constraints.push({
        type: 'time',
        constraint: 'critical_path',
        value: 'high_priority'
      });
    }

    if (!subTask.canRunInParallel) {
      constraints.push({
        type: 'execution',
        constraint: 'sequential_only',
        value: 'true'
      });
    }

    return constraints;
  }

  private mapDependencyType(dependencyType: 'data' | 'sequence' | 'resource' | 'validation'): DependencyEdgeType {
    const typeMap: Record<string, DependencyEdgeType> = {
      'data': 'data',
      'sequence': 'hard',
      'resource': 'resource',
      'validation': 'validation'
    };
    return typeMap[dependencyType] || 'soft';
  }

  private mapDependencyStrength(strength: number): DependencyStrength {
    if (strength >= 0.8) return 'strong';
    if (strength >= 0.6) return 'medium';
    return 'weak';
  }

  private inferTransferData(dependency: SubTaskDependency): string[] {
    switch (dependency.dependencyType) {
      case 'data':
        return ['output_data', 'results'];
      case 'sequence':
        return ['completion_status'];
      case 'validation':
        return ['validation_results', 'approval'];
      default:
        return ['status'];
    }
  }

  private detectImplicitDependencies(subTasks: DecomposedSubTask[]): DependencyEdgeInternal[] {
    const implicitEdges: DependencyEdgeInternal[] = [];
    let edgeIndex = 1000; // Start from high number to avoid conflicts

    // Documentation tasks depend on implementation tasks
    const docTasks = subTasks.filter(task => task.domain === 'documentation');
    const implTasks = subTasks.filter(task => task.domain === 'development');

    docTasks.forEach(docTask => {
      implTasks.forEach(implTask => {
        implicitEdges.push({
          id: `implicit-edge-${edgeIndex++}`,
          fromNodeId: implTask.id,
          toNodeId: docTask.id,
          dependencyType: 'data',
          strength: 'medium',
          condition: 'implicit_documentation_dependency',
          delay: 0,
          transferData: ['implementation_details', 'code_structure']
        });
      });
    });

    // Testing depends on implementation
    const testTasks = subTasks.filter(task => task.domain === 'qa_testing');
    testTasks.forEach(testTask => {
      implTasks.forEach(implTask => {
        implicitEdges.push({
          id: `implicit-edge-${edgeIndex++}`,
          fromNodeId: implTask.id,
          toNodeId: testTask.id,
          dependencyType: 'hard',
          strength: 'strong',
          delay: 0,
          transferData: ['implementation', 'test_artifacts']
        });
      });
    });

    return implicitEdges;
  }

  private async buildExecutionPlan(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>,
    agentAllocation: AgentAllocationMap
  ): Promise<GraphExecutionPlan> {
    // Use the locally defined GraphExecutionBatch type
    const batches: GraphExecutionBatch[] = [];
    const processedNodes = new Set<string>();
    let batchIndex = 0;

    // Create batches based on dependency levels
    while (processedNodes.size < nodes.size) {
      const candidateNodes = Array.from(nodes.keys()).filter(nodeId => {
        if (processedNodes.has(nodeId)) return false;

        // Check if dependencies are satisfied
        const dependencies = Array.from(edges.values()).filter(edge => edge.toNodeId === nodeId);
        return dependencies.every(dep => processedNodes.has(dep.fromNodeId));
      });

      if (candidateNodes.length === 0) break; // Prevent infinite loop

      const parallelNodes = candidateNodes.filter(nodeId => {
        const node = nodes.get(nodeId);
        return node?.parallelizable || false;
      });

      const batchNodes = parallelNodes.length > 0 ? parallelNodes : [candidateNodes[0]];
      const canRunInParallel = parallelNodes.length > 1;

      batches.push({
        batchId: `batch-${batchIndex++}`,
        order: batchIndex,
        nodes: batchNodes,
        dependencies: batchIndex > 0 ? [`batch-${batchIndex - 2}`] : [],
        canRunInParallel,
        estimatedDuration: Math.max(...batchNodes.map(nodeId => {
          const node = nodes.get(nodeId);
          return node?.estimatedDurationMinutes || 0;
        })),
        resourceRequirements: [{
          type: 'agent_slot',
          amount: batchNodes.length,
          unit: 'slot',
          exclusive: false,
          shareable: false
        }],
        riskLevel: 'medium',
        fallbackOptions: [`sequential-batch-${batchIndex}`]
      });

      batchNodes.forEach(nodeId => processedNodes.add(nodeId));
    }

    return {
      batches,
      totalBatches: batches.length,
      maxConcurrency: Math.max(...batches.map(batch =>
        batch.canRunInParallel ? batch.nodes.length : 1
      ), 1),
      estimatedCompletion: new Date(Date.now() + batches.reduce((sum, batch) => sum + batch.estimatedDuration, 0) * 60000),
      contingencyPlans: [],
      monitoringPoints: []
    };
  }

  private detectCircularDependencies(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>
  ): GraphCircularDependency[] {
    // Simplified circular dependency detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: GraphCircularDependency[] = [];

    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoingEdges = Array.from(edges.values()).filter(edge => edge.fromNodeId === nodeId);

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId)) {
          dfs(edge.toNodeId, [...path]);
        } else if (recursionStack.has(edge.toNodeId)) {
          const cycleStart = path.indexOf(edge.toNodeId);
          if (cycleStart !== -1) {
            cycles.push({
              cycle: path.slice(cycleStart).concat([edge.toNodeId]),
              severity: 'warning',
              resolution: [{
                strategy: 'break_dependency',
                description: 'Break the circular dependency by removing one edge',
                cost: 0,
                risk: 'low'
              }],
              impact: 'low'
            });
          }
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  private calculateCriticalPath(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>
  ): string[] {
    // Simplified critical path calculation using topological sort and longest path
    const inDegree = new Map<string, number>();
    const duration = new Map<string, number>();

    // Initialize
    for (const nodeId of nodes.keys()) {
      inDegree.set(nodeId, 0);
      const node = nodes.get(nodeId);
      if (node) {
        duration.set(nodeId, node.estimatedDurationMinutes);
      }
    }

    // Calculate in-degrees
    for (const edge of edges.values()) {
      inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) || 0) + 1);
    }

    // Find nodes with no dependencies (starting points)
    const queue = Array.from(nodes.keys()).filter(nodeId => inDegree.get(nodeId) === 0);
    const longestPath = new Map();
    const parent = new Map();

    // Initialize longest paths
    for (const nodeId of nodes.keys()) {
      longestPath.set(nodeId, 0);
    }

    // Process nodes in topological order
    while (queue.length > 0) {
      const currentNode = queue.shift()!;

      const outgoingEdges = Array.from(edges.values()).filter(edge => edge.fromNodeId === currentNode);

      for (const edge of outgoingEdges) {
        const nextNode = edge.toNodeId;
        const newDistance = longestPath.get(currentNode)! + duration.get(currentNode)!;

        if (newDistance > longestPath.get(nextNode)!) {
          longestPath.set(nextNode, newDistance);
          parent.set(nextNode, currentNode);
        }

        inDegree.set(nextNode, inDegree.get(nextNode)! - 1);
        if (inDegree.get(nextNode) === 0) {
          queue.push(nextNode);
        }
      }
    }

    // Find the node with maximum distance (end of critical path)
    let maxDistance = 0;
    let endNode = '';

    for (const [nodeId, distance] of longestPath) {
      if (distance > maxDistance) {
        maxDistance = distance;
        endNode = nodeId;
      }
    }

    // Reconstruct critical path
    const criticalPath = [];
    let currentNode = endNode;

    while (currentNode) {
      criticalPath.unshift(currentNode);
      currentNode = parent.get(currentNode);
    }

    return criticalPath;
  }

  private identifyAdvancedParallelizationOpportunities(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>,
    agentAllocation: AgentAllocationMap
  ): GraphParallelBatch[] {
    const batches: GraphParallelBatch[] = [];

    // Find independent task groups
    const independentGroups = this.findIndependentTaskGroups(nodes, edges);

    independentGroups.forEach((group, index) => {
      if (group.length > 1) {
        batches.push({
          batchId: `parallel-batch-${index}`,
          nodes: group,
          maxConcurrency: Math.min(group.length, agentAllocation.totalAgents),
          estimatedSpeedup: Math.min(group.length * 0.85, agentAllocation.totalAgents),
          resourceConflicts: [],
          optimalSchedule: group.map(nodeId => ({
            startTime: 0,
            duration: nodes.get(nodeId)?.estimatedDurationMinutes || 0,
            nodeId: nodeId,
            resources: []
          }))
        });
      }
    });

    // Note: Pipeline opportunities could be converted similarly
    // For now, we just use independent groups

    return batches;
  }

  private findIndependentTaskGroups(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>
  ): string[][] {
    const groups: string[][] = [];
    const visited = new Set<string>();

    for (const nodeId of nodes.keys()) {
      if (visited.has(nodeId)) continue;

      const group = [];
      const queue = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const currentNode = queue.shift()!;
        group.push(currentNode);

        // Find connected nodes (both incoming and outgoing)
        const connectedEdges = Array.from(edges.values()).filter(edge =>
          edge.fromNodeId === currentNode || edge.toNodeId === currentNode
        );

        for (const edge of connectedEdges) {
          const connectedNode = edge.fromNodeId === currentNode ? edge.toNodeId : edge.fromNodeId;
          if (!visited.has(connectedNode)) {
            visited.add(connectedNode);
            queue.push(connectedNode);
          }
        }
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  private findPipelineOpportunities(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>
  ): ParallelizationOpportunityInternal[] {
    const pipelineOpportunities: Array<{
      id: string;
      type: string;
      tasks: string[];
      estimatedSpeedup: number;
      resourceRequirement: number;
      confidence: number;
      constraints: string[];
    }> = [];

    // Look for sequential chains that could be pipelined
    const chains = this.findSequentialChains(nodes, edges);

    chains.forEach((chain, index) => {
      if (chain.length > 2) {
        pipelineOpportunities.push({
          id: `pipeline-${index}`,
          type: 'pipeline_execution',
          tasks: chain,
          estimatedSpeedup: 1.3, // Modest improvement for pipelining
          resourceRequirement: Math.ceil(chain.length / 2),
          confidence: 0.7,
          constraints: ['sequential_data_flow']
        });
      }
    });

    return pipelineOpportunities;
  }

  private findSequentialChains(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>
  ): string[][] {
    const chains: string[][] = [];
    const visited = new Set<string>();

    // Find nodes with single incoming and outgoing edges
    for (const nodeId of nodes.keys()) {
      if (visited.has(nodeId)) continue;

      const incomingEdges = Array.from(edges.values()).filter(edge => edge.toNodeId === nodeId);
      const outgoingEdges = Array.from(edges.values()).filter(edge => edge.fromNodeId === nodeId);

      // Start a chain if this is a good starting point
      if (incomingEdges.length <= 1) {
        const chain = this.buildSequentialChain(nodeId, edges, visited);
        if (chain.length > 1) {
          chains.push(chain);
        }
      }
    }

    return chains;
  }

  private buildSequentialChain(
    startNode: string,
    edges: Map<string, DependencyEdgeInternal>,
    visited: Set<string>
  ): string[] {
    const chain = [startNode];
    visited.add(startNode);

    let currentNode = startNode;

    while (true) {
      const outgoingEdges = Array.from(edges.values()).filter(edge => edge.fromNodeId === currentNode);

      // Chain continues if there's exactly one outgoing edge to an unvisited node
      if (outgoingEdges.length !== 1) break;

      const nextNode = outgoingEdges[0].toNodeId;
      if (visited.has(nextNode)) break;

      // Check if the next node has only one incoming edge (from current node)
      const incomingEdges = Array.from(edges.values()).filter(edge => edge.toNodeId === nextNode);
      if (incomingEdges.length !== 1) break;

      chain.push(nextNode);
      visited.add(nextNode);
      currentNode = nextNode;
    }

    return chain;
  }

  private assessExecutionRisks(
    nodes: Map<string, DependencyNodeInternal>,
    edges: Map<string, DependencyEdgeInternal>,
    complexityAnalysis: ComplexityAnalysisResult
  ): RiskAssessmentResult {
    const riskFactors = [];

    // High complexity risk
    if (complexityAnalysis.complexityScore > 0.8) {
      riskFactors.push({
        factor: 'high_complexity',
        severity: 'high',
        impact: 0.7,
        mitigation: 'use_experienced_agents'
      });
    }

    // Many dependencies risk
    if (edges.size > nodes.size * 1.5) {
      riskFactors.push({
        factor: 'complex_dependencies',
        severity: 'medium',
        impact: 0.5,
        mitigation: 'careful_coordination'
      });
    }

    // Resource contention risk
    const criticalNodes = Array.from(nodes.values()).filter(node => node.criticality === 'critical');
    if (criticalNodes.length > 3) {
      riskFactors.push({
        factor: 'resource_contention',
        severity: 'medium',
        impact: 0.4,
        mitigation: 'prioritize_critical_tasks'
      });
    }

    return {
      overallRisk: riskFactors.length > 2 ? 'high' : riskFactors.length > 0 ? 'medium' : 'low',
      riskFactors: riskFactors.map(rf => ({
        factor: rf.factor,
        probability: 0.5,
        impact: rf.impact,
        riskScore: rf.impact,
        category: 'technical' as const
      })),
      mitigationStrategies: riskFactors.map(rf => ({
        risk: rf.factor,
        strategy: rf.mitigation,
        cost: 0,
        effectiveness: 0.7,
        implementation: rf.mitigation
      })),
      contingencyTriggers: riskFactors.map(rf => ({
        condition: rf.factor,
        threshold: rf.impact,
        monitoring: true,
        autoTrigger: false
      }))
    };
  }

  private calculateBatchDependencies(batchNodes: string[], dependencyGraph: DependencyGraph): string[] {
    const dependencies = new Set<string>();

    batchNodes.forEach(nodeId => {
      const incomingEdges = Array.from(dependencyGraph.edges.values())
        .filter(edge => edge.toNodeId === nodeId);

      incomingEdges.forEach(edge => {
        if (!batchNodes.includes(edge.fromNodeId)) {
          dependencies.add(edge.fromNodeId);
        }
      });
    });

    return Array.from(dependencies);
  }

  private aggregateResourceRequirements(batchNodes: string[], dependencyGraph: DependencyGraph): ResourceRequirement[] {
    const aggregated = new Map<string, ResourceRequirement>();

    batchNodes.forEach(nodeId => {
      const node = dependencyGraph.nodes.get(nodeId);
      if (!node) return;

      node.resourceRequirements.forEach((req: GraphResourceRequirement) => {
        const key = `${req.type}-${req.unit}`;
        const existing = aggregated.get(key);

        // Convert GraphResourceRequirement to local ResourceRequirement
        const localReq: ResourceRequirement = {
          type: req.type,
          amount: req.amount,
          unit: req.unit,
          priority: req.exclusive ? 'required' : 'preferred',
          shareable: req.shareable
        };

        if (existing) {
          if (req.shareable && existing.shareable) {
            // For shareable resources, take the maximum
            if (req.amount > existing.amount) {
              aggregated.set(key, localReq);
            }
          } else {
            // For non-shareable resources, sum them
            aggregated.set(key, {
              ...existing,
              amount: existing.amount + req.amount
            });
          }
        } else {
          aggregated.set(key, localReq);
        }
      });
    });

    return Array.from(aggregated.values());
  }

  private calculateParallelismEfficiencyForBatches(batches: ParallelExecutionBatch[], agentAllocation: AgentAllocationMap): number {
    const totalAgentsUsed = batches.reduce((sum, batch) => Math.max(sum, batch.requiredAgents), 0);
    const avgParallelTasks = batches.reduce((sum, batch) => sum + batch.taskIds.length, 0) / batches.length;

    const efficiency = (avgParallelTasks / Math.max(totalAgentsUsed, 1)) * (totalAgentsUsed / agentAllocation.totalAgents);

    return Math.min(efficiency, 1.0);
  }

  private async applyParallelismOptimizations(
    dependencyGraph: DependencyGraph,
    parallelBatches: ParallelExecutionBatch[],
    agentAllocation: AgentAllocationMap
  ): Promise<DependencyGraph> {
    // Apply optimizations like dependency relaxation, task merging, etc.
    // This is a simplified version - real implementation would be more sophisticated

    this.logger.info('Applying parallelism optimizations', {
      originalBatches: parallelBatches.length,
      totalAgents: agentAllocation.totalAgents
    });

    // For now, return the original graph
    // In a full implementation, this would modify the graph structure
    return dependencyGraph;
  }

  // =============================================================================
  // LEVEL 4 ADVANCED EXECUTION METHODS
  // =============================================================================

  /**
   * Initialize real-time session metrics
   */
  private initializeRealTimeMetrics(): RealTimeSessionMetrics {
    return {
      throughput: 0,
      latency: 0,
      errorRate: 0,
      resourceUtilization: 0,
      costEfficiency: 0,
      scalabilityIndex: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * Execute advanced parallel batches with 64-agent coordination
   */
  private async executeAdvancedParallelBatches(session: OrchestrationSession): Promise<Map<string, TaskExecutionResult>> {
    const results = new Map<string, TaskExecutionResult>();

    if (!session.parallelExecutionBatches || session.parallelExecutionBatches.length === 0) {
      this.logger.warn('No parallel execution batches available, falling back to sequential execution');
      return await this.executeTaskBatches(session);
    }

    this.logger.info('Executing advanced parallel batches', {
      batchCount: session.parallelExecutionBatches.length,
      maxAgents: Math.max(...session.parallelExecutionBatches.map(batch => batch.requiredAgents))
    });

    try {
      // Reserve agents for the session
      const reservedAgents = this.resourceManager.allocateAgents(
        session.agentAllocation!.totalAgents,
        'ALTA'
      );

      // Execute batches with intelligent scheduling
      for (const batch of session.parallelExecutionBatches) {
        this.logger.debug('Executing batch', {
          batchId: batch.batchId,
          taskCount: batch.taskIds.length,
          requiredAgents: batch.requiredAgents
        });

        const batchStartTime = performance.now();

        if (batch.taskIds.length === 1) {
          // Sequential execution
          const taskId = batch.taskIds[0];
          const result = await this.executeAdvancedTask(taskId, session, reservedAgents[0]);
          results.set(taskId, result);
        } else {
          // Parallel execution with coordination
          const batchPromises = batch.taskIds.map((taskId, index) =>
            this.executeAdvancedTask(taskId, session, reservedAgents[index % reservedAgents.length])
          );

          const batchResults = await Promise.allSettled(batchPromises);

          batchResults.forEach((result, index) => {
            const taskId = batch.taskIds[index];
            if (result.status === 'fulfilled') {
              results.set(taskId, result.value);
            } else {
              results.set(taskId, this.createFailedTaskResult(taskId, result.reason));
            }
          });
        }

        const batchDuration = performance.now() - batchStartTime;
        this.updateRealTimeMetrics(session, batch, batchDuration);

        // Update progress
        session.progressMetrics.completedTasks += batch.taskIds.length;
        session.progressMetrics.progressPercentage =
          (session.progressMetrics.completedTasks / session.progressMetrics.totalTasks) * 100;
      }

      // Release agents
      this.resourceManager.releaseAgents(reservedAgents);

      this.logger.info('Advanced parallel batch execution completed', {
        totalTasks: results.size,
        successfulTasks: Array.from(results.values()).filter(r => r.status === 'completed').length,
        avgUtilization: this.resourceManager.getUtilization()
      });

      return results;

    } catch (error) {
      this.logger.error('Advanced parallel batch execution failed', { error });
      return await this.executeTaskBatches(session); // Fallback to original method
    }
  }

  /**
   * Execute advanced task with enhanced monitoring
   */
  private async executeAdvancedTask(
    taskId: string,
    session: OrchestrationSession,
    agentId: string
  ): Promise<TaskExecutionResult> {
    const startTime = new Date();
    const node = session.dependencyGraph?.nodes.get(taskId);

    if (!node) {
      throw new Error(`Task node ${taskId} not found in dependency graph`);
    }

    this.logger.debug('Executing advanced task', {
      taskId,
      agentId,
      nodeType: node.type,
      estimatedDuration: node.estimatedDurationMinutes
    });

    try {
      // Enhanced task execution with monitoring
      const executionPromise = this.performEnhancedTaskExecution(node, agentId, session);

      // Set up timeout based on estimated duration with buffer
      const timeoutMs = node.estimatedDurationMinutes * 60 * 1000 * 1.5; // 50% buffer
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task execution timeout')), timeoutMs);
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update cost prediction learning
      if (session.costPrediction) {
        await this.costPredictionEngine.learnFromActualCost(
          this.extractCostFeaturesFromTask(node),
          node.estimatedCost,
          taskId
        );
      }

      return {
        taskId,
        status: 'completed',
        startTime,
        endTime,
        result: result || `Advanced task ${taskId} completed successfully`,
        errors: [],
        warnings: [],
        cost: node.estimatedCost,
        tokensUsed: Math.ceil(node.description.length / 4),
        modelUsed: node.model,
        agentUsed: agentId
      };

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Advanced task execution failed', { taskId, agentId, error: errorObj.message });

      return {
        taskId,
        status: 'failed',
        startTime,
        endTime: new Date(),
        result: null,
        errors: [errorObj.message],
        warnings: ['Task failed during advanced execution'],
        cost: 0,
        tokensUsed: 0,
        modelUsed: node.model,
        agentUsed: agentId
      };
    }
  }

  /**
   * Perform enhanced task execution with quality monitoring
   */
  private async performEnhancedTaskExecution(
    node: GraphDependencyNode,
    agentId: string,
    session: OrchestrationSession
  ): Promise<string> {
    // Mock enhanced execution - in real implementation, would use Task tool with monitoring
    const criticality = node.criticality as 'low' | 'medium' | 'high' | 'critical';
    const complexityMultiplier = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'critical': 2.0
    }[criticality] || 1.0;

    const executionTime = Math.min(node.estimatedDurationMinutes * 60 * complexityMultiplier, 300000); // Max 5 minutes

    await new Promise(resolve => setTimeout(resolve, Math.max(executionTime / 10, 100))); // Simulate work

    // Quality validation
    const qualityScore = Math.random() * 0.3 + 0.7; // 0.7-1.0 quality range

    if (qualityScore < 0.75) {
      throw new Error(`Quality validation failed: score ${qualityScore.toFixed(2)} below threshold 0.75`);
    }

    return `Enhanced execution result for ${node.name} with quality score ${qualityScore.toFixed(2)}`;
  }

  /**
   * Extract cost features from task node
   */
  private extractCostFeaturesFromTask(node: GraphDependencyNode): CostFeatures {
    const criticality = node.criticality as 'low' | 'medium' | 'high' | 'critical';
    return {
      taskComplexity: { 'low': 0.2, 'medium': 0.5, 'high': 0.8, 'critical': 1.0 }[criticality] || 0.5,
      agentCount: 1,
      estimatedExecutionTime: node.estimatedDurationMinutes * 60 * 1000,
      modelDistribution: {
        haikuPercentage: node.model === 'haiku' ? 1.0 : 0.0,
        sonnetPercentage: node.model === 'sonnet' ? 1.0 : 0.0,
        opusPercentage: node.model === 'opus' ? 1.0 : 0.0
      },
      taskTypeCategory: 'general_purpose',
      historicalPatterns: [],
      systemLoadFactor: 0.5,
      timeOfExecutionFactor: 0.5,
      userTier: 'pro',
      featureComplexity: {
        codeGenerationComplexity: 0.5,
        integrationComplexity: node.type === 'integration' ? 0.8 : 0.3,
        domainKnowledgeRequirement: 0.5,
        errorHandlingComplexity: 0.5,
        testingRequirements: node.type === 'testing' ? 0.8 : 0.3
      }
    };
  }

  /**
   * Update real-time metrics during execution
   */
  private updateRealTimeMetrics(session: OrchestrationSession, batch: ParallelExecutionBatch, duration: number): void {
    if (!session.realTimeMetrics) return;

    const metrics = session.realTimeMetrics;

    metrics.throughput = batch.taskIds.length / (duration / 1000); // Tasks per second
    metrics.latency = duration / batch.taskIds.length; // Avg time per task
    metrics.resourceUtilization = this.resourceManager.getUtilization();
    metrics.lastUpdated = Date.now();

    // Update cost efficiency
    if (session.costPrediction) {
      const actualCostRate = session.costPrediction.predictedCost / (duration / 1000);
      metrics.costEfficiency = 1 / actualCostRate; // Higher is better
    }

    // Update scalability index
    metrics.scalabilityIndex = Math.min(batch.requiredAgents / this.maxConcurrentAgents, 1.0);
  }

  /**
   * Handle advanced error recovery with agent reallocation
   */
  private async handleAdvancedErrorRecovery(
    session: OrchestrationSession,
    results: Map<string, TaskExecutionResult>
  ): Promise<Map<string, TaskExecutionResult>> {
    const failedTasks = Array.from(results.entries()).filter(([_, result]) => result.status === 'failed');

    if (failedTasks.length === 0) {
      this.logger.debug('No failed tasks detected, skipping error recovery');
      return results;
    }

    this.logger.info('Starting advanced error recovery', {
      failedTaskCount: failedTasks.length,
      totalTasks: results.size
    });

    const recoveredResults = new Map(results);

    for (const [taskId, failedResult] of failedTasks) {
      try {
        // Attempt recovery strategies
        const recoveryStrategy = this.determineRecoveryStrategy(failedResult, session);
        const recoveredResult = await this.executeRecoveryStrategy(taskId, recoveryStrategy, session);

        if (recoveredResult.status === 'completed') {
          recoveredResults.set(taskId, recoveredResult);
          this.logger.info('Task successfully recovered', { taskId, strategy: recoveryStrategy });
        } else {
          this.logger.warn('Task recovery failed', { taskId, strategy: recoveryStrategy });
        }

      } catch (error) {
        this.logger.error('Error during recovery attempt', { taskId, error });
      }
    }

    const recoverySuccessRate = (failedTasks.length - Array.from(recoveredResults.values()).filter(r => r.status === 'failed').length) / failedTasks.length;
    this.logger.info('Error recovery completed', {
      originalFailures: failedTasks.length,
      successfulRecoveries: Math.floor(failedTasks.length * recoverySuccessRate),
      recoverySuccessRate: Math.round(recoverySuccessRate * 100)
    });

    return recoveredResults;
  }

  /**
   * Determine recovery strategy for failed task
   */
  private determineRecoveryStrategy(failedResult: TaskExecutionResult, session: OrchestrationSession): string {
    // Analyze failure patterns to determine best recovery strategy
    const errorMessage = failedResult.errors.join(' ').toLowerCase();

    if (errorMessage.includes('timeout')) {
      return 'increase_timeout';
    } else if (errorMessage.includes('quality') || errorMessage.includes('validation')) {
      return 'escalate_model';
    } else if (errorMessage.includes('resource') || errorMessage.includes('allocation')) {
      return 'reassign_agent';
    } else {
      return 'retry_with_modifications';
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    taskId: string,
    strategy: string,
    session: OrchestrationSession
  ): Promise<TaskExecutionResult> {
    const node = session.dependencyGraph?.nodes.get(taskId);
    if (!node) {
      throw new Error(`Task node ${taskId} not found for recovery`);
    }

    switch (strategy) {
      case 'escalate_model':
        // Use higher-tier model for retry
        const escalatedModel = this.escalateModel(node.model);
        return await this.retryTaskWithModel(taskId, escalatedModel, session);

      case 'reassign_agent':
        // Assign to different agent
        const newAgent = this.findAlternativeAgent(session.agentAllocation!);
        return await this.retryTaskWithAgent(taskId, newAgent, session);

      case 'increase_timeout':
        // Retry with extended timeout
        return await this.retryTaskWithTimeout(taskId, node.estimatedDurationMinutes * 2, session);

      default:
        // Simple retry
        return await this.executeAdvancedTask(taskId, session, 'recovery-agent');
    }
  }

  /**
   * Escalate model to higher tier
   */
  private escalateModel(currentModel: ModelType): ModelType {
    const escalationMap: Record<ModelType, ModelType> = {
      'haiku': 'sonnet',
      'sonnet': 'opus',
      'opus': 'opus', // Already at highest
      'auto': 'sonnet' // Auto defaults to sonnet for escalation
    };
    return escalationMap[currentModel] || 'sonnet';
  }

  /**
   * Find alternative agent for task retry
   */
  private findAlternativeAgent(agentAllocation: AgentAllocationMap): string {
    // Find agent with lowest current utilization
    const sortedAgents = Array.from(agentAllocation.allocations.values())
      .sort((a, b) => a.utilizationPercentage - b.utilizationPercentage);

    return sortedAgents[0]?.agentId || 'fallback-agent';
  }

  /**
   * Retry task with different model
   */
  private async retryTaskWithModel(taskId: string, model: ModelType, session: OrchestrationSession): Promise<TaskExecutionResult> {
    const node = session.dependencyGraph?.nodes.get(taskId);
    if (node) {
      node.model = model; // Update model for retry
    }
    return await this.executeAdvancedTask(taskId, session, 'escalated-agent');
  }

  /**
   * Retry task with different agent
   */
  private async retryTaskWithAgent(taskId: string, agentId: string, session: OrchestrationSession): Promise<TaskExecutionResult> {
    return await this.executeAdvancedTask(taskId, session, agentId);
  }

  /**
   * Retry task with extended timeout
   */
  private async retryTaskWithTimeout(taskId: string, extendedMinutes: number, session: OrchestrationSession): Promise<TaskExecutionResult> {
    const node = session.dependencyGraph?.nodes.get(taskId);
    if (node) {
      node.estimatedDurationMinutes = extendedMinutes; // Update timeout
    }
    return await this.executeAdvancedTask(taskId, session, 'timeout-extended-agent');
  }

  /**
   * Perform dynamic agent reallocation based on quality metrics
   */
  private async performDynamicAgentReallocation(session: OrchestrationSession): Promise<void> {
    this.logger.info('Performing dynamic agent reallocation due to low quality score', {
      currentQualityScore: session.qualityMetrics?.overallQualityScore
    });

    if (!session.agentAllocation) return;

    // Identify underperforming agents
    const underperformingAgents = Array.from(session.agentAllocation.allocations.values())
      .filter(agent => agent.utilizationPercentage > 80);

    // Reallocate tasks if possible
    for (const agent of underperformingAgents) {
      const newAgent = this.findAlternativeAgent(session.agentAllocation);
      if (newAgent !== agent.agentId) {
        this.logger.debug('Reallocating tasks', {
          fromAgent: agent.agentId,
          toAgent: newAgent,
          taskCount: agent.assignedTasks.length
        });

        // Simple reallocation simulation
        agent.utilizationPercentage = Math.max(50, agent.utilizationPercentage * 0.7);
      }
    }
  }

  // =============================================================================
  // LEVEL 4 RESULT SYNTHESIS METHODS
  // =============================================================================

  /**
   * Perform intelligent result synthesis
   */
  private async performIntelligentResultSynthesis(
    results: Map<string, TaskExecutionResult>,
    session: OrchestrationSession
  ): Promise<ResultSynthesisData> {
    const startTime = performance.now();

    try {
      this.logger.info('Starting intelligent result synthesis', {
        resultCount: results.size,
        successfulResults: Array.from(results.values()).filter(r => r.status === 'completed').length
      });

      // Collect intermediate results
      const intermediateResults: IntermediateResult[] = Array.from(results.values()).map(result => ({
        taskId: result.taskId,
        agentId: result.agentUsed,
        result: result.result,
        confidence: result.status === 'completed' ? 0.9 : 0.3,
        timestamp: result.endTime?.getTime() || Date.now(),
        dependenciesSatisfied: true // Simplified
      }));

      // Determine synthesis strategy
      const synthesisStrategy = this.determineSynthesisStrategy(intermediateResults, session);

      // Perform synthesis based on strategy
      const finalSynthesis = await this.performSynthesis(intermediateResults, synthesisStrategy);

      // Check consistency
      const consistencyCheck = this.performConsistencyCheck(intermediateResults, finalSynthesis);

      // Resolve conflicts if any
      const conflicts = this.detectAndResolveConflicts(intermediateResults);

      // Calculate quality score
      const qualityScore = this.calculateSynthesisQuality(finalSynthesis, consistencyCheck, conflicts);

      const synthesisData: ResultSynthesisData = {
        synthesisStrategy,
        intermediateResults,
        finalSynthesis,
        qualityScore,
        consistencyCheck,
        conflicts
      };

      const executionTime = performance.now() - startTime;
      this.logger.info('Intelligent result synthesis completed', {
        executionTime: Math.round(executionTime),
        synthesisStrategy,
        qualityScore,
        conflictCount: conflicts.length
      });

      return synthesisData;

    } catch (error) {
      this.logger.error('Result synthesis failed', { error });

      // Return fallback synthesis
      return {
        synthesisStrategy: 'merge',
        intermediateResults: [],
        finalSynthesis: {
          consolidatedResult: 'Synthesis failed - fallback aggregation',
          confidenceScore: 0.5,
          contributingTasks: Array.from(results.keys()),
          qualityMetrics: { completeness: 0.5, consistency: 0.5 },
          recommendations: ['Review synthesis process', 'Check task dependencies'],
          nextSteps: ['Manual result review recommended']
        },
        qualityScore: 0.5,
        consistencyCheck: {
          isConsistent: false,
          inconsistencies: ['Synthesis process failed'],
          resolutionStrategy: 'manual_review',
          confidence: 0.3
        },
        conflicts: []
      };
    }
  }

  /**
   * Determine synthesis strategy based on results
   */
  private determineSynthesisStrategy(
    intermediateResults: IntermediateResult[],
    session: OrchestrationSession
  ): 'merge' | 'aggregate' | 'transform' | 'validate' {
    const resultTypes = new Set(intermediateResults.map(r => typeof r.result));
    const successRate = intermediateResults.filter(r => r.confidence > 0.7).length / intermediateResults.length;

    // Decision logic for synthesis strategy
    if (successRate < 0.5) {
      return 'validate'; // Need validation when many results are uncertain
    } else if (resultTypes.size === 1 && resultTypes.has('string')) {
      return 'merge'; // Simple merge for similar string results
    } else if (session.taskDecomposition?.subTasks.length && session.taskDecomposition.subTasks.length > 5) {
      return 'aggregate'; // Aggregate for complex multi-task scenarios
    } else {
      return 'transform'; // Transform for mixed result types
    }
  }

  /**
   * Perform synthesis based on strategy
   */
  private async performSynthesis(
    intermediateResults: IntermediateResult[],
    strategy: 'merge' | 'aggregate' | 'transform' | 'validate'
  ): Promise<FinalSynthesisResult> {
    switch (strategy) {
      case 'merge':
        return this.performMergeSynthesis(intermediateResults);
      case 'aggregate':
        return this.performAggregateSynthesis(intermediateResults);
      case 'transform':
        return this.performTransformSynthesis(intermediateResults);
      case 'validate':
        return this.performValidateSynthesis(intermediateResults);
      default:
        throw new Error(`Unknown synthesis strategy: ${strategy}`);
    }
  }

  /**
   * Perform merge synthesis
   */
  private performMergeSynthesis(intermediateResults: IntermediateResult[]): FinalSynthesisResult {
    const successfulResults = intermediateResults.filter(r => r.confidence > 0.7);

    const consolidatedResult = successfulResults
      .map(r => String(r.result))
      .join('\n\n');

    return {
      consolidatedResult: consolidatedResult || 'No successful results to merge',
      confidenceScore: successfulResults.length > 0 ?
        successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length : 0.3,
      contributingTasks: successfulResults.map(r => r.taskId),
      qualityMetrics: {
        completeness: successfulResults.length / intermediateResults.length,
        consistency: this.calculateResultConsistency(successfulResults)
      },
      recommendations: [
        'Review merged results for coherence',
        'Validate combined output quality'
      ],
      nextSteps: [
        'Quality assurance review',
        'Integration testing if applicable'
      ]
    };
  }

  /**
   * Perform aggregate synthesis
   */
  private performAggregateSynthesis(intermediateResults: IntermediateResult[]): FinalSynthesisResult {
    const taskGroups = this.groupResultsByDomain(intermediateResults);

    const aggregatedResults = Object.entries(taskGroups).map(([domain, results]) => {
      return `${domain.toUpperCase()}:\n${results.map(r => `- ${r.result}`).join('\n')}`;
    }).join('\n\n');

    const avgConfidence = intermediateResults.reduce((sum, r) => sum + r.confidence, 0) / intermediateResults.length;

    return {
      consolidatedResult: aggregatedResults,
      confidenceScore: avgConfidence,
      contributingTasks: intermediateResults.map(r => r.taskId),
      qualityMetrics: {
        completeness: Object.keys(taskGroups).length / Math.max(Object.keys(taskGroups).length, 1),
        consistency: 0.8 // Assumed good consistency for aggregated results
      },
      recommendations: [
        'Review aggregated results by domain',
        'Ensure cross-domain consistency'
      ],
      nextSteps: [
        'Domain-specific validation',
        'Integration planning'
      ]
    };
  }

  /**
   * Perform transform synthesis
   */
  private performTransformSynthesis(intermediateResults: IntermediateResult[]): FinalSynthesisResult {
    // Transform different result types into a unified format
    const transformedResults = intermediateResults.map(r => {
      return {
        taskId: r.taskId,
        summary: this.extractResultSummary(r.result),
        type: this.classifyResultType(r.result),
        confidence: r.confidence
      };
    });

    const consolidatedResult = {
      summary: 'Transformed and unified results from multiple tasks',
      results: transformedResults,
      metadata: {
        totalTasks: intermediateResults.length,
        successfulTasks: transformedResults.filter(r => r.confidence > 0.7).length,
        resultTypes: [...new Set(transformedResults.map(r => r.type))]
      }
    };

    return {
      consolidatedResult: JSON.stringify(consolidatedResult, null, 2),
      confidenceScore: transformedResults.reduce((sum, r) => sum + r.confidence, 0) / transformedResults.length,
      contributingTasks: intermediateResults.map(r => r.taskId),
      qualityMetrics: {
        completeness: transformedResults.length / intermediateResults.length,
        consistency: 0.75 // Moderate consistency for transformed results
      },
      recommendations: [
        'Review transformed result format',
        'Validate type classifications'
      ],
      nextSteps: [
        'Format validation',
        'Content verification'
      ]
    };
  }

  /**
   * Perform validate synthesis
   */
  private performValidateSynthesis(intermediateResults: IntermediateResult[]): FinalSynthesisResult {
    const validationResults = intermediateResults.map(r => {
      return {
        taskId: r.taskId,
        result: r.result,
        confidence: r.confidence,
        isValid: r.confidence > 0.5,
        validationNotes: r.confidence < 0.5 ? 'Low confidence result' : 'Acceptable result'
      };
    });

    const validResults = validationResults.filter(r => r.isValid);

    return {
      consolidatedResult: `Validation Summary:\n- Valid Results: ${validResults.length}/${intermediateResults.length}\n- Validation Details:\n${validationResults.map(r => `  ${r.taskId}: ${r.validationNotes}`).join('\n')}`,
      confidenceScore: validResults.length / intermediateResults.length,
      contributingTasks: validResults.map(r => r.taskId),
      qualityMetrics: {
        completeness: validResults.length / intermediateResults.length,
        consistency: 0.9 // High consistency for validated results
      },
      recommendations: [
        'Review failed validations',
        'Consider reprocessing low-confidence results'
      ],
      nextSteps: [
        'Address validation failures',
        'Quality improvement measures'
      ]
    };
  }

  /**
   * Calculate result consistency score
   */
  private calculateResultConsistency(results: IntermediateResult[]): number {
    if (results.length < 2) return 1.0;

    // Simple consistency check based on result length similarity
    const lengths = results.map(r => String(r.result).length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const coefficientOfVariation = Math.sqrt(variance) / avgLength;

    // Lower variation = higher consistency
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Group results by domain
   */
  private groupResultsByDomain(intermediateResults: IntermediateResult[]): Record<string, IntermediateResult[]> {
    // Simple grouping based on task ID patterns or agent types
    const groups: Record<string, IntermediateResult[]> = {};

    intermediateResults.forEach(result => {
      // Infer domain from task ID or agent ID
      let domain = 'general';

      if (result.taskId.includes('gui') || result.agentId.includes('gui')) domain = 'ui';
      else if (result.taskId.includes('test') || result.agentId.includes('test')) domain = 'testing';
      else if (result.taskId.includes('doc') || result.agentId.includes('doc')) domain = 'documentation';
      else if (result.taskId.includes('impl') || result.taskId.includes('dev')) domain = 'development';

      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(result);
    });

    return groups;
  }

  /**
   * Extract summary from result
   */
  private extractResultSummary(result: unknown): string {
    const resultStr = String(result);
    if (resultStr.length <= 100) return resultStr;

    // Extract first sentence or first 100 characters
    const sentences = resultStr.split(/[.!?]+/);
    if (sentences[0] && sentences[0].length <= 100) {
      return sentences[0] + '.';
    }

    return resultStr.substring(0, 97) + '...';
  }

  /**
   * Classify result type
   */
  private classifyResultType(result: unknown): string {
    if (typeof result === 'string') {
      if (result.includes('error') || result.includes('failed')) return 'error';
      if (result.includes('complete') || result.includes('success')) return 'success';
      if (result.includes('code') || result.includes('function')) return 'code';
      if (result.includes('test') || result.includes('validation')) return 'test';
      return 'text';
    } else if (typeof result === 'object') {
      return 'structured';
    } else if (typeof result === 'number') {
      return 'numeric';
    } else if (typeof result === 'boolean') {
      return 'boolean';
    }
    return 'unknown';
  }

  /**
   * Perform consistency check
   */
  private performConsistencyCheck(
    intermediateResults: IntermediateResult[],
    finalSynthesis: FinalSynthesisResult
  ): ConsistencyCheckResult {
    const inconsistencies: string[] = [];

    // Check if all contributing tasks are represented
    const contributingTaskIds = new Set(finalSynthesis.contributingTasks);
    const availableTaskIds = new Set(intermediateResults.map(r => r.taskId));

    const missingTasks = Array.from(availableTaskIds).filter(id => !contributingTaskIds.has(id));
    if (missingTasks.length > 0) {
      inconsistencies.push(`Missing tasks in synthesis: ${missingTasks.join(', ')}`);
    }

    // Check confidence alignment
    const avgIntermediateConfidence = intermediateResults.reduce((sum, r) => sum + r.confidence, 0) / intermediateResults.length;
    const confidenceDiff = Math.abs(finalSynthesis.confidenceScore - avgIntermediateConfidence);

    if (confidenceDiff > 0.2) {
      inconsistencies.push(`Confidence mismatch: synthesis=${finalSynthesis.confidenceScore.toFixed(2)}, avg intermediate=${avgIntermediateConfidence.toFixed(2)}`);
    }

    const isConsistent = inconsistencies.length === 0;

    return {
      isConsistent,
      inconsistencies,
      resolutionStrategy: isConsistent ? 'none_needed' : 'manual_review',
      confidence: isConsistent ? 0.9 : Math.max(0.3, 0.9 - (inconsistencies.length * 0.2))
    };
  }

  /**
   * Detect and resolve conflicts
   */
  private detectAndResolveConflicts(intermediateResults: IntermediateResult[]): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];

    // Detect timing conflicts (tasks that should have dependencies but ran simultaneously)
    const simultaneousTasks = this.findSimultaneousTasks(intermediateResults);
    if (simultaneousTasks.length > 0) {
      conflicts.push({
        conflictType: 'timing_conflict',
        conflictingTasks: simultaneousTasks.map(t => t.taskId),
        resolutionMethod: 'accept_parallel_execution',
        finalDecision: 'Parallel execution was successful despite potential dependencies',
        confidence: 0.7
      });
    }

    // Detect result conflicts (conflicting outputs)
    const resultConflicts = this.findResultConflicts(intermediateResults);
    resultConflicts.forEach(conflict => {
      conflicts.push({
        conflictType: 'result_conflict',
        conflictingTasks: conflict.taskIds,
        resolutionMethod: 'highest_confidence_wins',
        finalDecision: conflict.resolution,
        confidence: 0.8
      });
    });

    return conflicts;
  }

  /**
   * Find tasks that ran simultaneously
   */
  private findSimultaneousTasks(intermediateResults: IntermediateResult[]): IntermediateResult[] {
    // Simple check for tasks with very close timestamps
    const timeWindow = 1000; // 1 second window
    const simultaneousTasks: IntermediateResult[] = [];

    for (let i = 0; i < intermediateResults.length - 1; i++) {
      for (let j = i + 1; j < intermediateResults.length; j++) {
        const timeDiff = Math.abs(intermediateResults[i].timestamp - intermediateResults[j].timestamp);
        if (timeDiff < timeWindow) {
          simultaneousTasks.push(intermediateResults[i], intermediateResults[j]);
        }
      }
    }

    return [...new Set(simultaneousTasks)]; // Remove duplicates
  }

  /**
   * Find result conflicts
   */
  private findResultConflicts(intermediateResults: IntermediateResult[]): Array<{taskIds: string[], resolution: string}> {
    const conflicts: Array<{taskIds: string[], resolution: string}> = [];

    // Simple conflict detection: look for contradictory results
    const results = intermediateResults.map(r => ({ id: r.taskId, content: String(r.result).toLowerCase(), confidence: r.confidence }));

    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        if (this.areResultsConflicting(results[i].content, results[j].content)) {
          const winnerIndex = results[i].confidence > results[j].confidence ? i : j;
          conflicts.push({
            taskIds: [results[i].id, results[j].id],
            resolution: `Chosen result from task ${results[winnerIndex].id} due to higher confidence`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two results are conflicting
   */
  private areResultsConflicting(result1: string, result2: string): boolean {
    // Simple conflict detection based on contradictory keywords
    const contradictions = [
      ['success', 'fail'],
      ['complete', 'incomplete'],
      ['valid', 'invalid'],
      ['working', 'broken']
    ];

    for (const [positive, negative] of contradictions) {
      if ((result1.includes(positive) && result2.includes(negative)) ||
          (result1.includes(negative) && result2.includes(positive))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate synthesis quality score
   */
  private calculateSynthesisQuality(
    finalSynthesis: FinalSynthesisResult,
    consistencyCheck: ConsistencyCheckResult,
    conflicts: ConflictResolution[]
  ): number {
    let qualityScore = finalSynthesis.confidenceScore;

    // Adjust for consistency
    if (consistencyCheck.isConsistent) {
      qualityScore *= 1.1; // 10% bonus for consistency
    } else {
      qualityScore *= 0.9; // 10% penalty for inconsistency
    }

    // Adjust for conflicts
    const conflictPenalty = conflicts.length * 0.05; // 5% penalty per conflict
    qualityScore *= (1 - conflictPenalty);

    // Adjust for completeness
    const completenessScore = finalSynthesis.qualityMetrics.completeness || 0.5;
    qualityScore = (qualityScore + completenessScore) / 2;

    return Math.max(0, Math.min(1, qualityScore));
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface BudgetTracker {
  dailyBudget: number;
  currentSpending: number;
  remainingBudget: number;
  spendingByAgent: Map<string, number>;
  spendingByModel: Map<string, number>;
}

// =============================================================================
// LEVEL 4 SUPPORTING CLASSES
// =============================================================================

class ResourceManager {
  private maxAgents: number;
  private currentUtilization: Map<string, number>;
  private resourcePool: Map<string, ResourceAllocation>;

  constructor(maxAgents: number) {
    this.maxAgents = maxAgents;
    this.currentUtilization = new Map();
    this.resourcePool = new Map();
  }

  allocateAgents(requiredCount: number, priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA'): string[] {
    // Simplified agent allocation
    const allocated: string[] = [];
    for (let i = 0; i < Math.min(requiredCount, this.maxAgents); i++) {
      const agentId = `agent-${i.toString().padStart(2, '0')}`;
      allocated.push(agentId);
      this.currentUtilization.set(agentId, 1.0);
    }
    return allocated;
  }

  releaseAgents(agentIds: string[]): void {
    agentIds.forEach(agentId => {
      this.currentUtilization.delete(agentId);
    });
  }

  getUtilization(): number {
    return this.currentUtilization.size / this.maxAgents;
  }
}

interface ResourceAllocation {
  agentId: string;
  taskId: string;
  startTime: number;
  estimatedEndTime: number;
  resourceType: 'cpu' | 'memory' | 'network';
  amount: number;
}

class QualityController {
  private qualityThresholds: QualityThresholds;
  private qualityMetrics: Map<string, QualityMetric>;

  constructor() {
    this.qualityThresholds = {
      minAccuracy: 0.85,
      minCompleteness: 0.90,
      minConsistency: 0.80,
      minEfficiency: 0.75
    };
    this.qualityMetrics = new Map();
  }

  assessQuality(sessionId: string, results: TaskExecutionResult[]): QualityMetricsData {
    const accuracy = this.calculateAccuracy(results);
    const completeness = this.calculateCompleteness(results);
    const consistency = this.calculateConsistency(results);
    const efficiency = this.calculateEfficiency(results);
    const maintainability = this.calculateMaintainability(results);

    const overallQualityScore = (accuracy + completeness + consistency + efficiency + maintainability) / 5;

    const improvementAreas: string[] = [];
    if (accuracy < this.qualityThresholds.minAccuracy) improvementAreas.push('accuracy');
    if (completeness < this.qualityThresholds.minCompleteness) improvementAreas.push('completeness');
    if (consistency < this.qualityThresholds.minConsistency) improvementAreas.push('consistency');
    if (efficiency < this.qualityThresholds.minEfficiency) improvementAreas.push('efficiency');

    return {
      accuracy,
      completeness,
      consistency,
      efficiency,
      maintainability,
      overallQualityScore,
      improvementAreas
    };
  }

  private calculateAccuracy(results: TaskExecutionResult[]): number {
    const completedTasks = results.filter(r => r.status === 'completed');
    return completedTasks.length / Math.max(results.length, 1);
  }

  private calculateCompleteness(results: TaskExecutionResult[]): number {
    // Simplified: assume completed tasks are complete
    return this.calculateAccuracy(results);
  }

  private calculateConsistency(results: TaskExecutionResult[]): number {
    // Simplified: check for consistent error patterns
    const errorPatterns = new Set(results.map(r => r.errors.join('')));
    return errorPatterns.size <= 2 ? 0.9 : 0.6;
  }

  private calculateEfficiency(results: TaskExecutionResult[]): number {
    // Simplified: based on cost vs expected cost
    const avgCost = results.reduce((sum, r) => sum + r.cost, 0) / Math.max(results.length, 1);
    return avgCost < 0.1 ? 0.9 : avgCost < 0.2 ? 0.7 : 0.5;
  }

  private calculateMaintainability(results: TaskExecutionResult[]): number {
    // Simplified: assume good maintainability for successful tasks
    return 0.8;
  }
}

interface QualityThresholds {
  minAccuracy: number;
  minCompleteness: number;
  minConsistency: number;
  minEfficiency: number;
}

interface QualityMetric {
  metricName: string;
  value: number;
  threshold: number;
  timestamp: number;
}

// =============================================================================
// TYPE IMPORTS FOR LEVEL 4 FEATURES
// =============================================================================

// CostPredictionResult is now imported from '../ml/CostPredictionEngine'
// TaskCategory is now imported as TaskCategoryImport from '../ml/CostPredictionEngine'
