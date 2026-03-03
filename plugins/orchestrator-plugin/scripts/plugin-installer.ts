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

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';

/**
 * Plugin Installation Types
 */
interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  claudeVersion: string;
  files: string[];
  permissions: string[];
  commands: PluginCommand[];
  dependencies: Record<string, string>;
}

interface PluginCommand {
  name: string;
  description: string;
  usage: string;
  examples: string[];
}

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
class PluginValidator {
  /**
   * Validate plugin structure and contents
   */
  validatePlugin(pluginPath: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check package.json
    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      errors.push('package.json is required');
    } else {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        if (!packageJson.main) {
          errors.push('package.json must specify "main" entry point');
        }

        if (!packageJson.engines?.['claude-code']) {
          warnings.push('No Claude Code version requirement specified');
        }

        if (!packageJson.keywords?.includes('claude-code')) {
          suggestions.push('Add "claude-code" to keywords for better discoverability');
        }

      } catch (error) {
        errors.push('Invalid package.json format');
      }
    }

    // Check dist directory
    const distPath = path.join(pluginPath, 'dist');
    if (!fs.existsSync(distPath)) {
      errors.push('dist/ directory is required - run "npm run build" first');
    } else {
      const indexPath = path.join(distPath, 'index.js');
      if (!fs.existsSync(indexPath)) {
        errors.push('dist/index.js is required');
      }
    }

    // Check README
    const readmePath = path.join(pluginPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      warnings.push('README.md is recommended for documentation');
    }

    // Check TypeScript declarations
    const typesPath = path.join(pluginPath, 'dist', 'index.d.ts');
    if (!fs.existsSync(typesPath)) {
      warnings.push('TypeScript declarations (index.d.ts) are recommended');
    }

    // Validate plugin size
    const pluginSize = this.calculateDirectorySize(distPath);
    if (pluginSize > 50 * 1024 * 1024) { // 50MB
      warnings.push(`Plugin size is large (${(pluginSize / 1024 / 1024).toFixed(1)}MB)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate Claude Code compatibility
   */
  validateClaudeCompatibility(pluginPath: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(pluginPath, 'package.json'), 'utf8'));

      // Check Claude Code version requirement
      const claudeVersion = packageJson.engines?.['claude-code'];
      if (!claudeVersion) {
        warnings.push('No Claude Code version requirement specified');
      } else {
        // Basic semver validation
        if (!/^\d+\.\d+\.\d+/.test(claudeVersion.replace(/[^0-9.]/g, ''))) {
          errors.push('Invalid Claude Code version format');
        }
      }

      // Check for required plugin exports
      const distIndexPath = path.join(pluginPath, 'dist', 'index.js');
      if (fs.existsSync(distIndexPath)) {
        const content = fs.readFileSync(distIndexPath, 'utf8');

        if (!content.includes('createPlugin')) {
          errors.push('Plugin must export createPlugin function');
        }

        if (!content.includes('getCommands')) {
          warnings.push('Plugin should implement getCommands method');
        }
      }

    } catch (error) {
      errors.push('Failed to validate Claude compatibility');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private calculateDirectorySize(dirPath: string): number {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) return 0;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += this.calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }
}

/**
 * Plugin Packager
 */
class PluginPackager {
  private readonly validator: PluginValidator;

  constructor() {
    this.validator = new PluginValidator();
  }

  /**
   * Package plugin for distribution
   */
  async packagePlugin(pluginPath: string, outputPath: string): Promise<string> {
    const spinner = ora('Packaging plugin...').start();

    try {
      // Step 1: Validate plugin
      const validation = this.validator.validatePlugin(pluginPath);

      if (!validation.valid) {
        spinner.fail('Plugin validation failed');
        throw new Error(`Validation errors: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        spinner.warn('Validation warnings found');
        console.log(chalk.yellow('Warnings:'));
        validation.warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
      }

      // Step 2: Build plugin metadata
      spinner.text = 'Building plugin metadata...';
      const metadata = this.buildPluginMetadata(pluginPath);

      // Step 3: Create package structure
      spinner.text = 'Creating package structure...';
      const packagePath = await this.createPackageStructure(pluginPath, outputPath, metadata);

      // Step 4: Generate installation manifest
      spinner.text = 'Generating installation manifest...';
      await this.generateInstallationManifest(packagePath, metadata);

      // Step 5: Create archive (optional)
      spinner.text = 'Creating package archive...';
      const archivePath = await this.createArchive(packagePath);

      spinner.succeed(`Plugin packaged successfully: ${archivePath}`);
      return archivePath;

    } catch (error) {
      spinner.fail('Packaging failed');
      throw error;
    }
  }

  private buildPluginMetadata(pluginPath: string): PluginMetadata {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Extract commands from dist/index.js
    const commands = this.extractCommands(pluginPath);

    // Calculate file list
    const files = this.getPluginFiles(pluginPath);

    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      author: packageJson.author?.name || packageJson.author || 'Unknown',
      claudeVersion: packageJson.engines?.['claude-code'] || '>=2.0.0',
      files,
      permissions: [
        'filesystem:read',
        'filesystem:write',
        'network:request',
        'claude-api:access'
      ],
      commands,
      dependencies: packageJson.dependencies || {}
    };
  }

  private extractCommands(_pluginPath: string): PluginCommand[] {
    // For the orchestrator plugin, we know the commands
    return [
      {
        name: 'orchestrate',
        description: 'Execute intelligent multi-agent orchestration',
        usage: '/orchestrator "<description>" [options]',
        examples: [
          '/orchestrator "Add OAuth2 login with secure sessions"',
          '/orchestrator "Fix GUI bugs" --budget 50 --time-limit 15m'
        ]
      },
      {
        name: 'orchestrate-preview',
        description: 'Preview orchestration execution plan',
        usage: '/orchestrator-preview "<description>"',
        examples: [
          '/orchestrator-preview "Implement user authentication"'
        ]
      },
      {
        name: 'orchestrate-resume',
        description: 'Resume interrupted orchestration session',
        usage: '/orchestrator-resume <session-id>',
        examples: [
          '/orchestrator-resume a7f3c9d2'
        ]
      },
      {
        name: 'orchestrate-list',
        description: 'List recent orchestration sessions',
        usage: '/orchestrator-list [--limit N]',
        examples: [
          '/orchestrator-list --limit 5'
        ]
      },
      {
        name: 'orchestrate-status',
        description: 'Show orchestration status',
        usage: '/orchestrator-status [session-id]',
        examples: [
          '/orchestrator-status'
        ]
      }
    ];
  }

  private getPluginFiles(pluginPath: string): string[] {
    const files: string[] = [];
    const distPath = path.join(pluginPath, 'dist');

    const addFiles = (dir: string, relativeTo: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const relativePath = path.relative(relativeTo, itemPath);

        if (fs.statSync(itemPath).isDirectory()) {
          addFiles(itemPath, relativeTo);
        } else {
          files.push(relativePath);
        }
      }
    };

    addFiles(distPath, pluginPath);
    return files;
  }

  private async createPackageStructure(
    pluginPath: string,
    outputPath: string,
    metadata: PluginMetadata
  ): Promise<string> {
    const packageName = `${metadata.name}-${metadata.version}`;
    const packagePath = path.join(outputPath, packageName);

    // Create package directory
    fs.mkdirSync(packagePath, { recursive: true });

    // Copy essential files
    const filesToCopy = [
      'dist',
      'package.json',
      'README.md',
      'LICENSE',
      'CHANGELOG.md'
    ];

    for (const file of filesToCopy) {
      const sourcePath = path.join(pluginPath, file);
      const destPath = path.join(packagePath, file);

      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          await this.copyDirectory(sourcePath, destPath);
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }

    return packagePath;
  }

  private async generateInstallationManifest(packagePath: string, metadata: PluginMetadata): Promise<void> {
    const manifest = {
      ...metadata,
      manifestVersion: '1.0.0',
      installationDate: new Date().toISOString(),
      installationType: 'production',
      requirements: {
        node: '>=18.0.0',
        claude: metadata.claudeVersion,
        os: ['win32', 'darwin', 'linux']
      },
      installation: {
        preInstall: [
          'Validate Claude Code compatibility',
          'Check system requirements',
          'Backup existing configuration'
        ],
        install: [
          'Copy plugin files',
          'Install dependencies',
          'Register plugin commands',
          'Update Claude Code configuration'
        ],
        postInstall: [
          'Verify installation',
          'Run plugin initialization',
          'Display success message'
        ]
      }
    };

    const manifestPath = path.join(packagePath, 'plugin-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  private async createArchive(packagePath: string): Promise<string> {
    const archivePath = `${packagePath}.tar.gz`;

    try {
      // Use tar command if available, otherwise skip archive creation
      execSync(`tar -czf "${archivePath}" -C "${path.dirname(packagePath)}" "${path.basename(packagePath)}"`, {
        stdio: 'pipe'
      });

      return archivePath;

    } catch (error) {
      // If tar is not available, return the directory path
      console.log(chalk.yellow('tar command not available, skipping archive creation'));
      return packagePath;
    }
  }

  private async copyDirectory(source: string, dest: string): Promise<void> {
    fs.mkdirSync(dest, { recursive: true });

    const items = fs.readdirSync(source);
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(dest, item);

      if (fs.statSync(sourcePath).isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }
}

/**
 * Plugin Installer
 */
class PluginInstaller {
  private readonly validator: PluginValidator;

  constructor() {
    this.validator = new PluginValidator();
  }

  /**
   * Install plugin to Claude Code
   */
  async installPlugin(pluginPath: string, options: InstallationOptions = {}): Promise<void> {
    const spinner = ora('Installing plugin...').start();

    try {
      // Step 1: Detect Claude Code installation
      spinner.text = 'Detecting Claude Code installation...';
      const claudePath = options.claudePath || await this.detectClaudeInstallation();

      if (!claudePath) {
        throw new Error('Claude Code installation not found');
      }

      // Step 2: Validate plugin
      if (!options.skipValidation) {
        spinner.text = 'Validating plugin...';
        const validation = this.validator.validatePlugin(pluginPath);
        const compatibility = this.validator.validateClaudeCompatibility(pluginPath);

        if (!validation.valid || !compatibility.valid) {
          const errors = [...validation.errors, ...compatibility.errors];
          throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
      }

      // Step 3: Backup existing configuration
      spinner.text = 'Creating backup...';
      await this.createBackup(claudePath);

      // Step 4: Install plugin files
      spinner.text = 'Installing plugin files...';
      const installPath = await this.installPluginFiles(pluginPath, claudePath, options);

      // Step 5: Install dependencies
      spinner.text = 'Installing dependencies...';
      await this.installDependencies(installPath);

      // Step 6: Register plugin with Claude Code
      spinner.text = 'Registering plugin...';
      await this.registerPlugin(installPath, claudePath);

      // Step 7: Verify installation
      spinner.text = 'Verifying installation...';
      await this.verifyInstallation(installPath);

      // Step 8: Initialize plugin
      spinner.text = 'Initializing plugin...';
      await this.initializePlugin(installPath);

      spinner.succeed('Plugin installed successfully!');

      // Display success message
      this.displaySuccessMessage(installPath);

    } catch (error) {
      spinner.fail('Installation failed');
      throw error;
    }
  }

  private async detectClaudeInstallation(): Promise<string | null> {
    // Common Claude Code installation paths
    const possiblePaths = [
      path.join(os.homedir(), '.claude'),
      path.join(os.homedir(), 'AppData', 'Local', 'Claude'),
      path.join(os.homedir(), 'Library', 'Application Support', 'Claude'),
      path.join('/usr', 'local', 'lib', 'claude'),
      path.join('/opt', 'claude')
    ];

    for (const claudePath of possiblePaths) {
      if (fs.existsSync(claudePath)) {
        const configPath = path.join(claudePath, 'config');
        if (fs.existsSync(configPath)) {
          return claudePath;
        }
      }
    }

    // Try to detect from environment variables
    if (process.env.CLAUDE_HOME && fs.existsSync(process.env.CLAUDE_HOME)) {
      return process.env.CLAUDE_HOME;
    }

    return null;
  }

  private async createBackup(claudePath: string): Promise<void> {
    const backupDir = path.join(claudePath, 'backups', `pre-orchestrator-${Date.now()}`);
    fs.mkdirSync(backupDir, { recursive: true });

    // Backup plugin configuration
    const pluginsConfigPath = path.join(claudePath, 'config', 'plugins.json');
    if (fs.existsSync(pluginsConfigPath)) {
      fs.copyFileSync(pluginsConfigPath, path.join(backupDir, 'plugins.json'));
    }

    // Backup existing orchestrator plugin if it exists
    const existingPluginPath = path.join(claudePath, 'plugins', 'orchestrator-plugin');
    if (fs.existsSync(existingPluginPath)) {
      await this.copyDirectory(existingPluginPath, path.join(backupDir, 'orchestrator-plugin'));
    }
  }

  private async installPluginFiles(
    pluginPath: string,
    claudePath: string,
    options: InstallationOptions
  ): Promise<string> {
    const pluginsDir = path.join(claudePath, 'plugins');
    fs.mkdirSync(pluginsDir, { recursive: true });

    const pluginName = 'orchestrator-plugin';
    const installPath = path.join(pluginsDir, pluginName);

    // Remove existing installation if force option is used
    if (options.force && fs.existsSync(installPath)) {
      fs.rmSync(installPath, { recursive: true, force: true });
    }

    // Create installation directory
    fs.mkdirSync(installPath, { recursive: true });

    // Copy plugin files
    const filesToCopy = ['dist', 'package.json', 'README.md'];
    for (const file of filesToCopy) {
      const sourcePath = path.join(pluginPath, file);
      const destPath = path.join(installPath, file);

      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          await this.copyDirectory(sourcePath, destPath);
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }

    // Copy configuration templates
    const configDir = path.join(pluginPath, 'config');
    if (fs.existsSync(configDir)) {
      await this.copyDirectory(configDir, path.join(installPath, 'config'));
    }

    return installPath;
  }

  private async installDependencies(installPath: string): Promise<void> {
    const packageJsonPath = path.join(installPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) return;

    try {
      // Install production dependencies
      execSync('npm install --production --no-optional', {
        cwd: installPath,
        stdio: 'pipe'
      });

    } catch (error) {
      console.log(chalk.yellow('Warning: Some dependencies may not have been installed'));
    }
  }

  private async registerPlugin(installPath: string, claudePath: string): Promise<void> {
    const configDir = path.join(claudePath, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    const pluginsConfigPath = path.join(configDir, 'plugins.json');

    let pluginsConfig: any = { plugins: [] };

    if (fs.existsSync(pluginsConfigPath)) {
      try {
        pluginsConfig = JSON.parse(fs.readFileSync(pluginsConfigPath, 'utf8'));
      } catch (error) {
        console.log(chalk.yellow('Warning: Could not parse existing plugins.json, creating new one'));
      }
    }

    // Remove existing orchestrator plugin entry
    pluginsConfig.plugins = pluginsConfig.plugins.filter(
      (p: any) => p.name !== 'orchestrator-plugin'
    );

    // Add orchestrator plugin
    const packageJson = JSON.parse(fs.readFileSync(path.join(installPath, 'package.json'), 'utf8'));

    pluginsConfig.plugins.push({
      name: 'orchestrator-plugin',
      version: packageJson.version,
      path: installPath,
      enabled: true,
      autoload: true,
      commands: [
        'orchestrate',
        'orchestrate-preview',
        'orchestrate-resume',
        'orchestrate-list',
        'orchestrate-status'
      ],
      permissions: [
        'filesystem:read',
        'filesystem:write',
        'network:request',
        'claude-api:access'
      ],
      installedAt: new Date().toISOString()
    });

    fs.writeFileSync(pluginsConfigPath, JSON.stringify(pluginsConfig, null, 2));
  }

  private async verifyInstallation(installPath: string): Promise<void> {
    // Check that main entry point exists
    const mainEntry = path.join(installPath, 'dist', 'index.js');
    if (!fs.existsSync(mainEntry)) {
      throw new Error('Plugin main entry point not found');
    }

    // Try to load the plugin
    try {
      const pluginModule = require(mainEntry);

      if (typeof pluginModule.createPlugin !== 'function') {
        throw new Error('Plugin does not export createPlugin function');
      }

      // Test plugin creation
      const plugin = pluginModule.createPlugin();

      if (!plugin.getCommands || typeof plugin.getCommands !== 'function') {
        throw new Error('Plugin does not implement required methods');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Plugin verification failed: ${errorMessage}`);
    }
  }

  private async initializePlugin(installPath: string): Promise<void> {
    // Create plugin configuration directory
    const pluginConfigDir = path.join(os.homedir(), '.claude', 'orchestrator');
    fs.mkdirSync(pluginConfigDir, { recursive: true });

    // Copy default configuration if it doesn't exist
    const defaultConfigPath = path.join(installPath, 'config', 'default.json');
    const userConfigPath = path.join(pluginConfigDir, 'config.json');

    if (fs.existsSync(defaultConfigPath) && !fs.existsSync(userConfigPath)) {
      fs.copyFileSync(defaultConfigPath, userConfigPath);
    }

    // Create logs directory
    const logsDir = path.join(pluginConfigDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    // Create cache directory
    const cacheDir = path.join(pluginConfigDir, 'cache');
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  private displaySuccessMessage(installPath: string): void {
    console.log(chalk.bold.green('\n🎉 Installation Complete!\n'));

    const tableData = [
      [chalk.bold('Plugin'), 'Orchestrator Plugin v1.0.0'],
      [chalk.bold('Status'), chalk.green('✓ Installed Successfully')],
      [chalk.bold('Location'), installPath],
      [chalk.bold('Commands'), '5 commands registered'],
      [chalk.bold('Configuration'), '~/.claude/orchestrator/']
    ];

    console.log(table(tableData));

    console.log(chalk.cyan('\n📚 Getting Started:'));
    console.log('1. Restart Claude Code to load the plugin');
    console.log('2. Try: ' + chalk.yellow('/orchestrator "your first request"'));
    console.log('3. Get help: ' + chalk.yellow('/orchestrator --help'));
    console.log('4. Configure: Run setup wizard with ' + chalk.yellow('/orchestrator-setup'));

    console.log(chalk.gray('\n💡 Need help? Check the documentation at ~/.claude/orchestrator/'));
  }

  private async copyDirectory(source: string, dest: string): Promise<void> {
    fs.mkdirSync(dest, { recursive: true });

    const items = fs.readdirSync(source);
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(dest, item);

      if (fs.statSync(sourcePath).isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * Uninstall plugin from Claude Code
   */
  async uninstallPlugin(claudePath?: string): Promise<void> {
    const spinner = ora('Uninstalling plugin...').start();

    try {
      const detectedPath = claudePath || await this.detectClaudeInstallation();

      if (!detectedPath) {
        throw new Error('Claude Code installation not found');
      }

      // Remove plugin files
      const pluginPath = path.join(detectedPath, 'plugins', 'orchestrator-plugin');
      if (fs.existsSync(pluginPath)) {
        fs.rmSync(pluginPath, { recursive: true, force: true });
      }

      // Update plugins configuration
      const pluginsConfigPath = path.join(detectedPath, 'config', 'plugins.json');
      if (fs.existsSync(pluginsConfigPath)) {
        const pluginsConfig = JSON.parse(fs.readFileSync(pluginsConfigPath, 'utf8'));
        pluginsConfig.plugins = pluginsConfig.plugins.filter(
          (p: any) => p.name !== 'orchestrator-plugin'
        );
        fs.writeFileSync(pluginsConfigPath, JSON.stringify(pluginsConfig, null, 2));
      }

      // Clean up user configuration (optional)
      const userConfigDir = path.join(os.homedir(), '.claude', 'orchestrator');
      if (fs.existsSync(userConfigDir)) {
        console.log(chalk.yellow('\nUser configuration preserved at:'));
        console.log(userConfigDir);
        console.log(chalk.gray('Remove manually if no longer needed'));
      }

      spinner.succeed('Plugin uninstalled successfully!');

    } catch (error) {
      spinner.fail('Uninstallation failed');
      throw error;
    }
  }
}

/**
 * Command Line Interface
 */
class PluginInstallerCLI {
  private readonly packager: PluginPackager;
  private readonly installer: PluginInstaller;

  constructor() {
    this.packager = new PluginPackager();
    this.installer = new PluginInstaller();
  }

  /**
   * Run CLI command
   */
  async run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'package':
          await this.handlePackageCommand(args.slice(1));
          break;

        case 'install':
          await this.handleInstallCommand(args.slice(1));
          break;

        case 'uninstall':
          await this.handleUninstallCommand(args.slice(1));
          break;

        case 'validate':
          await this.handleValidateCommand(args.slice(1));
          break;

        case 'help':
        case '--help':
        case '-h':
          this.displayHelp();
          break;

        default:
          console.log(chalk.red(`Unknown command: ${command}`));
          this.displayHelp();
          process.exit(1);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`\n❌ Error: ${errorMessage}`));
      process.exit(1);
    }
  }

  private async handlePackageCommand(args: string[]): Promise<void> {
    const pluginPath = args[0] || process.cwd();
    const outputPath = args[1] || path.join(process.cwd(), 'dist');

    console.log(chalk.bold.cyan('📦 Packaging Orchestrator Plugin\n'));

    const archivePath = await this.packager.packagePlugin(pluginPath, outputPath);

    console.log(chalk.green(`\n✅ Package created: ${archivePath}`));
    console.log(chalk.gray('Ready for distribution and installation'));
  }

  private async handleInstallCommand(args: string[]): Promise<void> {
    const pluginPath = args[0] || process.cwd();

    const options: InstallationOptions = {
      force: args.includes('--force'),
      development: args.includes('--dev'),
      skipValidation: args.includes('--skip-validation'),
      verbose: args.includes('--verbose')
    };

    const claudePathIndex = args.indexOf('--claude-path');
    if (claudePathIndex >= 0 && claudePathIndex + 1 < args.length) {
      options.claudePath = args[claudePathIndex + 1];
    }

    console.log(chalk.bold.cyan('🚀 Installing Orchestrator Plugin\n'));

    await this.installer.installPlugin(pluginPath, options);
  }

  private async handleUninstallCommand(args: string[]): Promise<void> {
    const claudePathIndex = args.indexOf('--claude-path');
    const claudePath = claudePathIndex >= 0 && claudePathIndex + 1 < args.length
      ? args[claudePathIndex + 1]
      : undefined;

    console.log(chalk.bold.red('🗑️  Uninstalling Orchestrator Plugin\n'));

    await this.installer.uninstallPlugin(claudePath);
  }

  private async handleValidateCommand(args: string[]): Promise<void> {
    const pluginPath = args[0] || process.cwd();

    console.log(chalk.bold.blue('🔍 Validating Plugin\n'));

    const validator = new PluginValidator();
    const validation = validator.validatePlugin(pluginPath);
    const compatibility = validator.validateClaudeCompatibility(pluginPath);

    // Display results
    console.log(chalk.bold('Validation Results:'));

    if (validation.valid && compatibility.valid) {
      console.log(chalk.green('✅ Plugin is valid'));
    } else {
      console.log(chalk.red('❌ Plugin validation failed'));
    }

    if (validation.errors.length > 0) {
      console.log(chalk.red('\nErrors:'));
      validation.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
    }

    if (compatibility.errors.length > 0) {
      console.log(chalk.red('\nCompatibility Errors:'));
      compatibility.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
    }

    const allWarnings = [...validation.warnings, ...compatibility.warnings];
    if (allWarnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      allWarnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
    }

    const allSuggestions = [...validation.suggestions, ...compatibility.suggestions];
    if (allSuggestions.length > 0) {
      console.log(chalk.cyan('\nSuggestions:'));
      allSuggestions.forEach(suggestion => console.log(chalk.cyan(`  • ${suggestion}`)));
    }
  }

  private displayHelp(): void {
    console.log(chalk.bold.cyan('\n🔧 Claude Code Orchestrator Plugin Installer\n'));

    console.log(chalk.bold('Usage:'));
    console.log('  plugin-installer <command> [options]\n');

    console.log(chalk.bold('Commands:'));
    console.log('  package [plugin-path] [output-path]  Package plugin for distribution');
    console.log('  install [plugin-path]               Install plugin to Claude Code');
    console.log('  uninstall                           Uninstall plugin from Claude Code');
    console.log('  validate [plugin-path]              Validate plugin structure\n');

    console.log(chalk.bold('Options:'));
    console.log('  --force                             Force installation (overwrite existing)');
    console.log('  --dev                              Development mode installation');
    console.log('  --skip-validation                   Skip plugin validation');
    console.log('  --claude-path <path>               Custom Claude Code installation path');
    console.log('  --verbose                          Verbose output');
    console.log('  --help, -h                         Show this help message\n');

    console.log(chalk.bold('Examples:'));
    console.log('  plugin-installer package');
    console.log('  plugin-installer install --force');
    console.log('  plugin-installer uninstall');
    console.log('  plugin-installer validate ./my-plugin\n');
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new PluginInstallerCLI();
  cli.run().catch(error => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

// Export classes for programmatic use
export {
  PluginValidator,
  PluginPackager,
  PluginInstaller,
  PluginInstallerCLI
};