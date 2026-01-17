/**
 * Generation Tree Store Tests
 * 
 * Exhaustive tests for the Zustand store managing generation tree state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationTreeStore } from '../store';
import type { GenerationNode, GenerationStatus, GenerationType } from '../types';

// Reset store before each test
beforeEach(() => {
  useGenerationTreeStore.setState({
    trees: new Map(),
    activeTreeId: null,
    viewMode: 'full',
    layoutOptions: {
      nodeSize: 80,
      nodeSpacingX: 120,
      nodeSpacingY: 150,
      direction: 'vertical',
      compactMode: false,
    },
    hoveredNodeId: null,
    contextMenuNodeId: null,
    comparisonNodeIds: [],
    loadingNodeIds: new Set(),
  });
});

// Helper to create mock node data
function createMockNodeData(overrides: Partial<GenerationNode> = {}) {
  return {
    parentId: null,
    panelId: 'test-panel',
    status: 'complete' as GenerationStatus,
    type: 'initial' as GenerationType,
    prompt: 'test prompt',
    seed: 12345,
    settings: {
      model: 'test-model',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: 'euler',
    },
    createdAt: new Date(),
    ...overrides,
  };
}

describe('Generation Tree Store', () => {
  describe('Tree Management', () => {
    it('should initialize an empty tree for a panel', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const tree = actions.getTree('panel-1');
      expect(tree).toBeDefined();
      expect(tree?.panelId).toBe('panel-1');
      expect(tree?.rootId).toBeNull();
      expect(tree?.nodes.size).toBe(0);
    });

    it('should not reinitialize existing tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      actions.initTree('panel-1');
      const tree = actions.getTree('panel-1');
      expect(tree?.nodes.size).toBe(1);
      expect(tree?.nodes.get(nodeId)).toBeDefined();
    });

    it('should load tree from array of nodes', () => {
      const { actions } = useGenerationTreeStore.getState();
      const nodes: GenerationNode[] = [
        {
          id: 'node-1', parentId: null, panelId: 'panel-1', childIds: ['node-2'],
          depth: 0, branchIndex: 0, status: 'complete', type: 'initial',
          prompt: 'test', seed: 123,
          settings: { model: 'test', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'euler' },
          createdAt: new Date(),
        },
        {
          id: 'node-2', parentId: 'node-1', panelId: 'panel-1', childIds: [],
          depth: 1, branchIndex: 0, status: 'selected', type: 'variation',
          prompt: 'test variation', seed: 456,
          settings: { model: 'test', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'euler' },
          createdAt: new Date(),
        },
      ];
      actions.loadTree('panel-1', nodes);
      const tree = actions.getTree('panel-1');
      expect(tree?.nodes.size).toBe(2);
      expect(tree?.rootId).toBe('node-1');
      expect(tree?.selectedId).toBe('node-2');
    });

    it('should clear tree completely', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      actions.addNode('panel-1', createMockNodeData());
      actions.clearTree('panel-1');
      const tree = actions.getTree('panel-1');
      expect(tree).toBeUndefined();
    });
  });

  describe('Node Operations', () => {
    it('should add root node correctly', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      const tree = actions.getTree('panel-1');
      const node = tree?.nodes.get(nodeId);
      expect(node).toBeDefined();
      expect(node?.depth).toBe(0);
      expect(node?.branchIndex).toBe(0);
      expect(node?.parentId).toBeNull();
      expect(tree?.rootId).toBe(nodeId);
    });

    it('should add child node with correct depth', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const rootId = actions.addNode('panel-1', createMockNodeData());
      const childId = actions.addNode('panel-1', createMockNodeData({ parentId: rootId }));
      const tree = actions.getTree('panel-1');
      const child = tree?.nodes.get(childId);
      const root = tree?.nodes.get(rootId);
      expect(child?.depth).toBe(1);
      expect(child?.parentId).toBe(rootId);
      expect(root?.childIds).toContain(childId);
    });

    it('should calculate branch index for siblings', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const rootId = actions.addNode('panel-1', createMockNodeData());
      const child1 = actions.addNode('panel-1', createMockNodeData({ parentId: rootId }));
      const child2 = actions.addNode('panel-1', createMockNodeData({ parentId: rootId }));
      const child3 = actions.addNode('panel-1', createMockNodeData({ parentId: rootId }));
      const tree = actions.getTree('panel-1');
      expect(tree?.nodes.get(child1)?.branchIndex).toBe(0);
      expect(tree?.nodes.get(child2)?.branchIndex).toBe(1);
      expect(tree?.nodes.get(child3)?.branchIndex).toBe(2);
    });

    it('should update node properties', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      actions.updateNode('panel-1', nodeId, { status: 'selected', rating: 5, feedback: 'Great!' });
      const node = actions.getNode('panel-1', nodeId);
      expect(node?.status).toBe('selected');
      expect(node?.rating).toBe(5);
      expect(node?.feedback).toBe('Great!');
    });

    it('should remove node and children recursively', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const rootId = actions.addNode('panel-1', createMockNodeData());
      const child1 = actions.addNode('panel-1', createMockNodeData({ parentId: rootId }));
      const grandchild = actions.addNode('panel-1', createMockNodeData({ parentId: child1 }));
      const child2 = actions.addNode('panel-1', createMockNodeData({ parentId: rootId }));
      actions.removeNode('panel-1', child1);
      const tree = actions.getTree('panel-1');
      expect(tree?.nodes.has(child1)).toBe(false);
      expect(tree?.nodes.has(grandchild)).toBe(false);
      expect(tree?.nodes.has(child2)).toBe(true);
    });
  });

  describe('Selection & Focus', () => {
    it('should select node and deselect previous', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const node1 = actions.addNode('panel-1', createMockNodeData({ status: 'complete' }));
      const node2 = actions.addNode('panel-1', createMockNodeData({ status: 'complete' }));
      actions.selectNode('panel-1', node1);
      actions.selectNode('panel-1', node2);
      const tree = actions.getTree('panel-1');
      expect(tree?.selectedId).toBe(node2);
      expect(tree?.nodes.get(node2)?.status).toBe('selected');
      expect(tree?.nodes.get(node1)?.status).toBe('complete');
    });

    it('should reject node', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData({ status: 'complete' }));
      actions.rejectNode('panel-1', nodeId);
      const node = actions.getNode('panel-1', nodeId);
      expect(node?.status).toBe('rejected');
    });

    it('should focus node without changing status', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData({ status: 'complete' }));
      actions.focusNode('panel-1', nodeId);
      const tree = actions.getTree('panel-1');
      expect(tree?.focusedId).toBe(nodeId);
      expect(tree?.nodes.get(nodeId)?.status).toBe('complete');
    });
  });

  describe('Node Actions Dispatch', () => {
    it('should dispatch select action', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      actions.dispatchNodeAction('panel-1', { type: 'select', nodeId });
      expect(actions.getTree('panel-1')?.selectedId).toBe(nodeId);
    });

    it('should dispatch rate action', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      actions.dispatchNodeAction('panel-1', { type: 'rate', nodeId, rating: 4 });
      expect(actions.getNode('panel-1', nodeId)?.rating).toBe(4);
    });

    it('should dispatch feedback action', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      actions.dispatchNodeAction('panel-1', { type: 'feedback', nodeId, feedback: 'Nice!' });
      expect(actions.getNode('panel-1', nodeId)?.feedback).toBe('Nice!');
    });

    it('should dispatch archive action', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      actions.dispatchNodeAction('panel-1', { type: 'archive', nodeId });
      expect(actions.getNode('panel-1', nodeId)?.status).toBe('archived');
    });

    it('should dispatch delete action', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const nodeId = actions.addNode('panel-1', createMockNodeData());
      actions.dispatchNodeAction('panel-1', { type: 'delete', nodeId });
      expect(actions.getNode('panel-1', nodeId)).toBeUndefined();
    });
  });

  describe('UI State', () => {
    it('should set active tree', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.setActiveTree('panel-1');
      expect(useGenerationTreeStore.getState().activeTreeId).toBe('panel-1');
    });

    it('should set view mode', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.setViewMode('compact');
      expect(useGenerationTreeStore.getState().viewMode).toBe('compact');
    });

    it('should update layout options partially', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.setLayoutOptions({ nodeSize: 100, compactMode: true });
      const { layoutOptions } = useGenerationTreeStore.getState();
      expect(layoutOptions.nodeSize).toBe(100);
      expect(layoutOptions.compactMode).toBe(true);
      expect(layoutOptions.nodeSpacingX).toBe(120);
    });

    it('should set hovered node', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.setHoveredNode('node-1');
      expect(useGenerationTreeStore.getState().hoveredNodeId).toBe('node-1');
      actions.setHoveredNode(null);
      expect(useGenerationTreeStore.getState().hoveredNodeId).toBeNull();
    });
  });

  describe('Comparison Mode', () => {
    it('should add node to comparison', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.addToComparison('node-1');
      actions.addToComparison('node-2');
      expect(useGenerationTreeStore.getState().comparisonNodeIds).toEqual(['node-1', 'node-2']);
    });

    it('should not add duplicate to comparison', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.addToComparison('node-1');
      actions.addToComparison('node-1');
      expect(useGenerationTreeStore.getState().comparisonNodeIds).toEqual(['node-1']);
    });

    it('should clear comparison', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.addToComparison('node-1');
      actions.addToComparison('node-2');
      actions.clearComparison();
      expect(useGenerationTreeStore.getState().comparisonNodeIds).toEqual([]);
    });
  });

  describe('Loading State', () => {
    it('should track loading nodes', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.setNodeLoading('node-1', true);
      expect(useGenerationTreeStore.getState().loadingNodeIds.has('node-1')).toBe(true);
      actions.setNodeLoading('node-1', false);
      expect(useGenerationTreeStore.getState().loadingNodeIds.has('node-1')).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should get node path from root to target', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const root = actions.addNode('panel-1', createMockNodeData());
      const child = actions.addNode('panel-1', createMockNodeData({ parentId: root }));
      const grandchild = actions.addNode('panel-1', createMockNodeData({ parentId: child }));
      const path = actions.getNodePath('panel-1', grandchild);
      expect(path.length).toBe(3);
      expect(path[0].id).toBe(root);
      expect(path[1].id).toBe(child);
      expect(path[2].id).toBe(grandchild);
    });

    it('should get node children', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const root = actions.addNode('panel-1', createMockNodeData());
      const child1 = actions.addNode('panel-1', createMockNodeData({ parentId: root }));
      const child2 = actions.addNode('panel-1', createMockNodeData({ parentId: root }));
      const children = actions.getNodeChildren('panel-1', root);
      expect(children.length).toBe(2);
      expect(children.map(c => c.id)).toContain(child1);
      expect(children.map(c => c.id)).toContain(child2);
    });

    it('should compute tree stats correctly', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('panel-1');
      const root = actions.addNode('panel-1', createMockNodeData({ status: 'complete' }));
      actions.addNode('panel-1', createMockNodeData({ parentId: root, status: 'selected' }));
      actions.addNode('panel-1', createMockNodeData({ parentId: root, status: 'rejected' }));
      const stats = actions.computeStats('panel-1');
      expect(stats.totalNodes).toBe(3);
      expect(stats.completedNodes).toBe(1);
      expect(stats.selectedNodes).toBe(1);
      expect(stats.rejectedNodes).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations on non-existent panel', () => {
      const { actions } = useGenerationTreeStore.getState();
      expect(actions.getTree('non-existent')).toBeUndefined();
      expect(actions.getNode('non-existent', 'node-1')).toBeUndefined();
      expect(actions.getNodePath('non-existent', 'node-1')).toEqual([]);
    });

    it('should create tree if not exists when adding node', () => {
      const { actions } = useGenerationTreeStore.getState();
      const nodeId = actions.addNode('new-panel', createMockNodeData());
      const tree = actions.getTree('new-panel');
      expect(tree).toBeDefined();
      expect(tree?.nodes.has(nodeId)).toBe(true);
    });
  });
});
