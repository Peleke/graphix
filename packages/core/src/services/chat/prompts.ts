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

export function getNextPhase(currentPhase: ElicitationPhase): ElicitationPhase {
  const phaseOrder: ElicitationPhase[] = [
    'greeting',
    'characters',
    'setting',
    'arc',
    'style',
    'scope',
    'confirmation',
    'complete'
  ];
  
  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex < phaseOrder.length - 1) {
    return phaseOrder[currentIndex + 1];
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
