/**
 * Pose Library Service Unit Tests
 *
 * Tests for pose extraction, storage, and library management.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
  createTestCharacter,
} from "../setup.js";
import { getPoseLibraryService, getGeneratedImageService } from "../../services/index.js";
import {
  POSE_CATEGORIES,
  EXPRESSION_NAMES,
  type PoseCategory,
  type ExpressionName,
} from "../../services/pose-library.service.js";

describe("PoseLibraryService", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // SAVE POSE
  // ============================================================================

  describe("savePose", () => {
    it("saves pose with required fields", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const pose = await service.savePose({
        projectId: project.id,
        name: "Standing Hero",
        category: "standing",
        skeletonPath: "/poses/standing-hero.png",
      });

      expect(pose.id).toBeDefined();
      expect(pose.name).toBe("Standing Hero");
      expect(pose.category).toBe("standing");
      expect(pose.skeletonPath).toBe("/poses/standing-hero.png");
    });

    it("saves pose with all optional fields", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const pose = await service.savePose({
        projectId: project.id,
        name: "Action Pose",
        description: "Dynamic jumping pose",
        category: "action",
        skeletonPath: "/poses/action.png",
        tags: ["dynamic", "jump", "aerial"],
      });

      expect(pose.description).toBe("Dynamic jumping pose");
      expect(pose.tags).toContain("dynamic");
      expect(pose.tags).toContain("jump");
    });

    it("throws on non-existent project", async () => {
      const service = getPoseLibraryService();

      await expect(
        service.savePose({
          projectId: "nonexistent-id",
          name: "Test",
          category: "standing",
          skeletonPath: "/test.png",
        })
      ).rejects.toThrow("Project not found");
    });

    it("throws on invalid category", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      await expect(
        service.savePose({
          projectId: project.id,
          name: "Test",
          category: "invalid" as PoseCategory,
          skeletonPath: "/test.png",
        })
      ).rejects.toThrow("Invalid pose category");
    });

    it("generates unique IDs", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const pose1 = await service.savePose({
        projectId: project.id,
        name: "Pose 1",
        category: "standing",
        skeletonPath: "/pose1.png",
      });

      const pose2 = await service.savePose({
        projectId: project.id,
        name: "Pose 2",
        category: "standing",
        skeletonPath: "/pose2.png",
      });

      expect(pose1.id).not.toBe(pose2.id);
    });
  });

  // ============================================================================
  // GET POSE
  // ============================================================================

  describe("getPose", () => {
    it("returns pose by ID", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const created = await service.savePose({
        projectId: project.id,
        name: "Test Pose",
        category: "sitting",
        skeletonPath: "/test.png",
      });

      const found = await service.getPoseById(created.id);

      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Test Pose");
    });

    it("returns null for non-existent pose", async () => {
      const service = getPoseLibraryService();

      const result = await service.getPoseById("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // LIST POSES
  // ============================================================================

  describe("listPoses", () => {
    it("returns empty array when no poses", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const poses = await service.listPoses(project.id);

      expect(poses).toEqual([]);
    });

    it("returns all poses for project", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      await service.savePose({
        projectId: project.id,
        name: "Pose 1",
        category: "standing",
        skeletonPath: "/p1.png",
      });
      await service.savePose({
        projectId: project.id,
        name: "Pose 2",
        category: "sitting",
        skeletonPath: "/p2.png",
      });

      const poses = await service.listPoses(project.id);

      expect(poses).toHaveLength(2);
    });

    it("filters by category", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      await service.savePose({
        projectId: project.id,
        name: "Standing",
        category: "standing",
        skeletonPath: "/s.png",
      });
      await service.savePose({
        projectId: project.id,
        name: "Sitting",
        category: "sitting",
        skeletonPath: "/sit.png",
      });
      await service.savePose({
        projectId: project.id,
        name: "Action",
        category: "action",
        skeletonPath: "/a.png",
      });

      const standingPoses = await service.listPoses(project.id, { category: "standing" });

      expect(standingPoses).toHaveLength(1);
      expect(standingPoses[0].name).toBe("Standing");
    });

    it("isolates poses by project", async () => {
      const service = getPoseLibraryService();
      const project1 = await createTestProject("Project 1");
      const project2 = await createTestProject("Project 2");

      await service.savePose({
        projectId: project1.id,
        name: "P1 Pose",
        category: "standing",
        skeletonPath: "/p1.png",
      });
      await service.savePose({
        projectId: project2.id,
        name: "P2 Pose",
        category: "standing",
        skeletonPath: "/p2.png",
      });

      const poses1 = await service.listPoses(project1.id);
      const poses2 = await service.listPoses(project2.id);

      expect(poses1).toHaveLength(1);
      expect(poses2).toHaveLength(1);
      expect(poses1[0].name).toBe("P1 Pose");
      expect(poses2[0].name).toBe("P2 Pose");
    });
  });

  // ============================================================================
  // DELETE POSE
  // ============================================================================

  describe("deletePose", () => {
    it("deletes existing pose", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const pose = await service.savePose({
        projectId: project.id,
        name: "To Delete",
        category: "standing",
        skeletonPath: "/delete.png",
      });

      await service.deletePose(pose.id);

      const found = await service.getPoseById(pose.id);
      expect(found).toBeNull();
    });

    it("throws on non-existent pose", async () => {
      const service = getPoseLibraryService();

      await expect(service.deletePose("nonexistent-id")).rejects.toThrow();
    });
  });

  // ============================================================================
  // SAVE EXPRESSION
  // ============================================================================

  describe("saveExpression", () => {
    it("saves expression with required fields", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");
      const character = await createTestCharacter(project.id, "Hero");

      const expression = await service.saveExpression({
        characterId: character.id,
        name: "happy",
        referencePath: "/expressions/happy.png",
        promptFragment: "smiling happily, joyful expression",
      });

      expect(expression.id).toBeDefined();
      expect(expression.name).toBe("happy");
      expect(expression.characterId).toBe(character.id);
    });

    it("saves expression with description", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");
      const character = await createTestCharacter(project.id, "Hero");

      const expression = await service.saveExpression({
        characterId: character.id,
        name: "smirk",
        description: "Confident half-smile",
        referencePath: "/expressions/smirk.png",
        promptFragment: "smirking confidently",
      });

      expect(expression.description).toBe("Confident half-smile");
    });

    it("throws on non-existent character", async () => {
      const service = getPoseLibraryService();

      await expect(
        service.saveExpression({
          characterId: "nonexistent-id",
          name: "happy",
          referencePath: "/test.png",
          promptFragment: "happy expression",
        })
      ).rejects.toThrow("Character not found");
    });
  });

  // ============================================================================
  // LIST EXPRESSIONS
  // ============================================================================

  describe("listExpressions", () => {
    it("returns empty array when no expressions", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");
      const character = await createTestCharacter(project.id, "Hero");

      const expressions = await service.listExpressions(character.id);

      expect(expressions).toEqual([]);
    });

    it("returns all expressions for character", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");
      const character = await createTestCharacter(project.id, "Hero");

      await service.saveExpression({
        characterId: character.id,
        name: "happy",
        referencePath: "/happy.png",
        promptFragment: "happy expression",
      });
      await service.saveExpression({
        characterId: character.id,
        name: "sad",
        referencePath: "/sad.png",
        promptFragment: "sad expression",
      });

      const expressions = await service.listExpressions(character.id);

      expect(expressions).toHaveLength(2);
    });

    it("isolates expressions by character", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");
      const char1 = await createTestCharacter(project.id, "Hero");
      const char2 = await createTestCharacter(project.id, "Villain");

      await service.saveExpression({
        characterId: char1.id,
        name: "happy",
        referencePath: "/hero-happy.png",
        promptFragment: "happy expression",
      });
      await service.saveExpression({
        characterId: char2.id,
        name: "angry",
        referencePath: "/villain-angry.png",
        promptFragment: "angry expression",
      });

      const heroExpressions = await service.listExpressions(char1.id);
      const villainExpressions = await service.listExpressions(char2.id);

      expect(heroExpressions).toHaveLength(1);
      expect(villainExpressions).toHaveLength(1);
      expect(heroExpressions[0].name).toBe("happy");
      expect(villainExpressions[0].name).toBe("angry");
    });
  });

  // ============================================================================
  // DELETE EXPRESSION
  // ============================================================================

  describe("deleteExpression", () => {
    it("deletes existing expression", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");
      const character = await createTestCharacter(project.id, "Hero");

      const expression = await service.saveExpression({
        characterId: character.id,
        name: "happy",
        referencePath: "/happy.png",
        promptFragment: "happy expression",
      });

      await service.deleteExpression(expression.id);

      const expressions = await service.listExpressions(character.id);
      expect(expressions).toHaveLength(0);
    });
  });

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  describe("constants", () => {
    it("exports all pose categories", () => {
      expect(POSE_CATEGORIES).toContain("standing");
      expect(POSE_CATEGORIES).toContain("sitting");
      expect(POSE_CATEGORIES).toContain("action");
      expect(POSE_CATEGORIES).toContain("lying");
      expect(POSE_CATEGORIES).toContain("kneeling");
      expect(POSE_CATEGORIES).toContain("custom");
    });

    it("exports common expression names", () => {
      expect(EXPRESSION_NAMES).toContain("neutral");
      expect(EXPRESSION_NAMES).toContain("happy");
      expect(EXPRESSION_NAMES).toContain("sad");
      expect(EXPRESSION_NAMES).toContain("angry");
      expect(EXPRESSION_NAMES).toContain("surprised");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles max length pose names", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const maxLengthName = "A".repeat(100);
      const pose = await service.savePose({
        projectId: project.id,
        name: maxLengthName,
        category: "standing",
        skeletonPath: "/test.png",
      });

      expect(pose.name).toBe(maxLengthName);
    });

    it("rejects pose names over 100 characters", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const tooLongName = "A".repeat(101);
      await expect(
        service.savePose({
          projectId: project.id,
          name: tooLongName,
          category: "standing",
          skeletonPath: "/test.png",
        })
      ).rejects.toThrow("Pose name must be 100 characters or less");
    });

    it("handles unicode in pose descriptions", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const pose = await service.savePose({
        projectId: project.id,
        name: "日本語ポーズ",
        description: "アニメスタイルのポーズ 🎨",
        category: "action",
        skeletonPath: "/test.png",
      });

      expect(pose.name).toBe("日本語ポーズ");
      expect(pose.description).toContain("🎨");
    });

    it("handles many tags", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const manyTags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
      const pose = await service.savePose({
        projectId: project.id,
        name: "Tagged Pose",
        category: "standing",
        skeletonPath: "/test.png",
        tags: manyTags,
      });

      expect(pose.tags).toHaveLength(20);
    });

    it("handles concurrent pose saves", async () => {
      const service = getPoseLibraryService();
      const project = await createTestProject("Test");

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.savePose({
          projectId: project.id,
          name: `Pose ${i}`,
          category: "standing",
          skeletonPath: `/pose-${i}.png`,
        })
      );

      const poses = await Promise.all(promises);

      expect(poses).toHaveLength(10);
      const ids = new Set(poses.map((p) => p.id));
      expect(ids.size).toBe(10);
    });
  });
});
