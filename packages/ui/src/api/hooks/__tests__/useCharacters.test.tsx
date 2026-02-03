/**
 * Tests for useCharacters hooks
 * 
 * Tests TanStack Query hooks for character CRUD operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useCharacters,
  useCharacter,
  useCreateCharacter,
  useUpdateCharacter,
  useDeleteCharacter,
  useAddReference,
  useSetCharacterLoRA,
} from "../useCharacters";
import { apiClient } from "../../client";

vi.mock("../../client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
    DELETE: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCharacters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch characters for a project", async () => {
    const mockCharacters = [
      { id: "1", name: "Character 1", projectId: "proj1" },
      { id: "2", name: "Character 2", projectId: "proj1" },
    ];

    vi.mocked(apiClient.GET).mockResolvedValue({
      data: { characters: mockCharacters },
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useCharacters("proj1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCharacters);
  });

  it("should not fetch when projectId is null", () => {
    const { result } = renderHook(() => useCharacters(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(apiClient.GET).not.toHaveBeenCalled();
  });
});

describe("useCharacter", () => {
  it("should fetch a single character", async () => {
    const mockCharacter = { id: "1", name: "Character 1" };

    vi.mocked(apiClient.GET).mockResolvedValue({
      data: mockCharacter,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useCharacter("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCharacter);
  });
});

describe("useCreateCharacter", () => {
  it("should create a character successfully", async () => {
    const input = { projectId: "proj1", name: "New Character" };
    const created = { id: "1", ...input };

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: created,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useCreateCharacter(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(created);
  });
});

describe("useUpdateCharacter", () => {
  it("should update a character successfully", async () => {
    const updated = { id: "1", name: "Updated Name" };

    vi.mocked(apiClient.PUT).mockResolvedValue({
      data: updated,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useUpdateCharacter(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "1", name: "Updated Name" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(updated);
  });
});

describe("useDeleteCharacter", () => {
  it("should delete a character successfully", async () => {
    vi.mocked(apiClient.DELETE).mockResolvedValue({
      data: null,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useDeleteCharacter(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAddReference", () => {
  it("should add a reference image", async () => {
    const input = {
      characterId: "1",
      imageUrl: "https://example.com/image.png",
      type: "main" as const,
    };

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: { id: "ref1", ...input },
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useAddReference(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSetCharacterLoRA", () => {
  it("should set LoRA for a character", async () => {
    const input = { characterId: "1", loraId: "lora1", strength: 0.8 };

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: { ...input },
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useSetCharacterLoRA(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
