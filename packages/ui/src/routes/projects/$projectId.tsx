/**
 * Project Detail Route (/projects/:projectId)
 * 
 * The main workspace for a single project.
 * This is where Story Editor, Storyboard, Panel Generator will live.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useProject } from "../../api/hooks";
import { StoryEditor } from "../../components/story-editor";
import { StoryboardView } from "../../components/storyboard";
import { PanelGenerator } from "../../components/panel-generator";
import { PageComposer } from "../../components/page-composer";
import { CharacterPanel } from "../../components/characters";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectPage,
});

type WorkspaceView = "story-editor" | "storyboard" | "panel-generator" | "page-composer" | "characters";

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { data: project, isLoading, error } = useProject(projectId);
  const [activeView, setActiveView] = useState<WorkspaceView>("story-editor");
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const panelParam = params.get("panelId");
    const storyboardParam = params.get("storyboardId");

    if (storyboardParam) {
      setSelectedStoryboardId(storyboardParam);
    }

    if (panelParam) {
      setSelectedPanelId(panelParam);
      setActiveView("panel-generator");
      return;
    }

    if (viewParam === "panel" || viewParam === "panel-generator") {
      setActiveView("panel-generator");
      return;
    }

    if (viewParam === "storyboard") {
      setActiveView("storyboard");
    }

    if (viewParam === "page-composer") {
      setActiveView("page-composer");
    }
  }, []);

  return (
    <div className="project-workspace">
      <style>{`
        .project-workspace {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .workspace-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 2rem;
          background: #18181b;
          border-bottom: 1px solid #27272a;
        }
        
        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #71717a;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.15s ease;
        }
        
        .back-link:hover {
          color: #fafafa;
        }
        
        .project-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fafafa;
          margin: 0;
        }
        
        .workspace-content {
          flex: 1;
          display: flex;
          padding: 2rem;
          gap: 2rem;
        }
        
        .workspace-sidebar {
          width: 280px;
          flex-shrink: 0;
        }
        
        .workspace-main {
          flex: 1;
        }
        
        .sidebar-section {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        
        .sidebar-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 0.75rem;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.75rem;
          border-radius: 8px;
          color: #a1a1aa;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 0.25rem;
        }
        
        .nav-item:hover {
          background: #27272a;
          color: #fafafa;
        }
        
        .nav-item.active {
          background: #8b5cf6;
          color: white;
        }
        
        .placeholder-content {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 4rem 2rem;
          text-align: center;
          color: #71717a;
        }
        
        .placeholder-content h2 {
          color: #a1a1aa;
          margin-bottom: 0.5rem;
        }
        
        .loading-state,
        .error-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          color: #71717a;
        }
        
        .error-state {
          color: #ef4444;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #3f3f46;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
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
      `}</style>
      
      <div className="workspace-header">
        <Link to="/" className="back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Projects
        </Link>
        
        {project && (
          <h1 className="project-title">{project.name}</h1>
        )}
      </div>
      
      {isLoading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading project...</p>
        </div>
      )}
      
      {error && (
        <div className="error-state">
          <p>Failed to load project: {error.message}</p>
          <Link to="/" className="back-link" style={{ marginTop: '1rem' }}>
            Return to Dashboard
          </Link>
        </div>
      )}
      
      {project && (
        <div className="workspace-content">
          <div className="workspace-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">Workspace</div>
              <div 
                className={`nav-item ${activeView === "story-editor" ? "active" : ""}`}
                onClick={() => setActiveView("story-editor")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3z"/>
                </svg>
                Story Editor
              </div>
              <div 
                className={`nav-item ${activeView === "storyboard" ? "active" : ""}`}
                onClick={() => setActiveView("storyboard")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1"/>
                  <rect x="9" y="1" width="6" height="6" rx="1"/>
                  <rect x="1" y="9" width="6" height="6" rx="1"/>
                  <rect x="9" y="9" width="6" height="6" rx="1"/>
                </svg>
                Storyboard
              </div>
              <div 
                className={`nav-item ${activeView === "panel-generator" ? "active" : ""}`}
                onClick={() => {
                  if (!selectedPanelId) {
                    // TODO: Show modal to create/select panel
                    alert("Please create or select a panel first from Storyboard");
                    return;
                  }
                  setActiveView("panel-generator");
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4z"/>
                </svg>
                Panel Generator
              </div>
              <div 
                className={`nav-item ${activeView === "page-composer" ? "active" : ""}`}
                onClick={() => {
                  if (!selectedStoryboardId) {
                    alert("Please select a storyboard first");
                    return;
                  }
                  setActiveView("page-composer");
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 2a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1H3z"/>
                </svg>
                Page Composer
              </div>
            </div>
            
            <div className="sidebar-section">
              <div className="sidebar-title">Assets</div>
              <div 
                className={`nav-item ${activeView === "characters" ? "active" : ""}`}
                onClick={() => setActiveView("characters")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="6" r="3"/>
                  <path d="M2 14s2-4 6-4 6 4 6 4"/>
                </svg>
                Characters
              </div>
            </div>
          </div>
          
          <div className="workspace-main">
            {activeView === "story-editor" && (
              <StoryEditor projectId={projectId} />
            )}
            {activeView === "storyboard" && (
              <StoryboardView 
                projectId={projectId}
                onPanelSelect={(panelId) => {
                  setSelectedPanelId(panelId);
                  setActiveView("panel-generator");
                }}
                onStoryboardSelect={(storyboardId) => {
                  setSelectedStoryboardId(storyboardId);
                }}
              />
            )}
            {activeView === "panel-generator" && selectedPanelId && (
              <PanelGenerator 
                panelId={selectedPanelId}
                storyboardId={selectedStoryboardId || ""}
              />
            )}
            {activeView === "page-composer" && selectedStoryboardId && (
              <PageComposer 
                storyboardId={selectedStoryboardId}
                projectId={projectId}
              />
            )}
            {activeView === "characters" && (
              <CharacterPanel projectId={projectId} />
            )}
            {activeView === "panel-generator" && !selectedPanelId && (
              <div className="placeholder-content">
                <h2>No Panel Selected</h2>
                <p>Please create or select a panel from the Storyboard view first.</p>
                <button 
                  className="btn-primary"
                  onClick={() => setActiveView("storyboard")}
                  style={{ marginTop: "1rem", padding: "0.75rem 1.5rem" }}
                >
                  Go to Storyboard
                </button>
              </div>
            )}
            {activeView === "page-composer" && !selectedStoryboardId && (
              <div className="placeholder-content">
                <h2>No Storyboard Selected</h2>
                <p>Please select a storyboard from the Storyboard view first.</p>
                <button 
                  className="btn-primary"
                  onClick={() => setActiveView("storyboard")}
                  style={{ marginTop: "1rem", padding: "0.75rem 1.5rem" }}
                >
                  Go to Storyboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
