/**
 * Caption Demo Script
 *
 * Demonstrates the caption system by adding captions to the otter stress relief panels.
 */

import { compositeCaptions, type RenderableCaption } from "../../composition/index.js";
import { mkdir } from "fs/promises";
import { dirname } from "path";

const INPUT_DIR = "/Users/peleke/Documents/ComfyUI/output";
const OUTPUT_DIR = "/Users/peleke/Documents/ComfyUI/output/otter_captioned";

// Caption definitions for each otter panel
const panelCaptions: Record<number, RenderableCaption[]> = {
  1: [
    {
      type: "narration",
      text: "After a long day at work...",
      position: { x: 50, y: 10 },
      zIndex: 1,
    },
  ],
  2: [
    {
      type: "speech",
      text: "Time to breathe...",
      position: { x: 70, y: 20 },
      tailDirection: { x: 40, y: 60 },
      zIndex: 1,
    },
  ],
  3: [
    {
      type: "thought",
      text: "Just let it all go...",
      position: { x: 65, y: 15 },
      tailDirection: { x: 45, y: 55 },
      zIndex: 1,
    },
  ],
  4: [
    {
      type: "sfx",
      text: "WHOOOOSH",
      position: { x: 50, y: 50 },
      style: { fontSize: 36, fontColor: "#FF6B00" },
      zIndex: 1,
    },
  ],
  5: [
    {
      type: "narration",
      text: "The tension fades away.",
      position: { x: 50, y: 88 },
      zIndex: 1,
    },
  ],
  6: [
    {
      type: "speech",
      text: "Much better.",
      position: { x: 70, y: 18 },
      tailDirection: { x: 40, y: 55 },
      zIndex: 1,
    },
    {
      type: "whisper",
      text: "...finally at peace...",
      position: { x: 30, y: 82 },
      style: { fontSize: 12 },
      zIndex: 2,
    },
  ],
};

async function demo() {
  console.log("🎨 Caption Demo: Adding captions to otter stress relief panels\n");

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const [panelNum, captions] of Object.entries(panelCaptions)) {
    const inputPath = `${INPUT_DIR}/otter_panel_${panelNum}.png`;
    const outputPath = `${OUTPUT_DIR}/otter_panel_${panelNum}_captioned.png`;

    console.log(`Panel ${panelNum}: Adding ${captions.length} caption(s)...`);

    try {
      await compositeCaptions(inputPath, captions, outputPath);
      console.log(`  ✅ Saved to ${outputPath}`);
    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("\n✨ Demo complete! Captioned panels saved to:", OUTPUT_DIR);
}

demo().catch(console.error);
