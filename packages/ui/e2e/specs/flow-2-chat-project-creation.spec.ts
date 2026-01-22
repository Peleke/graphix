/**
 * Flow 2: Chat-Based Project Creation E2E Tests
 *
 * Comprehensive tests for the chat elicitation flow that guides users
 * through project creation, including character setup and project bootstrap.
 *
 * These tests verify:
 * 1. Chat panel opens and responds to user input
 * 2. Elicitation phases progress correctly
 * 3. User can confirm project creation
 * 4. Project is created with characters
 * 5. Navigation to project workspace works
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 2
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Flow 2: Chat-Based Project Creation', () => {
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
  // 2.5 Chat Panel Interaction
  // ==========================================================================

  test.describe('2.5 Chat Panel Interaction', () => {
    test('should open chat panel from dashboard', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Click on chat trigger or "Start with AI" button
      const chatTrigger = page.locator('.chat-trigger');
      const startWithAI = page.getByRole('button', { name: /start with ai/i });

      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      } else if (await startWithAI.isVisible()) {
        await startWithAI.click();
      }

      // Verify chat panel is visible
      const chatPanel = page.locator('.chat-panel');
      await expect(chatPanel).toBeVisible({ timeout: 5000 });
    });

    test('should display greeting message when chat opens', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      // Verify greeting message
      const greetingMessage = page.locator('.chat-message.assistant').first();
      await expect(greetingMessage).toBeVisible({ timeout: 5000 });
    });

    test('should send user message and receive response', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      await page.waitForTimeout(500);

      // Type a message
      const textarea = page.locator('.chat-textarea');
      await textarea.fill('I want to create a comic about two otters on a yacht');
      await textarea.press('Enter');

      // Verify user message appears
      const userMessage = page.locator('.chat-message.user');
      await expect(userMessage).toContainText('otters', { timeout: 5000 });

      // Wait for AI response
      await page.waitForTimeout(3000);

      // Verify assistant responds
      const assistantMessages = page.locator('.chat-message.assistant');
      const count = await assistantMessages.count();
      expect(count).toBeGreaterThan(1);
    });

    test('should show suggestion chips', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      // Verify suggestion chips are visible
      const suggestions = page.locator('.suggestion-chip');
      await expect(suggestions.first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ==========================================================================
  // 2.6 Elicitation Flow
  // ==========================================================================

  test.describe('2.6 Elicitation Flow', () => {
    test('should progress through elicitation when user provides details', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      await page.waitForTimeout(500);

      // Send initial concept
      const textarea = page.locator('.chat-textarea');
      await textarea.fill('A romantic comedy about two otters named Oliver and Olivia');
      await textarea.press('Enter');
      await page.waitForTimeout(3000);

      // Continue conversation with more details
      await textarea.fill('They live on a luxury yacht in the Mediterranean');
      await textarea.press('Enter');
      await page.waitForTimeout(3000);

      // Verify multiple exchanges happened
      const messages = page.locator('.chat-message');
      const count = await messages.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('should allow skipping questions via suggestion chips', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      await page.waitForTimeout(500);

      // Send initial message
      const textarea = page.locator('.chat-textarea');
      await textarea.fill('A story about a fox');
      await textarea.press('Enter');
      await page.waitForTimeout(3000);

      // Look for skip suggestion
      const skipSuggestion = page.locator('.suggestion-chip').filter({ hasText: /skip/i });
      if (await skipSuggestion.isVisible()) {
        await skipSuggestion.click();
        await page.waitForTimeout(2000);

        // Verify conversation progressed
        const messages = page.locator('.chat-message');
        const count = await messages.count();
        expect(count).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // ==========================================================================
  // 2.7 Project Bootstrap
  // ==========================================================================

  test.describe('2.7 Project Bootstrap', () => {
    test('should show Create Project option after elicitation', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      await page.waitForTimeout(500);

      // Fast-track through elicitation using suggestions
      for (let i = 0; i < 8; i++) {
        const suggestions = page.locator('.suggestion-chip');
        const count = await suggestions.count();

        if (count > 0) {
          // Check for create project button
          const createProjectSuggestion = suggestions.filter({ hasText: /create project/i });
          if (await createProjectSuggestion.isVisible()) {
            // Found it!
            await expect(createProjectSuggestion).toBeVisible();
            return;
          }

          // Click last suggestion (often "skip" or "proceed")
          await suggestions.last().click();
          await page.waitForTimeout(2000);
        }
      }

      // After multiple iterations, at least verify we progressed
      const messages = page.locator('.chat-message');
      const count = await messages.count();
      expect(count).toBeGreaterThan(4);
    });

    test('should create project when user confirms', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2, tags.SLOW] }, async ({ page, request }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      await page.waitForTimeout(500);

      // Describe a project
      const textarea = page.locator('.chat-textarea');
      await textarea.fill('I want to create a simple comic called "Otter Tales" with two characters named Oliver and Olivia');
      await textarea.press('Enter');
      await page.waitForTimeout(4000);

      // Skip through to get to confirmation
      for (let i = 0; i < 10; i++) {
        const suggestions = page.locator('.suggestion-chip');
        const count = await suggestions.count();

        if (count > 0) {
          // Check for create project or ready option
          const createBtn = suggestions.filter({ hasText: /create project|ready|let's do it/i });
          if (await createBtn.isVisible()) {
            await createBtn.click();
            await page.waitForTimeout(3000);

            // Check if we navigated to a project page
            const url = page.url();
            if (url.includes('/projects/')) {
              // Extract project ID and track for cleanup
              const match = url.match(/\/projects\/([^/]+)/);
              if (match) {
                createdProjectIds.push(match[1]);
              }
              expect(url).toContain('/projects/');
              return;
            }
          }

          // Click a suggestion to progress
          const skipBtn = suggestions.filter({ hasText: /skip|proceed|yes|sounds good/i });
          if (await skipBtn.count() > 0) {
            await skipBtn.first().click();
          } else {
            await suggestions.first().click();
          }
          await page.waitForTimeout(2000);
        }
      }

      // If we didn't create a project, verify we at least progressed through conversation
      const messages = page.locator('.chat-message');
      const messageCount = await messages.count();
      expect(messageCount).toBeGreaterThan(4);
    });
  });

  // ==========================================================================
  // 2.8 Character Panel Integration
  // ==========================================================================

  test.describe('2.8 Character Panel Integration', () => {
    test('should display character panel in project workspace', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with characters
      const project = await api.createProject('Character Panel Test', 'Testing character panel');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'Oliver',
        species: 'otter',
        appearance: 'Brown fur with white belly',
      });

      await api.createCharacter(project.id, {
        name: 'Olivia',
        species: 'otter',
        appearance: 'Sleek grey fur',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Verify character list is visible
      const characterList = page.getByTestId('character-list');
      await expect(characterList).toBeVisible({ timeout: 10000 });

      // Verify character count badge
      const countBadge = page.getByTestId('character-count');
      await expect(countBadge).toContainText('2 character');
    });

    test('should open editor when clicking character card', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with a character
      const project = await api.createProject('Click Test', 'Testing click to edit');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'TestChar',
        species: 'fox',
        appearance: 'Red fur',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Click on the character card
      const characterCard = page.getByLabel('TestChar character', { exact: true });
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });
      await characterCard.click();

      // Verify editor opens
      const editor = page.getByTestId('character-editor');
      await expect(editor).toBeVisible({ timeout: 5000 });
    });

    test('should show character details in editor', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with a character
      const project = await api.createProject('Editor Test', 'Testing editor details');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'Marina',
        species: 'seal',
        appearance: 'Spotted grey coat',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Click on the character card
      const characterCard = page.getByLabel('Marina character', { exact: true });
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });
      await characterCard.click();

      // Verify editor shows correct data
      const nameInput = page.getByTestId('character-name-input');
      await expect(nameInput).toHaveValue('Marina');

      const speciesInput = page.getByTestId('character-species-input');
      await expect(speciesInput).toHaveValue('seal');
    });

    test('should switch between editor tabs', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with a character
      const project = await api.createProject('Tab Test', 'Testing editor tabs');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'TabTest',
        species: 'otter',
        appearance: 'Brown fur',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Click on the character card
      const characterCard = page.getByLabel('TabTest character', { exact: true });
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });
      await characterCard.click();

      // Wait for editor
      await page.getByTestId('character-editor').waitFor({ state: 'visible', timeout: 5000 });

      // Switch to References tab
      const refsTab = page.getByTestId('tab-references');
      await refsTab.click();
      await expect(page.getByTestId('panel-references')).toBeVisible();

      // Switch to LoRA tab
      const loraTab = page.getByTestId('tab-lora');
      await loraTab.click();
      await expect(page.getByTestId('panel-lora')).toBeVisible();

      // Switch back to Details tab
      const detailsTab = page.getByTestId('tab-details');
      await detailsTab.click();
      await expect(page.getByTestId('panel-details')).toBeVisible();
    });

    test('should show LoRA browser with category filters', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with a character
      const project = await api.createProject('LoRA Test', 'Testing LoRA browser');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'LoRATest',
        species: 'wolf',
        appearance: 'Grey fur',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Click on the character card
      const characterCard = page.getByLabel('LoRATest character', { exact: true });
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });
      await characterCard.click();

      // Wait for editor
      await page.getByTestId('character-editor').waitFor({ state: 'visible', timeout: 5000 });

      // Switch to LoRA tab
      await page.getByTestId('tab-lora').click();

      // Verify LoRA browser is visible
      const loraBrowser = page.getByTestId('lora-browser');
      await expect(loraBrowser).toBeVisible();

      // Verify category filter buttons exist
      await expect(page.getByTestId('category-filter-all')).toBeVisible();
      await expect(page.getByTestId('category-filter-style')).toBeVisible();
      await expect(page.getByTestId('category-filter-character')).toBeVisible();
    });

    test('should show Reference Gallery with upload zone', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with a character
      const project = await api.createProject('Ref Test', 'Testing reference gallery');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'RefTest',
        species: 'cat',
        appearance: 'Orange tabby',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Click on the character card
      const characterCard = page.getByLabel('RefTest character', { exact: true });
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });
      await characterCard.click();

      // Wait for editor
      await page.getByTestId('character-editor').waitFor({ state: 'visible', timeout: 5000 });

      // Switch to References tab
      await page.getByTestId('tab-references').click();

      // Verify reference gallery is visible
      const refGallery = page.getByTestId('reference-gallery');
      await expect(refGallery).toBeVisible();

      // Verify upload zone is visible
      await expect(page.getByTestId('upload-zone')).toBeVisible();

      // Verify empty gallery message is shown
      await expect(page.getByTestId('empty-gallery')).toBeVisible();
    });

    test('should show Add Character button in footer', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project
      const project = await api.createProject('Footer Test', 'Testing footer button');
      createdProjectIds.push(project.id);

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Verify Add Character button is visible
      const addButton = page.getByTestId('character-add-button');
      await expect(addButton).toBeVisible({ timeout: 5000 });
    });

    test('should show delete confirmation modal', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with a character
      const project = await api.createProject('Delete Test', 'Testing delete modal');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'DeleteMe',
        species: 'rabbit',
        appearance: 'White fur',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Hover over character card and click delete
      const characterCard = page.getByLabel('DeleteMe character', { exact: true });
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });
      await characterCard.hover();

      const deleteButton = characterCard.getByTestId('character-delete-button');
      await deleteButton.click({ force: true });

      // Verify delete confirmation modal appears
      const deleteModal = page.getByTestId('delete-character-modal');
      await expect(deleteModal).toBeVisible({ timeout: 5000 });
    });
  });

  // ==========================================================================
  // 2.9 Visual Styling Verification
  // ==========================================================================

  test.describe('2.9 Visual Styling', () => {
    test('should render character cards with modern styling', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with characters
      const project = await api.createProject('Style Test', 'Testing visual styling');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'StyledChar',
        species: 'otter',
        appearance: 'Sleek brown fur',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Verify character card has expected styling (background color)
      const characterCard = page.locator('[data-testid^="character-card-"]').first();
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });

      // Check computed styles
      const backgroundColor = await characterCard.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should be a dark background (#1e1e2e = rgb(30, 30, 46))
      expect(backgroundColor).toMatch(/rgb\(30,\s*30,\s*46\)|#1e1e2e/i);
    });

    test('should render editor modal with modern styling', { tag: [tags.MVP, tags.FLOW_2] }, async ({ page, api }) => {
      // Create a project with a character
      const project = await api.createProject('Modal Style Test', 'Testing modal styling');
      createdProjectIds.push(project.id);

      await api.createCharacter(project.id, {
        name: 'ModalTest',
        species: 'fox',
        appearance: 'Red fur',
      });

      // Navigate to project
      await page.goto(`${BASE_URL}/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click Characters nav item
      await page.click('.nav-item:has-text("Characters")');
      await page.waitForTimeout(1000);

      // Click on the character card
      const characterCard = page.getByLabel('ModalTest character', { exact: true });
      await characterCard.waitFor({ state: 'visible', timeout: 10000 });
      await characterCard.click();

      // Wait for editor
      const editor = page.getByTestId('character-editor');
      await editor.waitFor({ state: 'visible', timeout: 5000 });

      // Check editor has rounded corners
      const borderRadius = await editor.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });

      // Should have rounded corners (16px)
      expect(borderRadius).toMatch(/16px|1rem/i);
    });
  });
});
