# Graphix MCP Server

The Model Context Protocol (MCP) server exposes all Graphix functionality as tools that can be used by AI assistants like Claude.

## Overview

Graphix provides **201 MCP tools** organized into categories:

| Category | Tools | Description |
|----------|-------|-------------|
| Project | 5 | CRUD for projects |
| Character | 9 | Character management with LoRA/reference images |
| Storyboard | 6 | Storyboard CRUD and duplication |
| Panel | 11 | Panel creation, generation, character placement |
| Generation | 6 | Image generation history and curation |
| Composition | 6 | Page layout and export |
| Consistency | 10 | IP-Adapter identity extraction and chaining |
| Style | 7 | LoRA management and style application |
| Pose | 13 | Pose extraction, library, expressions |
| Inpaint | 4 | Inpainting and masking |
| Lighting | 6 | Scene lighting presets |
| Curation | 6 | Batch rating and selection |
| Analytics | 3 | Generation analysis and suggestions |
| Interpolation | 2 | Panel interpolation |
| Interaction | 9 | Multi-character interaction poses |
| Asset | 9 | Custom asset management |
| Caption | 10 | Text captions and speech bubbles |
| Story | 3 | Story scaffolding from outlines |
| Batch | 10 | Bulk operations |
| Text Generation | 8 | LLM-powered text generation |
| Generated Text | 15 | Text storage and versioning |
| **Narrative** | 12 | Premise and Story CRUD |
| **Beat** | 12 | Story beats and caption generation |
| **Chat/Bootstrap** | 10 | Chat sessions and project bootstrap |

## Configuration

### For Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "graphix": {
      "command": "bun",
      "args": ["run", "/path/to/graphix/packages/server/src/mcp/standalone.ts"],
      "env": {
        "DATABASE_URL": "file:/path/to/graphix.db"
      }
    }
  }
}
```

### For Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json` (Linux/Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "graphix": {
      "command": "bun",
      "args": ["run", "/path/to/graphix/packages/server/src/mcp/standalone.ts"]
    }
  }
}
```

## Core Workflows

### 1. Project Bootstrap (Quickest Path)

Create a complete project in one call:

```
project_bootstrap
├── Input: name, characters[], setting?, storyboardName?
└── Output: projectId, characterIds[], storyboardId?
```

**Example:**
```json
{
  "name": "Luna's Journey",
  "description": "A wolf's adventure",
  "characters": [
    { "name": "Luna", "description": "Silver wolf", "visualTraits": { "species": "wolf" } }
  ],
  "setting": "Northern wilderness",
  "storyboardName": "Chapter 1"
}
```

### 2. Full Narrative Pipeline

For structured storytelling with beats:

```
story_premise_create (logline, genre, tone)
    └── narrative_story_create (title, synopsis, structure)
            └── story_beat_create_batch (beats[])
                    └── story_beat_to_panel (convert to visual panel)
                            └── story_beat_to_prompt (generate image prompts)
                                    └── story_beat_generate_captions (add text)
```

### 3. Direct Panel Workflow

For quick panel creation without narrative structure:

```
project_create
    └── character_create (per character)
            └── storyboard_create
                    └── panel_create
                            └── panel_describe
                                    └── panel_generate
```

## Tool Reference

### Narrative Tools (New)

#### Premise CRUD
- `story_premise_create` - Create a story premise (logline, genre, tone, themes)
- `story_premise_get` - Get premise by ID
- `story_premise_get_with_stories` - Get premise with all stories
- `story_premise_list` - List premises for a project
- `story_premise_update` - Update premise
- `story_premise_delete` - Delete premise

#### Story CRUD
- `narrative_story_create` - Create story under a premise
- `narrative_story_get` - Get story by ID
- `narrative_story_get_with_beats` - Get story with all beats
- `narrative_story_list` - List stories for a premise
- `narrative_story_update` - Update story
- `narrative_story_delete` - Delete story

### Beat Tools

#### Beat CRUD
- `story_beat_create` - Create a single beat
- `story_beat_create_batch` - Create multiple beats
- `story_beat_get` - Get beat by ID
- `story_beat_list` - List beats for a story
- `story_beat_update` - Update beat
- `story_beat_reorder` - Reorder beats
- `story_beat_delete` - Delete beat

#### Beat Conversion
- `story_beat_to_panel` - Convert beat to panel (creates panel with beat data)
- `story_beat_to_prompt` - Generate image prompts from beat

#### Beat Captions
- `story_beat_generate_captions` - Generate captions from beat dialogue/narration
- `story_beat_get_captions` - Get captions for a beat's panel
- `story_beat_delete_captions` - Delete captions for a beat

### Chat & Bootstrap Tools

- `chat_create_session` - Start AI-guided story creation
- `chat_get_session` - Get session with message history
- `chat_list_sessions` - List user's sessions
- `chat_send_message` - Send message and get response
- `chat_delete_session` - Delete session
- `chat_extract_story` - Extract structured data from conversation
- `chat_can_bootstrap` - Check if session has enough data
- `chat_bootstrap_project` - Create project from session
- `chat_bootstrap_from_extraction` - Create project from extracted data
- `project_bootstrap` - Direct project bootstrap (simpler)

## REST API Equivalent

All MCP tools have REST API equivalents. Start the server and visit:
- Swagger UI: http://localhost:3002/api/docs
- OpenAPI Spec: http://localhost:3002/api/docs/spec.json

### Narrative REST Endpoints

```
# Premises
GET    /api/narrative/projects/:projectId/premises
POST   /api/narrative/premises
GET    /api/narrative/premises/:id
GET    /api/narrative/premises/:id/full  (with stories)
PATCH  /api/narrative/premises/:id
DELETE /api/narrative/premises/:id

# Stories
POST   /api/narrative/premises/:premiseId/stories
GET    /api/narrative/premises/:premiseId/stories
GET    /api/narrative/stories/:id
GET    /api/narrative/stories/:id/full  (with beats)
PATCH  /api/narrative/stories/:id
DELETE /api/narrative/stories/:id

# Beats
POST   /api/narrative/stories/:storyId/beats
POST   /api/narrative/stories/:storyId/beats/batch
GET    /api/narrative/stories/:storyId/beats
GET    /api/narrative/beats/:id
PATCH  /api/narrative/beats/:id
POST   /api/narrative/stories/:storyId/beats/reorder
DELETE /api/narrative/beats/:id

# Conversion
POST   /api/narrative/beats/:id/to-panel
POST   /api/narrative/stories/:id/to-storyboard

# LLM Generation
POST   /api/narrative/generate/premise
POST   /api/narrative/premises/:id/generate-story
POST   /api/narrative/stories/:id/generate-beats
POST   /api/narrative/generate/full-story
POST   /api/narrative/beats/:id/refine
GET    /api/narrative/llm/status
```

## Running the MCP Server

### Standalone (for MCP clients)

```bash
cd packages/server
bun run src/mcp/standalone.ts
```

### With REST API (development)

```bash
cd packages/server
bun run dev  # Starts REST on :3002, MCP via stdio
```

## Testing MCP Tools

### Using MCP Inspector

```bash
npx @anthropic-ai/mcp-inspector
# Connect to: bun run /path/to/graphix/packages/server/src/mcp/standalone.ts
```

### Via REST API

```bash
# Example: Create a premise
curl -X POST http://localhost:3002/api/narrative/premises \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "logline": "A young wolf must find a new pack",
    "genre": "adventure",
    "tone": "hopeful"
  }'
```

## Environment Variables

```bash
# Required
DATABASE_URL=file:./graphix.db  # or libsql:// for Turso

# Optional
ANTHROPIC_API_KEY=sk-...  # For LLM features (chat, text generation)
COMFYUI_MCP_URL=http://localhost:3001  # For image generation
```
