/**
 * Panel Hooks Tests
 * 
 * Exhaustive test coverage for panel-related TanStack Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  usePanel,
  usePanelFull,
  useGeneratePanel,
  useGeneratePanelVariants,
  useCreatePanel,
  useSelectPanelOutput,
  panelKeys,
} from "../usePanels";

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

const mockPanel = {
  id: "panel-1",
  storyboardId: "storyboard-1",
  position: 0,
  description: "A dramatic scene",
  direction: { cameraAngle: "wide", mood: "tense" },
  characterIds: ["char-1", "char-2"],
  selectedOutputId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGenerations = [
  {
    id: "gen-1",
    panelId: "panel-1",
    seed: 12345,
    prompt: "A wolf in the forest",
    model: "ponyDiffusion_v6",
    width: 512,
    height: 768,
  },
  {
    id: "gen-2",
    panelId: "panel-1",
    seed: 67890,
    prompt: "A fox by the river",
    model: "ponyDiffusion_v6",
    width: 512,
    height: 768,
  },
];

// ============================================================================
// Query Key Tests
// ============================================================================

describe("panelKeys", () => {
  it("generates correct base key", () => {
    expect(panelKeys.all).toEqual(["panels"]);
  });

  it("generates correct byStoryboard key", () => {
    expect(panelKeys.byStoryboard("sb-1")).toEqual(["panels", "storyboard", "sb-1"]);
  });

  it("generates correct detail key", () => {
    expect(panelKeys.detail("panel-1")).toEqual(["panels", "detail", "panel-1"]);
  });

  it("generates correct full key", () => {
    expect(panelKeys.full("panel-1")).toEqual(["panels", "full", "panel-1"]);
  });
});

// ============================================================================
// usePanel Tests
// ============================================================================

describe("usePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches panel by ID", async () => {
    mockApiClient.GET.mockResolvedValueOnce({ data: mockPanel, error: null });

    const { result } = renderHook(() => usePanel("panel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.GET).toHaveBeenCalledWith("/panels/{id}", {
      params: { path: { id: "panel-1" } },
    });
    expect(result.current.data).toEqual(mockPanel);
  });

  it("returns null when ID is null", async () => {
    const { result } = renderHook(() => usePanel(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Panel not found" } },
    });

    const { result } = renderHook(() => usePanel("invalid-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Panel not found");
  });
});

// ============================================================================
// usePanelFull Tests
// ============================================================================

describe("usePanelFull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches panel with generations", async () => {
    const fullData = { panel: mockPanel, generations: mockGenerations };
    mockApiClient.GET.mockResolvedValueOnce({ data: fullData, error: null });

    const { result } = renderHook(() => usePanelFull("panel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.GET).toHaveBeenCalledWith("/panels/{id}/full", {
      params: { path: { id: "panel-1" } },
    });
    expect(result.current.data?.panel).toEqual(mockPanel);
    expect(result.current.data?.generations).toEqual(mockGenerations);
  });

  it("is disabled when ID is null", async () => {
    const { result } = renderHook(() => usePanelFull(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useGeneratePanel Tests
// ============================================================================

describe("useGeneratePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates single image for panel", async () => {
    const generationResult = {
      success: true,
      generatedImage: { id: "gen-new", seed: 11111 },
    };
    mockApiClient.POST.mockResolvedValueOnce({ data: generationResult, error: null });

    const { result } = renderHook(() => useGeneratePanel(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      panelId: "panel-1",
      prompt: "A beautiful sunset",
      negativePrompt: "blurry",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/panels/{id}/generate", {
      params: { path: { id: "panel-1" } },
      body: {
        prompt: "A beautiful sunset",
        negativePrompt: "blurry",
      },
    });
  });

  it("passes all generation parameters", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const { result } = renderHook(() => useGeneratePanel(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      panelId: "panel-1",
      prompt: "Test",
      model: "ponyDiffusion_v6",
      width: 768,
      height: 1024,
      steps: 30,
      cfg: 7.5,
      seed: 42,
      sizePreset: "portrait_3x4",
      qualityPreset: "high",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/panels/{id}/generate", {
      params: { path: { id: "panel-1" } },
      body: expect.objectContaining({
        prompt: "Test",
        model: "ponyDiffusion_v6",
        width: 768,
        height: 1024,
        steps: 30,
        cfg: 7.5,
        seed: 42,
        sizePreset: "portrait_3x4",
        qualityPreset: "high",
      }),
    });
  });

  it("handles generation error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "ComfyUI unavailable" } },
    });

    const { result } = renderHook(() => useGeneratePanel(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ panelId: "panel-1" })
    ).rejects.toThrow("ComfyUI unavailable");
  });
});

// ============================================================================
// useGeneratePanelVariants Tests
// ============================================================================

describe("useGeneratePanelVariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates multiple variants with default count", async () => {
    const variantsResult = {
      success: true,
      total: 4,
      successful: 4,
      failed: 0,
      generatedImages: [
        { id: "gen-1", seed: 1 },
        { id: "gen-2", seed: 2 },
        { id: "gen-3", seed: 3 },
        { id: "gen-4", seed: 4 },
      ],
    };
    mockApiClient.POST.mockResolvedValueOnce({ data: variantsResult, error: null });

    const { result } = renderHook(() => useGeneratePanelVariants(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      panelId: "panel-1",
      prompt: "A dramatic scene",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/panels/{id}/generate/variants", {
      params: { path: { id: "panel-1" } },
      body: expect.objectContaining({
        count: 4,
        prompt: "A dramatic scene",
      }),
    });
    expect(response?.total).toBe(4);
  });

  it("generates custom variant count", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: { success: true, total: 8 },
      error: null,
    });

    const { result } = renderHook(() => useGeneratePanelVariants(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      panelId: "panel-1",
      count: 8,
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/panels/{id}/generate/variants", {
      params: { path: { id: "panel-1" } },
      body: expect.objectContaining({ count: 8 }),
    });
  });

  it("handles partial failure", async () => {
    const partialResult = {
      success: false,
      total: 4,
      successful: 2,
      failed: 2,
      generatedImages: [
        { id: "gen-1", seed: 1 },
        { id: "gen-2", seed: 2 },
      ],
    };
    mockApiClient.POST.mockResolvedValueOnce({ data: partialResult, error: null });

    const { result } = renderHook(() => useGeneratePanelVariants(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      panelId: "panel-1",
      count: 4,
    });

    expect(response?.successful).toBe(2);
    expect(response?.failed).toBe(2);
  });
});

// ============================================================================
// useCreatePanel Tests
// ============================================================================

describe("useCreatePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates panel in storyboard", async () => {
    mockApiClient.POST.mockResolvedValueOnce({ data: mockPanel, error: null });

    const { result } = renderHook(() => useCreatePanel(), {
      wrapper: createWrapper(),
    });

    const created = await result.current.mutateAsync({
      storyboardId: "storyboard-1",
      position: 0,
      description: "A dramatic scene",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/storyboards/{id}/panels", {
      params: { path: { id: "storyboard-1" } },
      body: {
        position: 0,
        description: "A dramatic scene",
        direction: undefined,
        characterIds: undefined,
      },
    });
    expect(created).toEqual(mockPanel);
  });

  it("creates panel with direction and characters", async () => {
    mockApiClient.POST.mockResolvedValueOnce({ data: mockPanel, error: null });

    const { result } = renderHook(() => useCreatePanel(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      storyboardId: "storyboard-1",
      description: "Test",
      direction: { cameraAngle: "close-up", mood: "dramatic" },
      characterIds: ["char-1", "char-2"],
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/storyboards/{id}/panels", {
      params: { path: { id: "storyboard-1" } },
      body: expect.objectContaining({
        direction: { cameraAngle: "close-up", mood: "dramatic" },
        characterIds: ["char-1", "char-2"],
      }),
    });
  });
});

// ============================================================================
// useSelectPanelOutput Tests
// ============================================================================

describe("useSelectPanelOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects generation as panel output", async () => {
    mockApiClient.POST.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useSelectPanelOutput(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      panelId: "panel-1",
      generationId: "gen-2",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/panels/{id}/select", {
      params: { path: { id: "panel-1" } },
      body: { outputId: "gen-2" },
    });
    expect(response).toEqual({ panelId: "panel-1", generationId: "gen-2" });
  });

  it("handles selection error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Generation not found" } },
    });

    const { result } = renderHook(() => useSelectPanelOutput(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        panelId: "panel-1",
        generationId: "invalid-gen",
      })
    ).rejects.toThrow("Generation not found");
  });
});
