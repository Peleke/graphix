# E2E Test Implementation - Parallel Agent Prompts

## Overview

These prompts are designed for parallel agents to implement E2E tests for each major flow.
Each agent should work independently on their assigned flow(s).

**Auth Strategy:** Tests should work WITHOUT auth for now. Design with `REQUIRE_AUTH=false` default.
When Supabase auth is added later, we'll add an auth fixture that can be toggled.

---

## Agent A: Entry + Project Creation (Flows 1-2)

**Files to implement:**
- `e2e/specs/flow-1-entry.spec.ts`
- `e2e/specs/flow-2-project-creation.spec.ts`

**Feature files to reference:**
- `e2e/features/entry.feature`
- `e2e/features/project-creation.feature`

**Page objects available:**
- `e2e/pages/dashboard.page.ts`
- `e2e/pages/onboarding.page.ts`

**Key scenarios to implement:**
1. User lands on dashboard, sees project list
2. User creates new project with name/description
3. User navigates into project workspace
4. Empty state handling (no projects yet)

**Prompt:**
```
You are implementing E2E tests for Graphix UI - Flows 1-2 (Entry & Project Creation).

Read the feature files in e2e/features/entry.feature and project-creation.feature.
Implement REAL tests (remove test.skip()) in the spec files.

Use the page objects in e2e/pages/. If selectors are wrong, update the page objects.

Requirements:
- No auth required (REQUIRE_AUTH=false)
- Tests should be independent and idempotent
- Clean up test data after each test
- Use data-testid attributes where possible

Start the dev server before running: bun run dev (port 5173)
API server: bun run --cwd packages/server dev (port 3002)
```

---

## Agent B: Story Management (Flow 3)

**Files to implement:**
- `e2e/specs/flow-3-story-management.spec.ts`

**Feature files to reference:**
- `e2e/features/story-management.feature`

**Page objects available:**
- `e2e/pages/storyboard.page.ts`

**Key scenarios to implement:**
1. Create premise for project
2. Generate story structure from premise
3. Create/edit story beats
4. Navigate between beats
5. Link beats to panels

**Prompt:**
```
You are implementing E2E tests for Graphix UI - Flow 3 (Story Management).

Read the feature file in e2e/features/story-management.feature.
Implement REAL tests (remove test.skip()) in flow-3-story-management.spec.ts.

Use the page objects in e2e/pages/. If selectors are wrong, update the page objects.

Requirements:
- No auth required
- Create test project in beforeAll, clean up in afterAll
- Test both happy path and error states
- Verify data persistence (refresh and check data still there)
```

---

## Agent C: Character Management (Flow 4)

**Files to implement:**
- `e2e/specs/flow-4-characters.spec.ts`

**Feature files to reference:**
- `e2e/features/characters.feature`
- `e2e/features/character-management.feature`

**Page objects available:**
- `e2e/pages/character-editor.page.ts`

**Key scenarios to implement:**
1. Create character with name, species, description
2. Add reference images to character
3. Configure LoRA for character
4. Edit character details
5. Delete character
6. Character appears in panel generator dropdown

**Prompt:**
```
You are implementing E2E tests for Graphix UI - Flow 4 (Character Management).

Read the feature files in e2e/features/characters.feature and character-management.feature.
Implement REAL tests (remove test.skip()) in flow-4-characters.spec.ts.

Use the page objects in e2e/pages/. If selectors are wrong, update the page objects.

Requirements:
- No auth required
- Test LoRA browser/selector functionality
- Verify character data persists
- Test character deletion with confirmation
```

---

## Agent D: Page Composition (Flow 6)

**Files to implement:**
- `e2e/specs/flow-6-page-composition.spec.ts`

**Feature files to reference:**
- `e2e/features/page-composition.feature`

**Page objects available:**
- `e2e/pages/page-composer.page.ts`

**Key scenarios to implement:**
1. Select page template
2. Auto-fill panels into slots
3. Rearrange panels in slots
4. Preview page layout
5. Adjust gutters/margins (if implemented)
6. Navigate between pages

**Prompt:**
```
You are implementing E2E tests for Graphix UI - Flow 6 (Page Composition).

Read the feature file in e2e/features/page-composition.feature.
Implement REAL tests (remove test.skip()) in flow-6-page-composition.spec.ts.

Use the page objects in e2e/pages/. If selectors are wrong, update the page objects.

Requirements:
- No auth required
- Test template selection
- Test drag-and-drop if implemented (or slot clicking)
- Verify visual layout updates
```

---

## Agent E: ControlNet + Export (Flows 7-8)

**Files to implement:**
- `e2e/specs/flow-7-controlnet.spec.ts`
- `e2e/specs/flow-8-export.spec.ts`

**Feature files to reference:**
- `e2e/features/controlnet.feature`
- `e2e/features/export.feature`

**Page objects available:**
- `e2e/pages/controlnet.page.ts`
- `e2e/pages/export.page.ts`

**Key scenarios to implement:**
1. Select control level (0-4)
2. Upload reference image for ControlNet
3. Preview extracted features (pose, depth, etc.)
4. Export single page as PNG
5. Export project as PDF
6. Export with different quality settings

**Prompt:**
```
You are implementing E2E tests for Graphix UI - Flows 7-8 (ControlNet & Export).

Read the feature files in e2e/features/controlnet.feature and export.feature.
Implement REAL tests (remove test.skip()) in the spec files.

Use the page objects in e2e/pages/. If selectors are wrong, update the page objects.

Requirements:
- No auth required
- ControlNet tests may need mock images (use fixtures)
- Export tests should verify file downloads
- Test error states (invalid image, export failure)
```

---

## Running Tests

```bash
# Install Playwright browsers (once)
cd packages/ui && bunx playwright install

# Run all E2E tests
bun run test:e2e

# Run specific flow
bun run test:e2e -- --grep "Flow 5"

# Run with UI mode (debugging)
bun run test:e2e:ui

# Run headed (see browser)
bun run test:e2e -- --headed
```

---

## Notes

- All tests should be GREEN before merging
- Update page objects if selectors don't match actual UI
- Add data-testid attributes to components as needed
- Commit after each flow is complete
