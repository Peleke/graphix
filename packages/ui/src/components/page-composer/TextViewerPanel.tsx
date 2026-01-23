/**
 * Text Viewer Panel
 *
 * A collapsible panel at the bottom of PageComposer that displays
 * text content at panel, page, or storyboard level with export options.
 */

import { useState, useCallback, useMemo } from "react";
import { useActiveGeneratedText } from "../../api/hooks/useGeneratedTexts";
import { useCaptionsByPanel } from "../../api/hooks/useCaptions";

export type TextViewMode = "panel" | "page" | "storyboard";

export interface TextViewerPanelProps {
  /** Currently selected panel ID */
  selectedPanelId: string | null;
  /** Storyboard ID */
  storyboardId: string;
  /** All panels in the storyboard */
  panels: Array<{
    id: string;
    name?: string;
    description?: string;
    selectedGeneration?: { id: string } | null;
  }>;
  /** Slot assignments in the current page layout */
  slotAssignments: Record<string, string>;
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Toggle expansion */
  onToggleExpand?: () => void;
}

// Type for generated text response
interface GeneratedTextData {
  id?: string;
  text?: string;
  textType?: string;
}

function PanelTextContent({
  panelId,
  panelName,
}: {
  panelId: string;
  panelName: string;
}) {
  const { data: descriptionData } = useActiveGeneratedText(panelId, "panel_description");
  const { data: dialogueData } = useActiveGeneratedText(panelId, "dialogue");
  const { data: narrationData } = useActiveGeneratedText(panelId, "narration");
  const { data: captions } = useCaptionsByPanel(panelId);

  // Safely extract text from response data
  const description = (descriptionData as GeneratedTextData | null)?.text;
  const dialogue = (dialogueData as GeneratedTextData | null)?.text;
  const narration = (narrationData as GeneratedTextData | null)?.text;

  const hasContent =
    description || dialogue || narration || (captions && captions.length > 0);

  if (!hasContent) {
    return (
      <div className="panel-text-empty">
        <span className="empty-icon">&#128196;</span>
        No text content for {panelName}
      </div>
    );
  }

  return (
    <div className="panel-text-content">
      <div className="panel-text-header">{panelName}</div>

      {description && (
        <div className="text-block">
          <div className="text-block-label">Description</div>
          <div className="text-block-content">{description}</div>
        </div>
      )}

      {dialogue && (
        <div className="text-block">
          <div className="text-block-label">Dialogue</div>
          <div className="text-block-content dialogue">{dialogue}</div>
        </div>
      )}

      {narration && (
        <div className="text-block">
          <div className="text-block-label">Narration</div>
          <div className="text-block-content narration">{narration}</div>
        </div>
      )}

      {captions && captions.length > 0 && (
        <div className="text-block">
          <div className="text-block-label">Captions ({captions.length})</div>
          <div className="captions-list">
            {captions.map((caption: any) => (
              <div key={caption.id} className={`caption-item ${caption.type}`}>
                <span className="caption-type-badge">{caption.type}</span>
                <span className="caption-text">{caption.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TextViewerPanel({
  selectedPanelId,
  storyboardId,
  panels,
  slotAssignments,
  isExpanded = false,
  onToggleExpand,
}: TextViewerPanelProps) {
  const [viewMode, setViewMode] = useState<TextViewMode>("panel");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  // Get panels assigned to current page
  const pagePanelIds = useMemo(() => {
    return Object.values(slotAssignments).filter(Boolean);
  }, [slotAssignments]);

  const pagePanels = useMemo(() => {
    return panels.filter((p) => pagePanelIds.includes(p.id));
  }, [panels, pagePanelIds]);

  const selectedPanel = useMemo(() => {
    return panels.find((p) => p.id === selectedPanelId) || null;
  }, [panels, selectedPanelId]);

  const getPanelName = (panel: {
    id: string;
    name?: string;
    description?: string;
  }) => {
    return (
      panel.name || panel.description?.slice(0, 30) || `Panel ${panel.id.slice(-4)}`
    );
  };

  const handleCopyToClipboard = useCallback(async () => {
    // Build text content based on view mode
    let textToCopy = "";

    const buildPanelText = (panel: any) => {
      const name = getPanelName(panel);
      return `== ${name} ==\n${panel.description || "No description"}\n`;
    };

    switch (viewMode) {
      case "panel":
        if (selectedPanel) {
          textToCopy = buildPanelText(selectedPanel);
        }
        break;
      case "page":
        textToCopy = pagePanels.map(buildPanelText).join("\n");
        break;
      case "storyboard":
        textToCopy = panels.map(buildPanelText).join("\n");
        break;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [viewMode, selectedPanel, pagePanels, panels]);

  const handleDownload = useCallback(() => {
    let textContent = "";
    let filename = "";

    switch (viewMode) {
      case "panel":
        if (selectedPanel) {
          textContent = `${getPanelName(selectedPanel)}\n\n${selectedPanel.description || ""}`;
          filename = `panel-${selectedPanel.id.slice(-8)}.txt`;
        }
        break;
      case "page":
        textContent = pagePanels
          .map((p) => `== ${getPanelName(p)} ==\n${p.description || ""}`)
          .join("\n\n");
        filename = `page-${storyboardId.slice(-8)}.txt`;
        break;
      case "storyboard":
        textContent = panels
          .map((p) => `== ${getPanelName(p)} ==\n${p.description || ""}`)
          .join("\n\n");
        filename = `storyboard-${storyboardId.slice(-8)}.txt`;
        break;
    }

    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [viewMode, selectedPanel, pagePanels, panels, storyboardId]);

  const renderContent = () => {
    switch (viewMode) {
      case "panel":
        if (!selectedPanelId || !selectedPanel) {
          return (
            <div className="text-viewer-placeholder">
              <span className="placeholder-icon">&#128073;</span>
              <span>Select a panel to view its text content</span>
            </div>
          );
        }
        return (
          <PanelTextContent
            panelId={selectedPanelId}
            panelName={getPanelName(selectedPanel)}
          />
        );

      case "page":
        if (pagePanels.length === 0) {
          return (
            <div className="text-viewer-placeholder">
              <span className="placeholder-icon">&#128196;</span>
              <span>No panels assigned to this page yet</span>
            </div>
          );
        }
        return (
          <div className="multi-panel-view">
            {pagePanels.map((panel) => (
              <PanelTextContent
                key={panel.id}
                panelId={panel.id}
                panelName={getPanelName(panel)}
              />
            ))}
          </div>
        );

      case "storyboard":
        if (panels.length === 0) {
          return (
            <div className="text-viewer-placeholder">
              <span className="placeholder-icon">&#128214;</span>
              <span>No panels in this storyboard</span>
            </div>
          );
        }
        return (
          <div className="multi-panel-view">
            {panels.map((panel) => (
              <PanelTextContent
                key={panel.id}
                panelId={panel.id}
                panelName={getPanelName(panel)}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div
      className={`text-viewer-panel ${isExpanded ? "expanded" : "collapsed"}`}
      data-testid="text-viewer-panel"
    >
      <style>{`
        .text-viewer-panel {
          background: #18181b;
          border-top: 1px solid #27272a;
          transition: height 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .text-viewer-panel.collapsed {
          height: 48px;
        }

        .text-viewer-panel.expanded {
          height: 320px;
          min-height: 200px;
          max-height: 50vh;
        }

        .text-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #0f0f10;
          border-bottom: 1px solid #27272a;
          flex-shrink: 0;
        }

        .text-viewer-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          color: #fafafa;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: background 0.15s ease;
        }

        .text-viewer-toggle:hover {
          background: #27272a;
        }

        .toggle-icon {
          font-size: 0.75rem;
          transition: transform 0.2s ease;
        }

        .text-viewer-panel.expanded .toggle-icon {
          transform: rotate(180deg);
        }

        .text-viewer-tabs {
          display: flex;
          gap: 0.25rem;
        }

        .text-viewer-tab {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #71717a;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .text-viewer-tab:hover {
          color: #a1a1aa;
          background: #27272a;
        }

        .text-viewer-tab.active {
          background: #27272a;
          border-color: #3f3f46;
          color: #fafafa;
        }

        .text-viewer-actions {
          display: flex;
          gap: 0.5rem;
        }

        .text-viewer-action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #a1a1aa;
          font-size: 0.6875rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .text-viewer-action-btn:hover {
          background: #27272a;
          color: #fafafa;
          border-color: #52525b;
        }

        .text-viewer-action-btn.copied {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.5);
          color: #34d399;
        }

        .text-viewer-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .text-viewer-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 0.75rem;
          color: #71717a;
          font-size: 0.8125rem;
        }

        .placeholder-icon {
          font-size: 2rem;
          opacity: 0.5;
        }

        .multi-panel-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .panel-text-content {
          background: #1f1f23;
          border: 1px solid #27272a;
          border-radius: 10px;
          overflow: hidden;
        }

        .panel-text-header {
          padding: 0.625rem 0.875rem;
          background: #18181b;
          border-bottom: 1px solid #27272a;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #fafafa;
        }

        .panel-text-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2rem;
          color: #71717a;
          font-size: 0.8125rem;
        }

        .empty-icon {
          font-size: 1.25rem;
          opacity: 0.5;
        }

        .text-block {
          padding: 0.75rem 0.875rem;
          border-bottom: 1px solid #27272a;
        }

        .text-block:last-child {
          border-bottom: none;
        }

        .text-block-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 0.5rem;
        }

        .text-block-content {
          font-size: 0.8125rem;
          color: #e4e4e7;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .text-block-content.dialogue {
          font-style: italic;
          color: #c4b5fd;
        }

        .text-block-content.narration {
          color: #a1a1aa;
        }

        .captions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .caption-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #18181b;
          border-radius: 6px;
        }

        .caption-type-badge {
          padding: 0.125rem 0.375rem;
          background: #3f3f46;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #a1a1aa;
          flex-shrink: 0;
        }

        .caption-item.speech .caption-type-badge {
          background: rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
        }

        .caption-item.thought .caption-type-badge {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
        }

        .caption-item.narration .caption-type-badge {
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
        }

        .caption-item.sfx .caption-type-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .caption-text {
          font-size: 0.8125rem;
          color: #e4e4e7;
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .text-viewer-panel.expanded {
            height: 280px;
          }

          .text-viewer-header {
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .text-viewer-tabs {
            order: 3;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="text-viewer-header">
        <button
          className="text-viewer-toggle"
          onClick={onToggleExpand}
          data-testid="text-viewer-toggle"
        >
          <span className="toggle-icon">&#9650;</span>
          Text View
        </button>

        {isExpanded && (
          <>
            <div className="text-viewer-tabs">
              <button
                className={`text-viewer-tab ${viewMode === "panel" ? "active" : ""}`}
                onClick={() => setViewMode("panel")}
                data-testid="text-view-panel-tab"
              >
                Panel
              </button>
              <button
                className={`text-viewer-tab ${viewMode === "page" ? "active" : ""}`}
                onClick={() => setViewMode("page")}
                data-testid="text-view-page-tab"
              >
                Page ({pagePanels.length})
              </button>
              <button
                className={`text-viewer-tab ${viewMode === "storyboard" ? "active" : ""}`}
                onClick={() => setViewMode("storyboard")}
                data-testid="text-view-storyboard-tab"
              >
                Storyboard ({panels.length})
              </button>
            </div>

            <div className="text-viewer-actions">
              <button
                className={`text-viewer-action-btn ${copyStatus === "copied" ? "copied" : ""}`}
                onClick={handleCopyToClipboard}
                title="Copy to clipboard"
              >
                {copyStatus === "copied" ? "Copied!" : "Copy"}
              </button>
              <button
                className="text-viewer-action-btn"
                onClick={handleDownload}
                title="Download as text file"
              >
                Download
              </button>
            </div>
          </>
        )}
      </div>

      {isExpanded && (
        <div className="text-viewer-body" data-testid="text-viewer-body">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

export default TextViewerPanel;
