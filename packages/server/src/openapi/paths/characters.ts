/**
 * Character Path Definitions
 *
 * OpenAPI path definitions for character endpoints.
 */

export const characterPaths: Record<string, any> = {
  "/characters": {
    get: {
      tags: ["Characters"],
      summary: "List characters by project",
      description: "Returns a list of characters for a specific project.",
      parameters: [
        {
          name: "projectId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Project ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "List of characters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CharactersListResponse" },
            },
          },
        },
        "400": {
          description: "Invalid project ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Characters"],
      summary: "Create a new character",
      description: "Creates a new character with the provided details.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateCharacter" },
          },
        },
      },
      responses: {
        "201": {
          description: "Character created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
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
  "/characters/{id}": {
    get: {
      tags: ["Characters"],
      summary: "Get character by ID",
      description: "Returns a single character by its unique identifier.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "Character found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
            },
          },
        },
        "400": {
          description: "Invalid ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Characters"],
      summary: "Update a character",
      description: "Updates an existing character with the provided details.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateCharacter" },
          },
        },
      },
      responses: {
        "200": {
          description: "Character updated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
            },
          },
        },
        "400": {
          description: "Invalid ID format or validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Characters"],
      summary: "Partially update a character",
      description: "Updates specific fields of an existing character. Only provided fields are updated.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateCharacter" },
          },
        },
      },
      responses: {
        "200": {
          description: "Character updated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
            },
          },
        },
        "400": {
          description: "Invalid ID format or validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Characters"],
      summary: "Delete a character",
      description: "Permanently deletes a character and all associated data.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      responses: {
        "204": {
          description: "Character deleted successfully",
        },
        "400": {
          description: "Invalid ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/characters/project/{projectId}": {
    get: {
      tags: ["Characters"],
      summary: "List characters by project",
      description: "Returns all characters for a specific project.",
      parameters: [
        {
          name: "projectId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Project ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "List of characters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CharactersListResponse" },
            },
          },
        },
        "400": {
          description: "Invalid project ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/characters/{id}/references": {
    post: {
      tags: ["Characters"],
      summary: "Add reference image to character",
      description: "Adds a reference image to a character by file path.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AddReference" },
          },
        },
      },
      responses: {
        "200": {
          description: "Reference image added successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
            },
          },
        },
        "400": {
          description: "Invalid ID format or validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Characters"],
      summary: "Remove reference image from character",
      description: "Removes a reference image from a character.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AddReference" },
          },
        },
      },
      responses: {
        "200": {
          description: "Reference image removed successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
            },
          },
        },
        "400": {
          description: "Invalid ID format or validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/characters/{id}/references/upload": {
    post: {
      tags: ["Characters"],
      summary: "Upload reference image",
      description: "Uploads a reference image file for a character (multipart/form-data).",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["image"],
              properties: {
                image: {
                  type: "string",
                  format: "binary",
                  description: "Image file (JPEG, PNG, WebP)",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Image uploaded successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UploadReferenceResponse" },
            },
          },
        },
        "400": {
          description: "Invalid file or validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "413": {
          description: "File too large",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/characters/{id}/lora": {
    post: {
      tags: ["Characters"],
      summary: "Set character LoRA",
      description: "Sets or updates the LoRA configuration for a character.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SetLora" },
          },
        },
      },
      responses: {
        "200": {
          description: "LoRA set successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
            },
          },
        },
        "400": {
          description: "Invalid ID format or validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Characters"],
      summary: "Clear character LoRA",
      description: "Removes the LoRA configuration from a character.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Character ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "LoRA cleared successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Character" },
            },
          },
        },
        "400": {
          description: "Invalid ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Character not found",
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
