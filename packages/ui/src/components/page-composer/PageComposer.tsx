/**
 * Page Composer Component
 * 
 * The "hero view" - final view where panels can be arranged,
 * recursively edited, and exported. This is where the magic happens.
 */

import { useState } from "react";
import { useStoryboard } from "../../api/hooks/useStories";
import { useTemplates, usePageSizes, useComposePage } from "../../api/hooks/useComposition";
import { PanelGenerator } from "../panel-generator/PanelGenerator";

interface PageComposerProps {
  storyboardId: string;
  projectId: string;
}

export function PageComposer({ storyboardId, projectId }: PageComposerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<string>("us-letter");
  const [showExportModal, setShowExportModal] = useState(false);
  const [outputName, setOutputName] = useState("");

  const { data: storyboard, isLoading: loadingStoryboard } = useStoryboard(storyboardId);
  const { data: templates, isLoading: loadingTemplates } = useTemplates();
  const { data: pageSizes } = usePageSizes();
  const composePage = useComposePage();

  const handleComposePage = async () => {
    if (!selectedTemplateId || !storyboard?.panels || storyboard.panels.length === 0) return;

    try {
      await composePage.mutateAsync({
        storyboardId,
        templateId: selectedTemplateId,
        panelIds: storyboard.panels.map((p: any) => p.id),
        outputName: outputName.trim() || "page-1",
        pageSize,
      });
      setShowExportModal(false);
    } catch (err) {
      console.error("Failed to compose page:", err);
    }
  };

  return (
    <div className="page-composer">
      <style>{`
        .page-composer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #18181b;
          color: #fafafa;
        }
        
        .composer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #27272a;
        }
        
        .composer-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }
        
        .composer-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .composer-sidebar {
          width: 300px;
          border-right: 1px solid #27272a;
          padding: 1rem;
          overflow-y: auto;
        }
        
        .composer-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .canvas-area {
          flex: 1;
          background: #27272a;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .page-canvas {
          background: white;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          position: relative;
        }
        
        .panel-slot {
          position: absolute;
          border: 2px dashed #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .panel-slot:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: #a78bfa;
        }
        
        .panel-slot.selected {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.3);
        }
        
        .section {
          margin-bottom: 1.5rem;
        }
        
        .section-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 0.75rem;
        }
        
        .template-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }
        
        .template-card {
          padding: 0.75rem;
          background: #27272a;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        
        .template-card:hover {
          background: #3f3f46;
        }
        
        .template-card.selected {
          border-color: #8b5cf6;
          background: #3f3f46;
        }
        
        .template-name {
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .template-slots {
          font-size: 0.75rem;
          color: #71717a;
          margin-top: 0.25rem;
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
        
        .panel-editor {
          height: 400px;
          border-top: 1px solid #27272a;
        }
        
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 1.5rem;
          width: 100%;
          max-width: 500px;
        }
        
        .modal h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          color: #fafafa;
        }
        
        .modal input,
        .modal select {
          width: 100%;
          padding: 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 1rem;
          margin-bottom: 0.75rem;
        }
        
        .modal input:focus,
        .modal select:focus {
          outline: none;
          border-color: #8b5cf6;
        }
        
        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }
        
        .btn-secondary {
          padding: 0.625rem 1.25rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #a1a1aa;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .btn-secondary:hover {
          background: #27272a;
          color: #fafafa;
        }
      `}</style>

      <div className="composer-header">
        <h2 className="composer-title">Page Composer</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn-primary" onClick={() => setShowExportModal(true)}>
            Export Page
          </button>
        </div>
      </div>

      <div className="composer-content">
        <div className="composer-sidebar">
          {/* Template Selection */}
          <div className="section">
            <div className="section-title">Templates</div>
            {loadingTemplates ? (
              <div>Loading templates...</div>
            ) : templates && templates.length > 0 ? (
              <div className="template-grid">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className={`template-card ${selectedTemplateId === template.id ? "selected" : ""}`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="template-name">{template.name}</div>
                    <div className="template-slots">
                      {template.slotCount || 0} slots
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#71717a", fontSize: "0.875rem" }}>
                No templates available
              </div>
            )}
          </div>

          {/* Page Size */}
          <div className="section">
            <div className="section-title">Page Size</div>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                color: "#fafafa",
              }}
            >
              {pageSizes?.map((size: any) => (
                <option key={size.id} value={size.id}>
                  {size.name} ({size.width}x{size.height})
                </option>
              ))}
            </select>
          </div>

          {/* Panel List */}
          {storyboard && storyboard.panels && (
            <div className="section">
              <div className="section-title">Panels</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {storyboard.panels.map((panel: any) => (
                  <div
                    key={panel.id}
                    onClick={() => setSelectedPanelId(panel.id)}
                    style={{
                      padding: "0.75rem",
                      background: selectedPanelId === panel.id ? "#8b5cf6" : "#27272a",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {panel.name || `Panel ${panel.position}`}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "0.25rem" }}>
                      {panel.selectedGeneration ? "✓ Has image" : "No image"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="composer-main">
          {/* Canvas Area */}
          <div className="canvas-area">
            {selectedTemplateId && storyboard ? (
              <div className="page-canvas" style={{ width: "800px", height: "1200px" }}>
                {/* Template slots would be rendered here */}
                <div style={{ padding: "2rem", color: "#71717a", textAlign: "center" }}>
                  <p>Template: {selectedTemplateId}</p>
                  <p>Panels: {storyboard.panels?.length || 0}</p>
                  <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                    Canvas rendering coming soon...
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#71717a" }}>
                <h3 style={{ color: "#a1a1aa", marginBottom: "0.5rem" }}>Select a template</h3>
                <p>Choose a template from the sidebar to start composing.</p>
              </div>
            )}
          </div>

          {/* Panel Editor (recursive editing) */}
          {selectedPanelId && (
            <div className="panel-editor">
              <PanelGenerator panelId={selectedPanelId} storyboardId={storyboardId} />
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Export Page</h2>
            <input
              type="text"
              placeholder="Output name"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComposePage()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleComposePage}
                disabled={!selectedTemplateId || composePage.isPending}
              >
                {composePage.isPending ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
