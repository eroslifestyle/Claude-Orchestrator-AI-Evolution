/**
 * Configuration Loader
 *
 * Handles loading and validation of plugin configuration files.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PluginConfig, AgentConfig, KeywordMapping, PriorityLevel } from '../types';

export class ConfigLoader {
  private static configCache: PluginConfig | null = null;

  /**
   * Load complete plugin configuration
   */
  static loadConfig(): PluginConfig {
    if (this.configCache) {
      return this.configCache;
    }

    try {
      const configDir = this.getConfigDirectory();

      // Load agent registry
      const agentRegistry = this.loadAgentRegistry(configDir);

      // Load keyword mappings
      const keywordMappings = this.loadKeywordMappings(configDir);

      // Load model defaults
      const modelDefaults = this.loadModelDefaults(configDir);

      // Construct complete configuration
      const config: PluginConfig = {
        routing: {
          fallback_agent: 'coder',
          max_parallel_agents: 20,
          escalation_enabled: true,
          auto_documentation: true,
        },
        performance: {
          max_planning_time: 30000,          // 30 seconds
          progress_update_interval: 1000,    // 1 second
          session_timeout: 3600000,          // 1 hour
        },
        costs: {
          default_budget: 500,               // $5.00 in cents
          cost_alerts: true,
          model_costs: modelDefaults.model_selection_rules || {
            haiku: 0.00025,
            sonnet: 0.003,
            opus: 0.015,
          },
        },
        agents: agentRegistry,
        keywords: keywordMappings,
      };

      // Cache and return
      this.configCache = config;
      return config;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load plugin configuration: ${errorMessage}`);
    }
  }

  /**
   * Get configuration directory path
   */
  private static getConfigDirectory(): string {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(__dirname, '../../config'),
      path.join(process.cwd(), 'config'),
      path.join(process.cwd(), 'dist/config'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    throw new Error('Configuration directory not found. Please ensure config/ directory exists.');
  }

  /**
   * Load agent registry configuration
   */
  private static loadAgentRegistry(configDir: string): AgentConfig[] {
    const agentRegistryPath = path.join(configDir, 'agent-registry.json');

    if (!fs.existsSync(agentRegistryPath)) {
      // Return default agent registry instead of throwing
      return this.getDefaultAgentRegistry();
    }

    const registryData = JSON.parse(fs.readFileSync(agentRegistryPath, 'utf-8'));

    // Convert registry format to AgentConfig array
    const agents: AgentConfig[] = [];

    // Add core agents
    if (registryData.core) {
      for (const agent of registryData.core) {
        agents.push({
          id: agent.name || agent.file?.replace('.md', '') || 'unknown',
          name: agent.name || 'Unknown',
          file: agent.file,
          model: agent.defaultModel || 'sonnet',
          priority: this.mapPriority(agent.priority),
          specialization: Array.isArray(agent.specialization) ? agent.specialization : [agent.specialization || 'general'],
          level: 1,
          role: agent.role,
          description: agent.description,
          keywords: agent.keywords || [],
          defaultModel: agent.defaultModel,
          size_kb: agent.size_kb,
          version: agent.version,
        });
      }
    }

    // Add expert agents
    if (registryData.experts) {
      for (const agent of registryData.experts) {
        agents.push({
          id: agent.name || agent.file?.replace('.md', '') || 'unknown',
          name: agent.name || 'Unknown',
          file: agent.file,
          model: agent.defaultModel || 'sonnet',
          priority: this.mapPriority(agent.priority),
          specialization: Array.isArray(agent.specialization) ? agent.specialization : [agent.specialization || 'general'],
          level: 2,
          role: agent.role,
          description: agent.description,
          keywords: agent.keywords || [],
          defaultModel: agent.defaultModel,
          size_kb: agent.size_kb,
          version: agent.version,
        });
      }
    }

    return agents;
  }

  /**
   * Get default agent registry when config file is missing
   */
  private static getDefaultAgentRegistry(): AgentConfig[] {
    return [
      // Core agents
      {
        id: 'orchestrator',
        name: 'Orchestrator',
        file: 'orchestrator-supremo.md',
        model: 'opus',
        priority: 'CRITICA',
        specialization: ['orchestration', 'coordination', 'planning'],
        level: 1,
      },
      {
        id: 'coder',
        name: 'Coder Expert',
        file: 'core/coder.md',
        model: 'sonnet',
        priority: 'ALTA',
        specialization: ['coding', 'implementation', 'development'],
        level: 1,
      },
      {
        id: 'analyzer',
        name: 'Analyzer Expert',
        file: 'core/analyzer.md',
        model: 'haiku',
        priority: 'ALTA',
        specialization: ['analysis', 'search', 'exploration'],
        level: 1,
      },
      // Expert agents
      {
        id: 'gui-super-expert',
        name: 'GUI Super Expert',
        file: 'experts/gui-super-expert.md',
        model: 'sonnet',
        priority: 'ALTA',
        specialization: ['gui', 'pyqt5', 'qt', 'ui', 'widgets'],
        level: 2,
      },
      {
        id: 'database_expert',
        name: 'Database Expert',
        file: 'experts/database_expert.md',
        model: 'sonnet',
        priority: 'ALTA',
        specialization: ['database', 'sql', 'sqlite', 'postgresql'],
        level: 2,
      },
      {
        id: 'security_expert',
        name: 'Security Expert',
        file: 'experts/security_unified_expert.md',
        model: 'sonnet',
        priority: 'CRITICA',
        specialization: ['security', 'auth', 'jwt', 'encryption'],
        level: 2,
      },
      {
        id: 'integration_expert',
        name: 'Integration Expert',
        file: 'experts/integration_expert.md',
        model: 'sonnet',
        priority: 'ALTA',
        specialization: ['api', 'telegram', 'ctrader', 'webhook'],
        level: 2,
      },
      {
        id: 'mql_expert',
        name: 'MQL Expert',
        file: 'experts/mql_expert.md',
        model: 'sonnet',
        priority: 'ALTA',
        specialization: ['mql', 'mql5', 'metatrader', 'ea'],
        level: 2,
      },
      {
        id: 'architect_expert',
        name: 'Architect Expert',
        file: 'experts/architect_expert.md',
        model: 'opus',
        priority: 'ALTA',
        specialization: ['architecture', 'design-patterns', 'refactor'],
        level: 2,
      },
      {
        id: 'tester_expert',
        name: 'Tester Expert',
        file: 'experts/tester_expert.md',
        model: 'sonnet',
        priority: 'ALTA',
        specialization: ['testing', 'debug', 'qa'],
        level: 2,
      },
      {
        id: 'documenter',
        name: 'Documenter Expert',
        file: 'core/documenter.md',
        model: 'haiku',
        priority: 'CRITICA',
        specialization: ['documentation', 'docs', 'readme'],
        level: 1,
      },
    ];
  }

  /**
   * Load keyword mappings configuration
   */
  private static loadKeywordMappings(configDir: string): KeywordMapping[] {
    const keywordMappingsPath = path.join(configDir, 'keyword-mappings.json');

    if (!fs.existsSync(keywordMappingsPath)) {
      // Return default keyword mappings instead of throwing
      return this.getDefaultKeywordMappings();
    }

    const mappingsData = JSON.parse(fs.readFileSync(keywordMappingsPath, 'utf-8'));

    const mappings: KeywordMapping[] = [];

    // Process domain mappings
    if (mappingsData.domain_mappings) {
      for (const [domain, config] of Object.entries(mappingsData.domain_mappings)) {
        const cfg = config as any;
        // Extract first keyword from domain or use domain name
        const keyword = cfg.keywords?.[0] || domain.toLowerCase().split('_')[0];
        mappings.push({
          keyword,
          expertFile: cfg.primary_agent || `experts/${domain}_expert.md`,
          domain,
          primary_agent: cfg.primary_agent,
          keywords: cfg.keywords || [],
          priority: this.mapPriority(cfg.priority),
          model: cfg.model || 'sonnet',
          notes: cfg.notes,
        });
      }
    }

    // Process core function mappings
    if (mappingsData.core_functions) {
      for (const [funcName, config] of Object.entries(mappingsData.core_functions)) {
        const cfg = config as any;
        const keyword = cfg.keywords?.[0] || funcName.toLowerCase();
        mappings.push({
          keyword,
          expertFile: cfg.primary_agent || `core/${funcName}.md`,
          domain: funcName,
          primary_agent: cfg.primary_agent,
          keywords: cfg.keywords || [],
          priority: this.mapPriority(cfg.priority),
          model: cfg.model || 'haiku',
          notes: cfg.notes,
        });
      }
    }

    return mappings;
  }

  /**
   * Load model defaults configuration
   */
  private static loadModelDefaults(configDir: string): any {
    const modelDefaultsPath = path.join(configDir, 'model-defaults.json');

    if (!fs.existsSync(modelDefaultsPath)) {
      // Return default values if file doesn't exist
      return {
        model_selection_rules: {
          haiku: 0.00025,
          sonnet: 0.003,
          opus: 0.015,
        },
      };
    }

    return JSON.parse(fs.readFileSync(modelDefaultsPath, 'utf-8'));
  }

  /**
   * Validate configuration structure
   */
  static validateConfig(config: PluginConfig): boolean {
    try {
      // Basic structure validation
      if (!config.routing || !config.performance || !config.costs) {
        return false;
      }

      if (!Array.isArray(config.agents) || !Array.isArray(config.keywords)) {
        return false;
      }

      // Validate agents have required fields
      for (const agent of config.agents) {
        if (!agent.name || !agent.file || !agent.role || !agent.defaultModel) {
          return false;
        }
      }

      // Validate keyword mappings have required fields
      for (const mapping of config.keywords) {
        if (!mapping.domain || !mapping.primary_agent || !Array.isArray(mapping.keywords)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      // Log error for debugging but don't throw
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Configuration validation error: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get agent configuration by name
   */
  static getAgent(agentName: string, config?: PluginConfig): AgentConfig | null {
    const cfg = config || this.loadConfig();
    if (!cfg.agents) return null;
    return cfg.agents.find((agent: any) => agent.name === agentName) || null;
  }

  /**
   * Get keyword mappings for domain
   */
  static getKeywordMappings(domain: string, config?: PluginConfig): KeywordMapping[] {
    const cfg = config || this.loadConfig();
    if (!cfg.keywords) return [];
    return cfg.keywords.filter((mapping: any) => mapping.domain === domain);
  }

  /**
   * Get default keyword mappings when config file is missing
   */
  private static getDefaultKeywordMappings(): KeywordMapping[] {
    return [
      // GUI Domain
      { keyword: 'gui', expertFile: 'experts/gui-super-expert.md', domain: 'GUI' },
      { keyword: 'pyqt5', expertFile: 'experts/gui-super-expert.md', domain: 'GUI' },
      { keyword: 'qt', expertFile: 'experts/gui-super-expert.md', domain: 'GUI' },
      { keyword: 'widget', expertFile: 'experts/gui-super-expert.md', domain: 'GUI' },
      { keyword: 'dialog', expertFile: 'experts/gui-super-expert.md', domain: 'GUI' },
      { keyword: 'tabwidget', expertFile: 'experts/gui-super-expert.md', domain: 'GUI' },  // FIX #2: "tab" -> "tabwidget" per evitare false positive con "database"
      // Database Domain
      { keyword: 'database', expertFile: 'experts/database_expert.md', domain: 'Database' },
      { keyword: 'sql', expertFile: 'experts/database_expert.md', domain: 'Database' },
      { keyword: 'sqlite', expertFile: 'experts/database_expert.md', domain: 'Database' },
      { keyword: 'postgresql', expertFile: 'experts/database_expert.md', domain: 'Database' },
      { keyword: 'query', expertFile: 'experts/database_expert.md', domain: 'Database' },
      // Security Domain
      { keyword: 'security', expertFile: 'experts/security_unified_expert.md', domain: 'Security' },
      { keyword: 'auth', expertFile: 'experts/security_unified_expert.md', domain: 'Security' },
      { keyword: 'authentication', expertFile: 'experts/security_unified_expert.md', domain: 'Security' },
      { keyword: 'jwt', expertFile: 'experts/security_unified_expert.md', domain: 'Security' },
      { keyword: 'password', expertFile: 'experts/security_unified_expert.md', domain: 'Security' },
      // API Integration
      { keyword: 'api', expertFile: 'experts/integration_expert.md', domain: 'API' },
      { keyword: 'telegram', expertFile: 'experts/integration_expert.md', domain: 'API' },
      { keyword: 'ctrader', expertFile: 'experts/integration_expert.md', domain: 'API' },
      { keyword: 'webhook', expertFile: 'experts/integration_expert.md', domain: 'API' },
      { keyword: 'integration', expertFile: 'experts/integration_expert.md', domain: 'API' },
      // MQL Domain
      { keyword: 'mql', expertFile: 'experts/mql_expert.md', domain: 'MQL' },
      { keyword: 'mql5', expertFile: 'experts/mql_expert.md', domain: 'MQL' },
      { keyword: 'ea', expertFile: 'experts/mql_expert.md', domain: 'MQL' },
      { keyword: 'metatrader', expertFile: 'experts/mql_expert.md', domain: 'MQL' },
      // Architecture
      { keyword: 'architecture', expertFile: 'experts/architect_expert.md', domain: 'Architecture' },
      { keyword: 'design pattern', expertFile: 'experts/architect_expert.md', domain: 'Architecture' },
      { keyword: 'refactor', expertFile: 'experts/architect_expert.md', domain: 'Architecture' },
      // Testing
      { keyword: 'test', expertFile: 'experts/tester_expert.md', domain: 'Testing' },
      { keyword: 'debug', expertFile: 'experts/tester_expert.md', domain: 'Testing' },
      { keyword: 'bug', expertFile: 'experts/tester_expert.md', domain: 'Testing' },
      // Core Functions
      { keyword: 'cerca', expertFile: 'core/analyzer.md', domain: 'Core' },
      { keyword: 'trova', expertFile: 'core/analyzer.md', domain: 'Core' },
      { keyword: 'analizza', expertFile: 'core/analyzer.md', domain: 'Core' },
      { keyword: 'implementa', expertFile: 'core/coder.md', domain: 'Core' },
      { keyword: 'feature', expertFile: 'core/coder.md', domain: 'Core' },
      { keyword: 'codifica', expertFile: 'core/coder.md', domain: 'Core' },
      { keyword: 'documenta', expertFile: 'core/documenter.md', domain: 'Core' },
      { keyword: 'docs', expertFile: 'core/documenter.md', domain: 'Core' },
    ];
  }

  /**
   * Clear configuration cache (useful for testing)
   */
  static clearCache(): void {
    this.configCache = null;
  }

  /**
   * Map priority string to PriorityLevel type
   */
  private static mapPriority(priority: any): PriorityLevel {
    const p = String(priority).toUpperCase();
    if (p === 'CRITICA' || p === 'CRITICAL') return 'CRITICA';
    if (p === 'ALTA' || p === 'HIGH') return 'ALTA';
    if (p === 'BASSA' || p === 'LOW') return 'BASSA';
    return 'MEDIA'; // Default
  }
}