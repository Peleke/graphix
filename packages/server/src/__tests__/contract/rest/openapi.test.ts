/**
 * Contract Tests: OpenAPI Specification
 *
 * Tests the OpenAPI documentation endpoints for correct spec generation,
 * schema validity, and Swagger UI availability.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import { setupTestDatabase, teardownTestDatabase } from "@graphix/core/testing";

describe("REST /api/docs", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/docs/spec.json
  // ============================================================================

  describe("GET /api/docs/spec.json", () => {
    it("returns 200 with valid OpenAPI spec", async () => {
      const res = await app.request("/api/docs/spec.json");

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const spec = await res.json();
      expect(spec).toHaveProperty("openapi");
      expect(spec.openapi).toMatch(/^3\.0\./);
    });

    it("includes correct API info", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      expect(spec.info).toHaveProperty("title", "Graphix API");
      expect(spec.info).toHaveProperty("version");
      expect(spec.info).toHaveProperty("description");
      expect(spec.info.description).toContain("comic generation");
    });

    it("includes server definition", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      expect(spec.servers).toBeArray();
      expect(spec.servers.length).toBeGreaterThan(0);
      expect(spec.servers[0]).toHaveProperty("url", "/api");
    });

    it("includes API tags", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      expect(spec.tags).toBeArray();
      const tagNames = spec.tags.map((t: any) => t.name);
      expect(tagNames).toContain("Projects");
      expect(tagNames).toContain("Characters");
      expect(tagNames).toContain("Storyboards");
      expect(tagNames).toContain("Panels");
    });

    it("includes paths for project endpoints", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      expect(spec.paths).toHaveProperty("/projects");
      expect(spec.paths).toHaveProperty("/projects/{id}");
    });

    it("defines GET /projects operation", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const listOp = spec.paths["/projects"].get;
      expect(listOp).toHaveProperty("tags");
      expect(listOp.tags).toContain("Projects");
      expect(listOp).toHaveProperty("summary");
      expect(listOp).toHaveProperty("parameters");
      expect(listOp).toHaveProperty("responses");
      expect(listOp.responses).toHaveProperty("200");
    });

    it("defines POST /projects operation", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const createOp = spec.paths["/projects"].post;
      expect(createOp).toHaveProperty("tags");
      expect(createOp.tags).toContain("Projects");
      expect(createOp).toHaveProperty("requestBody");
      expect(createOp.requestBody.required).toBe(true);
      expect(createOp).toHaveProperty("responses");
      expect(createOp.responses).toHaveProperty("201");
      expect(createOp.responses).toHaveProperty("400");
    });

    it("defines GET /projects/{id} operation", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const getOp = spec.paths["/projects/{id}"].get;
      expect(getOp).toHaveProperty("parameters");
      expect(getOp.parameters).toBeArray();
      expect(getOp.parameters[0].name).toBe("id");
      expect(getOp.parameters[0].in).toBe("path");
      expect(getOp.parameters[0].required).toBe(true);
      expect(getOp.responses).toHaveProperty("200");
      expect(getOp.responses).toHaveProperty("404");
    });

    it("defines PUT /projects/{id} operation", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const updateOp = spec.paths["/projects/{id}"].put;
      expect(updateOp).toHaveProperty("parameters");
      expect(updateOp).toHaveProperty("requestBody");
      expect(updateOp.responses).toHaveProperty("200");
      expect(updateOp.responses).toHaveProperty("404");
    });

    it("defines DELETE /projects/{id} operation", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const deleteOp = spec.paths["/projects/{id}"].delete;
      expect(deleteOp).toHaveProperty("parameters");
      expect(deleteOp.responses).toHaveProperty("204");
      expect(deleteOp.responses).toHaveProperty("404");
    });

    it("defines PATCH /projects/{id} operation", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const patchOp = spec.paths["/projects/{id}"].patch;
      expect(patchOp).toHaveProperty("tags");
      expect(patchOp.tags).toContain("Projects");
      expect(patchOp).toHaveProperty("parameters");
      expect(patchOp.parameters[0].name).toBe("id");
      expect(patchOp.parameters[0].in).toBe("path");
      expect(patchOp.parameters[0].required).toBe(true);
      expect(patchOp).toHaveProperty("requestBody");
      expect(patchOp.requestBody.required).toBe(true);
      expect(patchOp.responses).toHaveProperty("200");
      expect(patchOp.responses).toHaveProperty("400");
      expect(patchOp.responses).toHaveProperty("404");
    });

    it("includes component schemas", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      expect(spec.components).toHaveProperty("schemas");
      expect(spec.components.schemas).toHaveProperty("Project");
      expect(spec.components.schemas).toHaveProperty("CreateProject");
      expect(spec.components.schemas).toHaveProperty("UpdateProject");
      expect(spec.components.schemas).toHaveProperty("PaginationMeta");
      expect(spec.components.schemas).toHaveProperty("Error");
    });

    it("Project schema has correct structure", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const projectSchema = spec.components.schemas.Project;
      expect(projectSchema).toHaveProperty("type", "object");
      expect(projectSchema).toHaveProperty("properties");
      expect(projectSchema.properties).toHaveProperty("id");
      expect(projectSchema.properties).toHaveProperty("name");
      expect(projectSchema.properties).toHaveProperty("createdAt");
      expect(projectSchema.properties).toHaveProperty("updatedAt");
    });

    it("CreateProject schema has correct structure", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const createSchema = spec.components.schemas.CreateProject;
      expect(createSchema).toHaveProperty("type", "object");
      expect(createSchema).toHaveProperty("properties");
      expect(createSchema.properties).toHaveProperty("name");
      expect(createSchema).toHaveProperty("required");
      expect(createSchema.required).toContain("name");
    });

    it("PaginationMeta schema has correct structure", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const paginationSchema = spec.components.schemas.PaginationMeta;
      expect(paginationSchema).toHaveProperty("type", "object");
      expect(paginationSchema.properties).toHaveProperty("page");
      expect(paginationSchema.properties).toHaveProperty("limit");
      expect(paginationSchema.properties).toHaveProperty("count");
      expect(paginationSchema.properties).toHaveProperty("hasMore");
    });

    it("Error schema has correct structure", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const errorSchema = spec.components.schemas.Error;
      expect(errorSchema).toHaveProperty("type", "object");
      expect(errorSchema.properties).toHaveProperty("error");
      expect(errorSchema.properties.error.properties).toHaveProperty("message");
      expect(errorSchema.properties.error.properties).toHaveProperty("code");
      // requestId and timestamp are required for debugging
      expect(errorSchema.properties).toHaveProperty("requestId");
      expect(errorSchema.properties).toHaveProperty("timestamp");
    });

    it("pagination parameters are documented", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const params = spec.paths["/projects"].get.parameters;
      const pageParam = params.find((p: any) => p.name === "page");
      const limitParam = params.find((p: any) => p.name === "limit");

      expect(pageParam).toBeDefined();
      expect(pageParam.in).toBe("query");
      expect(pageParam.schema.default).toBe(1);

      expect(limitParam).toBeDefined();
      expect(limitParam.in).toBe("query");
      expect(limitParam.schema.default).toBe(20);
      expect(limitParam.schema.maximum).toBe(100);
    });
  });

  // ============================================================================
  // GET /api/docs (Swagger UI)
  // ============================================================================

  describe("GET /api/docs", () => {
    it("returns 200 with HTML for Swagger UI", async () => {
      const res = await app.request("/api/docs");

      expect(res.status).toBe(200);
      const contentType = res.headers.get("content-type");
      expect(contentType).toContain("text/html");
    });

    it("contains Swagger UI initialization", async () => {
      const res = await app.request("/api/docs");
      const html = await res.text();

      expect(html).toContain("swagger-ui");
    });

    it("references the spec.json endpoint", async () => {
      const res = await app.request("/api/docs");
      const html = await res.text();

      expect(html).toContain("/api/docs/spec.json");
    });
  });

  // ============================================================================
  // Schema Validation Tests
  // ============================================================================

  describe("Schema validation", () => {
    it("spec uses $ref for schema references", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      // Check that responses use $ref to component schemas
      const listResponse =
        spec.paths["/projects"].get.responses["200"].content["application/json"]
          .schema;
      expect(listResponse.properties.data.items.$ref).toBe(
        "#/components/schemas/Project"
      );
      expect(listResponse.properties.pagination.$ref).toBe(
        "#/components/schemas/PaginationMeta"
      );
    });

    it("error responses reference Error schema", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      const errorResponse =
        spec.paths["/projects/{id}"].get.responses["404"].content[
          "application/json"
        ].schema;
      expect(errorResponse.$ref).toBe("#/components/schemas/Error");
    });

    it("all required fields are marked in schemas", async () => {
      const res = await app.request("/api/docs/spec.json");
      const spec = await res.json();

      // CreateProject must require name
      const createSchema = spec.components.schemas.CreateProject;
      expect(createSchema.required).toContain("name");

      // Error must require error object, requestId, and timestamp
      const errorSchema = spec.components.schemas.Error;
      expect(errorSchema.required).toContain("error");
      expect(errorSchema.required).toContain("requestId");
      expect(errorSchema.required).toContain("timestamp");
    });
  });
});
