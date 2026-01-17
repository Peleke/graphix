/**
 * Base Page Object
 *
 * Provides common functionality for all page objects.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  /**
   * Navigate to this page
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be fully loaded
   */
  abstract waitForLoad(): Promise<void>;

  // ============================================================================
  // Common Elements
  // ============================================================================

  /**
   * Main content area
   */
  get mainContent(): Locator {
    return this.page.locator('main');
  }

  /**
   * Navigation sidebar
   */
  get sidebar(): Locator {
    return this.page.getByRole('navigation');
  }

  /**
   * Page header
   */
  get header(): Locator {
    return this.page.getByRole('banner');
  }

  /**
   * Loading indicator
   */
  get loadingIndicator(): Locator {
    return this.page.getByTestId('loading-indicator');
  }

  /**
   * Toast notifications
   */
  get toasts(): Locator {
    return this.page.getByRole('alert');
  }

  // ============================================================================
  // Common Actions
  // ============================================================================

  /**
   * Wait for network requests to complete
   */
  async waitForNetworkIdle(timeout = 5000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoading(): Promise<void> {
    const loading = this.loadingIndicator;
    if (await loading.isVisible()) {
      await loading.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  /**
   * Wait for a toast with specific text
   */
  async waitForToast(text: string): Promise<void> {
    await this.toasts.filter({ hasText: text }).waitFor({ state: 'visible' });
  }

  /**
   * Dismiss toast notifications
   */
  async dismissToasts(): Promise<void> {
    const toasts = this.toasts;
    const count = await toasts.count();
    for (let i = 0; i < count; i++) {
      const closeButton = toasts.nth(i).getByRole('button', { name: /close|dismiss/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  /**
   * Check if the page is currently displayed
   */
  abstract isDisplayed(): Promise<boolean>;

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  /**
   * Trigger undo action
   */
  async undo(): Promise<void> {
    await this.page.keyboard.press('Meta+z');
  }

  /**
   * Trigger redo action
   */
  async redo(): Promise<void> {
    await this.page.keyboard.press('Meta+Shift+z');
  }

  /**
   * Trigger save action
   */
  async save(): Promise<void> {
    await this.page.keyboard.press('Meta+s');
  }

  /**
   * Open command palette / search
   */
  async openCommandPalette(): Promise<void> {
    await this.page.keyboard.press('Meta+k');
  }
}
