@flow-9 @mvp
Feature: YOLO Mode
  As an artist
  I want autonomous AI generation
  So that I can step away while the AI completes my project

  Background:
    Given I have a project with story outline and prompts

  # ============================================================================
  # 9.1 Scope
  # ============================================================================

  Scenario: YOLO single panel
    Given I select a single panel
    When I enable YOLO mode
    Then the system should iterate on that panel
    Until the quality threshold is met
    Or max iterations reached

  Scenario: YOLO single page
    Given I select a page
    When I enable YOLO mode
    Then the system should generate all panels on that page
    And iterate on each until quality threshold

  @priority-high
  Scenario: YOLO full story
    Given I have a complete story outline
    When I say "Generate everything, I'm going grocery shopping"
    Then the system should generate all pages
    And all panels within each page
    And iterate on low-quality results
    And I should return to completed work

  # ============================================================================
  # 9.2 Controls
  # ============================================================================

  Scenario: Configure YOLO settings
    Given I am setting up YOLO mode
    Then I should be able to configure:
      | Setting             | Default | Description                    |
      | qualityThreshold    | 3       | Stop when rating > X           |
      | maxIterations       | 5       | Per panel max attempts         |
      | timeLimit           | null    | Optional minutes limit         |
      | checkpointInterval  | null    | Pause every N for review       |

  Scenario: Default quality threshold
    Given I don't change settings
    When YOLO runs
    Then it should use quality threshold of 3

  Scenario: Default max iterations
    Given I don't change settings
    When YOLO runs
    Then it should try up to 5 iterations per panel

  @priority-high
  Scenario: Start and stop YOLO
    Given I have configured YOLO
    When I click "Start YOLO"
    Then generation should begin
    And I should see a "Stop" button
    And clicking "Stop" should pause YOLO

  Scenario: Time limit
    Given I set a time limit of 30 minutes
    When YOLO has been running for 30 minutes
    Then it should pause
    And notify me

  Scenario: Checkpoint interval
    Given I set checkpoint interval to 10
    When YOLO completes 10 generations
    Then it should pause for review
    And I can continue or stop

  # ============================================================================
  # 9.3 Review
  # ============================================================================

  @priority-high
  Scenario: YOLO review interface (Cursor-style)
    Given YOLO has completed some work
    Then I should see a review interface like:
      | Page    | Panel | Status         | Iterations |
      | Page 1  | 1     | ✅ Approved    | 2          |
      | Page 1  | 2     | ⚠️ Needs Review | 5          |
      | Page 1  | 3     | ✅ Approved    | 1          |
      | Page 2  | 1     | 🔄 In Progress | -          |

  Scenario: View panel in review
    Given I see a panel needs review
    When I click "[View]"
    Then I should see the panel details
    And all generation attempts
    And I can approve or regenerate

  Scenario: Approve all for page
    Given Page 1 has all panels generated
    When I click "[Approve All]" for Page 1
    Then all panels on Page 1 should be approved

  Scenario: Reject and re-run
    Given I see a panel I don't like
    When I reject it
    Then YOLO should re-run that panel
    With the same or modified settings

  Scenario: Return to completed work
    Given YOLO has finished
    And all panels are approved or reviewed
    Then I should be able to continue editing
    Or proceed to export
