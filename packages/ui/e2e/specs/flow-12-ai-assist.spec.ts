/**
 * Flow 12: AI-Assisted Panel Generation
 *
 * E2E tests for AI-powered prompt generation, text viewing capabilities,
 * and the integration of these features into the panel generation workflow.
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 12
 */

import { test, expect, tags } from "../fixtures/test-fixtures";
import type { TestInfo } from "@playwright/test";

const uniqueName = (base: string, testInfo: TestInfo) => {
  const suffix = `${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`;
  return `${base} ${suffix}`;
};

// Mock AI text generation responses
const MOCK_PANEL_DESCRIPTION = {
  text: "A dramatic scene in a moonlit forest, a lone wolf stands atop a rocky outcrop, howling at the full moon. Tall pine trees frame the scene, their silhouettes dark against the starry sky. Mist curls around the base of the rocks, adding mystery to the composition.",
  confidence: 0.92,
  provider: "anthropic",
  model: "claude-3-sonnet",
};

const MOCK_DIALOGUE = {
  dialogue: [
    { characterId: "char-1", characterName: "Luna", line: "The stars speak of change tonight..." },
    { characterId: "char-2", characterName: "Max", line: "I feel it too. Something stirs in the forest." },
  ],
  provider: "anthropic",
  model: "claude-3-sonnet",
};

const MOCK_CAPTIONS = {
  suggestions: [
    { type: "narration", text: "The night was still, save for the whisper of wind through ancient trees.", confidence: 0.88 },
    { type: "speech", text: "We must move quickly...", speakerDescription: "urgent whisper", confidence: 0.85 },
    { type: "thought", text: "Something felt different about this forest.", confidence: 0.82 },
  ],
  count: 3,
  provider: "anthropic",
};

const MOCK_REFINED_TEXT = {
  refined: "A magnificent wolf, silver-furred and powerful, stands sentinel on a weathered granite outcrop. Above, the full moon casts its ethereal glow across the ancient forest, while mist threads between towering pines like ghostly fingers.",
  provider: "anthropic",
  model: "claude-3-sonnet",
};

test.describe("Flow 12: AI-Assisted Panel Generation", () => {
  // ==========================================================================
  // Setup: Mock API responses for deterministic testing
  // ==========================================================================

  test.beforeEach(async ({ page, api, testProject }, testInfo) => {
    // Mock text generation endpoints
    await page.route("**/api/text-generation/panel-description", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate latency
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PANEL_DESCRIPTION),
      });
    });

    await page.route("**/api/text-generation/dialogue", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DIALOGUE),
      });
    });

    await page.route("**/api/text-generation/suggest-captions", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CAPTIONS),
      });
    });

    await page.route("**/api/text-generation/refine", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_REFINED_TEXT),
      });
    });

    // Mock generated texts endpoint
    await page.route("**/api/generated-texts/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ texts: [] }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `text-${Date.now()}`,
            text: "Saved text content",
            textType: "panel_description",
          }),
        });
      }
    });

    // Create test storyboard and panel
    const storyboard = await api.createStoryboard(
      testProject.id,
      uniqueName("AI Assist Test", testInfo),
      "Testing AI-assisted features"
    );
    const panel = await api.createPanel(storyboard.id, "Test panel for AI generation");

    await page.goto(
      `/projects/${testProject.id}?view=panel&panelId=${panel.id}&storyboardId=${storyboard.id}`
    );
    await expect(page.locator(".panel-generator")).toBeVisible({ timeout: 10000 });
  });

  // ==========================================================================
  // 12.1 AI Assist Button
  // ==========================================================================

  test.describe("12.1 AI Assist Button", () => {
    test(
      "should display AI assist button next to positive prompt textarea",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        // Find the positive prompt input
        const promptInput = page.getByTestId("positive-prompt-input");
        await expect(promptInput).toBeVisible();

        // Find the AI assist button near the prompt
        const aiButton = page.getByTestId("ai-assist-button").first();
        await expect(aiButton).toBeVisible();
      }
    );

    test(
      "should display AI assist button next to negative prompt textarea",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page }) => {
        // Find the negative prompt input
        const negativePromptInput = page.getByTestId("negative-prompt-input");
        await expect(negativePromptInput).toBeVisible();

        // There should be 2 AI assist buttons (one for each prompt)
        const aiButtons = page.getByTestId("ai-assist-button");
        await expect(aiButtons).toHaveCount(2);
      }
    );

    test(
      "should show loading state during generation",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        // Click the AI assist button
        const aiButton = page.getByTestId("ai-assist-button").first();
        await aiButton.click();

        // Should show loading spinner or generating text
        await expect(page.getByText("Generating...")).toBeVisible();
      }
    );

    test(
      "should open suggestion dropdown on click",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        const aiButton = page.getByTestId("ai-assist-button").first();
        await aiButton.click();

        // Wait for generation to complete
        await expect(page.getByTestId("ai-assist-dropdown")).toBeVisible({ timeout: 5000 });

        // Should show the generated suggestion
        await expect(page.getByText(/dramatic scene/i)).toBeVisible();
      }
    );
  });

  // ==========================================================================
  // 12.2 Prompt Generation
  // ==========================================================================

  test.describe("12.2 Prompt Generation", () => {
    test(
      "should generate prompt based on panel context",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        const aiButton = page.getByTestId("ai-assist-button").first();
        await aiButton.click();

        // Wait for dropdown to appear with suggestion
        await expect(page.getByTestId("ai-assist-dropdown")).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/moonlit forest/i)).toBeVisible();
      }
    );

    test(
      "should insert prompt into textarea on 'Use This'",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        const promptInput = page.getByTestId("positive-prompt-input");
        const aiButton = page.getByTestId("ai-assist-button").first();

        // Generate suggestion
        await aiButton.click();
        await expect(page.getByTestId("ai-assist-dropdown")).toBeVisible({ timeout: 5000 });

        // Click "Use This" button
        await page.getByTestId("ai-assist-use-button").click();

        // Prompt should now be in textarea
        await expect(promptInput).toHaveValue(/dramatic scene/i);
      }
    );

    test(
      "should allow regeneration with different result",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page }) => {
        // Track API calls
        let callCount = 0;
        await page.route("**/api/text-generation/panel-description", async (route) => {
          callCount++;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...MOCK_PANEL_DESCRIPTION,
              text: `Generation ${callCount}: ${MOCK_PANEL_DESCRIPTION.text}`,
            }),
          });
        });

        const aiButton = page.getByTestId("ai-assist-button").first();
        await aiButton.click();

        await expect(page.getByTestId("ai-assist-dropdown")).toBeVisible({ timeout: 5000 });

        // Click Regenerate
        await page.getByRole("button", { name: /regenerate/i }).click();

        // Should show new generation
        await expect(page.getByText(/Generation 2/i)).toBeVisible({ timeout: 5000 });
      }
    );
  });

  // ==========================================================================
  // 12.3 Panel Text Viewer
  // ==========================================================================

  test.describe("12.3 Panel Text Viewer", () => {
    test(
      "should display Text tab in panel generator",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page }) => {
        const textTab = page.getByRole("button", { name: /Text/ });
        await expect(textTab).toBeVisible();
      }
    );

    test(
      "should show panel text viewer when clicking Text tab",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        // Click Text tab
        await page.getByRole("button", { name: /Text/ }).click();

        // Should show text viewer component
        await expect(page.getByTestId("panel-text-viewer")).toBeVisible();
      }
    );

    test(
      "should display description section in text viewer",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page }) => {
        await page.getByRole("button", { name: /Text/ }).click();

        // Should show description section
        await expect(page.getByTestId("text-section-description")).toBeVisible();
      }
    );

    test(
      "should show AI assist buttons in text sections",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page }) => {
        await page.getByRole("button", { name: /Text/ }).click();

        // Should have AI assist buttons in each section
        const sectionAiButtons = page.locator(".text-viewer-section").getByTestId("ai-assist-button");
        await expect(sectionAiButtons.first()).toBeVisible();
      }
    );
  });

  // ==========================================================================
  // 12.4 Page Composer Text Panel
  // ==========================================================================

  test.describe("12.4 Page Composer Text Panel", () => {
    test(
      "should show TextViewerPanel toggle in PageComposer",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page, api, testProject }, testInfo) => {
        // Navigate to page composer
        const storyboard = await api.createStoryboard(
          testProject.id,
          uniqueName("Composer Test", testInfo),
          "Testing text viewer panel"
        );
        await page.goto(`/projects/${testProject.id}?view=compose&storyboardId=${storyboard.id}`);

        // Should show text viewer toggle
        await expect(page.getByTestId("text-viewer-toggle")).toBeVisible({ timeout: 10000 });
      }
    );

    test(
      "should expand TextViewerPanel when toggle clicked",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page, api, testProject }, testInfo) => {
        const storyboard = await api.createStoryboard(
          testProject.id,
          uniqueName("Composer Test", testInfo),
          "Testing text viewer panel"
        );
        await page.goto(`/projects/${testProject.id}?view=compose&storyboardId=${storyboard.id}`);

        await expect(page.getByTestId("text-viewer-toggle")).toBeVisible({ timeout: 10000 });

        // Click toggle to expand
        await page.getByTestId("text-viewer-toggle").click();

        // Panel should expand and show body
        await expect(page.getByTestId("text-viewer-body")).toBeVisible();
      }
    );

    test(
      "should show Panel/Page/Storyboard tabs",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page, api, testProject }, testInfo) => {
        const storyboard = await api.createStoryboard(
          testProject.id,
          uniqueName("Composer Test", testInfo),
          "Testing text viewer tabs"
        );
        await page.goto(`/projects/${testProject.id}?view=compose&storyboardId=${storyboard.id}`);

        await page.getByTestId("text-viewer-toggle").click();

        // Should show all three tabs
        await expect(page.getByTestId("text-view-panel-tab")).toBeVisible();
        await expect(page.getByTestId("text-view-page-tab")).toBeVisible();
        await expect(page.getByTestId("text-view-storyboard-tab")).toBeVisible();
      }
    );

    test(
      "should switch between view modes",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page, api, testProject }, testInfo) => {
        const storyboard = await api.createStoryboard(
          testProject.id,
          uniqueName("Composer Test", testInfo),
          "Testing view modes"
        );
        await api.createPanel(storyboard.id, "Panel 1");
        await api.createPanel(storyboard.id, "Panel 2");

        await page.goto(`/projects/${testProject.id}?view=compose&storyboardId=${storyboard.id}`);
        await page.getByTestId("text-viewer-toggle").click();

        // Click Page tab
        await page.getByTestId("text-view-page-tab").click();
        await expect(page.getByTestId("text-view-page-tab")).toHaveClass(/active/);

        // Click Storyboard tab
        await page.getByTestId("text-view-storyboard-tab").click();
        await expect(page.getByTestId("text-view-storyboard-tab")).toHaveClass(/active/);
      }
    );
  });

  // ==========================================================================
  // 12.5 Error Handling
  // ==========================================================================

  test.describe("12.5 Error Handling", () => {
    test(
      "should show error on API failure",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        // Override mock to return error
        await page.route("**/api/text-generation/panel-description", async (route) => {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: { message: "AI service temporarily unavailable" },
            }),
          });
        });

        const aiButton = page.getByTestId("ai-assist-button").first();
        await aiButton.click();

        // Should show error message
        await expect(page.getByText(/unavailable|failed/i)).toBeVisible({ timeout: 5000 });
      }
    );

    test(
      "should allow retry on failure",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page }) => {
        let shouldFail = true;

        await page.route("**/api/text-generation/panel-description", async (route) => {
          if (shouldFail) {
            await route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({ error: { message: "Temporary error" } }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(MOCK_PANEL_DESCRIPTION),
            });
          }
        });

        const aiButton = page.getByTestId("ai-assist-button").first();
        await aiButton.click();

        // Wait for error
        await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });

        // Set to succeed on retry
        shouldFail = false;

        // Click try again
        await page.getByRole("button", { name: /try again/i }).click();

        // Should now show successful result
        await expect(page.getByText(/dramatic scene/i)).toBeVisible({ timeout: 5000 });
      }
    );
  });

  // ==========================================================================
  // 12.6 Full Workflow Integration
  // ==========================================================================

  test.describe("12.6 Full Workflow Integration", () => {
    test(
      "should complete full panel generation with AI assist",
      { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_12] },
      async ({ page }) => {
        // 1. Click AI assist to generate prompt
        const aiButton = page.getByTestId("ai-assist-button").first();
        await aiButton.click();

        // 2. Wait for suggestion and use it
        await expect(page.getByTestId("ai-assist-dropdown")).toBeVisible({ timeout: 5000 });
        await page.getByTestId("ai-assist-use-button").click();

        // 3. Verify prompt is populated
        const promptInput = page.getByTestId("positive-prompt-input");
        await expect(promptInput).toHaveValue(/dramatic scene/i);

        // 4. Go to Text tab to see generated content
        await page.getByRole("button", { name: /Text/ }).click();
        await expect(page.getByTestId("panel-text-viewer")).toBeVisible();
      }
    );

    test(
      "should view generated text in PageComposer after panel generation",
      { tag: [tags.MVP, tags.FLOW_12] },
      async ({ page, api, testProject }, testInfo) => {
        // Create storyboard with panel
        const storyboard = await api.createStoryboard(
          testProject.id,
          uniqueName("Integration Test", testInfo),
          "Full workflow test"
        );
        await api.createPanel(storyboard.id, "Integration panel");

        // Navigate to page composer
        await page.goto(`/projects/${testProject.id}?view=compose&storyboardId=${storyboard.id}`);

        // Expand text viewer
        await page.getByTestId("text-viewer-toggle").click();
        await expect(page.getByTestId("text-viewer-body")).toBeVisible();

        // Switch to storyboard view to see all panels
        await page.getByTestId("text-view-storyboard-tab").click();

        // Should show panel content area
        await expect(page.getByTestId("text-viewer-body")).toBeVisible();
      }
    );
  });
});
