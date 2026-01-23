/**
 * useModels Hook
 *
 * React Query hooks for fetching checkpoint models and their compatibility info.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";

// Types
export interface ModelInfo {
  filename: string;
  family: string | null;
  compatibleControlTypes: string[];
}

export interface ModelsResponse {
  count: number;
  models: ModelInfo[];
  byFamily: Record<string, ModelInfo[]>;
  error?: string;
}

export interface ModelCompatibilityResponse {
  filename: string;
  family: string;
  compatibleControlTypes: string[];
  controlnets: Array<{ filename: string; name: string }>;
  loras: Array<{ filename: string; name: string }>;
  warnings: string[];
}

// Query keys
const modelKeys = {
  all: ["models"] as const,
  list: () => [...modelKeys.all, "list"] as const,
  detail: (filename: string) => [...modelKeys.all, "detail", filename] as const,
  controlTypes: (filename: string) =>
    [...modelKeys.all, "control-types", filename] as const,
};

/**
 * Fetch all available models
 */
export function useModels() {
  return useQuery({
    queryKey: modelKeys.list(),
    queryFn: async (): Promise<ModelsResponse> => {
      const response = await fetch("/api/models");
      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Fetch detailed compatibility info for a specific model
 */
export function useModelCompatibility(filename: string | null) {
  return useQuery({
    queryKey: modelKeys.detail(filename ?? ""),
    queryFn: async (): Promise<ModelCompatibilityResponse> => {
      if (!filename) throw new Error("No filename provided");
      const response = await fetch(`/api/models/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch model compatibility");
      }
      return response.json();
    },
    enabled: !!filename,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch available control types for a specific model
 */
export function useModelControlTypes(filename: string | null) {
  return useQuery({
    queryKey: modelKeys.controlTypes(filename ?? ""),
    queryFn: async () => {
      if (!filename) throw new Error("No filename provided");
      const response = await fetch(
        `/api/models/${encodeURIComponent(filename)}/control-types`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch model control types");
      }
      return response.json() as Promise<{
        filename: string;
        family: string;
        count: number;
        types: string[];
      }>;
    },
    enabled: !!filename,
    staleTime: 1000 * 60 * 5,
  });
}

// Model family display names and colors
export const MODEL_FAMILIES: Record<
  string,
  { label: string; color: string; description: string }
> = {
  sdxl: {
    label: "SDXL",
    color: "#3b82f6",
    description: "Stable Diffusion XL - High quality, versatile",
  },
  illustrious: {
    label: "Illustrious",
    color: "#8b5cf6",
    description: "Anime/illustration focused SDXL variant",
  },
  pony: {
    label: "Pony",
    color: "#ec4899",
    description: "PDXL - Anime & stylized content",
  },
  sd15: {
    label: "SD 1.5",
    color: "#22c55e",
    description: "Classic Stable Diffusion - Wide LoRA support",
  },
  flux: {
    label: "Flux",
    color: "#f59e0b",
    description: "Black Forest Labs - Latest generation",
  },
  realistic: {
    label: "Realistic",
    color: "#06b6d4",
    description: "Photorealistic focused models",
  },
  unknown: {
    label: "Unknown",
    color: "#71717a",
    description: "Unrecognized model family",
  },
};
