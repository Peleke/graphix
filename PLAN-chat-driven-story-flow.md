# Plan: Chat-Driven Story Creation Flow

## Overview

Transform the existing partial chat flow into a complete pipeline:

```
Chat Input → Elicitation → Premise → Story → Beats → Panels (with associations)
```

**Goal**: User describes story in chat → AI elicits details → System auto-generates complete narrative structure with beat-to-panel mappings ready for image generation.

---

## Current State vs Target State

| Feature | Current | Target |
|---------|---------|--------|
| Chat elicitation | ✅ 6 phases (greeting→scope) | ✅ + semantic extraction |
| Project creation | ✅ Project + Characters | ✅ + Premise + Story + Beats |
| Character extraction | ⚠️ Regex-based (capitalized words) | ✅ LLM-powered trait extraction |
| Beat generation | ❌ Manual only | ✅ Auto-generate from story arc |
| Panel creation | ❌ Manual only | ✅ Auto-create from beats |
| Beat-Panel association | ⚠️ Field exists, not used | ✅ Linked on creation |
| Visual mapping | ❌ None | ✅ UI shows beat↔panel links |

---

## Phase 1: Enhanced Elicitation (Core Service Updates)

### 1.1 Improve Character Extraction

**File**: `packages/core/src/services/chat/chat.service.ts`

Current extraction is regex-based. Add LLM-powered extraction:

```typescript
interface ExtractedCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  species?: string;
  visualDescription: string;
  personality: string[];
  relationshipTo?: { character: string; relationship: string }[];
}

async extractCharactersFromChat(messages: ChatMessage[]): Promise<ExtractedCharacter[]> {
  // Use TextGenerationService to extract structured character data
  // from the full conversation context
}
```

### 1.2 Add Story Arc Extraction

**File**: `packages/core/src/services/chat/chat.service.ts`

Extract narrative structure from the "arc" phase:

```typescript
interface ExtractedArc {
  premise: {
    logline: string;      // One-sentence hook
    genre: string;
    tone: string;
    themes: string[];
  };
  structure: 'three-act' | 'five-act' | 'hero-journey';
  keyBeats: {
    type: BeatType;       // setup, inciting, rising, midpoint, etc.
    description: string;
    emotionalTone: string;
    involvedCharacters: string[];
  }[];
}

async extractStoryArcFromChat(messages: ChatMessage[]): Promise<ExtractedArc> {
  // Use LLM to parse story concept into structured narrative
}
```

### 1.3 New Elicitation Phase: "Beats Preview"

Add a new phase after "scope" to show user the extracted beats before creation:

```typescript
type ElicitationPhase =
  | 'greeting'
  | 'characters'
  | 'setting'
  | 'arc'
  | 'style'
  | 'scope'
  | 'beats_preview'  // NEW: Show extracted beats for approval
  | 'complete';
```

---

## Phase 2: Auto-Generation Pipeline

### 2.1 Generate Beats from Story Arc

**File**: `packages/core/src/services/narrative.service.ts`

Add method to generate beats from extracted arc:

```typescript
async generateBeatsFromArc(
  storyId: string,
  arc: ExtractedArc,
  pageCount: number
): Promise<Beat[]> {
  // 1. Determine beat count based on pageCount and structure
  // 2. Use LLM to expand keyBeats into full beat descriptions
  // 3. Add visual descriptions, camera angles, narration
  // 4. Create beat records in database
  // 5. Return created beats
}
```

### 2.2 Auto-Create Panels from Beats

**File**: `packages/core/src/services/narrative.service.ts`

Extend `convertBeatToPanel` to work in batch:

```typescript
async createPanelsFromBeats(
  storyboardId: string,
  beats: Beat[]
): Promise<{ beat: Beat; panel: Panel }[]> {
  // For each beat:
  // 1. Create panel with beat's visual description
  // 2. Set panel.beatId = beat.id
  // 3. Set beat.panelId = panel.id (bidirectional link)
  // 4. Generate initial captions from beat narration/SFX
  // 5. Return linked pairs
}
```

### 2.3 Update Project Bootstrap Service

**File**: `packages/core/src/services/project-bootstrap.service.ts`

Extend to create full narrative structure:

```typescript
async bootstrapProjectFromChat(session: ChatSession): Promise<BootstrapResult> {
  // Current flow:
  // 1. Create project
  // 2. Create characters
  // 3. Create storyboard

  // NEW additions:
  // 4. Extract story arc from chat
  // 5. Create Premise from arc.premise
  // 6. Create Story linked to Premise
  // 7. Generate Beats from arc.keyBeats
  // 8. Create Panels from Beats (with associations)
  // 9. Return complete structure
}
```

---

## Phase 3: Beat-Panel Association

### 3.1 Database Schema Verification

**File**: `packages/core/src/db/schema.ts`

Ensure bidirectional relationship:

```typescript
export const beats = sqliteTable('beats', {
  // ... existing fields
  panelId: text('panel_id').references(() => panels.id),  // ✅ Exists
});

export const panels = sqliteTable('panels', {
  // ... existing fields
  beatId: text('beat_id').references(() => beats.id),     // ADD if missing
});
```

### 3.2 API Endpoints for Association

**File**: `packages/server/src/rest/routes/narrative.ts`

Add endpoints:

```typescript
// Link beat to panel
POST /narrative/beats/:beatId/link-panel
Body: { panelId: string }

// Unlink beat from panel
DELETE /narrative/beats/:beatId/link-panel

// Get panel for beat
GET /narrative/beats/:beatId/panel

// Get beat for panel
GET /panels/:panelId/beat
```

### 3.3 UI Hooks for Association

**File**: `packages/ui/src/api/hooks/useBeats.ts`

Add hooks:

```typescript
export function useLinkBeatToPanel() {
  // Mutation to link beat ↔ panel
}

export function useUnlinkBeatFromPanel() {
  // Mutation to unlink
}

export function useBeatForPanel(panelId: string) {
  // Query to get beat associated with panel
}
```

---

## Phase 4: UI Updates

### 4.1 Story Editor: Beat-Panel Visualization

**File**: `packages/ui/src/components/story-editor/beats/BeatCard.tsx`

Show panel association:

```tsx
// In BeatCard, add:
{beat.panelId && (
  <div className="beat-panel-link">
    <span>🖼️ Panel linked</span>
    <button onClick={() => navigateToPanel(beat.panelId)}>
      View Panel
    </button>
  </div>
)}

{!beat.panelId && (
  <button onClick={() => createPanelFromBeat(beat.id)}>
    Create Panel from Beat
  </button>
)}
```

### 4.2 Panel Generator: Beat Context Display

**File**: `packages/ui/src/components/panel-generator/PanelGenerator.tsx`

Show linked beat in panel view:

```tsx
// Add section showing associated beat
{linkedBeat && (
  <div className="panel-beat-context">
    <h4>Linked Story Beat</h4>
    <div className="beat-type">{linkedBeat.beatType}</div>
    <div className="beat-description">{linkedBeat.visualDescription}</div>
    <div className="beat-tone">{linkedBeat.emotionalTone}</div>
  </div>
)}
```

### 4.3 Chat Panel: Beats Preview Phase

**File**: `packages/ui/src/components/chat/ChatMessage.tsx`

Add beats preview UI:

```tsx
// When phase is 'beats_preview', show extracted beats
{suggestion.type === 'beats_preview' && (
  <div className="beats-preview">
    <h4>Your Story Structure</h4>
    {extractedBeats.map(beat => (
      <div key={beat.type} className="preview-beat">
        <span className="beat-type">{beat.type}</span>
        <p>{beat.description}</p>
      </div>
    ))}
    <div className="preview-actions">
      <button onClick={editBeats}>Edit</button>
      <button onClick={approveAndCreate}>Create Project</button>
    </div>
  </div>
)}
```

---

## Phase 5: Complete Flow Integration

### 5.1 New Chat Flow

```
1. User: "A story about a wolf finding friendship"
   ↓
2. AI: "Great concept! Tell me about the main characters..."
   [Characters Phase - LLM extracts: Luna (wolf), Max (fox)]
   ↓
3. AI: "Where does this story take place?"
   [Setting Phase - extracts: snowy forest, winter]
   ↓
4. AI: "What's the main conflict and how does it resolve?"
   [Arc Phase - extracts: loneliness → friendship, three-act structure]
   ↓
5. AI: "What visual style?"
   [Style Phase - extracts: manga, warm colors]
   ↓
6. AI: "How many pages?"
   [Scope Phase - extracts: 8 pages]
   ↓
7. AI: "Here's your story structure. Look good?"
   [Beats Preview Phase - shows:
     - Setup: Luna alone in forest
     - Inciting: Luna encounters Max
     - Rising: Trust builds
     - Climax: Danger brings them together
     - Resolution: Friendship formed
   ]
   ↓
8. User clicks "Create Project"
   ↓
9. System creates:
   - Project (name from logline)
   - Characters (Luna, Max with traits)
   - Premise (logline, genre, tone, themes)
   - Story (structure, synopsis)
   - Beats (5-9 beats with visual descriptions)
   - Storyboard
   - Panels (one per beat, linked)
   ↓
10. User navigates to project with everything ready
```

### 5.2 API Flow

```typescript
// When user clicks "Create Project":
POST /chat/sessions/:id/bootstrap
Response: {
  project: { id, name },
  premise: { id, logline, genre, tone },
  story: { id, structure },
  beats: [{ id, type, visualDescription, panelId }],
  storyboard: { id },
  panels: [{ id, beatId, description }],
  characters: [{ id, name, role }]
}
```

---

## Implementation Order

1. **Week 1: Enhanced Extraction**
   - [ ] LLM-powered character extraction
   - [ ] Story arc extraction service
   - [ ] Tests for extraction accuracy

2. **Week 2: Auto-Generation**
   - [ ] `generateBeatsFromArc()` method
   - [ ] `createPanelsFromBeats()` method
   - [ ] Update project bootstrap service
   - [ ] Add beats_preview phase

3. **Week 3: Beat-Panel Association**
   - [ ] Verify/update database schema
   - [ ] Add API endpoints for linking
   - [ ] Add UI hooks

4. **Week 4: UI Integration**
   - [ ] Beat-panel visualization in Story Editor
   - [ ] Linked beat display in Panel Generator
   - [ ] Beats preview in Chat Panel
   - [ ] E2E tests for complete flow

---

## Success Criteria

1. User can go from chat → complete project in < 2 minutes
2. Generated beats cover full narrative arc (setup → resolution)
3. Every beat has a linked panel ready for generation
4. User can regenerate/edit any beat before generating images
5. Panel Generator shows beat context when generating

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/core/src/services/chat/chat.service.ts` | Add LLM extraction methods |
| `packages/core/src/services/chat/chat.types.ts` | Add extraction types |
| `packages/core/src/services/narrative.service.ts` | Add beat/panel generation |
| `packages/core/src/services/project-bootstrap.service.ts` | Full pipeline |
| `packages/server/src/rest/routes/chat.ts` | Bootstrap endpoint |
| `packages/server/src/rest/routes/narrative.ts` | Link endpoints |
| `packages/ui/src/api/hooks/useChat.ts` | Bootstrap mutation |
| `packages/ui/src/api/hooks/useBeats.ts` | Link hooks |
| `packages/ui/src/components/chat/ChatMessage.tsx` | Beats preview UI |
| `packages/ui/src/components/story-editor/beats/BeatCard.tsx` | Panel link display |
| `packages/ui/src/components/panel-generator/PanelGenerator.tsx` | Beat context display |

---

## E2E Test Plan

```typescript
// flow-15-chat-to-generation.spec.ts
describe('Complete Chat-Driven Flow', () => {
  test('User describes story → AI elicits → Project created with beats', async () => {
    // 1. Open chat
    // 2. Send story concept
    // 3. Answer character questions
    // 4. Answer setting questions
    // 5. Answer arc questions
    // 6. Answer style questions
    // 7. Answer scope questions
    // 8. Verify beats preview shows
    // 9. Click "Create Project"
    // 10. Verify project has premise, story, beats, panels
    // 11. Verify each beat has linked panel
    // 12. Navigate to Panel Generator
    // 13. Verify beat context is shown
    // 14. Generate image (if ComfyUI available)
  });
});
```
