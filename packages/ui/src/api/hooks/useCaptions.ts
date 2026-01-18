/**
 * Caption API Hooks
 * 
 * TanStack Query hooks for panel caption operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

// ============================================================================
// Query Keys
// ============================================================================

export const captionKeys = {
  all: ["captions"] as const,
  byPanel: (panelId: string) => [...captionKeys.all, "panel", panelId] as const,
  detail: (id: string) => [...captionKeys.all, "detail", id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface CaptionPosition {
  x: number;
  y: number;
}

export interface CaptionStyle {
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  padding?: number;
  maxWidth?: number;
  effectPreset?: string;
}

export type CaptionType = "speech" | "thought" | "narration" | "sfx" | "whisper";

export interface CreateCaptionInput {
  panelId: string;
  type: CaptionType;
  text: string;
  x: number;
  y: number;
  tailX?: number;
  tailY?: number;
  characterId?: string;
  zIndex?: number;
  style?: CaptionStyle;
}

export interface UpdateCaptionInput {
  text?: string;
  x?: number;
  y?: number;
  tailX?: number;
  tailY?: number;
  style?: CaptionStyle;
  enabled?: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all captions for a panel
 */
export function useCaptionsByPanel(panelId: string | null) {
  return useQuery({
    queryKey: captionKeys.byPanel(panelId ?? ""),
    queryFn: async () => {
      if (!panelId) return [];

      const { data, error } = await apiClient.GET("/panels/{panelId}/captions", {
        params: { path: { panelId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch captions");
      }

      return data?.captions || [];
    },
    enabled: !!panelId,
  });
}

/**
 * Fetch a single caption by ID
 */
export function useCaption(id: string | null) {
  return useQuery({
    queryKey: captionKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/captions/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch caption");
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new caption for a panel
 */
export function useCreateCaption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCaptionInput) => {
      const { panelId, ...body } = input;
      const { data, error } = await apiClient.POST("/panels/{panelId}/captions", {
        params: { path: { panelId } },
        body,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create caption");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: captionKeys.byPanel(variables.panelId) });
    },
  });
}

/**
 * Update a caption
 */
export function useUpdateCaption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCaptionInput & { id: string }) => {
      const { data, error } = await apiClient.PATCH("/captions/{id}", {
        params: { path: { id } },
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to update caption");
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate panel captions if we have panelId
      if (data?.panelId) {
        queryClient.invalidateQueries({ queryKey: captionKeys.byPanel(data.panelId) });
      }
      queryClient.invalidateQueries({ queryKey: captionKeys.detail(data?.id || "") });
    },
  });
}

/**
 * Delete a caption
 */
export function useDeleteCaption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, panelId }: { id: string; panelId: string }) => {
      const { error } = await apiClient.DELETE("/captions/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to delete caption");
      }

      return { id, panelId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: captionKeys.byPanel(variables.panelId) });
    },
  });
}

/**
 * Generate captions from linked beat
 */
export function useGenerateCaptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      panelId,
      includeDialogue,
      includeNarration,
      includeSfx,
    }: {
      panelId: string;
      includeDialogue?: boolean;
      includeNarration?: boolean;
      includeSfx?: boolean;
    }) => {
      const { data, error } = await apiClient.POST("/panels/{panelId}/captions/generate", {
        params: { path: { panelId } },
        body: {
          includeDialogue,
          includeNarration,
          includeSfx,
        },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to generate captions");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: captionKeys.byPanel(variables.panelId) });
    },
  });
}
