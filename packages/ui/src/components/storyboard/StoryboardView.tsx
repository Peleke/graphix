/**
 * Storyboard View Component
 *
 * Visual representation of storyboards with panels.
 * Shows panels in a grid/list layout with thumbnails.
 * Includes caption badges and editing controls.
 */

import { useState, useCallback, useEffect } from "react";
import { useStoryboards, useStoryboard, useCreateStoryboard } from "../../api/hooks/useStories";
import { useCreatePanel, useUpdatePanel } from "../../api/hooks/usePanels";
import { useCaptionsByPanel } from "../../api/hooks/useCaptions";
import { CaptionListModal } from "../captions/CaptionListModal";
import { TextPanelModal } from "../text-panel/TextPanelEditor";
import type { TipTapContent } from "../rich-text/types";

interface StoryboardViewProps {
  projectId: string;
  onPanelSelect?: (panelId: string) => void;
  onStoryboardSelect?: (storyboardId: string) => void;
}

export function StoryboardView({ projectId, onPanelSelect, onStoryboardSelect }: StoryboardViewProps) {
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePanelModal, setShowCreatePanelModal] = useState(false);
  const [newStoryboardName, setNewStoryboardName] = useState("");
  const [newStoryboardDesc, setNewStoryboardDesc] = useState("");
  const [newPanelDescription, setNewPanelDescription] = useState("");
  const [captionModalPanelId, setCaptionModalPanelId] = useState<string | null>(null);
  const [showTextPanelModal, setShowTextPanelModal] = useState(false);
  const [editingTextPanelId, setEditingTextPanelId] = useState<string | null>(null);
  const [editingTextContent, setEditingTextContent] = useState<TipTapContent | null>(null);

  const { data: storyboards, isLoading: loadingStoryboards } = useStoryboards(projectId);
  const { data: storyboard, isLoading: loadingStoryboard } = useStoryboard(selectedStoryboardId);
  const createStoryboard = useCreateStoryboard();
  const createPanel = useCreatePanel();
  const updatePanel = useUpdatePanel();

  // Auto-select first storyboard when storyboards load
  useEffect(() => {
    if (!selectedStoryboardId && storyboards && storyboards.length > 0) {
      const firstStoryboard = storyboards[0];
      setSelectedStoryboardId(firstStoryboard.id);
      onStoryboardSelect?.(firstStoryboard.id);
    }
  }, [storyboards, selectedStoryboardId, onStoryboardSelect]);

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
        if (onStoryboardSelect) {
          onStoryboardSelect(created.id);
        }
      }
    } catch (err) {
      console.error("Failed to create storyboard:", err);
    }
  };

  const handleCreatePanel = async () => {
    if (!selectedStoryboardId) return;

    try {
      const created = await createPanel.mutateAsync({
        storyboardId: selectedStoryboardId,
        description: newPanelDescription.trim() || undefined,
        position: storyboard?.panels?.length || 0,
      });
      setNewPanelDescription("");
      setShowCreatePanelModal(false);
      if (created) {
        // Navigate to Panel Generator with new panel, ensuring storyboardId is passed
        if (selectedStoryboardId) {
          onStoryboardSelect?.(selectedStoryboardId);
        }
        onPanelSelect?.(created.id);
      }
    } catch (err) {
      console.error("Failed to create panel:", err);
    }
  };

  const handleCreateTextPanel = useCallback(async (content: TipTapContent, plainText: string) => {
    if (!selectedStoryboardId) return;

    try {
      await createPanel.mutateAsync({
        storyboardId: selectedStoryboardId,
        type: "text",
        textContent: content,
        description: plainText.substring(0, 100), // Use first 100 chars as description
        position: storyboard?.panels?.length || 0,
      });
      setShowTextPanelModal(false);
    } catch (err) {
      console.error("Failed to create text panel:", err);
    }
  }, [selectedStoryboardId, storyboard?.panels?.length, createPanel]);

  const handleSaveTextPanel = useCallback(async (content: TipTapContent, plainText: string) => {
    if (!editingTextPanelId) return;

    try {
      await updatePanel.mutateAsync({
        panelId: editingTextPanelId,
        textContent: content,
        description: plainText.substring(0, 100),
      });
      setEditingTextPanelId(null);
      setEditingTextContent(null);
    } catch (err) {
      console.error("Failed to update text panel:", err);
    }
  }, [editingTextPanelId, updatePanel]);

  const handleEditTextPanel = useCallback((panel: any) => {
    setEditingTextPanelId(panel.id);
    setEditingTextContent(panel.textContent);
  }, []);

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
          min-height: 0;
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
          min-height: 0;
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

        .panel-badges {
          display: flex;
          gap: 0.25rem;
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
        }

        .caption-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: rgba(139, 92, 246, 0.9);
          border-radius: 9999px;
          font-size: 0.625rem;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }

        .caption-badge:hover {
          background: #8b5cf6;
          transform: scale(1.05);
        }

        .caption-badge svg {
          width: 10px;
          height: 10px;
        }

        .add-caption-badge {
          padding: 0.25rem;
          background: rgba(63, 63, 70, 0.9);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
          color: #a1a1aa;
        }

        .add-caption-badge:hover {
          background: rgba(139, 92, 246, 0.9);
          color: white;
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
                  {sb.panelCount ?? sb.panels?.length ?? 0} panel{(sb.panelCount ?? sb.panels?.length ?? 0) !== 1 ? 's' : ''}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0 }}>{storyboard.name}</h3>
                  <div className="panel-actions" style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowCreatePanelModal(true)}
                      data-testid="add-image-panel-btn"
                    >
                      + Image Panel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => setShowTextPanelModal(true)}
                      data-testid="add-text-panel-btn"
                    >
                      + Text Panel
                    </button>
                  </div>
                </div>
                {storyboard.panels && storyboard.panels.length > 0 ? (
                  <div className="panels-grid">
                    {storyboard.panels.map((panel: any) => (
                      <PanelCard
                        key={panel.id}
                        panel={panel}
                        onSelect={() => {
                          if (panel.type === "text") {
                            handleEditTextPanel(panel);
                          } else {
                            // Ensure storyboardId is passed to parent when panel is selected
                            if (selectedStoryboardId) {
                              onStoryboardSelect?.(selectedStoryboardId);
                            }
                            onPanelSelect?.(panel.id);
                          }
                        }}
                        onCaptionClick={() => setCaptionModalPanelId(panel.id)}
                        onEditTextPanel={() => handleEditTextPanel(panel)}
                      />
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

      {/* Create Panel Modal */}
      {showCreatePanelModal && selectedStoryboardId && (
        <div className="modal-overlay" onClick={() => setShowCreatePanelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Panel</h2>
            <textarea
              placeholder="Panel description (optional)"
              value={newPanelDescription}
              onChange={(e) => setNewPanelDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleCreatePanel()}
              autoFocus
            />
            <div style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: "1rem" }}>
              Press Ctrl+Enter to create
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreatePanelModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreatePanel}
                disabled={createPanel.isPending}
              >
                {createPanel.isPending ? "Creating..." : "Create Panel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caption List Modal */}
      {captionModalPanelId && (
        <CaptionListModal
          panelId={captionModalPanelId}
          panelImageUrl={
            storyboard?.panels?.find((p: any) => p.id === captionModalPanelId)?.selectedGeneration
              ? `/api/generations/${storyboard.panels.find((p: any) => p.id === captionModalPanelId).selectedGeneration.id}/image`
              : null
          }
          panelDescription={
            storyboard?.panels?.find((p: any) => p.id === captionModalPanelId)?.description || ""
          }
          hasBeat={
            !!storyboard?.panels?.find((p: any) => p.id === captionModalPanelId)?.beatId
          }
          onClose={() => setCaptionModalPanelId(null)}
        />
      )}

      {/* Create Text Panel Modal */}
      <TextPanelModal
        isOpen={showTextPanelModal}
        onClose={() => setShowTextPanelModal(false)}
        onSave={handleCreateTextPanel}
        title="Create Text Panel"
      />

      {/* Edit Text Panel Modal */}
      <TextPanelModal
        isOpen={!!editingTextPanelId}
        onClose={() => {
          setEditingTextPanelId(null);
          setEditingTextContent(null);
        }}
        content={editingTextContent}
        onSave={handleSaveTextPanel}
        title="Edit Text Panel"
      />
    </div>
  );
}

/**
 * Panel Card with Caption Badge
 */
interface PanelCardProps {
  panel: any;
  onSelect: () => void;
  onCaptionClick: () => void;
  onEditTextPanel?: () => void;
}

function PanelCard({ panel, onSelect, onCaptionClick, onEditTextPanel }: PanelCardProps) {
  const { data: captions = [] } = useCaptionsByPanel(panel.id);
  const captionCount = (captions as any[]).length;
  const isTextPanel = panel.type === "text";
  const isMixedPanel = panel.type === "mixed";

  // Extract plain text for preview
  const textPreview = panel.textContent
    ? extractPlainTextFromTipTap(panel.textContent)
    : panel.description || "";

  return (
    <div
      className={`panel-card ${isTextPanel ? "panel-card-text" : ""}`}
      onClick={onSelect}
      data-testid={`panel-card-${panel.id}`}
      data-panel-type={panel.type || "image"}
    >
      <style>{`
        .panel-card-text {
          border-color: #6366f1 !important;
        }

        .panel-card-text:hover {
          border-color: #818cf8 !important;
        }

        .panel-thumb-text {
          background: linear-gradient(135deg, #1e1b4b 0%, #18181b 100%) !important;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          overflow: hidden;
        }

        .text-panel-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6366f1;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .text-panel-preview {
          color: #a1a1aa;
          font-size: 0.75rem;
          line-height: 1.4;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 6;
          -webkit-box-orient: vertical;
          text-overflow: ellipsis;
        }

        .panel-type-badge {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-text {
          background: #6366f1;
          color: white;
        }

        .badge-mixed {
          background: #8b5cf6;
          color: white;
        }

        .edit-text-btn {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          padding: 0.375rem;
          background: rgba(99, 102, 241, 0.9);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          transition: all 0.15s;
        }

        .edit-text-btn:hover {
          background: #6366f1;
          transform: scale(1.05);
        }
      `}</style>

      <div className={`panel-thumb ${isTextPanel ? "panel-thumb-text" : ""}`}>
        {isTextPanel ? (
          <>
            <div className="text-panel-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              TEXT PANEL
            </div>
            <div className="text-panel-preview">
              {textPreview || "Empty text panel"}
            </div>
            {onEditTextPanel && (
              <button
                className="edit-text-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTextPanel();
                }}
                title="Edit text"
                data-testid={`edit-text-${panel.id}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </>
        ) : (
          <>
            {panel.selectedGeneration ? (
              <img
                src={panel.selectedGeneration.cloudUrl || `${import.meta.env.VITE_API_URL || ''}/api/generations/${panel.selectedGeneration.id}/image`}
                alt={panel.name || "Panel"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              "No image"
            )}

            {/* Panel type badge for mixed panels */}
            {isMixedPanel && (
              <span className="panel-type-badge badge-mixed">Mixed</span>
            )}

            {/* Caption badges - only for image/mixed panels */}
            <div className="panel-badges">
              {captionCount > 0 ? (
                <button
                  className="caption-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCaptionClick();
                  }}
                  title={`${captionCount} caption${captionCount !== 1 ? 's' : ''}`}
                  data-testid={`caption-badge-${panel.id}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {captionCount}
                </button>
              ) : (
                <button
                  className="add-caption-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCaptionClick();
                  }}
                  title="Add captions"
                  data-testid={`add-caption-${panel.id}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="8" x2="12" y2="14" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="panel-info">
        <div className="panel-name">{panel.name || `Panel ${panel.position}`}</div>
        <div className="panel-meta">
          {isTextPanel ? (
            `${textPreview.length} characters`
          ) : (
            <>
              {panel.selectedGeneration ? "1 generation" : "No generations"}
              {captionCount > 0 && ` • ${captionCount} caption${captionCount !== 1 ? 's' : ''}`}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Extract plain text from TipTap content
 */
function extractPlainTextFromTipTap(content: TipTapContent | null | undefined): string {
  if (!content || !content.content) return "";

  const extract = (nodes: TipTapContent["content"]): string => {
    return nodes
      .map((node) => {
        if (node.text) return node.text;
        if (node.content) return extract(node.content);
        return "";
      })
      .join("");
  };

  return extract(content.content);
}
