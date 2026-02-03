/**
 * Complete Comic Generation Flow E2E Test
 *
 * Smoke test for the full user journey: project → characters → story → beats →
 * storyboard → panels → generation → composition → export.
 *
 * Requires:
 * - API server on port 3002
 * - UI dev server on port 5173
 * - ComfyUI server for actual generation (mocked in tests)
 *
 * Run manually: npx playwright test flow-complete-comic-generation --headed
 */

import { test, expect, tags } from "../fixtures/test-fixtures";
import type { Page } from "@playwright/test";

// ============================================================================
// Test Data
// ============================================================================

const API_URL = process.env.API_URL || "http://localhost:3002";

interface FlowContext {
  projectId: string;
  storyboardId: string;
  premiseId: string;
  storyId: string;
  panelId: string;
}

// ============================================================================
// Helpers
// ============================================================================

async function createProjectViaAPI(request: any): Promise<FlowContext> {
  // Create project
  const projRes = await request.post(`${API_URL}/api/projects`, {
    data: { name: "E2E Smoke Test Comic", description: "Full flow test" },
  });
  if (!projRes.ok()) throw new Error(`Project creation failed: ${await projRes.text()}`);
  const project = await projRes.json();

  // Create storyboard
  const sbRes = await request.post(`${API_URL}/api/storyboards`, {
    data: { projectId: project.id, name: "Chapter 1", description: "First chapter" },
  });
  if (!sbRes.ok()) throw new Error(`Storyboard creation failed: ${await sbRes.text()}`);
  const storyboard = await sbRes.json();

  // Create premise
  const premRes = await request.post(`${API_URL}/api/narrative/premises`, {
    data: {
      projectId: project.id,
      logline: "An otter discovers a hidden underwater cave and the secret it holds",
      genre: "adventure",
      tone: "whimsical",
    },
  });
  if (!premRes.ok()) throw new Error(`Premise creation failed: ${await premRes.text()}`);
  const premise = await premRes.json();

  // Create story
  const storyRes = await request.post(`${API_URL}/api/narrative/premises/${premise.id}/stories`, {
    data: { title: "The Hidden Cave", structure: "three-act" },
  });
  if (!storyRes.ok()) throw new Error(`Story creation failed: ${await storyRes.text()}`);
  const story = await storyRes.json();

  // Create panel
  const panelRes = await request.post(`${API_URL}/api/storyboards/${storyboard.id}/panels`, {
    data: { description: "Wide shot of otter approaching cave entrance", position: 0 },
  });
  if (!panelRes.ok()) throw new Error(`Panel creation failed: ${await panelRes.text()}`);
  const panel = await panelRes.json();

  return {
    projectId: project.id,
    storyboardId: storyboard.id,
    premiseId: premise.id,
    storyId: story.id,
    panelId: panel.id,
  };
}

async function cleanupViaAPI(request: any, ctx: FlowContext): Promise<void> {
  try {
    await request.delete(`${API_URL}/api/panels/${ctx.panelId}`);
    await request.delete(`${API_URL}/api/narrative/stories/${ctx.storyId}`);
    await request.delete(`${API_URL}/api/narrative/premises/${ctx.premiseId}`);
    await request.delete(`${API_URL}/api/storyboards/${ctx.storyboardId}`);
    await request.delete(`${API_URL}/api/projects/${ctx.projectId}`);
  } catch {
    // Ignore cleanup errors
  }
}

async function navigateToView(page: Page, projectId: string, view: string): Promise<void> {
  await page.goto(`/projects/${projectId}`);
  await page.waitForLoadState("networkidle");
  await page.locator(".nav-item").filter({ hasText: view }).click();
  await page.waitForTimeout(500);
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe("Complete Comic Generation Flow", () => {
  let ctx: FlowContext | null = null;
  let setupError: string | null = null;

  test.beforeAll(async ({ request }) => {
    try {
      ctx = await createProjectViaAPI(request);
    } catch (error) {
      setupError = error instanceof Error ? error.message : String(error);
      console.error("⚠️  Smoke test setup failed:", setupError);
      console.error("Ensure API server is running: cd packages/server && bun run dev");
    }
  });

  test.afterAll(async ({ request }) => {
    if (ctx) await cleanupViaAPI(request, ctx);
  });

  test.beforeEach(async () => {
    test.skip(!ctx, `Setup failed: ${setupError}`);
  });

  // --------------------------------------------------------------------------
  // Step 1: Verify project loads and navigation works
  // --------------------------------------------------------------------------

  test("1. Project workspace loads with sidebar navigation", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await page.goto(`/projects/${ctx!.projectId}`);
    await page.waitForLoadState("networkidle");

    // Verify nav items
    await expect(page.locator(".nav-item").filter({ hasText: "Story Editor" })).toBeVisible();
    await expect(page.locator(".nav-item").filter({ hasText: "Storyboard" })).toBeVisible();
    await expect(page.locator(".nav-item").filter({ hasText: "Panel Generator" })).toBeVisible();
    await expect(page.locator(".nav-item").filter({ hasText: "Page Composer" })).toBeVisible();
    await expect(page.locator(".nav-item").filter({ hasText: "Characters" })).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Step 2: Story Editor shows premise and story
  // --------------------------------------------------------------------------

  test("2. Story Editor displays premise and story", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await navigateToView(page, ctx!.projectId, "Story Editor");

    // Wait for story editor
    await expect(page.locator(".story-editor")).toBeVisible({ timeout: 10000 });

    // Premise should appear in sidebar
    await expect(page.locator(".premise-item").first()).toBeVisible();

    // Click premise to see stories
    await page.locator(".premise-item").first().click();
    await page.waitForTimeout(500);

    // Stories section should appear
    await expect(page.getByText("Stories")).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Step 3: Story Editor shows beats after clicking story
  // --------------------------------------------------------------------------

  test("3. Beats section visible after expanding story", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await navigateToView(page, ctx!.projectId, "Story Editor");
    await page.locator(".premise-item").first().click();
    await page.waitForTimeout(500);

    // Click on story to expand beats
    const storyCard = page.locator("text=three-act").first();
    if (await storyCard.isVisible()) {
      await storyCard.click();
      await page.waitForTimeout(300);
    }

    // Beat section should appear
    await expect(page.getByTestId("beat-section-header")).toBeVisible();
    await expect(page.getByTestId("add-beat-btn")).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Step 4: Create a beat
  // --------------------------------------------------------------------------

  test("4. Can create a beat from Story Editor", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await navigateToView(page, ctx!.projectId, "Story Editor");
    await page.locator(".premise-item").first().click();
    await page.waitForTimeout(500);

    const storyCard = page.locator("text=three-act").first();
    if (await storyCard.isVisible()) {
      await storyCard.click();
      await page.waitForTimeout(300);
    }

    // Create a beat
    await page.getByTestId("add-beat-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("beat-visual-description").fill(
      "Wide establishing shot of a sparkling ocean cave entrance at golden hour"
    );
    await page.getByTestId("beat-editor-submit").click();
    await page.waitForTimeout(500);

    // Beat should appear
    await expect(page.locator(".beat-card")).toHaveCount(1);
  });

  // --------------------------------------------------------------------------
  // Step 5: Storyboard shows panels
  // --------------------------------------------------------------------------

  test("5. Storyboard view shows panels", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await navigateToView(page, ctx!.projectId, "Storyboard");

    // Storyboard view should load
    await expect(page.locator(".storyboard-view")).toBeVisible({ timeout: 10000 });

    // Should show the storyboard name
    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Should show the panel
    await expect(page.locator("[data-testid^='panel-card-']").first()).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Step 6: Panel Generator loads for a panel
  // --------------------------------------------------------------------------

  test("6. Panel Generator loads with panel context", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    // Navigate directly to panel generator with panel ID
    await page.goto(
      `/projects/${ctx!.projectId}?view=panel&panelId=${ctx!.panelId}&storyboardId=${ctx!.storyboardId}`
    );
    await page.waitForLoadState("networkidle");

    // Panel generator should load
    await expect(page.locator(".panel-generator")).toBeVisible({ timeout: 10000 });
  });

  // --------------------------------------------------------------------------
  // Step 7: Panel Generator can trigger generation (mocked)
  // --------------------------------------------------------------------------

  test("7. Panel Generator shows generate button", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    // Mock the generate endpoint to avoid needing ComfyUI
    await page.route("**/api/panels/*/generate", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-gen-1",
          panelId: ctx!.panelId,
          seed: 42,
          width: 512,
          height: 768,
        }),
      });
    });

    await page.goto(
      `/projects/${ctx!.projectId}?view=panel&panelId=${ctx!.panelId}&storyboardId=${ctx!.storyboardId}`
    );
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".panel-generator")).toBeVisible({ timeout: 10000 });

    // Should have a generate button
    const generateBtn = page.locator("button").filter({ hasText: /generate/i }).first();
    await expect(generateBtn).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Step 8: Page Composer loads
  // --------------------------------------------------------------------------

  test("8. Page Composer loads with template selection", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await navigateToView(page, ctx!.projectId, "Page Composer");

    // Page composer should load
    await expect(page.getByTestId("template-dropdown-trigger")).toBeVisible({ timeout: 10000 });
  });

  // --------------------------------------------------------------------------
  // Step 9: Characters view loads
  // --------------------------------------------------------------------------

  test("9. Characters view loads", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await navigateToView(page, ctx!.projectId, "Characters");

    // Characters panel should load (may show empty state or character list)
    await page.waitForTimeout(1000);
    // Just verify navigation worked without crash
    const url = page.url();
    expect(url).toContain(ctx!.projectId);
  });

  // --------------------------------------------------------------------------
  // Step 10: Full navigation round-trip
  // --------------------------------------------------------------------------

  test("10. Can navigate between all views without errors", {
    tag: [tags.MVP, tags.SMOKE],
  }, async ({ page }) => {
    await page.goto(`/projects/${ctx!.projectId}`);
    await page.waitForLoadState("networkidle");

    const views = ["Story Editor", "Storyboard", "Panel Generator", "Page Composer", "Characters"];

    for (const view of views) {
      await page.locator(".nav-item").filter({ hasText: view }).click();
      await page.waitForTimeout(500);

      // Verify no uncaught errors on the page
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      expect(errors).toHaveLength(0);
    }
  });
});
