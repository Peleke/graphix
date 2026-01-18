/**
 * Storyboard Page Object
 *
 * Represents the story/narrative management view.
 * Flow 3: Story/Narrative Management
 * 
 * Updated to match actual component selectors in:
 * - src/components/storyboard/StoryboardView.tsx
 * - src/components/story-editor/StoryEditor.tsx
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class StoryboardPage extends BasePage {
  // ============================================================================
  // Locators - Updated to match actual component CSS classes
  // ============================================================================

  /**
   * Storyboard container (StoryboardView component)
   */
  get storyboardContainer(): Locator {
    return this.page.locator('.storyboard-view');
  }

  /**
   * Story editor container (StoryEditor component)
   */
  get storyEditorContainer(): Locator {
    return this.page.locator('.story-editor');
  }

  /**
   * Storyboard sidebar with list of storyboards
   */
  get storyboardSidebar(): Locator {
    return this.page.locator('.storyboard-sidebar');
  }

  /**
   * Story editor sidebar with premises
   */
  get editorSidebar(): Locator {
    return this.storyEditorContainer.locator('.sidebar');
  }

  /**
   * Tree view - via view toggle button
   */
  get treeView(): Locator {
    // Tree view is triggered by the "Tree" button in view toggle
    return this.page.locator('.main-content');
  }

  /**
   * Outline editor - the main content area in outline view
   */
  get outlineEditor(): Locator {
    return this.page.locator('.main-content');
  }

  /**
   * View switcher tabs (Outline, Tree, Kanban)
   */
  get viewSwitcher(): Locator {
    return this.page.locator('.view-toggle');
  }

  /**
   * Tree view tab button
   */
  get treeViewTab(): Locator {
    return this.viewSwitcher.locator('button').filter({ hasText: /tree/i });
  }

  /**
   * Outline view tab button
   */
  get outlineViewTab(): Locator {
    return this.viewSwitcher.locator('button').filter({ hasText: /outline/i });
  }

  /**
   * Kanban view tab button
   */
  get kanbanViewTab(): Locator {
    return this.viewSwitcher.locator('button').filter({ hasText: /kanban/i });
  }

  /**
   * Premise items in sidebar
   */
  get premiseItems(): Locator {
    return this.page.locator('.premise-item');
  }

  /**
   * Storyboard items in sidebar
   */
  get storyboardItems(): Locator {
    return this.page.locator('.storyboard-item');
  }

  /**
   * Page nodes in tree view (mapped to storyboard items for now)
   */
  get pageNodes(): Locator {
    return this.storyboardItems;
  }

  /**
   * Panel cards in the panels grid
   */
  get panelNodes(): Locator {
    return this.page.locator('.panel-card');
  }

  /**
   * Global narrative editor - part of story editor
   */
  get globalNarrativeEditor(): Locator {
    return this.page.locator('.main-content').first();
  }

  /**
   * Narrative editor - panel description or premise logline
   */
  get narrativeEditor(): Locator {
    return this.page.locator('.premise-logline, .panel-info, textarea, input[type="text"]').first();
  }

  /**
   * Image intent editor - falls back to any textarea in modal
   */
  get imageIntentEditor(): Locator {
    return this.page.locator('textarea').first();
  }

  /**
   * Final prompt editor - falls back to any input
   */
  get finalPromptEditor(): Locator {
    return this.page.locator('input[type="text"], textarea').first();
  }

  /**
   * Generate narrative button
   */
  get generateNarrativeButton(): Locator {
    return this.page.getByRole('button', { name: /generate/i });
  }

  /**
   * Convert to prompt button (toPrompt)
   */
  get convertToPromptButton(): Locator {
    return this.page.getByRole('button', { name: /convert|to prompt/i });
  }

  /**
   * Tune prompt button (tunePrompt)
   */
  get tunePromptButton(): Locator {
    return this.page.getByRole('button', { name: /tune/i });
  }

  /**
   * Add page button - "New Storyboard" in StoryboardView
   */
  get addPageButton(): Locator {
    return this.page.getByRole('button', { name: /new storyboard|\+ new/i });
  }

  /**
   * Add panel button
   */
  get addPanelButton(): Locator {
    return this.page.getByRole('button', { name: /add panel|new panel|\+ panel/i });
  }

  /**
   * Create/New Premise button
   */
  get addPremiseButton(): Locator {
    return this.page.getByRole('button', { name: /new premise|\+ new premise/i });
  }

  // ============================================================================
  // Workspace sidebar navigation
  // ============================================================================

  /**
   * Workspace sidebar nav item for Story Editor
   */
  get storyEditorNavItem(): Locator {
    return this.page.locator('.nav-item').filter({ hasText: /story editor/i });
  }

  /**
   * Workspace sidebar nav item for Storyboard
   */
  get storyboardNavItem(): Locator {
    return this.page.locator('.nav-item').filter({ hasText: /^storyboard$/i });
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(projectId?: string): Promise<void> {
    if (projectId) {
      // Navigate to project workspace
      await this.page.goto(`/projects/${projectId}`);
    } else {
      await this.page.goto('/');
    }
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for workspace to be visible
    await this.page.locator('.project-workspace, .dashboard').waitFor({ 
      state: 'visible',
      timeout: 10000 
    }).catch(() => {});
  }

  /**
   * Navigate to Storyboard view in workspace sidebar
   */
  async gotoStoryboardView(): Promise<void> {
    const navItem = this.storyboardNavItem;
    if (await navItem.isVisible()) {
      await navItem.click();
      await this.page.waitForTimeout(300);
      // Wait for storyboard container to appear
      await this.storyboardContainer.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Navigate to Story Editor view in workspace sidebar
   */
  async gotoStoryEditorView(): Promise<void> {
    const navItem = this.storyEditorNavItem;
    if (await navItem.isVisible()) {
      await navItem.click();
      await this.page.waitForTimeout(300);
      // Wait for story editor container to appear
      await this.storyEditorContainer.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }
  }

  async isDisplayed(): Promise<boolean> {
    const storyboard = await this.storyboardContainer.isVisible().catch(() => false);
    const editor = await this.storyEditorContainer.isVisible().catch(() => false);
    return storyboard || editor;
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Switch to tree view
   */
  async switchToTreeView(): Promise<void> {
    const tab = this.treeViewTab;
    if (await tab.isVisible()) {
      await tab.click();
    }
  }

  /**
   * Switch to outline view
   */
  async switchToOutlineView(): Promise<void> {
    const tab = this.outlineViewTab;
    if (await tab.isVisible()) {
      await tab.click();
    }
  }

  /**
   * Select a page/storyboard by index (1-based)
   */
  async selectPage(pageNumber: number): Promise<void> {
    const items = this.storyboardItems;
    const count = await items.count();
    if (count >= pageNumber) {
      await items.nth(pageNumber - 1).click();
    }
  }

  /**
   * Select a panel by page and panel index (1-based)
   */
  async selectPanel(pageNumber: number, panelNumber: number): Promise<void> {
    // First select the storyboard/page
    await this.selectPage(pageNumber);
    await this.page.waitForTimeout(500);

    // Then select the panel
    const panels = this.panelNodes;
    const count = await panels.count();
    if (count >= panelNumber) {
      await panels.nth(panelNumber - 1).click();
    }
  }

  /**
   * Edit narrative text
   */
  async setNarrative(text: string): Promise<void> {
    const editor = this.narrativeEditor;
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(text);
    }
  }

  /**
   * Edit image intent
   */
  async setImageIntent(text: string): Promise<void> {
    const editor = this.imageIntentEditor;
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(text);
    }
  }

  /**
   * Edit final prompt
   */
  async setFinalPrompt(text: string): Promise<void> {
    const editor = this.finalPromptEditor;
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(text);
    }
  }

  /**
   * Generate narrative from AI
   */
  async generateNarrative(): Promise<void> {
    const btn = this.generateNarrativeButton;
    if (await btn.isVisible()) {
      await btn.click();
      await this.waitForLoading();
    }
  }

  /**
   * Convert narrative to prompt
   */
  async convertToPrompt(): Promise<void> {
    const btn = this.convertToPromptButton;
    if (await btn.isVisible()) {
      await btn.click();
      await this.waitForLoading();
    }
  }

  /**
   * Tune prompt with narrative mood
   */
  async tunePrompt(): Promise<void> {
    const btn = this.tunePromptButton;
    if (await btn.isVisible()) {
      await btn.click();
      await this.waitForLoading();
    }
  }

  /**
   * Add a new page/storyboard
   */
  async addPage(): Promise<void> {
    await this.addPageButton.click();
    // Handle modal if it appears
    const modal = this.page.locator('.modal');
    if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Fill in name and create
      const input = modal.locator('input[type="text"]').first();
      await input.fill(`New Page ${Date.now()}`);
      await modal.getByRole('button', { name: /create/i }).click();
    }
  }

  /**
   * Add a new panel to current storyboard
   */
  async addPanel(): Promise<void> {
    const btn = this.addPanelButton;
    if (await btn.isVisible()) {
      await btn.click();
      // Handle modal if it appears
      const modal = this.page.locator('.modal');
      if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
        await modal.getByRole('button', { name: /create/i }).click();
      }
    }
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert tree view is visible (view toggle in tree mode)
   */
  async expectTreeViewVisible(): Promise<void> {
    const treeBtn = this.treeViewTab;
    // Wait for button to be visible and have active class
    await expect(treeBtn).toBeVisible({ timeout: 5000 });
    await expect(treeBtn).toHaveClass(/active/, { timeout: 2000 });
  }

  /**
   * Assert outline view is visible
   */
  async expectOutlineViewVisible(): Promise<void> {
    const outlineBtn = this.outlineViewTab;
    await expect(outlineBtn).toBeVisible({ timeout: 5000 });
    await expect(outlineBtn).toHaveClass(/active/, { timeout: 2000 });
  }

  /**
   * Assert storyboard/page count
   */
  async expectPageCount(count: number): Promise<void> {
    await expect(this.storyboardItems).toHaveCount(count);
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
   * Get storyboard/page count
   */
  async getPageCount(): Promise<number> {
    return await this.storyboardItems.count();
  }

  /**
   * Get panel count for current storyboard
   */
  async getPanelCount(pageNumber: number): Promise<number> {
    // Select the page first
    await this.selectPage(pageNumber);
    await this.page.waitForTimeout(500);
    return await this.panelNodes.count();
  }

  /**
   * Delete selected item
   */
  async deleteSelected(): Promise<void> {
    const deleteButton = this.page.getByRole('button', { name: /delete|remove/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      // Handle confirmation dialog if present
      const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
    }
  }

  /**
   * Get current narrative text
   */
  async getNarrativeText(): Promise<string> {
    return await this.narrativeEditor.textContent() || '';
  }

  /**
   * Get current image intent text
   */
  async getImageIntentText(): Promise<string> {
    return await this.imageIntentEditor.textContent() || '';
  }

  /**
   * Get current prompt text
   */
  async getPromptText(): Promise<string> {
    return await this.finalPromptEditor.textContent() || '';
  }
}
