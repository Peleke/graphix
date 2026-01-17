/**
 * Generation Tree Hooks
 * 
 * Custom React hooks for D3.js integration and tree manipulation.
 * Follows React best practices for external library integration.
 */

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type {
  GenerationTree,
  GenerationNode,
  D3GenerationNode,
  TreeLayoutOptions,
  TreeViewMode,
} from './types';
import { DEFAULT_LAYOUT_OPTIONS } from './types';

// ============================================================================
// D3 Zoom Hook
// ============================================================================

interface UseD3ZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  initialX?: number;
  initialY?: number;
}

interface UseD3ZoomReturn {
  transform: d3.ZoomTransform;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToContent: () => void;
}

export function useD3Zoom(
  svgRef: React.RefObject<SVGSVGElement>,
  containerRef: React.RefObject<SVGGElement>,
  options: UseD3ZoomOptions = {}
): UseD3ZoomReturn {
  const {
    minScale = 0.1,
    maxScale = 3,
    initialScale = 0.8,
    initialX = 0,
    initialY = 50,
  } = options;
  
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
  
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const container = d3.select(containerRef.current);
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([minScale, maxScale])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
        transformRef.current = event.transform;
      });
    
    zoomRef.current = zoom;
    svg.call(zoom);
    
    // Set initial transform
    const width = svgRef.current.clientWidth || 800;
    const initialTransform = d3.zoomIdentity
      .translate(width / 2 + initialX, initialY)
      .scale(initialScale);
    
    svg.call(zoom.transform, initialTransform);
    
    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef, containerRef, minScale, maxScale, initialScale, initialX, initialY]);
  
  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, 1.3);
  }, [svgRef]);
  
  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, 0.7);
  }, [svgRef]);
  
  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const width = svgRef.current.clientWidth || 800;
    const initialTransform = d3.zoomIdentity
      .translate(width / 2 + initialX, initialY)
      .scale(initialScale);
    
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomRef.current.transform, initialTransform);
  }, [svgRef, initialX, initialY, initialScale]);
  
  const fitToContent = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !zoomRef.current) return;
    
    const svg = svgRef.current;
    const container = containerRef.current;
    const bbox = container.getBBox();
    
    const svgWidth = svg.clientWidth || 800;
    const svgHeight = svg.clientHeight || 600;
    
    const scale = Math.min(
      svgWidth / (bbox.width + 100),
      svgHeight / (bbox.height + 100),
      1.5
    );
    
    const x = (svgWidth - bbox.width * scale) / 2 - bbox.x * scale;
    const y = (svgHeight - bbox.height * scale) / 2 - bbox.y * scale;
    
    const transform = d3.zoomIdentity.translate(x, y).scale(scale);
    
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomRef.current.transform, transform);
  }, [svgRef, containerRef]);
  
  return {
    transform: transformRef.current,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToContent,
  };
}

// ============================================================================
// Tree Layout Hook
// ============================================================================

interface TreeLayoutResult {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    data: GenerationNode;
  }>;
  links: Array<{
    sourceId: string;
    targetId: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
  }>;
}

export function useTreeLayout(
  tree: GenerationTree | undefined,
  layoutOptions: TreeLayoutOptions = DEFAULT_LAYOUT_OPTIONS
): TreeLayoutResult {
  return useMemo(() => {
    if (!tree || !tree.rootId) {
      return { nodes: [], links: [] };
    }
    
    // Build D3 hierarchy
    const buildHierarchy = (nodeId: string): D3GenerationNode | null => {
      const node = tree.nodes.get(nodeId);
      if (!node) return null;
      
      const children = node.childIds
        .map(buildHierarchy)
        .filter((n): n is D3GenerationNode => n !== null);
      
      return {
        id: node.id,
        data: node,
        children: children.length > 0 ? children : undefined,
      };
    };
    
    const hierarchyData = buildHierarchy(tree.rootId);
    if (!hierarchyData) return { nodes: [], links: [] };
    
    // Apply D3 tree layout
    const treeLayout = d3.tree<D3GenerationNode>()
      .nodeSize([layoutOptions.nodeSpacingX, layoutOptions.nodeSpacingY])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.2);
    
    const root = d3.hierarchy(hierarchyData);
    const treeData = treeLayout(root as any);
    
    // Extract nodes
    const nodes = treeData.descendants().map(d => ({
      id: d.data.id,
      x: d.x ?? 0,
      y: d.y ?? 0,
      data: d.data.data,
    }));
    
    // Extract links
    const links = treeData.links().map(l => ({
      sourceId: l.source.data.id,
      targetId: l.target.data.id,
      sourceX: l.source.x ?? 0,
      sourceY: l.source.y ?? 0,
      targetX: l.target.x ?? 0,
      targetY: l.target.y ?? 0,
    }));
    
    return { nodes, links };
  }, [tree, layoutOptions.nodeSpacingX, layoutOptions.nodeSpacingY]);
}

// ============================================================================
// Node Path Hook
// ============================================================================

export function useNodePath(
  tree: GenerationTree | undefined,
  nodeId: string | null
): GenerationNode[] {
  return useMemo(() => {
    if (!tree || !nodeId) return [];
    
    const path: GenerationNode[] = [];
    let current = tree.nodes.get(nodeId);
    
    while (current) {
      path.unshift(current);
      current = current.parentId ? tree.nodes.get(current.parentId) : undefined;
    }
    
    return path;
  }, [tree, nodeId]);
}

// ============================================================================
// Animation Helpers
// ============================================================================

export function useNodeTransition(
  nodeId: string,
  x: number,
  y: number
): { x: number; y: number } {
  const prevRef = useRef({ x, y });
  
  useEffect(() => {
    prevRef.current = { x, y };
  }, [x, y]);
  
  return { x, y };
}

// ============================================================================
// Drag Hook (for node reordering - future feature)
// ============================================================================

interface UseDragOptions {
  onDragStart?: (nodeId: string) => void;
  onDrag?: (nodeId: string, x: number, y: number) => void;
  onDragEnd?: (nodeId: string, x: number, y: number) => void;
}

export function useNodeDrag(
  nodeRef: React.RefObject<SVGGElement>,
  nodeId: string,
  options: UseDragOptions = {}
) {
  useEffect(() => {
    if (!nodeRef.current) return;
    
    const node = d3.select(nodeRef.current);
    
    const drag = d3.drag<SVGGElement, unknown>()
      .on('start', () => {
        options.onDragStart?.(nodeId);
      })
      .on('drag', (event) => {
        options.onDrag?.(nodeId, event.x, event.y);
      })
      .on('end', (event) => {
        options.onDragEnd?.(nodeId, event.x, event.y);
      });
    
    node.call(drag as any);
    
    return () => {
      node.on('.drag', null);
    };
  }, [nodeRef, nodeId, options]);
}

// ============================================================================
// Keyboard Navigation Hook
// ============================================================================

interface UseKeyboardNavigationOptions {
  onSelectNext?: () => void;
  onSelectPrevious?: () => void;
  onSelectParent?: () => void;
  onSelectChild?: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
}

export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'l':
          event.preventDefault();
          options.onSelectNext?.();
          break;
        case 'ArrowLeft':
        case 'h':
          event.preventDefault();
          options.onSelectPrevious?.();
          break;
        case 'ArrowUp':
        case 'k':
          event.preventDefault();
          options.onSelectParent?.();
          break;
        case 'ArrowDown':
        case 'j':
          event.preventDefault();
          options.onSelectChild?.();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          options.onConfirm?.();
          break;
        case 'x':
        case 'Delete':
          event.preventDefault();
          options.onReject?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}

// ============================================================================
// Comparison Mode Hook
// ============================================================================

export function useComparisonMode(
  maxNodes: number = 4
): {
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  canAdd: boolean;
} {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);
  
  const toggle = useCallback((id: string) => {
    setSelectedIds(current => {
      if (current.includes(id)) {
        return current.filter(i => i !== id);
      } else if (current.length < maxNodes) {
        return [...current, id];
      }
      return current;
    });
  }, [maxNodes]);
  
  const clear = useCallback(() => {
    setSelectedIds([]);
  }, []);
  
  return {
    selectedIds,
    isSelected,
    toggle,
    clear,
    canAdd: selectedIds.length < maxNodes,
  };
}
