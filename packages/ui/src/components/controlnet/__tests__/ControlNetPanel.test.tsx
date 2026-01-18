/**
 * ControlNetPanel Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ControlNetPanel } from "../ControlNetPanel";

vi.mock("../../../api/hooks/useControlNet", () => ({
  useControlNetPresets: () => ({ data: { presets: [] } }),
  useControlNetTypes: () => ({ data: { types: [] } }),
  useControlNetPreview: () => ({ mutateAsync: vi.fn() }),
  buildControlNetFromPreset: (_preset: any, _image: string) => [],
}));

vi.mock("../../../api/hooks/useUploads", () => ({
  useUploadImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

  it("renders ControlNet container and toggles a control", () => {
    const onChange = vi.fn();
    render(
      <ControlNetPanel
        panelId="panel-1"
        projectId="project-1"
        referenceImages={mockReferenceImages}
        onChange={onChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId("controlnet-container")).toBeInTheDocument();
    const openPoseCard = screen.getByTestId("control-card-openpose");
    const toggle = openPoseCard.querySelector('[role="switch"]') as HTMLElement;

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalled();
  });

  it("applies a reference image to controls", () => {
    const onChange = vi.fn();
    render(
      <ControlNetPanel
        panelId="panel-2"
        projectId="project-1"
        referenceImages={mockReferenceImages}
        onChange={onChange}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByTestId("history-card-gen-1"));
    fireEvent.click(screen.getByTestId("control-card-openpose").querySelector('[role="switch"]') as HTMLElement);

    expect(onChange).toHaveBeenCalled();
  });
});
