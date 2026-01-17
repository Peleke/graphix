/**
 * Onboarding Page Object
 *
 * Represents the first-time user onboarding wizard.
 * Flow 1: Application Entry - First-Time User Experience
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class OnboardingPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Onboarding wizard container
   */
  get wizardContainer(): Locator {
    return this.page.getByTestId('onboarding-wizard');
  }

  /**
   * Welcome message
   */
  get welcomeMessage(): Locator {
    return this.page.getByRole('heading', { name: /welcome/i });
  }

  /**
   * Explore Sample Project button
   */
  get exploreSampleProjectButton(): Locator {
    return this.page.getByRole('button', { name: /explore sample project/i });
  }

  /**
   * Skip onboarding button
   */
  get skipButton(): Locator {
    return this.page.getByRole('button', { name: /skip/i });
  }

  /**
   * Next step button
   */
  get nextButton(): Locator {
    return this.page.getByRole('button', { name: /next/i });
  }

  /**
   * Previous step button
   */
  get previousButton(): Locator {
    return this.page.getByRole('button', { name: /previous|back/i });
  }

  /**
   * Tutorial tooltips
   */
  get tooltips(): Locator {
    return this.page.getByRole('tooltip');
  }

  /**
   * Current tooltip
   */
  get currentTooltip(): Locator {
    return this.page.getByTestId('tutorial-tooltip');
  }

  /**
   * Progress indicators (dots)
   */
  get progressIndicators(): Locator {
    return this.page.getByTestId('onboarding-progress').locator('[data-step]');
  }

  /**
   * Finish button (last step)
   */
  get finishButton(): Locator {
    return this.page.getByRole('button', { name: /finish|get started|let's go/i });
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(): Promise<void> {
    // Clear local storage to trigger first-time experience
    await this.page.evaluate(() => localStorage.clear());
    await this.page.goto('/');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.wizardContainer).toBeVisible({ timeout: 10000 });
  }

  async isDisplayed(): Promise<boolean> {
    return await this.wizardContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Click "Explore Sample Project"
   */
  async exploreSampleProject(): Promise<void> {
    await this.exploreSampleProjectButton.click();
  }

  /**
   * Skip the onboarding
   */
  async skip(): Promise<void> {
    await this.skipButton.click();
  }

  /**
   * Go to next step
   */
  async next(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Go to previous step
   */
  async previous(): Promise<void> {
    await this.previousButton.click();
  }

  /**
   * Finish the onboarding
   */
  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  /**
   * Complete entire onboarding by clicking through
   */
  async completeOnboarding(): Promise<void> {
    while (await this.nextButton.isVisible()) {
      await this.next();
      await this.page.waitForTimeout(300); // Wait for animation
    }
    if (await this.finishButton.isVisible()) {
      await this.finish();
    }
  }

  /**
   * Dismiss current tooltip
   */
  async dismissTooltip(): Promise<void> {
    const closeButton = this.currentTooltip.getByRole('button', { name: /close|got it/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert that the onboarding wizard is visible
   */
  async expectWizardVisible(): Promise<void> {
    await expect(this.wizardContainer).toBeVisible();
  }

  /**
   * Assert that a tooltip is visible
   */
  async expectTooltipVisible(): Promise<void> {
    await expect(this.currentTooltip).toBeVisible();
  }

  /**
   * Assert skip button is always visible
   */
  async expectSkipAlwaysAvailable(): Promise<void> {
    await expect(this.skipButton).toBeVisible();
  }

  /**
   * Assert current step
   */
  async expectCurrentStep(step: number): Promise<void> {
    const currentIndicator = this.progressIndicators.nth(step - 1);
    await expect(currentIndicator).toHaveAttribute('data-current', 'true');
  }

  /**
   * Get current step number
   */
  async getCurrentStep(): Promise<number> {
    const indicators = await this.progressIndicators.all();
    for (let i = 0; i < indicators.length; i++) {
      const isCurrent = await indicators[i].getAttribute('data-current');
      if (isCurrent === 'true') {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get total steps
   */
  async getTotalSteps(): Promise<number> {
    return await this.progressIndicators.count();
  }
}
