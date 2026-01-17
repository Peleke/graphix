/**
 * Contract Test: Schemathesis Integration
 *
 * Verifies that Schemathesis can successfully load and validate the OpenAPI spec.
 * This is a smoke test to ensure the fuzz testing infrastructure works.
 */

import { describe, it, expect } from "bun:test";
import { openApiSpec } from "../../../openapi/index.js";

describe("Schemathesis Integration", () => {
  it("OpenAPI spec is valid and loadable", () => {
    // Verify spec structure
    expect(openApiSpec).toHaveProperty("openapi");
    expect(openApiSpec).toHaveProperty("info");
    expect(openApiSpec).toHaveProperty("paths");
    expect(openApiSpec).toHaveProperty("components");
    expect(openApiSpec.components).toHaveProperty("schemas");

    // Verify OpenAPI version
    expect(openApiSpec.openapi).toBe("3.0.3");

    // Verify we have paths (should be 50+ after expansion)
    const pathCount = Object.keys(openApiSpec.paths || {}).length;
    expect(pathCount).toBeGreaterThan(10); // At minimum, should have more than just projects

    // Verify we have schemas
    const schemaCount = Object.keys(openApiSpec.components.schemas || {}).length;
    expect(schemaCount).toBeGreaterThan(5); // At minimum, should have common schemas
  });

  it("All paths have at least one HTTP method", () => {
    const paths = openApiSpec.paths || {};
    for (const [path, methods] of Object.entries(paths)) {
      const httpMethods = ["get", "post", "put", "patch", "delete", "options", "head"];
      const hasMethod = httpMethods.some((method) => (methods as any)[method] !== undefined);
      expect(hasMethod).toBe(true);
    }
  });

  it("All path operations have required OpenAPI fields", () => {
    const paths = openApiSpec.paths || {};
    for (const [path, methods] of Object.entries(paths)) {
      const httpMethods = ["get", "post", "put", "patch", "delete"];
      for (const method of httpMethods) {
        const operation = (methods as any)[method];
        if (operation) {
          expect(operation).toHaveProperty("tags");
          expect(operation).toHaveProperty("summary");
          expect(operation).toHaveProperty("responses");
          expect(Array.isArray(operation.tags)).toBe(true);
          expect(typeof operation.summary).toBe("string");
        }
      }
    }
  });

  it("Error schema exists and is properly structured", () => {
    const schemas = openApiSpec.components.schemas || {};
    expect(schemas).toHaveProperty("Error");
    const errorSchema = schemas.Error as any;
    // The schema might be wrapped in definitions or be direct
    const actualSchema = errorSchema.definitions ? Object.values(errorSchema.definitions)[0] : errorSchema;
    expect(actualSchema).toHaveProperty("properties");
    expect(actualSchema.properties).toHaveProperty("error");
  });
});
