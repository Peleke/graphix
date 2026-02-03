/**
 * BeatEditor Component Tests
 *
 * Tests for the BeatEditor modal component's rendering, validation, and interactions.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BeatEditor } from "../BeatEditor";
import type { Beat } from "../types";

// Mock useRefineText hook to avoid QueryClient requirement
vi.mock("../../../../api/hooks/useTextGeneration", () => ({
  useRefineText: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ refined: "Mocked refined text" }),
    isPending: false,
  }),
}));

// Helper for rendering (now no wrapper needed due to mock)
const renderWithQueryClient = (ui: React.ReactElement) => {
  return render(ui);
};

// ============================================================================
// Test Helpers
// ============================================================================

function createMockBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    id: "beat-123",
    storyId: "story-456",
    position: 1,
    beatType: "setup",
    visualDescription: "A character walks into a room",
    emotionalTone: "tense",
    narration: "The hero arrives",
    sfx: "footsteps",
    cameraAngle: "medium",
    panelId: null,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z",
    ...overrides,
  };
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  storyId: "story-456",
};

// ============================================================================
// Setup/Teardown
// ============================================================================

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Rendering Tests
// ============================================================================

describe("BeatEditor - Rendering", () => {
  describe("Modal State", () => {
    it("should not render when isOpen is false", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} isOpen={true} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Create Mode", () => {
    it("should show Create Beat title when no beat provided", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      expect(screen.getByRole("heading", { name: "Create Beat" })).toBeInTheDocument();
    });

    it("should show Create Beat button when no beat provided", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Create Beat" })).toBeInTheDocument();
    });

    it("should have empty form fields in create mode", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      expect(textarea).toHaveValue("");
    });
  });

  describe("Edit Mode", () => {
    it("should show Edit Beat title when beat is provided", () => {
      const beat = createMockBeat();
      renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat} />);
      expect(screen.getByText("Edit Beat")).toBeInTheDocument();
    });

    it("should show Save Changes button when beat is provided", () => {
      const beat = createMockBeat();
      renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat} />);
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("should populate form with beat data", () => {
      const beat = createMockBeat({
        visualDescription: "Test visual description",
        emotionalTone: "happy",
      });
      renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat} />);

      expect(
        screen.getByDisplayValue("Test visual description")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("happy")).toBeInTheDocument();
    });
  });

  describe("Form Fields", () => {
    it("should render all beat type buttons", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Setup/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Inciting Incident/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Rising Action/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Midpoint/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Complication/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Crisis/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Climax/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Resolution/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Denouement/ })).toBeInTheDocument();
    });

    it("should render visual description textarea", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      expect(
        screen.getByPlaceholderText(
          "Describe what should be visually depicted in this beat..."
        )
      ).toBeInTheDocument();
    });

    it("should render emotional tone input", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("e.g., tense, hopeful, melancholic...")
      ).toBeInTheDocument();
    });

    it("should render narration textarea", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Optional narration text for this beat...")
      ).toBeInTheDocument();
    });

    it("should render sfx input", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("e.g., thunder, footsteps...")
      ).toBeInTheDocument();
    });

    it("should render camera angle dropdown with all options", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(screen.getByText("Wide Shot")).toBeInTheDocument();
      expect(screen.getByText("Medium Shot")).toBeInTheDocument();
      expect(screen.getByText("Close-Up")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("BeatEditor - Validation", () => {
  describe("Visual Description", () => {
    it("should disable submit when visual description is empty", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const submitButton = screen.getByRole("button", { name: "Create Beat" });
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit when visual description is too short", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, { target: { value: "short" } });

      const submitButton = screen.getByRole("button", { name: "Create Beat" });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit when visual description meets minimum length", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, { target: { value: "This is a valid description that is long enough" } });

      const submitButton = screen.getByRole("button", { name: "Create Beat" });
      expect(submitButton).not.toBeDisabled();
    });

    it("should show character count", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, { target: { value: "12345" } });

      expect(screen.getByText("(5/10)")).toBeInTheDocument();
    });
  });

  describe("Dirty State in Edit Mode", () => {
    it("should disable save when no changes made", () => {
      const beat = createMockBeat();
      renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      expect(submitButton).toBeDisabled();
    });

    it("should enable save when changes are made", () => {
      const beat = createMockBeat();
      renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat} />);

      const toneInput = screen.getByPlaceholderText(
        "e.g., tense, hopeful, melancholic..."
      );
      fireEvent.change(toneInput, { target: { value: "new tone" } });

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      expect(submitButton).not.toBeDisabled();
    });
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe("BeatEditor - Interactions", () => {
  describe("Beat Type Selection", () => {
    it("should toggle beat type when clicked", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const setupButton = screen.getByRole("button", { name: /Setup/ });

      fireEvent.click(setupButton);
      // After clicking, the button should be active (we can check via class)
      expect(setupButton.className).toContain("active");
    });

    it("should deselect beat type when clicked again", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} />);
      const setupButton = screen.getByRole("button", { name: /Setup/ });

      fireEvent.click(setupButton);
      fireEvent.click(setupButton);
      expect(setupButton.className).not.toContain("active");
    });
  });

  describe("Form Submission", () => {
    it("should call onSubmit with form data in create mode", () => {
      const onSubmit = vi.fn();
      renderWithQueryClient(<BeatEditor {...defaultProps} onSubmit={onSubmit} />);

      // Fill in required field
      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, {
        target: { value: "Valid description for the beat" },
      });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: "Create Beat" }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: "story-456",
          visualDescription: "Valid description for the beat",
        })
      );
    });

    it("should call onSubmit with id in edit mode", () => {
      const onSubmit = vi.fn();
      const beat = createMockBeat();
      renderWithQueryClient(<BeatEditor {...defaultProps} onSubmit={onSubmit} beat={beat} />);

      // Make a change
      const toneInput = screen.getByPlaceholderText(
        "e.g., tense, hopeful, melancholic..."
      );
      fireEvent.change(toneInput, { target: { value: "new tone" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "beat-123",
        })
      );
    });
  });

  describe("Close Modal", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();
      renderWithQueryClient(<BeatEditor {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when cancel button is clicked", () => {
      const onClose = vi.fn();
      renderWithQueryClient(<BeatEditor {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when overlay is clicked", () => {
      const onClose = vi.fn();
      renderWithQueryClient(<BeatEditor {...defaultProps} onClose={onClose} />);

      // The dialog role is on the overlay itself
      const overlay = screen.getByRole("dialog");
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when Escape key is pressed", () => {
      const onClose = vi.fn();
      renderWithQueryClient(<BeatEditor {...defaultProps} onClose={onClose} />);

      // The dialog role is on the overlay itself
      const overlay = screen.getByRole("dialog");
      fireEvent.keyDown(overlay, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Pending State", () => {
    it("should show Creating... when isPending in create mode", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} isPending={true} />);

      // First enable the button by adding valid description
      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, {
        target: { value: "Valid description for beat" },
      });

      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });

    it("should show Saving... when isPending in edit mode", () => {
      const beat = createMockBeat();
      renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat} isPending={true} />);

      // Make a change
      const toneInput = screen.getByPlaceholderText(
        "e.g., tense, hopeful, melancholic..."
      );
      fireEvent.change(toneInput, { target: { value: "new" } });

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("should disable submit button when isPending", () => {
      renderWithQueryClient(<BeatEditor {...defaultProps} isPending={true} />);

      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, {
        target: { value: "Valid description for beat" },
      });

      const submitButton = screen.getByRole("button", { name: "Creating..." });
      expect(submitButton).toBeDisabled();
    });
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("BeatEditor - Accessibility", () => {
  it("should have proper dialog role", () => {
    renderWithQueryClient(<BeatEditor {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should have aria-modal attribute", () => {
    renderWithQueryClient(<BeatEditor {...defaultProps} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("should have aria-labelledby for title", () => {
    renderWithQueryClient(<BeatEditor {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "beat-editor-title");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("BeatEditor - Edge Cases", () => {
  it("should handle null beat values gracefully", () => {
    const beat = createMockBeat({
      emotionalTone: null,
      narration: null,
      sfx: null,
      cameraAngle: null,
    });
    expect(() => renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat} />)).not.toThrow();
  });

  it("should reset form when modal reopens", () => {
    const { rerender } = renderWithQueryClient(<BeatEditor {...defaultProps} isOpen={false} />);

    // Open modal
    rerender(<BeatEditor {...defaultProps} isOpen={true} />);

    // Fields should be empty
    const textarea = screen.getByPlaceholderText(
      "Describe what should be visually depicted in this beat..."
    );
    expect(textarea).toHaveValue("");
  });

  it("should update form when beat prop changes", () => {
    const beat1 = createMockBeat({ visualDescription: "Description 1" });
    const { rerender } = renderWithQueryClient(<BeatEditor {...defaultProps} beat={beat1} />);

    expect(screen.getByDisplayValue("Description 1")).toBeInTheDocument();

    const beat2 = createMockBeat({ visualDescription: "Description 2" });
    rerender(<BeatEditor {...defaultProps} beat={beat2} />);

    expect(screen.getByDisplayValue("Description 2")).toBeInTheDocument();
  });
});
