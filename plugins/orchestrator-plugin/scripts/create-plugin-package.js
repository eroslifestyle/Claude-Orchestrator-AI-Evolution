#!/usr/bin/env node

/**
 * Create Plugin Package Script
 *
 * This script creates a Claude Code compatible plugin package
 * by setting up the correct directory structure and copying
 * necessary files to the dist directory.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PLUGIN_DIR = path.join(DIST_DIR, '.claude-plugin');

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Copy file with error handling
 */
function copyFile(src, dest) {
  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied ${path.relative(ROOT_DIR, src)} → ${path.relative(ROOT_DIR, dest)}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${src}: ${error.message}`);
    throw error;
  }
}

/**
 * Create plugin manifest from package.json
 */
function createPluginManifest() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));

  const pluginManifest = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    author: packageJson.author,
    license: packageJson.license,
    main: "index.js",
    engines: packageJson.engines,
    commands: {
      "/orchestrator": {
        description: "Orchestrate multi-agent task execution",
        usage: "/orchestrator \"<natural language description>\" [options]",
        examples: [
          "/orchestrator \"Add OAuth2 login with secure session storage\"",
          "/orchestrator \"Fix GUI alignment bug\" --budget 50",
          "/orchestrator \"Optimize database queries for better performance\""
        ]
      },
      "/orchestrator-preview": {
        description: "Preview orchestration plan without execution",
        usage: "/orchestrator-preview \"<description>\"",
        examples: [
          "/orchestrator-preview \"Add dark mode toggle to settings\""
        ]
      },
      "/orchestrator-resume": {
        description: "Resume interrupted orchestration session",
        usage: "/orchestrator-resume <session-id>",
        examples: [
          "/orchestrator-resume a7f3c9d2-4e8b-1234-5678-90abcdef1234"
        ]
      },
      "/orchestrator-list": {
        description: "List recent orchestration sessions",
        usage: "/orchestrator-list [--limit N]"
      },
      "/orchestrator-status": {
        description: "Show status of running or recent orchestration",
        usage: "/orchestrator-status [session-id]"
      }
    },
    permissions: [
      "read_agent_files",
      "execute_task_tool",
      "write_session_data",
      "read_project_files"
    ],
    keywords: packageJson.keywords
  };

  const manifestPath = path.join(PLUGIN_DIR, 'plugin.json');
  ensureDir(PLUGIN_DIR);
  fs.writeFileSync(manifestPath, JSON.stringify(pluginManifest, null, 2));
  console.log('✅ Created plugin.json manifest');
}

/**
 * Create plugin README
 */
function createPluginReadme() {
  const readmeContent = `# Orchestrator Plugin

> Intelligent multi-agent orchestration for Claude Code

## Quick Start

\`\`\`bash
/orchestrator "describe what you want to accomplish"
\`\`\`

## Commands

- \`/orchestrator\` - Execute task with automatic agent selection
- \`/orchestrator-preview\` - Preview execution plan
- \`/orchestrator-resume\` - Resume interrupted session
- \`/orchestrator-list\` - Show recent sessions
- \`/orchestrator-status\` - Check session status

## Features

✅ **Automatic agent selection** based on natural language
✅ **Intelligent parallelism** for independent tasks
✅ **Cost optimization** through smart model selection
✅ **Real-time progress tracking** with detailed metrics
✅ **Automatic documentation** (REGOLA #5 compliance)
✅ **Error recovery** with model escalation

## Documentation

See \`docs/official/README_OFFICIAL.md\` for complete usage instructions and examples.
Legacy documentation has been archived in \`docs/legacy/\` - see \`ARCHIVE_INDEX.md\` for mapping.
`;

  const readmePath = path.join(PLUGIN_DIR, 'README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ Created plugin README.md');
}

/**
 * Copy configuration files
 */
function copyConfigFiles() {
  const configFiles = [
    'agent-registry.json',
    'keyword-mappings.json',
    'model-defaults.json'
  ];

  const configSrcDir = path.join(ROOT_DIR, 'config');
  const configDestDir = path.join(DIST_DIR, 'config');

  ensureDir(configDestDir);

  for (const file of configFiles) {
    const srcPath = path.join(configSrcDir, file);
    const destPath = path.join(configDestDir, file);

    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, destPath);
    } else {
      console.warn(`⚠️  Configuration file not found: ${file}`);
    }
  }
}

/**
 * Copy template files
 */
function copyTemplateFiles() {
  const templateSrcDir = path.join(ROOT_DIR, 'templates');
  const templateDestDir = path.join(DIST_DIR, 'templates');

  if (fs.existsSync(templateSrcDir)) {
    ensureDir(templateDestDir);

    // Copy all template files
    const templates = fs.readdirSync(templateSrcDir);
    for (const template of templates) {
      const srcPath = path.join(templateSrcDir, template);
      const destPath = path.join(templateDestDir, template);
      copyFile(srcPath, destPath);
    }
  } else {
    console.warn('⚠️  Templates directory not found - creating empty templates dir');
    ensureDir(templateDestDir);
  }
}

/**
 * Copy documentation files
 */
function copyDocFiles() {
  // Copy official documentation files
  const docFiles = [
    'official/README_OFFICIAL.md',
    'official/CHANGELOG.md',
    'official/ARCHITECTURE.md',
    'official/AI_REFERENCE.md'
  ];

  for (const file of docFiles) {
    const srcPath = path.join(ROOT_DIR, 'docs', file);
    const destPath = path.join(PLUGIN_DIR, path.basename(file));

    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, destPath);
    }
  }

  // Also copy legacy archive index for reference
  const archiveIndexPath = path.join(ROOT_DIR, 'docs', 'legacy', 'ARCHIVE_INDEX.md');
  const archiveDestPath = path.join(PLUGIN_DIR, 'ARCHIVE_INDEX.md');
  if (fs.existsSync(archiveIndexPath)) {
    copyFile(archiveIndexPath, archiveDestPath);
  }
}

/**
 * Validate plugin structure
 */
function validatePluginStructure() {
  console.log('\\n🔍 Validating plugin structure...');

  const requiredFiles = [
    'index.js',
    '.claude-plugin/plugin.json',
    'config/agent-registry.json',
    'config/keyword-mappings.json'
  ];

  let allValid = true;

  for (const file of requiredFiles) {
    const filePath = path.join(DIST_DIR, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.error(`❌ Missing required file: ${file}`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('\\n✨ Plugin package validation passed!');
  } else {
    console.error('\\n💥 Plugin package validation failed!');
    process.exit(1);
  }
}

/**
 * Calculate package size
 */
function calculatePackageSize() {
  try {
    const stats = execSync(`du -sh "${DIST_DIR}"`, { encoding: 'utf-8' });
    const size = stats.trim().split('\\t')[0];
    console.log(`\\n📦 Package size: ${size}`);
  } catch (error) {
    console.warn('⚠️  Could not calculate package size');
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Creating Claude Code plugin package...\\n');

  try {
    // Ensure dist directory exists
    ensureDir(DIST_DIR);

    // Create plugin manifest and README
    createPluginManifest();
    createPluginReadme();

    // Copy configuration and template files
    copyConfigFiles();
    copyTemplateFiles();

    // Copy documentation
    copyDocFiles();

    // Validate the final structure
    validatePluginStructure();

    // Show package size
    calculatePackageSize();

    console.log('\\n🎉 Plugin package created successfully!');
    console.log(`\\n📁 Package location: ${DIST_DIR}`);
    console.log('\\n🔧 To install:');
    console.log(`   cp -r "${DIST_DIR}" ~/.claude/plugins/orchestrator-plugin/`);
    console.log('   claude-code plugin list');

  } catch (error) {
    console.error(`\\n💥 Failed to create plugin package: ${error.message}`);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}