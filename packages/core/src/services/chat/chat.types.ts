/**
 * Chat Service Types
 * 
 * Types for AI-guided project creation via chat interface.
 */

// =============================================================================
// Elicitation State
// =============================================================================

export type ElicitationPhase = 
  | 'greeting'
  | 'characters'
  | 'setting'
  | 'arc'
  | 'style'
  | 'scope'
  | 'confirmation'
  | 'complete';

export interface CharacterDraft {
  name: string;
  description?: string;
  traits?: string[];
  existingId?: string; // If matching an existing character
}

export interface ElicitationState {
  phase: ElicitationPhase;
  gathered: {
    concept?: string;
    characters?: CharacterDraft[];
    setting?: string;
    arc?: string;
    style?: string;
    pageCount?: number;
  };
  skipped: ElicitationPhase[];
}

// =============================================================================
// Messages
// =============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: ChatMessageMetadata;
  createdAt: Date;
}

export interface ChatMessageMetadata {
  suggestions?: string[];
  characterMatches?: CharacterMatch[];
  bootstrapPreview?: ProjectBootstrap;
  phaseTransition?: {
    from: ElicitationPhase;
    to: ElicitationPhase;
  };
}

export interface CharacterMatch {
  id: string;
  name: string;
  thumbnail?: string;
  confidence: number;
  matchReason: 'exact_name' | 'similar_name' | 'description_match';
}

// =============================================================================
// Sessions & Threads
// =============================================================================

export interface ChatSession {
  id: string;
  threadId: string;
  state: ElicitationState;
  resultingProjectId?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface ChatThread {
  id: string;
  userId?: string;
  title?: string;
  sessions: ChatSession[];
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Project Bootstrap
// =============================================================================

export interface ProjectBootstrap {
  name: string;
  description: string;
  characters: CharacterDraft[];
  storyOutline?: string;
  pageCount?: number;
  style?: string;
}

// =============================================================================
// Service Interfaces
// =============================================================================

export interface SendMessageOptions {
  sessionId: string;
  content: string;
}

export interface StreamChunk {
  type: 'text' | 'metadata' | 'complete' | 'error';
  content?: string;
  metadata?: ChatMessageMetadata;
  error?: string;
}

export interface ChatServiceConfig {
  /** Default page count if not specified */
  defaultPageCount: number;
  /** Maximum message length */
  maxMessageLength: number;
  /** Maximum conversation turns before auto-confirmation */
  maxTurns: number;
}

export const DEFAULT_CHAT_CONFIG: ChatServiceConfig = {
  defaultPageCount: 8,
  maxMessageLength: 4000,
  maxTurns: 20,
};
