@flow-5 @mvp
Feature: Panel Generation and Iteration
  As an artist
  I want to generate and iterate on panel images
  So that I can create the perfect visual for my story

  Background:
    Given I have a panel with a valid prompt

  # ============================================================================
  # 5.1 Generation Trigger
  # ============================================================================

  @priority-high
  Scenario: Generate panel with single click
    When I click the "Generate" button
    Then generation should begin
    And I should see a progress indicator
    And I should see results when complete

  @priority-high
  Scenario: Batch generate all panels
    Given I have a page with 4 panels
    When I click "Generate All"
    Then all panels should be queued for generation
    And I should see progress for each

  @priority-high
  Scenario: No auto-generation on prompt change
    Given I have a panel with a prompt
    When I edit the prompt
    Then generation should NOT start automatically
    And I should NOT be charged until I click Generate

  Scenario: Keyboard shortcut for generation
    Given I have a panel selected
    When I press the generation keyboard shortcut
    Then generation should begin

  # ============================================================================
  # 5.2 Generation Progress
  # ============================================================================

  @priority-high
  Scenario: Progress feedback during generation
    When generation is in progress
    Then I should see:
      | Feedback Element   | Description            |
      | Progress bar       | Step X of Y            |
      | Low-res preview    | Image as it generates  |
      | Queue position     | If multiple pending    |

  # ============================================================================
  # 5.3 Result Presentation (N-Up)
  # ============================================================================

  @priority-high
  Scenario: Display 4 results by default
    When generation completes
    Then I should see 4 images in a grid
    And I can click any to select it

  Scenario: Configure N-up count
    Given I want to see more options
    When I set N-up to 8
    Then I should see 8 results after generation

  @priority-high
  Scenario: Select winner from N-up grid
    Given I have 4 generation results displayed
    When I click on the second image
    Then it should be marked as selected
    And I should see approve/reject options

  Scenario: Approve selected image
    Given I have an image selected
    When I click it again or click "Approve"
    Then the image should be approved as the panel result

  Scenario: Dismiss image with right-click
    Given I see generation results
    When I right-click an image
    Then it should be dismissed
    And removed from consideration

  # ============================================================================
  # 5.4 Iteration Actions
  # ============================================================================

  @priority-high
  Scenario: Regenerate with same settings
    Given I have a generated panel
    When I click the "Regenerate" button
    Then a new generation should start
    And it should use the same prompt
    And it should use a different seed
    And I should see the new result in the N-up grid

  @priority-high
  Scenario: Create variations
    Given I have selected an image
    When I click "Vary"
    Then variations should be generated
    Using the selected image as the base

  @priority-high
  Scenario: Edit and regenerate
    Given I have a prompt
    When I click "Edit + Regen"
    And modify the prompt
    And click Generate
    Then a new generation should use the modified prompt

  @priority-high
  Scenario: Add generation to character references
    Given I see a generation I love
    When I click the "Add to Refs" star icon
    Then the image should be saved to the character's references
    And I should see a confirmation toast
    And the icon should show "saved" state

  Scenario: Inpaint specific region
    Given I have a mostly-good generation
    When I select a region and click "Inpaint"
    Then I should be able to fix just that region

  # ============================================================================
  # 5.5 Feedback Loop
  # ============================================================================

  @priority-high
  Scenario: Quick feedback
    Given I see a generation result
    When I click the thumbs down
    Then a feedback entry should be created
    And the generation settings should be captured

  Scenario: Detailed feedback
    Given I click "Feedback" on a generation
    When I fill out the feedback form
    Then I can describe what I expected vs got
    And select a gap type (character, pose, composition, style, content)
    And the system captures all settings for archaeology

  Scenario: Auto-analyze feedback
    Given I have "auto-AI" configured
    When I submit empty feedback
    Then the AI should analyze the image vs prompt
    And determine the likely gap automatically
