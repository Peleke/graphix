/**
 * Caption Placement Demo
 *
 * Tests the AI-augmented caption placement system.
 */

import { suggestPlacement, suggestMultiplePlacements } from "../../composition/index.js";
import type { CaptionType } from "../../db/schema.js";

const INPUT_DIR = "/Users/peleke/Documents/ComfyUI/output";

async function demo() {
  console.log("🎯 Caption Placement Demo\n");

  // Test single placement suggestion
  console.log("=== Single Caption Placement ===\n");

  const panels = [1, 2, 3, 4, 5, 6];
  const captionTypes: CaptionType[] = ["narration", "speech", "thought", "sfx", "narration", "speech"];

  for (let i = 0; i < panels.length; i++) {
    const panelNum = panels[i];
    const captionType = captionTypes[i];
    const imagePath = `${INPUT_DIR}/otter_panel_${panelNum}.png`;

    console.log(`Panel ${panelNum} (${captionType}):`);

    try {
      const suggestions = await suggestPlacement(imagePath, { captionType });

      if (suggestions.length > 0) {
        const best = suggestions[0];
        console.log(`  Best: (${best.position.x.toFixed(1)}%, ${best.position.y.toFixed(1)}%) - ${best.region}`);
        console.log(`  Confidence: ${(best.confidence * 100).toFixed(0)}%`);
        console.log(`  Reason: ${best.reasoning}`);
      }
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log();
  }

  // Test multiple placement suggestions
  console.log("=== Multiple Caption Placement (Panel 6) ===\n");

  const multiTypes: CaptionType[] = ["speech", "whisper", "sfx"];
  const multiPath = `${INPUT_DIR}/otter_panel_6.png`;

  try {
    const placements = await suggestMultiplePlacements(multiPath, multiTypes);

    for (const [type, suggestion] of placements) {
      console.log(`${type}:`);
      console.log(`  Position: (${suggestion.position.x.toFixed(1)}%, ${suggestion.position.y.toFixed(1)}%)`);
      console.log(`  Region: ${suggestion.region}`);
      console.log(`  Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    }
  } catch (error) {
    console.log(`Error: ${error instanceof Error ? error.message : error}`);
  }

  console.log("\n✨ Placement demo complete!");
}

demo().catch(console.error);
