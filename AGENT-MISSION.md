# AGENT A: Project Dashboard

## Mission
Build the Project Dashboard - the landing page and project management UI for Graphix.

## Branch
`feat/ui-dashboard` (this worktree)

## Server
Backend is running at `http://localhost:3002` - use it for API calls!

## Your Deliverables

### 1. Project List View
- Grid/list toggle of existing projects
- Project cards showing: name, thumbnail, last modified, panel count
- Search/filter functionality
- Sort by: name, date created, last modified

### 2. Create Project Modal
- "New Project" button → modal
- Project name, description
- Template selection (blank, comic, manga, webtoon)
- Create via `POST /api/projects`

### 3. Project Actions
- Open project → navigate to editor
- Duplicate project
- Delete project (with confirmation)
- Export project

### 4. Routing Setup
- `/` → Dashboard (project list)
- `/project/:id` → Project editor (stub for now)
- Use TanStack Router

## Tech Stack (Already Configured)
- React 19
- Zustand for state
- TanStack Router
- TanStack Query for data fetching
- Radix UI primitives
- Panda CSS for styling

## API Endpoints You'll Use
```
GET    /api/projects           - List all projects
POST   /api/projects           - Create project
GET    /api/projects/:id       - Get project
PUT    /api/projects/:id       - Update project
DELETE /api/projects/:id       - Delete project
```

## File Structure
```
packages/ui/src/
├── routes/
│   ├── index.tsx              # Dashboard route
│   └── project.$id.tsx        # Project route (stub)
├── components/
│   ├── dashboard/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectGrid.tsx
│   │   ├── CreateProjectModal.tsx
│   │   └── DashboardHeader.tsx
│   └── layout/
│       └── AppLayout.tsx
├── stores/
│   └── project.store.ts
└── hooks/
    └── useProjects.ts
```

## Style Guide
- Dark theme by default (check `src/theme/tokens.ts`)
- Use Radix UI for modals, dropdowns
- Smooth animations with framer-motion
- Professional, "you paid $2000 for this" aesthetic

## Testing - THIS IS NON-NEGOTIABLE

**YOU MUST WRITE EXHAUSTIVE, DISGUSTING, EMBARASSINGLY THOROUGH TESTS.**

See `packages/ui/src/components/generation-tree/__tests__/` for the standard. Match or exceed it.

### Required Test Types:
1. **Unit Tests** - Every store action, every hook, every utility
2. **Component Tests** - Every component renders, handles props, fires events
3. **Edge Case Tests** - Null inputs, empty arrays, error states, loading states
4. **Property-Based Tests** - Invariants that hold for ANY input
5. **Integration Tests** - Full workflows (create project → list → open → delete)

### Test File Structure (REQUIRED):
```
components/dashboard/__tests__/
├── ProjectCard.test.tsx           # Component rendering
├── ProjectGrid.test.tsx           # Grid behavior
├── CreateProjectModal.test.tsx    # Modal interactions
├── store.test.ts                  # Store unit tests
├── store.edge-cases.test.ts       # Store edge cases
├── hooks.test.ts                  # Hook behavior
├── integration.test.ts            # Full workflow tests
└── property-based.test.ts         # Invariant tests
```

### Minimum Test Counts:
- Store: 30+ tests
- Components: 20+ tests per component
- Hooks: 15+ tests
- Integration: 10+ tests
- Edge cases: 40+ tests

**TOTAL MINIMUM: 150+ tests for Dashboard**

### Test Patterns to Use:
```typescript
// Property-based example
function forAll<T>(generator: () => T, property: (v: T) => void, n = 100) {
  for (let i = 0; i < n; i++) property(generator());
}

// Edge case example
it('handles null project gracefully', () => {
  expect(() => renderProjectCard(null)).not.toThrow();
});

// Integration example
it('full create-list-delete workflow', async () => {
  // Create
  await createProject({ name: 'Test' });
  // Verify in list
  expect(screen.getByText('Test')).toBeInTheDocument();
  // Delete
  await deleteProject(id);
  // Verify removed
  expect(screen.queryByText('Test')).not.toBeInTheDocument();
});
```

**IF YOUR TEST COUNT IS BELOW 150, YOU ARE NOT DONE. ARR!**

## When Done
1. Run `bun run test` - all tests pass
2. Run `bun run typecheck` - no errors
3. Commit with message: `feat(ui): add project dashboard`
4. Let the main agent know you're done!

**ARR, GET TO WORK YE SCALLYWAG!** 🏴‍☠️
