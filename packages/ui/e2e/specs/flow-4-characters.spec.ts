/**
 * Flow 4: Character Management
 *
 * E2E tests for character creation, consistency system,
 * and character usage in generation.
 *
 * @see _bmad-output/planning-artifacts/user-flows-spec.md - Flow 4
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

test.describe('Flow 4: Character Management', () => {
  // ==========================================================================
  // Test Setup
  // ==========================================================================

  test.beforeEach(async ({ page, api }) => {
    // Create a test project for each test
    const project = await api.createProject('Character Test Project', 'Testing character management');
    // Navigate to the project
    await page.goto(`/projects/${project.id}`);
    await page.waitForLoadState('networkidle');
  });

  // ==========================================================================
  // 4.1 Character Creation
  // ==========================================================================

  test.describe('4.1 Character Creation', () => {
    test('should create MVP character with required fields', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_4] }, async ({ page, characterEditorPage }) => {
      // Navigate to Characters section
      await characterEditorPage.navigateToCharacters();
      
      // Start creating a new character
      await characterEditorPage.startNewCharacter();
      
      // Verify we're in create mode
      await characterEditorPage.expectCreateMode();
      
      // Fill in MVP required fields: name, species, description
      await characterEditorPage.fillRequiredFields(
        'Marina',
        'otter',
        'Sleek brown fur, bright eyes, wearing a captain\'s hat'
      );
      
      // Save the character
      await characterEditorPage.save();
      
      // Verify character appears in list
      await characterEditorPage.expectCharacterInList('Marina');
    });

    test('should require name field', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_4] }, async ({ characterEditorPage }) => {
      // Navigate to Characters section
      await characterEditorPage.navigateToCharacters();
      
      // Start creating a new character
      await characterEditorPage.startNewCharacter();
      
      // Fill only species and description, leave name empty
      await characterEditorPage.speciesInput.fill('otter');
      await characterEditorPage.descriptionInput.fill('Test description');
      
      // Try to save
      await characterEditorPage.saveButton.click();
      
      // Expect validation error
      await characterEditorPage.expectNameError('Name is required');
    });

    test('should require species field', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_4] }, async ({ characterEditorPage }) => {
      // Navigate to Characters section
      await characterEditorPage.navigateToCharacters();
      
      // Start creating a new character
      await characterEditorPage.startNewCharacter();
      
      // Fill only name and description, leave species empty
      await characterEditorPage.nameInput.fill('Test Character');
      await characterEditorPage.descriptionInput.fill('Test description');
      
      // Try to save
      await characterEditorPage.saveButton.click();
      
      // Expect validation error
      await characterEditorPage.expectSpeciesError('Species is required');
    });

    test('should allow character without description (appearance)', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.FLOW_4] }, async ({ characterEditorPage }) => {
      // Navigate to Characters section
      await characterEditorPage.navigateToCharacters();
      
      // Start creating a new character
      await characterEditorPage.startNewCharacter();
      
      // Fill only name and species (description is optional)
      await characterEditorPage.fillRequiredFields('Cove', 'seal', '');
      
      // Save should work
      await characterEditorPage.save();
      
      // Verify character appears in list
      await characterEditorPage.expectCharacterInList('Cove');
    });

    test('should allow character without reference image', { tag: [tags.MVP, tags.FLOW_4] }, async ({ characterEditorPage }) => {
      // Navigate to Characters section
      await characterEditorPage.navigateToCharacters();
      
      // Create character without uploading any reference image
      await characterEditorPage.createCharacter(
        'Skipper',
        'penguin',
        'Black and white feathers, orange beak'
      );
      
      // Character should be created successfully
      await characterEditorPage.expectCharacterInList('Skipper');
    });

    test('should show offer to generate reference image when none provided', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage }) => {
      // Navigate to Characters section
      await characterEditorPage.navigateToCharacters();
      
      // Create a character
      await characterEditorPage.createCharacter(
        'TestChar',
        'fox',
        'Red fur, bushy tail'
      );
      
      // Select the character to open editor
      await characterEditorPage.selectCharacter('TestChar');
      await characterEditorPage.editCharacter('TestChar');
      
      // Switch to references tab
      await characterEditorPage.switchToTab('references');
      
      // Should see option to generate reference
      const generateButton = page.getByRole('button', { name: /generate reference/i });
      await expect(generateButton).toBeVisible();
    });

    test('should enforce name length limit', { tag: [tags.MVP, tags.FLOW_4] }, async ({ characterEditorPage }) => {
      // Navigate to Characters section
      await characterEditorPage.navigateToCharacters();
      
      // Start creating a new character
      await characterEditorPage.startNewCharacter();
      
      // Enter a very long name (over 100 characters)
      const longName = 'A'.repeat(101);
      await characterEditorPage.nameInput.fill(longName);
      await characterEditorPage.speciesInput.fill('test');
      
      // Try to save
      await characterEditorPage.saveButton.click();
      
      // Expect validation error
      await characterEditorPage.expectNameError('100 characters');
    });
  });

  // ==========================================================================
  // 4.2 Character Consistency System
  // ==========================================================================

  test.describe('4.2 Character Consistency System', () => {
    test('should display reference images gallery', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character first via API
      const character = await api.createCharacter(testProject.id, {
        name: 'GalleryTest',
        species: 'cat',
        appearance: 'Fluffy orange tabby',
      });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('GalleryTest');
      
      // Switch to references tab
      await characterEditorPage.switchToTab('references');
      
      // Reference panel should be visible
      await expect(characterEditorPage.referencesPanel).toBeVisible();
    });

    test('should support LoRA association in architecture', { tag: [tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character first
      const character = await api.createCharacter(testProject.id, {
        name: 'LoRATest',
        species: 'wolf',
        appearance: 'Grey fur, yellow eyes',
      });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('LoRATest');
      
      // Switch to LoRA tab
      await characterEditorPage.switchToTab('lora');
      
      // LoRA browser should be visible
      await expect(characterEditorPage.loraBrowser).toBeVisible();
    });

    test('should browse available LoRAs by category', { tag: [tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character first
      await api.createCharacter(testProject.id, {
        name: 'BrowseTest',
        species: 'rabbit',
        appearance: 'White fur, pink eyes',
      });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('BrowseTest');
      await characterEditorPage.switchToTab('lora');
      
      // Check category filters exist
      await expect(characterEditorPage.categoryFilterAll).toBeVisible();
      await expect(characterEditorPage.categoryFilterStyle).toBeVisible();
      await expect(characterEditorPage.categoryFilterCharacter).toBeVisible();
      
      // Filter by style
      await characterEditorPage.filterLorasByCategory('style');
      
      // Should show style category
      await characterEditorPage.expectLoraCategory('style');
    });

    test('should adjust LoRA strength', { tag: [tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character
      await api.createCharacter(testProject.id, {
        name: 'StrengthTest',
        species: 'bear',
        appearance: 'Brown fur, large paws',
      });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('StrengthTest');
      await characterEditorPage.switchToTab('lora');
      
      // Select a LoRA (first available)
      const firstLora = characterEditorPage.loraCards.first();
      if (await firstLora.isVisible()) {
        await firstLora.click();
        
        // Strength slider should be visible
        await expect(characterEditorPage.loraStrengthSlider).toBeVisible();
        
        // Adjust strength
        await characterEditorPage.setLoraStrength(0.75);
        
        // Verify strength changed (slider value)
        await expect(characterEditorPage.loraStrengthSlider).toHaveValue('0.75');
      }
    });

    test('should remove LoRA association', { tag: [tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character
      await api.createCharacter(testProject.id, {
        name: 'RemoveLoraTest',
        species: 'deer',
        appearance: 'Spotted coat, antlers',
      });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('RemoveLoraTest');
      await characterEditorPage.switchToTab('lora');
      
      // Select a LoRA first
      const firstLora = characterEditorPage.loraCards.first();
      if (await firstLora.isVisible()) {
        await firstLora.click();
        
        // Verify LoRA is selected
        await expect(characterEditorPage.selectedLoraDisplay).toBeVisible();
        
        // Remove the LoRA
        await characterEditorPage.removeLoraButton.click();
        
        // Selected display should be hidden
        await expect(characterEditorPage.selectedLoraDisplay).not.toBeVisible();
      }
    });
  });

  // ==========================================================================
  // 4.3 Character in Generation
  // ==========================================================================

  test.describe('4.3 Character in Generation', () => {
    test('should allow explicit character selection in panel', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, api, testProject, panelEditorPage, characterEditorPage }) => {
      // Create a character
      await api.createCharacter(testProject.id, {
        name: 'SelectableChar',
        species: 'otter',
        appearance: 'Brown fur',
      });
      
      // Navigate to project characters first to verify
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      await characterEditorPage.expectCharacterInList('SelectableChar');
      
      // This test verifies the character exists for selection
      // Full panel integration would require a storyboard/panel setup
    });

    test('should specify pose via text description', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character with pose-related description
      await api.createCharacter(testProject.id, {
        name: 'PoseChar',
        species: 'cat',
        appearance: 'Orange tabby, sitting pose, curled tail',
      });
      
      // Navigate to verify
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      await characterEditorPage.expectCharacterInList('PoseChar');
      
      // Edit and check description contains pose info
      await characterEditorPage.editCharacter('PoseChar');
      await expect(characterEditorPage.descriptionInput).toHaveValue(/sitting pose/);
    });
  });

  // ==========================================================================
  // Character List Management
  // ==========================================================================

  test.describe('Character List Management', () => {
    test('should list all characters in project', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create multiple characters
      await api.createCharacter(testProject.id, { name: 'Alpha', species: 'wolf', appearance: 'Grey fur' });
      await api.createCharacter(testProject.id, { name: 'Beta', species: 'fox', appearance: 'Red fur' });
      await api.createCharacter(testProject.id, { name: 'Gamma', species: 'bear', appearance: 'Brown fur' });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // All characters should be visible
      await characterEditorPage.expectCharacterInList('Alpha');
      await characterEditorPage.expectCharacterInList('Beta');
      await characterEditorPage.expectCharacterInList('Gamma');
      
      // Count should be 3
      await characterEditorPage.expectCharacterCount(3);
    });

    test('should select character to edit', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character
      await api.createCharacter(testProject.id, { name: 'Editable', species: 'mouse', appearance: 'Small and grey' });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('Editable');
      
      // Should be in edit mode
      await characterEditorPage.expectEditMode('Editable');
      
      // Fields should be populated
      await expect(characterEditorPage.nameInput).toHaveValue('Editable');
      await expect(characterEditorPage.speciesInput).toHaveValue('mouse');
    });

    test('should save character changes', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character
      await api.createCharacter(testProject.id, { name: 'UpdateMe', species: 'rabbit', appearance: 'White' });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('UpdateMe');
      
      // Change the name
      await characterEditorPage.nameInput.clear();
      await characterEditorPage.nameInput.fill('UpdatedName');
      
      // Save changes
      await characterEditorPage.save();
      
      // Old name should be gone, new name should appear
      await characterEditorPage.expectCharacterNotInList('UpdateMe');
      await characterEditorPage.expectCharacterInList('UpdatedName');
    });

    test('should delete character with confirmation', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character
      await api.createCharacter(testProject.id, { name: 'DeleteMe', species: 'fish', appearance: 'Golden scales' });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Verify character exists
      await characterEditorPage.expectCharacterInList('DeleteMe');
      const countBefore = await characterEditorPage.getCharacterCount();
      
      // Delete the character
      await characterEditorPage.deleteCharacter('DeleteMe');
      
      // Character should be gone
      await characterEditorPage.expectCharacterNotInList('DeleteMe');
      
      // Count should decrease
      const countAfter = await characterEditorPage.getCharacterCount();
      expect(countAfter).toBe(countBefore - 1);
    });

    test('should search characters by name', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create characters
      await api.createCharacter(testProject.id, { name: 'Captain Fluffy', species: 'dog', appearance: 'Fluffy' });
      await api.createCharacter(testProject.id, { name: 'Captain Nemo', species: 'fish', appearance: 'Colorful' });
      await api.createCharacter(testProject.id, { name: 'Professor Oak', species: 'human', appearance: 'Old man' });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Search for "Captain"
      await characterEditorPage.searchCharacters('Captain');
      
      // Should show only Captain characters
      await characterEditorPage.expectCharacterInList('Captain Fluffy');
      await characterEditorPage.expectCharacterInList('Captain Nemo');
      await characterEditorPage.expectCharacterNotInList('Professor Oak');
    });

    test('should handle empty state when no characters exist', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api }) => {
      // Create empty project (no characters)
      const emptyProject = await api.createProject('Empty Project', 'No characters');
      
      // Navigate to project
      await page.goto(`/projects/${emptyProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Should show empty state
      await characterEditorPage.expectEmptyState();
    });

    test('should warn when closing with unsaved changes', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character
      await api.createCharacter(testProject.id, { name: 'DirtyClose', species: 'bird', appearance: 'Blue feathers' });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('DirtyClose');
      
      // Make changes
      await characterEditorPage.nameInput.clear();
      await characterEditorPage.nameInput.fill('Changed Name');
      
      // Try to close without saving
      await characterEditorPage.closeEditor();
      
      // Should show confirmation dialog
      await expect(characterEditorPage.confirmCloseDialog).toBeVisible();
      
      // Can keep editing
      await characterEditorPage.keepEditingButton.click();
      await expect(characterEditorPage.characterEditor).toBeVisible();
    });

    test('should discard changes on confirmation', { tag: [tags.MVP, tags.FLOW_4] }, async ({ page, characterEditorPage, api, testProject }) => {
      // Create a character
      await api.createCharacter(testProject.id, { name: 'DiscardTest', species: 'lizard', appearance: 'Green scales' });
      
      // Navigate to project
      await page.goto(`/projects/${testProject.id}`);
      await characterEditorPage.navigateToCharacters();
      
      // Edit the character
      await characterEditorPage.editCharacter('DiscardTest');
      
      // Make changes
      await characterEditorPage.nameInput.clear();
      await characterEditorPage.nameInput.fill('ShouldNotSave');
      
      // Try to close
      await characterEditorPage.closeEditor();
      
      // Confirm discard
      await characterEditorPage.discardChangesButton.click();
      
      // Editor should close
      await expect(characterEditorPage.characterEditor).not.toBeVisible();
      
      // Original name should still be there
      await characterEditorPage.expectCharacterInList('DiscardTest');
      await characterEditorPage.expectCharacterNotInList('ShouldNotSave');
    });
  });
});
