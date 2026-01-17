@characters @bdd
Feature: Character Management
  As a content creator using Graphix
  I want to manage my characters
  So that I can maintain consistent character appearances across my projects

  Background:
    Given I have a project called "My Comic"
    And I am viewing the character panel

  # ============================================================================
  # Character CRUD Operations
  # ============================================================================

  @crud @create
  Scenario: Create a new character
    When I click the "Add Character" button
    And I fill in the character name as "Captain Whiskers"
    And I select the species as "cat"
    And I add a description "A brave seafaring feline"
    And I save the character
    Then I should see "Captain Whiskers" in the character list
    And the character should have the species "cat"

  @crud @create @validation
  Scenario: Cannot create character without a name
    When I click the "Add Character" button
    And I leave the character name empty
    And I try to save the character
    Then I should see a validation error for "name"
    And the character should not be created

  @crud @create @validation
  Scenario: Cannot create character without a species
    When I click the "Add Character" button
    And I fill in the character name as "Nameless One"
    And I leave the species empty
    And I try to save the character
    Then I should see a validation error for "species"

  @crud @read
  Scenario: View character details
    Given a character "Luna the Otter" exists
    When I click on "Luna the Otter" in the character list
    Then I should see the character editor
    And I should see the name "Luna the Otter"
    And I should see all character fields populated

  @crud @update
  Scenario: Edit an existing character
    Given a character "Bob the Bear" exists
    When I click on "Bob the Bear" in the character list
    And I change the name to "Robert the Bear"
    And I save the character
    Then I should see "Robert the Bear" in the character list
    And "Bob the Bear" should no longer appear

  @crud @delete
  Scenario: Delete a character
    Given a character "Temp Character" exists
    When I click the delete button for "Temp Character"
    And I confirm the deletion
    Then "Temp Character" should be removed from the list
    And the character count should decrease by 1

  @crud @delete @cancel
  Scenario: Cancel character deletion
    Given a character "Keep Me" exists
    When I click the delete button for "Keep Me"
    And I cancel the deletion
    Then "Keep Me" should still be in the list

  @crud @duplicate
  Scenario: Duplicate a character
    Given a character "Original" exists with color palette "#FF0000, #00FF00"
    When I click the duplicate button for "Original"
    Then I should see "Original (Copy)" in the character list
    And "Original (Copy)" should have the same color palette as "Original"
    And "Original (Copy)" should have a different ID than "Original"

  # ============================================================================
  # Character Panel UI
  # ============================================================================

  @ui @panel
  Scenario: Collapse and expand character panel
    When I click the collapse button on the character panel
    Then the character panel should be collapsed
    And I should see only character thumbnails
    When I click the expand button
    Then the character panel should be expanded
    And I should see full character cards

  @ui @search
  Scenario: Search for characters by name
    Given the following characters exist:
      | name           | species |
      | Captain Fluffy | dog     |
      | Captain Nemo   | fish    |
      | Professor Oak  | human   |
    When I type "Captain" in the search box
    Then I should see 2 characters in the list
    And I should see "Captain Fluffy"
    And I should see "Captain Nemo"
    And I should not see "Professor Oak"

  @ui @search
  Scenario: Search for characters by species
    Given the following characters exist:
      | name      | species |
      | Fido      | dog     |
      | Spot      | dog     |
      | Whiskers  | cat     |
    When I filter by species "dog"
    Then I should see 2 characters in the list
    And I should see "Fido"
    And I should see "Spot"
    And I should not see "Whiskers"

  @ui @stats
  Scenario: View character statistics
    Given 5 characters exist with a total of 12 reference images
    When I view the character stats
    Then I should see "5 characters"
    And I should see "12 references"

  @ui @keyboard
  Scenario: Navigate characters with keyboard
    Given the following characters exist:
      | name    |
      | Alpha   |
      | Beta    |
      | Gamma   |
    When I focus the character list
    And I press the down arrow key
    Then "Alpha" should be highlighted
    When I press the down arrow key again
    Then "Beta" should be highlighted
    When I press Enter
    Then the character editor should open for "Beta"

  # ============================================================================
  # Reference Image Management
  # ============================================================================

  @references @upload
  Scenario: Upload a reference image
    Given a character "Art Subject" exists
    When I open the character editor for "Art Subject"
    And I upload a reference image "portrait.png"
    And I mark it as "face" type
    Then the character should have 1 reference image
    And the reference should be marked as "face"

  @references @upload @validation
  Scenario: Reject oversized reference image
    Given a character "Art Subject" exists
    When I open the character editor for "Art Subject"
    And I try to upload an image larger than 10MB
    Then I should see an error "File size exceeds 10MB limit"
    And no reference should be added

  @references @upload @validation
  Scenario: Reject invalid image format
    Given a character "Art Subject" exists
    When I open the character editor for "Art Subject"
    And I try to upload a file "document.pdf"
    Then I should see an error "Invalid file type"
    And no reference should be added

  @references @delete
  Scenario: Remove a reference image
    Given a character "Photo Model" exists with 3 reference images
    When I open the character editor for "Photo Model"
    And I delete the first reference image
    Then the character should have 2 reference images

  @references @types
  Scenario: Mark reference image types
    Given a character "Posable Pete" exists with a reference image
    When I open the character editor for "Posable Pete"
    And I mark the reference as "full_body"
    Then the reference should be marked as "full_body"
    When I mark the same reference as "expression"
    Then the reference should be marked as "expression"
    And it should no longer be marked as "full_body"

  @references @limit
  Scenario: Enforce maximum reference images
    Given a character "Many Refs" exists with 9 reference images
    When I try to add another reference image
    Then I should see a warning about the reference limit
    And the character should still have 10 reference images max

  # ============================================================================
  # LoRA Association
  # ============================================================================

  @lora @browse
  Scenario: Browse available LoRAs
    When I open the LoRA browser
    Then I should see LoRAs grouped by category
    And I should see "Style" category
    And I should see "Character" category

  @lora @filter
  Scenario: Filter LoRAs by category
    When I open the LoRA browser
    And I filter by category "Style"
    Then I should only see style LoRAs
    And I should not see character LoRAs

  @lora @associate
  Scenario: Associate a LoRA with a character
    Given a character "Stylized Sam" exists without a LoRA
    When I open the character editor for "Stylized Sam"
    And I open the LoRA browser
    And I select the "anime_v3" LoRA
    And I set the strength to 0.75
    Then "Stylized Sam" should have the "anime_v3" LoRA associated
    And the LoRA strength should be 0.75

  @lora @update
  Scenario: Adjust LoRA strength
    Given a character "Tuned Tony" exists with LoRA "sketch_style" at strength 0.5
    When I open the character editor for "Tuned Tony"
    And I adjust the LoRA strength to 0.9
    Then the LoRA strength should be 0.9

  @lora @remove
  Scenario: Remove LoRA association
    Given a character "Plain Jane" exists with LoRA "watercolor"
    When I open the character editor for "Plain Jane"
    And I remove the LoRA association
    Then "Plain Jane" should have no LoRA associated

  @lora @strength @validation
  Scenario Outline: Validate LoRA strength bounds
    Given a character "Bound Barry" exists with a LoRA
    When I try to set the LoRA strength to <strength>
    Then the strength should be clamped to <expected>

    Examples:
      | strength | expected |
      | -0.5     | 0.0      |
      | 0.0      | 0.0      |
      | 0.5      | 0.5      |
      | 1.0      | 1.0      |
      | 1.5      | 1.0      |

  # ============================================================================
  # Color Palette Management
  # ============================================================================

  @palette @extract
  Scenario: Extract color palette from reference
    Given a character "Colorful Cal" exists with a reference image
    When I click "Extract Colors" on the reference
    Then the character should have a color palette
    And the palette should have at most 5 colors

  @palette @manual
  Scenario: Manually add color to palette
    Given a character "Custom Colors" exists
    When I open the character editor for "Custom Colors"
    And I add color "#FF5733" to the palette
    Then the palette should contain "#FF5733"

  @palette @remove
  Scenario: Remove color from palette
    Given a character "Less Colors" exists with palette "#FF0000, #00FF00, #0000FF"
    When I open the character editor for "Less Colors"
    And I remove color "#00FF00" from the palette
    Then the palette should not contain "#00FF00"
    And the palette should have 2 colors

  @palette @limit
  Scenario: Enforce maximum palette size
    Given a character "Full Palette" exists with 5 colors
    When I try to add another color
    Then I should see a warning about palette limit
    And the palette should still have 5 colors

  # ============================================================================
  # Prompt Fragments
  # ============================================================================

  @prompts @add
  Scenario: Add prompt fragment
    Given a character "Described Dave" exists
    When I open the character editor for "Described Dave"
    And I add prompt fragment "wearing a red cape"
    Then the character should have the prompt fragment "wearing a red cape"

  @prompts @remove
  Scenario: Remove prompt fragment
    Given a character "Over-Described" exists with prompt "tall, dark, handsome"
    When I open the character editor for "Over-Described"
    And I remove prompt fragment "dark"
    Then the character should not have the prompt fragment "dark"
    And the character should still have "tall" and "handsome"

  @prompts @auto
  Scenario: Auto-generate prompt fragments
    Given a character "Auto Andy" exists with:
      | name    | Auto Andy     |
      | species | robot         |
      | lora    | cyberpunk_v2  |
    When I click "Generate Prompts"
    Then prompt fragments should be auto-generated
    And fragments should include species "robot"
    And fragments should reference the LoRA style

  # ============================================================================
  # Multi-Project Isolation
  # ============================================================================

  @projects @isolation
  Scenario: Characters are isolated by project
    Given I have a project "Comic A" with character "Hero A"
    And I have a project "Comic B" with character "Hero B"
    When I switch to project "Comic A"
    Then I should see "Hero A" in the character list
    And I should not see "Hero B"
    When I switch to project "Comic B"
    Then I should see "Hero B" in the character list
    And I should not see "Hero A"

  @projects @switch
  Scenario: Preserve selection when switching projects
    Given I have selected character "Current Focus" in project "Active"
    When I switch to project "Other"
    And I switch back to project "Active"
    Then "Current Focus" should still be selected

  # ============================================================================
  # Drag and Drop (Future)
  # ============================================================================

  @drag @wip
  Scenario: Drag character to canvas
    Given a character "Draggable Dan" exists
    When I drag "Draggable Dan" from the character panel
    And I drop it onto the canvas
    Then a character instance should be created on the canvas
    And the instance should reference "Draggable Dan"

  @drag @reorder @wip
  Scenario: Reorder characters via drag
    Given the following characters exist in order:
      | name    |
      | First   |
      | Second  |
      | Third   |
    When I drag "Third" above "First"
    Then the character order should be "Third, First, Second"
