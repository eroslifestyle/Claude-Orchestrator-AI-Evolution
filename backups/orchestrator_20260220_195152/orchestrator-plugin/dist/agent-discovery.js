"use strict";
/**
 * Agent Discovery & Registry System
 * ==================================
 * Sistema di discovery automatico per:
 * - Agent expert files (.md)
 * - Plugin MCP installati
 * - Fallback e suggerimenti
 *
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentDiscovery = exports.AgentDiscovery = void 0;
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// =============================================================================
// AGENT DISCOVERY CLASS
// =============================================================================
class AgentDiscovery extends events_1.EventEmitter {
    registry;
    agentsBasePath;
    pluginsBasePath;
    cacheValidMs = 300000; // 5 minuti cache
    // Mapping keywords -> expert files
    static KEYWORD_AGENT_MAP = {
        // GUI & Frontend
        'gui': 'experts/gui-super-expert.md',
        'pyqt': 'experts/gui-super-expert.md',
        'pyqt5': 'experts/gui-super-expert.md',
        'qt': 'experts/gui-super-expert.md',
        'widget': 'experts/gui-super-expert.md',
        'layout': 'experts/gui-layout-specialist.md',
        'ui': 'experts/gui-super-expert.md',
        'ux': 'experts/gui-super-expert.md',
        'frontend': 'experts/gui-super-expert.md',
        // Database
        'database': 'experts/database_expert.md',
        'db': 'experts/database_expert.md',
        'sql': 'experts/database_expert.md',
        'sqlite': 'experts/database_expert.md',
        'schema': 'experts/db-schema-designer.md',
        'query': 'experts/database_expert.md',
        'migration': 'experts/database_expert.md',
        // Security
        'security': 'experts/security_unified_expert.md',
        'auth': 'experts/security_unified_expert.md',
        'authentication': 'experts/security_unified_expert.md',
        'authorization': 'experts/security_unified_expert.md',
        'jwt': 'experts/security_unified_expert.md',
        'oauth': 'experts/social_identity_expert.md',
        'oauth2': 'experts/social_identity_expert.md',
        'oidc': 'experts/social_identity_expert.md',
        // API & Integration
        'api': 'experts/api-design-specialist.md',
        'rest': 'experts/api-design-specialist.md',
        'graphql': 'experts/api-design-specialist.md',
        'telegram': 'experts/integration_expert.md',
        'webhook': 'experts/integration_expert.md',
        'integration': 'experts/integration_expert.md',
        'metatrader': 'experts/mql_expert.md',
        'mt4': 'experts/mql_expert.md',
        'mt5': 'experts/mql_expert.md',
        'mql': 'experts/mql_expert.md',
        'ctrader': 'experts/integration_expert.md',
        'tradingview': 'experts/integration_expert.md',
        // Trading
        'trading': 'experts/trading_strategy_expert.md',
        'strategy': 'experts/trading_strategy_expert.md',
        'risk': 'experts/trading_strategy_expert.md',
        'position': 'experts/trading_strategy_expert.md',
        'ea': 'experts/mql_expert.md',
        'expert advisor': 'experts/mql_expert.md',
        // Architecture
        'architecture': 'experts/architect_expert.md',
        'design': 'experts/architect_expert.md',
        'pattern': 'experts/architect_expert.md',
        'refactor': 'experts/architect_expert.md',
        // DevOps
        'devops': 'experts/devops_expert.md',
        'docker': 'experts/devops_expert.md',
        'kubernetes': 'experts/devops_expert.md',
        'k8s': 'experts/devops_expert.md',
        'ci/cd': 'experts/devops_expert.md',
        'cicd': 'experts/devops_expert.md',
        'deploy': 'experts/devops_expert.md',
        // Testing
        'test': 'experts/tester_expert.md',
        'testing': 'experts/tester_expert.md',
        'qa': 'experts/tester_expert.md',
        'unittest': 'experts/tester_expert.md',
        'pytest': 'experts/tester_expert.md',
        // Mobile
        'mobile': 'experts/mobile_expert.md',
        'ios': 'experts/mobile_expert.md',
        'android': 'experts/mobile_expert.md',
        'react native': 'experts/mobile_expert.md',
        'flutter': 'experts/mobile_expert.md',
        // AI
        'ai': 'experts/ai_integration_expert.md',
        'llm': 'experts/ai_integration_expert.md',
        'claude': 'experts/claude_systems_expert.md',
        'openai': 'experts/ai_integration_expert.md',
        'prompt': 'experts/ai_integration_expert.md',
        'rag': 'experts/ai_integration_expert.md',
        // Automation
        'n8n': 'experts/n8n_expert.md',
        'automation': 'experts/n8n_expert.md',
        'workflow': 'experts/n8n_expert.md',
        // Documentation
        'document': 'experts/documenter_expert.md',
        'documentation': 'experts/documenter_expert.md',
        'doc': 'experts/documenter_expert.md',
        // Core operations
        'analyze': 'core/analyzer.md',
        'analysis': 'core/analyzer.md',
        'code': 'core/coder.md',
        'implement': 'core/coder.md',
        'review': 'core/reviewer.md',
        'orchestrator': 'core/orchestrator.md',
        'coordinate': 'core/orchestrator.md'
    };
    // Fallback agents per categoria
    static FALLBACK_AGENTS = {
        'default': 'core/coder.md',
        'analysis': 'core/analyzer.md',
        'review': 'core/reviewer.md',
        'documentation': 'core/documenter.md',
        'coordination': 'core/orchestrator.md'
    };
    constructor(agentsPath, pluginsPath) {
        super();
        this.agentsBasePath = agentsPath || path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'agents');
        this.pluginsBasePath = pluginsPath || path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'plugins');
        this.registry = {
            agents: new Map(),
            plugins: new Map(),
            keywordIndex: new Map(),
            categoryIndex: new Map(),
            lastScan: 0
        };
    }
    /**
     * Scansiona e popola il registry
     */
    async scan() {
        console.log('\n🔍 AGENT DISCOVERY - Scanning...');
        await Promise.all([
            this.scanAgents(),
            this.scanPlugins()
        ]);
        this.buildIndexes();
        this.registry.lastScan = Date.now();
        console.log(`✅ Found ${this.registry.agents.size} agents, ${this.registry.plugins.size} plugins`);
        this.emit('scanComplete', {
            agents: this.registry.agents.size,
            plugins: this.registry.plugins.size
        });
    }
    /**
     * Scansiona tutti gli agent files
     */
    async scanAgents() {
        const categories = ['core', 'experts', 'workflows', 'templates', 'system', 'docs'];
        for (const category of categories) {
            const categoryPath = path.join(this.agentsBasePath, category);
            if (!fs.existsSync(categoryPath))
                continue;
            try {
                const files = fs.readdirSync(categoryPath);
                for (const file of files) {
                    if (!file.endsWith('.md'))
                        continue;
                    const filePath = path.join(categoryPath, file);
                    const relativePath = `${category}/${file}`;
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const stats = fs.statSync(filePath);
                        const agentInfo = this.parseAgentFile(content, filePath, relativePath, category);
                        this.registry.agents.set(relativePath, agentInfo);
                    }
                    catch (err) {
                        // Skip file se non leggibile
                    }
                }
            }
            catch (err) {
                // Skip category se non accessibile
            }
        }
        // Scan anche file root
        const rootFiles = fs.readdirSync(this.agentsBasePath).filter(f => f.endsWith('.md'));
        for (const file of rootFiles) {
            const filePath = path.join(this.agentsBasePath, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const agentInfo = this.parseAgentFile(content, filePath, file, 'core');
                this.registry.agents.set(file, agentInfo);
            }
            catch (err) {
                // Skip
            }
        }
    }
    /**
     * Parse un agent file e estrai metadati
     */
    parseAgentFile(content, filePath, relativePath, category) {
        const lines = content.split('\n').slice(0, 50); // Prime 50 righe per metadati
        // Estrai nome dal titolo
        const titleMatch = lines.find(l => l.startsWith('# '));
        const name = titleMatch
            ? titleMatch.replace('# ', '').trim()
            : path.basename(relativePath, '.md');
        // Estrai description
        const descLines = lines.filter(l => !l.startsWith('#') && l.trim().length > 10);
        const description = descLines[0]?.trim() || 'No description';
        // Estrai keywords dal contenuto
        const keywords = this.extractKeywords(content);
        // Determina modello preferito
        let preferredModel = 'sonnet';
        if (content.toLowerCase().includes('opus') || category === 'core') {
            preferredModel = 'opus';
        }
        else if (content.toLowerCase().includes('haiku') || relativePath.includes('documenter')) {
            preferredModel = 'haiku';
        }
        // Determina priorità
        let priority = 'MEDIA';
        if (relativePath.includes('security') || relativePath.includes('auth')) {
            priority = 'CRITICA';
        }
        else if (category === 'core' || relativePath.includes('architect')) {
            priority = 'ALTA';
        }
        else if (relativePath.includes('doc') || relativePath.includes('template')) {
            priority = 'BASSA';
        }
        // Estrai capabilities
        const capabilities = this.extractCapabilities(content);
        return {
            id: relativePath.replace(/[\/\\]/g, '_').replace('.md', ''),
            name,
            filePath,
            relativePath,
            category: category,
            keywords,
            description,
            preferredModel,
            priority,
            capabilities,
            lastModified: fs.statSync(filePath).mtimeMs
        };
    }
    /**
     * Estrai keywords dal contenuto
     */
    extractKeywords(content) {
        const keywords = new Set();
        const lowerContent = content.toLowerCase();
        // Cerca keywords note nel contenuto
        for (const keyword of Object.keys(AgentDiscovery.KEYWORD_AGENT_MAP)) {
            if (lowerContent.includes(keyword)) {
                keywords.add(keyword);
            }
        }
        // Estrai parole chiave da headers
        const headers = content.match(/^#+\s+(.+)$/gm) || [];
        for (const header of headers) {
            const words = header.replace(/^#+\s+/, '').toLowerCase().split(/\s+/);
            for (const word of words) {
                if (word.length > 3) {
                    keywords.add(word);
                }
            }
        }
        return Array.from(keywords);
    }
    /**
     * Estrai capabilities dal contenuto
     */
    extractCapabilities(content) {
        const capabilities = [];
        // Cerca liste puntate che sembrano capabilities
        const listItems = content.match(/^[-*]\s+(.+)$/gm) || [];
        for (const item of listItems.slice(0, 10)) {
            const capability = item.replace(/^[-*]\s+/, '').trim();
            if (capability.length > 5 && capability.length < 100) {
                capabilities.push(capability);
            }
        }
        return capabilities;
    }
    /**
     * Scansiona plugin MCP installati
     */
    async scanPlugins() {
        const pluginCachePath = path.join(this.pluginsBasePath, 'cache', 'claude-plugins-official');
        if (!fs.existsSync(pluginCachePath))
            return;
        try {
            const plugins = fs.readdirSync(pluginCachePath);
            for (const pluginName of plugins) {
                const pluginDir = path.join(pluginCachePath, pluginName);
                if (!fs.statSync(pluginDir).isDirectory())
                    continue;
                // Trova la versione più recente
                const versions = fs.readdirSync(pluginDir);
                if (versions.length === 0)
                    continue;
                const latestVersion = versions[versions.length - 1];
                const pluginJsonPath = path.join(pluginDir, latestVersion, '.claude-plugin', 'plugin.json');
                const mcpJsonPath = path.join(pluginDir, latestVersion, '.mcp.json');
                if (!fs.existsSync(pluginJsonPath))
                    continue;
                try {
                    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
                    // Leggi MCP tools se disponibile
                    let mcpTools = [];
                    if (fs.existsSync(mcpJsonPath)) {
                        try {
                            const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
                            mcpTools = Object.keys(mcpJson.mcpServers || {});
                        }
                        catch (e) {
                            // Skip
                        }
                    }
                    const pluginInfo = {
                        name: pluginJson.name || pluginName,
                        description: pluginJson.description || '',
                        version: pluginJson.version || latestVersion,
                        author: pluginJson.author?.name || pluginJson.author || 'Unknown',
                        keywords: pluginJson.keywords || [],
                        mcpTools,
                        installed: true,
                        path: path.join(pluginDir, latestVersion)
                    };
                    this.registry.plugins.set(pluginName, pluginInfo);
                }
                catch (err) {
                    // Skip plugin malformato
                }
            }
        }
        catch (err) {
            // Skip se non accessibile
        }
    }
    /**
     * Costruisce gli indici per ricerca veloce
     */
    buildIndexes() {
        this.registry.keywordIndex.clear();
        this.registry.categoryIndex.clear();
        for (const [agentPath, agent] of Array.from(this.registry.agents)) {
            // Index by keywords
            for (const keyword of agent.keywords) {
                if (!this.registry.keywordIndex.has(keyword)) {
                    this.registry.keywordIndex.set(keyword, []);
                }
                this.registry.keywordIndex.get(keyword).push(agentPath);
            }
            // Index by category
            if (!this.registry.categoryIndex.has(agent.category)) {
                this.registry.categoryIndex.set(agent.category, []);
            }
            this.registry.categoryIndex.get(agent.category).push(agentPath);
        }
    }
    /**
     * Cerca un agent per path
     */
    findAgent(agentPath) {
        // Normalizza path
        const normalizedPath = agentPath.replace(/\\/g, '/');
        // Cerca direttamente
        if (this.registry.agents.has(normalizedPath)) {
            return {
                found: true,
                agent: this.registry.agents.get(normalizedPath),
                alternatives: [],
                suggestions: [],
                missingPlugins: []
            };
        }
        // Cerca per nome file
        for (const [path, agent] of Array.from(this.registry.agents)) {
            if (path.endsWith(normalizedPath) || path.includes(normalizedPath.replace('experts/', ''))) {
                return {
                    found: true,
                    agent,
                    alternatives: [],
                    suggestions: [],
                    missingPlugins: []
                };
            }
        }
        // Non trovato - cerca alternative
        return this.findAlternatives(normalizedPath);
    }
    /**
     * Cerca agent per task description
     */
    findAgentForTask(taskDescription) {
        const lowerDesc = taskDescription.toLowerCase();
        const matchedAgents = new Map(); // agentPath -> score
        // Cerca keywords nel task
        for (const [keyword, agentPath] of Object.entries(AgentDiscovery.KEYWORD_AGENT_MAP)) {
            if (lowerDesc.includes(keyword)) {
                const currentScore = matchedAgents.get(agentPath) || 0;
                matchedAgents.set(agentPath, currentScore + 1);
            }
        }
        // Ordina per score
        const sortedMatches = Array.from(matchedAgents.entries())
            .sort((a, b) => b[1] - a[1]);
        if (sortedMatches.length > 0) {
            const bestMatch = sortedMatches[0][0];
            const agent = this.registry.agents.get(bestMatch);
            if (agent) {
                return {
                    found: true,
                    agent,
                    alternatives: sortedMatches.slice(1, 4)
                        .map(([p]) => this.registry.agents.get(p))
                        .filter(a => a !== undefined),
                    suggestions: [],
                    missingPlugins: []
                };
            }
        }
        // Nessun match - usa fallback
        return this.findAlternatives('');
    }
    /**
     * Trova alternative quando agent non trovato
     */
    findAlternatives(originalPath) {
        const alternatives = [];
        const suggestions = [];
        const missingPlugins = [];
        // Suggerisci fallback generici
        const fallbackAgent = this.registry.agents.get(AgentDiscovery.FALLBACK_AGENTS['default']);
        if (fallbackAgent) {
            alternatives.push(fallbackAgent);
        }
        // Suggerisci core agents
        const coreAgents = this.registry.categoryIndex.get('core') || [];
        for (const agentPath of coreAgents.slice(0, 3)) {
            const agent = this.registry.agents.get(agentPath);
            if (agent && !alternatives.includes(agent)) {
                alternatives.push(agent);
            }
        }
        // Genera suggerimenti
        suggestions.push(`Agent '${originalPath}' non trovato nel registry`);
        suggestions.push(`Agenti disponibili: ${this.registry.agents.size}`);
        suggestions.push(`Usa 'core/coder.md' come fallback generico`);
        // Check se manca un plugin correlato
        const pluginKeywords = originalPath.toLowerCase().split(/[_\/\-]/);
        for (const [name, plugin] of Array.from(this.registry.plugins)) {
            if (pluginKeywords.some(k => name.includes(k) || plugin.keywords.includes(k))) {
                // Plugin trovato ma agent manca
                suggestions.push(`Plugin '${name}' disponibile - considera di usare i suoi MCP tools`);
            }
        }
        return {
            found: false,
            alternatives,
            suggestions,
            missingPlugins
        };
    }
    /**
     * Ottieni tutti gli agent disponibili
     */
    getAllAgents() {
        return Array.from(this.registry.agents.values());
    }
    /**
     * Ottieni tutti i plugin disponibili
     */
    getAllPlugins() {
        return Array.from(this.registry.plugins.values());
    }
    /**
     * Ottieni agent per categoria
     */
    getAgentsByCategory(category) {
        const agentPaths = this.registry.categoryIndex.get(category) || [];
        return agentPaths
            .map(p => this.registry.agents.get(p))
            .filter(a => a !== undefined);
    }
    /**
     * Verifica se il registry necessita aggiornamento
     */
    needsRefresh() {
        return Date.now() - this.registry.lastScan > this.cacheValidMs;
    }
    /**
     * Genera report degli agent disponibili
     */
    generateReport() {
        let report = `# AGENT DISCOVERY REPORT

**Scan Date:** ${new Date(this.registry.lastScan).toISOString()}
**Total Agents:** ${this.registry.agents.size}
**Total Plugins:** ${this.registry.plugins.size}

## AGENTS BY CATEGORY

`;
        const categories = ['core', 'expert', 'workflow', 'template', 'system', 'docs'];
        for (const category of categories) {
            const agents = this.getAgentsByCategory(category);
            if (agents.length === 0)
                continue;
            report += `### ${category.toUpperCase()} (${agents.length})\n\n`;
            report += '| Agent | Model | Priority | Keywords |\n';
            report += '|-------|-------|----------|----------|\n';
            for (const agent of agents) {
                report += `| ${agent.name} | ${agent.preferredModel} | ${agent.priority} | ${agent.keywords.slice(0, 3).join(', ')} |\n`;
            }
            report += '\n';
        }
        report += `## INSTALLED PLUGINS (${this.registry.plugins.size})\n\n`;
        report += '| Plugin | Version | MCP Tools |\n';
        report += '|--------|---------|----------|\n';
        for (const plugin of Array.from(this.registry.plugins.values())) {
            report += `| ${plugin.name} | ${plugin.version} | ${plugin.mcpTools.join(', ') || 'None'} |\n`;
        }
        report += '\n---\n*Report generato da Agent Discovery v1.0*\n';
        return report;
    }
    /**
     * Mostra messaggio all'utente su agent mancante
     */
    getUserMessage(result) {
        if (result.found) {
            return `Agent trovato: ${result.agent?.name} (${result.agent?.relativePath})`;
        }
        let message = `\n${'!'.repeat(50)}\n`;
        message += `AGENT NON TROVATO\n`;
        message += `${'!'.repeat(50)}\n\n`;
        message += `SUGGERIMENTI:\n`;
        for (const suggestion of result.suggestions) {
            message += `  - ${suggestion}\n`;
        }
        if (result.alternatives.length > 0) {
            message += `\nALTERNATIVE DISPONIBILI:\n`;
            for (const alt of result.alternatives) {
                message += `  - ${alt.name} (${alt.relativePath}) [${alt.preferredModel}]\n`;
            }
        }
        if (result.missingPlugins.length > 0) {
            message += `\nPLUGIN CORRELATI MANCANTI:\n`;
            for (const plugin of result.missingPlugins) {
                message += `  - ${plugin.name} v${plugin.version}: ${plugin.description}\n`;
            }
        }
        message += `\nPer vedere tutti gli agent disponibili:\n`;
        message += `  agentDiscovery.generateReport()\n`;
        return message;
    }
}
exports.AgentDiscovery = AgentDiscovery;
// Singleton instance
exports.agentDiscovery = new AgentDiscovery();
//# sourceMappingURL=agent-discovery.js.map