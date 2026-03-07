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
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface AgentInfo {
    id: string;
    name: string;
    filePath: string;
    relativePath: string;
    category: 'core' | 'expert' | 'workflow' | 'template' | 'system' | 'docs';
    keywords: string[];
    description: string;
    preferredModel: 'haiku' | 'sonnet' | 'opus';
    priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
    capabilities: string[];
    lastModified: number;
}
export interface PluginInfo {
    name: string;
    description: string;
    version: string;
    author: string;
    keywords: string[];
    mcpTools: string[];
    installed: boolean;
    path: string;
}
export interface DiscoveryResult {
    found: boolean;
    agent?: AgentInfo;
    alternatives: AgentInfo[];
    suggestions: string[];
    missingPlugins: PluginInfo[];
}
export interface AgentRegistry {
    agents: Map<string, AgentInfo>;
    plugins: Map<string, PluginInfo>;
    keywordIndex: Map<string, string[]>;
    categoryIndex: Map<string, string[]>;
    lastScan: number;
}
export declare class AgentDiscovery extends EventEmitter {
    private registry;
    private agentsBasePath;
    private pluginsBasePath;
    private cacheValidMs;
    private static KEYWORD_AGENT_MAP;
    private static FALLBACK_AGENTS;
    constructor(agentsPath?: string, pluginsPath?: string);
    /**
     * Scansiona e popola il registry
     */
    scan(): Promise<void>;
    /**
     * Scansiona tutti gli agent files
     */
    private scanAgents;
    /**
     * Parse un agent file e estrai metadati
     */
    private parseAgentFile;
    /**
     * Estrai keywords dal contenuto
     */
    private extractKeywords;
    /**
     * Estrai capabilities dal contenuto
     */
    private extractCapabilities;
    /**
     * Scansiona plugin MCP installati
     */
    private scanPlugins;
    /**
     * Costruisce gli indici per ricerca veloce
     */
    private buildIndexes;
    /**
     * Cerca un agent per path
     */
    findAgent(agentPath: string): DiscoveryResult;
    /**
     * Cerca agent per task description
     */
    findAgentForTask(taskDescription: string): DiscoveryResult;
    /**
     * Trova alternative quando agent non trovato
     */
    private findAlternatives;
    /**
     * Ottieni tutti gli agent disponibili
     */
    getAllAgents(): AgentInfo[];
    /**
     * Ottieni tutti i plugin disponibili
     */
    getAllPlugins(): PluginInfo[];
    /**
     * Ottieni agent per categoria
     */
    getAgentsByCategory(category: AgentInfo['category']): AgentInfo[];
    /**
     * Verifica se il registry necessita aggiornamento
     */
    needsRefresh(): boolean;
    /**
     * Genera report degli agent disponibili
     */
    generateReport(): string;
    /**
     * Mostra messaggio all'utente su agent mancante
     */
    getUserMessage(result: DiscoveryResult): string;
}
export declare const agentDiscovery: AgentDiscovery;
//# sourceMappingURL=agent-discovery.d.ts.map