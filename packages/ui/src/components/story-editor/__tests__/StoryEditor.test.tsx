/**
 * StoryEditor Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoryEditor } from "../StoryEditor";

// ============================================================================
// Mocks
// ============================================================================

const mockPremises = [
  { id: "p1", logline: "A revenge story", genre: "noir", tone: "dark" },
  { id: "p2", logline: "A love story", genre: "romance", tone: "warm" },
];

const mockStories = [
  { id: "s1", premiseId: "p1", structure: "three-act", status: "draft" },
];

const mockBeats = [
  { id: "b1", storyId: "s1", position: 0, beatType: "setup", visualDescription: "Dark alley" },
];

const mockCreatePremise = { mutateAsync: vi.fn(), isPending: false };
const mockCreateStory = { mutateAsync: vi.fn(), isPending: false };

vi.mock("../../../api/hooks/useProjects", () => ({
  useProject: () => ({ data: { id: "proj-1", name: "Test Project" } }),
}));

vi.mock("../../../api/hooks/useStories", () => ({
  usePremises: (projectId: string) => ({
    data: projectId ? mockPremises : [],
    isLoading: false,
  }),
  useStories: (premiseId: string | null) => ({
    data: premiseId ? mockStories : [],
    isLoading: false,
  }),
  useBeats: (storyId: string | null) => ({
    data: storyId ? mockBeats : [],
    isLoading: false,
  }),
  useCreatePremise: () => mockCreatePremise,
  useCreateStory: () => mockCreateStory,
}));

vi.mock("../beats", () => ({
  BeatSection: ({ storyId, beats }: any) => (
    <div data-testid="beat-section">
      BeatSection: {beats.length} beats for {storyId}
    </div>
  ),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("StoryEditor", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Header", () => {
    it("renders project name", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    it("renders subtitle text", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("Edit narrative, structure, and beats")).toBeInTheDocument();
    });

    it("renders view mode toggle buttons", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("Outline")).toBeInTheDocument();
      expect(screen.getByText("Tree")).toBeInTheDocument();
      expect(screen.getByText("Kanban")).toBeInTheDocument();
    });

    it("renders New Premise button", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("+ New Premise")).toBeInTheDocument();
    });
  });

  describe("Premise Sidebar", () => {
    it("renders PREMISES header", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("PREMISES")).toBeInTheDocument();
    });

    it("renders premise items", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("A revenge story")).toBeInTheDocument();
      expect(screen.getByText("A love story")).toBeInTheDocument();
    });

    it("renders premise genre and tone metadata", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("noir • dark")).toBeInTheDocument();
      expect(screen.getByText("romance • warm")).toBeInTheDocument();
    });

    it("shows stories when a premise is clicked", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("A revenge story"));
      expect(screen.getByText("Stories")).toBeInTheDocument();
    });
  });

  describe("Main Content", () => {
    it("shows select premise prompt when none selected", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      expect(screen.getByText("Select a premise")).toBeInTheDocument();
    });

    it("shows stories section after selecting a premise", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("A revenge story"));
      expect(screen.getByText("three-act")).toBeInTheDocument();
    });

    it("shows + New Story button when premise is selected", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("A revenge story"));
      expect(screen.getByText("+ New Story")).toBeInTheDocument();
    });

    it("shows BeatSection when a story is clicked", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("A revenge story"));
      fireEvent.click(screen.getByText("three-act"));
      expect(screen.getByTestId("beat-section")).toBeInTheDocument();
    });
  });

  describe("Create Premise Modal", () => {
    it("opens modal on + New Premise click", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("+ New Premise"));
      expect(screen.getByText("Create Premise")).toBeInTheDocument();
    });

    it("shows logline, genre, and tone inputs", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("+ New Premise"));
      expect(screen.getByPlaceholderText("Logline (required)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Genre (optional)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Tone (optional)")).toBeInTheDocument();
    });

    it("closes modal on Cancel click", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("+ New Premise"));
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByText("Create Premise")).not.toBeInTheDocument();
    });

    it("disables Create button when logline is empty", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("+ New Premise"));
      const createBtn = screen.getByText("Create");
      expect(createBtn).toBeDisabled();
    });

    it("enables Create button when logline has text", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("+ New Premise"));
      fireEvent.change(screen.getByPlaceholderText("Logline (required)"), {
        target: { value: "A new story" },
      });
      const createBtn = screen.getByText("Create");
      expect(createBtn).not.toBeDisabled();
    });

    it("calls createPremise on Create click", async () => {
      mockCreatePremise.mutateAsync.mockResolvedValueOnce({});
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("+ New Premise"));
      fireEvent.change(screen.getByPlaceholderText("Logline (required)"), {
        target: { value: "A new premise" },
      });
      fireEvent.click(screen.getByText("Create"));
      await waitFor(() => {
        expect(mockCreatePremise.mutateAsync).toHaveBeenCalledWith({
          projectId: "proj-1",
          logline: "A new premise",
          genre: undefined,
          tone: undefined,
        });
      });
    });
  });

  describe("Create Story Modal", () => {
    it("opens story modal on + New Story click", () => {
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("A revenge story"));
      fireEvent.click(screen.getByText("+ New Story"));
      // Modal has h2 "Create Story" and description text
      expect(screen.getByText(/structured story from the selected premise/)).toBeInTheDocument();
    });

    it("calls createStory on modal Create Story click", async () => {
      mockCreateStory.mutateAsync.mockResolvedValueOnce({});
      renderWithQueryClient(<StoryEditor projectId="proj-1" />);
      fireEvent.click(screen.getByText("A revenge story"));
      fireEvent.click(screen.getByText("+ New Story"));
      // There are multiple "Create Story" elements; find the button in modal
      const buttons = screen.getAllByText("Create Story");
      const modalButton = buttons.find((el) => el.tagName === "BUTTON" && el.closest(".modal"));
      fireEvent.click(modalButton || buttons[buttons.length - 1]);
      await waitFor(() => {
        expect(mockCreateStory.mutateAsync).toHaveBeenCalledWith({
          premiseId: "p1",
          structure: "three-act",
        });
      });
    });
  });
});
