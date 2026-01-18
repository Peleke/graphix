/**
 * Generated Text API Hooks
 * 
 * TanStack Query hooks for AI-generated text operations.
 * Links panels to generated narratives, descriptions, dialogue, etc.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

// ============================================================================
// Query Keys
// ============================================================================

export const generatedTextKeys = {
  all: ["generated-texts"] as const,
  byPanel: (panelId: string) => [...generatedTextKeys.all, "panel", panelId] as const,
  byType: (panelId: string, textType: string) => [...generatedTextKeys.byPanel(panelId), "type", textType] as const,
  detail: (id: string) => [...generatedTextKeys.all, "detail", id] as const,
  active: (panelId: string, textType: string) => [...generatedTextKeys.byPanel(panelId), "active", textType] as const,
};

// ============================================================================
// Types
// ============================================================================

export type GeneratedTextType =
  | "panel_description"
  | "dialogue"
  | "caption"
  | "narration"
  | "refinement"
  | "raw"
  | "custom";

export type GeneratedTextStatus = "active" | "archived" | "superseded";

export interface CreateGeneratedTextInput {
  panelId?: string;
  pageLayoutId?: string;
  projectId?: string;
  text: string;
  textType: GeneratedTextType;
  provider: string;
  model: string;
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateGeneratedTextInput {
  text?: string;
  status?: GeneratedTextStatus;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all generated texts for a panel
 */
export function useGeneratedTextsByPanel(panelId: string | null) {
  return useQuery({
    queryKey: generatedTextKeys.byPanel(panelId ?? ""),
    queryFn: async () => {
      if (!panelId) return [];

      const { data, error } = await apiClient.GET("/generated-texts/panels/{panelId}", {
        params: { path: { panelId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch generated texts");
      }

      return data?.texts || [];
    },
    enabled: !!panelId,
  });
}

/**
 * Fetch active text of a specific type for a panel
 */
export function useActiveGeneratedText(panelId: string | null, textType: GeneratedTextType) {
  return useQuery({
    queryKey: generatedTextKeys.active(panelId ?? "", textType),
    queryFn: async () => {
      if (!panelId) return null;

      const { data, error } = await apiClient.GET("/generated-texts/panels/{panelId}/active/{textType}", {
        params: { path: { panelId, textType } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch active text");
      }

      return data;
    },
    enabled: !!panelId && !!textType,
  });
}

/**
 * Fetch a single generated text by ID
 */
export function useGeneratedText(id: string | null) {
  return useQuery({
    queryKey: generatedTextKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/generated-texts/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch generated text");
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new generated text
 */
export function useCreateGeneratedText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGeneratedTextInput) => {
      const { data, error } = await apiClient.POST("/generated-texts", {
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create generated text");
      }

      return data;
    },
    onSuccess: (data) => {
      if (data?.panelId) {
        queryClient.invalidateQueries({ queryKey: generatedTextKeys.byPanel(data.panelId) });
        if (data.textType) {
          queryClient.invalidateQueries({
            queryKey: generatedTextKeys.active(data.panelId, data.textType),
          });
        }
      }
    },
  });
}

/**
 * Update a generated text
 */
export function useUpdateGeneratedText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateGeneratedTextInput & { id: string }) => {
      const { data, error } = await apiClient.PATCH("/generated-texts/{id}", {
        params: { path: { id } },
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to update generated text");
      }

      return data;
    },
    onSuccess: (data) => {
      if (data?.panelId) {
        queryClient.invalidateQueries({ queryKey: generatedTextKeys.byPanel(data.panelId) });
        if (data.textType) {
          queryClient.invalidateQueries({
            queryKey: generatedTextKeys.active(data.panelId, data.textType),
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: generatedTextKeys.detail(data?.id || "") });
    },
  });
}

/**
 * Delete a generated text
 */
export function useDeleteGeneratedText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, panelId }: { id: string; panelId?: string }) => {
      const { error } = await apiClient.DELETE("/generated-texts/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to delete generated text");
      }

      return { id, panelId };
    },
    onSuccess: (_, variables) => {
      if (variables.panelId) {
        queryClient.invalidateQueries({ queryKey: generatedTextKeys.byPanel(variables.panelId) });
      }
    },
  });
}
