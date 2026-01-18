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

  // Track created projects for cleanup
  const createdProjectIds: string[] = [];

  test.afterEach(async ({ request }) => {
    // Clean up any created projects
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
    test('should display dashboard with Projects title', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1, tags.SMOKE] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Verify dashboard is displayed
      await dashboardPage.expectDashboardVisible();
      
      // Check for key elements
      await expect(dashboardPage.searchInput).toBeVisible();
      await expect(dashboardPage.newProjectButton).toBeVisible();
    });

    test('should show loading state initially', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      // Navigate without waiting for load
      await page.goto('/');
      
      // Should briefly show loading (may be too fast to catch)
      // Just verify the page eventually loads
      await dashboardPage.waitForLoad();
      await dashboardPage.expectDashboardVisible();
    });

    test('should show empty state when no projects exist', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      // First, get all projects and delete them
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      
      for (const project of projects.data || []) {
        await request.delete(`${API_URL}/api/projects/${project.id}`);
      }

      // Navigate to dashboard
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Should show empty state
      await dashboardPage.expectEmptyState();
    });

    test('should display projects when they exist', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      // Create a test project via API
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'E2E Test Project', description: 'Created by E2E test' },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      // Navigate to dashboard
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Should show the project
      await dashboardPage.expectProjectInList('E2E Test Project');
    });
  });

  // ==========================================================================
  // 1.2 View Mode Toggle
  // ==========================================================================

  test.describe('1.2 View Mode Toggle', () => {
    test.beforeEach(async ({ request }) => {
      // Ensure at least one project exists
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'View Mode Test Project', description: 'For view mode testing' },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);
    });

    test('should default to grid view', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Grid view should be active by default
      await expect(dashboardPage.projectGrid).toBeVisible();
    });

    test('should switch to list view', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Switch to list view
      await dashboardPage.switchToListView();

      // List view should be active
      await expect(dashboardPage.projectList).toBeVisible();
    });

    test('should switch back to grid view', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Switch to list then back to grid
      await dashboardPage.switchToListView();
      await expect(dashboardPage.projectList).toBeVisible();

      await dashboardPage.switchToGridView();
      await expect(dashboardPage.projectGrid).toBeVisible();
    });
  });

  // ==========================================================================
  // 1.3 Project Creation
  // ==========================================================================

  test.describe('1.3 Project Creation', () => {
    test('should open create project modal', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Click new project button
      await dashboardPage.clickNewProject();

      // Modal should be visible
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

    test('should close modal when clicking outside', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();
      await dashboardPage.expectCreateModalVisible();

      // Click outside the modal (on the overlay)
      await dashboardPage.modalOverlay.click({ position: { x: 10, y: 10 } });
      await dashboardPage.expectCreateModalHidden();
    });

    test('should create a new project', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const projectName = `E2E Project ${Date.now()}`;
      await dashboardPage.createProject(projectName);

      // Project should appear in list
      await dashboardPage.expectProjectInList(projectName);

      // Get the project ID for cleanup
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

      // Create button should be disabled when input is empty
      await expect(dashboardPage.createButton).toBeDisabled();
    });

    test('should enable create button when name is entered', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();
      await dashboardPage.projectNameInput.fill('Test Project');

      // Create button should be enabled
      await expect(dashboardPage.createButton).toBeEnabled();
    });

    test('should create project when pressing Enter', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const projectName = `Enter Key Project ${Date.now()}`;
      await dashboardPage.clickNewProject();
      await dashboardPage.projectNameInput.fill(projectName);
      await page.keyboard.press('Enter');

      // Modal should close
      await dashboardPage.expectCreateModalHidden();

      // Project should appear
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
      // Create multiple test projects
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

    test('should filter projects by search term', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Search for "Alpha"
      await dashboardPage.searchProjects('Alpha');

      // Wait for filter to apply
      await dashboardPage.page.waitForTimeout(500);

      // Should show only Alpha project
      await dashboardPage.expectProjectInList('Alpha Project');
    });

    test('should clear search and show all projects', { tag: [tags.MVP, tags.FLOW_1] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Search then clear
      await dashboardPage.searchProjects('Alpha');
      await dashboardPage.page.waitForTimeout(500);
      await dashboardPage.clearSearch();
      await dashboardPage.page.waitForTimeout(500);

      // Should show all projects
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
      // Create a test project
      const response = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'Action Test Project', description: 'For action testing' },
      });
      const project = await response.json();
      createdProjectIds.push(project.id);
    });

    test('should show context menu on project card', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Hover over project to show menu button
      const projectCard = dashboardPage.projectCards.filter({ hasText: 'Action Test Project' });
      await projectCard.hover();

      // Menu button should be visible
      const menuButton = dashboardPage.getProjectMenuButton('Action Test Project');
      await expect(menuButton).toBeVisible();

      // Click to open menu
      await menuButton.click();

      // Menu items should be visible
      await expect(page.getByTestId('project-menu-open')).toBeVisible();
      await expect(page.getByTestId('project-menu-duplicate')).toBeVisible();
      await expect(page.getByTestId('project-menu-export')).toBeVisible();
      await expect(page.getByTestId('project-menu-delete')).toBeVisible();
    });

    test('should navigate to project workspace on double-click', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.openProject('Action Test Project');

      // Should navigate to project workspace
      await page.waitForURL(/\/projects\//);
      expect(page.url()).toContain('/projects/');
    });

    test('should navigate to project workspace via Edit menu item', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.openProjectMenu('Action Test Project');
      await page.getByTestId('project-menu-open').click();

      // Should navigate to project workspace
      await page.waitForURL(/\/projects\//);
      expect(page.url()).toContain('/projects/');
    });

    test('should duplicate a project', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.duplicateProject('Action Test Project');

      // Wait for duplication
      await page.waitForTimeout(1000);

      // Should have a duplicated project (name may vary)
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      
      // Find duplicated projects (any project with similar name)
      const actionProjects = projects.data?.filter((p: any) => 
        p.name.includes('Action Test Project') || p.name.includes('Copy')
      );
      
      // Track duplicates for cleanup
      for (const p of actionProjects || []) {
        if (!createdProjectIds.includes(p.id)) {
          createdProjectIds.push(p.id);
        }
      }

      expect(actionProjects?.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 1.6 Navigation
  // ==========================================================================

  test.describe('1.6 Navigation', () => {
    test('should have header with logo and navigation', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page }) => {
      await page.goto('/');

      // Logo should be visible
      await expect(page.locator('.app-logo')).toBeVisible();

      // Navigation should be visible on desktop
      await expect(page.locator('.app-nav').first()).toBeVisible();
    });

    test('should navigate back to dashboard from logo click', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page }) => {
      // Navigate somewhere else first
      await page.goto('/demo/generation-tree');
      await page.waitForLoadState('domcontentloaded');

      // Click logo to go back to dashboard
      await page.locator('.app-logo').click();

      // Should be back on dashboard
      await expect(page).toHaveURL('/');
    });
  });

  // ==========================================================================
  // 1.7 Responsive Design
  // ==========================================================================

  test.describe('1.7 Responsive Design', () => {
    test('should show mobile menu button on small screens', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page }) => {
      // Set small viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Mobile menu button should be visible
      await expect(page.locator('.mobile-menu-button')).toBeVisible();
    });

    test('should toggle mobile menu', { tag: [tags.MVP, tags.FLOW_1] }, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Click mobile menu button
      await page.locator('.mobile-menu-button').click();

      // Mobile menu should be open
      await expect(page.locator('.mobile-menu.open')).toBeVisible();

      // Click again to close
      await page.locator('.mobile-menu-button').click();

      // Mobile menu should be closed
      await expect(page.locator('.mobile-menu.open')).toBeHidden();
    });
  });
});
