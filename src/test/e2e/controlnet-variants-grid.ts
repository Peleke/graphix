/**
 * ControlNet Variants Grid
 *
 * Composes the character variants into a comparison grid.
 */

import { renderGrid } from "../../composition/index.js";

const DIR = "/Users/peleke/Documents/ComfyUI/output/arm_wrestling";

async function createVariantGrid() {
  console.log("Creating ControlNet variant comparison grid...");

  const result = await renderGrid(
    [
      `${DIR}/v2_panel_1_setup.png`,       // Original
      `${DIR}/variant_femboy_fox.png`,      // Fox variant
      `${DIR}/variant_femboy_otter.png`,    // Otter variant
      `${DIR}/variant_femboy_rabbit.png`,   // Rabbit variant
      `${DIR}/variant_femboy_deer.png`,     // Deer variant
    ],
    `${DIR}/controlnet_variants_grid.png`,
    { columns: 3, gutter: 4, backgroundColor: "#1a1a1a" }
  );

  if (result.success) {
    console.log(`\n✅ Grid saved: ${result.outputPath}`);
    console.log(`   Dimensions: ${result.width}x${result.height}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

createVariantGrid().catch(console.error);
