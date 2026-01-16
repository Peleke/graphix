/**
 * Arm Wrestling Comic v2
 */

import { compositeCaptions, renderGrid, type RenderableCaption } from "../../composition/index.js";

const DIR = "/Users/peleke/Documents/ComfyUI/output/arm_wrestling";

async function createComic() {
  console.log("🥊 Creating Arm Wrestling Comic v2\n");

  // Panel 1: Setup
  console.log("Panel 1...");
  await compositeCaptions(
    `${DIR}/v2_panel_1_setup.png`,
    [
      {
        type: "narration",
        text: "The Rusty Tankard. Friday night.",
        position: { x: 50, y: 8 },
      },
      {
        type: "speech",
        text: "You're going DOWN, fleabag.",
        position: { x: 25, y: 22 },
        tailDirection: { x: 35, y: 45 },
        style: { fontSize: 14 },
      },
      {
        type: "speech",
        text: "Big talk for a little fox.",
        position: { x: 75, y: 22 },
        tailDirection: { x: 65, y: 45 },
        style: { fontSize: 14 },
      },
    ],
    `${DIR}/v2_panel_1_captioned.png`
  );

  // Panel 2: Struggle
  console.log("Panel 2...");
  await compositeCaptions(
    `${DIR}/v2_panel_2_struggle.png`,
    [
      {
        type: "sfx",
        text: "STRAIN",
        position: { x: 50, y: 15 },
        style: { fontSize: 28, fontColor: "#CC0000" },
        effectPreset: "action_impact",
      },
      {
        type: "narration",
        text: "Neither would give an inch.",
        position: { x: 50, y: 88 },
        style: { fontSize: 12 },
      },
    ],
    `${DIR}/v2_panel_2_captioned.png`
  );

  // Panel 3: Victory
  console.log("Panel 3...");
  await compositeCaptions(
    `${DIR}/v2_panel_3_victory.png`,
    [
      {
        type: "sfx",
        text: "SLAM!!",
        position: { x: 50, y: 50 },
        style: { fontSize: 36, fontColor: "#FFD700" },
        effectPreset: "action_impact",
      },
      {
        type: "speech",
        text: "HAH! Pay up!",
        position: { x: 25, y: 18 },
        tailDirection: { x: 35, y: 40 },
        effectPreset: "neon",
      },
      {
        type: "thought",
        text: "...how?!",
        position: { x: 80, y: 25 },
        style: { fontSize: 12 },
      },
    ],
    `${DIR}/v2_panel_3_captioned.png`
  );

  // Compose
  console.log("Composing...");
  await renderGrid(
    [
      `${DIR}/v2_panel_1_captioned.png`,
      `${DIR}/v2_panel_2_captioned.png`,
      `${DIR}/v2_panel_3_captioned.png`,
    ],
    `${DIR}/arm_wrestling_comic_v2.png`,
    { columns: 1, gutter: 2, backgroundColor: "#1a1a1a" }
  );

  console.log("\n✨ Done: arm_wrestling_comic_v2.png");
}

createComic().catch(console.error);
