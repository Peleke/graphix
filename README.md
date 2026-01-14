# Graphix

GenAI art + video workflow system for multi-panel narrative generation.

## Milestones

1. **M1: Static Graphic Novels** - Multi-panel narrative art generation
2. **M2: Interactive Panels** - Click any panel → plays I2V animated clip
3. **M3: Animated Shorts** - Full multi-minute videos using T2I → I2V → V2V pipeline

## Architecture

- **Decoupled**: MCP for Claude Code, REST for arbitrary clients
- **Storage**: Turso (distributed) / SQLite (local) toggle
- **Generation**: Leverages [comfyui-mcp](../comfyui-mcp) for image/video generation

## Quick Start

```bash
# Install dependencies
bun install

# Run migrations (SQLite local mode)
STORAGE_MODE=sqlite bun run db:push

# Start dev server
bun run dev
```

## Skills (MCP Tools)

| Skill | Description |
|-------|-------------|
| `/project create` | Create new project |
| `/character create` | Define character profile |
| `/storyboard create` | Create storyboard with panels |
| `/panel describe` | Set panel description |
| `/panel generate` | Generate panel image(s) |
| `/panel animate` | Generate I2V animation (M2) |
| `/page layout` | Apply page template |
| `/scene create` | Create scene with shots (M3) |

## License

MIT
