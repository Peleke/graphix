import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PanelGenerator } from "../PanelGenerator";

vi.mock("../../../api/hooks/usePanels", () => ({
  useGeneratePanel: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGeneratePanelVariants: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSelectPanelOutput: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePanelFull: () => ({
    data: { panel: { id: "panel-1", description: "Test panel" }, generations: [] },
    isLoading: false,
  }),
}));

vi.mock("../../../api/hooks/useGenerations", () => ({
  useGenerationsByPanel: () => ({ data: [], isLoading: false }),
  useRateGeneration: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../api/hooks/useCharacters", () => ({
  useCharacters: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../../api/hooks/useStories", () => ({
  useStoryboard: () => ({ data: { storyboard: { projectId: "project-1" } }, isLoading: false }),
}));

vi.mock("../../../api/hooks/useCaptions", () => ({
  useCaptionsByPanel: () => ({ data: [], isLoading: false }),
  useGenerateCaptions: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../api/hooks/useGeneratedTexts", () => ({
  useGeneratedTextsByPanel: () => ({ data: [], isLoading: false }),
  useActiveGeneratedText: () => ({ data: null, isLoading: false }),
  useCreateGeneratedText: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateGeneratedText: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../generation-tree", () => ({
  GenerationTreeVisualization: () => <div data-testid="generation-tree">Tree Viz</div>,
}));

vi.mock("../../generation-tree/useGenerationTreeData", () => ({
  useGenerationTreeData: () => ({ isLoading: false, error: null, nodeCount: 0 }),
}));

vi.mock("../../../api/hooks/useControlNet", () => ({
  useControlNetTypes: () => ({
    data: {
      types: [
        { type: "openpose", default: 0.8 },
        { type: "depth", default: 0.8 },
      ],
    },
  }),
  useControlNetTypesForFamily: () => ({
    data: {
      types: [
        { type: "openpose", default: 0.8 },
        { type: "depth", default: 0.8 },
      ],
    },
    isLoading: false,
  }),
  useControlNetPresets: () => ({ data: { presets: [] } }),
  useControlNetPreview: () => ({ mutateAsync: vi.fn() }),
  buildControlNetFromPreset: () => [],
}));

vi.mock("../../../api/hooks/useTextGeneration", () => ({
  useGeneratePanelDescription: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ text: "Generated description" }),
    isPending: false,
  }),
}));

vi.mock("../../../api/hooks/useUploads", () => ({
  useUploadImage: () => ({ mutateAsync: vi.fn() }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe("PanelGenerator + ControlNetPanel integration", () => {
  beforeEach(() => {
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

  it("renders ControlNetPanel inside PanelGenerator", () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <PanelGenerator panelId="panel-1" storyboardId="storyboard-1" />
      </QueryClientProvider>
    );

    expect(screen.getByTestId("controlnet-container")).toBeInTheDocument();
  });
});
