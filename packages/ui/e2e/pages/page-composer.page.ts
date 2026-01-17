/**
 * Page Composer Page Object
 *
 * Represents the page composition and layout view.
 * Flow 6: Page Composition
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class PageComposerPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Page composer container
   */
  get pageComposerContainer(): Locator {
    return this.page.getByTestId('page-composer-container');
  }

  /**
   * Layout picker dialog
   */
  get layoutPicker(): Locator {
    return this.page.getByTestId('layout-picker');
  }

  /**
   * Layout templates
   */
  get layoutTemplates(): Locator {
    return this.layoutPicker.getByTestId('layout-template');
  }

  /**
   * Canvas area for the page
   */
  get pageCanvas(): Locator {
    return this.page.getByTestId('page-canvas');
  }

  /**
   * Panel slots in the layout
   */
  get panelSlots(): Locator {
    return this.pageCanvas.getByTestId('panel-slot');
  }

  /**
   * Currently selected panel slot
   */
  get selectedSlot(): Locator {
    return this.pageCanvas.locator('[data-selected="true"]');
  }

  /**
   * Panel slot editor (side panel)
   */
  get slotEditor(): Locator {
    return this.page.getByTestId('slot-editor');
  }

  /**
   * Gutter width control
   */
  get gutterWidthInput(): Locator {
    return this.page.getByLabel(/gutter.*width/i);
  }

  /**
   * Page border control
   */
  get pageBorderInput(): Locator {
    return this.page.getByLabel(/page.*border/i);
  }

  /**
   * Background color picker
   */
  get backgroundColorPicker(): Locator {
    return this.page.getByTestId('background-color');
  }

  /**
   * Back button (return to storyboard)
   */
  get backButton(): Locator {
    return this.page.getByRole('button', { name: /back/i });
  }

  /**
   * Unsaved changes warning
   */
  get unsavedWarning(): Locator {
    return this.page.getByTestId('unsaved-warning');
  }

  /**
   * Swap panels button
   */
  get swapPanelsButton(): Locator {
    return this.page.getByRole('button', { name: /swap/i });
  }

  /**
   * Edit panel button (drill down)
   */
  get editPanelButton(): Locator {
    return this.page.getByRole('button', { name: /edit panel/i });
  }

  /**
   * Breadcrumb navigation
   */
  get breadcrumbs(): Locator {
    return this.page.getByTestId('breadcrumbs');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(pageId?: string): Promise<void> {
    if (pageId) {
      await this.page.goto(`/pages/${pageId}/compose`);
    } else {
      await this.page.goto('/page-composer');
    }
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.pageComposerContainer).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.pageComposerContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Select a layout template
   */
  async selectLayout(templateName: string): Promise<void> {
    await this.layoutTemplates.filter({ hasText: templateName }).click();
  }

  /**
   * Select layout by panel count
   */
  async selectLayoutByPanelCount(count: number): Promise<void> {
    await this.layoutTemplates.filter({ hasText: `${count}-panel` }).click();
  }

  /**
   * Click on a panel slot
   */
  async selectSlot(index: number): Promise<void> {
    await this.panelSlots.nth(index).click();
  }

  /**
   * Assign a panel to the selected slot
   */
  async assignPanelToSlot(panelId: string): Promise<void> {
    await this.slotEditor.getByTestId('panel-selector').click();
    await this.page.getByRole('option', { name: panelId }).click();
  }

  /**
   * Adjust gutter width
   */
  async setGutterWidth(width: number): Promise<void> {
    await this.gutterWidthInput.fill(width.toString());
  }

  /**
   * Set page border
   */
  async setPageBorder(width: number): Promise<void> {
    await this.pageBorderInput.fill(width.toString());
  }

  /**
   * Set background color
   */
  async setBackgroundColor(color: string): Promise<void> {
    await this.backgroundColorPicker.locator('input').fill(color);
  }

  /**
   * Click on a panel to drill down and edit
   */
  async drillDownToPanel(slotIndex: number): Promise<void> {
    await this.selectSlot(slotIndex);
    await this.editPanelButton.click();
  }

  /**
   * Go back with warning check
   */
  async goBack(saveChanges?: boolean): Promise<void> {
    await this.backButton.click();
    if (await this.unsavedWarning.isVisible()) {
      if (saveChanges) {
        await this.unsavedWarning.getByRole('button', { name: /save/i }).click();
      } else {
        await this.unsavedWarning.getByRole('button', { name: /discard/i }).click();
      }
    }
  }

  /**
   * Swap two panels
   */
  async swapPanels(slotA: number, slotB: number): Promise<void> {
    await this.selectSlot(slotA);
    await this.page.keyboard.down('Shift');
    await this.selectSlot(slotB);
    await this.page.keyboard.up('Shift');
    await this.swapPanelsButton.click();
  }

  /**
   * Navigate via breadcrumb
   */
  async navigateToBreadcrumb(name: string): Promise<void> {
    await this.breadcrumbs.getByText(name).click();
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert layout picker is visible
   */
  async expectLayoutPickerVisible(): Promise<void> {
    await expect(this.layoutPicker).toBeVisible();
  }

  /**
   * Assert panel slot count
   */
  async expectSlotCount(count: number): Promise<void> {
    await expect(this.panelSlots).toHaveCount(count);
  }

  /**
   * Assert slot has panel assigned
   */
  async expectSlotHasPanel(slotIndex: number): Promise<void> {
    const slot = this.panelSlots.nth(slotIndex);
    await expect(slot.getByRole('img')).toBeVisible();
  }

  /**
   * Assert slot editor is visible (side panel slide out)
   */
  async expectSlotEditorVisible(): Promise<void> {
    await expect(this.slotEditor).toBeVisible();
  }

  /**
   * Assert unsaved warning shows
   */
  async expectUnsavedWarning(): Promise<void> {
    await expect(this.unsavedWarning).toBeVisible();
  }

  /**
   * Assert page canvas visible (composer dimmed when editing panel)
   */
  async expectComposerDimmed(): Promise<void> {
    await expect(this.pageCanvas).toHaveAttribute('data-dimmed', 'true');
  }

  /**
   * Get slot count
   */
  async getSlotCount(): Promise<number> {
    return await this.panelSlots.count();
  }
}
