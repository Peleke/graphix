/**
 * Generation Hooks Tests
 * 
 * Exhaustive test coverage for generation-related TanStack Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useGenerationsByPanel,
  useGeneration,
  useSelectedGeneration,
  useSelectGeneration,
  useRateGeneration,
  generationKeys,
} from "../useGenerations";

// ============================================================================
// Mocks
// ============================================================================

const mockApiClient = {
  GET: vi.fn(),
  POST: vi.fn(),
};

vi.mock("../../client", () => ({
  apiClient: {
    GET: (...args: any[]) => mockApiClient.GET(...args),
    POST: (...args: any[]) => mockApiClient.POST(...args),
  },
}));

// ============================================================================
// Test Setup
// ============================================================================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ============================================================================
// Test Data
// ============================================================================

const mockGeneration = {
  id: "gen-1",
  panelId: "panel-1",
  localPath: "/output/gen-1.png",
  cloudUrl: "https://cdn.example.com/gen-1.png",
  thumbnailPath: "/output/gen-1-thumb.png",
  seed: 12345,
  prompt: "A wolf in the forest",
  negativePrompt: "blurry, bad quality",
  model: "ponyDiffusion_v6.safetensors",
  loras: [{ name: "character_lora", strength: 0.8 }],
  steps: 28,
  cfg: 7,
  sampler: "euler_ancestral",
  scheduler: "normal",
  width: 512,
  height: 768,
  rating: 4,
  isFavorite: false,
  selected: false,
  createdAt: new Date().toISOString(),
};

const mockGenerations = [
  mockGeneration,
  {
    ...mockGeneration,
    id: "gen-2",
    seed: 67890,
    prompt: "A fox by the river",
    rating: 5,
    isFavorite: true,
    selected: true,
  },
];

// ============================================================================
// Query Key Tests
// ============================================================================

describe("generationKeys", () => {
  it("generates correct base key", () => {
    expect(generationKeys.all).toEqual(["generations"]);
  });

  it("generates correct byPanel key", () => {
    expect(generationKeys.byPanel("panel-1")).toEqual(["generations", "panel", "panel-1"]);
  });

  it("generates correct detail key", () => {
    expect(generationKeys.detail("gen-1")).toEqual(["generations", "detail", "gen-1"]);
  });

  it("generates correct selected key", () => {
    expect(generationKeys.selected("panel-1")).toEqual([
      "generations",
      "panel",
      "panel-1",
      "selected",
    ]);
  });
});

// ============================================================================
// useGenerationsByPanel Tests
// ============================================================================

describe("useGenerationsByPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all generations for a panel", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { generations: mockGenerations },
      error: null,
    });

    const { result } = renderHook(() => useGenerationsByPanel("panel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.GET).toHaveBeenCalledWith("/generations/panel/{panelId}", {
      params: { path: { panelId: "panel-1" } },
    });
    expect(result.current.data).toEqual(mockGenerations);
  });

  it("returns empty array when no generations exist", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { generations: [] },
      error: null,
    });

    const { result } = renderHook(() => useGenerationsByPanel("panel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("is disabled when panelId is null", async () => {
    const { result } = renderHook(() => useGenerationsByPanel(null), {
      wrapper: createWrapper(),
    });

    // Query is disabled when panelId is null
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("handles API error gracefully", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Panel not found" } },
    });

    const { result } = renderHook(() => useGenerationsByPanel("invalid-panel"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Panel not found");
  });
});

// ============================================================================
// useGeneration Tests
// ============================================================================

describe("useGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single generation by ID", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: mockGeneration,
      error: null,
    });

    const { result } = renderHook(() => useGeneration("gen-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.GET).toHaveBeenCalledWith("/generations/{id}", {
      params: { path: { id: "gen-1" } },
    });
    expect(result.current.data).toEqual(mockGeneration);
  });

  it("returns null when ID is null", async () => {
    const { result } = renderHook(() => useGeneration(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("includes all generation metadata", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: mockGeneration,
      error: null,
    });

    const { result } = renderHook(() => useGeneration("gen-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const gen = result.current.data;
    expect(gen?.seed).toBe(12345);
    expect(gen?.prompt).toBe("A wolf in the forest");
    expect(gen?.model).toBe("ponyDiffusion_v6.safetensors");
    expect(gen?.loras).toHaveLength(1);
    expect(gen?.width).toBe(512);
    expect(gen?.height).toBe(768);
  });
});

// ============================================================================
// useSelectedGeneration Tests
// ============================================================================

describe("useSelectedGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches selected generation for panel", async () => {
    const selectedGen = { ...mockGeneration, selected: true };
    mockApiClient.GET.mockResolvedValueOnce({
      data: selectedGen,
      error: null,
    });

    const { result } = renderHook(() => useSelectedGeneration("panel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.GET).toHaveBeenCalledWith("/generations/panel/{panelId}/selected", {
      params: { path: { panelId: "panel-1" } },
    });
    expect(result.current.data?.selected).toBe(true);
  });

  it("handles no selection", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "No selection found" } },
    });

    const { result } = renderHook(() => useSelectedGeneration("panel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("is disabled when panelId is null", async () => {
    const { result } = renderHook(() => useSelectedGeneration(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

// ============================================================================
// useSelectGeneration Tests
// ============================================================================

describe("useSelectGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects a generation", async () => {
    mockApiClient.POST.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useSelectGeneration(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      panelId: "panel-1",
      generationId: "gen-2",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/panels/{id}/select-output", {
      params: { path: { id: "panel-1" } },
      body: { outputId: "gen-2" },
    });
  });

  it("returns panel and generation IDs on success", async () => {
    mockApiClient.POST.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useSelectGeneration(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      panelId: "panel-1",
      generationId: "gen-2",
    });

    expect(response).toEqual({
      panelId: "panel-1",
      generationId: "gen-2",
    });
  });

  it("handles selection error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Invalid generation" } },
    });

    const { result } = renderHook(() => useSelectGeneration(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        panelId: "panel-1",
        generationId: "invalid-gen",
      })
    ).rejects.toThrow("Invalid generation");
  });
});

// ============================================================================
// useRateGeneration Tests
// ============================================================================

describe("useRateGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rates a generation with 1-5 stars", async () => {
    mockApiClient.POST.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useRateGeneration(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      generationId: "gen-1",
      rating: 5,
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/generations/{id}/rating", {
      params: { path: { id: "gen-1" } },
      body: { rating: 5 },
    });
  });

  it("returns generation ID and rating on success", async () => {
    mockApiClient.POST.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useRateGeneration(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      generationId: "gen-1",
      rating: 3,
    });

    expect(response).toEqual({
      generationId: "gen-1",
      rating: 3,
    });
  });

  it("handles rating error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Rating failed" } },
    });

    const { result } = renderHook(() => useRateGeneration(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        generationId: "gen-1",
        rating: 5,
      })
    ).rejects.toThrow("Rating failed");
  });
});
