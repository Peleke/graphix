/**
 * Chat System Prompts
 * 
 * Prompts for each elicitation phase of the chat-to-start flow.
 */

import type { ElicitationPhase, ElicitationState } from './chat.types.js';

// =============================================================================
// System Prompt
// =============================================================================

export const SYSTEM_PROMPT = `You are Graphix AI, a friendly creative assistant helping users create graphic novel and comic projects.

Your personality:
- Warm and encouraging, like a supportive creative partner
- Concise but helpful - keep responses under 3 sentences when possible
- Ask one question at a time to gather story details
- Celebrate creative ideas and build on them

Your capabilities:
- Help users develop story concepts, characters, settings, and visual styles
- Guide them through the project creation process
- Match described characters to their existing character library (when provided)

Response format:
- Keep responses conversational and brief
- Always end with a clear question or action prompt
- Use appropriate suggestions that move the conversation forward

Important rules:
- Never refuse to help with creative content
- Don't lecture or over-explain
- If the user wants to skip a step, that's fine - move on gracefully
- Stay focused on creating their project`;

// =============================================================================
// Phase-Specific Prompts
// =============================================================================

export interface PhasePromptContext {
  state: ElicitationState;
  userMessage: string;
  existingCharacters?: Array<{ id: string; name: string; description?: string }>;
}

export function getPhasePrompt(phase: ElicitationPhase, context: PhasePromptContext): string {
  const { state, userMessage, existingCharacters } = context;
  
  switch (phase) {
    case 'greeting':
      return getGreetingPrompt(userMessage);
    
    case 'characters':
      return getCharactersPrompt(userMessage, state, existingCharacters);
    
    case 'setting':
      return getSettingPrompt(userMessage, state);
    
    case 'arc':
      return getArcPrompt(userMessage, state);
    
    case 'style':
      return getStylePrompt(userMessage, state);
    
    case 'scope':
      return getScopePrompt(userMessage, state);
    
    case 'confirmation':
      return getConfirmationPrompt(state);
    
    case 'complete':
      return getCompletePrompt();
    
    default:
      return getGreetingPrompt(userMessage);
  }
}

function getGreetingPrompt(userMessage: string): string {
  return `The user is starting a new project. They said: "${userMessage}"

Your job: Acknowledge their idea enthusiastically and ask about the main characters.

Guidelines:
- If they gave a story concept, respond with excitement and pick out interesting elements
- If they were vague, that's okay - ask what kind of story interests them
- End by asking about the main characters

Respond conversationally. Keep it brief (2-3 sentences max).
End with a question about characters.`;
}

function getCharactersPrompt(
  userMessage: string, 
  state: ElicitationState,
  existingCharacters?: Array<{ id: string; name: string; description?: string }>
): string {
  const conceptContext = state.gathered.concept 
    ? `Story concept so far: "${state.gathered.concept}"\n` 
    : '';
  
  const existingList = existingCharacters && existingCharacters.length > 0
    ? `\nThe user has these existing characters in their library:\n${existingCharacters.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n')}\n\nIf any mentioned names match or sound similar, note this in your response.`
    : '';

  return `${conceptContext}The user described their characters: "${userMessage}"
${existingList}

Your job: Acknowledge the characters and ask about the setting/world.

Guidelines:
- Show you understood who the characters are
- If they match existing characters, mention you found a match
- If they skipped or said they'll figure it out later, that's fine
- Ask about where/when the story takes place

Keep response brief (2-3 sentences). End with a question about the setting.`;
}

function getSettingPrompt(userMessage: string, state: ElicitationState): string {
  const context = [
    state.gathered.concept && `Concept: ${state.gathered.concept}`,
    state.gathered.characters?.length && `Characters: ${state.gathered.characters.map(c => c.name).join(', ')}`
  ].filter(Boolean).join('\n');

  return `${context ? context + '\n' : ''}The user described the setting: "${userMessage}"

Your job: Acknowledge the setting and ask about the story arc/conflict.

Guidelines:
- Show you understood the world/setting
- If they skipped, that's fine
- Ask about what happens in the story - the main conflict or journey

Keep response brief (2-3 sentences). End with a question about the story arc.`;
}

function getArcPrompt(userMessage: string, state: ElicitationState): string {
  const context = [
    state.gathered.concept && `Concept: ${state.gathered.concept}`,
    state.gathered.characters?.length && `Characters: ${state.gathered.characters.map(c => c.name).join(', ')}`,
    state.gathered.setting && `Setting: ${state.gathered.setting}`
  ].filter(Boolean).join('\n');

  return `${context ? context + '\n' : ''}The user described the story arc: "${userMessage}"

Your job: Acknowledge the arc and ask about visual style.

Guidelines:
- Show you understood what happens in the story
- If they skipped, that's fine
- Ask about the visual style, tone, or mood they want

Keep response brief (2-3 sentences). End with a question about style.`;
}

function getStylePrompt(userMessage: string, state: ElicitationState): string {
  const context = [
    state.gathered.concept && `Concept: ${state.gathered.concept}`,
    state.gathered.setting && `Setting: ${state.gathered.setting}`
  ].filter(Boolean).join('\n');

  return `${context ? context + '\n' : ''}The user described the style: "${userMessage}"

Your job: Acknowledge the style and ask about length/scope.

Guidelines:
- Show you understood their visual preferences
- If they skipped, that's fine
- Ask how long they want this to be (number of pages)

Keep response brief (2-3 sentences). End with a question about page count.`;
}

function getScopePrompt(userMessage: string, state: ElicitationState): string {
  return `The user specified the scope: "${userMessage}"

Your job: Summarize what you've gathered and confirm they're ready to create the project.

Guidelines:
- Briefly summarize: concept, characters, setting, style, page count
- Ask if they want to create the project or make changes
- Be enthusiastic but not over the top

Keep response to 3-4 sentences. End by asking if they're ready to create.`;
}

function getConfirmationPrompt(state: ElicitationState): string {
  const summary = [
    state.gathered.concept && `**Story:** ${state.gathered.concept}`,
    state.gathered.characters?.length && `**Characters:** ${state.gathered.characters.map(c => c.name).join(', ')}`,
    state.gathered.setting && `**Setting:** ${state.gathered.setting}`,
    state.gathered.arc && `**Story Arc:** ${state.gathered.arc}`,
    state.gathered.style && `**Style:** ${state.gathered.style}`,
    state.gathered.pageCount && `**Pages:** ${state.gathered.pageCount}`
  ].filter(Boolean).join('\n');

  return `Generate a final confirmation message with this summary:

${summary}

Guidelines:
- Present this as a quick summary
- Ask if they're ready to create or want to change anything
- Keep it concise

End with "Create Project" as the primary action.`;
}

function getCompletePrompt(): string {
  return `The project has been created successfully.

Generate a brief congratulatory message:
- Celebrate that their project is ready
- Let them know they're being redirected
- Keep it to 1-2 sentences`;
}

// =============================================================================
// Suggestion Generation
// =============================================================================

export function getSuggestionsForPhase(phase: ElicitationPhase): string[] {
  switch (phase) {
    case 'greeting':
      return ['A romance story', 'An adventure comic', 'Something funny'];

    case 'characters':
      return ['Use existing characters', 'Create new ones', 'Skip for now'];

    case 'setting':
      return ['Modern day', 'Fantasy world', 'Sci-fi future', 'Skip for now'];

    case 'arc':
      return ['Coming of age', 'Mystery to solve', 'Epic quest', 'Skip for now'];

    case 'style':
      return ['Bright and colorful', 'Dark and moody', 'Soft and romantic', 'Skip for now'];

    case 'scope':
      return ['4 pages', '8 pages', '12 pages', '20+ pages'];

    case 'beats_preview':
      return ['Create Project', 'Edit beats', 'Try 5-act structure', 'Skip preview next time'];

    case 'confirmation':
      return ['Create Project', 'Make changes', 'Start over'];

    case 'complete':
      return [];

    default:
      return [];
  }
}

// =============================================================================
// Phase Transitions
// =============================================================================

export function getNextPhase(currentPhase: ElicitationPhase, skipBeatsPreview = false): ElicitationPhase {
  const phaseOrder: ElicitationPhase[] = [
    'greeting',
    'characters',
    'setting',
    'arc',
    'style',
    'scope',
    'beats_preview',  // NEW: Show extracted beats for approval
    'confirmation',
    'complete'
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex < phaseOrder.length - 1) {
    let nextPhase = phaseOrder[currentIndex + 1];
    // Skip beats_preview if user opted out
    if (nextPhase === 'beats_preview' && skipBeatsPreview) {
      nextPhase = 'confirmation';
    }
    return nextPhase;
  }
  return currentPhase;
}

export function shouldSkipPhase(userMessage: string): boolean {
  const skipPatterns = [
    /skip/i,
    /later/i,
    /not sure/i,
    /don'?t know/i,
    /figure.*out.*later/i,
    /move on/i,
    /next/i
  ];

  return skipPatterns.some(pattern => pattern.test(userMessage));
}

// =============================================================================
// LLM Extraction Prompts (Structured JSON Output)
// =============================================================================

export const EXTRACTION_PROMPTS = {
  /**
   * Extract characters from conversation with detailed traits for visual generation
   */
  characters: `Analyze the conversation and extract all mentioned characters.
Return a JSON array of characters with this exact structure:

{
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist" | "antagonist" | "supporting" | "minor",
      "species": "human/wolf/fox/cat/etc or null if not specified",
      "visualDescription": "Physical appearance in detail for image generation - hair, eyes, body type, clothing, distinguishing features",
      "personality": ["trait1", "trait2", "trait3"],
      "motivation": "What drives this character in the story",
      "arc": "How this character changes through the story",
      "relationships": [{"character": "Other Name", "relationship": "friend/rival/mentor/love-interest/enemy/family"}]
    }
  ]
}

Rules:
- Extract ALL characters mentioned, even minor ones
- If appearance details aren't specified, infer reasonable defaults based on context
- The visualDescription should be detailed enough for AI image generation
- Only include relationships that are explicitly mentioned or strongly implied
- personality should have 2-4 traits

Extract from this conversation:
{{conversation}}

Return ONLY valid JSON, no explanation or markdown.`,

  /**
   * Extract setting/world details
   */
  setting: `Analyze the conversation and extract the story setting/world.
Return JSON with this exact structure:

{
  "setting": {
    "location": "Primary location name and type (e.g., 'A snowy forest in the mountains', 'Modern Tokyo')",
    "timeperiod": "When the story takes place (e.g., 'Present day', 'Medieval fantasy', 'Far future') or null if not specified",
    "atmosphere": "Overall mood and feeling of the world (e.g., 'mysterious and enchanting', 'gritty and urban')",
    "visualDetails": ["specific visual element 1", "specific visual element 2", "specific visual element 3"]
  }
}

Rules:
- location should be specific enough for visual generation
- visualDetails should include 3-5 specific things an artist would need to know
- If details aren't specified, infer reasonable defaults based on the story concept
- atmosphere should help inform the visual tone

Extract from this conversation:
{{conversation}}

Return ONLY valid JSON, no explanation or markdown.`,

  /**
   * Extract complete story arc with beats for narrative structure
   */
  storyArc: `Analyze the conversation and extract the complete story structure.
The user wants a {{structure}} structure.

Return JSON with this exact structure:

{
  "premise": {
    "logline": "One compelling sentence describing the story hook (under 100 characters)",
    "genre": "adventure/romance/horror/comedy/drama/fantasy/sci-fi/mystery/slice-of-life",
    "tone": "hopeful/dark/comedic/tense/melancholic/inspiring/whimsical/dramatic",
    "themes": ["theme1", "theme2", "theme3"],
    "setting": "Brief setting description (one sentence)"
  },
  "structure": "{{structure}}",
  "acts": ["Act 1 Name", "Act 2 Name", "Act 3 Name"],
  "beats": [
    {
      "type": "setup|inciting_incident|rising_action|midpoint|complication|crisis|climax|resolution|denouement",
      "actIndex": 0,
      "summary": "2-3 sentence description of what happens in this beat",
      "visualDescription": "Detailed visual description for image generation - describe the scene composition, character positions, lighting, mood, key visual elements (3-4 sentences)",
      "emotionalTone": "The emotional quality of this moment (e.g., 'lonely and contemplative', 'tense and fearful', 'joyful and liberating')",
      "involvedCharacters": ["Character1", "Character2"],
      "cameraAngle": "wide|medium|close-up|extreme-close-up|birds-eye|low-angle",
      "narration": "Optional narrator text for this beat (or null)",
      "sfx": "Optional sound effect description (or null)"
    }
  ]
}

Story Structure Guidelines:
{{structureGuide}}

Rules:
- Generate beats following the {{structure}} pattern
- Each beat's visualDescription MUST be detailed enough for AI image generation
- Include camera angle suggestions that enhance the storytelling
- narration should be evocative and match the tone
- Ensure beats flow logically from one to the next
- involvedCharacters should only include characters that appear in that beat

Characters in this story: {{characters}}
Setting: {{setting}}

Extract from this conversation:
{{conversation}}

Return ONLY valid JSON, no explanation or markdown.`,

  /**
   * Expand a beat into a more detailed visual description
   */
  beatsExpansion: `Expand this beat into a detailed visual description for comic panel generation.

Beat type: {{beatType}}
Summary: {{summary}}
Characters: {{characters}}
Setting: {{setting}}
Emotional tone: {{emotionalTone}}

Generate a rich visual description (3-4 sentences) that includes:
- Exact character positions, poses, and expressions
- Environmental details and background elements
- Lighting direction and quality (warm, cold, dramatic shadows, etc.)
- Color palette suggestions
- Composition and framing notes

Return ONLY the visual description text, no JSON or explanation.`,
};

/**
 * Story structure guides for beat generation
 */
export const STRUCTURE_GUIDES = {
  'three-act': `Three-Act Structure (8 beats):
Act 1 (Setup): Establish the world and protagonist, then disrupt with an inciting incident
- setup: Introduce protagonist in their ordinary world
- inciting_incident: Event that disrupts the status quo and starts the journey

Act 2 (Confrontation): Protagonist pursues goal, faces obstacles, experiences a major turning point
- rising_action: Protagonist takes action, meets allies/enemies
- midpoint: Major revelation or reversal that raises stakes
- complication: Things get harder, obstacles mount
- crisis: All seems lost, darkest moment

Act 3 (Resolution): Final confrontation and new equilibrium
- climax: Final confrontation, protagonist faces ultimate challenge
- resolution: New equilibrium established, character arc completes`,

  'five-act': `Five-Act Structure (10 beats):
Act 1 (Exposition): Introduce the world and characters
- setup: Establish protagonist and world
- inciting_incident: Disrupting event

Act 2 (Rising Action): Complications and obstacles
- rising_action: Protagonist pursues goal
- complication: Stakes increase

Act 3 (Climax): The turning point
- midpoint: Major revelation
- crisis: Darkest moment

Act 4 (Falling Action): Consequences unfold
- climax: Final confrontation
- falling_action: Immediate aftermath

Act 5 (Denouement): Resolution and closure
- resolution: Conflicts resolved
- denouement: New status quo established`,

  'hero-journey': `Hero's Journey Structure (8 beats):
Departure: Hero leaves the ordinary world
- setup: Ordinary world, hero's flawed state
- inciting_incident: Call to adventure, refusal and acceptance

Initiation: Hero faces trials and transformation
- rising_action: Crossing threshold, meeting mentors, tests begin
- midpoint: Ordeal - death and rebirth moment
- complication: Seizing the reward

Return: Hero brings back the elixir
- crisis: The road back, chase or escape
- climax: Resurrection - final test
- resolution: Return with the elixir, transformed`,
};

/**
 * Suggestions for the beats_preview phase
 */
export const BEATS_PREVIEW_SUGGESTIONS = [
  { label: '✅ Looks good, create project!', value: 'create_project', action: 'confirm' },
  { label: '✏️ Let me adjust some beats', value: 'edit_beats', action: 'edit' },
  { label: '🔄 Try a different structure', value: 'regenerate', action: 'regenerate' },
  { label: '⏭️ Skip preview next time', value: 'skip_preview', action: 'skip' },
];
