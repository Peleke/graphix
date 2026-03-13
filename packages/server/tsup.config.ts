import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    bin: "src/bin.ts",
    "bin-mcp": "src/bin-mcp.ts",
  },
  format: ["esm"],
  target: "node20",
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: true,
  // Bundle @graphix/core into the output — no separate publish needed
  noExternal: ["@graphix/core"],
  // Don't bundle npm dependencies — let npm install them
  external: [
    "@libsql/client",
    "@modelcontextprotocol/sdk",
    "@hono/node-server",
    "@hono/swagger-ui",
    "@hono/zod-openapi",
    "@hono/zod-validator",
    "hono",
    "sharp",
    "drizzle-orm",
    "zod",
    "zod-to-json-schema",
    "@anthropic-ai/sdk",
    "@mastra/core",
    "@mastra/memory",
    "@paralleldrive/cuid2",
    "nanoid",
    "@supabase/storage-js",
  ],
  banner: {
    // Shebang for bin entries — tsup applies to all, but only matters for bin files
    js: "",
  },
  esbuildOptions(options) {
    // Ensure .js extensions in output for NodeNext resolution
    options.outExtension = { ".js": ".js" };
  },
});
