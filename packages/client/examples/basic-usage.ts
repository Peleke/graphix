/**
 * Basic Usage Example
 *
 * Demonstrates how to use the Graphix API client.
 * Run with: npx tsx examples/basic-usage.ts
 */

import { createGraphixClient } from "../src/index.js";
import type { Project, CreateProject, PaginationQuery, ApiError } from "../src/index.js";

// Create a client instance
const client = createGraphixClient({
  baseUrl: "http://localhost:3000/api",
  timeout: 30000, // 30 seconds
});

// ============================================================================
// List Projects with Pagination
// ============================================================================

async function listProjects(pagination?: PaginationQuery) {
  const { data, error } = await client.GET("/projects", {
    params: {
      query: pagination,
    },
  });

  if (error) {
    // error is typed based on the OpenAPI spec
    const apiError = error as ApiError;
    console.error(`Error listing projects: ${apiError.error.message}`);
    console.error(`Error code: ${apiError.error.code}`);
    console.error(`Request ID: ${apiError.requestId}`);
    return null;
  }

  // data is fully typed
  console.log(`Found ${data.data.length} projects (page ${data.pagination.page})`);
  console.log(`Has more: ${data.pagination.hasMore}`);

  return data;
}

// ============================================================================
// Create a Project
// ============================================================================

async function createProject(input: CreateProject): Promise<Project | null> {
  const { data, error } = await client.POST("/projects", {
    body: input,
  });

  if (error) {
    const apiError = error as ApiError;
    console.error(`Error creating project: ${apiError.error.message}`);
    return null;
  }

  // data is typed as Project
  console.log(`Created project: ${data.name} (${data.id})`);
  return data;
}

// ============================================================================
// Get a Single Project
// ============================================================================

async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await client.GET("/projects/{id}", {
    params: {
      path: { id },
    },
  });

  if (error) {
    const apiError = error as ApiError;
    if (apiError.error.code === "NOT_FOUND") {
      console.error(`Project not found: ${id}`);
    } else {
      console.error(`Error: ${apiError.error.message}`);
    }
    return null;
  }

  return data;
}

// ============================================================================
// Update a Project
// ============================================================================

async function updateProject(id: string, updates: { name?: string; description?: string }) {
  const { data, error } = await client.PATCH("/projects/{id}", {
    params: {
      path: { id },
    },
    body: updates,
  });

  if (error) {
    const apiError = error as ApiError;
    console.error(`Error updating project: ${apiError.error.message}`);
    return null;
  }

  console.log(`Updated project: ${data.name}`);
  return data;
}

// ============================================================================
// Delete a Project
// ============================================================================

async function deleteProject(id: string): Promise<boolean> {
  const { error, response } = await client.DELETE("/projects/{id}", {
    params: {
      path: { id },
    },
  });

  if (error) {
    const apiError = error as ApiError;
    console.error(`Error deleting project: ${apiError.error.message}`);
    return false;
  }

  console.log(`Deleted project: ${id}`);
  return response.status === 204;
}

// ============================================================================
// Error Handling Example
// ============================================================================

async function errorHandlingExample() {
  // Attempt to get a non-existent project
  const { data, error } = await client.GET("/projects/{id}", {
    params: {
      path: { id: "non-existent-id" },
    },
  });

  if (error) {
    const apiError = error as ApiError;
    // Type-safe error handling
    switch (apiError.error.code) {
      case "NOT_FOUND":
        console.log("Project not found - expected error");
        break;
      case "INVALID_ID":
        console.log("Invalid ID format");
        break;
      case "VALIDATION_ERROR":
        console.log("Validation failed:", apiError.error.details);
        break;
      default:
        console.log(`Unexpected error: ${apiError.error.code}`);
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("=== Graphix API Client Example ===\n");

  // List existing projects
  console.log("1. Listing projects...");
  const projects = await listProjects({ page: 1, limit: 5 });

  // Create a new project
  console.log("\n2. Creating a project...");
  const newProject = await createProject({
    name: "Example Project",
    description: "Created from the API client example",
    settings: { theme: "dark" },
  });

  if (newProject) {
    // Get the project by ID
    console.log("\n3. Getting project by ID...");
    const fetched = await getProject(newProject.id);
    console.log("Fetched:", fetched?.name);

    // Update the project
    console.log("\n4. Updating project...");
    await updateProject(newProject.id, {
      name: "Updated Example Project",
    });

    // Delete the project
    console.log("\n5. Deleting project...");
    await deleteProject(newProject.id);
  }

  // Error handling
  console.log("\n6. Error handling example...");
  await errorHandlingExample();

  console.log("\n=== Done ===");
}

// Run if executed directly
main().catch(console.error);
