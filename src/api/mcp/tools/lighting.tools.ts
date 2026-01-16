/**
 * Lighting MCP Tools
 *
 * Tools for managing scene lighting consistency across storyboards.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getLightingService,
  LIGHT_TYPES,
  LIGHT_DIRECTIONS,
  TIMES_OF_DAY,
  WEATHER_CONDITIONS,
} from "../../../services/lighting.service.js";
import type { SceneLightingConfig, LightSource } from "../../../db/schema.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const lightingTools: Record<string, Tool> = {
  storyboard_set_lighting: {
    name: "storyboard_set_lighting",
    description:
      "Set scene lighting configuration for a storyboard. All panels will automatically " +
      "inherit these lighting keywords in their prompts for visual consistency.",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID",
        },
        primarySource: {
          type: "object",
          description: "Primary light source configuration",
          properties: {
            type: {
              type: "string",
              enum: LIGHT_TYPES as unknown as string[],
              description: "Type of light: sun, moon, artificial, fire, window, ambient",
            },
            direction: {
              type: "string",
              enum: LIGHT_DIRECTIONS as unknown as string[],
              description:
                "Direction light is coming from: north, northeast, east, southeast, south, southwest, west, northwest, above, below",
            },
            intensity: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Light intensity (0-1). Default 0.7",
            },
            color: {
              type: "string",
              description: "Optional color tint (e.g., 'warm orange', 'cool blue')",
            },
          },
          required: ["type", "direction", "intensity"],
        },
        secondarySource: {
          type: "object",
          description: "Optional secondary/fill light",
          properties: {
            type: {
              type: "string",
              enum: LIGHT_TYPES as unknown as string[],
            },
            direction: {
              type: "string",
              enum: LIGHT_DIRECTIONS as unknown as string[],
            },
            intensity: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            color: {
              type: "string",
            },
          },
          required: ["type", "direction", "intensity"],
        },
        ambientColor: {
          type: "string",
          description: "Overall ambient color tone (e.g., 'warm', 'cool blue')",
        },
        timeOfDay: {
          type: "string",
          enum: TIMES_OF_DAY as unknown as string[],
          description: "Time of day: dawn, morning, noon, afternoon, dusk, night",
        },
        weather: {
          type: "string",
          enum: WEATHER_CONDITIONS as unknown as string[],
          description: "Weather condition: clear, cloudy, overcast, foggy, rainy, stormy",
        },
      },
      required: ["storyboardId", "primarySource"],
    },
  },

  storyboard_get_lighting: {
    name: "storyboard_get_lighting",
    description: "Get the current lighting configuration for a storyboard.",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID",
        },
      },
      required: ["storyboardId"],
    },
  },

  storyboard_clear_lighting: {
    name: "storyboard_clear_lighting",
    description: "Remove lighting configuration from a storyboard. Panels will no longer have auto-injected lighting.",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID",
        },
      },
      required: ["storyboardId"],
    },
  },

  lighting_suggest: {
    name: "lighting_suggest",
    description:
      "Get AI-suggested lighting configuration based on a scene description. " +
      "Returns a config you can use with storyboard_set_lighting.",
    inputSchema: {
      type: "object",
      properties: {
        sceneDescription: {
          type: "string",
          description: "Description of the scene (e.g., 'forest at dusk with campfire')",
        },
      },
      required: ["sceneDescription"],
    },
  },

  lighting_preview: {
    name: "lighting_preview",
    description: "Preview what prompt fragment will be generated from a lighting config.",
    inputSchema: {
      type: "object",
      properties: {
        config: {
          type: "object",
          description: "Lighting configuration to preview",
          properties: {
            primarySource: {
              type: "object",
              properties: {
                type: { type: "string", enum: LIGHT_TYPES as unknown as string[] },
                direction: { type: "string", enum: LIGHT_DIRECTIONS as unknown as string[] },
                intensity: { type: "number" },
                color: { type: "string" },
              },
              required: ["type", "direction", "intensity"],
            },
            secondarySource: {
              type: "object",
              properties: {
                type: { type: "string", enum: LIGHT_TYPES as unknown as string[] },
                direction: { type: "string", enum: LIGHT_DIRECTIONS as unknown as string[] },
                intensity: { type: "number" },
                color: { type: "string" },
              },
            },
            ambientColor: { type: "string" },
            timeOfDay: { type: "string", enum: TIMES_OF_DAY as unknown as string[] },
            weather: { type: "string", enum: WEATHER_CONDITIONS as unknown as string[] },
          },
          required: ["primarySource"],
        },
      },
      required: ["config"],
    },
  },

  lighting_list_options: {
    name: "lighting_list_options",
    description: "List all available lighting options (light types, directions, times, weather).",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleLightingTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getLightingService();

  switch (name) {
    case "storyboard_set_lighting": {
      const { storyboardId, primarySource, secondarySource, ambientColor, timeOfDay, weather } =
        args as {
          storyboardId: string;
          primarySource: LightSource;
          secondarySource?: LightSource;
          ambientColor?: string;
          timeOfDay?: "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "night";
          weather?: "clear" | "cloudy" | "overcast" | "foggy" | "rainy" | "stormy";
        };

      const config: SceneLightingConfig = {
        primarySource,
        secondarySource,
        ambientColor,
        timeOfDay,
        weather,
      };

      const storyboard = await service.setLighting(storyboardId, config);
      const promptFragment = service.generatePromptFragment(config);

      return {
        storyboard,
        lightingConfig: config,
        promptFragment,
        message: "Lighting configured. All panels will include these lighting keywords.",
      };
    }

    case "storyboard_get_lighting": {
      const { storyboardId } = args as { storyboardId: string };

      const config = await service.getLighting(storyboardId);

      if (!config) {
        return {
          storyboardId,
          lightingConfig: null,
          message: "No lighting configuration set for this storyboard.",
        };
      }

      return {
        storyboardId,
        lightingConfig: config,
        promptFragment: service.generatePromptFragment(config),
      };
    }

    case "storyboard_clear_lighting": {
      const { storyboardId } = args as { storyboardId: string };

      const storyboard = await service.clearLighting(storyboardId);

      return {
        storyboard,
        message: "Lighting configuration cleared.",
      };
    }

    case "lighting_suggest": {
      const { sceneDescription } = args as { sceneDescription: string };

      const suggestedConfig = service.suggestLighting(sceneDescription);
      const promptFragment = service.generatePromptFragment(suggestedConfig);

      return {
        sceneDescription,
        suggestedConfig,
        promptFragment,
        message: "Use storyboard_set_lighting with this config, or modify as needed.",
      };
    }

    case "lighting_preview": {
      const { config } = args as { config: SceneLightingConfig };

      const promptFragment = service.generatePromptFragment(config);

      return {
        config,
        promptFragment,
      };
    }

    case "lighting_list_options": {
      return service.listOptions();
    }

    default:
      throw new Error(`Unknown lighting tool: ${name}`);
  }
}
