/**
 * Generation Tree Demo
 * 
 * Interactive demo for testing the generation tree visualization.
 * Includes mock data generation and action simulation.
 */

import React, { useEffect, useState } from 'react';
import { GenerationTreeVisualization } from './GenerationTreeVisualization';
import { useTreeActions, useGenerationTree } from './store';
import type { GenerationNode, GenerationType, GenerationStatus, GenerationSettings } from './types';

// ============================================================================
// Mock Data Generation
// ============================================================================

const MOCK_SETTINGS: GenerationSettings = {
  model: 'novaFurryXL_ilV130.safetensors',
  width: 768,
  height: 1024,
  steps: 28,
  cfgScale: 7,
  sampler: 'euler_ancestral',
};

const MOCK_PROMPTS = [
  'marina, female otter, anthro, yacht deck, sunset, romantic',
  'marina, female otter, anthro, close-up, soft smile, golden hour',
  'marina, female otter, anthro, laying on deck chair, relaxed pose',
  'marina, female otter, anthro, wine glass, tipsy expression',
  'marina, female otter, anthro, cabin interior, intimate mood',
];

function randomSeed(): number {
  return Math.floor(Math.random() * 999999999);
}

function randomStatus(): GenerationStatus {
  const statuses: GenerationStatus[] = ['complete', 'complete', 'complete', 'selected', 'rejected'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function randomType(isRoot: boolean): GenerationType {
  if (isRoot) return 'initial';
  const types: GenerationType[] = ['variation', 'variation', 'regenerate', 'edited'];
  return types[Math.floor(Math.random() * types.length)];
}

// ============================================================================
// Demo Component
// ============================================================================

interface GenerationTreeDemoProps {
  panelId?: string;
}

export const GenerationTreeDemo: React.FC<GenerationTreeDemoProps> = ({
  panelId = 'demo-panel',
}) => {
  const actions = useTreeActions();
  const tree = useGenerationTree(panelId);
  const [nodeCount, setNodeCount] = useState(15);
  
  // Initialize demo tree
  useEffect(() => {
    actions.initTree(panelId);
    generateDemoTree();
  }, []);
  
  const generateDemoTree = () => {
    // Clear existing
    actions.clearTree(panelId);
    actions.initTree(panelId);
    
    // Generate root
    const rootId = actions.addNode(panelId, {
      parentId: null,
      panelId,
      status: 'complete',
      type: 'initial',
      prompt: MOCK_PROMPTS[0],
      seed: randomSeed(),
      settings: MOCK_SETTINGS,
      createdAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3590000),
      thumbnailPath: 'https://placehold.co/80x80/8b5cf6/white?text=1',
    });
    
    // Generate children recursively
    const generateChildren = (parentId: string, depth: number, maxDepth: number) => {
      if (depth >= maxDepth) return;
      
      const numChildren = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numChildren; i++) {
        const status = randomStatus();
        const childId = actions.addNode(panelId, {
          parentId,
          panelId,
          status,
          type: randomType(false),
          prompt: MOCK_PROMPTS[Math.floor(Math.random() * MOCK_PROMPTS.length)],
          seed: randomSeed(),
          settings: MOCK_SETTINGS,
          rating: status === 'selected' ? 5 : Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 3 : undefined,
          createdAt: new Date(Date.now() - (3600000 - depth * 600000)),
          completedAt: new Date(Date.now() - (3590000 - depth * 600000)),
          thumbnailPath: `https://placehold.co/80x80/${status === 'selected' ? '8b5cf6' : status === 'rejected' ? '6b7280' : '10b981'}/white?text=${depth + 1}.${i + 1}`,
        });
        
        // Recursively add more children (with decreasing probability)
        if (Math.random() > 0.4) {
          generateChildren(childId, depth + 1, maxDepth);
        }
      }
    };
    
    generateChildren(rootId, 1, 4);
  };
  
  const addVariation = () => {
    if (!tree?.focusedId) {
      alert('Focus a node first by clicking on it!');
      return;
    }
    
    actions.addNode(panelId, {
      parentId: tree.focusedId,
      panelId,
      status: 'generating',
      type: 'variation',
      prompt: MOCK_PROMPTS[Math.floor(Math.random() * MOCK_PROMPTS.length)],
      seed: randomSeed(),
      settings: MOCK_SETTINGS,
      createdAt: new Date(),
    });
    
    // Simulate completion after 2 seconds
    setTimeout(() => {
      const nodes = Array.from(tree?.nodes.values() || []);
      const generatingNode = nodes.find(n => n.status === 'generating');
      if (generatingNode) {
        actions.updateNode(panelId, generatingNode.id, {
          status: 'complete',
          completedAt: new Date(),
          thumbnailPath: `https://placehold.co/80x80/10b981/white?text=NEW`,
        });
      }
    }, 2000);
  };
  
  const selectFocused = () => {
    if (!tree?.focusedId) {
      alert('Focus a node first!');
      return;
    }
    actions.selectNode(panelId, tree.focusedId);
  };
  
  const rejectFocused = () => {
    if (!tree?.focusedId) {
      alert('Focus a node first!');
      return;
    }
    actions.rejectNode(panelId, tree.focusedId);
  };
  
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif',
      background: '#0f172a',
      minHeight: '100vh',
      padding: 20,
      color: '#e2e8f0',
    }}>
      <h1 style={{ marginBottom: 10 }}>🌳 Generation Tree Demo</h1>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        "Git for images" - Navigate, branch, compare your generation history.
      </p>
      
      {/* Controls */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={generateDemoTree}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          🔄 Regenerate Tree
        </button>
        
        <button
          onClick={addVariation}
          style={{
            padding: '8px 16px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ➕ Add Variation (from focused)
        </button>
        
        <button
          onClick={selectFocused}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ✓ Select Focused
        </button>
        
        <button
          onClick={rejectFocused}
          style={{
            padding: '8px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ✗ Reject Focused
        </button>
      </div>
      
      {/* Tree Info */}
      {tree && (
        <div style={{ 
          marginBottom: 20, 
          padding: 15, 
          background: '#1e293b', 
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 14,
        }}>
          <strong>Tree Stats:</strong>
          <span style={{ marginLeft: 20 }}>Nodes: {tree.stats.totalNodes}</span>
          <span style={{ marginLeft: 20 }}>Depth: {tree.stats.maxDepth}</span>
          <span style={{ marginLeft: 20, color: '#10b981' }}>Selected: {tree.stats.selectedNodes}</span>
          <span style={{ marginLeft: 20, color: '#6b7280' }}>Rejected: {tree.stats.rejectedNodes}</span>
          {tree.focusedId && (
            <span style={{ marginLeft: 20, color: '#fbbf24' }}>Focused: {tree.focusedId.slice(-8)}</span>
          )}
        </div>
      )}
      
      {/* Visualization */}
      <GenerationTreeVisualization
        panelId={panelId}
        width={1200}
        height={700}
        onNodeClick={(node) => {
          console.log('Clicked node:', node);
        }}
      />
      
      {/* Instructions */}
      <div style={{ 
        marginTop: 20, 
        padding: 15, 
        background: '#1e293b', 
        borderRadius: 8,
        fontSize: 14,
      }}>
        <strong>Controls:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: 20 }}>
          <li><strong>Click</strong> a node to focus it</li>
          <li><strong>Scroll</strong> to zoom in/out</li>
          <li><strong>Drag</strong> to pan around</li>
          <li><strong>Hover</strong> over a node to see details</li>
          <li>Use buttons above to add variations, select, or reject</li>
        </ul>
        <p style={{ color: '#94a3b8', marginTop: 10 }}>
          The purple glow shows the selected "winner" path. Gray nodes are rejected.
          Pulsing amber indicates generation in progress.
        </p>
      </div>
    </div>
  );
};

export default GenerationTreeDemo;
