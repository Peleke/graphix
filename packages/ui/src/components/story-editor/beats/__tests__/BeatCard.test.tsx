/**
 * BeatCard Component Tests
 *
 * Tests for the BeatCard component's rendering and interactions.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BeatCard } from "../BeatCard";
import type { Beat } from "../types";

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
    narration: null,
    sfx: null,
    cameraAngle: "medium",
    panelId: null,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z",
    ...overrides,
  };
}

// ============================================================================
// Setup/Teardown
// ============================================================================

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Rendering Tests
// ============================================================================

describe("BeatCard - Rendering", () => {
  describe("Basic Rendering", () => {
    it("should render beat position", () => {
      const beat = createMockBeat({ position: 3 });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should render beat type label", () => {
      const beat = createMockBeat({ beatType: "climax" });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("Climax")).toBeInTheDocument();
    });

    it("should render beat type icon", () => {
      const beat = createMockBeat({ beatType: "setup" });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("🎬")).toBeInTheDocument();
    });

    it("should render visual description", () => {
      const beat = createMockBeat({ visualDescription: "Test description" });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should render General for null beat type", () => {
      const beat = createMockBeat({ beatType: null });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("General")).toBeInTheDocument();
    });

    it("should render default icon for null beat type", () => {
      const beat = createMockBeat({ beatType: null });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("📝")).toBeInTheDocument();
    });
  });

  describe("Description Truncation", () => {
    it("should truncate long descriptions", () => {
      const longDescription = "A".repeat(150);
      const beat = createMockBeat({ visualDescription: longDescription });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);

      const truncated = screen.getByText(/^A+\.\.\.$/);
      expect(truncated).toBeInTheDocument();
      expect(truncated.textContent?.length).toBeLessThan(150);
    });

    it("should not truncate short descriptions", () => {
      const shortDescription = "Short text";
      const beat = createMockBeat({ visualDescription: shortDescription });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("Short text")).toBeInTheDocument();
    });
  });

  describe("Panel Link Indicator", () => {
    it("should show linked indicator when panelId is set", () => {
      const beat = createMockBeat({ panelId: "panel-789" });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByText("Linked")).toBeInTheDocument();
    });

    it("should not show linked indicator when panelId is null", () => {
      const beat = createMockBeat({ panelId: null });
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.queryByText("Linked")).not.toBeInTheDocument();
    });
  });

  describe("Beat Types", () => {
    const beatTypes = [
      { type: "setup", icon: "🎬", label: "Setup" },
      { type: "inciting", icon: "💥", label: "Inciting Incident" },
      { type: "rising", icon: "📈", label: "Rising Action" },
      { type: "midpoint", icon: "🔄", label: "Midpoint" },
      { type: "complication", icon: "⚡", label: "Complication" },
      { type: "crisis", icon: "🔥", label: "Crisis" },
      { type: "climax", icon: "🎯", label: "Climax" },
      { type: "resolution", icon: "✅", label: "Resolution" },
      { type: "denouement", icon: "🌅", label: "Denouement" },
    ] as const;

    beatTypes.forEach(({ type, icon, label }) => {
      it(`should render ${type} beat correctly`, () => {
        const beat = createMockBeat({ beatType: type });
        render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByText(icon)).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe("BeatCard - Interactions", () => {
  describe("Edit Button", () => {
    it("should call onEdit when edit button is clicked", () => {
      const beat = createMockBeat();
      const onEdit = vi.fn();
      render(<BeatCard beat={beat} onEdit={onEdit} onDelete={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "Edit beat" }));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("should render edit button with correct aria-label", () => {
      const beat = createMockBeat();
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Edit beat" })).toBeInTheDocument();
    });
  });

  describe("Delete Button", () => {
    it("should call onDelete when delete button is clicked", () => {
      const beat = createMockBeat();
      const onDelete = vi.fn();
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={onDelete} />);

      fireEvent.click(screen.getByRole("button", { name: "Delete beat" }));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("should render delete button with correct aria-label", () => {
      const beat = createMockBeat();
      render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Delete beat" })).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("BeatCard - Edge Cases", () => {
  it("should handle exactly 100 character description without truncation", () => {
    const description = "A".repeat(100);
    const beat = createMockBeat({ visualDescription: description });
    render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("should handle 101 character description with truncation", () => {
    const description = "A".repeat(101);
    const beat = createMockBeat({ visualDescription: description });
    render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("A".repeat(100) + "...")).toBeInTheDocument();
  });

  it("should handle position 0", () => {
    const beat = createMockBeat({ position: 0 });
    render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should handle very large position numbers", () => {
    const beat = createMockBeat({ position: 999 });
    render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("should handle special characters in description", () => {
    const beat = createMockBeat({
      visualDescription: '<script>alert("xss")</script>',
    });
    render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
  });

  it("should handle unicode in description", () => {
    const beat = createMockBeat({
      visualDescription: "日本語テスト 🎨",
    });
    render(<BeatCard beat={beat} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("日本語テスト 🎨")).toBeInTheDocument();
  });
});
