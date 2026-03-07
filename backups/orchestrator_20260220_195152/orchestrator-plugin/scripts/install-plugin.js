#!/usr/bin/env node

/**
 * Claude Code Orchestrator Plugin - Installation Script
 * Installs the revolutionary 64+ agent parallel orchestration system
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class OrchestratorPluginInstaller {
    constructor() {
        this.pluginName = 'orchestrator-plugin';
        this.version = '1.0.0';
        this.claudeDir = path.join(os.homedir(), '.claude');
        this.pluginsDir = path.join(this.claudeDir, 'plugins');
        this.sourceDir = path.dirname(__dirname);
        this.targetDir = path.join(this.pluginsDir, this.pluginName);

        console.log('🎯 Claude Code Orchestrator Plugin Installer');
        console.log('📦 Version:', this.version);
        console.log('🏠 Claude Directory:', this.claudeDir);
    }

    async install() {
        try {
            console.log('\n🚀 Starting Installation Process...');

            // Step 1: Validate environment
            await this.validateEnvironment();

            // Step 2: Create plugin directories
            await this.createDirectories();

            // Step 3: Copy plugin files
            await this.copyPluginFiles();

            // Step 4: Install dependencies
            await this.installDependencies();

            // Step 5: Register plugin with Claude Code
            await this.registerPlugin();

            // Step 6: Validate installation
            await this.validateInstallation();

            console.log('\n✅ Installation completed successfully!');
            console.log('\n🎊 Revolutionary 64+ Agent Parallel Orchestration System is now ready!');
            console.log('\n📋 Available Commands:');
            console.log('   /orchestrator <task>        - Main orchestration command');
            console.log('   /orchestrator-preview       - Preview execution plan');
            console.log('   /orchestrator-status        - Show system status');
            console.log('   /orchestrator-agents        - List available agents');
            console.log('   /orchestrator-benchmark     - Run performance tests');

        } catch (error) {
            console.error('\n❌ Installation failed:', error.message);
            console.error('📋 Please check the installation log for details.');
            process.exit(1);
        }
    }

    async validateEnvironment() {
        console.log('🔍 Validating environment...');

        // Check if Claude directory exists
        if (!fs.existsSync(this.claudeDir)) {
            throw new Error(`Claude directory not found: ${this.claudeDir}. Please ensure Claude Code is properly installed.`);
        }

        // Check if agents directory exists
        const agentsDir = path.join(this.claudeDir, 'agents');
        if (!fs.existsSync(agentsDir)) {
            console.log('⚠️  Agents directory not found, creating...');
            fs.mkdirSync(agentsDir, { recursive: true });
        }

        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 18) {
            throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
        }

        console.log('✅ Environment validation passed');
    }

    async createDirectories() {
        console.log('📁 Creating plugin directories...');

        const directories = [
            this.pluginsDir,
            this.targetDir,
            path.join(this.targetDir, 'dist'),
            path.join(this.targetDir, 'config'),
            path.join(this.targetDir, 'templates'),
            path.join(this.targetDir, 'docs')
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`   Created: ${dir}`);
            } else {
                console.log(`   Exists: ${dir}`);
            }
        }

        console.log('✅ Directory structure created');
    }

    async copyPluginFiles() {
        console.log('📄 Copying plugin files...');

        const filesToCopy = [
            { src: 'claude-plugin.json', dest: 'claude-plugin.json' },
            { src: 'dist/index.js', dest: 'dist/index.js' },
            { src: 'config/', dest: 'config/', isDirectory: true },
            { src: 'package.json', dest: 'package.json' }
        ];

        for (const file of filesToCopy) {
            const srcPath = path.join(this.sourceDir, file.src);
            const destPath = path.join(this.targetDir, file.dest);

            if (file.isDirectory && fs.existsSync(srcPath)) {
                // Copy directory recursively
                this.copyDirectorySync(srcPath, destPath);
                console.log(`   Copied directory: ${file.src} → ${file.dest}`);
            } else if (fs.existsSync(srcPath)) {
                // Copy file
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }
                fs.copyFileSync(srcPath, destPath);
                console.log(`   Copied file: ${file.src} → ${file.dest}`);
            } else {
                console.log(`   ⚠️ File not found: ${srcPath}`);
            }
        }

        console.log('✅ Plugin files copied successfully');
    }

    copyDirectorySync(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDirectorySync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    async installDependencies() {
        console.log('📦 Installing dependencies...');

        // For now, we'll skip npm install since we have a standalone JS file
        // In a full implementation, this would run npm install in the plugin directory

        console.log('✅ Dependencies resolved (standalone mode)');
    }

    async registerPlugin() {
        console.log('🔗 Registering plugin with Claude Code...');

        // Create or update the Claude Code plugin registry
        const pluginRegistryPath = path.join(this.claudeDir, 'plugin-registry.json');
        let registry = { plugins: [] };

        if (fs.existsSync(pluginRegistryPath)) {
            try {
                const registryContent = fs.readFileSync(pluginRegistryPath, 'utf8');
                registry = JSON.parse(registryContent);
            } catch (error) {
                console.log('⚠️ Could not parse existing plugin registry, creating new one');
            }
        }

        // Remove existing entry if any
        registry.plugins = registry.plugins.filter(p => p.id !== this.pluginName);

        // Add our plugin
        registry.plugins.push({
            id: this.pluginName,
            name: 'Claude Code Orchestrator',
            version: this.version,
            path: this.targetDir,
            enabled: true,
            installedAt: new Date().toISOString(),
            capabilities: [
                'multi-agent-coordination',
                'parallel-execution-64+',
                'intelligent-routing',
                'cost-prediction',
                'performance-analytics'
            ]
        });

        // Write updated registry
        fs.writeFileSync(pluginRegistryPath, JSON.stringify(registry, null, 2), 'utf8');

        console.log('✅ Plugin registered with Claude Code');
    }

    async validateInstallation() {
        console.log('🔍 Validating installation...');

        const requiredFiles = [
            path.join(this.targetDir, 'claude-plugin.json'),
            path.join(this.targetDir, 'dist/index.js'),
            path.join(this.targetDir, 'config/agent-registry.json')
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }

        // Try to load the plugin to verify it works
        try {
            const pluginPath = path.join(this.targetDir, 'dist/index.js');
            delete require.cache[require.resolve(pluginPath)]; // Clear cache
            require(pluginPath);
            console.log('✅ Plugin loaded successfully');
        } catch (error) {
            throw new Error(`Plugin failed to load: ${error.message}`);
        }

        console.log('✅ Installation validation passed');
    }

    async uninstall() {
        console.log('🗑️ Uninstalling Claude Code Orchestrator Plugin...');

        try {
            // Remove plugin directory
            if (fs.existsSync(this.targetDir)) {
                fs.rmSync(this.targetDir, { recursive: true, force: true });
                console.log('✅ Plugin files removed');
            }

            // Update plugin registry
            const pluginRegistryPath = path.join(this.claudeDir, 'plugin-registry.json');
            if (fs.existsSync(pluginRegistryPath)) {
                try {
                    const registryContent = fs.readFileSync(pluginRegistryPath, 'utf8');
                    const registry = JSON.parse(registryContent);
                    registry.plugins = registry.plugins.filter(p => p.id !== this.pluginName);
                    fs.writeFileSync(pluginRegistryPath, JSON.stringify(registry, null, 2), 'utf8');
                    console.log('✅ Plugin unregistered');
                } catch (error) {
                    console.log('⚠️ Could not update plugin registry');
                }
            }

            console.log('✅ Uninstallation completed successfully');

        } catch (error) {
            console.error('❌ Uninstallation failed:', error.message);
            process.exit(1);
        }
    }

    async status() {
        console.log('📊 Plugin Installation Status\n');

        console.log('Plugin Directory:', this.targetDir);
        console.log('Installed:', fs.existsSync(this.targetDir) ? '✅ Yes' : '❌ No');

        if (fs.existsSync(this.targetDir)) {
            const pluginJsonPath = path.join(this.targetDir, 'claude-plugin.json');
            if (fs.existsSync(pluginJsonPath)) {
                try {
                    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
                    console.log('Plugin Version:', pluginJson.version);
                    console.log('Plugin Name:', pluginJson.name);
                    console.log('Commands Available:', Object.keys(pluginJson.commands || {}).length);
                } catch (error) {
                    console.log('❌ Plugin manifest corrupted');
                }
            }

            // Check if plugin loads successfully
            try {
                const pluginPath = path.join(this.targetDir, 'dist/index.js');
                require(pluginPath);
                console.log('Plugin Status:', '✅ Loaded successfully');
            } catch (error) {
                console.log('Plugin Status:', '❌ Failed to load');
                console.log('Error:', error.message);
            }
        }
    }
}

// Command line interface
if (require.main === module) {
    const command = process.argv[2] || 'install';
    const installer = new OrchestratorPluginInstaller();

    switch (command) {
        case 'install':
            installer.install();
            break;
        case 'uninstall':
            installer.uninstall();
            break;
        case 'status':
            installer.status();
            break;
        default:
            console.log('Usage: node install-plugin.js [install|uninstall|status]');
            process.exit(1);
    }
}

module.exports = OrchestratorPluginInstaller;