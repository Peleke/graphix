/**
 * Project Dashboard - Property-Based Tests
 *
 * Using property-based testing patterns to find edge cases
 * that example-based tests might miss.
 *
 * Property-based testing to verify invariants hold for all inputs.
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
// Property-Based Test Utilities
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
  return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join("");
}

function randomProject(): Project {
  const id = `project-${randomString(8)}`;
  return {
    id,
    name: randomString(randomInt(1, 50)),
    description: Math.random() > 0.3 ? randomString(randomInt(0, 100)) : null,
    settings: {
      template: ["comic", "manga", "webtoon", "blank"][randomInt(0, 3)],
      panelCount: randomInt(0, 100),
    },
    createdAt: new Date(Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000)).toISOString(),
    updatedAt: new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000)).toISOString(),
  };
}

function forAll<T>(
  generator: () => T,
  property: (value: T) => void,
  iterations: number = 50
): void {
  for (let i = 0; i < iterations; i++) {
    const value = generator();
    property(value);
  }
}

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

beforeEach(() => {
  resetStore();
});

// ============================================================================
// Property: Project Count Invariants
// ============================================================================

describe("Property: Project Count Invariants", () => {
  it("adding N projects results in exactly N projects", () => {
    forAll(
      () => randomInt(1, 30),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          actions.addProject(randomProject());
        }

        expect(actions.getProjectCount()).toBe(count);

        resetStore();
      }
    );
  });

  it("removing a project decreases count by exactly 1", () => {
    forAll(
      () => randomInt(2, 20),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        const projects: Project[] = [];
        for (let i = 0; i < count; i++) {
          const p = randomProject();
          projects.push(p);
          actions.addProject(p);
        }

        const beforeCount = actions.getProjectCount();
        const toRemove = projects[randomInt(0, projects.length - 1)];
        actions.removeProject(toRemove.id);

        expect(actions.getProjectCount()).toBe(beforeCount - 1);

        resetStore();
      }
    );
  });

  it("setProjects with N items results in exactly N projects", () => {
    forAll(
      () => randomInt(0, 50),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        const projects = Array.from({ length: count }, () => randomProject());
        actions.setProjects(projects);

        expect(actions.getProjectCount()).toBe(count);

        resetStore();
      }
    );
  });

  it("clearProjects always results in 0 projects", () => {
    forAll(
      () => randomInt(0, 30),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          actions.addProject(randomProject());
        }

        actions.clearProjects();
        expect(actions.getProjectCount()).toBe(0);

        resetStore();
      }
    );
  });
});

// ============================================================================
// Property: Filter Invariants
// ============================================================================

describe("Property: Filter Invariants", () => {
  it("filtered count is always <= total count", () => {
    forAll(
      () => ({
        count: randomInt(1, 30),
        searchLength: randomInt(0, 10),
      }),
      ({ count, searchLength }) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          actions.addProject(randomProject());
        }

        actions.setSearch(randomString(searchLength));

        expect(actions.getFilteredCount()).toBeLessThanOrEqual(actions.getProjectCount());

        resetStore();
      }
    );
  });

  it("empty search returns all projects", () => {
    forAll(
      () => randomInt(1, 20),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          actions.addProject(randomProject());
        }

        actions.setSearch("");
        expect(actions.getFilteredCount()).toBe(actions.getProjectCount());

        resetStore();
      }
    );
  });

  it("clearFilters restores full project list", () => {
    forAll(
      () => ({
        count: randomInt(1, 20),
        searchTerm: randomString(randomInt(1, 10)),
      }),
      ({ count, searchTerm }) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          actions.addProject(randomProject());
        }

        actions.setSearch(searchTerm);
        const filteredBefore = actions.getFilteredCount();

        actions.clearFilters();
        const filteredAfter = actions.getFilteredCount();

        expect(filteredAfter).toBeGreaterThanOrEqual(filteredBefore);
        expect(filteredAfter).toBe(count);

        resetStore();
      }
    );
  });
});

// ============================================================================
// Property: Sort Invariants
// ============================================================================

describe("Property: Sort Invariants", () => {
  it("sorting preserves project count", () => {
    forAll(
      () => ({
        count: randomInt(1, 30),
        field: (["name", "createdAt", "updatedAt"] as const)[randomInt(0, 2)],
        direction: (["asc", "desc"] as const)[randomInt(0, 1)],
      }),
      ({ count, field, direction }) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          actions.addProject(randomProject());
        }

        actions.setSort({ field, direction });
        const sorted = actions.getSortedProjects();

        expect(sorted.length).toBe(count);

        resetStore();
      }
    );
  });

  it("toggling sort direction twice returns to original direction", () => {
    forAll(
      () => (["asc", "desc"] as const)[randomInt(0, 1)],
      (initialDirection) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        actions.setSort({ direction: initialDirection });
        actions.toggleSortDirection();
        actions.toggleSortDirection();

        expect(useProjectStore.getState().sort.direction).toBe(initialDirection);

        resetStore();
      }
    );
  });

  it("sorting is idempotent (sorting twice gives same result)", () => {
    forAll(
      () => randomInt(1, 20),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          actions.addProject(randomProject());
        }

        actions.setSort({ field: "name", direction: "asc" });
        const sorted1 = actions.getSortedProjects();

        actions.setSort({ field: "name", direction: "asc" });
        const sorted2 = actions.getSortedProjects();

        expect(sorted1.map((p) => p.id)).toEqual(sorted2.map((p) => p.id));

        resetStore();
      }
    );
  });
});

// ============================================================================
// Property: Selection Invariants
// ============================================================================

describe("Property: Selection Invariants", () => {
  it("selecting a project sets selectedProjectId correctly", () => {
    forAll(
      () => randomInt(1, 20),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        const projects: Project[] = [];
        for (let i = 0; i < count; i++) {
          const p = randomProject();
          projects.push(p);
          actions.addProject(p);
        }

        const selected = projects[randomInt(0, projects.length - 1)];
        actions.selectProject(selected.id);

        expect(useProjectStore.getState().selectedProjectId).toBe(selected.id);
        expect(actions.isProjectSelected(selected.id)).toBe(true);

        resetStore();
      }
    );
  });

  it("only one project can be selected at a time", () => {
    forAll(
      () => randomInt(3, 15),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        const projects: Project[] = [];
        for (let i = 0; i < count; i++) {
          const p = randomProject();
          projects.push(p);
          actions.addProject(p);
        }

        // Select multiple projects randomly
        for (let i = 0; i < 5; i++) {
          const toSelect = projects[randomInt(0, projects.length - 1)];
          actions.selectProject(toSelect.id);
        }

        // Only one should be selected
        const selectedCount = projects.filter((p) => actions.isProjectSelected(p.id)).length;
        expect(selectedCount).toBeLessThanOrEqual(1);

        resetStore();
      }
    );
  });

  it("selecting null clears selection", () => {
    forAll(
      () => randomInt(1, 10),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < count; i++) {
          const p = randomProject();
          actions.addProject(p);
          actions.selectProject(p.id);
        }

        actions.selectProject(null);
        expect(useProjectStore.getState().selectedProjectId).toBeNull();

        resetStore();
      }
    );
  });
});

// ============================================================================
// Property: Pagination Invariants
// ============================================================================

describe("Property: Pagination Invariants", () => {
  it("page number is always >= 1", () => {
    forAll(
      () => randomInt(-100, 100),
      (targetPage) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        actions.setPagination({ total: 100, limit: 10 });
        actions.goToPage(targetPage);

        expect(useProjectStore.getState().pagination.page).toBeGreaterThanOrEqual(1);

        resetStore();
      }
    );
  });

  it("page number never exceeds max pages", () => {
    forAll(
      () => ({
        total: randomInt(1, 200),
        limit: randomInt(1, 50),
        targetPage: randomInt(1, 100),
      }),
      ({ total, limit, targetPage }) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        actions.setPagination({ total, limit });
        actions.goToPage(targetPage);

        const maxPage = Math.ceil(total / limit) || 1;
        expect(useProjectStore.getState().pagination.page).toBeLessThanOrEqual(maxPage);

        resetStore();
      }
    );
  });

  it("nextPage increases page by at most 1", () => {
    forAll(
      () => ({
        startPage: randomInt(1, 10),
        hasMore: Math.random() > 0.5,
      }),
      ({ startPage, hasMore }) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        actions.setPagination({ page: startPage, hasMore });
        actions.nextPage();

        const newPage = useProjectStore.getState().pagination.page;
        expect(newPage - startPage).toBeLessThanOrEqual(1);

        resetStore();
      }
    );
  });

  it("prevPage decreases page by at most 1", () => {
    forAll(
      () => randomInt(1, 20),
      (startPage) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        actions.setPagination({ page: startPage });
        actions.prevPage();

        const newPage = useProjectStore.getState().pagination.page;
        expect(startPage - newPage).toBeLessThanOrEqual(1);

        resetStore();
      }
    );
  });
});

// ============================================================================
// Property: Modal Invariants
// ============================================================================

describe("Property: Modal Invariants", () => {
  it("closeAllModals always results in all modals closed", () => {
    forAll(
      () => ({
        openCreate: Math.random() > 0.5,
        deleteId: Math.random() > 0.5 ? randomString(8) : null,
        duplicateId: Math.random() > 0.5 ? randomString(8) : null,
        exportId: Math.random() > 0.5 ? randomString(8) : null,
      }),
      ({ openCreate, deleteId, duplicateId, exportId }) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        if (openCreate) actions.openCreateModal();
        if (deleteId) actions.openDeleteModal(deleteId);
        if (duplicateId) actions.openDuplicateModal(duplicateId);
        if (exportId) actions.openExportModal(exportId);

        actions.closeAllModals();

        expect(actions.isAnyModalOpen()).toBe(false);

        resetStore();
      }
    );
  });

  it("isAnyModalOpen correctly reflects modal state", () => {
    forAll(
      () => ({
        openCreate: Math.random() > 0.5,
        deleteId: Math.random() > 0.5 ? randomString(8) : null,
      }),
      ({ openCreate, deleteId }) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        if (openCreate) actions.openCreateModal();
        if (deleteId) actions.openDeleteModal(deleteId);

        const anyOpen = actions.isAnyModalOpen();
        const shouldBeOpen = openCreate || deleteId !== null;

        expect(anyOpen).toBe(shouldBeOpen);

        resetStore();
      }
    );
  });
});

// ============================================================================
// Property: Data Integrity Invariants
// ============================================================================

describe("Property: Data Integrity Invariants", () => {
  it("projectIds always matches projects map keys", () => {
    forAll(
      () => randomInt(0, 30),
      (operations) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        for (let i = 0; i < operations; i++) {
          const op = randomInt(0, 2);
          if (op === 0) {
            // Add
            actions.addProject(randomProject());
          } else if (op === 1 && actions.getProjectCount() > 0) {
            // Remove random
            const ids = useProjectStore.getState().projectIds;
            if (ids.length > 0) {
              actions.removeProject(ids[randomInt(0, ids.length - 1)]);
            }
          } else {
            // Set
            const newProjects = Array.from(
              { length: randomInt(0, 10) },
              () => randomProject()
            );
            actions.setProjects(newProjects);
          }
        }

        const state = useProjectStore.getState();
        const mapKeys = Array.from(state.projects.keys()).sort();
        const ids = [...state.projectIds].sort();

        expect(mapKeys).toEqual(ids);

        resetStore();
      }
    );
  });

  it("getProject returns correct project for any ID in store", () => {
    forAll(
      () => randomInt(1, 20),
      (count) => {
        resetStore();
        const { actions } = useProjectStore.getState();

        const projects: Project[] = [];
        for (let i = 0; i < count; i++) {
          const p = randomProject();
          projects.push(p);
          actions.addProject(p);
        }

        for (const p of projects) {
          const retrieved = actions.getProject(p.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(p.id);
        }

        resetStore();
      }
    );
  });
});
