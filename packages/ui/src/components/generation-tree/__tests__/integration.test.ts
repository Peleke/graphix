/**
 * Generation Tree - Integration Tests
 * 
 * Tests that verify the complete flow from store operations
 * through hooks to expected outcomes. These tests ensure
 * all the pieces work together correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGenerationTreeStore, useGenerationTree, useTreeActions, useTreeViewMode, useTreeLayoutOptions, useHoveredNode, useComparisonNodes, useIsNodeLoading } from '../store';
import { useNodePath, useComparisonMode, useTreeLayout } from '../hooks';
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_TREE_STATS } from '../types';
import type { GenerationNode, GenerationSettings } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

const createSettings = (): GenerationSettings => ({
  model: 'test-model',
  width: 512,
  height: 512,
  steps: 20,
  cfgScale: 7,
  sampler: 'euler',
});

const createNodeData = (parentId: string | null = null) => ({
  parentId,
  panelId: 'test-panel',
  status: 'complete' as const,
  type: 'initial' as const,
  prompt: 'test prompt',
  seed: Math.floor(Math.random() * 1000000),
  settings: createSettings(),
  createdAt: new Date(),
});

// ============================================================================
// Setup
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
// Store + Selector Hook Integration
// ============================================================================

describe('Store + Selector Hook Integration', () => {
  it('useGenerationTree reflects store changes', () => {
    const { result: treeResult } = renderHook(() => useGenerationTree('test-panel'));
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    expect(treeResult.current).toBeUndefined();
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    expect(treeResult.current).toBeDefined();
    expect(treeResult.current?.panelId).toBe('test-panel');
  });

  it('useTreeViewMode reflects store changes', () => {
    const { result: modeResult } = renderHook(() => useTreeViewMode());
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    expect(modeResult.current).toBe('full');
    
    act(() => {
      actionsResult.current.setViewMode('comparison');
    });
    
    expect(modeResult.current).toBe('comparison');
  });

  it('useTreeLayoutOptions reflects store changes', () => {
    const { result: layoutResult } = renderHook(() => useTreeLayoutOptions());
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    expect(layoutResult.current.nodeSize).toBe(80);
    
    act(() => {
      actionsResult.current.setLayoutOptions({ nodeSize: 120 });
    });
    
    expect(layoutResult.current.nodeSize).toBe(120);
  });

  it('useHoveredNode reflects store changes', () => {
    const { result: hoveredResult } = renderHook(() => useHoveredNode());
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    expect(hoveredResult.current).toBeNull();
    
    act(() => {
      actionsResult.current.setHoveredNode('node-123');
    });
    
    expect(hoveredResult.current).toBe('node-123');
  });

  it('useComparisonNodes reflects store changes', () => {
    const { result: compResult } = renderHook(() => useComparisonNodes());
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    expect(compResult.current).toEqual([]);
    
    act(() => {
      actionsResult.current.addToComparison('node-1');
      actionsResult.current.addToComparison('node-2');
    });
    
    expect(compResult.current).toEqual(['node-1', 'node-2']);
  });

  it('useIsNodeLoading reflects store changes', () => {
    const { result: loadingResult } = renderHook(() => useIsNodeLoading('node-123'));
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    expect(loadingResult.current).toBe(false);
    
    act(() => {
      actionsResult.current.setNodeLoading('node-123', true);
    });
    
    expect(loadingResult.current).toBe(true);
  });
});

// ============================================================================
// Store + useNodePath Integration
// ============================================================================

describe('Store + useNodePath Integration', () => {
  it('useNodePath updates when tree changes', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    let rootId: string = '';
    let childId: string = '';
    let grandchildId: string = '';
    
    act(() => {
      rootId = actionsResult.current.addNode('test-panel', createNodeData());
      childId = actionsResult.current.addNode('test-panel', createNodeData(rootId));
      grandchildId = actionsResult.current.addNode('test-panel', createNodeData(childId));
    });
    
    const tree = actionsResult.current.getTree('test-panel');
    const { result: pathResult } = renderHook(() => useNodePath(tree, grandchildId));
    
    expect(pathResult.current.length).toBe(3);
    expect(pathResult.current[0].id).toBe(rootId);
    expect(pathResult.current[1].id).toBe(childId);
    expect(pathResult.current[2].id).toBe(grandchildId);
  });

  it('useNodePath handles node deletion', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    let rootId: string = '';
    let childId: string = '';
    
    act(() => {
      rootId = actionsResult.current.addNode('test-panel', createNodeData());
      childId = actionsResult.current.addNode('test-panel', createNodeData(rootId));
    });
    
    act(() => {
      actionsResult.current.removeNode('test-panel', childId);
    });
    
    const tree = actionsResult.current.getTree('test-panel');
    const { result: pathResult } = renderHook(() => useNodePath(tree, childId));
    
    // Path should be empty for deleted node
    expect(pathResult.current).toEqual([]);
  });
});

// ============================================================================
// Store + useTreeLayout Integration
// ============================================================================

describe('Store + useTreeLayout Integration', () => {
  it('useTreeLayout computes layout for store tree', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    let rootId: string = '';
    
    act(() => {
      rootId = actionsResult.current.addNode('test-panel', createNodeData());
      actionsResult.current.addNode('test-panel', createNodeData(rootId));
      actionsResult.current.addNode('test-panel', createNodeData(rootId));
    });
    
    const tree = actionsResult.current.getTree('test-panel');
    const { result: layoutResult } = renderHook(() => useTreeLayout(tree));
    
    expect(layoutResult.current.nodes.length).toBe(3);
    expect(layoutResult.current.links.length).toBe(2);
  });

  it('useTreeLayout respects custom layout options', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    let rootId: string = '';
    
    act(() => {
      rootId = actionsResult.current.addNode('test-panel', createNodeData());
      actionsResult.current.addNode('test-panel', createNodeData(rootId));
    });
    
    const tree = actionsResult.current.getTree('test-panel');
    const customOptions = { ...DEFAULT_LAYOUT_OPTIONS, nodeSpacingY: 300 };
    
    const { result: layoutResult } = renderHook(() => 
      useTreeLayout(tree, customOptions)
    );
    
    expect(layoutResult.current.nodes.length).toBe(2);
    // Nodes should be laid out with custom spacing
  });
});

// ============================================================================
// Full Workflow Integration
// ============================================================================

describe('Full Workflow Integration', () => {
  it('complete generation workflow: create -> select -> rate -> feedback', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    // Initialize
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    // Generate some images (simulated)
    let nodeIds: string[] = [];
    act(() => {
      const root = actionsResult.current.addNode('test-panel', {
        ...createNodeData(),
        status: 'complete',
      });
      nodeIds.push(root);
      
      // Generate variations
      for (let i = 0; i < 3; i++) {
        const id = actionsResult.current.addNode('test-panel', {
          ...createNodeData(root),
          type: 'variation',
          status: 'complete',
        });
        nodeIds.push(id);
      }
    });
    
    // Verify tree structure
    const tree = actionsResult.current.getTree('test-panel');
    expect(tree?.nodes.size).toBe(4);
    expect(tree?.stats.totalNodes).toBe(4);
    
    // Select a winner
    act(() => {
      actionsResult.current.selectNode('test-panel', nodeIds[2]);
    });
    
    expect(actionsResult.current.getTree('test-panel')?.selectedId).toBe(nodeIds[2]);
    expect(actionsResult.current.getNode('test-panel', nodeIds[2])?.status).toBe('selected');
    
    // Reject others
    act(() => {
      actionsResult.current.rejectNode('test-panel', nodeIds[1]);
      actionsResult.current.rejectNode('test-panel', nodeIds[3]);
    });
    
    expect(actionsResult.current.getNode('test-panel', nodeIds[1])?.status).toBe('rejected');
    expect(actionsResult.current.getNode('test-panel', nodeIds[3])?.status).toBe('rejected');
    
    // Rate the selected
    act(() => {
      actionsResult.current.dispatchNodeAction('test-panel', {
        type: 'rate',
        nodeId: nodeIds[2],
        rating: 5,
      });
    });
    
    expect(actionsResult.current.getNode('test-panel', nodeIds[2])?.rating).toBe(5);
    
    // Add feedback
    act(() => {
      actionsResult.current.dispatchNodeAction('test-panel', {
        type: 'feedback',
        nodeId: nodeIds[2],
        feedback: 'Perfect composition!',
      });
    });
    
    expect(actionsResult.current.getNode('test-panel', nodeIds[2])?.feedback).toBe('Perfect composition!');
    
    // Verify final stats
    const finalTree = actionsResult.current.getTree('test-panel');
    expect(finalTree?.stats.selectedNodes).toBe(1);
    expect(finalTree?.stats.rejectedNodes).toBe(2);
  });

  it('comparison workflow: select multiple -> clear -> new selection', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    const { result: compResult } = renderHook(() => useComparisonNodes());
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    // Create nodes
    let nodeIds: string[] = [];
    act(() => {
      for (let i = 0; i < 5; i++) {
        const id = actionsResult.current.addNode('test-panel', createNodeData());
        nodeIds.push(id);
      }
    });
    
    // Add to comparison
    act(() => {
      actionsResult.current.addToComparison(nodeIds[0]);
      actionsResult.current.addToComparison(nodeIds[2]);
      actionsResult.current.addToComparison(nodeIds[4]);
    });
    
    expect(compResult.current.length).toBe(3);
    
    // Switch to comparison mode
    act(() => {
      actionsResult.current.setViewMode('comparison');
    });
    
    expect(useGenerationTreeStore.getState().viewMode).toBe('comparison');
    
    // Clear and start over
    act(() => {
      actionsResult.current.clearComparison();
    });
    
    expect(compResult.current.length).toBe(0);
    
    // New selection
    act(() => {
      actionsResult.current.addToComparison(nodeIds[1]);
      actionsResult.current.addToComparison(nodeIds[3]);
    });
    
    expect(compResult.current).toEqual([nodeIds[1], nodeIds[3]]);
  });

  it('branching workflow: iterate on specific node', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    // Create initial
    let rootId: string = '';
    let branchPoint: string = '';
    
    act(() => {
      rootId = actionsResult.current.addNode('test-panel', {
        ...createNodeData(),
        type: 'initial',
      });
      
      // First iteration
      branchPoint = actionsResult.current.addNode('test-panel', {
        ...createNodeData(rootId),
        type: 'variation',
      });
      
      // Continue one path
      let lastId = branchPoint;
      for (let i = 0; i < 3; i++) {
        lastId = actionsResult.current.addNode('test-panel', {
          ...createNodeData(lastId),
          type: 'variation',
        });
      }
    });
    
    // Now branch from the branch point
    act(() => {
      for (let i = 0; i < 2; i++) {
        actionsResult.current.addNode('test-panel', {
          ...createNodeData(branchPoint),
          type: 'regenerate',
        });
      }
    });
    
    // Verify structure
    const tree = actionsResult.current.getTree('test-panel');
    const branchNode = tree?.nodes.get(branchPoint);
    
    // Branch point should have multiple children
    expect(branchNode?.childIds.length).toBe(3); // 1 variation chain + 2 regenerates
    
    // Total nodes: root + branchPoint + 3 in chain + 2 regenerates = 7
    expect(tree?.nodes.size).toBe(7);
    
    // Max depth should be 4 (root -> branchPoint -> 3 variations)
    expect(tree?.stats.maxDepth).toBe(4);
  });

  it('loading state workflow: mark loading -> complete -> update', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    act(() => {
      actionsResult.current.initTree('test-panel');
    });
    
    // Add node in generating state
    let nodeId: string = '';
    act(() => {
      nodeId = actionsResult.current.addNode('test-panel', {
        ...createNodeData(),
        status: 'generating',
      });
      actionsResult.current.setNodeLoading(nodeId, true);
    });
    
    // Verify loading state
    const { result: loadingResult } = renderHook(() => useIsNodeLoading(nodeId));
    expect(loadingResult.current).toBe(true);
    expect(actionsResult.current.getNode('test-panel', nodeId)?.status).toBe('generating');
    
    // Complete generation
    act(() => {
      actionsResult.current.updateNode('test-panel', nodeId, {
        status: 'complete',
        imagePath: '/path/to/image.png',
        thumbnailPath: '/path/to/thumb.png',
        completedAt: new Date(),
      });
      actionsResult.current.setNodeLoading(nodeId, false);
    });
    
    // Verify completed state
    expect(loadingResult.current).toBe(false);
    const node = actionsResult.current.getNode('test-panel', nodeId);
    expect(node?.status).toBe('complete');
    expect(node?.imagePath).toBe('/path/to/image.png');
  });
});

// ============================================================================
// Multi-Panel Integration
// ============================================================================

describe('Multi-Panel Integration', () => {
  it('should manage multiple panels independently', () => {
    const { result: actionsResult } = renderHook(() => useTreeActions());
    
    // Initialize multiple panels
    act(() => {
      actionsResult.current.initTree('panel-1');
      actionsResult.current.initTree('panel-2');
      actionsResult.current.initTree('panel-3');
    });
    
    // Add different node counts to each
    act(() => {
      // Panel 1: 2 nodes
      const p1Root = actionsResult.current.addNode('panel-1', createNodeData());
      actionsResult.current.addNode('panel-1', createNodeData(p1Root));
      
      // Panel 2: 5 nodes
      const p2Root = actionsResult.current.addNode('panel-2', createNodeData());
      for (let i = 0; i < 4; i++) {
        actionsResult.current.addNode('panel-2', createNodeData(p2Root));
      }
      
      // Panel 3: 1 node
      actionsResult.current.addNode('panel-3', createNodeData());
    });
    
    // Verify independence
    expect(actionsResult.current.getTree('panel-1')?.nodes.size).toBe(2);
    expect(actionsResult.current.getTree('panel-2')?.nodes.size).toBe(5);
    expect(actionsResult.current.getTree('panel-3')?.nodes.size).toBe(1);
    
    // Select in each
    act(() => {
      const p1Nodes = Array.from(actionsResult.current.getTree('panel-1')?.nodes.keys() ?? []);
      const p2Nodes = Array.from(actionsResult.current.getTree('panel-2')?.nodes.keys() ?? []);
      
      actionsResult.current.selectNode('panel-1', p1Nodes[0]);
      actionsResult.current.selectNode('panel-2', p2Nodes[2]);
    });
    
    // Verify independent selections
    expect(actionsResult.current.getTree('panel-1')?.selectedId).toBeDefined();
    expect(actionsResult.current.getTree('panel-2')?.selectedId).toBeDefined();
    expect(actionsResult.current.getTree('panel-1')?.selectedId)
      .not.toBe(actionsResult.current.getTree('panel-2')?.selectedId);
    
    // Delete one panel
    act(() => {
      actionsResult.current.clearTree('panel-2');
    });
    
    // Others should be unaffected
    expect(actionsResult.current.getTree('panel-1')?.nodes.size).toBe(2);
    expect(actionsResult.current.getTree('panel-2')).toBeUndefined();
    expect(actionsResult.current.getTree('panel-3')?.nodes.size).toBe(1);
  });
});
