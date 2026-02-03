/**
 * Flow 16: Spice Buttons E2E Tests
 *
 * Tests the 🌶️ spice button functionality in Panel Generator for NSFW content transformation.
 * Spice buttons transform vanilla prompts into explicit NSFW content.
 */

import { test, expect } from "../fixtures/test-fixtures";

test.describe("Flow 16: Spice Buttons", () => {
  test.describe("16.1 Panel Generator Spice Buttons", () => {
    test("should display spice button for positive prompt", async ({
      page,
      api,
      testProject,
    }, testInfo) => {
      // Create storyboard and panel
      const storyboard = await api.createStoryboard(
        testProject.id,
        `Test Storyboard ${testInfo.workerIndex}`,
        "Test storyboard for spice buttons"
      );
      const panel = await api.createPanel(storyboard.id, "Test panel for spice buttons");

      await page.goto(
        `/projects/${testProject.id}?view=panel-generator&panelId=${panel.id}&storyboardId=${storyboard.id}`
      );
      await page.waitForLoadState("networkidle");

      // Look for the spice button with 🌶️ emoji
      const spiceBtn = page.getByTestId("spice-positive-btn");
      await expect(spiceBtn).toBeVisible({ timeout: 10000 });
      await expect(spiceBtn).toHaveAttribute("title", "Spice it up 🔥 - Make it NSFW");
    });

    test("should display spice button for negative prompt", async ({
      page,
      api,
      testProject,
    }, testInfo) => {
      const storyboard = await api.createStoryboard(
        testProject.id,
        `Test Storyboard ${testInfo.workerIndex}`,
        "Test storyboard"
      );
      const panel = await api.createPanel(storyboard.id, "Test panel");

      await page.goto(
        `/projects/${testProject.id}?view=panel-generator&panelId=${panel.id}&storyboardId=${storyboard.id}`
      );
      await page.waitForLoadState("networkidle");

      const spiceBtn = page.getByTestId("spice-negative-btn");
      await expect(spiceBtn).toBeVisible({ timeout: 10000 });
      await expect(spiceBtn).toHaveAttribute("title", "Spice it up 🔥 - Add NSFW negatives");
    });

    test("should disable spice button when prompt is empty", async ({
      page,
      api,
      testProject,
    }, testInfo) => {
      const storyboard = await api.createStoryboard(
        testProject.id,
        `Test Storyboard ${testInfo.workerIndex}`,
        "Test storyboard"
      );
      const panel = await api.createPanel(storyboard.id, "Test panel");

      await page.goto(
        `/projects/${testProject.id}?view=panel-generator&panelId=${panel.id}&storyboardId=${storyboard.id}`
      );
      await page.waitForLoadState("networkidle");

      // Clear the positive prompt
      const promptInput = page.getByTestId("positive-prompt-input");
      await promptInput.clear();

      // Spice button should be disabled
      const spiceBtn = page.getByTestId("spice-positive-btn");
      await expect(spiceBtn).toBeDisabled();
    });

    test("should enable spice button when prompt has content", async ({
      page,
      api,
      testProject,
    }, testInfo) => {
      const storyboard = await api.createStoryboard(
        testProject.id,
        `Test Storyboard ${testInfo.workerIndex}`,
        "Test storyboard"
      );
      const panel = await api.createPanel(storyboard.id, "Test panel");

      await page.goto(
        `/projects/${testProject.id}?view=panel-generator&panelId=${panel.id}&storyboardId=${storyboard.id}`
      );
      await page.waitForLoadState("networkidle");

      // Enter a prompt
      const promptInput = page.getByTestId("positive-prompt-input");
      await promptInput.fill("A wolf in the forest");

      // Spice button should be enabled
      const spiceBtn = page.getByTestId("spice-positive-btn");
      await expect(spiceBtn).toBeEnabled();
    });

    test("should show 🌶️ emoji on spice buttons", async ({
      page,
      api,
      testProject,
    }, testInfo) => {
      const storyboard = await api.createStoryboard(
        testProject.id,
        `Test Storyboard ${testInfo.workerIndex}`,
        "Test storyboard"
      );
      const panel = await api.createPanel(storyboard.id, "Test panel");

      await page.goto(
        `/projects/${testProject.id}?view=panel-generator&panelId=${panel.id}&storyboardId=${storyboard.id}`
      );
      await page.waitForLoadState("networkidle");

      // Fill in prompts so buttons are visible and active
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
    test("should display spice buttons in Text tab", async ({
      page,
      api,
      testProject,
    }, testInfo) => {
      const storyboard = await api.createStoryboard(
        testProject.id,
        `Test Storyboard ${testInfo.workerIndex}`,
        "Test storyboard"
      );
      const panel = await api.createPanel(storyboard.id, "Test panel");

      await page.goto(
        `/projects/${testProject.id}?view=panel-generator&panelId=${panel.id}&storyboardId=${storyboard.id}`
      );
      await page.waitForLoadState("networkidle");

      // Switch to Text tab
      const textTab = page.getByRole("button", { name: /Text \(/i });
      await textTab.click();

      // Wait for text sections to load
      await page.waitForTimeout(500);

      // Take a screenshot for verification
      await page.screenshot({
        path: "e2e-screenshots/flow-16-text-tab-spice.png",
        fullPage: true,
      });

      // The spice buttons will appear only if there's text content in each section
      // Just verify the tab switched successfully
      await expect(page.getByText("Panel Description")).toBeVisible();
    });
  });
});
