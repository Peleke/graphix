# Mastra Integration Plan

> Replaces custom `ChatService` with Mastra Agent framework for AI-guided project creation.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Vector Store** | LibSQL → Qdrant/Pinecone | Start simple, swap when scale demands |
| **Embedding Provider** | Ollama → OpenAI fallback | Free local first, quality fallback |
| **Embedding Dimensions** | Normalize to 1024 | Compatible across providers |
| **Thread History UI** | Sidebar + Dropdown | Standard UX pattern |

---

## Phase 3: Mastra Agent + Persistence

### 3.1 Dependencies

```bash
cd packages/core
npm install @mastra/core @mastra/memory @mastra/libsql zod
```

### 3.2 Vector Store Abstraction

Create a pluggable interface so we can swap LibSQL → Qdrant/Pinecone later:

```typescript
// packages/core/src/rag/vector-store.interface.ts

export interface VectorMetadata {
  id: string;
  [key: string]: unknown;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export interface VectorStoreConfig {
  indexName: string;
  dimension: number;
}

export interface VectorStore {
  /**
   * Create an index if it doesn't exist.
   */
  createIndex(config: VectorStoreConfig): Promise<void>;

  /**
   * Upsert vectors with metadata.
   */
  upsert(params: {
    indexName: string;
    vectors: number[][];
    metadata: VectorMetadata[];
    ids?: string[];
  }): Promise<void>;

  /**
   * Query for similar vectors.
   */
  query(params: {
    indexName: string;
    queryVector: number[];
    topK: number;
    filter?: Record<string, unknown>;
  }): Promise<VectorSearchResult[]>;

  /**
   * Delete vectors by ID.
   */
  delete(params: {
    indexName: string;
    ids: string[];
  }): Promise<void>;

  /**
   * Get provider name for logging/debugging.
   */
  readonly provider: string;
}
```

### 3.3 LibSQL Vector Store Implementation

```typescript
// packages/core/src/rag/stores/libsql-vector.store.ts

import { getDb } from "../../db/client.js";
import type { VectorStore, VectorStoreConfig, VectorMetadata, VectorSearchResult } from "../vector-store.interface.js";

/**
 * LibSQL-based vector store using SQLite's json functions.
 * 
 * Trade-offs:
 * - Pro: No additional infrastructure, same DB as app data
 * - Con: Linear scan for similarity (O(n)), no HNSW index
 * - Good for: <10k vectors, development, testing
 * 
 * Migration path: Swap to QdrantVectorStore or PineconeVectorStore
 * when you exceed ~10k vectors or need sub-10ms queries.
 */
export class LibSQLVectorStore implements VectorStore {
  readonly provider = "libsql";

  async createIndex(config: VectorStoreConfig): Promise<void> {
    const db = getDb();
    
    // Create table for this index if not exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS vector_${config.indexName} (
        id TEXT PRIMARY KEY,
        vector TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);
    
    // Store dimension in a metadata table for validation
    await db.run(`
      INSERT OR REPLACE INTO vector_indexes (name, dimension, created_at)
      VALUES (?, ?, unixepoch())
    `, [config.indexName, config.dimension]);
  }

  async upsert(params: {
    indexName: string;
    vectors: number[][];
    metadata: VectorMetadata[];
    ids?: string[];
  }): Promise<void> {
    const db = getDb();
    const tableName = `vector_${params.indexName}`;
    
    const stmt = await db.prepare(`
      INSERT OR REPLACE INTO ${tableName} (id, vector, metadata)
      VALUES (?, ?, ?)
    `);
    
    for (let i = 0; i < params.vectors.length; i++) {
      const id = params.ids?.[i] ?? params.metadata[i].id;
      await stmt.run(
        id,
        JSON.stringify(params.vectors[i]),
        JSON.stringify(params.metadata[i])
      );
    }
  }

  async query(params: {
    indexName: string;
    queryVector: number[];
    topK: number;
    filter?: Record<string, unknown>;
  }): Promise<VectorSearchResult[]> {
    const db = getDb();
    const tableName = `vector_${params.indexName}`;
    
    // Fetch all vectors (linear scan - fine for small datasets)
    const rows = await db.all<{ id: string; vector: string; metadata: string }[]>(
      `SELECT id, vector, metadata FROM ${tableName}`
    );
    
    // Calculate cosine similarity in JS
    const results = rows.map(row => {
      const vector = JSON.parse(row.vector) as number[];
      const metadata = JSON.parse(row.metadata) as VectorMetadata;
      const score = cosineSimilarity(params.queryVector, vector);
      
      return { id: row.id, score, metadata };
    });
    
    // Apply filter if provided
    let filtered = results;
    if (params.filter) {
      filtered = results.filter(r => 
        Object.entries(params.filter!).every(([k, v]) => r.metadata[k] === v)
      );
    }
    
    // Sort by score descending, take topK
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, params.topK);
  }

  async delete(params: { indexName: string; ids: string[] }): Promise<void> {
    const db = getDb();
    const tableName = `vector_${params.indexName}`;
    const placeholders = params.ids.map(() => "?").join(", ");
    
    await db.run(
      `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
      params.ids
    );
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
```

### 3.4 Qdrant Vector Store (Future)

```typescript
// packages/core/src/rag/stores/qdrant-vector.store.ts

import { QdrantClient } from "@qdrant/js-client-rest";
import type { VectorStore, VectorStoreConfig, VectorMetadata, VectorSearchResult } from "../vector-store.interface.js";

/**
 * Qdrant vector store for production scale.
 * 
 * Trade-offs:
 * - Pro: HNSW index, sub-10ms queries, scales to millions
 * - Con: Requires Qdrant server (Docker or Qdrant Cloud)
 * 
 * Setup: docker run -p 6333:6333 qdrant/qdrant
 */
export class QdrantVectorStore implements VectorStore {
  readonly provider = "qdrant";
  private client: QdrantClient;

  constructor(config?: { url?: string; apiKey?: string }) {
    this.client = new QdrantClient({
      url: config?.url ?? process.env.QDRANT_URL ?? "http://localhost:6333",
      apiKey: config?.apiKey ?? process.env.QDRANT_API_KEY,
    });
  }

  async createIndex(config: VectorStoreConfig): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(c => c.name === config.indexName);
    
    if (!exists) {
      await this.client.createCollection(config.indexName, {
        vectors: {
          size: config.dimension,
          distance: "Cosine",
        },
      });
    }
  }

  async upsert(params: {
    indexName: string;
    vectors: number[][];
    metadata: VectorMetadata[];
    ids?: string[];
  }): Promise<void> {
    const points = params.vectors.map((vector, i) => ({
      id: params.ids?.[i] ?? params.metadata[i].id,
      vector,
      payload: params.metadata[i],
    }));
    
    await this.client.upsert(params.indexName, { points });
  }

  async query(params: {
    indexName: string;
    queryVector: number[];
    topK: number;
    filter?: Record<string, unknown>;
  }): Promise<VectorSearchResult[]> {
    const result = await this.client.search(params.indexName, {
      vector: params.queryVector,
      limit: params.topK,
      filter: params.filter ? this.buildFilter(params.filter) : undefined,
      with_payload: true,
    });
    
    return result.map(r => ({
      id: String(r.id),
      score: r.score,
      metadata: r.payload as VectorMetadata,
    }));
  }

  async delete(params: { indexName: string; ids: string[] }): Promise<void> {
    await this.client.delete(params.indexName, {
      points: params.ids,
    });
  }

  private buildFilter(filter: Record<string, unknown>) {
    return {
      must: Object.entries(filter).map(([key, value]) => ({
        key,
        match: { value },
      })),
    };
  }
}
```

### 3.5 Vector Store Factory

```typescript
// packages/core/src/rag/vector-store.factory.ts

import type { VectorStore } from "./vector-store.interface.js";
import { LibSQLVectorStore } from "./stores/libsql-vector.store.js";

export type VectorStoreProvider = "libsql" | "qdrant" | "pinecone";

let instance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!instance) {
    const provider = (process.env.VECTOR_STORE_PROVIDER ?? "libsql") as VectorStoreProvider;
    instance = createVectorStore(provider);
  }
  return instance;
}

export function createVectorStore(provider: VectorStoreProvider): VectorStore {
  switch (provider) {
    case "libsql":
      return new LibSQLVectorStore();
    
    case "qdrant":
      // Lazy import to avoid requiring qdrant client when not used
      const { QdrantVectorStore } = require("./stores/qdrant-vector.store.js");
      return new QdrantVectorStore();
    
    case "pinecone":
      const { PineconeVectorStore } = require("./stores/pinecone-vector.store.js");
      return new PineconeVectorStore();
    
    default:
      throw new Error(`Unknown vector store provider: ${provider}`);
  }
}

export function resetVectorStore(): void {
  instance = null;
}
```

---

## 3.6 Embedding Provider Abstraction

Handle different embedding dimensions across providers:

```typescript
// packages/core/src/rag/embedding.interface.ts

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  provider: string;
  model: string;
}

export interface EmbeddingProvider {
  /**
   * Embed a single text.
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Embed multiple texts (batch).
   */
  embedMany(texts: string[]): Promise<EmbeddingResult[]>;

  /**
   * Get the output dimension for this provider/model.
   */
  readonly dimension: number;

  /**
   * Provider name for logging.
   */
  readonly provider: string;

  /**
   * Model name.
   */
  readonly model: string;
}
```

### 3.7 Ollama Embedding Provider

```typescript
// packages/core/src/rag/providers/ollama-embedding.provider.ts

import type { EmbeddingProvider, EmbeddingResult } from "../embedding.interface.js";

/**
 * Ollama embedding provider.
 * 
 * Models and dimensions:
 * - nomic-embed-text: 768 dims
 * - mxbai-embed-large: 1024 dims
 * - all-minilm: 384 dims
 * 
 * We normalize to 1024 by default (mxbai-embed-large).
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "ollama";
  readonly model: string;
  readonly dimension: number;
  private baseUrl: string;

  // Known model dimensions
  private static DIMENSIONS: Record<string, number> = {
    "nomic-embed-text": 768,
    "mxbai-embed-large": 1024,
    "all-minilm": 384,
    "snowflake-arctic-embed": 1024,
  };

  constructor(config?: { model?: string; baseUrl?: string }) {
    this.model = config?.model ?? process.env.OLLAMA_EMBED_MODEL ?? "mxbai-embed-large";
    this.baseUrl = config?.baseUrl ?? process.env.OLLAMA_URL ?? "http://localhost:11434";
    this.dimension = OllamaEmbeddingProvider.DIMENSIONS[this.model] ?? 1024;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = await response.json() as { embedding: number[] };
    
    return {
      embedding: data.embedding,
      dimension: data.embedding.length,
      provider: this.provider,
      model: this.model,
    };
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    // Ollama doesn't have batch endpoint, so we parallelize
    const results = await Promise.all(texts.map(t => this.embed(t)));
    return results;
  }
}
```

### 3.8 OpenAI Embedding Provider (Fallback)

```typescript
// packages/core/src/rag/providers/openai-embedding.provider.ts

import type { EmbeddingProvider, EmbeddingResult } from "../embedding.interface.js";

/**
 * OpenAI embedding provider.
 * 
 * Models and dimensions:
 * - text-embedding-3-small: 1536 dims (can reduce to 1024, 512, 256)
 * - text-embedding-3-large: 3072 dims (can reduce)
 * - text-embedding-ada-002: 1536 dims (legacy)
 * 
 * We use text-embedding-3-small with dimensions=1024 for consistency.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "openai";
  readonly model: string;
  readonly dimension: number;
  private apiKey: string;

  constructor(config?: { model?: string; dimension?: number; apiKey?: string }) {
    this.model = config?.model ?? "text-embedding-3-small";
    this.dimension = config?.dimension ?? 1024; // Normalize to 1024
    this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        dimensions: this.dimension, // OpenAI v3 models support dimension reduction
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${error}`);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
    };
    
    return {
      embedding: data.data[0].embedding,
      dimension: data.data[0].embedding.length,
      provider: this.provider,
      model: this.model,
    };
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        dimensions: this.dimension,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${error}`);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
    };
    
    return data.data.map(d => ({
      embedding: d.embedding,
      dimension: d.embedding.length,
      provider: this.provider,
      model: this.model,
    }));
  }
}
```

### 3.9 Embedding Provider Factory with Fallback

```typescript
// packages/core/src/rag/embedding.factory.ts

import type { EmbeddingProvider } from "./embedding.interface.js";
import { OllamaEmbeddingProvider } from "./providers/ollama-embedding.provider.js";
import { OpenAIEmbeddingProvider } from "./providers/openai-embedding.provider.js";

export type EmbeddingProviderType = "ollama" | "openai";

/**
 * Normalized embedding dimension used across all providers.
 * 
 * Why 1024?
 * - Ollama mxbai-embed-large: 1024 natively
 * - OpenAI text-embedding-3-small: supports 1024 reduction
 * - Good balance of quality vs storage
 */
export const NORMALIZED_DIMENSION = 1024;

let primaryProvider: EmbeddingProvider | null = null;
let fallbackProvider: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!primaryProvider) {
    const providerType = (process.env.EMBEDDING_PROVIDER ?? "ollama") as EmbeddingProviderType;
    primaryProvider = createEmbeddingProvider(providerType);
    
    // Always set up OpenAI as fallback if API key is available
    if (providerType !== "openai" && process.env.OPENAI_API_KEY) {
      fallbackProvider = new OpenAIEmbeddingProvider({ dimension: NORMALIZED_DIMENSION });
    }
  }
  return primaryProvider;
}

export function createEmbeddingProvider(type: EmbeddingProviderType): EmbeddingProvider {
  switch (type) {
    case "ollama":
      return new OllamaEmbeddingProvider({ model: "mxbai-embed-large" });
    case "openai":
      return new OpenAIEmbeddingProvider({ dimension: NORMALIZED_DIMENSION });
    default:
      throw new Error(`Unknown embedding provider: ${type}`);
  }
}

/**
 * Embed with automatic fallback to OpenAI if Ollama fails.
 */
export async function embedWithFallback(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  
  try {
    const result = await provider.embed(text);
    return normalizeEmbedding(result.embedding, result.dimension);
  } catch (error) {
    if (fallbackProvider) {
      console.warn(`Primary embedding failed, falling back to OpenAI:`, error);
      const result = await fallbackProvider.embed(text);
      return normalizeEmbedding(result.embedding, result.dimension);
    }
    throw error;
  }
}

export async function embedManyWithFallback(texts: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider();
  
  try {
    const results = await provider.embedMany(texts);
    return results.map(r => normalizeEmbedding(r.embedding, r.dimension));
  } catch (error) {
    if (fallbackProvider) {
      console.warn(`Primary embedding failed, falling back to OpenAI:`, error);
      const results = await fallbackProvider.embedMany(texts);
      return results.map(r => normalizeEmbedding(r.embedding, r.dimension));
    }
    throw error;
  }
}

/**
 * Normalize embedding to NORMALIZED_DIMENSION.
 * 
 * Strategies:
 * - If dimension matches: return as-is
 * - If dimension is larger: truncate (works for OpenAI v3 models)
 * - If dimension is smaller: pad with zeros (not ideal, but works)
 */
function normalizeEmbedding(embedding: number[], dimension: number): number[] {
  if (dimension === NORMALIZED_DIMENSION) {
    return embedding;
  }
  
  if (dimension > NORMALIZED_DIMENSION) {
    // Truncate (OpenAI v3 embeddings are designed for this)
    return embedding.slice(0, NORMALIZED_DIMENSION);
  }
  
  // Pad with zeros (not ideal, but maintains compatibility)
  console.warn(`Padding embedding from ${dimension} to ${NORMALIZED_DIMENSION}`);
  const padded = new Array(NORMALIZED_DIMENSION).fill(0);
  embedding.forEach((v, i) => padded[i] = v);
  return padded;
}

export function resetEmbeddingProvider(): void {
  primaryProvider = null;
  fallbackProvider = null;
}
```

---

## 3.10 Database Schema Additions

```typescript
// Add to packages/core/src/db/schema.ts

// ============================================================================
// VECTOR INDEXES METADATA
// ============================================================================

export const vectorIndexes = sqliteTable("vector_indexes", {
  name: text("name").primaryKey(),
  dimension: integer("dimension").notNull(),
  count: integer("count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// ============================================================================
// CHAT THREADS (Mastra-compatible)
// ============================================================================

export const chatThreads = sqliteTable(
  "chat_threads",
  {
    id: id(),
    // User/session identifier (for multi-user)
    resourceId: text("resource_id").notNull(),
    // Auto-generated or user-provided title
    title: text("title"),
    // Link to project if chat resulted in creation
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    // Mastra working memory state (JSON)
    workingMemory: text("working_memory", { mode: "json" }).$type<ChatWorkingMemory>(),
    // Status
    status: text("status").$type<ChatThreadStatus>().default("active").notNull(),
    // Last activity for sorting/cleanup
    lastActivityAt: integer("last_activity_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("chat_threads_resource_idx").on(table.resourceId),
    index("chat_threads_project_idx").on(table.projectId),
    index("chat_threads_status_idx").on(table.status),
    index("chat_threads_activity_idx").on(table.lastActivityAt),
  ]
);

export type ChatThreadStatus = "active" | "completed" | "abandoned";

export type ChatWorkingMemory = {
  phase: "greeting" | "characters" | "setting" | "arc" | "style" | "scope" | "confirmation" | "complete";
  gathered: {
    concept?: string;
    characters?: Array<{
      name: string;
      description?: string;
      matchedId?: string;
    }>;
    setting?: string;
    arc?: string;
    style?: string;
    pageCount?: number;
  };
  skipped: string[];
};

export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;

// ============================================================================
// CHAT MESSAGES
// ============================================================================

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: id(),
    threadId: text("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    // Message role
    role: text("role").$type<ChatMessageRole>().notNull(),
    // Content (text for user/assistant, JSON for tool calls/results)
    content: text("content").notNull(),
    // Tool call info (if role === 'tool_call' or 'tool_result')
    toolCallId: text("tool_call_id"),
    toolName: text("tool_name"),
    // Metadata (suggestions, phase info, etc.)
    metadata: text("metadata", { mode: "json" }).$type<ChatMessageMetadata>(),
    // Embedding for semantic search (optional, for RAG over chat history)
    embedding: text("embedding", { mode: "json" }).$type<number[]>(),
    ...timestamps,
  },
  (table) => [
    index("chat_messages_thread_idx").on(table.threadId),
    index("chat_messages_role_idx").on(table.role),
    index("chat_messages_created_idx").on(table.createdAt),
  ]
);

export type ChatMessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result";

export type ChatMessageMetadata = {
  suggestions?: string[];
  phaseTransition?: {
    from: string;
    to: string;
  };
  characterMatches?: Array<{
    id: string;
    name: string;
    score: number;
    thumbnail?: string;
  }>;
  toolResult?: unknown;
};

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// ============================================================================
// CHAT RELATIONS
// ============================================================================

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  project: one(projects, {
    fields: [chatThreads.projectId],
    references: [projects.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, {
    fields: [chatMessages.threadId],
    references: [chatThreads.id],
  }),
}));
```

---

## 3.11 Mastra Agent Definition

```typescript
// packages/core/src/agents/project-creation.agent.ts

import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { matchCharactersTool } from "./tools/match-characters.tool.js";
import { bootstrapProjectTool } from "./tools/bootstrap-project.tool.js";
import { getModelAdapter } from "./model-adapter.js";

// Working memory schema
const ProjectCreationMemory = z.object({
  phase: z.enum([
    "greeting", "characters", "setting", "arc", "style", "scope", "confirmation", "complete"
  ]),
  gathered: z.object({
    concept: z.string().optional(),
    characters: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      matchedId: z.string().optional(),
    })).optional(),
    setting: z.string().optional(),
    arc: z.string().optional(),
    style: z.string().optional(),
    pageCount: z.number().optional(),
  }),
  skipped: z.array(z.string()),
});

export const projectCreationAgent = new Agent({
  name: "projectCreationAgent",
  
  instructions: `You are a creative collaborator helping users create graphic novel projects.

## Your Role
Guide users through defining their project by gathering:
1. **Concept** - The core story idea (1-2 sentences)
2. **Characters** - Main characters (use matchCharacters tool to find existing ones)
3. **Setting** - Where and when the story takes place
4. **Arc** - The main conflict or journey
5. **Style** - Visual style preferences
6. **Scope** - Number of pages

## Guidelines
- Ask ONE question at a time
- Be conversational, encouraging, and creative
- Suggest specific examples when helpful
- If user says "skip", move on without that info
- If user says "start over", reset working memory completely
- When you have enough info, offer "Create Project" as a suggestion

## Tool Usage
- Use \`matchCharacters\` when users mention character names/descriptions
- Show matching results and ask if they want to use existing characters
- Use \`bootstrapProject\` only when user confirms they want to create

## Phase Flow
greeting → characters → setting → arc → style → scope → confirmation → complete

Update working memory after each user response to track progress.`,

  model: getModelAdapter(),

  memory: new Memory({
    storage: new LibSQLStore({
      url: process.env.TURSO_DATABASE_URL || "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
    options: {
      workingMemory: {
        enabled: true,
        schema: ProjectCreationMemory,
      },
      threads: {
        generateTitle: true,
      },
      lastMessages: 20,
      semanticRecall: {
        topK: 3,
        messageRange: 10,
      },
    },
  }),

  tools: {
    matchCharacters: matchCharactersTool,
    bootstrapProject: bootstrapProjectTool,
  },
});
```

### 3.12 Model Adapter (Wraps TextGenerationService)

```typescript
// packages/core/src/agents/model-adapter.ts

import { getTextGenerationService } from "../services/text-generation.service.js";

/**
 * Wraps existing TextGenerationService to work with Mastra's model interface.
 * This lets us reuse the Ollama/Claude/OpenAI provider switching we already have.
 */
export function getModelAdapter() {
  const textService = getTextGenerationService();
  
  return {
    async generate(params: {
      messages: Array<{ role: string; content: string }>;
      tools?: Record<string, unknown>;
    }) {
      // Convert Mastra messages to our format
      const lastUserMessage = params.messages
        .filter(m => m.role === "user")
        .pop();
      
      const systemMessage = params.messages.find(m => m.role === "system");
      
      const result = await textService.generate(
        lastUserMessage?.content ?? "",
        {
          systemPrompt: systemMessage?.content,
          temperature: 0.7,
          maxTokens: 1000,
        }
      );
      
      return {
        text: result.text,
        toolCalls: [], // TODO: Parse tool calls from response
      };
    },
    
    async stream(params: {
      messages: Array<{ role: string; content: string }>;
    }) {
      // For now, generate and yield as single chunk
      // TODO: Implement real streaming
      const result = await this.generate(params);
      
      return (async function* () {
        yield { type: "text" as const, content: result.text };
      })();
    },
  };
}
```

---

## Phase 4: RAG Pipeline

### 4.1 Character Indexing Service

```typescript
// packages/core/src/rag/character-indexing.service.ts

import { getVectorStore } from "./vector-store.factory.js";
import { embedManyWithFallback, NORMALIZED_DIMENSION } from "./embedding.factory.js";
import type { Character } from "../db/schema.js";
import { getDb } from "../db/client.js";
import { characters } from "../db/schema.js";
import { eq } from "drizzle-orm";

const INDEX_NAME = "characters";

export class CharacterIndexingService {
  private vectorStore = getVectorStore();

  async initialize(): Promise<void> {
    await this.vectorStore.createIndex({
      indexName: INDEX_NAME,
      dimension: NORMALIZED_DIMENSION,
    });
  }

  /**
   * Build searchable text from character data.
   */
  private buildSearchableText(character: Character): string {
    const parts = [
      character.name,
      character.profile.species,
      character.profile.bodyType,
      ...character.profile.features,
      ...character.profile.distinguishing,
      ...character.profile.clothing,
      character.promptFragments.positive,
    ];
    return parts.filter(Boolean).join(" ");
  }

  /**
   * Index a single character.
   */
  async indexCharacter(character: Character): Promise<void> {
    const text = this.buildSearchableText(character);
    const [embedding] = await embedManyWithFallback([text]);
    
    await this.vectorStore.upsert({
      indexName: INDEX_NAME,
      vectors: [embedding],
      metadata: [{
        id: character.id,
        name: character.name,
        projectId: character.projectId,
        species: character.profile.species,
        thumbnail: character.referenceImages?.[0],
      }],
    });
  }

  /**
   * Index all characters (for initial setup or reindexing).
   */
  async indexAllCharacters(projectId?: string): Promise<number> {
    const db = getDb();
    const query = projectId 
      ? db.select().from(characters).where(eq(characters.projectId, projectId))
      : db.select().from(characters);
    
    const allCharacters = await query;
    
    if (allCharacters.length === 0) return 0;
    
    const texts = allCharacters.map(c => this.buildSearchableText(c));
    const embeddings = await embedManyWithFallback(texts);
    
    await this.vectorStore.upsert({
      indexName: INDEX_NAME,
      vectors: embeddings,
      metadata: allCharacters.map(c => ({
        id: c.id,
        name: c.name,
        projectId: c.projectId,
        species: c.profile.species,
        thumbnail: c.referenceImages?.[0],
      })),
    });
    
    return allCharacters.length;
  }

  /**
   * Search for characters by natural language query.
   */
  async search(query: string, options?: {
    projectId?: string;
    topK?: number;
  }): Promise<Array<{
    id: string;
    name: string;
    score: number;
    projectId: string;
    thumbnail?: string;
  }>> {
    const [queryEmbedding] = await embedManyWithFallback([query]);
    
    const results = await this.vectorStore.query({
      indexName: INDEX_NAME,
      queryVector: queryEmbedding,
      topK: options?.topK ?? 5,
      filter: options?.projectId ? { projectId: options.projectId } : undefined,
    });
    
    return results.map(r => ({
      id: r.metadata.id as string,
      name: r.metadata.name as string,
      score: r.score,
      projectId: r.metadata.projectId as string,
      thumbnail: r.metadata.thumbnail as string | undefined,
    }));
  }

  /**
   * Remove character from index.
   */
  async removeCharacter(characterId: string): Promise<void> {
    await this.vectorStore.delete({
      indexName: INDEX_NAME,
      ids: [characterId],
    });
  }
}

// Singleton
let instance: CharacterIndexingService | null = null;

export function getCharacterIndexingService(): CharacterIndexingService {
  if (!instance) {
    instance = new CharacterIndexingService();
  }
  return instance;
}

export function resetCharacterIndexingService(): void {
  instance = null;
}
```

### 4.2 Match Characters Tool (RAG-Powered)

```typescript
// packages/core/src/agents/tools/match-characters.tool.ts

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getCharacterIndexingService } from "../../rag/character-indexing.service.js";

export const matchCharactersTool = createTool({
  id: "matchCharacters",
  description: `Search for existing characters that match the user's description.
Use this when the user mentions characters to see if they already exist.
Return matches with scores so the user can choose to reuse or create new.`,
  
  inputSchema: z.object({
    query: z.string().describe("Description or name of character(s) to search for"),
    projectId: z.string().optional().describe("Optional project ID to search within"),
  }),
  
  outputSchema: z.object({
    matches: z.array(z.object({
      id: z.string(),
      name: z.string(),
      score: z.number().describe("Similarity score 0-1, higher is better match"),
      projectId: z.string(),
      thumbnail: z.string().optional(),
    })),
    message: z.string().describe("Human-readable summary of matches"),
  }),
  
  execute: async ({ query, projectId }) => {
    const indexingService = getCharacterIndexingService();
    const matches = await indexingService.search(query, { projectId, topK: 5 });
    
    // Filter to reasonable matches (score > 0.5)
    const goodMatches = matches.filter(m => m.score > 0.5);
    
    let message: string;
    if (goodMatches.length === 0) {
      message = "No existing characters match that description. We can create new ones!";
    } else if (goodMatches.length === 1) {
      message = `Found "${goodMatches[0].name}" which might be a match. Want to use this character?`;
    } else {
      const names = goodMatches.slice(0, 3).map(m => m.name).join(", ");
      message = `Found ${goodMatches.length} potential matches: ${names}. Any of these?`;
    }
    
    return { matches: goodMatches, message };
  },
});
```

---

## Phase 5: Bootstrap Service

```typescript
// packages/core/src/services/bootstrap.service.ts

import { getDb } from "../db/client.js";
import { projects, characters, storyboards, panels, premises } from "../db/schema.js";
import { getCharacterIndexingService } from "../rag/character-indexing.service.js";

export interface BootstrapInput {
  name: string;
  description: string;
  characters: Array<{
    name: string;
    description?: string;
    existingId?: string; // If reusing existing character
  }>;
  storyOutline?: string;
  setting?: string;
  style?: string;
  pageCount: number;
}

export interface BootstrapResult {
  projectId: string;
  characterIds: string[];
  storyboardId: string;
  premiseId?: string;
}

export class BootstrapService {
  async createFromChat(input: BootstrapInput): Promise<BootstrapResult> {
    const db = getDb();
    const indexingService = getCharacterIndexingService();
    
    return db.transaction(async (tx) => {
      // 1. Create project
      const [project] = await tx.insert(projects).values({
        name: input.name,
        description: input.description,
      }).returning();
      
      // 2. Create or link characters
      const characterIds: string[] = [];
      
      for (const char of input.characters) {
        if (char.existingId) {
          // Just link existing character ID
          characterIds.push(char.existingId);
        } else {
          // Create new character with minimal profile
          const [newChar] = await tx.insert(characters).values({
            projectId: project.id,
            name: char.name,
            profile: {
              species: "unspecified",
              bodyType: "average",
              features: [],
              ageDescriptors: [],
              clothing: [],
              distinguishing: char.description ? [char.description] : [],
            },
            promptFragments: {
              positive: char.name,
              negative: "",
              triggers: [],
            },
          }).returning();
          
          characterIds.push(newChar.id);
          
          // Index for future RAG
          await indexingService.indexCharacter(newChar);
        }
      }
      
      // 3. Create default storyboard
      const [storyboard] = await tx.insert(storyboards).values({
        projectId: project.id,
        name: "Main Story",
        description: input.storyOutline || "",
      }).returning();
      
      // 4. Create initial panels
      if (input.pageCount > 0) {
        const panelsToCreate = Array.from({ length: input.pageCount }, (_, i) => ({
          storyboardId: storyboard.id,
          position: i,
          description: "",
          characterIds,
        }));
        await tx.insert(panels).values(panelsToCreate);
      }
      
      // 5. Create premise if story outline provided
      let premiseId: string | undefined;
      if (input.storyOutline) {
        const [premise] = await tx.insert(premises).values({
          projectId: project.id,
          logline: input.storyOutline,
          characterIds,
          setting: input.setting,
          status: "active",
        }).returning();
        premiseId = premise.id;
      }
      
      return {
        projectId: project.id,
        characterIds,
        storyboardId: storyboard.id,
        premiseId,
      };
    });
  }
}

// Singleton
let instance: BootstrapService | null = null;

export function getBootstrapService(): BootstrapService {
  if (!instance) {
    instance = new BootstrapService();
  }
  return instance;
}
```

---

## UI: Thread History Sidebar + Dropdown

### Sidebar Component

```typescript
// packages/ui/src/components/chat/ThreadSidebar.tsx

interface ThreadSidebarProps {
  threads: ChatThread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  isOpen,
  onClose,
}: ThreadSidebarProps) {
  // Group threads by status
  const active = threads.filter(t => t.status === "active");
  const completed = threads.filter(t => t.status === "completed");
  
  return (
    <aside className={`thread-sidebar ${isOpen ? "open" : ""}`}>
      <header>
        <h3>Conversations</h3>
        <button onClick={onNewThread}>+ New</button>
      </header>
      
      <section>
        <h4>Active</h4>
        {active.map(thread => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            isActive={thread.id === activeThreadId}
            onClick={() => onSelectThread(thread.id)}
          />
        ))}
      </section>
      
      {completed.length > 0 && (
        <section>
          <h4>Completed</h4>
          {completed.map(thread => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onSelectThread(thread.id)}
            />
          ))}
        </section>
      )}
    </aside>
  );
}
```

### Dropdown Component

```typescript
// packages/ui/src/components/chat/ThreadDropdown.tsx

interface ThreadDropdownProps {
  threads: ChatThread[];
  activeThread?: ChatThread;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

export function ThreadDropdown({
  threads,
  activeThread,
  onSelectThread,
  onNewThread,
}: ThreadDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="thread-dropdown">
      <button 
        className="thread-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeThread?.title || "New Conversation"}
        <ChevronDown />
      </button>
      
      {isOpen && (
        <ul className="thread-dropdown-menu">
          <li>
            <button onClick={onNewThread}>
              <Plus /> New Conversation
            </button>
          </li>
          <hr />
          {threads.map(thread => (
            <li key={thread.id}>
              <button 
                onClick={() => {
                  onSelectThread(thread.id);
                  setIsOpen(false);
                }}
                className={thread.id === activeThread?.id ? "active" : ""}
              >
                {thread.title || "Untitled"}
                <span className="thread-date">
                  {formatRelativeDate(thread.lastActivityAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Environment Variables

```bash
# .env.example additions

# Vector Store
VECTOR_STORE_PROVIDER=libsql  # libsql | qdrant | pinecone

# Qdrant (when ready to scale)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Pinecone (alternative)
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=

# Embedding Provider
EMBEDDING_PROVIDER=ollama  # ollama | openai
OLLAMA_EMBED_MODEL=mxbai-embed-large

# OpenAI (fallback)
OPENAI_API_KEY=sk-...
```

---

## Migration Checklist

1. [ ] Install Mastra packages
2. [ ] Create vector store abstraction + LibSQL implementation
3. [ ] Create embedding provider abstraction + Ollama/OpenAI implementations
4. [ ] Add `chat_threads` + `chat_messages` tables
5. [ ] Run migration
6. [ ] Create Mastra agent with working memory
7. [ ] Create model adapter wrapper
8. [ ] Create tools (matchCharacters, bootstrapProject)
9. [ ] Update API routes to use agent
10. [ ] Add character indexing service
11. [ ] Create ThreadSidebar + ThreadDropdown components
12. [ ] Wire up UI to new persistence layer
13. [ ] Write tests for new components
14. [ ] Run E2E tests

---

## Testing Strategy

### Unit Tests
- Vector store implementations (mock cosine similarity)
- Embedding providers (mock API calls)
- BootstrapService (transaction logic)
- CharacterIndexingService (indexing + search)

### Integration Tests
- Agent flow with mock LLM
- Tool execution
- Thread persistence

### E2E Tests
- Full conversation flow
- Character matching
- Project creation
- Thread resume
