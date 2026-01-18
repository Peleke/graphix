/**
 * ControlNet API Hooks
 *
 * Hooks for ControlNet configuration data and preview generation.
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";
import type {
  ControlNetCondition,
  ControlNetPreviewResponse,
  ControlNetType,
  ControlNetPreprocessorOptions,
} from "../../types/controlnet";

export const controlNetKeys = {
  all: ["controlnet"] as const,
  types: () => [...controlNetKeys.all, "types"] as const,
  presets: () => [...controlNetKeys.all, "presets"] as const,
};

interface ControlNetTypeInfo {
  type: ControlNetType;
  min: number;
  max: number;
  default: number;
  notes?: string;
}

interface ControlNetPreset {
  id: string;
  name: string;
  description?: string;
  controls: Array<{ type: ControlNetType; defaultStrength: number }>;
}

export function useControlNetTypes() {
  return useQuery({
    queryKey: controlNetKeys.types(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/consistency/control-types");
      if (error) {
        throw new Error(error.error?.message || "Failed to fetch ControlNet types");
      }
      return data as { count: number; types: ControlNetTypeInfo[] };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useControlNetPresets() {
  return useQuery({
    queryKey: controlNetKeys.presets(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/consistency/control-presets");
      if (error) {
        throw new Error(error.error?.message || "Failed to fetch ControlNet presets");
      }
      return data as { count: number; presets: ControlNetPreset[] };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export interface ControlNetPreviewInput {
  inputImage: string;
  controlType: ControlNetType;
  preprocessorOptions?: ControlNetPreprocessorOptions;
}

export function useControlNetPreview() {
  return useMutation({
    mutationFn: async (input: ControlNetPreviewInput): Promise<ControlNetPreviewResponse> => {
      const { data, error } = await apiClient.POST("/consistency/controlnet/preview", {
        body: input,
      });
      if (error) {
        throw new Error(error.error?.message || "Failed to generate ControlNet preview");
      }
      return data as ControlNetPreviewResponse;
    },
  });
}

export function buildControlNetFromPreset(preset: ControlNetPreset, image: string): ControlNetCondition[] {
  return preset.controls.map((control) => ({
    type: control.type,
    image,
    strength: control.defaultStrength,
    preprocess: true,
  }));
}
