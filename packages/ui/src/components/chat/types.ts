/**
 * Chat Types
 * 
 * Type definitions for the Chat-to-Start feature.
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: {
    suggestions?: string[];
    assetMatches?: CharacterMatch[];
    bootstrapPreview?: ProjectBootstrap;
  };
}

export interface CharacterMatch {
  id: string;
  name: string;
  thumbnail?: string;
  confidence: number;
  matchReason: 'exact_name' | 'similar_name' | 'description_match';
}

export interface CharacterDraft {
  name: string;
  description?: string;
  traits?: string[];
  existingId?: string; // If matching an existing character
}

export interface ProjectBootstrap {
  name: string;
  description: string;
  characters: CharacterDraft[];
  storyOutline?: string;
  pageCount?: number;
  style?: string;
}

export type ElicitationPhase = 
  | 'greeting'
  | 'characters'
  | 'setting'
  | 'arc'
  | 'style'
  | 'scope'
  | 'confirmation'
  | 'complete';

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

export interface ChatSession {
  id: string;
  threadId: string;
  state: ElicitationState;
  messages: ChatMessage[];
  resultingProjectId?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface ChatThread {
  id: string;
  title?: string;
  sessions: ChatSession[];
  createdAt: Date;
  updatedAt: Date;
}
