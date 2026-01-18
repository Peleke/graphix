/**
 * Agents Module
 *
 * Mastra agents for AI-powered features.
 */

// Agent
export {
  projectCreationAgent,
  createProjectCreationAgent,
  type ProjectCreationAgentConfig,
  // Conversation helpers
  getInitialWorkingMemory,
  buildSystemPrompt,
  getPhasePrompt,
  getNextPhase,
  updateWorkingMemory,
  canCreateProject,
  getSuggestionsForPhase,
} from "./project-creation.agent.js";

// Model Adapter
export {
  getModelAdapter,
  createModelAdapter,
  resetModelAdapter,
  TextGenerationModelAdapter,
  type MastraModelAdapter,
  type ModelMessage,
  type ModelResponse,
  type ModelConfig,
} from "./model-adapter.js";

// Tools
export * from "./tools/index.js";
