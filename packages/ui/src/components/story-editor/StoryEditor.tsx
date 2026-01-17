/**
 * Story Editor Component
 * 
 * Main component for editing story narratives, premises, and beats.
 * Supports multiple views: outline, tree, Kanban.
 */

import { useState } from "react";
import { useProject } from "../../api/hooks/useProjects";
import { usePremises, useStories, useBeats, useCreatePremise } from "../../api/hooks/useStories";

interface StoryEditorProps {
  projectId: string;
}

export function StoryEditor({ projectId }: StoryEditorProps) {
  const [viewMode, setViewMode] = useState<"outline" | "tree" | "kanban">("outline");
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  const { data: project } = useProject(projectId);
  const { data: premises, isLoading: loadingPremises } = usePremises(projectId);
  const { data: stories } = useStories(selectedPremiseId);
  const { data: beats } = useBeats(selectedStoryId);
  const createPremise = useCreatePremise();

  const handleCreatePremise = async () => {
    const logline = prompt("Enter logline:");
    if (!logline) return;

    await createPremise.mutateAsync({
      projectId,
      logline,
    });
  };

  return (
    <div className="story-editor">
      <style>{`
        .story-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #18181b;
          color: #fafafa;
        }
        
        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #27272a;
        }
        
        .view-toggle {
          display: flex;
          gap: 0.5rem;
          background: #27272a;
          padding: 4px;
          border-radius: 8px;
        }
        
        .view-btn {
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.15s ease;
        }
        
        .view-btn.active {
          background: #3f3f46;
          color: #fafafa;
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
        
        .editor-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .sidebar {
          width: 300px;
          border-right: 1px solid #27272a;
          padding: 1rem;
          overflow-y: auto;
        }
        
        .main-content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }
        
        .premise-item {
          padding: 0.75rem;
          background: #27272a;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .premise-item:hover {
          background: #3f3f46;
        }
        
        .premise-item.selected {
          background: #8b5cf6;
        }
        
        .premise-logline {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .premise-meta {
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
      `}</style>

      <div className="editor-header">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
            {project?.name || "Story Editor"}
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#71717a" }}>
            Edit narrative, structure, and beats
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === "outline" ? "active" : ""}`}
              onClick={() => setViewMode("outline")}
            >
              Outline
            </button>
            <button
              className={`view-btn ${viewMode === "tree" ? "active" : ""}`}
              onClick={() => setViewMode("tree")}
            >
              Tree
            </button>
            <button
              className={`view-btn ${viewMode === "kanban" ? "active" : ""}`}
              onClick={() => setViewMode("kanban")}
            >
              Kanban
            </button>
          </div>

          <button className="btn-primary" onClick={handleCreatePremise}>
            + New Premise
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="sidebar">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "#a1a1aa" }}>
            PREMISES
          </h3>

          {loadingPremises ? (
            <div>Loading...</div>
          ) : premises && premises.length > 0 ? (
            premises.map((premise: any) => (
              <div
                key={premise.id}
                className={`premise-item ${selectedPremiseId === premise.id ? "selected" : ""}`}
                onClick={() => setSelectedPremiseId(premise.id)}
              >
                <div className="premise-logline">{premise.logline}</div>
                <div className="premise-meta">
                  {premise.genre && `${premise.genre} • `}
                  {premise.tone || "No tone"}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <h3>No premises yet</h3>
              <p>Create a premise to start structuring your story.</p>
            </div>
          )}
        </div>

        <div className="main-content">
          {selectedPremiseId ? (
            <div>
              <h3>Stories for Selected Premise</h3>
              {stories && stories.length > 0 ? (
                <div>
                  {stories.map((story: any) => (
                    <div key={story.id} style={{ marginBottom: "1rem", padding: "1rem", background: "#27272a", borderRadius: "8px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                        {story.structure || "Unstructured"}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#71717a" }}>
                        {story.status || "draft"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No stories yet</h3>
                  <p>Create a story from this premise.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Select a premise</h3>
              <p>Choose a premise from the sidebar to view and edit stories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
