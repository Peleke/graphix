/**
 * API Client Configuration
 * 
 * Centralized API client instance for the UI.
 */

import { createGraphixClient } from "@graphix/client";

// Create a singleton client instance
export const apiClient = createGraphixClient({
  baseUrl: import.meta.env.VITE_API_URL || "/api",
  timeout: 300000, // 5 minutes for ComfyUI generation
});

// Re-export types for convenience
export { GraphixApiError, isGraphixApiError } from "@graphix/client";
export type { ClientOptions } from "@graphix/client";
