/**
 * GeneratedText Service
 *
 * Service for managing stored AI-generated text content.
 * Supports text associated with panels, pages, projects, or standalone.
 * Enables independent viewing, editing, and regeneration of text.
 */

import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  getDefaultDatabase,
  generatedTexts,
  type GeneratedText,
  type NewGeneratedText,
  type GeneratedTextType,
  type GeneratedTextStatus,
  type GeneratedTextMetadata,
} from "../db/index.js";
import { getTextGenerationService } from "./text-generation.service.js";
import type { GenerateOptions, GenerateResult } from "./text-generation.types.js";

// ============================================================================
// Types
// ============================================================================

export interface CreateGeneratedTextInput {
  // Associations (at most one, or none for standalone)
  panelId?: string;
  pageLayoutId?: string;
  projectId?: string;
  // Content
  text: string;
  textType: GeneratedTextType;
  // Generation info
  provider: string;
  model: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  // Context
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  // Metadata
  metadata?: GeneratedTextMetadata;
}

export interface UpdateGeneratedTextInput {
  text?: string;
  textType?: GeneratedTextType;
  status?: GeneratedTextStatus;
  metadata?: GeneratedTextMetadata;
}

export interface ListGeneratedTextsOptions {
  panelId?: string;
  pageLayoutId?: string;
  projectId?: string;
  textType?: GeneratedTextType;
  status?: GeneratedTextStatus;
  limit?: number;
  offset?: number;
}

export interface RegenerateTextOptions extends Partial<GenerateOptions> {
  /** Update the prompt before regenerating */
  newPrompt?: string;
  /** Keep the old text as a previous version */
  keepHistory?: boolean;
}

export interface GenerateAndStoreOptions extends GenerateOptions {
  panelId?: string;
  pageLayoutId?: string;
  projectId?: string;
  textType: GeneratedTextType;
  metadata?: GeneratedTextMetadata;
}

// ============================================================================
// Service Class
// ============================================================================

export class GeneratedTextService {
  private db: ReturnType<typeof getDefaultDatabase>;

  constructor(db?: ReturnType<typeof getDefaultDatabase>) {
    this.db = db ?? getDefaultDatabase();
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Create a new generated text entry.
   */
  async create(input: CreateGeneratedTextInput): Promise<GeneratedText> {
    const [result] = await this.db
      .insert(generatedTexts)
      .values({
        panelId: input.panelId,
        pageLayoutId: input.pageLayoutId,
        projectId: input.projectId,
        text: input.text,
        textType: input.textType,
        provider: input.provider,
        model: input.model,
        tokensUsed: input.tokensUsed,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        prompt: input.prompt,
        systemPrompt: input.systemPrompt,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        metadata: input.metadata,
        status: "active",
        isEdited: false,
      })
      .returning();

    return result;
  }

  /**
   * Get a generated text entry by ID.
   */
  async getById(id: string): Promise<GeneratedText | null> {
    const results = await this.db
      .select()
      .from(generatedTexts)
      .where(eq(generatedTexts.id, id))
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * List generated texts with optional filtering.
   */
  async list(options: ListGeneratedTextsOptions = {}): Promise<GeneratedText[]> {
    const conditions = [];

    if (options.panelId) {
      conditions.push(eq(generatedTexts.panelId, options.panelId));
    }
    if (options.pageLayoutId) {
      conditions.push(eq(generatedTexts.pageLayoutId, options.pageLayoutId));
    }
    if (options.projectId) {
      conditions.push(eq(generatedTexts.projectId, options.projectId));
    }
    if (options.textType) {
      conditions.push(eq(generatedTexts.textType, options.textType));
    }
    if (options.status) {
      conditions.push(eq(generatedTexts.status, options.status));
    }

    let query = this.db
      .select()
      .from(generatedTexts)
      .orderBy(desc(generatedTexts.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // SQLite requires LIMIT when using OFFSET
    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    } else if (options.offset) {
      // SQLite needs a LIMIT clause for OFFSET to work
      query = query.limit(Number.MAX_SAFE_INTEGER) as typeof query;
    }
    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    return query;
  }

  /**
   * Get all generated texts for a panel.
   */
  async getByPanel(panelId: string): Promise<GeneratedText[]> {
    return this.list({ panelId });
  }

  /**
   * Get all generated texts for a page layout.
   */
  async getByPageLayout(pageLayoutId: string): Promise<GeneratedText[]> {
    return this.list({ pageLayoutId });
  }

  /**
   * Get all generated texts for a project.
   */
  async getByProject(projectId: string): Promise<GeneratedText[]> {
    return this.list({ projectId });
  }

  /**
   * Get the most recent active text of a specific type for a panel.
   */
  async getActiveTextForPanel(
    panelId: string,
    textType: GeneratedTextType
  ): Promise<GeneratedText | null> {
    const results = await this.db
      .select()
      .from(generatedTexts)
      .where(
        and(
          eq(generatedTexts.panelId, panelId),
          eq(generatedTexts.textType, textType),
          eq(generatedTexts.status, "active")
        )
      )
      .orderBy(desc(generatedTexts.createdAt))
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Update a generated text entry.
   */
  async update(id: string, input: UpdateGeneratedTextInput): Promise<GeneratedText> {
    // Get the current text first
    const current = await this.getById(id);
    if (!current) {
      throw new Error(`Generated text not found: ${id}`);
    }

    const updateData: Partial<NewGeneratedText> = {
      updatedAt: new Date(),
    };

    // Track if this is an edit to the text content
    if (input.text !== undefined && input.text !== current.text) {
      updateData.text = input.text;
      updateData.isEdited = true;
      updateData.editedAt = new Date();
      // Store original if this is the first edit
      if (!current.isEdited) {
        updateData.originalText = current.text;
      }
    }

    if (input.textType !== undefined) {
      updateData.textType = input.textType;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata;
    }

    const [result] = await this.db
      .update(generatedTexts)
      .set(updateData)
      .where(eq(generatedTexts.id, id))
      .returning();

    return result;
  }

  /**
   * Archive a generated text (soft delete).
   */
  async archive(id: string): Promise<GeneratedText> {
    return this.update(id, { status: "archived" });
  }

  /**
   * Delete a generated text entry permanently.
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(generatedTexts).where(eq(generatedTexts.id, id));
  }

  /**
   * Delete all generated texts for a panel.
   */
  async deleteByPanel(panelId: string): Promise<number> {
    const result = await this.db
      .delete(generatedTexts)
      .where(eq(generatedTexts.panelId, panelId));

    return result.rowsAffected ?? 0;
  }

  /**
   * Delete all generated texts for a page layout.
   */
  async deleteByPageLayout(pageLayoutId: string): Promise<number> {
    const result = await this.db
      .delete(generatedTexts)
      .where(eq(generatedTexts.pageLayoutId, pageLayoutId));

    return result.rowsAffected ?? 0;
  }

  // --------------------------------------------------------------------------
  // Generation & Regeneration
  // --------------------------------------------------------------------------

  /**
   * Generate text and store it in the database.
   */
  async generateAndStore(
    prompt: string,
    options: GenerateAndStoreOptions
  ): Promise<GeneratedText> {
    const textGenService = getTextGenerationService();
    const result = await textGenService.generate(prompt, options);

    return this.create({
      panelId: options.panelId,
      pageLayoutId: options.pageLayoutId,
      projectId: options.projectId,
      text: result.text,
      textType: options.textType,
      provider: result.provider,
      model: result.model,
      tokensUsed: result.tokensUsed,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      prompt,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      metadata: options.metadata,
    });
  }

  /**
   * Regenerate text for an existing entry.
   * Creates a new version and optionally archives the old one.
   * Uses a transaction to prevent race conditions with concurrent regenerations.
   */
  async regenerate(
    id: string,
    options: RegenerateTextOptions = {}
  ): Promise<GeneratedText> {
    // First, fetch and validate outside transaction (generation is slow)
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Generated text not found: ${id}`);
    }

    const prompt = options.newPrompt ?? existing.prompt;
    if (!prompt) {
      throw new Error("No prompt available for regeneration");
    }

    // Generate new text (this is the slow part, do it outside transaction)
    const textGenService = getTextGenerationService();
    const result = await textGenService.generate(prompt, {
      systemPrompt: existing.systemPrompt ?? undefined,
      temperature: options.temperature ?? existing.temperature ?? undefined,
      maxTokens: options.maxTokens ?? existing.maxTokens ?? undefined,
      timeoutMs: options.timeoutMs,
      stopSequences: options.stopSequences,
    });

    // Now use Drizzle transaction for the database operations
    return this.db.transaction(async (tx) => {
      // Re-fetch to check for concurrent modifications
      const currentResults = await tx
        .select()
        .from(generatedTexts)
        .where(eq(generatedTexts.id, id))
        .limit(1);
      const current = currentResults[0];

      if (!current) {
        throw new Error(`Generated text was deleted during regeneration: ${id}`);
      }

      // Deep copy metadata to prevent mutation issues
      const existingMetadata = current.metadata
        ? JSON.parse(JSON.stringify(current.metadata))
        : {};

      // Update metadata with version info
      const metadata: GeneratedTextMetadata = {
        ...existingMetadata,
        version: (existingMetadata.version ?? 1) + 1,
        previousVersionId: current.id,
        regeneratedAt: Date.now(),
      };

      // Archive the old version if keeping history (inside transaction)
      if (options.keepHistory) {
        await tx
          .update(generatedTexts)
          .set({
            status: "superseded",
            updatedAt: new Date(),
          })
          .where(eq(generatedTexts.id, current.id));
      }

      // Create new entry (inside transaction)
      const now = new Date();
      const newId = crypto.randomUUID();

      const [newEntry] = await tx
        .insert(generatedTexts)
        .values({
          id: newId,
          panelId: current.panelId,
          pageLayoutId: current.pageLayoutId,
          projectId: current.projectId,
          text: result.text,
          textType: current.textType,
          provider: result.provider,
          model: result.model,
          tokensUsed: result.tokensUsed,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          prompt,
          systemPrompt: current.systemPrompt,
          temperature: options.temperature ?? current.temperature,
          maxTokens: options.maxTokens ?? current.maxTokens,
          status: "active",
          isEdited: false,
          metadata,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return newEntry;
    });
  }

  /**
   * Revert to original text (undo edits).
   */
  async revertToOriginal(id: string): Promise<GeneratedText> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Generated text not found: ${id}`);
    }

    if (!existing.originalText) {
      throw new Error("No original text to revert to");
    }

    const [result] = await this.db
      .update(generatedTexts)
      .set({
        text: existing.originalText,
        isEdited: false,
        editedAt: null,
        originalText: null,
        updatedAt: new Date(),
      })
      .where(eq(generatedTexts.id, id))
      .returning();

    return result;
  }

  // --------------------------------------------------------------------------
  // Batch Operations
  // --------------------------------------------------------------------------

  /**
   * Create multiple generated text entries.
   */
  async createBatch(inputs: CreateGeneratedTextInput[]): Promise<GeneratedText[]> {
    if (inputs.length === 0) return [];

    // Enforce batch size limit to prevent resource exhaustion
    const MAX_BATCH_SIZE = 1000;
    if (inputs.length > MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${inputs.length} exceeds maximum of ${MAX_BATCH_SIZE}`);
    }

    const values = inputs.map((input) => ({
      panelId: input.panelId,
      pageLayoutId: input.pageLayoutId,
      projectId: input.projectId,
      text: input.text,
      textType: input.textType,
      provider: input.provider,
      model: input.model,
      tokensUsed: input.tokensUsed,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      metadata: input.metadata,
      status: "active" as GeneratedTextStatus,
      isEdited: false,
    }));

    // Process in chunks to avoid SQLite variable limits (max ~999 variables)
    const CHUNK_SIZE = 100;
    const results: GeneratedText[] = [];

    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const chunk = values.slice(i, i + CHUNK_SIZE);
      const chunkResults = await this.db
        .insert(generatedTexts)
        .values(chunk)
        .returning();
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Archive multiple texts by IDs.
   */
  async archiveBatch(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    // Enforce batch size limit
    const MAX_BATCH_SIZE = 1000;
    if (ids.length > MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${ids.length} exceeds maximum of ${MAX_BATCH_SIZE}`);
    }

    const result = await this.db
      .update(generatedTexts)
      .set({ status: "archived", updatedAt: new Date() })
      .where(inArray(generatedTexts.id, ids));

    return result.rowsAffected ?? 0;
  }

  /**
   * Delete multiple texts by IDs.
   */
  async deleteBatch(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    // Enforce batch size limit
    const MAX_BATCH_SIZE = 1000;
    if (ids.length > MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${ids.length} exceeds maximum of ${MAX_BATCH_SIZE}`);
    }

    const result = await this.db
      .delete(generatedTexts)
      .where(inArray(generatedTexts.id, ids));

    return result.rowsAffected ?? 0;
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  /**
   * Get statistics about generated texts.
   */
  async getStats(projectId?: string): Promise<{
    total: number;
    byType: Record<GeneratedTextType, number>;
    byStatus: Record<GeneratedTextStatus, number>;
    byProvider: Record<string, number>;
    totalTokens: number;
    editedCount: number;
  }> {
    const conditions = projectId
      ? [eq(generatedTexts.projectId, projectId)]
      : [];

    // Get all texts matching conditions
    let query = this.db.select().from(generatedTexts);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    const texts = await query;

    // Calculate stats
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    let totalTokens = 0;
    let editedCount = 0;

    for (const text of texts) {
      byType[text.textType] = (byType[text.textType] ?? 0) + 1;
      byStatus[text.status] = (byStatus[text.status] ?? 0) + 1;
      byProvider[text.provider] = (byProvider[text.provider] ?? 0) + 1;
      totalTokens += text.tokensUsed ?? 0;
      if (text.isEdited) editedCount++;
    }

    return {
      total: texts.length,
      byType: byType as Record<GeneratedTextType, number>,
      byStatus: byStatus as Record<GeneratedTextStatus, number>,
      byProvider,
      totalTokens,
      editedCount,
    };
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

let instance: GeneratedTextService | null = null;

/**
 * Get the singleton GeneratedTextService instance.
 */
export function getGeneratedTextService(): GeneratedTextService {
  if (!instance) {
    instance = new GeneratedTextService();
  }
  return instance;
}

/**
 * Create a new GeneratedTextService with a specific database.
 */
export function createGeneratedTextService(
  db?: ReturnType<typeof getDefaultDatabase>
): GeneratedTextService {
  return new GeneratedTextService(db);
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetGeneratedTextService(): void {
  instance = null;
}
