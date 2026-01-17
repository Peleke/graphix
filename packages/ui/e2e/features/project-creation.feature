@flow-2 @mvp
Feature: Project Creation (Chat-to-Start)
  As an artist
  I want to create a project by chatting with AI
  So that I can quickly bootstrap my creative work from a simple idea

  Background:
    Given I am on the chat-to-start page

  # ============================================================================
  # 2.1 AI-Guided Project Setup
  # ============================================================================

  @priority-high
  Scenario: AI begins elicitation for vague idea
    Given I click on the chat input
    When I type "I want to make a story about two otters falling in love on a yacht"
    Then the AI should begin an elicitation conversation
    And the AI should ask about characters
    And the AI should ask about setting details
    And the AI should ask about story arc
    And the AI should ask about tone/style
    And the AI should ask about scope

  Scenario: Single character story is valid
    Given I type "An otter comes home after work and needs to relax"
    When the AI asks about characters
    Then I should be able to specify just one character
    And the system should accept this as valid

  @priority-high
  Scenario: Minimal input accepted
    Given I provide very little information
    When I indicate I want to proceed anyway
    Then the system should allow me to continue
    And nullable fields should be marked for "AI guess" or "leave null"
    And the user should specify per-field handling

  Scenario Outline: AI asks elicitation questions
    Given I have started a project chat
    When the AI asks about <topic>
    Then I should be able to provide <example_response>
    And the response should be <required>

    Examples:
      | topic       | example_response                    | required |
      | characters  | Marina and Cove, two otters         | optional |
      | setting     | A luxury yacht in the Mediterranean | optional |
      | story arc   | Enemies to lovers romance           | optional |
      | tone/style  | Romantic comedy, explicit content   | optional |
      | scope       | 20 pages, one-shot                  | optional |

  # ============================================================================
  # 2.2 RAG / Asset Matching
  # ============================================================================

  @priority-high
  Scenario: Exact character name match
    Given I have a character named "Marina" in my library
    When I type "I want to use Marina again"
    Then the AI should search by name
    And present Marina's character card for confirmation
    And ask if I want to use this character

  Scenario: Ambiguous name match
    Given I have two characters with similar names
    When I mention a name that could match either
    Then the AI should present both options
    And I should select the correct one

  Scenario: Create character based on existing
    Given I mention "Marina's sister"
    When no exact match exists
    Then the AI should offer to create a new character
    And suggest basing it on Marina's profile
    And allow me to specify differences

  @progressive
  Scenario: Vector similarity search
    Given I describe a character loosely
    When no name match exists
    Then the system should search via embedding similarity
    And present closest matching characters
    And offer to create new if no match satisfies

  # ============================================================================
  # 2.3 Project Bootstrap Output
  # ============================================================================

  @priority-high
  Scenario: Ready to create project
    Given I have completed the chat setup
    When the AI says "Ready to start!"
    Then I should see a "Create Project" button
    And clicking it should create all assets
    And I should be taken to the Storyboard view
    And I should see my first page ready for generation

  Scenario: Project assets created
    Given I have discussed characters and story
    When I click "Create Project"
    Then the system should create:
      | Asset            | Condition        |
      | Project Record   | always           |
      | Character Profiles | if mentioned   |
      | Story Outline    | if discussed     |
      | Page Structure   | if scope defined |
      | Style Preset     | if style discussed |
      | Draft Prompts    | best-effort      |
