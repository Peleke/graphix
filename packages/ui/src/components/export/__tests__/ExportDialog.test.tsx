import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportDialog } from "../ExportDialog";

const composePageMock = vi.fn();
const composeStoryboardMock = vi.fn();
const exportPageMock = vi.fn();
const exportStoryboardMock = vi.fn();

vi.mock("../../../api/hooks/useComposition", () => ({
  useComposePage: () => ({ mutateAsync: composePageMock }),
  useComposeStoryboard: () => ({ mutateAsync: composeStoryboardMock }),
  useExportPage: () => ({ mutateAsync: exportPageMock }),
  useExportStoryboard: () => ({ mutateAsync: exportStoryboardMock }),
}));

vi.mock("../../../api/hooks/useStories", () => ({
  useStoryboard: () => ({
    data: {
      storyboard: { id: "storyboard-1" },
      panels: [{ id: "panel-1" }, { id: "panel-2" }],
    },
  }),
}));

describe("ExportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    composePageMock.mockResolvedValue({ outputPath: "/output/page1.png" });
    composeStoryboardMock.mockResolvedValue({ pages: [{ outputPath: "/output/page1.png" }] });
    exportPageMock.mockResolvedValue({ outputPath: "/output/export.pdf" });
    exportStoryboardMock.mockResolvedValue({ outputPath: "/output/pages/all.png" });
  });

  it("renders export options with metadata always included", () => {
    render(<ExportDialog storyboardId="storyboard-1" />);

    const metadata = screen.getByRole("checkbox", { name: /metadata/i });
    expect(metadata).toBeChecked();
    expect(metadata).toBeDisabled();
  });

  it("exports a single page as PNG", async () => {
    render(<ExportDialog storyboardId="storyboard-1" />);

    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));
    expect(await screen.findByTestId("export-complete")).toBeInTheDocument();
    expect(composePageMock).toHaveBeenCalledTimes(1);
    expect(composeStoryboardMock).not.toHaveBeenCalled();
  });

  it("exports as PDF using storyboard composition", async () => {
    render(<ExportDialog storyboardId="storyboard-1" />);

    fireEvent.click(screen.getByRole("radio", { name: /pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    expect(await screen.findByTestId("export-complete")).toBeInTheDocument();
    expect(composeStoryboardMock).toHaveBeenCalledTimes(1);
    expect(exportPageMock).toHaveBeenCalledTimes(1);
  });

  it("exports stitched PNG for all pages", async () => {
    render(<ExportDialog storyboardId="storyboard-1" />);

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]);
    await waitFor(() => expect(radios[1]).toBeChecked());
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));

    await waitFor(() => expect(exportStoryboardMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("export-complete")).toBeInTheDocument();
    expect(exportStoryboardMock).toHaveBeenCalledTimes(1);
    expect(composeStoryboardMock).not.toHaveBeenCalled();
  });
});
