/**
 * Chat Service Types
 *
 * Types for AI-guided project creation via chat interface.
 */

import type { BeatType } from '../../db/schema';
import type { CameraAngle } from '../text-generation.types';

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
  | 'beats_preview'  // NEW: Show extracted beats for approval
  | 'confirmation'
  | 'complete';

export type StoryStructure = 'three-act' | 'five-act' | 'hero-journey';

// Legacy type for backwards compatibility
export interface CharacterDraft {
  name: string;
  description?: string;
  traits?: string[];
  existingId?: string; // If matching an existing character
}

// =============================================================================
// Enhanced Extraction Types (LLM-powered)
// =============================================================================

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
  structure: StoryStructure;
  acts: string[];
  beats: ExtractedBeat[];
}

// =============================================================================
// Elicitation State (Updated)
// =============================================================================

export interface ElicitationState {
  phase: ElicitationPhase;
  gathered: {
    concept?: string;
    characters?: CharacterDraft[];  // Legacy
    setting?: string;               // Legacy
    arc?: string;                   // Legacy
    style?: string;
    pageCount?: number;
  };
  // Enhanced extracted data (LLM-powered)
  extractedCharacters?: ExtractedCharacter[];
  extractedSetting?: ExtractedSetting;
  extractedArc?: ExtractedStoryArc;
  skipBeatsPreview?: boolean;
  skipped: ElicitationPhase[];
}

// =============================================================================
// Bootstrap Result (Complete project structure)
// =============================================================================

export interface BootstrapResult {
  project: { id: string; name: string };
  premise: { id: string; logline: string };
  story: { id: string; structure: StoryStructure };
  storyboards: Array<{ id: string; name: string; actIndex: number }>;
  beats: Array<{ id: string; type: BeatType; panelId: string }>;
  panels: Array<{ id: string; beatId: string; storyboardId: string }>;
  characters: Array<{ id: string; name: string }>;
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
