/**
 * Story & Narrative Hooks Tests
 *
 * Tests for premise, story, beat, and storyboard TanStack Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  usePremises,
  useStories,
  useBeats,
  useCreatePremise,
  useCreateStory,
  useStoryboards,
  useStoryboard,
  useCreateStoryboard,
  storyKeys,
} from "../useStories";

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

const mockPremise = {
  id: "premise-1",
  projectId: "proj-1",
  logline: "A story about revenge",
  genre: "noir",
  tone: "dark",
  themes: ["justice", "betrayal"],
  setting: "1940s Chicago",
};

const mockStory = {
  id: "story-1",
  premiseId: "premise-1",
  title: "Story from premise",
  structure: "three-act",
};

const mockBeat = {
  id: "beat-1",
  storyId: "story-1",
  position: 0,
  beatType: "setup",
  visualDescription: "A dark alley in the rain",
  cameraAngle: "wide",
};

const mockStoryboard = {
  id: "sb-1",
  projectId: "proj-1",
  name: "Main Storyboard",
  description: "Primary storyboard",
};

// ============================================================================
// Query Key Tests
// ============================================================================

describe("storyKeys", () => {
  it("generates correct base key", () => {
    expect(storyKeys.all).toEqual(["stories"]);
  });

  it("generates correct narratives key", () => {
    expect(storyKeys.narratives()).toEqual(["stories", "narratives"]);
  });

  it("generates correct premises key", () => {
    expect(storyKeys.premises("proj-1")).toEqual([
      "stories", "narratives", "premises", "proj-1",
    ]);
  });

  it("generates correct stories key", () => {
    expect(storyKeys.stories("premise-1")).toEqual([
      "stories", "narratives", "stories", "premise-1",
    ]);
  });

  it("generates correct beats key", () => {
    expect(storyKeys.beats("story-1")).toEqual([
      "stories", "narratives", "beats", "story-1",
    ]);
  });

  it("generates correct storyboards key", () => {
    expect(storyKeys.storyboards("proj-1")).toEqual([
      "stories", "storyboards", "proj-1",
    ]);
  });

  it("generates correct storyboard detail key", () => {
    expect(storyKeys.storyboard("sb-1")).toEqual([
      "stories", "storyboard", "sb-1",
    ]);
  });
});

// ============================================================================
// usePremises Tests
// ============================================================================

describe("usePremises", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches premises for a project", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { data: [mockPremise] },
      error: null,
    });

    const { result } = renderHook(() => usePremises("proj-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.GET).toHaveBeenCalledWith(
      "/narrative/projects/{projectId}/premises",
      { params: { path: { projectId: "proj-1" } } }
    );
    expect(result.current.data).toEqual([mockPremise]);
  });

  it("returns empty array when no premises exist", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { data: [] },
      error: null,
    });

    const { result } = renderHook(() => usePremises("proj-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("is disabled when projectId is null", () => {
    const { result } = renderHook(() => usePremises(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Project not found" } },
    });

    const { result } = renderHook(() => usePremises("bad-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Project not found");
  });
});

// ============================================================================
// useStories Tests
// ============================================================================

describe("useStories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches stories for a premise", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { data: [mockStory] },
      error: null,
    });

    const { result } = renderHook(() => useStories("premise-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.GET).toHaveBeenCalledWith(
      "/narrative/premises/{premiseId}/stories",
      { params: { path: { premiseId: "premise-1" } } }
    );
    expect(result.current.data).toEqual([mockStory]);
  });

  it("is disabled when premiseId is null", () => {
    const { result } = renderHook(() => useStories(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Premise not found" } },
    });

    const { result } = renderHook(() => useStories("bad-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Premise not found");
  });
});

// ============================================================================
// useBeats Tests
// ============================================================================

describe("useBeats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches beats for a story", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { beats: [mockBeat] },
      error: null,
    });

    const { result } = renderHook(() => useBeats("story-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.GET).toHaveBeenCalledWith(
      "/narrative/stories/{storyId}/beats",
      { params: { path: { storyId: "story-1" } } }
    );
    expect(result.current.data).toEqual([mockBeat]);
  });

  it("is disabled when storyId is null", () => {
    const { result } = renderHook(() => useBeats(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Story not found" } },
    });

    const { result } = renderHook(() => useBeats("bad-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Story not found");
  });

  it("returns empty array when no beats exist", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { beats: [] },
      error: null,
    });

    const { result } = renderHook(() => useBeats("story-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ============================================================================
// useCreatePremise Tests
// ============================================================================

describe("useCreatePremise", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a premise with required fields", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: mockPremise,
      error: null,
    });

    const { result } = renderHook(() => useCreatePremise(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      projectId: "proj-1",
      logline: "A story about revenge",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/narrative/premises", {
      body: { projectId: "proj-1", logline: "A story about revenge" },
    });
    expect(response).toEqual(mockPremise);
  });

  it("creates a premise with all optional fields", async () => {
    const fullInput = {
      projectId: "proj-1",
      logline: "A story about revenge",
      genre: "noir",
      tone: "dark",
      themes: ["justice"],
      setting: "1940s Chicago",
    };
    mockApiClient.POST.mockResolvedValueOnce({
      data: mockPremise,
      error: null,
    });

    const { result } = renderHook(() => useCreatePremise(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(fullInput);

    expect(mockApiClient.POST).toHaveBeenCalledWith("/narrative/premises", {
      body: fullInput,
    });
  });

  it("handles creation error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Validation failed" } },
    });

    const { result } = renderHook(() => useCreatePremise(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ projectId: "proj-1", logline: "" })
    ).rejects.toThrow("Validation failed");
  });
});

// ============================================================================
// useCreateStory Tests
// ============================================================================

describe("useCreateStory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a story from a premise", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: mockStory,
      error: null,
    });

    const { result } = renderHook(() => useCreateStory(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      premiseId: "premise-1",
      structure: "three-act",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith(
      "/narrative/premises/{premiseId}/stories",
      {
        params: { path: { premiseId: "premise-1" } },
        body: { title: "Story from premise", structure: "three-act" },
      }
    );
    expect(response).toEqual(mockStory);
  });

  it("handles creation error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Failed to create story" } },
    });

    const { result } = renderHook(() => useCreateStory(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ premiseId: "bad" })
    ).rejects.toThrow("Failed to create story");
  });
});

// ============================================================================
// useStoryboards Tests
// ============================================================================

describe("useStoryboards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches storyboards for a project", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { storyboards: [mockStoryboard] },
      error: null,
    });

    const { result } = renderHook(() => useStoryboards("proj-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.GET).toHaveBeenCalledWith(
      "/storyboards/project/{projectId}",
      { params: { path: { projectId: "proj-1" } } }
    );
    expect(result.current.data).toEqual([mockStoryboard]);
  });

  it("is disabled when projectId is null", () => {
    const { result } = renderHook(() => useStoryboards(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Not found" } },
    });

    const { result } = renderHook(() => useStoryboards("bad"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ============================================================================
// useStoryboard Tests
// ============================================================================

describe("useStoryboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches a single storyboard with full data", async () => {
    const fullStoryboard = { ...mockStoryboard, panels: [] };
    mockApiClient.GET.mockResolvedValueOnce({
      data: fullStoryboard,
      error: null,
    });

    const { result } = renderHook(() => useStoryboard("sb-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.GET).toHaveBeenCalledWith(
      "/storyboards/{id}/full",
      { params: { path: { id: "sb-1" } } }
    );
    expect(result.current.data).toEqual(fullStoryboard);
  });

  it("is disabled when id is null", () => {
    const { result } = renderHook(() => useStoryboard(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Storyboard not found" } },
    });

    const { result } = renderHook(() => useStoryboard("bad"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Storyboard not found");
  });
});

// ============================================================================
// useCreateStoryboard Tests
// ============================================================================

describe("useCreateStoryboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a storyboard", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: mockStoryboard,
      error: null,
    });

    const { result } = renderHook(() => useCreateStoryboard(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      projectId: "proj-1",
      name: "Main Storyboard",
      description: "Primary storyboard",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/storyboards", {
      body: {
        projectId: "proj-1",
        name: "Main Storyboard",
        description: "Primary storyboard",
      },
    });
    expect(response).toEqual(mockStoryboard);
  });

  it("creates a storyboard without description", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: mockStoryboard,
      error: null,
    });

    const { result } = renderHook(() => useCreateStoryboard(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      projectId: "proj-1",
      name: "Quick Board",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/storyboards", {
      body: { projectId: "proj-1", name: "Quick Board" },
    });
  });

  it("handles creation error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Failed to create storyboard" } },
    });

    const { result } = renderHook(() => useCreateStoryboard(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ projectId: "proj-1", name: "" })
    ).rejects.toThrow("Failed to create storyboard");
  });
});
