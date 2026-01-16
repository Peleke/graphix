/**
 * Review API Integration Tests
 *
 * Tests the complete review workflow through the REST API.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
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
  getLLMService,
  type ImageAnalysis,
} from "../../services/index.js";

describe("Review API Integration", () => {
  let projectId: string;
  let storyboardId: string;
  let panelId: string;
  let imageService: ReturnType<typeof getGeneratedImageService>;

  // Mock analysis result
  const mockAnalysis: ImageAnalysis = {
    adherenceScore: 0.85,
    foundElements: ["otter", "beach"],
    missingElements: ["sunset"],
    issues: [
      {
        type: "missing_element",
        description: "Sunset not visible",
        severity: "minor",
      },
    ],
  };

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();

    imageService = getGeneratedImageService();

    // Set up test data
    const project = await createTestProject();
    projectId = project.id;

    const storyboard = await createTestStoryboard(projectId);
    storyboardId = storyboard.id;

    const panel = await createTestPanel(storyboardId, "An otter on a beach at sunset");
    panelId = panel.id;

    // Mock the LLM service for all tests
    const llmService = getLLMService();
    llmService.analyzeImagePromptAdherence = mock(() => Promise.resolve(mockAnalysis));
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // Helper to create a test image
  async function createTestImage(seed = 12345) {
    return imageService.create({
      panelId,
      localPath: "/tmp/test-image.png",
      seed,
      prompt: "An otter on a beach at sunset",
      model: "test-model",
      steps: 20,
      cfg: 7,
      sampler: "euler_a",
      width: 512,
      height: 768,
    });
  }

  describe("Complete Review Workflow", () => {
    it("performs single image review", async () => {
      const image = await createTestImage();
      const service = getReviewService();

      const result = await service.reviewImage(image.id);

      expect(result.imageId).toBe(image.id);
      expect(result.panelId).toBe(panelId);
      expect(result.score).toBe(0.85);
      expect(result.status).toBe("approved");
      expect(result.iteration).toBe(1);
    });

    it("performs panel review workflow", async () => {
      await createTestImage(111);
      const selectedImage = await createTestImage(222);
      await imageService.select(selectedImage.id);

      const service = getReviewService();
      const result = await service.reviewPanel(panelId);

      expect(result.imageId).toBe(selectedImage.id);
    });

    it("tracks multiple review iterations", async () => {
      const image = await createTestImage();
      const service = getReviewService();

      // Multiple reviews
      const r1 = await service.reviewImage(image.id);
      const r2 = await service.reviewImage(image.id);
      const r3 = await service.reviewImage(image.id);

      expect(r1.iteration).toBe(1);
      expect(r2.iteration).toBe(2);
      expect(r3.iteration).toBe(3);

      // Check history
      const history = await service.getPanelReviewHistory(panelId);
      expect(history).toHaveLength(3);
    });
  });

  describe("Human-in-the-Loop Workflow", () => {
    it("completes full HitL cycle", async () => {
      const service = getReviewService();
      service.setConfig({ mode: "hitl" });

      // Lower the mock score to trigger human review
      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve({ ...mockAnalysis, adherenceScore: 0.4 })
      );

      const image = await createTestImage();

      // AI review triggers human review queue
      const aiReview = await service.reviewImage(image.id);
      expect(aiReview.status).toBe("human_review");

      // Check queue
      const queue = await service.getHumanReviewQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].imageId).toBe(image.id);

      // Human approves
      const humanResult = await service.recordHumanDecision(image.id, {
        action: "approve",
        feedback: "Actually looks fine",
      });
      expect(humanResult.status).toBe("approved");

      // Queue should be empty now
      const finalQueue = await service.getHumanReviewQueue();
      expect(finalQueue).toHaveLength(0);
    });

    it("handles human rejection", async () => {
      const service = getReviewService();
      const image = await createTestImage();

      await service.reviewImage(image.id);

      const result = await service.recordHumanDecision(image.id, {
        action: "reject",
        feedback: "Does not match the intended style at all",
      });

      expect(result.status).toBe("rejected");

      const updatedImage = await imageService.getById(image.id);
      expect(updatedImage?.reviewStatus).toBe("rejected");
    });

    it("handles regeneration request", async () => {
      const service = getReviewService();
      const image = await createTestImage();

      await service.reviewImage(image.id);

      const result = await service.recordHumanDecision(image.id, {
        action: "regenerate",
        feedback: "Needs more sunset colors",
        regenerationHints: "Add orange and pink sky",
      });

      expect(result.status).toBe("needs_work");
      expect(result.recommendation).toBe("regenerate");
    });
  });

  describe("Batch Storyboard Review", () => {
    it("reviews multiple panels in a storyboard", async () => {
      // Create multiple panels with images
      const panel2 = await createTestPanel(storyboardId, "A cat in a garden");
      const panel3 = await createTestPanel(storyboardId, "A dog in a park");

      await createTestImage(111);
      await imageService.create({
        panelId: panel2.id,
        localPath: "/tmp/test-2.png",
        seed: 222,
        prompt: "A cat in a garden",
        model: "test-model",
        steps: 20,
        cfg: 7,
        sampler: "euler_a",
        width: 512,
        height: 768,
      });
      await imageService.create({
        panelId: panel3.id,
        localPath: "/tmp/test-3.png",
        seed: 333,
        prompt: "A dog in a park",
        model: "test-model",
        steps: 20,
        cfg: 7,
        sampler: "euler_a",
        width: 512,
        height: 768,
      });

      const service = getReviewService();
      const result = await service.reviewStoryboard(storyboardId, {
        config: { mode: "hitl" },
      });

      expect(result.total).toBe(3);
      expect(result.approved).toBe(3); // All should be approved with 0.85 score
      expect(result.errors).toHaveLength(0);
    });

    it("skips panels without images", async () => {
      // Create one panel with image, one without
      const panel2 = await createTestPanel(storyboardId, "Empty panel");
      await createTestImage();

      const service = getReviewService();
      const result = await service.reviewStoryboard(storyboardId, {
        config: { mode: "hitl" },
      });

      // Panels without images are filtered out before processing
      // So only the one panel with an image is counted
      expect(result.total).toBe(1);
      expect(result.approved).toBe(1); // The one panel with image was approved
      expect(result.errors).toHaveLength(0); // No errors since empty panels are excluded
    });
  });

  describe("Status Transitions", () => {
    it("tracks status changes through workflow", async () => {
      const service = getReviewService();
      const image = await createTestImage();

      // Initial state - pending
      let dbImage = await imageService.getById(image.id);
      expect(dbImage?.reviewStatus).toBe("pending");

      // After AI review - approved
      await service.reviewImage(image.id);
      dbImage = await imageService.getById(image.id);
      expect(dbImage?.reviewStatus).toBe("approved");

      // Submit for human review
      const review = await service.reviewImage(image.id);
      await service.submitForHumanReview(image.id, review);
      dbImage = await imageService.getById(image.id);
      expect(dbImage?.reviewStatus).toBe("human_review");

      // Human approves
      await service.recordHumanDecision(image.id, { action: "approve" });
      dbImage = await imageService.getById(image.id);
      expect(dbImage?.reviewStatus).toBe("approved");
    });
  });

  describe("Configuration Effects", () => {
    it("respects different score thresholds", async () => {
      const service = getReviewService();
      const image = await createTestImage();

      // Set strict thresholds
      service.setConfig({
        minAcceptanceScore: 0.9,
        autoApproveAbove: 0.95,
      });

      // With 0.85 score, should now be needs_work
      const result = await service.reviewImage(image.id);
      expect(result.status).toBe("needs_work");
    });

    it("respects maxIterations for recommendations", async () => {
      const service = getReviewService();
      service.setConfig({ maxIterations: 2 });

      const llmService = getLLMService();
      llmService.analyzeImagePromptAdherence = mock(() =>
        Promise.resolve({ ...mockAnalysis, adherenceScore: 0.5 })
      );

      const image = await createTestImage();

      // Iterations 1 and 2
      await service.reviewImage(image.id);
      await service.reviewImage(image.id);

      // Iteration 3 - exceeds max
      const result = await service.reviewImage(image.id);
      expect(result.recommendation).toBe("human_review");
    });
  });
});
