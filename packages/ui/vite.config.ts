import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    // TanStack Router for file-based routing
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),

    // React with automatic JSX runtime
    react(),

    // PWA for offline support
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Graphix",
        short_name: "Graphix",
        description: "AI-native graphic novel and comic creation tool",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "landscape",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Cache API responses
            urlPattern: /^https?:\/\/localhost:\d+\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],

  // Path aliases
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@theme": resolve(__dirname, "./src/theme"),
      "@canvas": resolve(__dirname, "./src/canvas"),
      "@lib": resolve(__dirname, "./src/lib"),
      "styled-system": resolve(__dirname, "./styled-system"),
      // Stub Node.js modules for browser (used by @graphix/core security utils)
      path: resolve(__dirname, "./src/lib/stubs/path.ts"),
      fs: resolve(__dirname, "./src/lib/stubs/fs.ts"),
    },
  },

  // Build configuration
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          react: ["react", "react-dom"],
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
          ],
          canvas: ["fabric"],
          router: ["@tanstack/react-router", "@tanstack/react-query"],
          state: ["zustand"],
        },
      },
    },
  },

  // Development server
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy API requests to backend
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },

  // Preview server (production build testing)
  preview: {
    port: 4173,
    strictPort: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "fabric",
      "zustand",
      "@tanstack/react-router",
      "@tanstack/react-query",
    ],
  },
});
