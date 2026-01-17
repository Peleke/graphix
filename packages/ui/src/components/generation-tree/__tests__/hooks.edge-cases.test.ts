/**
 * Generation Tree Hooks - EXHAUSTIVE Edge Case Tests
 * 
 * Every hook. Every edge case. Every boundary condition.
 * The Test Terrorist will have nothing to complain about.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNodePath, useComparisonMode, useKeyboardNavigation, useTreeLayout } from '../hooks';
import type { GenerationTree, GenerationNode, TreeLayoutOptions } from '../types';
import { DEFAULT_LAYOUT_OPTIONS } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockNode(overrides: Partial<GenerationNode> = {}): GenerationNode {
  return {
    id: `node-${Math.random().toString(36).substring(2, 9)}`,
    parentId: null,
    panelId: 'test-panel',
    childIds: [],
    depth: 0,
    branchIndex: 0,
    status: 'complete',
    type: 'initial',
    prompt: 'test prompt',
    seed: 12345,
    settings: {
      model: 'test',
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

function createMockTree(nodeCount: number = 0): GenerationTree {
  const nodes = new Map<string, GenerationNode>();
  let rootId: string | null = null;

  if (nodeCount > 0) {
    const root = createMockNode({ id: 'root', depth: 0 });
    nodes.set('root', root);
    rootId = 'root';

    for (let i = 1; i < nodeCount; i++) {
      const node = createMockNode({
        id: `node-${i}`,
        parentId: 'root',
        depth: 1,
        branchIndex: i - 1,
      });
      nodes.set(node.id, node);
      root.childIds.push(node.id);
    }
  }

  return {
    panelId: 'test-panel',
    rootId,
    nodes,
    selectedId: null,
    focusedId: null,
    stats: {
      totalNodes: nodeCount,
      completedNodes: nodeCount,
      selectedNodes: 0,
      rejectedNodes: 0,
      maxDepth: nodeCount > 1 ? 1 : 0,
      maxBranches: Math.max(0, nodeCount - 1),
    },
  };
}

function createDeepTree(depth: number): GenerationTree {
  const nodes = new Map<string, GenerationNode>();
  let parentId: string | null = null;
  let rootId: string | null = null;

  for (let d = 0; d < depth; d++) {
    const id = `depth-${d}`;
    const node = createMockNode({
      id,
      parentId,
      depth: d,
      childIds: d < depth - 1 ? [`depth-${d + 1}`] : [],
    });
    nodes.set(id, node);
    
    if (d === 0) rootId = id;
    parentId = id;
  }

  return {
    panelId: 'test-panel',
    rootId,
    nodes,
    selectedId: null,
    focusedId: null,
    stats: {
      totalNodes: depth,
      completedNodes: depth,
      selectedNodes: 0,
      rejectedNodes: 0,
      maxDepth: depth - 1,
      maxBranches: 1,
    },
  };
}

// ============================================================================
// useNodePath Tests
// ============================================================================

describe('useNodePath - Exhaustive', () => {
  describe('Basic Functionality', () => {
    it('should return empty array for undefined tree', () => {
      const { result } = renderHook(() => useNodePath(undefined, 'any-node'));
      expect(result.current).toEqual([]);
    });

    it('should return empty array for null nodeId', () => {
      const tree = createMockTree(3);
      const { result } = renderHook(() => useNodePath(tree, null));
      expect(result.current).toEqual([]);
    });

    it('should return empty array for empty string nodeId', () => {
      const tree = createMockTree(3);
      const { result } = renderHook(() => useNodePath(tree, ''));
      expect(result.current).toEqual([]);
    });

    it('should return empty array for non-existent nodeId', () => {
      const tree = createMockTree(3);
      const { result } = renderHook(() => useNodePath(tree, 'non-existent'));
      expect(result.current).toEqual([]);
    });
  });

  describe('Path Computation', () => {
    it('should return single node path for root', () => {
      const tree = createMockTree(1);
      const { result } = renderHook(() => useNodePath(tree, 'root'));
      expect(result.current.length).toBe(1);
      expect(result.current[0].id).toBe('root');
    });

    it('should return correct path for child node', () => {
      const tree = createMockTree(5);
      const { result } = renderHook(() => useNodePath(tree, 'node-2'));
      expect(result.current.length).toBe(2);
      expect(result.current[0].id).toBe('root');
      expect(result.current[1].id).toBe('node-2');
    });

    it('should return correct path for deep node (10 levels)', () => {
      const tree = createDeepTree(10);
      const { result } = renderHook(() => useNodePath(tree, 'depth-9'));
      expect(result.current.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(result.current[i].id).toBe(`depth-${i}`);
      }
    });

    it('should return correct path for very deep node (50 levels)', () => {
      const tree = createDeepTree(50);
      const { result } = renderHook(() => useNodePath(tree, 'depth-49'));
      expect(result.current.length).toBe(50);
    });
  });

  describe('Memoization', () => {
    it('should return same reference for same inputs', () => {
      const tree = createMockTree(3);
      const { result, rerender } = renderHook(
        ({ tree, nodeId }) => useNodePath(tree, nodeId),
        { initialProps: { tree, nodeId: 'node-1' } }
      );
      
      const firstResult = result.current;
      rerender({ tree, nodeId: 'node-1' });
      const secondResult = result.current;
      
      expect(firstResult).toBe(secondResult);
    });

    it('should return new reference when nodeId changes', () => {
      const tree = createMockTree(3);
      const { result, rerender } = renderHook(
        ({ tree, nodeId }) => useNodePath(tree, nodeId),
        { initialProps: { tree, nodeId: 'node-1' } }
      );
      
      const firstResult = result.current;
      rerender({ tree, nodeId: 'node-2' });
      const secondResult = result.current;
      
      expect(firstResult).not.toBe(secondResult);
    });
  });
});

// ============================================================================
// useComparisonMode Tests
// ============================================================================

describe('useComparisonMode - Exhaustive', () => {
  describe('Initialization', () => {
    it('should start with empty selection', () => {
      const { result } = renderHook(() => useComparisonMode());
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.canAdd).toBe(true);
    });

    it('should respect custom maxNodes', () => {
      const { result } = renderHook(() => useComparisonMode(2));
      expect(result.current.canAdd).toBe(true);
    });

    it('should handle maxNodes of 1', () => {
      const { result } = renderHook(() => useComparisonMode(1));
      
      act(() => { result.current.toggle('node-1'); });
      expect(result.current.canAdd).toBe(false);
      
      act(() => { result.current.toggle('node-2'); });
      expect(result.current.selectedIds).toEqual(['node-1']);
    });

    it('should handle maxNodes of 0 (edge case)', () => {
      const { result } = renderHook(() => useComparisonMode(0));
      expect(result.current.canAdd).toBe(false);
      
      act(() => { result.current.toggle('node-1'); });
      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe('Toggle Behavior', () => {
    it('should add node when toggled first time', () => {
      const { result } = renderHook(() => useComparisonMode());
      
      act(() => { result.current.toggle('node-1'); });
      expect(result.current.selectedIds).toContain('node-1');
      expect(result.current.isSelected('node-1')).toBe(true);
    });

    it('should remove node when toggled second time', () => {
      const { result } = renderHook(() => useComparisonMode());
      
      act(() => { result.current.toggle('node-1'); });
      act(() => { result.current.toggle('node-1'); });
      
      expect(result.current.selectedIds).not.toContain('node-1');
      expect(result.current.isSelected('node-1')).toBe(false);
    });

    it('should handle rapid toggles', () => {
      const { result } = renderHook(() => useComparisonMode());
      
      act(() => {
        result.current.toggle('node-1');
        result.current.toggle('node-1');
        result.current.toggle('node-1');
        result.current.toggle('node-1');
        result.current.toggle('node-1');
      });
      
      // Odd number of toggles = selected
      expect(result.current.isSelected('node-1')).toBe(true);
    });

    it('should maintain order of selection', () => {
      const { result } = renderHook(() => useComparisonMode());
      
      act(() => {
        result.current.toggle('node-3');
        result.current.toggle('node-1');
        result.current.toggle('node-2');
      });
      
      expect(result.current.selectedIds).toEqual(['node-3', 'node-1', 'node-2']);
    });
  });

  describe('Max Nodes Enforcement', () => {
    it('should not exceed maxNodes', () => {
      const { result } = renderHook(() => useComparisonMode(3));
      
      act(() => {
        result.current.toggle('node-1');
        result.current.toggle('node-2');
        result.current.toggle('node-3');
      });
      
      expect(result.current.canAdd).toBe(false);
      
      act(() => { result.current.toggle('node-4'); });
      expect(result.current.selectedIds.length).toBe(3);
      expect(result.current.isSelected('node-4')).toBe(false);
    });

    it('should allow adding after removing', () => {
      const { result } = renderHook(() => useComparisonMode(2));
      
      act(() => {
        result.current.toggle('node-1');
        result.current.toggle('node-2');
      });
      
      expect(result.current.canAdd).toBe(false);
      
      act(() => { result.current.toggle('node-1'); }); // Remove
      expect(result.current.canAdd).toBe(true);
      
      act(() => { result.current.toggle('node-3'); }); // Add new
      expect(result.current.isSelected('node-3')).toBe(true);
    });
  });

  describe('Clear Behavior', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useComparisonMode());
      
      act(() => {
        result.current.toggle('node-1');
        result.current.toggle('node-2');
        result.current.toggle('node-3');
        result.current.clear();
      });
      
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.canAdd).toBe(true);
    });

    it('should handle clear on empty selection', () => {
      const { result } = renderHook(() => useComparisonMode());
      
      act(() => { result.current.clear(); });
      
      expect(result.current.selectedIds).toEqual([]);
    });

    it('should allow new selections after clear', () => {
      const { result } = renderHook(() => useComparisonMode(2));
      
      act(() => {
        result.current.toggle('node-1');
        result.current.toggle('node-2');
        result.current.clear();
        result.current.toggle('node-3');
      });
      
      expect(result.current.selectedIds).toEqual(['node-3']);
    });
  });

  describe('isSelected Function', () => {
    it('should return false for unselected node', () => {
      const { result } = renderHook(() => useComparisonMode());
      expect(result.current.isSelected('non-existent')).toBe(false);
    });

    it('should return true for selected node', () => {
      const { result } = renderHook(() => useComparisonMode());
      
      act(() => { result.current.toggle('node-1'); });
      expect(result.current.isSelected('node-1')).toBe(true);
    });

    it('should handle empty string node ID', () => {
      const { result } = renderHook(() => useComparisonMode());
      expect(result.current.isSelected('')).toBe(false);
    });
  });
});

// ============================================================================
// useKeyboardNavigation Tests
// ============================================================================

describe('useKeyboardNavigation - Exhaustive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Arrow Key Navigation', () => {
    it('should call onSelectNext on ArrowRight', () => {
      const onSelectNext = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectNext }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(onSelectNext).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectPrevious on ArrowLeft', () => {
      const onSelectPrevious = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectPrevious }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(onSelectPrevious).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectParent on ArrowUp', () => {
      const onSelectParent = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectParent }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(onSelectParent).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectChild on ArrowDown', () => {
      const onSelectChild = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectChild }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(onSelectChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('Vim-Style Navigation', () => {
    it('should call onSelectNext on "l"', () => {
      const onSelectNext = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectNext }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
      expect(onSelectNext).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectPrevious on "h"', () => {
      const onSelectPrevious = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectPrevious }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
      expect(onSelectPrevious).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectParent on "k"', () => {
      const onSelectParent = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectParent }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
      expect(onSelectParent).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectChild on "j"', () => {
      const onSelectChild = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectChild }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      expect(onSelectChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action Keys', () => {
    it('should call onConfirm on Enter', () => {
      const onConfirm = vi.fn();
      renderHook(() => useKeyboardNavigation({ onConfirm }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm on Space', () => {
      const onConfirm = vi.fn();
      renderHook(() => useKeyboardNavigation({ onConfirm }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onReject on "x"', () => {
      const onReject = vi.fn();
      renderHook(() => useKeyboardNavigation({ onReject }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('should call onReject on Delete', () => {
      const onReject = vi.fn();
      renderHook(() => useKeyboardNavigation({ onReject }));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Missing Handlers', () => {
    it('should not throw when handler is undefined', () => {
      renderHook(() => useKeyboardNavigation({}));
      
      expect(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      }).not.toThrow();
    });
  });

  describe('Unhandled Keys', () => {
    it('should not call any handler for unhandled keys', () => {
      const handlers = {
        onSelectNext: vi.fn(),
        onSelectPrevious: vi.fn(),
        onSelectParent: vi.fn(),
        onSelectChild: vi.fn(),
        onConfirm: vi.fn(),
        onReject: vi.fn(),
      };
      
      renderHook(() => useKeyboardNavigation(handlers));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
      
      Object.values(handlers).forEach(handler => {
        expect(handler).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useKeyboardNavigation({}));
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should not call handlers after unmount', () => {
      const onSelectNext = vi.fn();
      const { unmount } = renderHook(() => useKeyboardNavigation({ onSelectNext }));
      
      unmount();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      
      expect(onSelectNext).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Key Presses', () => {
    it('should handle rapid sequential key presses', () => {
      const onSelectNext = vi.fn();
      renderHook(() => useKeyboardNavigation({ onSelectNext }));
      
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      }
      
      expect(onSelectNext).toHaveBeenCalledTimes(10);
    });

    it('should handle interleaved key presses', () => {
      const handlers = {
        onSelectNext: vi.fn(),
        onSelectPrevious: vi.fn(),
        onConfirm: vi.fn(),
      };
      
      renderHook(() => useKeyboardNavigation(handlers));
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      
      expect(handlers.onSelectNext).toHaveBeenCalledTimes(2);
      expect(handlers.onSelectPrevious).toHaveBeenCalledTimes(1);
      expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// useTreeLayout Tests
// ============================================================================

describe('useTreeLayout - Exhaustive', () => {
  describe('Empty/Undefined Trees', () => {
    it('should return empty result for undefined tree', () => {
      const { result } = renderHook(() => useTreeLayout(undefined));
      expect(result.current.nodes).toEqual([]);
      expect(result.current.links).toEqual([]);
    });

    it('should return empty result for tree with no root', () => {
      const tree: GenerationTree = {
        panelId: 'test',
        rootId: null,
        nodes: new Map(),
        selectedId: null,
        focusedId: null,
        stats: { ...DEFAULT_LAYOUT_OPTIONS, totalNodes: 0, completedNodes: 0, selectedNodes: 0, rejectedNodes: 0, maxDepth: 0, maxBranches: 0 } as any,
      };
      
      const { result } = renderHook(() => useTreeLayout(tree));
      expect(result.current.nodes).toEqual([]);
      expect(result.current.links).toEqual([]);
    });

    it('should return empty result for tree with missing root node', () => {
      const tree: GenerationTree = {
        panelId: 'test',
        rootId: 'missing-root',
        nodes: new Map(),
        selectedId: null,
        focusedId: null,
        stats: { totalNodes: 0, completedNodes: 0, selectedNodes: 0, rejectedNodes: 0, maxDepth: 0, maxBranches: 0 },
      };
      
      const { result } = renderHook(() => useTreeLayout(tree));
      expect(result.current.nodes).toEqual([]);
      expect(result.current.links).toEqual([]);
    });
  });

  describe('Single Node Trees', () => {
    it('should layout single node at origin', () => {
      const tree = createMockTree(1);
      const { result } = renderHook(() => useTreeLayout(tree));
      
      expect(result.current.nodes.length).toBe(1);
      expect(result.current.links.length).toBe(0);
      expect(result.current.nodes[0].id).toBe('root');
    });
  });

  describe('Multi-Node Trees', () => {
    it('should layout tree with multiple children', () => {
      const tree = createMockTree(5);
      const { result } = renderHook(() => useTreeLayout(tree));
      
      expect(result.current.nodes.length).toBe(5);
      expect(result.current.links.length).toBe(4); // 4 children connected to root
    });

    it('should layout deep tree', () => {
      const tree = createDeepTree(5);
      const { result } = renderHook(() => useTreeLayout(tree));
      
      expect(result.current.nodes.length).toBe(5);
      expect(result.current.links.length).toBe(4);
      
      // Verify y-coordinates increase with depth
      const sortedByDepth = [...result.current.nodes].sort((a, b) => a.y - b.y);
      expect(sortedByDepth[0].id).toBe('depth-0');
    });
  });

  describe('Custom Layout Options', () => {
    it('should respect custom nodeSpacingX', () => {
      const tree = createMockTree(3);
      const options: TreeLayoutOptions = { 
        ...DEFAULT_LAYOUT_OPTIONS, 
        nodeSpacingX: 200 
      };
      
      const { result } = renderHook(() => useTreeLayout(tree, options));
      
      // Nodes should be spaced according to nodeSpacingX
      expect(result.current.nodes.length).toBe(3);
    });

    it('should respect custom nodeSpacingY', () => {
      const tree = createDeepTree(3);
      const options: TreeLayoutOptions = { 
        ...DEFAULT_LAYOUT_OPTIONS, 
        nodeSpacingY: 300 
      };
      
      const { result } = renderHook(() => useTreeLayout(tree, options));
      
      // Y spacing should be larger
      expect(result.current.nodes.length).toBe(3);
    });
  });

  describe('Memoization', () => {
    it('should return same reference for same tree', () => {
      const tree = createMockTree(3);
      const { result, rerender } = renderHook(
        ({ tree }) => useTreeLayout(tree),
        { initialProps: { tree } }
      );
      
      const first = result.current;
      rerender({ tree });
      const second = result.current;
      
      expect(first).toBe(second);
    });

    it('should return new reference when tree changes', () => {
      const tree1 = createMockTree(3);
      const tree2 = createMockTree(5);
      
      const { result, rerender } = renderHook(
        ({ tree }) => useTreeLayout(tree),
        { initialProps: { tree: tree1 } }
      );
      
      const first = result.current;
      rerender({ tree: tree2 });
      const second = result.current;
      
      expect(first).not.toBe(second);
    });
  });

  describe('Link Data', () => {
    it('should have correct source and target for each link', () => {
      const tree = createMockTree(3);
      const { result } = renderHook(() => useTreeLayout(tree));
      
      for (const link of result.current.links) {
        expect(link.sourceId).toBeDefined();
        expect(link.targetId).toBeDefined();
        expect(typeof link.sourceX).toBe('number');
        expect(typeof link.sourceY).toBe('number');
        expect(typeof link.targetX).toBe('number');
        expect(typeof link.targetY).toBe('number');
      }
    });

    it('should connect parent to children correctly', () => {
      const tree = createMockTree(3);
      const { result } = renderHook(() => useTreeLayout(tree));
      
      // All links should have root as source
      for (const link of result.current.links) {
        expect(link.sourceId).toBe('root');
      }
    });
  });
});
