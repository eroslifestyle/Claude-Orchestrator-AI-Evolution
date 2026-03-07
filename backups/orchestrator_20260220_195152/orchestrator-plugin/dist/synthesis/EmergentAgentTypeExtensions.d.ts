/**
 * Type extensions for Emergency Agent Synthesis
 * These types extend the base types to support the synthesis engine's requirements
 */
import type { ModelType, PriorityLevel } from '../types';
/**
 * Extended TaskComplexityLevel - includes 'high', 'medium', 'low', 'critical'
 */
export type SynthesisComplexityLevel = 'low' | 'medium' | 'high' | 'critical';
/**
 * Extended AgentCapability for synthesis engine
 */
export interface ExtendedAgentCapability {
    id?: string;
    name: string;
    category?: string;
    description: string;
    domain?: string;
    priority?: 'high' | 'medium' | 'low';
    level?: number;
    required?: boolean;
    keywords?: string[];
}
/**
 * Extended AgentTemplate for synthesis engine
 */
export interface ExtendedAgentTemplate {
    id?: string;
    name: string;
    domain?: string;
    role?: string;
    specialization?: string;
    defaultModel?: ModelType;
    instructions: string;
    prompt?: string;
    capabilities: ExtendedAgentCapability[];
    keywords?: string[];
    complexityLevel?: SynthesisComplexityLevel;
    metadata?: {
        version?: string;
        type?: string;
        synthetic?: boolean;
        [key: string]: unknown;
    };
}
/**
 * Extended SynthesizedAgent for synthesis engine
 */
export interface ExtendedSynthesizedAgent {
    type?: string;
    path?: string;
    content?: string;
    name?: string;
    role?: string;
    specialization?: string;
    capabilities: ExtendedAgentCapability[] | string[];
    model?: ModelType;
    instructions?: string;
    keywords?: string[];
    priority?: PriorityLevel;
    synthetic?: boolean;
    healingMethod?: string;
    metadata?: {
        synthesisId?: string;
        generated?: string;
        taskContext?: unknown;
        version?: string;
        synthetic?: boolean;
        minimal?: boolean;
        [key: string]: unknown;
    };
}
//# sourceMappingURL=EmergentAgentTypeExtensions.d.ts.map