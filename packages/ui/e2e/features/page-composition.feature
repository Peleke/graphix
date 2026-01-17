@flow-6 @mvp
Feature: Page Composition
  As an artist
  I want to arrange panels on a page
  So that I can create professional comic layouts

  Background:
    Given I have a project with generated panels

  # ============================================================================
  # 6.1 Layout Selection
  # ============================================================================

  @priority-high
  Scenario: Select from layout templates
    Given I am in the Page Composer
    When I click "Select Layout"
    Then I should see template options:
      | Template    | Panels |
      | 1-panel     | 1      |
      | 2-panel     | 2      |
      | 2-row       | 2      |
      | 3-panel     | 3      |
      | 4-panel     | 4      |

  Scenario: Apply layout template
    Given I see the layout picker
    When I click on the 4-panel template
    Then the page should use that layout
    And I should see 4 panel slots

  @do-not-block
  Scenario: Custom layouts (architecture ready)
    Given I want a unique layout
    Then the architecture should support:
      | Feature           | Status   |
      | Draw custom       | post-MVP |
      | AI suggests       | post-MVP |
      | Customize template| post-MVP |

  # ============================================================================
  # 6.2 Panel Placement
  # ============================================================================

  @priority-high
  Scenario: Auto-fill panels in reading order
    Given I have a 4-panel layout
    And I have 4 generated panels
    When I apply the layout
    Then panels should fill slots in reading order
    And panel 1 should be top-left
    And panel 4 should be bottom-right

  Scenario: Click to edit slot assignment
    Given I have panels in slots
    When I click on a slot
    Then I should see options to change the assigned panel

  Scenario: Swap panels between slots
    Given panel A is in slot 1 and panel B is in slot 2
    When I select both slots and click "Swap"
    Then panel B should be in slot 1
    And panel A should be in slot 2

  # ============================================================================
  # 6.3 Page-Level Adjustments
  # ============================================================================

  Scenario: Adjust gutter spacing
    Given I am in the Page Composer
    When I adjust the gutter width slider
    Then the spacing between panels should change
    And preview should update in real-time

  Scenario: Set page border
    Given I am in the Page Composer
    When I set page border to 20px
    Then the page should have a 20px border

  Scenario: Set page background
    Given I am in the Page Composer
    When I set background color to black
    Then the page background should be black

  # ============================================================================
  # 6.4 Recursive Editing (Drill-Down)
  # ============================================================================

  @priority-high
  Scenario: Edit panel from page composer
    Given I am in the Page Composer
    When I click on a panel
    Then a side panel should slide out
    And I should see the Panel Editor
    And the Page Composer should remain visible (dimmed)

  @priority-high
  Scenario: Return with unsaved changes
    Given I have made changes in the Panel Editor
    And I have not saved
    When I click "Back"
    Then I should see a warning
    And I can choose to save, discard, or cancel

  Scenario: Auto-return after save
    Given I have made changes in the Panel Editor
    When I click "Save"
    Then changes should be saved
    And I should return to the Page Composer

  Scenario: Breadcrumb navigation
    Given I am editing a panel from the composer
    When I click on "Page 1" in breadcrumbs
    Then I should return to the Page Composer
    With a warning if I have unsaved changes
