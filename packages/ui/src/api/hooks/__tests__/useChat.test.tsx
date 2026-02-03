/**
 * Chat Hooks Tests
 *
 * Tests for useChat and useEnhancedBootstrap hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useEnhancedBootstrap, type EnhancedBootstrapInput, type EnhancedBootstrapResult } from "../useChat";

// ============================================================================
// Mocks
// ============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// Test Data
// ============================================================================

const validBootstrapInput: EnhancedBootstrapInput = {
  name: "Test Story",
  description: "A test story description",
  characters: [
    {
      name: "Luna",
      role: "protagonist",
      species: "wolf",
      visualDescription: "A silver-furred wolf with blue eyes",
      personality: ["brave", "kind"],
      motivation: "To find her pack",
    },
    {
      name: "Max",
      role: "supporting",
      visualDescription: "An orange fox with a bushy tail",
      personality: ["clever", "loyal"],
    },
  ],
  setting: {
    location: "Snowy forest",
    atmosphere: "Mysterious and enchanting",
    visualDetails: ["tall pines", "falling snow", "moonlight"],
  },
  arc: {
    premise: {
      logline: "A lone wolf discovers friendship in the coldest winter",
      genre: "adventure",
      tone: "hopeful",
      themes: ["friendship", "courage"],
      setting: "Winter forest",
    },
    structure: "three-act",
    acts: ["Setup", "Confrontation", "Resolution"],
    beats: [
      {
        type: "setup",
        actIndex: 0,
        summary: "Luna alone in the forest",
        visualDescription: "A silver wolf sits alone on a snowy hilltop",
        emotionalTone: "lonely",
        involvedCharacters: ["Luna"],
        cameraAngle: "wide",
      },
      {
        type: "inciting_incident",
        actIndex: 0,
        summary: "Luna meets Max",
        visualDescription: "Luna encounters Max in a clearing",
        emotionalTone: "curious",
        involvedCharacters: ["Luna", "Max"],
        cameraAngle: "medium",
      },
      {
        type: "climax",
        actIndex: 2,
        summary: "They face danger together",
        visualDescription: "Luna and Max stand side by side against a storm",
        emotionalTone: "tense",
        involvedCharacters: ["Luna", "Max"],
        cameraAngle: "low-angle",
      },
      {
        type: "resolution",
        actIndex: 2,
        summary: "Friendship formed",
        visualDescription: "Luna and Max walk together into the sunrise",
        emotionalTone: "hopeful",
        involvedCharacters: ["Luna", "Max"],
        cameraAngle: "wide",
      },
    ],
  },
  style: "Manga",
  pageCount: 8,
};

const mockBootstrapResult: EnhancedBootstrapResult = {
  project: { id: "proj-123", name: "Test Story" },
  premise: { id: "prem-123", logline: "A lone wolf discovers friendship" },
  story: { id: "story-123", structure: "three-act" },
  storyboards: [
    { id: "sb-1", name: "Setup", actIndex: 0 },
    { id: "sb-2", name: "Confrontation", actIndex: 1 },
    { id: "sb-3", name: "Resolution", actIndex: 2 },
  ],
  beats: [
    { id: "beat-1", type: "setup", panelId: "panel-1" },
    { id: "beat-2", type: "inciting_incident", panelId: "panel-2" },
    { id: "beat-3", type: "climax", panelId: "panel-3" },
    { id: "beat-4", type: "resolution", panelId: "panel-4" },
  ],
  panels: [
    { id: "panel-1", beatId: "beat-1", storyboardId: "sb-1" },
    { id: "panel-2", beatId: "beat-2", storyboardId: "sb-1" },
    { id: "panel-3", beatId: "beat-3", storyboardId: "sb-3" },
    { id: "panel-4", beatId: "beat-4", storyboardId: "sb-3" },
  ],
  characters: [
    { id: "char-1", name: "Luna" },
    { id: "char-2", name: "Max" },
  ],
};

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// useEnhancedBootstrap Tests
// ============================================================================

describe("useEnhancedBootstrap", () => {
  describe("initial state", () => {
    it("starts with isLoading false", () => {
      const { result } = renderHook(() => useEnhancedBootstrap());
      expect(result.current.isLoading).toBe(false);
    });

    it("starts with error null", () => {
      const { result } = renderHook(() => useEnhancedBootstrap());
      expect(result.current.error).toBeNull();
    });

    it("starts with result null", () => {
      const { result } = renderHook(() => useEnhancedBootstrap());
      expect(result.current.result).toBeNull();
    });

    it("provides bootstrap function", () => {
      const { result } = renderHook(() => useEnhancedBootstrap());
      expect(typeof result.current.bootstrap).toBe("function");
    });
  });

  describe("successful bootstrap", () => {
    it("sets isLoading to true during request", async () => {
      let resolvePromise: (value: Response) => void;
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useEnhancedBootstrap());

      // Start the bootstrap but don't await
      act(() => {
        result.current.bootstrap(validBootstrapInput);
      });

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => mockBootstrapResult,
      } as Response);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("calls API with correct URL and body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/chat/bootstrap/enhanced",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBootstrapInput),
        })
      );
    });

    it("returns and stores result on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      let returnValue: EnhancedBootstrapResult | null = null;
      await act(async () => {
        returnValue = await result.current.bootstrap(validBootstrapInput);
      });

      expect(returnValue).toEqual(mockBootstrapResult);
      expect(result.current.result).toEqual(mockBootstrapResult);
      expect(result.current.error).toBeNull();
    });

    it("calls onSuccess callback with result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useEnhancedBootstrap({ onSuccess }));

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockBootstrapResult);
    });

    it("uses custom baseUrl when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() =>
        useEnhancedBootstrap({ baseUrl: "/custom/api" })
      );

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/custom/api/bootstrap/enhanced",
        expect.any(Object)
      );
    });
  });

  describe("error handling", () => {
    it("handles HTTP error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid input" }),
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      let returnValue: EnhancedBootstrapResult | null = null;
      await act(async () => {
        returnValue = await result.current.bootstrap(validBootstrapInput);
      });

      expect(returnValue).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Invalid input");
      expect(result.current.isLoading).toBe(false);
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Network error");
    });

    it("calls onError callback on failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const onError = vi.fn();
      const { result } = renderHook(() => useEnhancedBootstrap({ onError }));

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("handles JSON parse error in error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("Internal Server Error");
    });
  });

  describe("result structure validation", () => {
    it("returns project with id and name", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(result.current.result?.project).toEqual({
        id: "proj-123",
        name: "Test Story",
      });
    });

    it("returns storyboards for each act", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(result.current.result?.storyboards).toHaveLength(3);
      expect(result.current.result?.storyboards[0]).toHaveProperty("actIndex", 0);
    });

    it("returns beats with panel associations", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(result.current.result?.beats).toHaveLength(4);
      expect(result.current.result?.beats[0]).toHaveProperty("panelId");
    });

    it("returns panels with beat associations", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(result.current.result?.panels).toHaveLength(4);
      expect(result.current.result?.panels[0]).toHaveProperty("beatId");
      expect(result.current.result?.panels[0]).toHaveProperty("storyboardId");
    });

    it("returns created characters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBootstrapResult,
      });

      const { result } = renderHook(() => useEnhancedBootstrap());

      await act(async () => {
        await result.current.bootstrap(validBootstrapInput);
      });

      expect(result.current.result?.characters).toHaveLength(2);
      expect(result.current.result?.characters.map((c) => c.name)).toEqual([
        "Luna",
        "Max",
      ]);
    });
  });
});
