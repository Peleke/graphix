/**
 * Review Service
 *
 * AI-powered image review and regeneration system.
 * Supports both autonomous (unattended) and human-in-the-loop modes.
 */

import { eq, desc, and, inArray, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { getDb } from "../db/client.js";
import {
  imageReviews,
  generatedImages,
  panels,
  type ReviewStatus,
  type ReviewAction,
  type ReviewIssue,
  type ImageReview,
  type NewImageReview,
  type GeneratedImage,
} from "../db/schema.js";
import { getLLMService, type LLMService } from "./llm.service.js";
import { getGeneratedImageService, type GeneratedImageService } from "./generated-image.service.js";
import { getPanelService, type PanelService } from "./panel.service.js";
import { getPanelGenerator, type PanelGenerator } from "../generation/panel-generator.js";
import {
  DEFAULT_REVIEW_CONFIG,
  type ReviewConfig,
  type ReviewResult,
  type HumanDecision,
  type AutoReviewResult,
  type PanelContext,
  type ReviewQueueItem,
  type BatchReviewOptions,
  type BatchReviewResult,
  type VisionProviderConfig,
  type ImageAnalysis,
} from "./review.types.js";

// ============================================================================
// ReviewService Class
// ============================================================================

export class ReviewService {
  private db: LibSQLDatabase;
  private llmService: LLMService;
  private imageService: GeneratedImageService;
  private panelService: PanelService;
  private panelGenerator: PanelGenerator;
  private config: ReviewConfig;
  private visionConfig?: Partial<VisionProviderConfig>;

  constructor(
    db?: LibSQLDatabase,
    config?: Partial<ReviewConfig>,
    visionConfig?: Partial<VisionProviderConfig>
  ) {
    this.db = db || getDb();
    this.llmService = getLLMService();
    this.imageService = getGeneratedImageService();
    this.panelService = getPanelService();
    this.panelGenerator = getPanelGenerator();
    this.config = { ...DEFAULT_REVIEW_CONFIG, ...config };
    this.visionConfig = visionConfig;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Update the review configuration
   */
  setConfig(config: Partial<ReviewConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReviewConfig {
    return { ...this.config };
  }

  /**
   * Update vision provider configuration
   */
  setVisionConfig(config: Partial<VisionProviderConfig>): void {
    this.visionConfig = { ...this.visionConfig, ...config };
  }

  // ==========================================================================
  // Core Review Methods
  // ==========================================================================

  /**
   * Review a single generated image for prompt adherence.
   *
   * @param imageId - ID of the generated image to review
   * @param originalPrompt - Optional override for the prompt (uses stored prompt if not provided)
   * @param context - Optional panel context for richer analysis
   * @returns Review result with score, issues, and recommendation
   */
  async reviewImage(
    imageId: string,
    originalPrompt?: string,
    context?: PanelContext
  ): Promise<ReviewResult> {
    // Get the image
    const image = await this.imageService.getById(imageId);
    if (!image) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // Use provided prompt or fall back to stored prompt
    const prompt = originalPrompt || image.prompt;

    // Get panel context if not provided
    const panelContext = context || (await this.getPanelContext(image.panelId));

    // Perform AI analysis
    const analysis = await this.llmService.analyzeImagePromptAdherence(
      image.localPath,
      prompt,
      panelContext,
      this.visionConfig
    );

    // Get current iteration count
    const iteration = await this.getIterationCount(image.panelId);

    // Determine status and recommendation based on score and config
    const status = this.determineStatus(analysis.adherenceScore, this.config);
    const recommendation = this.determineAction(analysis, status, iteration, this.config);

    // Create the review record
    const reviewRecord = await this.createReviewRecord({
      generatedImageId: imageId,
      panelId: image.panelId,
      score: analysis.adherenceScore,
      status,
      issues: analysis.issues,
      recommendation,
      iteration: iteration + 1,
      reviewedBy: "ai",
    });

    // Update the image's review status
    await this.updateImageReviewStatus(imageId, status);

    return {
      imageId,
      panelId: image.panelId,
      score: analysis.adherenceScore,
      status,
      issues: analysis.issues,
      recommendation,
      iteration: iteration + 1,
      reviewId: reviewRecord.id,
    };
  }

  /**
   * Review the current/selected image for a panel.
   *
   * @param panelId - ID of the panel to review
   * @returns Review result for the panel's current image
   */
  async reviewPanel(panelId: string): Promise<ReviewResult> {
    // Get the panel's selected image, or most recent if none selected
    const images = await this.imageService.getByPanel(panelId);
    if (images.length === 0) {
      throw new Error(`No images found for panel: ${panelId}`);
    }

    // Prefer selected image, otherwise use most recent
    const selectedImage = images.find((img) => img.isSelected) || images[0];

    return this.reviewImage(selectedImage.id);
  }

  // ==========================================================================
  // Autonomous Review Loop
  // ==========================================================================

  /**
   * Review and regenerate until an image is accepted or max iterations reached.
   * This is the core autonomous loop for unattended mode.
   *
   * @param panelId - ID of the panel to process
   * @param config - Optional config override for this operation
   * @returns Final result with accepted image and iteration history
   */
  async reviewAndRegenerateUntilAccepted(
    panelId: string,
    config?: Partial<ReviewConfig>
  ): Promise<AutoReviewResult> {
    const effectiveConfig = { ...this.config, ...config };
    const iterations: ReviewResult[] = [];

    // Get panel and its current images
    const panel = await this.panelService.getById(panelId);
    if (!panel) {
      throw new Error(`Panel not found: ${panelId}`);
    }

    let currentIteration = 0;
    let accepted = false;
    let finalImage: GeneratedImage | null = null;
    let reason = "";

    while (currentIteration < effectiveConfig.maxIterations && !accepted) {
      // Get the latest image for the panel
      const images = await this.imageService.getByPanel(panelId);
      if (images.length === 0) {
        // No images yet, need to generate first
        throw new Error(`No images found for panel ${panelId}. Generate an image first.`);
      }

      const currentImage = images.find((img) => img.isSelected) || images[0];

      // Review the current image
      const review = await this.reviewImage(currentImage.id);
      iterations.push(review);
      currentIteration++;

      // Check if accepted
      if (review.status === "approved") {
        accepted = true;
        finalImage = currentImage;
        reason = `Image accepted with score ${review.score.toFixed(2)}`;
        break;
      }

      // Check if we need human review (in hitl mode or low score)
      if (effectiveConfig.mode === "hitl" && review.score < effectiveConfig.pauseForHumanBelow) {
        await this.submitForHumanReview(currentImage.id, review);
        finalImage = currentImage;
        reason = `Submitted for human review (score: ${review.score.toFixed(2)})`;
        break;
      }

      // If rejected or max iterations, stop
      if (review.status === "rejected") {
        finalImage = currentImage;
        reason = `Image rejected: ${review.issues.map((i) => i.description).join("; ")}`;
        break;
      }

      // Regenerate if under max iterations
      if (currentIteration < effectiveConfig.maxIterations) {
        // Build regeneration hints from issues
        const hints = this.buildRegenerationHints(review.issues);

        // Regenerate with a new seed
        const regenResult = await this.panelGenerator.regenerate(panelId, currentImage.id, {
          seed: Math.floor(Math.random() * 2147483647),
          // TODO: Could also adjust prompt based on issues
        });

        if (regenResult.success && regenResult.generatedImage) {
          // Select the new image
          await this.imageService.select(regenResult.generatedImage.id);
        } else {
          // Regeneration failed
          finalImage = currentImage;
          reason = `Regeneration failed: ${regenResult.error}`;
          break;
        }
      }
    }

    // If we exhausted iterations without acceptance
    if (!accepted && !finalImage) {
      const images = await this.imageService.getByPanel(panelId);
      finalImage = images[0];
      reason = `Max iterations (${effectiveConfig.maxIterations}) reached without acceptance`;
    }

    // Ensure we have a final image
    if (!finalImage) {
      throw new Error("No final image available after review loop");
    }

    return {
      finalImage: {
        id: finalImage.id,
        localPath: finalImage.localPath,
        cloudUrl: finalImage.cloudUrl,
        prompt: finalImage.prompt,
        seed: finalImage.seed,
      },
      iterations,
      totalIterations: iterations.length,
      accepted,
      reason,
    };
  }

  // ==========================================================================
  // Human-in-the-Loop Methods
  // ==========================================================================

  /**
   * Submit an image for human review.
   *
   * @param imageId - ID of the image to queue for review
   * @param aiReview - The AI's review result
   */
  async submitForHumanReview(imageId: string, aiReview: ReviewResult): Promise<void> {
    // Update the review record to indicate human review needed
    if (aiReview.reviewId) {
      await this.db
        .update(imageReviews)
        .set({
          status: "human_review",
          updatedAt: new Date(),
        })
        .where(eq(imageReviews.id, aiReview.reviewId));
    }

    // Update the image status
    await this.updateImageReviewStatus(imageId, "human_review");
  }

  /**
   * Record a human decision on a reviewed image.
   *
   * @param imageId - ID of the image being decided on
   * @param decision - Human's decision (approve, reject, regenerate)
   */
  async recordHumanDecision(imageId: string, decision: HumanDecision): Promise<ReviewResult> {
    // Get the image
    const image = await this.imageService.getById(imageId);
    if (!image) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // Get the most recent AI review for this image
    const [latestReview] = await this.db
      .select()
      .from(imageReviews)
      .where(eq(imageReviews.generatedImageId, imageId))
      .orderBy(desc(imageReviews.createdAt))
      .limit(1);

    // Determine new status based on decision
    let newStatus: ReviewStatus;
    let actionTaken: ReviewAction;

    switch (decision.action) {
      case "approve":
        newStatus = "approved";
        actionTaken = "approve";
        break;
      case "reject":
        newStatus = "rejected";
        actionTaken = "human_review"; // Human reviewed and rejected
        break;
      case "regenerate":
        newStatus = "needs_work";
        actionTaken = "regenerate";
        break;
      default:
        throw new Error(`Invalid decision action: ${decision.action}`);
    }

    // Create a new human review record
    const humanReview = await this.createReviewRecord({
      generatedImageId: imageId,
      panelId: image.panelId,
      score: latestReview?.score ?? 0.5, // Keep AI score
      status: newStatus,
      issues: latestReview?.issues ?? [],
      recommendation: actionTaken,
      iteration: (latestReview?.iteration ?? 0) + 1,
      previousReviewId: latestReview?.id,
      reviewedBy: "human",
      humanFeedback: decision.feedback,
    });

    // Update the image status
    await this.updateImageReviewStatus(imageId, newStatus);

    return {
      imageId,
      panelId: image.panelId,
      score: latestReview?.score ?? 0.5,
      status: newStatus,
      issues: latestReview?.issues ?? [],
      recommendation: actionTaken,
      iteration: humanReview.iteration,
      reviewId: humanReview.id,
    };
  }

  /**
   * Get images pending human review.
   *
   * @param limit - Maximum number of items to return
   * @param offset - Offset for pagination
   * @returns List of items in the human review queue
   */
  async getHumanReviewQueue(limit = 50, offset = 0): Promise<ReviewQueueItem[]> {
    // Get images with human_review status
    const pendingImages = await this.db
      .select({
        image: generatedImages,
        review: imageReviews,
        panel: panels,
      })
      .from(generatedImages)
      .innerJoin(imageReviews, eq(generatedImages.id, imageReviews.generatedImageId))
      .innerJoin(panels, eq(generatedImages.panelId, panels.id))
      .where(eq(generatedImages.reviewStatus, "human_review"))
      .orderBy(desc(imageReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return pendingImages.map(({ image, review, panel }) => ({
      reviewId: review.id,
      imageId: image.id,
      panelId: image.panelId,
      storyboardId: panel.storyboardId,
      imagePath: image.localPath,
      thumbnailPath: image.thumbnailPath ?? undefined,
      prompt: image.prompt,
      aiScore: review.score,
      aiIssues: review.issues ?? [],
      aiRecommendation: review.recommendation ?? "human_review",
      iteration: review.iteration,
      createdAt: review.createdAt,
    }));
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Review all panels in a storyboard.
   *
   * @param storyboardId - ID of the storyboard to review
   * @param options - Batch review options
   * @returns Results for each panel
   */
  async reviewStoryboard(
    storyboardId: string,
    options?: BatchReviewOptions
  ): Promise<BatchReviewResult> {
    const effectiveConfig = { ...this.config, ...options?.config };
    const results = new Map<string, ReviewResult>();
    const errors: Array<{ panelId: string; error: string }> = [];

    // Get all panels in the storyboard
    const storyboardPanels = await this.panelService.getByStoryboard(storyboardId);

    // Filter to only panels with images
    let panelsToReview = storyboardPanels.filter((p) => true); // TODO: Filter by having images

    // Apply options
    if (options?.onlyPending) {
      // Filter to panels without approved images
      const approvedPanelIds = await this.getApprovedPanelIds(storyboardId);
      panelsToReview = panelsToReview.filter((p) => !approvedPanelIds.has(p.id));
    }

    if (options?.limit) {
      panelsToReview = panelsToReview.slice(0, options.limit);
    }

    // Process panels
    const processPanel = async (panel: (typeof storyboardPanels)[0]) => {
      try {
        const images = await this.imageService.getByPanel(panel.id);
        if (images.length === 0) {
          errors.push({ panelId: panel.id, error: "No images for panel" });
          return;
        }

        if (effectiveConfig.mode === "unattended") {
          // Run full autonomous loop
          const autoResult = await this.reviewAndRegenerateUntilAccepted(panel.id, effectiveConfig);
          const lastIteration = autoResult.iterations[autoResult.iterations.length - 1];
          if (lastIteration) {
            results.set(panel.id, lastIteration);
          }
        } else {
          // Just review, don't auto-regenerate
          const review = await this.reviewPanel(panel.id);
          results.set(panel.id, review);
        }
      } catch (error) {
        errors.push({
          panelId: panel.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    // Process in parallel or sequentially
    if (options?.parallel) {
      const concurrency = options.concurrency || 3;
      const chunks = this.chunkArray(panelsToReview, concurrency);
      for (const chunk of chunks) {
        await Promise.all(chunk.map(processPanel));
      }
    } else {
      for (const panel of panelsToReview) {
        await processPanel(panel);
      }
    }

    // Calculate summary
    let approved = 0;
    let needsWork = 0;
    let rejected = 0;
    let pendingHuman = 0;

    for (const result of results.values()) {
      switch (result.status) {
        case "approved":
          approved++;
          break;
        case "needs_work":
          needsWork++;
          break;
        case "rejected":
          rejected++;
          break;
        case "human_review":
          pendingHuman++;
          break;
      }
    }

    return {
      total: panelsToReview.length,
      approved,
      needsWork,
      rejected,
      pendingHuman,
      results,
      errors,
    };
  }

  // ==========================================================================
  // Review History & Queries
  // ==========================================================================

  /**
   * Get review history for a panel.
   *
   * @param panelId - ID of the panel
   * @returns All review records for the panel
   */
  async getPanelReviewHistory(panelId: string): Promise<ImageReview[]> {
    return this.db
      .select()
      .from(imageReviews)
      .where(eq(imageReviews.panelId, panelId))
      .orderBy(desc(imageReviews.createdAt));
  }

  /**
   * Get review history for a specific image.
   *
   * @param imageId - ID of the generated image
   * @returns All review records for the image
   */
  async getImageReviewHistory(imageId: string): Promise<ImageReview[]> {
    return this.db
      .select()
      .from(imageReviews)
      .where(eq(imageReviews.generatedImageId, imageId))
      .orderBy(desc(imageReviews.createdAt));
  }

  /**
   * Get the latest review for an image.
   *
   * @param imageId - ID of the generated image
   * @returns Most recent review or null
   */
  async getLatestReview(imageId: string): Promise<ImageReview | null> {
    const [review] = await this.db
      .select()
      .from(imageReviews)
      .where(eq(imageReviews.generatedImageId, imageId))
      .orderBy(desc(imageReviews.createdAt))
      .limit(1);

    return review ?? null;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Determine the review status based on score and config.
   */
  private determineStatus(score: number, config: ReviewConfig): ReviewStatus {
    if (score >= config.autoApproveAbove) {
      return "approved";
    }
    if (score >= config.minAcceptanceScore) {
      return "approved"; // Meets minimum threshold
    }
    if (score < config.pauseForHumanBelow && config.mode === "hitl") {
      return "human_review";
    }
    if (score < 0.3) {
      return "rejected";
    }
    return "needs_work";
  }

  /**
   * Determine the recommended action based on analysis and status.
   */
  private determineAction(
    analysis: ImageAnalysis,
    status: ReviewStatus,
    iteration: number,
    config: ReviewConfig
  ): ReviewAction {
    if (status === "approved") {
      return "approve";
    }
    if (status === "human_review") {
      return "human_review";
    }
    if (status === "rejected") {
      return "human_review"; // Rejected items need human decision
    }

    // Needs work - determine best action
    const hasCritical = analysis.issues.some((i) => i.severity === "critical");
    const hasMissingElements = analysis.issues.some((i) => i.type === "missing_element");
    const hasQualityIssues = analysis.issues.some((i) => i.type === "quality");

    // If we've exhausted iterations, need human review
    if (iteration >= config.maxIterations) {
      return "human_review";
    }

    // Quality issues might benefit from inpainting
    if (hasQualityIssues && !hasMissingElements && !hasCritical) {
      return "inpaint";
    }

    // Missing elements or composition issues need regeneration
    if (hasMissingElements || hasCritical) {
      return "regenerate";
    }

    // Default to regeneration
    return "regenerate";
  }

  /**
   * Get context about a panel for richer analysis.
   */
  private async getPanelContext(panelId: string): Promise<PanelContext> {
    const panel = await this.panelService.getById(panelId);
    if (!panel) {
      return {};
    }

    // TODO: Get character names from characterIds
    return {
      description: panel.description ?? undefined,
      characterIds: panel.characterIds,
      mood: panel.direction?.mood,
      cameraAngle: panel.direction?.cameraAngle,
    };
  }

  /**
   * Get the current iteration count for a panel.
   */
  private async getIterationCount(panelId: string): Promise<number> {
    const [result] = await this.db
      .select({ maxIteration: imageReviews.iteration })
      .from(imageReviews)
      .where(eq(imageReviews.panelId, panelId))
      .orderBy(desc(imageReviews.iteration))
      .limit(1);

    return result?.maxIteration ?? 0;
  }

  /**
   * Create a new review record in the database.
   */
  private async createReviewRecord(
    data: Omit<NewImageReview, "id" | "createdAt" | "updatedAt">
  ): Promise<ImageReview> {
    const [review] = await this.db
      .insert(imageReviews)
      .values(data)
      .returning();

    return review;
  }

  /**
   * Update an image's review status.
   */
  private async updateImageReviewStatus(imageId: string, status: ReviewStatus): Promise<void> {
    await this.db
      .update(generatedImages)
      .set({
        reviewStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(generatedImages.id, imageId));
  }

  /**
   * Build regeneration hints from review issues.
   */
  private buildRegenerationHints(issues: ReviewIssue[]): string[] {
    return issues
      .filter((i) => i.suggestedFix)
      .map((i) => i.suggestedFix!)
      .concat(
        issues
          .filter((i) => i.type === "missing_element")
          .map((i) => `Add: ${i.description}`)
      );
  }

  /**
   * Get IDs of panels that have approved images.
   */
  private async getApprovedPanelIds(storyboardId: string): Promise<Set<string>> {
    const approved = await this.db
      .select({ panelId: generatedImages.panelId })
      .from(generatedImages)
      .innerJoin(panels, eq(generatedImages.panelId, panels.id))
      .where(
        and(
          eq(panels.storyboardId, storyboardId),
          eq(generatedImages.reviewStatus, "approved")
        )
      );

    return new Set(approved.map((r) => r.panelId));
  }

  /**
   * Split an array into chunks of a given size.
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: ReviewService | null = null;

/**
 * Create a new ReviewService with explicit configuration
 */
export function createReviewService(
  db?: LibSQLDatabase,
  config?: Partial<ReviewConfig>,
  visionConfig?: Partial<VisionProviderConfig>
): ReviewService {
  return new ReviewService(db, config, visionConfig);
}

/**
 * Get the singleton ReviewService
 */
export function getReviewService(): ReviewService {
  if (!instance) {
    instance = new ReviewService();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetReviewService(): void {
  instance = null;
}
