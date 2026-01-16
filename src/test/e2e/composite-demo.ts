/**
 * Quick composite demo for otter panels
 */
import { getCompositionService } from "../../composition/service.js";

const outputDir = "/Users/peleke/Documents/ComfyUI/output";

async function main() {
  const service = getCompositionService();

  const panels = [
    `${outputDir}/otter_panel_1.png`,
    `${outputDir}/otter_panel_2.png`,
    `${outputDir}/otter_panel_3.png`,
    `${outputDir}/otter_panel_4.png`,
    `${outputDir}/otter_panel_5.png`,
    `${outputDir}/otter_panel_6.png`,
  ];

  console.log("Creating comic page composite...");

  const result = await service.composeFromPaths({
    templateId: "six-grid",
    panelPaths: panels,
    outputPath: `${outputDir}/otter_composite/mira_page.png`,
    pageSize: "letter",
    backgroundColor: "#1a1a2e",
    gutterSize: 20,
    margin: 40,
    panelBorderRadius: 8,
    panelBorderWidth: 3,
    panelBorderColor: "#FFE4B5",
  });

  console.log("Success:", result.success);
  console.log("Composite saved to:", result.outputPath);
  console.log("Dimensions:", result.width, "x", result.height);
  if (result.error) console.log("Error:", result.error);

  // Also create a contact sheet
  console.log("\nCreating contact sheet...");
  const contactSheet = await service.contactSheetFromPaths({
    imagePaths: panels,
    outputPath: `${outputDir}/otter_composite/mira_contact_sheet.png`,
    columns: 3,
    thumbnailSize: 400,
    gap: 10,
    backgroundColor: "#1a1a2e",
  });

  console.log("Success:", contactSheet.success);
  console.log("Contact sheet saved to:", contactSheet.outputPath);
  if (contactSheet.error) console.log("Error:", contactSheet.error);
}

main().catch(console.error);
