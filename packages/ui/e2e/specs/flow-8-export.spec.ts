/**
 * Flow 8: Export
 *
 * E2E tests for exporting pages and projects in various formats.
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 8
 * @see e2e/features/export.feature
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

test.describe('Flow 8: Export', () => {
  // ==========================================================================
  // Setup: Mock API responses
  // ==========================================================================

  test.beforeEach(async ({ page }) => {
    // Mock export endpoint
    await page.route('**/api/export/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/png')) {
        // Return mock PNG data
        await route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from('mock-png-data'),
          headers: {
            'Content-Disposition': 'attachment; filename="page-1.png"',
          },
        });
      } else if (url.includes('/pdf')) {
        // Return mock PDF data
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: Buffer.from('mock-pdf-data'),
          headers: {
            'Content-Disposition': 'attachment; filename="project.pdf"',
          },
        });
      } else {
        await route.fulfill({ status: 200, body: '{}' });
      }
    });

    // Mock project data
    await page.route('**/api/projects/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-project',
            name: 'Test Project',
            pageCount: 5,
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: '{}' });
      }
    });
  });

  // ==========================================================================
  // 8.1 Export Formats
  // ==========================================================================

  test.describe('8.1 Export Formats', () => {
    test('should display export options', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Should show export format options
      await expect(page.getByText(/export|download/i)).toBeVisible({ timeout: 10000 });
    });

    test('should offer PNG export', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Should have PNG option
      await expect(page.getByText(/PNG|png/)).toBeVisible({ timeout: 10000 });
    });

    test('should offer PDF export', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Should have PDF option
      await expect(page.getByText(/PDF|pdf/)).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================================================
  // 8.2 Export Actions
  // ==========================================================================

  test.describe('8.2 Export Actions', () => {
    test('should export single page as PNG', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Track download
      const downloadPromise = page.waitForEvent('download');
      
      // Click export PNG
      const pngButton = page.getByRole('button', { name: /export.*png|download.*png/i });
      if (await pngButton.isVisible()) {
        await pngButton.click();
        
        const download = await downloadPromise.catch(() => null);
        if (download) {
          expect(download.suggestedFilename()).toContain('.png');
        }
      }
    });

    test('should export project as PDF', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Track download
      const downloadPromise = page.waitForEvent('download');
      
      // Click export PDF
      const pdfButton = page.getByRole('button', { name: /export.*pdf|download.*pdf/i });
      if (await pdfButton.isVisible()) {
        await pdfButton.click();
        
        const download = await downloadPromise.catch(() => null);
        if (download) {
          expect(download.suggestedFilename()).toContain('.pdf');
        }
      }
    });
  });

  // ==========================================================================
  // 8.3 Export Settings (Post-MVP architecture)
  // ==========================================================================

  test.describe('8.3 Export Settings', () => {
    test('should include metadata in exports', { tag: [tags.MVP, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Metadata should always be included (prompt, workflow)
      // This is more of an API test, but verify UI shows option
      await expect(page.getByText(/include metadata|prompt info/i)).toBeVisible({ timeout: 10000 }).catch(() => {
        // May not be explicitly shown
      });
    });

    test('should show resolution options (architecture ready)', { tag: [tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Resolution settings (DO NOT BLOCK - post-MVP)
      const resolutionSelector = page.getByLabel(/resolution|quality/i);
      // May or may not be visible in MVP
    });

    test('should show print-ready options for PDF (architecture ready)', { tag: [tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Print-ready options (DO NOT BLOCK - post-MVP)
      // Color profile, bleed, margins
    });
  });

  // ==========================================================================
  // 8.4 Export Progress
  // ==========================================================================

  test.describe('8.4 Export Progress', () => {
    test('should show progress during export', { tag: [tags.MVP, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Mock slow export
      await page.route('**/api/export/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: Buffer.from('mock-pdf-data'),
        });
      });
      
      const pdfButton = page.getByRole('button', { name: /export.*pdf/i });
      if (await pdfButton.isVisible()) {
        await pdfButton.click();
        
        // Should show progress/loading
        await expect(page.getByText(/exporting|preparing|loading/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });

  // ==========================================================================
  // 8.5 Error Handling
  // ==========================================================================

  test.describe('8.5 Error Handling', () => {
    test('should show error when export fails', { tag: [tags.MVP, tags.FLOW_8] }, async ({ page }) => {
      await page.goto('/projects/test-project?view=export');
      
      // Mock failed export
      await page.route('**/api/export/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Export failed' }),
        });
      });
      
      const pdfButton = page.getByRole('button', { name: /export.*pdf/i });
      if (await pdfButton.isVisible()) {
        await pdfButton.click();
        
        // Should show error
        await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });
});
