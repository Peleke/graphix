@flow-1 @mvp
Feature: Application Entry
  As a Graphix user
  I want a smooth entry experience
  So that I can quickly start creating or resume my work

  Background:
    Given the Graphix application is available

  # ============================================================================
  # 1.1 First-Time User Experience
  # ============================================================================

  @priority-high @onboarding
  Scenario: New user sees onboarding wizard
    Given I have never opened Graphix before
    When I launch the application
    Then I should see an onboarding wizard
    And the wizard should offer a sample project tutorial
    And I should be able to skip onboarding if desired

  @onboarding
  Scenario: User explores sample project
    Given I am in the onboarding wizard
    When I choose "Explore Sample Project"
    Then I should be guided through key features
    And I should see tooltips explaining each UI element
    And I should be able to make small edits to learn

  @priority-high @onboarding
  Scenario: User skips onboarding
    Given I am in the onboarding wizard
    When I click "Skip"
    Then I should be taken to the main dashboard
    And I should not see the onboarding wizard again

  # ============================================================================
  # 1.2 Returning User Experience
  # ============================================================================

  @priority-high
  Scenario: Returning user sees dashboard
    Given I have existing projects
    When I open Graphix
    Then I should see a "What do you want to do?" modal
    And I should see my recent projects on the left sidebar
    And the last opened project should be highlighted

  @priority-high
  Scenario: Resume interrupted work
    Given I was working on a panel when I closed the app
    And I did not save my changes
    When I open Graphix
    Then I should see a recovery notification
    And I should be able to restore my unsaved work
    And the app should resume exactly where I left off

  @priority-high
  Scenario: Dirty shutdown recovery (Krita-style)
    Given the application crashed during generation
    When I reopen Graphix
    Then the app should detect the dirty shutdown
    And offer to restore the last known state
    And pessimistically cached data should be available

  Scenario: User dismisses recovery
    Given I see a recovery notification
    When I click "Dismiss"
    Then the recovery notification should close
    And I should be on the main dashboard

  # ============================================================================
  # 1.3 Getting Started Modal
  # ============================================================================

  Scenario: Getting started modal layout
    Given I open Graphix with existing projects
    Then I should see the getting started modal with:
      | Element                | Position     |
      | New Comic Project      | prominent    |
      | New Illustration       | prominent    |
      | Continue Recent        | most prominent |
      | Import button          | secondary    |
      | From Template button   | secondary    |
      | Chat to Start input    | bottom       |

  @priority-high
  Scenario: Start new comic project
    Given I see the getting started modal
    When I click "New Comic Project"
    Then I should be taken to the project creation flow

  Scenario: Continue recent project
    Given I have a recent project "Otters Yacht"
    And I see the getting started modal
    When I click on "Otters Yacht" in Continue Recent
    Then I should be taken to that project's workspace

  @priority-high
  Scenario: Start chat-to-create
    Given I see the getting started modal
    When I type in the chat input "I want to make a romantic story"
    And I press Enter
    Then I should be taken to the chat-to-start flow
    And my message should be sent to the AI
