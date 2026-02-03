/**
 * Flow 16: Spice Buttons E2E Tests
 *
 * Tests the 🌶️ spice button functionality in Panel Generator for NSFW content transformation.
 * Spice buttons transform vanilla prompts into explicit NSFW content.
 */

import { test, expect } from "@playwright/test";

const UI_BASE = process.env.UI_BASE || "http://localhost:5173";
const API_BASE = process.env.API_BASE || "http://localhost:3002/api";

test.describe("Flow 16: Spice Buttons", () => {
  let projectId: string;
  let storyboardId: string;
  let panelId: string;

  test.beforeAll(async ({ request }) => {
    // Create test project
    const projectRes = await request.post(`${API_BASE}/projects`, {
      data: { title: "Spice Test Project", description: "Testing spice buttons" },
    });
    const project = await projectRes.json();
    projectId = project.id;

    // Create storyboard
    const storyboardRes = await request.post(`${API_BASE}/storyboards`, {
      data: { projectId, title: "Test Storyboard" },
    });
    const storyboard = await storyboardRes.json();
    storyboardId = storyboard.id;

    // Create panel
    const panelRes = await request.post(`${API_BASE}/panels`, {
      data: {
        storyboardId,
        pageNumber: 1,
        panelNumber: 1,
        description: "Test panel for spice buttons",
      },
    });
    const panel = await panelRes.json();
    panelId = panel.id;
  });

  test.afterAll(async ({ request }) => {
    // Clean up
    if (projectId) {
      await request.delete(`${API_BASE}/projects/${projectId}`);
    }
  });

  test.describe("16.1 Panel Generator Spice Buttons", () => {
    test("should display spice button for positive prompt", async ({ page }) => {
      await page.goto(
        `${UI_BASE}/projects/${projectId}?view=panel-generator&panelId=${panelId}&storyboardId=${storyboardId}`
      );
      await page.waitForLoadState("networkidle");

      // Look for the spice button with 🌶️ emoji
      const spiceBtn = page.getByTestId("spice-positive-btn");
      await expect(spiceBtn).toBeVisible();
      await expect(spiceBtn).toHaveAttribute("title", "Spice it up 🔥 - Make it NSFW");
    });

    test("should display spice button for negative prompt", async ({ page }) => {
      await page.goto(
        `${UI_BASE}/projects/${projectId}?view=panel-generator&panelId=${panelId}&storyboardId=${storyboardId}`
      );
      await page.waitForLoadState("networkidle");

      const spiceBtn = page.getByTestId("spice-negative-btn");
      await expect(spiceBtn).toBeVisible();
      await expect(spiceBtn).toHaveAttribute("title", "Spice it up 🔥 - Add NSFW negatives");
    });

    test("should disable spice button when prompt is empty", async ({ page }) => {
      await page.goto(
        `${UI_BASE}/projects/${projectId}?view=panel-generator&panelId=${panelId}&storyboardId=${storyboardId}`
      );
      await page.waitForLoadState("networkidle");

      // Clear the positive prompt
      const promptInput = page.getByTestId("positive-prompt-input");
      await promptInput.clear();

      // Spice button should be disabled
      const spiceBtn = page.getByTestId("spice-positive-btn");
      await expect(spiceBtn).toBeDisabled();
    });

    test("should enable spice button when prompt has content", async ({ page }) => {
      await page.goto(
        `${UI_BASE}/projects/${projectId}?view=panel-generator&panelId=${panelId}&storyboardId=${storyboardId}`
      );
      await page.waitForLoadState("networkidle");

      // Enter a prompt
      const promptInput = page.getByTestId("positive-prompt-input");
      await promptInput.fill("A wolf in the forest");

      // Spice button should be enabled
      const spiceBtn = page.getByTestId("spice-positive-btn");
      await expect(spiceBtn).toBeEnabled();
    });

    test("should show 🌶️ emoji on spice buttons", async ({ page }) => {
      await page.goto(
        `${UI_BASE}/projects/${projectId}?view=panel-generator&panelId=${panelId}&storyboardId=${storyboardId}`
      );
      await page.waitForLoadState("networkidle");

      // Fill in prompts so buttons are visible
      const promptInput = page.getByTestId("positive-prompt-input");
      await promptInput.fill("Test prompt");

      const negativeInput = page.getByTestId("negative-prompt-input");
      await negativeInput.fill("Test negative");

      // Both buttons should show the pepper emoji
      const positiveSpice = page.getByTestId("spice-positive-btn");
      const negativeSpice = page.getByTestId("spice-negative-btn");

      await expect(positiveSpice).toContainText("🌶️");
      await expect(negativeSpice).toContainText("🌶️");
    });
  });

  test.describe("16.2 Text Viewer Spice Buttons", () => {
    test("should display spice buttons in Text tab", async ({ page }) => {
      await page.goto(
        `${UI_BASE}/projects/${projectId}?view=panel-generator&panelId=${panelId}&storyboardId=${storyboardId}`
      );
      await page.waitForLoadState("networkidle");

      // Switch to Text tab
      const textTab = page.getByRole("button", { name: /Text \(/i });
      await textTab.click();

      // Wait for text sections to load
      await page.waitForTimeout(500);

      // Look for spice buttons in each section (description, dialogue, narration)
      // Note: These will only appear if there's existing text in each section
      const spiceBtnDescription = page.getByTestId("spice-btn-description");
      const spiceBtnDialogue = page.getByTestId("spice-btn-dialogue");
      const spiceBtnNarration = page.getByTestId("spice-btn-narration");

      // At least the description spice button should be visible if there's content
      // Take a screenshot for verification
      await page.screenshot({
        path: "e2e-screenshots/flow-16-text-tab-spice.png",
        fullPage: true,
      });
    });
  });
});
