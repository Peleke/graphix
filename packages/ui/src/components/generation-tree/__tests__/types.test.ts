/**
 * Generation Tree Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LAYOUT_OPTIONS,
  DEFAULT_TREE_STATS,
  type GenerationStatus,
  type GenerationType,
  type TreeViewMode,
  type LayoutDirection,
  type GenerationNode,
  type GenerationTree,
  type NodeAction,
} from '../types';

describe('Default Values', () => {
  describe('DEFAULT_LAYOUT_OPTIONS', () => {
    it('should have valid nodeSize', () => {
      expect(DEFAULT_LAYOUT_OPTIONS.nodeSize).toBe(80);
    });

    it('should have valid nodeSpacingX', () => {
      expect(DEFAULT_LAYOUT_OPTIONS.nodeSpacingX).toBe(120);
    });

    it('should have valid nodeSpacingY', () => {
      expect(DEFAULT_LAYOUT_OPTIONS.nodeSpacingY).toBe(150);
    });

    it('should have vertical direction', () => {
      expect(DEFAULT_LAYOUT_OPTIONS.direction).toBe('vertical');
    });

    it('should have compactMode false', () => {
      expect(DEFAULT_LAYOUT_OPTIONS.compactMode).toBe(false);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DEFAULT_LAYOUT_OPTIONS)).toBe(true);
    });
  });

  describe('DEFAULT_TREE_STATS', () => {
    it('should have all zero values', () => {
      expect(DEFAULT_TREE_STATS.totalNodes).toBe(0);
      expect(DEFAULT_TREE_STATS.completedNodes).toBe(0);
      expect(DEFAULT_TREE_STATS.selectedNodes).toBe(0);
      expect(DEFAULT_TREE_STATS.rejectedNodes).toBe(0);
      expect(DEFAULT_TREE_STATS.maxDepth).toBe(0);
      expect(DEFAULT_TREE_STATS.maxBranches).toBe(0);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DEFAULT_TREE_STATS)).toBe(true);
    });
  });
});

describe('Type Compatibility', () => {
  describe('GenerationStatus', () => {
    it('should accept all valid values', () => {
      const statuses: GenerationStatus[] = ['pending', 'generating', 'complete', 'failed', 'selected', 'rejected', 'archived'];
      statuses.forEach(s => expect(['pending', 'generating', 'complete', 'failed', 'selected', 'rejected', 'archived']).toContain(s));
    });
  });

  describe('GenerationType', () => {
    it('should accept all valid values', () => {
      const types: GenerationType[] = ['initial', 'variation', 'regenerate', 'edited', 'inpaint', 'upscale', 'controlnet'];
      types.forEach(t => expect(['initial', 'variation', 'regenerate', 'edited', 'inpaint', 'upscale', 'controlnet']).toContain(t));
    });
  });

  describe('TreeViewMode', () => {
    it('should accept all valid values', () => {
      const modes: TreeViewMode[] = ['full', 'compact', 'linear', 'comparison'];
      modes.forEach(m => expect(['full', 'compact', 'linear', 'comparison']).toContain(m));
    });
  });
});

describe('NodeAction Types', () => {
  it('should support select action', () => {
    const action: NodeAction = { type: 'select', nodeId: 'test' };
    expect(action.type).toBe('select');
  });

  it('should support reject action', () => {
    const action: NodeAction = { type: 'reject', nodeId: 'test' };
    expect(action.type).toBe('reject');
  });

  it('should support rate action with rating', () => {
    const action: NodeAction = { type: 'rate', nodeId: 'test', rating: 5 };
    expect(action.rating).toBe(5);
  });

  it('should support feedback action', () => {
    const action: NodeAction = { type: 'feedback', nodeId: 'test', feedback: 'Nice!' };
    expect(action.feedback).toBe('Nice!');
  });

  it('should support all other actions', () => {
    const actions: NodeAction[] = [
      { type: 'focus', nodeId: 'test' },
      { type: 'regenerate', nodeId: 'test' },
      { type: 'vary', nodeId: 'test' },
      { type: 'edit', nodeId: 'test' },
      { type: 'archive', nodeId: 'test' },
      { type: 'delete', nodeId: 'test' },
    ];
    expect(actions.length).toBe(6);
  });
});

describe('GenerationNode Structure', () => {
  it('should create valid minimal node', () => {
    const node: GenerationNode = {
      id: 'test', parentId: null, panelId: 'panel-1', childIds: [],
      depth: 0, branchIndex: 0, status: 'pending', type: 'initial',
      prompt: 'test', seed: 12345,
      settings: { model: 'test', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'euler' },
      createdAt: new Date(),
    };
    expect(node.id).toBe('test');
    expect(node.depth).toBe(0);
  });

  it('should support all optional fields', () => {
    const node: GenerationNode = {
      id: 'test', parentId: 'parent', panelId: 'panel-1', childIds: ['c1', 'c2'],
      depth: 1, branchIndex: 2, status: 'complete', type: 'variation',
      prompt: 'test', negativePrompt: 'bad', seed: 12345,
      settings: {
        model: 'test', width: 768, height: 1024, steps: 30, cfgScale: 7.5, sampler: 'dpm++',
        scheduler: 'karras',
        loras: [{ name: 'lora', weight: 0.8 }],
        controlnets: [{ model: 'openpose', weight: 1.0 }],
      },
      imagePath: '/img.png', thumbnailPath: '/thumb.png',
      rating: 5, feedback: 'Great!',
      createdAt: new Date(), completedAt: new Date(),
    };
    expect(node.rating).toBe(5);
    expect(node.settings.loras?.length).toBe(1);
  });
});

describe('GenerationTree Structure', () => {
  it('should create valid empty tree', () => {
    const tree: GenerationTree = {
      panelId: 'panel-1', rootId: null, nodes: new Map(),
      selectedId: null, focusedId: null,
      stats: { ...DEFAULT_TREE_STATS },
    };
    expect(tree.nodes.size).toBe(0);
  });

  it('should store nodes in Map', () => {
    const node: GenerationNode = {
      id: 'n1', parentId: null, panelId: 'p1', childIds: [],
      depth: 0, branchIndex: 0, status: 'complete', type: 'initial',
      prompt: 't', seed: 1,
      settings: { model: 't', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'e' },
      createdAt: new Date(),
    };
    const tree: GenerationTree = {
      panelId: 'p1', rootId: 'n1', nodes: new Map([['n1', node]]),
      selectedId: 'n1', focusedId: null,
      stats: { totalNodes: 1, completedNodes: 1, selectedNodes: 1, rejectedNodes: 0, maxDepth: 0, maxBranches: 0 },
    };
    expect(tree.nodes.get('n1')).toEqual(node);
  });
});
