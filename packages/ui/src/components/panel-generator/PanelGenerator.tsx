/**
 * Panel Generator Component
 * 
 * The "UX nightmare" made ergonomic - ControlNet configuration made easy.
 * Library-first approach: select interaction pose preset, assign characters,
 * system shows controls, user adjusts, generate.
 */

import { useState } from "react";
import { useCharacters } from "../../api/hooks/useCharacters";
import { useGeneratePanel, useGeneratePanelVariants, useSelectPanelOutput } from "../../api/hooks/usePanels";
import { useGenerationsByPanel } from "../../api/hooks/useGenerations";

interface PanelGeneratorProps {
  panelId: string;
  storyboardId: string;
}

export function PanelGenerator({ panelId, storyboardId }: PanelGeneratorProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [controlLevel, setControlLevel] = useState<0 | 1 | 2 | 3 | 4>(3); // Level 3 = visual target
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [variantCount, setVariantCount] = useState(4);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);

  const { data: characters } = useCharacters(storyboardId); // Note: might need projectId
  const { data: generations, isLoading: loadingGenerations } = useGenerationsByPanel(panelId);
  const generatePanel = useGeneratePanel();
  const generateVariants = useGeneratePanelVariants();
  const selectOutput = useSelectPanelOutput();

  const handleGenerate = async () => {
    try {
      await generatePanel.mutateAsync({
        panelId,
        prompt: prompt.trim() || "A beautiful scene",
        negativePrompt: negativePrompt.trim() || undefined,
        // ControlNet stack will be built from selected characters and control level
      });
    } catch (err) {
      console.error("Failed to generate:", err);
    }
  };

  const handleGenerateVariants = async () => {
    try {
      await generateVariants.mutateAsync({
        panelId,
        count: variantCount,
        prompt: prompt.trim() || "A beautiful scene",
        negativePrompt: negativePrompt.trim() || undefined,
      });
    } catch (err) {
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
        
        .generations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
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
      `}</style>

      <div className="generator-header">
        <h2 className="generator-title">Panel Generator</h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#71717a" }}>
          Configure ControlNet and generate panel images
        </p>
      </div>

      <div className="generator-content">
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
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generatePanel.isPending}
            >
              {generatePanel.isPending ? "Generating..." : "Generate Single"}
            </button>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="number"
                min="1"
                max="8"
                value={variantCount}
                onChange={(e) => setVariantCount(parseInt(e.target.value) || 4)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "#27272a",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  color: "#fafafa",
                }}
              />
              <button
                className="btn-primary"
                onClick={handleGenerateVariants}
                disabled={generateVariants.isPending}
                style={{ width: "auto", padding: "0.75rem 1.5rem" }}
              >
                {generateVariants.isPending ? "Generating..." : `Generate ${variantCount}`}
              </button>
            </div>
          </div>
        </div>

        <div className="preview-panel">
          <h3 style={{ marginBottom: "1rem" }}>Generations</h3>
          {loadingGenerations ? (
            <div>Loading generations...</div>
          ) : generations && generations.length > 0 ? (
            <div className="generations-grid">
              {generations.map((gen: any) => (
                <div
                  key={gen.id}
                  className={`generation-card ${selectedGenerationId === gen.id ? "selected" : ""}`}
                  onClick={() => handleSelectOutput(gen.id)}
                >
                  <div className="generation-thumb">
                    {gen.thumbnailPath ? (
                      <img
                        src={gen.thumbnailPath}
                        alt="Generation"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      "No preview"
                    )}
                  </div>
                  <div className="generation-info">
                    <div className="generation-status">
                      {gen.selected ? "✓ Selected" : "Click to select"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#71717a" }}>
              <h3 style={{ color: "#a1a1aa", marginBottom: "0.5rem" }}>No generations yet</h3>
              <p>Configure settings and click Generate to create panel images.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
