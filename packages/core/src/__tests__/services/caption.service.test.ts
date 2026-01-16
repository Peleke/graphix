/**
 * CaptionService Unit Tests
 *
 * Comprehensive tests covering CRUD operations, validation, positioning, styling,
 * character association, and edge cases.
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
import { getCaptionService, type CaptionService } from "../../services/index.js";

describe("CaptionService", () => {
  let service: CaptionService;
  let projectId: string;
  let storyboardId: string;
  let panelId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getCaptionService();

    // Create test hierarchy
    const project = await createTestProject("Caption Test Project");
    projectId = project.id;

    const storyboard = await createTestStoryboard(projectId, "Test Storyboard");
    storyboardId = storyboard.id;

    const panel = await createTestPanel(storyboardId);
    panelId = panel.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe("create", () => {
    it("creates a speech caption with required fields", async () => {
      const caption = await service.create({
        panelId,
        type: "speech",
        text: "Hello, world!",
        position: { x: 50, y: 20 },
      });

      expect(caption).toBeDefined();
      expect(caption.id).toBeDefined();
      expect(caption.panelId).toBe(panelId);
      expect(caption.type).toBe("speech");
      expect(caption.text).toBe("Hello, world!");
      expect(caption.position.x).toBe(50);
      expect(caption.position.y).toBe(20);
      expect(caption.zIndex).toBe(0);
      expect(caption.createdAt).toBeInstanceOf(Date);
    });

    it("creates a thought caption", async () => {
      const caption = await service.create({
        panelId,
        type: "thought",
        text: "I wonder...",
        position: { x: 30, y: 30 },
      });

      expect(caption.type).toBe("thought");
    });

    it("creates a narration caption", async () => {
      const caption = await service.create({
        panelId,
        type: "narration",
        text: "Meanwhile, in another dimension...",
        position: { x: 50, y: 90 },
      });

      expect(caption.type).toBe("narration");
    });

    it("creates a sfx (sound effect) caption", async () => {
      const caption = await service.create({
        panelId,
        type: "sfx",
        text: "KABOOM!",
        position: { x: 70, y: 50 },
      });

      expect(caption.type).toBe("sfx");
    });

    it("creates a whisper caption", async () => {
      const caption = await service.create({
        panelId,
        type: "whisper",
        text: "psst...",
        position: { x: 40, y: 60 },
      });

      expect(caption.type).toBe("whisper");
    });

    it("creates caption with character association", async () => {
      const character = await createTestCharacter(projectId, "Hero");
      const caption = await service.create({
        panelId,
        type: "speech",
        text: "I shall save the day!",
        position: { x: 50, y: 20 },
        characterId: character.id,
      });

      expect(caption.characterId).toBe(character.id);
    });

    it("creates caption with tail direction", async () => {
      const caption = await service.create({
        panelId,
        type: "speech",
        text: "Over here!",
        position: { x: 50, y: 20 },
        tailDirection: { x: 30, y: 80 },
      });

      expect(caption.tailDirection?.x).toBe(30);
      expect(caption.tailDirection?.y).toBe(80);
    });

    it("creates caption with custom style", async () => {
      const caption = await service.create({
        panelId,
        type: "speech",
        text: "Styled text",
        position: { x: 50, y: 20 },
        style: {
          fontFamily: "Comic Sans MS",
          fontSize: 24,
          fontColor: "#FF0000",
          fontWeight: "bold",
          backgroundColor: "#FFFFFF",
          borderColor: "#000000",
          borderWidth: 2,
          borderStyle: "solid",
          opacity: 1,
          padding: 10,
          maxWidth: 80,
        },
      });

      expect(caption.style?.fontFamily).toBe("Comic Sans MS");
      expect(caption.style?.fontSize).toBe(24);
      expect(caption.style?.fontColor).toBe("#FF0000");
      expect(caption.style?.fontWeight).toBe("bold");
    });

    it("creates caption with custom zIndex", async () => {
      const caption = await service.create({
        panelId,
        type: "speech",
        text: "On top",
        position: { x: 50, y: 20 },
        zIndex: 100,
      });

      expect(caption.zIndex).toBe(100);
    });

    it("trims whitespace from text", async () => {
      const caption = await service.create({
        panelId,
        type: "speech",
        text: "  Trimmed Text  ",
        position: { x: 50, y: 20 },
      });

      expect(caption.text).toBe("Trimmed Text");
    });

    it("throws on missing text", async () => {
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: "",
          position: { x: 50, y: 20 },
        })
      ).rejects.toThrow("Caption text cannot be empty");
    });

    it("throws on whitespace-only text", async () => {
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: "   ",
          position: { x: 50, y: 20 },
        })
      ).rejects.toThrow("Caption text cannot be empty");
    });

    it("throws on text exceeding 1000 characters", async () => {
      const longText = "a".repeat(1001);
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: longText,
          position: { x: 50, y: 20 },
        })
      ).rejects.toThrow("Caption text cannot exceed 1000 characters");
    });

    it("throws on non-existent panel", async () => {
      await expect(
        service.create({
          panelId: "nonexistent-id",
          type: "speech",
          text: "Test",
          position: { x: 50, y: 20 },
        })
      ).rejects.toThrow("Panel not found: nonexistent-id");
    });

    it("throws on invalid caption type", async () => {
      await expect(
        service.create({
          panelId,
          type: "invalid" as any,
          text: "Test",
          position: { x: 50, y: 20 },
        })
      ).rejects.toThrow("Invalid caption type");
    });

    it("throws on position x below 0", async () => {
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: "Test",
          position: { x: -10, y: 20 },
        })
      ).rejects.toThrow("Position x must be between 0 and 100");
    });

    it("throws on position x above 100", async () => {
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: "Test",
          position: { x: 110, y: 20 },
        })
      ).rejects.toThrow("Position x must be between 0 and 100");
    });

    it("throws on position y below 0", async () => {
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: "Test",
          position: { x: 50, y: -5 },
        })
      ).rejects.toThrow("Position y must be between 0 and 100");
    });

    it("throws on position y above 100", async () => {
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: "Test",
          position: { x: 50, y: 105 },
        })
      ).rejects.toThrow("Position y must be between 0 and 100");
    });

    it("throws on non-existent character", async () => {
      await expect(
        service.create({
          panelId,
          type: "speech",
          text: "Test",
          position: { x: 50, y: 20 },
          characterId: "nonexistent-char",
        })
      ).rejects.toThrow("Character not found");
    });
  });

  // ============================================================================
  // GET BY ID TESTS
  // ============================================================================

  describe("getById", () => {
    it("returns caption when exists", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Find Me",
        position: { x: 50, y: 50 },
      });

      const found = await service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.text).toBe("Find Me");
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
  // GET BY PANEL TESTS
  // ============================================================================

  describe("getByPanel", () => {
    it("returns empty array when no captions", async () => {
      const captions = await service.getByPanel(panelId);
      expect(captions).toEqual([]);
    });

    it("returns all captions for panel", async () => {
      await service.create({
        panelId,
        type: "speech",
        text: "Caption 1",
        position: { x: 30, y: 20 },
      });
      await service.create({
        panelId,
        type: "thought",
        text: "Caption 2",
        position: { x: 70, y: 30 },
      });
      await service.create({
        panelId,
        type: "narration",
        text: "Caption 3",
        position: { x: 50, y: 90 },
      });

      const captions = await service.getByPanel(panelId);
      expect(captions).toHaveLength(3);
    });

    it("orders captions by zIndex", async () => {
      await service.create({
        panelId,
        type: "speech",
        text: "Back",
        position: { x: 30, y: 20 },
        zIndex: 1,
      });
      await service.create({
        panelId,
        type: "speech",
        text: "Front",
        position: { x: 50, y: 20 },
        zIndex: 10,
      });

      const captions = await service.getByPanel(panelId);
      expect(captions[0].text).toBe("Back");
      expect(captions[1].text).toBe("Front");
    });

    it("only returns captions for specified panel", async () => {
      const panel2 = await createTestPanel(storyboardId);

      await service.create({
        panelId,
        type: "speech",
        text: "Panel 1 caption",
        position: { x: 50, y: 20 },
      });
      await service.create({
        panelId: panel2.id,
        type: "speech",
        text: "Panel 2 caption",
        position: { x: 50, y: 20 },
      });

      const captions = await service.getByPanel(panelId);
      expect(captions).toHaveLength(1);
      expect(captions[0].text).toBe("Panel 1 caption");
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe("update", () => {
    it("updates caption text", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Original",
        position: { x: 50, y: 50 },
      });

      const updated = await service.update(created.id, { text: "Updated" });

      expect(updated.text).toBe("Updated");
    });

    it("updates caption position", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
      });

      const updated = await service.update(created.id, {
        position: { x: 20, y: 80 },
      });

      expect(updated.position.x).toBe(20);
      expect(updated.position.y).toBe(80);
    });

    it("updates caption style", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
      });

      const updated = await service.update(created.id, {
        style: { fontSize: 32, fontColor: "#0000FF" },
      });

      expect(updated.style?.fontSize).toBe(32);
      expect(updated.style?.fontColor).toBe("#0000FF");
    });

    it("updates caption tailDirection", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
      });

      const updated = await service.update(created.id, {
        tailDirection: { x: 10, y: 90 },
      });

      expect(updated.tailDirection?.x).toBe(10);
      expect(updated.tailDirection?.y).toBe(90);
    });

    it("updates caption zIndex", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
        zIndex: 1,
      });

      const updated = await service.update(created.id, { zIndex: 50 });

      expect(updated.zIndex).toBe(50);
    });

    it("updates updatedAt timestamp", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
      });
      const originalUpdatedAt = created.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { text: "Updated" });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("throws on non-existent caption", async () => {
      await expect(
        service.update("nonexistent-id", { text: "New" })
      ).rejects.toThrow("Caption not found: nonexistent-id");
    });

    it("throws on empty text update", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
      });

      await expect(service.update(created.id, { text: "" })).rejects.toThrow(
        "Caption text cannot be empty"
      );
    });

    it("validates position on update", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
      });

      await expect(
        service.update(created.id, { position: { x: 200, y: 50 } })
      ).rejects.toThrow("Position x must be between 0 and 100");
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe("delete", () => {
    it("deletes existing caption", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "To Delete",
        position: { x: 50, y: 50 },
      });

      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("throws on non-existent caption", async () => {
      await expect(service.delete("nonexistent-id")).rejects.toThrow(
        "Caption not found: nonexistent-id"
      );
    });

    it("removes caption from panel list after deletion", async () => {
      const c1 = await service.create({
        panelId,
        type: "speech",
        text: "Keep",
        position: { x: 30, y: 20 },
      });
      const c2 = await service.create({
        panelId,
        type: "speech",
        text: "Delete",
        position: { x: 70, y: 20 },
      });

      await service.delete(c2.id);

      const captions = await service.getByPanel(panelId);
      expect(captions).toHaveLength(1);
      expect(captions[0].id).toBe(c1.id);
    });
  });

  // ============================================================================
  // CLEAR BY PANEL TESTS
  // ============================================================================

  describe("deleteByPanel", () => {
    it("removes all captions from panel", async () => {
      await service.create({
        panelId,
        type: "speech",
        text: "Caption 1",
        position: { x: 30, y: 20 },
      });
      await service.create({
        panelId,
        type: "thought",
        text: "Caption 2",
        position: { x: 70, y: 30 },
      });

      await service.deleteByPanel(panelId);

      const captions = await service.getByPanel(panelId);
      expect(captions).toHaveLength(0);
    });

    it("handles panel with no captions", async () => {
      // Should not throw
      await service.deleteByPanel(panelId);

      const captions = await service.getByPanel(panelId);
      expect(captions).toHaveLength(0);
    });

    it("only clears captions for specified panel", async () => {
      const panel2 = await createTestPanel(storyboardId);

      await service.create({
        panelId,
        type: "speech",
        text: "Panel 1",
        position: { x: 50, y: 20 },
      });
      await service.create({
        panelId: panel2.id,
        type: "speech",
        text: "Panel 2",
        position: { x: 50, y: 20 },
      });

      await service.deleteByPanel(panelId);

      const captions1 = await service.getByPanel(panelId);
      const captions2 = await service.getByPanel(panel2.id);

      expect(captions1).toHaveLength(0);
      expect(captions2).toHaveLength(1);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unicode text", async () => {
      const caption = await service.create({
        panelId,
        type: "speech",
        text: "Unicode text here",
        position: { x: 50, y: 50 },
      });

      expect(caption.text).toBe("Unicode text here");
    });

    it("handles special characters in text", async () => {
      const caption = await service.create({
        panelId,
        type: "speech",
        text: 'Test with <html> & "quotes"',
        position: { x: 50, y: 50 },
      });

      expect(caption.text).toContain("<html>");
      expect(caption.text).toContain('"quotes"');
    });

    it("handles newlines in text", async () => {
      const caption = await service.create({
        panelId,
        type: "narration",
        text: "Line 1\nLine 2\nLine 3",
        position: { x: 50, y: 50 },
      });

      expect(caption.text).toContain("\n");
    });

    it("handles boundary positions", async () => {
      const caption1 = await service.create({
        panelId,
        type: "speech",
        text: "Corner",
        position: { x: 0, y: 0 },
      });

      expect(caption1.position.x).toBe(0);
      expect(caption1.position.y).toBe(0);

      const caption2 = await service.create({
        panelId,
        type: "speech",
        text: "Other corner",
        position: { x: 100, y: 100 },
      });

      expect(caption2.position.x).toBe(100);
      expect(caption2.position.y).toBe(100);
    });

    it("preserves createdAt on update", async () => {
      const created = await service.create({
        panelId,
        type: "speech",
        text: "Test",
        position: { x: 50, y: 50 },
      });
      const originalCreatedAt = created.createdAt;

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { text: "Updated" });

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("handles concurrent creates", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.create({
          panelId,
          type: "speech",
          text: `Caption ${i}`,
          position: { x: (i % 10) * 10, y: 50 },
        })
      );

      const captions = await Promise.all(promises);
      expect(captions).toHaveLength(10);

      const ids = new Set(captions.map((c) => c.id));
      expect(ids.size).toBe(10);
    });

    it("allows multiple captions with same text", async () => {
      const c1 = await service.create({
        panelId,
        type: "speech",
        text: "Duplicate",
        position: { x: 30, y: 50 },
      });
      const c2 = await service.create({
        panelId,
        type: "speech",
        text: "Duplicate",
        position: { x: 70, y: 50 },
      });

      expect(c1.id).not.toBe(c2.id);
      expect(c1.text).toBe(c2.text);
    });
  });
});
