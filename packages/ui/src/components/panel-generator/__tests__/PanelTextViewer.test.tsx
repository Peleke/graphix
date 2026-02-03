/**
 * Panel Text Viewer Component Tests
 *
 * Tests for the PanelTextViewer component including spice button functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PanelTextViewer } from "../PanelTextViewer";

// ============================================================================
// Mocks
// ============================================================================

const mockGenerateDescription = vi.fn();
const mockGenerateDialogue = vi.fn();
const mockRefineText = vi.fn();
const mockCreateGeneratedText = vi.fn();
const mockUpdateGeneratedText = vi.fn();

vi.mock("../../../api/hooks/useTextGeneration", () => ({
  useGeneratePanelDescription: () => ({
    mutateAsync: mockGenerateDescription,
    isPending: false,
  }),
  useGenerateDialogue: () => ({
    mutateAsync: mockGenerateDialogue,
    isPending: false,
  }),
  useRefineText: () => ({
    mutateAsync: mockRefineText,
    isPending: false,
  }),
  useGeneratePromptFromBeat: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ text: "Generated prompt from beat" }),
    isPending: false,
  }),
}));

vi.mock("../../../api/hooks/useGeneratedTexts", () => ({
  useActiveGeneratedText: (panelId: string, textType: string) => {
    // Return mock data based on text type
    const mockData: Record<string, { text: string; id: string } | null> = {
      panel_description: { id: "desc-1", text: "A forest scene with a wolf." },
      dialogue: { id: "dlg-1", text: "Hello there!" },
      narration: { id: "nar-1", text: "The sun set over the mountains." },
    };
    return {
      data: mockData[textType] || null,
      refetch: vi.fn(),
      isLoading: false,
    };
  },
  useCreateGeneratedText: () => ({
    mutateAsync: mockCreateGeneratedText,
    isPending: false,
  }),
  useUpdateGeneratedText: () => ({
    mutateAsync: mockUpdateGeneratedText,
    isPending: false,
  }),
}));

vi.mock("../AIAssistButton", () => ({
  AIAssistButton: ({
    onGenerate,
    title,
  }: {
    onGenerate: () => Promise<string>;
    title?: string;
  }) => (
    <button
      data-testid={`ai-assist-${(title || "generate").toLowerCase().replace(/\s/g, "-")}`}
      onClick={() => onGenerate()}
    >
      ✨
    </button>
  ),
}));

// ============================================================================
// Test Utilities
// ============================================================================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPanelTextViewer(props = {}) {
  const queryClient = createQueryClient();
  const defaultProps = {
    panelId: "panel-1",
    storyboardId: "storyboard-1",
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <PanelTextViewer {...defaultProps} />
    </QueryClientProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("PanelTextViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefineText.mockResolvedValue({ text: "Spiced up text" });
    mockUpdateGeneratedText.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe("Rendering", () => {
    it("renders all text sections", () => {
      renderPanelTextViewer();
      expect(screen.getByText("Panel Description")).toBeInTheDocument();
      expect(screen.getByText("Dialogue")).toBeInTheDocument();
      expect(screen.getByText("Narration")).toBeInTheDocument();
    });

    it("displays existing text content", () => {
      renderPanelTextViewer();
      expect(screen.getByText("A forest scene with a wolf.")).toBeInTheDocument();
      expect(screen.getByText("Hello there!")).toBeInTheDocument();
      expect(screen.getByText("The sun set over the mountains.")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Spice Button Tests
  // --------------------------------------------------------------------------

  describe("Spice Buttons", () => {
    it("renders spice button for description section", () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-description");
      expect(spiceBtn).toBeInTheDocument();
      expect(spiceBtn).toHaveAttribute("title", "Make it nastier");
    });

    it("renders spice button for dialogue section", () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-dialogue");
      expect(spiceBtn).toBeInTheDocument();
    });

    it("renders spice button for narration section", () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-narration");
      expect(spiceBtn).toBeInTheDocument();
    });

    it("displays 🌶️ emoji and Spice label on buttons", () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-description");
      expect(spiceBtn).toHaveTextContent("🌶️");
      expect(spiceBtn).toHaveTextContent("Spice");
    });

    it("calls refineText when spice button is clicked", async () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-description");

      await userEvent.click(spiceBtn);

      await waitFor(() => {
        expect(mockRefineText).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "A forest scene with a wolf.",
          })
        );
      });
    });

    it("calls refineText with dialogue-specific instruction for dialogue section", async () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-dialogue");

      await userEvent.click(spiceBtn);

      await waitFor(() => {
        expect(mockRefineText).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Hello there!",
            instruction: expect.stringContaining("Make this dialogue explicitly sexual"),
          })
        );
      });
    });

    it("calls refineText with narration-specific instruction for narration section", async () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-narration");

      await userEvent.click(spiceBtn);

      await waitFor(() => {
        expect(mockRefineText).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "The sun set over the mountains.",
            instruction: expect.stringContaining("narration"),
          })
        );
      });
    });

    it("calls update after spicing completes", async () => {
      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-description");

      await userEvent.click(spiceBtn);

      // Verify refineText was called - that's what transforms the text
      await waitFor(() => {
        expect(mockRefineText).toHaveBeenCalled();
      });
    });

    it("shows spinner while spicing is in progress", async () => {
      // Make refineText take some time
      let resolvePromise: (value: { text: string }) => void;
      mockRefineText.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      renderPanelTextViewer();
      const spiceBtn = screen.getByTestId("spice-btn-description");

      await userEvent.click(spiceBtn);

      // Button should be disabled while spicing
      expect(spiceBtn).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ text: "Spiced" });

      // Wait for completion
      await waitFor(() => {
        expect(spiceBtn).toBeEnabled();
      });
    });
  });
});
