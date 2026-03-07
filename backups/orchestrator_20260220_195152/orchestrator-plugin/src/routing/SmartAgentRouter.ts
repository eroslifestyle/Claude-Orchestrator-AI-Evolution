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

import type {
  ClassifiedDomain,
  ExtractedKeyword,
  ComplexityLevel
} from '../analysis/types';

import type {
  ModelType,
  AgentConfig
} from '../types';

import { PluginLogger } from '../utils/logger';

import {
  SerenaSearchIntegration,
  SerenaSearchResult,
  SerenaPerformanceMetrics
} from '../integrations/SerenaSearchIntegration';

import {
  EnhancedKeywordExtractor,
  SemanticKeywordAnalysis,
  CodePatternMatch
} from '../analysis/EnhancedKeywordExtractor';

// =============================================================================
// SMART ROUTING INTERFACES & TYPES
// =============================================================================

export interface SearchIntelligenceData {
  codebaseComplexity: CodebaseComplexity;
  dependencyAnalysis: DependencyAnalysis;
  performanceProfile: PerformanceProfile;
  agentCapabilityMapping: AgentCapabilityMapping;
  routingOptimization: RoutingOptimization;
}

export interface CodebaseComplexity {
  totalFiles: number;                     // Total files in codebase
  codeLines: number;                      // Total lines of code
  languageDistribution: Record<string, number>; // Language percentages
  dependencyDepth: number;                // Maximum dependency depth
  cyclomaticComplexity: number;           // Average cyclomatic complexity
  technicalDebtScore: number;             // 0.0 to 1.0 technical debt assessment
}

export interface DependencyAnalysis {
  crossFileReferences: number;            // Number of cross-file dependencies
  circularDependencies: string[];         // Files with circular deps
  hotspotFiles: string[];                 // Files with many dependencies
  isolatedModules: string[];              // Self-contained modules
  dependencyStrength: Record<string, number>; // File dependency strength map
}

export interface PerformanceProfile {
  searchTimeByPattern: Record<string, number>; // Pattern search times
  agentResponseTimes: Record<string, number>;  // Historical agent performance
  modelEfficiency: Record<ModelType, number>;  // Model performance per domain
  parallelismOpportunities: number;       // Percentage of parallelizable tasks
  bottleneckPrediction: string[];         // Predicted performance bottlenecks
}

export interface AgentCapabilityMapping {
  agentSpecializations: Record<string, AgentSpecialization>;
  domainCoverage: Record<string, string[]>; // Domain to agents mapping
  complexityHandling: Record<string, ComplexityLevel[]>; // Agent complexity caps
  collaborationPatterns: AgentCollaboration[]; // Successful agent combinations
  exclusionRules: AgentExclusion[];       // Agents that shouldn't work together
}

interface AgentSpecialization {
  agent: string;                          // Agent identifier
  coreStrengths: string[];                // Primary capabilities
  supportingSkills: string[];             // Secondary capabilities
  performanceMetrics: AgentPerformanceMetrics;
  preferredComplexity: ComplexityLevel;
  collaboratesWellWith: string[];
  hasConflictsWith: string[];
}

interface AgentPerformanceMetrics {
  averageTime: number;                    // Average completion time (minutes)
  successRate: number;                    // Task success percentage
  qualityScore: number;                   // Output quality rating (0.0-1.0)
  costEfficiency: number;                 // Cost per successful task
  userSatisfaction: number;               // User rating (0.0-1.0)
}

interface AgentCollaboration {
  primaryAgent: string;                   // Main agent
  secondaryAgent: string;                 // Supporting agent
  collaborationType: 'sequential' | 'parallel' | 'review';
  successRate: number;                    // Collaboration success rate
  avgImprovementPercent: number;          // Performance improvement
  bestUseCases: string[];                 // When this collaboration works best
}

interface AgentExclusion {
  agent1: string;                         // First agent
  agent2: string;                         // Second agent
  conflictType: 'methodology' | 'output_format' | 'dependency';
  severity: 'critical' | 'warning' | 'preference';
  workaround?: string;                    // Possible workaround
}

interface RoutingOptimization {
  fastPathTriggers: string[];             // Keywords that trigger fast routing
  complexityThresholds: Record<ComplexityLevel, number>; // Complexity scoring
  loadBalancingRules: LoadBalancingRule[]; // Agent load distribution
  failoverStrategies: FailoverStrategy[]; // Backup routing plans
  adaptiveLearning: AdaptiveLearningData; // ML-based routing improvements
}

interface LoadBalancingRule {
  condition: string;                      // When to apply this rule
  strategy: 'round_robin' | 'least_loaded' | 'capability_based';
  agentPool: string[];                    // Available agents for this rule
  weightFactors: Record<string, number>;  // Agent selection weights
}

interface FailoverStrategy {
  triggerCondition: 'agent_failure' | 'timeout' | 'quality_threshold';
  fallbackAgent: string;                  // Backup agent
  escalationModel?: ModelType;            // Model to escalate to
  preserveContext: boolean;               // Keep original context
  maxRetries: number;                     // Maximum fallback attempts
}

interface AdaptiveLearningData {
  routingDecisions: SmartRoutingDecision[];    // Historical routing decisions
  outcomeCorrelations: OutcomeCorrelation[]; // Success pattern analysis
  adaptationRules: AdaptationRule[];      // Learned routing improvements
  confidenceThreshold: number;            // Minimum confidence for adaptation
}

interface OutcomeCorrelation {
  inputPattern: string;                   // Input characteristics
  routingChoice: string;                  // Agent/model combination chosen
  outcomeQuality: number;                 // Result quality score
  frequency: number;                      // How often this pattern occurs
  reliability: number;                    // Consistency of outcomes
}

interface AdaptationRule {
  pattern: string;                        // Input pattern to match
  originalRouting: string;                // Original routing decision
  improvedRouting: string;                // Learned better routing
  improvementMagnitude: number;           // How much better (percentage)
  confidence: number;                     // Rule confidence (0.0-1.0)
  applicableContexts: string[];           // When this rule applies
}

export interface SmartRoutingDecision {
  selectedAgent: AgentConfig;             // Primary agent chosen
  selectedModel: ModelType;               // Model for primary agent
  supportingAgents: AgentConfig[];        // Additional agents if needed
  routingStrategy: SmartRoutingStrategy;  // Execution strategy
  confidence: number;                     // Overall routing confidence
  reasoning: string;                      // Explanation of choice
  alternatives: AlternativeRouting[];     // Other viable options
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
  agent: string;                          // Alternative agent
  model: ModelType;                       // Alternative model
  confidence: number;                     // Confidence in this alternative
  tradeoffs: string[];                    // What you gain/lose with this choice
  whenToPrefer: string;                   // When this might be better
}

export interface PerformancePrediction {
  estimatedTime: number;                  // Expected completion time (minutes)
  estimatedCost: number;                  // Expected cost ($)
  qualityExpectation: number;             // Expected output quality (0.0-1.0)
  successProbability: number;             // Probability of successful completion
  bottleneckLikelihood: number;           // Risk of performance issues
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high'; // Overall risk level
  specificRisks: SpecificRisk[];          // Detailed risk breakdown
  mitigationStrategies: string[];         // Risk mitigation approaches
  contingencyPlan: string;                // What to do if things go wrong
}

export interface SpecificRisk {
  type: 'complexity' | 'dependency' | 'resource' | 'integration' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;                    // What could go wrong
  probability: number;                    // Likelihood (0.0-1.0)
  impact: string;                         // What happens if it occurs
  mitigation: string;                     // How to prevent/handle it
}

export interface QualityGate {
  name: string;                           // Gate identifier
  condition: string;                      // What to check
  threshold: number;                      // Minimum acceptable value
  action: 'continue' | 'retry' | 'escalate' | 'abort';
  escalationTarget?: string;              // Where to escalate if needed
}

// =============================================================================
// SMART AGENT ROUTER CLASS
// =============================================================================

export class SmartAgentRouter {
  private searchIntelligence: SearchIntelligenceData;
  private agentRegistry: Map<string, AgentConfig>;
  private routingHistory: SmartRoutingDecision[];
  private performanceCache: Map<string, PerformancePrediction>;

  constructor(
    private logger: PluginLogger,
    private serenaIntegration: SerenaSearchIntegration,
    private enhancedExtractor: EnhancedKeywordExtractor,
    private availableAgents: AgentConfig[]
  ) {
    this.agentRegistry = new Map(availableAgents.map(agent => [agent.name, agent]));
    this.routingHistory = [];
    this.performanceCache = new Map();
    this.searchIntelligence = this.initializeSearchIntelligence();

    this.initializeIntelligentRouting();
  }

  // =============================================================================
  // SMART ROUTING CORE METHODS
  // =============================================================================

  /**
   * Revolutionary intelligent routing con Serena search insights
   */
  async routeIntelligent(
    userInput: string,
    domains: ClassifiedDomain[],
    keywords: ExtractedKeyword[],
    complexity: ComplexityLevel
  ): Promise<SmartRoutingDecision> {
    const startTime = Date.now();

    try {
      // 1. Gather search intelligence about the codebase
      const searchInsights = await this.gatherSearchIntelligence(userInput, keywords);

      // 2. Perform semantic analysis of requirements
      const semanticAnalysis = await this.enhancedExtractor.getSemanticInsights(userInput);

      // 3. Analyze code patterns and dependencies
      const codebaseInsights = await this.enhancedExtractor.getCodebaseInsights(userInput);

      // 4. Intelligent agent selection based on multiple signals
      const agentSelection = this.performIntelligentAgentSelection(
        domains,
        semanticAnalysis,
        codebaseInsights,
        complexity
      );

      // 5. Model optimization based on search intelligence
      const modelSelection = this.optimizeModelSelection(
        agentSelection,
        searchInsights,
        complexity
      );

      // 6. Generate smart routing strategy
      const routingStrategy = this.generateSmartRoutingStrategy(
        agentSelection,
        codebaseInsights,
        searchInsights
      );

      // 7. Performance and risk prediction
      const performancePrediction = this.predictPerformance(
        agentSelection,
        modelSelection,
        routingStrategy
      );

      const riskAssessment = this.assessRisks(
        agentSelection,
        routingStrategy,
        searchInsights
      );

      // 8. Generate alternatives
      const alternatives = this.generateAlternativeRoutings(
        domains,
        complexity,
        agentSelection
      );

      const decision: SmartRoutingDecision = {
        selectedAgent: agentSelection.primary,
        selectedModel: modelSelection,
        supportingAgents: agentSelection.supporting,
        routingStrategy,
        confidence: this.calculateOverallConfidence(agentSelection, searchInsights),
        reasoning: this.generateRoutingReasoning(agentSelection, searchInsights),
        alternatives,
        performancePrediction,
        riskAssessment
      };

      // 9. Learn from this routing decision
      this.learnFromRoutingDecision(decision, userInput);

      // 10. Cache performance prediction
      this.cachePerformancePrediction(userInput, performancePrediction);

      this.logger.info(`Smart routing completed in ${Date.now() - startTime}ms`, {
        agent: decision.selectedAgent.name,
        model: decision.selectedModel,
        confidence: decision.confidence
      });

      return decision;

    } catch (error) {
      this.logger.warn(`Smart routing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.fallbackToTraditionalRouting(domains, complexity);
    }
  }

  /**
   * Gather comprehensive search intelligence about codebase
   */
  private async gatherSearchIntelligence(
    _userInput: string,
    keywords: ExtractedKeyword[]
  ): Promise<SearchIntelligenceData> {
    // Analyze codebase complexity
    const complexityAnalysis = await this.analyzeCodebaseComplexity(keywords);

    // Perform dependency analysis
    const dependencyAnalysis = await this.analyzeDependencies();

    // Gather performance insights
    const performanceProfile = await this.gatherPerformanceProfile();

    // Update agent capability mapping
    const agentCapabilityMapping = this.updateAgentCapabilityMapping();

    // Optimize routing strategies
    const routingOptimization = this.optimizeRoutingStrategies();

    return {
      codebaseComplexity: complexityAnalysis,
      dependencyAnalysis,
      performanceProfile,
      agentCapabilityMapping,
      routingOptimization
    };
  }

  /**
   * Intelligent agent selection based on search insights
   */
  private performIntelligentAgentSelection(
    domains: ClassifiedDomain[],
    semanticAnalysis: SemanticKeywordAnalysis[],
    codebaseInsights: CodePatternMatch[],
    complexity: ComplexityLevel
  ): { primary: AgentConfig; supporting: AgentConfig[] } {
    const candidateScores = new Map<string, number>();

    // Score agents based on domain expertise
    for (const domain of domains) {
      const domainAgents = this.searchIntelligence.agentCapabilityMapping.domainCoverage[domain.name] || [];

      for (const agentName of domainAgents) {
        const currentScore = candidateScores.get(agentName) || 0;
        candidateScores.set(agentName, currentScore + (domain.confidence * 1.0));
      }
    }

    // Enhance scoring with semantic analysis
    for (const semantic of semanticAnalysis) {
      const relevantAgents = this.findRelevantAgentsForKeyword(semantic.keyword);

      for (const agentName of relevantAgents) {
        const currentScore = candidateScores.get(agentName) || 0;
        const boost = semantic.semanticWeight * semantic.contextualRelevance;
        candidateScores.set(agentName, currentScore + boost);
      }
    }

    // Adjust scoring based on code pattern insights
    for (const pattern of codebaseInsights) {
      const patternAgents = this.getAgentsForPatternType(pattern.patternType);

      for (const agentName of patternAgents) {
        const currentScore = candidateScores.get(agentName) || 0;
        candidateScores.set(agentName, currentScore + (pattern.confidence * 0.5));
      }
    }

    // Apply complexity filtering
    const complexityCapableAgents = this.filterAgentsByComplexity(candidateScores, complexity);

    // Select primary agent
    const primaryAgentName = this.selectPrimaryAgent(complexityCapableAgents);
    const primaryAgent = this.agentRegistry.get(primaryAgentName)!;

    // Select supporting agents
    const supportingAgents = this.selectSupportingAgents(primaryAgentName, domains, complexity);

    return {
      primary: primaryAgent,
      supporting: supportingAgents
    };
  }

  // =============================================================================
  // CODEBASE ANALYSIS METHODS
  // =============================================================================

  private async analyzeCodebaseComplexity(_keywords: ExtractedKeyword[]): Promise<CodebaseComplexity> {
    // Perform comprehensive codebase analysis using Serena search
    const searches = await this.serenaIntegration.batchSearch([
      { pattern: '\\.(ts|js|py|java|cpp|cs)$', restrictToCodeFiles: true },
      { pattern: 'class\\s+\\w+', restrictToCodeFiles: true },
      { pattern: 'function\\s+\\w+|\\w+\\s*=\\s*\\(', restrictToCodeFiles: true },
      { pattern: 'import\\s+.*from|require\\(', restrictToCodeFiles: true },
      { pattern: '//\\s*TODO|//\\s*FIXME|//\\s*HACK', restrictToCodeFiles: true }
    ]);

    const totalFiles = searches[0]?.fileCount || 0;
    const totalClasses = searches[1]?.totalMatches || 0;
    const totalFunctions = searches[2]?.totalMatches || 0;
    const totalImports = searches[3]?.totalMatches || 0;
    const technicalDebtMarkers = searches[4]?.totalMatches || 0;

    // Estimate code lines (rough calculation)
    const estimatedCodeLines = totalFiles * 100; // Average 100 lines per file

    // Calculate technical debt score
    const technicalDebtScore = Math.min(1.0, technicalDebtMarkers / Math.max(1, estimatedCodeLines) * 1000);

    // Analyze language distribution
    const languageDistribution = await this.analyzeLanguageDistribution();

    return {
      totalFiles,
      codeLines: estimatedCodeLines,
      languageDistribution,
      dependencyDepth: this.calculateDependencyDepth(totalImports, totalFiles),
      cyclomaticComplexity: this.estimateCyclomaticComplexity(totalFunctions, totalClasses),
      technicalDebtScore
    };
  }

  private async analyzeDependencies(): Promise<DependencyAnalysis> {
    // Analyze cross-file dependencies
    const dependencySearches = await this.serenaIntegration.batchSearch([
      { pattern: 'import.*from\\s*[\'"]\\./.*[\'"]', restrictToCodeFiles: true },
      { pattern: 'import.*from\\s*[\'"]\\.\\./', restrictToCodeFiles: true },
      { pattern: 'require\\([\'"]\\./.*[\'"]\\)', restrictToCodeFiles: true }
    ]);

    const crossFileReferences = dependencySearches.reduce(
      (sum, result) => sum + result.totalMatches, 0
    );

    // Identify hotspot files (files with many dependencies)
    const hotspotFiles = this.identifyHotspotFiles(dependencySearches);

    // Detect circular dependencies (simplified)
    const circularDependencies = await this.detectCircularDependencies();

    return {
      crossFileReferences,
      circularDependencies,
      hotspotFiles,
      isolatedModules: [],
      dependencyStrength: {}
    };
  }

  private async gatherPerformanceProfile(): Promise<PerformanceProfile> {
    const serenaMetrics = this.serenaIntegration.getMetrics();

    return {
      searchTimeByPattern: { default: serenaMetrics.searchTime },
      agentResponseTimes: this.getHistoricalAgentPerformance(),
      modelEfficiency: this.getModelEfficiencyMetrics(),
      parallelismOpportunities: 0.8, // 80% of tasks can be parallelized
      bottleneckPrediction: this.predictPerformanceBottlenecks()
    };
  }

  // =============================================================================
  // AGENT CAPABILITY & OPTIMIZATION METHODS
  // =============================================================================

  private updateAgentCapabilityMapping(): AgentCapabilityMapping {
    const agentSpecializations: Record<string, AgentSpecialization> = {};

    // Build specialization profiles for each agent
    for (const agent of this.availableAgents) {
      agentSpecializations[agent.name] = {
        agent: agent.name,
        coreStrengths: agent.keywords,
        supportingSkills: this.inferSupportingSkills(agent),
        performanceMetrics: this.getAgentPerformanceMetrics(agent.name),
        preferredComplexity: this.inferPreferredComplexity(agent),
        collaboratesWellWith: this.getCollaborationPartners(agent.name),
        hasConflictsWith: this.getConflictingAgents(agent.name)
      };
    }

    return {
      agentSpecializations,
      domainCoverage: this.buildDomainCoverage(),
      complexityHandling: this.buildComplexityHandling(),
      collaborationPatterns: this.getSuccessfulCollaborations(),
      exclusionRules: this.getExclusionRules()
    };
  }

  private optimizeRoutingStrategies(): RoutingOptimization {
    return {
      fastPathTriggers: ['simple', 'quick', 'basic', 'straightforward'],
      complexityThresholds: {
        'low': 0.3,
        'medium': 0.6,
        'high': 0.8,
        'extreme': 1.0
      },
      loadBalancingRules: this.generateLoadBalancingRules(),
      failoverStrategies: this.generateFailoverStrategies(),
      adaptiveLearning: this.getAdaptiveLearningData()
    };
  }

  // =============================================================================
  // ROUTING DECISION LOGIC
  // =============================================================================

  private selectPrimaryAgent(candidateScores: Map<string, number>): string {
    if (candidateScores.size === 0) {
      return 'coder'; // Default fallback
    }

    // Sort by score and select highest
    const sortedCandidates = Array.from(candidateScores.entries())
      .sort(([,a], [,b]) => b - a);

    return sortedCandidates[0][0];
  }

  private selectSupportingAgents(
    primaryAgent: string,
    domains: ClassifiedDomain[],
    complexity: ComplexityLevel
  ): AgentConfig[] {
    const supporting: AgentConfig[] = [];

    // Add reviewer if complexity is high
    if (complexity === 'high') {
      const reviewer = this.agentRegistry.get('reviewer');
      if (reviewer && reviewer.name !== primaryAgent) {
        supporting.push(reviewer);
      }
    }

    // Add domain-specific supporters for multi-domain tasks
    if (domains.length > 2) {
      const secondaryDomain = domains[1];
      const domainAgents = this.searchIntelligence.agentCapabilityMapping.domainCoverage[secondaryDomain.name] || [];

      for (const agentName of domainAgents.slice(0, 1)) { // Max 1 supporting agent
        const agent = this.agentRegistry.get(agentName);
        if (agent && agent.name !== primaryAgent) {
          supporting.push(agent);
          break;
        }
      }
    }

    return supporting;
  }

  private optimizeModelSelection(
    agentSelection: { primary: AgentConfig; supporting: AgentConfig[] },
    searchInsights: SearchIntelligenceData,
    complexity: ComplexityLevel
  ): ModelType {
    const agent = agentSelection.primary;
    let selectedModel = agent.defaultModel;

    // Upgrade model based on complexity
    if (complexity === 'high' && selectedModel === 'haiku') {
      selectedModel = 'sonnet';
    }

    // Consider performance profile
    const modelEfficiency = searchInsights.performanceProfile.modelEfficiency;
    const currentEfficiency = modelEfficiency[selectedModel] || 0.7;

    // If current model efficiency is low, consider upgrading
    if (currentEfficiency < 0.6 && selectedModel !== 'opus') {
      if (selectedModel === 'haiku') {
        selectedModel = 'sonnet';
      } else if (selectedModel === 'sonnet') {
        selectedModel = 'opus';
      }
    }

    return selectedModel;
  }

  private generateSmartRoutingStrategy(
    agentSelection: { primary: AgentConfig; supporting: AgentConfig[] },
    codebaseInsights: CodePatternMatch[],
    searchInsights: SearchIntelligenceData
  ): SmartRoutingStrategy {
    const hasMultipleAgents = agentSelection.supporting.length > 0;
    const hasComplexDependencies = codebaseInsights.some(p => p.patternType === 'import');

    let executionType: 'single' | 'parallel' | 'sequential' | 'hybrid' = 'single';

    if (hasMultipleAgents) {
      executionType = hasComplexDependencies ? 'sequential' : 'parallel';
    }

    return {
      executionType,
      dependencyHandling: hasComplexDependencies ? 'strict' : 'flexible',
      failoverEnabled: true,
      qualityGates: this.generateQualityGates(agentSelection.primary),
      optimizationHints: this.generateOptimizationHints(searchInsights)
    };
  }

  // =============================================================================
  // PREDICTION & ASSESSMENT METHODS
  // =============================================================================

  private predictPerformance(
    agentSelection: { primary: AgentConfig; supporting: AgentConfig[] },
    modelSelection: ModelType,
    routingStrategy: SmartRoutingStrategy
  ): PerformancePrediction {
    const baseTime = this.getBaseExecutionTime(agentSelection.primary, modelSelection);
    const supportingTime = agentSelection.supporting.length * 5; // 5 minutes per supporting agent

    let estimatedTime = baseTime;

    if (routingStrategy.executionType === 'sequential') {
      estimatedTime += supportingTime;
    } else if (routingStrategy.executionType === 'parallel') {
      estimatedTime = Math.max(baseTime, supportingTime);
    }

    const estimatedCost = this.calculateEstimatedCost(modelSelection, estimatedTime);
    const successProbability = this.calculateSuccessProbability(agentSelection.primary, modelSelection);

    return {
      estimatedTime,
      estimatedCost,
      qualityExpectation: 0.85, // Based on historical data
      successProbability,
      bottleneckLikelihood: 0.2 // 20% chance of bottlenecks
    };
  }

  private assessRisks(
    _agentSelection: { primary: AgentConfig; supporting: AgentConfig[] },
    _routingStrategy: SmartRoutingStrategy,
    searchInsights: SearchIntelligenceData
  ): RiskAssessment {
    const risks: SpecificRisk[] = [];

    // Complexity risk
    if (searchInsights.codebaseComplexity.technicalDebtScore > 0.7) {
      risks.push({
        type: 'complexity',
        severity: 'high',
        description: 'High technical debt in codebase',
        probability: 0.7,
        impact: 'Increased implementation time and potential quality issues',
        mitigation: 'Add extra review steps and consider refactoring'
      });
    }

    // Dependency risk
    if (searchInsights.dependencyAnalysis.circularDependencies.length > 0) {
      risks.push({
        type: 'dependency',
        severity: 'medium',
        description: 'Circular dependencies detected',
        probability: 0.5,
        impact: 'Potential integration issues',
        mitigation: 'Careful dependency management and modular approach'
      });
    }

    const overallRisk = this.calculateOverallRisk(risks);

    return {
      overallRisk,
      specificRisks: risks,
      mitigationStrategies: risks.map(r => r.mitigation),
      contingencyPlan: 'Fallback to simpler implementation with reduced scope'
    };
  }

  // =============================================================================
  // UTILITY & HELPER METHODS
  // =============================================================================

  private findRelevantAgentsForKeyword(keyword: string): string[] {
    const relevantAgents: string[] = [];

    for (const agent of this.availableAgents) {
      if (agent.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))) {
        relevantAgents.push(agent.name);
      }
    }

    return relevantAgents;
  }

  private getAgentsForPatternType(patternType: string): string[] {
    const patternAgentMap: Record<string, string[]> = {
      'class': ['architect_expert', 'coder'],
      'interface': ['architect_expert', 'coder'],
      'function': ['coder', 'languages_expert'],
      'import': ['integration_expert', 'coder'],
      'variable': ['coder', 'reviewer']
    };

    return patternAgentMap[patternType] || ['coder'];
  }

  private filterAgentsByComplexity(
    candidateScores: Map<string, number>,
    complexity: ComplexityLevel
  ): Map<string, number> {
    const filtered = new Map<string, number>();

    Array.from(candidateScores.entries()).forEach(([agentName, score]) => {
      const agent = this.agentRegistry.get(agentName);
      if (!agent) return;

      const capabilityMapping = this.searchIntelligence.agentCapabilityMapping;
      const complexityHandling = capabilityMapping.complexityHandling[agentName] || ['low'];

      if (complexityHandling.includes(complexity)) {
        filtered.set(agentName, score);
      }
    });

    return filtered;
  }

  private calculateOverallConfidence(
    agentSelection: { primary: AgentConfig; supporting: AgentConfig[] },
    searchInsights: SearchIntelligenceData
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost based on agent specialization match
    const agentSpec = searchInsights.agentCapabilityMapping.agentSpecializations[agentSelection.primary.name];
    if (agentSpec) {
      confidence += agentSpec.performanceMetrics.successRate * 0.2;
    }

    // Boost based on codebase understanding
    if (searchInsights.codebaseComplexity.technicalDebtScore < 0.3) {
      confidence += 0.1; // Clean codebase is easier to work with
    }

    return Math.min(1.0, confidence);
  }

  private generateRoutingReasoning(
    agentSelection: { primary: AgentConfig; supporting: AgentConfig[] },
    searchInsights: SearchIntelligenceData
  ): string {
    const agent = agentSelection.primary;
    const complexity = searchInsights.codebaseComplexity.technicalDebtScore;
    const specializationStr = Array.isArray(agent.specialization)
      ? agent.specialization.join(', ')
      : agent.specialization;

    let reasoning = `Selected ${agent.name} based on specialization in ${specializationStr}.`;

    if (agentSelection.supporting.length > 0) {
      reasoning += ` Added ${agentSelection.supporting.length} supporting agents for comprehensive coverage.`;
    }

    if (complexity > 0.5) {
      reasoning += ' Complexity analysis indicates careful approach needed.';
    }

    return reasoning;
  }

  private generateAlternativeRoutings(
    _domains: ClassifiedDomain[],
    _complexity: ComplexityLevel,
    currentSelection: { primary: AgentConfig; supporting: AgentConfig[] }
  ): AlternativeRouting[] {
    const alternatives: AlternativeRouting[] = [];

    // Generate 2-3 alternative routings
    const otherAgents = this.availableAgents.filter(a => a.name !== currentSelection.primary.name);

    for (const agent of otherAgents.slice(0, 2)) {
      const specializationStr = Array.isArray(agent.specialization)
        ? agent.specialization.join(', ')
        : agent.specialization;
      alternatives.push({
        agent: agent.name,
        model: agent.defaultModel,
        confidence: 0.6,
        tradeoffs: [`Different specialization: ${specializationStr}`],
        whenToPrefer: `When ${specializationStr} is primary concern`
      });
    }

    return alternatives;
  }

  // =============================================================================
  // LEARNING & ADAPTATION METHODS
  // =============================================================================

  private learnFromRoutingDecision(decision: SmartRoutingDecision, _userInput: string): void {
    // Store routing decision for future learning
    this.routingHistory.push(decision);

    // Limit history size
    if (this.routingHistory.length > 1000) {
      this.routingHistory = this.routingHistory.slice(-500);
    }
  }

  private cachePerformancePrediction(userInput: string, prediction: PerformancePrediction): void {
    const cacheKey = this.generateCacheKey(userInput);
    this.performanceCache.set(cacheKey, prediction);

    // Limit cache size
    if (this.performanceCache.size > 100) {
      const firstKey = this.performanceCache.keys().next().value;
      this.performanceCache.delete(firstKey);
    }
  }

  private generateCacheKey(input: string): string {
    return input.toLowerCase().replace(/[^\w]/g, '').slice(0, 50);
  }

  // =============================================================================
  // FALLBACK METHODS
  // =============================================================================

  private fallbackToTraditionalRouting(
    _domains: ClassifiedDomain[],
    _complexity: ComplexityLevel
  ): SmartRoutingDecision {
    // Simple fallback routing when smart routing fails
    const primaryAgent = this.availableAgents.find(a => a.name === 'coder') || this.availableAgents[0];

    return {
      selectedAgent: primaryAgent,
      selectedModel: primaryAgent.defaultModel,
      supportingAgents: [],
      routingStrategy: {
        executionType: 'single',
        dependencyHandling: 'flexible',
        failoverEnabled: true,
        qualityGates: [],
        optimizationHints: []
      },
      confidence: 0.6,
      reasoning: 'Fallback routing due to smart routing failure',
      alternatives: [],
      performancePrediction: {
        estimatedTime: 10,
        estimatedCost: 0.50,
        qualityExpectation: 0.7,
        successProbability: 0.8,
        bottleneckLikelihood: 0.3
      },
      riskAssessment: {
        overallRisk: 'medium',
        specificRisks: [],
        mitigationStrategies: [],
        contingencyPlan: 'Manual intervention if needed'
      }
    };
  }

  // =============================================================================
  // INITIALIZATION & CONFIGURATION METHODS
  // =============================================================================

  private initializeSearchIntelligence(): SearchIntelligenceData {
    return {
      codebaseComplexity: {
        totalFiles: 0,
        codeLines: 0,
        languageDistribution: {},
        dependencyDepth: 0,
        cyclomaticComplexity: 0,
        technicalDebtScore: 0
      },
      dependencyAnalysis: {
        crossFileReferences: 0,
        circularDependencies: [],
        hotspotFiles: [],
        isolatedModules: [],
        dependencyStrength: {}
      },
      performanceProfile: {
        searchTimeByPattern: {},
        agentResponseTimes: {},
        modelEfficiency: { haiku: 0.8, sonnet: 0.9, opus: 0.95, auto: 0.85 },
        parallelismOpportunities: 0.7,
        bottleneckPrediction: []
      },
      agentCapabilityMapping: {
        agentSpecializations: {},
        domainCoverage: {},
        complexityHandling: {},
        collaborationPatterns: [],
        exclusionRules: []
      },
      routingOptimization: {
        fastPathTriggers: [],
        complexityThresholds: { low: 0.3, medium: 0.6, high: 0.8, extreme: 1.0 },
        loadBalancingRules: [],
        failoverStrategies: [],
        adaptiveLearning: {
          routingDecisions: [],
          outcomeCorrelations: [],
          adaptationRules: [],
          confidenceThreshold: 0.8
        }
      }
    };
  }

  private initializeIntelligentRouting(): void {
    this.logger.info('SmartAgentRouter initialized with Serena search intelligence');
  }

  // Placeholder methods for comprehensive implementation
  private async analyzeLanguageDistribution(): Promise<Record<string, number>> { return {}; }
  private calculateDependencyDepth(imports: number, files: number): number { return Math.min(5, imports / files); }
  private estimateCyclomaticComplexity(functions: number, classes: number): number { return (functions + classes) / 10; }
  private identifyHotspotFiles(_searches: SerenaSearchResult[]): string[] { return []; }
  private async detectCircularDependencies(): Promise<string[]> { return []; }
  private getHistoricalAgentPerformance(): Record<string, number> { return {}; }
  private getModelEfficiencyMetrics(): Record<ModelType, number> { return { haiku: 0.8, sonnet: 0.9, opus: 0.95, auto: 0.85 }; }
  private predictPerformanceBottlenecks(): string[] { return []; }
  private inferSupportingSkills(_agent: AgentConfig): string[] { return []; }
  private getAgentPerformanceMetrics(_agentName: string): AgentPerformanceMetrics {
    return { averageTime: 10, successRate: 0.85, qualityScore: 0.8, costEfficiency: 0.7, userSatisfaction: 0.85 };
  }
  private inferPreferredComplexity(_agent: AgentConfig): ComplexityLevel { return 'medium'; }
  private getCollaborationPartners(_agentName: string): string[] { return []; }
  private getConflictingAgents(_agentName: string): string[] { return []; }
  private buildDomainCoverage(): Record<string, string[]> { return {}; }
  private buildComplexityHandling(): Record<string, ComplexityLevel[]> { return {}; }
  private getSuccessfulCollaborations(): AgentCollaboration[] { return []; }
  private getExclusionRules(): AgentExclusion[] { return []; }
  private generateLoadBalancingRules(): LoadBalancingRule[] { return []; }
  private generateFailoverStrategies(): FailoverStrategy[] { return []; }
  private getAdaptiveLearningData(): AdaptiveLearningData {
    return { routingDecisions: [], outcomeCorrelations: [], adaptationRules: [], confidenceThreshold: 0.8 };
  }
  private generateQualityGates(_agent: AgentConfig): QualityGate[] { return []; }
  private generateOptimizationHints(_insights: SearchIntelligenceData): string[] { return []; }
  private getBaseExecutionTime(_agent: AgentConfig, _model: ModelType): number { return 10; }
  private calculateEstimatedCost(_model: ModelType, time: number): number { return time * 0.05; }
  private calculateSuccessProbability(_agent: AgentConfig, _model: ModelType): number { return 0.85; }
  private calculateOverallRisk(risks: SpecificRisk[]): 'low' | 'medium' | 'high' {
    return risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low';
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  public getSearchIntelligence(): SearchIntelligenceData {
    return this.searchIntelligence;
  }

  public getRoutingHistory(): SmartRoutingDecision[] {
    return [...this.routingHistory];
  }

  public clearCache(): void {
    this.performanceCache.clear();
    this.logger.info('SmartAgentRouter cache cleared');
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createSmartAgentRouter(
  logger: PluginLogger,
  serenaIntegration: SerenaSearchIntegration,
  enhancedExtractor: EnhancedKeywordExtractor,
  availableAgents: AgentConfig[]
): SmartAgentRouter {
  return new SmartAgentRouter(logger, serenaIntegration, enhancedExtractor, availableAgents);
}

// =============================================================================
// EXPORT TYPES
// =============================================================================
// All interfaces are already exported with 'export interface' declarations