/**
 * Match Characters Tool
 *
 * Mastra tool for finding characters that match a description.
 * Uses the vector store for semantic search when RAG is enabled,
 * falls back to database search otherwise.
 *
 * @example
 * ```ts
 * const result = await matchCharactersTool.execute({
 *   query: "friendly otter who loves fish",
 *   projectId: "proj-123",
 *   limit: 5,
 * });
 * ```
 */

import { createTool } from "@mastra/core";
import { z } from "zod";
import { getDefaultDatabase } from "../../db/client.js";
import { characters } from "../../db/schema.js";
import { like, eq, or, sql } from "drizzle-orm";

// =============================================================================
// Types
// =============================================================================

export interface CharacterMatch {
  id: string;
  name: string;
  description?: string;
  score: number;
  thumbnail?: string;
  projectId: string;
}

// =============================================================================
// Tool Definition
// =============================================================================

export const matchCharactersTool = createTool({
  id: "match-characters",
  description: "Search for characters that match a description or name. Returns matching characters with similarity scores.",
  inputSchema: z.object({
    query: z.string().describe("Character name or description to search for"),
    projectId: z.string().optional().describe("Limit search to a specific project"),
    limit: z.number().min(1).max(20).default(5).describe("Maximum number of results"),
    includeGlobal: z.boolean().default(true).describe("Include characters from all projects"),
  }),
  outputSchema: z.object({
    matches: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        score: z.number(),
        thumbnail: z.string().optional(),
        projectId: z.string(),
      })
    ),
    total: z.number(),
    searchMethod: z.enum(["rag", "database"]),
  }),
  execute: async ({ context }) => {
    const { query, projectId, limit, includeGlobal } = context;

    // For now, use database search (fallback)
    // TODO: Implement RAG search when vector store is populated
    const matches = await searchCharactersDatabase({
      query,
      projectId,
      limit,
      includeGlobal,
    });

    return {
      matches,
      total: matches.length,
      searchMethod: "database" as const,
    };
  },
});

// =============================================================================
// Database Search (Fallback)
// =============================================================================

async function searchCharactersDatabase(params: {
  query: string;
  projectId?: string;
  limit: number;
  includeGlobal: boolean;
}): Promise<CharacterMatch[]> {
  const db = getDefaultDatabase();
  const { query, projectId, limit, includeGlobal } = params;

  // Build search pattern
  const searchPattern = `%${query.toLowerCase()}%`;

  // Build query conditions
  const conditions = [];

  // Text search on name and profile (JSON contains description)
  conditions.push(
    or(
      like(sql`lower(${characters.name})`, searchPattern),
      like(sql`lower(${characters.profile})`, searchPattern)
    )
  );

  // Project filter
  if (projectId && !includeGlobal) {
    conditions.push(eq(characters.projectId, projectId));
  }

  // Execute query
  const results = await db
    .select({
      id: characters.id,
      name: characters.name,
      profile: characters.profile,
      projectId: characters.projectId,
      referenceImages: characters.referenceImages,
    })
    .from(characters)
    .where(conditions.length > 1 ? sql`${conditions[0]} AND ${conditions[1]}` : conditions[0])
    .limit(limit);

  // Transform results
  return results.map((char) => {
    // Parse profile to get description
    let description: string | undefined;
    try {
      const profile = typeof char.profile === "string" 
        ? JSON.parse(char.profile) 
        : char.profile;
      description = profile?.description || profile?.personality;
    } catch {
      description = undefined;
    }

    // Get first reference image as thumbnail
    let thumbnail: string | undefined;
    try {
      const images = typeof char.referenceImages === "string"
        ? JSON.parse(char.referenceImages)
        : char.referenceImages;
      thumbnail = Array.isArray(images) && images.length > 0 ? images[0] : undefined;
    } catch {
      thumbnail = undefined;
    }

    // Calculate a simple relevance score based on name match
    const nameLower = char.name.toLowerCase();
    const queryLower = query.toLowerCase();
    let score = 0.5; // Default score

    if (nameLower === queryLower) {
      score = 1.0; // Exact match
    } else if (nameLower.includes(queryLower)) {
      score = 0.8; // Name contains query
    } else if (queryLower.includes(nameLower)) {
      score = 0.7; // Query contains name
    }

    return {
      id: char.id,
      name: char.name,
      description,
      score,
      thumbnail,
      projectId: char.projectId,
    };
  });
}

// =============================================================================
// RAG Search (Future)
// =============================================================================

// TODO: Implement when vector store is populated with character embeddings
// async function searchCharactersRAG(params: {
//   query: string;
//   projectId?: string;
//   limit: number;
//   includeGlobal: boolean;
// }): Promise<CharacterMatch[]> {
//   const store = getVectorStore();
//   const embedding = await embedWithFallback(params.query);
//
//   const results = await store.query({
//     indexName: "characters",
//     queryVector: embedding,
//     topK: params.limit,
//     filter: params.projectId && !params.includeGlobal
//       ? { projectId: params.projectId }
//       : undefined,
//   });
//
//   return results.map((r) => ({
//     id: r.id,
//     name: r.metadata.name as string,
//     description: r.metadata.description as string | undefined,
//     score: r.score,
//     thumbnail: r.metadata.thumbnail as string | undefined,
//     projectId: r.metadata.projectId as string,
//   }));
// }
