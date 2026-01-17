/**
 * Review Path Definitions
 *
 * OpenAPI path definitions for review endpoints.
 */

export const reviewPaths: Record<string, any> = {
  "/review/images/{imageId}": {
    get: {
      tags: ["Review"],
      summary: "Get latest review",
      description: "Returns the latest review result for an image.",
      parameters: [{ name: "imageId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Review found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ImageReview" },
            },
          },
        },
        "400": {
          description: "Invalid image ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Review not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Review"],
      summary: "Review image",
      description: "Reviews a single generated image for prompt adherence.",
      parameters: [{ name: "imageId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ReviewImage" },
          },
        },
      },
      responses: {
        "200": {
          description: "Review completed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewResult" },
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
        "404": {
          description: "Image not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/review/images/{imageId}/history": {
    get: {
      tags: ["Review"],
      summary: "Get review history",
      description: "Returns the full review history for an image.",
      parameters: [{ name: "imageId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Review history",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  imageId: { type: "string" },
                  reviews: { type: "array", items: { $ref: "#/components/schemas/ImageReview" } },
                  count: { type: "number" },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid image ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/review/panels/{panelId}": {
    post: {
      tags: ["Review"],
      summary: "Review panel",
      description: "Reviews the current/selected image for a panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Review completed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewResult" },
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
        "404": {
          description: "Panel not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/review/panels/{panelId}/auto": {
    post: {
      tags: ["Review"],
      summary: "Auto review and regenerate",
      description: "Runs the autonomous review+regenerate loop for a panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ReviewConfig" },
          },
        },
      },
      responses: {
        "200": {
          description: "Auto review completed",
          content: {
            "application/json": {
              schema: { type: "object" },
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
        "404": {
          description: "Panel not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/review/panels/{panelId}/history": {
    get: {
      tags: ["Review"],
      summary: "Get panel review history",
      description: "Returns all review iterations for a panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Review history",
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        "400": {
          description: "Invalid panel ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/review/storyboards/{id}": {
    post: {
      tags: ["Review"],
      summary: "Batch review storyboard",
      description: "Reviews all panels in a storyboard.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchReview" },
          },
        },
      },
      responses: {
        "200": {
          description: "Batch review completed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchReviewResult" },
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
  "/review/queue": {
    get: {
      tags: ["Review"],
      summary: "Get review queue",
      description: "Returns paginated list of images pending human review.",
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
        { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
      ],
      responses: {
        "200": {
          description: "Review queue",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaginatedReviewQueue" },
            },
          },
        },
      },
    },
  },
  "/review/queue/{reviewId}/approve": {
    post: {
      tags: ["Review"],
      summary: "Approve image",
      description: "Approves an image in the review queue.",
      parameters: [{ name: "reviewId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApproveImage" },
          },
        },
      },
      responses: {
        "200": {
          description: "Image approved",
          content: {
            "application/json": {
              schema: { type: "object" },
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
        "404": {
          description: "Review not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/review/queue/{reviewId}/reject": {
    post: {
      tags: ["Review"],
      summary: "Reject image",
      description: "Rejects an image in the review queue.",
      parameters: [{ name: "reviewId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RejectImage" },
          },
        },
      },
      responses: {
        "200": {
          description: "Image rejected",
          content: {
            "application/json": {
              schema: { type: "object" },
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
        "404": {
          description: "Review not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/review/queue/{reviewId}/regenerate": {
    post: {
      tags: ["Review"],
      summary: "Regenerate image",
      description: "Regenerates an image based on review feedback.",
      parameters: [{ name: "reviewId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RegenerateImageReview" },
          },
        },
      },
      responses: {
        "200": {
          description: "Image regenerated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewResult" },
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
        "404": {
          description: "Review not found",
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
