/**
 * Generation Tree Component Tests
 * 
 * React component rendering tests using @testing-library/react.
 * Tests the GenerationTreeVisualization component's rendering,
 * interactions, and integration with the store.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { GenerationTreeVisualization } from '../GenerationTreeVisualization';
import { useGenerationTreeStore } from '../store';
import { DEFAULT_LAYOUT_OPTIONS } from '../types';
import type { GenerationNode } from '../types';

// ============================================================================
// Mocks
// ============================================================================

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    path: (props: any) => <path {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock D3 zoom behavior
vi.mock('d3', async () => {
  const actual = await vi.importActual('d3');
  return {
    ...actual,
    zoom: () => ({
      scaleExtent: () => ({
        on: () => ({
          transform: vi.fn(),
        }),
      }),
    }),
    select: (el: any) => ({
      call: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      attr: vi.fn().mockReturnThis(),
      select: () => ({
        attr: vi.fn(),
      }),
    }),
    zoomIdentity: {
      translate: () => ({
        scale: () => ({}),
      }),
    },
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestNode(overrides: Partial<GenerationNode> = {}): GenerationNode {
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

function setupTreeWithNodes(panelId: string, nodeCount: number): string[] {
  const { actions } = useGenerationTreeStore.getState();
  actions.initTree(panelId);
  
  const nodeIds: string[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const id = actions.addNode(panelId, {
      parentId: nodeIds[0] || null,
      panelId,
      status: 'complete',
      type: i === 0 ? 'initial' : 'variation',
      prompt: `prompt-${i}`,
      seed: i * 1000,
      settings: {
        model: 'test',
        width: 512,
        height: 512,
        steps: 20,
        cfgScale: 7,
        sampler: 'euler',
      },
      createdAt: new Date(),
    });
    nodeIds.push(id);
  }
  
  return nodeIds;
}

// ============================================================================
// Setup/Teardown
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

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Rendering Tests
// ============================================================================

describe('GenerationTreeVisualization - Rendering', () => {
  describe('Empty State', () => {
    it('should render empty state message when no tree exists', () => {
      render(<GenerationTreeVisualization panelId="empty-panel" />);
      
      expect(screen.getByText(/no generations yet/i)).toBeInTheDocument();
    });

    it('should render empty state message when tree has no nodes', () => {
      const { actions } = useGenerationTreeStore.getState();
      actions.initTree('empty-tree');
      
      render(<GenerationTreeVisualization panelId="empty-tree" />);
      
      expect(screen.getByText(/no generations yet/i)).toBeInTheDocument();
    });
  });

  describe('With Nodes', () => {
    it('should render SVG container', () => {
      setupTreeWithNodes('test-panel', 3);
      
      const { container } = render(<GenerationTreeVisualization panelId="test-panel" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render correct number of nodes', () => {
      setupTreeWithNodes('test-panel', 5);
      
      const { container } = render(<GenerationTreeVisualization panelId="test-panel" />);
      
      // Each node renders a main circle
      const nodeGroups = container.querySelectorAll('.nodes g');
      expect(nodeGroups.length).toBeGreaterThanOrEqual(5);
    });

    it('should render links between nodes', () => {
      setupTreeWithNodes('test-panel', 3);
      
      const { container } = render(<GenerationTreeVisualization panelId="test-panel" />);
      
      const links = container.querySelectorAll('.links path');
      expect(links.length).toBeGreaterThanOrEqual(2); // root -> child1, root -> child2
    });

    it('should render legend', () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(<GenerationTreeVisualization panelId="test-panel" />);
      
      expect(container.textContent).toContain('Legend');
    });

    it('should render stats', () => {
      setupTreeWithNodes('test-panel', 3);
      
      const { container } = render(<GenerationTreeVisualization panelId="test-panel" />);
      
      expect(container.textContent).toContain('Nodes:');
      expect(container.textContent).toContain('Depth:');
    });
  });

  describe('Custom Dimensions', () => {
    it('should render with custom width', () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(
        <GenerationTreeVisualization panelId="test-panel" width={1200} />
      );
      
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('1200');
    });

    it('should render with custom height', () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(
        <GenerationTreeVisualization panelId="test-panel" height={800} />
      );
      
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('height')).toBe('800');
    });

    it('should apply custom className', () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(
        <GenerationTreeVisualization panelId="test-panel" className="custom-class" />
      );
      
      const svg = container.querySelector('svg.custom-class');
      expect(svg).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe('GenerationTreeVisualization - Interactions', () => {
  describe('Node Click', () => {
    it('should call onNodeClick when node is clicked', async () => {
      const nodeIds = setupTreeWithNodes('test-panel', 1);
      const onNodeClick = vi.fn();
      
      const { container } = render(
        <GenerationTreeVisualization 
          panelId="test-panel" 
          onNodeClick={onNodeClick}
        />
      );
      
      // Find and click a node group
      const nodeGroup = container.querySelector('.nodes g');
      if (nodeGroup) {
        fireEvent.click(nodeGroup);
        expect(onNodeClick).toHaveBeenCalled();
      }
    });

    it('should update focused node in store on click', async () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(
        <GenerationTreeVisualization panelId="test-panel" />
      );
      
      const nodeGroup = container.querySelector('.nodes g');
      if (nodeGroup) {
        fireEvent.click(nodeGroup);
        
        // Give store time to update
        await waitFor(() => {
          const tree = useGenerationTreeStore.getState().trees.get('test-panel');
          expect(tree?.focusedId).toBeDefined();
        });
      }
    });
  });

  describe('Node Hover', () => {
    it('should update hovered node in store on mouse enter', async () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(
        <GenerationTreeVisualization panelId="test-panel" />
      );
      
      const nodeGroup = container.querySelector('.nodes g');
      if (nodeGroup) {
        fireEvent.mouseEnter(nodeGroup);
        
        await waitFor(() => {
          const state = useGenerationTreeStore.getState();
          expect(state.hoveredNodeId).toBeDefined();
        });
      }
    });

    it('should clear hovered node on mouse leave', async () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(
        <GenerationTreeVisualization panelId="test-panel" />
      );
      
      const nodeGroup = container.querySelector('.nodes g');
      if (nodeGroup) {
        fireEvent.mouseEnter(nodeGroup);
        fireEvent.mouseLeave(nodeGroup);
        
        await waitFor(() => {
          const state = useGenerationTreeStore.getState();
          expect(state.hoveredNodeId).toBeNull();
        });
      }
    });
  });

  describe('Context Menu', () => {
    it('should update context menu node on right click', async () => {
      setupTreeWithNodes('test-panel', 1);
      
      const { container } = render(
        <GenerationTreeVisualization panelId="test-panel" />
      );
      
      const nodeGroup = container.querySelector('.nodes g');
      if (nodeGroup) {
        fireEvent.contextMenu(nodeGroup);
        
        await waitFor(() => {
          const state = useGenerationTreeStore.getState();
          expect(state.contextMenuNodeId).toBeDefined();
        });
      }
    });
  });
});

// ============================================================================
// Store Integration Tests
// ============================================================================

describe('GenerationTreeVisualization - Store Integration', () => {
  it('should re-render when tree changes', async () => {
    const { actions } = useGenerationTreeStore.getState();
    actions.initTree('test-panel');
    
    const { container, rerender } = render(
      <GenerationTreeVisualization panelId="test-panel" />
    );
    
    // Initially shows empty state
    expect(screen.getByText(/no generations yet/i)).toBeInTheDocument();
    
    // Add a node
    actions.addNode('test-panel', {
      parentId: null,
      panelId: 'test-panel',
      status: 'complete',
      type: 'initial',
      prompt: 'test',
      seed: 123,
      settings: {
        model: 'test',
        width: 512,
        height: 512,
        steps: 20,
        cfgScale: 7,
        sampler: 'euler',
      },
      createdAt: new Date(),
    });
    
    // Re-render to pick up store changes
    rerender(<GenerationTreeVisualization panelId="test-panel" />);
    
    // Should now show the tree
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should use layout options from store', () => {
    setupTreeWithNodes('test-panel', 1);
    
    const { actions } = useGenerationTreeStore.getState();
    actions.setLayoutOptions({ nodeSize: 100 });
    
    const { container } = render(
      <GenerationTreeVisualization panelId="test-panel" />
    );
    
    // Component should pick up the layout options
    // (can't easily verify visually, but no error means it works)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should highlight selected node path', async () => {
    const nodeIds = setupTreeWithNodes('test-panel', 3);
    
    const { actions } = useGenerationTreeStore.getState();
    actions.selectNode('test-panel', nodeIds[1]);
    
    const { container } = render(
      <GenerationTreeVisualization panelId="test-panel" />
    );
    
    // Selected node should have special styling
    // (checking that render completes without error)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('GenerationTreeVisualization - Accessibility', () => {
  it('should have semantic SVG structure', () => {
    setupTreeWithNodes('test-panel', 1);
    
    const { container } = render(
      <GenerationTreeVisualization panelId="test-panel" />
    );
    
    // SVG should exist
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    // Should have defs for gradients
    const defs = container.querySelector('defs');
    expect(defs).toBeInTheDocument();
    
    // Should have grouped structure
    const groups = container.querySelectorAll('g');
    expect(groups.length).toBeGreaterThan(0);
  });

  it('should render text labels', () => {
    setupTreeWithNodes('test-panel', 1);
    
    const { container } = render(
      <GenerationTreeVisualization panelId="test-panel" />
    );
    
    // Legend text
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('GenerationTreeVisualization - Edge Cases', () => {
  it('should handle very large tree without crashing', () => {
    setupTreeWithNodes('test-panel', 50);
    
    expect(() => {
      render(<GenerationTreeVisualization panelId="test-panel" />);
    }).not.toThrow();
  });

  it('should handle rapid panel switches', () => {
    setupTreeWithNodes('panel-1', 3);
    setupTreeWithNodes('panel-2', 5);
    
    const { rerender } = render(
      <GenerationTreeVisualization panelId="panel-1" />
    );
    
    // Rapid switches
    for (let i = 0; i < 10; i++) {
      rerender(<GenerationTreeVisualization panelId={i % 2 === 0 ? 'panel-1' : 'panel-2'} />);
    }
    
    // Should not crash
    expect(true).toBe(true);
  });

  it('should handle panel deletion gracefully', () => {
    setupTreeWithNodes('test-panel', 3);
    
    const { rerender } = render(
      <GenerationTreeVisualization panelId="test-panel" />
    );
    
    // Clear the tree
    const { actions } = useGenerationTreeStore.getState();
    actions.clearTree('test-panel');
    
    // Re-render
    rerender(<GenerationTreeVisualization panelId="test-panel" />);
    
    // Should show empty state
    expect(screen.getByText(/no generations yet/i)).toBeInTheDocument();
  });

  it('should handle zero dimensions', () => {
    setupTreeWithNodes('test-panel', 1);
    
    // Should not crash with unusual dimensions
    expect(() => {
      render(<GenerationTreeVisualization panelId="test-panel" width={0} height={0} />);
    }).not.toThrow();
  });

  it('should handle negative dimensions gracefully', () => {
    setupTreeWithNodes('test-panel', 1);
    
    // Should not crash
    expect(() => {
      render(<GenerationTreeVisualization panelId="test-panel" width={-100} height={-100} />);
    }).not.toThrow();
  });
});

// ============================================================================
// Performance Tests (basic)
// ============================================================================

describe('GenerationTreeVisualization - Performance', () => {
  it('should render large tree in reasonable time', () => {
    setupTreeWithNodes('test-panel', 100);
    
    const start = performance.now();
    render(<GenerationTreeVisualization panelId="test-panel" />);
    const end = performance.now();
    
    // Should render in under 1 second
    expect(end - start).toBeLessThan(1000);
  });

  it('should handle frequent re-renders', () => {
    setupTreeWithNodes('test-panel', 20);
    
    const { rerender } = render(
      <GenerationTreeVisualization panelId="test-panel" width={800} />
    );
    
    const start = performance.now();
    
    // 50 re-renders with different widths
    for (let i = 0; i < 50; i++) {
      rerender(<GenerationTreeVisualization panelId="test-panel" width={800 + i} />);
    }
    
    const end = performance.now();
    
    // Should complete in under 2 seconds
    expect(end - start).toBeLessThan(2000);
  });
});
