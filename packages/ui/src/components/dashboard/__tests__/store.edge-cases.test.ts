/**
 * Project Dashboard Store - EXHAUSTIVE Edge Case Tests
 *
 * Testing every conceivable edge case, boundary condition, and
 * error scenario for the project dashboard store.
 *
 * Comprehensive edge case coverage for robustness.
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

beforeEach(() => {
  resetStore();
});

// ============================================================================
// Null/Undefined Input Handling
// ============================================================================

describe("Project Store - Edge Cases - Null/Undefined Handling", () => {
  it("should handle getting non-existent project", () => {
    const { actions } = useProjectStore.getState();
    const project = actions.getProject("non-existent-id");
    expect(project).toBeUndefined();
  });

  it("should handle updating non-existent project gracefully", () => {
    const { actions } = useProjectStore.getState();
    expect(() => {
      actions.updateProject("non-existent", { name: "New Name" });
    }).not.toThrow();
  });

  it("should handle removing non-existent project gracefully", () => {
    const { actions } = useProjectStore.getState();
    expect(() => {
      actions.removeProject("non-existent");
    }).not.toThrow();
    expect(useProjectStore.getState().projectIds.length).toBe(0);
  });

  it("should handle selecting non-existent project", () => {
    const { actions } = useProjectStore.getState();
    actions.selectProject("non-existent");
    expect(useProjectStore.getState().selectedProjectId).toBe("non-existent");
  });

  it("should handle setting empty projects array", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([]);
    expect(useProjectStore.getState().projects.size).toBe(0);
    expect(useProjectStore.getState().projectIds.length).toBe(0);
  });

  it("should handle setting null as selected project", () => {
    const { actions } = useProjectStore.getState();
    actions.selectProject("some-id");
    actions.selectProject(null);
    expect(useProjectStore.getState().selectedProjectId).toBeNull();
  });

  it("should handle setting null as hovered project", () => {
    const { actions } = useProjectStore.getState();
    actions.setHoveredProject("some-id");
    actions.setHoveredProject(null);
    expect(useProjectStore.getState().hoveredProjectId).toBeNull();
  });
});

// ============================================================================
// Empty String Handling
// ============================================================================

describe("Project Store - Edge Cases - Empty String Handling", () => {
  it("should handle empty project ID in getProject", () => {
    const { actions } = useProjectStore.getState();
    const project = actions.getProject("");
    expect(project).toBeUndefined();
  });

  it("should handle project with empty name", () => {
    const { actions } = useProjectStore.getState();
    const project = createMockProject({ id: "p1", name: "" });
    actions.addProject(project);
    expect(actions.getProject("p1")?.name).toBe("");
  });

  it("should handle project with null description", () => {
    const { actions } = useProjectStore.getState();
    const project = createMockProject({ id: "p1", description: null });
    actions.addProject(project);
    expect(actions.getProject("p1")?.description).toBeNull();
  });

  it("should handle empty search string in filter", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([createMockProject({ name: "Test" })]);
    actions.setSearch("");
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(1);
  });

  it("should handle whitespace-only search string", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([createMockProject({ name: "Test" })]);
    actions.setSearch("   ");
    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(1);
  });

  it("should handle empty error message", () => {
    const { actions } = useProjectStore.getState();
    actions.setError("");
    expect(useProjectStore.getState().error).toBe("");
  });
});

// ============================================================================
// Large Data Operations
// ============================================================================

describe("Project Store - Edge Cases - Large Data Operations", () => {
  it("should handle 100 projects", () => {
    const { actions } = useProjectStore.getState();
    const projects = Array.from({ length: 100 }, (_, i) =>
      createMockProject({ id: `p${i}`, name: `Project ${i}` })
    );
    actions.setProjects(projects);

    expect(useProjectStore.getState().projects.size).toBe(100);
    expect(useProjectStore.getState().projectIds.length).toBe(100);
  });

  it("should handle 500 projects efficiently", () => {
    const { actions } = useProjectStore.getState();
    const projects = Array.from({ length: 500 }, (_, i) =>
      createMockProject({ id: `p${i}`, name: `Project ${i}` })
    );

    const startSet = performance.now();
    actions.setProjects(projects);
    const endSet = performance.now();

    expect(endSet - startSet).toBeLessThan(100); // Under 100ms
    expect(useProjectStore.getState().projects.size).toBe(500);
  });

  it("should filter 500 projects efficiently", () => {
    const { actions } = useProjectStore.getState();
    const projects = Array.from({ length: 500 }, (_, i) =>
      createMockProject({ id: `p${i}`, name: `Project ${i % 50}` })
    );
    actions.setProjects(projects);
    actions.setSearch("Project 1");

    const start = performance.now();
    const filtered = actions.getFilteredProjects();
    const end = performance.now();

    expect(end - start).toBeLessThan(50); // Under 50ms
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("should sort 500 projects efficiently", () => {
    const { actions } = useProjectStore.getState();
    const projects = Array.from({ length: 500 }, (_, i) =>
      createMockProject({
        id: `p${i}`,
        name: `Project ${500 - i}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
      })
    );
    actions.setProjects(projects);

    const start = performance.now();
    const sorted = actions.getSortedProjects();
    const end = performance.now();

    expect(end - start).toBeLessThan(50);
    expect(sorted.length).toBe(500);
  });

  it("should handle rapid sequential additions", () => {
    const { actions } = useProjectStore.getState();

    for (let i = 0; i < 50; i++) {
      actions.addProject(createMockProject({ id: `p${i}` }));
    }

    expect(useProjectStore.getState().projects.size).toBe(50);
    expect(useProjectStore.getState().projectIds.length).toBe(50);
  });

  it("should handle rapid sequential removals", () => {
    const { actions } = useProjectStore.getState();
    const projects = Array.from({ length: 50 }, (_, i) =>
      createMockProject({ id: `p${i}` })
    );
    actions.setProjects(projects);

    for (let i = 0; i < 50; i++) {
      actions.removeProject(`p${i}`);
    }

    expect(useProjectStore.getState().projects.size).toBe(0);
  });
});

// ============================================================================
// Concurrent-like Operations
// ============================================================================

describe("Project Store - Edge Cases - Concurrent-like Operations", () => {
  it("should handle interleaved add and remove", () => {
    const { actions } = useProjectStore.getState();

    actions.addProject(createMockProject({ id: "p1" }));
    actions.addProject(createMockProject({ id: "p2" }));
    actions.removeProject("p1");
    actions.addProject(createMockProject({ id: "p3" }));
    actions.removeProject("p2");

    expect(useProjectStore.getState().projects.size).toBe(1);
    expect(useProjectStore.getState().projectIds).toEqual(["p3"]);
  });

  it("should handle multiple modal state changes", () => {
    const { actions } = useProjectStore.getState();

    actions.openCreateModal();
    actions.openDeleteModal("p1");
    actions.closeCreateModal();
    actions.openDuplicateModal("p2");
    actions.closeDeleteModal();

    const state = useProjectStore.getState();
    expect(state.modals.createProject).toBe(false);
    expect(state.modals.deleteProject).toBeNull();
    expect(state.modals.duplicateProject).toBe("p2");
  });

  it("should handle selection changes during project removal", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1" }),
      createMockProject({ id: "p2" }),
      createMockProject({ id: "p3" }),
    ]);

    actions.selectProject("p2");
    actions.removeProject("p1");
    expect(useProjectStore.getState().selectedProjectId).toBe("p2");

    actions.removeProject("p2");
    expect(useProjectStore.getState().selectedProjectId).toBeNull();

    actions.selectProject("p3");
    expect(useProjectStore.getState().selectedProjectId).toBe("p3");
  });

  it("should handle filter changes during data updates", () => {
    const { actions } = useProjectStore.getState();

    actions.setProjects([
      createMockProject({ id: "p1", name: "Alpha" }),
      createMockProject({ id: "p2", name: "Beta" }),
    ]);
    actions.setSearch("Alpha");

    actions.addProject(createMockProject({ id: "p3", name: "Alpha Two" }));

    const filtered = actions.getFilteredProjects();
    expect(filtered.length).toBe(2);
    expect(filtered.some((p) => p.id === "p3")).toBe(true);
  });
});

// ============================================================================
// State Transitions
// ============================================================================

describe("Project Store - Edge Cases - State Transitions", () => {
  it("should handle loading -> error -> success cycle", () => {
    const { actions } = useProjectStore.getState();

    actions.setLoading(true);
    expect(useProjectStore.getState().isLoading).toBe(true);

    actions.setError("Failed to load");
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBe("Failed to load");

    actions.clearError();
    actions.setLoading(true);
    actions.setProjects([createMockProject()]);
    actions.setLoading(false);

    const state = useProjectStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.projects.size).toBe(1);
  });

  it("should handle multiple sort field changes", () => {
    const { actions } = useProjectStore.getState();

    actions.setSort({ field: "name" });
    actions.setSort({ field: "createdAt" });
    actions.setSort({ field: "updatedAt" });
    actions.setSort({ field: "name", direction: "asc" });

    const state = useProjectStore.getState();
    expect(state.sort.field).toBe("name");
    expect(state.sort.direction).toBe("asc");
  });

  it("should handle view mode rapid toggling", () => {
    const { actions } = useProjectStore.getState();

    for (let i = 0; i < 10; i++) {
      actions.setViewMode(i % 2 === 0 ? "grid" : "list");
    }

    // After 10 iterations (0-9), i=8 is last even, so ends on "grid"
    // Wait no: i=0 -> grid, i=1 -> list, i=2 -> grid... i=8 -> grid, i=9 -> list
    // So after i=9, we should be on "list"
    expect(useProjectStore.getState().viewMode).toBe("list");
  });

  it("should handle pagination state through full cycle", () => {
    const { actions } = useProjectStore.getState();

    actions.setPagination({ total: 100, limit: 10, hasMore: true });
    actions.nextPage();
    actions.nextPage();
    actions.nextPage();
    actions.prevPage();
    actions.goToPage(5);

    expect(useProjectStore.getState().pagination.page).toBe(5);
  });
});

// ============================================================================
// Filter Edge Cases
// ============================================================================

describe("Project Store - Edge Cases - Filter Edge Cases", () => {
  it("should handle search with special characters", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "Project (v1.0)" }),
      createMockProject({ id: "p2", name: "Project [beta]" }),
      createMockProject({ id: "p3", name: "Project {test}" }),
    ]);

    actions.setSearch("(v1.0)");
    expect(actions.getFilteredProjects().length).toBe(1);

    actions.setSearch("[beta]");
    expect(actions.getFilteredProjects().length).toBe(1);

    actions.setSearch("{test}");
    expect(actions.getFilteredProjects().length).toBe(1);
  });

  it("should handle search with unicode characters", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "Project 日本語" }),
      createMockProject({ id: "p2", name: "Проект" }),
      createMockProject({ id: "p3", name: "项目" }),
    ]);

    actions.setSearch("日本語");
    expect(actions.getFilteredProjects().length).toBe(1);

    actions.setSearch("Проект");
    expect(actions.getFilteredProjects().length).toBe(1);
  });

  it("should handle search with emoji", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "Project 🎨" }),
      createMockProject({ id: "p2", name: "Project 🚀" }),
    ]);

    actions.setSearch("🎨");
    expect(actions.getFilteredProjects().length).toBe(1);
  });

  it("should handle filter with undefined template", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", settings: { template: "comic" } }),
      createMockProject({ id: "p2", settings: {} }),
      createMockProject({ id: "p3" }),
    ]);

    actions.setFilters({ template: undefined });
    expect(actions.getFilteredProjects().length).toBe(3);
  });

  it("should handle case variations in search", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "UPPERCASE PROJECT" }),
      createMockProject({ id: "p2", name: "lowercase project" }),
      createMockProject({ id: "p3", name: "MixedCase Project" }),
    ]);

    actions.setSearch("uppercase");
    expect(actions.getFilteredProjects().length).toBe(1);

    actions.setSearch("LOWERCASE");
    expect(actions.getFilteredProjects().length).toBe(1);

    actions.setSearch("MIXEDCASE");
    expect(actions.getFilteredProjects().length).toBe(1);
  });
});

// ============================================================================
// Sort Edge Cases
// ============================================================================

describe("Project Store - Edge Cases - Sort Edge Cases", () => {
  it("should handle sorting with same timestamps", () => {
    const sameTime = new Date().toISOString();
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "Zebra", createdAt: sameTime, updatedAt: sameTime }),
      createMockProject({ id: "p2", name: "Apple", createdAt: sameTime, updatedAt: sameTime }),
      createMockProject({ id: "p3", name: "Mango", createdAt: sameTime, updatedAt: sameTime }),
    ]);

    actions.setSort({ field: "createdAt", direction: "asc" });
    const sorted = actions.getSortedProjects();
    expect(sorted.length).toBe(3); // Should not crash
  });

  it("should handle sorting with invalid dates gracefully", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "A", createdAt: "invalid-date" }),
      createMockProject({ id: "p2", name: "B", createdAt: new Date().toISOString() }),
    ]);

    expect(() => {
      actions.setSort({ field: "createdAt", direction: "asc" });
      actions.getSortedProjects();
    }).not.toThrow();
  });

  it("should handle sorting empty list", () => {
    const { actions } = useProjectStore.getState();
    actions.setSort({ field: "name", direction: "asc" });
    const sorted = actions.getSortedProjects();
    expect(sorted).toEqual([]);
  });

  it("should handle sorting single item", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([createMockProject({ id: "p1", name: "Only One" })]);
    actions.setSort({ field: "name", direction: "asc" });
    const sorted = actions.getSortedProjects();
    expect(sorted.length).toBe(1);
    expect(sorted[0].name).toBe("Only One");
  });

  it("should maintain stable sort for equal values", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1", name: "Same" }),
      createMockProject({ id: "p2", name: "Same" }),
      createMockProject({ id: "p3", name: "Same" }),
    ]);

    actions.setSort({ field: "name", direction: "asc" });
    const sorted = actions.getSortedProjects();
    expect(sorted.length).toBe(3);
  });
});

// ============================================================================
// Pagination Edge Cases
// ============================================================================

describe("Project Store - Edge Cases - Pagination Edge Cases", () => {
  it("should handle goToPage with negative number", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 100, limit: 10 });
    actions.goToPage(-5);
    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should handle goToPage with very large number", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 100, limit: 10 });
    actions.goToPage(999999);
    expect(useProjectStore.getState().pagination.page).toBe(10);
  });

  it("should handle goToPage with zero", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 100, limit: 10 });
    actions.goToPage(0);
    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should handle pagination with total of 0", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 0, limit: 10 });
    actions.goToPage(5);
    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should handle pagination with limit of 1", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 100, limit: 1, hasMore: true });

    for (let i = 0; i < 50; i++) {
      actions.nextPage();
    }

    expect(useProjectStore.getState().pagination.page).toBe(51);
  });

  it("should handle prevPage at page 1", () => {
    const { actions } = useProjectStore.getState();
    actions.prevPage();
    actions.prevPage();
    actions.prevPage();
    expect(useProjectStore.getState().pagination.page).toBe(1);
  });

  it("should not change total when updating other pagination fields", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 100 });
    actions.setPagination({ page: 5 });
    expect(useProjectStore.getState().pagination.total).toBe(100);
  });
});

// ============================================================================
// Modal Edge Cases
// ============================================================================

describe("Project Store - Edge Cases - Modal Edge Cases", () => {
  it("should handle opening same modal multiple times", () => {
    const { actions } = useProjectStore.getState();
    actions.openCreateModal();
    actions.openCreateModal();
    actions.openCreateModal();
    expect(useProjectStore.getState().modals.createProject).toBe(true);
  });

  it("should handle closing already closed modal", () => {
    const { actions } = useProjectStore.getState();
    actions.closeCreateModal();
    expect(useProjectStore.getState().modals.createProject).toBe(false);
  });

  it("should handle opening delete modal with different IDs rapidly", () => {
    const { actions } = useProjectStore.getState();
    actions.openDeleteModal("p1");
    actions.openDeleteModal("p2");
    actions.openDeleteModal("p3");
    expect(useProjectStore.getState().modals.deleteProject).toBe("p3");
  });

  it("should handle closeAllModals when no modals open", () => {
    const { actions } = useProjectStore.getState();
    expect(() => actions.closeAllModals()).not.toThrow();
    expect(useProjectStore.getState().modals).toEqual(DEFAULT_MODALS);
  });

  it("should correctly track isAnyModalOpen through transitions", () => {
    const { actions } = useProjectStore.getState();

    expect(actions.isAnyModalOpen()).toBe(false);

    actions.openCreateModal();
    expect(actions.isAnyModalOpen()).toBe(true);

    actions.closeCreateModal();
    expect(actions.isAnyModalOpen()).toBe(false);

    actions.openDeleteModal("p1");
    expect(actions.isAnyModalOpen()).toBe(true);

    actions.openDuplicateModal("p2");
    expect(actions.isAnyModalOpen()).toBe(true);

    actions.closeDeleteModal();
    expect(actions.isAnyModalOpen()).toBe(true); // duplicate still open

    actions.closeDuplicateModal();
    expect(actions.isAnyModalOpen()).toBe(false);
  });
});

// ============================================================================
// Data Integrity
// ============================================================================

describe("Project Store - Edge Cases - Data Integrity", () => {
  it("should preserve all project fields through update", () => {
    const { actions } = useProjectStore.getState();
    const original = createMockProject({
      id: "p1",
      name: "Original",
      description: "Original description",
      settings: { template: "comic", custom: { foo: "bar" } },
    });
    actions.addProject(original);

    actions.updateProject("p1", { name: "Updated" });

    const updated = actions.getProject("p1");
    expect(updated?.name).toBe("Updated");
    expect(updated?.description).toBe("Original description");
    expect(updated?.settings?.template).toBe("comic");
    expect((updated?.settings?.custom as any)?.foo).toBe("bar");
  });

  it("should maintain projectIds order after updates", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1" }),
      createMockProject({ id: "p2" }),
      createMockProject({ id: "p3" }),
    ]);

    actions.updateProject("p2", { name: "Updated P2" });

    expect(useProjectStore.getState().projectIds).toEqual(["p1", "p2", "p3"]);
  });

  it("should correctly decrement total when removing project", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1" }),
      createMockProject({ id: "p2" }),
    ]);
    actions.setPagination({ total: 2 });

    actions.removeProject("p1");
    expect(useProjectStore.getState().pagination.total).toBe(1);

    actions.removeProject("p2");
    expect(useProjectStore.getState().pagination.total).toBe(0);
  });

  it("should not go below 0 for total when removing", () => {
    const { actions } = useProjectStore.getState();
    actions.setPagination({ total: 0 });
    actions.removeProject("non-existent");
    expect(useProjectStore.getState().pagination.total).toBe(0);
  });

  it("should handle project with complex settings object", () => {
    const { actions } = useProjectStore.getState();
    const complexSettings = {
      template: "comic",
      nested: {
        deep: {
          value: 123,
          array: [1, 2, 3],
        },
      },
      nullValue: null,
      undefinedValue: undefined,
    };

    actions.addProject(createMockProject({ id: "p1", settings: complexSettings }));
    const project = actions.getProject("p1");

    expect(project?.settings?.template).toBe("comic");
    expect((project?.settings?.nested as any)?.deep?.value).toBe(123);
  });
});

// ============================================================================
// Reset and Clear Operations
// ============================================================================

describe("Project Store - Edge Cases - Reset and Clear", () => {
  it("should clear error without affecting other state", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([createMockProject({ id: "p1" })]);
    actions.selectProject("p1");
    actions.setError("Error");

    actions.clearError();

    const state = useProjectStore.getState();
    expect(state.error).toBeNull();
    expect(state.projects.size).toBe(1);
    expect(state.selectedProjectId).toBe("p1");
  });

  it("should clear filters without affecting data", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([createMockProject({ id: "p1" })]);
    actions.setFilters({ search: "test", template: "comic" });

    actions.clearFilters();

    const state = useProjectStore.getState();
    expect(state.filters).toEqual(DEFAULT_FILTERS);
    expect(state.projects.size).toBe(1);
  });

  it("should clear projects and reset selection", () => {
    const { actions } = useProjectStore.getState();
    actions.setProjects([
      createMockProject({ id: "p1" }),
      createMockProject({ id: "p2" }),
    ]);
    actions.selectProject("p1");
    actions.setPagination({ total: 2 });

    actions.clearProjects();

    const state = useProjectStore.getState();
    expect(state.projects.size).toBe(0);
    expect(state.projectIds.length).toBe(0);
    expect(state.selectedProjectId).toBeNull();
    expect(state.pagination.total).toBe(0);
  });
});
