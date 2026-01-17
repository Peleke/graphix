/**
 * Storyboard View Component
 * 
 * Visual representation of storyboards with panels.
 * Shows panels in a grid/list layout with thumbnails.
 */

import { useState } from "react";
import { useStoryboards, useStoryboard, useCreateStoryboard } from "../../api/hooks/useStories";

interface StoryboardViewProps {
  projectId: string;
  onPanelSelect?: (panelId: string) => void;
  onStoryboardSelect?: (storyboardId: string) => void;
}

export function StoryboardView({ projectId, onPanelSelect, onStoryboardSelect }: StoryboardViewProps) {
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStoryboardName, setNewStoryboardName] = useState("");
  const [newStoryboardDesc, setNewStoryboardDesc] = useState("");

  const { data: storyboards, isLoading: loadingStoryboards } = useStoryboards(projectId);
  const { data: storyboard, isLoading: loadingStoryboard } = useStoryboard(selectedStoryboardId);
  const createStoryboard = useCreateStoryboard();

  const handleCreateStoryboard = async () => {
    if (!newStoryboardName.trim()) return;

    try {
      const created = await createStoryboard.mutateAsync({
        projectId,
        name: newStoryboardName.trim(),
        description: newStoryboardDesc.trim() || undefined,
      });
      setNewStoryboardName("");
      setNewStoryboardDesc("");
      setShowCreateModal(false);
      if (created) {
        setSelectedStoryboardId(created.id);
      }
    } catch (err) {
      console.error("Failed to create storyboard:", err);
    }
  };

  return (
    <div className="storyboard-view">
      <style>{`
        .storyboard-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #18181b;
          color: #fafafa;
        }
        
        .view-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #27272a;
        }
        
        .view-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }
        
        .btn-primary {
          padding: 0.625rem 1.25rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .btn-primary:hover {
          background: #7c3aed;
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .view-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .storyboard-sidebar {
          width: 280px;
          border-right: 1px solid #27272a;
          padding: 1rem;
          overflow-y: auto;
        }
        
        .storyboard-main {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }
        
        .storyboard-item {
          padding: 0.75rem;
          background: #27272a;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .storyboard-item:hover {
          background: #3f3f46;
        }
        
        .storyboard-item.selected {
          background: #8b5cf6;
        }
        
        .storyboard-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .storyboard-meta {
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .panels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .panel-card {
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .panel-card:hover {
          border-color: #8b5cf6;
          transform: translateY(-2px);
        }
        
        .panel-thumb {
          width: 100%;
          aspect-ratio: 3/4;
          background: #18181b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
          font-size: 0.75rem;
        }
        
        .panel-info {
          padding: 0.75rem;
        }
        
        .panel-name {
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        
        .panel-meta {
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #71717a;
        }
        
        .empty-state h3 {
          color: #a1a1aa;
          margin-bottom: 0.5rem;
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
        .modal textarea {
          width: 100%;
          padding: 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 1rem;
          font-family: inherit;
          margin-bottom: 0.75rem;
        }
        
        .modal textarea {
          min-height: 80px;
          resize: vertical;
        }
        
        .modal input:focus,
        .modal textarea:focus {
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

      <div className="view-header">
        <h2 className="view-title">Storyboards</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Storyboard
        </button>
      </div>

      <div className="view-content">
        <div className="storyboard-sidebar">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "#a1a1aa" }}>
            STORYBOARDS
          </h3>

          {loadingStoryboards ? (
            <div>Loading...</div>
          ) : storyboards && storyboards.length > 0 ? (
            storyboards.map((sb: any) => (
              <div
                key={sb.id}
                className={`storyboard-item ${selectedStoryboardId === sb.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedStoryboardId(sb.id);
                  if (onStoryboardSelect) {
                    onStoryboardSelect(sb.id);
                  }
                }}
              >
                <div className="storyboard-name">{sb.name}</div>
                <div className="storyboard-meta">
                  {sb.panelCount || 0} panels
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <h3>No storyboards</h3>
              <p>Create a storyboard to organize your panels.</p>
            </div>
          )}
        </div>

        <div className="storyboard-main">
          {selectedStoryboardId ? (
            loadingStoryboard ? (
              <div>Loading storyboard...</div>
            ) : storyboard ? (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>{storyboard.name}</h3>
                {storyboard.panels && storyboard.panels.length > 0 ? (
                  <div className="panels-grid">
                    {storyboard.panels.map((panel: any) => (
                      <div 
                        key={panel.id} 
                        className="panel-card"
                        onClick={() => {
                          if (onPanelSelect) {
                            onPanelSelect(panel.id);
                          }
                        }}
                      >
                        <div className="panel-thumb">
                          {panel.selectedGeneration?.thumbnailPath ? (
                            <img 
                              src={panel.selectedGeneration.thumbnailPath} 
                              alt={panel.name || "Panel"}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            "No image"
                          )}
                        </div>
                        <div className="panel-info">
                          <div className="panel-name">{panel.name || `Panel ${panel.position}`}</div>
                          <div className="panel-meta">
                            {panel.generationCount || 0} generations
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No panels yet</h3>
                    <p>Add panels to this storyboard to get started.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Storyboard not found</h3>
              </div>
            )
          ) : (
            <div className="empty-state">
              <h3>Select a storyboard</h3>
              <p>Choose a storyboard from the sidebar to view its panels.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Storyboard Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Storyboard</h2>
            <input
              type="text"
              placeholder="Storyboard name (required)"
              value={newStoryboardName}
              onChange={(e) => setNewStoryboardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateStoryboard()}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newStoryboardDesc}
              onChange={(e) => setNewStoryboardDesc(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateStoryboard}
                disabled={!newStoryboardName.trim() || createStoryboard.isPending}
              >
                {createStoryboard.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
