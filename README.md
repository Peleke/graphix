<div align="center">

# Graphix

### AI-Native Graphic Novel & Comic Creation Tool

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Stop wrestling with Photoshop. Start generating "content."**

[Get Started](#-quick-start) · [Features](#-features) · [Architecture](#-architecture-overview) · [Contributing](#-contributing)

---

> ⚠️ **A Note on "Art"**
>
> Let's be real: what this tool produces is not *art*. It's AI-generated images arranged into panels. Real comics are made by artists who spent years mastering anatomy, perspective, and storytelling through sequential imagery. This is... not that.
>
> Graphix is for **rapid prototyping**, **concept visualization**, **moodboards**, and **having fun**. If you're using this to replace actual artists, please reconsider your life choices. If you're using it to iterate on ideas before hiring an artist, or just messing around—welcome aboard, ye scurvy dog. 🏴‍☠️
>
> *We're not delusional. We're just building tools.*

---

</div>

## The Problem

Creating visual narratives is a fragmented nightmare. You need Photoshop for editing, Midjourney for generation, ComfyUI for control, spreadsheets for character consistency, and a prayer for workflow sanity. The tools fight you instead of helping you iterate on ideas.

## The Solution

**Graphix** is an AI-native creation tool built for the workflow you actually need:

> *Characters that stay (somewhat) consistent. Panels that generate in context. Pages that compose themselves.*

Instead of juggling 10 apps, Graphix gives you one unified workspace where characters remember their appearance (mostly), panels understand their narrative context, and you focus on **the story, not the tools**.

Is it art? No. Is it useful? Hell yes.

---

## ✨ Features

### 🎭 Character Consistency Engine
Define a character once—species, colors, style—and Graphix attempts **visual consistency** across panels. IP-Adapter embeddings, LoRA associations, and prompt fragments all managed automatically. *Results may vary. Hands will still look weird.*

### 📖 Story-First Workflow
Write your premise, break it into beats, and watch panels scaffold themselves. **Narrative context flows into generation prompts** automatically. Your story drives the slop, not the other way around.

### 🎨 ControlNet Made Easy
Pose references, depth maps, lineart extraction—all the power of ComfyUI's ControlNet stacking, exposed through an **ergonomic UI** that doesn't require a PhD in diffusion models.

### 🌳 Generation Tree Visualization
Every variant, every iteration, visualized as a **D3-powered tree**. Branch from any generation, compare results side-by-side, never lose a good idea to overwriting.

### 📄 Page Composition
Drag panels into templates, adjust gutters, add captions. **WYSIWYG page composition** that exports to print-ready PDFs or image sequences.

### 🔌 Local-First Architecture
Your data, your machine. SQLite database, local file storage, **no cloud dependency**. Deploy to Turso when you're ready to share your magnificent AI slop with the world.

---

## 🆚 Why Graphix?

| | Traditional AI Workflow | Graphix |
|---|:---:|:---:|
| **Character Consistency** | Manual prompt copy-paste | ✅ Automatic embedding + LoRA |
| **Panel Context** | None—each gen is isolated | ✅ Story beats inform prompts |
| **ControlNet** | ComfyUI node spaghetti | ✅ Visual preset picker |
| **Version History** | Overwrite and pray | ✅ Full generation tree |
| **Page Layout** | Photoshop/InDesign | ✅ Built-in composer |
| **Data Ownership** | Cloud lock-in | ✅ Local-first, your files |
| **Self-Awareness** | "AI art is real art!" | ✅ We know what this is |

---

## 🖼️ Screenshots

<div align="center">

| Dashboard | Story Editor | Generation Tree |
|:---:|:---:|:---:|
| *Project overview with characters* | *Narrative-driven panel creation* | *D3 visualization of all variants* |

> *Full UI launching soon*

</div>

---

<div align="center">

# Part II: Technical Documentation

*For engineers, contributors, and the morbidly curious*

</div>

---

## 🏗️ Architecture Overview

Graphix is a monorepo with clean separation between business logic, API adapters, and UI.

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI (PWA)                                 │
│      React 19 · TanStack Router · Zustand · Fabric.js           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      @graphix/server                             │
│         Hono REST API · MCP Server · OpenAPI Spec               │
└──────────┬──────────────────┬──────────────────────────────────┘
           │                  │
           ▼                  ▼
┌─────────────────┐    ┌─────────────────────────────────────────┐
│  @graphix/core  │    │              ComfyUI MCP                 │
│  Business Logic │    │     Image/Video Generation via MCP      │
│  Drizzle ORM    │    │                                         │
└────────┬────────┘    └─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  SQLite/Turso   │
│   Database      │
└─────────────────┘
```

### Package Structure

| Package | Purpose |
|---------|---------|
| `@graphix/core` | Pure business logic—services, generation, composition. Zero transport concerns. |
| `@graphix/server` | REST API (Hono) + MCP server. OpenAPI spec with Zod schemas. |
| `@graphix/client` | Type-safe TypeScript client generated from OpenAPI spec. |
| `@graphix/ui` | React frontend—dashboard, editors, canvas, generation tree. |

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | Bun | Fast, TypeScript-native, great DX |
| **Frontend** | React 19, TanStack Router | Modern React with file-based routing |
| **State** | Zustand + Immer | Simple, performant state management |
| **Styling** | Panda CSS | Type-safe, zero-runtime CSS-in-JS |
| **Canvas** | Fabric.js | Proven canvas library for composition |
| **Visualization** | D3.js | Generation tree rendering |
| **API** | Hono | Fast, lightweight, middleware ecosystem |
| **Database** | Drizzle ORM + SQLite/Turso | Type-safe, local-first with cloud option |
| **Validation** | Zod | Runtime validation + OpenAPI generation |
| **Testing** | Bun Test, Vitest, Playwright | Unit, integration, E2E coverage |
| **Desktop** | Tauri | Native app distribution |

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) (for image generation)
- [comfyui-mcp](https://github.com/Peleke/comfyui-mcp) (MCP bridge)

### Installation

```bash
# Clone the repository
git clone https://github.com/Peleke/graphix.git
cd graphix

# Install dependencies
bun install

# Set up environment
cp .env.example .env
```

### Environment Configuration

```bash
# .env

# Database (SQLite for local, Turso for cloud)
STORAGE_MODE=sqlite
DATABASE_URL=file:./graphix.db

# For Turso (optional)
# STORAGE_MODE=turso
# TURSO_DATABASE_URL=libsql://your-db.turso.io
# TURSO_AUTH_TOKEN=your-token

# ComfyUI MCP
COMFYUI_MCP_URL=http://localhost:3001

# Text Generation (optional)
OLLAMA_URL=http://localhost:11434
```

### Database Setup

```bash
# Push schema to database
bun run db:push

# Or run migrations
bun run db:migrate
```

### Start Development

```bash
# Start everything (recommended)
bun run dev

# Or start individually:
# Terminal 1: API server (port 3002)
cd packages/server && bun run dev

# Terminal 2: UI (port 5173)
cd packages/ui && bun run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

### Using with MCP (Claude Code / Claude Desktop)

Graphix exposes 200+ tools via MCP for AI-assisted comic creation.

**Option A: Install from npm** (recommended)
```json
{
  "mcpServers": {
    "graphix": {
      "command": "npx",
      "args": ["-y", "@graphix/server"],
      "env": {
        "COMFYUI_MCP_URL": "http://localhost:3001"
      }
    }
  }
}
```

**Option B: Run from source** (for development)
```json
{
  "mcpServers": {
    "graphix": {
      "command": "bun",
      "args": ["run", "/path/to/graphix/packages/server/src/bin-mcp.ts"],
      "env": {
        "COMFYUI_MCP_URL": "http://localhost:3001"
      }
    }
  }
}
```

The only required env var is `COMFYUI_MCP_URL`. SQLite database auto-creates on first run. See [docs/MCP.md](./docs/MCP.md) for the full tool reference and optional configuration.

---

## 📁 Project Structure

```
graphix/
├── packages/
│   ├── core/                     # Business logic
│   │   ├── src/
│   │   │   ├── db/               # Drizzle schema & connection
│   │   │   ├── services/         # Project, Character, Panel, etc.
│   │   │   ├── generation/       # ComfyUI client, ControlNet, LoRA
│   │   │   ├── composition/      # Page layout, export
│   │   │   └── utils/            # Security, upload handling
│   │   └── package.json
│   │
│   ├── server/                   # API layer
│   │   ├── src/
│   │   │   ├── rest/             # Hono routes
│   │   │   ├── mcp/              # MCP server
│   │   │   └── openapi/          # OpenAPI spec generation
│   │   └── package.json
│   │
│   ├── client/                   # Generated TypeScript client
│   │   └── src/
│   │
│   └── ui/                       # React frontend
│       ├── src/
│       │   ├── routes/           # TanStack Router pages
│       │   ├── components/       # React components
│       │   │   ├── dashboard/    # Project list, cards
│       │   │   ├── characters/   # Character editor, LoRA browser
│       │   │   ├── generation-tree/  # D3 visualization
│       │   │   ├── panel-generator/  # Panel creation UI
│       │   │   └── page-composer/    # Canvas composition
│       │   ├── api/              # TanStack Query hooks
│       │   ├── stores/           # Zustand stores
│       │   └── theme/            # Design tokens
│       ├── e2e/                  # Playwright tests
│       └── package.json
│
├── docs/                         # Planning & documentation
├── scripts/                      # Build & deploy scripts
└── package.json                  # Workspace root
```

---

## 🧪 Testing

```bash
# Run all tests
bun test

# Run by package
cd packages/core && bun test      # 1941 tests
cd packages/server && bun test    # 583 tests
cd packages/ui && bun run test    # 876 tests (Vitest)

# E2E tests
cd packages/ui && bun run test:e2e

# Watch mode
bun test --watch
```

### Test Coverage

| Package | Tests | Coverage |
|---------|-------|----------|
| @graphix/core | 1,941 | Services, generation, composition |
| @graphix/server | 583 | REST routes, contract tests |
| @graphix/ui | 876 | Stores, hooks, components |
| **Total** | **3,400** | Full stack coverage |

---

## 📊 API Documentation

The REST API is fully documented with OpenAPI 3.0. Start the server and visit:

- **Swagger UI**: [http://localhost:3002/api/docs](http://localhost:3002/api/docs)
- **OpenAPI Spec**: [http://localhost:3002/api/docs/spec.json](http://localhost:3002/api/docs/spec.json)

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/projects` | List all projects |
| `POST /api/projects` | Create new project |
| `GET /api/characters` | List characters for a project |
| `POST /api/panels/:id/generate` | Generate panel image |
| `GET /api/generations/:panelId` | Get all generations for a panel |
| `POST /api/composition/export` | Export page as PDF/PNG |

---

## 🎯 Roadmap

### ✅ M1: Static Graphic Novels (Current)
- [x] Project & character management
- [x] Story scaffolding (premise → beats → panels)
- [x] Panel generation with ControlNet
- [x] Generation tree visualization
- [x] Page composition & export
- [ ] Full E2E flow validation

### 🔜 M2: Interactive Panels
- [ ] Click panel → I2V animation
- [ ] Audio integration
- [ ] Timeline editor

### 🔮 M3: Animated Shorts
- [ ] T2I → I2V → V2V pipeline
- [ ] Scene-based workflow
- [ ] Multi-minute video export

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/amazing-feature`)
3. **Write tests** for your changes
4. **Run the test suite** (`bun test`)
5. **Commit** with conventional commits (`git commit -m 'feat: add amazing feature'`)
6. **Push** and open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — The backbone of image generation
- [comfyui-mcp](https://github.com/Peleke/comfyui-mcp) — MCP bridge for ComfyUI
- [Hono](https://hono.dev/) — Lightning-fast web framework
- [TanStack](https://tanstack.com/) — Router & Query excellence
- [D3.js](https://d3js.org/) — Generation tree visualization
- **Actual artists** — Who do the real thing. Hire them.

---

<div align="center">

**Built for rapid iteration, not artistic pretension.**

🏴‍☠️ *ARRR, NOW GO GENERATE SOME MAGNIFICENT SLOP!* 🏴‍☠️

[⬆ Back to top](#graphix)

</div>
