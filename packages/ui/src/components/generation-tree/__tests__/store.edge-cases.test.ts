/**
 * Generation Tree Store - EXHAUSTIVE Edge Case Tests
 * 
 * Testing every conceivable edge case, boundary condition, and
 * error scenario. If it can break, we test it breaking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationTreeStore } from '../store';
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_TREE_STATS } from '../types';
import type { GenerationNode, GenerationSettings, GenerationStatus, GenerationType } from '../types';

// Helper to create valid settings
const createSettings = (overrides: Partial<GenerationSettings> = {}): GenerationSettings => ({
  model: 'test-model',
  width: 512,
  height: 512,
  steps: 20,
  cfgScale: 7,
  sampler: 'euler',
  ...overrides,
});

// Helper to create valid node data
const createNodeData = (overrides: Partial<Omit<GenerationNode, 'id' | 'childIds' | 'depth' | 'branchIndex'>> = {}) => ({
  parentId: null as string | null,
  panelId: 'test-panel',
  status: 'complete' as GenerationStatus,
  type: 'initial' as GenerationType,
  prompt: 'test prompt',
  seed: 12345,
  settings: createSettings(),
  createdAt: new Date(),
  ...overrides,
});

describe('Generation Tree Store - Edge Cases', () => {
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

  describe('Null/Undefined Input Handling', () => {
    it('should handle getTree with non-existent panelId', () => {
      const { actions } = useGenerationTreeStore.getState();
      const tree = actions.getTree('non-existent-panel');
      expect(tree).toBeUndefined();
    });

    it('should handle getNode with non-existent panelId', () => {
      const { actions } = useGenerationTreeStore.getState();
      const node = actions.getNode('non-existent-panel', 'some-node');
      expect(node).toBeUndefined();
    });

    it('should handle getNode with non-existent nodeId', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const node = actions.getNode('panel-1', 'non-existent-node');
      expect(node).toBeUndefined();
    });

    it('should handle updateNode on non-existent tree gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      // Should not throw
      expect(() => {
        actions.updateNode('non-existent', 'node', { rating: 5 });
      }).not.toThrow();
    });

    it('should handle updateNode on non-existent node gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      // Should not throw
      expect(() => {
        actions.updateNode('panel-1', 'non-existent', { rating: 5 });
      }).not.toThrow();
    });

    it('should handle removeNode on non-existent tree gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      expect(() => {
        actions.removeNode('non-existent', 'node');
      }).not.toThrow();
    });

    it('should handle removeNode on non-existent node gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      expect(() => {
        actions.removeNode('panel-1', 'non-existent');
      }).not.toThrow();
    });

    it('should handle selectNode on non-existent tree gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      expect(() => {
        actions.selectNode('non-existent', 'node');
      }).not.toThrow();
    });

    it('should handle selectNode on non-existent node gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      expect(() => {
        actions.selectNode('panel-1', 'non-existent');
      }).not.toThrow();
    });

    it('should handle rejectNode on non-existent tree gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      expect(() => {
        actions.rejectNode('non-existent', 'node');
      }).not.toThrow();
    });

    it('should handle focusNode on non-existent tree gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      expect(() => {
        actions.focusNode('non-existent', 'node');
      }).not.toThrow();
    });

    it('should return empty array for getNodePath on non-existent tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      const path = actions.getNodePath('non-existent', 'node');
      expect(path).toEqual([]);
    });

    it('should return empty array for getNodeChildren on non-existent tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      const children = actions.getNodeChildren('non-existent', 'node');
      expect(children).toEqual([]);
    });

    it('should return empty array for getNodeChildren on non-existent node', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const children = actions.getNodeChildren('panel-1', 'non-existent');
      expect(children).toEqual([]);
    });

    it('should return undefined for getSelectedNode on non-existent tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      const selected = actions.getSelectedNode('non-existent');
      expect(selected).toBeUndefined();
    });

    it('should return undefined for getSelectedNode when no selection', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const selected = actions.getSelectedNode('panel-1');
      expect(selected).toBeUndefined();
    });

    it('should return default stats for computeStats on non-existent tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      const stats = actions.computeStats('non-existent');
      expect(stats).toEqual(DEFAULT_TREE_STATS);
    });
  });

  describe('Empty String Handling', () => {
    it('should handle empty string panelId', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('');
      const tree = actions.getTree('');
      expect(tree).toBeDefined();
      expect(tree?.panelId).toBe('');
    });

    it('should handle empty prompt in node', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const id = actions.addNode('panel-1', createNodeData({ prompt: '' }));
      const node = actions.getNode('panel-1', id);
      expect(node?.prompt).toBe('');
    });
  });

  describe('Large Tree Operations', () => {
    it('should handle tree with 100 nodes', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      // Create root
      const rootId = actions.addNode('panel-1', createNodeData());
      
      // Create 99 children (all under root for simplicity)
      const nodeIds: string[] = [rootId];
      for (let i = 0; i < 99; i++) {
        const id = actions.addNode('panel-1', createNodeData({
          parentId: rootId,
          prompt: `prompt-${i}`,
          seed: i,
        }));
        nodeIds.push(id);
      }
      
      const tree = actions.getTree('panel-1');
      expect(tree?.nodes.size).toBe(100);
      expect(tree?.stats.totalNodes).toBe(100);
    });

    it('should handle deep tree (10 levels)', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      let parentId: string | null = null;
      const nodeIds: string[] = [];
      
      for (let depth = 0; depth < 10; depth++) {
        const id = actions.addNode('panel-1', createNodeData({
          parentId,
          prompt: `depth-${depth}`,
          seed: depth,
        }));
        nodeIds.push(id);
        parentId = id;
      }
      
      const tree = actions.getTree('panel-1');
      expect(tree?.stats.maxDepth).toBe(9); // 0-indexed
      
      // Check path from deepest to root
      const path = actions.getNodePath('panel-1', nodeIds[9]);
      expect(path.length).toBe(10);
    });

    it('should handle wide tree (node with 50 children)', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const rootId = actions.addNode('panel-1', createNodeData());
      
      for (let i = 0; i < 50; i++) {
        actions.addNode('panel-1', createNodeData({
          parentId: rootId,
          prompt: `child-${i}`,
          seed: i,
        }));
      }
      
      const tree = actions.getTree('panel-1');
      expect(tree?.stats.maxBranches).toBe(50);
      
      const children = actions.getNodeChildren('panel-1', rootId);
      expect(children.length).toBe(50);
    });
  });

  describe('Concurrent-like Operations', () => {
    it('should handle rapid sequential node additions', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const id = actions.addNode('panel-1', createNodeData({ seed: i }));
        ids.push(id);
      }
      
      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(20);
      
      // All nodes should exist
      for (const id of ids) {
        expect(actions.getNode('panel-1', id)).toBeDefined();
      }
    });

    it('should handle interleaved operations on multiple trees', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      // Init both trees
      actions.initTree('panel-1');
      actions.initTree('panel-2');
      
      // Interleave operations
      const id1 = actions.addNode('panel-1', createNodeData({ seed: 1 }));
      const id2 = actions.addNode('panel-2', createNodeData({ seed: 2 }));
      actions.selectNode('panel-1', id1);
      const id3 = actions.addNode('panel-2', createNodeData({ parentId: id2, seed: 3 }));
      actions.rejectNode('panel-1', id1);
      actions.selectNode('panel-2', id3);
      
      // Verify isolation
      const tree1 = actions.getTree('panel-1');
      const tree2 = actions.getTree('panel-2');
      
      expect(tree1?.nodes.size).toBe(1);
      expect(tree2?.nodes.size).toBe(2);
      // Note: rejectNode changes status but doesn't clear selectedId
      // The node is still technically "selected" in the tree's view, just with rejected status
      expect(tree1?.nodes.get(id1)?.status).toBe('rejected');
      expect(tree2?.selectedId).toBe(id3);
    });
  });

  describe('State Transitions', () => {
    it('should handle all status transitions', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const id = actions.addNode('panel-1', createNodeData({ status: 'pending' }));
      
      const statuses: GenerationStatus[] = [
        'generating', 'complete', 'selected', 'rejected', 'archived', 'failed', 'pending'
      ];
      
      for (const status of statuses) {
        actions.updateNode('panel-1', id, { status });
        const node = actions.getNode('panel-1', id);
        expect(node?.status).toBe(status);
      }
    });

    it('should handle selection -> deselection -> reselection', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const id1 = actions.addNode('panel-1', createNodeData());
      const id2 = actions.addNode('panel-1', createNodeData({ parentId: id1, seed: 2 }));
      
      // Select first
      actions.selectNode('panel-1', id1);
      expect(actions.getNode('panel-1', id1)?.status).toBe('selected');
      
      // Select second (deselects first)
      actions.selectNode('panel-1', id2);
      expect(actions.getNode('panel-1', id1)?.status).toBe('complete');
      expect(actions.getNode('panel-1', id2)?.status).toBe('selected');
      
      // Reselect first
      actions.selectNode('panel-1', id1);
      expect(actions.getNode('panel-1', id1)?.status).toBe('selected');
      expect(actions.getNode('panel-1', id2)?.status).toBe('complete');
    });
  });

  describe('Deletion Scenarios', () => {
    it('should handle deleting root node', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const rootId = actions.addNode('panel-1', createNodeData());
      actions.addNode('panel-1', createNodeData({ parentId: rootId, seed: 2 }));
      actions.addNode('panel-1', createNodeData({ parentId: rootId, seed: 3 }));
      
      expect(actions.getTree('panel-1')?.nodes.size).toBe(3);
      
      actions.removeNode('panel-1', rootId);
      
      // All should be deleted
      expect(actions.getTree('panel-1')?.nodes.size).toBe(0);
      expect(actions.getTree('panel-1')?.rootId).toBe(null);
    });

    it('should handle deleting middle node in chain', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const id1 = actions.addNode('panel-1', createNodeData());
      const id2 = actions.addNode('panel-1', createNodeData({ parentId: id1, seed: 2 }));
      const id3 = actions.addNode('panel-1', createNodeData({ parentId: id2, seed: 3 }));
      
      actions.removeNode('panel-1', id2);
      
      // id2 and id3 should be deleted, id1 remains
      expect(actions.getNode('panel-1', id1)).toBeDefined();
      expect(actions.getNode('panel-1', id2)).toBeUndefined();
      expect(actions.getNode('panel-1', id3)).toBeUndefined();
      expect(actions.getTree('panel-1')?.nodes.size).toBe(1);
    });

    it('should handle deleting selected node', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const id = actions.addNode('panel-1', createNodeData());
      actions.selectNode('panel-1', id);
      
      expect(actions.getTree('panel-1')?.selectedId).toBe(id);
      
      actions.removeNode('panel-1', id);
      
      expect(actions.getTree('panel-1')?.selectedId).toBe(null);
    });

    it('should update parent childIds when deleting child', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const parentId = actions.addNode('panel-1', createNodeData());
      const child1 = actions.addNode('panel-1', createNodeData({ parentId, seed: 1 }));
      const child2 = actions.addNode('panel-1', createNodeData({ parentId, seed: 2 }));
      const child3 = actions.addNode('panel-1', createNodeData({ parentId, seed: 3 }));
      
      const parent = actions.getNode('panel-1', parentId);
      expect(parent?.childIds.length).toBe(3);
      
      actions.removeNode('panel-1', child2);
      
      const parentAfter = actions.getNode('panel-1', parentId);
      expect(parentAfter?.childIds.length).toBe(2);
      expect(parentAfter?.childIds).toContain(child1);
      expect(parentAfter?.childIds).toContain(child3);
      expect(parentAfter?.childIds).not.toContain(child2);
    });
  });

  describe('Comparison Mode Edge Cases', () => {
    it('should not add duplicate node to comparison', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      actions.addToComparison('node-1');
      actions.addToComparison('node-1');
      
      const state = useGenerationTreeStore.getState();
      expect(state.comparisonNodeIds.filter(id => id === 'node-1').length).toBe(1);
    });

    it('should handle removing non-existent node from comparison', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      expect(() => {
        actions.removeFromComparison('non-existent');
      }).not.toThrow();
    });

    it('should handle clearing empty comparison', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      expect(() => {
        actions.clearComparison();
      }).not.toThrow();
      
      expect(useGenerationTreeStore.getState().comparisonNodeIds).toEqual([]);
    });
  });

  describe('Loading State Edge Cases', () => {
    it('should handle setting same node loading multiple times', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      actions.setNodeLoading('node-1', true);
      actions.setNodeLoading('node-1', true);
      
      const state = useGenerationTreeStore.getState();
      expect(state.loadingNodeIds.has('node-1')).toBe(true);
      expect(state.loadingNodeIds.size).toBe(1);
    });

    it('should handle setting non-loading node to not loading', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      expect(() => {
        actions.setNodeLoading('node-1', false);
      }).not.toThrow();
    });
  });

  describe('dispatchNodeAction Edge Cases', () => {
    it('should handle dispatch on non-existent tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      expect(() => {
        actions.dispatchNodeAction('non-existent', { type: 'select', nodeId: 'node-1' });
      }).not.toThrow();
    });

    it('should dispatch all action types', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const id = actions.addNode('panel-1', createNodeData());
      
      // All these should not throw
      actions.dispatchNodeAction('panel-1', { type: 'select', nodeId: id });
      actions.dispatchNodeAction('panel-1', { type: 'focus', nodeId: id });
      actions.dispatchNodeAction('panel-1', { type: 'rate', nodeId: id, rating: 5 });
      actions.dispatchNodeAction('panel-1', { type: 'feedback', nodeId: id, feedback: 'Great!' });
      
      const node = actions.getNode('panel-1', id);
      expect(node?.rating).toBe(5);
      expect(node?.feedback).toBe('Great!');
    });

    it('should handle regenerate/vary/edit actions gracefully', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const id = actions.addNode('panel-1', createNodeData());
      
      // These don't have handlers yet but shouldn't throw
      expect(() => {
        actions.dispatchNodeAction('panel-1', { type: 'regenerate', nodeId: id });
        actions.dispatchNodeAction('panel-1', { type: 'vary', nodeId: id });
        actions.dispatchNodeAction('panel-1', { type: 'edit', nodeId: id, newPrompt: 'new' });
      }).not.toThrow();
    });
  });

  describe('Stats Computation', () => {
    it('should compute stats correctly for complex tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      // Build tree:
      //     root (complete)
      //    /    \
      //   a      b (selected)
      //  / \      \
      // c   d(rej) e
      
      const root = actions.addNode('panel-1', createNodeData({ status: 'complete' }));
      const a = actions.addNode('panel-1', createNodeData({ parentId: root, status: 'complete', seed: 1 }));
      const b = actions.addNode('panel-1', createNodeData({ parentId: root, status: 'complete', seed: 2 }));
      const c = actions.addNode('panel-1', createNodeData({ parentId: a, status: 'complete', seed: 3 }));
      const d = actions.addNode('panel-1', createNodeData({ parentId: a, status: 'rejected', seed: 4 }));
      const e = actions.addNode('panel-1', createNodeData({ parentId: b, status: 'complete', seed: 5 }));
      
      actions.selectNode('panel-1', b);
      
      const stats = actions.computeStats('panel-1');
      
      expect(stats.totalNodes).toBe(6);
      expect(stats.completedNodes).toBe(4); // root, a, c, e (b is now selected)
      expect(stats.selectedNodes).toBe(1); // b
      expect(stats.rejectedNodes).toBe(1); // d
      expect(stats.maxDepth).toBe(2);
      expect(stats.maxBranches).toBe(2); // root and a both have 2 children
    });
  });

  describe('Node Data Integrity', () => {
    it('should preserve all node fields through update', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const original = createNodeData({
        prompt: 'original prompt',
        negativePrompt: 'negative',
        seed: 99999,
        settings: createSettings({
          model: 'special-model',
          width: 1024,
          height: 768,
          steps: 50,
          cfgScale: 12,
          sampler: 'dpm++',
          scheduler: 'karras',
          loras: [{ name: 'lora1', strength: 0.8 }],
          controlnets: [{ type: 'openpose', strength: 1.0 }],
        }),
        imagePath: '/path/to/image.png',
        thumbnailPath: '/path/to/thumb.png',
        rating: 4,
        feedback: 'Nice image',
        completedAt: new Date(),
      });
      
      const id = actions.addNode('panel-1', original);
      
      // Update one field
      actions.updateNode('panel-1', id, { rating: 5 });
      
      const node = actions.getNode('panel-1', id);
      
      // All original fields should be preserved
      expect(node?.prompt).toBe('original prompt');
      expect(node?.negativePrompt).toBe('negative');
      expect(node?.seed).toBe(99999);
      expect(node?.settings.model).toBe('special-model');
      expect(node?.settings.loras?.length).toBe(1);
      expect(node?.imagePath).toBe('/path/to/image.png');
      expect(node?.feedback).toBe('Nice image');
      // Updated field
      expect(node?.rating).toBe(5);
    });

    it('should generate unique IDs for all nodes', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const id = actions.addNode('panel-1', createNodeData({ seed: i }));
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
      
      expect(ids.size).toBe(100);
    });
  });

  describe('View Mode and Layout', () => {
    it('should handle all view modes', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      const modes = ['full', 'compact', 'linear', 'comparison'] as const;
      
      for (const mode of modes) {
        actions.setViewMode(mode);
        expect(useGenerationTreeStore.getState().viewMode).toBe(mode);
      }
    });

    it('should handle partial layout options update', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      actions.setLayoutOptions({ nodeSize: 100 });
      
      const state = useGenerationTreeStore.getState();
      expect(state.layoutOptions.nodeSize).toBe(100);
      // Other options should remain default
      expect(state.layoutOptions.nodeSpacingX).toBe(DEFAULT_LAYOUT_OPTIONS.nodeSpacingX);
    });

    it('should handle multiple layout option updates', () => {
      const { actions } = useGenerationTreeStore.getState();
      
      actions.setLayoutOptions({ nodeSize: 100, nodeSpacingX: 200 });
      actions.setLayoutOptions({ nodeSpacingY: 300 });
      
      const state = useGenerationTreeStore.getState();
      expect(state.layoutOptions.nodeSize).toBe(100);
      expect(state.layoutOptions.nodeSpacingX).toBe(200);
      expect(state.layoutOptions.nodeSpacingY).toBe(300);
    });
  });
});
