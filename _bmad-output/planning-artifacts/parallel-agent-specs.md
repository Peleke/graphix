# Parallel Agent Specifications

**Date:** January 17, 2026  
**Status:** READY FOR DEPLOYMENT  

These are independent workstreams that can be executed in parallel. Each agent should read the referenced documents before starting.

---

## 🔧 AGENT 1: Tech Stack Finalization

### Mission

Finalize and document the complete UI tech stack with proof-of-concept validations.

### Required Reading

1. `_bmad-output/planning-artifacts/product-brief.md` — Section 7 (Technical Architecture)
2. `_bmad-output/planning-artifacts/ui-research-deep-dive.md` — Section 3 (Technical Research)
3. `_bmad-output/planning-artifacts/user-flows-spec.md` — Technical requirements throughout

### Deliverables

1. **`tech-stack-decision.md`** — Final decisions with rationale
2. **Proof-of-Concept**: Canvas library test (Fabric.js vs alternatives)
3. **Proof-of-Concept**: Theme system architecture
4. **`packages/ui/package.json`** — Initial package setup with dependencies

### Decisions to Make

| Decision | Options | Constraint |
|----------|---------|------------|
| Canvas Library | Fabric.js, Konva, PixiJS | Must support image manipulation, JSON state |
| CSS Solution | Panda CSS, Vanilla Extract | Must support theming, npm-publishable |
| Component Library | Radix UI, Ark UI | Must be unstyled, accessible |
| State Management | Zustand, Jotai | Must handle canvas state efficiently |
| Routing | TanStack Router, React Router | Type-safe preferred |
| Build Tool | Vite, Turbopack | Fast HMR required |
| Desktop Wrapper | Tauri, Electron, PWA-only | Bundle size matters |

### Validation Criteria

For each major decision, create a minimal proof-of-concept that demonstrates:
- Basic functionality works
- Integrates with our existing backend
- Meets performance requirements
- Doesn't block future features

### Output Location

```
_bmad-output/planning-artifacts/tech-stack-decision.md
packages/ui/  (new package)
```

---

## 🎨 AGENT 2: Wireframes & UX Design

### Mission

Create low-fidelity wireframes for all MVP screens based on the user flows specification.

### Required Reading

1. `_bmad-output/planning-artifacts/user-flows-spec.md` — ALL flows
2. `_bmad-output/planning-artifacts/product-brief.md` — Section 8 (Design Principles)
3. `_bmad-output/planning-artifacts/ui-research-deep-dive.md` — UX patterns

### Deliverables

1. **Wireframe Set** — ASCII or markdown diagrams for each screen
2. **Component Inventory** — List of all UI components needed
3. **Interaction Patterns** — How users move between screens
4. **`wireframes.md`** — Consolidated wireframe document

### Screens to Design

| Flow | Screens |
|------|---------|
| Flow 1 | Onboarding, Dashboard, Getting Started Modal |
| Flow 2 | Chat Interface, Project Bootstrap Confirmation |
| Flow 3 | Tree View, Outline Editor, Narrative Editor |
| Flow 4 | Character List, Character Editor, Reference Gallery |
| Flow 5 | Panel Editor, N-up Grid, Iteration Actions, Feedback Modal |
| Flow 6 | Page Composer, Layout Picker, Panel Slot Editor |
| Flow 7 | ControlNet Panel (Level 3 & 4), Reference Processor |
| Flow 8 | Export Dialog |
| Flow 9 | YOLO Setup, YOLO Review |

### Design Constraints

- Dark theme default
- Collapsible panels (Illustrator-style)
- Keyboard shortcuts for all major actions
- Responsive (but desktop-first)
- Accessible (WCAG AA)

### Output Location

```
_bmad-output/planning-artifacts/wireframes.md
_bmad-output/planning-artifacts/component-inventory.md
```

---

## 🧪 AGENT 3: UAT/E2E Test Scaffolding

### Mission

Set up Playwright infrastructure and write initial E2E test skeletons based on user flows.

### Required Reading

1. `_bmad-output/planning-artifacts/user-flows-spec.md` — Gherkin scenarios
2. `packages/server/src/__tests__/` — Existing test patterns
3. `_bmad-output/planning-artifacts/product-brief.md` — Section 4 (Success Metrics)

### Deliverables

1. **Playwright Configuration** — `playwright.config.ts`
2. **Test Structure** — Directory structure for E2E tests
3. **Test Skeletons** — Empty test files with scenario names from flows
4. **Gherkin Feature Files** — `.feature` files for all flows
5. **Test Utilities** — Page objects, helpers, fixtures

### Test Structure

```
packages/ui/
├── e2e/
│   ├── playwright.config.ts
│   ├── fixtures/
│   │   └── test-fixtures.ts
│   ├── pages/
│   │   ├── dashboard.page.ts
│   │   ├── panel-editor.page.ts
│   │   └── ...
│   ├── specs/
│   │   ├── flow-1-entry.spec.ts
│   │   ├── flow-2-project-creation.spec.ts
│   │   ├── flow-3-story-management.spec.ts
│   │   ├── flow-4-characters.spec.ts
│   │   ├── flow-5-panel-generation.spec.ts
│   │   ├── flow-6-page-composition.spec.ts
│   │   ├── flow-7-controlnet.spec.ts
│   │   ├── flow-8-export.spec.ts
│   │   └── flow-9-yolo.spec.ts
│   └── features/
│       ├── entry.feature
│       ├── project-creation.feature
│       └── ...
```

### Test Skeleton Format

```typescript
// flow-5-panel-generation.spec.ts
import { test, expect } from '@playwright/test';
import { PanelEditorPage } from '../pages/panel-editor.page';

test.describe('Flow 5: Panel Generation & Iteration', () => {
  
  test.describe('5.1 Generation Trigger', () => {
    test('should start generation when clicking Generate button', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });

    test('should support batch generation for all panels', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });
  });

  test.describe('5.3 Result Presentation (N-Up)', () => {
    test('should display 4 results by default', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });

    test('should allow selecting a winner', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });
  });

  // ... all scenarios from user-flows-spec.md
});
```

### Gherkin Feature Format

```gherkin
# features/panel-generation.feature

@flow-5 @mvp
Feature: Panel Generation and Iteration
  As an artist
  I want to generate and iterate on panel images
  So that I can create the perfect visual for my story

  @priority-high
  Scenario: Generate panel with single click
    Given I have a panel with a valid prompt
    When I click the "Generate" button
    Then generation should begin
    And I should see a progress indicator
    And I should see results when complete

  @priority-high
  Scenario: Select winner from N-up grid
    Given I have 4 generation results displayed
    When I click on the second image
    Then it should be marked as selected
    And I should see approve/reject options
```

### Output Location

```
packages/ui/e2e/           (new directory)
packages/ui/playwright.config.ts
```

---

## 🚀 Deployment Instructions

### For Each Agent

1. **Read all required documents first**
2. **Create a new branch**: `feat/ui-{agent-name}`
3. **Execute deliverables**
4. **Commit frequently with clear messages**
5. **Create PR when complete**

### Sync Points

After all agents complete:
1. Review all PRs together
2. Resolve any conflicts/inconsistencies
3. Merge in order: Tech Stack → Wireframes → E2E
4. Begin implementation sprint

---

## 📋 Agent Checklist

### Agent 1: Tech Stack
- [ ] Read required documents
- [ ] Create `feat/ui-tech-stack` branch
- [ ] Make canvas library decision with PoC
- [ ] Make styling solution decision with PoC
- [ ] Create `packages/ui/package.json`
- [ ] Document all decisions in `tech-stack-decision.md`
- [ ] Create PR

### Agent 2: Wireframes
- [ ] Read required documents
- [ ] Create `feat/ui-wireframes` branch
- [ ] Create wireframes for all 9 flows
- [ ] Create component inventory
- [ ] Document interaction patterns
- [ ] Create PR

### Agent 3: E2E Scaffolding
- [ ] Read required documents
- [ ] Create `feat/ui-e2e` branch
- [ ] Set up Playwright configuration
- [ ] Create test directory structure
- [ ] Write test skeletons for all flows
- [ ] Create Gherkin feature files
- [ ] Create page objects
- [ ] Create PR

---

*May the winds be favorable and the raids be profitable, ye scurvy agents! ARR!* 🏴‍☠️
