/**
 * Interpolation MCP Tools
 *
 * Tools for generating in-between panels from keyframes.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getInterpolationService,
  type EasingFunction,
} from "../../../services/interpolation.service.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const interpolationTools: Record<string, Tool> = {
  panel_interpolate: {
    name: "panel_interpolate",
    description:
      "Generate in-between panels from two keyframe panels. Creates smooth transitions " +
      "by interpolating poses and optionally maintaining character identity with IP-Adapter.",
    inputSchema: {
      type: "object",
      properties: {
        panelAId: {
          type: "string",
          description: "ID of the first (start) panel with a selected output",
        },
        panelBId: {
          type: "string",
          description: "ID of the second (end) panel with a selected output",
        },
        count: {
          type: "number",
          minimum: 1,
          maximum: 30,
          description: "Number of in-between panels to generate (1-30)",
        },
        outputDir: {
          type: "string",
          description: "Directory to save generated images",
        },
        maintainIdentity: {
          type: "boolean",
          description:
            "Use IP-Adapter to maintain character identity across frames (default: true)",
        },
        blendPose: {
          type: "boolean",
          description:
            "Interpolate poses between panels using ControlNet (default: true)",
        },
        easing: {
          type: "string",
          enum: ["linear", "ease-in", "ease-out", "ease-in-out"],
          description:
            "Easing function for interpolation timing (default: linear)",
        },
        prompt: {
          type: "string",
          description:
            "Custom prompt for all frames. If omitted, blends prompts from A and B.",
        },
        negativePrompt: {
          type: "string",
          description: "Negative prompt",
        },
        model: {
          type: "string",
          description: "Model to use. If omitted, uses panel A's model.",
        },
        steps: {
          type: "number",
          description: "Number of steps. If omitted, uses panel A's steps.",
        },
        cfg: {
          type: "number",
          description: "CFG scale. If omitted, uses panel A's CFG.",
        },
        sampler: {
          type: "string",
          description: "Sampler. If omitted, uses panel A's sampler.",
        },
        seed: {
          type: "number",
          description: "Base seed. Each frame uses seed + frame_index.",
        },
      },
      required: ["panelAId", "panelBId", "count", "outputDir"],
    },
  },

  interpolation_suggest_count: {
    name: "interpolation_suggest_count",
    description:
      "Get a suggested number of in-between frames based on panel positions and desired smoothness.",
    inputSchema: {
      type: "object",
      properties: {
        panelAPosition: {
          type: "number",
          description: "Position of panel A in storyboard",
        },
        panelBPosition: {
          type: "number",
          description: "Position of panel B in storyboard",
        },
        framesPerSecond: {
          type: "number",
          description: "Target FPS for animation (default: 24)",
        },
        durationSeconds: {
          type: "number",
          description: "Desired duration in seconds (default: 1)",
        },
      },
      required: ["panelAPosition", "panelBPosition"],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleInterpolationTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getInterpolationService();

  switch (name) {
    case "panel_interpolate": {
      const {
        panelAId,
        panelBId,
        count,
        outputDir,
        maintainIdentity,
        blendPose,
        easing,
        prompt,
        negativePrompt,
        model,
        steps,
        cfg,
        sampler,
        seed,
      } = args as {
        panelAId: string;
        panelBId: string;
        count: number;
        outputDir: string;
        maintainIdentity?: boolean;
        blendPose?: boolean;
        easing?: EasingFunction;
        prompt?: string;
        negativePrompt?: string;
        model?: string;
        steps?: number;
        cfg?: number;
        sampler?: string;
        seed?: number;
      };

      return service.interpolate({
        panelAId,
        panelBId,
        count,
        outputDir,
        maintainIdentity: maintainIdentity ?? true,
        blendPose: blendPose ?? true,
        easing: easing ?? "linear",
        prompt,
        negativePrompt,
        model,
        steps,
        cfg,
        sampler,
        seed,
      });
    }

    case "interpolation_suggest_count": {
      const { panelAPosition, panelBPosition, framesPerSecond, durationSeconds } =
        args as {
          panelAPosition: number;
          panelBPosition: number;
          framesPerSecond?: number;
          durationSeconds?: number;
        };

      const suggestion = service.suggestCount({
        panelAPosition,
        panelBPosition,
        framesPerSecond,
        durationSeconds,
      });

      return {
        suggestedCount: suggestion,
        panelGap: Math.abs(panelBPosition - panelAPosition),
        fps: framesPerSecond ?? 24,
        duration: durationSeconds ?? 1,
      };
    }

    default:
      throw new Error(`Unknown interpolation tool: ${name}`);
  }
}
