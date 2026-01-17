/**
 * Composition API Hooks
 * 
 * TanStack Query hooks for page composition and export.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

// ============================================================================
// Query Keys
// ============================================================================

export const compositionKeys = {
  all: ["composition"] as const,
  templates: () => [...compositionKeys.all, "templates"] as const,
  pageSizes: () => [...compositionKeys.all, "pageSizes"] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface ComposePageInput {
  storyboardId: string;
  templateId: string;
  panelIds: string[];
  outputName: string;
  pageSize?: string;
  backgroundColor?: string;
  panelBorder?: {
    width: number;
    color: string;
  };
}

export interface ComposeStoryboardInput {
  storyboardId: string;
  templateId?: string;
  pageSize?: string;
  outputPrefix?: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch available templates
 */
export function useTemplates() {
  return useQuery({
    queryKey: compositionKeys.templates(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/composition/templates");

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch templates");
      }

      return data?.templates || [];
    },
  });
}

/**
 * Fetch available page sizes
 */
export function usePageSizes() {
  return useQuery({
    queryKey: compositionKeys.pageSizes(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/composition/page-sizes");

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch page sizes");
      }

      return data?.pageSizes || [];
    },
  });
}

/**
 * Compose a page from panels
 */
export function useComposePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ComposePageInput) => {
      const { data, error } = await apiClient.POST("/composition/compose", {
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to compose page");
      }

      return data;
    },
    onSuccess: () => {
      // Could invalidate storyboard queries if needed
    },
  });
}

/**
 * Auto-compose entire storyboard
 */
export function useComposeStoryboard() {
  return useMutation({
    mutationFn: async (input: ComposeStoryboardInput) => {
      const { data, error } = await apiClient.POST("/composition/compose-storyboard", {
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to compose storyboard");
      }

      return data;
    },
  });
}
