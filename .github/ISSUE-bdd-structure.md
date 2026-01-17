# Add BDD Structure to Contract Tests

**Labels:** `enhancement`, `testing`, `ui-phase`

**Priority:** Medium

## Description

During the review gauntlet, Test Terrorist identified that contract tests lack BDD-style structure. While we have 196 passing contract tests with good coverage, they would benefit from Given/When/Then structure for better readability and alignment with business requirements.

## Current State
- 196 contract tests across 15 files
- All tests passing
- Good coverage of REST API contracts
- Tests cover error cases, validation, and edge cases

## Proposed Changes

1. **Refactor contract tests to use BDD-style structure:**
   ```typescript
   describe("POST /api/projects", () => {
     describe("Given a valid project request", () => {
       it("When creating a project, Then returns 201 with project data", async () => {
         // test implementation
       });
     });
     
     describe("Given an invalid project request", () => {
       it("When creating a project with missing name, Then returns 400 with validation error", async () => {
         // test implementation
       });
     });
   });
   ```

2. **Add property-based testing for edge cases:**
   - Use a property-based testing library (e.g., `fast-check` or similar)
   - Test boundary conditions, invalid inputs, and edge cases
   - Complement existing Schemathesis fuzz testing with unit-level property tests

## Benefits
- Improved test readability and maintainability
- Better alignment with business requirements
- Property-based tests catch edge cases unit tests might miss
- More comprehensive test coverage

## Timing
Address this when beginning UI layer work, as it will help ensure UI tests follow the same patterns.

## Related Files
- `packages/server/src/__tests__/contract/rest/*.test.ts` (15 files)

## Review Context
Identified by **Test Terrorist** during review gauntlet for `feat/pre-ui-infrastructure` branch.
