/**
 * Panel Editor Page Object
 *
 * Represents the panel generation and iteration view.
 * Flow 5: Panel Generation & Iteration
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class PanelEditorPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Panel editor container
   */
  get panelEditorContainer(): Locator {
    return this.page.getByTestId('panel-editor-container');
  }

  /**
   * Generate button
   */
  get generateButton(): Locator {
    return this.page.getByRole('button', { name: /generate/i }).first();
  }

  /**
   * Batch generate button
   */
  get batchGenerateButton(): Locator {
    return this.page.getByRole('button', { name: /batch generate|generate all/i });
  }

  /**
   * Generation progress indicator
   */
  get generationProgress(): Locator {
    return this.page.getByTestId('generation-progress');
  }

  /**
   * Progress bar
   */
  get progressBar(): Locator {
    return this.page.getByRole('progressbar');
  }

  /**
   * N-up grid (result display)
   */
  get nUpGrid(): Locator {
    return this.page.getByTestId('n-up-grid');
  }

  /**
   * Generated images in the N-up grid
   */
  get generatedImages(): Locator {
    return this.nUpGrid.getByRole('img');
  }

  /**
   * Selected image in N-up grid
   */
  get selectedImage(): Locator {
    return this.nUpGrid.locator('[data-selected="true"]');
  }

  /**
   * Approve button
   */
  get approveButton(): Locator {
    return this.page.getByRole('button', { name: /approve|accept/i });
  }

  /**
   * Reject/Dismiss button
   */
  get rejectButton(): Locator {
    return this.page.getByRole('button', { name: /reject|dismiss/i });
  }

  /**
   * Regenerate button
   */
  get regenerateButton(): Locator {
    return this.page.getByRole('button', { name: /regenerate|retry/i });
  }

  /**
   * Vary button (create variations)
   */
  get varyButton(): Locator {
    return this.page.getByRole('button', { name: /vary|variations/i });
  }

  /**
   * Edit & Regenerate button
   */
  get editRegenButton(): Locator {
    return this.page.getByRole('button', { name: /edit.*regen/i });
  }

  /**
   * Add to References button (star icon)
   */
  get addToRefsButton(): Locator {
    return this.page.getByRole('button', { name: /add to refs|save reference/i });
  }

  /**
   * Inpaint button (secondary)
   */
  get inpaintButton(): Locator {
    return this.page.getByRole('button', { name: /inpaint/i });
  }

  /**
   * img2img button (secondary)
   */
  get img2imgButton(): Locator {
    return this.page.getByRole('button', { name: /img2img/i });
  }

  /**
   * Extract pose button (secondary)
   */
  get extractPoseButton(): Locator {
    return this.page.getByRole('button', { name: /extract pose/i });
  }

  /**
   * Feedback button
   */
  get feedbackButton(): Locator {
    return this.page.getByRole('button', { name: /feedback/i });
  }

  /**
   * Thumbs up button
   */
  get thumbsUpButton(): Locator {
    return this.page.getByRole('button', { name: /thumbs up|good/i });
  }

  /**
   * Thumbs down button
   */
  get thumbsDownButton(): Locator {
    return this.page.getByRole('button', { name: /thumbs down|bad/i });
  }

  /**
   * Feedback modal
   */
  get feedbackModal(): Locator {
    return this.page.getByTestId('feedback-modal');
  }

  /**
   * Prompt editor
   */
  get promptEditor(): Locator {
    return this.page.getByTestId('prompt-editor');
  }

  /**
   * N-up count selector
   */
  get nUpSelector(): Locator {
    return this.page.getByTestId('n-up-selector');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(panelId?: string): Promise<void> {
    if (panelId) {
      await this.page.goto(`/panels/${panelId}`);
    } else {
      await this.page.goto('/panel-editor');
    }
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.panelEditorContainer).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.panelEditorContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Click generate button
   */
  async generate(): Promise<void> {
    await this.generateButton.click();
  }

  /**
   * Generate and wait for completion
   */
  async generateAndWait(timeout = 60000): Promise<void> {
    await this.generate();
    await this.waitForGenerationComplete(timeout);
  }

  /**
   * Batch generate all panels
   */
  async batchGenerate(): Promise<void> {
    await this.batchGenerateButton.click();
  }

  /**
   * Wait for generation to complete
   */
  async waitForGenerationComplete(timeout = 60000): Promise<void> {
    // Wait for progress to appear
    await this.generationProgress.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    // Wait for progress to disappear (generation complete)
    await this.generationProgress.waitFor({ state: 'hidden', timeout });
    // Wait for results to appear
    await expect(this.generatedImages.first()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Select an image in the N-up grid
   */
  async selectImage(index: number): Promise<void> {
    await this.generatedImages.nth(index).click();
  }

  /**
   * Approve selected image
   */
  async approveSelected(): Promise<void> {
    await this.approveButton.click();
  }

  /**
   * Reject selected image
   */
  async rejectSelected(): Promise<void> {
    await this.rejectButton.click();
  }

  /**
   * Regenerate with same settings
   */
  async regenerate(): Promise<void> {
    await this.regenerateButton.click();
  }

  /**
   * Create variations of selected image
   */
  async createVariations(): Promise<void> {
    await this.varyButton.click();
  }

  /**
   * Edit prompt and regenerate
   */
  async editAndRegenerate(newPrompt: string): Promise<void> {
    await this.editRegenButton.click();
    await this.promptEditor.fill(newPrompt);
    await this.generate();
  }

  /**
   * Add selected to character references
   */
  async addToRefs(): Promise<void> {
    await this.addToRefsButton.click();
  }

  /**
   * Give quick thumbs up feedback
   */
  async giveFeedbackUp(): Promise<void> {
    await this.thumbsUpButton.click();
  }

  /**
   * Give quick thumbs down feedback
   */
  async giveFeedbackDown(): Promise<void> {
    await this.thumbsDownButton.click();
  }

  /**
   * Open detailed feedback modal
   */
  async openFeedbackModal(): Promise<void> {
    await this.feedbackButton.click();
  }

  /**
   * Submit detailed feedback
   */
  async submitFeedback(gapType: string, expected: string, actual: string): Promise<void> {
    await this.openFeedbackModal();
    await this.feedbackModal.getByLabel(/gap type/i).selectOption(gapType);
    await this.feedbackModal.getByLabel(/expected/i).fill(expected);
    await this.feedbackModal.getByLabel(/actual/i).fill(actual);
    await this.feedbackModal.getByRole('button', { name: /submit/i }).click();
  }

  /**
   * Set N-up count
   */
  async setNUpCount(count: number): Promise<void> {
    await this.nUpSelector.selectOption(count.toString());
  }

  /**
   * Edit the prompt
   */
  async setPrompt(prompt: string): Promise<void> {
    await this.promptEditor.fill(prompt);
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert generation is in progress
   */
  async expectGenerationInProgress(): Promise<void> {
    await expect(this.generationProgress).toBeVisible();
  }

  /**
   * Assert results are displayed
   */
  async expectResultsDisplayed(): Promise<void> {
    await expect(this.nUpGrid).toBeVisible();
    await expect(this.generatedImages.first()).toBeVisible();
  }

  /**
   * Assert N results are displayed
   */
  async expectResultCount(count: number): Promise<void> {
    await expect(this.generatedImages).toHaveCount(count);
  }

  /**
   * Assert image is selected
   */
  async expectImageSelected(index: number): Promise<void> {
    const image = this.generatedImages.nth(index);
    await expect(image).toHaveAttribute('data-selected', 'true');
  }

  /**
   * Assert approve/reject options visible
   */
  async expectApproveRejectVisible(): Promise<void> {
    await expect(this.approveButton).toBeVisible();
    await expect(this.rejectButton).toBeVisible();
  }

  /**
   * Assert add to refs confirmation
   */
  async expectAddedToRefs(): Promise<void> {
    await this.waitForToast(/added to references|saved/i);
  }

  /**
   * Assert feedback submitted
   */
  async expectFeedbackSubmitted(): Promise<void> {
    await this.waitForToast(/feedback.*submitted|thank you/i);
  }

  /**
   * Get the count of generated images
   */
  async getGeneratedImageCount(): Promise<number> {
    return await this.generatedImages.count();
  }
}
