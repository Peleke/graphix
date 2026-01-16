/**
 * Contract tests for character MCP tools
 *
 * Tests input schema validation and output structure for:
 * - character_create
 * - character_get
 * - character_list
 * - character_update
 * - character_add_reference
 * - character_remove_reference
 * - character_set_lora
 * - character_clear_lora
 * - character_delete
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleToolCall } from "../../mcp/tools/index.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
} from "@graphix/core/testing";

describe("character tools contract", () => {
  let projectId: string;

  beforeEach(async () => {
    setupTestDatabase();
    const project = await createTestProject();
    projectId = project.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("character_create", () => {
    it("accepts valid input with required fields", async () => {
      const result = await handleToolCall("character_create", {
        projectId,
        name: "Alice",
        species: "otter",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("character");
      expect((result as any).character).toHaveProperty("id");
      expect((result as any).character).toHaveProperty("name", "Alice");
    });

    it("accepts valid input with all optional fields", async () => {
      const result = await handleToolCall("character_create", {
        projectId,
        name: "Bob",
        species: "wolf",
        bodyType: "muscular",
        features: ["gray fur", "yellow eyes", "scar on cheek"],
        positivePrompt: "a muscular gray wolf with yellow eyes",
        negativePrompt: "human, hairless",
        triggers: ["boblora", "wolfchar"],
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).character.name).toBe("Bob");
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("character_create", {
        name: "Test",
        species: "cat",
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing name", async () => {
      const result = await handleToolCall("character_create", {
        projectId,
        species: "cat",
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing species", async () => {
      const result = await handleToolCall("character_create", {
        projectId,
        name: "Test",
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("creates unique character IDs", async () => {
      const result1 = await handleToolCall("character_create", {
        projectId,
        name: "Char1",
        species: "otter",
      });
      const result2 = await handleToolCall("character_create", {
        projectId,
        name: "Char2",
        species: "wolf",
      });

      expect((result1 as any).character.id).not.toBe((result2 as any).character.id);
    });
  });

  describe("character_get", () => {
    it("returns success and character for valid ID", async () => {
      const created = await handleToolCall("character_create", {
        projectId,
        name: "Alice",
        species: "otter",
      });
      const characterId = (created as any).character.id;

      const result = await handleToolCall("character_get", { characterId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("character");
      expect((result as any).character.id).toBe(characterId);
    });

    it("returns success false for non-existent ID", async () => {
      const result = await handleToolCall("character_get", {
        characterId: "non-existent-id",
      });

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("character_get", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("character_list", () => {
    it("returns empty list when no characters exist", async () => {
      const result = await handleToolCall("character_list", { projectId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("characters");
      expect(result).toHaveProperty("count", 0);
      expect((result as any).characters).toEqual([]);
    });

    it("returns all characters in project", async () => {
      await handleToolCall("character_create", {
        projectId,
        name: "Alice",
        species: "otter",
      });
      await handleToolCall("character_create", {
        projectId,
        name: "Bob",
        species: "wolf",
      });

      const result = await handleToolCall("character_list", { projectId });

      expect(result).toHaveProperty("success", true);
      expect((result as any).characters).toHaveLength(2);
      expect((result as any).count).toBe(2);
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("character_list", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("character_update", () => {
    let characterId: string;

    beforeEach(async () => {
      const created = await handleToolCall("character_create", {
        projectId,
        name: "Original",
        species: "otter",
      });
      characterId = (created as any).character.id;
    });

    it("updates character name successfully", async () => {
      const result = await handleToolCall("character_update", {
        characterId,
        name: "Updated Name",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).character.name).toBe("Updated Name");
    });

    it("updates character species successfully", async () => {
      const result = await handleToolCall("character_update", {
        characterId,
        species: "wolf",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("updates body type with valid enum value", async () => {
      const result = await handleToolCall("character_update", {
        characterId,
        bodyType: "athletic",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("updates features array", async () => {
      const result = await handleToolCall("character_update", {
        characterId,
        features: ["brown fur", "green eyes"],
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("character_update", { name: "New Name" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("character_add_reference", () => {
    let characterId: string;

    beforeEach(async () => {
      const created = await handleToolCall("character_create", {
        projectId,
        name: "Test",
        species: "otter",
      });
      characterId = (created as any).character.id;
    });

    it("adds reference image successfully", async () => {
      const result = await handleToolCall("character_add_reference", {
        characterId,
        imagePath: "/path/to/reference.png",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("character");
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("character_add_reference", {
        imagePath: "/path/to/image.png",
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing imagePath", async () => {
      const result = await handleToolCall("character_add_reference", { characterId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("character_remove_reference", () => {
    let characterId: string;

    beforeEach(async () => {
      const created = await handleToolCall("character_create", {
        projectId,
        name: "Test",
        species: "otter",
      });
      characterId = (created as any).character.id;
      await handleToolCall("character_add_reference", {
        characterId,
        imagePath: "/path/to/reference.png",
      });
    });

    it("removes reference image successfully", async () => {
      const result = await handleToolCall("character_remove_reference", {
        characterId,
        imagePath: "/path/to/reference.png",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("character_remove_reference", {
        imagePath: "/path/to/image.png",
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing imagePath", async () => {
      const result = await handleToolCall("character_remove_reference", { characterId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("character_set_lora", () => {
    let characterId: string;

    beforeEach(async () => {
      const created = await handleToolCall("character_create", {
        projectId,
        name: "Test",
        species: "otter",
      });
      characterId = (created as any).character.id;
    });

    it("sets LoRA with required fields", async () => {
      const result = await handleToolCall("character_set_lora", {
        characterId,
        loraPath: "/path/to/character.safetensors",
        trainingImages: 50,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("character");
    });

    it("sets LoRA with all optional fields", async () => {
      const result = await handleToolCall("character_set_lora", {
        characterId,
        loraPath: "/path/to/character.safetensors",
        trainingImages: 50,
        strength: 0.8,
        strengthClip: 0.7,
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("character_set_lora", {
        loraPath: "/path/to/lora.safetensors",
        trainingImages: 50,
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing loraPath", async () => {
      const result = await handleToolCall("character_set_lora", {
        characterId,
        trainingImages: 50,
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing trainingImages", async () => {
      const result = await handleToolCall("character_set_lora", {
        characterId,
        loraPath: "/path/to/lora.safetensors",
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("character_clear_lora", () => {
    let characterId: string;

    beforeEach(async () => {
      const created = await handleToolCall("character_create", {
        projectId,
        name: "Test",
        species: "otter",
      });
      characterId = (created as any).character.id;
    });

    it("clears LoRA successfully", async () => {
      const result = await handleToolCall("character_clear_lora", {
        characterId,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("character");
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("character_clear_lora", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("character_delete", () => {
    it("deletes character successfully", async () => {
      const created = await handleToolCall("character_create", {
        projectId,
        name: "To Delete",
        species: "otter",
      });
      const characterId = (created as any).character.id;

      const result = await handleToolCall("character_delete", { characterId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message");

      // Verify deletion
      const getResult = await handleToolCall("character_get", { characterId });
      expect(getResult).toHaveProperty("success", false);
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("character_delete", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });
});
