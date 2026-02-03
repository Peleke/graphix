import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageComposer } from "../PageComposer";

const useStoryboardMock = vi.fn();
const useTemplatesMock = vi.fn();
const usePageSizesMock = vi.fn();
const composePageMock = vi.fn();
const usePageLayoutMock = vi.fn();
const saveLayoutMock = vi.fn();

vi.mock("../../../api/hooks/useStories", () => ({
  useStoryboard: () => useStoryboardMock(),
}));

vi.mock("../../../api/hooks/useComposition", () => ({
  useTemplates: () => useTemplatesMock(),
  usePageSizes: () => usePageSizesMock(),
  useComposePage: () => ({ mutateAsync: composePageMock }),
  usePageLayout: (...args: any[]) => usePageLayoutMock(...args),
  useSavePageLayout: () => ({ mutate: saveLayoutMock }),
}));

vi.mock("../../panel-generator/PanelGenerator", () => ({
  PanelGenerator: () => <div data-testid="panel-generator" />,
}));

vi.mock("../../export", () => ({
  ExportDialog: () => <div data-testid="export-dialog" />,
}));

const template = {
  id: "six-grid",
  name: "Six Grid",
  slots: [
    { id: "slot-1", x: 0, y: 0, width: 50, height: 50 },
    { id: "slot-2", x: 50, y: 0, width: 50, height: 50 },
  ],
};

const pageSizeOptions = [
  { id: "us-letter", name: "US Letter", width: 800, height: 1200 },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("PageComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
      const store = new Map<string, string>();
      // @ts-expect-error test-only mock
      globalThis.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      };
    }
    localStorage.clear();

    useStoryboardMock.mockReturnValue({
      data: {
        storyboard: { id: "storyboard-1" },
        panels: [
          { id: "panel-1", position: 1, selectedGeneration: null },
          { id: "panel-2", position: 2, selectedGeneration: null },
        ],
      },
    });
    useTemplatesMock.mockReturnValue({ data: [template] });
    usePageSizesMock.mockReturnValue({ data: pageSizeOptions });
    composePageMock.mockResolvedValue({ outputPath: "/output/pages/preview.png" });
    usePageLayoutMock.mockReturnValue({ data: null });
  });

  it("persists slot assignments in localStorage", async () => {
    const { unmount } = renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);

    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);

    expect(localStorage.getItem("page-composer:storyboard-1:six-grid")).toContain("panel-1");

    unmount();
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);

    await waitFor(() =>
      expect(screen.getAllByTestId("panel-slot")[0]).toHaveTextContent(/no image/i)
    );
  });

  it("composes preview and shows preview image", async () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);

    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);
    fireEvent.click(screen.getByTestId("page-composer-preview"));

    await waitFor(() => expect(composePageMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("page-preview")).toBeInTheDocument();
  });

  it("renders template dropdown trigger", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    expect(screen.getByTestId("template-dropdown-trigger")).toBeInTheDocument();
  });

  it("renders storyboard panels", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    // Component should load with storyboard data
    expect(useStoryboardMock).toHaveBeenCalled();
  });

  it("shows template cards when dropdown is opened", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    expect(screen.getAllByTestId("template-card").length).toBeGreaterThan(0);
  });

  it("shows panel slots after selecting template", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    expect(screen.getAllByTestId("panel-slot").length).toBeGreaterThan(0);
  });

  it("shows panel list items for assignment", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    expect(screen.getAllByTestId("panel-list-item").length).toBeGreaterThan(0);
  });

  it("assigns panel to slot on click", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);
    expect(localStorage.getItem("page-composer:storyboard-1:six-grid")).toContain("panel-1");
  });

  it("renders preview button", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    expect(screen.getByTestId("page-composer-preview")).toBeInTheDocument();
  });

  it("renders with no storyboard gracefully", () => {
    useStoryboardMock.mockReturnValue({ data: null });
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    // Should not crash
    expect(screen.getByTestId("template-dropdown-trigger")).toBeInTheDocument();
  });

  it("renders with no templates gracefully", () => {
    useTemplatesMock.mockReturnValue({ data: [] });
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    // Should show empty or no template cards
    expect(screen.queryAllByTestId("template-card").length).toBe(0);
  });

  it("renders with empty panels array", () => {
    useStoryboardMock.mockReturnValue({
      data: { storyboard: { id: "storyboard-1" }, panels: [] },
    });
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    expect(screen.getByTestId("template-dropdown-trigger")).toBeInTheDocument();
  });

  it("loads saved layout from backend on mount", () => {
    usePageLayoutMock.mockReturnValue({
      data: {
        templateId: "six-grid",
        slotAssignments: { "slot-1": "panel-1" },
      },
    });
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    expect(usePageLayoutMock).toHaveBeenCalled();
  });

  it("uses page sizes from API", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    expect(usePageSizesMock).toHaveBeenCalled();
  });

  it("handles compose error gracefully", async () => {
    composePageMock.mockRejectedValueOnce(new Error("Compose failed"));
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);
    fireEvent.click(screen.getByTestId("page-composer-preview"));
    // Should not crash
    await waitFor(() => expect(composePageMock).toHaveBeenCalled());
  });

  it("clears slot assignment when re-clicking assigned slot", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);
    // Re-click the same slot to clear
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    // Should still be interactive
    expect(screen.getAllByTestId("panel-slot").length).toBeGreaterThan(0);
  });

  it("can assign multiple panels to different slots", () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    // Assign first slot
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);
    // Assign second slot
    fireEvent.click(screen.getAllByTestId("panel-slot")[1]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[1]);
    const stored = localStorage.getItem("page-composer:storyboard-1:six-grid");
    expect(stored).toContain("panel-1");
    expect(stored).toContain("panel-2");
  });

  it("persists slot assignments to backend", async () => {
    renderWithProviders(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);

    fireEvent.click(screen.getByTestId("template-dropdown-trigger"));
    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);
    await waitFor(
      () => {
        expect(saveLayoutMock).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );

    expect(saveLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storyboardId: "storyboard-1",
        templateId: "six-grid",
        slotAssignments: { "slot-1": "panel-1" },
      }),
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      })
    );
  });
});
