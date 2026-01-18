/**
 * Flow 8: Export
 *
 * E2E tests for exporting pages and projects in various formats.
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

async function setupExport(api: any, page: any) {
  const project = await api.createProject(`Export Project ${Date.now()}`);
  const storyboard = await api.createStoryboard(project.id, "Export Storyboard");
  await api.createPanel(storyboard.id, "Export panel");
  await page.goto(`/export?storyboardId=${storyboard.id}`);
  return { project, storyboard };
}

test.describe('Flow 8: Export', () => {
  test('should display export options', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);
    await expect(page.getByTestId('export-dialog')).toBeVisible();
    await expect(page.getByTestId('export-format')).toBeVisible();
    await expect(page.getByLabel(/include metadata/i)).toBeChecked();
  });

  test('should export single page as PNG', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);

    await page.route('**/api/composition/compose', async (route: any) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, outputPath: '/output/pages/export_page1.png' }),
      });
    });

    await page.getByRole('radio', { name: /png.*single|single.*png/i }).click();
    await page.getByRole('button', { name: /^export$/i }).click();
    await expect(page.getByTestId('export-complete')).toBeVisible();
    await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
  });

  test('should export project as PDF', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);

    await page.route('**/api/composition/compose-storyboard', async (route: any) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          pages: [{ outputPath: '/output/pages/export_page1.png' }],
        }),
      });
    });

    await page.route('**/api/composition/export', async (route: any) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, outputPath: '/output/export.pdf' }),
      });
    });

    await page.getByRole('radio', { name: /pdf/i }).click();
    await page.getByRole('button', { name: /^export$/i }).click();
    await expect(page.getByTestId('export-complete')).toBeVisible();
    await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
  });
});
