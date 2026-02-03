/**
 * Chat Service
 * 
 * Orchestrates AI-guided project creation via chat interface.
 * Manages elicitation state, generates responses, and handles streaming.
 */

import { createTextGenerationService, type TextGenerationService } from '../text-generation.service.js';
import type {
  ElicitationPhase,
  ElicitationState,
  ChatMessage,
  ChatMessageMetadata,
  CharacterDraft,
  ProjectBootstrap,
  ChatServiceConfig,
  StreamChunk,
  ExtractedCharacter,
  ExtractedSetting,
  ExtractedStoryArc,
  StoryStructure,
} from './chat.types.js';
import { DEFAULT_CHAT_CONFIG } from './chat.types.js';
import {
  SYSTEM_PROMPT,
  getPhasePrompt,
  getSuggestionsForPhase,
  getNextPhase,
  shouldSkipPhase,
  EXTRACTION_PROMPTS,
  STRUCTURE_GUIDES,
} from './prompts.js';

// =============================================================================
// Chat Service
// =============================================================================

export class ChatService {
  private textService: TextGenerationService;
  private config: ChatServiceConfig;

  constructor(config?: Partial<ChatServiceConfig>) {
    this.config = { ...DEFAULT_CHAT_CONFIG, ...config };
    this.textService = createTextGenerationService();
  }

  // ===========================================================================
  // State Management
  // ===========================================================================

  /**
   * Create initial elicitation state for a new session.
   */
  createInitialState(): ElicitationState {
    return {
      phase: 'greeting',
      gathered: {},
      skipped: [],
    };
  }

  /**
   * Update state based on user message and current phase.
   */
  updateState(state: ElicitationState, userMessage: string): ElicitationState {
    const { phase, gathered, skipped } = state;
    const isSkipping = shouldSkipPhase(userMessage);
    
    // Update gathered data based on current phase
    const newGathered = isSkipping 
      ? gathered 
      : this.extractDataForPhase(phase, userMessage, gathered);
    
    // Track skipped phases
    const newSkipped = isSkipping ? [...skipped, phase] : skipped;
    
    // Move to next phase
    const nextPhase = getNextPhase(phase);
    
    return {
      phase: nextPhase,
      gathered: newGathered,
      skipped: newSkipped,
    };
  }

  /**
   * Extract relevant data from user message based on current phase.
   */
  private extractDataForPhase(
    phase: ElicitationPhase,
    userMessage: string,
    currentGathered: ElicitationState['gathered']
  ): ElicitationState['gathered'] {
    switch (phase) {
      case 'greeting':
        return { ...currentGathered, concept: userMessage };
      
      case 'characters':
        const characters = this.parseCharacters(userMessage);
        return { ...currentGathered, characters };
      
      case 'setting':
        return { ...currentGathered, setting: userMessage };
      
      case 'arc':
        return { ...currentGathered, arc: userMessage };
      
      case 'style':
        return { ...currentGathered, style: userMessage };
      
      case 'scope':
        const pageCount = this.parsePageCount(userMessage);
        return { ...currentGathered, pageCount };
      
      default:
        return currentGathered;
    }
  }

  /**
   * Parse character names/descriptions from user message.
   */
  private parseCharacters(message: string): CharacterDraft[] {
    // Simple parsing - extract names mentioned
    // In a real implementation, this would use NLP or the LLM
    const words = message.split(/[\s,]+/);
    const potentialNames = words.filter(w => 
      w.length > 2 && 
      /^[A-Z]/.test(w) && 
      !['The', 'And', 'But', 'For', 'Not', 'Yes', 'Skip'].includes(w)
    );
    
    if (potentialNames.length === 0) {
      return [{ name: 'Main Character', description: message }];
    }
    
    return potentialNames.slice(0, 5).map(name => ({
      name: name.trim(),
      description: undefined,
    }));
  }

  /**
   * Parse page count from user message.
   */
  private parsePageCount(message: string): number {
    const match = message.match(/(\d+)/);
    if (match) {
      const count = parseInt(match[1], 10);
      return Math.min(Math.max(count, 1), 100); // Clamp 1-100
    }
    return this.config.defaultPageCount;
  }

  // ===========================================================================
  // LLM-Powered Extraction Methods
  // ===========================================================================

  /**
   * Extract characters from conversation using LLM for semantic understanding.
   */
  async extractCharacters(conversationText: string): Promise<ExtractedCharacter[]> {
    const prompt = EXTRACTION_PROMPTS.characters.replace('{{conversation}}', conversationText);

    try {
      const result = await this.textService.generate(prompt, {
        temperature: 0.3, // Low temp for structured output
        maxTokens: 2000,
      });

      const parsed = JSON.parse(result.text);
      return parsed.characters || [];
    } catch (error) {
      console.error('Failed to parse character extraction:', error);
      // Fallback to simple extraction
      return this.fallbackCharacterExtraction(conversationText);
    }
  }

  /**
   * Fallback character extraction using regex when LLM fails.
   */
  private fallbackCharacterExtraction(text: string): ExtractedCharacter[] {
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
    const excludeWords = ['The', 'And', 'But', 'For', 'Not', 'Yes', 'Skip', 'This', 'That', 'What', 'How', 'When', 'Where', 'Who'];
    const uniqueNames = Array.from(new Set(capitalizedWords))
      .filter(w => !excludeWords.includes(w))
      .slice(0, 5);

    return uniqueNames.map((name, i) => ({
      name,
      role: i === 0 ? 'protagonist' : 'supporting',
      visualDescription: `A character named ${name}`,
      personality: [],
    }));
  }

  /**
   * Extract setting/world details using LLM.
   */
  async extractSetting(conversationText: string): Promise<ExtractedSetting | null> {
    const prompt = EXTRACTION_PROMPTS.setting.replace('{{conversation}}', conversationText);

    try {
      const result = await this.textService.generate(prompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      const parsed = JSON.parse(result.text);
      return parsed.setting || null;
    } catch (error) {
      console.error('Failed to parse setting extraction:', error);
      return null;
    }
  }

  /**
   * Extract complete story arc with beats using LLM.
   */
  async extractStoryArc(
    conversationText: string,
    characters: ExtractedCharacter[],
    setting: ExtractedSetting | null,
    structure: StoryStructure = 'three-act'
  ): Promise<ExtractedStoryArc | null> {
    const characterNames = characters.map(c => c.name).join(', ') || 'unspecified characters';
    const settingDesc = setting?.location || 'unspecified setting';
    const structureGuide = STRUCTURE_GUIDES[structure] || STRUCTURE_GUIDES['three-act'];

    const prompt = EXTRACTION_PROMPTS.storyArc
      .replace(/\{\{conversation\}\}/g, conversationText)
      .replace(/\{\{structure\}\}/g, structure)
      .replace(/\{\{characters\}\}/g, characterNames)
      .replace(/\{\{setting\}\}/g, settingDesc)
      .replace(/\{\{structureGuide\}\}/g, structureGuide);

    try {
      const result = await this.textService.generate(prompt, {
        temperature: 0.5, // Slightly higher for creative beat generation
        maxTokens: 4000,
        timeoutMs: 180000, // 3 minutes for complex story arc extraction
      });

      const parsed = JSON.parse(result.text);
      const acts = parsed.acts?.length > 0 ? parsed.acts : this.getDefaultActs(structure);
      const beats = parsed.beats?.length > 0 ? parsed.beats : [];
      return {
        premise: parsed.premise,
        structure: parsed.structure || structure,
        acts,
        beats,
      };
    } catch (error) {
      console.error('Failed to parse story arc extraction:', error);
      return null;
    }
  }

  /**
   * Get default act names for a structure.
   */
  private getDefaultActs(structure: StoryStructure): string[] {
    switch (structure) {
      case 'three-act':
        return ['Act 1: Setup', 'Act 2: Confrontation', 'Act 3: Resolution'];
      case 'five-act':
        return ['Act 1: Exposition', 'Act 2: Rising Action', 'Act 3: Climax', 'Act 4: Falling Action', 'Act 5: Denouement'];
      case 'hero-journey':
        return ['Departure', 'Initiation', 'Return'];
      default:
        return ['Act 1', 'Act 2', 'Act 3'];
    }
  }

  /**
   * Expand a beat into a more detailed visual description.
   */
  async expandBeatDescription(
    beatType: string,
    summary: string,
    characters: string[],
    setting: string,
    emotionalTone: string
  ): Promise<string> {
    const prompt = EXTRACTION_PROMPTS.beatsExpansion
      .replace('{{beatType}}', beatType)
      .replace('{{summary}}', summary)
      .replace('{{characters}}', characters.join(', '))
      .replace('{{setting}}', setting)
      .replace('{{emotionalTone}}', emotionalTone);

    try {
      const result = await this.textService.generate(prompt, {
        temperature: 0.7,
        maxTokens: 300,
      });

      return result.text.trim();
    } catch (error) {
      console.error('Failed to expand beat description:', error);
      return summary;
    }
  }

  /**
   * Run all extractions on the conversation and return enhanced state.
   */
  async runEnhancedExtraction(
    conversationText: string,
    structure: StoryStructure = 'three-act'
  ): Promise<{
    characters: ExtractedCharacter[];
    setting: ExtractedSetting | null;
    arc: ExtractedStoryArc | null;
  }> {
    // Extract characters first (needed for arc extraction)
    const characters = await this.extractCharacters(conversationText);

    // Extract setting
    const setting = await this.extractSetting(conversationText);

    // Extract story arc with beats
    const arc = await this.extractStoryArc(conversationText, characters, setting, structure);

    return { characters, setting, arc };
  }

  // ===========================================================================
  // Response Generation
  // ===========================================================================

  /**
   * Generate a response for a user message (non-streaming).
   */
  async generateResponse(
    state: ElicitationState,
    userMessage: string
  ): Promise<{ response: string; metadata: ChatMessageMetadata; newState: ElicitationState }> {
    // Update state with user message
    const newState = this.updateState(state, userMessage);
    
    // Check if provider is available
    const status = await this.textService.getStatus();
    if (!status.available) {
      return {
        response: this.getFallbackResponse(newState.phase),
        metadata: { suggestions: getSuggestionsForPhase(newState.phase) },
        newState,
      };
    }
    
    // Generate prompt for current phase
    const prompt = getPhasePrompt(state.phase, {
      state,
      userMessage,
    });
    
    try {
      const result = await this.textService.generate(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 500,
      });
      
      const metadata: ChatMessageMetadata = {
        suggestions: getSuggestionsForPhase(newState.phase),
        phaseTransition: {
          from: state.phase,
          to: newState.phase,
        },
      };
      
      return {
        response: result.text.trim(),
        metadata,
        newState,
      };
    } catch (error) {
      console.error('Chat generation error:', error);
      return {
        response: this.getFallbackResponse(newState.phase),
        metadata: { suggestions: getSuggestionsForPhase(newState.phase) },
        newState,
      };
    }
  }

  /**
   * Generate streaming response for a user message.
   * Returns an async generator that yields chunks.
   */
  async *generateStreamingResponse(
    state: ElicitationState,
    userMessage: string
  ): AsyncGenerator<StreamChunk> {
    // Update state with user message
    const newState = this.updateState(state, userMessage);
    
    // Check if provider is available
    const status = await this.textService.getStatus();
    if (!status.available) {
      yield {
        type: 'text',
        content: this.getFallbackResponse(newState.phase),
      };
      yield {
        type: 'metadata',
        metadata: { suggestions: getSuggestionsForPhase(newState.phase) },
      };
      yield { type: 'complete' };
      return;
    }
    
    // Generate prompt for current phase
    const prompt = getPhasePrompt(state.phase, {
      state,
      userMessage,
    });
    
    try {
      // For now, generate and simulate streaming
      // TODO: Use actual streaming when provider supports it
      const result = await this.textService.generate(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 500,
      });
      
      // Simulate streaming by yielding chunks
      const text = result.text.trim();
      const chunkSize = 5;
      
      for (let i = 0; i < text.length; i += chunkSize) {
        yield {
          type: 'text',
          content: text.slice(i, i + chunkSize),
        };
        // Small delay for streaming effect
        await new Promise(r => setTimeout(r, 20));
      }
      
      // Yield metadata at the end
      yield {
        type: 'metadata',
        metadata: {
          suggestions: getSuggestionsForPhase(newState.phase),
          phaseTransition: {
            from: state.phase,
            to: newState.phase,
          },
        },
      };
      
      yield { type: 'complete' };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get fallback response when AI is unavailable.
   */
  private getFallbackResponse(phase: ElicitationPhase): string {
    const fallbacks: Record<ElicitationPhase, string> = {
      greeting: "Thanks for sharing your idea! Tell me about the main characters in your story.",
      characters: "Got it! Where does your story take place? What's the world like?",
      setting: "Interesting setting! What's the main conflict or story arc?",
      arc: "That sounds compelling! What visual style are you going for?",
      style: "Great choice! How many pages do you want this to be?",
      scope: "Perfect! Here's your story structure. Ready to create your project?",
      beats_preview: "Here's your story broken down into beats. Look good?",
      confirmation: "Your project is ready to create!",
      complete: "Your project has been created! Redirecting you now...",
    };
    
    return fallbacks[phase] || fallbacks.greeting;
  }

  // ===========================================================================
  // Project Bootstrap
  // ===========================================================================

  /**
   * Create project bootstrap from gathered elicitation data.
   */
  createBootstrap(state: ElicitationState): ProjectBootstrap {
    const { gathered } = state;
    
    // Generate project name from concept
    const name = this.generateProjectName(gathered.concept);
    
    // Create description from gathered data
    const description = this.generateDescription(gathered);
    
    return {
      name,
      description,
      characters: gathered.characters || [],
      storyOutline: gathered.arc,
      pageCount: gathered.pageCount || this.config.defaultPageCount,
      style: gathered.style,
    };
  }

  /**
   * Generate a project name from the concept.
   */
  private generateProjectName(concept?: string): string {
    if (!concept) return 'Untitled Project';
    
    // Take first few words, capitalize
    const words = concept.split(/\s+/).slice(0, 4);
    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate a project description from gathered data.
   */
  private generateDescription(gathered: ElicitationState['gathered']): string {
    const parts = [
      gathered.concept,
      gathered.setting && `Set in ${gathered.setting}.`,
      gathered.arc && `Story: ${gathered.arc}`,
      gathered.style && `Style: ${gathered.style}`,
    ].filter(Boolean);
    
    return parts.join(' ');
  }

  // ===========================================================================
  // Provider Status
  // ===========================================================================

  /**
   * Check if AI is available.
   */
  async isAvailable(): Promise<boolean> {
    const status = await this.textService.getStatus();
    return status.available;
  }

  /**
   * Get available providers.
   */
  async listProviders() {
    return this.textService.listProviders();
  }
}

// =============================================================================
// Factory
// =============================================================================

let instance: ChatService | null = null;

export function getChatService(config?: Partial<ChatServiceConfig>): ChatService {
  if (!instance) {
    instance = new ChatService(config);
  }
  return instance;
}

export function createChatService(config?: Partial<ChatServiceConfig>): ChatService {
  return new ChatService(config);
}

export function resetChatService(): void {
  instance = null;
}
