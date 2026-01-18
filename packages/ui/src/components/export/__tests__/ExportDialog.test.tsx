import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportDialog } from "../ExportDialog";

const composePageMock = vi.fn();
const composeStoryboardMock = vi.fn();
const exportPageMock = vi.fn();

vi.mock("../../../api/hooks/useComposition", () => ({
  useComposePage: () => ({ mutateAsync: composePageMock }),
  useComposeStoryboard: () => ({ mutateAsync: composeStoryboardMock }),
  useExportPage: () => ({ mutateAsync: exportPageMock }),
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
    composePageMock.mockResolvedValue({ outputPath: "/output/page1.png" });
    composeStoryboardMock.mockResolvedValue({ pages: [{ outputPath: "/output/page1.png" }] });
    exportPageMock.mockResolvedValue({ outputPath: "/output/export.pdf" });
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
});
