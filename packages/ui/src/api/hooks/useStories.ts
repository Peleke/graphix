/**
 * Story & Narrative API Hooks
 * 
 * TanStack Query hooks for story, narrative, and storyboard operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

// ============================================================================
// Query Keys
// ============================================================================

export const storyKeys = {
  all: ["stories"] as const,
  narratives: () => [...storyKeys.all, "narratives"] as const,
  premises: (projectId: string) => [...storyKeys.narratives(), "premises", projectId] as const,
  stories: (premiseId: string) => [...storyKeys.narratives(), "stories", premiseId] as const,
  beats: (storyId: string) => [...storyKeys.narratives(), "beats", storyId] as const,
  storyboards: (projectId: string) => [...storyKeys.all, "storyboards", projectId] as const,
  storyboard: (id: string) => [...storyKeys.all, "storyboard", id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface CreatePremiseInput {
  projectId: string;
  logline: string;
  genre?: string;
  tone?: string;
  themes?: string[];
  characterIds?: string[];
  setting?: string;
  worldRules?: string[];
}

export interface CreateStoryInput {
  premiseId: string;
  structure?: "three-act" | "five-act" | "hero-journey" | "custom";
}

export interface CreateStoryboardInput {
  projectId: string;
  name: string;
  description?: string;
}

// ============================================================================
// Narrative Hooks
// ============================================================================

export function usePremises(projectId: string | null) {
  return useQuery({
    queryKey: storyKeys.premises(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await apiClient.GET("/narrative/projects/{projectId}/premises", {
        params: { path: { projectId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch premises");
      }

      return data?.data || [];
    },
    enabled: !!projectId,
  });
}

export function useStories(premiseId: string | null) {
  return useQuery({
    queryKey: storyKeys.stories(premiseId ?? ""),
    queryFn: async () => {
      if (!premiseId) return [];

      const { data, error } = await apiClient.GET("/narrative/premises/{premiseId}/stories", {
        params: { path: { premiseId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch stories");
      }

      return data?.data || [];
    },
    enabled: !!premiseId,
  });
}

export function useBeats(storyId: string | null) {
  return useQuery({
    queryKey: storyKeys.beats(storyId ?? ""),
    queryFn: async () => {
      if (!storyId) return [];

      const { data, error } = await apiClient.GET("/narrative/stories/{storyId}/beats", {
        params: { path: { storyId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch beats");
      }

      return data?.beats || [];
    },
    enabled: !!storyId,
  });
}

export function useCreatePremise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePremiseInput) => {
      const { data, error } = await apiClient.POST("/narrative/premises", {
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create premise");
      }

      // API returns the premise directly
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storyKeys.premises(variables.projectId),
      });
    },
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoryInput) => {
      const { data, error } = await apiClient.POST("/narrative/premises/{premiseId}/stories", {
        params: { path: { premiseId: input.premiseId } },
        body: {
          title: `Story from premise`,
          structure: input.structure,
        },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create story");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storyKeys.stories(variables.premiseId),
      });
    },
  });
}

// ============================================================================
// Storyboard Hooks
// ============================================================================

export function useStoryboards(projectId: string | null) {
  return useQuery({
    queryKey: storyKeys.storyboards(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await apiClient.GET("/storyboards/project/{projectId}", {
        params: { path: { projectId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch storyboards");
      }

      return data?.storyboards || [];
    },
    enabled: !!projectId,
  });
}

export function useStoryboard(id: string | null) {
  return useQuery({
    queryKey: storyKeys.storyboard(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/storyboards/{id}/full", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch storyboard");
      }

      return data;
    },
    enabled: !!id,
  });
}

export function useCreateStoryboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoryboardInput) => {
      const { data, error } = await apiClient.POST("/storyboards", {
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create storyboard");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storyKeys.storyboards(variables.projectId),
      });
    },
  });
}
