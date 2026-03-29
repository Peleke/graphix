# ============================================================================
# GRAPHIX MAKEFILE - Development automation for the Graphix monorepo
# ============================================================================

.PHONY: help install dev dev-full dev-web dev-desktop dev-server dev-comfyui build test clean nuke

# Colors for pretty output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# Default target
help:
	@echo ""
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║$(RESET)     $(GREEN)GRAPHIX$(RESET) - AI-Native Graphic Novel Creation Tool      $(CYAN)║$(RESET)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)QUICK START:$(RESET)"
	@echo "  $(GREEN)make install$(RESET)      - Install all dependencies (first time)"
	@echo "  $(GREEN)make dev$(RESET)          - Start everything (server + web UI)"
	@echo "  $(GREEN)make dev-full$(RESET)     - Start everything + comfyui-mcp (for image generation)"
	@echo "  $(GREEN)make dev-desktop$(RESET)  - Start desktop app (Tauri)"
	@echo ""
	@echo "$(YELLOW)INDIVIDUAL SERVICES:$(RESET)"
	@echo "  $(GREEN)make dev-server$(RESET)   - Start backend server only (port 3002)"
	@echo "  $(GREEN)make dev-web$(RESET)      - Start web UI only (port 5173)"
	@echo "  $(GREEN)make dev-comfyui$(RESET)  - Start comfyui-mcp only (port 3001)"
	@echo ""
	@echo "$(YELLOW)BUILD & TEST:$(RESET)"
	@echo "  $(GREEN)make build$(RESET)        - Build all packages"
	@echo "  $(GREEN)make build-desktop$(RESET)- Build Tauri desktop app"
	@echo "  $(GREEN)make test$(RESET)         - Run all tests"
	@echo "  $(GREEN)make test-ui$(RESET)      - Run UI tests only"
	@echo "  $(GREEN)make test-server$(RESET)  - Run server tests only"
	@echo "  $(GREEN)make typecheck$(RESET)    - Run TypeScript checks"
	@echo ""
	@echo "$(YELLOW)CLEANUP:$(RESET)"
	@echo "  $(GREEN)make clean$(RESET)        - Clean build artifacts"
	@echo "  $(GREEN)make nuke$(RESET)         - Nuclear option: clean everything"
	@echo ""
	@echo "$(YELLOW)DATABASE:$(RESET)"
	@echo "  $(GREEN)make db-push$(RESET)      - Push schema to database"
	@echo "  $(GREEN)make db-studio$(RESET)    - Open Drizzle Studio"
	@echo ""

# ============================================================================
# INSTALLATION
# ============================================================================

install: check-deps
	@echo "$(CYAN)📦 Installing dependencies...$(RESET)"
	bun install
	@echo "$(GREEN)✅ Dependencies installed!$(RESET)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(RESET)"
	@echo "  1. Copy .env.example to .env and configure"
	@echo "  2. Run 'make dev' to start development"

check-deps:
	@echo "$(CYAN)🔍 Checking dependencies...$(RESET)"
	@command -v bun >/dev/null 2>&1 || { echo "$(RED)❌ Bun not found. Install: curl -fsSL https://bun.sh/install | bash$(RESET)"; exit 1; }
	@command -v rustc >/dev/null 2>&1 || { echo "$(RED)❌ Rust not found. Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh$(RESET)"; exit 1; }
	@echo "$(GREEN)✅ All dependencies found!$(RESET)"

# ============================================================================
# DEVELOPMENT
# ============================================================================

dev: dev-server-bg dev-web
	@echo "$(GREEN)🚀 Development servers running!$(RESET)"
	@echo "   Server: http://localhost:3002"
	@echo "   Web UI: http://localhost:5173"

dev-server:
	@echo "$(CYAN)🖥️  Starting server...$(RESET)"
	cd packages/server && bun run dev

dev-server-bg:
	@echo "$(CYAN)🖥️  Starting server in background...$(RESET)"
	@cd packages/server && bun run dev &
	@sleep 2

dev-web:
	@echo "$(CYAN)🌐 Starting web UI...$(RESET)"
	cd packages/ui && bun run dev

dev-desktop: dev-server-bg
	@echo "$(CYAN)🖥️  Starting Tauri desktop app...$(RESET)"
	@echo "$(YELLOW)   First build takes ~2 min (downloading Rust crates)$(RESET)"
	cd packages/ui && bun run tauri:dev

dev-comfyui:
	@echo "$(CYAN)🎨 Starting comfyui-mcp...$(RESET)"
	cd ../comfyui-mcp && npm start

dev-comfyui-bg:
	@echo "$(CYAN)🎨 Starting comfyui-mcp in background...$(RESET)"
	@cd ../comfyui-mcp && npm start &
	@sleep 3

dev-full: dev-comfyui-bg dev-server-bg dev-web
	@echo "$(GREEN)🚀 Full stack running (with image generation)!$(RESET)"
	@echo "   ComfyUI MCP: http://localhost:3001"
	@echo "   Server: http://localhost:3002"
	@echo "   Web UI: http://localhost:5173"

# ============================================================================
# BUILD
# ============================================================================

build:
	@echo "$(CYAN)🔨 Building all packages...$(RESET)"
	bun run build
	@echo "$(GREEN)✅ Build complete!$(RESET)"

build-desktop:
	@echo "$(CYAN)🖥️  Building Tauri desktop app...$(RESET)"
	@echo "$(YELLOW)   This creates a distributable binary$(RESET)"
	cd packages/ui && bun run tauri:build
	@echo "$(GREEN)✅ Desktop build complete!$(RESET)"
	@echo "   Find your app in: packages/ui/src-tauri/target/release/bundle/"

# ============================================================================
# TESTING
# ============================================================================

test:
	@echo "$(CYAN)🧪 Running all tests...$(RESET)"
	bun test
	@echo "$(GREEN)✅ All tests passed!$(RESET)"

test-ui:
	@echo "$(CYAN)🧪 Running UI tests...$(RESET)"
	cd packages/ui && bun run test

test-server:
	@echo "$(CYAN)🧪 Running server tests...$(RESET)"
	cd packages/server && bun test

test-e2e:
	@echo "$(CYAN)🎭 Running E2E tests...$(RESET)"
	cd packages/ui && bun run test:e2e

typecheck:
	@echo "$(CYAN)📝 Running TypeScript checks...$(RESET)"
	bun run typecheck

# ============================================================================
# DATABASE
# ============================================================================

db-push:
	@echo "$(CYAN)📤 Pushing schema to database...$(RESET)"
	cd packages/server && bun run db:push

db-studio:
	@echo "$(CYAN)🎨 Opening Drizzle Studio...$(RESET)"
	cd packages/server && bun run db:studio

# ============================================================================
# CLEANUP
# ============================================================================

clean:
	@echo "$(CYAN)🧹 Cleaning build artifacts...$(RESET)"
	rm -rf packages/*/dist
	rm -rf packages/ui/src-tauri/target
	@echo "$(GREEN)✅ Clean complete!$(RESET)"

nuke: clean
	@echo "$(RED)☢️  NUCLEAR OPTION: Removing node_modules and locks...$(RESET)"
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -f bun.lockb
	rm -rf packages/ui/src-tauri/target
	@echo "$(GREEN)✅ Nuked! Run 'make install' to rebuild.$(RESET)"

# ============================================================================
# UTILITIES
# ============================================================================

logs:
	@echo "$(CYAN)📜 Tailing server logs...$(RESET)"
	tail -f packages/server/logs/*.log 2>/dev/null || echo "No logs found"

kill:
	@echo "$(CYAN)🔪 Killing all dev processes...$(RESET)"
	-pkill -f "bun run dev" 2>/dev/null
	-pkill -f "vite" 2>/dev/null
	-pkill -f "graphix" 2>/dev/null
	-pkill -f "comfyui-mcp" 2>/dev/null
	@echo "$(GREEN)✅ Processes killed!$(RESET)"
