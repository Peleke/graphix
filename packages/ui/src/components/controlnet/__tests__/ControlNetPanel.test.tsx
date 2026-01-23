/**
 * ControlNetPanel Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ControlNetPanel } from "../ControlNetPanel";

// Mock control types
const mockControlTypes = [
  { type: "openpose", min: 0, max: 2, default: 0.8, notes: "Pose skeleton" },
  { type: "depth", min: 0, max: 2, default: 0.7, notes: "Depth map" },
  { type: "canny", min: 0, max: 2, default: 0.6, notes: "Edge detection" },
  { type: "lineart", min: 0, max: 2, default: 0.75, notes: "Line art" },
];

// Mock presets
const mockPresets = [
  {
    id: "character-consistency",
    name: "Character Consistency",
    description: "Maintain character identity across panels",
    controls: [
      { type: "openpose", defaultStrength: 0.8 },
      { type: "depth", defaultStrength: 0.5 },
    ],
  },
  {
    id: "pose-only",
    name: "Pose Only",
    description: "Match pose from reference",
    controls: [{ type: "openpose", defaultStrength: 1.0 }],
  },
];

vi.mock("../../../api/hooks/useControlNet", () => ({
  useControlNetPresets: () => ({ data: { presets: mockPresets }, isLoading: false }),
  useControlNetTypes: () => ({ data: { count: mockControlTypes.length, types: mockControlTypes }, isLoading: false }),
  useControlNetTypesForFamily: () => ({ data: null, isLoading: false }),
  useControlNetPreview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  buildControlNetFromPreset: (preset: any, image: string) =>
    preset.controls.map((c: any) => ({
      type: c.type,
      image,
      strength: c.defaultStrength,
      preprocess: true,
    })),
}));

vi.mock("../../../api/hooks/useUploads", () => ({
  useUploadImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../../api/hooks/useModels", () => ({
  useModels: () => ({ data: null, isLoading: false }),
  MODEL_FAMILIES: {
    sdxl: { label: "SDXL", color: "#3b82f6", description: "SDXL" },
    illustrious: { label: "Illustrious", color: "#8b5cf6", description: "Illustrious" },
    unknown: { label: "Unknown", color: "#71717a", description: "Unknown" },
  },
}));

vi.mock("../../model-selector", () => ({
  ModelSelector: ({ value, onChange }: { value: string | null; onChange: (m: string | null, f: string | null) => void }) => (
    <select
      data-testid="model-selector"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null, e.target.value ? "sdxl" : null)}
    >
      <option value="">Select model...</option>
      <option value="model1.safetensors">Model 1</option>
    </select>
  ),
}));

const mockReferenceImages = [
  { id: "gen-1", label: "Seed 123", path: "/output/ref.png" },
];

describe("ControlNetPanel", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
      localStorage.clear();
    }
  });

  describe("Mode Switching", () => {
    it("renders mode tabs and defaults to Standard mode", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-modes-1"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Mode tabs should be present
      expect(screen.getByTestId("controlnet-mode-tabs")).toBeInTheDocument();
      expect(screen.getByTestId("mode-tab-simple")).toBeInTheDocument();
      expect(screen.getByTestId("mode-tab-standard")).toBeInTheDocument();
      expect(screen.getByTestId("mode-tab-advanced")).toBeInTheDocument();

      // Standard mode should render by default (shows presets)
      expect(screen.getByTestId("controlnet-standard-mode")).toBeInTheDocument();
    });

    it("switches to Simple mode and shows toggle cards", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-modes-2"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Click Simple mode tab
      fireEvent.click(screen.getByTestId("mode-tab-simple"));

      // Simple mode content should be visible
      expect(screen.getByTestId("controlnet-simple-mode")).toBeInTheDocument();

      // Toggle cards should be present for each control type
      expect(screen.getByTestId("control-card-openpose")).toBeInTheDocument();
      expect(screen.getByTestId("control-card-depth")).toBeInTheDocument();
      expect(screen.getByTestId("control-card-canny")).toBeInTheDocument();
    });

    it("switches to Advanced mode and shows full controls", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-modes-3"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Click Advanced mode tab
      fireEvent.click(screen.getByTestId("mode-tab-advanced"));

      // Advanced mode content should be visible
      expect(screen.getByTestId("controlnet-advanced-mode")).toBeInTheDocument();

      // Should have preset dropdown in advanced mode
      expect(screen.getByTestId("controlnet-presets")).toBeInTheDocument();
    });
  });

  describe("Simple Mode", () => {
    it("toggles control types on/off", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-simple-1"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Switch to Simple mode
      fireEvent.click(screen.getByTestId("mode-tab-simple"));

      const openPoseCard = screen.getByTestId("control-card-openpose");
      const toggle = openPoseCard.querySelector('[role="switch"]') as HTMLElement;

      // Initially should be off
      expect(toggle).toHaveAttribute("aria-checked", "false");

      // Turn on
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "true");
      expect(onChange).toHaveBeenCalled();

      // Turn off
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Standard Mode", () => {
    it("renders preset cards", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-standard-1"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Should show preset cards
      expect(screen.getByTestId("preset-character-consistency")).toBeInTheDocument();
      expect(screen.getByTestId("preset-pose-only")).toBeInTheDocument();
    });

    it("applies preset when clicked", async () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-standard-2"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Click a preset
      fireEvent.click(screen.getByTestId("preset-character-consistency"));

      // onChange should be called with the preset's controls
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ type: "openpose" }),
            expect.objectContaining({ type: "depth" }),
          ]),
          "standard"
        );
      });
    });
  });

  describe("Advanced Mode", () => {
    it("shows control model input field", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-advanced-1"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Switch to Advanced mode
      fireEvent.click(screen.getByTestId("mode-tab-advanced"));

      // Add a control type using the control type dropdown (not the model selector or preset dropdown)
      const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
      // Find the select that has "Add control type..." option
      const controlTypeSelect = selects.find(
        (s) => s.querySelector('option[value="openpose"]') !== null
      );
      expect(controlTypeSelect).toBeDefined();
      fireEvent.change(controlTypeSelect!, { target: { value: "openpose" } });

      // Control model input should be visible
      expect(screen.getByTestId("controlnet-model-selector")).toBeInTheDocument();
    });

    it("shows preview button in advanced mode", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-advanced-2"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Switch to Advanced mode
      fireEvent.click(screen.getByTestId("mode-tab-advanced"));

      // Add a control using the control type dropdown
      const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
      const controlTypeSelect = selects.find(
        (s) => s.querySelector('option[value="openpose"]') !== null
      );
      expect(controlTypeSelect).toBeDefined();
      fireEvent.change(controlTypeSelect!, { target: { value: "openpose" } });

      // Preview button should be visible
      expect(screen.getByTestId("controlnet-preview-button")).toBeInTheDocument();
    });
  });

  describe("Reference Images", () => {
    it("applies reference image to controls", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-ref-1"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Switch to Simple mode
      fireEvent.click(screen.getByTestId("mode-tab-simple"));

      // Select reference image first
      fireEvent.click(screen.getByTestId("history-card-gen-1"));

      // Then toggle a control
      const openPoseCard = screen.getByTestId("control-card-openpose");
      const toggle = openPoseCard.querySelector('[role="switch"]') as HTMLElement;
      fireEvent.click(toggle);

      expect(onChange).toHaveBeenCalled();
    });

    it("opens lightbox when clicking reference image preview", () => {
      const onChange = vi.fn();
      const mockRefsWithPreview = [
        { id: "gen-1", label: "Seed 123", path: "/output/ref.png", previewUrl: "/preview/ref.png" },
      ];
      render(
        <ControlNetPanel
          panelId="panel-ref-2"
          projectId="project-1"
          referenceImages={mockRefsWithPreview}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      const historyCard = screen.getByTestId("history-card-gen-1");
      const previewDiv = historyCard.querySelector('[title="Click to enlarge"]');
      expect(previewDiv).toBeInTheDocument();

      fireEvent.click(previewDiv!);

      const lightbox = screen.getByRole("dialog");
      expect(lightbox).toBeInTheDocument();
      expect(lightbox).toHaveAttribute("aria-label", "Enlarged view of Seed 123");
    });

    it("closes lightbox when clicking close button", () => {
      const onChange = vi.fn();
      const mockRefsWithPreview = [
        { id: "gen-1", label: "Seed 123", path: "/output/ref.png", previewUrl: "/preview/ref.png" },
      ];
      render(
        <ControlNetPanel
          panelId="panel-ref-3"
          projectId="project-1"
          referenceImages={mockRefsWithPreview}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Open lightbox
      const historyCard = screen.getByTestId("history-card-gen-1");
      const previewDiv = historyCard.querySelector('[title="Click to enlarge"]');
      fireEvent.click(previewDiv!);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Close lightbox
      fireEvent.click(screen.getByLabelText("Close lightbox"));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Model Selector", () => {
    it("renders model selector", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-model-1"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("model-selector")).toBeInTheDocument();
    });
  });

  describe("Active Controls Summary", () => {
    it("shows active controls in summary", () => {
      const onChange = vi.fn();
      render(
        <ControlNetPanel
          panelId="panel-summary-1"
          projectId="project-1"
          referenceImages={mockReferenceImages}
          onChange={onChange}
        />,
        { wrapper: createWrapper() }
      );

      // Switch to Simple mode and enable controls
      fireEvent.click(screen.getByTestId("mode-tab-simple"));

      const openPoseToggle = screen.getByTestId("control-card-openpose").querySelector('[role="switch"]') as HTMLElement;
      fireEvent.click(openPoseToggle);

      // Summary should show active control
      expect(screen.getByTestId("active-controls-summary")).toHaveTextContent("openpose");
    });
  });
});
