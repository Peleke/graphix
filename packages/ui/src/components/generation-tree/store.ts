/**
 * Generation Tree Store
 * 
 * Zustand store for managing generation tree state.
 * Handles tree operations, node actions, and view state.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { enableMapSet } from 'immer';

// Enable Map/Set support in immer
enableMapSet();
import type {
  GenerationTree,
  GenerationNode,
  GenerationStatus,
  GenerationType,
  GenerationSettings,
  TreeViewMode,
  TreeLayoutOptions,
  NodeAction,
  TreeStats,
} from './types';
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_TREE_STATS } from './types';

// ============================================================================
// Store State
// ============================================================================

interface GenerationTreeState {
  // Data
  trees: Map<string, GenerationTree>;  // panelId -> tree
  
  // UI State
  activeTreeId: string | null;
  viewMode: TreeViewMode;
  layoutOptions: TreeLayoutOptions;
  
  // Selection
  hoveredNodeId: string | null;
  contextMenuNodeId: string | null;
  
  // Comparison mode
  comparisonNodeIds: string[];
  
  // Loading states
  loadingNodeIds: Set<string>;
  
  // Actions
  actions: GenerationTreeActions;
}

interface GenerationTreeActions {
  // Tree management
  initTree: (panelId: string) => void;
  loadTree: (panelId: string, nodes: GenerationNode[]) => void;
  clearTree: (panelId: string) => void;
  
  // Node operations
  addNode: (panelId: string, node: Omit<GenerationNode, 'id' | 'childIds' | 'depth' | 'branchIndex'>) => string;
  updateNode: (panelId: string, nodeId: string, updates: Partial<GenerationNode>) => void;
  removeNode: (panelId: string, nodeId: string) => void;
  
  // Node actions (from UI)
  dispatchNodeAction: (panelId: string, action: NodeAction) => void;
  
  // Selection
  selectNode: (panelId: string, nodeId: string) => void;
  rejectNode: (panelId: string, nodeId: string) => void;
  focusNode: (panelId: string, nodeId: string) => void;
  
  // UI state
  setActiveTree: (panelId: string | null) => void;
  setViewMode: (mode: TreeViewMode) => void;
  setLayoutOptions: (options: Partial<TreeLayoutOptions>) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setContextMenuNode: (nodeId: string | null) => void;
  
  // Comparison
  addToComparison: (nodeId: string) => void;
  removeFromComparison: (nodeId: string) => void;
  clearComparison: () => void;
  
  // Loading
  setNodeLoading: (nodeId: string, loading: boolean) => void;
  
  // Utilities
  getTree: (panelId: string) => GenerationTree | undefined;
  getNode: (panelId: string, nodeId: string) => GenerationNode | undefined;
  getNodePath: (panelId: string, nodeId: string) => GenerationNode[];
  getNodeChildren: (panelId: string, nodeId: string) => GenerationNode[];
  getSelectedNode: (panelId: string) => GenerationNode | undefined;
  computeStats: (panelId: string) => TreeStats;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function createEmptyTree(panelId: string): GenerationTree {
  return {
    panelId,
    rootId: null,
    nodes: new Map(),
    selectedId: null,
    focusedId: null,
    stats: { ...DEFAULT_TREE_STATS },
  };
}

function computeTreeStats(tree: GenerationTree): TreeStats {
  const nodes = Array.from(tree.nodes.values());
  
  let maxDepth = 0;
  let maxBranches = 0;
  
  for (const node of nodes) {
    maxDepth = Math.max(maxDepth, node.depth);
    maxBranches = Math.max(maxBranches, node.childIds.length);
  }
  
  return {
    totalNodes: nodes.length,
    completedNodes: nodes.filter(n => n.status === 'complete').length,
    selectedNodes: nodes.filter(n => n.status === 'selected').length,
    rejectedNodes: nodes.filter(n => n.status === 'rejected').length,
    maxDepth,
    maxBranches,
  };
}

function calculateBranchIndex(
  tree: GenerationTree,
  parentId: string | null,
  existingSiblings: number
): number {
  if (!parentId) return 0;
  return existingSiblings;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useGenerationTreeStore = create<GenerationTreeState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      trees: new Map(),
      activeTreeId: null,
      viewMode: 'full' as TreeViewMode,
      layoutOptions: { ...DEFAULT_LAYOUT_OPTIONS },
      hoveredNodeId: null,
      contextMenuNodeId: null,
      comparisonNodeIds: [],
      loadingNodeIds: new Set(),
      
      actions: {
        // ====================================================================
        // Tree Management
        // ====================================================================
        
        initTree: (panelId: string) => {
          set((state) => {
            if (!state.trees.has(panelId)) {
              state.trees.set(panelId, createEmptyTree(panelId));
            }
          });
        },
        
        loadTree: (panelId: string, nodes: GenerationNode[]) => {
          set((state) => {
            const tree = createEmptyTree(panelId);
            
            for (const node of nodes) {
              tree.nodes.set(node.id, node);
              if (!node.parentId) {
                tree.rootId = node.id;
              }
              if (node.status === 'selected') {
                tree.selectedId = node.id;
              }
            }
            
            tree.stats = computeTreeStats(tree);
            state.trees.set(panelId, tree);
          });
        },
        
        clearTree: (panelId: string) => {
          set((state) => {
            state.trees.delete(panelId);
          });
        },
        
        // ====================================================================
        // Node Operations
        // ====================================================================
        
        addNode: (panelId: string, nodeData) => {
          const id = generateId();
          
          set((state) => {
            let tree = state.trees.get(panelId);
            if (!tree) {
              tree = createEmptyTree(panelId);
              state.trees.set(panelId, tree);
            }
            
            // Calculate depth and branch index
            const parent = nodeData.parentId ? tree.nodes.get(nodeData.parentId) : null;
            const depth = parent ? parent.depth + 1 : 0;
            const branchIndex = calculateBranchIndex(
              tree,
              nodeData.parentId,
              parent?.childIds.length ?? 0
            );
            
            // Create the node
            const node: GenerationNode = {
              ...nodeData,
              id,
              childIds: [],
              depth,
              branchIndex,
            };
            
            // Add to tree
            tree.nodes.set(id, node);
            
            // Update parent's children
            if (parent) {
              parent.childIds.push(id);
            } else {
              // This is the root
              tree.rootId = id;
            }
            
            // Update stats
            tree.stats = computeTreeStats(tree);
          });
          
          return id;
        },
        
        updateNode: (panelId: string, nodeId: string, updates: Partial<GenerationNode>) => {
          set((state) => {
            const tree = state.trees.get(panelId);
            if (!tree) return;
            
            const node = tree.nodes.get(nodeId);
            if (!node) return;
            
            Object.assign(node, updates);
            tree.stats = computeTreeStats(tree);
          });
        },
        
        removeNode: (panelId: string, nodeId: string) => {
          set((state) => {
            const tree = state.trees.get(panelId);
            if (!tree) return;
            
            const node = tree.nodes.get(nodeId);
            if (!node) return;
            
            // Remove from parent's children
            if (node.parentId) {
              const parent = tree.nodes.get(node.parentId);
              if (parent) {
                parent.childIds = parent.childIds.filter(id => id !== nodeId);
              }
            }
            
            // Recursively remove children
            const removeChildren = (id: string) => {
              const n = tree.nodes.get(id);
              if (n) {
                for (const childId of n.childIds) {
                  removeChildren(childId);
                }
                tree.nodes.delete(id);
              }
            };
            
            removeChildren(nodeId);
            
            // Update root if needed
            if (tree.rootId === nodeId) {
              tree.rootId = null;
            }
            
            // Update selected if needed
            if (tree.selectedId === nodeId) {
              tree.selectedId = null;
            }
            
            tree.stats = computeTreeStats(tree);
          });
        },
        
        // ====================================================================
        // Node Actions
        // ====================================================================
        
        dispatchNodeAction: (panelId: string, action: NodeAction) => {
          const { actions } = get();
          
          switch (action.type) {
            case 'select':
              actions.selectNode(panelId, action.nodeId);
              break;
            case 'reject':
              actions.rejectNode(panelId, action.nodeId);
              break;
            case 'focus':
              actions.focusNode(panelId, action.nodeId);
              break;
            case 'rate':
              actions.updateNode(panelId, action.nodeId, { rating: action.rating });
              break;
            case 'feedback':
              actions.updateNode(panelId, action.nodeId, { feedback: action.feedback });
              break;
            case 'archive':
              actions.updateNode(panelId, action.nodeId, { status: 'archived' });
              break;
            case 'delete':
              actions.removeNode(panelId, action.nodeId);
              break;
            // regenerate, vary, edit would trigger external actions
          }
        },
        
        selectNode: (panelId: string, nodeId: string) => {
          set((state) => {
            const tree = state.trees.get(panelId);
            if (!tree) return;
            
            // Deselect previous
            if (tree.selectedId) {
              const prev = tree.nodes.get(tree.selectedId);
              if (prev && prev.status === 'selected') {
                prev.status = 'complete';
              }
            }
            
            // Select new
            const node = tree.nodes.get(nodeId);
            if (node) {
              node.status = 'selected';
              tree.selectedId = nodeId;
            }
            
            tree.stats = computeTreeStats(tree);
          });
        },
        
        rejectNode: (panelId: string, nodeId: string) => {
          set((state) => {
            const tree = state.trees.get(panelId);
            if (!tree) return;
            
            const node = tree.nodes.get(nodeId);
            if (node) {
              node.status = 'rejected';
            }
            
            tree.stats = computeTreeStats(tree);
          });
        },
        
        focusNode: (panelId: string, nodeId: string) => {
          set((state) => {
            const tree = state.trees.get(panelId);
            if (tree) {
              tree.focusedId = nodeId;
            }
          });
        },
        
        // ====================================================================
        // UI State
        // ====================================================================
        
        setActiveTree: (panelId: string | null) => {
          set((state) => {
            state.activeTreeId = panelId;
          });
        },
        
        setViewMode: (mode: TreeViewMode) => {
          set((state) => {
            state.viewMode = mode;
          });
        },
        
        setLayoutOptions: (options: Partial<TreeLayoutOptions>) => {
          set((state) => {
            Object.assign(state.layoutOptions, options);
          });
        },
        
        setHoveredNode: (nodeId: string | null) => {
          set((state) => {
            state.hoveredNodeId = nodeId;
          });
        },
        
        setContextMenuNode: (nodeId: string | null) => {
          set((state) => {
            state.contextMenuNodeId = nodeId;
          });
        },
        
        // ====================================================================
        // Comparison
        // ====================================================================
        
        addToComparison: (nodeId: string) => {
          set((state) => {
            if (!state.comparisonNodeIds.includes(nodeId)) {
              state.comparisonNodeIds.push(nodeId);
            }
          });
        },
        
        removeFromComparison: (nodeId: string) => {
          set((state) => {
            state.comparisonNodeIds = state.comparisonNodeIds.filter(id => id !== nodeId);
          });
        },
        
        clearComparison: () => {
          set((state) => {
            state.comparisonNodeIds = [];
          });
        },
        
        // ====================================================================
        // Loading
        // ====================================================================
        
        setNodeLoading: (nodeId: string, loading: boolean) => {
          set((state) => {
            if (loading) {
              state.loadingNodeIds.add(nodeId);
            } else {
              state.loadingNodeIds.delete(nodeId);
            }
          });
        },
        
        // ====================================================================
        // Utilities
        // ====================================================================
        
        getTree: (panelId: string) => {
          return get().trees.get(panelId);
        },
        
        getNode: (panelId: string, nodeId: string) => {
          return get().trees.get(panelId)?.nodes.get(nodeId);
        },
        
        getNodePath: (panelId: string, nodeId: string) => {
          const tree = get().trees.get(panelId);
          if (!tree) return [];
          
          const path: GenerationNode[] = [];
          let current = tree.nodes.get(nodeId);
          
          while (current) {
            path.unshift(current);
            current = current.parentId ? tree.nodes.get(current.parentId) : undefined;
          }
          
          return path;
        },
        
        getNodeChildren: (panelId: string, nodeId: string) => {
          const tree = get().trees.get(panelId);
          if (!tree) return [];
          
          const node = tree.nodes.get(nodeId);
          if (!node) return [];
          
          return node.childIds
            .map(id => tree.nodes.get(id))
            .filter((n): n is GenerationNode => n !== undefined);
        },
        
        getSelectedNode: (panelId: string) => {
          const tree = get().trees.get(panelId);
          if (!tree || !tree.selectedId) return undefined;
          return tree.nodes.get(tree.selectedId);
        },
        
        computeStats: (panelId: string) => {
          const tree = get().trees.get(panelId);
          if (!tree) return { ...DEFAULT_TREE_STATS };
          return computeTreeStats(tree);
        },
      },
    }))
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useGenerationTree = (panelId: string) => {
  return useGenerationTreeStore((state) => state.trees.get(panelId));
};

export const useTreeActions = () => {
  return useGenerationTreeStore((state) => state.actions);
};

export const useTreeViewMode = () => {
  return useGenerationTreeStore((state) => state.viewMode);
};

export const useTreeLayoutOptions = () => {
  return useGenerationTreeStore((state) => state.layoutOptions);
};

export const useHoveredNode = () => {
  return useGenerationTreeStore((state) => state.hoveredNodeId);
};

export const useComparisonNodes = () => {
  return useGenerationTreeStore((state) => state.comparisonNodeIds);
};

export const useIsNodeLoading = (nodeId: string) => {
  return useGenerationTreeStore((state) => state.loadingNodeIds.has(nodeId));
};
