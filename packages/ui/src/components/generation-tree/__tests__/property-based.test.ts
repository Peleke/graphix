/**
 * Generation Tree - Property-Based Tests
 * 
 * Using property-based testing patterns to find edge cases
 * that example-based tests might miss. These tests verify
 * invariants that should hold for ANY valid input.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationTreeStore } from '../store';
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_TREE_STATS } from '../types';
import type { GenerationNode, GenerationStatus, GenerationType } from '../types';

// ============================================================================
// Property-Based Test Utilities
// ============================================================================

/**
 * Generate a random integer in range [min, max]
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random string of given length
 */
function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join('');
}

/**
 * Generate a random status
 */
function randomStatus(): GenerationStatus {
  const statuses: GenerationStatus[] = ['pending', 'generating', 'complete', 'failed', 'selected', 'rejected', 'archived'];
  return statuses[randomInt(0, statuses.length - 1)];
}

/**
 * Generate a random generation type
 */
function randomType(): GenerationType {
  const types: GenerationType[] = ['initial', 'variation', 'regenerate', 'edited', 'inpaint', 'upscale', 'controlnet'];
  return types[randomInt(0, types.length - 1)];
}

/**
 * Generate random node data
 */
function randomNodeData(parentId: string | null = null) {
  return {
    parentId,
    panelId: 'test-panel',
    status: randomStatus(),
    type: randomType(),
    prompt: randomString(randomInt(10, 100)),
    seed: randomInt(0, 999999999),
    settings: {
      model: randomString(10),
      width: [512, 768, 1024][randomInt(0, 2)],
      height: [512, 768, 1024][randomInt(0, 2)],
      steps: randomInt(10, 50),
      cfgScale: randomInt(5, 15),
      sampler: ['euler', 'dpm++', 'ddim'][randomInt(0, 2)],
    },
    createdAt: new Date(),
  };
}

/**
 * Run a property test multiple times with random inputs
 */
function forAll<T>(
  generator: () => T,
  property: (value: T) => void,
  iterations: number = 100
): void {
  for (let i = 0; i < iterations; i++) {
    const value = generator();
    property(value);
  }
}

// ============================================================================
// Store Reset
// ============================================================================

beforeEach(() => {
  useGenerationTreeStore.setState({
    trees: new Map(),
    activeTreeId: null,
    viewMode: 'full',
    layoutOptions: { ...DEFAULT_LAYOUT_OPTIONS },
    hoveredNodeId: null,
    contextMenuNodeId: null,
    comparisonNodeIds: [],
    loadingNodeIds: new Set(),
  });
});

// ============================================================================
// Property: Node Count Invariants
// ============================================================================

describe('Property: Node Count Invariants', () => {
  it('adding N nodes results in tree with exactly N nodes', () => {
    forAll(
      () => randomInt(1, 50),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        let lastId: string | null = null;
        for (let i = 0; i < nodeCount; i++) {
          lastId = actions.addNode(panelId, randomNodeData(i === 0 ? null : lastId));
        }
        
        const tree = actions.getTree(panelId);
        expect(tree?.nodes.size).toBe(nodeCount);
        expect(tree?.stats.totalNodes).toBe(nodeCount);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20 // 20 iterations for performance
    );
  });

  it('removing a node decreases count by 1 + children', () => {
    forAll(
      () => ({ depth: randomInt(2, 5), width: randomInt(1, 3) }),
      ({ depth, width }) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        // Build tree: root with children, each child has grandchildren
        const rootId = actions.addNode(panelId, randomNodeData());
        const childIds: string[] = [];
        
        for (let i = 0; i < width; i++) {
          const childId = actions.addNode(panelId, randomNodeData(rootId));
          childIds.push(childId);
          
          // Add grandchildren
          for (let j = 0; j < width; j++) {
            actions.addNode(panelId, randomNodeData(childId));
          }
        }
        
        const totalBefore = actions.getTree(panelId)?.nodes.size ?? 0;
        
        // Remove first child (should remove child + its grandchildren)
        actions.removeNode(panelId, childIds[0]);
        
        const totalAfter = actions.getTree(panelId)?.nodes.size ?? 0;
        const expectedRemoved = 1 + width; // child + grandchildren
        
        expect(totalAfter).toBe(totalBefore - expectedRemoved);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      10
    );
  });
});

// ============================================================================
// Property: Path Invariants
// ============================================================================

describe('Property: Path Invariants', () => {
  it('path length equals depth + 1 for any node', () => {
    forAll(
      () => randomInt(1, 10),
      (depth) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        // Build chain of depth nodes
        let parentId: string | null = null;
        let lastId: string = '';
        
        for (let d = 0; d < depth; d++) {
          lastId = actions.addNode(panelId, randomNodeData(parentId));
          parentId = lastId;
        }
        
        const path = actions.getNodePath(panelId, lastId);
        expect(path.length).toBe(depth);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20
    );
  });

  it('path always starts with root and ends with target', () => {
    forAll(
      () => randomInt(2, 8),
      (depth) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        let parentId: string | null = null;
        let lastId: string = '';
        let rootId: string = '';
        
        for (let d = 0; d < depth; d++) {
          lastId = actions.addNode(panelId, randomNodeData(parentId));
          if (d === 0) rootId = lastId;
          parentId = lastId;
        }
        
        const path = actions.getNodePath(panelId, lastId);
        
        expect(path[0].id).toBe(rootId);
        expect(path[path.length - 1].id).toBe(lastId);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20
    );
  });

  it('each node in path is parent of next node', () => {
    forAll(
      () => randomInt(3, 8),
      (depth) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        let parentId: string | null = null;
        let lastId: string = '';
        
        for (let d = 0; d < depth; d++) {
          lastId = actions.addNode(panelId, randomNodeData(parentId));
          parentId = lastId;
        }
        
        const path = actions.getNodePath(panelId, lastId);
        
        for (let i = 0; i < path.length - 1; i++) {
          expect(path[i + 1].parentId).toBe(path[i].id);
        }
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20
    );
  });
});

// ============================================================================
// Property: Selection Invariants
// ============================================================================

describe('Property: Selection Invariants', () => {
  it('at most one node can be selected at a time via selectNode', () => {
    forAll(
      () => randomInt(5, 20),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        // Use 'complete' status to avoid random 'selected' values
        const nodeIds: string[] = [];
        for (let i = 0; i < nodeCount; i++) {
          const id = actions.addNode(panelId, {
            ...randomNodeData(nodeIds[0] || null),
            status: 'complete', // Ensure we start with non-selected status
          });
          nodeIds.push(id);
        }
        
        // Select random nodes multiple times via selectNode
        for (let i = 0; i < 10; i++) {
          const randomId = nodeIds[randomInt(0, nodeIds.length - 1)];
          actions.selectNode(panelId, randomId);
          
          // Count selected nodes - should always be exactly 1
          const tree = actions.getTree(panelId);
          const selectedCount = Array.from(tree?.nodes.values() ?? [])
            .filter(n => n.status === 'selected').length;
          
          expect(selectedCount).toBe(1);
        }
        
        // Cleanup
        actions.clearTree(panelId);
      },
      10
    );
  });

  it('selected node ID matches the node with selected status', () => {
    forAll(
      () => randomInt(3, 10),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        const nodeIds: string[] = [];
        for (let i = 0; i < nodeCount; i++) {
          const id = actions.addNode(panelId, randomNodeData(nodeIds[0] || null));
          nodeIds.push(id);
        }
        
        const targetId = nodeIds[randomInt(0, nodeIds.length - 1)];
        actions.selectNode(panelId, targetId);
        
        const tree = actions.getTree(panelId);
        expect(tree?.selectedId).toBe(targetId);
        expect(tree?.nodes.get(targetId)?.status).toBe('selected');
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20
    );
  });
});

// ============================================================================
// Property: ID Uniqueness
// ============================================================================

describe('Property: ID Uniqueness', () => {
  it('all generated IDs are unique within a tree', () => {
    forAll(
      () => randomInt(10, 100),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        const ids = new Set<string>();
        let parentId: string | null = null;
        
        for (let i = 0; i < nodeCount; i++) {
          const id = actions.addNode(panelId, randomNodeData(parentId));
          
          // ID should not already exist
          expect(ids.has(id)).toBe(false);
          ids.add(id);
          
          // Randomly choose to branch or continue chain
          if (Math.random() > 0.5) {
            parentId = id;
          }
        }
        
        expect(ids.size).toBe(nodeCount);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      10
    );
  });

  it('all generated IDs are unique across multiple trees', () => {
    const { actions } = useGenerationTreeStore.getState();
    const allIds = new Set<string>();
    const treeCount = 5;
    const nodesPerTree = 20;
    
    for (let t = 0; t < treeCount; t++) {
      const panelId = `panel-${t}`;
      actions.initTree(panelId);
      
      for (let n = 0; n < nodesPerTree; n++) {
        const id = actions.addNode(panelId, randomNodeData());
        expect(allIds.has(id)).toBe(false);
        allIds.add(id);
      }
    }
    
    expect(allIds.size).toBe(treeCount * nodesPerTree);
  });
});

// ============================================================================
// Property: Tree Structure Integrity
// ============================================================================

describe('Property: Tree Structure Integrity', () => {
  it('every non-root node has a valid parent', () => {
    forAll(
      () => randomInt(5, 30),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        const nodeIds: string[] = [];
        for (let i = 0; i < nodeCount; i++) {
          const parentId = nodeIds.length > 0 
            ? nodeIds[randomInt(0, nodeIds.length - 1)] 
            : null;
          const id = actions.addNode(panelId, randomNodeData(parentId));
          nodeIds.push(id);
        }
        
        const tree = actions.getTree(panelId);
        
        for (const node of tree?.nodes.values() ?? []) {
          if (node.parentId !== null) {
            // Parent must exist
            expect(tree?.nodes.has(node.parentId)).toBe(true);
            // Node must be in parent's children
            const parent = tree?.nodes.get(node.parentId);
            expect(parent?.childIds).toContain(node.id);
          }
        }
        
        // Cleanup
        actions.clearTree(panelId);
      },
      10
    );
  });

  it('every child reference points to existing node', () => {
    forAll(
      () => randomInt(5, 30),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        const nodeIds: string[] = [];
        for (let i = 0; i < nodeCount; i++) {
          const parentId = nodeIds.length > 0 
            ? nodeIds[randomInt(0, nodeIds.length - 1)] 
            : null;
          const id = actions.addNode(panelId, randomNodeData(parentId));
          nodeIds.push(id);
        }
        
        const tree = actions.getTree(panelId);
        
        for (const node of tree?.nodes.values() ?? []) {
          for (const childId of node.childIds) {
            expect(tree?.nodes.has(childId)).toBe(true);
          }
        }
        
        // Cleanup
        actions.clearTree(panelId);
      },
      10
    );
  });

  it('depth is always parent depth + 1', () => {
    forAll(
      () => randomInt(5, 30),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        const nodeIds: string[] = [];
        for (let i = 0; i < nodeCount; i++) {
          const parentId = nodeIds.length > 0 
            ? nodeIds[randomInt(0, nodeIds.length - 1)] 
            : null;
          const id = actions.addNode(panelId, randomNodeData(parentId));
          nodeIds.push(id);
        }
        
        const tree = actions.getTree(panelId);
        
        for (const node of tree?.nodes.values() ?? []) {
          if (node.parentId === null) {
            expect(node.depth).toBe(0);
          } else {
            const parent = tree?.nodes.get(node.parentId);
            expect(node.depth).toBe((parent?.depth ?? -1) + 1);
          }
        }
        
        // Cleanup
        actions.clearTree(panelId);
      },
      10
    );
  });
});

// ============================================================================
// Property: Stats Accuracy
// ============================================================================

describe('Property: Stats Accuracy', () => {
  it('totalNodes equals actual node count', () => {
    forAll(
      () => randomInt(1, 50),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        for (let i = 0; i < nodeCount; i++) {
          actions.addNode(panelId, randomNodeData());
        }
        
        const tree = actions.getTree(panelId);
        expect(tree?.stats.totalNodes).toBe(tree?.nodes.size);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20
    );
  });

  it('status counts sum to totalNodes', () => {
    forAll(
      () => randomInt(5, 30),
      (nodeCount) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        for (let i = 0; i < nodeCount; i++) {
          actions.addNode(panelId, randomNodeData());
        }
        
        const tree = actions.getTree(panelId);
        const stats = tree?.stats;
        
        // Count each status
        const nodes = Array.from(tree?.nodes.values() ?? []);
        const completed = nodes.filter(n => n.status === 'complete').length;
        const selected = nodes.filter(n => n.status === 'selected').length;
        const rejected = nodes.filter(n => n.status === 'rejected').length;
        
        expect(stats?.completedNodes).toBe(completed);
        expect(stats?.selectedNodes).toBe(selected);
        expect(stats?.rejectedNodes).toBe(rejected);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20
    );
  });

  it('maxDepth is accurate', () => {
    forAll(
      () => randomInt(1, 10),
      (targetDepth) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        actions.initTree(panelId);
        
        // Build chain to target depth
        let parentId: string | null = null;
        for (let d = 0; d < targetDepth; d++) {
          parentId = actions.addNode(panelId, randomNodeData(parentId));
        }
        
        const tree = actions.getTree(panelId);
        expect(tree?.stats.maxDepth).toBe(targetDepth - 1); // 0-indexed
        
        // Cleanup
        actions.clearTree(panelId);
      },
      20
    );
  });
});

// ============================================================================
// Property: Idempotency
// ============================================================================

describe('Property: Idempotency', () => {
  it('initializing same tree multiple times has no effect', () => {
    forAll(
      () => randomInt(1, 10),
      (times) => {
        const { actions } = useGenerationTreeStore.getState();
        const panelId = `panel-${randomString(8)}`;
        
        // Init multiple times
        for (let i = 0; i < times; i++) {
          actions.initTree(panelId);
        }
        
        // Add some nodes
        actions.addNode(panelId, randomNodeData());
        actions.addNode(panelId, randomNodeData());
        
        // Init again - should not reset
        actions.initTree(panelId);
        
        const tree = actions.getTree(panelId);
        expect(tree?.nodes.size).toBe(2);
        
        // Cleanup
        actions.clearTree(panelId);
      },
      10
    );
  });

  it('selecting same node multiple times has same result', () => {
    const { actions } = useGenerationTreeStore.getState();
    const panelId = 'test-panel';
    actions.initTree(panelId);
    
    const id = actions.addNode(panelId, randomNodeData());
    
    // Select multiple times
    for (let i = 0; i < 5; i++) {
      actions.selectNode(panelId, id);
    }
    
    const tree = actions.getTree(panelId);
    expect(tree?.selectedId).toBe(id);
    expect(tree?.nodes.get(id)?.status).toBe('selected');
  });
});

// ============================================================================
// Property: Commutativity (where applicable)
// ============================================================================

describe('Property: Operation Order Independence', () => {
  it('comparison mode is order-independent for final set', () => {
    forAll(
      () => {
        const ids = Array.from({ length: 4 }, () => randomString(8));
        return { ids, order1: [...ids], order2: [...ids].reverse() };
      },
      ({ ids, order1, order2 }) => {
        const { actions } = useGenerationTreeStore.getState();
        
        // Add in order1
        actions.clearComparison();
        for (const id of order1) {
          actions.addToComparison(id);
        }
        const set1 = new Set(useGenerationTreeStore.getState().comparisonNodeIds);
        
        // Add in order2
        actions.clearComparison();
        for (const id of order2) {
          actions.addToComparison(id);
        }
        const set2 = new Set(useGenerationTreeStore.getState().comparisonNodeIds);
        
        // Sets should be equal
        expect(set1.size).toBe(set2.size);
        for (const id of set1) {
          expect(set2.has(id)).toBe(true);
        }
      },
      10
    );
  });
});
