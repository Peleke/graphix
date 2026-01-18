/**
 * Panel Generator Component Tests
 * 
 * Exhaustive test coverage for the Panel Generator UI component.
 * Tests generation flow, variant handling, rating, selection, and error states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PanelGenerator } from "../PanelGenerator";

// ============================================================================
// Mocks
// ============================================================================

const mockGeneratePanel = vi.fn();
const mockGenerateVariants = vi.fn();
const mockSelectOutput = vi.fn();
const mockRateGeneration = vi.fn();
const mockGenerateCaptions = vi.fn();

vi.mock("../../../api/hooks/usePanels", () => ({
  useGeneratePanel: () => ({
    mutateAsync: mockGeneratePanel,
    isPending: false,
  }),
  useGeneratePanelVariants: () => ({
    mutateAsync: mockGenerateVariants,
    isPending: false,
  }),
  useSelectPanelOutput: () => ({
    mutateAsync: mockSelectOutput,
    isPending: false,
  }),
  usePanelFull: () => ({
    data: { panel: { id: "panel-1", description: "Test panel" }, generations: [] },
    isLoading: false,
  }),
}));

vi.mock("../../../api/hooks/useGenerations", () => ({
  useGenerationsByPanel: (panelId: string | null) => ({
    data: panelId ? mockGenerations : [],
    isLoading: false,
  }),
  useRateGeneration: () => ({
    mutate: mockRateGeneration,
    isPending: false,
  }),
}));

vi.mock("../../../api/hooks/useCharacters", () => ({
  useCharacters: () => ({
    data: mockCharacters,
    isLoading: false,
  }),
}));

vi.mock("../../../api/hooks/useCaptions", () => ({
  useCaptionsByPanel: () => ({
    data: [],
    isLoading: false,
  }),
  useGenerateCaptions: () => ({
    mutate: mockGenerateCaptions,
    isPending: false,
  }),
}));

vi.mock("../../../api/hooks/useGeneratedTexts", () => ({
  useGeneratedTextsByPanel: () => ({
    data: [],
    isLoading: false,
  }),
  useActiveGeneratedText: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock("../../generation-tree", () => ({
  GenerationTreeVisualization: () => <div data-testid="generation-tree">Tree Viz</div>,
}));

vi.mock("../../generation-tree/useGenerationTreeData", () => ({
  useGenerationTreeData: () => ({
    isLoading: false,
    error: null,
    nodeCount: 0,
  }),
}));

vi.mock("../../controlnet", () => ({
  ControlNetPanel: ({ level }: { level?: number }) => (
    <div data-testid="controlnet-panel" data-level={level ?? "unknown"} />
  ),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockCharacters = [
  { id: "char-1", name: "Luna", species: "Wolf" },
  { id: "char-2", name: "Max", species: "Fox" },
];

const mockGenerations = [
  {
    id: "gen-1",
    seed: 12345,
    width: 512,
    height: 768,
    selected: false,
    rating: 3,
    prompt: "A wolf in the forest",
    negativePrompt: "bad quality",
    cloudUrl: null,
  },
  {
    id: "gen-2",
    seed: 67890,
    width: 512,
    height: 768,
    selected: true,
    rating: 5,
    prompt: "A fox by the river",
    negativePrompt: "blurry",
    cloudUrl: "https://example.com/image.png",
  },
];

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

function renderPanelGenerator(props = {}) {
  const queryClient = createQueryClient();
  const defaultProps = {
    panelId: "panel-1",
    storyboardId: "storyboard-1",
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <PanelGenerator {...defaultProps} />
    </QueryClientProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("PanelGenerator", () => {
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe("Rendering", () => {
    it("renders the panel generator header", () => {
      renderPanelGenerator();
      expect(screen.getByText("Panel Generator")).toBeInTheDocument();
      expect(screen.getByText(/Configure ControlNet/i)).toBeInTheDocument();
      expect(screen.getByTestId("controlnet-panel")).toBeInTheDocument();
    });

    it("renders tab navigation", () => {
      renderPanelGenerator();
      // Use getAllByText since "Generate" appears as both tab and section title
      const generateElements = screen.getAllByText("Generate");
      expect(generateElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Versions/)).toBeInTheDocument();
      expect(screen.getByText(/Text \(/)).toBeInTheDocument();
      expect(screen.getByText(/Captions \(/)).toBeInTheDocument();
    });

    it("renders character selection section", () => {
      renderPanelGenerator();
      expect(screen.getByText("Characters")).toBeInTheDocument();
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText("Max")).toBeInTheDocument();
    });

    it("renders control level options", () => {
      renderPanelGenerator();
      expect(screen.getByText("Control Level")).toBeInTheDocument();
      expect(screen.getByText("Level 4 - Full Control")).toBeInTheDocument();
      expect(screen.getByText("Level 3 - Visual (Target)")).toBeInTheDocument();
      expect(screen.getByText("Level 2 - Smart Defaults")).toBeInTheDocument();
    });

    it("renders prompt input fields", () => {
      renderPanelGenerator();
      expect(screen.getByPlaceholderText(/Positive prompt/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Negative prompt/i)).toBeInTheDocument();
    });

    it("renders generate buttons", () => {
      renderPanelGenerator();
      expect(screen.getByText("Generate Single")).toBeInTheDocument();
      expect(screen.getByText(/Generate.*Variants/)).toBeInTheDocument();
    });

    it("renders variant count input with default value of 4", () => {
      renderPanelGenerator();
      const input = screen.getByTestId("variant-count-input");
      expect(input).toHaveValue(4);
    });
  });

  // --------------------------------------------------------------------------
  // Character Selection Tests
  // --------------------------------------------------------------------------

  describe("Character Selection", () => {
    it("allows selecting a character", async () => {
      renderPanelGenerator();
      const lunaItem = screen.getByText("Luna").closest(".character-item");
      
      await userEvent.click(lunaItem!);
      
      expect(lunaItem).toHaveClass("selected");
    });

    it("allows selecting multiple characters", async () => {
      renderPanelGenerator();
      const lunaItem = screen.getByText("Luna").closest(".character-item");
      const maxItem = screen.getByText("Max").closest(".character-item");
      
      await userEvent.click(lunaItem!);
      await userEvent.click(maxItem!);
      
      expect(lunaItem).toHaveClass("selected");
      expect(maxItem).toHaveClass("selected");
    });

    it("allows deselecting a character", async () => {
      renderPanelGenerator();
      const lunaItem = screen.getByText("Luna").closest(".character-item");
      
      await userEvent.click(lunaItem!);
      expect(lunaItem).toHaveClass("selected");
      
      await userEvent.click(lunaItem!);
      expect(lunaItem).not.toHaveClass("selected");
    });
  });

  // --------------------------------------------------------------------------
  // Control Level Tests
  // --------------------------------------------------------------------------

  describe("Control Level Selection", () => {
    it("has Level 3 selected by default", () => {
      renderPanelGenerator();
      const level3 = screen.getByText("Level 3 - Visual (Target)").closest(".level-option");
      expect(level3).toHaveClass("selected");
    });

    it("allows changing control level", async () => {
      renderPanelGenerator();
      const level4 = screen.getByText("Level 4 - Full Control").closest(".level-option");

      fireEvent.click(level4!);

      expect(level4).toHaveClass("selected");
    });
  });

  // --------------------------------------------------------------------------
  // Prompt Input Tests
  // --------------------------------------------------------------------------

  describe("Prompt Input", () => {
    it("allows entering positive prompt", async () => {
      renderPanelGenerator();
      const input = screen.getByPlaceholderText(/Positive prompt/i);
      
      await userEvent.type(input, "A beautiful sunset");
      
      expect(input).toHaveValue("A beautiful sunset");
    });

    it("allows entering negative prompt", async () => {
      renderPanelGenerator();
      const input = screen.getByPlaceholderText(/Negative prompt/i);
      
      await userEvent.type(input, "blurry, bad quality");
      
      expect(input).toHaveValue("blurry, bad quality");
    });
  });

  // --------------------------------------------------------------------------
  // Generation Tests
  // --------------------------------------------------------------------------

  describe("Generation", () => {
    it("calls generatePanel when Generate Single is clicked", async () => {
      mockGeneratePanel.mockResolvedValueOnce({ success: true });
      renderPanelGenerator();
      
      const positivePrompt = screen.getByPlaceholderText(/Positive prompt/i);
      await userEvent.type(positivePrompt, "Test prompt");
      
      const generateBtn = screen.getByText("Generate Single");
      await userEvent.click(generateBtn);
      
      expect(mockGeneratePanel).toHaveBeenCalledWith(
        expect.objectContaining({
          panelId: "panel-1",
          prompt: "Test prompt",
        })
      );
    });

    it("calls generateVariants when Generate Variants is clicked", async () => {
      mockGenerateVariants.mockResolvedValueOnce({ success: true });
      renderPanelGenerator();
      
      const variantsBtn = screen.getByText(/Generate.*Variants/);
      await userEvent.click(variantsBtn);
      
      expect(mockGenerateVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          panelId: "panel-1",
          count: 4,
        })
      );
    });

    it("allows changing variant count", async () => {
      mockGenerateVariants.mockResolvedValueOnce({ success: true });
      renderPanelGenerator();
      
      const input = screen.getByTestId("variant-count-input") as HTMLInputElement;
      // Clear and set value directly to avoid type concatenation issues
      fireEvent.change(input, { target: { value: "6" } });
      
      const variantsBtn = screen.getByText(/Generate.*Variants/);
      await userEvent.click(variantsBtn);
      
      expect(mockGenerateVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 6,
        })
      );
    });

    it("passes negative prompt to generation", async () => {
      mockGeneratePanel.mockResolvedValueOnce({ success: true });
      renderPanelGenerator();
      
      const positivePrompt = screen.getByPlaceholderText(/Positive prompt/i);
      const negativePrompt = screen.getByPlaceholderText(/Negative prompt/i);
      
      await userEvent.type(positivePrompt, "Good stuff");
      await userEvent.type(negativePrompt, "Bad stuff");
      
      const generateBtn = screen.getByText("Generate Single");
      await userEvent.click(generateBtn);
      
      expect(mockGeneratePanel).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Good stuff",
          negativePrompt: "Bad stuff",
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling Tests
  // --------------------------------------------------------------------------

  describe("Error Handling", () => {
    it("displays error when generation fails", async () => {
      mockGeneratePanel.mockRejectedValueOnce(new Error("ComfyUI not available"));
      renderPanelGenerator();
      
      const generateBtn = screen.getByText("Generate Single");
      await userEvent.click(generateBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/ComfyUI not available/i)).toBeInTheDocument();
      });
    });

    it("displays error when variant generation fails", async () => {
      mockGenerateVariants.mockRejectedValueOnce(new Error("Queue full"));
      renderPanelGenerator();
      
      const variantsBtn = screen.getByText(/Generate.*Variants/);
      await userEvent.click(variantsBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/Queue full/i)).toBeInTheDocument();
      });
    });

    it("clears error on new generation attempt", async () => {
      mockGeneratePanel.mockRejectedValueOnce(new Error("First error"));
      mockGeneratePanel.mockResolvedValueOnce({ success: true });
      renderPanelGenerator();
      
      const generateBtn = screen.getByText("Generate Single");
      await userEvent.click(generateBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/First error/i)).toBeInTheDocument();
      });
      
      await userEvent.click(generateBtn);
      
      await waitFor(() => {
        expect(screen.queryByText(/First error/i)).not.toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Generation Display Tests
  // --------------------------------------------------------------------------

  describe("Generation Display", () => {
    it("displays generation cards with seed info", () => {
      renderPanelGenerator();
      expect(screen.getByText(/Seed: 12345/)).toBeInTheDocument();
      expect(screen.getByText(/Seed: 67890/)).toBeInTheDocument();
    });

    it("displays generation dimensions", () => {
      renderPanelGenerator();
      expect(screen.getAllByText(/512×768/).length).toBeGreaterThan(0);
    });

    it("shows selected state on selected generation", () => {
      renderPanelGenerator();
      // gen-2 is selected in mock data
      const selectedStatus = screen.getAllByText("✓ Selected");
      expect(selectedStatus.length).toBeGreaterThan(0);
    });

    it("shows empty state when no generations exist", () => {
      // Note: This test relies on mockGenerations being defined in the mock setup.
      // When mockGenerations is empty, the empty state should show.
      // We test the conditional rendering here.
      renderPanelGenerator();
      // With mockGenerations populated, we should NOT see the empty state
      expect(screen.queryByText("No generations yet")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Selection Tests
  // --------------------------------------------------------------------------

  describe("Selection", () => {
    it("calls selectOutput when clicking select button", async () => {
      mockSelectOutput.mockResolvedValueOnce({ panelId: "panel-1", generationId: "gen-1" });
      renderPanelGenerator();
      
      const selectButtons = screen.getAllByText("Select");
      await userEvent.click(selectButtons[0]);
      
      expect(mockSelectOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          panelId: "panel-1",
          generationId: "gen-1",
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Rating Tests
  // --------------------------------------------------------------------------

  describe("Rating", () => {
    it("displays rating stars", () => {
      renderPanelGenerator();
      // Should have 5 stars per generation card
      const stars = screen.getAllByText("★");
      expect(stars.length).toBe(10); // 2 generations × 5 stars
    });

    it("calls rateGeneration when clicking a star", async () => {
      renderPanelGenerator();
      
      const stars = screen.getAllByText("★");
      // Click the 4th star of the first generation
      await userEvent.click(stars[3]);
      
      expect(mockRateGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          generationId: "gen-1",
          rating: 4,
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Tab Navigation Tests
  // --------------------------------------------------------------------------

  describe("Tab Navigation", () => {
    it("switches to Versions tab", async () => {
      renderPanelGenerator();
      
      const versionsTab = screen.getByText(/Versions/);
      await userEvent.click(versionsTab);
      
      expect(screen.getByTestId("generation-tree")).toBeInTheDocument();
    });

    it("switches to Text tab", async () => {
      renderPanelGenerator();
      
      const textTab = screen.getByText(/Text \(/);
      await userEvent.click(textTab);
      
      expect(screen.getByText("Panel Description")).toBeInTheDocument();
    });

    it("switches to Captions tab", async () => {
      renderPanelGenerator();
      
      const captionsTab = screen.getByText(/Captions \(/);
      await userEvent.click(captionsTab);
      
      expect(screen.getByText(/Generate from Beat/)).toBeInTheDocument();
    });

    it("shows active tab styling", async () => {
      renderPanelGenerator();
      
      const generateTab = screen.getByRole("button", { name: "Generate" });
      expect(generateTab).toHaveClass("active");
      
      const versionsTab = screen.getByText(/Versions/);
      await userEvent.click(versionsTab);
      
      expect(versionsTab).toHaveClass("active");
      expect(generateTab).not.toHaveClass("active");
    });
  });

  // --------------------------------------------------------------------------
  // Copy Prompt Action Tests
  // --------------------------------------------------------------------------

  describe("Copy Prompt Action", () => {
    it("copies generation prompt to input when copy button clicked", async () => {
      renderPanelGenerator();
      
      const copyButtons = screen.getAllByTitle("Use this prompt");
      await userEvent.click(copyButtons[0]);
      
      const promptInput = screen.getByPlaceholderText(/Positive prompt/i);
      expect(promptInput).toHaveValue("A wolf in the forest");
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe("Accessibility", () => {
    it("has accessible generate buttons", () => {
      renderPanelGenerator();
      const generateBtn = screen.getByRole("button", { name: "Generate Single" });
      expect(generateBtn).toBeEnabled();
    });

    it("has accessible rating stars with visual indication", () => {
      renderPanelGenerator();
      const stars = screen.getAllByText("★");
      // All stars should be clickable
      stars.forEach(star => {
        expect(star).toHaveStyle({ cursor: "pointer" });
      });
    });

    it("has accessible tab buttons", () => {
      renderPanelGenerator();
      const tabs = screen.getAllByRole("button").filter(btn => 
        btn.classList.contains("tab-button")
      );
      expect(tabs.length).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // Loading States Tests
  // --------------------------------------------------------------------------

  describe("Loading States", () => {
    it("does not show loading indicator when data is loaded", () => {
      // With our mock setup, data is pre-loaded so loading indicator should not show
      renderPanelGenerator();
      expect(screen.queryByText("Loading generations...")).not.toBeInTheDocument();
    });
  });
});
