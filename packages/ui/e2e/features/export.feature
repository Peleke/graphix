@flow-8 @mvp
Feature: Export
  As an artist
  I want to export my work in various formats
  So that I can share, print, or archive my creations

  Background:
    Given I have a completed project with pages

  # ============================================================================
  # 8.1 Export Formats
  # ============================================================================

  @priority-high
  Scenario: Export single page as PNG
    Given I am on a page
    When I click "Export" and select "PNG (page)"
    Then the current page should be exported as PNG
    And the file should be saved to my downloads

  Scenario: Export all pages as stitched PNG
    Given I have multiple pages
    When I click "Export" and select "PNG (all)"
    Then all pages should be stitched together
    And exported as a single PNG file

  @priority-high
  Scenario: Export as print-ready PDF
    Given I have a complete story
    When I click "Export" and select "PDF"
    Then a PDF should be generated
    And it should include all pages
    And be print-ready

  @do-not-block
  Scenario: PSD layered export (architecture ready)
    Then the architecture should support:
      | Format         | Status   |
      | PSD (layered)  | post-MVP |
      | Binary Archive | post-MVP |
      | Web Format     | post-MVP |

  # ============================================================================
  # 8.2 Export Options
  # ============================================================================

  @priority-high
  Scenario: Metadata always included
    When I export in any format
    Then metadata should be included:
      | Metadata Type   | Description              |
      | Prompt          | Generation prompt used   |
      | ComfyUI-style   | Compatible with ComfyUI  |
      | Graphix         | Project and panel info   |

  Scenario: Export progress and completion
    When I start an export
    Then I should see a progress indicator
    And when complete, I should see a success message
    And a download link should be available

  Scenario: Cancel export
    Given I am exporting a large project
    When I click "Cancel"
    Then the export should stop
    And I should return to the normal view

  @post-mvp
  Scenario Outline: Post-MVP export options
    When export options are available
    Then I should be able to set <option>

    Examples:
      | option         |
      | Resolution/DPI |
      | Color profile  |
      | Bleed/margins  |
      | Flatten layers |
