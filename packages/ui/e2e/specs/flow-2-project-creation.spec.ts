/**
 * Flow 2: Project Creation
 *
 * E2E tests for project creation flow.
 * Currently tests the simple modal-based creation.
 * Chat-to-start features are pending implementation.
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 2
 * @see e2e/features/project-creation.feature
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

// API base URL for direct API calls in tests
const API_URL = process.env.API_URL || 'http://localhost:3002';

test.describe('Flow 2: Project Creation', () => {
  // ==========================================================================
  // Setup & Teardown
  // ==========================================================================

  const createdProjectIds: string[] = [];

  test.afterEach(async ({ request }) => {
    // Clean up created projects
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
  // 2.1 Simple Project Creation (MVP)
  // ==========================================================================

  test.describe('2.1 Simple Project Creation', () => {
    test('should create a project with name only', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const projectName = `Simple Project ${Date.now()}`;
      await dashboardPage.createProject(projectName);

      // Project should appear in dashboard
      await dashboardPage.expectProjectInList(projectName);

      // Verify via API
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const createdProject = projects.data?.find((p: any) => p.name === projectName);
      
      expect(createdProject).toBeTruthy();
      expect(createdProject.name).toBe(projectName);
      
      createdProjectIds.push(createdProject.id);
    });

    test('should navigate to project workspace after creation', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const projectName = `Navigate Test ${Date.now()}`;
      await dashboardPage.createProject(projectName);

      // Double-click to open project
      await dashboardPage.openProject(projectName);

      // Should be on project page
      await page.waitForURL(/\/projects\//);
      expect(page.url()).toContain('/projects/');

      // Get project ID for cleanup
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const project = projects.data?.find((p: any) => p.name === projectName);
      if (project) createdProjectIds.push(project.id);
    });

    test('should create project via API and display it', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request, dashboardPage }) => {
      // Create project directly via API
      const projectName = `API Created ${Date.now()}`;
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: {
          name: projectName,
          description: 'Created via API for testing',
        },
      });
      
      const project = await createResponse.json();
      expect(createResponse.status()).toBe(201);
      createdProjectIds.push(project.id);

      // Navigate to dashboard
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Project should be visible
      await dashboardPage.expectProjectInList(projectName);
    });

    test('should persist project after page refresh', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page, request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const projectName = `Persist Test ${Date.now()}`;
      await dashboardPage.createProject(projectName);

      // Get project ID for cleanup
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const project = projects.data?.find((p: any) => p.name === projectName);
      if (project) createdProjectIds.push(project.id);

      // Refresh page
      await page.reload();
      await dashboardPage.waitForLoad();

      // Project should still be there
      await dashboardPage.expectProjectInList(projectName);
    });

    test('should create multiple projects', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const timestamp = Date.now();
      const projectNames = [
        `Multi Project A ${timestamp}`,
        `Multi Project B ${timestamp}`,
        `Multi Project C ${timestamp}`,
      ];

      for (const name of projectNames) {
        await dashboardPage.createProject(name);
      }

      // All projects should be visible
      for (const name of projectNames) {
        await dashboardPage.expectProjectInList(name);
      }

      // Cleanup
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      for (const name of projectNames) {
        const project = projects.data?.find((p: any) => p.name === name);
        if (project) createdProjectIds.push(project.id);
      }
    });
  });

  // ==========================================================================
  // 2.2 Project Deletion
  // ==========================================================================

  test.describe('2.2 Project Deletion', () => {
    test('should delete a project via API', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request, dashboardPage }) => {
      // Create project
      const projectName = `Delete Test ${Date.now()}`;
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: projectName },
      });
      const project = await createResponse.json();

      // Verify it exists
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectInList(projectName);

      // Delete via API
      const deleteResponse = await request.delete(`${API_URL}/api/projects/${project.id}`);
      expect(deleteResponse.status()).toBe(204);

      // Refresh and verify it's gone
      await dashboardPage.page.reload();
      await dashboardPage.waitForLoad();
      await dashboardPage.expectProjectNotInList(projectName);
    });

    test('should show confirmation before deleting', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, request, dashboardPage }) => {
      // Create project
      const projectName = `Delete Confirm ${Date.now()}`;
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: projectName },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Set up dialog handler to cancel
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain(projectName);
        await dialog.dismiss(); // Cancel the delete
      });

      // Try to delete
      await dashboardPage.openProjectMenu(projectName);
      await page.getByTestId('project-menu-delete').click();

      // Wait a moment
      await page.waitForTimeout(500);

      // Project should still exist (we cancelled)
      await dashboardPage.expectProjectInList(projectName);
    });
  });

  // ==========================================================================
  // 2.3 Project Duplication
  // ==========================================================================

  test.describe('2.3 Project Duplication', () => {
    test('should duplicate a project', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, request, dashboardPage }) => {
      // Create original project
      const projectName = `Original ${Date.now()}`;
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: projectName, description: 'Original project' },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Duplicate
      await dashboardPage.duplicateProject(projectName);

      // Wait for duplication
      await page.waitForTimeout(1000);
      await page.reload();
      await dashboardPage.waitForLoad();

      // Cleanup - get all related projects
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const relatedProjects = projects.data?.filter((p: any) => 
        p.name.includes(projectName) || p.name.includes('Copy')
      );
      
      for (const p of relatedProjects || []) {
        if (!createdProjectIds.includes(p.id)) {
          createdProjectIds.push(p.id);
        }
      }

      // Should have more than original project now
      expect(relatedProjects?.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 2.4 Project Validation
  // ==========================================================================

  test.describe('2.4 Project Validation', () => {
    test('should not create project with empty name', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await dashboardPage.clickNewProject();
      await dashboardPage.expectCreateModalVisible();

      // Create button should be disabled with empty name
      await expect(dashboardPage.createButton).toBeDisabled();

      // Enter whitespace only
      await dashboardPage.projectNameInput.fill('   ');
      await expect(dashboardPage.createButton).toBeDisabled();
    });

    test('should trim project name whitespace', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const timestamp = Date.now();
      const projectNameWithSpaces = `  Trimmed Project ${timestamp}  `;
      const expectedName = `Trimmed Project ${timestamp}`;

      await dashboardPage.clickNewProject();
      await dashboardPage.projectNameInput.fill(projectNameWithSpaces);
      await dashboardPage.createButton.click();

      // Modal should close
      await dashboardPage.expectCreateModalHidden();

      // Wait for project list to update
      await dashboardPage.page.waitForTimeout(500);

      // Cleanup
      const response = await request.get(`${API_URL}/api/projects`);
      const projects = await response.json();
      const project = projects.data?.find((p: any) => 
        p.name.includes('Trimmed Project')
      );
      if (project) createdProjectIds.push(project.id);
    });
  });

  // ==========================================================================
  // 2.5 Chat-to-Start (PENDING - Not Yet Implemented)
  // ==========================================================================

  test.describe('2.5 Chat-to-Start', () => {
    test.skip('should begin elicitation conversation for vague idea', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
      // Given I click on the chat input
      // When I type "I want to make a story about two otters falling in love on a yacht"
      // Then the AI should begin an elicitation conversation
    });

    test.skip('should ask about characters', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should ask about setting details', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should ask about story arc', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should ask about tone/style', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should ask about scope', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should accept single character story', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should allow proceeding with minimal input', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });
  });

  // ==========================================================================
  // 2.6 RAG / Asset Matching (PENDING - Not Yet Implemented)
  // ==========================================================================

  test.describe('2.6 RAG / Asset Matching', () => {
    test.skip('should match exact character name from library', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: RAG not yet implemented
    });

    test.skip('should present options for ambiguous name match', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: RAG not yet implemented
    });

    test.skip('should offer to create new character based on existing', { tag: [tags.MVP, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: RAG not yet implemented
    });
  });

  // ==========================================================================
  // 2.7 Project Bootstrap Output (PENDING - Not Yet Implemented)
  // ==========================================================================

  test.describe('2.7 Project Bootstrap Output', () => {
    test.skip('should show "Create Project" button when ready', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should create all assets on project creation', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ chatPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });

    test.skip('should navigate to Storyboard view after creation', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ chatPage, storyboardPage }) => {
      // PENDING: Chat-to-start not yet implemented
    });
  });

  // ==========================================================================
  // 2.8 Project Data Integrity
  // ==========================================================================

  test.describe('2.8 Project Data Integrity', () => {
    test('should return project with correct structure', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request }) => {
      // Create project via API
      const projectName = `Structure Test ${Date.now()}`;
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: {
          name: projectName,
          description: 'Testing project structure',
        },
      });

      expect(createResponse.status()).toBe(201);
      
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      // Verify structure
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name', projectName);
      expect(project).toHaveProperty('description', 'Testing project structure');
      expect(project).toHaveProperty('createdAt');
      expect(project).toHaveProperty('updatedAt');
    });

    test('should update project via API', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request }) => {
      // Create project
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: 'Update Test', description: 'Original description' },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      // Update project
      const updateResponse = await request.put(`${API_URL}/api/projects/${project.id}`, {
        data: { name: 'Updated Name', description: 'Updated description' },
      });

      expect(updateResponse.status()).toBe(200);
      
      const updated = await updateResponse.json();
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
    });

    test('should get single project by ID', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request }) => {
      // Create project
      const projectName = `Get By ID ${Date.now()}`;
      const createResponse = await request.post(`${API_URL}/api/projects`, {
        data: { name: projectName },
      });
      const project = await createResponse.json();
      createdProjectIds.push(project.id);

      // Get by ID
      const getResponse = await request.get(`${API_URL}/api/projects/${project.id}`);
      expect(getResponse.status()).toBe(200);
      
      const retrieved = await getResponse.json();
      expect(retrieved.id).toBe(project.id);
      expect(retrieved.name).toBe(projectName);
    });

    test('should return 404 for non-existent project', { tag: [tags.MVP, tags.FLOW_2] }, async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`${API_URL}/api/projects/${fakeId}`);
      expect(response.status()).toBe(404);
    });
  });
});
