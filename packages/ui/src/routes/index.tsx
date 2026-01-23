/**
 * Dashboard Route (/)
 * 
 * The main landing page showing project list.
 * Wired to backend API via TanStack Query.
 * Includes Chat-to-Start for AI-guided project creation.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjects, useCreateProject, useDeleteProject, useDuplicateProject } from "../api/hooks";
import { useProjectStore } from "../stores/project.store";
import { ProjectCard } from "../components/dashboard/ProjectCard";
import { ChatPanel } from "../components/chat";
import type { Project } from "@graphix/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  
  // Store state
  const { viewMode, filters, sort, actions } = useProjectStore();
  
  // API hooks
  const { data: projectsData, isLoading, error, refetch } = useProjects({
    page: 1,
    limit: 50,
    search: filters.search || undefined,
    sortBy: sort.field,
    sortOrder: sort.direction,
  });
  
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const duplicateProject = useDuplicateProject();

  // Sync API data to store
  useEffect(() => {
    if (projectsData?.data) {
      actions.setProjects(projectsData.data);
    }
  }, [projectsData, actions]);

  // ⌘K / Ctrl+K keyboard shortcut to open chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowChat(true);
      }
      if (e.key === 'Escape' && showChat) {
        setShowChat(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showChat]);

  // Handlers
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      await createProject.mutateAsync({
        name: newProjectName,
        description: "",
      });
      setNewProjectName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  const handleOpenProject = (project: Project) => {
    navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    
    try {
      await deleteProject.mutateAsync(project.id);
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      await duplicateProject.mutateAsync(project.id);
    } catch (err) {
      console.error("Failed to duplicate project:", err);
    }
  };

  const handleProjectCreatedFromChat = (projectId: string) => {
    setShowChat(false);
    navigate({ to: "/projects/$projectId", params: { projectId } });
  };

  const projects = projectsData?.data || [];
  const normalizedSearch = filters.search.trim().toLowerCase();
  const filteredProjects = normalizedSearch
    ? projects.filter((project) =>
        project.name?.toLowerCase().includes(normalizedSearch)
      )
    : projects;

  return (
    <div className="dashboard">
      <style>{`
        .dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
          padding-bottom: 100px;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        @media (max-width: 640px) {
          .dashboard-header {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          
          .dashboard-header > div:first-child {
            width: 100%;
          }
        }
        
        .dashboard-title {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: #fafafa;
          margin: 0;
        }
        
        .dashboard-subtitle {
          color: #71717a;
          margin-top: 0.25rem;
        }
        
        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
        
        @media (max-width: 640px) {
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
          
          .header-actions .search-input {
            flex: 1;
            min-width: 0;
          }
        }
        
        .search-input {
          padding: 0.625rem 1rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.875rem;
          width: 250px;
          transition: border-color 0.15s ease;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }
        
        .search-input::placeholder {
          color: #71717a;
        }
        
        .view-toggle {
          display: flex;
          background: #27272a;
          border-radius: 8px;
          padding: 4px;
        }
        
        .view-btn {
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        
        .view-btn.active {
          background: #3f3f46;
          color: #fafafa;
        }
        
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        
        @media (max-width: 640px) {
          .btn-primary {
            padding: 0.625rem 0.875rem;
            font-size: 0.8125rem;
          }
        }
        
        .btn-primary:hover {
          background: #7c3aed;
          transform: translateY(-1px);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .project-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .project-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .loading-state,
        .error-state,
        .empty-state {
          text-align: center;
          padding: 5rem 2rem;
          color: #71717a;
        }

        .error-state {
          color: #ef4444;
        }

        .empty-state {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, transparent 50%);
          border-radius: 24px;
          border: 1px dashed #27272a;
        }

        .empty-state h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #e4e4e7;
          margin-bottom: 0.75rem;
        }

        .empty-state p {
          margin-bottom: 2rem;
          font-size: 1rem;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #3f3f46;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Modal styles */
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
          max-width: 400px;
        }
        
        .modal h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          color: #fafafa;
        }
        
        .modal input {
          width: 100%;
          padding: 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        
        .modal input:focus {
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
        
        .new-project-card {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(99, 102, 241, 0.03) 100%);
          border: 2px dashed #3f3f46;
          border-radius: 12px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #71717a;
          position: relative;
          overflow: hidden;
        }

        .new-project-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.5;
        }

        .new-project-card:hover {
          border-color: #8b5cf6;
          color: #c4b5fd;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.06) 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
        }

        .new-project-card svg {
          position: relative;
          z-index: 1;
        }

        .new-project-card span {
          position: relative;
          z-index: 1;
        }

        /* Chat-to-Start Input Bar */
        .chat-input-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1.25rem 2rem 2rem;
          background: linear-gradient(to top, #09090b 0%, #09090b 70%, transparent 100%);
          display: flex;
          justify-content: center;
          z-index: 100;
        }

        .chat-trigger {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 640px;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(24, 24, 27, 0.9) 100%);
          border: 1px solid #3f3f46;
          border-radius: 16px;
          color: #a1a1aa;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(139, 92, 246, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
        }

        .chat-trigger:hover {
          border-color: #8b5cf6;
          color: #e4e4e7;
          transform: translateY(-2px);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(139, 92, 246, 0.3),
            0 0 24px rgba(139, 92, 246, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .chat-trigger-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .chat-trigger-text {
          flex: 1;
          text-align: left;
          font-weight: 500;
        }

        .chat-trigger-hint {
          font-size: 0.75rem;
          color: #71717a;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .kbd {
          padding: 0.25rem 0.5rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 0.6875rem;
          color: #a1a1aa;
        }
      `}</style>
      
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Projects</h1>
          <p className="dashboard-subtitle">Your graphic novel and comic projects</p>
        </div>
        
        <div className="header-actions">
          <input
            type="text"
            className="search-input"
            placeholder="Search projects..."
            value={filters.search}
            onChange={(e) => actions.setSearch(e.target.value)}
          />
          
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => actions.setViewMode('grid')}
              aria-label="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1"/>
                <rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/>
                <rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => actions.setViewMode('list')}
              aria-label="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="3" rx="1"/>
                <rect x="1" y="7" width="14" height="3" rx="1"/>
                <rect x="1" y="12" width="14" height="3" rx="1"/>
              </svg>
            </button>
          </div>
          
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Project
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading projects...</p>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>Failed to load projects: {error.message}</p>
          <button className="btn-primary" onClick={() => refetch()}>
            Try Again
          </button>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && !error && filteredProjects.length === 0 && (
        <div className="empty-state">
          <h2>No projects yet</h2>
          <p>Create your first graphic novel or comic project to get started.</p>
          <button className="btn-primary" onClick={() => setShowChat(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Start with AI
          </button>
        </div>
      )}
      
      {/* Projects Grid/List */}
      {!isLoading && !error && filteredProjects.length > 0 && (
        <div className={viewMode === 'grid' ? 'project-grid' : 'project-list'}>
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              onClick={handleOpenProject}
              onDoubleClick={handleOpenProject}
              onOpen={handleOpenProject}
              onDelete={handleDeleteProject}
              onDuplicate={handleDuplicateProject}
              animationDelay={index * 0.05}
            />
          ))}
          
          {/* Add new project card */}
          <div 
            className="new-project-card"
            onClick={() => setShowCreateModal(true)}
          >
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ marginTop: '0.5rem' }}>Create New Project</span>
          </div>
        </div>
      )}

      {/* Chat-to-Start Input Bar (always visible at bottom) */}
      <div className="chat-input-bar">
        <button className="chat-trigger" onClick={() => setShowChat(true)}>
          <div className="chat-trigger-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="chat-trigger-text">Describe your story idea to start...</span>
          <span className="chat-trigger-hint">
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
          </span>
        </button>
      </div>
      
      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || createProject.isPending}
              >
                {createProject.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onProjectCreated={handleProjectCreatedFromChat}
      />
    </div>
  );
}
