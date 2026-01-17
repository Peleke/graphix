@flow-3 @mvp
Feature: Story/Narrative Management
  As an artist
  I want to manage my story structure and narratives
  So that I can organize my creative work effectively

  Background:
    Given I have a project with pages and panels

  # ============================================================================
  # 3.1 Story Hierarchy Visualization
  # ============================================================================

  Scenario: View story in tree view
    Given I am in the storyboard view
    When I select "Tree View"
    Then I should see a hierarchical structure:
      | Level   | Items                        |
      | Project | Story                        |
      | Story   | Global Narrative, Pages      |
      | Page    | Page Narrative, Panels       |
      | Panel   | Narrative, Image Intent, Prompt |

  Scenario: View story in outline editor
    Given I am in the storyboard view
    When I select "Outline View"
    Then I should see a Scrivener-style editor
    And I should be able to edit narratives inline

  Scenario: Switch between views
    Given I am in tree view
    When I click on the "Outline" tab
    Then I should switch to outline view
    And my selection should be preserved

  # ============================================================================
  # 3.2 Narrative ↔ Prompt Relationship
  # ============================================================================

  @priority-high
  Scenario: View narrative layers
    Given I select a panel
    Then I should see clearly separated sections for:
      | Layer         | Description                    |
      | Narrative     | Human-readable story text      |
      | Image Intent  | Descriptive prompt seed        |
      | Final Prompt  | Machine-optimized prompt       |

  @priority-high
  Scenario: Edit narrative regenerates image intent
    Given I have a panel with narrative "Marina gazes at the sunset"
    When I edit the narrative to "Marina gazes at Cove lovingly"
    Then the image intent should be regenerated
    And it should reflect the romantic mood

  Scenario: Direct edit of image intent
    Given I have a panel with image intent
    When I edit the image intent directly
    Then my changes should be preserved
    And the final prompt should update

  Scenario: Power user edits final prompt
    Given I am a power user
    When I edit the final prompt directly
    Then my exact prompt should be used for generation
    And a warning should indicate I've overridden auto-generation

  @priority-high
  Scenario: Convert narrative to prompt (toPrompt)
    Given I have a narrative "Marina realizes she's in love"
    When I click "Convert to Prompt"
    Then the system should call toPrompt()
    And generate an image intent like "otter, female, emotional expression, romantic"

  Scenario: Tune prompt with narrative mood (tunePrompt)
    Given I have an existing prompt "blowjob, oral sex, explicit"
    And a narrative "A tender, loving moment between partners"
    When I click "Tune Prompt"
    Then the system should call tunePrompt()
    And add mood tokens like "loving expression, gentle, intimate mood"

  # ============================================================================
  # 3.3 Text Generation (Ollama)
  # ============================================================================

  @priority-high
  Scenario: Generate narrative on demand
    Given I have an empty panel
    When I click "Generate Narrative"
    Then the system should generate narrative text
    And I should see it in the narrative field

  Scenario: Auto-suggest narrative on panel creation
    Given I create a new panel
    Then the system should offer to generate a narrative
    And I can accept or skip

  Scenario: Batch generate narratives
    Given I have a page with 4 panels without narratives
    When I click "Generate All Narratives"
    Then narratives should be generated for all panels
    And they should be contextually coherent

  Scenario: Read text separately from images (accessibility)
    Given I want to read the story text only
    When I enable "Story Text Mode"
    Then I should see all narratives as standalone text
    And images should be hidden or secondary
