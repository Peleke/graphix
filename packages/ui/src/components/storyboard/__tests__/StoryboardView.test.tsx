/**
 * StoryboardView Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoryboardView } from "../StoryboardView";

// ============================================================================
// Mocks
// ============================================================================

const mockStoryboards = [
  { id: "sb-1", projectId: "proj-1", name: "Main Board", description: "Primary" },
  { id: "sb-2", projectId: "proj-1", name: "Alternate", description: "" },
];

const mockStoryboard = {
  name: "Main Board",
  panels: [
    {
      id: "panel-1",
      position: 0,
      description: "Opening shot",
      type: "image",
      selectedGeneration: null,
    },
    {
      id: "panel-2",
      position: 1,
      description: "Dialog scene",
      type: "text",
      textContent: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }] },
    },
  ],
};

const mockCreateStoryboard = { mutateAsync: vi.fn(), isPending: false };
const mockCreatePanel = { mutateAsync: vi.fn(), isPending: false };
const mockUpdatePanel = { mutateAsync: vi.fn(), isPending: false };

vi.mock("../../../api/hooks/useStories", () => ({
  useStoryboards: () => ({
    data: mockStoryboards,
    isLoading: false,
  }),
  useStoryboard: (id: string | null) => ({
    data: id ? mockStoryboard : null,
    isLoading: false,
  }),
  useCreateStoryboard: () => mockCreateStoryboard,
}));

vi.mock("../../../api/hooks/usePanels", () => ({
  useCreatePanel: () => mockCreatePanel,
  useUpdatePanel: () => mockUpdatePanel,
}));

vi.mock("../../../api/hooks/useCaptions", () => ({
  useCaptionsByPanel: () => ({ data: [] }),
}));

vi.mock("../../captions/CaptionListModal", () => ({
  CaptionListModal: () => null,
}));

vi.mock("../../text-panel/TextPanelEditor", () => ({
  TextPanelModal: () => null,
}));

const mockOnPanelSelect = vi.fn();
const mockOnStoryboardSelect = vi.fn();

function renderComponent(props: Partial<React.ComponentProps<typeof StoryboardView>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StoryboardView
        projectId="proj-1"
        onPanelSelect={mockOnPanelSelect}
        onStoryboardSelect={mockOnStoryboardSelect}
        {...props}
      />
    </QueryClientProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("StoryboardView", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Header", () => {
    it("renders Storyboards title", () => {
      renderComponent();
      expect(screen.getByText("Storyboards")).toBeInTheDocument();
    });

    it("renders + New Storyboard button", () => {
      renderComponent();
      expect(screen.getByText("+ New Storyboard")).toBeInTheDocument();
    });
  });

  describe("Sidebar", () => {
    it("renders STORYBOARDS section header", () => {
      renderComponent();
      expect(screen.getByText("STORYBOARDS")).toBeInTheDocument();
    });

    it("renders storyboard names in sidebar", () => {
      renderComponent();
      // Both sidebar item and main content header show "Main Board"
      expect(screen.getAllByText("Main Board").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Alternate")).toBeInTheDocument();
    });

    it("auto-selects first storyboard and calls onStoryboardSelect", () => {
      renderComponent();
      expect(mockOnStoryboardSelect).toHaveBeenCalledWith("sb-1");
    });

    it("switches storyboards on sidebar click", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Alternate"));
      expect(mockOnStoryboardSelect).toHaveBeenCalledWith("sb-2");
    });
  });

  describe("Panel Grid", () => {
    it("renders panel cards", () => {
      renderComponent();
      expect(screen.getByTestId("panel-card-panel-1")).toBeInTheDocument();
      expect(screen.getByTestId("panel-card-panel-2")).toBeInTheDocument();
    });

    it("renders image panel with No image placeholder", () => {
      renderComponent();
      expect(screen.getByText("No image")).toBeInTheDocument();
    });

    it("renders text panel with TEXT PANEL label", () => {
      renderComponent();
      expect(screen.getByText("TEXT PANEL")).toBeInTheDocument();
    });

    it("shows text preview for text panels", () => {
      renderComponent();
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("shows panel position info", () => {
      renderComponent();
      expect(screen.getByText("Panel 0")).toBeInTheDocument();
    });
  });

  describe("Panel Actions", () => {
    it("renders + Image Panel button", () => {
      renderComponent();
      expect(screen.getByTestId("add-image-panel-btn")).toBeInTheDocument();
    });

    it("renders + Text Panel button", () => {
      renderComponent();
      expect(screen.getByTestId("add-text-panel-btn")).toBeInTheDocument();
    });

    it("calls onPanelSelect when clicking image panel", () => {
      renderComponent();
      fireEvent.click(screen.getByTestId("panel-card-panel-1"));
      expect(mockOnPanelSelect).toHaveBeenCalledWith("panel-1");
    });

    it("renders edit button for text panels", () => {
      renderComponent();
      expect(screen.getByTestId("edit-text-panel-2")).toBeInTheDocument();
    });
  });

  describe("Create Storyboard Modal", () => {
    it("opens modal on + New Storyboard click", () => {
      renderComponent();
      fireEvent.click(screen.getByText("+ New Storyboard"));
      expect(screen.getByText("Create Storyboard")).toBeInTheDocument();
    });

    it("shows name input and description textarea", () => {
      renderComponent();
      fireEvent.click(screen.getByText("+ New Storyboard"));
      expect(screen.getByPlaceholderText("Storyboard name (required)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Description (optional)")).toBeInTheDocument();
    });

    it("disables Create button when name is empty", () => {
      renderComponent();
      fireEvent.click(screen.getByText("+ New Storyboard"));
      expect(screen.getByText("Create")).toBeDisabled();
    });

    it("enables Create button when name is entered", () => {
      renderComponent();
      fireEvent.click(screen.getByText("+ New Storyboard"));
      fireEvent.change(screen.getByPlaceholderText("Storyboard name (required)"), {
        target: { value: "New Board" },
      });
      expect(screen.getByText("Create")).not.toBeDisabled();
    });

    it("closes modal on Cancel click", () => {
      renderComponent();
      fireEvent.click(screen.getByText("+ New Storyboard"));
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByText("Create Storyboard")).not.toBeInTheDocument();
    });

    it("calls createStoryboard on Create click", async () => {
      mockCreateStoryboard.mutateAsync.mockResolvedValueOnce({ id: "sb-3" });
      renderComponent();
      fireEvent.click(screen.getByText("+ New Storyboard"));
      fireEvent.change(screen.getByPlaceholderText("Storyboard name (required)"), {
        target: { value: "New Board" },
      });
      fireEvent.click(screen.getByText("Create"));
      await waitFor(() => {
        expect(mockCreateStoryboard.mutateAsync).toHaveBeenCalledWith({
          projectId: "proj-1",
          name: "New Board",
          description: undefined,
        });
      });
    });
  });

  describe("Create Panel Modal", () => {
    it("opens panel modal on + Image Panel click", () => {
      renderComponent();
      fireEvent.click(screen.getByTestId("add-image-panel-btn"));
      expect(screen.getByPlaceholderText("Panel description (optional)")).toBeInTheDocument();
    });

    it("shows Cancel button in modal", () => {
      renderComponent();
      fireEvent.click(screen.getByTestId("add-image-panel-btn"));
      // Modal has Cancel and Create Panel buttons
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });
});
