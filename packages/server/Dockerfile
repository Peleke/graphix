# ============================================================================
# GRAPHIX SERVER DOCKERFILE 🏴‍☠️
# ============================================================================

FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/server/package.json ./packages/server/
COPY packages/core/package.json ./packages/core/
COPY packages/client/package.json ./packages/client/
RUN bun install --frozen-lockfile

# Development
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/packages/server
EXPOSE 3002
CMD ["bun", "run", "dev"]

# Production build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["bun", "run", "dist/start.js"]
