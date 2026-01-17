/**
 * Export Page Object
 *
 * Represents the export dialog and options.
 * Flow 8: Export
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ExportPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Export dialog container
   */
  get exportDialog(): Locator {
    return this.page.getByTestId('export-dialog');
  }

  /**
   * Format selector
   */
  get formatSelector(): Locator {
    return this.page.getByTestId('export-format');
  }

  /**
   * PNG single page option
   */
  get pngSingleOption(): Locator {
    return this.formatSelector.getByRole('radio', { name: /png.*single|single.*png/i });
  }

  /**
   * PNG all pages option
   */
  get pngAllOption(): Locator {
    return this.formatSelector.getByRole('radio', { name: /png.*all|all.*png/i });
  }

  /**
   * PDF option
   */
  get pdfOption(): Locator {
    return this.formatSelector.getByRole('radio', { name: /pdf/i });
  }

  /**
   * Export button
   */
  get exportButton(): Locator {
    return this.page.getByRole('button', { name: /^export$/i });
  }

  /**
   * Cancel button
   */
  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: /cancel/i });
  }

  /**
   * Include metadata checkbox
   */
  get includeMetadataCheckbox(): Locator {
    return this.page.getByLabel(/include metadata/i);
  }

  /**
   * Resolution/DPI input (post-MVP)
   */
  get resolutionInput(): Locator {
    return this.page.getByLabel(/resolution|dpi/i);
  }

  /**
   * Export progress indicator
   */
  get exportProgress(): Locator {
    return this.page.getByTestId('export-progress');
  }

  /**
   * Export complete message
   */
  get exportComplete(): Locator {
    return this.page.getByTestId('export-complete');
  }

  /**
   * Download link (after export)
   */
  get downloadLink(): Locator {
    return this.page.getByRole('link', { name: /download/i });
  }

  /**
   * Open folder button (after export)
   */
  get openFolderButton(): Locator {
    return this.page.getByRole('button', { name: /open.*folder|show.*finder/i });
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(): Promise<void> {
    // Export is typically a dialog opened from another page
    await this.page.goto('/export');
  }

  async waitForLoad(): Promise<void> {
    await expect(this.exportDialog).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.exportDialog.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Open the export dialog (from page/project view)
   */
  async openExportDialog(): Promise<void> {
    // This would be called from another page
    await this.page.getByRole('button', { name: /export/i }).click();
    await expect(this.exportDialog).toBeVisible();
  }

  /**
   * Select PNG single page format
   */
  async selectPngSingle(): Promise<void> {
    await this.pngSingleOption.click();
  }

  /**
   * Select PNG all pages format
   */
  async selectPngAll(): Promise<void> {
    await this.pngAllOption.click();
  }

  /**
   * Select PDF format
   */
  async selectPdf(): Promise<void> {
    await this.pdfOption.click();
  }

  /**
   * Toggle metadata inclusion
   */
  async toggleMetadata(): Promise<void> {
    await this.includeMetadataCheckbox.click();
  }

  /**
   * Ensure metadata is included
   */
  async includeMetadata(): Promise<void> {
    if (!(await this.includeMetadataCheckbox.isChecked())) {
      await this.toggleMetadata();
    }
  }

  /**
   * Set resolution/DPI
   */
  async setResolution(dpi: number): Promise<void> {
    await this.resolutionInput.fill(dpi.toString());
  }

  /**
   * Start export
   */
  async startExport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * Export and wait for completion
   */
  async exportAndWait(timeout = 60000): Promise<void> {
    await this.startExport();
    await this.waitForExportComplete(timeout);
  }

  /**
   * Wait for export to complete
   */
  async waitForExportComplete(timeout = 60000): Promise<void> {
    await this.exportProgress.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await expect(this.exportComplete).toBeVisible({ timeout });
  }

  /**
   * Cancel export
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Download the exported file
   */
  async download(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadLink.click();
    await downloadPromise;
  }

  /**
   * Quick export as PDF
   */
  async quickExportPdf(): Promise<void> {
    await this.selectPdf();
    await this.includeMetadata();
    await this.exportAndWait();
  }

  /**
   * Quick export as PNG (all pages)
   */
  async quickExportPngAll(): Promise<void> {
    await this.selectPngAll();
    await this.includeMetadata();
    await this.exportAndWait();
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert export dialog is visible
   */
  async expectDialogVisible(): Promise<void> {
    await expect(this.exportDialog).toBeVisible();
  }

  /**
   * Assert format is selected
   */
  async expectFormatSelected(format: 'png-single' | 'png-all' | 'pdf'): Promise<void> {
    switch (format) {
      case 'png-single':
        await expect(this.pngSingleOption).toBeChecked();
        break;
      case 'png-all':
        await expect(this.pngAllOption).toBeChecked();
        break;
      case 'pdf':
        await expect(this.pdfOption).toBeChecked();
        break;
    }
  }

  /**
   * Assert export in progress
   */
  async expectExportInProgress(): Promise<void> {
    await expect(this.exportProgress).toBeVisible();
  }

  /**
   * Assert export complete
   */
  async expectExportComplete(): Promise<void> {
    await expect(this.exportComplete).toBeVisible();
  }

  /**
   * Assert download available
   */
  async expectDownloadAvailable(): Promise<void> {
    await expect(this.downloadLink).toBeVisible();
  }

  /**
   * Assert metadata is included
   */
  async expectMetadataIncluded(): Promise<void> {
    await expect(this.includeMetadataCheckbox).toBeChecked();
  }
}
