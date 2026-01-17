/**
 * Generation Tree Component
 * 
 * D3.js visualization for the "git for images" branching tree.
 * Shows generation history, allows navigation, forking, and comparison.
 * 
 * Architecture:
 * - types.ts: Type definitions for nodes, trees, actions
 * - store.ts: Zustand store for tree state management
 * - hooks.ts: Custom React hooks for D3 integration
 * - GenerationTreeVisualization.tsx: Main D3 visualization component
 * - demo.tsx: Interactive demo for testing
 */

// Types
export * from './types';

// Store
export {
  useGenerationTreeStore,
  useGenerationTree,
  useTreeActions,
  useTreeViewMode,
  useTreeLayoutOptions,
  useHoveredNode,
  useComparisonNodes,
  useIsNodeLoading,
} from './store';

// Hooks
export {
  useD3Zoom,
  useTreeLayout,
  useNodePath,
  useNodeTransition,
  useNodeDrag,
  useKeyboardNavigation,
  useComparisonMode,
} from './hooks';

// Components
export { GenerationTreeVisualization, default as GenerationTree } from './GenerationTreeVisualization';

// API Integration
export { useGenerationTreeData } from './useGenerationTreeData';
export { buildGenerationTree, apiGenerationToNode } from './api-adapter';

// Demo (for development/testing)
export { GenerationTreeDemo } from './demo';
