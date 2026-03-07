/**
 * Context Pool Manager (CPM) - Index
 *
 * Context pooling system that eliminates Clean Context overhead.
 * Reduces context acquisition time from 200-500ms to <10ms.
 *
 * @version 1.0.0
 */

// =============================================================================
// EXPORTS
// ============================================================================

export {
  // Main class
  ContextPoolManager,

  // Singleton access
  getContextPoolManager,
  resetContextPoolManager,

  // Factory functions
  createContextPoolManager,
  createLowMemoryPoolManager,
  createHighThroughputPoolManager,

  // Types
  type CleanContext,
  type ContextState,
  type PoolStats,
  type AgentTypeStats,
  type ContextPoolConfig,
  type AcquisitionResult
} from './ContextPoolManager';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export { default } from './ContextPoolManager';
