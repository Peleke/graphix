/**
 * Generation Tree Hooks Tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodePath, useComparisonMode, useKeyboardNavigation } from '../hooks';
import type { GenerationTree, GenerationNode } from '../types';

// Helper to create mock tree
function createMockTree(): GenerationTree {
  const nodes = new Map<string, GenerationNode>();
  
  nodes.set('node-1', {
    id: 'node-1', parentId: null, panelId: 'test', childIds: ['node-2', 'node-3'],
    depth: 0, branchIndex: 0, status: 'complete', type: 'initial',
    prompt: 'test', seed: 123,
    settings: { model: 'test', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'euler' },
    createdAt: new Date(),
  });
  
  nodes.set('node-2', {
    id: 'node-2', parentId: 'node-1', panelId: 'test', childIds: ['node-4'],
    depth: 1, branchIndex: 0, status: 'selected', type: 'variation',
    prompt: 'var', seed: 456,
    settings: { model: 'test', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'euler' },
    createdAt: new Date(),
  });
  
  nodes.set('node-3', {
    id: 'node-3', parentId: 'node-1', panelId: 'test', childIds: [],
    depth: 1, branchIndex: 1, status: 'rejected', type: 'regenerate',
    prompt: 'regen', seed: 789,
    settings: { model: 'test', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'euler' },
    createdAt: new Date(),
  });
  
  nodes.set('node-4', {
    id: 'node-4', parentId: 'node-2', panelId: 'test', childIds: [],
    depth: 2, branchIndex: 0, status: 'complete', type: 'edited',
    prompt: 'edit', seed: 101,
    settings: { model: 'test', width: 512, height: 512, steps: 20, cfgScale: 7, sampler: 'euler' },
    createdAt: new Date(),
  });
  
  return {
    panelId: 'test', rootId: 'node-1', nodes, selectedId: 'node-2', focusedId: null,
    stats: { totalNodes: 4, completedNodes: 2, selectedNodes: 1, rejectedNodes: 1, maxDepth: 2, maxBranches: 2 },
  };
}

describe('useNodePath', () => {
  it('should return empty array for undefined tree', () => {
    const { result } = renderHook(() => useNodePath(undefined, 'node-1'));
    expect(result.current).toEqual([]);
  });

  it('should return empty array for null nodeId', () => {
    const tree = createMockTree();
    const { result } = renderHook(() => useNodePath(tree, null));
    expect(result.current).toEqual([]);
  });

  it('should return path from root to target', () => {
    const tree = createMockTree();
    const { result } = renderHook(() => useNodePath(tree, 'node-4'));
    expect(result.current.length).toBe(3);
    expect(result.current[0].id).toBe('node-1');
    expect(result.current[1].id).toBe('node-2');
    expect(result.current[2].id).toBe('node-4');
  });

  it('should return single node for root', () => {
    const tree = createMockTree();
    const { result } = renderHook(() => useNodePath(tree, 'node-1'));
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('node-1');
  });
});

describe('useComparisonMode', () => {
  it('should start with empty selection', () => {
    const { result } = renderHook(() => useComparisonMode());
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.canAdd).toBe(true);
  });

  it('should toggle node selection', () => {
    const { result } = renderHook(() => useComparisonMode());
    act(() => { result.current.toggle('node-1'); });
    expect(result.current.isSelected('node-1')).toBe(true);
    act(() => { result.current.toggle('node-1'); });
    expect(result.current.isSelected('node-1')).toBe(false);
  });

  it('should respect max nodes limit', () => {
    const { result } = renderHook(() => useComparisonMode(2));
    act(() => {
      result.current.toggle('node-1');
      result.current.toggle('node-2');
    });
    expect(result.current.canAdd).toBe(false);
    act(() => { result.current.toggle('node-3'); });
    expect(result.current.isSelected('node-3')).toBe(false);
  });

  it('should clear all selections', () => {
    const { result } = renderHook(() => useComparisonMode());
    act(() => {
      result.current.toggle('node-1');
      result.current.toggle('node-2');
      result.current.clear();
    });
    expect(result.current.selectedIds).toEqual([]);
  });
});

describe('useKeyboardNavigation', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('should call onSelectNext on ArrowRight', () => {
    const onSelectNext = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSelectNext }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(onSelectNext).toHaveBeenCalled();
  });

  it('should call onSelectNext on "l" (vim)', () => {
    const onSelectNext = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSelectNext }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
    expect(onSelectNext).toHaveBeenCalled();
  });

  it('should call onSelectPrevious on ArrowLeft', () => {
    const onSelectPrevious = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSelectPrevious }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(onSelectPrevious).toHaveBeenCalled();
  });

  it('should call onSelectParent on ArrowUp', () => {
    const onSelectParent = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSelectParent }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(onSelectParent).toHaveBeenCalled();
  });

  it('should call onSelectChild on ArrowDown', () => {
    const onSelectChild = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSelectChild }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onSelectChild).toHaveBeenCalled();
  });

  it('should call onConfirm on Enter', () => {
    const onConfirm = vi.fn();
    renderHook(() => useKeyboardNavigation({ onConfirm }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('should call onReject on "x"', () => {
    const onReject = vi.fn();
    renderHook(() => useKeyboardNavigation({ onReject }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(onReject).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardNavigation({}));
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
