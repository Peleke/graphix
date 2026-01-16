/**
 * Review Types
 *
 * Type definitions for the image review and regeneration system.
 * Includes configuration options, review results, and vision provider settings.
 */

import type { ReviewStatus, ReviewAction, ReviewIssue } from "../db/schema.js";

// Re-export schema types for convenience
export type { ReviewStatus, ReviewAction, ReviewIssue, ReviewIssueType, ReviewIssueSeverity } from "../db/schema.js";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the review system behavior.
 */
export interface ReviewConfig {
  /** Operating mode: unattended (autonomous) or human-in-the-loop */
  mode: "unattended" | "hitl";

  /** Maximum regeneration attempts before giving up */
  maxIterations: number;

  /** Minimum score required to consider an image acceptable (0-1) */
  minAcceptanceScore: number;

  /** Score above which images are auto-approved without human review (0-1) */
  autoApproveAbove: number;

  /** Score below which human review is required in hitl mode (0-1) */
  pauseForHumanBelow: number;
}

/**
 * Default review configuration.
 */
export const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  mode: "unattended",
  maxIterations: 3,
  minAcceptanceScore: 0.7,
  autoApproveAbove: 0.9,
  pauseForHumanBelow: 0.5,
};

// ============================================================================
// Vision Provider Types
// ============================================================================

/**
 * Configuration for vision model providers.
 * Supports Ollama (local or RunPod) and Claude Vision as fallback.
 */
export interface VisionProviderConfig {
  /** Primary provider to use for image analysis */
  provider: "ollama" | "claude";

  /** Ollama base URL (local or RunPod endpoint) */
  ollamaBaseUrl?: string;

  /** Ollama vision model (e.g., "llava", "llava-llama3", "bakllava") */
  ollamaModel?: string;

  /** Claude API key (for fallback) */
  claudeApiKey?: string;

  /** Claude model for vision analysis */
  claudeModel?: string;
}

/**
 * Default vision provider configuration.
 * Uses environment variables with sensible defaults.
 */
export const DEFAULT_VISION_CONFIG: VisionProviderConfig = {
  provider: "ollama",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_VISION_MODEL || "llava",
  claudeModel: "claude-sonnet-4-20250514",
};

// ============================================================================
// Review Result Types
// ============================================================================

/**
 * Result of a single image review operation.
 */
export interface ReviewResult {
  /** ID of the reviewed image */
  imageId: string;

  /** ID of the panel this image belongs to */
  panelId: string;

  /** Prompt adherence score (0-1) */
  score: number;

  /** Current status after review */
  status: ReviewStatus;

  /** Issues detected during review */
  issues: ReviewIssue[];

  /** Recommended next action */
  recommendation: ReviewAction;

  /** Current iteration number */
  iteration: number;

  /** ID of this review record (after saving) */
  reviewId?: string;

  /** Human feedback (only for human reviews) */
  humanFeedback?: string;
}

/**
 * Human decision on a reviewed image.
 */
export interface HumanDecision {
  /** The action chosen by the human reviewer */
  action: "approve" | "reject" | "regenerate";

  /** Optional feedback explaining the decision */
  feedback?: string;

  /** Optional specific instructions for regeneration */
  regenerationHints?: string;
}

/**
 * Result of an autonomous review-and-regenerate cycle.
 */
export interface AutoReviewResult {
  /** The final accepted image */
  finalImage: {
    id: string;
    localPath: string;
    cloudUrl?: string | null;
    prompt: string;
    seed: number;
  };

  /** History of all review iterations */
  iterations: ReviewResult[];

  /** Total iterations performed */
  totalIterations: number;

  /** Whether the final image was accepted */
  accepted: boolean;

  /** Reason for final acceptance/rejection */
  reason: string;
}

// ============================================================================
// Internal Analysis Types
// ============================================================================

/**
 * Raw analysis result from vision model.
 */
export interface ImageAnalysis {
  /** Overall prompt adherence score (0-1) */
  adherenceScore: number;

  /** Detected issues */
  issues: ReviewIssue[];

  /** Elements from the prompt that were found in the image */
  foundElements: string[];

  /** Elements from the prompt that were missing from the image */
  missingElements: string[];

  /** Overall quality assessment */
  qualityNotes?: string;

  /** Raw model response (for debugging) */
  rawResponse?: string;
}

/**
 * Context about a panel for richer analysis.
 */
export interface PanelContext {
  /** Panel description/direction */
  description?: string;

  /** Character IDs in the panel */
  characterIds?: string[];

  /** Character names for context */
  characterNames?: string[];

  /** Scene/mood context */
  mood?: string;

  /** Camera angle */
  cameraAngle?: string;

  /** Additional narrative context */
  narrativeContext?: string;
}

// ============================================================================
// Queue Types (for HitL)
// ============================================================================

/**
 * An item in the human review queue.
 */
export interface ReviewQueueItem {
  /** Review ID */
  reviewId: string;

  /** Image being reviewed */
  imageId: string;

  /** Panel ID */
  panelId: string;

  /** Storyboard ID (for context) */
  storyboardId?: string;

  /** Image path */
  imagePath: string;

  /** Image thumbnail path */
  thumbnailPath?: string;

  /** Original prompt */
  prompt: string;

  /** AI-assigned score */
  aiScore: number;

  /** AI-detected issues */
  aiIssues: ReviewIssue[];

  /** AI recommendation */
  aiRecommendation: ReviewAction;

  /** Iteration number */
  iteration: number;

  /** When the review was created */
  createdAt: Date;
}

/**
 * Result of processing the human review queue.
 */
export interface QueueProcessResult {
  /** Items processed */
  processed: number;

  /** Items approved */
  approved: number;

  /** Items rejected */
  rejected: number;

  /** Items queued for regeneration */
  regenerating: number;
}

// ============================================================================
// Batch Review Types
// ============================================================================

/**
 * Options for batch review operations.
 */
export interface BatchReviewOptions {
  /** Review configuration to use */
  config?: Partial<ReviewConfig>;

  /** Only review panels without any approved images */
  onlyPending?: boolean;

  /** Maximum panels to process */
  limit?: number;

  /** Run reviews in parallel (faster but uses more resources) */
  parallel?: boolean;

  /** Maximum concurrent reviews when parallel is true */
  concurrency?: number;
}

/**
 * Result of a batch review operation.
 */
export interface BatchReviewResult {
  /** Total panels processed */
  total: number;

  /** Panels with approved images */
  approved: number;

  /** Panels needing work */
  needsWork: number;

  /** Panels rejected (max iterations reached) */
  rejected: number;

  /** Panels pending human review */
  pendingHuman: number;

  /** Per-panel results */
  results: Map<string, ReviewResult>;

  /** Any errors encountered */
  errors: Array<{ panelId: string; error: string }>;
}
