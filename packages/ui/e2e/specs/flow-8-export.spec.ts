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
    await expect(page.getByLabel(/metadata always included/i)).toBeChecked();
    await expect(page.getByLabel(/filename/i)).toBeVisible();
  });

  test('should export single page as PNG', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);
    await page.getByLabel(/filename/i).fill('flow8-single');

    await page.route('**/api/composition/compose', async (route: any) => {
      const body = route.request().postDataJSON();
      expect(body.outputName).toBe('flow8-single.png');
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

  test('should export all pages as stitched PNG', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);
    await page.getByLabel(/filename/i).fill('flow8-all');

    await page.route('**/api/composition/export-storyboard', async (route: any) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          outputPath: '/output/pages/flow8-all.png',
          downloadUrl: '/api/composition/download?path=%2Foutput%2Fpages%2Fflow8-all.png',
        }),
      });
    });

    await page.getByRole('radio', { name: /png.*all|all.*png/i }).click();
    await page.getByRole('button', { name: /^export$/i }).click();
    await expect(page.getByTestId('export-complete')).toBeVisible();
    await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
  });

  test('should export project as PDF', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);
    await page.getByLabel(/filename/i).fill('flow8-pdf');

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
      const body = route.request().postDataJSON();
      expect(body.outputPath).toBe('flow8-pdf.pdf');
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

  test('should show progress and allow cancel', { tag: [tags.MVP, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);
    await page.getByLabel(/filename/i).fill('flow8-cancel');

    await page.route('**/api/composition/compose', async (route: any) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, outputPath: '/output/pages/export_page1.png' }),
      });
    });

    await page.getByRole('radio', { name: /png.*single|single.*png/i }).click();
    await page.getByRole('button', { name: /^export$/i }).click();
    await expect(page.getByTestId('export-progress')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByTestId('export-progress')).toBeHidden();
  });

  test('should surface errors from export', { tag: [tags.MVP, tags.FLOW_8] }, async ({ page, api }) => {
    await setupExport(api, page);

    await page.route('**/api/composition/compose', async (route: any) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Failed to compose' } }),
      });
    });

    await page.getByRole('button', { name: /^export$/i }).click();
    await expect(page.getByText(/failed to compose/i)).toBeVisible();
  });
});
