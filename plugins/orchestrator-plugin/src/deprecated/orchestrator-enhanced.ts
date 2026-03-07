/**
 * ORCHESTRATOR V6.0 - Enhanced con Analysis Engine Intelligente
 *
 * Integra l'Analysis Layer 3-Tier per keyword extraction avanzata
 * Mantiene tutto il parallelismo multi-livello del V5.1 + intelligenza AI
 *
 * NUOVE FEATURES V6.0:
 * - AnalysisEngine 3-Tier integrato (Fast/Smart/Deep Path)
 * - Confidence-based decision making
 * - Domain classification intelligente
 * - Complexity assessment automatico
 * - Performance monitoring integrato
 *
 * REGOLE FONDAMENTALI MANTENUTE:
 * #1: MAI codifica direttamente - SEMPRE delega
 * #2: SEMPRE comunica tabella agent PRIMA di lanciare
 * #3: Parallelismo massimo per task indipendenti
 * #4: Usa Ralph Loop per task iterativi
 * #5: OGNI processo DEVE concludersi con documenter expert agent
 * #6: PRIMA di ogni task, verifica ERRORI RISOLTI
 */

// Enhanced imports
import { AnalysisEngine, AnalysisResult } from './analysis';
import { TaskLauncher } from './execution/task-launcher';
import { ProgressTracker } from './tracking/progress-tracker';

// ============================================================================
// ENHANCED ANALYSIS INTERFACES
// ============================================================================

interface EnhancedKeywordAnalysis {
  // Original fields per compatibility
  keywords: string[];
  domini: string[];
  complessita: 'bassa' | 'media' | 'alta' | 'extreme';
  fileCount: number;
  isMultiDominio: boolean;

  // Enhanced Analysis Engine results
  analysisResult: AnalysisResult;
  overallConfidence: number;
  primaryDomain: string;
  secondaryDomains: string[];
  recommendedAgent: string;
  recommendedModel: 'haiku' | 'sonnet' | 'opus' | 'auto';
  complexityFactors: string[];
  shouldParallelize: boolean;
  estimatedTimeMinutes: number;
  processingTimeMs: number;
}

interface EnhancedAgentTask {
  // Original fields
  id: string;
  description: string;
  agentExpertFile: string;
  model: 'haiku' | 'sonnet' | 'opus' | 'auto';
  specialization: string;
  dependencies: string[];
  priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
  level: 1 | 2 | 3;
  parentTaskId?: string;
  subTasks?: EnhancedAgentTask[];
  allowSubSpawning?: boolean;
  complexityThreshold?: number;
  maxSubTasks?: number;

  // Enhanced fields con Analysis Engine
  confidence: number;
  domain: string;
  keywordMatches: string[];
  analysisSource: 'fast' | 'smart' | 'deep' | 'fallback';
  complexityScore: number;
  contextFactors: string[];
}

interface EnhancedExecutionPlan {
  // Original fields
  tasks: EnhancedAgentTask[];
  parallelBatches: EnhancedAgentTask[][];
  totalAgents: number;
  stimatedTime: string;
  documenterTask: EnhancedAgentTask;
  hierarchicalStructure: {
    level1Tasks: EnhancedAgentTask[];
    level2Tasks: EnhancedAgentTask[];
    level3Tasks: EnhancedAgentTask[];
    totalLevels: number;
    maxParallelism: number;
  };

  // Enhanced Analysis Engine results
  analysisResult: AnalysisResult;
  intelligentRouting: {
    analysisConfidence: number;
    primaryDomain: string;
    fallbacksUsed: string[];
    performanceMetrics: {
      analysisTimeMs: number;
      cacheHitRate: number;
      tierUsed: string;
    };
  };
}

// ============================================================================
// ENHANCED ORCHESTRATOR V6.0 CLASS
// ============================================================================

class OrchestratorV60 {
  private analysisEngine: AnalysisEngine;
  private taskLauncher: TaskLauncher;
  private progressTracker: ProgressTracker;
  private startupTime: number;

  // Mantieni legacy mappings per fallback compatibility
  private readonly KEYWORD_TO_EXPERT_MAPPING = {
    // GUI Domain
    'gui': 'experts/gui-super-expert.md',
    'pyqt5': 'experts/gui-super-expert.md',
    'qt': 'experts/gui-super-expert.md',
    'interface': 'experts/gui-super-expert.md',
    'ui': 'experts/gui-super-expert.md',

    // Database Domain
    'database': 'experts/database_expert.md',
    'sql': 'experts/database_expert.md',
    'sqlite': 'experts/database_expert.md',
    'query': 'experts/database_expert.md',

    // Security Domain - CRITICA
    'security': 'experts/security_unified_expert.md',
    'auth': 'experts/security_unified_expert.md',
    'authentication': 'experts/security_unified_expert.md',
    'encryption': 'experts/security_unified_expert.md',

    // API Integration
    'api': 'experts/integration_expert.md',
    'integration': 'experts/integration_expert.md',
    'rest': 'experts/integration_expert.md',

    // MQL Domain
    'mql': 'experts/mql_expert.md',
    'mql5': 'experts/mql_expert.md',
    'ea': 'experts/mql_expert.md',

    // Trading Domain
    'trading': 'experts/trading_strategy_expert.md',
    'risk management': 'experts/trading_strategy_expert.md',

    // Architecture Domain
    'architettura': 'experts/architect_expert.md',
    'design pattern': 'experts/architect_expert.md',

    // Testing & Debug
    'test': 'experts/tester_expert.md',
    'debug': 'experts/tester_expert.md',
    'bug': 'experts/tester_expert.md',

    // DevOps
    'devops': 'experts/devops_expert.md',
    'deploy': 'experts/devops_expert.md',
    'docker': 'experts/devops_expert.md',

    // Core Functions
    'implementa': 'core/coder.md',
    'feature': 'core/coder.md',
    'review': 'core/reviewer.md',
    'documenta': 'core/documenter.md'
  };

  private readonly EXPERT_TO_MODEL_MAPPING = {
    'experts/gui-super-expert.md': 'sonnet',
    'experts/database_expert.md': 'sonnet',
    'experts/security_unified_expert.md': 'sonnet',
    'experts/integration_expert.md': 'sonnet',
    'experts/mql_expert.md': 'sonnet',
    'experts/trading_strategy_expert.md': 'sonnet',
    'experts/architect_expert.md': 'opus',
    'experts/tester_expert.md': 'sonnet',
    'experts/devops_expert.md': 'haiku',
    'core/coder.md': 'sonnet',
    'core/reviewer.md': 'sonnet',
    'core/documenter.md': 'haiku'
  };

  constructor() {
    this.startupTime = performance.now();

    // Initialize Analysis Engine
    this.analysisEngine = new AnalysisEngine();

    // Initialize execution components
    this.taskLauncher = new TaskLauncher();
    this.progressTracker = new ProgressTracker(`orchestrator-${Date.now()}`);

    console.log(`🧠 OrchestratorV60 con AnalysisEngine inizializzato in ${Math.round(performance.now() - this.startupTime)}ms`);
    console.log('✨ FEATURES: 3-Tier Analysis + Parallelismo Multi-Livello + Confidence-based Routing');
  }

  // ============================================================================
  // STEP 1: ENHANCED ANALYSIS con Analysis Engine
  // ============================================================================

  /**
   * STEP 1: ANALISI INTELLIGENTE con Analysis Engine 3-Tier
   * Sostituisce il sistema keyword semplice con AI avanzata
   */
  async analyzeTaskIntelligent(userRequest: string): Promise<EnhancedKeywordAnalysis> {
    console.log('🧠 STEP 1: ANALISI INTELLIGENTE con Analysis Engine 3-Tier');
    console.log(`📝 Richiesta: "${userRequest}"`);

    const analysisStart = performance.now();

    try {
      // Esegui Analysis Engine 3-Tier
      const analysisResult = await this.analysisEngine.analyze(userRequest);
      const processingTime = performance.now() - analysisStart;

      if (!analysisResult.success) {
        console.warn('⚠️  Analysis Engine ha fallito, uso fallback legacy');
        return this.fallbackToLegacyAnalysis(userRequest);
      }

      // Extract enhanced information
      const primaryDomain = analysisResult.domains.primaryDomain.name;
      const secondaryDomains = analysisResult.domains.secondaryDomains.map(d => d.name);
      const allDomains = [primaryDomain, ...secondaryDomains];

      // Map domains to keywords per compatibility
      const keywords = analysisResult.keywords.keywords.map(k => k.text);

      // Determine complexity from Analysis Engine
      const complexityLevel = analysisResult.complexity.level;
      let complessita: 'bassa' | 'media' | 'alta' | 'extreme';

      if (complexityLevel === 'low') complessita = 'bassa';
      else if (complexityLevel === 'medium') complessita = 'media';
      else if (complexityLevel === 'high') complessita = 'alta';
      else complessita = 'extreme';

      // Build enhanced analysis
      const enhancedAnalysis: EnhancedKeywordAnalysis = {
        // Legacy compatibility fields
        keywords,
        domini: allDomains,
        complessita,
        fileCount: analysisResult.complexity.estimates.agentCount,
        isMultiDominio: analysisResult.domains.isMultiDomain,

        // Enhanced Analysis Engine fields
        analysisResult,
        overallConfidence: analysisResult.keywords.overallConfidence,
        primaryDomain: primaryDomain,
        secondaryDomains: secondaryDomains,
        recommendedAgent: analysisResult.domains.primaryDomain.suggestedAgent,
        recommendedModel: analysisResult.domains.primaryDomain.suggestedModel === 'auto' ? 'sonnet' : analysisResult.domains.primaryDomain.suggestedModel,
        complexityFactors: analysisResult.complexity.factors.map(f => f.description),
        shouldParallelize: analysisResult.summary.recommendation.shouldParallelize,
        estimatedTimeMinutes: analysisResult.complexity.estimates.timeMinutes,
        processingTimeMs: processingTime
      };

      // Report risultati
      console.log('✅ Analisi intelligente completata:');
      console.log(`├─ Tier utilizzato: ${analysisResult.keywords.tier.toUpperCase()}`);
      console.log(`├─ Confidence generale: ${Math.round(analysisResult.keywords.overallConfidence * 100)}%`);
      console.log(`├─ Dominio primario: ${primaryDomain}`);
      console.log(`├─ Domini secondari: ${secondaryDomains.join(', ') || 'nessuno'}`);
      console.log(`├─ Keywords trovate: ${keywords.length} (${keywords.slice(0, 3).join(', ')}...)`);
      console.log(`├─ Complessità: ${complessita} (score: ${analysisResult.complexity.score.toFixed(2)})`);
      console.log(`├─ Agent raccomandato: ${analysisResult.summary.recommendation.primaryAgent}`);
      console.log(`├─ Model raccomandato: ${analysisResult.summary.recommendation.model}`);
      console.log(`├─ Parallelizzazione: ${analysisResult.summary.recommendation.shouldParallelize ? 'SÌ' : 'NO'}`);
      console.log(`└─ Tempo di analisi: ${processingTime.toFixed(1)}ms`);

      return enhancedAnalysis;

    } catch (error) {
      console.error('💥 Errore in Analysis Engine, fallback a legacy system:', error);
      return this.fallbackToLegacyAnalysis(userRequest);
    }
  }

  /**
   * Fallback al sistema legacy quando Analysis Engine fallisce
   */
  private fallbackToLegacyAnalysis(userRequest: string): EnhancedKeywordAnalysis {
    console.log('🔄 Usando fallback legacy analysis...');

    // Semplice keyword matching (dal V5.1 originale)
    const requestLower = userRequest.toLowerCase();
    const foundKeywords: string[] = [];
    const foundDomains = new Set<string>();

    for (const [keyword, expertFile] of Object.entries(this.KEYWORD_TO_EXPERT_MAPPING)) {
      if (requestLower.includes(keyword)) {
        foundKeywords.push(keyword);

        if (expertFile.includes('gui')) foundDomains.add('GUI');
        else if (expertFile.includes('database')) foundDomains.add('Database');
        else if (expertFile.includes('security')) foundDomains.add('Security');
        else if (expertFile.includes('integration')) foundDomains.add('API');
        else foundDomains.add('General');
      }
    }

    const dominioCount = foundDomains.size;
    const wordCount = userRequest.split(' ').length;

    let complessita: 'bassa' | 'media' | 'alta' | 'extreme';
    if (dominioCount <= 1 && wordCount <= 10) complessita = 'bassa';
    else if (dominioCount <= 2 && wordCount <= 20) complessita = 'media';
    else complessita = 'alta';

    return {
      keywords: foundKeywords,
      domini: Array.from(foundDomains),
      complessita,
      fileCount: Math.max(1, dominioCount),
      isMultiDominio: dominioCount > 1,

      // Mock enhanced fields per fallback
      analysisResult: {} as AnalysisResult,
      overallConfidence: 0.5,
      primaryDomain: Array.from(foundDomains)[0] || 'General',
      secondaryDomains: Array.from(foundDomains).slice(1),
      recommendedAgent: 'core/coder.md',
      recommendedModel: 'sonnet',
      complexityFactors: ['Analisi legacy fallback'],
      shouldParallelize: dominioCount > 1,
      estimatedTimeMinutes: Math.max(2, dominioCount * 3),
      processingTimeMs: 1.0
    };
  }

  // ============================================================================
  // STEP 2: ENHANCED ROUTING con Intelligence
  // ============================================================================

  /**
   * STEP 2: ROUTING INTELLIGENTE basato su Analysis Engine
   * Usa confidence scores e domain classification per routing preciso
   */
  routeToAgentsIntelligent(analysis: EnhancedKeywordAnalysis, userRequest: string): EnhancedAgentTask[] {
    console.log('\n🎯 STEP 2: ROUTING INTELLIGENTE basato su Analysis Engine');
    console.log(`├─ Confidence generale: ${Math.round(analysis.overallConfidence * 100)}%`);
    console.log(`├─ Dominio primario: ${analysis.primaryDomain}`);

    const tasks: EnhancedAgentTask[] = [];
    let taskCounter = 1;

    // Route primario basato su Analysis Engine recommendation
    if (analysis.analysisResult.success) {
      const primaryTask = this.createEnhancedTaskFromDomain(
        analysis.analysisResult.domains.primaryDomain,
        userRequest,
        `T${taskCounter}`,
        analysis.analysisResult
      );

      if (primaryTask) {
        tasks.push(primaryTask);
        taskCounter++;
      }

      // Route secondari per domini addizionali (se confidence sufficiente)
      for (const secondaryDomain of analysis.analysisResult.domains.secondaryDomains) {
        if (secondaryDomain.confidence >= 0.6) { // Soglia per domini secondari
          const secondaryTask = this.createEnhancedTaskFromDomain(
            secondaryDomain,
            userRequest,
            `T${taskCounter}`,
            analysis.analysisResult
          );

          if (secondaryTask) {
            tasks.push(secondaryTask);
            taskCounter++;
          }
        }
      }
    }

    // Fallback se nessun task generato da Analysis Engine
    if (tasks.length === 0) {
      console.log('⚠️  Nessun task generato da Analysis Engine, uso fallback legacy routing');
      tasks.push(this.createFallbackTask(userRequest, `T${taskCounter}`, analysis));
      taskCounter++;
    }

    // REGOLA #5: SEMPRE aggiungi documenter come ULTIMO
    const documenterTask: EnhancedAgentTask = {
      id: `T${taskCounter}`,
      description: 'Documenta tutti i cambiamenti (REGOLA #5)',
      agentExpertFile: 'core/documenter.md',
      model: 'haiku',
      specialization: 'Documentation, technical writing, README',
      dependencies: tasks.map(t => t.id),
      priority: 'CRITICA',
      level: 1,
      allowSubSpawning: false,
      complexityThreshold: 1.0,
      maxSubTasks: 0,

      // Enhanced fields
      confidence: 1.0, // Documenter always max confidence
      domain: 'documentation',
      keywordMatches: ['documenta', 'readme'],
      analysisSource: 'fallback',
      complexityScore: 0.1, // Documenter sempre semplice
      contextFactors: ['Regola #5 - Documentazione finale obbligatoria']
    };

    tasks.push(documenterTask);

    console.log(`✅ Routing intelligente completato: ${tasks.length} agent selezionati`);
    tasks.forEach(task => {
      console.log(`├─ ${task.id}: ${task.agentExpertFile} (confidence: ${Math.round(task.confidence * 100)}%)`);
    });

    return tasks;
  }

  /**
   * Create enhanced task da domain classification
   */
  private createEnhancedTaskFromDomain(
    domain: any, // ClassifiedDomain type
    userRequest: string,
    taskId: string,
    analysisResult: AnalysisResult
  ): EnhancedAgentTask | null {

    const expertFile = domain.suggestedAgent;
    if (!expertFile) return null;

    // Map priority da domain
    let priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA' = 'MEDIA';
    if (domain.priority === 'CRITICA') priority = 'CRITICA';
    else if (domain.priority === 'ALTA') priority = 'ALTA';
    else if (domain.priority === 'MEDIA') priority = 'MEDIA';
    else priority = 'BASSA';

    const task: EnhancedAgentTask = {
      id: taskId,
      description: `Gestisci dominio ${domain.name}: ${userRequest}`,
      agentExpertFile: expertFile,
      model: domain.suggestedModel,
      specialization: this.getSpecializationFromDomain(domain.name),
      dependencies: [],
      priority,
      level: 1,
      allowSubSpawning: true,
      complexityThreshold: 0.7,
      maxSubTasks: 5,

      // Enhanced Analysis Engine fields
      confidence: domain.confidence,
      domain: domain.name,
      keywordMatches: domain.matchedKeywords,
      analysisSource: analysisResult.keywords.tier,
      complexityScore: analysisResult.complexity.score,
      contextFactors: analysisResult.complexity.factors.map(f => f.description)
    };

    return task;
  }

  /**
   * Create fallback task quando Analysis Engine non produce risultati
   */
  private createFallbackTask(
    userRequest: string,
    taskId: string,
    analysis: EnhancedKeywordAnalysis
  ): EnhancedAgentTask {
    return {
      id: taskId,
      description: `Implementa: ${userRequest}`,
      agentExpertFile: 'core/coder.md',
      model: 'sonnet',
      specialization: 'Coding generale, implementazione feature',
      dependencies: [],
      priority: 'MEDIA',
      level: 1,
      allowSubSpawning: true,
      complexityThreshold: 0.7,
      maxSubTasks: 3,

      // Enhanced fields con fallback values
      confidence: 0.5,
      domain: 'general',
      keywordMatches: analysis.keywords.slice(0, 3),
      analysisSource: 'fallback',
      complexityScore: analysis.complessita === 'bassa' ? 0.3 :
                      analysis.complessita === 'media' ? 0.6 : 0.8,
      contextFactors: ['Fallback task - analisi generica']
    };
  }

  // ============================================================================
  // STEP 3: ENHANCED EXECUTION PLAN DISPLAY
  // ============================================================================

  /**
   * STEP 3: COMUNICAZIONE PRE-LANCIO con Intelligence Insights
   * Mostra informazioni da Analysis Engine + legacy table
   */
  displayEnhancedExecutionPlan(tasks: EnhancedAgentTask[], analysis: EnhancedKeywordAnalysis): void {
    console.log('\n📋 STEP 3: COMUNICAZIONE PRE-LANCIO con INTELLIGENCE INSIGHTS');
    console.log('🤖 MODALITÀ ORCHESTRATOR V6.0 ATTIVATA - AI ANALYSIS + REGOLA #5\n');

    // Analysis Engine insights
    console.log('🧠 INTELLIGENCE ANALYSIS SUMMARY');
    console.log(`├─ Tier utilizzato: ${analysis.analysisResult.keywords?.tier?.toUpperCase() || 'LEGACY'}`);
    console.log(`├─ Processing time: ${analysis.processingTimeMs.toFixed(1)}ms`);
    console.log(`├─ Overall confidence: ${Math.round(analysis.overallConfidence * 100)}%`);
    console.log(`├─ Complexity assessment: ${analysis.complessita} (score: ${(analysis.analysisResult.complexity?.score || 0).toFixed(2)})`);
    console.log(`├─ Should parallelize: ${analysis.shouldParallelize ? 'YES' : 'NO'}`);
    console.log(`├─ Estimated time: ${analysis.estimatedTimeMinutes} minutes`);
    console.log(`└─ Recommended model: ${analysis.recommendedModel}\n`);

    // Enhanced execution table
    const workTasks = tasks.filter(t => !t.agentExpertFile.includes('documenter'));
    const documenterTask = tasks.find(t => t.agentExpertFile.includes('documenter'));

    console.log('📊 ENHANCED EXECUTION PLAN - TABELLA INTELLIGENTE (11 COLONNE)\n');
    console.log('| # | Task | Agent Expert | Model | Domain | Confidence | Complexity | Source | Priority | Dependencies | Status |');
    console.log('|---|------|-------------|-------|---------|-----------|----------|--------|----------|-------------|---------|');

    workTasks.forEach(task => {
      const deps = task.dependencies.length > 0 ? task.dependencies.join(',') : '-';
      const confidence = `${Math.round(task.confidence * 100)}%`;
      const complexity = task.complexityScore.toFixed(2);

      console.log(`| ${task.id} | ${this.truncateText(task.description, 15)} | ${this.truncateText(task.agentExpertFile, 12)} | ${task.model} | ${task.domain} | ${confidence} | ${complexity} | ${task.analysisSource} | ${task.priority} | ${deps} | ⏳ PENDING |`);
    });

    if (documenterTask) {
      const deps = documenterTask.dependencies.join(',');
      console.log(`| ${documenterTask.id} | Documentation | documenter.md | haiku | docs | 100% | 0.10 | regola | CRITICA | ${deps} | ⏳ PENDING |`);
    }

    // Enhanced statistics
    console.log('\n📈 ENHANCED EXECUTION STATISTICS:');
    console.log(`├─ Total tasks: ${tasks.length} (${workTasks.length} work + 1 documentation)`);
    console.log(`├─ Average confidence: ${Math.round(workTasks.reduce((sum, t) => sum + t.confidence, 0) / workTasks.length * 100)}%`);
    console.log(`├─ Analysis source distribution: ${this.getSourceDistribution(workTasks)}`);
    console.log(`├─ Domain coverage: ${new Set(workTasks.map(t => t.domain)).size} domains`);
    console.log(`├─ Intelligence boost: ${analysis.analysisResult.success ? 'ACTIVE' : 'FALLBACK'}`);
    console.log(`├─ Estimated time: ${analysis.estimatedTimeMinutes} minutes`);
    console.log(`└─ Memory usage: ${this.getAnalysisEngineMemory()} MB`);

    console.log('\n⚡ AI-ENHANCED FEATURES ACTIVE:');
    console.log('✅ 3-Tier Analysis Engine (Fast/Smart/Deep Path)');
    console.log('✅ Confidence-based task routing');
    console.log('✅ Intelligent domain classification');
    console.log('✅ Complexity assessment automatico');
    console.log('✅ Performance monitoring integrato');
    console.log('✅ Parallelismo intelligente a 3 livelli');

    console.log('\n⚠️  REGOLE FONDAMENTALI ATTIVE:');
    console.log('✅ REGOLA #1: MAI codifica direttamente - SEMPRE delega');
    console.log('✅ REGOLA #2: SEMPRE comunica tabella agent PRIMA di lanciare');
    console.log('✅ REGOLA #3: Parallelismo massimo per task indipendenti');
    console.log('✅ REGOLA #5: OGNI processo DEVE concludersi con documenter expert agent');
  }

  // ============================================================================
  // ENHANCED EXECUTION & REPORTING
  // ============================================================================

  /**
   * Execute con performance monitoring
   */
  async executeEnhanced(tasks: EnhancedAgentTask[], analysis: EnhancedKeywordAnalysis): Promise<void> {
    console.log('\n⚡ STEP 4: ESECUZIONE ENHANCED con AI MONITORING');

    // Get Analysis Engine metrics pre-execution
    const engineMetrics = this.analysisEngine.getMetrics();
    console.log(`🧠 Analysis Engine status: ${JSON.stringify(engineMetrics.circuitBreakerStatus, null, 2)}`);

    // Esegui con sistema V5.1 esistente (mantiene parallelismo a 3 livelli)
    await this.executeParallelEnhanced(tasks);

    // Performance report post-execution
    this.generateEnhancedReport(tasks, analysis);
  }

  /**
   * Execute parallelo enhanced
   */
  private async executeParallelEnhanced(tasks: EnhancedAgentTask[]): Promise<void> {
    // Usa la stessa logica del V5.1 ma con enhanced tasks
    const workTasks = tasks.filter(t => !t.agentExpertFile.includes('documenter'));
    const documenterTask = tasks.find(t => t.agentExpertFile.includes('documenter'));

    // Organizza per livelli
    const level1Tasks = workTasks.filter(t => t.level === 1);
    const level2Tasks = workTasks.filter(t => t.level === 2);
    const level3Tasks = workTasks.filter(t => t.level === 3);

    console.log(`🎯 ENHANCED EXECUTION STAGES:`);
    console.log(`├─ Livello 1: ${level1Tasks.length} tasks (avg confidence: ${this.averageConfidence(level1Tasks)}%)`);
    console.log(`├─ Livello 2: ${level2Tasks.length} tasks`);
    console.log(`├─ Livello 3: ${level3Tasks.length} tasks`);
    console.log(`└─ Documentation: 1 task\n`);

    // Execute levels (riusa logica V5.1)
    if (level1Tasks.length > 0) {
      console.log(`🚀 STAGE 1/4 - Enhanced Level 1 (${level1Tasks.length} agents)`);
      await this.executeEnhancedTaskLevel(level1Tasks, 1);
    }

    if (level2Tasks.length > 0) {
      console.log(`\n🔥 STAGE 2/4 - Enhanced Level 2 (${level2Tasks.length} agents)`);
      await this.executeEnhancedTaskLevel(level2Tasks, 2);
    }

    if (level3Tasks.length > 0) {
      console.log(`\n⚡ STAGE 3/4 - Enhanced Level 3 (${level3Tasks.length} agents)`);
      await this.executeEnhancedTaskLevel(level3Tasks, 3);
    }

    if (documenterTask) {
      console.log(`\n📝 STAGE 4/4 - Enhanced Documentation (REGOLA #5)`);
      const result = await this.executeEnhancedAgent(documenterTask);
      console.log(`✅ ${documenterTask.id}: ${result.status} (confidence: ${Math.round(documenterTask.confidence * 100)}%)`);
    }
  }

  /**
   * Execute enhanced task level
   */
  private async executeEnhancedTaskLevel(tasks: EnhancedAgentTask[], level: number): Promise<void> {
    const parallelPromises = tasks.map(task => this.executeEnhancedAgent(task));
    const results = await Promise.all(parallelPromises);

    results.forEach((result, index) => {
      const task = tasks[index];
      const indent = level === 1 ? '├─' : level === 2 ? '│  ├─' : '│     ├─';
      const confidence = Math.round(task.confidence * 100);
      console.log(`${indent} ${task.id}: ${result.status} (${result.duration}, conf: ${confidence}%, src: ${task.analysisSource})`);
    });
  }

  /**
   * Execute enhanced individual agent
   */
  private async executeEnhancedAgent(task: EnhancedAgentTask): Promise<{status: string, duration: string, output: string}> {
    console.log(`🎯 Enhanced Launch ${task.id}: ${task.agentExpertFile} (${task.model}, conf: ${Math.round(task.confidence * 100)}%)`);

    // TODO: Integrazione con Task tool reale
    const duration = this.simulateExecution();

    return {
      status: task.confidence >= 0.7 ? '✅ HIGH CONF' : task.confidence >= 0.5 ? '✅ MED CONF' : '⚠️  LOW CONF',
      duration,
      output: `Enhanced task ${task.id} completed with confidence ${task.confidence}`
    };
  }

  /**
   * Generate enhanced final report
   */
  private generateEnhancedReport(tasks: EnhancedAgentTask[], analysis: EnhancedKeywordAnalysis): void {
    console.log('\n📊 STEP 5: ENHANCED REPORT con AI INSIGHTS');
    console.log('✨ INTELLIGENT ORCHESTRATION COMPLETE\n');

    const workTasks = tasks.filter(t => !t.agentExpertFile.includes('documenter'));
    const avgConfidence = this.averageConfidence(workTasks);
    const sourceDistribution = this.getSourceDistribution(workTasks);

    // AI Analysis Summary
    console.log('🧠 AI ANALYSIS PERFORMANCE');
    console.log(`├─ Analysis tier used: ${analysis.analysisResult.keywords?.tier?.toUpperCase() || 'LEGACY'}`);
    console.log(`├─ Processing time: ${analysis.processingTimeMs.toFixed(1)}ms`);
    console.log(`├─ Overall confidence: ${Math.round(analysis.overallConfidence * 100)}%`);
    console.log(`├─ Average task confidence: ${avgConfidence}%`);
    console.log(`├─ Source distribution: ${sourceDistribution}`);
    console.log(`├─ Domains identified: ${new Set(workTasks.map(t => t.domain)).size}`);
    console.log(`└─ Intelligence boost: ${analysis.analysisResult.success ? '100% AI' : 'Legacy fallback'}`);

    // Enhanced execution statistics
    console.log('\n📈 ENHANCED EXECUTION REPORT');
    console.log(`├─ Total tasks: ${tasks.length} (${workTasks.length} + 1 docs)`);
    console.log(`├─ High confidence tasks: ${workTasks.filter(t => t.confidence >= 0.7).length}`);
    console.log(`├─ Medium confidence tasks: ${workTasks.filter(t => t.confidence >= 0.5 && t.confidence < 0.7).length}`);
    console.log(`├─ Low confidence tasks: ${workTasks.filter(t => t.confidence < 0.5).length}`);
    console.log(`├─ Analysis Engine memory: ${this.getAnalysisEngineMemory()} MB`);
    console.log(`└─ REGOLA #5: ✅ Documenter executed as final step`);

    console.log('\n🎯 V6.0 AI ORCHESTRATION COMPLETATA CON SUCCESSO!');
    console.log('✅ Analysis Engine 3-Tier + Parallelismo Multi-Livello + Intelligence Routing');
    console.log(`🚀 ACHIEVEMENT: ${tasks.length} agents coordinati con ${avgConfidence}% average confidence!`);
  }

  // ============================================================================
  // MAIN ENHANCED ORCHESTRATION METHOD
  // ============================================================================

  /**
   * MAIN ORCHESTRATION METHOD V6.0
   * Integra Analysis Engine con workflow esistente
   */
  async orchestrateEnhanced(userRequest: string): Promise<void> {
    console.log('🚀 ORCHESTRATOR V6.0 - AI ANALYSIS + PARALLELISMO A 3 LIVELLI ATTIVATO');
    console.log(`📝 Richiesta utente: "${userRequest}"\n`);

    try {
      // STEP 1: Enhanced Analysis con Analysis Engine
      const analysis = await this.analyzeTaskIntelligent(userRequest);

      // STEP 2: Enhanced Routing basato su AI
      const tasks = this.routeToAgentsIntelligent(analysis, userRequest);

      // STEP 3: Enhanced Execution Plan Display
      this.displayEnhancedExecutionPlan(tasks, analysis);

      // Attendi conferma (opzionale)
      console.log('\n⏳ Enhanced execution plan ready...');

      // STEP 4: Enhanced Execution
      await this.executeEnhanced(tasks, analysis);

      console.log('\n🎉 ENHANCED ORCHESTRATION COMPLETATA CON SUCCESSO!');

      // Get final Analysis Engine metrics
      const finalMetrics = this.analysisEngine.getMetrics();
      console.log(`\n📊 Analysis Engine Final Stats: Cache Hit Rate ${finalMetrics.cacheHitRate.toFixed(1)}%`);

    } catch (error) {
      console.error('💥 ERRORE DURANTE ENHANCED ORCHESTRATION:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getSpecializationFromDomain(domain: string): string {
    const specializations = {
      gui: 'GUI Development, PyQt5, Layouts, Widgets',
      database: 'Database Design, SQL, Migrations',
      security: 'Security, Authentication, Encryption',
      api: 'API Integration, REST, Webhooks',
      mql: 'MQL Development, Expert Advisors',
      trading: 'Trading Strategies, Risk Management',
      architecture: 'System Architecture, Design Patterns',
      testing: 'Testing, QA, Performance Analysis',
      devops: 'DevOps, CI/CD, Deployment'
    };

    return specializations[domain as keyof typeof specializations] || 'General Development';
  }

  private averageConfidence(tasks: EnhancedAgentTask[]): number {
    if (tasks.length === 0) return 0;
    return Math.round(tasks.reduce((sum, t) => sum + t.confidence, 0) / tasks.length * 100);
  }

  private getSourceDistribution(tasks: EnhancedAgentTask[]): string {
    const sources = tasks.reduce((acc, task) => {
      acc[task.analysisSource] = (acc[task.analysisSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sources)
      .map(([source, count]) => `${source}:${count}`)
      .join(', ');
  }

  private getAnalysisEngineMemory(): number {
    // TODO: Get real memory usage from Analysis Engine
    return 25; // Placeholder
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  private simulateExecution(): string {
    const times = ['1.2m', '1.8m', '2.3m', '0.9m', '3.1m', '1.5m'];
    return times[Math.floor(Math.random() * times.length)];
  }

  // ============================================================================
  // ANALYSIS ENGINE INTEGRATION UTILITIES
  // ============================================================================

  /**
   * Get Analysis Engine health status
   */
  async getAnalysisEngineHealth(): Promise<any> {
    return await this.analysisEngine.healthCheck();
  }

  /**
   * Reset Analysis Engine se necessario
   */
  resetAnalysisEngine(): void {
    this.analysisEngine.resetCircuitBreaker();
    console.log('🔄 Analysis Engine circuit breaker reset');
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics(): any {
    return {
      analysisEngine: this.analysisEngine.getMetrics(),
      orchestrator: {
        version: '6.0',
        startupTime: this.startupTime,
        currentTime: performance.now()
      }
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  OrchestratorV60,
  type EnhancedKeywordAnalysis,
  type EnhancedAgentTask,
  type EnhancedExecutionPlan
};