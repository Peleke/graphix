/**
 * Service Health Hooks
 *
 * Hooks for monitoring backend service health status.
 */

import { useQuery } from "@tanstack/react-query";

export interface ComfyUIHealthResponse {
  status: "connected" | "unreachable" | "error";
  latency_ms?: number;
  url: string;
  hint?: string;
  error?: string;
}

export interface ServerHealthResponse {
  status: "ok";
  timestamp: string;
}

/**
 * Check ComfyUI MCP server connectivity.
 * Polls every 30 seconds to keep status current.
 */
export function useComfyUIHealth(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["health", "comfyui"],
    queryFn: async (): Promise<ComfyUIHealthResponse> => {
      const response = await fetch("/api/health/comfyui");
      return response.json();
    },
    refetchInterval: 30_000, // Poll every 30 seconds
    retry: false, // Don't retry on failure - just show status
    enabled: options?.enabled ?? true,
  });
}

/**
 * Check main server health.
 * Polls every 30 seconds.
 */
export function useServerHealth(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["health", "server"],
    queryFn: async (): Promise<ServerHealthResponse> => {
      const response = await fetch("/api/health");
      if (!response.ok) {
        throw new Error("Server unreachable");
      }
      return response.json();
    },
    refetchInterval: 30_000,
    retry: false,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Combined service health status.
 * Returns overall health of all services.
 */
export function useServiceHealth() {
  const server = useServerHealth();
  const comfyui = useComfyUIHealth({ enabled: server.isSuccess });

  return {
    server: {
      status: server.isSuccess ? "ok" : server.isError ? "error" : "loading",
      isLoading: server.isLoading,
      isError: server.isError,
    },
    comfyui: {
      status: comfyui.data?.status ?? (comfyui.isLoading ? "loading" : "error"),
      latency: comfyui.data?.latency_ms,
      url: comfyui.data?.url,
      hint: comfyui.data?.hint,
      isLoading: comfyui.isLoading,
      isError: comfyui.isError || comfyui.data?.status !== "connected",
    },
    isFullyOperational:
      server.isSuccess && comfyui.data?.status === "connected",
  };
}
