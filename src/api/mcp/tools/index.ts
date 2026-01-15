/**
 * MCP Tools Index
 *
 * Exports all tool definitions and the unified handler.
 */

import { projectTools, handleProjectTool } from "./project.tools.js";
import { characterTools, handleCharacterTool } from "./character.tools.js";
import { storyboardTools, handleStoryboardTool } from "./storyboard.tools.js";
import { panelTools, handlePanelTool } from "./panel.tools.js";
import { generationTools, handleGenerationTool } from "./generation.tools.js";

// All tools
export const tools = {
  ...projectTools,
  ...characterTools,
  ...storyboardTools,
  ...panelTools,
  ...generationTools,
};

// Tool handlers by category
const handlers: Record<string, (name: string, args: Record<string, unknown>) => Promise<unknown>> = {
  // Project tools
  project_create: handleProjectTool,
  project_get: handleProjectTool,
  project_list: handleProjectTool,
  project_update: handleProjectTool,
  project_delete: handleProjectTool,

  // Character tools
  character_create: handleCharacterTool,
  character_get: handleCharacterTool,
  character_list: handleCharacterTool,
  character_update: handleCharacterTool,
  character_update_prompt: handleCharacterTool,
  character_add_reference: handleCharacterTool,
  character_remove_reference: handleCharacterTool,
  character_set_lora: handleCharacterTool,
  character_delete: handleCharacterTool,

  // Storyboard tools
  storyboard_create: handleStoryboardTool,
  storyboard_get: handleStoryboardTool,
  storyboard_list: handleStoryboardTool,
  storyboard_update: handleStoryboardTool,
  storyboard_duplicate: handleStoryboardTool,
  storyboard_delete: handleStoryboardTool,

  // Panel tools
  panel_create: handlePanelTool,
  panel_get: handlePanelTool,
  panel_describe: handlePanelTool,
  panel_add_character: handlePanelTool,
  panel_remove_character: handlePanelTool,
  panel_select_output: handlePanelTool,
  panel_clear_selection: handlePanelTool,
  panel_reorder: handlePanelTool,
  panel_delete: handlePanelTool,

  // Generation tools
  generation_create: handleGenerationTool,
  generation_get: handleGenerationTool,
  generation_list: handleGenerationTool,
  generation_favorite: handleGenerationTool,
  generation_rate: handleGenerationTool,
  generation_delete: handleGenerationTool,
};

/**
 * Handle a tool call by routing to the appropriate handler
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = handlers[name];

  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return handler(name, args);
}
