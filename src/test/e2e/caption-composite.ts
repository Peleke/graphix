/**
 * Caption Composite Demo
 *
 * Creates a comic page from the captioned otter panels.
 */

import { renderGrid } from "../../composition/index.js";

const INPUT_DIR = "/Users/peleke/Documents/ComfyUI/output/otter_captioned";
const OUTPUT_PATH = "/Users/peleke/Documents/ComfyUI/output/otter_captioned/otter_comic_page.png";

async function createComposite() {
  console.log("📖 Creating comic page from captioned panels...\n");

  const panels = [
    `${INPUT_DIR}/otter_panel_1_captioned.png`,
    `${INPUT_DIR}/otter_panel_2_captioned.png`,
    `${INPUT_DIR}/otter_panel_3_captioned.png`,
    `${INPUT_DIR}/otter_panel_4_captioned.png`,
    `${INPUT_DIR}/otter_panel_5_captioned.png`,
    `${INPUT_DIR}/otter_panel_6_captioned.png`,
  ];

  const result = await renderGrid(panels, OUTPUT_PATH, {
    columns: 2,
    gutter: 1.5,
    backgroundColor: "#FFFFFF",
  });

  if (result.success) {
    console.log(`✅ Comic page created: ${result.outputPath}`);
    console.log(`   Dimensions: ${result.width}x${result.height}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

createComposite().catch(console.error);
