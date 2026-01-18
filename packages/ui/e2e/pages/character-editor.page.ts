/**
 * Character Editor Page Object
 *
 * Represents the character creation and management view.
 * Flow 4: Character Management
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class CharacterEditorPage extends BasePage {
  // ============================================================================
  // Locators - Character Panel (list view)
  // ============================================================================

  /**
   * Character panel container (sidebar view)
   */
  get characterPanel(): Locator {
    return this.page.locator('.nav-item:has-text("Characters")');
  }

  /**
   * Character list container within CharacterPanel
   */
  get characterList(): Locator {
    return this.page.getByTestId('character-list');
  }

  /**
   * Character cards in the panel (uses CharacterCard component)
   */
  get characterCards(): Locator {
    return this.page.locator('[data-testid^="character-card-"]');
  }

  /**
   * Create new character button (Add Character)
   */
  get createCharacterButton(): Locator {
    return this.page.getByTestId('character-add-button');
  }

  /**
   * Search input in character panel
   */
  get searchInput(): Locator {
    return this.page.getByTestId('character-search-input');
  }

  /**
   * Character count badge
   */
  get characterCountBadge(): Locator {
    return this.page.getByTestId('character-count');
  }

  /**
   * Empty state message
   */
  get emptyState(): Locator {
    return this.page.getByTestId('character-empty-state');
  }

  // ============================================================================
  // Locators - Character Editor Modal
  // ============================================================================

  /**
   * Character editor modal overlay
   */
  get editorOverlay(): Locator {
    return this.page.getByTestId('character-editor-overlay');
  }

  /**
   * Character editor container
   */
  get characterEditor(): Locator {
    return this.page.getByTestId('character-editor');
  }

  /**
   * Editor title (Create/Edit: Name)
   */
  get editorTitle(): Locator {
    return this.page.locator('#editor-title');
  }

  /**
   * Close editor button (X)
   */
  get closeEditorButton(): Locator {
    return this.page.getByTestId('close-editor-button');
  }

  /**
   * Character name input
   */
  get nameInput(): Locator {
    return this.page.getByTestId('character-name-input');
  }

  /**
   * Character species input
   */
  get speciesInput(): Locator {
    return this.page.getByTestId('character-species-input');
  }

  /**
   * Character description textarea
   */
  get descriptionInput(): Locator {
    return this.page.getByTestId('character-description-input');
  }

  /**
   * Name validation error
   */
  get nameError(): Locator {
    return this.page.getByTestId('name-error');
  }

  /**
   * Species validation error
   */
  get speciesError(): Locator {
    return this.page.getByTestId('species-error');
  }

  /**
   * Description validation error
   */
  get descriptionError(): Locator {
    return this.page.getByTestId('description-error');
  }

  /**
   * Save button in editor
   */
  get saveButton(): Locator {
    return this.page.getByTestId('save-button');
  }

  /**
   * Cancel button in editor
   */
  get cancelButton(): Locator {
    return this.page.getByTestId('cancel-button');
  }

  /**
   * Generate fragments button
   */
  get generateFragmentsButton(): Locator {
    return this.page.getByTestId('generate-fragments-button');
  }

  /**
   * Prompt fragments display
   */
  get promptFragments(): Locator {
    return this.page.getByTestId('prompt-fragment');
  }

  // ============================================================================
  // Locators - Editor Tabs (edit mode only)
  // ============================================================================

  /**
   * Details tab
   */
  get detailsTab(): Locator {
    return this.page.getByTestId('tab-details');
  }

  /**
   * References tab
   */
  get referencesTab(): Locator {
    return this.page.getByTestId('tab-references');
  }

  /**
   * LoRA tab
   */
  get loraTab(): Locator {
    return this.page.getByTestId('tab-lora');
  }

  /**
   * Details panel
   */
  get detailsPanel(): Locator {
    return this.page.getByTestId('panel-details');
  }

  /**
   * References panel
   */
  get referencesPanel(): Locator {
    return this.page.getByTestId('panel-references');
  }

  /**
   * LoRA panel
   */
  get loraPanel(): Locator {
    return this.page.getByTestId('panel-lora');
  }

  // ============================================================================
  // Locators - LoRA Browser
  // ============================================================================

  /**
   * LoRA browser container
   */
  get loraBrowser(): Locator {
    return this.page.getByTestId('lora-browser');
  }

  /**
   * LoRA search input
   */
  get loraSearchInput(): Locator {
    return this.page.getByTestId('lora-search-input');
  }

  /**
   * LoRA category filter buttons
   */
  get categoryFilterAll(): Locator {
    return this.page.getByTestId('category-filter-all');
  }

  get categoryFilterStyle(): Locator {
    return this.page.getByTestId('category-filter-style');
  }

  get categoryFilterCharacter(): Locator {
    return this.page.getByTestId('category-filter-character');
  }

  /**
   * LoRA cards
   */
  get loraCards(): Locator {
    return this.page.getByTestId('lora-card');
  }

  /**
   * Selected LoRA display
   */
  get selectedLoraDisplay(): Locator {
    return this.page.getByTestId('selected-lora-display');
  }

  /**
   * LoRA strength slider
   */
  get loraStrengthSlider(): Locator {
    return this.page.getByTestId('lora-strength-slider');
  }

  /**
   * Remove LoRA button
   */
  get removeLoraButton(): Locator {
    return this.page.getByTestId('remove-lora-button');
  }

  // ============================================================================
  // Locators - Confirmation Dialog
  // ============================================================================

  /**
   * Confirm close dialog (unsaved changes)
   */
  get confirmCloseDialog(): Locator {
    return this.page.getByTestId('confirm-close-dialog');
  }

  /**
   * Keep editing button
   */
  get keepEditingButton(): Locator {
    return this.page.getByTestId('cancel-close-button');
  }

  /**
   * Discard changes button
   */
  get discardChangesButton(): Locator {
    return this.page.getByTestId('confirm-close-button');
  }

  // ============================================================================
  // Locators - Character Card Actions
  // ============================================================================

  /**
   * Edit character button (on card hover)
   */
  get editButton(): Locator {
    return this.page.getByRole('button', { name: /edit character/i });
  }

  /**
   * Duplicate character button
   */
  get duplicateButton(): Locator {
    return this.page.getByRole('button', { name: /duplicate character/i });
  }

  /**
   * Delete character button
   */
  get deleteButton(): Locator {
    return this.page.getByRole('button', { name: /delete character/i });
  }

  /**
   * Delete confirmation button
   */
  get confirmDeleteButton(): Locator {
    return this.page.getByRole('button', { name: /confirm|yes|delete/i });
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async navigateToCharacters(): Promise<void> {
    // Click on Characters nav item in sidebar
    await this.page.click('.nav-item:has-text("Characters")');
    // Wait for character panel and network to settle (fresh data from API)
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.characterList.waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForCharactersLoaded();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isDisplayed(): Promise<boolean> {
    // Check if we're on the characters view
    const navItem = this.page.locator('.nav-item.active:has-text("Characters")');
    return await navItem.isVisible().catch(() => false);
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Start creating a new character
   */
  async startNewCharacter(): Promise<void> {
    if (await this.createCharacterButton.isVisible().catch(() => false)) {
      await this.createCharacterButton.click();
    } else {
      const emptyCreate = this.page.getByTestId('character-empty-create-button');
      await emptyCreate.click();
    }
    await expect(this.characterEditor).toBeVisible();
  }

  /**
   * Fill in required character fields (MVP)
   */
  async fillRequiredFields(name: string, species: string, description: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.speciesInput.fill(species);
    await this.descriptionInput.fill(description);
  }

  /**
   * Create a basic character (full flow)
   */
  async createCharacter(name: string, species: string, description: string): Promise<void> {
    await this.startNewCharacter();
    await this.fillRequiredFields(name, species, description);
    await this.save();
  }

  /**
   * Select a character from the list by name
   */
  async selectCharacter(name: string): Promise<void> {
    const card = this.page.getByLabel(`${name} character`, { exact: true });
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.click();
  }

  /**
   * Edit a character by name (hover and click edit)
   */
  async editCharacter(name: string): Promise<void> {
    // Wait for network to settle (TanStack Query may need to fetch)
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const card = this.page.getByLabel(`${name} character`, { exact: true });
    // Wait for the card to be visible
    await card.waitFor({ state: 'visible', timeout: 15000 });
    // Select the card to make action buttons visible
    await card.click({ trial: true }).catch(() => {});
    await card.click().catch(() => {});
    await card.hover();
    // Primary path: open editor via double-click on card
    await card.dblclick().catch(() => {});
    if (!(await this.characterEditor.isVisible().catch(() => false))) {
      // Fallback: click edit button (force to avoid hover/opacity issues)
      await card.getByTestId('character-edit-button').click({ force: true });
    }
    // Wait for editor to open
    await expect(this.characterEditor).toBeVisible({ timeout: 10000 });
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  /**
   * Save the character
   */
  async save(): Promise<void> {
    await this.saveButton.click();
    // Wait for dialog to close (indicates successful save)
    await expect(this.characterEditor).toBeHidden({ timeout: 10000 });
    await this.waitForLoading();
  }

  /**
   * Cancel editing
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Close the editor
   */
  async closeEditor(): Promise<void> {
    await this.closeEditorButton.click();
  }

  /**
   * Delete a character by name
   */
  async deleteCharacter(name: string): Promise<void> {
    const card = this.page.getByLabel(`${name} character`, { exact: true });
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.hover();
    await card.getByTestId('character-delete-button').click();
    // Wait for and click confirmation
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
  }

  /**
   * Switch to a tab in the editor
   */
  async switchToTab(tab: 'details' | 'references' | 'lora'): Promise<void> {
    await expect(this.characterEditor).toBeVisible({ timeout: 10000 });
    switch (tab) {
      case 'details':
        await this.detailsTab.waitFor({ state: 'visible', timeout: 5000 });
        await this.detailsTab.click();
        break;
      case 'references':
        await this.referencesTab.waitFor({ state: 'visible', timeout: 5000 });
        await this.referencesTab.click();
        break;
      case 'lora':
        await this.loraTab.waitFor({ state: 'visible', timeout: 5000 });
        await this.loraTab.click();
        break;
    }
  }

  /**
   * Select a LoRA by ID
   */
  async selectLora(loraId: string): Promise<void> {
    await this.loraCards.filter({ has: this.page.locator(`[data-lora-id="${loraId}"]`) }).click();
  }

  /**
   * Set LoRA strength
   */
  async setLoraStrength(strength: number): Promise<void> {
    await this.loraStrengthSlider.fill(strength.toString());
  }

  /**
   * Filter LoRAs by category
   */
  async filterLorasByCategory(category: 'all' | 'style' | 'character' | 'concept' | 'effect'): Promise<void> {
    await this.page.getByTestId(`category-filter-${category}`).click();
  }

  /**
   * Search characters
   */
  async searchCharacters(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert character exists in list
   */
  async expectCharacterInList(name: string): Promise<void> {
    await this.waitForCharactersLoaded();
    await expect(async () => {
      await expect(this.page.getByLabel(`${name} character`, { exact: true })).toBeVisible();
    }).toPass({ timeout: 15000 });
  }

  /**
   * Assert character NOT in list
   */
  async expectCharacterNotInList(name: string): Promise<void> {
    await this.waitForCharactersLoaded();
    await expect(async () => {
      await expect(this.page.getByLabel(`${name} character`, { exact: true })).not.toBeVisible();
    }).toPass({ timeout: 15000 });
  }

  /**
   * Wait for characters list to load (either empty state or at least one card)
   */
  async waitForCharactersLoaded(): Promise<void> {
    const loadedIndicator = this.characterCards.first().or(this.emptyState);
    await loadedIndicator.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  /**
   * Assert character count
   */
  async expectCharacterCount(count: number): Promise<void> {
    await expect(this.characterCountBadge).toContainText(`${count} character`);
  }

  /**
   * Assert editor is visible
   */
  async expectEditorVisible(): Promise<void> {
    await expect(this.characterEditor).toBeVisible();
  }

  /**
   * Assert editor is in create mode
   */
  async expectCreateMode(): Promise<void> {
    await expect(this.editorTitle).toContainText('Create Character');
  }

  /**
   * Assert editor is in edit mode for character
   */
  async expectEditMode(characterName: string): Promise<void> {
    await expect(this.editorTitle).toContainText(`Edit: ${characterName}`);
  }

  /**
   * Assert validation error for name
   */
  async expectNameError(message?: string): Promise<void> {
    await expect(this.nameError).toBeVisible();
    if (message) {
      await expect(this.nameError).toContainText(message);
    }
  }

  /**
   * Assert validation error for species
   */
  async expectSpeciesError(message?: string): Promise<void> {
    await expect(this.speciesError).toBeVisible();
    if (message) {
      await expect(this.speciesError).toContainText(message);
    }
  }

  /**
   * Assert save button is disabled
   */
  async expectSaveDisabled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  /**
   * Assert save button is enabled
   */
  async expectSaveEnabled(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
  }

  /**
   * Assert prompt fragments contain expected text
   */
  async expectPromptFragmentsContain(text: string): Promise<void> {
    await expect(this.promptFragments.filter({ hasText: text })).toBeVisible();
  }

  /**
   * Assert LoRA is selected
   */
  async expectLoraSelected(loraName: string): Promise<void> {
    await expect(this.selectedLoraDisplay).toContainText(loraName);
  }

  /**
   * Assert empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Assert LoRA browser shows category
   */
  async expectLoraCategory(category: string): Promise<void> {
    await expect(this.page.getByTestId(`lora-category-${category}`)).toBeVisible();
  }

  /**
   * Get character count
   */
  async getCharacterCount(): Promise<number> {
    const badgeText = await this.characterCountBadge.textContent();
    const match = badgeText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
