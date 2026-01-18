/**
 * ControlNet Hooks Tests
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useControlNetPreview } from "../useControlNet";

const mockApiClient = {
  POST: vi.fn(),
};

vi.mock("../../client", () => ({
  apiClient: {
    POST: (...args: any[]) => mockApiClient.POST(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useControlNetPreview", () => {
  it("posts preview request and returns response", async () => {
    mockApiClient.POST.mockResolvedValueOnce({
      data: { success: true, controlType: "openpose", previewPath: "/output/preview.png" },
      error: null,
    });

    const { result } = renderHook(() => useControlNetPreview(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({
      inputImage: "/output/ref.png",
      controlType: "openpose",
    });

    expect(mockApiClient.POST).toHaveBeenCalledWith("/consistency/controlnet/preview", {
      body: { inputImage: "/output/ref.png", controlType: "openpose" },
    });
    expect(response.success).toBe(true);
  });
});
