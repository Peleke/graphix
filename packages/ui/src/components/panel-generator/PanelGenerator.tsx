/**
 * Panel Generator Component
 * 
 * The "UX nightmare" made ergonomic - ControlNet configuration made easy.
 * Library-first approach: select interaction pose preset, assign characters,
 * system shows controls, user adjusts, generate.
 */

import { useState } from "react";
import { useCharacters } from "../../api/hooks/useCharacters";
import { useGeneratePanel, useGeneratePanelVariants, useSelectPanelOutput, usePanelFull } from "../../api/hooks/usePanels";
import { useGenerationsByPanel, useRateGeneration } from "../../api/hooks/useGenerations";
import { useCaptionsByPanel, useGenerateCaptions } from "../../api/hooks/useCaptions";
import { useGeneratedTextsByPanel, useActiveGeneratedText, type GeneratedTextType } from "../../api/hooks/useGeneratedTexts";
import { GenerationTreeVisualization } from "../generation-tree";
import { useGenerationTreeData } from "../generation-tree/useGenerationTreeData";

interface PanelGeneratorProps {
  panelId: string;
  storyboardId: string;
}

// Helper component to load tree data
function GenerationTreeDataLoader({ panelId }: { panelId: string }) {
  const { isLoading, error } = useGenerationTreeData({ panelId });
  // Silently handle loading/errors - visualization will show empty state
  if (error) {
    console.warn("Failed to load generation tree data:", error);
  }
  return null;
}

export function PanelGenerator({ panelId, storyboardId }: PanelGeneratorProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [controlLevel, setControlLevel] = useState<0 | 1 | 2 | 3 | 4>(3); // Level 3 = visual target
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [variantCount, setVariantCount] = useState(4);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "versions" | "text" | "captions">("generate");

  // Panel data
  const { data: panelFull, isLoading: loadingPanel } = usePanelFull(panelId);
  
  // Characters
  const { data: characters } = useCharacters(storyboardId); // Note: might need projectId
  
  // Generations (versioning)
  const { data: generations, isLoading: loadingGenerations } = useGenerationsByPanel(panelId);
  
  // Generated text (narratives, descriptions)
  const { data: generatedTexts } = useGeneratedTextsByPanel(panelId);
  const { data: panelDescription } = useActiveGeneratedText(panelId, "panel_description");
  const { data: dialogue } = useActiveGeneratedText(panelId, "dialogue");
  const { data: narration } = useActiveGeneratedText(panelId, "narration");
  
  // Captions
  const { data: captions } = useCaptionsByPanel(panelId);
  
  // Mutations
  const generatePanel = useGeneratePanel();
  const generateVariants = useGeneratePanelVariants();
  const selectOutput = useSelectPanelOutput();
  const generateCaptions = useGenerateCaptions();
  const rateGeneration = useRateGeneration();

  // Track generation errors for display
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerateError(null);
    try {
      await generatePanel.mutateAsync({
        panelId,
        prompt: prompt.trim() || undefined,
        negativePrompt: negativePrompt.trim() || undefined,
        // ControlNet stack will be built from selected characters and control level
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate";
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
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate variants";
      setGenerateError(message);
      console.error("Failed to generate variants:", err);
    }
  };

  const handleSelectOutput = async (generationId: string) => {
    try {
      await selectOutput.mutateAsync({ panelId, generationId });
      setSelectedGenerationId(generationId);
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
          background: #18181b;
          color: #fafafa;
        }
        
        .generator-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #27272a;
        }
        
        .generator-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
        }
        
        .generator-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .control-panel {
          width: 400px;
          border-right: 1px solid #27272a;
          padding: 1.5rem;
          overflow-y: auto;
        }
        
        .preview-panel {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
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
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
        }
        
        .prompt-input:focus {
          outline: none;
          border-color: #8b5cf6;
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
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        @media (min-width: 1200px) {
          .generations-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .generations-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .generation-card {
          background: #27272a;
          border: 2px solid #3f3f46;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .generation-card:hover {
          border-color: #8b5cf6;
        }
        
        .generation-card.selected {
          border-color: #8b5cf6;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        
        .generation-thumb {
          width: 100%;
          aspect-ratio: 3/4;
          background: #18181b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
        }
        
        .generation-info {
          padding: 0.75rem;
        }
        
        .generation-status {
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .generation-actions {
          display: flex;
          gap: 0.25rem;
          margin-top: 0.5rem;
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
          margin-bottom: 1rem;
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
      `}</style>

      <div className="generator-header">
        <h2 className="generator-title">Panel Generator</h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#71717a" }}>
          Configure ControlNet and generate panel images
        </p>
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
              {characters && characters.length > 0 ? (
                characters.map((char: any) => (
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

          {/* Control Level */}
          <div className="section">
            <div className="section-title">Control Level</div>
            <div className="control-level">
              <div
                className={`level-option ${controlLevel === 4 ? "selected" : ""}`}
                onClick={() => setControlLevel(4)}
              >
                <div className="level-label">Level 4 - Full Control</div>
                <div className="level-desc">Expose all ControlNet parameters</div>
              </div>
              <div
                className={`level-option ${controlLevel === 3 ? "selected" : ""}`}
                onClick={() => setControlLevel(3)}
              >
                <div className="level-label">Level 3 - Visual (Target)</div>
                <div className="level-desc">Visual preview, easy adjustments</div>
              </div>
              <div
                className={`level-option ${controlLevel === 2 ? "selected" : ""}`}
                onClick={() => setControlLevel(2)}
              >
                <div className="level-label">Level 2 - Smart Defaults</div>
                <div className="level-desc">System suggests, you approve</div>
              </div>
              <div
                className={`level-option ${controlLevel === 1 ? "selected" : ""}`}
                onClick={() => setControlLevel(1)}
              >
                <div className="level-label">Level 1 - Auto-Configure</div>
                <div className="level-desc">System handles everything</div>
              </div>
              <div
                className={`level-option ${controlLevel === 0 ? "selected" : ""}`}
                onClick={() => setControlLevel(0)}
              >
                <div className="level-label">Level 0 - Magic</div>
                <div className="level-desc">AI decides everything (future)</div>
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div className="section">
            <div className="section-title">Prompts</div>
            <textarea
              className="prompt-input"
              placeholder="Positive prompt (what you want to see)..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <textarea
              className="prompt-input"
              placeholder="Negative prompt (what to avoid)..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              style={{ marginTop: "0.75rem" }}
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
            
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generatePanel.isPending || generateVariants.isPending}
            >
              {generatePanel.isPending ? (
                <>
                  <span className="spinner" /> Generating...
                </>
              ) : "Generate Single"}
            </button>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="number"
                min="1"
                max="8"
                value={variantCount}
                onChange={(e) => setVariantCount(parseInt(e.target.value) || 4)}
                style={{
                  width: "70px",
                  padding: "0.75rem",
                  background: "#27272a",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  color: "#fafafa",
                  textAlign: "center",
                }}
              />
              <button
                className="btn-primary"
                onClick={handleGenerateVariants}
                disabled={generatePanel.isPending || generateVariants.isPending}
                style={{ flex: 1, padding: "0.75rem 1.5rem" }}
              >
                {generateVariants.isPending ? (
                  <>
                    <span className="spinner" /> Generating {variantCount}...
                  </>
                ) : `Generate ${variantCount} Variants`}
              </button>
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
          <h3 style={{ marginBottom: "1rem" }}>Generations</h3>
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
          <div className="preview-panel" style={{ width: "100%" }}>
            <h3 style={{ marginBottom: "1rem" }}>Generated Text</h3>
            
            <div className="text-section">
              <div className="text-section-title">Panel Description</div>
              {panelDescription ? (
                <div className="text-content">{panelDescription.text}</div>
              ) : (
                <div className="text-empty">No description generated yet</div>
              )}
            </div>
            
            <div className="text-section">
              <div className="text-section-title">Dialogue</div>
              {dialogue ? (
                <div className="text-content">{dialogue.text}</div>
              ) : (
                <div className="text-empty">No dialogue generated yet</div>
              )}
            </div>
            
            <div className="text-section">
              <div className="text-section-title">Narration</div>
              {narration ? (
                <div className="text-content">{narration.text}</div>
              ) : (
                <div className="text-empty">No narration generated yet</div>
              )}
            </div>
            
            {generatedTexts && generatedTexts.length > 0 && (
              <div className="text-section">
                <div className="text-section-title">All Generated Texts</div>
                {generatedTexts.map((text: any) => (
                  <div key={text.id} className="text-content" style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: "0.5rem" }}>
                      {text.textType} • {text.provider}/{text.model}
                    </div>
                    <div>{text.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "captions" && (
          <div className="preview-panel" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Captions</h3>
              <button
                className="btn-primary"
                onClick={() => {
                  if (panelId) {
                    generateCaptions.mutate({ panelId });
                  }
                }}
                disabled={generateCaptions.isPending}
                style={{ width: "auto", padding: "0.5rem 1rem" }}
              >
                {generateCaptions.isPending ? "Generating..." : "Generate from Beat"}
              </button>
            </div>
            
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
