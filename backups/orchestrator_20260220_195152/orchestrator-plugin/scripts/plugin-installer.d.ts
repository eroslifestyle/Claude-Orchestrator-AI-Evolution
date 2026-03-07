#!/usr/bin/env node
/**
 * Plugin Package & Installation System for Claude Code Orchestrator Plugin
 *
 * Provides complete packaging, installation automation, and plugin registration
 * with Claude Code system for production deployment.
 *
 * @version 1.0.0
 * @author Development Team
 */
interface InstallationOptions {
    force?: boolean;
    development?: boolean;
    skipValidation?: boolean;
    claudePath?: string;
    configPath?: string;
    verbose?: boolean;
}
interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
/**
 * Plugin Validator
 */
declare class PluginValidator {
    /**
     * Validate plugin structure and contents
     */
    validatePlugin(pluginPath: string): ValidationResult;
    /**
     * Validate Claude Code compatibility
     */
    validateClaudeCompatibility(pluginPath: string): ValidationResult;
    private calculateDirectorySize;
}
/**
 * Plugin Packager
 */
declare class PluginPackager {
    private readonly validator;
    constructor();
    /**
     * Package plugin for distribution
     */
    packagePlugin(pluginPath: string, outputPath: string): Promise<string>;
    private buildPluginMetadata;
    private extractCommands;
    private getPluginFiles;
    private createPackageStructure;
    private generateInstallationManifest;
    private createArchive;
    private copyDirectory;
}
/**
 * Plugin Installer
 */
declare class PluginInstaller {
    private readonly validator;
    constructor();
    /**
     * Install plugin to Claude Code
     */
    installPlugin(pluginPath: string, options?: InstallationOptions): Promise<void>;
    private detectClaudeInstallation;
    private createBackup;
    private installPluginFiles;
    private installDependencies;
    private registerPlugin;
    private verifyInstallation;
    private initializePlugin;
    private displaySuccessMessage;
    private copyDirectory;
    /**
     * Uninstall plugin from Claude Code
     */
    uninstallPlugin(claudePath?: string): Promise<void>;
}
/**
 * Command Line Interface
 */
declare class PluginInstallerCLI {
    private readonly packager;
    private readonly installer;
    constructor();
    /**
     * Run CLI command
     */
    run(): Promise<void>;
    private handlePackageCommand;
    private handleInstallCommand;
    private handleUninstallCommand;
    private handleValidateCommand;
    private displayHelp;
}
export { PluginValidator, PluginPackager, PluginInstaller, PluginInstallerCLI };
//# sourceMappingURL=plugin-installer.d.ts.map