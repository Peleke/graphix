/**
 * Panel Generator Component
 * 
 * The "UX nightmare" made ergonomic - ControlNet configuration made easy.
 * Library-first approach: select interaction pose preset, assign characters,
 * system shows controls, user adjusts, generate.
 */

import { useCallback, useState, useEffect } from "react";
import { useCharacters } from "../../api/hooks/useCharacters";
import { useGeneratePanel, useGeneratePanelVariants, useSelectPanelOutput, usePanelFull } from "../../api/hooks/usePanels";
import { useGenerationsByPanel, useRateGeneration } from "../../api/hooks/useGenerations";
import { useStoryboard } from "../../api/hooks/useStories";
import { useCaptionsByPanel, useGenerateCaptions } from "../../api/hooks/useCaptions";
import { useGeneratedTextsByPanel } from "../../api/hooks/useGeneratedTexts";
import { useGeneratePanelDescription, useRefineText } from "../../api/hooks/useTextGeneration";
import { GenerationTreeVisualization } from "../generation-tree";
import { useGenerationTreeData } from "../generation-tree/useGenerationTreeData";
import { ControlNetPanel, type ControlNetMode } from "../controlnet";
import type { ControlNetCondition } from "../../types/controlnet";
import { useAIAssist, AIAssistSuggestion } from "./AIAssistButton";
import { PanelTextViewer } from "./PanelTextViewer";
import { BeatSelector } from "./BeatSelector";

interface PanelGeneratorProps {
  panelId: string;
  storyboardId: string;
  /** Called when a generation is selected as the panel output */
  onGenerationSelected?: () => void;
  /** Called when user wants to switch to a different panel */
  onPanelChange?: (panelId: string) => void;
}

// Helper component to load tree data
function GenerationTreeDataLoader({ panelId }: { panelId: string }) {
  const { error } = useGenerationTreeData({ panelId });
  // Silently handle loading/errors - visualization will show empty state
  if (error) {
    console.warn("Failed to load generation tree data:", error);
  }
  return null;
}

export function PanelGenerator({ panelId, storyboardId, onGenerationSelected, onPanelChange }: PanelGeneratorProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [, setControlNetMode] = useState<ControlNetMode>("standard");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [variantCount, setVariantCount] = useState(4);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "versions" | "text" | "captions">("generate");
  const [controlNetControls, setControlNetControls] = useState<ControlNetCondition[]>([]);

  // Panel data
  const { data: panelFull } = usePanelFull(panelId);
  const { data: storyboardFull } = useStoryboard(storyboardId);

  // Get projectId from storyboard for character fetching
  const projectId = (storyboardFull as any)?.storyboard?.projectId ?? (storyboardFull as any)?.projectId ?? null;

  // Characters - needs projectId, not storyboardId
  const { data: characters } = useCharacters(projectId);
  
  // Generations (versioning)
  const { data: generations, isLoading: loadingGenerations } = useGenerationsByPanel(panelId);
  
  // Generated text (narratives, descriptions)
  const { data: generatedTexts } = useGeneratedTextsByPanel(panelId);
  
  // Captions
  const { data: captions } = useCaptionsByPanel(panelId);
  
  // Mutations
  const generatePanel = useGeneratePanel();
  const generateVariants = useGeneratePanelVariants();
  const selectOutput = useSelectPanelOutput();
  const generateCaptions = useGenerateCaptions();
  const rateGeneration = useRateGeneration();
  const generatePanelDescription = useGeneratePanelDescription();

  // Spice button - makes prompts more intense/dramatic
  const refineText = useRefineText();
  const [spiceTarget, setSpiceTarget] = useState<"positive" | "negative" | null>(null);

  const handleSpice = async (target: "positive" | "negative") => {
    const currentValue = target === "positive" ? prompt : negativePrompt;
    if (!currentValue.trim()) return;

    setSpiceTarget(target);
    try {
      const instruction = target === "positive"
        ? `Transform this into an explicit NSFW image generation prompt. Use comma-separated tags and short phrases (under 400 words total).

REQUIRED EXPLICIT TAGS to add based on scene:
- Nudity: nude, naked, bare skin, topless, bottomless, fully nude
- Genitals: pussy, cock, penis, erect, wet pussy, hard cock, spread pussy, throbbing
- Sexual acts: sex, penetration, penis in pussy, cock buried inside, balls deep, hilted, breeding, creampie, cum inside, flooding her insides, nutting inside
- Arousal: aroused, horny, needy, desperate, bedroom eyes, lustful gaze, flushed skin, erect nipples, dripping wet, precum
- Expressions: ahegao, fucked silly, orgasm face, moaning, tongue out, drooling, eyes rolling back, o-face
- Poses: spread legs, on back, doggy style, riding, bent over, legs up, presenting

EXAMPLES of good explicit prompts:
- "score_9, nude female fox, spread legs, wet pussy visible, aroused, bedroom eyes, flushed cheeks, on bed, soft lighting"
- "explicit, wolf and rabbit, passionate sex, penis buried in pussy, both moaning, sweaty bodies intertwined, romantic lighting"
- "rating_explicit, afterglow, cum dripping from pussy, exhausted satisfied expression, messy fur, intimate bedroom scene"

For Pony/Illustrious: score_9, score_8_up, explicit, rating_explicit, source_furry
For SDXL/Realistic: nsfw, explicit, photorealistic, detailed genitals

Keep the original characters/scene but make it explicitly sexual. Output ONLY the enhanced prompt.`
        : "Add NSFW negative tags: ugly genitals, bad pussy, bad dick, malformed penis, weird nipples, censorship, mosaic, pixelated genitals, black bars, censor bar, extra limbs, deformed anatomy, merged bodies, bad hands, missing fingers, fused fingers, anatomically incorrect, wrong proportions";

      const result = await refineText.mutateAsync({
        text: currentValue,
        instruction,
        style: "dramatic",
      });

      if (target === "positive") {
        setPrompt(result.refined);
      } else {
        setNegativePrompt(result.refined);
      }
    } catch (error) {
      console.error("Spice failed:", error);
    } finally {
      setSpiceTarget(null);
    }
  };

  // Inline AI assist for prompt fields
  const promptAssist = useAIAssist(
    useCallback(async () => {
      const result = await generatePanelDescription.mutateAsync({
        panelId,
        storyboardId,
        characterIds: selectedCharacters,
        style: "detailed",
      });
      return result.text;
    }, [generatePanelDescription, panelId, storyboardId, selectedCharacters])
  );

  const negativePromptAssist = useAIAssist(
    useCallback(async () => {
      return "low quality, blurry, distorted, deformed, bad anatomy, bad proportions, extra limbs, missing limbs, disfigured, ugly, poorly drawn, watermark, text, signature";
    }, [])
  );

  // Auto-populate prompts from selected/latest generation when panel changes
  const [promptInitialized, setPromptInitialized] = useState<string | null>(null);

  useEffect(() => {
    if (promptInitialized === panelId) return; // Already initialized for this panel
    if (!generations || generations.length === 0) return;

    const selected = generations.find((g: any) => g.selected);
    const source = selected || generations[0]; // generations are newest-first

    if (source) {
      setPrompt(source.prompt || "");
      setNegativePrompt(source.negativePrompt || "");
    }
    setPromptInitialized(panelId);
  }, [panelId, generations, promptInitialized]);

  const referenceImages = (generations || [])
    .map((gen: any) => {
      const path = gen.localPath || gen.cloudUrl || "";
      return {
        id: gen.id,
        label: `Seed ${gen.seed ?? "?"}`,
        path,
        previewUrl: gen.id ? `/api/generations/${gen.id}/thumbnail` : undefined,
        metadata: gen.width && gen.height ? `${gen.width}×${gen.height}` : undefined,
      };
    })
    .filter((img: { path: string }) => img.path);

  // Track generation errors for display
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Track caption generation feedback
  const [captionFeedback, setCaptionFeedback] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);

  const handleControlNetChange = useCallback(
    (controls: ControlNetCondition[], mode: ControlNetMode) => {
      setControlNetControls(controls);
      setControlNetMode(mode);
    },
    []
  );

  const handleGenerate = async () => {
    setGenerateError(null);

    // Validate that ControlNet controls have reference images
    if (controlNetControls.length > 0) {
      const missing = controlNetControls.find((c) => !c.image);
      if (missing) {
        setGenerateError(
          `ControlNet "${missing.type}" needs a reference image. Select one from Reference Images or upload one.`
        );
        return;
      }
    }

    try {
      await generatePanel.mutateAsync({
        panelId,
        prompt: prompt.trim() || undefined,
        negativePrompt: negativePrompt.trim() || undefined,
        controlNet: controlNetControls.length > 0 ? controlNetControls : undefined,
      });
    } catch (err) {
      let message = err instanceof Error ? err.message : "Failed to generate";
      // Improve error messages for common connection issues
      if (message.toLowerCase().includes("cannot connect") ||
          message.toLowerCase().includes("econnrefused") ||
          message.toLowerCase().includes("fetch failed")) {
        message = "Cannot connect to ComfyUI MCP server. Make sure comfyui-mcp is running on port 3001.";
      }
      setGenerateError(message);
      console.error("Failed to generate:", err);
    }
  };

  const handleGenerateVariants = async () => {
    setGenerateError(null);
    try {
      await generateVariants.mutateAsync({
        panelId,
        count: variantCount,
        prompt: prompt.trim() || undefined,
        negativePrompt: negativePrompt.trim() || undefined,
        controlNet: controlNetControls.length > 0 ? controlNetControls : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate variants";
      setGenerateError(message);
      console.error("Failed to generate variants:", err);
    }
  };

  const handleSelectOutput = async (generationId: string) => {
    try {
      await selectOutput.mutateAsync({ panelId, generationId, storyboardId });
      setSelectedGenerationId(generationId);
      // Notify parent that a generation was selected
      onGenerationSelected?.();
    } catch (err) {
      console.error("Failed to select output:", err);
    }
  };

  return (
    <div className="panel-generator">
      <style>{`
        .panel-generator {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: #18181b;
          color: #fafafa;
          overflow: hidden;
        }
        
        .generator-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #27272a;
          flex-shrink: 0;
        }
        
        .generator-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
        }
        
        .generator-content {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        .control-panel {
          flex: 1;
          min-width: 0;
          min-height: 0;
          border-right: 1px solid #27272a;
          padding: 1.5rem;
          padding-bottom: 4rem;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .preview-panel {
          width: 280px;
          min-width: 200px;
          min-height: 0;
          flex-shrink: 0;
          padding: 1rem;
          padding-bottom: 2rem;
          overflow-y: auto;
          overflow-x: hidden;
          background: #141416;
        }

        @media (max-width: 900px) {
          .generator-content {
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
          }

          .control-panel {
            flex: none;
            border-right: none;
            border-bottom: 1px solid #27272a;
            overflow: visible;
          }

          .preview-panel {
            flex: none;
            width: 100%;
            min-height: 200px;
            max-height: none;
            border-top: 1px solid #27272a;
            overflow: visible;
          }

          .generations-grid {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .generation-card {
            flex: 1;
            min-width: 150px;
            max-width: 200px;
          }
        }
        
        .section {
          margin-bottom: 2rem;
        }
        
        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 1rem;
        }
        
        .character-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .character-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #27272a;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .character-item:hover {
          background: #3f3f46;
        }
        
        .character-item.selected {
          background: #8b5cf6;
        }
        
        .control-level {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .level-option {
          padding: 0.75rem;
          background: #27272a;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .level-option:hover {
          background: #3f3f46;
        }
        
        .level-option.selected {
          border-color: #8b5cf6;
          background: #3f3f46;
        }
        
        .level-label {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .level-desc {
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .prompt-input {
          width: 100%;
          padding: 0.75rem;
          padding-right: 5rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          box-sizing: border-box;
        }

        .prompt-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .prompt-field {
          position: relative;
        }
        
        .btn-primary {
          width: 100%;
          padding: 0.75rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 0.5rem;
        }
        
        .btn-primary:hover {
          background: #7c3aed;
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .spinner {
          display: inline-block;
          width: 1em;
          height: 1em;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 0.5rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .generations-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .generation-card {
          display: flex;
          gap: 0.75rem;
          background: #27272a;
          border: 2px solid #3f3f46;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.15s ease;
          padding: 0.5rem;
        }

        .generation-card:hover {
          border-color: #8b5cf6;
        }

        .generation-card.selected {
          border-color: #8b5cf6;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
        }

        .generation-thumb {
          width: 60px;
          height: 80px;
          flex-shrink: 0;
          background: #18181b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
          border-radius: 4px;
          overflow: hidden;
        }

        .generation-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .generation-status {
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .generation-actions {
          display: flex;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }
        
        .action-btn {
          flex: 1;
          padding: 0.375rem;
          background: #3f3f46;
          border: none;
          border-radius: 4px;
          color: #a1a1aa;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .action-btn:hover {
          background: #52525b;
          color: #fafafa;
        }
        
        .action-btn.selected {
          background: #8b5cf6;
          color: white;
        }
        
        .rating-stars {
          display: flex;
          gap: 2px;
          margin-top: 0.25rem;
        }
        
        .star {
          cursor: pointer;
          font-size: 0.875rem;
          color: #52525b;
          transition: color 0.15s ease;
        }
        
        .star:hover,
        .star.filled {
          color: #fbbf24;
        }
        
        .tab-bar {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid #27272a;
          flex-shrink: 0;
        }
        
        .tab-button {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #71717a;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .tab-button:hover {
          color: #a1a1aa;
        }
        
        .tab-button.active {
          color: #8b5cf6;
          border-bottom-color: #8b5cf6;
        }
        
        .text-section {
          margin-bottom: 2rem;
        }
        
        .text-section-title {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 0.75rem;
        }
        
        .text-content {
          padding: 1rem;
          background: #27272a;
          border-radius: 8px;
          color: #fafafa;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        
        .text-empty {
          padding: 1rem;
          background: #27272a;
          border-radius: 8px;
          color: #71717a;
          font-style: italic;
        }
        
        .caption-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .caption-item {
          padding: 1rem;
          background: #27272a;
          border-radius: 8px;
          border-left: 3px solid #8b5cf6;
        }
        
        .caption-type {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #8b5cf6;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        
        .caption-text {
          color: #fafafa;
          margin-bottom: 0.5rem;
        }
        
        .caption-meta {
          font-size: 0.75rem;
          color: #71717a;
        }

        .spice-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
          flex-shrink: 0;
        }

        .spice-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .spice-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .spice-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }

        .spice-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .prompt-buttons {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 6px;
          z-index: 1;
        }
      `}</style>

      <div className="generator-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="generator-title">Panel Generator</h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#71717a" }}>
              Configure ControlNet and generate panel images
            </p>
          </div>

          {/* Panel Navigation */}
          {storyboardFull && (storyboardFull as any).panels && (storyboardFull as any).panels.length > 1 && onPanelChange && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#71717a", textTransform: "uppercase" }}>Panel:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                {/* Prev Button */}
                <button
                  onClick={() => {
                    const panels = (storyboardFull as any).panels;
                    const currentIndex = panels.findIndex((p: any) => p.id === panelId);
                    if (currentIndex > 0) {
                      onPanelChange(panels[currentIndex - 1].id);
                    }
                  }}
                  disabled={(() => {
                    const panels = (storyboardFull as any).panels;
                    const currentIndex = panels.findIndex((p: any) => p.id === panelId);
                    return currentIndex <= 0;
                  })()}
                  style={{
                    padding: "0.375rem 0.5rem",
                    background: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    color: "#a1a1aa",
                    cursor: "pointer",
                    opacity: (() => {
                      const panels = (storyboardFull as any).panels;
                      const currentIndex = panels.findIndex((p: any) => p.id === panelId);
                      return currentIndex <= 0 ? 0.5 : 1;
                    })(),
                  }}
                  title="Previous panel"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Panel Selector Dropdown */}
                <select
                  value={panelId}
                  onChange={(e) => onPanelChange(e.target.value)}
                  style={{
                    padding: "0.375rem 2rem 0.375rem 0.75rem",
                    background: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    color: "#fafafa",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                  }}
                >
                  {(storyboardFull as any).panels.map((panel: any, index: number) => (
                    <option key={panel.id} value={panel.id}>
                      {panel.type === "text" ? `Text ${index}` : `Panel ${index}`}
                      {panel.id === panelId ? " (current)" : ""}
                    </option>
                  ))}
                </select>

                {/* Next Button */}
                <button
                  onClick={() => {
                    const panels = (storyboardFull as any).panels;
                    const currentIndex = panels.findIndex((p: any) => p.id === panelId);
                    if (currentIndex < panels.length - 1) {
                      onPanelChange(panels[currentIndex + 1].id);
                    }
                  }}
                  disabled={(() => {
                    const panels = (storyboardFull as any).panels;
                    const currentIndex = panels.findIndex((p: any) => p.id === panelId);
                    return currentIndex >= panels.length - 1;
                  })()}
                  style={{
                    padding: "0.375rem 0.5rem",
                    background: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    color: "#a1a1aa",
                    cursor: "pointer",
                    opacity: (() => {
                      const panels = (storyboardFull as any).panels;
                      const currentIndex = panels.findIndex((p: any) => p.id === panelId);
                      return currentIndex >= panels.length - 1 ? 0.5 : 1;
                    })(),
                  }}
                  title="Next panel"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab-button ${activeTab === "generate" ? "active" : ""}`}
          onClick={() => setActiveTab("generate")}
        >
          Generate
        </button>
        <button
          className={`tab-button ${activeTab === "versions" ? "active" : ""}`}
          onClick={() => setActiveTab("versions")}
        >
          Versions ({generations?.length || 0})
        </button>
        <button
          className={`tab-button ${activeTab === "text" ? "active" : ""}`}
          onClick={() => setActiveTab("text")}
        >
          Text ({generatedTexts?.length || 0})
        </button>
        <button
          className={`tab-button ${activeTab === "captions" ? "active" : ""}`}
          onClick={() => setActiveTab("captions")}
        >
          Captions ({captions?.length || 0})
        </button>
      </div>

      <div className="generator-content">
        {activeTab === "generate" && (
        <>
        <div className="control-panel">
          {/* Character Selection */}
          <div className="section">
            <div className="section-title">Characters</div>
            <div className="character-list">
              {Array.isArray(characters) && characters.length > 0 ? (
                (characters as any[]).map((char: any) => (
                  <div
                    key={char.id}
                    className={`character-item ${selectedCharacters.includes(char.id) ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedCharacters(prev =>
                        prev.includes(char.id)
                          ? prev.filter(id => id !== char.id)
                          : [...prev, char.id]
                      );
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{char.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#71717a" }}>
                        {char.species || "Unknown"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#71717a", fontSize: "0.875rem" }}>
                  No characters available
                </div>
              )}
            </div>
          </div>

          {/* ControlNet */}
          <div className="section">
            <div className="section-title">ControlNet Stack</div>
            <ControlNetPanel
              panelId={panelId}
              projectId={(storyboardFull as any)?.storyboard?.projectId ?? (storyboardFull as any)?.projectId}
              referenceImages={referenceImages}
              onChange={handleControlNetChange}
            />
          </div>

          {/* Beat-to-Prompt */}
          <div className="section">
            <div className="section-title">Story Beats</div>
            <BeatSelector
              projectId={projectId}
              characters={Array.isArray(characters) ? characters.map((c: any) => ({
                name: c.name,
                description: c.profile?.description,
                species: c.profile?.species,
              })) : []}
              onPromptGenerated={(positive, negative) => {
                setPrompt(positive);
                setNegativePrompt(negative);
              }}
            />
          </div>

          {/* Prompts */}
          <div className="section">
            <div className="section-title">Prompts</div>

            {/* Positive Prompt */}
            <div className="prompt-field">
              <textarea
                className="prompt-input"
                placeholder="Positive prompt (what you want to see)..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                data-testid="positive-prompt-input"
              />
              <div className="prompt-buttons">
                <button
                  type="button"
                  className="spice-btn"
                  onClick={() => handleSpice("positive")}
                  disabled={spiceTarget === "positive" || !prompt.trim()}
                  title="Spice it up 🔥 - Make it NSFW"
                  data-testid="spice-positive-btn"
                >
                  {spiceTarget === "positive" ? (
                    <span className="spice-spinner" />
                  ) : (
                    "🌶️"
                  )}
                </button>
                <button
                  type="button"
                  className="ai-assist-btn ai-assist-btn-sm"
                  onClick={promptAssist.generate}
                  disabled={promptAssist.isGenerating}
                  title="Generate prompt with AI ✨"
                  data-testid="ai-assist-button"
                >
                  {promptAssist.isGenerating ? (
                    <div className="ai-assist-spinner" />
                  ) : (
                    <span className="ai-assist-sparkle">✨</span>
                  )}
                </button>
              </div>
            </div>
            <AIAssistSuggestion
              suggestion={promptAssist.suggestion}
              error={promptAssist.error}
              isGenerating={promptAssist.isGenerating}
              onAccept={(text) => { setPrompt(text); promptAssist.clear(); }}
              onRegenerate={promptAssist.generate}
              onDismiss={promptAssist.clear}
            />

            {/* Negative Prompt */}
            <div className="prompt-field" style={{ marginTop: "0.75rem" }}>
              <textarea
                className="prompt-input"
                placeholder="Negative prompt (what to avoid)..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                data-testid="negative-prompt-input"
              />
              <div className="prompt-buttons">
                <button
                  type="button"
                  className="spice-btn"
                  onClick={() => handleSpice("negative")}
                  disabled={spiceTarget === "negative" || !negativePrompt.trim()}
                  title="Spice it up 🔥 - Add NSFW negatives"
                  data-testid="spice-negative-btn"
                >
                  {spiceTarget === "negative" ? (
                    <span className="spice-spinner" />
                  ) : (
                    "🌶️"
                  )}
                </button>
                <button
                  type="button"
                  className="ai-assist-btn ai-assist-btn-sm"
                  onClick={negativePromptAssist.generate}
                  disabled={negativePromptAssist.isGenerating}
                  title="Generate negative prompt with AI ✨"
                >
                  {negativePromptAssist.isGenerating ? (
                    <div className="ai-assist-spinner" />
                  ) : (
                    <span className="ai-assist-sparkle">✨</span>
                  )}
                </button>
              </div>
            </div>
            <AIAssistSuggestion
              suggestion={negativePromptAssist.suggestion}
              error={negativePromptAssist.error}
              isGenerating={negativePromptAssist.isGenerating}
              onAccept={(text) => { setNegativePrompt(text); negativePromptAssist.clear(); }}
              onRegenerate={negativePromptAssist.generate}
              onDismiss={negativePromptAssist.clear}
            />
          </div>

          {/* Generation Controls */}
          <div className="section">
            <div className="section-title">Generate</div>
            
            {/* Error Display */}
            {generateError && (
              <div style={{
                padding: "0.75rem",
                background: "#7f1d1d",
                border: "1px solid #dc2626",
                borderRadius: "8px",
                color: "#fecaca",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}>
                ⚠️ {generateError}
              </div>
            )}
            
            {/* Generate Actions */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: "0.75rem",
              alignItems: "stretch",
            }}>
              {/* Single Generation */}
              <button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={generatePanel.isPending || generateVariants.isPending}
                style={{ padding: "0.75rem 1rem" }}
              >
                {generatePanel.isPending ? (
                  <>
                    <span className="spinner" /> Generating...
                  </>
                ) : "Generate Single"}
              </button>

              {/* Divider */}
              <div style={{
                display: "flex",
                alignItems: "center",
                color: "#52525b",
                fontSize: "0.75rem",
                fontWeight: 500,
              }}>
                or
              </div>

              {/* Variant Generation */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="btn-primary"
                  onClick={handleGenerateVariants}
                  disabled={generatePanel.isPending || generateVariants.isPending}
                  style={{ flex: 1, padding: "0.75rem 1rem" }}
                >
                  {generateVariants.isPending ? (
                    <>
                      <span className="spinner" /> Generating...
                    </>
                  ) : `Generate ×${variantCount}`}
                </button>
                <select
                  data-testid="variant-count-input"
                  value={variantCount}
                  onChange={(e) => setVariantCount(parseInt(e.target.value) || 4)}
                  title="Number of variants to generate"
                  style={{
                    width: "56px",
                    padding: "0.5rem",
                    background: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fafafa",
                    textAlign: "center",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 6px center",
                    paddingRight: "20px",
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Generation Progress Hint */}
            {(generatePanel.isPending || generateVariants.isPending) && (
              <div style={{
                padding: "0.75rem",
                background: "#1e1e3f",
                border: "1px solid #8b5cf6",
                borderRadius: "8px",
                color: "#c4b5fd",
                fontSize: "0.75rem",
                marginTop: "0.5rem",
              }}>
                🖼️ Sending to ComfyUI... This may take a moment.
              </div>
            )}
          </div>
        </div>

        <div className="preview-panel">
          <h3 style={{ marginBottom: "0.75rem", fontSize: "0.875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717a" }}>Generations</h3>
          {loadingGenerations ? (
            <div>Loading generations...</div>
          ) : generations && generations.length > 0 ? (
            <div className="generations-grid">
              {generations.map((gen: any) => {
                // Use API endpoint to serve images
                const imageUrl = gen.cloudUrl || `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/generations/${gen.id}/thumbnail`;
                const currentRating = gen.rating || 0;
                
                return (
                  <div
                    key={gen.id}
                    className={`generation-card ${selectedGenerationId === gen.id ? "selected" : ""}`}
                  >
                    <div 
                      className="generation-thumb"
                      onClick={() => handleSelectOutput(gen.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={imageUrl}
                        alt={`Generation ${gen.seed}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          // Show placeholder on error
                          (e.target as HTMLImageElement).style.display = "none";
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) parent.innerHTML = `<span style="font-size: 2rem;">🖼️</span><br/>Seed: ${gen.seed}`;
                        }}
                      />
                    </div>
                    <div className="generation-info">
                      <div className="generation-status">
                        {gen.selected ? "✓ Selected" : "Click image to select"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#52525b", marginTop: "0.25rem" }}>
                        Seed: {gen.seed} • {gen.width}×{gen.height}
                      </div>
                      
                      {/* Rating Stars */}
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`star ${star <= currentRating ? "filled" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              rateGeneration.mutate({ generationId: gen.id, rating: star });
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="generation-actions">
                        <button
                          className={`action-btn ${gen.selected ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOutput(gen.id);
                          }}
                        >
                          {gen.selected ? "✓" : "Select"}
                        </button>
                        <button
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Use this generation's seed for regeneration
                            setPrompt(gen.prompt || prompt);
                            setNegativePrompt(gen.negativePrompt || negativePrompt);
                          }}
                          title="Use this prompt"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#71717a" }}>
              <h3 style={{ color: "#a1a1aa", marginBottom: "0.5rem" }}>No generations yet</h3>
              <p>Configure settings and click Generate to create panel images.</p>
            </div>
          )}
        </div>
        </>
        )}
        
        {activeTab === "versions" && panelId && (
          <div className="preview-panel" style={{ width: "100%" }}>
            <h3 style={{ marginBottom: "1rem" }}>Generation Tree</h3>
            <GenerationTreeDataLoader panelId={panelId} />
            <GenerationTreeVisualization panelId={panelId} width={800} height={600} />
          </div>
        )}
        
        {activeTab === "text" && (
          <div className="preview-panel" style={{ width: "100%", overflow: "auto" }}>
            <PanelTextViewer
              panelId={panelId}
              storyboardId={storyboardId}
              characters={Array.isArray(characters) ? characters.map((c: any) => ({
                id: c.id,
                name: c.name,
                species: c.profile?.species,
                description: c.profile?.description,
              })) : []}
              selectedCharacterIds={selectedCharacters}
              panelDescription={(panelFull as any)?.panel?.description ?? (panelFull as any)?.description}
              editable={true}
            />
          </div>
        )}
        
        {activeTab === "captions" && (
          <div className="preview-panel" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Captions</h3>
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!panelId) return;
                  setCaptionFeedback(null);
                  try {
                    const result = await generateCaptions.mutateAsync({ panelId });
                    if (!result?.beatId) {
                      setCaptionFeedback({
                        type: "warning",
                        message: "No beat is linked to this panel. Link a story beat first to generate captions.",
                      });
                    } else if (result.count === 0) {
                      setCaptionFeedback({
                        type: "warning",
                        message: "Beat found but has no dialogue or narration content. Add dialogue/narration to the beat first.",
                      });
                    } else {
                      setCaptionFeedback({
                        type: "success",
                        message: `Generated ${result.count} caption${result.count === 1 ? "" : "s"} from beat.`,
                      });
                    }
                  } catch (err) {
                    setCaptionFeedback({
                      type: "error",
                      message: err instanceof Error ? err.message : "Failed to generate captions",
                    });
                  }
                }}
                disabled={generateCaptions.isPending}
                style={{ width: "auto", padding: "0.5rem 1rem" }}
              >
                {generateCaptions.isPending ? "Generating..." : "Generate from Beat"}
              </button>
            </div>

            {/* Caption Generation Feedback */}
            {captionFeedback && (
              <div style={{
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                background: captionFeedback.type === "success" ? "rgba(34, 197, 94, 0.1)" :
                           captionFeedback.type === "warning" ? "rgba(234, 179, 8, 0.1)" :
                           "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${
                  captionFeedback.type === "success" ? "rgba(34, 197, 94, 0.3)" :
                  captionFeedback.type === "warning" ? "rgba(234, 179, 8, 0.3)" :
                  "rgba(239, 68, 68, 0.3)"
                }`,
                color: captionFeedback.type === "success" ? "#86efac" :
                       captionFeedback.type === "warning" ? "#fde047" :
                       "#fca5a5",
              }}>
                {captionFeedback.type === "warning" && "⚠️ "}
                {captionFeedback.type === "error" && "❌ "}
                {captionFeedback.type === "success" && "✓ "}
                {captionFeedback.message}
              </div>
            )}

            {captions && captions.length > 0 ? (
              <div className="caption-list">
                {captions.map((caption: any) => (
                  <div key={caption.id} className="caption-item">
                    <span className="caption-type">{caption.type}</span>
                    <div className="caption-text">{caption.text}</div>
                    <div className="caption-meta">
                      Position: ({caption.position?.x}%, {caption.position?.y}%)
                      {caption.characterId && ` • Character: ${caption.characterId}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-empty">No captions yet. Generate from beat or create manually.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
