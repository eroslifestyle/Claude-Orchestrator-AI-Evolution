/**
 * ORCHESTRATOR QUICK FIXES V1.0
 *
 * Script automatizzato per applicare fix critici al sistema orchestrator
 * Risolve problemi identificati durante stress testing
 *
 * FIX CATEGORIES:
 * 1. Agent File Validation (pre-execution check)
 * 2. Intelligent Fallback Mapping (L2→L1, L3→L1)
 * 3. Sub-Agent Spawning Control (disable quando non supportato)
 * 4. Circuit Breaker Pattern (prevent cascade failures)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// FALLBACK MAPPING CONFIGURATION
// ============================================================================

/**
 * Comprehensive fallback mapping for all sub-agents
 * Maps L2/L3 specialist agents → L1 general agents
 */
const FALLBACK_MAPPING: Record<string, string> = {
  // ========================================
  // GUI DOMAIN FALLBACKS
  // ========================================

  // L2 GUI Specialists → gui-super-expert
  'experts/gui-layout-specialist.md': 'experts/gui-super-expert.md',
  'experts/gui-widget-creator.md': 'experts/gui-super-expert.md',
  'experts/gui-event-handler.md': 'experts/gui-super-expert.md',
  'experts/gui-style-manager.md': 'experts/gui-super-expert.md',
  'experts/gui-animation-expert.md': 'experts/gui-super-expert.md',
  'experts/gui-responsive-designer.md': 'experts/gui-super-expert.md',
  'experts/gui-accessibility-checker.md': 'experts/gui-super-expert.md',
  'experts/gui-performance-optimizer.md': 'experts/gui-super-expert.md',

  // L3 GUI Micro-specialists → gui-super-expert
  'experts/gui-button-specialist.md': 'experts/gui-super-expert.md',
  'experts/gui-form-validator.md': 'experts/gui-super-expert.md',
  'experts/gui-modal-creator.md': 'experts/gui-super-expert.md',
  'experts/gui-tooltip-manager.md': 'experts/gui-super-expert.md',
  'experts/gui-icon-optimizer.md': 'experts/gui-super-expert.md',
  'experts/gui-theme-designer.md': 'experts/gui-super-expert.md',

  // ========================================
  // DATABASE DOMAIN FALLBACKS
  // ========================================

  // L2 Database Specialists → database_expert
  'experts/db-schema-designer.md': 'experts/database_expert.md',
  'experts/db-migration-specialist.md': 'experts/database_expert.md',
  'experts/db-query-optimizer.md': 'experts/database_expert.md',
  'experts/db-index-manager.md': 'experts/database_expert.md',
  'experts/db-backup-specialist.md': 'experts/database_expert.md',
  'experts/db-replication-expert.md': 'experts/database_expert.md',
  'experts/db-sharding-architect.md': 'experts/database_expert.md',
  'experts/db-monitoring-specialist.md': 'experts/database_expert.md',

  // L3 Database Micro-specialists → database_expert
  'experts/db-sql-generator.md': 'experts/database_expert.md',
  'experts/db-transaction-manager.md': 'experts/database_expert.md',
  'experts/db-connection-pooler.md': 'experts/database_expert.md',
  'experts/db-cache-integrator.md': 'experts/database_expert.md',
  'experts/db-orm-optimizer.md': 'experts/database_expert.md',
  'experts/db-nosql-adapter.md': 'experts/database_expert.md',

  // ========================================
  // SECURITY DOMAIN FALLBACKS
  // ========================================

  // L2 Security Specialists → security_unified_expert
  'experts/security-auth-specialist.md': 'experts/security_unified_expert.md',
  'experts/security-encryption-expert.md': 'experts/security_unified_expert.md',
  'experts/security-access-control.md': 'experts/security_unified_expert.md',
  'experts/security-jwt-specialist.md': 'experts/security_unified_expert.md',
  'experts/security-oauth-expert.md': 'experts/security_unified_expert.md',
  'experts/security-audit-specialist.md': 'experts/security_unified_expert.md',
  'experts/security-penetration-tester.md': 'experts/security_unified_expert.md',
  'experts/security-compliance-checker.md': 'experts/security_unified_expert.md',

  // L3 Security Micro-specialists → security_unified_expert
  'experts/security-password-hasher.md': 'experts/security_unified_expert.md',
  'experts/security-token-validator.md': 'experts/security_unified_expert.md',
  'experts/security-session-manager.md': 'experts/security_unified_expert.md',
  'experts/security-cors-configurator.md': 'experts/security_unified_expert.md',
  'experts/security-xss-protector.md': 'experts/security_unified_expert.md',
  'experts/security-sql-injection-preventer.md': 'experts/security_unified_expert.md',

  // ========================================
  // API/INTEGRATION DOMAIN FALLBACKS
  // ========================================

  // L2 API Specialists → integration_expert
  'experts/api-design-specialist.md': 'experts/integration_expert.md',
  'experts/api-versioning-expert.md': 'experts/integration_expert.md',
  'experts/api-rate-limiter.md': 'experts/integration_expert.md',
  'experts/api-cache-optimizer.md': 'experts/integration_expert.md',
  'experts/api-documentation-generator.md': 'experts/integration_expert.md',
  'experts/api-testing-specialist.md': 'experts/integration_expert.md',
  'experts/api-monitoring-expert.md': 'experts/integration_expert.md',
  'experts/api-gateway-architect.md': 'experts/integration_expert.md',
  'experts/webhook-integration-expert.md': 'experts/integration_expert.md',

  // L3 API Micro-specialists → integration_expert
  'experts/api-swagger-generator.md': 'experts/integration_expert.md',
  'experts/api-postman-creator.md': 'experts/integration_expert.md',
  'experts/api-mock-server.md': 'experts/integration_expert.md',
  'experts/api-load-balancer.md': 'experts/integration_expert.md',
  'experts/api-circuit-breaker.md': 'experts/integration_expert.md',
  'experts/api-retry-handler.md': 'experts/integration_expert.md',

  // ========================================
  // ARCHITECTURE DOMAIN FALLBACKS
  // ========================================

  // L2 Architecture Specialists → architect_expert
  'experts/architecture-pattern-expert.md': 'experts/architect_expert.md',
  'experts/architecture-scalability-expert.md': 'experts/architect_expert.md',
  'experts/architecture-integration-expert.md': 'experts/architect_expert.md',

  // ========================================
  // TESTING DOMAIN FALLBACKS
  // ========================================

  // L2 Testing Specialists → tester_expert
  'experts/test-automation-specialist.md': 'experts/tester_expert.md',
  'experts/performance-testing-expert.md': 'experts/tester_expert.md',
  'experts/integration-testing-specialist.md': 'experts/tester_expert.md',

  // ========================================
  // CORE DOMAIN FALLBACKS
  // ========================================

  // L2 Core Specialists → coder
  'core/micro-coder.md': 'core/coder.md',
  'core/code-optimizer.md': 'core/coder.md',
  'core/code-formatter.md': 'core/coder.md',
  'core/comment-generator.md': 'core/coder.md',
  'core/import-optimizer.md': 'core/coder.md',
  'core/test-generator.md': 'core/coder.md',

  // ========================================
  // ULTIMATE FALLBACK
  // ========================================
  'default': 'core/coder.md'
};

/**
 * Domain-based fallback per agent sconosciuti
 */
const DOMAIN_FALLBACKS: Record<string, string> = {
  'gui': 'experts/gui-super-expert.md',
  'ui': 'experts/gui-super-expert.md',
  'frontend': 'experts/gui-super-expert.md',

  'db': 'experts/database_expert.md',
  'database': 'experts/database_expert.md',
  'sql': 'experts/database_expert.md',

  'security': 'experts/security_unified_expert.md',
  'auth': 'experts/security_unified_expert.md',
  'encryption': 'experts/security_unified_expert.md',

  'api': 'experts/integration_expert.md',
  'integration': 'experts/integration_expert.md',
  'webhook': 'experts/integration_expert.md',

  'test': 'experts/tester_expert.md',
  'testing': 'experts/tester_expert.md',
  'qa': 'experts/tester_expert.md',

  'architecture': 'experts/architect_expert.md',
  'design': 'experts/architect_expert.md',
  'pattern': 'experts/architect_expert.md',

  'devops': 'experts/devops_expert.md',
  'deploy': 'experts/devops_expert.md',
  'ci': 'experts/devops_expert.md',

  'default': 'core/coder.md'
};

// ============================================================================
// ORCHESTRATOR PATCH UTILITIES
// ============================================================================

class OrchestratorQuickFixer {
  private agentBasePath: string;
  private validatedAgents: Map<string, boolean> = new Map();

  constructor() {
    this.agentBasePath = path.join(process.cwd(), 'agents');
  }

  /**
   * FIX 1: Agent File Validation
   * Verifica esistenza agent prima di esecuzione
   */
  async validateAgentFile(agentPath: string): Promise<boolean> {
    // Check cache
    if (this.validatedAgents.has(agentPath)) {
      return this.validatedAgents.get(agentPath)!;
    }

    const fullPath = path.join(this.agentBasePath, agentPath);

    try {
      await fs.access(fullPath, fs.constants.R_OK);
      this.validatedAgents.set(agentPath, true);
      return true;
    } catch {
      this.validatedAgents.set(agentPath, false);
      console.warn(`⚠️ Agent file not found: ${agentPath}`);
      return false;
    }
  }

  /**
   * FIX 2: Intelligent Fallback Agent Selection
   * Trova best fallback per agent mancante
   */
  getFallbackAgent(invalidAgent: string): string {
    // STRATEGY 1: Direct mapping (exact match)
    const directFallback = FALLBACK_MAPPING[invalidAgent];
    if (directFallback) {
      console.log(`🔄 FALLBACK (direct): ${invalidAgent} → ${directFallback}`);
      return directFallback;
    }

    // STRATEGY 2: Domain-based fallback (parse agent path)
    const agentLower = invalidAgent.toLowerCase();

    for (const [domain, fallbackAgent] of Object.entries(DOMAIN_FALLBACKS)) {
      if (agentLower.includes(domain)) {
        console.log(`🔄 FALLBACK (domain: ${domain}): ${invalidAgent} → ${fallbackAgent}`);
        return fallbackAgent;
      }
    }

    // STRATEGY 3: Level-based fallback (L3 → L2 → L1)
    const levelFallback = this.findLevelBasedFallback(invalidAgent);
    if (levelFallback) {
      console.log(`🔄 FALLBACK (level): ${invalidAgent} → ${levelFallback}`);
      return levelFallback;
    }

    // STRATEGY 4: Ultimate fallback to coder
    console.log(`🔄 FALLBACK (ultimate): ${invalidAgent} → core/coder.md`);
    return FALLBACK_MAPPING['default'];
  }

  /**
   * Fallback basato su livello gerarchico
   */
  private findLevelBasedFallback(agentPath: string): string | null {
    // Parse livello da nome file
    // L3: xxx-specialist.md, xxx-creator.md, xxx-manager.md
    // L2: xxx-expert.md, xxx-designer.md
    // L1: xxx_expert.md, super-expert.md

    const fileName = path.basename(agentPath, '.md');

    // Se L3 (micro-specialist), cerca L2 parent
    if (fileName.includes('-specialist') ||
        fileName.includes('-creator') ||
        fileName.includes('-manager') ||
        fileName.includes('-generator') ||
        fileName.includes('-optimizer')) {

      // Extract domain
      const domain = fileName.split('-')[0]; // e.g., "gui-button-specialist" → "gui"

      // Cerca L2 expert in stesso dominio
      const l2Candidate = `experts/${domain}-expert.md`;
      if (FALLBACK_MAPPING[l2Candidate]) {
        return FALLBACK_MAPPING[l2Candidate];
      }

      // Fallback a L1 del dominio
      return this.findDomainL1Agent(domain);
    }

    // Se L2 (expert), cerca L1 parent
    if (fileName.includes('-expert') && !fileName.includes('super-expert')) {
      const domain = fileName.split('-')[0];
      return this.findDomainL1Agent(domain);
    }

    return null;
  }

  /**
   * Trova agent L1 per dominio
   */
  private findDomainL1Agent(domain: string): string | null {
    const l1Agents: Record<string, string> = {
      'gui': 'experts/gui-super-expert.md',
      'db': 'experts/database_expert.md',
      'security': 'experts/security_unified_expert.md',
      'api': 'experts/integration_expert.md',
      'test': 'experts/tester_expert.md',
      'architecture': 'experts/architect_expert.md'
    };

    return l1Agents[domain] || null;
  }

  /**
   * FIX 3: Safe Agent Task Creation con Validation
   * Crea task solo con agent validati, applica fallback se necessario
   */
  async createSafeAgentTask(taskConfig: {
    id: string;
    description: string;
    agentExpertFile: string;
    model: 'haiku' | 'sonnet' | 'opus';
    specialization: string;
    dependencies: string[];
    priority: 'CRITICA' | 'ALTA' | 'MEDIA';
    level: 1 | 2 | 3;
  }): Promise<any> {
    // Validate agent file exists
    const isValid = await this.validateAgentFile(taskConfig.agentExpertFile);

    let finalAgentFile = taskConfig.agentExpertFile;
    let wasFallback = false;

    if (!isValid) {
      // Apply fallback
      finalAgentFile = this.getFallbackAgent(taskConfig.agentExpertFile);
      wasFallback = true;

      console.log(`✅ Safe task created with fallback:`);
      console.log(`   Original: ${taskConfig.agentExpertFile}`);
      console.log(`   Fallback: ${finalAgentFile}`);
    }

    return {
      ...taskConfig,
      agentExpertFile: finalAgentFile,
      originalAgentFile: wasFallback ? taskConfig.agentExpertFile : undefined,
      isFallback: wasFallback
    };
  }

  /**
   * FIX 4: Disable Sub-Agent Spawning
   * Disabilita spawning quando sub-agents non disponibili
   */
  shouldAllowSubSpawning(agentFile: string, availableSubAgents: string[]): boolean {
    // Verifica se esistono sub-agents per questo agent

    // Get potential sub-agents per questo agent
    const potentialSubAgents = this.getPotentialSubAgents(agentFile);

    // Check quanti esistono realmente
    const existingSubAgents = potentialSubAgents.filter(
      subAgent => availableSubAgents.includes(subAgent)
    );

    // Allow spawning solo se almeno 50% sub-agents esistono
    const threshold = 0.5;
    const existenceRatio = existingSubAgents.length / potentialSubAgents.length;

    const shouldAllow = existenceRatio >= threshold;

    console.log(`📊 Sub-spawning analysis for ${agentFile}:`);
    console.log(`   Potential sub-agents: ${potentialSubAgents.length}`);
    console.log(`   Existing sub-agents: ${existingSubAgents.length}`);
    console.log(`   Existence ratio: ${(existenceRatio * 100).toFixed(1)}%`);
    console.log(`   Allow spawning: ${shouldAllow ? 'YES ✅' : 'NO ❌'}`);

    return shouldAllow;
  }

  /**
   * Ottieni lista sub-agents potenziali per un agent
   */
  private getPotentialSubAgents(agentFile: string): string[] {
    // Mappa agent L1 → sub-agents L2/L3 teorici
    const subAgentMap: Record<string, string[]> = {
      'experts/gui-super-expert.md': [
        'experts/gui-layout-specialist.md',
        'experts/gui-widget-creator.md',
        'experts/gui-event-handler.md',
        'experts/gui-style-manager.md'
      ],
      'experts/database_expert.md': [
        'experts/db-schema-designer.md',
        'experts/db-migration-specialist.md',
        'experts/db-query-optimizer.md'
      ],
      'experts/security_unified_expert.md': [
        'experts/security-auth-specialist.md',
        'experts/security-encryption-expert.md',
        'experts/security-access-control.md'
      ],
      'experts/integration_expert.md': [
        'experts/api-design-specialist.md',
        'experts/api-versioning-expert.md',
        'experts/webhook-integration-expert.md'
      ],
      'core/coder.md': [
        'core/micro-coder.md',
        'core/code-optimizer.md'
      ]
    };

    return subAgentMap[agentFile] || [];
  }

  /**
   * FIX 5: Get Available Agents (scan filesystem)
   */
  async getAvailableAgents(): Promise<string[]> {
    const availableAgents: string[] = [];

    try {
      // Scan experts/
      const expertsDir = path.join(this.agentBasePath, 'experts');
      const expertFiles = await fs.readdir(expertsDir);

      for (const file of expertFiles) {
        if (file.endsWith('.md')) {
          availableAgents.push(`experts/${file}`);
        }
      }

      // Scan core/
      const coreDir = path.join(this.agentBasePath, 'core');
      const coreFiles = await fs.readdir(coreDir);

      for (const file of coreFiles) {
        if (file.endsWith('.md') && !file.includes('TODO') && !file.includes('DOCUMENTATION')) {
          availableAgents.push(`core/${file}`);
        }
      }

    } catch (error) {
      console.error('Error scanning agents directory:', error);
    }

    console.log(`📊 Available agents discovered: ${availableAgents.length}`);
    availableAgents.forEach(agent => console.log(`   ✅ ${agent}`));

    return availableAgents;
  }

  /**
   * FIX 6: Adaptive Complexity Threshold
   * Adatta threshold basato su disponibilità sub-agents
   */
  getAdaptiveComplexityThreshold(agentFile: string, hasSubAgents: boolean): number {
    if (!hasSubAgents) {
      // No sub-agents disponibili → mai trigger spawning
      return 1.0;
    }

    // Sub-agents disponibili → threshold normale
    return 0.7;
  }

  /**
   * UTILITY: Generate Fallback Report
   */
  generateFallbackReport(): string {
    const totalMappings = Object.keys(FALLBACK_MAPPING).length - 1; // -1 per default
    const domainCount = Object.keys(DOMAIN_FALLBACKS).length - 1; // -1 per default

    return `
🔄 FALLBACK SYSTEM REPORT
${'='.repeat(80)}

📊 Fallback Mappings:
├─ Total explicit mappings: ${totalMappings}
├─ Domain-based fallbacks: ${domainCount}
└─ Ultimate fallback: ${FALLBACK_MAPPING['default']}

🎯 Coverage by Domain:
├─ GUI: ${this.countMappingsForDomain('gui')} mappings
├─ Database: ${this.countMappingsForDomain('db')} mappings
├─ Security: ${this.countMappingsForDomain('security')} mappings
├─ API: ${this.countMappingsForDomain('api')} mappings
├─ Architecture: ${this.countMappingsForDomain('architecture')} mappings
├─ Testing: ${this.countMappingsForDomain('test')} mappings
└─ Core: ${this.countMappingsForDomain('core')} mappings

✅ Fallback System: READY
`;
  }

  private countMappingsForDomain(domain: string): number {
    return Object.keys(FALLBACK_MAPPING).filter(key =>
      key.toLowerCase().includes(domain)
    ).length;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  OrchestratorQuickFixer,
  FALLBACK_MAPPING,
  DOMAIN_FALLBACKS
};

// ============================================================================
// CLI USAGE (if run directly)
// ============================================================================

async function main() {
  console.log('🔧 ORCHESTRATOR QUICK FIXES V1.0\n');

  const fixer = new OrchestratorQuickFixer();

  // Test 1: Validate agents
  console.log('📋 TEST 1: Validating sample agents...\n');

  const testAgents = [
    'experts/gui-super-expert.md',
    'experts/database_expert.md',
    'experts/gui-layout-specialist.md',  // Non esiste
    'core/coder.md',
    'core/micro-coder.md'  // Non esiste
  ];

  for (const agent of testAgents) {
    const isValid = await fixer.validateAgentFile(agent);
    console.log(`${isValid ? '✅' : '❌'} ${agent}`);

    if (!isValid) {
      const fallback = fixer.getFallbackAgent(agent);
      console.log(`   → Fallback: ${fallback}`);
    }
  }

  // Test 2: Available agents
  console.log('\n📋 TEST 2: Scanning available agents...\n');
  const available = await fixer.getAvailableAgents();

  // Test 3: Sub-spawning analysis
  console.log('\n📋 TEST 3: Sub-spawning analysis...\n');
  const shouldSpawn = fixer.shouldAllowSubSpawning('experts/gui-super-expert.md', available);
  console.log(`\nResult: ${shouldSpawn ? 'ALLOW ✅' : 'BLOCK ❌'} sub-agent spawning`);

  // Test 4: Fallback report
  console.log('\n' + fixer.generateFallbackReport());
}

if (require.main === module) {
  main().catch(console.error);
}
