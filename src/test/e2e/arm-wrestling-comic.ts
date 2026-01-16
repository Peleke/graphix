/**
 * Arm Wrestling Comic Scene
 *
 * Creates a 3-panel comic with captions and effects.
 */

import { compositeCaptions, renderGrid, type RenderableCaption } from "../../composition/index.js";
import { mkdir } from "fs/promises";

const INPUT_DIR = "/Users/peleke/Documents/ComfyUI/output/arm_wrestling";
const OUTPUT_DIR = "/Users/peleke/Documents/ComfyUI/output/arm_wrestling";

async function createComic() {
  console.log("🥊 Creating Arm Wrestling Comic\n");

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Panel 1: Setup - dramatic narration
  console.log("Panel 1: Adding captions...");
  const panel1Captions: RenderableCaption[] = [
    {
      type: "narration",
      text: "The Rusty Tankard Tavern. Friday night.",
      position: { x: 50, y: 8 },
      effectPreset: "dramatic",
    },
    {
      type: "speech",
      text: "You sure about this, pup?",
      position: { x: 75, y: 25 },
      tailDirection: { x: 50, y: 50 },
      effects: [{ type: "glow", color: "#FFD700", blur: 4, spread: 0.5 }],
    },
  ];
  await compositeCaptions(
    `${INPUT_DIR}/panel_1_setup.png`,
    panel1Captions,
    `${OUTPUT_DIR}/panel_1_captioned.png`
  );
  console.log("  ✅ Done\n");

  // Panel 2: Struggle - action effects
  console.log("Panel 2: Adding captions...");
  const panel2Captions: RenderableCaption[] = [
    {
      type: "sfx",
      text: "GRRRRR",
      position: { x: 25, y: 15 },
      style: { fontSize: 28, fontColor: "#FF4444" },
      effectPreset: "action_impact",
    },
    {
      type: "thought",
      text: "He's... stronger than he looks!",
      position: { x: 75, y: 20 },
      effectPreset: "hand_drawn",
    },
    {
      type: "sfx",
      text: "CRACK",
      position: { x: 50, y: 85 },
      style: { fontSize: 20, fontColor: "#8B4513" },
      effects: [{ type: "wobble", intensity: 5 }],
    },
  ];
  await compositeCaptions(
    `${INPUT_DIR}/panel_2_struggle.png`,
    panel2Captions,
    `${OUTPUT_DIR}/panel_2_captioned.png`
  );
  console.log("  ✅ Done\n");

  // Panel 3: Victory - celebration effects
  console.log("Panel 3: Adding captions...");
  const panel3Captions: RenderableCaption[] = [
    {
      type: "sfx",
      text: "SLAM!!",
      position: { x: 50, y: 50 },
      style: { fontSize: 42, fontColor: "#FFD700" },
      effectPreset: "action_impact",
    },
    {
      type: "speech",
      text: "YEEAAHH!!",
      position: { x: 50, y: 15 },
      style: { fontSize: 24 },
      effectPreset: "neon",
    },
    {
      type: "narration",
      text: "And with that, the legend of Iron Paw was born.",
      position: { x: 50, y: 92 },
      style: { fontSize: 12 },
    },
  ];
  await compositeCaptions(
    `${INPUT_DIR}/panel_3_victory.png`,
    panel3Captions,
    `${OUTPUT_DIR}/panel_3_captioned.png`
  );
  console.log("  ✅ Done\n");

  // Compose into comic page
  console.log("Composing comic page...");
  const result = await renderGrid(
    [
      `${OUTPUT_DIR}/panel_1_captioned.png`,
      `${OUTPUT_DIR}/panel_2_captioned.png`,
      `${OUTPUT_DIR}/panel_3_captioned.png`,
    ],
    `${OUTPUT_DIR}/arm_wrestling_comic.png`,
    {
      columns: 1,
      gutter: 2,
      backgroundColor: "#1a1a1a",
    }
  );

  if (result.success) {
    console.log(`\n✨ Comic created: ${result.outputPath}`);
    console.log(`   Dimensions: ${result.width}x${result.height}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

createComic().catch(console.error);
