# Graphix Usage Guide

This guide demonstrates how to use `@graphix/core` to create comic panels and pages programmatically.

## Installation

```bash
# Install dependencies
bun install

# Or with npm
npm install
```

## Quick Start: Creating a Comic Story

### 1. Initialize the Database

```typescript
import {
  createDatabase,
  setDefaultDatabase,
  migrateDb,
  setConfig,
  createDefaultConfig,
} from "@graphix/core";

// Create and set database
const connection = createDatabase({
  mode: "sqlite",
  sqlitePath: "./graphix.db",
});
setDefaultDatabase(connection);

// Run migrations
await migrateDb();

// Set config
setConfig(createDefaultConfig());
```

### 2. Create a Project

```typescript
import { getProjectService } from "@graphix/core";

const projectService = getProjectService();

const project = await projectService.create({
  name: "My Comic",
  description: "An epic adventure",
  style: "anime",
  aspectRatio: "portrait",
});

console.log(`Created project: ${project.id}`);
```

### 3. Create Characters

```typescript
import { getCharacterService } from "@graphix/core";

const characterService = getCharacterService();

const hero = await characterService.create({
  projectId: project.id,
  name: "Hero",
  description: "A brave warrior",
  profile: {
    physicalDescription: "tall muscular man with dark hair",
    personalityTraits: ["brave", "kind"],
    age: 30,
    gender: "male",
  },
  promptFragments: {
    positive: "heroic pose, determined expression",
    negative: "weak, scared",
  },
});

const villain = await characterService.create({
  projectId: project.id,
  name: "Villain",
  description: "A dark sorcerer",
  profile: {
    physicalDescription: "tall thin man in dark robes",
    personalityTraits: ["cunning", "ruthless"],
    age: 50,
    gender: "male",
  },
  promptFragments: {
    positive: "menacing, powerful magic aura",
    negative: "friendly, weak",
  },
});
```

### 4. Create a Storyboard with Scenes

```typescript
import { getStoryboardService, getPanelService } from "@graphix/core";

const storyboardService = getStoryboardService();
const panelService = getPanelService();

// Create storyboard
const storyboard = await storyboardService.create({
  projectId: project.id,
  title: "Chapter 1: The Meeting",
  description: "Hero meets the villain for the first time",
});

// Create panels
const panel1 = await panelService.create({
  storyboardId: storyboard.id,
  position: 0,
  description: "Hero walks through a dark forest",
  direction: {
    cameraAngle: "wide shot",
    mood: "mysterious",
    lighting: "moonlit",
  },
  characterPlacements: [
    {
      characterId: hero.id,
      position: "center",
      scale: 0.8,
    },
  ],
});

const panel2 = await panelService.create({
  storyboardId: storyboard.id,
  position: 1,
  description: "Villain appears from the shadows",
  direction: {
    cameraAngle: "dramatic low angle",
    mood: "tense",
    lighting: "dramatic side lighting",
  },
  characterPlacements: [
    {
      characterId: villain.id,
      position: "center",
      scale: 1.0,
    },
  ],
});
```

### 5. Generate Panel Images

```typescript
import { PanelGenerator, PromptBuilder } from "@graphix/core";

const generator = new PanelGenerator({
  comfyuiUrl: process.env.COMFYUI_URL || "http://localhost:8188",
});

// Generate images for each panel
for (const panel of [panel1, panel2]) {
  const result = await generator.generate({
    panelId: panel.id,
    outputDir: "./output/panels",
    quality: "standard",
  });

  if (result.success) {
    console.log(`Generated: ${result.outputPath}`);
  }
}
```

### 6. Add Captions

```typescript
import { getCaptionService } from "@graphix/core";

const captionService = getCaptionService();

await captionService.create({
  panelId: panel1.id,
  type: "narration",
  text: "Deep in the Shadowwood Forest, our hero sensed danger...",
  position: { x: 10, y: 10 },
  style: {
    fontSize: 16,
    fontFamily: "Comic Sans MS",
    color: "#FFFFFF",
    backgroundColor: "#000000",
    padding: 8,
    borderRadius: 4,
  },
});

await captionService.create({
  panelId: panel2.id,
  type: "dialogue",
  text: "So, you've finally come...",
  position: { x: 50, y: 70 },
  style: {
    fontSize: 18,
    fontFamily: "Arial",
    color: "#000000",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    tailDirection: "bottom-left",
  },
});
```

### 7. Compose a Page

```typescript
import { CompositionService, PAGE_SIZES } from "@graphix/core";

const compositionService = new CompositionService();

const result = await compositionService.compose({
  templateId: "grid-2x1",
  panelIds: [panel1.id, panel2.id],
  outputPath: "./output/pages/page-1.png",
  pageSize: "comic_standard",
  options: {
    backgroundColor: "#FFFFFF",
    gutter: 10,
    margin: 20,
  },
});

console.log(`Page composed: ${result.outputPath}`);
```

## Using the Story Scaffold Service

For creating entire stories at once:

```typescript
import { getStoryScaffoldService } from "@graphix/core";

const scaffoldService = getStoryScaffoldService();

const result = await scaffoldService.scaffold({
  projectId: project.id,
  title: "My Epic Story",
  acts: [
    {
      name: "Act 1: Introduction",
      scenes: [
        {
          name: "Scene 1",
          description: "Hero's origin",
          panels: [
            {
              description: "Hero as a child",
              characterIds: [hero.id],
            },
            {
              description: "Hero's mentor appears",
              characterIds: [hero.id],
            },
          ],
        },
      ],
    },
  ],
});

console.log(`Created ${result.storyboards.length} storyboards`);
console.log(`Created ${result.panels.length} panels`);
```

## Batch Operations

For efficient bulk operations:

```typescript
import { getBatchService } from "@graphix/core";

const batchService = getBatchService();

// Create multiple panels at once
const panels = await batchService.createPanels(storyboard.id, [
  { description: "Panel 1", position: 0 },
  { description: "Panel 2", position: 1 },
  { description: "Panel 3", position: 2 },
]);

// Generate all panels
const generated = await batchService.generatePanels(
  panels.map((p) => p.id),
  { outputDir: "./output", quality: "standard" }
);

// Render captions on all
const rendered = await batchService.renderCaptions(
  panels.map((p) => p.id),
  "./output/with-captions"
);
```

## Available Templates

Page composition templates:

- `full-page` - Single panel filling the page
- `grid-2x1` - Two panels stacked vertically
- `grid-2x2` - Four panels in 2x2 grid
- `grid-3x2` - Six panels in 3x2 grid
- `manga-action` - Dynamic manga-style layout
- `comic-classic` - Traditional comic book layout

## Quality Presets

For image generation:

- `draft` - Fast, lower quality (good for testing)
- `standard` - Balanced quality and speed
- `high` - High quality with hi-res fix
- `ultra` - Maximum quality with upscaling

## Environment Variables

```bash
# ComfyUI connection
COMFYUI_URL=http://localhost:8188

# Database (defaults to SQLite)
DATABASE_MODE=sqlite
SQLITE_PATH=./graphix.db

# Or use Turso
DATABASE_MODE=turso
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=your-token

# Server
REST_PORT=3002
MCP_ENABLED=true
REST_ENABLED=true
```

## Running the Server

```bash
# Development mode (with hot reload)
bun run dev

# Production
bun run start

# Or with Node.js
node --experimental-specifier-resolution=node src/index.node.js
```

## API Access

Once the server is running:

- **REST API**: `http://localhost:3002/api`
- **MCP**: Available via Claude Code or MCP-compatible clients

### REST Endpoints

```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id

GET    /api/projects/:id/characters
POST   /api/projects/:id/characters
# ... and more
```

### MCP Tools

All functionality is also available via MCP tools:
- `project_create`, `project_list`, `project_get`
- `character_create`, `character_list`
- `storyboard_create`, `panel_create`
- `panel_generate`, `page_compose`
- ... and many more

## Next Steps

- Check out the [API reference](./API.md) for complete documentation
- See [examples/](../examples/) for more usage patterns
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
