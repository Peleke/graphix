/**
 * Upload Hooks Tests
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUploadImage } from "../useUploads";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useUploadImage", () => {
  it("uploads file via fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        filename: "file.png",
        mimeType: "image/png",
        path: "/output/uploads/file.png",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useUploadImage(), { wrapper: createWrapper() });
    const file = new File(["content"], "ref.png", { type: "image/png" });

    const response = await result.current.mutateAsync(file);

    expect(mockFetch).toHaveBeenCalledWith("/api/uploads/image", expect.any(Object));
    expect(response.success).toBe(true);

    vi.unstubAllGlobals();
  });
});
