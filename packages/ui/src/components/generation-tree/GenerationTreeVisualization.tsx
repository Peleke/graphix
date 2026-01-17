/**
 * Generation Tree Visualization
 * 
 * A gorgeous D3.js visualization of the generation branching tree.
 * "Git for images" - navigate, fork, compare generation history.
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  GenerationTree,
  GenerationNode,
  D3GenerationNode,
  TreeLayoutOptions,
  TreeViewMode,
  NodeAction,
  GenerationStatus,
} from './types';
import { DEFAULT_LAYOUT_OPTIONS } from './types';
import {
  useGenerationTree,
  useTreeActions,
  useTreeViewMode,
  useTreeLayoutOptions,
  useHoveredNode,
} from './store';

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<GenerationStatus, string> = {
  pending: '#6b7280',      // gray
  generating: '#f59e0b',   // amber (pulsing)
  complete: '#10b981',     // emerald
  failed: '#ef4444',       // red
  selected: '#8b5cf6',     // violet
  rejected: '#6b7280',     // gray (dimmed)
  archived: '#374151',     // dark gray
};

const STATUS_GLOW: Record<GenerationStatus, string> = {
  pending: 'none',
  generating: '0 0 20px #f59e0b',
  complete: 'none',
  failed: '0 0 10px #ef4444',
  selected: '0 0 25px #8b5cf6',
  rejected: 'none',
  archived: 'none',
};

// ============================================================================
// Tree to D3 Hierarchy Conversion
// ============================================================================

function treeToD3Hierarchy(tree: GenerationTree): D3GenerationNode | null {
  if (!tree.rootId) return null;
  
  const buildNode = (nodeId: string): D3GenerationNode | null => {
    const node = tree.nodes.get(nodeId);
    if (!node) return null;
    
    const children = node.childIds
      .map(buildNode)
      .filter((n): n is D3GenerationNode => n !== null);
    
    return {
      id: node.id,
      data: node,
      children: children.length > 0 ? children : undefined,
    };
  };
  
  return buildNode(tree.rootId);
}

// ============================================================================
// Node Component
// ============================================================================

interface TreeNodeProps {
  node: D3GenerationNode;
  x: number;
  y: number;
  size: number;
  isHovered: boolean;
  isSelected: boolean;
  isFocused: boolean;
  onHover: (nodeId: string | null) => void;
  onClick: (node: GenerationNode) => void;
  onContextMenu: (node: GenerationNode, event: React.MouseEvent) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  x,
  y,
  size,
  isHovered,
  isSelected,
  isFocused,
  onHover,
  onClick,
  onContextMenu,
}) => {
  const { data } = node;
  const status = data.status;
  const color = STATUS_COLORS[status];
  const glow = STATUS_GLOW[status];
  
  const isGenerating = status === 'generating';
  const isRejected = status === 'rejected' || status === 'archived';
  
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: isRejected ? 0.4 : 1, 
        scale: 1,
        x,
        y,
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => onHover(data.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(data)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(data, e);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect for selected/generating */}
      {(isSelected || isGenerating) && (
        <motion.circle
          r={size / 2 + 8}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.5}
          animate={isGenerating ? {
            r: [size / 2 + 8, size / 2 + 15, size / 2 + 8],
            opacity: [0.5, 0.2, 0.5],
          } : {}}
          transition={isGenerating ? {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          } : {}}
        />
      )}
      
      {/* Main node circle */}
      <motion.circle
        r={size / 2}
        fill={`url(#nodeGradient-${status})`}
        stroke={isHovered || isFocused ? '#fff' : color}
        strokeWidth={isHovered || isFocused ? 3 : 2}
        style={{ filter: glow !== 'none' ? `drop-shadow(${glow})` : undefined }}
        animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
      />
      
      {/* Thumbnail image (clipped to circle) */}
      {data.thumbnailPath && (
        <clipPath id={`clip-${data.id}`}>
          <circle r={size / 2 - 4} />
        </clipPath>
      )}
      {data.thumbnailPath && (
        <image
          href={data.thumbnailPath}
          x={-(size / 2 - 4)}
          y={-(size / 2 - 4)}
          width={size - 8}
          height={size - 8}
          clipPath={`url(#clip-${data.id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      
      {/* Status indicator badge */}
      <circle
        cx={size / 2 - 5}
        cy={-(size / 2 - 5)}
        r={8}
        fill={color}
        stroke="#1f2937"
        strokeWidth={2}
      />
      
      {/* Generation type indicator */}
      {data.type !== 'initial' && (
        <text
          y={size / 2 + 20}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={10}
          fontFamily="monospace"
        >
          {data.type === 'variation' ? 'VAR' :
           data.type === 'regenerate' ? 'REGEN' :
           data.type === 'edited' ? 'EDIT' :
           data.type === 'inpaint' ? 'INPAINT' :
           data.type === 'upscale' ? 'UP' :
           data.type === 'controlnet' ? 'CTRL' : ''}
        </text>
      )}
      
      {/* Rating stars */}
      {data.rating && (
        <text
          y={-(size / 2 + 10)}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize={12}
        >
          {'★'.repeat(data.rating)}
        </text>
      )}
      
      {/* Seed number (on hover) */}
      {isHovered && (
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          y={size / 2 + 35}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={9}
          fontFamily="monospace"
        >
          seed: {data.seed}
        </motion.text>
      )}
    </motion.g>
  );
};

// ============================================================================
// Link Component
// ============================================================================

interface TreeLinkProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isHighlighted: boolean;
}

const TreeLink: React.FC<TreeLinkProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  isHighlighted,
}) => {
  // Create a curved path
  const path = d3.linkVertical()({
    source: [sourceX, sourceY],
    target: [targetX, targetY],
  });
  
  return (
    <motion.path
      d={path || ''}
      fill="none"
      stroke={isHighlighted ? '#8b5cf6' : '#374151'}
      strokeWidth={isHighlighted ? 3 : 2}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  );
};

// ============================================================================
// Main Visualization Component
// ============================================================================

interface GenerationTreeVisualizationProps {
  panelId: string;
  width?: number;
  height?: number;
  className?: string;
  onNodeClick?: (node: GenerationNode) => void;
  onNodeAction?: (action: NodeAction) => void;
}

export const GenerationTreeVisualization: React.FC<GenerationTreeVisualizationProps> = ({
  panelId,
  width = 800,
  height = 600,
  className,
  onNodeClick,
  onNodeAction,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tree = useGenerationTree(panelId);
  const actions = useTreeActions();
  const viewMode = useTreeViewMode();
  const layoutOptions = useTreeLayoutOptions();
  const hoveredNodeId = useHoveredNode();
  
  // Convert tree to D3 hierarchy
  const hierarchy = useMemo(() => {
    if (!tree) return null;
    return treeToD3Hierarchy(tree);
  }, [tree]);
  
  // Compute tree layout
  const { nodes, links } = useMemo(() => {
    if (!hierarchy) return { nodes: [], links: [] };
    
    const treeLayout = d3.tree<D3GenerationNode>()
      .nodeSize([layoutOptions.nodeSpacingX, layoutOptions.nodeSpacingY]);
    
    const root = d3.hierarchy(hierarchy);
    const treeData = treeLayout(root as any);
    
    const nodes = treeData.descendants().map(d => ({
      node: d.data,
      x: d.x ?? 0,
      y: d.y ?? 0,
    }));
    
    const links = treeData.links().map(l => ({
      sourceX: l.source.x ?? 0,
      sourceY: l.source.y ?? 0,
      targetX: l.target.x ?? 0,
      targetY: l.target.y ?? 0,
      sourceId: l.source.data.id,
      targetId: l.target.data.id,
    }));
    
    return { nodes, links };
  }, [hierarchy, layoutOptions]);
  
  // Pan and zoom
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('.tree-container');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });
    
    svg.call(zoom);
    
    // Initial center
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, 50)
      .scale(0.8);
    svg.call(zoom.transform, initialTransform);
    
    return () => {
      svg.on('.zoom', null);
    };
  }, [width, height]);
  
  // Handlers
  const handleHover = useCallback((nodeId: string | null) => {
    actions.setHoveredNode(nodeId);
  }, [actions]);
  
  const handleClick = useCallback((node: GenerationNode) => {
    actions.focusNode(panelId, node.id);
    onNodeClick?.(node);
  }, [actions, panelId, onNodeClick]);
  
  const handleContextMenu = useCallback((node: GenerationNode, event: React.MouseEvent) => {
    actions.setContextMenuNode(node.id);
    // Context menu would be rendered separately
  }, [actions]);
  
  // Check if a link is on the selected path
  const isLinkHighlighted = useCallback((sourceId: string, targetId: string) => {
    if (!tree?.selectedId) return false;
    const path = actions.getNodePath(panelId, tree.selectedId);
    const pathIds = path.map(n => n.id);
    return pathIds.includes(sourceId) && pathIds.includes(targetId);
  }, [tree, actions, panelId]);
  
  if (!tree || nodes.length === 0) {
    return (
      <div className={className} style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>No generations yet. Start creating!</p>
      </div>
    );
  }
  
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={className}
      style={{ background: '#0f172a', borderRadius: 8 }}
    >
      {/* Gradient definitions */}
      <defs>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <radialGradient key={status} id={`nodeGradient-${status}`}>
            <stop offset="0%" stopColor={color} stopOpacity={0.8} />
            <stop offset="100%" stopColor={color} stopOpacity={0.4} />
          </radialGradient>
        ))}
        
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Tree container (for pan/zoom) */}
      <g className="tree-container">
        {/* Links */}
        <g className="links">
          <AnimatePresence>
            {links.map((link, i) => (
              <TreeLink
                key={`${link.sourceId}-${link.targetId}`}
                sourceX={link.sourceX}
                sourceY={link.sourceY}
                targetX={link.targetX}
                targetY={link.targetY}
                isHighlighted={isLinkHighlighted(link.sourceId, link.targetId)}
              />
            ))}
          </AnimatePresence>
        </g>
        
        {/* Nodes */}
        <g className="nodes">
          <AnimatePresence>
            {nodes.map(({ node, x, y }) => (
              <TreeNode
                key={node.id}
                node={node}
                x={x}
                y={y}
                size={layoutOptions.nodeSize}
                isHovered={hoveredNodeId === node.id}
                isSelected={tree.selectedId === node.id}
                isFocused={tree.focusedId === node.id}
                onHover={handleHover}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
              />
            ))}
          </AnimatePresence>
        </g>
      </g>
      
      {/* Legend */}
      <g transform={`translate(20, ${height - 100})`}>
        <text fill="#9ca3af" fontSize={12} fontWeight="bold">Legend</text>
        {Object.entries(STATUS_COLORS).slice(0, 5).map(([status, color], i) => (
          <g key={status} transform={`translate(0, ${20 + i * 18})`}>
            <circle r={6} cx={6} cy={0} fill={color} />
            <text x={20} y={4} fill="#9ca3af" fontSize={10}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </text>
          </g>
        ))}
      </g>
      
      {/* Stats */}
      <g transform={`translate(${width - 120}, 20)`}>
        <text fill="#9ca3af" fontSize={10} fontFamily="monospace">
          Nodes: {tree.stats.totalNodes}
        </text>
        <text y={15} fill="#9ca3af" fontSize={10} fontFamily="monospace">
          Depth: {tree.stats.maxDepth}
        </text>
        <text y={30} fill="#10b981" fontSize={10} fontFamily="monospace">
          Selected: {tree.stats.selectedNodes}
        </text>
      </g>
    </svg>
  );
};

export default GenerationTreeVisualization;
