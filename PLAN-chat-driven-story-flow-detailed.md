# Detailed Plan: Chat-Driven Story Creation Flow

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Beats per story | Standard structure (5-9) | More narrative richness to work with |
| Storyboards | One per act | Clean separation, easier navigation |
| Beats preview | Skippable | Experienced users can go fast |

## Story Structure Templates

```typescript
const STORY_STRUCTURES = {
  'three-act': {
    acts: ['Act 1: Setup', 'Act 2: Confrontation', 'Act 3: Resolution'],
    beats: [
      { type: 'setup', act: 0, description: 'Establish world and protagonist' },
      { type: 'inciting_incident', act: 0, description: 'Event that disrupts status quo' },
      { type: 'rising_action', act: 1, description: 'Protagonist pursues goal' },
      { type: 'midpoint', act: 1, description: 'Major revelation or reversal' },
      { type: 'complication', act: 1, description: 'Stakes increase, obstacles mount' },
      { type: 'crisis', act: 2, description: 'All seems lost' },
      { type: 'climax', act: 2, description: 'Final confrontation' },
      { type: 'resolution', act: 2, description: 'New equilibrium established' },
    ]
  },
  'five-act': {
    acts: ['Act 1: Exposition', 'Act 2: Rising Action', 'Act 3: Climax', 'Act 4: Falling Action', 'Act 5: Denouement'],
    beats: [
      { type: 'setup', act: 0 },
      { type: 'inciting_incident', act: 0 },
      { type: 'rising_action', act: 1 },
      { type: 'complication', act: 1 },
      { type: 'midpoint', act: 2 },
      { type: 'crisis', act: 2 },
      { type: 'climax', act: 3 },
      { type: 'falling_action', act: 3 },
      { type: 'resolution', act: 4 },
      { type: 'denouement', act: 4 },
    ]
  },
  'hero-journey': {
    acts: ['Departure', 'Initiation', 'Return'],
    beats: [
      { type: 'setup', act: 0, description: 'Ordinary world' },
      { type: 'inciting_incident', act: 0, description: 'Call to adventure' },
      { type: 'rising_action', act: 1, description: 'Crossing threshold, tests' },
      { type: 'midpoint', act: 1, description: 'Ordeal, death & rebirth' },
      { type: 'complication', act: 1, description: 'Reward seized' },
      { type: 'crisis', act: 2, description: 'The road back' },
      { type: 'climax', act: 2, description: 'Resurrection' },
      { type: 'resolution', act: 2, description: 'Return with elixir' },
    ]
  }
};
```

---

## File-by-File Implementation

### 1. Core Types

#### `packages/core/src/services/chat/chat.types.ts`

**ADD** new types for extraction:

```typescript
// Line ~50, after existing types

// ============================================================================
// Enhanced Extraction Types
// ============================================================================

export interface ExtractedCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  species?: string;
  visualDescription: string;
  personality: string[];
  motivation?: string;
  arc?: string;
  relationships?: Array<{ character: string; relationship: string }>;
}

export interface ExtractedSetting {
  location: string;
  timeperiod?: string;
  atmosphere: string;
  visualDetails: string[];
}

export interface ExtractedBeat {
  type: BeatType;
  actIndex: number;
  summary: string;
  visualDescription: string;
  emotionalTone: string;
  involvedCharacters: string[];
  cameraAngle?: CameraAngle;
  narration?: string;
  sfx?: string;
}

export interface ExtractedStoryArc {
  premise: {
    logline: string;
    genre: string;
    tone: string;
    themes: string[];
    setting: string;
  };
  structure: 'three-act' | 'five-act' | 'hero-journey';
  acts: string[];
  beats: ExtractedBeat[];
}

export interface BootstrapResult {
  project: { id: string; name: string };
  premise: { id: string; logline: string };
  story: { id: string; structure: string };
  storyboards: Array<{ id: string; name: string; actIndex: number }>;
  beats: Array<{ id: string; type: string; panelId: string }>;
  panels: Array<{ id: string; beatId: string; storyboardId: string }>;
  characters: Array<{ id: string; name: string }>;
}

// Update ElicitationPhase
export type ElicitationPhase =
  | 'greeting'
  | 'characters'
  | 'setting'
  | 'arc'
  | 'style'
  | 'scope'
  | 'beats_preview'  // NEW
  | 'complete';

// Update ElicitationState
export interface ElicitationState {
  phase: ElicitationPhase;
  concept?: string;
  characters: ExtractedCharacter[];  // CHANGED from CharacterDraft[]
  setting?: ExtractedSetting;        // NEW
  arc?: ExtractedStoryArc;           // NEW
  style?: string;
  pageCount?: number;
  skipBeatsPreview?: boolean;        // NEW
}
```

---

### 2. Extraction Prompts

#### `packages/core/src/services/chat/prompts.ts`

**ADD** structured extraction prompts:

```typescript
// Line ~100, after existing prompts

// ============================================================================
// Structured Extraction Prompts
// ============================================================================

export const EXTRACTION_PROMPTS = {
  characters: `
Analyze the conversation and extract all mentioned characters.
Return a JSON array of characters with this exact structure:

{
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist" | "antagonist" | "supporting" | "minor",
      "species": "human/wolf/fox/etc or null",
      "visualDescription": "Physical appearance in detail for image generation",
      "personality": ["trait1", "trait2", "trait3"],
      "motivation": "What drives this character",
      "arc": "How this character changes through the story",
      "relationships": [{"character": "Other Name", "relationship": "friend/rival/mentor/etc"}]
    }
  ]
}

Extract from conversation:
{{conversation}}

Return ONLY valid JSON, no explanation.
`,

  setting: `
Analyze the conversation and extract the story setting.
Return JSON with this exact structure:

{
  "setting": {
    "location": "Primary location name/description",
    "timeperiod": "When the story takes place (or null)",
    "atmosphere": "Overall mood/feeling of the world",
    "visualDetails": ["detail1", "detail2", "detail3"]
  }
}

Extract from conversation:
{{conversation}}

Return ONLY valid JSON, no explanation.
`,

  storyArc: `
Analyze the conversation and extract the complete story structure.
The user wants a {{structure}} structure.

Return JSON with this exact structure:

{
  "premise": {
    "logline": "One compelling sentence describing the story",
    "genre": "adventure/romance/horror/comedy/drama/fantasy/sci-fi",
    "tone": "hopeful/dark/comedic/tense/melancholic/inspiring",
    "themes": ["theme1", "theme2", "theme3"],
    "setting": "Brief setting description"
  },
  "structure": "{{structure}}",
  "acts": ["Act 1 Name", "Act 2 Name", "Act 3 Name"],
  "beats": [
    {
      "type": "setup|inciting_incident|rising_action|midpoint|complication|crisis|climax|resolution|denouement",
      "actIndex": 0,
      "summary": "Brief description of what happens",
      "visualDescription": "Detailed visual description for image generation - describe the scene, composition, lighting, mood",
      "emotionalTone": "The emotional quality of this moment",
      "involvedCharacters": ["Character1", "Character2"],
      "cameraAngle": "wide|medium|close-up|extreme-close-up|birds-eye|low-angle",
      "narration": "Optional narrator text for this beat",
      "sfx": "Optional sound effect description"
    }
  ]
}

Generate beats following the {{structure}} pattern with appropriate pacing.
Each beat's visualDescription should be detailed enough for AI image generation.

Extract from conversation:
{{conversation}}

Characters available: {{characters}}
Setting: {{setting}}

Return ONLY valid JSON, no explanation.
`,

  beatsExpansion: `
Expand this beat into a detailed visual description for comic panel generation.

Beat type: {{beatType}}
Summary: {{summary}}
Characters: {{characters}}
Setting: {{setting}}
Emotional tone: {{emotionalTone}}

Generate a rich visual description (2-3 sentences) that includes:
- Character positions and actions
- Environmental details
- Lighting and atmosphere
- Composition suggestions

Return ONLY the visual description text, no JSON.
`
};

export const PHASE_SUGGESTIONS_EXTENDED = {
  ...PHASE_SUGGESTIONS,
  beats_preview: [
    { label: '✅ Looks good, create project!', value: 'create_project' },
    { label: '✏️ Let me adjust some beats', value: 'edit_beats' },
    { label: '🔄 Regenerate with different structure', value: 'regenerate' },
    { label: '⏭️ Skip preview next time', value: 'skip_preview' },
  ],
};
```

---

### 3. Chat Service - Extraction Methods

#### `packages/core/src/services/chat/chat.service.ts`

**ADD** extraction methods (~line 150, after existing methods):

```typescript
// ============================================================================
// LLM-Powered Extraction Methods
// ============================================================================

async extractCharacters(messages: ChatMessage[]): Promise<ExtractedCharacter[]> {
  const conversation = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = EXTRACTION_PROMPTS.characters.replace('{{conversation}}', conversation);

  const response = await this.textGeneration.generate({
    prompt,
    maxTokens: 2000,
    temperature: 0.3, // Low temp for structured output
  });

  try {
    const parsed = JSON.parse(response.text);
    return parsed.characters || [];
  } catch (e) {
    console.error('Failed to parse character extraction:', e);
    return this.fallbackCharacterExtraction(messages);
  }
}

async extractSetting(messages: ChatMessage[]): Promise<ExtractedSetting | null> {
  const conversation = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = EXTRACTION_PROMPTS.setting.replace('{{conversation}}', conversation);

  const response = await this.textGeneration.generate({
    prompt,
    maxTokens: 500,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(response.text);
    return parsed.setting || null;
  } catch (e) {
    console.error('Failed to parse setting extraction:', e);
    return null;
  }
}

async extractStoryArc(
  messages: ChatMessage[],
  characters: ExtractedCharacter[],
  setting: ExtractedSetting | null,
  structure: 'three-act' | 'five-act' | 'hero-journey' = 'three-act'
): Promise<ExtractedStoryArc | null> {
  const conversation = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const characterNames = characters.map(c => c.name).join(', ');
  const settingDesc = setting?.location || 'unspecified';

  const prompt = EXTRACTION_PROMPTS.storyArc
    .replace(/\{\{conversation\}\}/g, conversation)
    .replace(/\{\{structure\}\}/g, structure)
    .replace(/\{\{characters\}\}/g, characterNames)
    .replace(/\{\{setting\}\}/g, settingDesc);

  const response = await this.textGeneration.generate({
    prompt,
    maxTokens: 4000,
    temperature: 0.5, // Slightly higher for creative beat generation
  });

  try {
    const parsed = JSON.parse(response.text);
    return {
      premise: parsed.premise,
      structure: parsed.structure || structure,
      acts: parsed.acts || STORY_STRUCTURES[structure].acts,
      beats: parsed.beats || [],
    };
  } catch (e) {
    console.error('Failed to parse story arc extraction:', e);
    return null;
  }
}

async expandBeatDescription(
  beat: ExtractedBeat,
  characters: ExtractedCharacter[],
  setting: ExtractedSetting | null
): Promise<string> {
  const prompt = EXTRACTION_PROMPTS.beatsExpansion
    .replace('{{beatType}}', beat.type)
    .replace('{{summary}}', beat.summary)
    .replace('{{characters}}', beat.involvedCharacters.join(', '))
    .replace('{{setting}}', setting?.location || 'unspecified')
    .replace('{{emotionalTone}}', beat.emotionalTone);

  const response = await this.textGeneration.generate({
    prompt,
    maxTokens: 300,
    temperature: 0.7,
  });

  return response.text.trim() || beat.visualDescription;
}

// Fallback to regex-based extraction if LLM fails
private fallbackCharacterExtraction(messages: ChatMessage[]): ExtractedCharacter[] {
  // Existing regex-based extraction logic
  const text = messages.map(m => m.content).join(' ');
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
  const uniqueNames = [...new Set(capitalizedWords)].slice(0, 5);

  return uniqueNames.map((name, i) => ({
    name,
    role: i === 0 ? 'protagonist' : 'supporting',
    visualDescription: `A character named ${name}`,
    personality: [],
  }));
}
```

**MODIFY** `processMessage` method to use extraction at phase transitions:

```typescript
// In processMessage, after determining next phase:

if (newPhase === 'setting' && state.phase === 'characters') {
  // Extract characters before moving to setting
  state.characters = await this.extractCharacters(session.messages);
}

if (newPhase === 'arc' && state.phase === 'setting') {
  // Extract setting before moving to arc
  state.setting = await this.extractSetting(session.messages);
}

if (newPhase === 'style' && state.phase === 'arc') {
  // Extract story arc before moving to style
  state.arc = await this.extractStoryArc(
    session.messages,
    state.characters,
    state.setting,
    'three-act' // Default, can be changed based on user input
  );
}

if (newPhase === 'complete' && !state.skipBeatsPreview) {
  // Show beats preview instead of going directly to complete
  newPhase = 'beats_preview';
}
```

---

### 4. Project Bootstrap Service

#### `packages/core/src/services/project-bootstrap.service.ts`

**REWRITE** `bootstrapFromChat` method:

```typescript
async bootstrapFromChat(sessionId: string): Promise<BootstrapResult> {
  const session = await this.chatService.getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const state = session.state as ElicitationState;
  if (!state.arc) throw new Error('Story arc not extracted');

  // 1. Create Project
  const project = await this.db.insert(projects).values({
    id: createId(),
    name: state.arc.premise.logline.slice(0, 50),
    description: state.arc.premise.logline,
    settings: { genre: state.arc.premise.genre, tone: state.arc.premise.tone },
  }).returning().get();

  // 2. Create Characters
  const createdCharacters = await Promise.all(
    state.characters.map(char =>
      this.db.insert(characters).values({
        id: createId(),
        projectId: project.id,
        name: char.name,
        profile: {
          species: char.species,
          description: char.visualDescription,
          personality: char.personality,
          motivation: char.motivation,
        },
      }).returning().get()
    )
  );

  // 3. Create Premise
  const premise = await this.narrativeService.createPremise({
    projectId: project.id,
    logline: state.arc.premise.logline,
    genre: state.arc.premise.genre,
    tone: state.arc.premise.tone,
    themes: state.arc.premise.themes,
    setting: state.arc.premise.setting,
    characterIds: createdCharacters.map(c => c.id),
  });

  // 4. Create Story
  const story = await this.narrativeService.createStory({
    premiseId: premise.id,
    structure: state.arc.structure,
  });

  // 5. Create Storyboards (one per act)
  const storyboards = await Promise.all(
    state.arc.acts.map((actName, actIndex) =>
      this.db.insert(storyboardsTable).values({
        id: createId(),
        projectId: project.id,
        name: actName,
        description: `${state.arc.structure} - ${actName}`,
      }).returning().get().then(sb => ({ ...sb, actIndex }))
    )
  );

  // 6. Create Beats and Panels (linked)
  const beatsAndPanels: Array<{ beat: any; panel: any }> = [];

  for (const extractedBeat of state.arc.beats) {
    // Find the storyboard for this beat's act
    const storyboard = storyboards.find(sb => sb.actIndex === extractedBeat.actIndex)
      || storyboards[0];

    // Create the beat
    const beat = await this.narrativeService.createBeat({
      storyId: story.id,
      position: beatsAndPanels.length,
      beatType: extractedBeat.type,
      visualDescription: extractedBeat.visualDescription,
      emotionalTone: extractedBeat.emotionalTone,
      narration: extractedBeat.narration,
      sfx: extractedBeat.sfx,
      cameraAngle: extractedBeat.cameraAngle,
    });

    // Create linked panel
    const panel = await this.db.insert(panels).values({
      id: createId(),
      storyboardId: storyboard.id,
      description: extractedBeat.visualDescription,
      position: beatsAndPanels.filter(bp =>
        storyboards.find(sb => sb.id === bp.panel.storyboardId)?.actIndex === extractedBeat.actIndex
      ).length,
      beatId: beat.id,  // Link panel to beat
    }).returning().get();

    // Update beat with panel link
    await this.narrativeService.updateBeat(beat.id, { panelId: panel.id });

    beatsAndPanels.push({ beat: { ...beat, panelId: panel.id }, panel });
  }

  // 7. Link session to project
  await this.chatService.updateSession(sessionId, { projectId: project.id });

  return {
    project: { id: project.id, name: project.name },
    premise: { id: premise.id, logline: premise.logline },
    story: { id: story.id, structure: story.structure },
    storyboards: storyboards.map(sb => ({
      id: sb.id,
      name: sb.name,
      actIndex: sb.actIndex,
    })),
    beats: beatsAndPanels.map(bp => ({
      id: bp.beat.id,
      type: bp.beat.beatType,
      panelId: bp.panel.id,
    })),
    panels: beatsAndPanels.map(bp => ({
      id: bp.panel.id,
      beatId: bp.beat.id,
      storyboardId: bp.panel.storyboardId,
    })),
    characters: createdCharacters.map(c => ({ id: c.id, name: c.name })),
  };
}
```

---

### 5. Database Schema Update

#### `packages/core/src/db/schema.ts`

**VERIFY/ADD** bidirectional beat-panel relationship:

```typescript
// In panels table definition (~line 80):
export const panels = sqliteTable('panels', {
  id: text('id').primaryKey(),
  storyboardId: text('storyboard_id').notNull().references(() => storyboards.id, { onDelete: 'cascade' }),
  description: text('description'),
  position: integer('position').notNull().default(0),
  beatId: text('beat_id').references(() => beats.id),  // ADD if missing
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Add index for beat lookup
export const panelBeatIdx = index('panel_beat_idx').on(panels.beatId);
```

**ADD** migration if needed:

```typescript
// packages/core/src/db/migrations/add-panel-beat-link.ts
import { sql } from 'drizzle-orm';

export async function up(db: any) {
  await db.run(sql`ALTER TABLE panels ADD COLUMN beat_id TEXT REFERENCES beats(id)`);
  await db.run(sql`CREATE INDEX panel_beat_idx ON panels(beat_id)`);
}
```

---

### 6. API Routes

#### `packages/server/src/rest/routes/chat.ts`

**ADD** bootstrap endpoint (~line 150):

```typescript
// POST /chat/sessions/:id/bootstrap - Create project from chat session
chatRoutes.post('/sessions/:id/bootstrap', async (c) => {
  const { id } = c.req.param();
  const bootstrapService = c.get('projectBootstrapService');

  try {
    const result = await bootstrapService.bootstrapFromChat(id);
    return c.json(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bootstrap failed';
    return c.json({ error: { message, code: 'BOOTSTRAP_FAILED' } }, 400);
  }
});

// POST /chat/sessions/:id/regenerate-beats - Regenerate beats with different structure
chatRoutes.post('/sessions/:id/regenerate-beats', async (c) => {
  const { id } = c.req.param();
  const { structure } = await c.req.json<{ structure: 'three-act' | 'five-act' | 'hero-journey' }>();
  const chatService = c.get('chatService');

  const session = await chatService.getSession(id);
  if (!session) return c.json({ error: { message: 'Session not found' } }, 404);

  const state = session.state as ElicitationState;
  const newArc = await chatService.extractStoryArc(
    session.messages,
    state.characters,
    state.setting,
    structure
  );

  await chatService.updateSessionState(id, { arc: newArc });
  return c.json({ arc: newArc });
});

// POST /chat/sessions/:id/skip-preview - Toggle skip beats preview
chatRoutes.post('/sessions/:id/skip-preview', async (c) => {
  const { id } = c.req.param();
  const { skip } = await c.req.json<{ skip: boolean }>();
  const chatService = c.get('chatService');

  await chatService.updateSessionState(id, { skipBeatsPreview: skip });
  return c.json({ success: true });
});
```

#### `packages/server/src/rest/routes/narrative.ts`

**ADD** beat-panel link endpoints (~line 400):

```typescript
// POST /narrative/beats/:beatId/link-panel - Link beat to panel
narrativeRoutes.post('/beats/:beatId/link-panel', async (c) => {
  const { beatId } = c.req.param();
  const { panelId } = await c.req.json<{ panelId: string }>();
  const service = c.get('narrativeService');

  const result = await service.linkBeatToPanel(beatId, panelId);
  return c.json(result);
});

// DELETE /narrative/beats/:beatId/link-panel - Unlink beat from panel
narrativeRoutes.delete('/beats/:beatId/link-panel', async (c) => {
  const { beatId } = c.req.param();
  const service = c.get('narrativeService');

  await service.unlinkBeatFromPanel(beatId);
  return c.json({ success: true });
});

// GET /narrative/beats/:beatId/panel - Get panel for beat
narrativeRoutes.get('/beats/:beatId/panel', async (c) => {
  const { beatId } = c.req.param();
  const service = c.get('narrativeService');

  const panel = await service.getPanelForBeat(beatId);
  return c.json({ panel });
});
```

---

### 7. Narrative Service Updates

#### `packages/core/src/services/narrative.service.ts`

**ADD** link methods (~line 300):

```typescript
async linkBeatToPanel(beatId: string, panelId: string): Promise<{ beat: Beat; panel: Panel }> {
  // Update beat
  const beat = await this.db.update(beats)
    .set({ panelId, updatedAt: new Date().toISOString() })
    .where(eq(beats.id, beatId))
    .returning()
    .get();

  // Update panel
  const panel = await this.db.update(panels)
    .set({ beatId, updatedAt: new Date().toISOString() })
    .where(eq(panels.id, panelId))
    .returning()
    .get();

  return { beat, panel };
}

async unlinkBeatFromPanel(beatId: string): Promise<void> {
  const beat = await this.db.select().from(beats).where(eq(beats.id, beatId)).get();
  if (!beat) throw new Error('Beat not found');

  // Clear beat's panelId
  await this.db.update(beats)
    .set({ panelId: null, updatedAt: new Date().toISOString() })
    .where(eq(beats.id, beatId));

  // Clear panel's beatId if it exists
  if (beat.panelId) {
    await this.db.update(panels)
      .set({ beatId: null, updatedAt: new Date().toISOString() })
      .where(eq(panels.id, beat.panelId));
  }
}

async getPanelForBeat(beatId: string): Promise<Panel | null> {
  const beat = await this.db.select().from(beats).where(eq(beats.id, beatId)).get();
  if (!beat?.panelId) return null;

  return this.db.select().from(panels).where(eq(panels.id, beat.panelId)).get() || null;
}

async getBeatForPanel(panelId: string): Promise<Beat | null> {
  const panel = await this.db.select().from(panels).where(eq(panels.id, panelId)).get();
  if (!panel?.beatId) return null;

  return this.db.select().from(beats).where(eq(beats.id, panel.beatId)).get() || null;
}
```

---

### 8. UI Hooks

#### `packages/ui/src/api/hooks/useChat.ts`

**ADD** bootstrap mutation (~line 100):

```typescript
export function useBootstrapProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<BootstrapResult> => {
      const response = await apiClient.POST('/chat/sessions/{id}/bootstrap', {
        params: { path: { id: sessionId } },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });
}

export function useRegenerateBeats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      structure
    }: {
      sessionId: string;
      structure: 'three-act' | 'five-act' | 'hero-journey';
    }) => {
      const response = await apiClient.POST('/chat/sessions/{id}/regenerate-beats', {
        params: { path: { id: sessionId } },
        body: { structure },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
    },
  });
}
```

#### `packages/ui/src/api/hooks/useBeats.ts`

**ADD** link hooks (~line 150):

```typescript
export function useLinkBeatToPanel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ beatId, panelId }: { beatId: string; panelId: string }) => {
      const response = await apiClient.POST('/narrative/beats/{beatId}/link-panel', {
        params: { path: { beatId } },
        body: { panelId },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beats'] });
      queryClient.invalidateQueries({ queryKey: ['panels'] });
    },
  });
}

export function useUnlinkBeatFromPanel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beatId: string) => {
      const response = await apiClient.DELETE('/narrative/beats/{beatId}/link-panel', {
        params: { path: { beatId } },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beats'] });
      queryClient.invalidateQueries({ queryKey: ['panels'] });
    },
  });
}

export function useBeatForPanel(panelId: string | null) {
  return useQuery({
    queryKey: ['panel-beat', panelId],
    queryFn: async () => {
      if (!panelId) return null;
      const response = await apiClient.GET('/panels/{panelId}/beat', {
        params: { path: { panelId } },
      });
      return response.data?.beat || null;
    },
    enabled: !!panelId,
  });
}
```

---

### 9. UI Components

#### `packages/ui/src/components/chat/ChatMessage.tsx`

**ADD** beats preview UI (~line 200):

```typescript
// Add new component for beats preview
function BeatsPreview({
  arc,
  onApprove,
  onEdit,
  onRegenerate,
  onSkipToggle,
}: {
  arc: ExtractedStoryArc;
  onApprove: () => void;
  onEdit: () => void;
  onRegenerate: (structure: string) => void;
  onSkipToggle: () => void;
}) {
  return (
    <div className="beats-preview">
      <div className="preview-header">
        <h4>📖 Your Story Structure</h4>
        <span className="structure-badge">{arc.structure}</span>
      </div>

      <div className="premise-summary">
        <p className="logline">{arc.premise.logline}</p>
        <div className="tags">
          <span className="genre">{arc.premise.genre}</span>
          <span className="tone">{arc.premise.tone}</span>
          {arc.premise.themes.map(t => (
            <span key={t} className="theme">{t}</span>
          ))}
        </div>
      </div>

      <div className="acts-container">
        {arc.acts.map((actName, actIndex) => (
          <div key={actIndex} className="act-section">
            <h5>{actName}</h5>
            <div className="beats-list">
              {arc.beats
                .filter(b => b.actIndex === actIndex)
                .map((beat, i) => (
                  <div key={i} className="preview-beat">
                    <span className="beat-type">{beat.type.replace('_', ' ')}</span>
                    <p className="beat-summary">{beat.summary}</p>
                    <span className="beat-tone">{beat.emotionalTone}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="preview-actions">
        <button className="btn-primary" onClick={onApprove}>
          ✅ Create Project
        </button>
        <button className="btn-secondary" onClick={onEdit}>
          ✏️ Edit Beats
        </button>
        <div className="structure-options">
          <button onClick={() => onRegenerate('three-act')}>3-Act</button>
          <button onClick={() => onRegenerate('five-act')}>5-Act</button>
          <button onClick={() => onRegenerate('hero-journey')}>Hero's Journey</button>
        </div>
        <label className="skip-checkbox">
          <input type="checkbox" onChange={onSkipToggle} />
          Skip preview next time
        </label>
      </div>
    </div>
  );
}
```

**ADD** CSS for beats preview:

```css
/* In ChatMessage.module.css or equivalent */

.beats-preview {
  background: var(--surface-elevated);
  border-radius: 12px;
  padding: 20px;
  margin-top: 12px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.structure-badge {
  background: var(--accent);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  text-transform: uppercase;
}

.premise-summary {
  margin-bottom: 20px;
}

.logline {
  font-size: 16px;
  font-style: italic;
  margin-bottom: 8px;
}

.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tags span {
  background: var(--surface);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.acts-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.act-section h5 {
  color: var(--accent);
  margin-bottom: 8px;
  font-size: 14px;
}

.beats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-beat {
  background: var(--surface);
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid var(--accent);
}

.beat-type {
  font-weight: 600;
  text-transform: capitalize;
  color: var(--accent);
}

.beat-summary {
  margin: 4px 0;
  font-size: 14px;
}

.beat-tone {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.structure-options {
  display: flex;
  gap: 4px;
}

.structure-options button {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}

.skip-checkbox {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

#### `packages/ui/src/components/story-editor/beats/BeatCard.tsx`

**ADD** panel link indicator (~line 80):

```typescript
// In BeatCard render, add panel link section:

{/* Panel Link Indicator */}
<div className="beat-panel-link">
  {beat.panelId ? (
    <div className="panel-linked">
      <span className="link-icon">🖼️</span>
      <span>Panel linked</span>
      <button
        className="view-panel-btn"
        onClick={(e) => {
          e.stopPropagation();
          onNavigateToPanel?.(beat.panelId);
        }}
      >
        View
      </button>
      <button
        className="unlink-btn"
        onClick={(e) => {
          e.stopPropagation();
          onUnlinkPanel?.(beat.id);
        }}
      >
        Unlink
      </button>
    </div>
  ) : (
    <button
      className="create-panel-btn"
      onClick={(e) => {
        e.stopPropagation();
        onCreatePanelFromBeat?.(beat.id);
      }}
    >
      + Create Panel
    </button>
  )}
</div>
```

#### `packages/ui/src/components/panel-generator/PanelGenerator.tsx`

**ADD** linked beat context display (~line 300):

```typescript
// Add hook to get beat for panel
const { data: linkedBeat } = useBeatForPanel(panelId);

// In render, add beat context section:
{linkedBeat && (
  <div className="section linked-beat-context">
    <div className="section-title">
      Linked Story Beat
      <span className="beat-type-badge">{linkedBeat.beatType}</span>
    </div>
    <div className="beat-context-content">
      <p className="beat-visual">{linkedBeat.visualDescription}</p>
      <div className="beat-meta">
        <span className="tone">🎭 {linkedBeat.emotionalTone}</span>
        {linkedBeat.cameraAngle && (
          <span className="camera">📷 {linkedBeat.cameraAngle}</span>
        )}
      </div>
      {linkedBeat.narration && (
        <p className="beat-narration">"{linkedBeat.narration}"</p>
      )}
      <button
        className="use-beat-prompt-btn"
        onClick={() => {
          setPrompt(linkedBeat.visualDescription);
          if (linkedBeat.narration) {
            // Could also populate text sections
          }
        }}
      >
        Use Beat as Prompt
      </button>
    </div>
  </div>
)}
```

---

## Testing Plan

### Unit Tests

#### `packages/core/src/services/chat/__tests__/extraction.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../chat.service';

describe('ChatService - Extraction', () => {
  let chatService: ChatService;
  let mockTextGen: any;

  beforeEach(() => {
    mockTextGen = {
      generate: vi.fn(),
    };
    chatService = new ChatService(mockTextGen, mockDb);
  });

  describe('extractCharacters', () => {
    it('should extract characters from conversation', async () => {
      mockTextGen.generate.mockResolvedValue({
        text: JSON.stringify({
          characters: [
            { name: 'Luna', role: 'protagonist', visualDescription: 'A silver wolf' },
            { name: 'Max', role: 'supporting', visualDescription: 'A red fox' },
          ]
        })
      });

      const messages = [
        { role: 'user', content: 'Luna is a lone wolf who meets Max, a friendly fox' },
      ];

      const result = await chatService.extractCharacters(messages);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Luna');
      expect(result[0].role).toBe('protagonist');
    });

    it('should fallback to regex extraction on parse failure', async () => {
      mockTextGen.generate.mockResolvedValue({ text: 'invalid json' });

      const messages = [
        { role: 'user', content: 'Luna is a wolf and Max is a fox' },
      ];

      const result = await chatService.extractCharacters(messages);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(c => c.name === 'Luna')).toBe(true);
    });
  });

  describe('extractStoryArc', () => {
    it('should extract complete story arc with beats', async () => {
      mockTextGen.generate.mockResolvedValue({
        text: JSON.stringify({
          premise: {
            logline: 'A lone wolf finds friendship',
            genre: 'adventure',
            tone: 'hopeful',
            themes: ['friendship'],
          },
          structure: 'three-act',
          acts: ['Setup', 'Confrontation', 'Resolution'],
          beats: [
            { type: 'setup', actIndex: 0, summary: 'Wolf alone', visualDescription: 'desc', emotionalTone: 'lonely', involvedCharacters: ['Luna'] },
          ]
        })
      });

      const characters = [{ name: 'Luna', role: 'protagonist' }];
      const result = await chatService.extractStoryArc([], characters, null, 'three-act');

      expect(result.premise.logline).toBe('A lone wolf finds friendship');
      expect(result.beats).toHaveLength(1);
      expect(result.beats[0].type).toBe('setup');
    });

    it('should generate correct number of beats for structure', async () => {
      // Test that three-act generates 8 beats, five-act generates 10, etc.
    });
  });
});
```

#### `packages/core/src/services/__tests__/project-bootstrap.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectBootstrapService } from '../project-bootstrap.service';

describe('ProjectBootstrapService', () => {
  let service: ProjectBootstrapService;

  describe('bootstrapFromChat', () => {
    it('should create complete project structure from chat session', async () => {
      const session = createMockSession({
        state: {
          phase: 'complete',
          characters: [{ name: 'Luna', role: 'protagonist' }],
          arc: {
            premise: { logline: 'Test', genre: 'adventure', tone: 'hopeful', themes: [] },
            structure: 'three-act',
            acts: ['Act 1', 'Act 2', 'Act 3'],
            beats: [
              { type: 'setup', actIndex: 0, summary: 'Start', visualDescription: 'desc', emotionalTone: 'calm', involvedCharacters: ['Luna'] },
            ]
          }
        }
      });

      const result = await service.bootstrapFromChat(session.id);

      expect(result.project).toBeDefined();
      expect(result.premise).toBeDefined();
      expect(result.story).toBeDefined();
      expect(result.storyboards).toHaveLength(3); // One per act
      expect(result.beats).toHaveLength(1);
      expect(result.panels).toHaveLength(1);
      expect(result.beats[0].panelId).toBe(result.panels[0].id);
      expect(result.panels[0].beatId).toBe(result.beats[0].id);
    });

    it('should create one storyboard per act', async () => {
      const session = createMockSession({
        state: {
          arc: {
            structure: 'five-act',
            acts: ['Act 1', 'Act 2', 'Act 3', 'Act 4', 'Act 5'],
            beats: [],
          }
        }
      });

      const result = await service.bootstrapFromChat(session.id);

      expect(result.storyboards).toHaveLength(5);
    });

    it('should link beats to panels bidirectionally', async () => {
      // Test that beat.panelId and panel.beatId are both set
    });

    it('should assign beats to correct storyboards by act', async () => {
      // Test that act 1 beats go to storyboard 1, etc.
    });
  });
});
```

#### `packages/core/src/services/__tests__/narrative.test.ts`

```typescript
describe('NarrativeService - Beat-Panel Linking', () => {
  describe('linkBeatToPanel', () => {
    it('should create bidirectional link', async () => {
      const beat = await service.createBeat({ storyId, beatType: 'setup', visualDescription: 'test' });
      const panel = await createPanel({ storyboardId });

      const result = await service.linkBeatToPanel(beat.id, panel.id);

      expect(result.beat.panelId).toBe(panel.id);
      expect(result.panel.beatId).toBe(beat.id);
    });

    it('should throw if beat already linked', async () => {
      // Test error handling
    });
  });

  describe('unlinkBeatFromPanel', () => {
    it('should clear both sides of relationship', async () => {
      const { beat, panel } = await service.linkBeatToPanel(beatId, panelId);

      await service.unlinkBeatFromPanel(beat.id);

      const updatedBeat = await service.getBeat(beat.id);
      const updatedPanel = await service.getPanel(panel.id);

      expect(updatedBeat.panelId).toBeNull();
      expect(updatedPanel.beatId).toBeNull();
    });
  });
});
```

### Integration Tests

#### `packages/ui/src/api/hooks/__tests__/useChat.test.tsx`

```typescript
describe('useBootstrapProject', () => {
  it('should create project and return complete structure', async () => {
    server.use(
      rest.post('/api/chat/sessions/:id/bootstrap', (req, res, ctx) => {
        return res(ctx.json({
          project: { id: 'proj-1', name: 'Test' },
          premise: { id: 'prem-1', logline: 'Test story' },
          story: { id: 'story-1', structure: 'three-act' },
          storyboards: [{ id: 'sb-1', name: 'Act 1', actIndex: 0 }],
          beats: [{ id: 'beat-1', type: 'setup', panelId: 'panel-1' }],
          panels: [{ id: 'panel-1', beatId: 'beat-1', storyboardId: 'sb-1' }],
          characters: [{ id: 'char-1', name: 'Luna' }],
        }));
      })
    );

    const { result } = renderHook(() => useBootstrapProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('session-1');
    });

    expect(result.current.data.beats[0].panelId).toBe('panel-1');
  });

  it('should invalidate queries on success', async () => {
    // Test cache invalidation
  });
});
```

### E2E Tests

#### `packages/ui/e2e/specs/flow-15-chat-to-generation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3002/api';
const UI_BASE = 'http://localhost:5173';

test.describe('Flow 15: Complete Chat-Driven Creation', () => {
  test.describe.configure({ mode: 'serial' });

  let sessionId: string;
  let projectId: string;

  test('Step 1: Open chat and describe story concept', async ({ page }) => {
    await page.goto(UI_BASE);

    // Click on chat input or "Start with AI" button
    const chatTrigger = page.getByText(/describe your story|start with ai/i);
    await chatTrigger.click();

    // Wait for chat panel
    await page.waitForSelector('[data-testid="chat-panel"]');

    // Send initial message
    const input = page.getByPlaceholder(/describe|tell me/i);
    await input.fill('A story about a lone wolf named Luna who finds an unlikely friend in a snowy forest');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.getByText(/tell me about.*characters/i)).toBeVisible({ timeout: 30000 });
  });

  test('Step 2: Answer character questions', async ({ page }) => {
    const input = page.getByPlaceholder(/type.*message/i);
    await input.fill('Luna is a silver wolf, independent but lonely. She meets Max, a curious red fox who is always cheerful.');
    await input.press('Enter');

    await expect(page.getByText(/where.*take place|setting/i)).toBeVisible({ timeout: 30000 });
  });

  test('Step 3: Answer setting questions', async ({ page }) => {
    const input = page.getByPlaceholder(/type.*message/i);
    await input.fill('A vast snowy forest in winter, with frozen lakes and ancient pine trees');
    await input.press('Enter');

    await expect(page.getByText(/conflict|story.*about/i)).toBeVisible({ timeout: 30000 });
  });

  test('Step 4: Answer story arc questions', async ({ page }) => {
    const input = page.getByPlaceholder(/type.*message/i);
    await input.fill('Luna starts alone and suspicious. When a blizzard hits, Max helps her survive. Through their journey, Luna learns to trust and they become friends.');
    await input.press('Enter');

    await expect(page.getByText(/style|visual/i)).toBeVisible({ timeout: 30000 });
  });

  test('Step 5: Answer style questions', async ({ page }) => {
    const input = page.getByPlaceholder(/type.*message/i);
    await input.fill('Manga style with soft watercolors, warm tones despite the cold setting');
    await input.press('Enter');

    await expect(page.getByText(/pages|length/i)).toBeVisible({ timeout: 30000 });
  });

  test('Step 6: Answer scope questions', async ({ page }) => {
    const input = page.getByPlaceholder(/type.*message/i);
    await input.fill('8 pages');
    await input.press('Enter');

    // Should see beats preview or create button
    await expect(
      page.getByText(/story structure|create project/i)
    ).toBeVisible({ timeout: 30000 });
  });

  test('Step 7: Verify beats preview shows correct structure', async ({ page }) => {
    // Look for beats preview
    const beatsPreview = page.locator('.beats-preview');

    if (await beatsPreview.isVisible()) {
      // Verify structure elements
      await expect(beatsPreview.getByText(/setup/i)).toBeVisible();
      await expect(beatsPreview.getByText(/climax/i)).toBeVisible();
      await expect(beatsPreview.getByText(/resolution/i)).toBeVisible();

      // Verify acts
      await expect(beatsPreview.getByText(/act 1|setup/i)).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'e2e/screenshots/flow15-beats-preview.png' });
    }
  });

  test('Step 8: Create project from chat', async ({ page }) => {
    // Click create button
    const createBtn = page.getByRole('button', { name: /create project/i });
    await createBtn.click();

    // Wait for navigation to project
    await page.waitForURL(/\/projects\//);

    // Extract project ID from URL
    projectId = page.url().split('/projects/')[1]?.split(/[?/]/)[0];
    expect(projectId).toBeTruthy();

    await page.screenshot({ path: 'e2e/screenshots/flow15-project-created.png' });
  });

  test('Step 9: Verify project has premise, story, beats', async ({ page }) => {
    // Should be on story editor by default
    await expect(page.getByText(/lone wolf/i)).toBeVisible();

    // Verify premise exists
    const premiseSection = page.locator('.premise-card, [data-testid="premise"]');
    await expect(premiseSection).toBeVisible();

    // Verify beats exist
    const beatCards = page.locator('.beat-card, [data-testid^="beat-"]');
    const beatCount = await beatCards.count();
    expect(beatCount).toBeGreaterThanOrEqual(5); // Standard structure has 5-9 beats
  });

  test('Step 10: Verify storyboards created per act', async ({ page }) => {
    // Navigate to storyboard view
    await page.click('text=Storyboard');

    // Should see multiple storyboards (one per act)
    const storyboardTabs = page.locator('.storyboard-tab, [data-testid^="storyboard-"]');
    const tabCount = await storyboardTabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(3); // At least 3 acts
  });

  test('Step 11: Verify beats linked to panels', async ({ page }) => {
    // Navigate to a panel
    const firstPanel = page.locator('.panel-card, [data-testid^="panel-"]').first();
    await firstPanel.click();

    // Should see linked beat context
    await expect(
      page.getByText(/linked.*beat|story beat/i)
    ).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/flow15-panel-beat-linked.png' });
  });

  test('Step 12: Verify beat-to-panel navigation works', async ({ page }) => {
    // Go back to story editor
    await page.click('text=Story Editor');

    // Find a beat with panel link
    const beatWithPanel = page.locator('.beat-card:has(.panel-linked)').first();

    if (await beatWithPanel.isVisible()) {
      // Click "View Panel" button
      await beatWithPanel.locator('button:has-text("View")').click();

      // Should navigate to panel generator
      await expect(page.locator('.panel-generator, [data-testid="panel-generator"]')).toBeVisible();
    }
  });

  test('Step 13: Generate image from beat (if ComfyUI available)', async ({ page, request }) => {
    // Check if ComfyUI is available
    const healthCheck = await request.get('http://localhost:3001/health').catch(() => null);

    if (healthCheck?.ok()) {
      // Click generate
      const generateBtn = page.getByRole('button', { name: /generate/i });
      await generateBtn.click();

      // Wait for generation (with timeout)
      await expect(
        page.locator('.generation-result, [data-testid="generation-image"]')
      ).toBeVisible({ timeout: 60000 });

      await page.screenshot({ path: 'e2e/screenshots/flow15-generated-image.png' });
    } else {
      console.log('Skipping image generation - ComfyUI not available');
    }
  });
});
```

#### `packages/ui/e2e/specs/flow-15-edge-cases.spec.ts`

```typescript
test.describe('Flow 15: Edge Cases', () => {
  test('should handle LLM extraction failure gracefully', async ({ page }) => {
    // Mock LLM to return invalid JSON
    // Verify fallback extraction works
  });

  test('should allow regenerating beats with different structure', async ({ page }) => {
    // Get to beats preview
    // Click "5-Act" button
    // Verify beats regenerated with 5-act structure
  });

  test('should skip beats preview when checkbox is checked', async ({ page }) => {
    // Check "Skip preview" checkbox
    // Complete flow
    // Verify goes directly to project creation
  });

  test('should handle empty character extraction', async ({ page }) => {
    // Provide vague character description
    // Verify system handles gracefully
  });

  test('should allow editing beats before creation', async ({ page }) => {
    // Click "Edit Beats" in preview
    // Modify a beat
    // Create project
    // Verify modified beat is saved
  });
});
```

### API Tests

#### `packages/server/src/rest/routes/__tests__/chat.test.ts`

```typescript
describe('POST /chat/sessions/:id/bootstrap', () => {
  it('should create complete project structure', async () => {
    // Create session with complete state
    const session = await createTestSession({
      state: {
        phase: 'complete',
        characters: [...],
        arc: {...},
      }
    });

    const response = await app.request(`/api/chat/sessions/${session.id}/bootstrap`, {
      method: 'POST',
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.project).toBeDefined();
    expect(data.storyboards).toHaveLength(3);
    expect(data.beats.every(b => b.panelId)).toBe(true);
    expect(data.panels.every(p => p.beatId)).toBe(true);
  });

  it('should return 400 if arc not extracted', async () => {
    const session = await createTestSession({
      state: { phase: 'characters' }
    });

    const response = await app.request(`/api/chat/sessions/${session.id}/bootstrap`, {
      method: 'POST',
    });

    expect(response.status).toBe(400);
  });
});

describe('POST /chat/sessions/:id/regenerate-beats', () => {
  it('should regenerate beats with new structure', async () => {
    const session = await createTestSession({
      state: { arc: { structure: 'three-act', beats: [...] } }
    });

    const response = await app.request(`/api/chat/sessions/${session.id}/regenerate-beats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structure: 'five-act' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.arc.structure).toBe('five-act');
    expect(data.arc.acts).toHaveLength(5);
  });
});
```

---

## Implementation Checklist

### Phase 1: Enhanced Extraction (2-3 days)
- [ ] Add extraction types to `chat.types.ts`
- [ ] Add extraction prompts to `prompts.ts`
- [ ] Implement `extractCharacters()` in `chat.service.ts`
- [ ] Implement `extractSetting()` in `chat.service.ts`
- [ ] Implement `extractStoryArc()` in `chat.service.ts`
- [ ] Add unit tests for extraction methods
- [ ] Test with various story descriptions

### Phase 2: Auto-Generation Pipeline (2-3 days)
- [ ] Update `bootstrapFromChat()` in `project-bootstrap.service.ts`
- [ ] Add beat-panel linking in bootstrap
- [ ] Create one storyboard per act
- [ ] Add `beats_preview` phase logic
- [ ] Add unit tests for bootstrap
- [ ] Add integration tests

### Phase 3: API & Hooks (1-2 days)
- [ ] Add `/bootstrap` endpoint to chat routes
- [ ] Add `/regenerate-beats` endpoint
- [ ] Add beat-panel link endpoints to narrative routes
- [ ] Add `useBootstrapProject` hook
- [ ] Add `useRegenerateBeats` hook
- [ ] Add `useLinkBeatToPanel` hook
- [ ] Add API tests

### Phase 4: UI Updates (2-3 days)
- [ ] Add `BeatsPreview` component to ChatMessage
- [ ] Add beats preview CSS
- [ ] Update BeatCard with panel link indicator
- [ ] Update PanelGenerator with linked beat context
- [ ] Add E2E tests for complete flow

### Phase 5: Polish & Testing (1-2 days)
- [ ] Run full E2E test suite
- [ ] Fix edge cases
- [ ] Add error handling UI
- [ ] Performance optimization
- [ ] Documentation

---

## Success Metrics

1. **Time to project**: User goes from chat → complete project in < 3 minutes
2. **Beat coverage**: Generated beats cover full narrative arc (5-9 beats)
3. **Link integrity**: 100% of beats have linked panels on creation
4. **Extraction accuracy**: > 90% character names extracted correctly
5. **Structure fidelity**: Beats match requested story structure (3-act, 5-act, hero's journey)
