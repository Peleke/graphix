/**
 * Test Interpolation Pipeline
 *
 * Tests the interpolation service with the arm wrestling images.
 */

import { getComfyUIClient } from "../../generation/comfyui-client.js";
import { mkdir } from "fs/promises";

const INPUT_DIR = "/Users/peleke/Documents/ComfyUI/input";
const OUTPUT_DIR = "/Users/peleke/Documents/ComfyUI/output/interpolation_test";

async function testInterpolation() {
  console.log("🔄 Testing Interpolation Pipeline\n");

  await mkdir(OUTPUT_DIR, { recursive: true });

  const client = getComfyUIClient();

  // We'll use img2img to create an interpolated frame between two endpoints
  // Frame A: Original arm wrestling scene (wolf vs fox)
  // Frame B: Cat variant we just created
  // Interpolated: Something in between

  console.log("Creating interpolated frame (50% blend)...");

  // Using img2img with the original as source, prompting toward the cat variant
  const result = await client.img2img({
    prompt: "two anthro characters arm wrestling, one wolf one cat, tavern background, anime style, furry art",
    negative_prompt: "human, realistic, deformed",
    source_image: "arm_wrestling_ref.png", // Original wolf/fox
    denoising_strength: 0.5, // 50% = midpoint blend
    model: "novaFurryXL_ilV130.safetensors",
    width: 768,
    height: 768,
    steps: 28,
    cfg_scale: 7,
    sampler: "euler_ancestral",
    output_path: `${OUTPUT_DIR}/interp_50_blend.png`,
  });

  if (result.success) {
    console.log(`✅ Interpolated frame created: ${result.localPath}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }

  // Test pose-guided generation (ControlNet)
  console.log("\nCreating pose-guided variant...");

  // First preprocess to get pose
  const poseResult = await client.preprocessImage({
    input_image: "arm_wrestling_ref.png",
    control_type: "openpose",
    output_path: `${OUTPUT_DIR}/pose_skeleton.png`,
  });

  if (poseResult.success) {
    console.log(`✅ Pose extracted: ${poseResult.localPath}`);

    // Now generate with that pose but different prompt
    const controlResult = await client.generateWithControlNet({
      prompt: "two anthro raccoons arm wrestling, striped fur, masked faces, tavern background, anime style",
      negative_prompt: "human, realistic, deformed",
      control_image: `${OUTPUT_DIR}/pose_skeleton.png`,
      control_type: "openpose",
      strength: 0.8,
      model: "novaFurryXL_ilV130.safetensors",
      width: 768,
      height: 768,
      steps: 28,
      cfg_scale: 7,
      output_path: `${OUTPUT_DIR}/pose_guided_raccoons.png`,
    });

    if (controlResult.success) {
      console.log(`✅ Pose-guided generation: ${controlResult.localPath}`);
    } else {
      console.error(`❌ Pose-guided failed: ${controlResult.error}`);
    }
  }

  console.log("\n✨ Interpolation test complete!");
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

testInterpolation().catch(console.error);
