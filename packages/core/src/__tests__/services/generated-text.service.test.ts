/**
 * GeneratedTextService Unit Tests
 *
 * Tests for the generated text storage and management service.
 * Covers CRUD operations, regeneration, versioning, and batch operations.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getGeneratedTextService,
  resetGeneratedTextService,
} from "../../services/generated-text.service.js";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import type {
  GeneratedTextType,
  GeneratedTextStatus,
} from "../../db/schema.js";

describe("GeneratedTextService", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // Helper to get fresh service instance
  const getService = () => getGeneratedTextService();

  // ============================================================================
  // SINGLETON MANAGEMENT TESTS
  // ============================================================================

  describe("Singleton Management", () => {
    it("returns the same instance from getGeneratedTextService", () => {
      const service1 = getGeneratedTextService();
      const service2 = getGeneratedTextService();
      expect(service1).toBe(service2);
    });

    it("resetGeneratedTextService clears the singleton", () => {
      const service1 = getGeneratedTextService();
      resetGeneratedTextService();
      const service2 = getGeneratedTextService();
      expect(service1).not.toBe(service2);
    });
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe("create", () => {
    it("creates a generated text with minimal fields", async () => {
      const text = await getService().create({
        text: "Test generated text content",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      expect(text.id).toBeDefined();
      expect(text.text).toBe("Test generated text content");
      expect(text.textType).toBe("raw");
      expect(text.provider).toBe("ollama");
      expect(text.model).toBe("llama3.2");
      expect(text.status).toBe("active");
      expect(text.isEdited).toBe(false);
    });

    it("creates a generated text with all fields", async () => {
      const text = await getService().create({
        text: "Full text content",
        textType: "panel_description",
        provider: "claude",
        model: "claude-sonnet-4-20250514",
        tokensUsed: 150,
        inputTokens: 50,
        outputTokens: 100,
        prompt: "Describe a dramatic scene",
        systemPrompt: "You are a comic writer",
        temperature: 0.7,
        maxTokens: 500,
        metadata: {
          panelContext: {
            setting: "A dark alley",
            mood: "tense",
          },
          tags: ["test", "demo"],
        },
      });

      expect(text.text).toBe("Full text content");
      expect(text.textType).toBe("panel_description");
      expect(text.tokensUsed).toBe(150);
      expect(text.inputTokens).toBe(50);
      expect(text.outputTokens).toBe(100);
      expect(text.prompt).toBe("Describe a dramatic scene");
      expect(text.systemPrompt).toBe("You are a comic writer");
      expect(text.temperature).toBe(0.7);
      expect(text.maxTokens).toBe(500);
      expect((text.metadata as { tags?: string[] })?.tags).toContain("test");
    });

    it("creates texts of different types", async () => {
      const types: GeneratedTextType[] = [
        "panel_description",
        "dialogue",
        "caption",
        "narration",
        "refinement",
        "raw",
        "custom",
      ];

      for (const textType of types) {
        const text = await getService().create({
          text: `Text of type ${textType}`,
          textType,
          provider: "ollama",
          model: "llama3.2",
        });
        expect(text.textType).toBe(textType);
      }
    });
  });

  // ============================================================================
  // READ TESTS
  // ============================================================================

  describe("getById", () => {
    it("returns the text by ID", async () => {
      const created = await getService().create({
        text: "Find me",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      const found = await getService().getById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.text).toBe("Find me");
    });

    it("returns null for non-existent ID", async () => {
      const found = await getService().getById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      // Create test data
      await getService().create({
        text: "Panel description 1",
        textType: "panel_description",
        provider: "ollama",
        model: "llama3.2",
      });
      await getService().create({
        text: "Dialogue 1",
        textType: "dialogue",
        provider: "claude",
        model: "claude-sonnet-4-20250514",
      });
      await getService().create({
        text: "Archived text",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });
      // Archive the third one
      const texts = await getService().list();
      if (texts[2]) {
        await getService().archive(texts[2].id);
      }
    });

    it("lists all texts without filters", async () => {
      const texts = await getService().list();
      expect(texts.length).toBeGreaterThanOrEqual(3);
    });

    it("filters by textType", async () => {
      const texts = await getService().list({ textType: "panel_description" });
      expect(texts.length).toBeGreaterThanOrEqual(1);
      texts.forEach((t) => expect(t.textType).toBe("panel_description"));
    });

    it("filters by status", async () => {
      const activeTexts = await getService().list({ status: "active" });
      const archivedTexts = await getService().list({ status: "archived" });

      activeTexts.forEach((t) => expect(t.status).toBe("active"));
      archivedTexts.forEach((t) => expect(t.status).toBe("archived"));
    });

    it("respects limit", async () => {
      const texts = await getService().list({ limit: 2 });
      expect(texts.length).toBeLessThanOrEqual(2);
    });

    it("respects offset", async () => {
      const allTexts = await getService().list();
      const offsetTexts = await getService().list({ offset: 1 });

      if (allTexts.length > 1) {
        expect(offsetTexts.length).toBe(allTexts.length - 1);
      }
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe("update", () => {
    it("updates text content and marks as edited", async () => {
      const created = await getService().create({
        text: "Original text",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      const updated = await getService().update(created.id, {
        text: "Modified text",
      });

      expect(updated.text).toBe("Modified text");
      expect(updated.isEdited).toBe(true);
      expect(updated.editedAt).not.toBeNull();
      expect(updated.originalText).toBe("Original text");
    });

    it("updates textType without marking as edited", async () => {
      const created = await getService().create({
        text: "Some text",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      const updated = await getService().update(created.id, {
        textType: "custom",
      });

      expect(updated.textType).toBe("custom");
      expect(updated.isEdited).toBe(false);
    });

    it("updates status", async () => {
      const created = await getService().create({
        text: "Some text",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      const updated = await getService().update(created.id, {
        status: "archived",
      });

      expect(updated.status).toBe("archived");
    });

    it("updates metadata", async () => {
      const created = await getService().create({
        text: "Some text",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
        metadata: { tags: ["original"] },
      });

      const updated = await getService().update(created.id, {
        metadata: { tags: ["updated", "new"] },
      });

      expect((updated.metadata as { tags?: string[] })?.tags).toContain("updated");
    });

    it("throws error for non-existent ID", async () => {
      await expect(
        getService().update("non-existent", { text: "new" })
      ).rejects.toThrow("Generated text not found");
    });

    it("preserves original text on subsequent edits", async () => {
      const created = await getService().create({
        text: "Original",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      // First edit
      await getService().update(created.id, { text: "First edit" });

      // Second edit
      const secondEdit = await getService().update(created.id, {
        text: "Second edit",
      });

      // Original should still be preserved
      expect(secondEdit.originalText).toBe("Original");
      expect(secondEdit.text).toBe("Second edit");
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe("delete", () => {
    it("deletes a text permanently", async () => {
      const created = await getService().create({
        text: "Delete me",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      await getService().delete(created.id);

      const found = await getService().getById(created.id);
      expect(found).toBeNull();
    });
  });

  describe("archive", () => {
    it("archives a text (soft delete)", async () => {
      const created = await getService().create({
        text: "Archive me",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      const archived = await getService().archive(created.id);

      expect(archived.status).toBe("archived");

      // Should still be retrievable
      const found = await getService().getById(created.id);
      expect(found).not.toBeNull();
      expect(found!.status).toBe("archived");
    });
  });

  // ============================================================================
  // REVERT TESTS
  // ============================================================================

  describe("revertToOriginal", () => {
    it("reverts edited text to original", async () => {
      const created = await getService().create({
        text: "Original content",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      // Edit it
      await getService().update(created.id, { text: "Edited content" });

      // Revert
      const reverted = await getService().revertToOriginal(created.id);

      expect(reverted.text).toBe("Original content");
      expect(reverted.isEdited).toBe(false);
      expect(reverted.originalText).toBeNull();
    });

    it("throws error if no original text exists", async () => {
      const created = await getService().create({
        text: "Never edited",
        textType: "raw",
        provider: "ollama",
        model: "llama3.2",
      });

      await expect(getService().revertToOriginal(created.id)).rejects.toThrow(
        "No original text to revert to"
      );
    });
  });

  // ============================================================================
  // BATCH OPERATIONS TESTS
  // ============================================================================

  describe("createBatch", () => {
    it("creates multiple texts at once", async () => {
      const results = await getService().createBatch([
        {
          text: "Batch text 1",
          textType: "raw",
          provider: "ollama",
          model: "llama3.2",
        },
        {
          text: "Batch text 2",
          textType: "dialogue",
          provider: "claude",
          model: "claude-sonnet-4-20250514",
        },
      ]);

      expect(results.length).toBe(2);
      expect(results[0].text).toBe("Batch text 1");
      expect(results[1].text).toBe("Batch text 2");
    });

    it("returns empty array for empty input", async () => {
      const results = await getService().createBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe("archiveBatch", () => {
    it("archives multiple texts", async () => {
      const texts = await getService().createBatch([
        {
          text: "Archive batch 1",
          textType: "raw",
          provider: "ollama",
          model: "llama3.2",
        },
        {
          text: "Archive batch 2",
          textType: "raw",
          provider: "ollama",
          model: "llama3.2",
        },
      ]);

      const ids = texts.map((t) => t.id);
      const count = await getService().archiveBatch(ids);

      expect(count).toBe(2);

      // Verify all are archived
      for (const id of ids) {
        const found = await getService().getById(id);
        expect(found!.status).toBe("archived");
      }
    });

    it("returns 0 for empty array", async () => {
      const count = await getService().archiveBatch([]);
      expect(count).toBe(0);
    });
  });

  describe("deleteBatch", () => {
    it("deletes multiple texts", async () => {
      const texts = await getService().createBatch([
        {
          text: "Delete batch 1",
          textType: "raw",
          provider: "ollama",
          model: "llama3.2",
        },
        {
          text: "Delete batch 2",
          textType: "raw",
          provider: "ollama",
          model: "llama3.2",
        },
      ]);

      const ids = texts.map((t) => t.id);
      const count = await getService().deleteBatch(ids);

      expect(count).toBe(2);

      // Verify all are deleted
      for (const id of ids) {
        const found = await getService().getById(id);
        expect(found).toBeNull();
      }
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe("getStats", () => {
    beforeEach(async () => {
      // Create test data with various types and providers
      await getService().createBatch([
        {
          text: "Panel desc",
          textType: "panel_description",
          provider: "ollama",
          model: "llama3.2",
          tokensUsed: 100,
        },
        {
          text: "Dialogue",
          textType: "dialogue",
          provider: "claude",
          model: "claude-sonnet-4-20250514",
          tokensUsed: 200,
        },
        {
          text: "Raw",
          textType: "raw",
          provider: "ollama",
          model: "llama3.2",
          tokensUsed: 50,
        },
      ]);

      // Edit one to test editedCount
      const all = await getService().list();
      if (all[0]) {
        await getService().update(all[0].id, { text: "Edited panel desc" });
      }
    });

    it("returns complete statistics", async () => {
      const stats = await getService().getStats();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.byProvider).toBeDefined();
      expect(stats.totalTokens).toBeGreaterThanOrEqual(350);
      expect(stats.editedCount).toBeGreaterThanOrEqual(1);
    });

    it("counts by type", async () => {
      const stats = await getService().getStats();

      expect(stats.byType.panel_description).toBeGreaterThanOrEqual(1);
      expect(stats.byType.dialogue).toBeGreaterThanOrEqual(1);
      expect(stats.byType.raw).toBeGreaterThanOrEqual(1);
    });

    it("counts by provider", async () => {
      const stats = await getService().getStats();

      expect(stats.byProvider.ollama).toBeGreaterThanOrEqual(2);
      expect(stats.byProvider.claude).toBeGreaterThanOrEqual(1);
    });
  });
});
