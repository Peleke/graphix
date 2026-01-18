/**
 * Visual Regression Tests
 *
 * Screenshot comparison tests to catch unintended visual changes.
 * Uses Playwright's built-in toHaveScreenshot() with baselines stored via Git LFS.
 *
 * Run `npx playwright test visual-regression --update-snapshots` to generate baselines.
 *
 * @see playwright.config.ts for snapshot settings
 * @see .gitattributes for Git LFS configuration
 */

import type { Page } from '@playwright/test';
import { test, expect, tags, waitForNetworkIdle } from '../fixtures/test-fixtures';

const FIXED_NOW = new Date('2024-01-15T12:00:00.000Z').getTime();
const MOCK_PROJECTS = [
  {
    id: 'proj-neon-harbor',
    name: 'Neon Harbor',
    description: 'Pilot issue with neon-lit docks and fog.',
    createdAt: new Date(FIXED_NOW).toISOString(),
    updatedAt: new Date(FIXED_NOW).toISOString(),
    settings: { panelCount: 12, template: 'Comic' },
  },
  {
    id: 'proj-velvet-crew',
    name: 'Velvet Crew',
    description: 'Character-focused vignettes and close-ups.',
    createdAt: new Date(FIXED_NOW).toISOString(),
    updatedAt: new Date(FIXED_NOW).toISOString(),
    settings: { panelCount: 4, template: 'Manga' },
  },
];

async function freezeTimeAndRandomness(page: Page) {
  await page.addInitScript(({ timestamp }) => {
    const OriginalDate = Date;
    class MockDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          return new OriginalDate(timestamp);
        }
        return new OriginalDate(...args);
      }
      static now() {
        return timestamp;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Date = MockDate;
  }, { timestamp: FIXED_NOW });

  await page.addInitScript(({ seed }) => {
    let value = seed % 2147483647;
    if (value <= 0) value += 2147483646;
    Math.random = () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }, { seed: 1337 });
}

async function mockProjectsResponse(page: Page, projects: typeof MOCK_PROJECTS) {
  await page.route('**/api/projects**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: projects,
        pagination: { page: 1, limit: 50, total: projects.length },
      }),
    });
  });
}

test.skip(({ browserName }) => browserName !== 'chromium', 'Visual baselines tracked only for Chromium.');

test.beforeEach(async ({ page }) => {
  await freezeTimeAndRandomness(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('Visual Regression: Dashboard', () => {
  test('empty state - desktop', { tag: [tags.MVP, tags.SMOKE, tags.REGRESSION] }, async ({ page }) => {
    await mockProjectsResponse(page, []);
    await page.goto('/');
    await waitForNetworkIdle(page);
    await page.getByRole('heading', { name: 'Projects', level: 1 }).waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('dashboard-empty-desktop.png', { fullPage: true });
  });

  test('empty state - mobile', { tag: [tags.MVP, tags.REGRESSION] }, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockProjectsResponse(page, []);
    await page.goto('/');
    await waitForNetworkIdle(page);
    await page.getByRole('heading', { name: 'Projects', level: 1 }).waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('dashboard-empty-mobile.png', { fullPage: true });
  });

  test('with projects - desktop', { tag: [tags.MVP, tags.SMOKE, tags.REGRESSION] }, async ({ page }) => {
    await mockProjectsResponse(page, MOCK_PROJECTS);
    await page.goto('/');
    await waitForNetworkIdle(page);
    await page.getByLabel('Neon Harbor project').waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('dashboard-with-projects-desktop.png', { fullPage: true });
  });

  test('create modal - desktop', { tag: [tags.MVP, tags.REGRESSION] }, async ({ page }) => {
    await mockProjectsResponse(page, []);
    await page.goto('/');
    await waitForNetworkIdle(page);
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByRole('heading', { name: 'Create New Project' }).waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('dashboard-create-modal-desktop.png', { fullPage: true });
  });
});

test.describe('Visual Regression: Generation Tree', () => {
  test('generation tree demo - desktop', { tag: [tags.MVP, tags.REGRESSION] }, async ({ page }) => {
    await page.goto('/demo/generation-tree');
    await waitForNetworkIdle(page);
    await page.getByText('Generation Tree Demo').waitFor({ state: 'visible' });
    await page.locator('svg').first().waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('generation-tree-demo-desktop.png', { fullPage: true });
  });
});
