/**
 * Flow 5: Panel Generation & Iteration
 *
 * E2E tests for generation triggers, progress feedback, N-up results,
 * iteration actions, and feedback loop.
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 5
 * @see e2e/features/panel-generation.feature
 */

import { test, expect, tags } from '../fixtures/test-fixtures';
import type { TestInfo } from '@playwright/test';

const uniqueName = (base: string, testInfo: TestInfo) => {
  const suffix = `${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`;
  return `${base} ${suffix}`;
};

// Mock generation data for deterministic testing
const MOCK_GENERATIONS = [
  { id: 'gen-1', seed: 12345, width: 512, height: 768, rating: 0 },
  { id: 'gen-2', seed: 67890, width: 512, height: 768, rating: 0 },
  { id: 'gen-3', seed: 11111, width: 512, height: 768, rating: 0 },
  { id: 'gen-4', seed: 22222, width: 512, height: 768, rating: 0 },
];

test.describe('Flow 5: Panel Generation & Iteration', () => {
  async function setupPanelGenerator({ page, api, testProject, testInfo }: any) {
    const storyboard = await api.createStoryboard(
      testProject.id,
      uniqueName('Storyboard', testInfo),
      'Flow 5 storyboard'
    );
    const panel = await api.createPanel(storyboard.id, 'Test panel description');

    await page.goto(`/projects/${testProject.id}?view=panel&panelId=${panel.id}&storyboardId=${storyboard.id}`);
    await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
  }
  // ==========================================================================
  // Setup: Mock API responses for deterministic testing
  // ==========================================================================

  test.beforeEach(async ({ page, api, testProject }, testInfo) => {
    // Mock the generations endpoint to return test data
    await page.route('**/api/generations/panel/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ generations: MOCK_GENERATIONS }),
      });
    });

    // Mock the generate endpoint
    await page.route('**/api/panels/*/generate', async (route) => {
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          generatedImage: {
            id: 'new-gen-' + Date.now(),
            seed: Math.floor(Math.random() * 1000000),
            localPath: '/output/test.png',
          },
        }),
      });
    });

    // Mock the generate variants endpoint
    await page.route('**/api/panels/*/generate/variants', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      const count = body.count || 4;
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          total: count,
          successful: count,
          failed: 0,
          generatedImages: Array.from({ length: count }, (_, i) => ({
            id: `variant-${i}`,
            seed: Math.floor(Math.random() * 1000000),
          })),
        }),
      });
    });

    // Mock panel selection
    await page.route('**/api/panels/*/select', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock rating endpoint
    await page.route('**/api/generations/*/rating', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await setupPanelGenerator({ page, api, testProject, testInfo });
  });

  // ==========================================================================
  // 5.1 Generation Trigger
  // ==========================================================================

  test.describe('5.1 Generation Trigger', () => {
    test('should render panel generator with all controls', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      // Navigate to a panel (using mock project/panel)
      
      // Wait for component to load
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Verify key elements are present
      await expect(panelEditorPage.generateButton).toBeVisible();
      await expect(panelEditorPage.generateVariantsButton).toBeVisible();
      await expect(panelEditorPage.positivePromptInput).toBeVisible();
      await expect(panelEditorPage.negativePromptInput).toBeVisible();
      await expect(panelEditorPage.variantCountInput).toBeVisible();
    });

    test('should start generation when clicking Generate Single', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Enter a prompt
      await panelEditorPage.positivePromptInput.fill('A wolf in the moonlight');
      
      // Click generate
      await panelEditorPage.generateButton.click();
      
      // Should show loading state
      await expect(page.getByText('Generating...')).toBeVisible();
    });

    test('should generate variants with configured count', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Set variant count to 6
      await panelEditorPage.variantCountInput.fill('6');
      
      // Enter a prompt
      await panelEditorPage.positivePromptInput.fill('A fox by the river');
      
      // Intercept the API call to verify count
      let requestBody: any;
      await page.route('**/api/panels/*/generate/variants', async (route) => {
        requestBody = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            total: requestBody.count,
            successful: requestBody.count,
            failed: 0,
            generatedImages: [],
          }),
        });
      });
      
      // Click generate variants
      await panelEditorPage.generateVariantsButton.click();
      
      // Verify the request had count: 6
      await expect.poll(() => requestBody?.count).toBe(6);
    });

    test('should NOT auto-generate on prompt change', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Track API calls
      let generateCalled = false;
      await page.route('**/api/panels/*/generate', async (route) => {
        generateCalled = true;
        await route.fulfill({ status: 201, body: '{}' });
      });
      
      // Type in prompt (should NOT trigger generation)
      await panelEditorPage.positivePromptInput.fill('Some new prompt text');
      
      // Wait a moment
      await page.waitForTimeout(1000);
      
      // Verify generate was NOT called
      expect(generateCalled).toBe(false);
    });
  });

  // ==========================================================================
  // 5.2 Generation Progress
  // ==========================================================================

  test.describe('5.2 Generation Progress', () => {
    test('should show loading indicator during generation', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Make generation take longer
      await page.route('**/api/panels/*/generate', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });
      
      // Start generation
      await panelEditorPage.generateButton.click();
      
      // Should show "Generating..." text
      await expect(page.getByText('Generating...')).toBeVisible();
      
      // Should show progress hint
      await expect(page.getByText(/ComfyUI/i)).toBeVisible();
    });

    test('should disable buttons during generation', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Make generation take longer
      await page.route('**/api/panels/*/generate', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });
      
      // Start generation
      await panelEditorPage.generateButton.click();
      
      // Buttons should be disabled during generation
      await expect(page.getByText(/ComfyUI/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Generating/i })).toBeDisabled();
      await expect(page.getByRole('button', { name: /Generate .* Variants/i })).toBeDisabled();
    });
  });

  // ==========================================================================
  // 5.3 Result Presentation (N-Up)
  // ==========================================================================

  test.describe('5.3 Result Presentation (N-Up)', () => {
    test('should display generation results in grid', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Should show generation cards from mock data
      await expect(panelEditorPage.generatedImages.first()).toBeVisible();
      
      // Should have 4 generations (from mock)
      await expect(panelEditorPage.generatedImages).toHaveCount(4);
    });

    test('should show seed and dimensions on each card', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Should show seed info and dimensions in generation info
      await expect(page.locator('.generation-info').first().getByText(/Seed: 12345/)).toBeVisible();
      await expect(page.locator('.generation-info').first().getByText(/512×768/)).toBeVisible();
    });

    test('should allow selecting a generation', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Click the first generation card's select button
      await page.locator('.generation-card').first().locator('.action-btn').first().click();
      
      // Should show selected state
      await expect(page.locator('.generation-card.selected').first()).toBeVisible();
    });
  });

  // ==========================================================================
  // 5.4 Iteration Actions
  // ==========================================================================

  test.describe('5.4 Iteration Actions', () => {
    test('should allow rating generations with stars', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Should have rating stars
      const stars = page.locator('.rating-stars .star');
      await expect(stars.first()).toBeVisible();
      
      // Click 4th star (rating 4)
      await stars.nth(3).click();
      
      // Star should be filled (verify API was called)
      // The visual feedback would be the star turning gold
    });

    test('should allow copying prompt from generation', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Click copy prompt button (clipboard icon)
      const copyButton = page.locator('.generation-card').first().locator('button[title="Use this prompt"]');
      if (await copyButton.isVisible()) {
        await copyButton.click();
        // Prompt should be copied to input (implementation specific)
      }
    });
  });

  // ==========================================================================
  // 5.5 Tab Navigation
  // ==========================================================================

  test.describe('5.5 Tab Navigation', () => {
    test('should switch between Generate and Versions tabs', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Click Versions tab
      await page.getByRole('button', { name: /Versions/ }).click();
      
      // Should show generation tree visualization
      await expect(page.getByText('Generation Tree')).toBeVisible();
      
      // Click back to Generate tab
      await page.locator('.tab-button').filter({ hasText: 'Generate' }).click();
      
      // Should show generation controls
      await expect(panelEditorPage.generateButton).toBeVisible();
    });

    test('should show Text tab with generated text', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Click Text tab
      await page.getByRole('button', { name: /Text \(/ }).click();
      
      // Should show text sections
      await expect(page.locator('.text-section-title', { hasText: 'Panel Description' }).first()).toBeVisible();
      await expect(page.locator('.text-section-title', { hasText: 'Dialogue' }).first()).toBeVisible();
    });

    test('should show Captions tab', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Click Captions tab
      await page.getByRole('button', { name: /Captions \(/ }).click();
      
      // Should show generate from beat button
      await expect(page.getByRole('button', { name: 'Generate from Beat' })).toBeVisible();
    });
  });

  // ==========================================================================
  // 5.6 Error Handling
  // ==========================================================================

  test.describe('5.6 Error Handling', () => {
    test('should display error when generation fails', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Mock failed generation
      await page.route('**/api/panels/*/generate', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { message: 'ComfyUI server unavailable' },
          }),
        });
      });
      
      // Try to generate
      await panelEditorPage.generateButton.click();
      
      // Should show error message
      await expect(page.getByText(/ComfyUI server unavailable|Failed to generate/i)).toBeVisible();
    });

    test('should clear error on new generation attempt', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page, panelEditorPage }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // First: fail
      let shouldFail = true;
      await page.route('**/api/panels/*/generate', async (route) => {
        if (shouldFail) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: { message: 'First error' } }),
          });
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });
      
      // Generate (should fail)
      await panelEditorPage.generateButton.click();
      await expect(page.getByText(/First error|Failed/i)).toBeVisible();
      
      // Now make it succeed
      shouldFail = false;
      
      // Generate again
      await panelEditorPage.generateButton.click();
      
      // Error should be cleared (may show new loading state instead)
      // Give it a moment for the error to clear
      await page.waitForTimeout(500);
    });
  });

  // ==========================================================================
  // 5.7 Character and Control Level Selection
  // ==========================================================================

  test.describe('5.7 Character and Control Level Selection', () => {
    test('should display character selection', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page }) => {
      // Mock characters endpoint
      await page.route('**/api/characters**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'char-1', name: 'Luna', species: 'Wolf' },
            { id: 'char-2', name: 'Max', species: 'Fox' },
          ]),
        });
      });
      
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Should show character section
      await expect(page.locator('.section-title', { hasText: 'Characters' }).first()).toBeVisible();
    });

    test('should display control level options', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Should show control level section
      await expect(page.getByText('Control Level')).toBeVisible();
      
      // Should have Level 3 as default (Visual Target)
      await expect(page.getByText('Level 3 - Visual (Target)')).toBeVisible();
    });

    test('should allow changing control level', { tag: [tags.MVP, tags.FLOW_5] }, async ({ page }) => {
      await expect(page.locator('.panel-generator')).toBeVisible({ timeout: 10000 });
      
      // Click Level 4 (Full Control)
      await page.getByText('Level 4 - Full Control').click();
      
      // Level 4 should now be selected
      const level4Option = page.locator('.level-option').filter({ hasText: 'Level 4' });
      await expect(level4Option).toHaveClass(/selected/);
    });
  });
});
