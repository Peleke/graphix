/**
 * Marathon Series - Lead-In Narratives Demo
 *
 * Creates SFW narrative lead-ins that establish context for each scene.
 * Demonstrates the full Premise → Story → Beats → Panels pipeline.
 */

import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import { getNarrativeService } from "../../services/narrative.service.js";
import { getProjectService } from "../../services/project.service.js";
import { getCharacterService } from "../../services/character.service.js";
import { getStoryboardService } from "../../services/storyboard.service.js";
import { getPanelService } from "../../services/panel.service.js";

async function createMarathonLeadIns() {
  console.log("\n" + "=".repeat(70));
  console.log("🎬 MARATHON SERIES - Narrative Lead-Ins");
  console.log("=".repeat(70) + "\n");

  // Initialize in-memory database with all tables
  await setupTestDatabase();

  const projectService = getProjectService();
  const characterService = getCharacterService();
  const narrativeService = getNarrativeService();
  const storyboardService = getStoryboardService();
  const panelService = getPanelService();

  // =========================================================================
  // Create Project
  // =========================================================================
  console.log("📁 Creating project...\n");
  const project = await projectService.create({
    name: "Marathon Series",
    description: "A series of intimate vignettes between characters",
  });

  // =========================================================================
  // Create Characters
  // =========================================================================
  console.log("🎭 Creating characters...\n");

  const ruby = await characterService.create({
    projectId: project.id,
    name: "Ruby",
    profile: {
      species: "cheetah",
      bodyType: "slim",
      furColor: "golden with black spots",
      features: ["vibrant red hair", "confident amber eyes", "playful smirk"],
    },
  });
  console.log(`   ✓ ${ruby.name} - Red-haired cheetah, bold and flirtatious`);

  const cream = await characterService.create({
    projectId: project.id,
    name: "Cream",
    profile: {
      species: "fennec fox",
      bodyType: "shortstack",
      furColor: "cream white",
      features: ["large expressive ears", "soft amber eyes", "gentle demeanor"],
    },
  });
  console.log(`   ✓ ${cream.name} - Cream-colored fennec, sweet and affectionate`);

  const obsidian = await characterService.create({
    projectId: project.id,
    name: "Obsidian",
    profile: {
      species: "panther",
      bodyType: "athletic",
      furColor: "deep black with subtle sheen",
      features: ["piercing cyan eyes", "confident posture", "mysterious aura"],
    },
  });
  console.log(`   ✓ ${obsidian.name} - Black panther, mysterious and intense\n`);

  // =========================================================================
  // SCENE 1: Morning Cuddles (Ruby & Cream)
  // =========================================================================
  console.log("─".repeat(70));
  console.log("📖 SCENE 1: Morning Light");
  console.log("─".repeat(70) + "\n");

  const premise1 = await narrativeService.createPremise({
    projectId: project.id,
    logline: "Ruby and Cream share a lazy morning in bed, the warmth between them undeniable",
    genre: "romance",
    tone: "tender",
    themes: ["intimacy", "comfort", "morning rituals"],
    setting: "A cozy bedroom bathed in soft morning light",
    characterIds: [ruby.id, cream.id],
    status: "active",
  });

  const story1 = await narrativeService.createStory({
    premiseId: premise1.id,
    title: "Morning Light",
    synopsis: "The morning sun filters through curtains as Ruby and Cream wake tangled together. What starts as sleepy murmurs becomes something more as they realize neither wants to leave the warmth of each other's embrace.",
    structure: "three-act",
    targetLength: 3,
  });

  await narrativeService.createBeats(story1.id, [
    {
      position: 0,
      actNumber: 1,
      beatType: "setup",
      visualDescription: "Soft morning light streams through sheer curtains. A messy bed with rumpled sheets. Two forms curled together - Ruby's spotted fur against Cream's pale coat.",
      narrativeContext: "Establishing the intimate morning setting",
      emotionalTone: "peaceful",
      characterIds: [ruby.id, cream.id],
      cameraAngle: "wide",
      narration: "Sunday mornings were made for this.",
    },
    {
      position: 1,
      actNumber: 1,
      beatType: "rising",
      visualDescription: "Close-up of Ruby's face as her eyes flutter open. A lazy, satisfied smile spreads across her muzzle as she feels Cream still pressed against her.",
      narrativeContext: "Ruby wakes first, savoring the moment",
      emotionalTone: "content",
      characterIds: [ruby.id],
      cameraAngle: "close-up",
      dialogue: [{ characterId: ruby.id, text: "Mmm... you're still here.", type: "whisper" as const }],
    },
    {
      position: 2,
      actNumber: 2,
      beatType: "rising",
      visualDescription: "Cream stirs, nuzzling closer into Ruby's neck. Her large ears twitch. She pulls Ruby tighter without fully waking, a small happy sound escaping her.",
      narrativeContext: "The tension builds as they draw closer",
      emotionalTone: "warm",
      characterIds: [ruby.id, cream.id],
      cameraAngle: "medium",
      dialogue: [{ characterId: cream.id, text: "Five more minutes...", type: "whisper" as const }],
    },
  ]);

  const storyboard1 = await storyboardService.create({
    projectId: project.id,
    name: "Morning Light - Storyboard",
  });

  await narrativeService.convertStoryToStoryboard(story1.id, storyboard1.id);
  const panels1 = await panelService.getByStoryboard(storyboard1.id);

  console.log(`   Premise: "${premise1.logline}"`);
  console.log(`   Story: "${story1.title}"\n`);
  console.log(`   Lead-in Panels:`);
  for (const panel of panels1) {
    console.log(`   ┌─ Panel ${panel.position + 1} [${panel.mood}]`);
    console.log(`   │  ${panel.description}`);
    if (panel.dialogue) console.log(`   │  💬 "${JSON.parse(panel.dialogue as string)[0]?.text || ''}"`);
    console.log(`   └─`);
  }

  // =========================================================================
  // SCENE 2: Starlit Encounter (Ruby & Obsidian)
  // =========================================================================
  console.log("\n" + "─".repeat(70));
  console.log("📖 SCENE 2: Starlit");
  console.log("─".repeat(70) + "\n");

  const premise2 = await narrativeService.createPremise({
    projectId: project.id,
    logline: "Under a canopy of stars, Ruby and Obsidian's flirtation reaches its peak",
    genre: "romance",
    tone: "sensual",
    themes: ["attraction", "tension", "surrender"],
    setting: "A luxurious bedroom with floor-to-ceiling windows showing a starlit sky",
    characterIds: [ruby.id, obsidian.id],
    status: "active",
  });

  const story2 = await narrativeService.createStory({
    premiseId: premise2.id,
    title: "Starlit",
    synopsis: "Ruby has been trading glances with the mysterious Obsidian all evening. When they finally find themselves alone, the city lights twinkling below, words become unnecessary.",
    structure: "three-act",
    targetLength: 3,
  });

  await narrativeService.createBeats(story2.id, [
    {
      position: 0,
      actNumber: 1,
      beatType: "setup",
      visualDescription: "A penthouse bedroom at night. Floor-to-ceiling windows reveal a starlit sky and city lights below. Obsidian stands silhouetted against the glass, cyan eyes catching the light.",
      narrativeContext: "Establishing the charged atmosphere",
      emotionalTone: "mysterious",
      characterIds: [obsidian.id],
      cameraAngle: "wide",
      narration: "She'd been watching him all night. Now there was nowhere else to look.",
    },
    {
      position: 1,
      actNumber: 1,
      beatType: "rising",
      visualDescription: "Ruby enters frame, her silhouette in the doorway. The light from the hall catches her red hair like fire. She and Obsidian lock eyes across the room.",
      narrativeContext: "The moment of decision",
      emotionalTone: "tense",
      characterIds: [ruby.id, obsidian.id],
      cameraAngle: "over-shoulder",
      dialogue: [{ characterId: obsidian.id, text: "Took you long enough.", type: "speech" as const }],
    },
    {
      position: 2,
      actNumber: 2,
      beatType: "rising",
      visualDescription: "Close on their faces, inches apart. Ruby's confident smirk meets Obsidian's intense gaze. The city lights reflect in both their eyes. Her hand reaches up to touch his chest.",
      narrativeContext: "The final moment before",
      emotionalTone: "charged",
      characterIds: [ruby.id, obsidian.id],
      cameraAngle: "extreme close-up",
      dialogue: [{ characterId: ruby.id, text: "I'm here now.", type: "whisper" as const }],
    },
  ]);

  const storyboard2 = await storyboardService.create({
    projectId: project.id,
    name: "Starlit - Storyboard",
  });

  await narrativeService.convertStoryToStoryboard(story2.id, storyboard2.id);
  const panels2 = await panelService.getByStoryboard(storyboard2.id);

  console.log(`   Premise: "${premise2.logline}"`);
  console.log(`   Story: "${story2.title}"\n`);
  console.log(`   Lead-in Panels:`);
  for (const panel of panels2) {
    console.log(`   ┌─ Panel ${panel.position + 1} [${panel.mood}]`);
    console.log(`   │  ${panel.description}`);
    if (panel.dialogue) console.log(`   │  💬 "${JSON.parse(panel.dialogue as string)[0]?.text || ''}"`);
    console.log(`   └─`);
  }

  // =========================================================================
  // SCENE 3: Afterglow (Ruby solo moment)
  // =========================================================================
  console.log("\n" + "─".repeat(70));
  console.log("📖 SCENE 3: Afterglow");
  console.log("─".repeat(70) + "\n");

  const premise3 = await narrativeService.createPremise({
    projectId: project.id,
    logline: "Ruby basks in the satisfaction of a night well spent",
    genre: "romance",
    tone: "satisfied",
    themes: ["satisfaction", "confidence", "pleasure"],
    setting: "Same bedroom, post-encounter",
    characterIds: [ruby.id],
    status: "active",
  });

  const story3 = await narrativeService.createStory({
    premiseId: premise3.id,
    title: "Afterglow",
    synopsis: "The encounter has left its mark. Ruby catches her breath, a satisfied smile playing on her lips as she savors the moment.",
    structure: "three-act",
    targetLength: 3,
  });

  await narrativeService.createBeats(story3.id, [
    {
      position: 0,
      actNumber: 1,
      beatType: "setup",
      visualDescription: "The room is quieter now. Sheets are disheveled. Moonlight has replaced the earlier starlight, casting silver across the bed.",
      narrativeContext: "The calm after intensity",
      emotionalTone: "peaceful",
      characterIds: [],
      cameraAngle: "wide",
      narration: "Some moments are worth remembering.",
    },
    {
      position: 1,
      actNumber: 2,
      beatType: "rising",
      visualDescription: "Ruby lies back against the pillows, her red hair splayed out. Her eyes are half-lidded, expression dreamy and satisfied. One hand rests on her chest.",
      narrativeContext: "Ruby in her moment of bliss",
      emotionalTone: "content",
      characterIds: [ruby.id],
      cameraAngle: "medium",
    },
    {
      position: 2,
      actNumber: 3,
      beatType: "resolution",
      visualDescription: "Extreme close-up on Ruby's face. Eyes closed, a knowing smile on her muzzle. Complete satisfaction radiates from her expression.",
      narrativeContext: "The final beat of contentment",
      emotionalTone: "blissful",
      characterIds: [ruby.id],
      cameraAngle: "extreme close-up",
      dialogue: [{ characterId: ruby.id, text: "...perfect.", type: "whisper" as const }],
    },
  ]);

  const storyboard3 = await storyboardService.create({
    projectId: project.id,
    name: "Afterglow - Storyboard",
  });

  await narrativeService.convertStoryToStoryboard(story3.id, storyboard3.id);
  const panels3 = await panelService.getByStoryboard(storyboard3.id);

  console.log(`   Premise: "${premise3.logline}"`);
  console.log(`   Story: "${story3.title}"\n`);
  console.log(`   Lead-in Panels:`);
  for (const panel of panels3) {
    console.log(`   ┌─ Panel ${panel.position + 1} [${panel.mood}]`);
    console.log(`   │  ${panel.description}`);
    if (panel.dialogue) {
      try {
        const d = JSON.parse(panel.dialogue as string);
        if (d[0]?.text) console.log(`   │  💬 "${d[0].text}"`);
      } catch {}
    }
    console.log(`   └─`);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("✅ NARRATIVE ENGINE DEMO COMPLETE");
  console.log("=".repeat(70));

  const allPremises = await narrativeService.listPremises(project.id, {});
  const allStories1 = await narrativeService.listStoriesByPremise(premise1.id, {});
  const allStories2 = await narrativeService.listStoriesByPremise(premise2.id, {});
  const allStories3 = await narrativeService.listStoriesByPremise(premise3.id, {});

  console.log(`
   Project: "${project.name}"

   Created:
   • ${allPremises.length} premises
   • ${allStories1.length + allStories2.length + allStories3.length} stories
   • ${panels1.length + panels2.length + panels3.length} total panels

   Each scene has 3 lead-in panels ready for image generation.
   The explicit panels (from reference images) would follow each sequence.
`);

  console.log("=".repeat(70) + "\n");
}

// Run it
createMarathonLeadIns().catch(console.error);
