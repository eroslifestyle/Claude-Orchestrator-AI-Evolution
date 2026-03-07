/**
 * UnifiedRouterEngine Module - Exports
 *
 * Centralized routing module with LRU cache support.
 * Exports all public types and factory functions.
 */

// Main exports
export {
  UnifiedRouterEngine,
  createUnifiedRouterEngine,
  SimplifiedTFIDF,
  LRUMap
} from './UnifiedRouterEngine';

// Type exports
export type {
  RoutingDecision,
  TaskRequest,
  RouterStats,
  UnifiedRouterConfig,
  AgentRegistryEntry
} from './UnifiedRouterEngine';

// Re-export for convenience
export { UnifiedRouterEngine as default } from './UnifiedRouterEngine';
