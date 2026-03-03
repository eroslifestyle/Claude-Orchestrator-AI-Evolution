/**
 * Configuration Loader
 *
 * Handles loading and validation of plugin configuration files.
 */
import type { PluginConfig, AgentConfig, KeywordMapping } from '../types';
export declare class ConfigLoader {
    private static configCache;
    /**
     * Load complete plugin configuration
     */
    static loadConfig(): PluginConfig;
    /**
     * Get configuration directory path
     */
    private static getConfigDirectory;
    /**
     * Load agent registry configuration
     */
    private static loadAgentRegistry;
    /**
     * Get default agent registry when config file is missing
     */
    private static getDefaultAgentRegistry;
    /**
     * Load keyword mappings configuration
     */
    private static loadKeywordMappings;
    /**
     * Load model defaults configuration
     */
    private static loadModelDefaults;
    /**
     * Validate configuration structure
     */
    static validateConfig(config: PluginConfig): boolean;
    /**
     * Get agent configuration by name
     */
    static getAgent(agentName: string, config?: PluginConfig): AgentConfig | null;
    /**
     * Get keyword mappings for domain
     */
    static getKeywordMappings(domain: string, config?: PluginConfig): KeywordMapping[];
    /**
     * Get default keyword mappings when config file is missing
     */
    private static getDefaultKeywordMappings;
    /**
     * Clear configuration cache (useful for testing)
     */
    static clearCache(): void;
    /**
     * Map priority string to PriorityLevel type
     */
    private static mapPriority;
}
//# sourceMappingURL=config-loader.d.ts.map