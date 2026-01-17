@flow-4 @mvp
Feature: Character Management
  As an artist
  I want to create and manage characters
  So that I can maintain consistency across my project

  Background:
    Given I have a project

  # ============================================================================
  # 4.1 Character Creation
  # ============================================================================

  @priority-high
  Scenario: Create MVP character
    Given I am on the character editor
    When I fill in the required fields:
      | Field       | Value                          |
      | name        | Marina                         |
      | species     | otter                          |
      | appearance  | sleek brown fur, bright eyes   |
    And I set the color palette
    Then the system should derive prompt fragments
    And I should be able to save the character

  @priority-high
  Scenario: Character without reference image is valid
    Given I am creating a new character
    When I do not provide a reference image
    Then the character should still be valid
    And the system should offer to generate one
    And I can trigger generation or skip

  Scenario: Full character profile (progressive)
    Given I have an MVP character
    When I want to enhance the profile
    Then I can optionally add:
      | Field              | Description                |
      | age                | Character's age            |
      | personalityTraits  | Array of traits            |
      | referenceImages    | Uploaded or generated      |
      | expressionLibrary  | Various expressions        |
      | associatedLoraId   | For LoRA consistency       |
      | turnaroundViews    | Multiple angles            |

  # ============================================================================
  # 4.2 Character Consistency System
  # ============================================================================

  @priority-high
  Scenario: Use IP-Adapter for consistency (MVP)
    Given I have a character with reference images
    When I generate a panel with that character
    Then the system should use IP-Adapter
    And the character should look similar to references

  Scenario: Upload reference images
    Given I am editing a character
    When I upload reference images
    Then they should appear in the reference gallery
    And be used for consistency

  @do-not-block
  Scenario: LoRA training path ready (architecture)
    Given I have accumulated quality generations
    When the system detects sufficient data
    Then it should offer "Train LoRA from generations"
    And the character system should accommodate LoRA association

  # ============================================================================
  # 4.3 Character in Generation
  # ============================================================================

  @priority-high
  Scenario: Extract characters from narrative
    Given I have characters "Marina" and "Cove" in my project
    When I write narrative "Marina looks at Cove lovingly"
    Then the system should auto-extract [Marina, Cove]
    And link them to the panel

  Scenario: Explicit character selection
    Given I am editing a panel
    When I use the character dropdown
    And select "Marina"
    Then Marina should be added to the panel

  Scenario: Drag character to panel
    Given I see the character list sidebar
    When I drag "Marina" onto a panel
    Then Marina should be added to that panel

  @priority-high
  Scenario: Specify pose via text
    Given I have characters in a panel
    When I write "Marina standing, Cove sitting"
    Then the system should understand the pose instructions
    And generate accordingly

  Scenario: Specify pose via reference image
    Given I have a pose reference image
    When I upload it for the panel
    Then the system should extract the pose
    And apply it to generation
