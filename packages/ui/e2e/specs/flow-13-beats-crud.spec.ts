/**
 * Flow 13: Beats CRUD Operations
 *
 * E2E tests for beat management within the Story Editor.
 * Tests create, read, update, and delete operations for story beats.
 *
 * @see Implementation: packages/ui/src/components/story-editor/beats/
 */

import { test, expect, tags } from '../fixtures/test-fixtures';
import type { Page } from '@playwright/test';

// ============================================================================
// Test Data & Helpers
// ============================================================================

const FLOW_13 = '@flow-13';
const BEATS = '@beats';

interface TestContext {
  projectId: string;
  storyboardId: string;
  premiseId: string;
  storyId: string;
}

/**
 * Setup test project with premise and story via API
 */
async function setupTestProject(request: any): Promise<TestContext> {
  const apiUrl = process.env.API_URL || 'http://localhost:3002';

  // Create project
  const projectRes = await request.post(`${apiUrl}/api/projects`, {
    data: { name: 'E2E Beats Test Project', description: 'E2E test project for beats' },
  });

  if (!projectRes.ok()) {
    const text = await projectRes.text();
    throw new Error(`Failed to create project (${projectRes.status()}): ${text.substring(0, 200)}`);
  }
  const project = await projectRes.json();

  // Create storyboard
  const storyboardRes = await request.post(`${apiUrl}/api/storyboards`, {
    data: { projectId: project.id, name: 'Main Storyboard', description: 'Test storyboard' },
  });

  if (!storyboardRes.ok()) {
    const text = await storyboardRes.text();
    throw new Error(`Failed to create storyboard (${storyboardRes.status()}): ${text.substring(0, 200)}`);
  }
  const storyboard = await storyboardRes.json();

  // Create premise
  const premiseRes = await request.post(`${apiUrl}/api/narrative/premises`, {
    data: {
      projectId: project.id,
      logline: 'Two otters discover friendship on an adventure',
      genre: 'adventure',
      themes: ['friendship', 'discovery'],
      targetAudience: 'all-ages',
    },
  });

  if (!premiseRes.ok()) {
    const text = await premiseRes.text();
    throw new Error(`Failed to create premise (${premiseRes.status()}): ${text.substring(0, 200)}`);
  }
  const premise = await premiseRes.json();

  // Create story under premise
  const storyRes = await request.post(`${apiUrl}/api/narrative/premises/${premise.id}/stories`, {
    data: {
      title: 'The Great Otter Adventure',
      synopsis: 'Marina and friends embark on a journey',
      structure: 'three-act',
    },
  });

  if (!storyRes.ok()) {
    const text = await storyRes.text();
    throw new Error(`Failed to create story (${storyRes.status()}): ${text.substring(0, 200)}`);
  }
  const story = await storyRes.json();

  return {
    projectId: project.id,
    storyboardId: storyboard.id,
    premiseId: premise.id,
    storyId: story.id,
  };
}

/**
 * Cleanup test data after tests
 */
async function cleanupTestProject(request: any, ctx: TestContext): Promise<void> {
  const apiUrl = process.env.API_URL || 'http://localhost:3002';

  try {
    // Delete in reverse dependency order
    await request.delete(`${apiUrl}/api/narrative/stories/${ctx.storyId}`);
    await request.delete(`${apiUrl}/api/narrative/premises/${ctx.premiseId}`);
    await request.delete(`${apiUrl}/api/storyboards/${ctx.storyboardId}`);
    await request.delete(`${apiUrl}/api/projects/${ctx.projectId}`);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Navigate to story editor and expand a story to show beats
 */
async function navigateToStoryBeats(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}`);
  await page.waitForLoadState('networkidle');

  // Navigate to Story Editor view
  await page.locator('.nav-item').filter({ hasText: 'Story Editor' }).click();
  await page.waitForTimeout(500);

  // Wait for story editor to load
  await page.waitForSelector('.story-editor', { timeout: 10000 });

  // Click on the premise item to select it
  const premiseItem = page.locator('.premise-item').first();
  if (await premiseItem.isVisible()) {
    await premiseItem.click();
    await page.waitForTimeout(500);
  }

  // Now click on the story card to expand it and show beats
  // Story cards don't have a specific class, they're divs with inline styles
  // Look for the story by its structure text (e.g., "three-act")
  const storyCard = page.locator('text=three-act').first();
  if (await storyCard.isVisible()) {
    await storyCard.click();
    await page.waitForTimeout(300);
  }
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Flow 13: Beats CRUD Operations', () => {
  let testCtx: TestContext | null = null;
  let setupError: string | null = null;

  test.beforeAll(async ({ request }) => {
    try {
      testCtx = await setupTestProject(request);
    } catch (error) {
      setupError = error instanceof Error ? error.message : String(error);
      console.error('⚠️  Test setup failed:', setupError);
      console.error('');
      console.error('To run these tests, ensure:');
      console.error('  1. API server is running: cd packages/server && bun run dev');
      console.error('  2. Set API_URL env var if not on port 3002');
      console.error('');
    }
  });

  test.afterAll(async ({ request }) => {
    if (testCtx) {
      await cleanupTestProject(request, testCtx);
    }
  });

  // Skip individual tests if setup failed
  test.beforeEach(async () => {
    test.skip(!testCtx, `Setup failed: ${setupError}`);
  });

  // ==========================================================================
  // 13.1 Beat Section Display
  // ==========================================================================

  test.describe('13.1 Beat Section Display', () => {
    test('should display BEATS section header', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Verify BEATS header is visible
      await expect(page.getByTestId('beat-section-header')).toBeVisible();
      await expect(page.getByTestId('beat-section-header').getByText('BEATS')).toBeVisible();
    });

    test('should display Add Beat button', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Verify Add Beat button is visible
      await expect(page.getByTestId('add-beat-btn')).toBeVisible();
      await expect(page.getByTestId('add-beat-btn')).toContainText('+ Add Beat');
    });

    test('should show empty state when no beats exist', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Verify empty state message
      await expect(page.getByTestId('beat-empty-state')).toBeVisible();
      await expect(page.getByTestId('beat-empty-state')).toContainText('No beats yet');
    });

    test('should show beat count of 0 initially', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Verify beat count shows 0
      await expect(page.getByTestId('beat-count')).toContainText('0');
    });
  });

  // ==========================================================================
  // 13.2 Create Beat
  // ==========================================================================

  test.describe('13.2 Create Beat', () => {
    test('should open create beat modal when Add Beat is clicked', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Click Add Beat button
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Verify modal opens
      await expect(page.getByTestId('beat-editor-modal')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Create Beat' })).toBeVisible();
    });

    test('should disable submit button when description is too short', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Open create modal
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Enter short description
      await page.getByTestId('beat-visual-description').fill('Short');

      // Verify submit is disabled
      await expect(page.getByTestId('beat-editor-submit')).toBeDisabled();
    });

    test('should enable submit button when description meets minimum length', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Open create modal
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Enter valid description (min 10 characters)
      await page.getByTestId('beat-visual-description').fill('A dramatic scene with two characters meeting');

      // Verify submit is enabled
      await expect(page.getByTestId('beat-editor-submit')).not.toBeDisabled();
    });

    test('should create beat and close modal on submit', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Open create modal
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Fill in description
      await page.getByTestId('beat-visual-description').fill('Marina stands on the yacht deck watching the sunset');

      // Submit
      await page.getByTestId('beat-editor-submit').click();
      await page.waitForTimeout(500);

      // Verify modal closes
      await expect(page.getByTestId('beat-editor-modal')).not.toBeVisible();

      // Verify beat appears in list
      await expect(page.getByTestId('beat-list')).toBeVisible();
      await expect(page.locator('.beat-card')).toHaveCount(1);
    });

    test('should update beat count after creation', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Create a beat
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);
      await page.getByTestId('beat-visual-description').fill('A second beat scene for testing');
      await page.getByTestId('beat-editor-submit').click();
      await page.waitForTimeout(500);

      // Verify beat count increases
      const countText = await page.getByTestId('beat-count').textContent();
      expect(parseInt(countText || '0')).toBeGreaterThan(0);
    });

    test('should close modal when cancel is clicked', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Open create modal
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Click cancel
      await page.getByTestId('beat-editor-cancel').click();
      await page.waitForTimeout(300);

      // Verify modal closes
      await expect(page.getByTestId('beat-editor-modal')).not.toBeVisible();
    });
  });

  // ==========================================================================
  // 13.3 Edit Beat
  // ==========================================================================

  test.describe('13.3 Edit Beat', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate and create a beat for editing tests
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Check if we need to create a beat
      const beatCount = await page.locator('.beat-card').count();
      if (beatCount === 0) {
        await page.getByTestId('add-beat-btn').click();
        await page.waitForTimeout(300);
        await page.getByTestId('beat-visual-description').fill('A test beat for edit operations');
        await page.getByTestId('beat-editor-submit').click();
        await page.waitForTimeout(500);
      }
    });

    test('should open edit modal when edit button is clicked', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      // Click edit button on first beat
      const editBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-edit-"]');
      await editBtn.click();
      await page.waitForTimeout(300);

      // Verify modal opens in edit mode
      await expect(page.getByTestId('beat-editor-modal')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Edit Beat' })).toBeVisible();
    });

    test('should populate form with existing beat data', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      // Click edit button
      const editBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-edit-"]');
      await editBtn.click();
      await page.waitForTimeout(300);

      // Verify description field has content
      const description = await page.getByTestId('beat-visual-description').inputValue();
      expect(description.length).toBeGreaterThan(0);
    });

    test('should disable save when no changes made', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      // Click edit button
      const editBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-edit-"]');
      await editBtn.click();
      await page.waitForTimeout(300);

      // Verify save is disabled (no changes)
      await expect(page.getByTestId('beat-editor-submit')).toBeDisabled();
    });

    test('should enable save when changes are made', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      // Click edit button
      const editBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-edit-"]');
      await editBtn.click();
      await page.waitForTimeout(300);

      // Make a change
      const currentValue = await page.getByTestId('beat-visual-description').inputValue();
      await page.getByTestId('beat-visual-description').fill(currentValue + ' - updated');

      // Verify save is enabled
      await expect(page.getByTestId('beat-editor-submit')).not.toBeDisabled();
    });

    test('should save changes and close modal', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      // Click edit button
      const editBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-edit-"]');
      await editBtn.click();
      await page.waitForTimeout(300);

      // Make a change
      await page.getByTestId('beat-visual-description').fill('Updated beat description for testing');

      // Save changes
      await page.getByTestId('beat-editor-submit').click();
      await page.waitForTimeout(500);

      // Verify modal closes
      await expect(page.getByTestId('beat-editor-modal')).not.toBeVisible();

      // Verify beat shows updated description
      await expect(page.locator('.beat-description').first()).toContainText('Updated beat description');
    });
  });

  // ==========================================================================
  // 13.4 Delete Beat
  // ==========================================================================

  test.describe('13.4 Delete Beat', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate and ensure a beat exists
      await navigateToStoryBeats(page, testCtx!.projectId);

      const beatCount = await page.locator('.beat-card').count();
      if (beatCount === 0) {
        await page.getByTestId('add-beat-btn').click();
        await page.waitForTimeout(300);
        await page.getByTestId('beat-visual-description').fill('A test beat for delete operations');
        await page.getByTestId('beat-editor-submit').click();
        await page.waitForTimeout(500);
      }
    });

    test('should open delete confirmation modal', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      // Click delete button on first beat
      const deleteBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-delete-"]');
      await deleteBtn.click();
      await page.waitForTimeout(300);

      // Verify confirmation modal opens
      await expect(page.getByTestId('beat-delete-modal')).toBeVisible();
      await expect(page.locator('text=Delete Beat')).toBeVisible();
      await expect(page.locator('text=Are you sure you want to delete this beat?')).toBeVisible();
    });

    test('should close modal when cancel is clicked', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      // Click delete button
      const deleteBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-delete-"]');
      await deleteBtn.click();
      await page.waitForTimeout(300);

      // Click cancel
      await page.getByTestId('beat-delete-cancel').click();
      await page.waitForTimeout(300);

      // Verify modal closes
      await expect(page.getByTestId('beat-delete-modal')).not.toBeVisible();
    });

    test('should delete beat and close modal on confirm', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      // Get initial beat count
      const initialCount = await page.locator('.beat-card').count();

      // Click delete button
      const deleteBtn = page.locator('.beat-card').first().locator('[data-testid^="beat-delete-"]');
      await deleteBtn.click();
      await page.waitForTimeout(300);

      // Confirm delete
      await page.getByTestId('beat-delete-confirm').click();
      await page.waitForTimeout(500);

      // Verify modal closes
      await expect(page.getByTestId('beat-delete-modal')).not.toBeVisible();

      // Verify beat count decreases
      const newCount = await page.locator('.beat-card').count();
      expect(newCount).toBeLessThan(initialCount);
    });
  });

  // ==========================================================================
  // 13.5 Beat Card Display
  // ==========================================================================

  test.describe('13.5 Beat Card Display', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Create a beat if needed
      const beatCount = await page.locator('.beat-card').count();
      if (beatCount === 0) {
        await page.getByTestId('add-beat-btn').click();
        await page.waitForTimeout(300);
        await page.getByTestId('beat-visual-description').fill('A dramatic scene with compelling visuals');
        await page.getByTestId('beat-editor-submit').click();
        await page.waitForTimeout(500);
      }
    });

    test('should display beat position number', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      // Verify position is displayed
      await expect(page.locator('.beat-position').first()).toBeVisible();
      await expect(page.locator('.beat-position').first()).toContainText('1');
    });

    test('should display beat type label', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      // Verify beat type label is visible (General for default)
      await expect(page.locator('.beat-type-label').first()).toBeVisible();
    });

    test('should display beat description', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      // Verify description is visible
      await expect(page.locator('.beat-description').first()).toBeVisible();
    });

    test('should show edit button on hover', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      // Hover over beat card
      await page.locator('.beat-card').first().hover();
      await page.waitForTimeout(200);

      // Verify edit button is visible
      await expect(page.locator('.beat-card').first().locator('[data-testid^="beat-edit-"]')).toBeVisible();
    });

    test('should show delete button on hover', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      // Hover over beat card
      await page.locator('.beat-card').first().hover();
      await page.waitForTimeout(200);

      // Verify delete button is visible
      await expect(page.locator('.beat-card').first().locator('[data-testid^="beat-delete-"]')).toBeVisible();
    });
  });

  // ==========================================================================
  // 13.6 Beat Types
  // ==========================================================================

  test.describe('13.6 Beat Types', () => {
    test('should display all beat type options in editor', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Open create modal
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Verify all beat type buttons are visible
      await expect(page.getByRole('button', { name: /Setup/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Inciting Incident/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Rising Action/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Midpoint/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Complication/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Crisis/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Climax/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Resolution/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Denouement/ })).toBeVisible();
    });

    test('should toggle beat type on click', { tag: [tags.MVP, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Open create modal
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Click Setup button
      const setupBtn = page.getByRole('button', { name: /Setup/ });
      await setupBtn.click();

      // Verify it's active
      await expect(setupBtn).toHaveClass(/active/);

      // Click again to deselect
      await setupBtn.click();

      // Verify it's not active
      await expect(setupBtn).not.toHaveClass(/active/);
    });

    test('should create beat with selected type', { tag: [tags.MVP, tags.PRIORITY_HIGH, FLOW_13, BEATS] }, async ({ page }) => {
      await navigateToStoryBeats(page, testCtx!.projectId);

      // Open create modal
      await page.getByTestId('add-beat-btn').click();
      await page.waitForTimeout(300);

      // Select Climax type
      await page.getByRole('button', { name: /Climax/ }).click();

      // Fill description
      await page.getByTestId('beat-visual-description').fill('The epic confrontation at the climax');

      // Submit
      await page.getByTestId('beat-editor-submit').click();
      await page.waitForTimeout(500);

      // Verify beat shows Climax type
      await expect(page.locator('.beat-type-label').last()).toContainText('Climax');
    });
  });
});
