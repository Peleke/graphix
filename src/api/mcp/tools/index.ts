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
import { compositionTools, executeCompositionTool } from "./composition.tools.js";
import { consistencyTools, handleConsistencyTool } from "./consistency.tools.js";
import { styleTools, handleStyleTool } from "./style.tools.js";
// Phase 3.5 tools
import { poseTools, handlePoseTool } from "./pose.tools.js";
import { inpaintTools, handleInpaintTool } from "./inpaint.tools.js";
import { lightingTools, handleLightingTool } from "./lighting.tools.js";
import { curationTools, handleCurationTool } from "./curation.tools.js";
import { analyticsTools, handleAnalyticsTool } from "./analytics.tools.js";
import { interpolationTools, handleInterpolationTool } from "./interpolation.tools.js";
import { interactionTools, handleInteractionTool } from "./interaction.tools.js";
import { assetTools, handleAssetTool } from "./asset.tools.js";
import { captionTools, executeCaptionTool } from "./caption.tools.js";

// All tools
export const tools = {
  ...projectTools,
  ...characterTools,
  ...storyboardTools,
  ...panelTools,
  ...generationTools,
  ...compositionTools,
  ...consistencyTools,
  ...styleTools,
  // Phase 3.5
  ...poseTools,
  ...inpaintTools,
  ...lightingTools,
  ...curationTools,
  ...analyticsTools,
  ...interpolationTools,
  ...interactionTools,
  ...assetTools,
  ...captionTools,
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
  character_add_reference: handleCharacterTool,
  character_remove_reference: handleCharacterTool,
  character_set_lora: handleCharacterTool,
  character_clear_lora: handleCharacterTool,
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
  panel_generate: handlePanelTool,
  panel_generate_variants: handlePanelTool,
  panel_list_size_presets: handlePanelTool,
  panel_list_quality_presets: handlePanelTool,
  panel_recommend_size: handlePanelTool,

  // Generation tools
  generation_create: handleGenerationTool,
  generation_get: handleGenerationTool,
  generation_list: handleGenerationTool,
  generation_favorite: handleGenerationTool,
  generation_rate: handleGenerationTool,
  generation_delete: handleGenerationTool,

  // Composition tools
  composition_list_templates: executeCompositionTool,
  composition_list_page_sizes: executeCompositionTool,
  composition_compose_page: executeCompositionTool,
  composition_compose_storyboard: executeCompositionTool,
  composition_contact_sheet: executeCompositionTool,
  composition_export_page: executeCompositionTool,

  // Consistency tools
  consistency_extract_identity: handleConsistencyTool,
  consistency_apply_identity: handleConsistencyTool,
  consistency_chain_panels: handleConsistencyTool,
  consistency_list_identities: handleConsistencyTool,
  consistency_get_identity: handleConsistencyTool,
  consistency_delete_identity: handleConsistencyTool,
  consistency_create_reference_sheet: handleConsistencyTool,
  consistency_chain_sequence: handleConsistencyTool,
  consistency_list_adapter_models: handleConsistencyTool,
  consistency_list_control_presets: handleConsistencyTool,

  // Style tools
  style_list_loras: handleStyleTool,
  style_apply: handleStyleTool,
  style_apply_batch: handleStyleTool,
  lora_info: handleStyleTool,
  lora_suggest: handleStyleTool,
  lora_build_stack: handleStyleTool,
  lora_validate: handleStyleTool,

  // Pose & Expression tools (Phase 3.5)
  pose_extract: handlePoseTool,
  pose_save: handlePoseTool,
  pose_extract_and_save: handlePoseTool,
  pose_list: handlePoseTool,
  pose_get: handlePoseTool,
  pose_update: handlePoseTool,
  pose_delete: handlePoseTool,
  pose_list_categories: handlePoseTool,
  expression_save: handlePoseTool,
  expression_list: handlePoseTool,
  expression_get: handlePoseTool,
  expression_get_by_name: handlePoseTool,
  expression_update: handlePoseTool,
  expression_delete: handlePoseTool,
  expression_list_common: handlePoseTool,

  // Inpainting tools (Phase 3.5)
  panel_inpaint: handleInpaintTool,
  panel_edit: handleInpaintTool,
  panel_create_mask: handleInpaintTool,
  inpaint_list_presets: handleInpaintTool,

  // Lighting tools (Phase 3.5)
  storyboard_set_lighting: handleLightingTool,
  storyboard_get_lighting: handleLightingTool,
  storyboard_clear_lighting: handleLightingTool,
  lighting_suggest: handleLightingTool,
  lighting_preview: handleLightingTool,
  lighting_list_options: handleLightingTool,

  // Curation tools (Phase 3.5)
  generation_compare: handleCurationTool,
  generation_batch_rate: handleCurationTool,
  generation_batch_favorite: handleCurationTool,
  generation_quick_select: handleCurationTool,
  generation_stats: handleCurationTool,
  generation_get_unrated: handleCurationTool,

  // Analytics tools (Phase 3.5)
  generation_analyze: handleAnalyticsTool,
  generation_suggest_params: handleAnalyticsTool,
  generation_find_similar: handleAnalyticsTool,

  // Interpolation tools (Phase 3.5)
  panel_interpolate: handleInterpolationTool,
  interpolation_suggest_count: handleInterpolationTool,

  // Interaction pose tools (Phase 3.5)
  interaction_pose_list: handleInteractionTool,
  interaction_pose_get: handleInteractionTool,
  interaction_pose_create: handleInteractionTool,
  interaction_pose_update: handleInteractionTool,
  interaction_pose_delete: handleInteractionTool,
  interaction_pose_apply: handleInteractionTool,
  interaction_pose_popular: handleInteractionTool,
  interaction_pose_list_categories: handleInteractionTool,
  interaction_pose_seed: handleInteractionTool,

  // Custom asset tools (Phase 3.5)
  asset_register: handleAssetTool,
  asset_get: handleAssetTool,
  asset_list: handleAssetTool,
  asset_update: handleAssetTool,
  asset_delete: handleAssetTool,
  asset_apply: handleAssetTool,
  asset_apply_character: handleAssetTool,
  asset_popular: handleAssetTool,
  asset_deactivate: handleAssetTool,
  asset_activate: handleAssetTool,

  // Caption tools
  caption_add: executeCaptionTool,
  caption_get: executeCaptionTool,
  caption_list: executeCaptionTool,
  caption_update: executeCaptionTool,
  caption_delete: executeCaptionTool,
  caption_reorder: executeCaptionTool,
  caption_preview: executeCaptionTool,
  caption_defaults: executeCaptionTool,
  caption_suggest_position: executeCaptionTool,
  caption_suggest_multiple: executeCaptionTool,
  caption_quick_position: executeCaptionTool,
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
