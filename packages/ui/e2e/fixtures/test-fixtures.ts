/**
 * Graphix E2E Test Fixtures
 *
 * Extended Playwright test fixtures for Graphix-specific testing needs.
 * Provides common setup, page objects, and test utilities.
 */

import { test as base, expect, type Page } from '@playwright/test';

// Import page objects
import { DashboardPage } from '../pages/dashboard.page';
import { OnboardingPage } from '../pages/onboarding.page';
import { ChatPage } from '../pages/chat.page';
import { StoryboardPage } from '../pages/storyboard.page';
import { PanelEditorPage } from '../pages/panel-editor.page';
import { CharacterEditorPage } from '../pages/character-editor.page';
import { PageComposerPage } from '../pages/page-composer.page';
import { ControlNetPage } from '../pages/controlnet.page';
import { ExportPage } from '../pages/export.page';
import { YoloPage } from '../pages/yolo.page';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Test project fixture data
 */
interface TestProject {
  id: string;
  name: string;
  description?: string;
}

/**
 * Test character fixture data
 */
interface TestCharacter {
  id: string;
  name: string;
  species: string;
  appearance: string;
}

/**
 * Test panel fixture data
 */
interface TestPanel {
  id: string;
  description: string;
  position: number;
}

/**
 * Test storyboard fixture data
 */
interface TestStoryboard {
  id: string;
  name: string;
  description?: string;
}

/**
 * API helper for test setup/teardown
 */
interface ApiHelper {
  createProject(name: string, description?: string): Promise<TestProject>;
  createStoryboard(projectId: string, name: string, description?: string): Promise<TestStoryboard>;
  createCharacter(projectId: string, data: Partial<TestCharacter>): Promise<TestCharacter>;
  createPanel(storyboardId: string, description: string): Promise<TestPanel>;
  cleanup(): Promise<void>;
}

// ============================================================================
// Extended Test Fixtures
// ============================================================================

/**
 * Extended Playwright fixtures for Graphix
 */
export const test = base.extend<{
  // Page Objects
  dashboardPage: DashboardPage;
  onboardingPage: OnboardingPage;
  chatPage: ChatPage;
  storyboardPage: StoryboardPage;
  panelEditorPage: PanelEditorPage;
  characterEditorPage: CharacterEditorPage;
  pageComposerPage: PageComposerPage;
  controlNetPage: ControlNetPage;
  exportPage: ExportPage;
  yoloPage: YoloPage;

  // Utilities
  api: ApiHelper;
  testProject: TestProject;
  testCharacter: TestCharacter;
}>({
  // Page Object Fixtures
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page));
  },

  chatPage: async ({ page }, use) => {
    await use(new ChatPage(page));
  },

  storyboardPage: async ({ page }, use) => {
    await use(new StoryboardPage(page));
  },

  panelEditorPage: async ({ page }, use) => {
    await use(new PanelEditorPage(page));
  },

  characterEditorPage: async ({ page }, use) => {
    await use(new CharacterEditorPage(page));
  },

  pageComposerPage: async ({ page }, use) => {
    await use(new PageComposerPage(page));
  },

  controlNetPage: async ({ page }, use) => {
    await use(new ControlNetPage(page));
  },

  exportPage: async ({ page }, use) => {
    await use(new ExportPage(page));
  },

  yoloPage: async ({ page }, use) => {
    await use(new YoloPage(page));
  },

  // API Helper Fixture
  api: async ({ request }, use) => {
    const createdResources: { type: string; id: string }[] = [];
    const apiUrl = process.env.API_URL || 'http://localhost:3002';

    const api: ApiHelper = {
      async createProject(name, description) {
        const response = await request.post(`${apiUrl}/api/projects`, {
          data: { name, description },
        });
        const project = await response.json();
        createdResources.push({ type: 'project', id: project.id });
        return project;
      },

      async createStoryboard(projectId, name, description) {
        const response = await request.post(`${apiUrl}/api/storyboards`, {
          data: { projectId, name, description },
        });
        const storyboard = await response.json();
        createdResources.push({ type: 'storyboard', id: storyboard.id });
        return storyboard;
      },

      async createCharacter(projectId, data) {
        const response = await request.post(`${apiUrl}/api/characters`, {
          data: {
            projectId,
            name: data.name || 'Test Character',
            profile: {
              species: data.species || 'otter',
              ...(data.appearance ? { distinguishing: [data.appearance] } : {}),
            },
          },
        });
        if (!response.ok()) {
          const body = await response.text();
          throw new Error(`Failed to create character: ${response.status()} ${body}`);
        }
        const character = await response.json();
        createdResources.push({ type: 'character', id: character.id });
        return character;
      },

      async createPanel(storyboardId, description) {
        const response = await request.post(`${apiUrl}/api/storyboards/${storyboardId}/panels`, {
          data: { description },
        });
        const panel = await response.json();
        createdResources.push({ type: 'panel', id: panel.id });
        return panel;
      },

      async cleanup() {
        // Clean up in reverse order (panels, characters, projects)
        for (const resource of createdResources.reverse()) {
          try {
            await request.delete(`${apiUrl}/api/${resource.type}s/${resource.id}`);
          } catch {
            // Ignore cleanup errors
          }
        }
      },
    };

    await use(api);
    await api.cleanup();
  },

  // Pre-created test project fixture
  testProject: async ({ api }, use) => {
    const project = await api.createProject('E2E Test Project', 'Created for E2E testing');
    await use(project);
    // Cleanup happens in api fixture
  },

  // Pre-created test character fixture
  testCharacter: async ({ api, testProject }, use) => {
    const character = await api.createCharacter(testProject.id, {
      name: 'Marina',
      species: 'otter',
      appearance: 'sleek brown fur, bright eyes, wearing a captain\'s hat',
    });
    await use(character);
    // Cleanup happens in api fixture
  },
});

// Re-export expect for convenience
export { expect };

// ============================================================================
// Test Tags
// ============================================================================

/**
 * Test tags for filtering and organization
 *
 * Usage: test('scenario name', { tag: ['@mvp', '@priority-high'] }, async () => {})
 */
export const tags = {
  // Priority tags
  MVP: '@mvp',
  PRIORITY_HIGH: '@priority-high',
  PRIORITY_MEDIUM: '@priority-medium',
  PRIORITY_LOW: '@priority-low',

  // Flow tags
  FLOW_1: '@flow-1',
  FLOW_2: '@flow-2',
  FLOW_3: '@flow-3',
  FLOW_4: '@flow-4',
  FLOW_5: '@flow-5',
  FLOW_6: '@flow-6',
  FLOW_7: '@flow-7',
  FLOW_8: '@flow-8',
  FLOW_9: '@flow-9',
  FLOW_10: '@flow-10',
  FLOW_11: '@flow-11',
  FLOW_12: '@flow-12',

  // Feature tags
  ONBOARDING: '@onboarding',
  PROJECT: '@project',
  CHARACTER: '@character',
  GENERATION: '@generation',
  COMPOSITION: '@composition',
  EXPORT: '@export',

  // Status tags
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  SLOW: '@slow',
} as const;

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for all network requests to complete
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a toast notification with specific text
 */
export async function waitForToast(page: Page, text: string): Promise<void> {
  await page.getByRole('alert').filter({ hasText: text }).waitFor({ state: 'visible' });
}

/**
 * Dismiss any open modals
 */
export async function dismissModals(page: Page): Promise<void> {
  const closeButtons = page.getByRole('button', { name: /close|cancel|dismiss/i });
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click();
  }
}

/**
 * Take a named screenshot for visual regression
 */
export async function takeSnapshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Check if element has specific CSS class
 */
export async function hasClass(page: Page, selector: string, className: string): Promise<boolean> {
  const element = page.locator(selector);
  const classes = await element.getAttribute('class');
  return classes?.includes(className) ?? false;
}

/**
 * Mock generation response for deterministic testing
 */
export async function mockGenerationResponse(page: Page, imageUrl: string): Promise<void> {
  await page.route('**/api/panels/*/generate', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        generatedImage: {
          id: 'mock-generation-id',
          url: imageUrl,
          width: 768,
          height: 1024,
        },
      }),
    });
  });
}
