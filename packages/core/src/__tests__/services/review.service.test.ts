/**
 * ReviewService Unit Tests
 *
 * Comprehensive tests covering the image review and regeneration system.
 * Tests review logic, status transitions, HitL functionality, and configuration.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
} from "../setup.js";
import {
  getReviewService,
  getGeneratedImageService,
  getPanelService,
  getLLMService,
  type ReviewService,
  type ReviewConfig,
  type ReviewResult,
  type ImageAnalysis,
  DEFAULT_REVIEW_CONFIG,
} from "../../services/index.js";
import type { GeneratedImage, ReviewIssue } from "../../db/index.js";

describe("ReviewService", () => {
  let service: ReviewService;
  let imageService: ReturnType<typeof getGeneratedImageService>;
  let panelService: ReturnType<typeof getPanelService>;
  let projectId: string;
  let storyboardId: string;
  let panelId: string;

  // Mock image analysis result
  const mockAnalysis: ImageAnalysis = {
    adherenceScore: 0.85,
    foundElements: ["otter", "beach", "sunset"],
    missingElements: ["palm tree"],
    issues: [
      {
        type: "missing_element",
        description: "Palm tree mentioned in prompt is not visible",
        severity: "minor",
        suggestedFix: "Add palm trees to the background",
      },
    ],
    qualityNotes: "Good overall quality",
  };

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();

    service = getReviewService();
    imageService = getGeneratedImageService();
    panelService = getPanelService();

    // Create test data
    const project = await createTestProject();
    projectId = project.id;

    const storyboard = await createTestStoryboard(projectId);
    storyboardId = storyboard.id;

    const panel = await createTestPanel(storyboardId, "An otter on a beach with palm trees at sunset");
    panelId = panel.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // Helper to create a mock generated image
  async function createTestImage(overrides: Partial<GeneratedImage> = {}): Promise<GeneratedImage> {
    return imageService.create({
      panelId,
      localPath: "/tmp/test-image.png",
      seed: 12345,
      prompt: "An otter on a beach with palm trees at sunset",
      model: "test-model",
      steps: 20,
      cfg: 7,
      sampler: "euler_a",
      width: 512,
      height: 768,
      ...overrides,
    });
  }

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe("Configuration", () => {
    it("uses default config when none provided", () => {
      const config = service.getConfig();

      expect(config.mode).toBe(DEFAULT_REVIEW_CONFIG.mode);
      expect(config.maxIterations).toBe(DEFAULT_REVIEW_CONFIG.maxIterations);
      expect(config.minAcceptanceScore).toBe(DEFAULT_REVIEW_CONFIG.minAcceptanceScore);
      expect(config.autoApproveAbove).toBe(DEFAULT_REVIEW_CONFIG.autoApproveAbove);
      expect(config.pauseForHumanBelow).toBe(DEFAULT_REVIEW_CONFIG.pauseForHumanBelow);
    });

    it("allows updating configuration", () => {
      service.setConfig({
        mode: "hitl",
        maxIterations: 5,
        minAcceptanceScore: 0.8,
      });

      const config = service.getConfig();
      expect(config.mode).toBe("hitl");
      expect(config.maxIterations).toBe(5);
      expect(config.minAcceptanceScore).toBe(0.8);
      // Unchanged values should remain
      expect(config.autoApproveAbove).toBe(DEFAULT_REVIEW_CONFIG.autoApproveAbove);
    });

    it("returns a copy of config to prevent mutation", () => {
      const config1 = service.getConfig();
      config1.maxIterations = 100;

      const config2 = service.getConfig();
      expect(config2.maxIterations).toBe(DEFAULT_REVIEW_CONFIG.maxIterations);
    });
  });

  // ============================================================================
  // STATUS DETERMINATION TESTS
  // ============================================================================

  describe("Status Determination", () => {
    // We can't directly test private methods, but we can test the behavior
    // through reviewImage by mocking the LLM service

    it("approves scores above autoApproveAbove threshold", async () => {
      const image = await createTestImage();

      // Mock the LLM service to return a high score
      const llmService = getLLMService();
      const mockAnalyze = mock(() =>
        Promise.resolve({
          ...mockAnalysis,
          adherenceScore: 0.95, // Above 0.9 autoApproveAbove
        })
      );
      llmService.analyzeImagePromptAdherence = mockAnalyze;

      const result = await service.reviewImage(image.id);

      expect(result.status).toBe("approved");
      expect(result.score).toBe(0.95);
    });

    it("approves scores above minAcceptanceScore threshold", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      const mockAnalyze = mock(() =>
        Promise.resolve({
          ...mockAnalysis,
          adherenceScore: 0.75, // Between 0.7 and 0.9
        })
      );
      llmService.analyzeImagePromptAdherence = mockAnalyze;

      const result = await service.reviewImage(image.id);

      expect(result.status).toBe("approved");
    });

    it("marks needs_work for scores below minAcceptanceScore", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      const mockAnalyze = mock(() =>
        Promise.resolve({
          ...mockAnalysis,
          adherenceScore: 0.55, // Below 0.7 but above 0.3
        })
      );
      llmService.analyzeImagePromptAdherence = mockAnalyze;

      const result = await service.reviewImage(image.id);

      expect(result.status).toBe("needs_work");
    });

    it("rejects very low scores", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      const mockAnalyze = mock(() =>
        Promise.resolve({
          ...mockAnalysis,
          adherenceScore: 0.2, // Below 0.3
          issues: [
            {
              type: "missing_element",
              description: "Image does not match prompt at all",
              severity: "critical",
            },
          ],
        })
      );
      llmService.analyzeImagePromptAdherence = mockAnalyze;

      const result = await service.reviewImage(image.id);

      expect(result.status).toBe("rejected");
    });

    it("requests human review in hitl mode for low scores", async () => {
      service.setConfig({ mode: "hitl" });
      const image = await createTestImage();

      const llmService = getLLMService();
      const mockAnalyze = mock(() =>
        Promise.resolve({
          ...mockAnalysis,
          adherenceScore: 0.4, // Below pauseForHumanBelow (0.5)
        })
      );
      llmService.analyzeImagePromptAdherence = mockAnalyze;

      const result = await service.reviewImage(image.id);

      expect(result.status).toBe("human_review");
    });
  });

  // ============================================================================
  // REVIEW IMAGE TESTS
  // ============================================================================

  describe("reviewImage", () => {
    it("reviews an image and returns result", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));

      const result = await service.reviewImage(image.id);

      expect(result.imageId).toBe(image.id);
      expect(result.panelId).toBe(panelId);
      expect(result.score).toBe(0.85);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("missing_element");
      expect(result.iteration).toBe(1);
      expect(result.reviewId).toBeDefined();
    });

    it("uses stored prompt when none provided", async () => {
      const image = await createTestImage({ prompt: "Custom prompt" });

      const llmService = getLLMService();
      const mockFn = mock(() => Promise.resolve(mockAnalysis));
      llmService.analyzeImagePromptAdherence = mockFn;

      await service.reviewImage(image.id);

      // Verify the stored prompt was used
      expect(mockFn).toHaveBeenCalled();
      const call = mockFn.mock.calls[0];
      expect(call[1]).toBe("Custom prompt");
    });

    it("allows prompt override", async () => {
      const image = await createTestImage({ prompt: "Original prompt" });

      const llmService = getLLMService();
      const mockFn = mock(() => Promise.resolve(mockAnalysis));
      llmService.analyzeImagePromptAdherence = mockFn;

      await service.reviewImage(image.id, "Override prompt");

      const call = mockFn.mock.calls[0];
      expect(call[1]).toBe("Override prompt");
    });

    it("throws for non-existent image", async () => {
      await expect(service.reviewImage("nonexistent-id")).rejects.toThrow("Image not found");
    });

    it("increments iteration count", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));

      const result1 = await service.reviewImage(image.id);
      expect(result1.iteration).toBe(1);

      const result2 = await service.reviewImage(image.id);
      expect(result2.iteration).toBe(2);

      const result3 = await service.reviewImage(image.id);
      expect(result3.iteration).toBe(3);
    });

    it("updates image review status", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve({ ...mockAnalysis, adherenceScore: 0.95 })
      );

      await service.reviewImage(image.id);

      const updatedImage = await imageService.getById(image.id);
      expect(updatedImage?.reviewStatus).toBe("approved");
    });
  });

  // ============================================================================
  // REVIEW PANEL TESTS
  // ============================================================================

  describe("reviewPanel", () => {
    it("reviews the selected image for a panel", async () => {
      const image1 = await createTestImage({ seed: 111 });
      const image2 = await createTestImage({ seed: 222 });
      await imageService.select(image2.id);

      const llmService = getLLMService();
      const mockFn = mock(() => Promise.resolve(mockAnalysis));
      llmService.analyzeImagePromptAdherence = mockFn;

      const result = await service.reviewPanel(panelId);

      expect(result.imageId).toBe(image2.id);
    });

    it("uses most recent image if none selected", async () => {
      const image1 = await createTestImage({ seed: 111 });
      // Create second image (will be most recent)
      const image2 = await createTestImage({ seed: 222 });

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));

      const result = await service.reviewPanel(panelId);

      // Should use first image (most recent by order)
      expect(result.imageId).toBe(image1.id);
    });

    it("throws when panel has no images", async () => {
      // Panel exists but has no images
      await expect(service.reviewPanel(panelId)).rejects.toThrow("No images found");
    });
  });

  // ============================================================================
  // HUMAN-IN-THE-LOOP TESTS
  // ============================================================================

  describe("Human-in-the-Loop", () => {
    describe("recordHumanDecision", () => {
      it("records approval decision", async () => {
        const image = await createTestImage();

        // First do an AI review
        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() =>
          Promise.resolve({ ...mockAnalysis, adherenceScore: 0.6 })
        );
        await service.reviewImage(image.id);

        // Then record human decision
        const result = await service.recordHumanDecision(image.id, {
          action: "approve",
          feedback: "Looks good to me",
        });

        expect(result.status).toBe("approved");

        const updatedImage = await imageService.getById(image.id);
        expect(updatedImage?.reviewStatus).toBe("approved");
      });

      it("records rejection decision with required feedback", async () => {
        const image = await createTestImage();

        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));
        await service.reviewImage(image.id);

        const result = await service.recordHumanDecision(image.id, {
          action: "reject",
          feedback: "The composition is completely wrong",
        });

        expect(result.status).toBe("rejected");
      });

      it("records regeneration request", async () => {
        const image = await createTestImage();

        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));
        await service.reviewImage(image.id);

        const result = await service.recordHumanDecision(image.id, {
          action: "regenerate",
          feedback: "Close but needs more palm trees",
          regenerationHints: "Add more palm trees in background",
        });

        expect(result.status).toBe("needs_work");
        expect(result.recommendation).toBe("regenerate");
      });

      it("preserves AI score in human review", async () => {
        const image = await createTestImage();

        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() =>
          Promise.resolve({ ...mockAnalysis, adherenceScore: 0.72 })
        );
        await service.reviewImage(image.id);

        const result = await service.recordHumanDecision(image.id, {
          action: "approve",
        });

        expect(result.score).toBe(0.72);
      });

      it("throws for invalid action", async () => {
        const image = await createTestImage();

        await expect(
          service.recordHumanDecision(image.id, {
            action: "invalid" as any,
          })
        ).rejects.toThrow("Invalid decision action");
      });
    });

    describe("getHumanReviewQueue", () => {
      it("returns empty queue when no images pending", async () => {
        const queue = await service.getHumanReviewQueue();

        expect(queue).toEqual([]);
      });

      it("returns images marked for human review", async () => {
        // Create an image and mark for human review
        const image = await createTestImage();
        service.setConfig({ mode: "hitl" });

        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() =>
          Promise.resolve({ ...mockAnalysis, adherenceScore: 0.4 }) // Below pauseForHumanBelow
        );
        await service.reviewImage(image.id);

        const queue = await service.getHumanReviewQueue();

        expect(queue).toHaveLength(1);
        expect(queue[0].imageId).toBe(image.id);
        expect(queue[0].panelId).toBe(panelId);
        expect(queue[0].aiScore).toBe(0.4);
      });

      it("respects limit and offset", async () => {
        // Create multiple images
        service.setConfig({ mode: "hitl" });
        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() =>
          Promise.resolve({ ...mockAnalysis, adherenceScore: 0.4 })
        );

        for (let i = 0; i < 5; i++) {
          const image = await createTestImage({ seed: 1000 + i });
          await service.reviewImage(image.id);
        }

        const queue1 = await service.getHumanReviewQueue(2, 0);
        expect(queue1).toHaveLength(2);

        const queue2 = await service.getHumanReviewQueue(2, 2);
        expect(queue2).toHaveLength(2);

        const queue3 = await service.getHumanReviewQueue(10, 4);
        expect(queue3).toHaveLength(1);
      });
    });

    describe("submitForHumanReview", () => {
      it("updates status to human_review", async () => {
        const image = await createTestImage();

        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));

        const review = await service.reviewImage(image.id);
        await service.submitForHumanReview(image.id, review);

        const updatedImage = await imageService.getById(image.id);
        expect(updatedImage?.reviewStatus).toBe("human_review");
      });
    });
  });

  // ============================================================================
  // REVIEW HISTORY TESTS
  // ============================================================================

  describe("Review History", () => {
    describe("getPanelReviewHistory", () => {
      it("returns all reviews for a panel", async () => {
        const image1 = await createTestImage({ seed: 111 });
        const image2 = await createTestImage({ seed: 222 });

        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));

        await service.reviewImage(image1.id);
        await service.reviewImage(image2.id);
        await service.reviewImage(image1.id); // Second review of image1

        const history = await service.getPanelReviewHistory(panelId);

        expect(history).toHaveLength(3);
        // Should be in descending order by creation time
      });

      it("returns empty array for panel with no reviews", async () => {
        const history = await service.getPanelReviewHistory(panelId);

        expect(history).toEqual([]);
      });
    });

    describe("getImageReviewHistory", () => {
      it("returns all reviews for an image", async () => {
        const image = await createTestImage();

        const llmService = getLLMService();
        llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));

        const r1 = await service.reviewImage(image.id);
        const r2 = await service.reviewImage(image.id);
        const r3 = await service.reviewImage(image.id);

        // First check that the return values have correct iterations
        expect(r1.iteration).toBe(1);
        expect(r2.iteration).toBe(2);
        expect(r3.iteration).toBe(3);

        const history = await service.getImageReviewHistory(image.id);

        expect(history).toHaveLength(3);
        expect(history[0].iteration).toBe(3);
        expect(history[1].iteration).toBe(2);
        expect(history[2].iteration).toBe(1);
      });
    });

    describe("getLatestReview", () => {
      it("returns most recent review", async () => {
        const image = await createTestImage();

        const llmService = getLLMService();
        let callCount = 0;
        llmService.analyzeImagePromptAdherence = mock(() => {
          callCount++;
          return Promise.resolve({
            ...mockAnalysis,
            adherenceScore: 0.5 + callCount * 0.1,
          });
        });

        await service.reviewImage(image.id);
        await service.reviewImage(image.id);
        await service.reviewImage(image.id);

        const latest = await service.getLatestReview(image.id);

        expect(latest).toBeDefined();
        expect(latest?.iteration).toBe(3);
        expect(latest?.score).toBe(0.8);
      });

      it("returns null when no reviews exist", async () => {
        const image = await createTestImage();

        const latest = await service.getLatestReview(image.id);

        expect(latest).toBeNull();
      });
    });
  });

  // ============================================================================
  // RECOMMENDATION TESTS
  // ============================================================================

  describe("Action Recommendations", () => {
    it("recommends approval for high scores", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve({ ...mockAnalysis, adherenceScore: 0.95, issues: [] })
      );

      const result = await service.reviewImage(image.id);

      expect(result.recommendation).toBe("approve");
    });

    it("recommends regeneration for missing elements", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve({
          ...mockAnalysis,
          adherenceScore: 0.5,
          issues: [
            {
              type: "missing_element",
              description: "Main character not visible",
              severity: "critical",
            },
          ],
        })
      );

      const result = await service.reviewImage(image.id);

      expect(result.recommendation).toBe("regenerate");
    });

    it("recommends inpainting for quality-only issues", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve({
          ...mockAnalysis,
          adherenceScore: 0.6,
          issues: [
            {
              type: "quality",
              description: "Hands look distorted",
              severity: "major",
            },
          ],
        })
      );

      const result = await service.reviewImage(image.id);

      expect(result.recommendation).toBe("inpaint");
    });

    it("recommends human_review when max iterations reached", async () => {
      const image = await createTestImage();
      service.setConfig({ maxIterations: 2 });

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve({ ...mockAnalysis, adherenceScore: 0.5 })
      );

      // First two reviews
      await service.reviewImage(image.id);
      await service.reviewImage(image.id);

      // Third review - should recommend human review
      const result = await service.reviewImage(image.id);

      expect(result.recommendation).toBe("human_review");
    });
  });

  // ============================================================================
  // INPUT VALIDATION TESTS
  // ============================================================================

  describe("Input Validation", () => {
    it("rejects review for non-existent image", async () => {
      await expect(service.reviewImage("non-existent-id")).rejects.toThrow(
        "not found"
      );
    });

    it("rejects review for non-existent panel", async () => {
      await expect(service.reviewPanel("non-existent-id")).rejects.toThrow();
    });

    it("sets config score thresholds correctly", async () => {
      // Test that valid config values are accepted
      service.setConfig({
        minAcceptanceScore: 0.6,
        autoApproveAbove: 0.95,
      });

      const config = service.getConfig();
      expect(config.minAcceptanceScore).toBe(0.6);
      expect(config.autoApproveAbove).toBe(0.95);
    });

    it("rejects human decision for non-existent image", async () => {
      await expect(
        service.recordHumanDecision("non-existent-id", {
          action: "approve",
        })
      ).rejects.toThrow("not found");
    });

    it("rejects invalid decision action", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve(mockAnalysis)
      );

      // First do a review to have a record
      await service.reviewImage(image.id);

      await expect(
        service.recordHumanDecision(image.id, {
          action: "invalid" as any,
        })
      ).rejects.toThrow("Invalid decision action");
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe("Error Handling", () => {
    it("handles LLM analysis failure gracefully", async () => {
      const image = await createTestImage();

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.reject(new Error("API rate limited"))
      );

      await expect(service.reviewImage(image.id)).rejects.toThrow(
        "API rate limited"
      );
    });

    it("returns empty result for non-existent storyboard", async () => {
      // Non-existent storyboard returns empty results (no panels found)
      const result = await service.reviewStoryboard("non-existent-storyboard");
      expect(result.total).toBe(0);
      expect(result.results.size).toBe(0);
    });
  });
});
