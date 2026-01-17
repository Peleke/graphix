/**
 * Text Generation E2E Demo
 *
 * Demonstrates all Ollama/Claude text generation features.
 * Run with: bun run packages/core/src/__tests__/demo/text-generation-demo.ts
 */

import {
  getTextGenerationService,
  resetTextGenerationService,
  type TextProvider,
  type InferredCaption,
  type GeneratedDialogue,
} from "../../services/index.js";

async function main() {
  console.log("=".repeat(80));
  console.log("TEXT GENERATION E2E DEMO");
  console.log("=".repeat(80));
  console.log("");

  // Reset service to start fresh
  resetTextGenerationService();

  const service = getTextGenerationService();

  // ============================================================================
  // 1. Provider Status Check
  // ============================================================================
  console.log("📊 PROVIDER STATUS");
  console.log("-".repeat(40));

  const status = await service.getStatus();
  console.log(`Current Provider: ${status.provider}`);
  console.log(`Available: ${status.available}`);
  console.log(`Model: ${status.model}`);
  if (status.error) {
    console.log(`Error: ${status.error}`);
  }
  console.log("");

  // ============================================================================
  // 2. List All Providers
  // ============================================================================
  console.log("📋 ALL PROVIDERS");
  console.log("-".repeat(40));

  const providers = await service.listProviders();
  for (const p of providers) {
    const icon = p.available ? "✅" : "❌";
    console.log(`${icon} ${p.provider}: ${p.model}${p.error ? ` (${p.error})` : ""}`);
  }
  console.log("");

  // ============================================================================
  // 3. Check if we can proceed with actual generation
  // ============================================================================
  if (!status.available) {
    console.log("⚠️  Current provider is not available. Skipping generation tests.");
    console.log("");
    console.log("To run with Ollama:");
    console.log("  1. Install Ollama: https://ollama.ai");
    console.log("  2. Start Ollama: ollama serve");
    console.log("  3. Pull a model: ollama pull llama3.2");
    console.log("  4. Run this demo again");
    console.log("");
    console.log("To run with Claude:");
    console.log("  1. Set ANTHROPIC_API_KEY environment variable");
    console.log("  2. Set TEXT_PROVIDER=claude environment variable");
    console.log("  3. Run this demo again");
    return;
  }

  // ============================================================================
  // 4. Basic Text Generation
  // ============================================================================
  console.log("🔤 BASIC TEXT GENERATION");
  console.log("-".repeat(40));

  const basicResult = await service.generate(
    "Write a single sentence describing a dramatic comic book panel.",
    { maxTokens: 100, temperature: 0.7 }
  );
  console.log(`Result: "${basicResult.text.trim()}"`);
  console.log(`Model: ${basicResult.model}`);
  console.log(`Tokens: ${basicResult.tokensUsed || "N/A"}`);
  console.log("");

  // ============================================================================
  // 5. Panel Description Generation
  // ============================================================================
  console.log("🎨 PANEL DESCRIPTION GENERATION");
  console.log("-".repeat(40));

  const description = await service.generatePanelDescription({
    setting: "A luxurious yacht cabin at night",
    characters: [
      { name: "Captain Otto", description: "a distinguished otter in a captain's hat" },
      { name: "First Mate Finn", description: "a sleek otter with a mischievous grin" },
    ],
    action: "Otto pours champagne while Finn lounges seductively on a velvet couch",
    mood: "intimate and playful",
    cameraAngle: "medium shot from low angle",
  });
  console.log(`Generated Description:`);
  console.log(`"${description}"`);
  console.log("");

  // ============================================================================
  // 6. Dialogue Generation
  // ============================================================================
  console.log("💬 DIALOGUE GENERATION");
  console.log("-".repeat(40));

  const dialogue = await service.generateDialogue({
    character: {
      name: "Captain Otto",
      personality: "suave, sophisticated, with a hint of danger",
      speakingStyle: "eloquent but with occasional nautical terms",
    },
    situation: "Otto is about to propose a toast to a successful heist",
    emotion: "triumphant yet intimate",
  });

  console.log("Generated Dialogue:");
  for (const line of dialogue) {
    const icon = line.type === "thought" ? "💭" : line.type === "whisper" ? "🤫" : "💬";
    console.log(`  ${icon} [${line.type}] "${line.text}" (confidence: ${line.confidence})`);
  }
  console.log("");

  // ============================================================================
  // 7. Caption Suggestion from Visual Description
  // ============================================================================
  console.log("📝 CAPTION SUGGESTIONS");
  console.log("-".repeat(40));

  const visualDescription = `
    A dramatic panel showing two otter characters in a yacht cabin.
    Captain Otto, wearing a captain's hat, stands triumphantly holding a champagne glass high.
    First Mate Finn reclines on a velvet couch, looking up at Otto with admiration.
    Through the porthole window, city lights sparkle in the night.
    A large treasure chest sits open in the corner, gold coins spilling out.
    Otto appears to be mid-speech, his mouth open in declaration.
  `;

  const captions = await service.suggestCaptions(visualDescription);

  console.log("Suggested Captions:");
  for (const caption of captions) {
    const typeIcon =
      caption.type === "speech"
        ? "💬"
        : caption.type === "thought"
          ? "💭"
          : caption.type === "narration"
            ? "📖"
            : caption.type === "sfx"
              ? "💥"
              : "🤫";
    console.log(
      `  ${typeIcon} [${caption.type}] "${caption.text}"` +
        (caption.character ? ` - ${caption.character}` : "") +
        ` (confidence: ${caption.confidence}, hint: ${caption.positionHint || "none"})`
    );
  }
  console.log("");

  // ============================================================================
  // 8. Text Refinement
  // ============================================================================
  console.log("✨ TEXT REFINEMENT");
  console.log("-".repeat(40));

  const originalText = "We did it. The heist worked.";
  const refinedText = await service.refineText({
    originalText,
    feedback: "Make it more dramatic and eloquent, befitting a sophisticated otter captain",
    contentType: "dialogue",
  });

  console.log(`Original: "${originalText}"`);
  console.log(`Refined:  "${refinedText}"`);
  console.log("");

  // ============================================================================
  // 9. Configuration Info
  // ============================================================================
  console.log("⚙️  CONFIGURATION");
  console.log("-".repeat(40));

  const config = service.getConfig();
  console.log(`Provider: ${config.provider}`);
  console.log(`Ollama URL: ${config.ollamaUrl}`);
  console.log(`Ollama Model: ${config.ollamaModel}`);
  console.log(`Claude Model: ${config.claudeModel}`);
  console.log(`Has Claude Key: ${config.hasClaudeKey}`);
  console.log(`Temperature: ${config.temperature}`);
  console.log(`Max Tokens: ${config.maxTokens}`);
  console.log(`Timeout: ${config.timeoutMs}ms`);
  console.log("");

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("=".repeat(80));
  console.log("DEMO COMPLETE");
  console.log("=".repeat(80));
  console.log("");
  console.log("Features demonstrated:");
  console.log("  ✅ Provider status check");
  console.log("  ✅ Multiple provider listing");
  console.log("  ✅ Basic text generation");
  console.log("  ✅ Panel description generation");
  console.log("  ✅ Dialogue generation");
  console.log("  ✅ Caption suggestion from visual description");
  console.log("  ✅ Text refinement");
  console.log("  ✅ Configuration retrieval");
  console.log("");
  console.log("REST endpoints:");
  console.log("  GET  /api/text/status          - Provider status");
  console.log("  GET  /api/text/providers       - List providers");
  console.log("  POST /api/text/provider        - Switch provider");
  console.log("  POST /api/text/generate        - Raw text generation");
  console.log("  POST /api/text/panel-description - Panel description");
  console.log("  POST /api/text/dialogue        - Dialogue generation");
  console.log("  POST /api/text/suggest-captions - Caption suggestions");
  console.log("  POST /api/text/refine          - Text refinement");
  console.log("");
  console.log("MCP tools:");
  console.log("  text_status, text_list_providers, text_set_provider,");
  console.log("  text_generate, text_panel_description, text_dialogue,");
  console.log("  text_suggest_captions, text_refine");
  console.log("");
}

main().catch(console.error);
