/**
 * Chat Service
 * 
 * AI-guided project creation via conversational interface.
 */

export { ChatService, getChatService, createChatService, resetChatService } from './chat.service.js';
export * from './chat.types.js';
export { 
  SYSTEM_PROMPT,
  getPhasePrompt,
  getSuggestionsForPhase,
  getNextPhase,
  shouldSkipPhase,
} from './prompts.js';
