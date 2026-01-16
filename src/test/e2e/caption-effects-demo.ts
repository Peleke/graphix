/**
 * Caption Effects Demo
 *
 * Demonstrates advanced SVG effects on captions.
 */

import {
  compositeCaptions,
  listEffectPresets,
  type RenderableCaption,
  type CaptionEffect,
} from "../../composition/index.js";
import { mkdir } from "fs/promises";

const INPUT_DIR = "/Users/peleke/Documents/ComfyUI/output";
const OUTPUT_DIR = "/Users/peleke/Documents/ComfyUI/output/otter_effects";

async function demo() {
  console.log("✨ Caption Effects Demo\n");
  console.log("Available effect presets:", listEffectPresets().join(", "), "\n");

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Demo different effects on different panels

  // Panel 1: Narration with soft gradient
  console.log("Panel 1: Narration with soft gradient...");
  await compositeCaptions(
    `${INPUT_DIR}/otter_panel_1.png`,
    [
      {
        type: "narration",
        text: "After a long day at work...",
        position: { x: 50, y: 10 },
        effectPreset: "soft_thought",
      },
    ],
    `${OUTPUT_DIR}/panel_1_gradient.png`
  );
  console.log("  ✅ Saved\n");

  // Panel 2: Speech with glow effect
  console.log("Panel 2: Speech with glow effect...");
  await compositeCaptions(
    `${INPUT_DIR}/otter_panel_2.png`,
    [
      {
        type: "speech",
        text: "Time to relax...",
        position: { x: 70, y: 18 },
        tailDirection: { x: 40, y: 55 },
        effects: [
          { type: "glow", color: "#FFFFFF", blur: 6, spread: 0.8 },
        ],
      },
    ],
    `${OUTPUT_DIR}/panel_2_glow.png`
  );
  console.log("  ✅ Saved\n");

  // Panel 3: Thought with wobble (hand-drawn look)
  console.log("Panel 3: Thought with hand-drawn wobble...");
  await compositeCaptions(
    `${INPUT_DIR}/otter_panel_3.png`,
    [
      {
        type: "thought",
        text: "Just let it go...",
        position: { x: 65, y: 15 },
        effectPreset: "hand_drawn",
      },
    ],
    `${OUTPUT_DIR}/panel_3_wobble.png`
  );
  console.log("  ✅ Saved\n");

  // Panel 4: SFX with action impact (explosion + speed lines)
  console.log("Panel 4: SFX with action impact...");
  await compositeCaptions(
    `${INPUT_DIR}/otter_panel_4.png`,
    [
      {
        type: "sfx",
        text: "WHOOOOSH",
        position: { x: 50, y: 50 },
        style: { fontSize: 40, fontColor: "#FF6600" },
        effectPreset: "action_impact",
      },
    ],
    `${OUTPUT_DIR}/panel_4_impact.png`
  );
  console.log("  ✅ Saved\n");

  // Panel 5: Narration with manga emphasis
  console.log("Panel 5: Narration with dramatic emphasis...");
  await compositeCaptions(
    `${INPUT_DIR}/otter_panel_5.png`,
    [
      {
        type: "narration",
        text: "The tension fades away.",
        position: { x: 50, y: 85 },
        effectPreset: "dramatic",
      },
    ],
    `${OUTPUT_DIR}/panel_5_dramatic.png`
  );
  console.log("  ✅ Saved\n");

  // Panel 6: Multiple effects - neon speech + electric whisper
  console.log("Panel 6: Multiple effects - neon + electric...");
  await compositeCaptions(
    `${INPUT_DIR}/otter_panel_6.png`,
    [
      {
        type: "speech",
        text: "Much better!",
        position: { x: 70, y: 18 },
        tailDirection: { x: 40, y: 55 },
        effectPreset: "neon",
      },
      {
        type: "whisper",
        text: "...finally at peace...",
        position: { x: 30, y: 80 },
        effectPreset: "whisper_soft",
      },
    ],
    `${OUTPUT_DIR}/panel_6_neon.png`
  );
  console.log("  ✅ Saved\n");

  // Custom effects combo
  console.log("Panel 4 Alt: Custom effect combo (electric + screentone)...");
  const customEffects: CaptionEffect[] = [
    { type: "electric", bolts: 6, color: "#00FFFF" },
    { type: "screentone", pattern: "dots", density: 4 },
  ];

  await compositeCaptions(
    `${INPUT_DIR}/otter_panel_4.png`,
    [
      {
        type: "sfx",
        text: "CRACKLE",
        position: { x: 50, y: 50 },
        style: { fontSize: 36, fontColor: "#00FFFF" },
        effects: customEffects,
      },
    ],
    `${OUTPUT_DIR}/panel_4_electric.png`
  );
  console.log("  ✅ Saved\n");

  console.log("✨ Effects demo complete! Output at:", OUTPUT_DIR);
}

demo().catch(console.error);
