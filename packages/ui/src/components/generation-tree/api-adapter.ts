/**
 * API Adapter for Generation Tree
 * 
 * Converts API generation data into GenerationNode format for the tree.
 */

import type { GenerationNode, GenerationStatus, GenerationType, GenerationSettings } from "./types";

// API Generation type (from backend)
interface ApiGeneration {
  id: string;
  panelId: string;
  seed: number;
  prompt: string;
  negativePrompt?: string;
  model: string;
  loras?: Array<{ name: string; strength: number }>;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler?: string;
  width: number;
  height: number;
  localPath: string;
  cloudUrl?: string;
  thumbnailPath?: string;
  variantStrategy?: string;
  variantIndex?: number;
  parentId?: string;
  selected?: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert API generation to GenerationNode
 */
export function apiGenerationToNode(gen: ApiGeneration): GenerationNode {
  // Determine status
  let status: GenerationStatus = "pending";
  if (gen.localPath) {
    status = gen.selected ? "selected" : "complete";
  }

  // Determine type
  let type: GenerationType = "initial";
  if (gen.variantStrategy) {
    type = gen.variantStrategy as GenerationType;
  } else if (gen.parentId) {
    type = "variation";
  }

  // Build settings object
  const settings: GenerationSettings = {
    model: gen.model,
    width: gen.width,
    height: gen.height,
    steps: gen.steps,
    cfgScale: gen.cfg,
    sampler: gen.sampler,
    scheduler: gen.scheduler,
    loras: gen.loras?.map(l => ({ name: l.name, strength: l.strength })) || [],
  };

  return {
    id: gen.id,
    panelId: gen.panelId,
    parentId: gen.parentId || null,
    childIds: [], // Will be populated when building tree
    depth: 0, // Will be calculated
    branchIndex: 0, // Will be calculated
    
    // Generation data
    status,
    type,
    prompt: gen.prompt,
    negativePrompt: gen.negativePrompt,
    seed: gen.seed,
    settings,
    
    // Media
    imagePath: gen.cloudUrl || gen.localPath,
    thumbnailPath: gen.thumbnailPath,
    
    // Metadata
    rating: gen.rating,
    createdAt: new Date(gen.createdAt),
    completedAt: gen.localPath ? new Date(gen.updatedAt) : undefined,
  };
}

/**
 * Build tree structure from flat list of generations
 */
export function buildGenerationTree(generations: ApiGeneration[]): GenerationNode[] {
  // Convert to nodes
  const nodes = generations.map(apiGenerationToNode);
  
  // Build parent-child relationships
  const nodeMap = new Map<string, GenerationNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));
  
  // Link children
  nodes.forEach(node => {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.childIds.push(node.id);
      }
    }
  });
  
  // Calculate depth and branch indices
  const rootNodes = nodes.filter(n => !n.parentId);
  
  function calculateDepth(node: GenerationNode, depth = 0, branchIndex = 0): void {
    node.depth = depth;
    node.branchIndex = branchIndex;
    
    node.childIds.forEach((childId, index) => {
      const child = nodeMap.get(childId);
      if (child) {
        calculateDepth(child, depth + 1, index);
      }
    });
  }
  
  rootNodes.forEach((root, index) => {
    calculateDepth(root, 0, index);
  });
  
  return nodes;
}
