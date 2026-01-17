/**
 * Generation API Hooks
 * 
 * TanStack Query hooks for generation operations.
 * Connects Generation Tree to backend API.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

// ============================================================================
// Query Keys
// ============================================================================

export const generationKeys = {
  all: ["generations"] as const,
  byPanel: (panelId: string) => [...generationKeys.all, "panel", panelId] as const,
  detail: (id: string) => [...generationKeys.all, "detail", id] as const,
  selected: (panelId: string) => [...generationKeys.byPanel(panelId), "selected"] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all generations for a panel (for tree visualization)
 */
export function useGenerationsByPanel(panelId: string | null) {
  return useQuery({
    queryKey: generationKeys.byPanel(panelId ?? ""),
    queryFn: async () => {
      if (!panelId) return [];

      const { data, error } = await apiClient.GET("/generations/panel/{panelId}", {
        params: { path: { panelId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch generations");
      }

      return data?.generations || [];
    },
    enabled: !!panelId,
  });
}

/**
 * Fetch a single generation by ID
 */
export function useGeneration(id: string | null) {
  return useQuery({
    queryKey: generationKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/generations/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch generation");
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch selected generation for a panel
 */
export function useSelectedGeneration(panelId: string | null) {
  return useQuery({
    queryKey: generationKeys.selected(panelId ?? ""),
    queryFn: async () => {
      if (!panelId) return null;

      const { data, error } = await apiClient.GET("/generations/panel/{panelId}/selected", {
        params: { path: { panelId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch selected generation");
      }

      return data;
    },
    enabled: !!panelId,
  });
}

/**
 * Select a generation as the panel output
 */
export function useSelectGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ panelId, generationId }: { panelId: string; generationId: string }) => {
      const { error } = await apiClient.POST("/panels/{id}/select-output", {
        params: { path: { id: panelId } },
        body: { outputId: generationId },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to select generation");
      }

      return { panelId, generationId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: generationKeys.byPanel(variables.panelId),
      });
      queryClient.invalidateQueries({
        queryKey: generationKeys.selected(variables.panelId),
      });
    },
  });
}

/**
 * Rate a generation
 */
export function useRateGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ generationId, rating }: { generationId: string; rating: number }) => {
      const { error } = await apiClient.POST("/generations/{id}/rating", {
        params: { path: { id: generationId } },
        body: { rating },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to rate generation");
      }

      return { generationId, rating };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: generationKeys.detail(variables.generationId),
      });
    },
  });
}
