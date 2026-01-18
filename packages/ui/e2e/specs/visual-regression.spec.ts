/**
 * Visual Regression Tests
 *
 * Screenshot comparison tests to catch unintended visual changes.
 * Uses Playwright's built-in toHaveScreenshot() with baselines stored via Git LFS.
 *
 * Strategy:
 * - Test critical UI flows at multiple viewports
 * - Component-level snapshots for reusable UI elements
 * - Full page snapshots for complete flows
 * - Animations disabled for deterministic comparison
 *
 * @see playwright.config.ts for snapshot settings
 * @see .gitattributes for Git LFS configuration
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

// ============================================================================
// Viewport Configurations
// ============================================================================

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },    // iPhone SE
  tablet: { width: 768, height: 1024 },   // iPad
  desktop: { width: 1280, height: 800 },  // Standard laptop
  wide: { width: 1920, height: 1080 },    // Full HD
} as const;

// ============================================================================
// Dashboard Visual Tests
// ============================================================================

test.describe('Visual Regression: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure consistent state - clear any cached data
    await page.evaluate(() => localStorage.clear());
  });

  test('empty state - desktop', { tag: [tags.MVP, tags.SMOKE] }, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for any animations to settle
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dashboard-empty-desktop.png');
  });

  test('empty state - mobile', { tag: [tags.MVP] }, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dashboard-empty-mobile.png');
  });

  test('with projects - desktop', { tag: [tags.MVP] }, async ({ page, api }) => {
    // Create test project for visual consistency
    await api.createProject('Visual Test Project', 'For visual regression testing');
    
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dashboard-with-projects-desktop.png');
  });

  test('project grid layout', { tag: [tags.MVP] }, async ({ page, api }) => {
    // Create multiple projects to test grid
    await api.createProject('Project Alpha', 'First test project');
    await api.createProject('Project Beta', 'Second test project');
    await api.createProject('Project Gamma', 'Third test project');
    
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Snapshot just the grid area
    const grid = page.locator('.project-grid');
    await expect(grid).toHaveScreenshot('project-grid.png');
  });

  test('create project modal', { tag: [tags.MVP] }, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Open the modal
    await page.getByRole('button', { name: /new project/i }).click();
    await page.waitForTimeout(300); // Modal animation
    
    await expect(page).toHaveScreenshot('create-project-modal.png');
  });
});

// ============================================================================
// Project Workspace Visual Tests
// ============================================================================

test.describe('Visual Regression: Project Workspace', () => {
  test('workspace layout - desktop', { tag: [tags.MVP] }, async ({ page, testProject }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/projects/${testProject.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('workspace-desktop.png');
  });

  test('workspace sidebar', { tag: [tags.MVP] }, async ({ page, testProject }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/projects/${testProject.id}`);
    await page.waitForLoadState('networkidle');
    
    const sidebar = page.locator('.workspace-sidebar');
    await expect(sidebar).toHaveScreenshot('workspace-sidebar.png');
  });

  test('workspace - story editor view', { tag: [tags.MVP] }, async ({ page, testProject }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/projects/${testProject.id}`);
    await page.waitForLoadState('networkidle');
    
    // Story editor is default view
    const main = page.locator('.workspace-main');
    await expect(main).toHaveScreenshot('story-editor-view.png');
  });

  test('workspace - characters view', { tag: [tags.MVP] }, async ({ page, testProject }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/projects/${testProject.id}`);
    await page.waitForLoadState('networkidle');
    
    // Navigate to characters
    await page.locator('.nav-item').filter({ hasText: 'Characters' }).click();
    await page.waitForTimeout(300);
    
    const main = page.locator('.workspace-main');
    await expect(main).toHaveScreenshot('characters-view.png');
  });
});

// ============================================================================
// Component-Level Visual Tests
// ============================================================================

test.describe('Visual Regression: Components', () => {
  test('project card - grid view', { tag: [tags.MVP] }, async ({ page, api }) => {
    await api.createProject('Card Test Project', 'Testing card visuals');
    
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Find first project card
    const card = page.locator('[data-testid^="project-card-"]').first();
    await expect(card).toHaveScreenshot('project-card-grid.png');
  });

  test('project card - hover state', { tag: [tags.MVP] }, async ({ page, api }) => {
    await api.createProject('Hover Test Project', 'Testing hover state');
    
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const card = page.locator('[data-testid^="project-card-"]').first();
    await card.hover();
    await page.waitForTimeout(200); // Hover animation
    
    await expect(card).toHaveScreenshot('project-card-hover.png');
  });

  test('navigation header', { tag: [tags.MVP] }, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('.app-header');
    await expect(header).toHaveScreenshot('nav-header.png');
  });

  test('navigation header - mobile menu open', { tag: [tags.MVP] }, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Open mobile menu
    await page.getByLabel('Toggle menu').click();
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('nav-mobile-menu-open.png');
  });
});

// ============================================================================
// Responsive Breakpoint Tests
// ============================================================================

test.describe('Visual Regression: Responsive Layouts', () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`dashboard at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(`dashboard-${name}.png`);
    });
  }
});

// ============================================================================
// Loading & Error States
// ============================================================================

test.describe('Visual Regression: States', () => {
  test('loading state', { tag: [tags.MVP] }, async ({ page }) => {
    // Intercept API to simulate slow loading
    await page.route('**/api/projects**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    
    // Capture loading state quickly before it resolves
    const loadingState = page.locator('.loading-state');
    if (await loadingState.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(loadingState).toHaveScreenshot('loading-state.png');
    }
  });

  test('error state', { tag: [tags.MVP] }, async ({ page }) => {
    // Force error state
    await page.route('**/api/projects**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForTimeout(500);
    
    const errorState = page.locator('.error-state');
    await expect(errorState).toHaveScreenshot('error-state.png');
  });
});
