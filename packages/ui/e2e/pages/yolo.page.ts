/**
 * YOLO Mode Page Object
 *
 * Represents the autonomous AI generation mode.
 * Flow 9: YOLO Mode
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class YoloPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * YOLO mode container
   */
  get yoloContainer(): Locator {
    return this.page.getByTestId('yolo-container');
  }

  /**
   * YOLO setup panel
   */
  get setupPanel(): Locator {
    return this.page.getByTestId('yolo-setup');
  }

  /**
   * Scope selector (panel, page, story)
   */
  get scopeSelector(): Locator {
    return this.page.getByTestId('yolo-scope');
  }

  /**
   * Single panel scope option
   */
  get singlePanelScope(): Locator {
    return this.scopeSelector.getByRole('radio', { name: /single panel/i });
  }

  /**
   * Single page scope option
   */
  get singlePageScope(): Locator {
    return this.scopeSelector.getByRole('radio', { name: /single page/i });
  }

  /**
   * Full story scope option
   */
  get fullStoryScope(): Locator {
    return this.scopeSelector.getByRole('radio', { name: /full story|entire story/i });
  }

  /**
   * Quality threshold slider
   */
  get qualityThresholdSlider(): Locator {
    return this.page.getByLabel(/quality.*threshold/i);
  }

  /**
   * Max iterations input
   */
  get maxIterationsInput(): Locator {
    return this.page.getByLabel(/max.*iterations/i);
  }

  /**
   * Time limit input (optional)
   */
  get timeLimitInput(): Locator {
    return this.page.getByLabel(/time.*limit/i);
  }

  /**
   * Checkpoint interval input (optional)
   */
  get checkpointIntervalInput(): Locator {
    return this.page.getByLabel(/checkpoint.*interval/i);
  }

  /**
   * Start YOLO button
   */
  get startButton(): Locator {
    return this.page.getByRole('button', { name: /start.*yolo|let.*rip|go/i });
  }

  /**
   * Stop YOLO button
   */
  get stopButton(): Locator {
    return this.page.getByRole('button', { name: /stop|pause/i });
  }

  /**
   * YOLO progress view
   */
  get progressView(): Locator {
    return this.page.getByTestId('yolo-progress');
  }

  /**
   * Current generation status
   */
  get currentStatus(): Locator {
    return this.page.getByTestId('yolo-current-status');
  }

  /**
   * YOLO review panel
   */
  get reviewPanel(): Locator {
    return this.page.getByTestId('yolo-review');
  }

  /**
   * Page review items
   */
  get pageReviewItems(): Locator {
    return this.reviewPanel.getByTestId('page-review-item');
  }

  /**
   * Panel review items
   */
  get panelReviewItems(): Locator {
    return this.reviewPanel.getByTestId('panel-review-item');
  }

  /**
   * Approve all button
   */
  get approveAllButton(): Locator {
    return this.page.getByRole('button', { name: /approve all/i });
  }

  /**
   * Items needing review
   */
  get needsReviewItems(): Locator {
    return this.reviewPanel.locator('[data-status="needs-review"]');
  }

  /**
   * Completed items
   */
  get completedItems(): Locator {
    return this.reviewPanel.locator('[data-status="approved"]');
  }

  /**
   * In-progress items
   */
  get inProgressItems(): Locator {
    return this.reviewPanel.locator('[data-status="in-progress"]');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(): Promise<void> {
    await this.page.goto('/yolo');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.yoloContainer).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.yoloContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Select single panel scope
   */
  async selectSinglePanelScope(): Promise<void> {
    await this.singlePanelScope.click();
  }

  /**
   * Select single page scope
   */
  async selectSinglePageScope(): Promise<void> {
    await this.singlePageScope.click();
  }

  /**
   * Select full story scope
   */
  async selectFullStoryScope(): Promise<void> {
    await this.fullStoryScope.click();
  }

  /**
   * Set quality threshold
   */
  async setQualityThreshold(value: number): Promise<void> {
    await this.qualityThresholdSlider.fill(value.toString());
  }

  /**
   * Set max iterations
   */
  async setMaxIterations(value: number): Promise<void> {
    await this.maxIterationsInput.fill(value.toString());
  }

  /**
   * Set time limit
   */
  async setTimeLimit(minutes: number): Promise<void> {
    await this.timeLimitInput.fill(minutes.toString());
  }

  /**
   * Set checkpoint interval
   */
  async setCheckpointInterval(count: number): Promise<void> {
    await this.checkpointIntervalInput.fill(count.toString());
  }

  /**
   * Configure YOLO settings
   */
  async configure(settings: {
    scope: 'panel' | 'page' | 'story';
    qualityThreshold?: number;
    maxIterations?: number;
    timeLimit?: number;
  }): Promise<void> {
    switch (settings.scope) {
      case 'panel':
        await this.selectSinglePanelScope();
        break;
      case 'page':
        await this.selectSinglePageScope();
        break;
      case 'story':
        await this.selectFullStoryScope();
        break;
    }
    if (settings.qualityThreshold !== undefined) {
      await this.setQualityThreshold(settings.qualityThreshold);
    }
    if (settings.maxIterations !== undefined) {
      await this.setMaxIterations(settings.maxIterations);
    }
    if (settings.timeLimit !== undefined) {
      await this.setTimeLimit(settings.timeLimit);
    }
  }

  /**
   * Start YOLO mode
   */
  async start(): Promise<void> {
    await this.startButton.click();
  }

  /**
   * Stop YOLO mode
   */
  async stop(): Promise<void> {
    await this.stopButton.click();
  }

  /**
   * View a panel in review
   */
  async viewPanelReview(pageIndex: number, panelIndex: number): Promise<void> {
    const pageItem = this.pageReviewItems.nth(pageIndex);
    // Expand page if collapsed
    if (!(await pageItem.getAttribute('data-expanded'))) {
      await pageItem.click();
    }
    await pageItem.locator('[data-testid="panel-review-item"]').nth(panelIndex).click();
  }

  /**
   * Approve a specific panel
   */
  async approvePanel(pageIndex: number, panelIndex: number): Promise<void> {
    await this.viewPanelReview(pageIndex, panelIndex);
    await this.page.getByRole('button', { name: /approve/i }).click();
  }

  /**
   * Approve all completed items
   */
  async approveAll(): Promise<void> {
    await this.approveAllButton.click();
  }

  /**
   * Wait for YOLO to complete
   */
  async waitForComplete(timeout = 300000): Promise<void> {
    await expect(this.inProgressItems).toHaveCount(0, { timeout });
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert setup panel is visible
   */
  async expectSetupVisible(): Promise<void> {
    await expect(this.setupPanel).toBeVisible();
  }

  /**
   * Assert YOLO is running
   */
  async expectRunning(): Promise<void> {
    await expect(this.progressView).toBeVisible();
    await expect(this.stopButton).toBeVisible();
  }

  /**
   * Assert YOLO is stopped/paused
   */
  async expectStopped(): Promise<void> {
    await expect(this.startButton).toBeVisible();
  }

  /**
   * Assert review panel is visible
   */
  async expectReviewVisible(): Promise<void> {
    await expect(this.reviewPanel).toBeVisible();
  }

  /**
   * Assert items need review
   */
  async expectItemsNeedReview(count: number): Promise<void> {
    await expect(this.needsReviewItems).toHaveCount(count);
  }

  /**
   * Assert all items approved
   */
  async expectAllApproved(): Promise<void> {
    await expect(this.needsReviewItems).toHaveCount(0);
    await expect(this.inProgressItems).toHaveCount(0);
  }

  /**
   * Assert scope is selected
   */
  async expectScopeSelected(scope: 'panel' | 'page' | 'story'): Promise<void> {
    switch (scope) {
      case 'panel':
        await expect(this.singlePanelScope).toBeChecked();
        break;
      case 'page':
        await expect(this.singlePageScope).toBeChecked();
        break;
      case 'story':
        await expect(this.fullStoryScope).toBeChecked();
        break;
    }
  }

  /**
   * Get count of items needing review
   */
  async getNeedsReviewCount(): Promise<number> {
    return await this.needsReviewItems.count();
  }

  /**
   * Get count of approved items
   */
  async getApprovedCount(): Promise<number> {
    return await this.completedItems.count();
  }
}
