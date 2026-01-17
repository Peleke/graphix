/**
 * Project API Hooks
 * 
 * TanStack Query hooks for project CRUD operations.
 * Connects the Dashboard UI to the backend API.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { Project } from "@graphix/client";

// ============================================================================
// Query Keys
// ============================================================================

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: ProjectListParams) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch paginated list of projects
 */
export function useProjects(params: ProjectListParams = {}) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/projects", {
        params: {
          query: {
            page: params.page ?? 1,
            limit: params.limit ?? 20,
            // Note: search, sortBy, sortOrder may need backend support
          },
        },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch projects");
      }

      // API returns { projects: [], pagination: {} }
      return {
        data: data?.projects || [],
        pagination: data?.pagination,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(id: string | null) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await apiClient.GET("/projects/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to fetch project");
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await apiClient.POST("/projects", {
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to create project");
      }

      return data;
    },
    onSuccess: (newProject) => {
      // Invalidate project lists to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      
      // Optionally add to cache immediately
      if (newProject) {
        queryClient.setQueryData(
          projectKeys.detail(newProject.id),
          newProject
        );
      }
    },
  });
}

/**
 * Update an existing project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProjectInput & { id: string }) => {
      const { data, error } = await apiClient.PATCH("/projects/{id}", {
        params: { path: { id } },
        body: input,
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to update project");
      }

      return data;
    },
    onSuccess: (updatedProject) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      
      // Update detail cache
      if (updatedProject) {
        queryClient.setQueryData(
          projectKeys.detail(updatedProject.id),
          updatedProject
        );
      }
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/projects/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw new Error(error.error?.message || "Failed to delete project");
      }

      return id;
    },
    onSuccess: (deletedId) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(deletedId) });
    },
  });
}

/**
 * Duplicate a project
 */
export function useDuplicateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First fetch the project
      const { data: project, error: fetchError } = await apiClient.GET("/projects/{id}", {
        params: { path: { id } },
      });

      if (fetchError || !project) {
        throw new Error("Failed to fetch project for duplication");
      }

      // Create a copy with modified name
      const { data: newProject, error: createError } = await apiClient.POST("/projects", {
        body: {
          name: `${project.name} (Copy)`,
          description: project.description,
          settings: project.settings,
        },
      });

      if (createError) {
        throw new Error(createError.error?.message || "Failed to duplicate project");
      }

      return newProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
