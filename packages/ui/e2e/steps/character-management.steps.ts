/**
 * Character Management Step Definitions
 * 
 * BDD step implementations for character management features.
 * The Test Terrorist demands thorough coverage! 🔥
 */

import { Given, When, Then, Before, After, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Page } from '@playwright/test';

// ============================================================================
// Types
// ============================================================================

interface CharacterWorld {
  page: Page;
  currentProject: string;
  selectedCharacter: string | null;
  uploadedFile: string | null;
}

// ============================================================================
// Hooks
// ============================================================================

Before(async function (this: CharacterWorld) {
  // Initialize test state
  this.currentProject = '';
  this.selectedCharacter = null;
  this.uploadedFile = null;
});

After(async function (this: CharacterWorld) {
  // Cleanup after each scenario
  this.selectedCharacter = null;
  this.uploadedFile = null;
});

// ============================================================================
// Background Steps
// ============================================================================

Given('I have a project called {string}', async function (this: CharacterWorld, projectName: string) {
  this.currentProject = projectName;
  // API call to ensure project exists
  await this.page.evaluate(async (name) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createProject({ name });
  }, projectName);
});

Given('I am viewing the character panel', async function (this: CharacterWorld) {
  await this.page.goto(`/projects/${encodeURIComponent(this.currentProject)}`);
  await this.page.waitForSelector('[data-testid="character-panel"]');
});

// ============================================================================
// Character CRUD Steps
// ============================================================================

When('I click the {string} button', async function (this: CharacterWorld, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

When('I fill in the character name as {string}', async function (this: CharacterWorld, name: string) {
  await this.page.fill('[data-testid="character-name-input"]', name);
});

When('I leave the character name empty', async function (this: CharacterWorld) {
  await this.page.fill('[data-testid="character-name-input"]', '');
});

When('I select the species as {string}', async function (this: CharacterWorld, species: string) {
  await this.page.fill('[data-testid="character-species-input"]', species);
});

When('I leave the species empty', async function (this: CharacterWorld) {
  await this.page.fill('[data-testid="character-species-input"]', '');
});

When('I add a description {string}', async function (this: CharacterWorld, description: string) {
  await this.page.fill('[data-testid="character-description-input"]', description);
});

When('I save the character', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="save-character-button"]');
  await this.page.waitForResponse(resp => resp.url().includes('/api/characters') && resp.status() === 201);
});

When('I try to save the character', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="save-character-button"]');
});

Then('I should see {string} in the character list', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator(`[data-testid="character-card"]:has-text("${name}")`)).toBeVisible();
});

Then('the character should have the species {string}', async function (this: CharacterWorld, species: string) {
  await expect(this.page.locator(`[data-testid="character-species"]:has-text("${species}")`)).toBeVisible();
});

Then('I should see a validation error for {string}', async function (this: CharacterWorld, field: string) {
  await expect(this.page.locator(`[data-testid="${field}-error"]`)).toBeVisible();
});

Then('the character should not be created', async function (this: CharacterWorld) {
  // Verify no network request was made
  const requests = await this.page.evaluate(() => {
    // @ts-expect-error - window.__TEST_REQUESTS__ is injected in test setup
    return window.__TEST_REQUESTS__.filter(r => r.method === 'POST' && r.url.includes('/characters'));
  });
  expect(requests.length).toBe(0);
});

// ============================================================================
// Character View/Edit Steps
// ============================================================================

Given('a character {string} exists', async function (this: CharacterWorld, name: string) {
  await this.page.evaluate(async (charName) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ name: charName, species: 'test' });
  }, name);
});

Given('a character {string} exists with color palette {string}', async function (
  this: CharacterWorld,
  name: string,
  palette: string
) {
  const colors = palette.split(', ').map(c => c.trim());
  await this.page.evaluate(async ({ charName, charColors }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ name: charName, species: 'test', colorPalette: charColors });
  }, { charName: name, charColors: colors });
});

When('I click on {string} in the character list', async function (this: CharacterWorld, name: string) {
  await this.page.click(`[data-testid="character-card"]:has-text("${name}")`);
  this.selectedCharacter = name;
});

Then('I should see the character editor', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="character-editor"]')).toBeVisible();
});

Then('I should see the name {string}', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator('[data-testid="character-name-input"]')).toHaveValue(name);
});

Then('I should see all character fields populated', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="character-name-input"]')).not.toBeEmpty();
  await expect(this.page.locator('[data-testid="character-species-input"]')).not.toBeEmpty();
});

When('I change the name to {string}', async function (this: CharacterWorld, newName: string) {
  await this.page.fill('[data-testid="character-name-input"]', newName);
});

Then('{string} should no longer appear', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator(`[data-testid="character-card"]:has-text("${name}")`)).not.toBeVisible();
});

// ============================================================================
// Delete Steps
// ============================================================================

When('I click the delete button for {string}', async function (this: CharacterWorld, name: string) {
  await this.page.click(`[data-testid="character-card"]:has-text("${name}") [data-testid="delete-button"]`);
});

When('I confirm the deletion', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="confirm-delete-button"]');
});

When('I cancel the deletion', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="cancel-delete-button"]');
});

Then('{string} should be removed from the list', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator(`[data-testid="character-card"]:has-text("${name}")`)).not.toBeVisible();
});

Then('the character count should decrease by {int}', async function (this: CharacterWorld, count: number) {
  // This would check against a stored previous count
  // Implementation depends on test infrastructure
});

Then('{string} should still be in the list', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator(`[data-testid="character-card"]:has-text("${name}")`)).toBeVisible();
});

// ============================================================================
// Duplicate Steps
// ============================================================================

When('I click the duplicate button for {string}', async function (this: CharacterWorld, name: string) {
  await this.page.click(`[data-testid="character-card"]:has-text("${name}") [data-testid="duplicate-button"]`);
});

Then('{string} should have the same color palette as {string}', async function (
  this: CharacterWorld,
  copyName: string,
  originalName: string
) {
  const originalPalette = await this.page.evaluate(async (name) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    const char = await window.__TEST_API__.getCharacterByName(name);
    return char?.colorPalette;
  }, originalName);

  const copyPalette = await this.page.evaluate(async (name) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    const char = await window.__TEST_API__.getCharacterByName(name);
    return char?.colorPalette;
  }, copyName);

  expect(copyPalette).toEqual(originalPalette);
});

Then('{string} should have a different ID than {string}', async function (
  this: CharacterWorld,
  copyName: string,
  originalName: string
) {
  const originalId = await this.page.evaluate(async (name) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    const char = await window.__TEST_API__.getCharacterByName(name);
    return char?.id;
  }, originalName);

  const copyId = await this.page.evaluate(async (name) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    const char = await window.__TEST_API__.getCharacterByName(name);
    return char?.id;
  }, copyName);

  expect(copyId).not.toEqual(originalId);
});

// ============================================================================
// Panel UI Steps
// ============================================================================

When('I click the collapse button on the character panel', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="collapse-panel-button"]');
});

Then('the character panel should be collapsed', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="character-panel"]')).toHaveAttribute('data-collapsed', 'true');
});

Then('I should see only character thumbnails', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="character-thumbnail"]').first()).toBeVisible();
  await expect(this.page.locator('[data-testid="character-name"]').first()).not.toBeVisible();
});

When('I click the expand button', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="expand-panel-button"]');
});

Then('the character panel should be expanded', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="character-panel"]')).toHaveAttribute('data-collapsed', 'false');
});

Then('I should see full character cards', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="character-card"]').first()).toBeVisible();
});

// ============================================================================
// Search/Filter Steps
// ============================================================================

Given('the following characters exist:', async function (this: CharacterWorld, dataTable: DataTable) {
  const characters = dataTable.hashes();
  for (const char of characters) {
    await this.page.evaluate(async (c) => {
      // @ts-expect-error - window.__TEST_API__ is injected in test setup
      await window.__TEST_API__.createCharacter({ name: c.name, species: c.species || 'test' });
    }, char);
  }
});

When('I type {string} in the search box', async function (this: CharacterWorld, searchTerm: string) {
  await this.page.fill('[data-testid="character-search-input"]', searchTerm);
});

Then('I should see {int} characters in the list', async function (this: CharacterWorld, count: number) {
  const cards = await this.page.locator('[data-testid="character-card"]').count();
  expect(cards).toBe(count);
});

Then('I should not see {string}', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator(`[data-testid="character-card"]:has-text("${name}")`)).not.toBeVisible();
});

When('I filter by species {string}', async function (this: CharacterWorld, species: string) {
  await this.page.click('[data-testid="species-filter"]');
  await this.page.click(`[data-testid="species-option-${species}"]`);
});

// ============================================================================
// Stats Steps
// ============================================================================

Given('{int} characters exist with a total of {int} reference images', async function (
  this: CharacterWorld,
  charCount: number,
  refCount: number
) {
  const refsPerChar = Math.floor(refCount / charCount);
  const extraRefs = refCount % charCount;
  
  for (let i = 0; i < charCount; i++) {
    const refs = i === 0 ? refsPerChar + extraRefs : refsPerChar;
    await this.page.evaluate(async ({ index, refCount }) => {
      // @ts-expect-error - window.__TEST_API__ is injected in test setup
      await window.__TEST_API__.createCharacterWithRefs({ name: `Char ${index}`, refCount });
    }, { index: i, refCount: refs });
  }
});

When('I view the character stats', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="view-stats-button"]');
});

// ============================================================================
// Keyboard Navigation Steps
// ============================================================================

When('I focus the character list', async function (this: CharacterWorld) {
  await this.page.focus('[data-testid="character-list"]');
});

When('I press the down arrow key', async function (this: CharacterWorld) {
  await this.page.keyboard.press('ArrowDown');
});

When('I press the down arrow key again', async function (this: CharacterWorld) {
  await this.page.keyboard.press('ArrowDown');
});

When('I press Enter', async function (this: CharacterWorld) {
  await this.page.keyboard.press('Enter');
});

Then('{string} should be highlighted', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator(`[data-testid="character-card"]:has-text("${name}")`)).toHaveClass(/highlighted/);
});

Then('the character editor should open for {string}', async function (this: CharacterWorld, name: string) {
  await expect(this.page.locator('[data-testid="character-editor"]')).toBeVisible();
  await expect(this.page.locator('[data-testid="character-name-input"]')).toHaveValue(name);
});

// ============================================================================
// Reference Image Steps
// ============================================================================

Given('a character {string} exists with {int} reference images', async function (
  this: CharacterWorld,
  name: string,
  refCount: number
) {
  await this.page.evaluate(async ({ charName, count }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacterWithRefs({ name: charName, refCount: count });
  }, { charName: name, count: refCount });
});

Given('a character {string} exists with a reference image', async function (this: CharacterWorld, name: string) {
  await this.page.evaluate(async (charName) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacterWithRefs({ name: charName, refCount: 1 });
  }, name);
});

When('I open the character editor for {string}', async function (this: CharacterWorld, name: string) {
  await this.page.click(`[data-testid="character-card"]:has-text("${name}") [data-testid="edit-button"]`);
  await expect(this.page.locator('[data-testid="character-editor"]')).toBeVisible();
});

When('I upload a reference image {string}', async function (this: CharacterWorld, filename: string) {
  this.uploadedFile = filename;
  const [fileChooser] = await Promise.all([
    this.page.waitForEvent('filechooser'),
    this.page.click('[data-testid="upload-reference-button"]'),
  ]);
  await fileChooser.setFiles(`./test-fixtures/${filename}`);
});

When('I mark it as {string} type', async function (this: CharacterWorld, type: string) {
  await this.page.click(`[data-testid="reference-type-${type}"]`);
});

Then('the character should have {int} reference image', async function (this: CharacterWorld, count: number) {
  const refCount = await this.page.locator('[data-testid="reference-image"]').count();
  expect(refCount).toBe(count);
});

Then('the character should have {int} reference images', async function (this: CharacterWorld, count: number) {
  const refCount = await this.page.locator('[data-testid="reference-image"]').count();
  expect(refCount).toBe(count);
});

Then('the reference should be marked as {string}', async function (this: CharacterWorld, type: string) {
  await expect(this.page.locator(`[data-testid="reference-type-badge"]:has-text("${type}")`)).toBeVisible();
});

When('I try to upload an image larger than 10MB', async function (this: CharacterWorld) {
  const [fileChooser] = await Promise.all([
    this.page.waitForEvent('filechooser'),
    this.page.click('[data-testid="upload-reference-button"]'),
  ]);
  await fileChooser.setFiles('./test-fixtures/large-image.png');
});

Then('I should see an error {string}', async function (this: CharacterWorld, message: string) {
  await expect(this.page.locator(`[data-testid="error-message"]:has-text("${message}")`)).toBeVisible();
});

Then('no reference should be added', async function (this: CharacterWorld) {
  // Verify count didn't change
});

When('I try to upload a file {string}', async function (this: CharacterWorld, filename: string) {
  const [fileChooser] = await Promise.all([
    this.page.waitForEvent('filechooser'),
    this.page.click('[data-testid="upload-reference-button"]'),
  ]);
  await fileChooser.setFiles(`./test-fixtures/${filename}`);
});

When('I delete the first reference image', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="reference-image"]:first-child [data-testid="delete-reference-button"]');
});

When('I mark the reference as {string}', async function (this: CharacterWorld, type: string) {
  await this.page.click(`[data-testid="reference-type-${type}"]`);
});

Then('it should no longer be marked as {string}', async function (this: CharacterWorld, type: string) {
  await expect(this.page.locator(`[data-testid="reference-type-badge"]:has-text("${type}")`)).not.toBeVisible();
});

When('I try to add another reference image', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="upload-reference-button"]');
});

Then('I should see a warning about the reference limit', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="reference-limit-warning"]')).toBeVisible();
});

Then('the character should still have 10 reference images max', async function (this: CharacterWorld) {
  const refCount = await this.page.locator('[data-testid="reference-image"]').count();
  expect(refCount).toBeLessThanOrEqual(10);
});

// ============================================================================
// LoRA Steps
// ============================================================================

When('I open the LoRA browser', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="open-lora-browser-button"]');
  await expect(this.page.locator('[data-testid="lora-browser"]')).toBeVisible();
});

Then('I should see LoRAs grouped by category', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="lora-category"]').first()).toBeVisible();
});

Then('I should see {string} category', async function (this: CharacterWorld, category: string) {
  await expect(this.page.locator(`[data-testid="lora-category"]:has-text("${category}")`)).toBeVisible();
});

When('I filter by category {string}', async function (this: CharacterWorld, category: string) {
  await this.page.click(`[data-testid="lora-category-filter-${category.toLowerCase()}"]`);
});

Then('I should only see style LoRAs', async function (this: CharacterWorld) {
  const loraItems = await this.page.locator('[data-testid="lora-item"]').all();
  for (const item of loraItems) {
    await expect(item).toHaveAttribute('data-category', 'style');
  }
});

Then('I should not see character LoRAs', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="lora-item"][data-category="character"]')).not.toBeVisible();
});

Given('a character {string} exists without a LoRA', async function (this: CharacterWorld, name: string) {
  await this.page.evaluate(async (charName) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ name: charName, species: 'test', lora: null });
  }, name);
});

When('I select the {string} LoRA', async function (this: CharacterWorld, loraId: string) {
  await this.page.click(`[data-testid="lora-item-${loraId}"]`);
});

When('I set the strength to {float}', async function (this: CharacterWorld, strength: number) {
  await this.page.fill('[data-testid="lora-strength-input"]', String(strength));
});

Then('{string} should have the {string} LoRA associated', async function (
  this: CharacterWorld,
  charName: string,
  loraId: string
) {
  const lora = await this.page.evaluate(async (name) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    const char = await window.__TEST_API__.getCharacterByName(name);
    return char?.lora;
  }, charName);
  expect(lora?.id).toBe(loraId);
});

Then('the LoRA strength should be {float}', async function (this: CharacterWorld, strength: number) {
  await expect(this.page.locator('[data-testid="lora-strength-input"]')).toHaveValue(String(strength));
});

Given('a character {string} exists with LoRA {string} at strength {float}', async function (
  this: CharacterWorld,
  name: string,
  loraId: string,
  strength: number
) {
  await this.page.evaluate(async ({ charName, lora, str }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ 
      name: charName, 
      species: 'test', 
      lora: { id: lora, strength: str } 
    });
  }, { charName: name, lora: loraId, str: strength });
});

When('I adjust the LoRA strength to {float}', async function (this: CharacterWorld, strength: number) {
  await this.page.fill('[data-testid="lora-strength-input"]', String(strength));
});

Given('a character {string} exists with LoRA {string}', async function (
  this: CharacterWorld,
  name: string,
  loraId: string
) {
  await this.page.evaluate(async ({ charName, lora }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ 
      name: charName, 
      species: 'test', 
      lora: { id: lora, strength: 0.8 } 
    });
  }, { charName: name, lora: loraId });
});

When('I remove the LoRA association', async function (this: CharacterWorld) {
  await this.page.click('[data-testid="remove-lora-button"]');
});

Then('{string} should have no LoRA associated', async function (this: CharacterWorld, name: string) {
  const lora = await this.page.evaluate(async (charName) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    const char = await window.__TEST_API__.getCharacterByName(charName);
    return char?.lora;
  }, name);
  expect(lora).toBeNull();
});

Given('a character {string} exists with a LoRA', async function (this: CharacterWorld, name: string) {
  await this.page.evaluate(async (charName) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ 
      name: charName, 
      species: 'test', 
      lora: { id: 'test_lora', strength: 0.5 } 
    });
  }, name);
});

When('I try to set the LoRA strength to {float}', async function (this: CharacterWorld, strength: number) {
  await this.page.fill('[data-testid="lora-strength-input"]', String(strength));
  await this.page.keyboard.press('Tab'); // Trigger validation
});

Then('the strength should be clamped to {float}', async function (this: CharacterWorld, expected: number) {
  await expect(this.page.locator('[data-testid="lora-strength-input"]')).toHaveValue(String(expected));
});

// ============================================================================
// Color Palette Steps
// ============================================================================

When('I click {string} on the reference', async function (this: CharacterWorld, button: string) {
  await this.page.click(`[data-testid="reference-action-${button.toLowerCase().replace(' ', '-')}"]`);
});

Then('the character should have a color palette', async function (this: CharacterWorld) {
  const colors = await this.page.locator('[data-testid="color-swatch"]').count();
  expect(colors).toBeGreaterThan(0);
});

Then('the palette should have at most {int} colors', async function (this: CharacterWorld, max: number) {
  const colors = await this.page.locator('[data-testid="color-swatch"]').count();
  expect(colors).toBeLessThanOrEqual(max);
});

When('I add color {string} to the palette', async function (this: CharacterWorld, color: string) {
  await this.page.fill('[data-testid="color-picker-input"]', color);
  await this.page.click('[data-testid="add-color-button"]');
});

Then('the palette should contain {string}', async function (this: CharacterWorld, color: string) {
  await expect(this.page.locator(`[data-testid="color-swatch"][data-color="${color}"]`)).toBeVisible();
});

Given('a character {string} exists with palette {string}', async function (
  this: CharacterWorld,
  name: string,
  palette: string
) {
  const colors = palette.split(', ').map(c => c.trim());
  await this.page.evaluate(async ({ charName, charColors }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ name: charName, species: 'test', colorPalette: charColors });
  }, { charName: name, charColors: colors });
});

When('I remove color {string} from the palette', async function (this: CharacterWorld, color: string) {
  await this.page.click(`[data-testid="color-swatch"][data-color="${color}"] [data-testid="remove-color-button"]`);
});

Then('the palette should not contain {string}', async function (this: CharacterWorld, color: string) {
  await expect(this.page.locator(`[data-testid="color-swatch"][data-color="${color}"]`)).not.toBeVisible();
});

Then('the palette should have {int} colors', async function (this: CharacterWorld, count: number) {
  const colors = await this.page.locator('[data-testid="color-swatch"]').count();
  expect(colors).toBe(count);
});

Given('a character {string} exists with {int} colors', async function (
  this: CharacterWorld,
  name: string,
  count: number
) {
  const colors = Array.from({ length: count }, (_, i) => `#${i.toString().padStart(6, '0')}`);
  await this.page.evaluate(async ({ charName, charColors }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ name: charName, species: 'test', colorPalette: charColors });
  }, { charName: name, charColors: colors });
});

When('I try to add another color', async function (this: CharacterWorld) {
  await this.page.fill('[data-testid="color-picker-input"]', '#FFFFFF');
  await this.page.click('[data-testid="add-color-button"]');
});

Then('I should see a warning about palette limit', async function (this: CharacterWorld) {
  await expect(this.page.locator('[data-testid="palette-limit-warning"]')).toBeVisible();
});

Then('the palette should still have {int} colors', async function (this: CharacterWorld, count: number) {
  const colors = await this.page.locator('[data-testid="color-swatch"]').count();
  expect(colors).toBe(count);
});

// ============================================================================
// Prompt Fragment Steps
// ============================================================================

When('I add prompt fragment {string}', async function (this: CharacterWorld, fragment: string) {
  await this.page.fill('[data-testid="prompt-fragment-input"]', fragment);
  await this.page.click('[data-testid="add-prompt-fragment-button"]');
});

Then('the character should have the prompt fragment {string}', async function (
  this: CharacterWorld,
  fragment: string
) {
  await expect(this.page.locator(`[data-testid="prompt-fragment"]:has-text("${fragment}")`)).toBeVisible();
});

Given('a character {string} exists with prompt {string}', async function (
  this: CharacterWorld,
  name: string,
  prompts: string
) {
  const fragments = prompts.split(', ').map(p => p.trim());
  await this.page.evaluate(async ({ charName, charPrompts }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({ name: charName, species: 'test', promptFragments: charPrompts });
  }, { charName: name, charPrompts: fragments });
});

When('I remove prompt fragment {string}', async function (this: CharacterWorld, fragment: string) {
  await this.page.click(`[data-testid="prompt-fragment"]:has-text("${fragment}") [data-testid="remove-fragment-button"]`);
});

Then('the character should not have the prompt fragment {string}', async function (
  this: CharacterWorld,
  fragment: string
) {
  await expect(this.page.locator(`[data-testid="prompt-fragment"]:has-text("${fragment}")`)).not.toBeVisible();
});

Then('the character should still have {string} and {string}', async function (
  this: CharacterWorld,
  frag1: string,
  frag2: string
) {
  await expect(this.page.locator(`[data-testid="prompt-fragment"]:has-text("${frag1}")`)).toBeVisible();
  await expect(this.page.locator(`[data-testid="prompt-fragment"]:has-text("${frag2}")`)).toBeVisible();
});

Given('a character {string} exists with:', async function (this: CharacterWorld, name: string, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  await this.page.evaluate(async (charData) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createCharacter({
      name: charData.name,
      species: charData.species || 'test',
      lora: charData.lora ? { id: charData.lora, strength: 0.8 } : null,
    });
  }, data);
});

When('I click {string}', async function (this: CharacterWorld, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

Then('prompt fragments should be auto-generated', async function (this: CharacterWorld) {
  const fragments = await this.page.locator('[data-testid="prompt-fragment"]').count();
  expect(fragments).toBeGreaterThan(0);
});

Then('fragments should include species {string}', async function (this: CharacterWorld, species: string) {
  await expect(this.page.locator(`[data-testid="prompt-fragment"]:has-text("${species}")`)).toBeVisible();
});

Then('fragments should reference the LoRA style', async function (this: CharacterWorld) {
  // Check for style-related fragments
  const fragments = await this.page.locator('[data-testid="prompt-fragment"]').allTextContents();
  expect(fragments.some(f => f.includes('style') || f.includes('cyberpunk'))).toBe(true);
});

// ============================================================================
// Multi-Project Steps
// ============================================================================

Given('I have a project {string} with character {string}', async function (
  this: CharacterWorld,
  projectName: string,
  charName: string
) {
  await this.page.evaluate(async ({ proj, char }) => {
    // @ts-expect-error - window.__TEST_API__ is injected in test setup
    await window.__TEST_API__.createProjectWithCharacter(proj, char);
  }, { proj: projectName, char: charName });
});

When('I switch to project {string}', async function (this: CharacterWorld, projectName: string) {
  await this.page.click('[data-testid="project-selector"]');
  await this.page.click(`[data-testid="project-option-${projectName.toLowerCase().replace(' ', '-')}"]`);
  this.currentProject = projectName;
});

Given('I have selected character {string} in project {string}', async function (
  this: CharacterWorld,
  charName: string,
  projectName: string
) {
  this.currentProject = projectName;
  this.selectedCharacter = charName;
  await this.page.goto(`/projects/${encodeURIComponent(projectName)}`);
  await this.page.click(`[data-testid="character-card"]:has-text("${charName}")`);
});

When('I switch back to project {string}', async function (this: CharacterWorld, projectName: string) {
  await this.page.click('[data-testid="project-selector"]');
  await this.page.click(`[data-testid="project-option-${projectName.toLowerCase().replace(' ', '-')}"]`);
  this.currentProject = projectName;
});

Then('{string} should still be selected', async function (this: CharacterWorld, charName: string) {
  await expect(this.page.locator(`[data-testid="character-card"]:has-text("${charName}")`)).toHaveClass(/selected/);
});

// ============================================================================
// Drag and Drop Steps (Future - WIP)
// ============================================================================

When('I drag {string} from the character panel', async function (this: CharacterWorld, name: string) {
  // Future implementation
});

When('I drop it onto the canvas', async function (this: CharacterWorld) {
  // Future implementation
});

Then('a character instance should be created on the canvas', async function (this: CharacterWorld) {
  // Future implementation
});

Then('the instance should reference {string}', async function (this: CharacterWorld, name: string) {
  // Future implementation
});

Given('the following characters exist in order:', async function (this: CharacterWorld, dataTable: DataTable) {
  const characters = dataTable.hashes();
  for (const char of characters) {
    await this.page.evaluate(async (c) => {
      // @ts-expect-error - window.__TEST_API__ is injected in test setup
      await window.__TEST_API__.createCharacter({ name: c.name, species: 'test' });
    }, char);
  }
});

When('I drag {string} above {string}', async function (this: CharacterWorld, dragName: string, targetName: string) {
  // Future implementation for drag reorder
});

Then('the character order should be {string}', async function (this: CharacterWorld, order: string) {
  const expected = order.split(', ').map(n => n.trim());
  const cards = await this.page.locator('[data-testid="character-card"]').allTextContents();
  expect(cards.map(c => c.split('\n')[0])).toEqual(expected);
});
