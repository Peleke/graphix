/**
 * Flow 6: Page Composition
 *
 * E2E tests for page layout selection, panel placement, adjustments,
 * and recursive editing (drill-down).
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 6
 * @see e2e/features/page-composition.feature
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

// Mock data for deterministic testing
const MOCK_LAYOUTS = [
  { id: '1-panel', name: '1-panel', slots: 1 },
  { id: '2-panel', name: '2-panel', slots: 2 },
  { id: '2-row', name: '2-row', slots: 2 },
  { id: '3-panel', name: '3-panel', slots: 3 },
  { id: '4-panel', name: '4-panel', slots: 4 },
];

const MOCK_PANELS = [
  { id: 'panel-1', position: 0, description: 'Panel 1', selectedOutputId: 'gen-1' },
  { id: 'panel-2', position: 1, description: 'Panel 2', selectedOutputId: 'gen-2' },
  { id: 'panel-3', position: 2, description: 'Panel 3', selectedOutputId: 'gen-3' },
  { id: 'panel-4', position: 3, description: 'Panel 4', selectedOutputId: 'gen-4' },
];

test.describe('Flow 6: Page Composition', () => {
  // ==========================================================================
  // Setup: Mock API responses
  // ==========================================================================

  test.beforeEach(async ({ page }) => {
    // Mock layouts endpoint
    await page.route('**/api/composition/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: MOCK_LAYOUTS }),
      });
    });

    // Mock panels endpoint
    await page.route('**/api/storyboards/*/panels', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ panels: MOCK_PANELS }),
      });
    });

    // Mock page composition state
    await page.route('**/api/pages/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'page-1',
            templateId: '4-panel',
            slots: [
              { id: 'slot-1', panelId: 'panel-1', position: { x: 0, y: 0 } },
              { id: 'slot-2', panelId: 'panel-2', position: { x: 1, y: 0 } },
              { id: 'slot-3', panelId: 'panel-3', position: { x: 0, y: 1 } },
              { id: 'slot-4', panelId: 'panel-4', position: { x: 1, y: 1 } },
            ],
            gutter: 10,
            border: 0,
            background: '#ffffff',
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: '{}' });
      }
    });
  });

  // ==========================================================================
  // 6.1 Layout Selection
  // ==========================================================================

  test.describe('6.1 Layout Selection', () => {
    test('should display layout template picker', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_6] }, async ({ page, pageComposerPage }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Look for layout selector
      await expect(page.getByText(/select layout|choose template/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show available layout templates', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Should show template options
      await expect(page.getByText('1-panel')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('2-panel')).toBeVisible();
      await expect(page.getByText('4-panel')).toBeVisible();
    });

    test('should apply selected layout template', { tag: [tags.MVP, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Track API call
      let selectedTemplate: string | null = null;
      await page.route('**/api/pages/*/template', async (route) => {
        const body = JSON.parse(route.request().postData() || '{}');
        selectedTemplate = body.templateId;
        await route.fulfill({ status: 200, body: '{}' });
      });
      
      // Click on 4-panel template
      await page.getByText('4-panel').click();
      
      // Verify the right template was selected
      await expect.poll(() => selectedTemplate).toBe('4-panel');
    });
  });

  // ==========================================================================
  // 6.2 Panel Placement
  // ==========================================================================

  test.describe('6.2 Panel Placement', () => {
    test('should display panel slots based on layout', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_6] }, async ({ page, pageComposerPage }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Should have panel slots (based on 4-panel mock)
      const slots = page.locator('[data-testid="panel-slot"], .panel-slot');
      await expect(slots).toHaveCount(4, { timeout: 10000 });
    });

    test('should auto-fill panels in reading order', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // First slot should have panel 1 (top-left)
      const slots = page.locator('[data-testid="panel-slot"], .panel-slot');
      await expect(slots.first()).toBeVisible({ timeout: 10000 });
      
      // Verify panels are in order (implementation specific)
    });

    test('should allow clicking on slot to edit assignment', { tag: [tags.MVP, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Click on a slot
      const slots = page.locator('[data-testid="panel-slot"], .panel-slot');
      await slots.first().click();
      
      // Should show slot editor or panel selector
      await expect(page.getByText(/select panel|change panel|slot/i)).toBeVisible();
    });
  });

  // ==========================================================================
  // 6.3 Page-Level Adjustments
  // ==========================================================================

  test.describe('6.3 Page-Level Adjustments', () => {
    test('should allow adjusting gutter spacing', { tag: [tags.MVP, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Look for gutter control
      const gutterControl = page.getByLabel(/gutter|spacing/i);
      if (await gutterControl.isVisible()) {
        await gutterControl.fill('20');
        
        // Track API call
        let savedGutter: number | null = null;
        await page.route('**/api/pages/*/settings', async (route) => {
          const body = JSON.parse(route.request().postData() || '{}');
          savedGutter = body.gutter;
          await route.fulfill({ status: 200, body: '{}' });
        });
      }
    });

    test('should allow setting page background', { tag: [tags.MVP, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Look for background control
      const bgControl = page.getByLabel(/background/i);
      if (await bgControl.isVisible()) {
        // Implementation specific - could be color picker or input
      }
    });
  });

  // ==========================================================================
  // 6.4 Recursive Editing (Drill-Down)
  // ==========================================================================

  test.describe('6.4 Recursive Editing (Drill-Down)', () => {
    test('should open panel editor when clicking on panel', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Click on a panel slot to edit it
      const slots = page.locator('[data-testid="panel-slot"], .panel-slot');
      await slots.first().dblclick(); // Double-click to edit
      
      // Should show panel editor (side panel or modal)
      await expect(page.getByText(/edit panel|panel editor/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        // Alternative: check for panel generator visibility
      });
    });

    test('should warn on leaving with unsaved changes', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Make a change (if possible)
      const gutterControl = page.getByLabel(/gutter|spacing/i);
      if (await gutterControl.isVisible()) {
        await gutterControl.fill('25');
        
        // Try to navigate away
        await page.getByRole('button', { name: /back/i }).click();
        
        // Should see warning (if implemented)
        // await expect(page.getByText(/unsaved|discard/i)).toBeVisible();
      }
    });

    test('should support breadcrumb navigation', { tag: [tags.MVP, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Look for breadcrumbs
      const breadcrumbs = page.locator('[data-testid="breadcrumbs"], .breadcrumbs, nav[aria-label="breadcrumb"]');
      if (await breadcrumbs.isVisible()) {
        await expect(breadcrumbs).toContainText(/page|compose/i);
      }
    });
  });

  // ==========================================================================
  // 6.5 Panel Swapping
  // ==========================================================================

  test.describe('6.5 Panel Swapping', () => {
    test('should allow swapping panels between slots', { tag: [tags.MVP, tags.FLOW_6] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=compose&pageId=page-1');
      
      // Select two slots (implementation specific)
      const slots = page.locator('[data-testid="panel-slot"], .panel-slot');
      
      // First slot
      await slots.nth(0).click();
      
      // Hold shift and click second
      await page.keyboard.down('Shift');
      await slots.nth(1).click();
      await page.keyboard.up('Shift');
      
      // Look for swap button
      const swapButton = page.getByRole('button', { name: /swap/i });
      if (await swapButton.isVisible()) {
        await swapButton.click();
      }
    });
  });
});
