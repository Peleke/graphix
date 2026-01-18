/**
 * Panel API Hooks
 * 
 * TanStack Query hooks for panel operations and generation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ControlNetCondition } from "../../types/controlnet";

// ============================================================================
// Query Keys
// ============================================================================

export const panelKeys = {
  all: ["panels"] as const,
  byStoryboard: (storyboardId: string) => [...panelKeys.all, "storyboard", storyboardId] as const,
  detail: (id: string) => [...panelKeys.all, "detail", id] as const,
  full: (id: string) => [...panelKeys.all, "full", id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface CreatePanelInput {
  storyboardId: string;
  position?: number;
  description?: string;
  direction?: any; // PanelDirection
  characterIds?: string[];
}

export interface GeneratePanelInput {
  /** Override panel description with custom prompt */
  prompt?: string;
  /** Override negative prompt */
  negativePrompt?: string;
  /** Model checkpoint */
  model?: string;
  /** Model family for prompt optimization */
  modelFamily?: string;
  /** Image dimensions */
  width?: number;
  height?: number;
  /** Generation parameters */
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number;
  /** ControlNet configuration */
  controlNet?: ControlNetCondition[];
  /** LoRA stack */
  loras?: Array<{ name: string; strength?: number }>;
  /** Size preset (e.g., "portrait_3x4") */
  sizePreset?: string;
  /** Quality preset (draft, standard, high, ultra) */
  qualityPreset?: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch panel by ID
 */
export function usePanel(id: string | null) {
  return useQuery({
    queryKey: panelKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/panels/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch panel");
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch panel with generations
 */
export function usePanelFull(id: string | null) {
  return useQuery({
    queryKey: panelKeys.full(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/panels/{id}/full", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch panel");
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Generate image for a panel
 */
export function useGeneratePanel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ panelId, ...input }: GeneratePanelInput & { panelId: string }) => {
      const { data, error } = await apiClient.POST("/panels/{id}/generate", {
        params: { path: { id: panelId } },
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to generate panel");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate panel and generations
      queryClient.invalidateQueries({ queryKey: panelKeys.detail(variables.panelId) });
      queryClient.invalidateQueries({ queryKey: panelKeys.full(variables.panelId) });
    },
  });
}

/**
 * Generate variants for a panel
 */
export function useGeneratePanelVariants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      panelId, 
      count = 4,
      ...input 
    }: GeneratePanelInput & { panelId: string; count?: number }) => {
      const { data, error } = await apiClient.POST("/panels/{id}/generate/variants", {
        params: { path: { id: panelId } },
        body: { ...input, count },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to generate variants");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: panelKeys.detail(variables.panelId) });
      queryClient.invalidateQueries({ queryKey: panelKeys.full(variables.panelId) });
    },
  });
}

/**
 * Create a panel in a storyboard
 */
export function useCreatePanel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePanelInput) => {
      const { data, error } = await apiClient.POST("/storyboards/{id}/panels", {
        params: { path: { id: input.storyboardId } },
        body: {
          position: input.position,
          description: input.description,
          direction: input.direction,
          characterIds: input.characterIds,
        },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create panel");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate storyboard queries to refresh panel list
      queryClient.invalidateQueries({ queryKey: ["stories", "storyboards", variables.storyboardId] });
      queryClient.invalidateQueries({ queryKey: panelKeys.byStoryboard(variables.storyboardId) });
    },
  });
}

/**
 * Select a generation as panel output
 */
export function useSelectPanelOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ panelId, generationId }: { panelId: string; generationId: string }) => {
      const { error } = await apiClient.POST("/panels/{id}/select", {
        params: { path: { id: panelId } },
        body: { outputId: generationId },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to select output");
      }

      return { panelId, generationId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: panelKeys.detail(variables.panelId) });
      queryClient.invalidateQueries({ queryKey: panelKeys.full(variables.panelId) });
    },
  });
}
