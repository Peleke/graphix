/**
 * BeatSection Component Tests
 *
 * Integration tests for the BeatSection component including list rendering,
 * modal state management, and CRUD flow.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BeatSection } from "../BeatSection";
import type { Beat } from "../types";

// ============================================================================
// Mocks
// ============================================================================

const mockCreateBeat = vi.fn();
const mockUpdateBeat = vi.fn();
const mockDeleteBeat = vi.fn();

vi.mock("../../../../api/hooks/useBeats", () => ({
  useCreateBeat: () => ({
    mutateAsync: mockCreateBeat,
    isPending: false,
  }),
  useUpdateBeat: () => ({
    mutateAsync: mockUpdateBeat,
    isPending: false,
  }),
  useDeleteBeat: () => ({
    mutateAsync: mockDeleteBeat,
    isPending: false,
  }),
}));

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

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// ============================================================================
// Setup/Teardown
// ============================================================================

beforeEach(() => {
  mockCreateBeat.mockResolvedValue({ id: "new-beat" });
  mockUpdateBeat.mockResolvedValue({ id: "beat-123" });
  mockDeleteBeat.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Rendering Tests
// ============================================================================

describe("BeatSection - Rendering", () => {
  describe("Header", () => {
    it("should render BEATS title", () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} />
      );
      expect(screen.getByText("BEATS")).toBeInTheDocument();
    });

    it("should render beat count", () => {
      const beats = [createMockBeat(), createMockBeat({ id: "beat-2", position: 2 })];
      const { container } = renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );
      const countElement = container.querySelector(".beat-count");
      expect(countElement).toHaveTextContent("2");
    });

    it("should render Add Beat button", () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} />
      );
      expect(screen.getByText("+ Add Beat")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state message when no beats", () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} />
      );
      expect(
        screen.getByText('No beats yet. Click "+ Add Beat" to create your first story beat.')
      ).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show loading message when isLoading is true", () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} isLoading={true} />
      );
      expect(screen.getByText("Loading beats...")).toBeInTheDocument();
    });
  });

  describe("Beat List", () => {
    it("should render beat cards for each beat", () => {
      const beats = [
        createMockBeat({ id: "beat-1", position: 1, visualDescription: "First beat" }),
        createMockBeat({ id: "beat-2", position: 2, visualDescription: "Second beat" }),
      ];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      expect(screen.getByText("First beat")).toBeInTheDocument();
      expect(screen.getByText("Second beat")).toBeInTheDocument();
    });

    it("should sort beats by position", () => {
      const beats = [
        createMockBeat({ id: "beat-2", position: 2, visualDescription: "Second" }),
        createMockBeat({ id: "beat-1", position: 1, visualDescription: "First" }),
        createMockBeat({ id: "beat-3", position: 3, visualDescription: "Third" }),
      ];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      const descriptions = screen.getAllByText(/First|Second|Third/);
      expect(descriptions[0]).toHaveTextContent("First");
      expect(descriptions[1]).toHaveTextContent("Second");
      expect(descriptions[2]).toHaveTextContent("Third");
    });
  });
});

// ============================================================================
// Modal State Tests
// ============================================================================

describe("BeatSection - Modal State", () => {
  describe("Create Modal", () => {
    it("should open create modal when Add Beat is clicked", () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} />
      );

      fireEvent.click(screen.getByText("+ Add Beat"));
      expect(screen.getByRole("heading", { name: "Create Beat" })).toBeInTheDocument();
    });

    it("should close create modal when Cancel is clicked", () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} />
      );

      fireEvent.click(screen.getByText("+ Add Beat"));
      fireEvent.click(screen.getByText("Cancel"));

      expect(screen.queryByRole("heading", { name: "Create Beat" })).not.toBeInTheDocument();
    });
  });

  describe("Edit Modal", () => {
    it("should open edit modal when edit button is clicked", () => {
      const beats = [createMockBeat()];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      fireEvent.click(screen.getByRole("button", { name: "Edit beat" }));
      expect(screen.getByRole("heading", { name: "Edit Beat" })).toBeInTheDocument();
    });

    it("should populate edit modal with beat data", () => {
      const beats = [createMockBeat({ visualDescription: "Test description" })];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      fireEvent.click(screen.getByRole("button", { name: "Edit beat" }));
      expect(screen.getByDisplayValue("Test description")).toBeInTheDocument();
    });
  });

  describe("Delete Modal", () => {
    it("should open delete confirmation when delete button is clicked", () => {
      const beats = [createMockBeat()];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete beat" }));
      expect(screen.getByRole("heading", { name: "Delete Beat" })).toBeInTheDocument();
      expect(
        screen.getByText("Are you sure you want to delete this beat? This action cannot be undone.")
      ).toBeInTheDocument();
    });

    it("should close delete modal when Cancel is clicked", () => {
      const beats = [createMockBeat()];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete beat" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("heading", { name: "Delete Beat" })).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// CRUD Flow Tests
// ============================================================================

describe("BeatSection - CRUD Flow", () => {
  describe("Create", () => {
    it("should call createBeat mutation on submit", async () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} />
      );

      // Open modal
      fireEvent.click(screen.getByText("+ Add Beat"));

      // Fill in description
      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, {
        target: { value: "New beat description here" },
      });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: "Create Beat" }));

      await waitFor(() => {
        expect(mockCreateBeat).toHaveBeenCalledWith(
          expect.objectContaining({
            storyId: "story-456",
            visualDescription: "New beat description here",
            position: 1,
          })
        );
      });
    });

    it("should close modal after successful create", async () => {
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={[]} />
      );

      fireEvent.click(screen.getByText("+ Add Beat"));

      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, {
        target: { value: "New beat description" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Beat" }));

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Create Beat" })).not.toBeInTheDocument();
      });
    });

    it("should calculate correct position for new beat", async () => {
      const beats = [
        createMockBeat({ position: 5 }),
        createMockBeat({ id: "beat-2", position: 3 }),
      ];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      fireEvent.click(screen.getByText("+ Add Beat"));

      const textarea = screen.getByPlaceholderText(
        "Describe what should be visually depicted in this beat..."
      );
      fireEvent.change(textarea, {
        target: { value: "New beat description" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Beat" }));

      await waitFor(() => {
        expect(mockCreateBeat).toHaveBeenCalledWith(
          expect.objectContaining({
            position: 6, // max(5, 3) + 1
          })
        );
      });
    });
  });

  describe("Update", () => {
    it("should call updateBeat mutation on save", async () => {
      const beats = [createMockBeat()];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      // Open edit modal
      fireEvent.click(screen.getByRole("button", { name: "Edit beat" }));

      // Make a change
      const toneInput = screen.getByPlaceholderText(
        "e.g., tense, hopeful, melancholic..."
      );
      fireEvent.change(toneInput, { target: { value: "new tone" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockUpdateBeat).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "beat-123",
            storyId: "story-456",
          })
        );
      });
    });
  });

  describe("Delete", () => {
    it("should call deleteBeat mutation on confirm", async () => {
      const beats = [createMockBeat()];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      // Open delete modal
      fireEvent.click(screen.getByRole("button", { name: "Delete beat" }));

      // Confirm delete
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(mockDeleteBeat).toHaveBeenCalledWith({
          id: "beat-123",
          storyId: "story-456",
        });
      });
    });

    it("should close delete modal after successful delete", async () => {
      const beats = [createMockBeat()];
      renderWithQueryClient(
        <BeatSection storyId="story-456" beats={beats} />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete beat" }));
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Delete Beat" })).not.toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("BeatSection - Edge Cases", () => {
  it("should handle empty beats array", () => {
    expect(() =>
      renderWithQueryClient(<BeatSection storyId="story-456" beats={[]} />)
    ).not.toThrow();
  });

  it("should handle large number of beats", () => {
    const beats = Array.from({ length: 100 }, (_, i) =>
      createMockBeat({
        id: `beat-${i}`,
        position: i + 1,
        visualDescription: `Beat ${i + 1}`,
      })
    );

    const { container } = renderWithQueryClient(
      <BeatSection storyId="story-456" beats={beats} />
    );

    const countElement = container.querySelector(".beat-count");
    expect(countElement).toHaveTextContent("100");
  });

  it("should handle mutation failure gracefully", async () => {
    mockCreateBeat.mockRejectedValueOnce(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithQueryClient(
      <BeatSection storyId="story-456" beats={[]} />
    );

    fireEvent.click(screen.getByText("+ Add Beat"));

    const textarea = screen.getByPlaceholderText(
      "Describe what should be visually depicted in this beat..."
    );
    fireEvent.change(textarea, {
      target: { value: "New beat description" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Beat" }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save beat:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});
