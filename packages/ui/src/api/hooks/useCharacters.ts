/**
 * Character API Hooks
 * 
 * TanStack Query hooks for character CRUD operations.
 * Connects the Character Manager UI to the backend API.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

// ============================================================================
// Query Keys
// ============================================================================

export const characterKeys = {
  all: ["characters"] as const,
  lists: () => [...characterKeys.all, "list"] as const,
  listByProject: (projectId: string) => [...characterKeys.lists(), projectId] as const,
  details: () => [...characterKeys.all, "detail"] as const,
  detail: (id: string) => [...characterKeys.details(), id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface CreateCharacterInput {
  projectId: string;
  name: string;
  species?: string;
  description?: string;
  appearance?: string;
  personality?: string;
  promptFragment?: string;
  colorPalette?: string[];
}

export interface UpdateCharacterInput {
  name?: string;
  species?: string;
  description?: string;
  appearance?: string;
  personality?: string;
  promptFragment?: string;
  colorPalette?: string[];
}

export interface AddReferenceInput {
  characterId: string;
  imageUrl: string;
  type: "main" | "expression" | "pose" | "detail" | "style";
  label?: string;
}

export interface SetLoRAInput {
  characterId: string;
  loraId: string;
  strength?: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch characters for a project
 */
export function useCharacters(projectId: string | null) {
  return useQuery({
    queryKey: characterKeys.listByProject(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await apiClient.GET("/characters/project/{projectId}", {
        params: { path: { projectId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch characters");
      }

      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single character by ID
 */
export function useCharacter(id: string | null) {
  return useQuery({
    queryKey: characterKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/characters/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch character");
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new character
 */
export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCharacterInput) => {
      const { data, error } = await apiClient.POST("/characters", {
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create character");
      }

      return data;
    },
    onSuccess: (newCharacter, variables) => {
      // Invalidate the project's character list
      queryClient.invalidateQueries({ 
        queryKey: characterKeys.listByProject(variables.projectId) 
      });
      
      // Add to detail cache
      if (newCharacter) {
        queryClient.setQueryData(
          characterKeys.detail(newCharacter.id),
          newCharacter
        );
      }
    },
  });
}

/**
 * Update an existing character
 */
export function useUpdateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCharacterInput & { id: string }) => {
      const { data, error } = await apiClient.PUT("/characters/{id}", {
        params: { path: { id } },
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to update character");
      }

      return data;
    },
    onSuccess: (updatedCharacter) => {
      // Invalidate all character lists (we don't know which project)
      queryClient.invalidateQueries({ queryKey: characterKeys.lists() });
      
      // Update detail cache
      if (updatedCharacter) {
        queryClient.setQueryData(
          characterKeys.detail(updatedCharacter.id),
          updatedCharacter
        );
      }
    },
  });
}

/**
 * Delete a character
 */
export function useDeleteCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/characters/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to delete character");
      }

      return id;
    },
    onSuccess: (deletedId) => {
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: characterKeys.lists() });
      
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: characterKeys.detail(deletedId) });
    },
  });
}

/**
 * Add a reference image to a character
 */
export function useAddReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, ...input }: AddReferenceInput) => {
      const { data, error } = await apiClient.POST("/characters/{id}/references", {
        params: { path: { id: characterId } },
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to add reference");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the character detail
      queryClient.invalidateQueries({ 
        queryKey: characterKeys.detail(variables.characterId) 
      });
    },
  });
}

/**
 * Remove a reference image from a character
 */
export function useRemoveReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, referenceId }: { characterId: string; referenceId: string }) => {
      const { error } = await apiClient.DELETE("/characters/{id}/references/{refId}", {
        params: { path: { id: characterId, refId: referenceId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to remove reference");
      }

      return referenceId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: characterKeys.detail(variables.characterId) 
      });
    },
  });
}

/**
 * Set LoRA for a character
 */
export function useSetCharacterLoRA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, ...input }: SetLoRAInput) => {
      const { data, error } = await apiClient.POST("/characters/{id}/lora", {
        params: { path: { id: characterId } },
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to set LoRA");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: characterKeys.detail(variables.characterId) 
      });
    },
  });
}

/**
 * Remove LoRA from a character
 */
export function useRemoveCharacterLoRA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (characterId: string) => {
      const { error } = await apiClient.DELETE("/characters/{id}/lora", {
        params: { path: { id: characterId } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to remove LoRA");
      }

      return characterId;
    },
    onSuccess: (characterId) => {
      queryClient.invalidateQueries({ 
        queryKey: characterKeys.detail(characterId) 
      });
    },
  });
}
