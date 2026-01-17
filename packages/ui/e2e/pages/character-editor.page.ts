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
  // Locators
  // ============================================================================

  /**
   * Character editor container
   */
  get characterEditorContainer(): Locator {
    return this.page.getByTestId('character-editor-container');
  }

  /**
   * Character list sidebar
   */
  get characterList(): Locator {
    return this.page.getByTestId('character-list');
  }

  /**
   * Character cards in the list
   */
  get characterCards(): Locator {
    return this.characterList.getByTestId('character-card');
  }

  /**
   * Create new character button
   */
  get createCharacterButton(): Locator {
    return this.page.getByRole('button', { name: /create character|new character/i });
  }

  /**
   * Character name input
   */
  get nameInput(): Locator {
    return this.page.getByLabel(/name/i);
  }

  /**
   * Species input
   */
  get speciesInput(): Locator {
    return this.page.getByLabel(/species/i);
  }

  /**
   * Appearance description textarea
   */
  get appearanceInput(): Locator {
    return this.page.getByLabel(/appearance/i);
  }

  /**
   * Color palette picker
   */
  get colorPalette(): Locator {
    return this.page.getByTestId('color-palette');
  }

  /**
   * Reference image upload area
   */
  get referenceImageUpload(): Locator {
    return this.page.getByTestId('reference-image-upload');
  }

  /**
   * Reference images gallery
   */
  get referenceGallery(): Locator {
    return this.page.getByTestId('reference-gallery');
  }

  /**
   * Generate reference button
   */
  get generateReferenceButton(): Locator {
    return this.page.getByRole('button', { name: /generate reference/i });
  }

  /**
   * Age input (optional)
   */
  get ageInput(): Locator {
    return this.page.getByLabel(/age/i);
  }

  /**
   * Personality traits input
   */
  get personalityInput(): Locator {
    return this.page.getByLabel(/personality/i);
  }

  /**
   * Prompt fragments display
   */
  get promptFragments(): Locator {
    return this.page.getByTestId('prompt-fragments');
  }

  /**
   * Save character button
   */
  get saveButton(): Locator {
    return this.page.getByRole('button', { name: /save/i });
  }

  /**
   * Delete character button
   */
  get deleteButton(): Locator {
    return this.page.getByRole('button', { name: /delete/i });
  }

  /**
   * Character dropdown selector (for panels)
   */
  get characterSelector(): Locator {
    return this.page.getByTestId('character-selector');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(projectId?: string): Promise<void> {
    if (projectId) {
      await this.page.goto(`/projects/${projectId}/characters`);
    } else {
      await this.page.goto('/characters');
    }
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.characterEditorContainer).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.characterEditorContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Start creating a new character
   */
  async startNewCharacter(): Promise<void> {
    await this.createCharacterButton.click();
  }

  /**
   * Fill in required character fields (MVP)
   */
  async fillRequiredFields(name: string, species: string, appearance: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.speciesInput.fill(species);
    await this.appearanceInput.fill(appearance);
  }

  /**
   * Create a basic character
   */
  async createCharacter(name: string, species: string, appearance: string): Promise<void> {
    await this.startNewCharacter();
    await this.fillRequiredFields(name, species, appearance);
    await this.save();
  }

  /**
   * Select a character from the list
   */
  async selectCharacter(name: string): Promise<void> {
    await this.characterCards.filter({ hasText: name }).click();
  }

  /**
   * Upload a reference image
   */
  async uploadReferenceImage(filePath: string): Promise<void> {
    const fileInput = this.referenceImageUpload.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Generate a reference image
   */
  async generateReference(): Promise<void> {
    await this.generateReferenceButton.click();
    await this.waitForLoading();
  }

  /**
   * Set a color in the palette
   */
  async setColor(index: number, color: string): Promise<void> {
    const colorInput = this.colorPalette.locator('input[type="color"]').nth(index);
    await colorInput.fill(color);
  }

  /**
   * Save the character
   */
  async save(): Promise<void> {
    await this.saveButton.click();
    await this.waitForLoading();
  }

  /**
   * Delete the current character
   */
  async deleteCharacter(): Promise<void> {
    await this.deleteButton.click();
    // Confirm deletion
    await this.page.getByRole('button', { name: /confirm|yes/i }).click();
  }

  /**
   * Add character to panel via selector
   */
  async addCharacterToPanel(name: string): Promise<void> {
    await this.characterSelector.click();
    await this.page.getByRole('option', { name }).click();
  }

  /**
   * Drag character card onto a panel
   */
  async dragCharacterToPanel(characterName: string, panelLocator: Locator): Promise<void> {
    const characterCard = this.characterCards.filter({ hasText: characterName });
    await characterCard.dragTo(panelLocator);
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert character exists in list
   */
  async expectCharacterInList(name: string): Promise<void> {
    await expect(this.characterCards.filter({ hasText: name })).toBeVisible();
  }

  /**
   * Assert character count
   */
  async expectCharacterCount(count: number): Promise<void> {
    await expect(this.characterCards).toHaveCount(count);
  }

  /**
   * Assert prompt fragments contain expected text
   */
  async expectPromptFragmentsContain(text: string): Promise<void> {
    await expect(this.promptFragments).toContainText(text);
  }

  /**
   * Assert reference gallery has images
   */
  async expectReferenceImages(count: number): Promise<void> {
    const images = this.referenceGallery.getByRole('img');
    await expect(images).toHaveCount(count);
  }

  /**
   * Assert character is valid (all required fields filled)
   */
  async expectCharacterValid(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
  }

  /**
   * Assert save confirmation
   */
  async expectSaveConfirmation(): Promise<void> {
    await this.waitForToast(/saved|created/i);
  }

  /**
   * Get character count
   */
  async getCharacterCount(): Promise<number> {
    return await this.characterCards.count();
  }
}
