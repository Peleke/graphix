/**
 * ControlNet Configuration Page Object
 *
 * Represents the ControlNet configuration interface.
 * Flow 7: ControlNet Configuration
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ControlNetPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * ControlNet container
   */
  get controlNetContainer(): Locator {
    return this.page.getByTestId('controlnet-container');
  }

  /**
   * Level 3 visual cards view
   */
  get visualCardsView(): Locator {
    return this.page.getByTestId('controlnet-visual-cards');
  }

  /**
   * Level 4 full control view
   */
  get fullControlView(): Locator {
    return this.page.getByTestId('controlnet-full-control');
  }

  /**
   * View mode toggle
   */
  get viewModeToggle(): Locator {
    return this.page.getByTestId('controlnet-view-toggle');
  }

  /**
   * OpenPose card
   */
  get openPoseCard(): Locator {
    return this.page.getByTestId('control-card-openpose');
  }

  /**
   * Depth card
   */
  get depthCard(): Locator {
    return this.page.getByTestId('control-card-depth');
  }

  /**
   * Lineart card
   */
  get lineartCard(): Locator {
    return this.page.getByTestId('control-card-lineart');
  }

  /**
   * Reference image drop zone
   */
  get referenceDropZone(): Locator {
    return this.page.getByTestId('reference-drop-zone');
  }

  /**
   * Preprocessor preview (shows skeleton, depth map, etc)
   */
  get preprocessorPreview(): Locator {
    return this.page.getByTestId('preprocessor-preview');
  }

  /**
   * Control strength slider
   */
  get strengthSlider(): Locator {
    return this.page.getByLabel(/strength|weight/i);
  }

  /**
   * Start control slider
   */
  get startControlSlider(): Locator {
    return this.page.getByLabel(/start.*control/i);
  }

  /**
   * End control slider
   */
  get endControlSlider(): Locator {
    return this.page.getByLabel(/end.*control/i);
  }

  /**
   * Model selector dropdown
   */
  get modelSelector(): Locator {
    return this.page.getByTestId('controlnet-model-selector');
  }

  /**
   * Preset selector
   */
  get presetSelector(): Locator {
    return this.page.getByTestId('controlnet-presets');
  }

  /**
   * Active controls summary (shows what's enabled)
   */
  get activeControlsSummary(): Locator {
    return this.page.getByTestId('active-controls-summary');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(): Promise<void> {
    await this.page.goto('/controlnet');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.controlNetContainer).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.controlNetContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Switch to visual cards view (Level 3)
   */
  async switchToVisualCards(): Promise<void> {
    await this.viewModeToggle.getByRole('tab', { name: /visual|cards/i }).click();
  }

  /**
   * Switch to full control view (Level 4)
   */
  async switchToFullControl(): Promise<void> {
    await this.viewModeToggle.getByRole('tab', { name: /full|advanced/i }).click();
  }

  /**
   * Toggle a control card on/off
   */
  async toggleControlCard(type: 'openpose' | 'depth' | 'lineart'): Promise<void> {
    const card = this.page.getByTestId(`control-card-${type}`);
    await card.getByRole('switch').click();
  }

  /**
   * Enable OpenPose
   */
  async enableOpenPose(): Promise<void> {
    const toggle = this.openPoseCard.getByRole('switch');
    if (!(await toggle.isChecked())) {
      await toggle.click();
    }
  }

  /**
   * Enable Depth
   */
  async enableDepth(): Promise<void> {
    const toggle = this.depthCard.getByRole('switch');
    if (!(await toggle.isChecked())) {
      await toggle.click();
    }
  }

  /**
   * Enable Lineart
   */
  async enableLineart(): Promise<void> {
    const toggle = this.lineartCard.getByRole('switch');
    if (!(await toggle.isChecked())) {
      await toggle.click();
    }
  }

  /**
   * Set control strength
   */
  async setStrength(value: number): Promise<void> {
    await this.strengthSlider.fill(value.toString());
  }

  /**
   * Upload reference image
   */
  async uploadReference(filePath: string): Promise<void> {
    const fileInput = this.referenceDropZone.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.waitForLoading(); // Wait for preprocessing
  }

  /**
   * Drop reference image
   */
  async dropReference(filePath: string): Promise<void> {
    // Simulate drag and drop
    const dataTransfer = await this.page.evaluateHandle(() => new DataTransfer());
    await this.referenceDropZone.dispatchEvent('drop', { dataTransfer });
  }

  /**
   * Select a preprocessor for current control
   */
  async selectPreprocessor(name: string): Promise<void> {
    await this.page.getByTestId('preprocessor-selector').click();
    await this.page.getByRole('option', { name }).click();
  }

  /**
   * Select a ControlNet model
   */
  async selectModel(model: string): Promise<void> {
    await this.modelSelector.click();
    await this.page.getByRole('option', { name: model }).click();
  }

  /**
   * Apply a preset configuration
   */
  async applyPreset(presetName: string): Promise<void> {
    await this.presetSelector.click();
    await this.page.getByRole('option', { name: presetName }).click();
  }

  /**
   * Quick setup: pose reference + depth
   */
  async quickSetupPoseAndDepth(referenceImagePath: string): Promise<void> {
    await this.enableOpenPose();
    await this.enableDepth();
    await this.uploadReference(referenceImagePath);
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert visual cards view is active
   */
  async expectVisualCardsActive(): Promise<void> {
    await expect(this.visualCardsView).toBeVisible();
  }

  /**
   * Assert full control view is active
   */
  async expectFullControlActive(): Promise<void> {
    await expect(this.fullControlView).toBeVisible();
  }

  /**
   * Assert control is enabled
   */
  async expectControlEnabled(type: 'openpose' | 'depth' | 'lineart'): Promise<void> {
    const card = this.page.getByTestId(`control-card-${type}`);
    await expect(card.getByRole('switch')).toBeChecked();
  }

  /**
   * Assert preprocessor preview is shown
   */
  async expectPreprocessorPreviewVisible(): Promise<void> {
    await expect(this.preprocessorPreview).toBeVisible();
  }

  /**
   * Assert active controls summary shows expected controls
   */
  async expectActiveControls(controls: string[]): Promise<void> {
    for (const control of controls) {
      await expect(this.activeControlsSummary).toContainText(control);
    }
  }

  /**
   * Assert strength value
   */
  async expectStrength(value: number): Promise<void> {
    await expect(this.strengthSlider).toHaveValue(value.toString());
  }
}
