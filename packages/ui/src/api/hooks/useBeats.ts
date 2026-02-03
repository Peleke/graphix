/**
 * Beat CRUD Mutation Hooks
 *
 * TanStack Query hooks for beat create, update, delete, and reorder operations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { storyKeys } from "./useStories";
import type {
  Beat,
  CreateBeatInput,
  UpdateBeatInput,
  ReorderBeatsInput,
} from "../../components/story-editor/beats/types";

// ============================================================================
// Create Beat
// ============================================================================

export function useCreateBeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBeatInput): Promise<Beat> => {
      // Build body with only non-null/undefined values
      const body: Record<string, unknown> = {
        visualDescription: input.visualDescription,
        position: input.position,
      };
      if (input.beatType) body.beatType = input.beatType;
      if (input.emotionalTone) body.emotionalTone = input.emotionalTone;
      if (input.narration) body.narration = input.narration;
      if (input.sfx) body.sfx = input.sfx;
      if (input.cameraAngle) body.cameraAngle = input.cameraAngle;

      const { data, error } = await apiClient.POST(
        "/narrative/stories/{storyId}/beats",
        {
          params: { path: { storyId: input.storyId } },
          body: body as typeof input,
        }
      );

      if (error) {
        throw new Error(error.error?.message || "Failed to create beat");
      }

      return data as Beat;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storyKeys.beats(variables.storyId),
      });
    },
  });
}

// ============================================================================
// Update Beat
// ============================================================================

export function useUpdateBeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateBeatInput & { storyId: string }
    ): Promise<Beat> => {
      // Build body with only provided values (allow empty string to clear)
      const body: Record<string, unknown> = {};
      if (input.visualDescription !== undefined) body.visualDescription = input.visualDescription;
      if (input.beatType !== undefined) body.beatType = input.beatType || undefined;
      if (input.emotionalTone !== undefined) body.emotionalTone = input.emotionalTone || undefined;
      if (input.narration !== undefined) body.narration = input.narration || undefined;
      if (input.sfx !== undefined) body.sfx = input.sfx || undefined;
      if (input.cameraAngle !== undefined) body.cameraAngle = input.cameraAngle || undefined;

      const { data, error } = await apiClient.PATCH("/narrative/beats/{id}", {
        params: { path: { id: input.id } },
        body: body as Partial<typeof input>,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to update beat");
      }

      return data as Beat;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storyKeys.beats(variables.storyId),
      });
    },
  });
}

// ============================================================================
// Delete Beat
// ============================================================================

export function useDeleteBeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      storyId: string;
    }): Promise<void> => {
      const { error } = await apiClient.DELETE("/narrative/beats/{id}", {
        params: { path: { id: input.id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to delete beat");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storyKeys.beats(variables.storyId),
      });
    },
  });
}

// ============================================================================
// Reorder Beats
// ============================================================================

export function useReorderBeats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderBeatsInput): Promise<Beat[]> => {
      const { data, error } = await apiClient.POST(
        "/narrative/stories/{storyId}/beats/reorder",
        {
          params: { path: { storyId: input.storyId } },
          body: {
            beatIds: input.beatIds,
          },
        }
      );

      if (error) {
        throw new Error(error.error?.message || "Failed to reorder beats");
      }

      return (data as { beats: Beat[] }).beats;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storyKeys.beats(variables.storyId),
      });
    },
  });
}
