/**
 * Flow 7: ControlNet Configuration
 *
 * E2E tests for control level exposure, reference selection, preview, and
 * multi-control configuration in the Panel Generator.
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

async function setupPanelGenerator(api: any, page: any) {
  const project = await api.createProject(`ControlNet Project ${Date.now()}`);
  const storyboard = await api.createStoryboard(project.id, "ControlNet Board");
  const panel = await api.createPanel(storyboard.id, "ControlNet panel");

  await page.route('**/api/generations/panel/**', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generations: [
          {
            id: 'gen-controlnet-1',
            panelId: panel.id,
            localPath: '/output/mock-controlnet-ref.png',
            seed: 4242,
          },
        ],
      }),
    });
  });

  await page.goto(`/projects/${project.id}?view=panel-generator&panelId=${panel.id}&storyboardId=${storyboard.id}`);

  return { project, storyboard, panel };
}

test.describe('Flow 7: ControlNet Configuration', () => {
  test('should display ControlNet panel and toggle controls', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_7] }, async ({ page, api }) => {
    await setupPanelGenerator(api, page);

    await expect(page.getByTestId('controlnet-container')).toBeVisible();
    await expect(page.getByTestId('controlnet-visual-cards')).toBeVisible();

    await page.getByTestId('control-card-openpose').getByRole('switch').click();
    await expect(page.getByTestId('active-controls-summary')).toContainText('openpose');
  });

  test('should preview ControlNet preprocessing and send control stack', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_7] }, async ({ page, api }) => {
    await setupPanelGenerator(api, page);

    await page.route('**/api/consistency/controlnet/preview', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          controlType: 'openpose',
          previewPath: '/output/mock-preview.png',
        }),
      });
    });

    const generateRequestPromise = page.waitForRequest('**/api/panels/*/generate');

    await page.getByTestId('control-card-openpose').getByRole('switch').click();
    await page.getByTestId('reference-image-select').selectOption({ index: 1 });
    await page.getByRole('button', { name: /Full Control/i }).click();
    await page.getByTestId('controlnet-preview-button').first().click();

    await expect(page.getByTestId('preprocessor-preview')).toBeVisible();

    await page.getByRole('button', { name: 'Generate' }).click();
    const request = await generateRequestPromise;
    const payload = request.postDataJSON();
    expect(payload.controlNet?.length).toBeGreaterThan(0);
  });
});
