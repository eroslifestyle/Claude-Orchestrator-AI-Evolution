/**
 * Configuration Management UI for Claude Code Orchestrator Plugin
 *
 * Provides interactive setup wizard, agent registry management,
 * and keyword mappings configuration interface.
 *
 * @version 1.0.0
 * @author Development Team
 */
import type { OrchestratorConfig, ConfigurationWizardOptions } from '../types';
/**
 * Main Configuration Manager
 */
export declare class ConfigurationManager {
    private readonly logger;
    private readonly wizard;
    private readonly validator;
    private currentConfig;
    constructor();
    /**
     * Run interactive setup wizard
     */
    runSetupWizard(options?: ConfigurationWizardOptions): Promise<OrchestratorConfig>;
    /**
     * Load existing configuration
     */
    loadConfiguration(configPath?: string): Promise<OrchestratorConfig>;
    /**
     * Save configuration to file
     */
    saveConfiguration(config: OrchestratorConfig, configPath?: string): Promise<void>;
    /**
     * Get current configuration
     */
    getCurrentConfiguration(): OrchestratorConfig | null;
    /**
     * Update configuration value
     */
    updateConfiguration(key: string, value: unknown): Promise<void>;
    /**
     * Reset configuration to defaults
     */
    resetConfiguration(): Promise<OrchestratorConfig>;
    /**
     * Display current configuration
     */
    displayConfiguration(): void;
    /**
     * Helper method to set nested properties
     */
    private setNestedProperty;
    /**
     * Helper to get agents as array
     */
    private getAgentsArray;
}
/**
 * Export Configuration Manager
 */
export default ConfigurationManager;
//# sourceMappingURL=ConfigurationManager.d.ts.map