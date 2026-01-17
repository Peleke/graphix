/**
 * Dashboard Page Object
 *
 * Represents the main dashboard / project list view.
 * Flow 1: Application Entry
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * "What do you want to do?" modal
   */
  get gettingStartedModal(): Locator {
    return this.page.getByTestId('getting-started-modal');
  }

  /**
   * Recent projects list in sidebar
   */
  get recentProjectsList(): Locator {
    return this.page.getByTestId('recent-projects-list');
  }

  /**
   * New Comic Project button
   */
  get newComicProjectButton(): Locator {
    return this.page.getByRole('button', { name: /new comic project/i });
  }

  /**
   * New Illustration button
   */
  get newIllustrationButton(): Locator {
    return this.page.getByRole('button', { name: /new illustration/i });
  }

  /**
   * Continue Recent section
   */
  get continueRecentSection(): Locator {
    return this.page.getByTestId('continue-recent');
  }

  /**
   * Import project button
   */
  get importButton(): Locator {
    return this.page.getByRole('button', { name: /import/i });
  }

  /**
   * From Template button
   */
  get fromTemplateButton(): Locator {
    return this.page.getByRole('button', { name: /from template/i });
  }

  /**
   * Chat to Start input
   */
  get chatInput(): Locator {
    return this.page.getByPlaceholder(/what do you want to create/i);
  }

  /**
   * Close modal button
   */
  get closeModalButton(): Locator {
    return this.gettingStartedModal.getByRole('button', { name: /close/i });
  }

  /**
   * Project cards in the grid
   */
  get projectCards(): Locator {
    return this.page.getByTestId('project-card');
  }

  /**
   * Recovery notification (for dirty shutdown)
   */
  get recoveryNotification(): Locator {
    return this.page.getByTestId('recovery-notification');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForLoading();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.gettingStartedModal.isVisible() || await this.projectCards.first().isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Open a project by name
   */
  async openProject(name: string): Promise<void> {
    await this.projectCards.filter({ hasText: name }).click();
  }

  /**
   * Click "New Comic Project"
   */
  async clickNewComicProject(): Promise<void> {
    await this.newComicProjectButton.click();
  }

  /**
   * Click "New Illustration"
   */
  async clickNewIllustration(): Promise<void> {
    await this.newIllustrationButton.click();
  }

  /**
   * Start chat-to-create flow with initial message
   */
  async startChatToCreate(message: string): Promise<void> {
    await this.chatInput.fill(message);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Continue a recent project by name
   */
  async continueRecentProject(name: string): Promise<void> {
    await this.continueRecentSection.getByText(name).click();
  }

  /**
   * Dismiss the getting started modal
   */
  async dismissModal(): Promise<void> {
    if (await this.gettingStartedModal.isVisible()) {
      await this.closeModalButton.click();
    }
  }

  /**
   * Accept recovery after dirty shutdown
   */
  async acceptRecovery(): Promise<void> {
    await this.recoveryNotification.getByRole('button', { name: /restore/i }).click();
  }

  /**
   * Dismiss recovery notification
   */
  async dismissRecovery(): Promise<void> {
    await this.recoveryNotification.getByRole('button', { name: /dismiss/i }).click();
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert that the getting started modal is shown
   */
  async expectGettingStartedModalVisible(): Promise<void> {
    await expect(this.gettingStartedModal).toBeVisible();
  }

  /**
   * Assert that a project exists in the list
   */
  async expectProjectInList(name: string): Promise<void> {
    await expect(this.projectCards.filter({ hasText: name })).toBeVisible();
  }

  /**
   * Assert that recovery notification is shown
   */
  async expectRecoveryNotification(): Promise<void> {
    await expect(this.recoveryNotification).toBeVisible();
  }

  /**
   * Assert that the last opened project is highlighted
   */
  async expectLastProjectHighlighted(name: string): Promise<void> {
    const projectCard = this.projectCards.filter({ hasText: name });
    await expect(projectCard).toHaveAttribute('data-highlighted', 'true');
  }

  /**
   * Get count of projects
   */
  async getProjectCount(): Promise<number> {
    return await this.projectCards.count();
  }
}
