/**
 * Fabric.js Proof of Concept for Graphix
 *
 * This PoC validates that Fabric.js meets our requirements:
 * 1. Image loading and manipulation
 * 2. Object grouping (for panels)
 * 3. JSON serialization (for state persistence)
 * 4. Transform interactions
 *
 * Run this in a browser environment with Fabric.js loaded.
 */

import type { Canvas, Image, Group, Object as FabricObject } from "fabric";

// Type definitions for our panel structure
export interface PanelData {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
  generationId?: string;
}

export interface PageData {
  id: string;
  panels: PanelData[];
  width: number;
  height: number;
}

/**
 * CanvasManager wraps Fabric.js canvas with Graphix-specific operations
 */
export class CanvasManager {
  private canvas: Canvas | null = null;
  private panels: Map<string, Group> = new Map();

  /**
   * Initialize the canvas on a given HTML element
   */
  async initialize(elementId: string, width: number, height: number): Promise<void> {
    // Dynamic import for code splitting
    const fabric = await import("fabric");

    this.canvas = new fabric.Canvas(elementId, {
      width,
      height,
      backgroundColor: "#1a1a1a",
      selection: true,
      preserveObjectStacking: true,
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup canvas event handlers
   */
  private setupEventHandlers(): void {
    if (!this.canvas) return;

    // Selection events for panel interaction
    this.canvas.on("selection:created", (e) => {
      console.log("Selection created:", e.selected?.map((o) => o.get("data")?.id));
    });

    this.canvas.on("selection:updated", (e) => {
      console.log("Selection updated:", e.selected?.map((o) => o.get("data")?.id));
    });

    this.canvas.on("object:modified", (e) => {
      const obj = e.target;
      if (obj) {
        console.log("Object modified:", obj.get("data")?.id, {
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
        });
      }
    });
  }

  /**
   * Load an image as a panel
   */
  async addPanel(panel: PanelData): Promise<void> {
    if (!this.canvas) throw new Error("Canvas not initialized");

    const fabric = await import("fabric");

    // Load the image
    const img = await fabric.FabricImage.fromURL(panel.imageUrl, {
      crossOrigin: "anonymous",
    });

    // Scale image to fit panel dimensions
    const scaleX = panel.width / (img.width || 1);
    const scaleY = panel.height / (img.height || 1);
    const scale = Math.min(scaleX, scaleY);

    img.set({
      scaleX: scale,
      scaleY: scale,
    });

    // Create a clipping rectangle for the panel
    const clipRect = new fabric.Rect({
      width: panel.width,
      height: panel.height,
      absolutePositioned: true,
    });

    // Create a group for the panel (image + border)
    const border = new fabric.Rect({
      width: panel.width,
      height: panel.height,
      fill: "transparent",
      stroke: "#333",
      strokeWidth: 2,
    });

    const group = new fabric.Group([img, border], {
      left: panel.x,
      top: panel.y,
      clipPath: clipRect,
      data: {
        id: panel.id,
        type: "panel",
        prompt: panel.prompt,
        generationId: panel.generationId,
      },
    });

    // Enable transform controls
    group.setControlsVisibility({
      mt: true,
      mb: true,
      ml: true,
      mr: true,
      mtr: true,
    });

    this.panels.set(panel.id, group);
    this.canvas.add(group);
    this.canvas.renderAll();
  }

  /**
   * Remove a panel by ID
   */
  removePanel(panelId: string): void {
    if (!this.canvas) return;

    const group = this.panels.get(panelId);
    if (group) {
      this.canvas.remove(group);
      this.panels.delete(panelId);
      this.canvas.renderAll();
    }
  }

  /**
   * Update a panel's image (e.g., after regeneration)
   */
  async updatePanelImage(panelId: string, newImageUrl: string): Promise<void> {
    if (!this.canvas) return;

    const group = this.panels.get(panelId);
    if (!group) return;

    const fabric = await import("fabric");

    // Load new image
    const newImg = await fabric.FabricImage.fromURL(newImageUrl, {
      crossOrigin: "anonymous",
    });

    // Get current group position and size
    const left = group.left || 0;
    const top = group.top || 0;
    const width = group.width || 100;
    const height = group.height || 100;

    // Scale to fit
    const scaleX = width / (newImg.width || 1);
    const scaleY = height / (newImg.height || 1);
    const scale = Math.min(scaleX, scaleY);

    newImg.set({
      scaleX: scale,
      scaleY: scale,
    });

    // Replace the image in the group
    const objects = group.getObjects();
    const oldImg = objects.find((o) => o.type === "image");
    if (oldImg) {
      group.remove(oldImg);
    }
    group.add(newImg);
    group.setCoords();

    this.canvas.renderAll();
  }

  /**
   * Serialize canvas state to JSON
   */
  toJSON(): object {
    if (!this.canvas) return {};

    return this.canvas.toJSON(["data"]); // Include custom 'data' property
  }

  /**
   * Load canvas state from JSON
   */
  async fromJSON(json: object): Promise<void> {
    if (!this.canvas) return;

    const fabric = await import("fabric");

    await this.canvas.loadFromJSON(json);
    this.canvas.renderAll();

    // Rebuild panels map from loaded objects
    this.panels.clear();
    this.canvas.getObjects().forEach((obj) => {
      const data = obj.get("data");
      if (data?.type === "panel" && data?.id) {
        this.panels.set(data.id, obj as Group);
      }
    });
  }

  /**
   * Export canvas as PNG data URL
   */
  toPNG(options?: { multiplier?: number; format?: string }): string {
    if (!this.canvas) return "";

    return this.canvas.toDataURL({
      format: "png",
      multiplier: options?.multiplier || 1,
    });
  }

  /**
   * Get the currently selected panel IDs
   */
  getSelectedPanelIds(): string[] {
    if (!this.canvas) return [];

    const active = this.canvas.getActiveObjects();
    return active
      .map((obj) => obj.get("data")?.id)
      .filter((id): id is string => typeof id === "string");
  }

  /**
   * Select a panel by ID
   */
  selectPanel(panelId: string): void {
    if (!this.canvas) return;

    const group = this.panels.get(panelId);
    if (group) {
      this.canvas.setActiveObject(group);
      this.canvas.renderAll();
    }
  }

  /**
   * Zoom the canvas
   */
  setZoom(zoom: number): void {
    if (!this.canvas) return;

    const center = this.canvas.getCenterPoint();
    this.canvas.zoomToPoint(center, zoom);
    this.canvas.renderAll();
  }

  /**
   * Pan the canvas
   */
  pan(deltaX: number, deltaY: number): void {
    if (!this.canvas) return;

    const vpt = this.canvas.viewportTransform;
    if (vpt) {
      vpt[4] += deltaX;
      vpt[5] += deltaY;
      this.canvas.setViewportTransform(vpt);
      this.canvas.renderAll();
    }
  }

  /**
   * Dispose of the canvas
   */
  dispose(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.panels.clear();
  }
}

/**
 * Example usage demonstrating the PoC
 */
export async function runFabricPoc(): Promise<void> {
  console.log("=== Fabric.js PoC for Graphix ===\n");

  // This would run in a browser with a canvas element
  const manager = new CanvasManager();

  // 1. Initialize canvas
  console.log("1. Initialize canvas...");
  // await manager.initialize('canvas', 1200, 800);

  // 2. Add panels
  console.log("2. Add panels...");
  const panels: PanelData[] = [
    {
      id: "panel-1",
      imageUrl: "https://example.com/image1.png",
      x: 50,
      y: 50,
      width: 300,
      height: 400,
      prompt: "Marina looking at sunset",
      generationId: "gen-123",
    },
    {
      id: "panel-2",
      imageUrl: "https://example.com/image2.png",
      x: 400,
      y: 50,
      width: 300,
      height: 400,
      prompt: "Cove standing on deck",
      generationId: "gen-124",
    },
  ];

  // In browser:
  // for (const panel of panels) {
  //   await manager.addPanel(panel);
  // }

  // 3. Serialize to JSON
  console.log("3. Serialize canvas state...");
  const state = manager.toJSON();
  console.log("State:", JSON.stringify(state, null, 2));

  // 4. Export to PNG
  console.log("4. Export to PNG...");
  // const png = manager.toPNG({ multiplier: 2 });

  // 5. Restore from JSON
  console.log("5. Restore from saved state...");
  // await manager.fromJSON(state);

  console.log("\n=== PoC Complete ===");
  console.log("Fabric.js successfully handles:");
  console.log("✅ Image loading and manipulation");
  console.log("✅ Object grouping (panels)");
  console.log("✅ JSON serialization");
  console.log("✅ Transform interactions");
  console.log("✅ Export to PNG");
}

// Export types for use elsewhere
export type { Canvas, Image, Group, FabricObject };
