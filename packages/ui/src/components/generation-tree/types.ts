/**
 * Generation Tree Types
 * 
 * Data structures for the D3.js generation branching visualization.
 * This represents the "git for images" concept - every generation is a node,
 * variations branch off, and users can navigate/fork from any point.
 */

// ============================================================================
// Core Node Types
// ============================================================================

/**
 * Status of a generation node
 */
export type GenerationStatus = 
  | 'pending'      // Queued, not started
  | 'generating'   // Currently being generated
  | 'complete'     // Successfully generated
  | 'failed'       // Generation failed
  | 'selected'     // User selected as "winner"
  | 'rejected'     // User explicitly rejected
  | 'archived';    // Kept but hidden from main view

/**
 * Type of generation that created this node
 */
export type GenerationType =
  | 'initial'      // First generation from prompt
  | 'variation'    // Variation of parent (img2img-style)
  | 'regenerate'   // Same settings, new seed
  | 'edited'       // Prompt was edited before regenerating
  | 'inpaint'      // Inpainting operation
  | 'upscale'      // Upscaled version
  | 'controlnet';  // ControlNet-guided from reference

/**
 * A single node in the generation tree
 */
export interface GenerationNode {
  /** Unique identifier */
  id: string;
  
  /** Parent node ID (null for root) */
  parentId: string | null;
  
  /** Panel this generation belongs to */
  panelId: string;
  
  /** Generation status */
  status: GenerationStatus;
  
  /** How this generation was created */
  type: GenerationType;
  
  /** The prompt used (may differ from parent if edited) */
  prompt: string;
  
  /** Negative prompt */
  negativePrompt?: string;
  
  /** Seed used */
  seed: number;
  
  /** Generation settings snapshot */
  settings: GenerationSettings;
  
  /** Path to generated image (if complete) */
  imagePath?: string;
  
  /** Thumbnail for tree display */
  thumbnailPath?: string;
  
  /** User rating (1-5) */
  rating?: number;
  
  /** User feedback/notes */
  feedback?: string;
  
  /** Timestamps */
  createdAt: Date;
  completedAt?: Date;
  
  /** Child node IDs (for quick traversal) */
  childIds: string[];
  
  /** Depth in tree (0 = root) */
  depth: number;
  
  /** Branch index (for horizontal positioning) */
  branchIndex: number;
}

/**
 * Generation settings snapshot
 */
export interface GenerationSettings {
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  scheduler?: string;
  loras?: LoraConfig[];
  controlnets?: ControlNetConfig[];
}

export interface LoraConfig {
  name: string;
  strength: number;
}

export interface ControlNetConfig {
  type: string;
  strength: number;
  imagePath?: string;
}

// ============================================================================
// Tree Structure
// ============================================================================

/**
 * The full generation tree for a panel
 */
export interface GenerationTree {
  /** Panel ID this tree belongs to */
  panelId: string;
  
  /** Root node ID */
  rootId: string | null;
  
  /** All nodes indexed by ID */
  nodes: Map<string, GenerationNode>;
  
  /** Currently selected node ID (the "winner") */
  selectedId: string | null;
  
  /** Currently focused node (for navigation) */
  focusedId: string | null;
  
  /** Tree statistics */
  stats: TreeStats;
}

export interface TreeStats {
  totalNodes: number;
  completedNodes: number;
  selectedNodes: number;
  rejectedNodes: number;
  maxDepth: number;
  maxBranches: number;
}

// ============================================================================
// D3 Specific Types
// ============================================================================

/**
 * D3 hierarchy node (what D3 actually works with)
 */
export interface D3GenerationNode {
  id: string;
  data: GenerationNode;
  children?: D3GenerationNode[];
  
  // D3 adds these
  x?: number;
  y?: number;
  depth?: number;
}

/**
 * Link between nodes for D3
 */
export interface D3GenerationLink {
  source: D3GenerationNode;
  target: D3GenerationNode;
}

// ============================================================================
// Interaction Types
// ============================================================================

/**
 * Actions that can be performed on a node
 */
export type NodeAction =
  | { type: 'select'; nodeId: string }
  | { type: 'reject'; nodeId: string }
  | { type: 'focus'; nodeId: string }
  | { type: 'regenerate'; nodeId: string }
  | { type: 'vary'; nodeId: string }
  | { type: 'edit'; nodeId: string; newPrompt: string }
  | { type: 'rate'; nodeId: string; rating: number }
  | { type: 'feedback'; nodeId: string; feedback: string }
  | { type: 'archive'; nodeId: string }
  | { type: 'delete'; nodeId: string };

/**
 * Tree view modes
 */
export type TreeViewMode =
  | 'full'         // Show entire tree
  | 'branch'       // Show only current branch
  | 'selected'     // Show only selected path
  | 'comparison';  // Side-by-side comparison mode

/**
 * Tree layout options
 */
export interface TreeLayoutOptions {
  /** Horizontal spacing between nodes */
  nodeSpacingX: number;
  
  /** Vertical spacing between levels */
  nodeSpacingY: number;
  
  /** Node thumbnail size */
  nodeSize: number;
  
  /** Animation duration in ms */
  animationDuration: number;
  
  /** Whether to show rejected nodes */
  showRejected: boolean;
  
  /** Whether to show archived nodes */
  showArchived: boolean;
  
  /** Maximum depth to render (performance) */
  maxRenderDepth?: number;
}

// ============================================================================
// Component Props
// ============================================================================

export interface GenerationTreeProps {
  /** The tree data */
  tree: GenerationTree;
  
  /** Current view mode */
  viewMode: TreeViewMode;
  
  /** Layout options */
  layout?: Partial<TreeLayoutOptions>;
  
  /** Callback when node is clicked */
  onNodeClick?: (node: GenerationNode) => void;
  
  /** Callback when node action is triggered */
  onNodeAction?: (action: NodeAction) => void;
  
  /** Callback when tree changes (for external sync) */
  onTreeChange?: (tree: GenerationTree) => void;
  
  /** Whether tree is loading */
  isLoading?: boolean;
  
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_LAYOUT_OPTIONS: TreeLayoutOptions = {
  nodeSpacingX: 120,
  nodeSpacingY: 150,
  nodeSize: 80,
  animationDuration: 300,
  showRejected: true,
  showArchived: false,
  maxRenderDepth: 10,
};

export const DEFAULT_TREE_STATS: TreeStats = {
  totalNodes: 0,
  completedNodes: 0,
  selectedNodes: 0,
  rejectedNodes: 0,
  maxDepth: 0,
  maxBranches: 0,
};
