/**
 * Composition Hooks Tests
 *
 * Tests for page composition, templates, layout, and export TanStack Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useTemplates,
  usePageSizes,
  usePageLayout,
  useSavePageLayout,
  useComposePage,
  useComposeStoryboard,
  useExportPage,
  useExportStoryboard,
  compositionKeys,
} from "../useComposition";

// ============================================================================
// Mocks
// ============================================================================

const mockApiClient = {
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
};

vi.mock("../../client", () => ({
  apiClient: {
    GET: (...args: any[]) => mockApiClient.GET(...args),
    POST: (...args: any[]) => mockApiClient.POST(...args),
    PUT: (...args: any[]) => mockApiClient.PUT(...args),
  },
}));

// ============================================================================
// Test Setup
// ============================================================================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ============================================================================
// Test Data
// ============================================================================

const mockTemplate = {
  id: "tmpl-2x2",
  name: "2x2 Grid",
  slots: 4,
};

const mockPageSize = {
  id: "us-comic",
  name: "US Comic",
  width: 6.625,
  height: 10.25,
};

const mockLayout = {
  id: "layout-1",
  storyboardId: "sb-1",
  pageNumber: 1,
  templateId: "tmpl-2x2",
  slotAssignments: { slot0: "panel-1", slot1: "panel-2" },
};

// ============================================================================
// Query Key Tests
// ============================================================================

describe("compositionKeys", () => {
  it("generates correct base key", () => {
    expect(compositionKeys.all).toEqual(["composition"]);
  });

  it("generates correct templates key", () => {
    expect(compositionKeys.templates()).toEqual(["composition", "templates"]);
  });

  it("generates correct pageSizes key", () => {
    expect(compositionKeys.pageSizes()).toEqual(["composition", "pageSizes"]);
  });

  it("generates correct layout key", () => {
    expect(compositionKeys.layout("sb-1", 1)).toEqual([
      "composition", "layout", "sb-1", 1,
    ]);
  });
});

// ============================================================================
// useTemplates Tests
// ============================================================================

describe("useTemplates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches available templates", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { templates: [mockTemplate] },
      error: null,
    });

    const { result } = renderHook(() => useTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.GET).toHaveBeenCalledWith("/composition/templates");
    expect(result.current.data).toEqual([mockTemplate]);
  });

  it("returns empty array when no templates", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { templates: [] },
      error: null,
    });

    const { result } = renderHook(() => useTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Failed to fetch templates" } },
    });

    const { result } = renderHook(() => useTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ============================================================================
// usePageSizes Tests
// ============================================================================

describe("usePageSizes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches page sizes as array", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { pageSizes: [mockPageSize] },
      error: null,
    });

    const { result } = renderHook(() => usePageSizes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockPageSize]);
  });

  it("converts object page sizes to array", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: {
        pageSizes: {
          "us-comic": { name: "US Comic", width: 6.625, height: 10.25 },
        },
      },
      error: null,
    });

    const { result } = renderHook(() => usePageSizes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { id: "us-comic", name: "US Comic", width: 6.625, height: 10.25 },
    ]);
  });

  it("returns empty array when no page sizes", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => usePageSizes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("handles API error", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Failed" } },
    });

    const { result } = renderHook(() => usePageSizes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ============================================================================
// usePageLayout Tests
// ============================================================================

describe("usePageLayout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches layout for a storyboard page", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: { layout: mockLayout },
      error: null,
    });

    const { result } = renderHook(() => usePageLayout("sb-1", 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.GET).toHaveBeenCalledWith(
      "/composition/layouts/{storyboardId}",
      { params: { path: { storyboardId: "sb-1" }, query: { pageNumber: 1 } } }
    );
    expect(result.current.data).toEqual(mockLayout);
  });

  it("is disabled when storyboardId is null", () => {
    const { result } = renderHook(() => usePageLayout(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient.GET).not.toHaveBeenCalled();
  });

  it("returns null when no layout exists", async () => {
    mockApiClient.GET.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => usePageLayout("sb-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

// ============================================================================
// useSavePageLayout Tests
// ============================================================================

describe("useSavePageLayout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a page layout", async () => {
    mockApiClient.PUT.mockResolvedValueOnce({
      data: { layout: mockLayout },
      error: null,
    });

    const { result } = renderHook(() => useSavePageLayout(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      storyboardId: "sb-1",
      name: "Page 1",
      templateId: "tmpl-2x2",
      slotAssignments: { slot0: "panel-1" },
    });

    expect(mockApiClient.PUT).toHaveBeenCalledWith(
      "/composition/layouts/{storyboardId}",
      {
        params: { path: { storyboardId: "sb-1" } },
        body: {
          name: "Page 1",
          templateId: "tmpl-2x2",
          slotAssignments: { slot0: "panel-1" },
        },
      }
    );
    expect(response).toEqual(mockLayout);
  });

  it("handles save error", async () => {
    mockApiClient.PUT.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Failed to save layout" } },
    });

    const { result } = renderHook(() => useSavePageLayout(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        storyboardId: "sb-1",
        name: "Page 1",
        templateId: "tmpl-2x2",
        slotAssignments: {},
      })
    ).rejects.toThrow("Failed to save layout");
  });
});

// ============================================================================
// useComposePage Tests
// ============================================================================

describe("useComposePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("composes a page from panels", async () => {
    const composedPage = { outputPath: "/output/page-1.png" };
    mockApiClient.POST.mockResolvedValueOnce({
      data: composedPage,
      error: null,
    });

    const { result } = renderHook(() => useComposePage(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      storyboardId: "sb-1",
      templateId: "tmpl-2x2",
      panelIds: ["panel-1", "panel-2"],
      outputName: "page-1",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/composition/compose", {
      body: {
        storyboardId: "sb-1",
        templateId: "tmpl-2x2",
        panelIds: ["panel-1", "panel-2"],
        outputName: "page-1",
      },
    });
    expect(response).toEqual(composedPage);
  });

  it("handles compose error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Missing panels" } },
    });

    const { result } = renderHook(() => useComposePage(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        storyboardId: "sb-1",
        templateId: "tmpl-2x2",
        panelIds: [],
        outputName: "page-1",
      })
    ).rejects.toThrow("Missing panels");
  });
});

// ============================================================================
// useComposeStoryboard Tests
// ============================================================================

describe("useComposeStoryboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("auto-composes entire storyboard", async () => {
    const result_data = { pages: ["/output/page-1.png"] };
    mockApiClient.POST.mockResolvedValueOnce({
      data: result_data,
      error: null,
    });

    const { result } = renderHook(() => useComposeStoryboard(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      storyboardId: "sb-1",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith(
      "/composition/compose-storyboard",
      { body: { storyboardId: "sb-1" } }
    );
    expect(response).toEqual(result_data);
  });
});

// ============================================================================
// useExportPage Tests
// ============================================================================

describe("useExportPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exports a page as PNG", async () => {
    const exported = { outputPath: "/export/page-1.png" };
    mockApiClient.POST.mockResolvedValueOnce({
      data: exported,
      error: null,
    });

    const { result } = renderHook(() => useExportPage(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      inputPath: "/output/page-1.png",
      outputPath: "/export/page-1.png",
      format: "png",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/composition/export", {
      body: {
        inputPath: "/output/page-1.png",
        outputPath: "/export/page-1.png",
        format: "png",
      },
    });
    expect(response).toEqual(exported);
  });

  it("exports with print options", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: { outputPath: "/export/page-1.pdf" },
      error: null,
    });

    const { result } = renderHook(() => useExportPage(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      inputPath: "/output/page-1.png",
      outputPath: "/export/page-1.pdf",
      format: "pdf",
      dpi: 300,
      bleed: 3,
      trimMarks: true,
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/composition/export", {
      body: expect.objectContaining({
        format: "pdf",
        dpi: 300,
        bleed: 3,
        trimMarks: true,
      }),
    });
  });

  it("handles export error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "Export failed" } },
    });

    const { result } = renderHook(() => useExportPage(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        inputPath: "/bad",
        outputPath: "/bad",
        format: "png",
      })
    ).rejects.toThrow("Export failed");
  });
});

// ============================================================================
// useExportStoryboard Tests
// ============================================================================

describe("useExportStoryboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exports storyboard as stitched PNG", async () => {
    const exported = { outputPath: "/export/storyboard.png" };
    mockApiClient.POST.mockResolvedValueOnce({
      data: exported,
      error: null,
    });

    const { result } = renderHook(() => useExportStoryboard(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      storyboardId: "sb-1",
      outputName: "storyboard-export",
      format: "png-all",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith(
      "/composition/export-storyboard",
      {
        body: {
          storyboardId: "sb-1",
          outputName: "storyboard-export",
          format: "png-all",
        },
      }
    );
    expect(response).toEqual(exported);
  });

  it("handles export error", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: null,
      error: { error: { message: "No panels to export" } },
    });

    const { result } = renderHook(() => useExportStoryboard(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        storyboardId: "sb-1",
        outputName: "test",
        format: "png-all",
      })
    ).rejects.toThrow("No panels to export");
  });
});
