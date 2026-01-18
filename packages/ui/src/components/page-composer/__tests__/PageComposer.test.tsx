import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    const { unmount } = render(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);

    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);

    expect(localStorage.getItem("page-composer:storyboard-1:six-grid")).toContain("panel-1");

    unmount();
    render(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);
    fireEvent.click(screen.getAllByTestId("template-card")[0]);

    await waitFor(() =>
      expect(screen.getAllByTestId("panel-slot")[0]).toHaveTextContent(/no image/i)
    );
  });

  it("composes preview and shows preview image", async () => {
    render(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);

    fireEvent.click(screen.getAllByTestId("template-card")[0]);
    fireEvent.click(screen.getAllByTestId("panel-slot")[0]);
    fireEvent.click(screen.getAllByTestId("panel-list-item")[0]);
    fireEvent.click(screen.getByTestId("page-composer-preview"));

    await waitFor(() => expect(composePageMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("page-preview")).toBeInTheDocument();
  });

  it("persists slot assignments to backend", async () => {
    render(<PageComposer storyboardId="storyboard-1" projectId="project-1" />);

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
      })
    );
  });
});
