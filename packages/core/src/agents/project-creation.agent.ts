/**
 * Project Creation Agent
 *
 * Mastra agent that guides users through collaborative project creation.
 * Uses an elicitation state machine to gather project details through
 * natural conversation.
 *
 * Phases:
 * 1. Greeting - Welcome and understand initial concept
 * 2. Characters - Define main characters (with optional matching)
 * 3. Setting - Establish the story world
 * 4. Arc - Develop the narrative arc
 * 5. Style - Visual style preferences
 * 6. Scope - Target length and complexity
 * 7. Confirmation - Review and create
 *
 * @example
 * ```ts
 * import { projectCreationAgent } from "./project-creation.agent.js";
 *
 * const response = await projectCreationAgent.generate(
 *   "I want to create a story about two otters",
 *   { threadId: "thread-123" }
 * );
 * ```
 */

import { Agent } from "@mastra/core";
import { z } from "zod";
import { getModelAdapter } from "./model-adapter.js";
import { matchCharactersTool } from "./tools/match-characters.tool.js";
import { bootstrapProjectTool } from "./tools/bootstrap-project.tool.js";
import type { ElicitationPhase, ChatWorkingMemory } from "../db/schema.js";

// =============================================================================
// Agent Configuration
// =============================================================================

/**
 * System instructions for the project creation agent.
 */
const SYSTEM_INSTRUCTIONS = `You are a friendly creative assistant helping users create visual storytelling projects (comics, storyboards, graphic novels).

Your role is to guide users through project setup by asking questions about:
1. Their story concept and premise
2. Main characters (names, descriptions, personalities)
3. Setting and world-building
4. Story arc and themes
5. Visual style preferences
6. Scope (number of pages, complexity)

Guidelines:
- Be conversational and encouraging, not formulaic
- Ask ONE question at a time to avoid overwhelming the user
- Acknowledge their input before asking the next question
- Offer suggestions when the user seems stuck
- Skip questions if the user provides info proactively
- Keep responses concise (2-3 sentences max)
- Use the match-characters tool to find existing characters that match descriptions
- When ready to create, summarize the project and ask for confirmation

Current conversation phase: {phase}
Gathered information so far: {gathered}

Remember: Your goal is to gather enough information to create a meaningful project, not to interrogate the user. Be helpful and creative!`;

/**
 * Phase-specific prompts to guide the conversation.
 */
const PHASE_PROMPTS: Record<ElicitationPhase, string> = {
  greeting: "Start by warmly greeting the user and asking about their story idea or concept.",
  characters: "Focus on understanding the main characters. Ask about names, descriptions, and personalities.",
  setting: "Ask about where and when the story takes place. What's the world like?",
  arc: "Explore the story arc. What's the main conflict or journey?",
  style: "Discuss visual style preferences. What aesthetic or mood are they going for?",
  scope: "Clarify the project scope. How many pages? What's the target complexity?",
  confirmation: "Summarize everything gathered and ask if they're ready to create the project.",
  complete: "The project has been created. Thank them and offer to help with next steps.",
};

/**
 * Working memory schema for Zod validation.
 */
const WorkingMemorySchema = z.object({
  phase: z.enum([
    "greeting",
    "characters",
    "setting",
    "arc",
    "style",
    "scope",
    "confirmation",
    "complete",
  ]),
  gathered: z.object({
    concept: z.string().optional(),
    characters: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          matchedId: z.string().optional(),
        })
      )
      .optional(),
    setting: z.string().optional(),
    arc: z.string().optional(),
    style: z.string().optional(),
    pageCount: z.number().optional(),
  }),
  skipped: z.array(z.string()),
});

// =============================================================================
// Agent Definition
// =============================================================================

/**
 * The project creation agent.
 *
 * Note: Mastra agents are typically singletons configured at module load time.
 * For runtime flexibility, use createProjectCreationAgent() instead.
 */
export const projectCreationAgent = new Agent({
  name: "project-creation",
  instructions: SYSTEM_INSTRUCTIONS,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: getModelAdapter() as any,
  tools: {
    matchCharacters: matchCharactersTool,
    bootstrapProject: bootstrapProjectTool,
  },
});

// =============================================================================
// Agent Factory (for testing and custom configurations)
// =============================================================================

export interface ProjectCreationAgentConfig {
  /** Custom model adapter */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model?: any;
  /** Additional tools */
  tools?: Record<string, unknown>;
  /** Custom instructions */
  instructions?: string;
}

/**
 * Create a new project creation agent instance.
 * Use this for testing or when you need custom configuration.
 */
export function createProjectCreationAgent(
  config?: ProjectCreationAgentConfig
): Agent {
  return new Agent({
    name: "project-creation",
    instructions: config?.instructions ?? SYSTEM_INSTRUCTIONS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: config?.model ?? (getModelAdapter() as any),
    tools: {
      matchCharacters: matchCharactersTool,
      bootstrapProject: bootstrapProjectTool,
      ...config?.tools,
    },
  });
}

// =============================================================================
// Conversation Helpers
// =============================================================================

/**
 * Get the initial working memory state.
 */
export function getInitialWorkingMemory(): ChatWorkingMemory {
  return {
    phase: "greeting",
    gathered: {},
    skipped: [],
  };
}

/**
 * Build the system prompt with current state.
 */
export function buildSystemPrompt(memory: ChatWorkingMemory): string {
  const gathered = Object.entries(memory.gathered)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");

  return SYSTEM_INSTRUCTIONS.replace("{phase}", memory.phase).replace(
    "{gathered}",
    gathered || "None yet"
  );
}

/**
 * Get the phase-specific prompt.
 */
export function getPhasePrompt(phase: ElicitationPhase): string {
  return PHASE_PROMPTS[phase];
}

/**
 * Determine the next phase based on current state.
 */
export function getNextPhase(memory: ChatWorkingMemory): ElicitationPhase {
  const { phase, gathered, skipped } = memory;

  // Phase progression logic
  const phases: ElicitationPhase[] = [
    "greeting",
    "characters",
    "setting",
    "arc",
    "style",
    "scope",
    "confirmation",
    "complete",
  ];

  const currentIndex = phases.indexOf(phase);
  if (currentIndex === -1 || currentIndex >= phases.length - 1) {
    return phase;
  }

  // Check what we have and might skip
  const nextPhase = phases[currentIndex + 1];

  // Skip phases that already have data or were explicitly skipped
  if (shouldSkipPhase(nextPhase, gathered, skipped)) {
    // Recursively find next non-skipped phase
    const tempMemory = { ...memory, phase: nextPhase };
    return getNextPhase(tempMemory);
  }

  return nextPhase;
}

/**
 * Check if a phase should be skipped.
 */
function shouldSkipPhase(
  phase: ElicitationPhase,
  gathered: ChatWorkingMemory["gathered"],
  skipped: string[]
): boolean {
  if (skipped.includes(phase)) return true;

  switch (phase) {
    case "characters":
      return (gathered.characters?.length ?? 0) >= 2;
    case "setting":
      return !!gathered.setting;
    case "arc":
      return !!gathered.arc;
    case "style":
      return !!gathered.style;
    case "scope":
      return gathered.pageCount !== undefined;
    default:
      return false;
  }
}

/**
 * Update working memory based on parsed content.
 */
export function updateWorkingMemory(
  memory: ChatWorkingMemory,
  updates: Partial<ChatWorkingMemory["gathered"]>
): ChatWorkingMemory {
  return {
    ...memory,
    gathered: {
      ...memory.gathered,
      ...updates,
    },
  };
}

/**
 * Check if we have enough information to create a project.
 */
export function canCreateProject(memory: ChatWorkingMemory): boolean {
  const { gathered } = memory;
  
  // Minimum requirements:
  // - At least a concept OR character
  // - At least one character if we got past greeting
  const hasBasicInfo = !!gathered.concept || (gathered.characters?.length ?? 0) > 0;
  const hasCharacters = (gathered.characters?.length ?? 0) > 0;

  return hasBasicInfo && hasCharacters;
}

/**
 * Generate suggestions for the current phase.
 */
export function getSuggestionsForPhase(
  phase: ElicitationPhase,
  memory: ChatWorkingMemory
): string[] {
  switch (phase) {
    case "greeting":
      return [
        "I want to create a comic about...",
        "I have a story idea about...",
        "Help me brainstorm something new",
      ];
    case "characters":
      return [
        "The main character is...",
        "Skip characters for now",
        "Use existing characters",
      ];
    case "setting":
      return [
        "The story takes place in...",
        "It's set in a fantasy world",
        "Modern day, realistic setting",
        "Skip setting",
      ];
    case "arc":
      return [
        "The main conflict is...",
        "It's a coming-of-age story",
        "Skip story arc",
      ];
    case "style":
      return [
        "Anime-inspired",
        "Western comic style",
        "Realistic",
        "Skip style",
      ];
    case "scope":
      return ["Short (1-10 pages)", "Medium (11-30 pages)", "Long (31+ pages)"];
    case "confirmation":
      return ["Create Project", "Make changes", "Start over"];
    default:
      return [];
  }
}
