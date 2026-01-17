/**
 * Project Dashboard Store Tests
 *
 * EXHAUSTIVE tests for the Zustand store managing project dashboard state.
 * Complete coverage for all store operations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  useProjectStore,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_MODALS,
  DEFAULT_PAGINATION,
} from "../../../stores/project.store";
import type { Project } from "@graphix/client";

// ============================================================================
// Test Helpers
// ============================================================================

/** Reset store to initial state before each test */
function resetStore() {
  useProjectStore.setState({
    viewMode: "grid",
    filters: { ...DEFAULT_FILTERS },
    sort: { ...DEFAULT_SORT },
    modals: { ...DEFAULT_MODALS },
    selectedProjectId: null,
    hoveredProjectId: null,
    projects: new Map(),
    projectIds: [],
    isLoading: false,
    error: null,
    pagination: { ...DEFAULT_PAGINATION },
  });
}

/** Create a mock project */
function createMockProject(overrides: Partial<Project> = {}): Project {
  const id = overrides.id ?? `project-${Math.random().toString(36).substring(2, 9)}`;
  return {
    id,
    name: `Test Project ${id}`,
    description: "A test project description",
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Create multiple mock projects */
function createMockProjects(count: number): Project[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProject({
      id: `project-${i}`,
      name: `Project ${i}`,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(), // Each day older
      updatedAt: new Date(Date.now() - i * 43200000).toISOString(), // Each half-day older
    })
  );
}

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  resetStore();
});

// ============================================================================
// View Mode Tests
// ============================================================================

describe("Project Store - View Mode", () => {
  it("should have grid as default view mode", () => {
    const state = useProjectStore.getState();
    expect(state.viewMode).toBe("grid");
  });

  it("should set view mode to list", () => {
    const { actions } = useProjectStore.getState();
    actions.setViewMode("list");
    expect(useProjectStore.getState().viewMode).toBe("list");
  });

  it("should set view mode to grid", () => {
    const { actions } = useProjectStore.getState();
    actions.setViewMode("list");
    actions.setViewMode("grid");
    expect(useProjectStore.getState().viewMode).toBe("grid");
  });

  it("should toggle between view modes", () => {
    const { actions } = useProjectStore.getState();

    expect(useProjectStore.getState().viewMode).toBe("grid");
    actions.setViewMode("list");
    expect(useProjectStore.getState().viewMode).toBe("list");
    actions.setViewMode("grid");
    expect(useProjectStore.getState().viewMode).toBe("grid");
  });
});

// ============================================================================
// Filter Tests
// ============================================================================

describe("Project Store - Filters", () => {
  it("should have empty search by default", () => {
    const state = useProjectStore.getState();
    expect(state.filters.search).toBe("");
  });

  it("should set search filter", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("test query");
    expect(useProjectStore.getState().filters.search).toBe("test query");
  });

  it("should clear search when setting empty string", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("test");
    actions.setSearch("");
    expect(useProjectStore.getState().filters.search).toBe("");
  });

  it("should set partial filters", () => {
    const { actions } = useProjectStore.getState();
    actions.setFilters({ template: "comic" });
    const state = useProjectStore.getState();
    expect(state.filters.template).toBe("comic");
    expect(state.filters.search).toBe(""); // Should preserve other filters
  });

  it("should set multiple filters at once", () => {
    const { actions } = useProjectStore.getState();
    actions.setFilters({ search: "test", template: "manga" });
    const state = useProjectStore.getState();
    expect(state.filters.search).toBe("test");
    expect(state.filters.template).toBe("manga");
  });

  it("should clear all filters", () => {
    const { actions } = useProjectStore.getState();
    actions.setFilters({ search: "test", template: "webtoon" });
    actions.clearFilters();
    const state = useProjectStore.getState();
    expect(state.filters).toEqual(DEFAULT_FILTERS);
  });

  it("should preserve other filters when setting search", () => {
    const { actions } = useProjectStore.getState();
    actions.setFilters({ template: "comic" });
    actions.setSearch("new search");
    const state = useProjectStore.getState();
    expect(state.filters.search).toBe("new search");
    expect(state.filters.template).toBe("comic");
  });
});

// ============================================================================
// Sort Tests
// ============================================================================

describe("Project Store - Sort", () => {
  it("should have updatedAt desc as default sort", () => {
    const state = useProjectStore.getState();
    expect(state.sort.field).toBe("updatedAt");
    expect(state.sort.direction).toBe("desc");
  });

  it("should set sort field", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "name" });
    expect(useProjectStore.getState().sort.field).toBe("name");
  });

  it("should set sort direction", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ direction: "asc" });
    expect(useProjectStore.getState().sort.direction).toBe("asc");
  });

  it("should set both sort field and direction", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "createdAt", direction: "asc" });
    const state = useProjectStore.getState();
    expect(state.sort.field).toBe("createdAt");
    expect(state.sort.direction).toBe("asc");
  });

  it("should toggle sort direction from desc to asc", () => {
    const { actions } = useProjectStore.getState();
    actions.toggleSortDirection();
    expect(useProjectStore.getState().sort.direction).toBe("asc");
  });

  it("should toggle sort direction from asc to desc", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ direction: "asc" });
    actions.toggleSortDirection();
    expect(useProjectStore.getState().sort.direction).toBe("desc");
  });

  it("should preserve sort field when toggling direction", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "name" });
    actions.toggleSortDirection();
    expect(useProjectStore.getState().sort.field).toBe("name");
  });
});

// ============================================================================
// Modal Tests
// ============================================================================

describe("Project Store - Modals", () => {
  it("should have all modals closed by default", () => {
    const state = useProjectStore.getState();
    expect(state.modals.createProject).toBe(false);
    expect(state.modals.deleteProject).toBeNull();
    expect(state.modals.duplicateProject).toBeNull();
    expect(state.modals.exportProject).toBeNull();
  });

  it("should open create modal", () => {
    const { actions } = useProjectStore.getState();
    actions.openCreateModal();
    expect(useProjectStore.getState().modals.createProject).toBe(true);
  });

  it("should close create modal", () => {
    const { actions } = useProjectStore.getState();
    actions.openCreateModal();
    actions.closeCreateModal();
    expect(useProjectStore.getState().modals.createProject).toBe(false);
  });

  it("should open delete modal with project ID", () => {
    const { actions } = useProjectStore.getState();
    actions.openDeleteModal("project-123");
    expect(useProjectStore.getState().modals.deleteProject).toBe("project-123");
  });

  it("should close delete modal", () => {
    const { actions } = useProjectStore.getState();
    actions.openDeleteModal("project-123");
    actions.closeDeleteModal();
    expect(useProjectStore.getState().modals.deleteProject).toBeNull();
  });

  it("should open duplicate modal with project ID", () => {
    const { actions } = useProjectStore.getState();
    actions.openDuplicateModal("project-456");
    expect(useProjectStore.getState().modals.duplicateProject).toBe("project-456");
  });

  it("should close duplicate modal", () => {
    const { actions } = useProjectStore.getState();
    actions.openDuplicateModal("project-456");
    actions.closeDuplicateModal();
    expect(useProjectStore.getState().modals.duplicateProject).toBeNull();
  });

  it("should open export modal with project ID", () => {
    const { actions } = useProjectStore.getState();
    actions.openExportModal("project-789");
    expect(useProjectStore.getState().modals.exportProject).toBe("project-789");
  });

  it("should close export modal", () => {
    const { actions } = useProjectStore.getState();
    actions.openExportModal("project-789");
    actions.closeExportModal();
    expect(useProjectStore.getState().modals.exportProject).toBeNull();
  });

  it("should close all modals at once", () => {
    const { actions } = useProjectStore.getState();
    actions.openCreateModal();
    actions.openDeleteModal("project-1");
    actions.openDuplicateModal("project-2");
    actions.openExportModal("project-3");
    actions.closeAllModals();

    const state = useProjectStore.getState();
    expect(state.modals.createProject).toBe(false);
    expect(state.modals.deleteProject).toBeNull();
    expect(state.modals.duplicateProject).toBeNull();
    expect(state.modals.exportProject).toBeNull();
  });

  it("should correctly detect when any modal is open", () => {
    const { actions } = useProjectStore.getState();
    expect(actions.isAnyModalOpen()).toBe(false);

    actions.openCreateModal();
    expect(actions.isAnyModalOpen()).toBe(true);

    actions.closeCreateModal();
    expect(actions.isAnyModalOpen()).toBe(false);

    actions.openDeleteModal("project-1");
    expect(actions.isAnyModalOpen()).toBe(true);
  });
});

// ============================================================================
// Selection Tests
// ============================================================================

describe("Project Store - Selection", () => {
  it("should have no project selected by default", () => {
    const state = useProjectStore.getState();
    expect(state.selectedProjectId).toBeNull();
  });

  it("should select a project", () => {
    const { actions } = useProjectStore.getState();
    actions.selectProject("project-123");
    expect(useProjectStore.getState().selectedProjectId).toBe("project-123");
  });

  it("should deselect a project by setting null", () => {
    const { actions } = useProjectStore.getState();
    actions.selectProject("project-123");
    actions.selectProject(null);
    expect(useProjectStore.getState().selectedProjectId).toBeNull();
  });

  it("should change selection to different project", () => {
    const { actions } = useProjectStore.getState();
    actions.selectProject("project-1");
    actions.selectProject("project-2");
    expect(useProjectStore.getState().selectedProjectId).toBe("project-2");
  });

  it("should correctly detect if project is selected", () => {
    const { actions } = useProjectStore.getState();
    actions.selectProject("project-123");
    expect(actions.isProjectSelected("project-123")).toBe(true);
    expect(actions.isProjectSelected("project-456")).toBe(false);
  });

  it("should set hovered project", () => {
    const { actions } = useProjectStore.getState();
    actions.setHoveredProject("project-123");
    expect(useProjectStore.getState().hoveredProjectId).toBe("project-123");
  });

  it("should clear hovered project", () => {
    const { actions } = useProjectStore.getState();
    actions.setHoveredProject("project-123");
    actions.setHoveredProject(null);
    expect(useProjectStore.getState().hoveredProjectId).toBeNull();
  });
});

// ============================================================================
// Project Data Tests
// ============================================================================

describe("Project Store - Project Data", () => {
  it("should have empty projects by default", () => {
    const state = useProjectStore.getState();
    expect(state.projects.size).toBe(0);
    expect(state.projectIds.length).toBe(0);
  });

  it("should set projects from array", () => {
    const { actions } = useProjectStore.getState();
    const projects = createMockProjects(3);
    actions.setProjects(projects);

    const state = useProjectStore.getState();
    expect(state.projects.size).toBe(3);
    expect(state.projectIds.length).toBe(3);
  });

  it("should maintain project order when setting projects", () => {
    const { actions } = useProjectStore.getState();
    const projects = createMockProjects(3);
    actions.setProjects(projects);

    const state = useProjectStore.getState();
    expect(state.projectIds[0]).toBe("project-0");
    expect(state.projectIds[1]).toBe("project-1");
    expect(state.projectIds[2]).toBe("project-2");
  });

  it("should add a single project", () => {
    const { actions } = useProjectStore.getState();
    const project = createMockProject({ id: "new-project" });
    actions.addProject(project);

    const state = useProjectStore.getState();
    expect(state.projects.has("new-project")).toBe(true);
    expect(state.projectIds[0]).toBe("new-project"); // Added to beginning
  });

  it("should add project to beginning of list", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects(createMockProjects(3));
    const newProject = createMockProject({ id: "newest" });
    actions.addProject(newProject);

    const state = useProjectStore.getState();
    expect(state.projectIds[0]).toBe("newest");
  });

  it("should not duplicate project when adding existing ID", () => {
    const { actions } = useProjectStore.getState();
    const project = createMockProject({ id: "project-1" });
    actions.addProject(project);
    actions.addProject({ ...project, name: "Updated Name" });

    const state = useProjectStore.getState();
    expect(state.projectIds.filter((id) => id === "project-1").length).toBe(1);
  });

  it("should update project by ID", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([createMockProject({ id: "project-1", name: "Original" })]);
    actions.updateProject("project-1", { name: "Updated" });

    const project = actions.getProject("project-1");
    expect(project?.name).toBe("Updated");
  });

  it("should preserve unchanged fields when updating", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({
        id: "project-1",
        name: "Original",
        description: "Original description",
      }),
    ]);
    actions.updateProject("project-1", { name: "Updated" });

    const project = actions.getProject("project-1");
    expect(project?.description).toBe("Original description");
  });

  it("should remove project by ID", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects(createMockProjects(3));
    actions.removeProject("project-1");

    const state = useProjectStore.getState();
    expect(state.projects.has("project-1")).toBe(false);
    expect(state.projectIds).not.toContain("project-1");
  });

  it("should clear selection when selected project is removed", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects(createMockProjects(3));
    actions.selectProject("project-1");
    actions.removeProject("project-1");

    expect(useProjectStore.getState().selectedProjectId).toBeNull();
  });

  it("should not clear selection when other project is removed", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects(createMockProjects(3));
    actions.selectProject("project-0");
    actions.removeProject("project-1");

    expect(useProjectStore.getState().selectedProjectId).toBe("project-0");
  });

  it("should clear all projects", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects(createMockProjects(5));
    actions.selectProject("project-1");
    actions.clearProjects();

    const state = useProjectStore.getState();
    expect(state.projects.size).toBe(0);
    expect(state.projectIds.length).toBe(0);
    expect(state.selectedProjectId).toBeNull();
  });

  it("should get project by ID", () => {
    const { actions } = useProjectStore.getState();
    const projects = createMockProjects(3);
    actions.setProjects(projects);

    const project = actions.getProject("project-1");
    expect(project).toBeDefined();
    expect(project?.id).toBe("project-1");
  });

  it("should return undefined for non-existent project", () => {
    const { actions } = useProjectStore.getState();
    const project = actions.getProject("non-existent");
    expect(project).toBeUndefined();
  });
});

// ============================================================================
// Loading/Error Tests
// ============================================================================

describe("Project Store - Loading & Error", () => {
  it("should not be loading by default", () => {
    const state = useProjectStore.getState();
    expect(state.isLoading).toBe(false);
  });

  it("should set loading state", () => {
    const { actions } = useProjectStore.getState();
    actions.setLoading(true);
    expect(useProjectStore.getState().isLoading).toBe(true);
  });

  it("should clear loading state", () => {
    const { actions } = useProjectStore.getState();
    actions.setLoading(true);
    actions.setLoading(false);
    expect(useProjectStore.getState().isLoading).toBe(false);
  });

  it("should have no error by default", () => {
    const state = useProjectStore.getState();
    expect(state.error).toBeNull();
  });

  it("should set error message", () => {
    const { actions } = useProjectStore.getState();
    actions.setError("Something went wrong");
    expect(useProjectStore.getState().error).toBe("Something went wrong");
  });

  it("should clear loading when setting error", () => {
    const { actions } = useProjectStore.getState();
    actions.setLoading(true);
    actions.setError("Error occurred");

    const state = useProjectStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Error occurred");
  });

  it("should clear error", () => {
    const { actions } = useProjectStore.getState();
    actions.setError("Error");
    actions.clearError();
    expect(useProjectStore.getState().error).toBeNull();
  });
});

// ============================================================================
// Pagination Tests
// ============================================================================

describe("Project Store - Pagination", () => {
  it("should have default pagination", () => {
    const state = useProjectStore.getState();
    expect(state.pagination).toEqual(DEFAULT_PAGINATION);
  });

  it("should set pagination partially", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ page: 2 });

    const state = useProjectStore.getState();
    expect(state.pagination.page).toBe(2);
    expect(state.pagination.limit).toBe(DEFAULT_PAGINATION.limit);
  });

  it("should set multiple pagination fields", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ page: 3, total: 100, hasMore: true });

    const state = useProjectStore.getState();
    expect(state.pagination.page).toBe(3);
    expect(state.pagination.total).toBe(100);
    expect(state.pagination.hasMore).toBe(true);
  });

  it("should go to next page when hasMore is true", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ hasMore: true });
    actions.nextPage();

    expect(useProjectStore.getState().pagination.page).toBe(2);
  });

  it("should not go to next page when hasMore is false", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ hasMore: false });
    actions.nextPage();

    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should go to previous page when page > 1", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ page: 3 });
    actions.prevPage();

    expect(useProjectStore.getState().pagination.page).toBe(2);
  });

  it("should not go to previous page when page is 1", () => {
    const { actions } = useProjectStore.getState();
    actions.prevPage();

    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should go to specific page", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 100, limit: 20 });
    actions.goToPage(3);

    expect(useProjectStore.getState().pagination.page).toBe(3);
  });

  it("should clamp page to valid range", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 50, limit: 20 }); // 3 pages max
    actions.goToPage(10);

    expect(useProjectStore.getState().pagination.page).toBe(3);
  });

  it("should not go below page 1", () => {
    const { actions } = useProjectStore.getState();
    actions.goToPage(0);

    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should update total when adding project", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 10 });
    actions.addProject(createMockProject());

    expect(useProjectStore.getState().pagination.total).toBe(11);
  });

  it("should update total when removing project", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects(createMockProjects(3));
    actions.setPagination({ total: 3 });
    actions.removeProject("project-1");

    expect(useProjectStore.getState().pagination.total).toBe(2);
  });
});

// ============================================================================
// Filtering Logic Tests
// ============================================================================

describe("Project Store - Filtering Logic", () => {
  beforeEach(() => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "Alpha Comic", description: "A comic project" }),
      createMockProject({ id: "p2", name: "Beta Manga", description: "A manga project" }),
      createMockProject({ id: "p3", name: "Gamma Webtoon", description: null }),
    ]);
  });

  it("should return all projects when no filters", () => {
    const { actions } = useProjectStore.getState();
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(3);
  });

  it("should filter by name search", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("Alpha");
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("p1");
  });

  it("should filter by description search", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("manga");
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("p2");
  });

  it("should be case-insensitive in search", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("ALPHA");
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(1);
  });

  it("should filter by template", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", settings: { template: "comic" } }),
      createMockProject({ id: "p2", settings: { template: "manga" } }),
      createMockProject({ id: "p3", settings: { template: "comic" } }),
    ]);
    actions.setFilters({ template: "comic" });
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(2);
  });

  it("should combine search and template filters", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "My Comic", settings: { template: "comic" } }),
      createMockProject({ id: "p2", name: "My Manga", settings: { template: "manga" } }),
      createMockProject({ id: "p3", name: "Other Comic", settings: { template: "comic" } }),
    ]);
    actions.setFilters({ search: "My", template: "comic" });
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("p1");
  });

  it("should handle empty search string", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("   ");
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(3);
  });

  it("should get filtered count", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("Alpha");
    expect(actions.getFilteredCount()).toBe(1);
  });

  it("should get total project count", () => {
    const { actions } = useProjectStore.getState();
    expect(actions.getProjectCount()).toBe(3);
  });
});

// ============================================================================
// Sorting Logic Tests
// ============================================================================

describe("Project Store - Sorting Logic", () => {
  beforeEach(() => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({
        id: "p1",
        name: "Zeta",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-03-01T00:00:00Z",
      }),
      createMockProject({
        id: "p2",
        name: "Alpha",
        createdAt: "2024-02-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }),
      createMockProject({
        id: "p3",
        name: "Mango",
        createdAt: "2024-03-01T00:00:00Z",
        updatedAt: "2024-02-01T00:00:00Z",
      }),
    ]);
  });

  it("should sort by name ascending", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "name", direction: "asc" });
    const sorted = actions.getSortedProjects();

    expect(sorted[0].name).toBe("Alpha");
    expect(sorted[1].name).toBe("Mango");
    expect(sorted[2].name).toBe("Zeta");
  });

  it("should sort by name descending", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "name", direction: "desc" });
    const sorted = actions.getSortedProjects();

    expect(sorted[0].name).toBe("Zeta");
    expect(sorted[1].name).toBe("Mango");
    expect(sorted[2].name).toBe("Alpha");
  });

  it("should sort by createdAt ascending", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "createdAt", direction: "asc" });
    const sorted = actions.getSortedProjects();

    expect(sorted[0].id).toBe("p1"); // 2024-01-01
    expect(sorted[1].id).toBe("p2"); // 2024-02-01
    expect(sorted[2].id).toBe("p3"); // 2024-03-01
  });

  it("should sort by createdAt descending", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "createdAt", direction: "desc" });
    const sorted = actions.getSortedProjects();

    expect(sorted[0].id).toBe("p3"); // 2024-03-01
    expect(sorted[1].id).toBe("p2"); // 2024-02-01
    expect(sorted[2].id).toBe("p1"); // 2024-01-01
  });

  it("should sort by updatedAt ascending", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "updatedAt", direction: "asc" });
    const sorted = actions.getSortedProjects();

    expect(sorted[0].id).toBe("p2"); // 2024-01-01
    expect(sorted[1].id).toBe("p3"); // 2024-02-01
    expect(sorted[2].id).toBe("p1"); // 2024-03-01
  });

  it("should sort by updatedAt descending (default)", () => {
    const { actions } = useProjectStore.getState();
    const sorted = actions.getSortedProjects();

    expect(sorted[0].id).toBe("p1"); // 2024-03-01
    expect(sorted[1].id).toBe("p3"); // 2024-02-01
    expect(sorted[2].id).toBe("p2"); // 2024-01-01
  });

  it("should apply filter before sorting", () => {
    const { actions } = useProjectStore.getState();
    actions.setSearch("a"); // Matches "Zeta", "Alpha", "Mango" (all have 'a')
    actions.setSort({ field: "name", direction: "asc" });
    const sorted = actions.getSortedProjects();

    expect(sorted.length).toBe(3);
    expect(sorted[0].name).toBe("Alpha");
  });

  it("should get display projects (filtered + sorted)", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "name", direction: "asc" });
    const display = actions.getDisplayProjects();

    expect(display[0].name).toBe("Alpha");
    expect(display.length).toBe(3);
  });
});
