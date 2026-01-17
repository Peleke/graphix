/**
 * Project Dashboard Store
 *
 * Zustand store for managing project dashboard state.
 * Handles project listing, filtering, sorting, and UI state.
 *
 * Manages dashboard state including projects, filters, sorting, and modals.
 */

import { create } from "zustand";
import type { Project } from "@graphix/client";

// ============================================================================
// Types
// ============================================================================

/** View mode for project display */
export type ViewMode = "grid" | "list";

/** Sort field options */
export type SortField = "name" | "createdAt" | "updatedAt";

/** Sort direction */
export type SortDirection = "asc" | "desc";

/** Project template types */
export type ProjectTemplate = "blank" | "comic" | "manga" | "webtoon";

/** Filter state */
export interface ProjectFilters {
  search: string;
  template?: ProjectTemplate;
}

/** Sort state */
export interface ProjectSort {
  field: SortField;
  direction: SortDirection;
}

/** Modal states */
export interface ModalState {
  createProject: boolean;
  deleteProject: string | null; // Project ID to delete
  duplicateProject: string | null; // Project ID to duplicate
  exportProject: string | null; // Project ID to export
}

/** Dashboard UI state */
export interface DashboardUIState {
  viewMode: ViewMode;
  filters: ProjectFilters;
  sort: ProjectSort;
  modals: ModalState;
  selectedProjectId: string | null;
  hoveredProjectId: string | null;
}

/**
 * Project data state
 *
 * DESIGN DECISION: We maintain both `projects` (Map) and `projectIds` (array).
 * This is intentional, not redundant:
 *
 * - `projects` Map: O(1) lookup by ID, efficient updates
 * - `projectIds` array: Maintains display order (newest first), survives filtering
 *
 * While JS Maps preserve insertion order, we need explicit control over ordering
 * when adding new projects to the front of the list. The array gives us that control.
 *
 * Alternative considered: Derive order from Map - rejected because:
 * 1. Map order changes on delete/re-add
 * 2. "Newest first" requires prepending, not natural Map order
 * 3. Array.from(map.keys()) on every render is wasteful
 */
export interface ProjectDataState {
  /** Fast lookup by ID - O(1) access */
  readonly projects: Map<string, Project>;
  /** Maintains display order - newest first. Derived operations use this. */
  readonly projectIds: readonly string[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/** Combined store state */
export interface ProjectStoreState extends DashboardUIState, ProjectDataState {
  actions: ProjectStoreActions;
}

/** Store actions */
export interface ProjectStoreActions {
  // UI Actions
  setViewMode: (mode: ViewMode) => void;
  setSearch: (search: string) => void;
  setFilters: (filters: Partial<ProjectFilters>) => void;
  clearFilters: () => void;
  setSort: (sort: Partial<ProjectSort>) => void;
  toggleSortDirection: () => void;

  // Modal Actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDeleteModal: (projectId: string) => void;
  closeDeleteModal: () => void;
  openDuplicateModal: (projectId: string) => void;
  closeDuplicateModal: () => void;
  openExportModal: (projectId: string) => void;
  closeExportModal: () => void;
  closeAllModals: () => void;

  // Selection Actions
  selectProject: (projectId: string | null) => void;
  setHoveredProject: (projectId: string | null) => void;

  // Data Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  removeProject: (projectId: string) => void;
  clearProjects: () => void;

  // Loading/Error Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Pagination Actions
  setPagination: (pagination: Partial<ProjectDataState["pagination"]>) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;

  // Getters
  getProject: (projectId: string) => Project | undefined;
  getFilteredProjects: () => Project[];
  getSortedProjects: () => Project[];
  getDisplayProjects: () => Project[];
  getProjectCount: () => number;
  getFilteredCount: () => number;
  isProjectSelected: (projectId: string) => boolean;
  isAnyModalOpen: () => boolean;
}

// ============================================================================
// Default State
// ============================================================================

export const DEFAULT_FILTERS: ProjectFilters = {
  search: "",
  template: undefined,
};

export const DEFAULT_SORT: ProjectSort = {
  field: "updatedAt",
  direction: "desc",
};

export const DEFAULT_MODALS: ModalState = {
  createProject: false,
  deleteProject: null,
  duplicateProject: null,
  exportProject: null,
};

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  hasMore: false,
};

/** Maximum search query length (security: prevent DoS via huge strings) */
export const MAX_SEARCH_LENGTH = 200;

// ============================================================================
// Store Implementation
// ============================================================================

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  // Initial UI State
  viewMode: "grid",
  filters: { ...DEFAULT_FILTERS },
  sort: { ...DEFAULT_SORT },
  modals: { ...DEFAULT_MODALS },
  selectedProjectId: null,
  hoveredProjectId: null,

  // Initial Data State
  projects: new Map(),
  projectIds: [],
  isLoading: false,
  error: null,
  pagination: { ...DEFAULT_PAGINATION },

  // Actions
  actions: {
    // ========================================================================
    // UI Actions
    // ========================================================================

    setViewMode: (mode) => {
      set({ viewMode: mode });
    },

    setSearch: (search) => {
      // Security: Limit search length to prevent DoS via huge strings
      const sanitizedSearch = search.slice(0, MAX_SEARCH_LENGTH);
      set((state) => ({
        filters: { ...state.filters, search: sanitizedSearch },
      }));
    },

    setFilters: (filters) => {
      set((state) => ({
        filters: { ...state.filters, ...filters },
      }));
    },

    clearFilters: () => {
      set({ filters: { ...DEFAULT_FILTERS } });
    },

    setSort: (sort) => {
      set((state) => ({
        sort: { ...state.sort, ...sort },
      }));
    },

    toggleSortDirection: () => {
      set((state) => ({
        sort: {
          ...state.sort,
          direction: state.sort.direction === "asc" ? "desc" : "asc",
        },
      }));
    },

    // ========================================================================
    // Modal Actions
    // ========================================================================

    openCreateModal: () => {
      set((state) => ({
        modals: { ...state.modals, createProject: true },
      }));
    },

    closeCreateModal: () => {
      set((state) => ({
        modals: { ...state.modals, createProject: false },
      }));
    },

    openDeleteModal: (projectId) => {
      set((state) => ({
        modals: { ...state.modals, deleteProject: projectId },
      }));
    },

    closeDeleteModal: () => {
      set((state) => ({
        modals: { ...state.modals, deleteProject: null },
      }));
    },

    openDuplicateModal: (projectId) => {
      set((state) => ({
        modals: { ...state.modals, duplicateProject: projectId },
      }));
    },

    closeDuplicateModal: () => {
      set((state) => ({
        modals: { ...state.modals, duplicateProject: null },
      }));
    },

    openExportModal: (projectId) => {
      set((state) => ({
        modals: { ...state.modals, exportProject: projectId },
      }));
    },

    closeExportModal: () => {
      set((state) => ({
        modals: { ...state.modals, exportProject: null },
      }));
    },

    closeAllModals: () => {
      set({ modals: { ...DEFAULT_MODALS } });
    },

    // ========================================================================
    // Selection Actions
    // ========================================================================

    selectProject: (projectId) => {
      set({ selectedProjectId: projectId });
    },

    setHoveredProject: (projectId) => {
      set({ hoveredProjectId: projectId });
    },

    // ========================================================================
    // Data Actions
    // ========================================================================

    setProjects: (projects) => {
      const projectMap = new Map<string, Project>();
      const projectIds: string[] = [];

      for (const project of projects) {
        projectMap.set(project.id, project);
        projectIds.push(project.id);
      }

      set({
        projects: projectMap,
        projectIds,
        error: null,
      });
    },

    addProject: (project) => {
      set((state) => {
        const newProjects = new Map(state.projects);
        newProjects.set(project.id, project);

        // Add to beginning of list (newest first)
        const newIds = [project.id, ...state.projectIds.filter((id) => id !== project.id)];

        return {
          projects: newProjects,
          projectIds: newIds,
          pagination: {
            ...state.pagination,
            total: state.pagination.total + 1,
          },
        };
      });
    },

    updateProject: (projectId, updates) => {
      set((state) => {
        const project = state.projects.get(projectId);
        if (!project) return state;

        const newProjects = new Map(state.projects);
        newProjects.set(projectId, { ...project, ...updates });

        return { projects: newProjects };
      });
    },

    removeProject: (projectId) => {
      set((state) => {
        const newProjects = new Map(state.projects);
        newProjects.delete(projectId);

        const newIds = state.projectIds.filter((id) => id !== projectId);

        return {
          projects: newProjects,
          projectIds: newIds,
          selectedProjectId:
            state.selectedProjectId === projectId ? null : state.selectedProjectId,
          pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1),
          },
        };
      });
    },

    clearProjects: () => {
      set({
        projects: new Map(),
        projectIds: [],
        selectedProjectId: null,
        pagination: { ...DEFAULT_PAGINATION },
      });
    },

    // ========================================================================
    // Loading/Error Actions
    // ========================================================================

    setLoading: (isLoading) => {
      set({ isLoading });
    },

    setError: (error) => {
      set({ error, isLoading: false });
    },

    clearError: () => {
      set({ error: null });
    },

    // ========================================================================
    // Pagination Actions
    // ========================================================================

    setPagination: (pagination) => {
      set((state) => ({
        pagination: { ...state.pagination, ...pagination },
      }));
    },

    nextPage: () => {
      set((state) => {
        if (!state.pagination.hasMore) return state;
        return {
          pagination: {
            ...state.pagination,
            page: state.pagination.page + 1,
          },
        };
      });
    },

    prevPage: () => {
      set((state) => {
        if (state.pagination.page <= 1) return state;
        return {
          pagination: {
            ...state.pagination,
            page: state.pagination.page - 1,
          },
        };
      });
    },

    goToPage: (page) => {
      set((state) => {
        const maxPage = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
        const validPage = Math.max(1, Math.min(page, maxPage));
        return {
          pagination: {
            ...state.pagination,
            page: validPage,
          },
        };
      });
    },

    // ========================================================================
    // Getters
    // ========================================================================

    getProject: (projectId) => {
      return get().projects.get(projectId);
    },

    getFilteredProjects: () => {
      const state = get();
      const { search, template } = state.filters;

      let filtered = state.projectIds.map((id) => state.projects.get(id)!).filter(Boolean);

      // Filter by search
      if (search.trim()) {
        const searchLower = search.toLowerCase().trim();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            (p.description && p.description.toLowerCase().includes(searchLower))
        );
      }

      // Filter by template
      if (template) {
        filtered = filtered.filter((p) => p.settings?.template === template);
      }

      return filtered;
    },

    getSortedProjects: () => {
      const state = get();
      const filtered = state.actions.getFilteredProjects();
      const { field, direction } = state.sort;

      return [...filtered].sort((a, b) => {
        let comparison = 0;

        switch (field) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "createdAt":
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case "updatedAt":
            comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            break;
        }

        return direction === "asc" ? comparison : -comparison;
      });
    },

    getDisplayProjects: () => {
      return get().actions.getSortedProjects();
    },

    getProjectCount: () => {
      return get().projectIds.length;
    },

    getFilteredCount: () => {
      return get().actions.getFilteredProjects().length;
    },

    isProjectSelected: (projectId) => {
      return get().selectedProjectId === projectId;
    },

    isAnyModalOpen: () => {
      const { modals } = get();
      return (
        modals.createProject ||
        modals.deleteProject !== null ||
        modals.duplicateProject !== null ||
        modals.exportProject !== null
      );
    },
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/** Select just the view mode */
export const useViewMode = () => useProjectStore((state) => state.viewMode);

/** Select just the filters */
export const useProjectFilters = () => useProjectStore((state) => state.filters);

/** Select just the sort */
export const useProjectSort = () => useProjectStore((state) => state.sort);

/** Select just the modals */
export const useProjectModals = () => useProjectStore((state) => state.modals);

/** Select loading state */
export const useProjectsLoading = () => useProjectStore((state) => state.isLoading);

/** Select error state */
export const useProjectsError = () => useProjectStore((state) => state.error);

/** Select pagination */
export const useProjectsPagination = () => useProjectStore((state) => state.pagination);

/** Select selected project ID */
export const useSelectedProjectId = () => useProjectStore((state) => state.selectedProjectId);

/** Select store actions */
export const useProjectActions = () => useProjectStore((state) => state.actions);
