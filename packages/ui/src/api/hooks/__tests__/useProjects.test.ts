/**
 * Tests for useProjects hooks
 * 
 * Tests TanStack Query hooks for project CRUD operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useProjects, useProject, useCreateProject, useDeleteProject, useDuplicateProject } from "../useProjects";
import { apiClient } from "../../client";

// Mock the API client
vi.mock("../../client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
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

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch projects successfully", async () => {
    const mockProjects = {
      projects: [
        { id: "1", name: "Project 1", createdAt: "2024-01-01" },
        { id: "2", name: "Project 2", createdAt: "2024-01-02" },
      ],
      pagination: { limit: 20, offset: 0, count: 2 },
    };

    vi.mocked(apiClient.GET).mockResolvedValue({
      data: mockProjects,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useProjects({ page: 1, limit: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      data: mockProjects.projects,
      pagination: mockProjects.pagination,
    });
  });

  it("should handle API errors", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({
      data: null,
      error: { error: { message: "Failed to fetch" } },
      response: {} as Response,
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe("useProject", () => {
  it("should fetch a single project", async () => {
    const mockProject = { id: "1", name: "Project 1" };

    vi.mocked(apiClient.GET).mockResolvedValue({
      data: mockProject,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useProject("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProject);
  });

  it("should not fetch when id is null", () => {
    const { result } = renderHook(() => useProject(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(apiClient.GET).not.toHaveBeenCalled();
  });
});

describe("useCreateProject", () => {
  it("should create a project successfully", async () => {
    const newProject = { name: "New Project", description: "Test" };
    const createdProject = { id: "1", ...newProject };

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: createdProject,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newProject);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(createdProject);
  });
});

describe("useDeleteProject", () => {
  it("should delete a project successfully", async () => {
    vi.mocked(apiClient.DELETE).mockResolvedValue({
      data: null,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDuplicateProject", () => {
  it("should duplicate a project successfully", async () => {
    const originalProject = { id: "1", name: "Original" };
    const duplicatedProject = { id: "2", name: "Original (Copy)" };

    vi.mocked(apiClient.GET).mockResolvedValue({
      data: originalProject,
      error: null,
      response: {} as Response,
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: duplicatedProject,
      error: null,
      response: {} as Response,
    });

    const { result } = renderHook(() => useDuplicateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(duplicatedProject);
  });
});
