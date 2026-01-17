/**
 * Caption Pipeline Demo - Full E2E Test
 *
 * This demonstrates the complete caption workflow:
 * 1. Create a project with characters
 * 2. Create a premise and story
 * 3. Generate beats with dialogue
 * 4. Convert to storyboard panels
 * 5. Auto-generate captions from beats
 * 6. Toggle and manage captions
 * 7. Verify complete data flow
 *
 * Run with: bun packages/core/src/__tests__/demo/caption-pipeline-demo.ts
 */

import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
} from "../setup.js";
import { getNarrativeService } from "../../services/narrative.service.js";
import { getProjectService } from "../../services/project.service.js";
import { getCharacterService } from "../../services/character.service.js";
import { getStoryboardService } from "../../services/storyboard.service.js";
import { getPanelService } from "../../services/panel.service.js";
import { getCaptionService } from "../../services/caption.service.js";

// Gap tracking
const gaps: string[] = [];
function trackGap(gap: string) {
  gaps.push(gap);
  console.log(`   ⚠️  GAP: ${gap}`);
}

async function runDemo() {
  console.log("\n" + "=".repeat(70));
  console.log("📸 CAPTION PIPELINE E2E DEMO");
  console.log("=".repeat(70) + "\n");

  // Initialize in-memory database
  await setupTestDatabase();
  resetAllServices();

  const projectService = getProjectService();
  const characterService = getCharacterService();
  const narrativeService = getNarrativeService();
  const storyboardService = getStoryboardService();
  const panelService = getPanelService();
  const captionService = getCaptionService();

  // ===========================================================================
  // Step 1: Create Project
  // ===========================================================================
  console.log("📁 Step 1: Creating project...");
  let project;
  try {
    project = await projectService.create({
      name: "Yacht Adventure",
      description: "An adventure story aboard a mysterious yacht",
    });
    console.log(`   ✓ Created project: "${project.name}" (${project.id})\n`);
  } catch (e) {
    trackGap(`Failed to create project: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Step 2: Create Characters
  // ===========================================================================
  console.log("🦦 Step 2: Creating characters...");
  let sandy, coral;
  try {
    sandy = await characterService.create({
      projectId: project.id,
      name: "Sandy",
      profile: {
        species: "otter",
        bodyType: "slim",
        furColor: "golden brown",
        features: ["bright curious eyes", "adventurous spirit"],
      },
    });
    console.log(`   ✓ Created: ${sandy.name} - ${sandy.profile.species}`);

    coral = await characterService.create({
      projectId: project.id,
      name: "Coral",
      profile: {
        species: "otter",
        bodyType: "average",
        furColor: "dark brown",
        features: ["cautious expression", "loyal companion"],
      },
    });
    console.log(`   ✓ Created: ${coral.name} - ${coral.profile.species}\n`);
  } catch (e) {
    trackGap(`Failed to create characters: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Step 3: Create Premise and Story
  // ===========================================================================
  console.log("💡 Step 3: Creating premise and story...");
  let premise, story;
  try {
    premise = await narrativeService.createPremise({
      projectId: project.id,
      logline: "Two otters discover an abandoned yacht and set sail on an unexpected adventure",
      genre: "comedy-adventure",
      tone: "lighthearted",
      themes: ["friendship", "courage", "discovery"],
      setting: "A sunny marina with crystal-clear waters",
      characterIds: [sandy.id, coral.id],
      status: "active",
    });
    console.log(`   ✓ Created premise: "${premise.logline.substring(0, 50)}..."`);

    story = await narrativeService.createStory({
      premiseId: premise.id,
      title: "The Mysterious Yacht",
      synopsis: "When Sandy and Coral find an abandoned yacht, they embark on a journey that will test their friendship and courage.",
      targetLength: 6,
      structure: "three-act",
    });
    console.log(`   ✓ Created story: "${story.title}"\n`);
  } catch (e) {
    trackGap(`Failed to create premise/story: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Step 4: Create Beats with Dialogue
  // ===========================================================================
  console.log("🎬 Step 4: Creating beats with dialogue...");
  let beats;
  try {
    beats = await narrativeService.createBeats(story.id, [
      {
        position: 0,
        actNumber: 1,
        beatType: "setup",
        visualDescription: "Wide shot of a sunny marina. Sandy is excitedly pointing at a large abandoned yacht.",
        narrativeContext: "Sandy discovers the yacht",
        emotionalTone: "excited",
        characterIds: [sandy.id],
        dialogue: [
          { characterId: sandy.id, text: "Look at that beauty! Can you believe someone just left it here?", type: "speech" },
        ],
        narration: "It was a perfect summer morning when Sandy made the discovery that would change everything.",
        cameraAngle: "wide",
      },
      {
        position: 1,
        actNumber: 1,
        beatType: "inciting",
        visualDescription: "Medium shot of Coral looking nervous while Sandy excitedly gestures at the yacht.",
        narrativeContext: "Coral hesitates",
        emotionalTone: "anxious",
        characterIds: [sandy.id, coral.id],
        dialogue: [
          { characterId: coral.id, text: "Sandy, we can't just take it...", type: "speech" },
          { characterId: sandy.id, text: "We're not taking it, we're borrowing it! Think of the adventure!", type: "speech" },
          { characterId: coral.id, text: "This is a terrible idea...", type: "thought" },
        ],
        cameraAngle: "medium",
      },
      {
        position: 2,
        actNumber: 2,
        beatType: "rising",
        visualDescription: "Close-up of Sandy climbing aboard the yacht with a determined expression.",
        narrativeContext: "Sandy boards the yacht",
        emotionalTone: "determined",
        characterIds: [sandy.id],
        dialogue: [
          { characterId: sandy.id, text: "Here I go!", type: "whisper" },
        ],
        sfx: "*splash*",
        cameraAngle: "close-up",
      },
      {
        position: 3,
        actNumber: 2,
        beatType: "midpoint",
        visualDescription: "Inside the yacht - both otters discover a treasure map on the captain's desk.",
        narrativeContext: "Discovery of the treasure map",
        emotionalTone: "amazed",
        characterIds: [sandy.id, coral.id],
        dialogue: [
          { characterId: sandy.id, text: "Is that... a treasure map?!", type: "speech" },
          { characterId: coral.id, text: "Okay, I admit... this is exciting.", type: "speech" },
        ],
        narration: "In that moment, their simple curiosity became a true adventure.",
        sfx: "*paper rustling*",
        cameraAngle: "over-the-shoulder",
      },
      {
        position: 4,
        actNumber: 3,
        beatType: "climax",
        visualDescription: "Wide shot of the yacht sailing into the sunset with both otters at the helm.",
        narrativeContext: "Setting sail together",
        emotionalTone: "triumphant",
        characterIds: [sandy.id, coral.id],
        dialogue: [
          { characterId: coral.id, text: "I can't believe we're actually doing this!", type: "speech" },
          { characterId: sandy.id, text: "Best friends, best adventure!", type: "speech" },
        ],
        cameraAngle: "wide",
      },
      {
        position: 5,
        actNumber: 3,
        beatType: "resolution",
        visualDescription: "Medium shot of both otters standing proudly on the yacht, looking at the horizon.",
        narrativeContext: "Beginning of the journey",
        emotionalTone: "hopeful",
        characterIds: [sandy.id, coral.id],
        dialogue: [
          { characterId: sandy.id, text: "Thank you for trusting me.", type: "speech" },
          { characterId: coral.id, text: "Thank you for believing in adventure.", type: "speech" },
        ],
        narration: "And so began the greatest adventure of their lives.",
        cameraAngle: "medium",
      },
    ]);
    console.log(`   ✓ Created ${beats.length} beats with dialogue\n`);

    // Verify beat structure
    for (const beat of beats) {
      if (!beat.dialogue || beat.dialogue.length === 0) {
        if (!beat.narration && !beat.sfx) {
          trackGap(`Beat ${beat.position} has no dialogue, narration, or sfx`);
        }
      }
    }
  } catch (e) {
    trackGap(`Failed to create beats: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Step 5: Create Storyboard and Convert Story
  // ===========================================================================
  console.log("📋 Step 5: Creating storyboard and converting story...");
  let storyboard, conversion;
  try {
    storyboard = await storyboardService.create({
      projectId: project.id,
      name: "Yacht Adventure Storyboard",
      description: "Visual storyboard for the yacht adventure",
    });
    console.log(`   ✓ Created storyboard: "${storyboard.name}"`);

    conversion = await narrativeService.convertStoryToStoryboard(story.id, storyboard.id);
    console.log(`   ✓ Converted story to ${conversion.panelIds.length} panels\n`);

    if (conversion.panelIds.length !== beats.length) {
      trackGap(`Panel count (${conversion.panelIds.length}) doesn't match beat count (${beats.length})`);
    }
  } catch (e) {
    trackGap(`Failed to create storyboard/convert: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Step 6: Generate Captions from Beats
  // ===========================================================================
  console.log("💬 Step 6: Generating captions from beats...");
  let captionResults;
  try {
    captionResults = await narrativeService.generateCaptionsForStory(story.id);
    console.log(`   ✓ Generated captions for ${captionResults.length} panels:`);

    let totalCaptions = 0;
    for (const result of captionResults) {
      totalCaptions += result.captions.length;
      console.log(`      Panel: ${result.captions.length} captions`);

      // Verify caption-beat linkage
      for (const caption of result.captions) {
        if (!caption.beatId) {
          trackGap(`Caption ${caption.id} missing beatId`);
        }
        if (!caption.generatedFromBeat) {
          trackGap(`Caption ${caption.id} not marked as generatedFromBeat`);
        }
      }
    }
    console.log(`   ✓ Total: ${totalCaptions} captions generated\n`);

    // Expected caption counts based on beat content:
    // Beat 0: 1 speech + 1 narration = 2
    // Beat 1: 2 speech + 1 thought = 3
    // Beat 2: 1 whisper + 1 sfx = 2
    // Beat 3: 2 speech + 1 narration + 1 sfx = 4
    // Beat 4: 2 speech = 2
    // Beat 5: 2 speech + 1 narration = 3
    // Total: 16
    if (totalCaptions < 16) {
      trackGap(`Expected at least 16 captions, got ${totalCaptions}`);
    }
  } catch (e) {
    trackGap(`Failed to generate captions: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Step 7: Caption Management Operations
  // ===========================================================================
  console.log("⚙️  Step 7: Testing caption management operations...");
  try {
    // Get all captions for first panel
    const firstPanelId = captionResults[0].panelId;
    const panelCaptions = await captionService.getByPanel(firstPanelId);
    console.log(`   ✓ Retrieved ${panelCaptions.length} captions for first panel`);

    // Toggle a caption off
    const firstCaption = panelCaptions[0];
    const toggled = await narrativeService.toggleCaptionEnabled(firstCaption.id);
    console.log(`   ✓ Toggled caption "${firstCaption.text.substring(0, 30)}..." to enabled=${toggled.enabled}`);

    // Get enabled-only captions
    const enabledCaptions = await narrativeService.getCaptionsForPanel(firstPanelId, { enabledOnly: true });
    console.log(`   ✓ Enabled captions: ${enabledCaptions.length} (1 disabled)`);

    if (enabledCaptions.length !== panelCaptions.length - 1) {
      trackGap(`Expected ${panelCaptions.length - 1} enabled captions, got ${enabledCaptions.length}`);
    }

    // Toggle back on
    await narrativeService.toggleCaptionEnabled(firstCaption.id);
    console.log(`   ✓ Toggled caption back on`);

    // Test type filtering
    const speechCaptions = await narrativeService.getCaptionsForPanel(firstPanelId, { types: ["speech"] });
    console.log(`   ✓ Speech-only captions: ${speechCaptions.length}`);

    // Test manual caption update
    const updated = await captionService.update(firstCaption.id, { text: "EDITED: " + firstCaption.text });
    console.log(`   ✓ Updated caption text, manuallyEdited=${updated.manuallyEdited}`);

    if (!updated.manuallyEdited) {
      trackGap("Caption update didn't set manuallyEdited flag");
    }

    // Test reordering
    if (panelCaptions.length >= 2) {
      const newOrder = [panelCaptions[1].id, panelCaptions[0].id];
      const reordered = await captionService.reorder(firstPanelId, newOrder);
      console.log(`   ✓ Reordered captions: ${reordered[0].orderIndex}, ${reordered[1].orderIndex}`);

      if (reordered[0].orderIndex !== 0 || reordered[1].orderIndex !== 1) {
        trackGap("Reorder didn't set correct orderIndex values");
      }
    }

    console.log("");
  } catch (e) {
    trackGap(`Failed caption management: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Step 8: Verify Complete Data Flow
  // ===========================================================================
  console.log("🔍 Step 8: Verifying complete data flow...");
  try {
    // Get story with beats
    const fullStory = await narrativeService.getStoryWithBeats(story.id);
    console.log(`   ✓ Story "${fullStory?.title}" has ${fullStory?.beats.length} beats`);

    // Verify all beats have panels
    const beatsWithPanels = fullStory?.beats.filter((b) => b.panelId !== null).length ?? 0;
    console.log(`   ✓ Beats with panels: ${beatsWithPanels}/${fullStory?.beats.length}`);

    if (beatsWithPanels !== fullStory?.beats.length) {
      trackGap(`${(fullStory?.beats.length ?? 0) - beatsWithPanels} beats missing panels`);
    }

    // Verify all panels have captions
    const panels = await panelService.getByStoryboard(storyboard.id);
    let panelsWithCaptions = 0;
    for (const panel of panels) {
      const captions = await captionService.getByPanel(panel.id);
      if (captions.length > 0) {
        panelsWithCaptions++;
      } else {
        trackGap(`Panel ${panel.id} has no captions`);
      }
    }
    console.log(`   ✓ Panels with captions: ${panelsWithCaptions}/${panels.length}`);

    // Verify caption character linkage
    let captionsWithCharacter = 0;
    let totalDialogueCaptions = 0;
    for (const result of captionResults) {
      for (const caption of result.captions) {
        if (caption.type === "speech" || caption.type === "thought" || caption.type === "whisper") {
          totalDialogueCaptions++;
          if (caption.characterId) {
            captionsWithCharacter++;
          } else {
            trackGap(`Dialogue caption "${caption.text.substring(0, 20)}..." missing characterId`);
          }
        }
      }
    }
    console.log(`   ✓ Dialogue captions with character: ${captionsWithCharacter}/${totalDialogueCaptions}`);

    console.log("");
  } catch (e) {
    trackGap(`Failed data verification: ${e}`);
    throw e;
  }

  // ===========================================================================
  // Summary
  // ===========================================================================
  console.log("=".repeat(70));
  console.log("📊 DEMO SUMMARY");
  console.log("=".repeat(70));
  console.log(`   Project: ${project.name}`);
  console.log(`   Characters: ${sandy.name}, ${coral.name}`);
  console.log(`   Story: ${story.title}`);
  console.log(`   Beats: ${beats.length}`);
  console.log(`   Panels: ${conversion.panelIds.length}`);
  console.log(`   Total Captions: ${captionResults.reduce((sum, r) => sum + r.captions.length, 0)}`);
  console.log("");

  if (gaps.length === 0) {
    console.log("✅ NO GAPS DETECTED - Pipeline is working correctly!");
  } else {
    console.log(`❌ ${gaps.length} GAPS DETECTED:`);
    gaps.forEach((gap, i) => {
      console.log(`   ${i + 1}. ${gap}`);
    });
  }

  console.log("");
  return gaps;
}

// Run the demo
runDemo()
  .then((gaps) => {
    if (gaps.length > 0) {
      console.log("\n⚠️  Demo completed with gaps that need attention.");
      process.exit(1);
    } else {
      console.log("\n🎉 Demo completed successfully!");
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error("\n💥 Demo failed with error:", err);
    process.exit(1);
  });
