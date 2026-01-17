/**
 * Complete Comic Generation Flow E2E Test
 * 
 * Tests the full workflow from project creation to comic generation:
 * 1. Create project
 * 2. Create characters
 * 3. Create premise/story
 * 4. Create storyboard
 * 5. Generate panels with ControlNet
 * 6. Compose page
 * 7. Export
 * 
 * This test demonstrates the complete workflow for client commission proof.
 * Run with: npx playwright test flow-complete-comic-generation --headed
 */

import { test, expect } from "../fixtures/test-fixtures";

test.describe("Complete Comic Generation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("Generate NSFW comic from scratch - full workflow", async ({ page }) => {
    // Step 1: Create Project
    await test.step("Create new project", async () => {
      await page.click('button:has-text("New Project")');
      await page.fill('input[placeholder*="Project name"]', "Otter Yacht Adventure");
      await page.press('input[placeholder*="Project name"]', "Enter");
      await page.waitForTimeout(1000); // Wait for project creation
    });

    // Step 2: Navigate to project workspace
    await test.step("Open project workspace", async () => {
      // Click on the newly created project card
      await page.click('text=Otter Yacht Adventure');
      await page.waitForURL(/\/projects\/.*/);
    });

    // Step 3: Create Characters
    await test.step("Create characters", async () => {
      // Navigate to characters (assuming sidebar nav)
      await page.click('text=Characters');
      await page.waitForTimeout(500);

      // Create first character
      await page.click('button:has-text("New Character")');
      await page.fill('input[placeholder*="name" i]', "Marina");
      await page.fill('input[placeholder*="species" i]', "Otter");
      await page.fill('textarea[placeholder*="description" i]', "A playful otter with a mischievous streak");
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Create second character
      await page.click('button:has-text("New Character")');
      await page.fill('input[placeholder*="name" i]', "Maxi");
      await page.fill('input[placeholder*="species" i]', "Otter");
      await page.fill('textarea[placeholder*="description" i]', "Marina's adventurous friend");
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);
    });

    // Step 4: Create Premise/Story
    await test.step("Create story premise", async () => {
      // Navigate to Story Editor (should be default view)
      await page.click('text=Story Editor');
      await page.waitForTimeout(500);

      // Create premise
      await page.click('button:has-text("New Premise")');
      await page.fill('input[placeholder*="Logline"]', "Two otters get drunk on a yacht and have wild, messy fun");
      await page.fill('input[placeholder*="Genre"]', "Erotic Comedy");
      await page.fill('input[placeholder*="Tone"]', "Playful, Explicit");
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Select premise and create story
      await page.click('.premise-item:has-text("Two otters")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("New Story")');
      await page.click('button:has-text("Create Story")');
      await page.waitForTimeout(1000);
    });

    // Step 5: Create Storyboard
    await test.step("Create storyboard", async () => {
      await page.click('text=Storyboard');
      await page.waitForTimeout(500);

      await page.click('button:has-text("New Storyboard")');
      await page.fill('input[placeholder*="Storyboard name"]', "Yacht Scene");
      await page.fill('textarea[placeholder*="Description"]', "The main yacht scene with Marina and Maxi");
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);
    });

    // Step 6: Generate Panels
    await test.step("Generate panels with ControlNet", async () => {
      // Select storyboard
      await page.click('.storyboard-item:has-text("Yacht Scene")');
      await page.waitForTimeout(500);

      // Navigate to Panel Generator
      await page.click('text=Panel Generator');
      await page.waitForTimeout(500);

      // Select characters
      await page.click('.character-item:has-text("Marina")');
      await page.click('.character-item:has-text("Maxi")');
      await page.waitForTimeout(500);

      // Set ControlNet level
      await page.click('.level-option:has-text("Level 3")');
      await page.waitForTimeout(500);

      // Enter prompt
      await page.fill('textarea[placeholder*="Positive prompt"]', 
        "Two otters, Marina and Maxi, on a luxury yacht, getting drunk, playful and messy, explicit NSFW content, wet fur, pleasure, motion lines, detailed, high quality"
      );
      await page.fill('textarea[placeholder*="Negative prompt"]',
        "bad quality, blurry, low resolution, watermark, human"
      );

      // Generate variants
      await page.fill('input[type="number"]', "4");
      await page.click('button:has-text("Generate 4")');
      
      // Wait for generation to complete (with timeout)
      await page.waitForSelector('.generation-card', { timeout: 60000 });
      await page.waitForTimeout(2000); // Let images load
    });

    // Step 7: Select best generation
    await test.step("Select best generation", async () => {
      // Click first generation card
      const firstGen = page.locator('.generation-card').first();
      await firstGen.click();
      await page.waitForTimeout(1000);
      
      // Verify it's selected
      await expect(firstGen).toHaveClass(/selected/);
    });

    // Step 8: Compose Page
    await test.step("Compose page", async () => {
      await page.click('text=Page Composer');
      await page.waitForTimeout(500);

      // Select template
      const firstTemplate = page.locator('.template-card').first();
      await firstTemplate.click();
      await page.waitForTimeout(500);

      // Export page
      await page.click('button:has-text("Export Page")');
      await page.fill('input[placeholder*="Output name"]', "yacht-scene-page-1");
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(2000);
    });

    // Step 9: Verify final result
    await test.step("Verify comic was created", async () => {
      // Check that we're back in the composer with the page
      await expect(page.locator('.page-canvas')).toBeVisible();
      
      // Take screenshot for proof
      await page.screenshot({ 
        path: 'e2e/screenshots/comic-generation-complete.png',
        fullPage: true 
      });
    });
  });

  test("Generate comic - quick path (minimal setup)", async ({ page }) => {
    // Quick path: Create project → Generate → Export
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder*="Project name"]', "Quick Test Comic");
    await page.press('input[placeholder*="Project name"]', "Enter");
    await page.waitForTimeout(1000);

    await page.click('text=Quick Test Comic');
    await page.waitForURL(/\/projects\/.*/);

    // Skip to panel generation (assuming panels can be created directly)
    await page.click('text=Panel Generator');
    await page.waitForTimeout(500);

    // Generate with minimal config
    await page.fill('textarea[placeholder*="Positive prompt"]', 
      "Two otters on a yacht, NSFW, explicit, detailed"
    );
    await page.click('button:has-text("Generate Single")');
    
    // Wait for result
    await page.waitForSelector('.generation-card', { timeout: 60000 });
    
    // Verify generation appeared
    const genCard = page.locator('.generation-card').first();
    await expect(genCard).toBeVisible();
  });
});
