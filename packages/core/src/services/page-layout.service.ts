/**
 * Page Layout Service
 *
 * Stores and retrieves page composition layouts for storyboards.
 */

import { and, eq } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  pageLayouts,
  type PageLayout,
  type NewPageLayout,
  type PageLayoutConfig,
  type PanelPlacement,
} from "../db/index.js";

export class PageLayoutService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  async getByStoryboard(storyboardId: string, pageNumber = 1): Promise<PageLayout | null> {
    const result = await this.db
      .select()
      .from(pageLayouts)
      .where(and(eq(pageLayouts.storyboardId, storyboardId), eq(pageLayouts.pageNumber, pageNumber)));

    return result[0] ?? null;
  }

  async upsertLayout(data: {
    storyboardId: string;
    name: string;
    pageNumber: number;
    layoutConfig: PageLayoutConfig;
    panelPlacements: PanelPlacement[];
  }): Promise<PageLayout> {
    const now = new Date();
    const existing = await this.getByStoryboard(data.storyboardId, data.pageNumber);

    if (existing) {
      const [updated] = await this.db
        .update(pageLayouts)
        .set({
          name: data.name,
          layoutConfig: data.layoutConfig,
          panelPlacements: data.panelPlacements,
          updatedAt: now,
        })
        .where(eq(pageLayouts.id, existing.id))
        .returning();

      return updated;
    }

    const insert: NewPageLayout = {
      storyboardId: data.storyboardId,
      name: data.name,
      pageNumber: data.pageNumber,
      layoutConfig: data.layoutConfig,
      panelPlacements: data.panelPlacements,
      createdAt: now,
      updatedAt: now,
    };

    const [created] = await this.db.insert(pageLayouts).values(insert).returning();
    return created;
  }
}

let instance: PageLayoutService | null = null;

export function createPageLayoutService(db: Database): PageLayoutService {
  return new PageLayoutService(db);
}

export function getPageLayoutService(): PageLayoutService {
  if (!instance) {
    instance = new PageLayoutService();
  }
  return instance;
}

export function resetPageLayoutService(): void {
  instance = null;
}
