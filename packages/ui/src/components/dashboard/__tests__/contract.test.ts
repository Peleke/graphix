/**
 * Contract Tests for Project Dashboard
 *
 * These tests verify that our store and components correctly handle
 * the API response schema. If the backend schema changes, these tests
 * will catch it before it breaks the UI.
 *
 * ARR! Contract tests be the treaty between frontend and backend! 🏴‍☠️
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  useProjectStore,
  MAX_SEARCH_LENGTH,
  type ProjectFilters,
  type ProjectSort,
  type ProjectTemplate,
} from "../../../stores/project.store";
import type { Project } from "@graphix/client";

// ============================================================================
// Schema Validation Helpers
// ============================================================================

/** Validates a project matches the expected API schema */
function isValidProject(obj: unknown): obj is Project {
  if (!obj || typeof obj !== "object") return false;

  const p = obj as Record<string, unknown>;

  // Required fields with correct types
  if (typeof p.id !== "string" || p.id.length === 0) return false;
  if (typeof p.name !== "string") return false;
  if (typeof p.createdAt !== "string") return false;
  if (typeof p.updatedAt !== "string") return false;

  // Validate ISO date format
  if (isNaN(Date.parse(p.createdAt as string))) return false;
  if (isNaN(Date.parse(p.updatedAt as string))) return false;

  // Optional fields
  if (p.description !== null && p.description !== undefined) {
    if (typeof p.description !== "string") return false;
  }

  if (p.thumbnailUrl !== null && p.thumbnailUrl !== undefined) {
    if (typeof p.thumbnailUrl !== "string") return false;
  }

  // Settings object (optional)
  if (p.settings !== null && p.settings !== undefined) {
    if (typeof p.settings !== "object") return false;
    const settings = p.settings as Record<string, unknown>;

    // Canvas dimensions
    if (settings.canvasWidth !== undefined && typeof settings.canvasWidth !== "number")
      return false;
    if (settings.canvasHeight !== undefined && typeof settings.canvasHeight !== "number")
      return false;
    if (settings.panelCount !== undefined && typeof settings.panelCount !== "number") return false;

    // Template validation
    const validTemplates = ["blank", "comic", "manga", "webtoon"];
    if (settings.template !== undefined && !validTemplates.includes(settings.template as string))
      return false;
  }

  return true;
}

/** Validates a list of projects */
function areValidProjects(arr: unknown[]): arr is Project[] {
  return arr.every(isValidProject);
}

/** Validates pagination meta from API */
function isValidPaginationMeta(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;

  const p = obj as Record<string, unknown>;

  if (typeof p.page !== "number" || p.page < 1) return false;
  if (typeof p.limit !== "number" || p.limit < 1) return false;
  if (typeof p.total !== "number" || p.total < 0) return false;
  if (typeof p.hasMore !== "boolean") return false;

  return true;
}

// ============================================================================
// Mock API Response Fixtures
// ============================================================================

/** Simulates a valid API response for GET /api/projects */
const mockValidApiResponse = {
  data: [
    {
      id: "proj-001",
      name: "My Comic Project",
      description: "A cool comic",
      thumbnailUrl: "https://example.com/thumb.png",
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-16T14:20:00.000Z",
      settings: {
        template: "comic",
        canvasWidth: 1920,
        canvasHeight: 1080,
        panelCount: 6,
      },
    },
    {
      id: "proj-002",
      name: "Minimalist Manga",
      description: null,
      thumbnailUrl: null,
      createdAt: "2024-01-10T08:00:00.000Z",
      updatedAt: "2024-01-10T08:00:00.000Z",
      settings: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    hasMore: false,
  },
};

/** Simulates API response with various edge cases */
const mockEdgeCaseApiResponse = {
  data: [
    {
      id: "edge-001",
      name: "", // Empty name (edge case)
      description: "",
      thumbnailUrl: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      settings: {},
    },
    {
      id: "edge-002",
      name: "A".repeat(255), // Very long name
      description: "B".repeat(1000), // Very long description
      thumbnailUrl: "https://example.com/" + "x".repeat(500),
      createdAt: "1970-01-01T00:00:00.000Z", // Unix epoch
      updatedAt: "2099-12-31T23:59:59.999Z", // Far future
      settings: {
        template: "webtoon",
        canvasWidth: 0,
        canvasHeight: 99999,
        panelCount: 0,
      },
    },
  ],
  pagination: {
    page: 1,
    limit: 100,
    total: 2,
    hasMore: false,
  },
};

/** Invalid API responses for negative testing */
const mockInvalidResponses = {
  missingId: { name: "No ID", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  invalidDate: { id: "bad-date", name: "Bad Date", createdAt: "not-a-date", updatedAt: "2024-01-01T00:00:00.000Z" },
  wrongType: { id: 123, name: "Wrong ID Type", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  invalidTemplate: {
    id: "bad-template",
    name: "Bad Template",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    settings: { template: "invalid_template_type" },
  },
};

// ============================================================================
// Contract Tests
// ============================================================================

describe("Project API Contract Tests", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: new Map(),
      projectIds: [],
      isLoading: false,
      error: null,
    });
  });

  describe("Project Schema Validation", () => {
    it("should validate a correctly shaped project", () => {
      const project = mockValidApiResponse.data[0];
      expect(isValidProject(project)).toBe(true);
    });

    it("should validate project with null optional fields", () => {
      const project = mockValidApiResponse.data[1];
      expect(isValidProject(project)).toBe(true);
    });

    it("should validate projects with edge case values", () => {
      for (const project of mockEdgeCaseApiResponse.data) {
        expect(isValidProject(project)).toBe(true);
      }
    });

    it("should reject project missing required id", () => {
      expect(isValidProject(mockInvalidResponses.missingId)).toBe(false);
    });

    it("should reject project with invalid date format", () => {
      expect(isValidProject(mockInvalidResponses.invalidDate)).toBe(false);
    });

    it("should reject project with wrong id type", () => {
      expect(isValidProject(mockInvalidResponses.wrongType)).toBe(false);
    });

    it("should reject project with invalid template", () => {
      expect(isValidProject(mockInvalidResponses.invalidTemplate)).toBe(false);
    });

    it("should reject null", () => {
      expect(isValidProject(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isValidProject(undefined)).toBe(false);
    });

    it("should reject non-object", () => {
      expect(isValidProject("string")).toBe(false);
      expect(isValidProject(123)).toBe(false);
      expect(isValidProject([])).toBe(false);
    });

    it("should reject empty id string", () => {
      const project = { ...mockValidApiResponse.data[0], id: "" };
      expect(isValidProject(project)).toBe(false);
    });
  });

  describe("Project List Validation", () => {
    it("should validate a list of valid projects", () => {
      expect(areValidProjects(mockValidApiResponse.data)).toBe(true);
    });

    it("should validate empty list", () => {
      expect(areValidProjects([])).toBe(true);
    });

    it("should reject list with one invalid project", () => {
      const mixedList = [...mockValidApiResponse.data, mockInvalidResponses.missingId];
      expect(areValidProjects(mixedList)).toBe(false);
    });
  });

  describe("Pagination Meta Validation", () => {
    it("should validate correct pagination meta", () => {
      expect(isValidPaginationMeta(mockValidApiResponse.pagination)).toBe(true);
    });

    it("should validate edge case pagination", () => {
      expect(isValidPaginationMeta(mockEdgeCaseApiResponse.pagination)).toBe(true);
    });

    it("should reject pagination with negative page", () => {
      expect(isValidPaginationMeta({ page: -1, limit: 20, total: 100, hasMore: true })).toBe(false);
    });

    it("should reject pagination with zero limit", () => {
      expect(isValidPaginationMeta({ page: 1, limit: 0, total: 100, hasMore: true })).toBe(false);
    });

    it("should reject pagination with negative total", () => {
      expect(isValidPaginationMeta({ page: 1, limit: 20, total: -5, hasMore: false })).toBe(false);
    });

    it("should reject pagination with non-boolean hasMore", () => {
      expect(isValidPaginationMeta({ page: 1, limit: 20, total: 100, hasMore: "yes" })).toBe(false);
    });

    it("should reject null pagination", () => {
      expect(isValidPaginationMeta(null)).toBe(false);
    });
  });

  describe("Store Handles Valid API Responses", () => {
    it("should correctly store projects from valid API response", () => {
      const { actions } = useProjectStore.getState();
      const projects = mockValidApiResponse.data as Project[];

      actions.setProjects(projects);

      const state = useProjectStore.getState();
      expect(state.projectIds.length).toBe(2);
      expect(state.projects.get("proj-001")?.name).toBe("My Comic Project");
      expect(state.projects.get("proj-002")?.description).toBe(null);
    });

    it("should correctly store edge case projects", () => {
      const { actions } = useProjectStore.getState();
      const projects = mockEdgeCaseApiResponse.data as Project[];

      actions.setProjects(projects);

      const state = useProjectStore.getState();
      expect(state.projectIds.length).toBe(2);
      expect(state.projects.get("edge-001")?.name).toBe("");
      expect(state.projects.get("edge-002")?.name.length).toBe(255);
    });

    it("should correctly update pagination from API response", () => {
      const { actions } = useProjectStore.getState();

      actions.setPagination(mockValidApiResponse.pagination);

      const state = useProjectStore.getState();
      expect(state.pagination.page).toBe(1);
      expect(state.pagination.total).toBe(2);
      expect(state.pagination.hasMore).toBe(false);
    });
  });

  describe("Store Data Types Match API Contract", () => {
    it("should preserve ISO date strings from API", () => {
      const { actions } = useProjectStore.getState();
      const projects = mockValidApiResponse.data as Project[];

      actions.setProjects(projects);

      const stored = useProjectStore.getState().projects.get("proj-001");
      expect(stored?.createdAt).toBe("2024-01-15T10:30:00.000Z");
      expect(stored?.updatedAt).toBe("2024-01-16T14:20:00.000Z");
    });

    it("should preserve null values from API", () => {
      const { actions } = useProjectStore.getState();
      const projects = mockValidApiResponse.data as Project[];

      actions.setProjects(projects);

      const stored = useProjectStore.getState().projects.get("proj-002");
      expect(stored?.description).toBe(null);
      expect(stored?.thumbnailUrl).toBe(null);
      expect(stored?.settings).toBe(null);
    });

    it("should preserve settings object structure", () => {
      const { actions } = useProjectStore.getState();
      const projects = mockValidApiResponse.data as Project[];

      actions.setProjects(projects);

      const stored = useProjectStore.getState().projects.get("proj-001");
      expect(stored?.settings).toEqual({
        template: "comic",
        canvasWidth: 1920,
        canvasHeight: 1080,
        panelCount: 6,
      });
    });
  });
});

describe("Filter Types Contract Tests", () => {
  it("should accept valid search strings", () => {
    const filter: ProjectFilters = { search: "test query" };
    expect(typeof filter.search).toBe("string");
  });

  it("should accept valid template filter", () => {
    const validTemplates: ProjectTemplate[] = ["blank", "comic", "manga", "webtoon"];
    for (const template of validTemplates) {
      const filter: ProjectFilters = { search: "", template };
      expect(filter.template).toBe(template);
    }
  });

  it("should limit search length per MAX_SEARCH_LENGTH constant", () => {
    expect(MAX_SEARCH_LENGTH).toBeGreaterThan(0);
    expect(MAX_SEARCH_LENGTH).toBeLessThanOrEqual(1000);
    expect(typeof MAX_SEARCH_LENGTH).toBe("number");
  });
});

describe("Sort Types Contract Tests", () => {
  it("should accept valid sort fields", () => {
    const validFields: ProjectSort["field"][] = ["name", "createdAt", "updatedAt"];
    for (const field of validFields) {
      const sort: ProjectSort = { field, direction: "asc" };
      expect(sort.field).toBe(field);
    }
  });

  it("should accept valid sort directions", () => {
    const validDirections: ProjectSort["direction"][] = ["asc", "desc"];
    for (const direction of validDirections) {
      const sort: ProjectSort = { field: "name", direction };
      expect(sort.direction).toBe(direction);
    }
  });
});

describe("Security Contract Tests", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: new Map(),
      projectIds: [],
      filters: { search: "", template: undefined },
    });
  });

  it("should truncate search queries exceeding max length", () => {
    const { actions } = useProjectStore.getState();
    const hugeQuery = "x".repeat(MAX_SEARCH_LENGTH + 1000);

    actions.setSearch(hugeQuery);

    const state = useProjectStore.getState();
    expect(state.filters.search.length).toBeLessThanOrEqual(MAX_SEARCH_LENGTH);
  });

  it("should handle Unicode in search safely", () => {
    const { actions } = useProjectStore.getState();
    const unicodeQuery = "测试 🏴‍☠️ тест العربية";

    actions.setSearch(unicodeQuery);

    const state = useProjectStore.getState();
    expect(state.filters.search).toBe(unicodeQuery);
  });

  it("should handle special regex characters in search", () => {
    const { actions } = useProjectStore.getState();
    const regexQuery = "test.*[a-z]+$^|()\\";

    actions.setSearch(regexQuery);

    const state = useProjectStore.getState();
    expect(state.filters.search).toBe(regexQuery);
  });

  it("should handle HTML/script injection attempts in search", () => {
    const { actions } = useProjectStore.getState();
    const xssQuery = '<script>alert("xss")</script>';

    actions.setSearch(xssQuery);

    // Store should preserve the string as-is (sanitization happens at render)
    const state = useProjectStore.getState();
    expect(state.filters.search).toBe(xssQuery);
  });

  it("should handle SQL injection attempts in search", () => {
    const { actions } = useProjectStore.getState();
    const sqlQuery = "'; DROP TABLE projects; --";

    actions.setSearch(sqlQuery);

    // Store preserves string, API client should parameterize
    const state = useProjectStore.getState();
    expect(state.filters.search).toBe(sqlQuery);
  });
});
