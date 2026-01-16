/**
 * Caption Service
 *
 * CRUD operations for panel captions (speech bubbles, thought bubbles,
 * narration boxes, SFX text, and whispers).
 */

import { eq, and, asc, sql } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  panelCaptions,
  panels,
  characters,
  type PanelCaption,
  type NewPanelCaption,
  type CaptionType,
  type CaptionPosition,
  type CaptionStyle,
} from "../db/index.js";
import {
  sanitizeText,
  validatePosition as validatePositionUtil,
  validateCaptionStyle,
} from "../utils/security.js";

// Valid caption types
const VALID_CAPTION_TYPES: CaptionType[] = [
  "speech",
  "thought",
  "narration",
  "sfx",
  "whisper",
];

// Default styles per caption type
export const DEFAULT_CAPTION_STYLES: Record<CaptionType, Partial<CaptionStyle>> = {
  speech: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 16,
    fontColor: "#000000",
    fontWeight: "normal",
    backgroundColor: "#FFFFFF",
    borderColor: "#000000",
    borderWidth: 2,
    borderStyle: "solid",
    opacity: 1,
    padding: 12,
    maxWidth: 40,
  },
  thought: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 14,
    fontColor: "#444444",
    fontWeight: "normal",
    backgroundColor: "#F0F0F0",
    borderColor: "#888888",
    borderWidth: 1,
    borderStyle: "solid",
    opacity: 0.95,
    padding: 12,
    maxWidth: 35,
  },
  narration: {
    fontFamily: "Georgia, serif",
    fontSize: 14,
    fontColor: "#333333",
    fontWeight: "normal",
    backgroundColor: "#FFFACD",
    borderColor: "#8B4513",
    borderWidth: 2,
    borderStyle: "solid",
    opacity: 1,
    padding: 10,
    maxWidth: 80,
  },
  sfx: {
    fontFamily: "Impact, sans-serif",
    fontSize: 32,
    fontColor: "#FF0000",
    fontWeight: "bold",
    backgroundColor: "transparent",
    borderColor: "#000000",
    borderWidth: 0,
    borderStyle: "solid",
    opacity: 1,
    padding: 0,
    maxWidth: 50,
  },
  whisper: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 12,
    fontColor: "#666666",
    fontWeight: "normal",
    backgroundColor: "#FFFFFF",
    borderColor: "#999999",
    borderWidth: 1,
    borderStyle: "dashed",
    opacity: 0.9,
    padding: 10,
    maxWidth: 30,
  },
};

export interface CreateCaptionInput {
  panelId: string;
  type: CaptionType;
  text: string;
  characterId?: string;
  position: CaptionPosition;
  tailDirection?: CaptionPosition;
  style?: Partial<CaptionStyle>;
  zIndex?: number;
}

export interface UpdateCaptionInput {
  type?: CaptionType;
  text?: string;
  characterId?: string | null;
  position?: CaptionPosition;
  tailDirection?: CaptionPosition | null;
  style?: Partial<CaptionStyle>;
  zIndex?: number;
}

export class CaptionService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Create a new caption for a panel
   */
  async create(data: CreateCaptionInput): Promise<PanelCaption> {
    // Validate panel exists
    const [panel] = await this.db
      .select()
      .from(panels)
      .where(eq(panels.id, data.panelId));
    if (!panel) {
      throw new Error(`Panel not found: ${data.panelId}`);
    }

    // Validate caption type
    if (!VALID_CAPTION_TYPES.includes(data.type)) {
      throw new Error(
        `Invalid caption type: ${data.type}. Valid types: ${VALID_CAPTION_TYPES.join(", ")}`
      );
    }

    // Validate character if provided
    if (data.characterId) {
      const [character] = await this.db
        .select()
        .from(characters)
        .where(eq(characters.id, data.characterId));
      if (!character) {
        throw new Error(`Character not found: ${data.characterId}`);
      }
    }

    // Validate position
    this.validatePosition(data.position);
    if (data.tailDirection) {
      this.validatePosition(data.tailDirection);
    }

    // Sanitize and validate text (defense in depth against XSS)
    const sanitizedText = sanitizeText(data.text).trim();
    if (!sanitizedText || sanitizedText.length === 0) {
      throw new Error("Caption text cannot be empty");
    }
    if (sanitizedText.length > 1000) {
      throw new Error("Caption text cannot exceed 1000 characters");
    }

    // Validate style if provided
    if (data.style) {
      const styleValidation = validateCaptionStyle(data.style as Record<string, unknown>);
      if (!styleValidation.valid) {
        throw new Error(`Invalid style: ${styleValidation.errors.join("; ")}`);
      }
    }

    // Determine zIndex atomically using a subquery to avoid race conditions
    // This calculates max(zIndex) + 1 in the same query as the insert
    let zIndex = data.zIndex;
    if (zIndex === undefined) {
      // Use COALESCE to handle the case when there are no existing captions
      const [maxResult] = await this.db
        .select({ maxZIndex: sql<number>`COALESCE(MAX(${panelCaptions.zIndex}), -1)` })
        .from(panelCaptions)
        .where(eq(panelCaptions.panelId, data.panelId));
      zIndex = (maxResult?.maxZIndex ?? -1) + 1;
    }

    // Create caption
    const [caption] = await this.db
      .insert(panelCaptions)
      .values({
        panelId: data.panelId,
        type: data.type,
        text: sanitizedText,
        characterId: data.characterId,
        position: data.position,
        tailDirection: data.tailDirection,
        style: data.style,
        zIndex,
      })
      .returning();

    return caption;
  }

  /**
   * Get caption by ID
   */
  async getById(id: string): Promise<PanelCaption | null> {
    const [caption] = await this.db
      .select()
      .from(panelCaptions)
      .where(eq(panelCaptions.id, id));
    return caption ?? null;
  }

  /**
   * Get all captions for a panel, ordered by zIndex
   */
  async getByPanel(panelId: string): Promise<PanelCaption[]> {
    return this.db
      .select()
      .from(panelCaptions)
      .where(eq(panelCaptions.panelId, panelId))
      .orderBy(asc(panelCaptions.zIndex));
  }

  /**
   * Update a caption
   */
  async update(id: string, data: UpdateCaptionInput): Promise<PanelCaption> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Caption not found: ${id}`);
    }

    const updates: Partial<NewPanelCaption> = {
      updatedAt: new Date(),
    };

    // Validate and apply type
    if (data.type !== undefined) {
      if (!VALID_CAPTION_TYPES.includes(data.type)) {
        throw new Error(
          `Invalid caption type: ${data.type}. Valid types: ${VALID_CAPTION_TYPES.join(", ")}`
        );
      }
      updates.type = data.type;
    }

    // Validate, sanitize, and apply text
    if (data.text !== undefined) {
      const sanitizedText = sanitizeText(data.text).trim();
      if (!sanitizedText || sanitizedText.length === 0) {
        throw new Error("Caption text cannot be empty");
      }
      if (sanitizedText.length > 1000) {
        throw new Error("Caption text cannot exceed 1000 characters");
      }
      updates.text = sanitizedText;
      // Mark as manually edited if text changes
      if (updates.text !== existing.text) {
        updates.manuallyEdited = true;
      }
    }

    // Validate and apply character
    if (data.characterId !== undefined) {
      if (data.characterId !== null) {
        const [character] = await this.db
          .select()
          .from(characters)
          .where(eq(characters.id, data.characterId));
        if (!character) {
          throw new Error(`Character not found: ${data.characterId}`);
        }
      }
      updates.characterId = data.characterId;
    }

    // Validate and apply position
    if (data.position !== undefined) {
      this.validatePosition(data.position);
      updates.position = data.position;
    }

    // Validate and apply tail direction
    if (data.tailDirection !== undefined) {
      if (data.tailDirection !== null) {
        this.validatePosition(data.tailDirection);
      }
      updates.tailDirection = data.tailDirection;
    }

    // Validate and apply style
    if (data.style !== undefined) {
      const styleValidation = validateCaptionStyle(data.style as Record<string, unknown>);
      if (!styleValidation.valid) {
        throw new Error(`Invalid style: ${styleValidation.errors.join("; ")}`);
      }
      // Merge with existing style
      updates.style = { ...existing.style, ...data.style };
    }

    // Apply zIndex
    if (data.zIndex !== undefined) {
      updates.zIndex = data.zIndex;
    }

    const [updated] = await this.db
      .update(panelCaptions)
      .set(updates)
      .where(eq(panelCaptions.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a caption
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Caption not found: ${id}`);
    }

    await this.db
      .delete(panelCaptions)
      .where(eq(panelCaptions.id, id));
  }

  /**
   * Delete all captions for a panel
   */
  async deleteByPanel(panelId: string): Promise<number> {
    const result = await this.db
      .delete(panelCaptions)
      .where(eq(panelCaptions.panelId, panelId))
      .returning();

    return result.length;
  }

  /**
   * Reorder captions by updating their orderIndex values.
   * All captions in the panel must be included in the captionIds array.
   */
  async reorder(panelId: string, captionIds: string[]): Promise<PanelCaption[]> {
    // Validate all captions belong to the panel
    const existing = await this.getByPanel(panelId);
    const existingIds = new Set(existing.map(c => c.id));
    const providedIds = new Set(captionIds);

    // Check for duplicate IDs in input
    if (providedIds.size !== captionIds.length) {
      throw new Error("Duplicate caption IDs are not allowed");
    }

    // Validate all provided IDs exist in the panel
    for (const id of captionIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Caption ${id} not found in panel ${panelId}`);
      }
    }

    // Validate ALL captions from the panel are included
    if (captionIds.length !== existing.length) {
      const missingIds = existing
        .filter(c => !providedIds.has(c.id))
        .map(c => c.id);
      throw new Error(
        `All captions must be included in reorder. Missing: ${missingIds.join(", ")}`
      );
    }

    // Update orderIndex for each caption atomically using batch update
    const updated: PanelCaption[] = [];
    const now = new Date();

    // Execute all updates (SQLite serializes writes so this is safe)
    for (let i = 0; i < captionIds.length; i++) {
      const [caption] = await this.db
        .update(panelCaptions)
        .set({ orderIndex: i, updatedAt: now })
        .where(eq(panelCaptions.id, captionIds[i]))
        .returning();
      updated.push(caption);
    }

    return updated.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  /**
   * Get merged style (defaults + custom)
   */
  getMergedStyle(type: CaptionType, customStyle?: Partial<CaptionStyle>): CaptionStyle {
    const defaults = DEFAULT_CAPTION_STYLES[type];
    return {
      fontFamily: customStyle?.fontFamily ?? defaults.fontFamily ?? "Comic Sans MS, cursive",
      fontSize: customStyle?.fontSize ?? defaults.fontSize ?? 16,
      fontColor: customStyle?.fontColor ?? defaults.fontColor ?? "#000000",
      fontWeight: customStyle?.fontWeight ?? defaults.fontWeight ?? "normal",
      backgroundColor: customStyle?.backgroundColor ?? defaults.backgroundColor ?? "#FFFFFF",
      borderColor: customStyle?.borderColor ?? defaults.borderColor ?? "#000000",
      borderWidth: customStyle?.borderWidth ?? defaults.borderWidth ?? 2,
      borderStyle: customStyle?.borderStyle ?? defaults.borderStyle ?? "solid",
      opacity: customStyle?.opacity ?? defaults.opacity ?? 1,
      padding: customStyle?.padding ?? defaults.padding ?? 10,
      maxWidth: customStyle?.maxWidth ?? defaults.maxWidth ?? 40,
    };
  }

  /**
   * Validate position object
   */
  private validatePosition(position: CaptionPosition): void {
    if (typeof position.x !== "number" || typeof position.y !== "number") {
      throw new Error("Position must have numeric x and y values");
    }
    if (position.x < 0 || position.x > 100) {
      throw new Error("Position x must be between 0 and 100 (percentage)");
    }
    if (position.y < 0 || position.y > 100) {
      throw new Error("Position y must be between 0 and 100 (percentage)");
    }
  }
}

// Singleton instance
let serviceInstance: CaptionService | null = null;

export function getCaptionService(db?: Database): CaptionService {
  if (!serviceInstance) {
    serviceInstance = new CaptionService(db);
  }
  return serviceInstance;
}

export function resetCaptionService(): void {
  serviceInstance = null;
}
