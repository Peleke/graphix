/**
 * Storyboard Page Object
 *
 * Represents the story/narrative management view.
 * Flow 3: Story/Narrative Management
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class StoryboardPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Storyboard container
   */
  get storyboardContainer(): Locator {
    return this.page.getByTestId('storyboard-container');
  }

  /**
   * Tree view sidebar
   */
  get treeView(): Locator {
    return this.page.getByTestId('tree-view');
  }

  /**
   * Outline editor (Scrivener-style)
   */
  get outlineEditor(): Locator {
    return this.page.getByTestId('outline-editor');
  }

  /**
   * View switcher tabs
   */
  get viewSwitcher(): Locator {
    return this.page.getByTestId('view-switcher');
  }

  /**
   * Tree view tab
   */
  get treeViewTab(): Locator {
    return this.viewSwitcher.getByRole('tab', { name: /tree/i });
  }

  /**
   * Outline view tab
   */
  get outlineViewTab(): Locator {
    return this.viewSwitcher.getByRole('tab', { name: /outline/i });
  }

  /**
   * Global narrative editor
   */
  get globalNarrativeEditor(): Locator {
    return this.page.getByTestId('global-narrative');
  }

  /**
   * Page nodes in tree view
   */
  get pageNodes(): Locator {
    return this.treeView.getByTestId('page-node');
  }

  /**
   * Panel nodes in tree view
   */
  get panelNodes(): Locator {
    return this.treeView.getByTestId('panel-node');
  }

  /**
   * Narrative editor panel
   */
  get narrativeEditor(): Locator {
    return this.page.getByTestId('narrative-editor');
  }

  /**
   * Image intent editor
   */
  get imageIntentEditor(): Locator {
    return this.page.getByTestId('image-intent-editor');
  }

  /**
   * Final prompt editor
   */
  get finalPromptEditor(): Locator {
    return this.page.getByTestId('final-prompt-editor');
  }

  /**
   * Generate narrative button
   */
  get generateNarrativeButton(): Locator {
    return this.page.getByRole('button', { name: /generate narrative/i });
  }

  /**
   * Convert to prompt button (toPrompt)
   */
  get convertToPromptButton(): Locator {
    return this.page.getByRole('button', { name: /convert to prompt|to prompt/i });
  }

  /**
   * Tune prompt button (tunePrompt)
   */
  get tunePromptButton(): Locator {
    return this.page.getByRole('button', { name: /tune prompt/i });
  }

  /**
   * Add page button
   */
  get addPageButton(): Locator {
    return this.page.getByRole('button', { name: /add page/i });
  }

  /**
   * Add panel button
   */
  get addPanelButton(): Locator {
    return this.page.getByRole('button', { name: /add panel/i });
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(projectId?: string): Promise<void> {
    if (projectId) {
      await this.page.goto(`/projects/${projectId}/storyboard`);
    } else {
      await this.page.goto('/storyboard');
    }
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.storyboardContainer).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.storyboardContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Switch to tree view
   */
  async switchToTreeView(): Promise<void> {
    await this.treeViewTab.click();
  }

  /**
   * Switch to outline view
   */
  async switchToOutlineView(): Promise<void> {
    await this.outlineViewTab.click();
  }

  /**
   * Select a page in tree view
   */
  async selectPage(pageNumber: number): Promise<void> {
    await this.pageNodes.nth(pageNumber - 1).click();
  }

  /**
   * Select a panel in tree view
   */
  async selectPanel(pageNumber: number, panelNumber: number): Promise<void> {
    // Expand the page first
    const pageNode = this.pageNodes.nth(pageNumber - 1);
    const isExpanded = await pageNode.getAttribute('data-expanded');
    if (isExpanded !== 'true') {
      await pageNode.getByRole('button', { name: /expand/i }).click();
    }
    // Then select the panel
    await pageNode.locator('[data-testid="panel-node"]').nth(panelNumber - 1).click();
  }

  /**
   * Edit narrative text
   */
  async setNarrative(text: string): Promise<void> {
    await this.narrativeEditor.click();
    await this.narrativeEditor.fill(text);
  }

  /**
   * Edit image intent
   */
  async setImageIntent(text: string): Promise<void> {
    await this.imageIntentEditor.click();
    await this.imageIntentEditor.fill(text);
  }

  /**
   * Edit final prompt
   */
  async setFinalPrompt(text: string): Promise<void> {
    await this.finalPromptEditor.click();
    await this.finalPromptEditor.fill(text);
  }

  /**
   * Generate narrative from AI
   */
  async generateNarrative(): Promise<void> {
    await this.generateNarrativeButton.click();
    await this.waitForLoading();
  }

  /**
   * Convert narrative to prompt
   */
  async convertToPrompt(): Promise<void> {
    await this.convertToPromptButton.click();
    await this.waitForLoading();
  }

  /**
   * Tune prompt with narrative mood
   */
  async tunePrompt(): Promise<void> {
    await this.tunePromptButton.click();
    await this.waitForLoading();
  }

  /**
   * Add a new page
   */
  async addPage(): Promise<void> {
    await this.addPageButton.click();
  }

  /**
   * Add a new panel to current page
   */
  async addPanel(): Promise<void> {
    await this.addPanelButton.click();
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert tree view is visible
   */
  async expectTreeViewVisible(): Promise<void> {
    await expect(this.treeView).toBeVisible();
  }

  /**
   * Assert outline view is visible
   */
  async expectOutlineViewVisible(): Promise<void> {
    await expect(this.outlineEditor).toBeVisible();
  }

  /**
   * Assert page count
   */
  async expectPageCount(count: number): Promise<void> {
    await expect(this.pageNodes).toHaveCount(count);
  }

  /**
   * Assert narrative contains text
   */
  async expectNarrativeContains(text: string): Promise<void> {
    await expect(this.narrativeEditor).toContainText(text);
  }

  /**
   * Assert image intent contains text
   */
  async expectImageIntentContains(text: string): Promise<void> {
    await expect(this.imageIntentEditor).toContainText(text);
  }

  /**
   * Assert prompt contains text
   */
  async expectPromptContains(text: string): Promise<void> {
    await expect(this.finalPromptEditor).toContainText(text);
  }

  /**
   * Get page count
   */
  async getPageCount(): Promise<number> {
    return await this.pageNodes.count();
  }

  /**
   * Get panel count for a page
   */
  async getPanelCount(pageNumber: number): Promise<number> {
    const pageNode = this.pageNodes.nth(pageNumber - 1);
    return await pageNode.locator('[data-testid="panel-node"]').count();
  }
}
