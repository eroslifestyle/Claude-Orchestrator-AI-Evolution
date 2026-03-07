/**
 * Configuration Management UI for Claude Code Orchestrator Plugin
 *
 * Provides interactive setup wizard, agent registry management,
 * and keyword mappings configuration interface.
 *
 * @version 1.0.0
 * @author Development Team
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import chalk from 'chalk';
import { table as createTable } from 'table';

import { PluginLogger } from '../utils/logger';
import type {
  OrchestratorConfig,
  AgentRegistry,
  AgentDefinition,
  KeywordMapping,
  ConfigurationWizardOptions,
  ConfigurationValidationResult,
  SetupWizardStep,
  PriorityLevel,
  PluginConfig
} from '../types';

/**
 * Interactive Setup Wizard
 */
class SetupWizard {
  private currentStep: number = 0;
  private config: Partial<OrchestratorConfig> = {};
  private rl!: readline.Interface; // Definitely assigned in start method

  private readonly steps: SetupWizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Orchestrator Plugin Setup',
      description: 'This wizard will help you configure the Claude Code Orchestrator Plugin',
      type: 'info'
    },
    {
      id: 'basic-config',
      title: 'Basic Configuration',
      description: 'Set up basic orchestration parameters',
      type: 'input',
      fields: [
        { key: 'maxParallelAgents', label: 'Maximum parallel agents', default: '20', type: 'number' },
        { key: 'defaultTimeLimit', label: 'Default time limit (seconds)', default: '1800', type: 'number' },
        { key: 'defaultBudget', label: 'Default budget (cents)', default: '100', type: 'number' }
      ]
    },
    {
      id: 'model-preferences',
      title: 'Model Preferences',
      description: 'Configure Claude model usage preferences',
      type: 'choice',
      choices: [
        { key: 'balanced', label: 'Balanced (auto-select best model per task)', default: true },
        { key: 'cost-optimized', label: 'Cost-optimized (prefer Haiku when possible)' },
        { key: 'performance-first', label: 'Performance-first (prefer Sonnet/Opus)' },
        { key: 'custom', label: 'Custom configuration' }
      ]
    },
    {
      id: 'agent-registry',
      title: 'Agent Registry',
      description: 'Configure expert agent preferences',
      type: 'multi-choice',
      choices: [
        { key: 'gui-super-expert', label: 'GUI Super Expert (PyQt5, UI)', default: true },
        { key: 'tester_expert', label: 'Tester Expert (Testing, QA)', default: true },
        { key: 'database_expert', label: 'Database Expert (SQL, optimization)', default: true },
        { key: 'security_unified_expert', label: 'Security Expert (Auth, encryption)', default: true },
        { key: 'devops_expert', label: 'DevOps Expert (CI/CD, deployment)', default: true }
      ]
    },
    {
      id: 'keyword-mappings',
      title: 'Keyword Mappings',
      description: 'Configure automatic agent selection based on keywords',
      type: 'custom'
    },
    {
      id: 'advanced-settings',
      title: 'Advanced Settings',
      description: 'Configure advanced orchestration features',
      type: 'input',
      fields: [
        { key: 'enableCaching', label: 'Enable result caching', default: 'true', type: 'boolean' },
        { key: 'enableMetrics', label: 'Enable metrics collection', default: 'true', type: 'boolean' },
        { key: 'logLevel', label: 'Log level', default: 'info', type: 'choice', choices: ['debug', 'info', 'warn', 'error'] }
      ]
    },
    {
      id: 'confirmation',
      title: 'Configuration Summary',
      description: 'Review and confirm your configuration',
      type: 'confirmation'
    },
    {
      id: 'completion',
      title: 'Setup Complete!',
      description: 'Your Orchestrator Plugin has been successfully configured',
      type: 'completion'
    }
  ];

  constructor() {
    // Initialize in the start method
  }

  /**
   * Start the interactive setup wizard
   */
  async start(_options: ConfigurationWizardOptions = {}): Promise<OrchestratorConfig> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.clear();
      this.displayHeader();

      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i;
        await this.executeStep(this.steps[i]);
      }

      const finalConfig = this.buildFinalConfiguration();
      this.displaySuccess(finalConfig);

      return finalConfig;

    } finally {
      this.rl.close();
    }
  }

  private displayHeader(): void {
    const header = `
╭─────────────────────────────────────────────────────────╮
│  🎯 Claude Code Orchestrator Plugin Setup Wizard       │
│  Version 1.0.0 - Interactive Configuration             │
╰─────────────────────────────────────────────────────────╯
    `;
    console.log(chalk.bold.cyan(header));
  }

  private async executeStep(step: SetupWizardStep): Promise<void> {
    console.log(chalk.bold.yellow(`\n📋 Step ${this.currentStep + 1}/${this.steps.length}: ${step.title}`));
    console.log(chalk.gray(step.description));
    console.log(chalk.gray('─'.repeat(60)));

    switch (step.type) {
      case 'info':
        await this.handleInfoStep(step);
        break;
      case 'input':
        await this.handleInputStep(step);
        break;
      case 'choice':
        await this.handleChoiceStep(step);
        break;
      case 'multi-choice':
        await this.handleMultiChoiceStep(step);
        break;
      case 'custom':
        await this.handleCustomStep(step);
        break;
      case 'confirmation':
        await this.handleConfirmationStep(step);
        break;
      case 'completion':
        await this.handleCompletionStep(step);
        break;
    }
  }

  private async handleInfoStep(_step: SetupWizardStep): Promise<void> {
    console.log(chalk.cyan('\nWelcome! This wizard will guide you through configuring:'));
    console.log('• Basic orchestration parameters');
    console.log('• Agent selection preferences');
    console.log('• Keyword mappings for automatic agent selection');
    console.log('• Advanced features and optimizations');

    await this.promptContinue();
  }

  private async handleInputStep(step: SetupWizardStep): Promise<void> {
    if (!step.fields) return;

    for (const field of step.fields) {
      const value = await this.promptInput(field);
      this.setConfigValue(field.key, value);
    }
  }

  private async handleChoiceStep(step: SetupWizardStep): Promise<void> {
    if (!step.choices) return;

    console.log(chalk.cyan('\nPlease select an option:'));

    for (let i = 0; i < step.choices.length; i++) {
      const choice = step.choices[i];
      const marker = choice.default ? chalk.green('●') : '○';
      console.log(`${marker} ${i + 1}. ${choice.label}`);
    }

    const selection = await this.promptChoice(step.choices.length);
    const selectedChoice = step.choices[selection - 1];

    this.setConfigValue(step.id, selectedChoice.key);

    if (selectedChoice.key === 'custom' && step.id === 'model-preferences') {
      await this.handleCustomModelPreferences();
    }
  }

  private async handleMultiChoiceStep(step: SetupWizardStep): Promise<void> {
    if (!step.choices) return;

    console.log(chalk.cyan('\nSelect experts to enable (enter numbers separated by commas):'));

    for (let i = 0; i < step.choices.length; i++) {
      const choice = step.choices[i];
      if (choice.default) {
        console.log(`${chalk.green('[✓]')} ${i + 1}. ${choice.label}`);
      } else {
        console.log(`[ ] ${i + 1}. ${choice.label}`);
      }
    }

    console.log(chalk.gray('\nPress Enter to accept defaults, or enter numbers (e.g., 1,3,5):'));

    const input = await this.promptInput({ key: 'selections', label: 'Your selection', default: 'default' });

    let selectedIndices: number[];
    if (input === 'default') {
      selectedIndices = (step.choices || [])
        .map((choice, index) => choice.default ? index : -1)
        .filter(index => index >= 0);
    } else {
      const maxIndex = (step.choices || []).length;
      selectedIndices = input
        .split(',')
        .map(s => parseInt(s.trim()) - 1)
        .filter(i => i >= 0 && i < maxIndex);
    }

    const selectedAgents = selectedIndices.map(i => (step.choices || [])[i].key);
    this.setConfigValue('enabledAgents', selectedAgents);
  }

  private async handleCustomStep(step: SetupWizardStep): Promise<void> {
    if (step.id === 'keyword-mappings') {
      await this.handleKeywordMappingsConfiguration();
    }
  }

  private async handleConfirmationStep(_step: SetupWizardStep): Promise<void> {
    console.log(chalk.bold.cyan('\n📋 CONFIGURATION SUMMARY'));
    console.log(chalk.gray('═'.repeat(60)));

    // Display configuration summary
    this.displayConfigurationSummary();

    const confirmed = await this.promptConfirm('Do you want to proceed with this configuration?');

    if (!confirmed) {
      console.log(chalk.yellow('\n⚠️  Configuration cancelled. You can restart the wizard anytime.'));
      process.exit(0);
    }
  }

  private async handleCompletionStep(_step: SetupWizardStep): Promise<void> {
    console.log(chalk.green('\n🎉 Setup completed successfully!'));
    console.log('\nYour Orchestrator Plugin is now ready to use.');
    console.log('\nNext steps:');
    console.log('• Try: ' + chalk.cyan('/orchestrator "your first request"'));
    console.log('• Preview: ' + chalk.cyan('/orchestrator-preview "test functionality"'));
    console.log('• Help: ' + chalk.cyan('/orchestrator --help'));
  }

  private async handleCustomModelPreferences(): Promise<void> {
    console.log(chalk.cyan('\nCustom Model Configuration:'));

    const preferences = {
      defaultModel: await this.promptChoice(['haiku', 'sonnet', 'opus'], 'Default model'),
      costThreshold: await this.promptInput({
        key: 'threshold',
        label: 'Cost threshold for model upgrades (cents)',
        default: '50',
        type: 'number'
      }),
      complexityRouting: await this.promptConfirm('Enable automatic complexity-based routing?')
    };

    this.setConfigValue('modelPreferences', preferences);
  }

  private async handleKeywordMappingsConfiguration(): Promise<void> {
    console.log(chalk.cyan('\nKeyword Mappings Configuration'));
    console.log(chalk.gray('Define keywords that automatically select specific agents\n'));

    const mappings: KeywordMapping[] = [];

    const addAnother = async (): Promise<void> => {
      const keyword = await this.promptInput({
        key: 'keyword',
        label: 'Keyword/phrase (e.g., "GUI", "database", "security")'
      });

      if (!keyword) return;

      console.log('\nAvailable agents:');
      const agents = [
        'gui-super-expert', 'tester_expert', 'database_expert',
        'security_unified_expert', 'devops_expert', 'integration_expert'
      ];

      agents.forEach((agent, i) => {
        console.log(`${i + 1}. ${agent}`);
      });

      const agentChoice = await this.promptChoice(agents.length, 'Select agent');
      const selectedAgent = agents[agentChoice - 1];

      const priority = await this.promptChoice(['low', 'medium', 'high'], 'Priority');

      mappings.push({
        keywords: [keyword.toLowerCase()],
        primary_agent: selectedAgent,
        agentFile: `experts/${selectedAgent}.md`,
        domain: keyword.toLowerCase(),
        priority: ['low', 'medium', 'high'][priority - 1] as PriorityLevel,
        model: 'sonnet',
        description: `Auto-route "${keyword}" to ${selectedAgent}`
      });

      console.log(chalk.green(`✓ Added mapping: "${keyword}" → ${selectedAgent}`));

      const continueAdding = await this.promptConfirm('\nAdd another keyword mapping?');
      if (continueAdding) {
        await addAnother();
      }
    };

    await addAnother();
    this.setConfigValue('keywordMappings', mappings);
  }

  private displayConfigurationSummary(): void {
    const tableData = [
      [chalk.bold('Setting'), chalk.bold('Value')]
    ];

    // Basic configuration
    if (this.config.maxParallelAgents) {
      tableData.push(['Max Parallel Agents', this.config.maxParallelAgents.toString()]);
    }
    if (this.config.defaultTimeLimit) {
      tableData.push(['Default Time Limit', `${this.config.defaultTimeLimit}s`]);
    }
    if (this.config.defaultBudget) {
      tableData.push(['Default Budget', `$${this.config.defaultBudget / 100}`]);
    }

    // Model preferences
    if (this.config['model-preferences']) {
      tableData.push(['Model Strategy', String(this.config['model-preferences'])]);
    }

    // Enabled agents
    if (this.config.enabledAgents) {
      const agents = (this.config.enabledAgents as string[]).join(', ');
      tableData.push(['Enabled Agents', agents]);
    }

    // Keyword mappings
    if (this.config.keywordMappings) {
      const mappings = (this.config.keywordMappings as KeywordMapping[]).length;
      tableData.push(['Keyword Mappings', `${mappings} configured`]);
    }

    const tableConfig = {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      }
    };

    console.log(createTable(tableData, tableConfig));
  }

  private setConfigValue(key: string, value: unknown): void {
    (this.config as Record<string, unknown>)[key] = value;
  }

  private buildFinalConfiguration(): OrchestratorConfig {
    const config: OrchestratorConfig = {
      version: '1.0.0',
      maxParallelAgents: parseInt(String(this.config.maxParallelAgents)) || 20,
      defaultTimeLimit: parseInt(String(this.config.defaultTimeLimit)) || 1800,
      defaultBudget: parseInt(String(this.config.defaultBudget)) || 100,
      modelPreferences: this.config.modelPreferences || { strategy: this.config['model-preferences'] || 'balanced' },
      agentRegistry: this.buildAgentRegistry(),
      keywordMappings: this.config.keywordMappings as KeywordMapping[] || [],
      enabledAgents: this.config.enabledAgents as string[],
      enableCaching: this.config.enableCaching,
      enableMetrics: this.config.enableMetrics,
      logLevel: this.config.logLevel,
      'model-preferences': this.config['model-preferences'],
      features: {
        enableCaching: this.config.enableCaching !== false,
        enableMetrics: this.config.enableMetrics !== false,
        enableAutoDocumentation: true,
        enableProgressVisualization: true
      },
      logging: {
        level: String(this.config.logLevel || 'info'),
        enableFileLogging: true,
        enableConsoleLogging: true
      },
      paths: {
        configDirectory: path.join(os.homedir(), '.claude', 'orchestrator'),
        agentFiles: path.join(os.homedir(), '.claude', 'agents'),
        logsDirectory: path.join(os.homedir(), '.claude', 'orchestrator', 'logs'),
        cacheDirectory: path.join(os.homedir(), '.claude', 'orchestrator', 'cache')
      }
    };

    return config;
  }

  private buildAgentRegistry(): AgentRegistry {
    const enabledAgents = (this.config.enabledAgents as string[]) || [];

    const agentDefinitions: AgentDefinition[] = [
      {
        id: 'gui-super-expert',
        name: 'GUI Super Expert',
        role: 'GUI Development',
        instructions: 'Specializes in GUI development, PyQt5, and UI/UX design',
        filePath: 'experts/gui-super-expert.md',
        specialization: ['GUI development, PyQt5, UI/UX'],
        defaultModel: 'sonnet',
        keywords: ['gui', 'ui', 'interface', 'pyqt', 'widget'],
        enabled: enabledAgents.includes('gui-super-expert')
      },
      {
        id: 'tester_expert',
        name: 'Tester Expert',
        role: 'Testing & QA',
        instructions: 'Specializes in testing, quality assurance, debugging, and performance',
        filePath: 'experts/tester_expert.md',
        specialization: ['Testing, QA, debugging, performance'],
        defaultModel: 'sonnet',
        keywords: ['test', 'debug', 'qa', 'performance', 'bug'],
        enabled: enabledAgents.includes('tester_expert')
      },
      {
        id: 'database_expert',
        name: 'Database Expert',
        role: 'Database Development',
        instructions: 'Specializes in database design and SQL optimization',
        filePath: 'experts/database_expert.md',
        specialization: ['Database design, SQL optimization'],
        defaultModel: 'sonnet',
        keywords: ['database', 'sql', 'query', 'schema', 'optimization'],
        enabled: enabledAgents.includes('database_expert')
      },
      {
        id: 'security_unified_expert',
        name: 'Security Expert',
        role: 'Security Engineering',
        instructions: 'Specializes in security, authentication, and encryption',
        filePath: 'experts/security_unified_expert.md',
        specialization: ['Security, authentication, encryption'],
        defaultModel: 'sonnet',
        keywords: ['security', 'auth', 'encryption', 'login', 'oauth'],
        enabled: enabledAgents.includes('security_unified_expert')
      },
      {
        id: 'devops_expert',
        name: 'DevOps Expert',
        role: 'DevOps Engineering',
        instructions: 'Specializes in DevOps, CI/CD, and deployment',
        filePath: 'experts/devops_expert.md',
        specialization: ['DevOps, CI/CD, deployment'],
        defaultModel: 'haiku',
        keywords: ['deploy', 'docker', 'ci', 'cd', 'pipeline'],
        enabled: enabledAgents.includes('devops_expert')
      }
    ];

    return {
      agents: new Map(agentDefinitions.map(item => [item.id, item])),
      keywords: new Map(),
      domains: new Map()
    };
  }

  private async promptInput(field: any): Promise<string> {
    return new Promise((resolve) => {
      const defaultText = field.default ? ` (default: ${field.default})` : '';
      const question = `${field.label}${defaultText}: `;

      this.rl.question(chalk.cyan(question), (answer) => {
        resolve(answer.trim() || String(field.default || ''));
      });
    });
  }

  private async promptChoice(options: number | string[], label?: string): Promise<number> {
    return new Promise((resolve) => {
      const maxOptions = typeof options === 'number' ? options : options.length;
      const question = label ? `${label} (1-${maxOptions}): ` : `Select option (1-${maxOptions}): `;

      this.rl.question(chalk.cyan(question), (answer) => {
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= maxOptions) {
          resolve(choice);
        } else {
          console.log(chalk.red('Invalid choice. Please try again.'));
          resolve(this.promptChoice(options, label));
        }
      });
    });
  }

  private async promptConfirm(question: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(`${question} (y/N): `), (answer) => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  private async promptContinue(): Promise<void> {
    return new Promise((resolve) => {
      this.rl.question(chalk.gray('\nPress Enter to continue...'), () => {
        resolve();
      });
    });
  }

  private displaySuccess(config: OrchestratorConfig): void {
    console.log(chalk.green('\n✅ Configuration saved successfully!'));
    console.log(chalk.gray(`Configuration file: ${config.paths.configDirectory}/config.json`));
  }
}

/**
 * Configuration Validator
 */
class ConfigurationValidator {
  // Removed unused logger

  /**
   * Validate configuration object
   */
  validate(config: OrchestratorConfig): ConfigurationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate basic configuration
    if (config.maxParallelAgents < 1 || config.maxParallelAgents > 100) {
      errors.push('maxParallelAgents must be between 1 and 100');
    }

    if (config.defaultTimeLimit < 60) {
      warnings.push('defaultTimeLimit is very low (< 60 seconds)');
    }

    if (config.defaultBudget < 10) {
      warnings.push('defaultBudget is very low (< 10 cents)');
    }

    // Validate agent registry
    const agentsCount = this.getAgentsCount(config.agentRegistry);
    if (!config.agentRegistry || agentsCount === 0) {
      warnings.push('No agents enabled - orchestration functionality will be limited');
    }

    // Validate paths
    if (config.paths) {
      for (const [pathName, pathValue] of Object.entries(config.paths)) {
        if (!pathValue) {
          errors.push(`${pathName} path is required`);
        }
      }
    }

    // Validate keyword mappings
    if (config.keywordMappings) {
      for (const mapping of config.keywordMappings) {
        if (!mapping.keywords || mapping.keywords.length === 0) {
          errors.push('Keyword mapping must have at least one keyword');
        }
        if (!mapping.primary_agent && !mapping.agentFile) {
          errors.push('Keyword mapping must specify an agent');
        }
      }
    }

    // Generate suggestions
    const enabledAgentsCount = this.getEnabledAgentsCount(config.agentRegistry);
    if (enabledAgentsCount < 3) {
      suggestions.push('Consider enabling more agents for better coverage');
    }

    if (!config.keywordMappings || config.keywordMappings.length === 0) {
      suggestions.push('Add keyword mappings to improve automatic agent selection');
    }

    if (config.maxParallelAgents > 50) {
      suggestions.push('High parallel agent count may impact performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate agent files exist
   */
  async validateAgentFiles(config: OrchestratorConfig): Promise<string[]> {
    const missingFiles: string[] = [];

    if (!config.agentRegistry || !config.paths) {
      return missingFiles;
    }

    const agents = this.getAgentsArray(config.agentRegistry.agents);
    for (const agent of agents) {
      if (agent.enabled) {
        const agentFilePath = agent.filePath || agent.id + '.md';
        const fullPath = path.join(config.paths.agentFiles as string, agentFilePath);
        if (!fs.existsSync(fullPath)) {
          missingFiles.push(agentFilePath);
        }
      }
    }

    return missingFiles;
  }

  /**
   * Helper to get agents count from registry
   */
  private getAgentsCount(registry?: { agents: AgentDefinition[] | Map<string, AgentDefinition> }): number {
    if (!registry) return 0;
    if (Array.isArray(registry.agents)) return registry.agents.length;
    return registry.agents.size;
  }

  /**
   * Helper to get enabled agents count from registry
   */
  private getEnabledAgentsCount(registry?: { agents: AgentDefinition[] | Map<string, AgentDefinition> }): number {
    if (!registry) return 0;
    const agents = this.getAgentsArray(registry.agents);
    return agents.filter((a: AgentDefinition) => a.enabled).length;
  }

  /**
   * Helper to get agents as array
   */
  private getAgentsArray(agents: AgentDefinition[] | Map<string, AgentDefinition>): AgentDefinition[] {
    if (Array.isArray(agents)) return agents;
    return Array.from(agents.values());
  }
}

/**
 * Main Configuration Manager
 */
export class ConfigurationManager {
  private readonly logger: PluginLogger;
  private readonly wizard: SetupWizard;
  private readonly validator: ConfigurationValidator;
  private currentConfig: OrchestratorConfig | null = null;

  constructor() {
    this.logger = new PluginLogger('ConfigurationManager');
    this.wizard = new SetupWizard();
    this.validator = new ConfigurationValidator();
  }

  /**
   * Run interactive setup wizard
   */
  async runSetupWizard(options?: ConfigurationWizardOptions): Promise<OrchestratorConfig> {
    this.logger.info('Starting configuration setup wizard');

    try {
      const config = await this.wizard.start(options);

      // Validate configuration
      const validation = this.validator.validate(config);

      if (!validation.valid) {
        console.log(chalk.red('\n❌ Configuration validation failed:'));
        validation.errors.forEach((error: string) => console.log(chalk.red(`  • ${error}`)));
        throw new Error('Invalid configuration generated');
      }

      // Save configuration
      await this.saveConfiguration(config);
      this.currentConfig = config;

      this.logger.info('Setup wizard completed successfully');
      return config;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Setup wizard failed', { error: errorObj.message });
      throw errorObj;
    }
  }

  /**
   * Load existing configuration
   */
  async loadConfiguration(configPath?: string): Promise<OrchestratorConfig> {
    const defaultPath = path.join(os.homedir(), '.claude', 'orchestrator', 'config.json');
    const filePath = configPath || defaultPath;

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Configuration file not found: ${filePath}`);
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(data) as OrchestratorConfig;

      // Validate loaded configuration
      const validation = this.validator.validate(config);

      if (!validation.valid) {
        console.log(chalk.yellow('\n⚠️  Configuration validation warnings:'));
        validation.warnings.forEach((warning: string) => console.log(chalk.yellow(`  • ${warning}`)));
        validation.errors.forEach((error: string) => console.log(chalk.red(`  • ${error}`)));
      }

      this.currentConfig = config;
      this.logger.info('Configuration loaded successfully', { path: filePath });

      return config;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to load configuration', { error: errorObj.message, path: filePath });
      throw errorObj;
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfiguration(config: OrchestratorConfig, configPath?: string): Promise<void> {
    const defaultPath = path.join(os.homedir(), '.claude', 'orchestrator', 'config.json');
    const filePath = configPath || defaultPath;

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });

      // Save configuration
      const data = JSON.stringify(config, null, 2);
      fs.writeFileSync(filePath, data);

      this.logger.info('Configuration saved successfully', { path: filePath });

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to save configuration', { error: errorObj.message, path: filePath });
      throw errorObj;
    }
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): OrchestratorConfig | null {
    return this.currentConfig;
  }

  /**
   * Update configuration value
   */
  async updateConfiguration(key: string, value: unknown): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    // Update configuration
    this.setNestedProperty(this.currentConfig as unknown as Record<string, unknown>, key, value);

    // Validate updated configuration
    const validation = this.validator.validate(this.currentConfig);

    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Save updated configuration
    await this.saveConfiguration(this.currentConfig);

    this.logger.info('Configuration updated', { key, value });
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(): Promise<OrchestratorConfig> {
    this.logger.info('Resetting configuration to defaults');

    const defaultConfig = await this.wizard.start({ skipWelcome: true });
    await this.saveConfiguration(defaultConfig);

    this.currentConfig = defaultConfig;
    return defaultConfig;
  }

  /**
   * Display current configuration
   */
  displayConfiguration(): void {
    if (!this.currentConfig) {
      console.log(chalk.red('No configuration loaded'));
      return;
    }

    console.log(chalk.bold.cyan('\n📋 CURRENT CONFIGURATION\n'));

    const tableData = [
      [chalk.bold('Setting'), chalk.bold('Value')]
    ];

    // Basic settings
    tableData.push(['Max Parallel Agents', (this.currentConfig.maxParallelAgents || 20).toString()]);
    tableData.push(['Default Time Limit', `${(this.currentConfig.defaultTimeLimit || 1800)}s`]);
    tableData.push(['Default Budget', `$${(this.currentConfig.defaultBudget || 100) / 100}`]);

    // Model preferences - modelPreferences is 'any' type, so handle it safely
    const modelPrefs = this.currentConfig.modelPreferences as Record<string, unknown> || {};
    const strategy = (modelPrefs.strategy as string) || 'balanced';
    tableData.push(['Model Strategy', strategy]);

    // Enabled agents
    const agentsArray = this.getAgentsArray(this.currentConfig.agentRegistry?.agents);
    const enabledAgents = agentsArray.filter((a: AgentDefinition) => a.enabled);
    tableData.push(['Enabled Agents', enabledAgents.length.toString()]);

    // Features
    tableData.push(['Caching', this.currentConfig.features?.enableCaching ? '✓' : '✗']);
    tableData.push(['Metrics', this.currentConfig.features?.enableMetrics ? '✓' : '✗']);
    tableData.push(['Auto-docs', this.currentConfig.features?.enableAutoDocumentation ? '✓' : '✗']);

    // Keyword mappings
    const mappingsCount = this.currentConfig.keywordMappings?.length || 0;
    tableData.push(['Keyword Mappings', mappingsCount.toString()]);

    console.log(createTable(tableData));
  }

  /**
   * Helper method to set nested properties
   */
  private setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Helper to get agents as array
   */
  private getAgentsArray(agents?: AgentDefinition[] | Map<string, AgentDefinition>): AgentDefinition[] {
    if (!agents) return [];
    if (Array.isArray(agents)) return agents;
    return Array.from(agents.values());
  }
}

/**
 * Export Configuration Manager
 */
export default ConfigurationManager;