/**
 * Prompt Analytics Service
 *
 * Analyzes successful generations to identify patterns and make recommendations.
 * "Prompt Archaeology" - learning from what worked before.
 */

import { eq, and, desc, gte, sql, like, or, inArray } from "drizzle-orm";
import { getDb, type Database } from "../db/client.js";
import { generatedImages, panels, storyboards, type GeneratedImage } from "../db/schema.js";

// ============================================================================
// Types
// ============================================================================

export interface GenerationPattern {
  category: "cfg" | "sampler" | "model" | "lora" | "prompt_term" | "negative_term";
  value: string;
  avgRating: number;
  count: number;
  successRate: number; // % of images with this pattern that are rated 4+
}

export interface AnalysisResult {
  patterns: GenerationPattern[];
  recommendations: string[];
  bestSettings: {
    model: string | null;
    cfg: number | null;
    sampler: string | null;
    steps: number | null;
    topLoras: string[];
    topPromptTerms: string[];
    topNegativeTerms: string[];
  };
  sampleSize: number;
}

export interface SuggestedParams {
  cfg: number;
  sampler: string;
  steps: number;
  model: string | null;
  loras: Array<{ name: string; strength: number }>;
  additionalPromptTerms: string[];
  additionalNegativeTerms: string[];
  confidence: "high" | "medium" | "low";
  basedOn: number; // Number of samples analyzed
}

export interface SimilarGeneration {
  image: GeneratedImage;
  similarity: number; // 0-1
  matchedTerms: string[];
}

// ============================================================================
// Service
// ============================================================================

export class PromptAnalyticsService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  /**
   * Analyze successful generations to find patterns
   */
  async analyze(options: {
    projectId?: string;
    minRating?: number;
    limit?: number;
  }): Promise<AnalysisResult> {
    const minRating = options.minRating ?? 3;
    const limit = options.limit ?? 500;

    // Get successful generations
    let query = this.db
      .select()
      .from(generatedImages)
      .where(gte(generatedImages.rating, minRating))
      .orderBy(desc(generatedImages.rating), desc(generatedImages.createdAt))
      .limit(limit);

    // If projectId specified, filter by project
    let images: GeneratedImage[];
    if (options.projectId) {
      // Get panel IDs for this project through storyboards
      const projectStoryboards = await this.db
        .select({ id: storyboards.id })
        .from(storyboards)
        .where(eq(storyboards.projectId, options.projectId));

      const storyboardIds = projectStoryboards.map((s) => s.id);

      if (storyboardIds.length === 0) {
        return this.emptyResult();
      }

      const projectPanels = await this.db
        .select({ id: panels.id })
        .from(panels)
        .where(inArray(panels.storyboardId, storyboardIds));

      const panelIds = projectPanels.map((p) => p.id);

      if (panelIds.length === 0) {
        return this.emptyResult();
      }

      images = await this.db
        .select()
        .from(generatedImages)
        .where(and(inArray(generatedImages.panelId, panelIds), gte(generatedImages.rating, minRating)))
        .orderBy(desc(generatedImages.rating), desc(generatedImages.createdAt))
        .limit(limit);
    } else {
      images = await query;
    }

    if (images.length === 0) {
      return this.emptyResult();
    }

    const patterns: GenerationPattern[] = [];

    // Analyze CFG patterns
    const cfgCounts = this.countBy(images, (img) => String(img.cfg));
    for (const [cfg, imgs] of Object.entries(cfgCounts)) {
      const avgRating = this.avgRating(imgs);
      const successRate = this.successRate(imgs);
      patterns.push({
        category: "cfg",
        value: cfg,
        avgRating,
        count: imgs.length,
        successRate,
      });
    }

    // Analyze sampler patterns
    const samplerCounts = this.countBy(images, (img) => img.sampler);
    for (const [sampler, imgs] of Object.entries(samplerCounts)) {
      const avgRating = this.avgRating(imgs);
      const successRate = this.successRate(imgs);
      patterns.push({
        category: "sampler",
        value: sampler,
        avgRating,
        count: imgs.length,
        successRate,
      });
    }

    // Analyze model patterns
    const modelCounts = this.countBy(images, (img) => img.model);
    for (const [model, imgs] of Object.entries(modelCounts)) {
      const avgRating = this.avgRating(imgs);
      const successRate = this.successRate(imgs);
      patterns.push({
        category: "model",
        value: model,
        avgRating,
        count: imgs.length,
        successRate,
      });
    }

    // Analyze LoRA patterns
    const loraCounts: Record<string, GeneratedImage[]> = {};
    for (const img of images) {
      if (img.loras && Array.isArray(img.loras)) {
        for (const lora of img.loras as Array<{ name: string }>) {
          if (!loraCounts[lora.name]) {
            loraCounts[lora.name] = [];
          }
          loraCounts[lora.name].push(img);
        }
      }
    }
    for (const [lora, imgs] of Object.entries(loraCounts)) {
      const avgRating = this.avgRating(imgs);
      const successRate = this.successRate(imgs);
      patterns.push({
        category: "lora",
        value: lora,
        avgRating,
        count: imgs.length,
        successRate,
      });
    }

    // Analyze prompt term patterns (top terms from successful prompts)
    const termCounts = this.extractPromptTerms(images);
    for (const [term, imgs] of Object.entries(termCounts)) {
      if (imgs.length >= 3) {
        // Only include terms that appear 3+ times
        const avgRating = this.avgRating(imgs);
        const successRate = this.successRate(imgs);
        patterns.push({
          category: "prompt_term",
          value: term,
          avgRating,
          count: imgs.length,
          successRate,
        });
      }
    }

    // Sort patterns by success rate and count
    patterns.sort((a, b) => {
      if (b.successRate !== a.successRate) {
        return b.successRate - a.successRate;
      }
      return b.count - a.count;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns);

    // Find best settings
    const bestSettings = this.findBestSettings(patterns, images);

    return {
      patterns: patterns.slice(0, 50), // Top 50 patterns
      recommendations,
      bestSettings,
      sampleSize: images.length,
    };
  }

  /**
   * Suggest generation parameters based on past successes
   */
  async suggestParams(options: {
    projectId?: string;
    prompt?: string;
  }): Promise<SuggestedParams> {
    const analysis = await this.analyze({
      projectId: options.projectId,
      minRating: 4, // Only learn from highly rated
    });

    if (analysis.sampleSize < 5) {
      // Not enough data
      return {
        cfg: 7,
        sampler: "euler_ancestral",
        steps: 28,
        model: null,
        loras: [],
        additionalPromptTerms: [],
        additionalNegativeTerms: [],
        confidence: "low",
        basedOn: analysis.sampleSize,
      };
    }

    const { bestSettings } = analysis;
    const confidence =
      analysis.sampleSize >= 50 ? "high" : analysis.sampleSize >= 20 ? "medium" : "low";

    // If prompt provided, find matching successful terms
    let additionalPromptTerms: string[] = [];
    let additionalNegativeTerms: string[] = [];

    if (options.prompt) {
      const promptTerms = options.prompt.toLowerCase().split(/[,\s]+/);
      const relatedPatterns = analysis.patterns.filter(
        (p) =>
          p.category === "prompt_term" &&
          p.successRate > 0.5 &&
          !promptTerms.includes(p.value.toLowerCase())
      );

      additionalPromptTerms = relatedPatterns
        .filter((p) => p.category === "prompt_term")
        .slice(0, 5)
        .map((p) => p.value);

      additionalNegativeTerms = bestSettings.topNegativeTerms.slice(0, 5);
    }

    return {
      cfg: bestSettings.cfg ?? 7,
      sampler: bestSettings.sampler ?? "euler_ancestral",
      steps: bestSettings.steps ?? 28,
      model: bestSettings.model,
      loras: bestSettings.topLoras.slice(0, 3).map((name) => ({ name, strength: 0.8 })),
      additionalPromptTerms,
      additionalNegativeTerms,
      confidence,
      basedOn: analysis.sampleSize,
    };
  }

  /**
   * Find similar past generations to a prompt
   */
  async findSimilar(options: {
    prompt: string;
    projectId?: string;
    minRating?: number;
    limit?: number;
  }): Promise<SimilarGeneration[]> {
    const minRating = options.minRating ?? 3;
    const limit = options.limit ?? 20;

    // Tokenize the input prompt
    const inputTerms = this.tokenizePrompt(options.prompt);

    // Get successful generations
    let images: GeneratedImage[];
    if (options.projectId) {
      // Get panel IDs through storyboards
      const projectStoryboards = await this.db
        .select({ id: storyboards.id })
        .from(storyboards)
        .where(eq(storyboards.projectId, options.projectId));

      const storyboardIds = projectStoryboards.map((s) => s.id);

      if (storyboardIds.length === 0) {
        return [];
      }

      const projectPanels = await this.db
        .select({ id: panels.id })
        .from(panels)
        .where(inArray(panels.storyboardId, storyboardIds));

      const panelIds = projectPanels.map((p) => p.id);

      if (panelIds.length === 0) {
        return [];
      }

      images = await this.db
        .select()
        .from(generatedImages)
        .where(and(inArray(generatedImages.panelId, panelIds), gte(generatedImages.rating, minRating)))
        .orderBy(desc(generatedImages.rating))
        .limit(500);
    } else {
      images = await this.db
        .select()
        .from(generatedImages)
        .where(gte(generatedImages.rating, minRating))
        .orderBy(desc(generatedImages.rating))
        .limit(500);
    }

    // Calculate similarity for each image
    const results: SimilarGeneration[] = [];

    for (const img of images) {
      const imgTerms = this.tokenizePrompt(img.prompt);
      const { similarity, matchedTerms } = this.calculateSimilarity(inputTerms, imgTerms);

      if (similarity > 0.1) {
        // At least 10% match
        results.push({ image: img, similarity, matchedTerms });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private emptyResult(): AnalysisResult {
    return {
      patterns: [],
      recommendations: ["Not enough rated generations to analyze. Rate more images to get insights."],
      bestSettings: {
        model: null,
        cfg: null,
        sampler: null,
        steps: null,
        topLoras: [],
        topPromptTerms: [],
        topNegativeTerms: [],
      },
      sampleSize: 0,
    };
  }

  private countBy<T>(
    items: T[],
    keyFn: (item: T) => string
  ): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of items) {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    return result;
  }

  private avgRating(images: GeneratedImage[]): number {
    const rated = images.filter((img) => img.rating !== null);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, img) => sum + (img.rating ?? 0), 0) / rated.length;
  }

  private successRate(images: GeneratedImage[]): number {
    const rated = images.filter((img) => img.rating !== null);
    if (rated.length === 0) return 0;
    const successful = rated.filter((img) => (img.rating ?? 0) >= 4);
    return successful.length / rated.length;
  }

  private extractPromptTerms(images: GeneratedImage[]): Record<string, GeneratedImage[]> {
    const termCounts: Record<string, GeneratedImage[]> = {};

    for (const img of images) {
      const terms = this.tokenizePrompt(img.prompt);
      for (const term of terms) {
        if (term.length >= 3) {
          // Skip very short terms
          if (!termCounts[term]) {
            termCounts[term] = [];
          }
          termCounts[term].push(img);
        }
      }
    }

    return termCounts;
  }

  private tokenizePrompt(prompt: string): Set<string> {
    // Remove common noise and tokenize
    const cleaned = prompt
      .toLowerCase()
      .replace(/\([^)]*\)/g, "") // Remove emphasis markers
      .replace(/\[[^\]]*\]/g, "") // Remove LORA references
      .replace(/[<>{}]/g, "") // Remove special chars
      .replace(/\d+/g, "") // Remove numbers
      .split(/[,\s]+/)
      .filter((t) => t.length >= 3)
      .filter((t) => !this.isStopWord(t));

    return new Set(cleaned);
  }

  private isStopWord(term: string): boolean {
    const stopWords = new Set([
      "the",
      "and",
      "with",
      "from",
      "this",
      "that",
      "for",
      "are",
      "was",
      "has",
      "have",
      "had",
      "but",
      "not",
      "you",
      "all",
      "can",
      "her",
      "his",
      "she",
      "him",
      "one",
      "our",
      "out",
      "day",
      "get",
      "has",
      "him",
      "how",
      "its",
      "let",
      "may",
      "new",
      "now",
      "old",
      "see",
      "way",
      "who",
      "boy",
      "did",
      "own",
      "say",
      "too",
      "use",
    ]);
    return stopWords.has(term);
  }

  private calculateSimilarity(
    setA: Set<string>,
    setB: Set<string>
  ): { similarity: number; matchedTerms: string[] } {
    const matchedTerms: string[] = [];
    for (const term of setA) {
      if (setB.has(term)) {
        matchedTerms.push(term);
      }
    }

    // Jaccard similarity
    const intersection = matchedTerms.length;
    const union = setA.size + setB.size - intersection;
    const similarity = union > 0 ? intersection / union : 0;

    return { similarity, matchedTerms };
  }

  private generateRecommendations(patterns: GenerationPattern[]): string[] {
    const recommendations: string[] = [];

    // Best CFG
    const cfgPatterns = patterns.filter((p) => p.category === "cfg" && p.count >= 5);
    if (cfgPatterns.length > 0) {
      const bestCfg = cfgPatterns.sort((a, b) => b.avgRating - a.avgRating)[0];
      recommendations.push(
        `CFG ${bestCfg.value} performs best (${bestCfg.avgRating.toFixed(1)} avg rating, ${(bestCfg.successRate * 100).toFixed(0)}% success rate)`
      );
    }

    // Best sampler
    const samplerPatterns = patterns.filter((p) => p.category === "sampler" && p.count >= 5);
    if (samplerPatterns.length > 0) {
      const bestSampler = samplerPatterns.sort((a, b) => b.avgRating - a.avgRating)[0];
      recommendations.push(
        `${bestSampler.value} sampler performs best (${bestSampler.avgRating.toFixed(1)} avg rating)`
      );
    }

    // Best LoRAs
    const loraPatterns = patterns.filter((p) => p.category === "lora" && p.count >= 3);
    if (loraPatterns.length > 0) {
      const topLoras = loraPatterns.sort((a, b) => b.avgRating - a.avgRating).slice(0, 3);
      recommendations.push(
        `Top LoRAs: ${topLoras.map((l) => l.value.replace(".safetensors", "")).join(", ")}`
      );
    }

    // Common successful prompt terms
    const termPatterns = patterns.filter((p) => p.category === "prompt_term" && p.successRate > 0.6);
    if (termPatterns.length > 0) {
      const topTerms = termPatterns.slice(0, 5);
      recommendations.push(
        `High-success prompt terms: ${topTerms.map((t) => t.value).join(", ")}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Rate more generations to get personalized recommendations.");
    }

    return recommendations;
  }

  private findBestSettings(
    patterns: GenerationPattern[],
    images: GeneratedImage[]
  ): AnalysisResult["bestSettings"] {
    // Find best of each category
    const cfgPatterns = patterns.filter((p) => p.category === "cfg" && p.count >= 3);
    const samplerPatterns = patterns.filter((p) => p.category === "sampler" && p.count >= 3);
    const modelPatterns = patterns.filter((p) => p.category === "model" && p.count >= 3);
    const loraPatterns = patterns.filter((p) => p.category === "lora" && p.count >= 2);
    const termPatterns = patterns.filter((p) => p.category === "prompt_term" && p.count >= 3);

    const bestCfg = cfgPatterns.sort((a, b) => b.avgRating - a.avgRating)[0];
    const bestSampler = samplerPatterns.sort((a, b) => b.avgRating - a.avgRating)[0];
    const bestModel = modelPatterns.sort((a, b) => b.avgRating - a.avgRating)[0];
    const topLoras = loraPatterns
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5)
      .map((p) => p.value);
    const topPromptTerms = termPatterns
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10)
      .map((p) => p.value);

    // Get most common negative terms from successful images
    const negativeCounts: Record<string, number> = {};
    for (const img of images.filter((i) => (i.rating ?? 0) >= 4)) {
      if (img.negativePrompt) {
        const terms = img.negativePrompt.toLowerCase().split(/[,\s]+/).filter((t) => t.length >= 3);
        for (const term of terms) {
          negativeCounts[term] = (negativeCounts[term] ?? 0) + 1;
        }
      }
    }
    const topNegativeTerms = Object.entries(negativeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);

    // Get most common steps
    const stepsCounts: Record<number, number> = {};
    for (const img of images.filter((i) => (i.rating ?? 0) >= 4)) {
      stepsCounts[img.steps] = (stepsCounts[img.steps] ?? 0) + 1;
    }
    const bestSteps = Object.entries(stepsCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      model: bestModel?.value ?? null,
      cfg: bestCfg ? Number(bestCfg.value) : null,
      sampler: bestSampler?.value ?? null,
      steps: bestSteps ? Number(bestSteps[0]) : null,
      topLoras,
      topPromptTerms,
      topNegativeTerms,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: PromptAnalyticsService | null = null;

export function getPromptAnalyticsService(): PromptAnalyticsService {
  if (!instance) {
    instance = new PromptAnalyticsService();
  }
  return instance;
}

export function resetPromptAnalyticsService(): void {
  instance = null;
}
