/**
 * Upload Path Definitions
 *
 * OpenAPI path definitions for upload endpoints.
 */

export const uploadPaths: Record<string, any> = {
  "/uploads/image": {
    post: {
      tags: ["Uploads"],
      summary: "Upload reference image",
      description: "Uploads an image for ControlNet reference usage.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: { $ref: "#/components/schemas/UploadImageRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Upload successful",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UploadImageResponse" },
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
};
