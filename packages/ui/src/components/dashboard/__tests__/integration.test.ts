/**
 * Project Dashboard - Integration Tests
 *
 * Full workflow tests that verify complete user journeys
 * through the dashboard functionality.
 *
 * ARR! We test the FULL VOYAGE, from port to port! 🏴‍☠️
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

function createProject(overrides: Partial<Project> = {}): Project {
  const id = overrides.id ?? `project-${Math.random().toString(36).substring(2, 9)}`;
  return {
    id,
    name: `Test Project ${id}`,
    description: "A test project",
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  resetStore();
});

// ============================================================================
// Integration: Full Create-List-Open-Delete Workflow
// ============================================================================

describe("Integration: Create-List-Open-Delete Workflow", () => {
  it("should complete full project lifecycle", () => {
    const { actions } = useProjectStore.getState();

    // Step 1: Start with empty state
    expect(actions.getProjectCount()).toBe(0);
    expect(actions.isAnyModalOpen()).toBe(false);

    // Step 2: Open create modal
    actions.openCreateModal();
    expect(useProjectStore.getState().modals.createProject).toBe(true);

    // Step 3: Simulate project creation (API would return this)
    const newProject = createProject({ id: "new-1", name: "My First Project" });
    actions.addProject(newProject);
    actions.closeCreateModal();

    expect(actions.getProjectCount()).toBe(1);
    expect(useProjectStore.getState().modals.createProject).toBe(false);
    expect(actions.getProject("new-1")?.name).toBe("My First Project");

    // Step 4: Select the project
    actions.selectProject("new-1");
    expect(useProjectStore.getState().selectedProjectId).toBe("new-1");
    expect(actions.isProjectSelected("new-1")).toBe(true);

    // Step 5: Open delete confirmation
    actions.openDeleteModal("new-1");
    expect(useProjectStore.getState().modals.deleteProject).toBe("new-1");

    // Step 6: Confirm delete
    actions.removeProject("new-1");
    actions.closeDeleteModal();

    expect(actions.getProjectCount()).toBe(0);
    expect(useProjectStore.getState().selectedProjectId).toBeNull();
    expect(useProjectStore.getState().modals.deleteProject).toBeNull();
  });

  it("should handle multiple project creation and deletion", () => {
    const { actions } = useProjectStore.getState();

    // Create 5 projects
    for (let i = 1; i <= 5; i++) {
      actions.addProject(createProject({ id: `p${i}`, name: `Project ${i}` }));
    }

    expect(actions.getProjectCount()).toBe(5);

    // Select project 3
    actions.selectProject("p3");
    expect(actions.isProjectSelected("p3")).toBe(true);

    // Delete project 2 (not selected)
    actions.removeProject("p2");
    expect(actions.getProjectCount()).toBe(4);
    expect(actions.isProjectSelected("p3")).toBe(true); // Still selected

    // Delete selected project
    actions.removeProject("p3");
    expect(actions.getProjectCount()).toBe(3);
    expect(useProjectStore.getState().selectedProjectId).toBeNull();

    // Verify remaining projects
    expect(actions.getProject("p1")).toBeDefined();
    expect(actions.getProject("p2")).toBeUndefined();
    expect(actions.getProject("p3")).toBeUndefined();
    expect(actions.getProject("p4")).toBeDefined();
    expect(actions.getProject("p5")).toBeDefined();
  });
});

// ============================================================================
// Integration: Search and Filter Workflow
// ============================================================================

describe("Integration: Search and Filter Workflow", () => {
  beforeEach(() => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createProject({ id: "comic-1", name: "Comic Adventure", settings: { template: "comic" } }),
      createProject({ id: "manga-1", name: "Manga Story", settings: { template: "manga" } }),
      createProject({ id: "manga-2", name: "Manga Heroes", settings: { template: "manga" } }),
      createProject({ id: "webtoon-1", name: "Webtoon Drama", settings: { template: "webtoon" } }),
      createProject({ id: "blank-1", name: "Blank Canvas", settings: { template: "blank" } }),
    ]);
  });

  it("should filter by search term", () => {
    const { actions } = useProjectStore.getState();

    expect(actions.getFilteredCount()).toBe(5);

    actions.setSearch("Manga");
    expect(actions.getFilteredCount()).toBe(2);

    const filtered = actions.getFilteredProjects();
    expect(filtered.every((p) => p.name.includes("Manga"))).toBe(true);
  });

  it("should filter by template", () => {
    const { actions } = useProjectStore.getState();

    actions.setFilters({ template: "manga" });
    expect(actions.getFilteredCount()).toBe(2);

    actions.setFilters({ template: "comic" });
    expect(actions.getFilteredCount()).toBe(1);
  });

  it("should combine search and template filters", () => {
    const { actions } = useProjectStore.getState();

    actions.setSearch("Story");
    actions.setFilters({ template: "manga" });

    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("manga-1");
  });

  it("should clear filters and restore all projects", () => {
    const { actions } = useProjectStore.getState();

    actions.setSearch("Nonexistent");
    expect(actions.getFilteredCount()).toBe(0);

    actions.clearFilters();
    expect(actions.getFilteredCount()).toBe(5);
  });

  it("should maintain selection when filtering", () => {
    const { actions } = useProjectStore.getState();

    actions.selectProject("manga-1");
    actions.setSearch("Comic");

    // Selection persists even if project is filtered out
    expect(useProjectStore.getState().selectedProjectId).toBe("manga-1");
  });
});

// ============================================================================
// Integration: Sort Workflow
// ============================================================================

describe("Integration: Sort Workflow", () => {
  beforeEach(() => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createProject({
        id: "p1",
        name: "Zebra",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-03-01T00:00:00Z",
      }),
      createProject({
        id: "p2",
        name: "Alpha",
        createdAt: "2024-03-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }),
      createProject({
        id: "p3",
        name: "Mango",
        createdAt: "2024-02-01T00:00:00Z",
        updatedAt: "2024-02-01T00:00:00Z",
      }),
    ]);
  });

  it("should sort by name in both directions", () => {
    const { actions } = useProjectStore.getState();

    actions.setSort({ field: "name", direction: "asc" });
    let sorted = actions.getSortedProjects();
    expect(sorted[0].name).toBe("Alpha");
    expect(sorted[2].name).toBe("Zebra");

    actions.toggleSortDirection();
    sorted = actions.getSortedProjects();
    expect(sorted[0].name).toBe("Zebra");
    expect(sorted[2].name).toBe("Alpha");
  });

  it("should sort by createdAt", () => {
    const { actions } = useProjectStore.getState();

    actions.setSort({ field: "createdAt", direction: "asc" });
    const sorted = actions.getSortedProjects();

    expect(sorted[0].id).toBe("p1"); // 2024-01-01
    expect(sorted[1].id).toBe("p3"); // 2024-02-01
    expect(sorted[2].id).toBe("p2"); // 2024-03-01
  });

  it("should sort by updatedAt", () => {
    const { actions } = useProjectStore.getState();

    actions.setSort({ field: "updatedAt", direction: "desc" });
    const sorted = actions.getSortedProjects();

    expect(sorted[0].id).toBe("p1"); // 2024-03-01 (most recent)
  });

  it("should apply filters before sorting", () => {
    const { actions } = useProjectStore.getState();

    actions.setSearch("a"); // Matches all (Alpha, Zebra, Mango all have 'a')
    actions.setSort({ field: "name", direction: "asc" });

    const display = actions.getDisplayProjects();
    expect(display.length).toBe(3);
    expect(display[0].name).toBe("Alpha");
  });
});

// ============================================================================
// Integration: Pagination Workflow
// ============================================================================

describe("Integration: Pagination Workflow", () => {
  it("should navigate through pages", () => {
    const { actions } = useProjectStore.getState();

    // Setup pagination state
    actions.setPagination({ total: 100, limit: 10, hasMore: true });

    expect(useProjectStore.getState().pagination.page).toBe(1);

    // Go to next page
    actions.nextPage();
    expect(useProjectStore.getState().pagination.page).toBe(2);

    // Go to specific page
    actions.goToPage(5);
    expect(useProjectStore.getState().pagination.page).toBe(5);

    // Go back
    actions.prevPage();
    expect(useProjectStore.getState().pagination.page).toBe(4);

    // Try to go past end
    actions.goToPage(100);
    expect(useProjectStore.getState().pagination.page).toBe(10); // Max page

    // Try to go before start
    actions.goToPage(0);
    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should update total when adding/removing projects", () => {
    const { actions } = useProjectStore.getState();

    actions.setPagination({ total: 5 });

    actions.addProject(createProject());
    expect(useProjectStore.getState().pagination.total).toBe(6);

    actions.addProject(createProject());
    expect(useProjectStore.getState().pagination.total).toBe(7);

    const id = useProjectStore.getState().projectIds[0];
    actions.removeProject(id);
    expect(useProjectStore.getState().pagination.total).toBe(6);
  });
});

// ============================================================================
// Integration: View Mode Workflow
// ============================================================================

describe("Integration: View Mode Workflow", () => {
  it("should toggle between grid and list view", () => {
    const { actions } = useProjectStore.getState();

    expect(useProjectStore.getState().viewMode).toBe("grid");

    actions.setViewMode("list");
    expect(useProjectStore.getState().viewMode).toBe("list");

    actions.setViewMode("grid");
    expect(useProjectStore.getState().viewMode).toBe("grid");
  });

  it("should preserve projects when changing view mode", () => {
    const { actions } = useProjectStore.getState();

    actions.setProjects([
      createProject({ id: "p1" }),
      createProject({ id: "p2" }),
    ]);
    actions.selectProject("p1");

    actions.setViewMode("list");

    expect(actions.getProjectCount()).toBe(2);
    expect(useProjectStore.getState().selectedProjectId).toBe("p1");

    actions.setViewMode("grid");

    expect(actions.getProjectCount()).toBe(2);
    expect(useProjectStore.getState().selectedProjectId).toBe("p1");
  });
});

// ============================================================================
// Integration: Loading and Error States
// ============================================================================

describe("Integration: Loading and Error States", () => {
  it("should handle loading -> success flow", () => {
    const { actions } = useProjectStore.getState();

    // Start loading
    actions.setLoading(true);
    expect(useProjectStore.getState().isLoading).toBe(true);

    // Receive data
    actions.setProjects([createProject(), createProject()]);
    actions.setLoading(false);

    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(actions.getProjectCount()).toBe(2);
  });

  it("should handle loading -> error flow", () => {
    const { actions } = useProjectStore.getState();

    // Start loading
    actions.setLoading(true);
    expect(useProjectStore.getState().isLoading).toBe(true);

    // Error occurs
    actions.setError("Failed to load projects");

    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBe("Failed to load projects");

    // Retry - clear error and load again
    actions.clearError();
    actions.setLoading(true);
    expect(useProjectStore.getState().error).toBeNull();
    expect(useProjectStore.getState().isLoading).toBe(true);

    // Success on retry
    actions.setProjects([createProject()]);
    actions.setLoading(false);

    expect(actions.getProjectCount()).toBe(1);
  });

  it("should preserve existing data during refresh", () => {
    const { actions } = useProjectStore.getState();

    // Initial load
    actions.setProjects([createProject({ id: "existing" })]);
    actions.selectProject("existing");

    // Refresh starts
    actions.setLoading(true);

    // Data still available during loading
    expect(actions.getProject("existing")).toBeDefined();
    expect(useProjectStore.getState().selectedProjectId).toBe("existing");

    // Refresh completes with updated data
    actions.setProjects([
      createProject({ id: "existing", name: "Updated Name" }),
      createProject({ id: "new-item" }),
    ]);
    actions.setLoading(false);

    expect(actions.getProject("existing")?.name).toBe("Updated Name");
    expect(actions.getProjectCount()).toBe(2);
  });
});

// ============================================================================
// Integration: Modal Workflows
// ============================================================================

describe("Integration: Modal Workflows", () => {
  it("should handle duplicate workflow", () => {
    const { actions } = useProjectStore.getState();

    // Setup
    actions.addProject(createProject({ id: "original", name: "Original Project" }));

    // Open duplicate modal
    actions.openDuplicateModal("original");
    expect(useProjectStore.getState().modals.duplicateProject).toBe("original");

    // Simulate duplication (API would return new project)
    const duplicate = createProject({
      id: "duplicate-1",
      name: "Original Project (Copy)",
    });
    actions.addProject(duplicate);
    actions.closeDuplicateModal();

    expect(actions.getProjectCount()).toBe(2);
    expect(actions.getProject("duplicate-1")?.name).toBe("Original Project (Copy)");
    expect(useProjectStore.getState().modals.duplicateProject).toBeNull();
  });

  it("should handle export workflow", () => {
    const { actions } = useProjectStore.getState();

    actions.addProject(createProject({ id: "to-export" }));

    // Open export modal
    actions.openExportModal("to-export");
    expect(useProjectStore.getState().modals.exportProject).toBe("to-export");

    // Close after export
    actions.closeExportModal();
    expect(useProjectStore.getState().modals.exportProject).toBeNull();

    // Project still exists
    expect(actions.getProject("to-export")).toBeDefined();
  });

  it("should cancel delete and preserve project", () => {
    const { actions } = useProjectStore.getState();

    actions.addProject(createProject({ id: "keep-me" }));

    // Open delete modal
    actions.openDeleteModal("keep-me");

    // User cancels
    actions.closeDeleteModal();

    // Project still exists
    expect(actions.getProject("keep-me")).toBeDefined();
    expect(actions.getProjectCount()).toBe(1);
  });
});

// ============================================================================
// Integration: Complex User Journey
// ============================================================================

describe("Integration: Complex User Journey", () => {
  it("should handle complete user session", () => {
    const { actions } = useProjectStore.getState();

    // User opens dashboard (empty)
    expect(actions.getProjectCount()).toBe(0);

    // Create first project
    actions.openCreateModal();
    actions.addProject(createProject({ id: "p1", name: "First Comic", settings: { template: "comic" } }));
    actions.closeCreateModal();

    // Create second project
    actions.openCreateModal();
    actions.addProject(createProject({ id: "p2", name: "Manga Story", settings: { template: "manga" } }));
    actions.closeCreateModal();

    // Create third project
    actions.addProject(createProject({ id: "p3", name: "Another Comic", settings: { template: "comic" } }));

    expect(actions.getProjectCount()).toBe(3);

    // Switch to list view
    actions.setViewMode("list");

    // Sort by name
    actions.setSort({ field: "name", direction: "asc" });
    let display = actions.getDisplayProjects();
    expect(display[0].name).toBe("Another Comic");

    // Filter by comic template
    actions.setFilters({ template: "comic" });
    display = actions.getDisplayProjects();
    expect(display.length).toBe(2);
    expect(display.every((p) => p.settings?.template === "comic")).toBe(true);

    // Select a project
    actions.selectProject("p1");
    expect(actions.isProjectSelected("p1")).toBe(true);

    // Duplicate selected project
    actions.openDuplicateModal("p1");
    actions.addProject(createProject({ id: "p4", name: "First Comic (Copy)", settings: { template: "comic" } }));
    actions.closeDuplicateModal();

    // Clear filters to see all
    actions.clearFilters();
    expect(actions.getProjectCount()).toBe(4);

    // Delete original
    actions.openDeleteModal("p1");
    actions.removeProject("p1");
    actions.closeDeleteModal();

    expect(actions.getProjectCount()).toBe(3);
    expect(useProjectStore.getState().selectedProjectId).toBeNull(); // Was deleted

    // Final state verification
    expect(actions.getProject("p1")).toBeUndefined();
    expect(actions.getProject("p2")).toBeDefined();
    expect(actions.getProject("p3")).toBeDefined();
    expect(actions.getProject("p4")).toBeDefined();
    expect(useProjectStore.getState().viewMode).toBe("list");
  });
});
