@flow-7 @mvp
Feature: ControlNet Configuration
  As an artist
  I want to control image generation with references
  So that I can achieve specific poses, compositions, and styles

  Background:
    Given I am configuring a panel for generation

  # ============================================================================
  # 7.1 Exposure Levels
  # ============================================================================

  @priority-high
  Scenario: Level 3 - Visual Cards (Target)
    Given I am in visual cards mode
    Then I should see toggleable cards for:
      | Control   | Icon |
      | OpenPose  | 👤   |
      | Depth     | 🏔️   |
      | Lineart   | ✏️   |
    And I should be able to toggle each on/off
    And I should see the strength value
    And I should be able to drop a reference image

  @priority-high
  Scenario: Level 4 - Full Control (Required)
    Given I switch to full control mode
    Then I should see:
      | Control          | Type     |
      | Strength slider  | range    |
      | Start %          | range    |
      | End %            | range    |
      | Model selector   | dropdown |
      | Preprocessor     | dropdown |

  Scenario: Toggle control card
    Given I see the OpenPose card as OFF
    When I click the toggle
    Then OpenPose should be ON
    And it should be included in generation

  Scenario: Adjust control strength
    Given I have OpenPose enabled
    When I adjust the strength to 0.85
    Then the strength should be set to 0.85
    And generation should use that strength

  @do-not-block
  Scenario: Level 0 - Hidden (Future architecture)
    Then the system should be designed to support:
      | Level | Name      | Description                    |
      | 0     | Hidden    | System auto-selects everything |
      | 1     | Suggested | System suggests, user confirms |
      | 2     | Preset    | User picks preset              |

  # ============================================================================
  # 7.2 Reference Image Flow
  # ============================================================================

  @priority-high
  Scenario: Process reference image
    Given I drop a reference image
    When the system processes it
    Then I should see available control types
    And I should select which aspects to extract
    And I should see preprocessed previews (skeleton, depth map)
    And I should choose which to apply to generation

  Scenario: See OpenPose skeleton preview
    Given I drop a photo of a person
    When the system extracts the pose
    Then I should see a skeleton overlay preview
    And I can decide to use it or not

  Scenario: See depth map preview
    Given I drop a reference image
    When the system extracts depth
    Then I should see a depth map preview
    And I can decide to use it or not

  # ============================================================================
  # 7.3 MVP ControlNet Flow
  # ============================================================================

  @priority-high
  Scenario: Ergonomic ControlNet setup
    Given I am setting up a panel generation
    When I select an interaction pose preset
    And I assign characters to positions
    Then the system should show "This will use: OpenPose + Depth"
    And I can override/adjust if needed
    And I add natural language details
    And I click Generate

  Scenario: Override auto-selected controls
    Given the system suggests "OpenPose + Depth"
    When I toggle Depth off
    Then only OpenPose should be used
    And a note should indicate I've customized

  Scenario: Add natural language to ControlNet setup
    Given I have controls configured
    When I type "golden hour lighting, romantic atmosphere"
    Then these details should be added to the prompt
    And combined with the control inputs
