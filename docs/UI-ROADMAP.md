# UI Roadmap - Path to Working Comic Generation 🏴‍☠️

**Current Status:** 🟡 70% Complete - Beautiful foundation, needs wiring  
**Target:** Full end-to-end comic generation working  
**Timeline:** 6-8 hours of focused work

---

## 🎯 Phase 1: Critical Wiring (2-3 hours) - **DO THIS FIRST**

### 1.1 Wire Project Workspace Navigation
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour

**Tasks:**
- [ ] Add state management for active workspace view
- [ ] Make sidebar nav items clickable and functional
- [ ] Conditionally render components:
  - Story Editor (default)
  - Storyboard View
  - Panel Generator
  - Page Composer
- [ ] Add visual feedback for active nav item

**Files to Modify:**
- `packages/ui/src/routes/projects/$projectId.tsx`

### 1.2 Wire Panel Creation Flow
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour

**Tasks:**
- [ ] Add "Create Panel" button to Storyboard View
- [ ] Wire `useCreatePanel` hook (if needed) or use existing API
- [ ] Navigate to Panel Generator with new panel ID
- [ ] Test: Storyboard → Create Panel → Panel Generator

**Files to Modify:**
- `packages/ui/src/components/storyboard/StoryboardView.tsx`
- `packages/ui/src/api/hooks/usePanels.ts` (add create hook if missing)

### 1.3 Wire Character Manager Access
**Priority:** 🟡 HIGH  
**Time:** 30 minutes

**Tasks:**
- [ ] Add Character Manager to workspace sidebar
- [ ] Wire Character Manager component to project page
- [ ] Test: Navigate to Characters → Create → Use in Panel Generator

---

## 🧪 Phase 2: Test Coverage (3-4 hours)

### 2.1 Hook Tests
**Priority:** 🟡 HIGH  
**Time:** 2 hours

**Tasks:**
- [ ] `useStories.test.ts` - Premise/story/beat hooks (30+ tests)
- [ ] `useGenerations.test.ts` - Generation hooks (25+ tests)
- [ ] `usePanels.test.ts` - Panel hooks (25+ tests)
- [ ] `useComposition.test.ts` - Composition hooks (20+ tests)

**Target:** 100+ hook tests total

### 2.2 Component Tests
**Priority:** 🟡 HIGH  
**Time:** 2 hours

**Tasks:**
- [ ] `StoryEditor.test.tsx` - Component rendering, interactions (20+ tests)
- [ ] `StoryboardView.test.tsx` - Component rendering, interactions (20+ tests)
- [ ] `PanelGenerator.test.tsx` - Component rendering, interactions (25+ tests)
- [ ] `PageComposer.test.tsx` - Component rendering, interactions (20+ tests)

**Target:** 85+ component tests total

---

## 🎭 Phase 3: E2E Validation (1-2 hours)

### 3.1 Fix E2E Test
**Priority:** 🟡 HIGH  
**Time:** 1 hour

**Tasks:**
- [ ] Update selectors to match actual UI
- [ ] Fix navigation steps (use actual nav items)
- [ ] Add waits for async operations
- [ ] Test in headed mode
- [ ] Verify full flow works end-to-end

**Files to Modify:**
- `packages/ui/e2e/specs/flow-complete-comic-generation.spec.ts`

### 3.2 Add CI/CD Integration
**Priority:** 🟢 MEDIUM  
**Time:** 30 minutes

**Tasks:**
- [ ] Add E2E test job to GitHub Actions
- [ ] Configure test server startup
- [ ] Add test result reporting
- [ ] Set up test failure notifications

**Files to Create/Modify:**
- `.github/workflows/e2e-tests.yml`

---

## 🔍 Phase 4: Review Gauntlet (1 hour)

### 4.1 Run Review Gauntlet
**Priority:** 🟡 HIGH  
**Time:** 1 hour

**Tasks:**
- [ ] Run Ruthless Reviewer (code quality, functional patterns)
- [ ] Run Test Terrorist (test coverage, BDD structure)
- [ ] Run Security Karen (OWASP, security standards)
- [ ] Fix all critical issues
- [ ] Re-run gauntlet until approved

---

## 📋 Execution Order

### Immediate (Today):
1. ✅ Wire navigation (1 hour)
2. ✅ Wire panel creation (1 hour)
3. ✅ Write critical hook tests (1 hour)
4. ✅ Fix E2E test (1 hour)
5. ✅ Run review gauntlet (1 hour)

**Total:** ~5 hours to "YES, IT WORKS"

### Follow-up (This Week):
1. Complete all hook tests
2. Complete all component tests
3. Add CI/CD for E2E
4. Final review gauntlet pass

---

## 🎯 Success Criteria

### Minimum Viable:
- [ ] Can create project
- [ ] Can create characters
- [ ] Can create premise/story
- [ ] Can create storyboard
- [ ] Can create panel
- [ ] Can generate panel image
- [ ] Can compose page
- [ ] Can export

### Full Success:
- [ ] All above + E2E test passes
- [ ] All hooks tested (100+ tests)
- [ ] All components tested (85+ tests)
- [ ] Review gauntlet approved
- [ ] CI/CD running E2E tests

---

## 🚨 Blockers & Risks

### Blockers:
- None - all dependencies exist

### Risks:
- E2E test might reveal more UI gaps
- Panel generation might need backend fixes
- ControlNet integration might need work

### Mitigation:
- Test incrementally
- Fix as we go
- Keep E2E test updated

---

**Next Action:** Start Phase 1.1 - Wire Navigation 🏴‍☠️
