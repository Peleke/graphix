/**
 * Batch Operations Path Definitions
 *
 * OpenAPI path definitions for batch operation endpoints.
 */

export const batchPaths: Record<string, any> = {
  "/batch/panels": {
    post: {
      tags: ["Batch"],
      summary: "Batch create panels",
      description: "Creates multiple panels in a storyboard.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchCreatePanels" },
          },
        },
      },
      responses: {
        "201": {
          description: "Panels created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
            },
          },
        },
        "207": {
          description: "Partial success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
    delete: {
      tags: ["Batch"],
      summary: "Batch delete panels",
      description: "Deletes multiple panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchDeletePanels" },
          },
        },
      },
      responses: {
        "200": {
          description: "Panels deleted",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
  "/batch/captions": {
    post: {
      tags: ["Batch"],
      summary: "Batch add captions",
      description: "Adds captions to multiple panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchAddCaptions" },
          },
        },
      },
      responses: {
        "201": {
          description: "Captions added",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
            },
          },
        },
        "207": {
          description: "Partial success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
    delete: {
      tags: ["Batch"],
      summary: "Batch clear captions",
      description: "Clears all captions from multiple panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchClearCaptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Captions cleared",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
  "/batch/generate": {
    post: {
      tags: ["Batch"],
      summary: "Batch generate images",
      description: "Generates images for multiple panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchGenerate" },
          },
        },
      },
      responses: {
        "201": {
          description: "Images generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
            },
          },
        },
        "207": {
          description: "Partial success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
  "/batch/generate/variants": {
    post: {
      tags: ["Batch"],
      summary: "Batch generate variants",
      description: "Generates multiple variants for multiple panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchGenerateVariants" },
          },
        },
      },
      responses: {
        "201": {
          description: "Variants generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
            },
          },
        },
        "207": {
          description: "Partial success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
  "/batch/render": {
    post: {
      tags: ["Batch"],
      summary: "Batch render captions",
      description: "Renders captions for multiple panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchRenderCaptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Captions rendered",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
            },
          },
        },
        "207": {
          description: "Partial success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
  "/batch/select": {
    post: {
      tags: ["Batch"],
      summary: "Batch select outputs",
      description: "Selects outputs for multiple panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchSelectOutputs" },
          },
        },
      },
      responses: {
        "200": {
          description: "Outputs selected",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
  "/batch/select/auto": {
    post: {
      tags: ["Batch"],
      summary: "Batch auto-select outputs",
      description: "Automatically selects outputs for multiple panels based on criteria.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchAutoSelect" },
          },
        },
      },
      responses: {
        "200": {
          description: "Outputs auto-selected",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperationResult" },
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
