/**
 * CharacterService Unit Tests
 *
 * Comprehensive tests covering CRUD operations, validation, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
} from "../setup.js";
import { getCharacterService, type CharacterService } from "../../services/index.js";

describe("CharacterService", () => {
  let service: CharacterService;
  let projectId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getCharacterService();

    // Create a project for characters
    const project = await createTestProject("Character Test Project");
    projectId = project.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe("create", () => {
    it("creates a character with required fields", async () => {
      const character = await service.create({
        projectId,
        name: "Test Character",
        profile: { species: "fox" },
      });

      expect(character).toBeDefined();
      expect(character.id).toBeDefined();
      expect(character.name).toBe("Test Character");
      expect(character.projectId).toBe(projectId);
      expect(character.profile.species).toBe("fox");
      expect(character.createdAt).toBeInstanceOf(Date);
    });

    it("creates a character with full profile", async () => {
      const character = await service.create({
        projectId,
        name: "Full Character",
        profile: {
          species: "wolf",
          bodyType: "muscular",
          features: ["blue eyes", "gray fur"],
          ageDescriptors: ["young adult"],
          clothing: ["leather jacket"],
          distinguishing: ["scar on left eye"],
        },
      });

      expect(character.profile.species).toBe("wolf");
      expect(character.profile.bodyType).toBe("muscular");
      expect(character.profile.features).toContain("blue eyes");
      expect(character.profile.clothing).toContain("leather jacket");
    });

    it("creates a character with custom prompt fragments", async () => {
      const character = await service.create({
        projectId,
        name: "Prompted",
        profile: { species: "cat" },
        promptFragments: {
          positive: "custom positive prompt",
          negative: "custom negative prompt",
          triggers: ["trigger1", "trigger2"],
        },
      });

      expect(character.promptFragments.positive).toBe("custom positive prompt");
      expect(character.promptFragments.negative).toBe("custom negative prompt");
      expect(character.promptFragments.triggers).toContain("trigger1");
    });

    it("auto-generates positive prompt from profile", async () => {
      const character = await service.create({
        projectId,
        name: "Auto Prompt",
        profile: {
          species: "dragon",
          bodyType: "muscular",
          features: ["red scales", "golden eyes"],
        },
      });

      expect(character.promptFragments.positive).toContain("dragon");
      expect(character.promptFragments.positive).toContain("muscular build");
      expect(character.promptFragments.positive).toContain("red scales");
    });

    it("creates a character with reference images", async () => {
      const character = await service.create({
        projectId,
        name: "Referenced",
        profile: { species: "bear" },
        referenceImages: ["/path/to/image1.png", "/path/to/image2.png"],
      });

      expect(character.referenceImages).toHaveLength(2);
      expect(character.referenceImages).toContain("/path/to/image1.png");
    });

    it("trims whitespace from name", async () => {
      const character = await service.create({
        projectId,
        name: "  Trimmed Name  ",
        profile: { species: "fox" },
      });

      expect(character.name).toBe("Trimmed Name");
    });

    it("throws on missing name", async () => {
      await expect(
        service.create({ projectId, name: "", profile: { species: "fox" } })
      ).rejects.toThrow("Character name is required");
    });

    it("throws on whitespace-only name", async () => {
      await expect(
        service.create({ projectId, name: "   ", profile: { species: "fox" } })
      ).rejects.toThrow("Character name is required");
    });

    it("throws on name exceeding 100 characters", async () => {
      const longName = "a".repeat(101);
      await expect(
        service.create({ projectId, name: longName, profile: { species: "fox" } })
      ).rejects.toThrow("Character name must be 100 characters or less");
    });

    it("allows name with exactly 100 characters", async () => {
      const maxName = "a".repeat(100);
      const character = await service.create({
        projectId,
        name: maxName,
        profile: { species: "fox" },
      });
      expect(character.name).toBe(maxName);
    });

    it("throws on non-existent project", async () => {
      await expect(
        service.create({
          projectId: "nonexistent-project",
          name: "Test",
          profile: { species: "fox" },
        })
      ).rejects.toThrow("Project not found: nonexistent-project");
    });

    it("throws on missing species in profile", async () => {
      await expect(
        service.create({
          projectId,
          name: "No Species",
          profile: { species: "" },
        })
      ).rejects.toThrow("Species is required");
    });

    it("throws on invalid body type", async () => {
      await expect(
        service.create({
          projectId,
          name: "Invalid Body",
          profile: { species: "fox", bodyType: "invalid-type" },
        })
      ).rejects.toThrow("Invalid body type");
    });

    it("accepts all valid body types", async () => {
      const bodyTypes = ["athletic", "slim", "muscular", "shortstack", "tall", "average"];

      for (const bodyType of bodyTypes) {
        const character = await service.create({
          projectId,
          name: `${bodyType} Character`,
          profile: { species: "fox", bodyType },
        });
        expect(character.profile.bodyType).toBe(bodyType);
      }
    });

    it("throws on too many features", async () => {
      const features = Array.from({ length: 51 }, (_, i) => `feature${i}`);
      await expect(
        service.create({
          projectId,
          name: "Too Many Features",
          profile: { species: "fox", features },
        })
      ).rejects.toThrow("Maximum 50 features allowed");
    });
  });

  // ============================================================================
  // GET BY ID TESTS
  // ============================================================================

  describe("getById", () => {
    it("returns character when exists", async () => {
      const created = await service.create({
        projectId,
        name: "Find Me",
        profile: { species: "cat" },
      });
      const found = await service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Find Me");
    });

    it("returns null when not found", async () => {
      const found = await service.getById("nonexistent-id");
      expect(found).toBeNull();
    });

    it("returns null for empty id", async () => {
      const found = await service.getById("");
      expect(found).toBeNull();
    });
  });

  // ============================================================================
  // GET BY PROJECT TESTS
  // ============================================================================

  describe("getByProject", () => {
    it("returns empty array when no characters", async () => {
      const characters = await service.getByProject(projectId);
      expect(characters).toEqual([]);
    });

    it("returns all characters for project", async () => {
      await service.create({ projectId, name: "Char 1", profile: { species: "fox" } });
      await service.create({ projectId, name: "Char 2", profile: { species: "wolf" } });
      await service.create({ projectId, name: "Char 3", profile: { species: "bear" } });

      const characters = await service.getByProject(projectId);
      expect(characters).toHaveLength(3);
    });

    it("orders characters by name", async () => {
      await service.create({ projectId, name: "Zeta", profile: { species: "fox" } });
      await service.create({ projectId, name: "Alpha", profile: { species: "wolf" } });
      await service.create({ projectId, name: "Beta", profile: { species: "bear" } });

      const characters = await service.getByProject(projectId);
      expect(characters[0].name).toBe("Alpha");
      expect(characters[1].name).toBe("Beta");
      expect(characters[2].name).toBe("Zeta");
    });

    it("does not return characters from other projects", async () => {
      const otherProject = await createTestProject("Other Project");

      await service.create({ projectId, name: "My Char", profile: { species: "fox" } });
      await service.create({
        projectId: otherProject.id,
        name: "Other Char",
        profile: { species: "wolf" },
      });

      const characters = await service.getByProject(projectId);
      expect(characters).toHaveLength(1);
      expect(characters[0].name).toBe("My Char");
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe("update", () => {
    it("updates character name", async () => {
      const created = await service.create({
        projectId,
        name: "Original",
        profile: { species: "fox" },
      });
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.name).toBe("Updated");
    });

    it("updates character profile", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox", bodyType: "slim" },
      });
      const updated = await service.update(created.id, {
        profile: { bodyType: "muscular" },
      });

      expect(updated.profile.bodyType).toBe("muscular");
      expect(updated.profile.species).toBe("fox"); // Preserved
    });

    it("updates prompt fragments", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      const updated = await service.update(created.id, {
        promptFragments: { negative: "new negative" },
      });

      expect(updated.promptFragments.negative).toBe("new negative");
    });

    it("updates updatedAt timestamp", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      const originalUpdatedAt = created.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("throws on non-existent character", async () => {
      await expect(service.update("nonexistent-id", { name: "New" })).rejects.toThrow(
        "Character not found: nonexistent-id"
      );
    });

    it("throws on empty name update", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      await expect(service.update(created.id, { name: "" })).rejects.toThrow(
        "Character name is required"
      );
    });

    it("throws on name exceeding limit during update", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      const longName = "a".repeat(101);
      await expect(service.update(created.id, { name: longName })).rejects.toThrow(
        "Character name must be 100 characters or less"
      );
    });

    it("validates profile on update", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      await expect(
        service.update(created.id, { profile: { bodyType: "invalid" } })
      ).rejects.toThrow("Invalid body type");
    });
  });

  // ============================================================================
  // REFERENCE IMAGE TESTS
  // ============================================================================

  describe("addReference", () => {
    it("adds a reference image", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      const updated = await service.addReference(created.id, "/path/to/image.png");

      expect(updated.referenceImages).toContain("/path/to/image.png");
    });

    it("does not duplicate existing reference", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
        referenceImages: ["/existing.png"],
      });
      const updated = await service.addReference(created.id, "/existing.png");

      expect(updated.referenceImages).toHaveLength(1);
    });

    it("throws when adding more than 10 references", async () => {
      const references = Array.from({ length: 10 }, (_, i) => `/image${i}.png`);
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
        referenceImages: references,
      });

      await expect(service.addReference(created.id, "/image10.png")).rejects.toThrow(
        "Maximum 10 reference images allowed"
      );
    });

    it("throws on non-existent character", async () => {
      await expect(service.addReference("nonexistent-id", "/path.png")).rejects.toThrow(
        "Character not found"
      );
    });
  });

  describe("removeReference", () => {
    it("removes a reference image", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
        referenceImages: ["/image1.png", "/image2.png"],
      });
      const updated = await service.removeReference(created.id, "/image1.png");

      expect(updated.referenceImages).toHaveLength(1);
      expect(updated.referenceImages).not.toContain("/image1.png");
      expect(updated.referenceImages).toContain("/image2.png");
    });

    it("handles removing non-existent reference gracefully", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
        referenceImages: ["/existing.png"],
      });
      const updated = await service.removeReference(created.id, "/nonexistent.png");

      expect(updated.referenceImages).toHaveLength(1);
    });
  });

  // ============================================================================
  // LORA TESTS
  // ============================================================================

  describe("setLora", () => {
    it("sets a LoRA for character", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      const updated = await service.setLora(created.id, {
        path: "/loras/character.safetensors",
        strength: 0.8,
        trainingImages: 50,
      });

      expect(updated.lora).toBeDefined();
      expect(updated.lora?.path).toBe("/loras/character.safetensors");
      expect(updated.lora?.strength).toBe(0.8);
      expect(updated.lora?.trainingImages).toBe(50);
      expect(updated.lora?.trainedAt).toBeDefined();
    });

    it("uses default strength if not provided", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      const updated = await service.setLora(created.id, {
        path: "/loras/character.safetensors",
        trainingImages: 50,
      });

      expect(updated.lora?.strength).toBe(0.7);
    });

    it("throws on non-existent character", async () => {
      await expect(
        service.setLora("nonexistent-id", {
          path: "/loras/test.safetensors",
          trainingImages: 10,
        })
      ).rejects.toThrow("Character not found");
    });
  });

  describe("clearLora", () => {
    it("clears the LoRA", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      await service.setLora(created.id, {
        path: "/loras/character.safetensors",
        trainingImages: 50,
      });
      const updated = await service.clearLora(created.id);

      expect(updated.lora).toBeNull();
    });

    it("throws on non-existent character", async () => {
      await expect(service.clearLora("nonexistent-id")).rejects.toThrow("Character not found");
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe("delete", () => {
    it("deletes existing character", async () => {
      const created = await service.create({
        projectId,
        name: "To Delete",
        profile: { species: "fox" },
      });
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("throws on non-existent character", async () => {
      await expect(service.delete("nonexistent-id")).rejects.toThrow(
        "Character not found: nonexistent-id"
      );
    });

    it("removes character from project list after deletion", async () => {
      const c1 = await service.create({ projectId, name: "Keep", profile: { species: "fox" } });
      const c2 = await service.create({ projectId, name: "Delete", profile: { species: "wolf" } });

      await service.delete(c2.id);

      const characters = await service.getByProject(projectId);
      expect(characters).toHaveLength(1);
      expect(characters[0].id).toBe(c1.id);
    });
  });

  // ============================================================================
  // GENERATE PROMPT FROM PROFILE TESTS
  // ============================================================================

  describe("generatePromptFromProfile", () => {
    it("generates prompt from species", () => {
      const prompt = service.generatePromptFromProfile({
        species: "fox",
        bodyType: "average",
        features: [],
        ageDescriptors: [],
        clothing: [],
        distinguishing: [],
      });

      expect(prompt).toBe("fox");
    });

    it("includes body type when not average", () => {
      const prompt = service.generatePromptFromProfile({
        species: "wolf",
        bodyType: "muscular",
        features: [],
        ageDescriptors: [],
        clothing: [],
        distinguishing: [],
      });

      expect(prompt).toContain("wolf");
      expect(prompt).toContain("muscular build");
    });

    it("includes all profile elements", () => {
      const prompt = service.generatePromptFromProfile({
        species: "dragon",
        bodyType: "tall",
        features: ["blue scales", "golden horns"],
        ageDescriptors: ["ancient"],
        clothing: ["royal armor"],
        distinguishing: ["scar on snout"],
      });

      expect(prompt).toContain("dragon");
      expect(prompt).toContain("tall build");
      expect(prompt).toContain("blue scales");
      expect(prompt).toContain("golden horns");
      expect(prompt).toContain("ancient");
      expect(prompt).toContain("royal armor");
      expect(prompt).toContain("scar on snout");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unicode characters in name and profile", async () => {
      const character = await service.create({
        projectId,
        name: "Character Name",
        profile: { species: "Fox Species", features: ["Feature 1"] },
      });

      expect(character.name).toBe("Character Name");
      expect(character.profile.species).toBe("Fox Species");
    });

    it("preserves createdAt on update", async () => {
      const created = await service.create({
        projectId,
        name: "Test",
        profile: { species: "fox" },
      });
      const originalCreatedAt = created.createdAt;

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("allows multiple characters with same name", async () => {
      const c1 = await service.create({
        projectId,
        name: "Duplicate",
        profile: { species: "fox" },
      });
      const c2 = await service.create({
        projectId,
        name: "Duplicate",
        profile: { species: "wolf" },
      });

      expect(c1.id).not.toBe(c2.id);
      expect(c1.name).toBe(c2.name);
    });
  });
});
