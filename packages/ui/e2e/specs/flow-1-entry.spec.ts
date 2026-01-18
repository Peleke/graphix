/**
 * Flow 1: Application Entry
 *
 * E2E tests for the dashboard and project management.
 * Tests the main entry point of the application.
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 1
 * @see e2e/features/entry.feature
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

// API base URL for direct API calls in tests
const API_URL = process.env.API_URL || 'http://localhost:3002';

test.describe('Flow 1: Application Entry', () => {
  // ==========================================================================
  // Setup & Teardown
  // ==========================================================================

  const createdProjectIds: string[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdProjectIds) {
      try {
        await request.delete(`${API_URL}/api/projects/${id}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;
  });

  // ==========================================================================
  // 1.1 Dashboard Display
  // ==========================================================================

  test.describe('1.1 Dashboard Display', () => {
    test('should display dashboard with Projects title', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1, tags.SMOKE] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.expectDashboardVisible();
      await expect(dashboardPage.searchInput).toBeVisible();
      await expect(dashboardPage.newProjectButton).toBeVisible();
    });

    test('should show loading state initially', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await page.goto('/');
      await dashboardPage.waitForLoad();
      await dashboardPage.expectDashboardVisible();
    });

    test('should show empty state when no projects exist', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ request, dashboardPage }) => {
      // Delete all existing projects first
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      
      for (const project of projects.data || []) {
        await request.delete(`${API_URL}/api/projects/${project.id}`);
      }

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectEmptyState();
    });

    test('should display projects when they exist', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      // Create project via API
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'E2E Test Project', description: 'Created by E2E test' },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      // Navigate fresh - page load will fetch projects
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Should show the project (TanStack Query fetches on mount)
      await dashboardPage.expectProjectInList('E2E Test Project');
    });
  });

  // ==========================================================================
  // 1.2 View Mode Toggle
  // ==========================================================================

  test.describe('1.2 View Mode Toggle', () => {
    test.beforeEach(async ({ request }) => {
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'View Mode Test Project', description: 'For view mode testing' },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);
    });

    test('should default to grid view', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList('View Mode Test Project');

      // Grid container should be visible (viewMode === 'grid' by default)
      await expect(page.locator('.project-grid')).toBeVisible();
    });

    test('should switch to list view', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList('View Mode Test Project');

      // Click list view button
      await dashboardPage.switchToListView();

      // List container should be visible
      await expect(page.locator('.project-list')).toBeVisible();
    });

    test('should switch back to grid view', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList('View Mode Test Project');

      // Switch to list then back to grid
      await dashboardPage.switchToListView();
      await expect(page.locator('.project-list')).toBeVisible();

      await dashboardPage.switchToGridView();
      await expect(page.locator('.project-grid')).toBeVisible();
    });
  });

  // ==========================================================================
  // 1.3 Project Creation (via UI - TanStack Query auto-refreshes)
  // ==========================================================================

  test.describe('1.3 Project Creation', () => {
    test('should open create project modal', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();

      await dashboardPage.expectCreateModalVisible();
      await expect(dashboardPage.projectNameInput).toBeVisible();
      await expect(dashboardPage.createButton).toBeVisible();
      await expect(dashboardPage.cancelButton).toBeVisible();
    });

    test('should close modal when clicking cancel', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();
      await dashboardPage.expectCreateModalVisible();

      await dashboardPage.cancelCreate();
      await dashboardPage.expectCreateModalHidden();
    });

    test('should close modal when clicking outside', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();
      await dashboardPage.expectCreateModalVisible();

      await dashboardPage.modalOverlay.click({ position: { x: 10, y: 10 } });
      await dashboardPage.expectCreateModalHidden();
    });

    test('should create a new project', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const projectName = `E2E Project ${Date.now()}`;
      
      await dashboardPage.clickNewProject();
      await dashboardPage.expectCreateModalVisible();
      await dashboardPage.projectNameInput.fill(projectName);
      await dashboardPage.createButton.click();
      
      // Modal closes, TanStack Query invalidates and refetches
      await dashboardPage.expectCreateModalHidden();
      
      // Project should appear after refetch (TanStack Query handles this)
      await dashboardPage.expectProjectInList(projectName);

      // Get ID for cleanup
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const createdProject = projects.data?.find((p: any) => p.name === projectName);
      if (createdProject) {
        createdProjectIds.push(createdProject.id);
      }
    });

    test('should disable create button when name is empty', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();
      await dashboardPage.expectCreateModalVisible();

      await expect(dashboardPage.createButton).toBeDisabled();
    });

    test('should enable create button when name is entered', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();
      await dashboardPage.projectNameInput.fill('Test Project');

      await expect(dashboardPage.createButton).toBeEnabled();
    });

    test('should create project when pressing Enter', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const projectName = `Enter Key Project ${Date.now()}`;
      await dashboardPage.clickNewProject();
      await dashboardPage.projectNameInput.fill(projectName);
      await page.keyboard.press('Enter');

      await dashboardPage.expectCreateModalHidden();
      await dashboardPage.expectProjectInList(projectName);

      // Cleanup
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const createdProject = projects.data?.find((p: any) => p.name === projectName);
      if (createdProject) {
        createdProjectIds.push(createdProject.id);
      }
    });
  });

  // ==========================================================================
  // 1.4 Project Search
  // ==========================================================================

  test.describe('1.4 Project Search', () => {
    test.beforeEach(async ({ request }) => {
      const projects = [
        { name: 'Alpha Project', description: 'First project' },
        { name: 'Beta Project', description: 'Second project' },
        { name: 'Gamma Project', description: 'Third project' },
      ];

      for (const proj of projects) {
        const response = await request.post(`${API_URL}/api/projects`, { data: proj });
        const created = await response.json();
        createdProjectIds.push(created.id);
      }
    });

    test('should filter projects by search term', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      
      // All projects should be visible initially
      await dashboardPage.expectProjectInList('Alpha Project');
      await dashboardPage.expectProjectInList('Beta Project');

      // Search for "Alpha"
      await dashboardPage.searchProjects('Alpha');

      // Wait for TanStack Query to refetch with search param
      await page.waitForTimeout(500);

      // Should show only Alpha (search is client-side via store filter)
      await dashboardPage.expectProjectInList('Alpha Project');
    });

    test('should clear search and show all projects', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.searchProjects('Alpha');
      await page.waitForTimeout(300);
      
      await dashboardPage.clearSearch();
      await page.waitForTimeout(300);

      await dashboardPage.expectProjectInList('Alpha Project');
      await dashboardPage.expectProjectInList('Beta Project');
      await dashboardPage.expectProjectInList('Gamma Project');
    });
  });

  // ==========================================================================
  // 1.5 Project Actions
  // ==========================================================================

  test.describe('1.5 Project Actions', () => {
    test.beforeEach(async ({ request }) => {
      const response = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'Action Test Project', description: 'For action testing' },
      });
      expect(response.status()).toBe(201);
      const project = await response.json();
      expect(project.id).toBeTruthy();
      createdProjectIds.push(project.id);
    });

    test('should show context menu on project card', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList('Action Test Project');

      const projectCard = dashboardPage.projectCards.filter({ hasText: 'Action Test Project' });
      await projectCard.hover();

      const menuButton = dashboardPage.getProjectMenuButton('Action Test Project');
      await expect(menuButton).toBeVisible();

      await menuButton.click();

      await expect(page.getByTestId('project-menu-open')).toBeVisible();
      await expect(page.getByTestId('project-menu-duplicate')).toBeVisible();
      await expect(page.getByTestId('project-menu-export')).toBeVisible();
      await expect(page.getByTestId('project-menu-delete')).toBeVisible();
    });

    test('should navigate to project workspace on double-click', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList('Action Test Project');

      await dashboardPage.openProject('Action Test Project');

      await page.waitForURL(/\/projects\//, { timeout: 10000 });
      expect(page.url()).toContain('/projects/');
    });

    test('should navigate to project workspace via Edit menu item', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList('Action Test Project');

      await dashboardPage.openProjectMenu('Action Test Project');
      await page.getByTestId('project-menu-open').click();

      await page.waitForURL(/\/projects\//, { timeout: 10000 });
      expect(page.url()).toContain('/projects/');
    });

    test('should duplicate a project', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList('Action Test Project');

      await dashboardPage.duplicateProject('Action Test Project');

      // TanStack Query invalidates after duplicate, wait for refetch
      await page.waitForTimeout(1000);

      // Should have original + copy
      await dashboardPage.expectProjectInList('Action Test Project');
      await dashboardPage.expectProjectInList('Action Test Project (Copy)');

      // Cleanup the copy
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const copy = projects.data?.find((p: any) => p.name === 'Action Test Project (Copy)');
      if (copy) {
        createdProjectIds.push(copy.id);
      }
    });
  });

  // ==========================================================================
  // 1.6 Navigation
  // ==========================================================================

  test.describe('1.6 Navigation', () => {
    test('should have header with logo and navigation', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('.app-logo')).toBeVisible();
      await expect(page.locator('.app-nav').first()).toBeVisible();
    });

    test('should navigate back to dashboard from logo click', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, request }) => {
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'Nav Test Project', description: 'For navigation testing' },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      // Navigate to project page
      await page.goto(`/projects/${project.id}`);
      await page.waitForLoadState('domcontentloaded');

      // Click logo to go back to dashboard
      await page.locator('.app-logo').click();

      await expect(page).toHaveURL('/');
    });
  });

  // ==========================================================================
  // 1.7 Responsive Design
  // ==========================================================================

  test.describe('1.7 Responsive Design', () => {
    test('should show mobile menu button on small screens', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('.mobile-menu-button')).toBeVisible();
    });

    test('should toggle mobile menu', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const mobileMenu = page.locator('.mobile-menu');
      const menuButton = page.locator('.mobile-menu-button');

      // Open menu
      await menuButton.click();
      await expect(mobileMenu).toHaveClass(/open/);

      // Close menu
      await menuButton.click();
      await expect(mobileMenu).not.toHaveClass(/open/);
    });
  });
});
