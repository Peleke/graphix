/**
 * Narrative Engine Demo - Full User Flow
 *
 * This demonstrates the complete workflow:
 * 1. Create a project
 * 2. Create characters
 * 3. Create a premise from a logline
 * 4. Create a story from the premise
 * 5. Generate beats for the story
 * 6. Convert the story to a storyboard with panels
 */

import { getDb, initDb } from "../../db/client.js";
import { getNarrativeService, resetNarrativeService } from "../../services/narrative.service.js";
import { getProjectService, resetProjectService } from "../../services/project.service.js";
import { getCharacterService, resetCharacterService } from "../../services/character.service.js";
import { getStoryboardService, resetStoryboardService } from "../../services/storyboard.service.js";
import { getPanelService, resetPanelService } from "../../services/panel.service.js";

async function runDemo() {
  console.log("\n" + "=".repeat(60));
  console.log("🎬 NARRATIVE ENGINE DEMO - Full User Flow");
  console.log("=".repeat(60) + "\n");

  // Initialize in-memory database
  initDb(":memory:");
  const db = getDb();

  // Reset all services to use fresh instances
  resetProjectService();
  resetCharacterService();
  resetNarrativeService();
  resetStoryboardService();
  resetPanelService();

  const projectService = getProjectService();
  const characterService = getCharacterService();
  const narrativeService = getNarrativeService();
  const storyboardService = getStoryboardService();
  const panelService = getPanelService();

  // =========================================================================
  // Step 1: Create a Project
  // =========================================================================
  console.log("📁 Step 1: Creating project...");
  const project = await projectService.create({
    name: "Otter Adventures",
    description: "A comic series about two adventurous otters",
  });
  console.log(`   ✓ Created project: "${project.name}" (${project.id})\n`);

  // =========================================================================
  // Step 2: Create Characters
  // =========================================================================
  console.log("🦦 Step 2: Creating characters...");

  const sandy = await characterService.create({
    projectId: project.id,
    name: "Sandy",
    profile: {
      species: "otter",
      bodyType: "slim",
      furColor: "golden brown",
      features: ["bright curious eyes", "adventurous spirit"],
    },
  });
  console.log(`   ✓ Created character: ${sandy.name} - ${sandy.profile.species}`);

  const coral = await characterService.create({
    projectId: project.id,
    name: "Coral",
    profile: {
      species: "otter",
      bodyType: "average",
      furColor: "dark brown",
      features: ["cautious expression", "loyal companion"],
    },
  });
  console.log(`   ✓ Created character: ${coral.name} - ${coral.profile.species}\n`);

  // =========================================================================
  // Step 3: Create a Premise
  // =========================================================================
  console.log("💡 Step 3: Creating premise from logline...");

  const premise = await narrativeService.createPremise({
    projectId: project.id,
    logline: "Two otter friends discover an abandoned yacht and embark on an unexpected ocean adventure",
    genre: "comedy-adventure",
    tone: "lighthearted",
    themes: ["friendship", "discovery", "courage"],
    setting: "A sunny marina with crystal-clear waters",
    characterIds: [sandy.id, coral.id],
    status: "active",
  });

  console.log(`   ✓ Created premise: "${premise.logline}"`);
  console.log(`   ✓ Genre: ${premise.genre}, Tone: ${premise.tone}`);
  console.log(`   ✓ Themes: ${premise.themes?.join(", ")}`);
  console.log(`   ✓ Characters: ${premise.characterIds?.length} assigned\n`);

  // =========================================================================
  // Step 4: Create a Story from the Premise
  // =========================================================================
  console.log("📖 Step 4: Creating story from premise...");

  const story = await narrativeService.createStory({
    premiseId: premise.id,
    title: "The Yacht Discovery",
    synopsis: "Sandy and Coral stumble upon a beautiful abandoned yacht while exploring the marina. Despite Coral's initial hesitation, Sandy convinces her to climb aboard. What starts as simple curiosity becomes the adventure of a lifetime as they accidentally set sail into the open ocean.",
    structure: "three-act",
    targetLength: 6,
    characterArcs: [
      {
        characterId: sandy.id,
        startState: "Curious and impulsive",
        endState: "Still adventurous but more thoughtful",
        keyMoments: ["Discovers the yacht", "Convinces Coral to board", "Takes the helm"],
      },
      {
        characterId: coral.id,
        startState: "Cautious and worried",
        endState: "Brave and confident",
        keyMoments: ["Reluctantly boards", "Saves the day during storm", "Embraces adventure"],
      },
    ],
  });

  console.log(`   ✓ Created story: "${story.title}"`);
  console.log(`   ✓ Structure: ${story.structure}`);
  console.log(`   ✓ Target length: ${story.targetLength} panels`);
  console.log(`   ✓ Character arcs: ${story.characterArcs?.length} defined\n`);

  // =========================================================================
  // Step 5: Create Beats for the Story
  // =========================================================================
  console.log("🎯 Step 5: Creating story beats...");

  const beatsData = [
    {
      position: 0,
      actNumber: 1,
      beatType: "setup" as const,
      visualDescription: "Wide shot of a sunny marina. Sandy and Coral are swimming near the docks, sunlight sparkling on the water.",
      narrativeContext: "Establishing the peaceful setting before the adventure begins",
      emotionalTone: "peaceful",
      characterIds: [sandy.id, coral.id],
      characterActions: { [sandy.id]: "swimming playfully", [coral.id]: "floating nearby" },
      cameraAngle: "wide",
      narration: "It was just another sunny day at the marina...",
    },
    {
      position: 1,
      actNumber: 1,
      beatType: "inciting" as const,
      visualDescription: "Sandy spots something in the distance - a gleaming white yacht with its anchor down. Her eyes go wide with excitement.",
      narrativeContext: "The discovery that sets the adventure in motion",
      emotionalTone: "excited",
      characterIds: [sandy.id],
      characterActions: { [sandy.id]: "pointing excitedly at the yacht" },
      cameraAngle: "medium",
      dialogue: [{ characterId: sandy.id, text: "Coral! Look at THAT!", type: "speech" as const }],
    },
    {
      position: 2,
      actNumber: 1,
      beatType: "rising" as const,
      visualDescription: "The two otters climb up the yacht's anchor chain. Sandy leads confidently while Coral looks nervous.",
      narrativeContext: "The decision to explore despite fear",
      emotionalTone: "tense",
      characterIds: [sandy.id, coral.id],
      characterActions: { [sandy.id]: "climbing eagerly", [coral.id]: "climbing hesitantly" },
      cameraAngle: "low angle",
      dialogue: [{ characterId: coral.id, text: "Are you sure about this?", type: "whisper" as const }],
    },
    {
      position: 3,
      actNumber: 2,
      beatType: "midpoint" as const,
      visualDescription: "Sandy accidentally bumps the throttle and the yacht lurches forward! Both otters tumble across the deck.",
      narrativeContext: "The point of no return - they're now at sea",
      emotionalTone: "chaotic",
      characterIds: [sandy.id, coral.id],
      characterActions: { [sandy.id]: "tumbling", [coral.id]: "grabbing the railing" },
      cameraAngle: "dynamic",
      sfx: "VROOOOM!",
    },
    {
      position: 4,
      actNumber: 3,
      beatType: "climax" as const,
      visualDescription: "Coral takes the wheel, steering confidently through rough waves. Sandy cheers her on from beside her.",
      narrativeContext: "Coral overcomes her fear and saves them both",
      emotionalTone: "triumphant",
      characterIds: [sandy.id, coral.id],
      characterActions: { [sandy.id]: "cheering", [coral.id]: "steering with determination" },
      cameraAngle: "close-up",
      dialogue: [{ characterId: sandy.id, text: "You've got this!", type: "speech" as const }],
    },
    {
      position: 5,
      actNumber: 3,
      beatType: "resolution" as const,
      visualDescription: "The yacht safely anchored near a tropical island. Sandy and Coral sit on deck watching the sunset, exhausted but happy.",
      narrativeContext: "The adventure concludes with newfound confidence",
      emotionalTone: "warm",
      characterIds: [sandy.id, coral.id],
      characterActions: { [sandy.id]: "leaning on Coral", [coral.id]: "smiling contentedly" },
      cameraAngle: "wide",
      narration: "And that's how two otters found more than just a yacht - they found courage.",
    },
  ];

  await narrativeService.createBeats(story.id, beatsData);
  const beats = await narrativeService.getBeats(story.id);

  console.log(`   ✓ Created ${beats.length} beats:`);
  for (const beat of beats) {
    console.log(`     ${beat.position + 1}. [${beat.beatType}] ${beat.visualDescription?.slice(0, 50)}...`);
  }
  console.log();

  // =========================================================================
  // Step 6: Convert Story to Storyboard
  // =========================================================================
  console.log("🎨 Step 6: Converting story to storyboard...");

  const storyboard = await storyboardService.create({
    projectId: project.id,
    name: "The Yacht Discovery - Storyboard",
  });
  console.log(`   ✓ Created storyboard: "${storyboard.name}"`);

  const result = await narrativeService.convertStoryToStoryboard(story.id, storyboard.id);
  console.log(`   ✓ Converted ${result.panelIds.length} beats to panels`);

  // Fetch and display panels
  const panels = await panelService.getByStoryboard(storyboard.id);
  console.log(`\n   📋 Generated Panels:`);
  for (const panel of panels) {
    console.log(`     Panel ${panel.position + 1}: "${panel.description?.slice(0, 60)}..."`);
    console.log(`        Mood: ${panel.mood}, Camera: ${panel.cameraAngle || "default"}`);
  }

  // =========================================================================
  // Verify the full chain
  // =========================================================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ VERIFICATION - Full Chain Integrity");
  console.log("=".repeat(60));

  const verifyPremise = await narrativeService.getPremise(premise.id);
  const verifyStory = await narrativeService.getStory(story.id);
  const verifyBeats = await narrativeService.getBeats(story.id);
  const verifyPanels = await panelService.getByStoryboard(storyboard.id);

  console.log(`\n   Premise → Story → Beats → Panels`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   Premise ID:  ${verifyPremise?.id}`);
  console.log(`   Story ID:    ${verifyStory?.id} (belongs to premise: ${verifyStory?.premiseId === premise.id ? '✓' : '✗'})`);
  console.log(`   Beats:       ${verifyBeats.length} (belong to story: ${verifyBeats.every(b => b.storyId === story.id) ? '✓' : '✗'})`);
  console.log(`   Panels:      ${verifyPanels.length} (in storyboard: ${verifyPanels.every(p => p.storyboardId === storyboard.id) ? '✓' : '✗'})`);
  console.log(`   Beat→Panel:  ${verifyBeats.filter(b => b.panelId).length}/${verifyBeats.length} linked`);

  // Check story actualLength was updated
  console.log(`   Story length: target=${verifyStory?.targetLength}, actual=${verifyStory?.actualLength}`);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEMO COMPLETE - Narrative Engine Working!");
  console.log("=".repeat(60) + "\n");
}

// Run the demo
runDemo().catch(console.error);
