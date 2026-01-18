/**
 * Upload Hooks
 *
 * Multipart upload utilities for reference images.
 */

import { useMutation } from "@tanstack/react-query";

interface UploadImageResponse {
  success: boolean;
  filename: string;
  mimeType: string;
  path: string;
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadImageResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Failed to upload image");
      }

      return response.json();
    },
  });
}
