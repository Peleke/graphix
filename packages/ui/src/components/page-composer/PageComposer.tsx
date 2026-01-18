/**
 * Page Composer Component
 * 
 * The "hero view" - final view where panels can be arranged,
 * recursively edited, and exported. This is where the magic happens.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useStoryboard } from "../../api/hooks/useStories";
import {
  useTemplates,
  usePageSizes,
  useComposePage,
  usePageLayout,
  useSavePageLayout,
} from "../../api/hooks/useComposition";
import { PanelGenerator } from "../panel-generator/PanelGenerator";
import { ExportDialog } from "../export";

interface PageComposerProps {
  storyboardId: string;
  projectId: string;
}

export function PageComposer({ storyboardId, projectId }: PageComposerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<string>("us-letter");
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const hydratedRef = useRef(false);
  const hydratingRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);

  const { data: storyboard, isLoading: loadingStoryboard } = useStoryboard(storyboardId);
  const { data: templates, isLoading: loadingTemplates } = useTemplates();
  const { data: pageSizes } = usePageSizes();
  const composePage = useComposePage();
  const { data: savedLayout } = usePageLayout(storyboardId, 1);
  const saveLayout = useSavePageLayout();

  const pageSizeOptions = useMemo(() => {
    if (Array.isArray(pageSizes)) {
      return pageSizes;
    }
    if (pageSizes && typeof pageSizes === "object") {
      return Object.entries(pageSizes as Record<string, any>).map(([id, size]) => ({
        id,
        ...size,
      }));
    }
    return [];
  }, [pageSizes]);

  const selectedTemplate = useMemo(
    () => templates?.find((template: any) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const selectedPageSize = useMemo(
    () => pageSizeOptions.find((size: any) => size.id === pageSize),
    [pageSizeOptions, pageSize]
  );

  const panelList = storyboard?.panels ?? [];

  const storageKey = useMemo(
    () => (selectedTemplateId ? `page-composer:${storyboardId}:${selectedTemplateId}` : null),
    [selectedTemplateId, storyboardId]
  );

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveSlotId(null);
    setSlotAssignments({});
    setPreviewUrl(null);
    hydratedRef.current = false;
  };

  const assignPanelToSlot = (panelId: string, slotId: string) => {
    setSlotAssignments((current) => ({
      ...current,
      [slotId]: panelId,
    }));
  };

  const clearSlotAssignment = (slotId: string) => {
    setSlotAssignments((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  };

  const autoFillSlots = () => {
    if (!selectedTemplate?.slots || panelList.length === 0) return;
    const nextAssignments: Record<string, string> = {};
    selectedTemplate.slots.forEach((slot: any, index: number) => {
      const panel = panelList[index];
      if (panel) {
        nextAssignments[slot.id] = panel.id;
      }
    });
    setSlotAssignments(nextAssignments);
  };

  const getPanelById = (panelId: string | null) =>
    panelList.find((panel: any) => panel.id === panelId) ?? null;

  const canvasDimensions = useMemo(() => {
    if (!selectedPageSize) return { width: 800, height: 1200 };
    const maxWidth = 820;
    const maxHeight = 1200;
    const ratio = selectedPageSize.width / selectedPageSize.height;
    let height = maxHeight;
    let width = height * ratio;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    return { width, height };
  }, [selectedPageSize]);

  useEffect(() => {
    if (hydratedRef.current || !storageKey) return;
    const layoutConfig = savedLayout?.layoutConfig as Record<string, unknown> | undefined;
    const savedTemplateId = typeof layoutConfig?.template === "string" ? layoutConfig.template : null;
    const savedAssignments =
      layoutConfig && typeof layoutConfig.slotAssignments === "object" && layoutConfig.slotAssignments
        ? (layoutConfig.slotAssignments as Record<string, string>)
        : null;

    if (savedTemplateId && (!selectedTemplateId || selectedTemplateId === savedTemplateId)) {
      hydratingRef.current = true;
      setSelectedTemplateId(savedTemplateId);
      if (savedAssignments) {
        setSlotAssignments(savedAssignments);
      }
      const match = pageSizeOptions.find(
        (size: any) => size.width === layoutConfig?.width && size.height === layoutConfig?.height
      );
      if (match) {
        setPageSize(match.id);
      }
      hydratedRef.current = true;
      window.setTimeout(() => {
        hydratingRef.current = false;
      }, 0);
      return;
    }

    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      hydratedRef.current = true;
      hydratingRef.current = false;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        hydratingRef.current = true;
        setSlotAssignments(parsed);
      }
    } catch {
      // Ignore invalid persisted data
    } finally {
      hydratedRef.current = true;
      window.setTimeout(() => {
        hydratingRef.current = false;
      }, 0);
    }
  }, [savedLayout, storageKey, selectedTemplateId, pageSizeOptions]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(slotAssignments));
  }, [storageKey, slotAssignments]);

  useEffect(() => {
    if (!selectedTemplateId || !hydratedRef.current) return;
    if (hydratingRef.current) {
      return;
    }
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveLayout.mutate({
        storyboardId,
        name: `${storyboard?.storyboard?.name ?? "Storyboard"} Page 1`,
        pageNumber: 1,
        templateId: selectedTemplateId,
        pageSize,
        slotAssignments,
      });
    }, 350);
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [slotAssignments, selectedTemplateId, pageSize, storyboardId, storyboard?.storyboard?.name, saveLayout]);

  const handleSlotDrop = (slotId: string, panelId: string, sourceSlotId?: string | null) => {
    setSlotAssignments((current) => {
      const next = { ...current };
      if (sourceSlotId && next[slotId] && sourceSlotId !== slotId) {
        const temp = next[slotId];
        next[slotId] = panelId;
        next[sourceSlotId] = temp;
        return next;
      }
      next[slotId] = panelId;
      if (sourceSlotId && sourceSlotId !== slotId && !next[sourceSlotId]) {
        delete next[sourceSlotId];
      }
      return next;
    });
  };

  const handleComposePreview = async () => {
    if (!selectedTemplateId || !selectedTemplate?.slots?.length) return;
    const assignedPanels = selectedTemplate.slots
      .map((slot: any) => slotAssignments[slot.id])
      .filter(Boolean);
    if (assignedPanels.length === 0) return;

    try {
      setIsComposing(true);
      const result: any = await composePage.mutateAsync({
        storyboardId,
        templateId: selectedTemplateId,
        panelIds: assignedPanels,
        outputName: `preview_${storyboardId}.png`,
        pageSize,
      });
      const url = result?.outputPath
        ? `/api/composition/download?path=${encodeURIComponent(result.outputPath)}`
        : null;
      setPreviewUrl(url);
    } finally {
      setIsComposing(false);
    }
  };


  return (
    <div className="page-composer" data-testid="page-composer-container">
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

        .panel-slot .slot-placeholder {
          font-size: 0.75rem;
          color: #d4d4d8;
          text-align: center;
          padding: 0.25rem;
        }

        .panel-slot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
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
          <button
            className="btn-secondary"
            data-testid="page-composer-preview"
            onClick={handleComposePreview}
            disabled={!selectedTemplateId || isComposing}
          >
            {isComposing ? "Composing..." : "Preview Page"}
          </button>
        <button className="btn-primary" data-testid="page-composer-export" onClick={() => setShowExportModal(true)}>
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
                    data-testid="template-card"
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    <div className="template-name">{template.name}</div>
                    <div className="template-slots">
                      {template.slotCount || template.slots?.length || 0} slots
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
              {pageSizeOptions.map((size: any) => (
                <option key={size.id} value={size.id}>
                  {size.name} ({size.width}x{size.height})
                </option>
              ))}
            </select>
          </div>

          <div className="section">
            <div className="section-title">Assignments</div>
            <button
              className="btn-primary"
              data-testid="assign-autofill"
              onClick={autoFillSlots}
              disabled={!selectedTemplate?.slots?.length || panelList.length === 0}
            >
              Auto-fill slots
            </button>
            {activeSlotId && (
              <button className="btn-secondary" data-testid="assign-clear-slot" onClick={() => clearSlotAssignment(activeSlotId)}>
                Clear active slot
              </button>
            )}
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#71717a" }}>
              Click a slot, then click a panel to assign.
            </div>
          </div>

          {/* Panel List */}
          {storyboard && storyboard.panels && (
            <div className="section">
              <div className="section-title">Panels</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {storyboard.panels.map((panel: any) => (
                  <div
                    key={panel.id}
                    onClick={() => {
                      setSelectedPanelId(panel.id);
                      if (activeSlotId) {
                        assignPanelToSlot(panel.id, activeSlotId);
                      }
                    }}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("panelId", panel.id);
                    }}
                    data-testid="panel-list-item"
                    data-selected={selectedPanelId === panel.id}
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
            {selectedTemplate && storyboard ? (
              <div
                className="page-canvas"
                data-testid="page-canvas"
                style={{ width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px` }}
              >
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Page preview"
                    data-testid="page-preview"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      opacity: 0.4,
                    }}
                  />
                )}
                {selectedTemplate.slots?.map((slot: any) => {
                  const assignedPanelId = slotAssignments[slot.id];
                  const panel = getPanelById(assignedPanelId);
                  const imageUrl =
                    panel?.selectedGeneration?.thumbnailPath ??
                    panel?.selectedGeneration?.localPath ??
                    null;
                  return (
                    <div
                      key={slot.id}
                      className={`panel-slot ${activeSlotId === slot.id ? "selected" : ""}`}
                      data-testid="panel-slot"
                      data-selected={activeSlotId === slot.id}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.width}%`,
                        height: `${slot.height}%`,
                      }}
                      onClick={() => {
                        setActiveSlotId(slot.id);
                        setSelectedPanelId(assignedPanelId ?? null);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        const panelId = event.dataTransfer.getData("panelId");
                        const sourceSlotId = event.dataTransfer.getData("sourceSlotId");
                        if (panelId) {
                          handleSlotDrop(slot.id, panelId, sourceSlotId || null);
                        }
                      }}
                      draggable={!!assignedPanelId}
                      onDragStart={(event) => {
                        if (assignedPanelId) {
                          event.dataTransfer.setData("panelId", assignedPanelId);
                          event.dataTransfer.setData("sourceSlotId", slot.id);
                        }
                      }}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={`Slot ${slot.id}`} />
                      ) : (
                        <div className="slot-placeholder" data-testid="slot-placeholder">
                          {assignedPanelId ? "No image" : "Empty slot"}
                        </div>
                      )}
                    </div>
                  );
                })}
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
            <ExportDialog storyboardId={storyboardId} templateId={selectedTemplateId ?? undefined} />
          </div>
        </div>
      )}
    </div>
  );
}
