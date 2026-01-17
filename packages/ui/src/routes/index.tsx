/**
 * Dashboard Route (/)
 * 
 * The main landing page showing project list.
 * Wired to backend API via TanStack Query.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjects, useCreateProject, useDeleteProject, useDuplicateProject } from "../api/hooks";
import { useProjectStore } from "../stores/project.store";
import { ProjectCard } from "../components/dashboard/ProjectCard";
import type { Project } from "@graphix/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const projects = projectsData?.data || [];

  return (
    <div className="dashboard">
      <style>{`
        .dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
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
          padding: 4rem 2rem;
          color: #71717a;
        }
        
        .error-state {
          color: #ef4444;
        }
        
        .empty-state h2 {
          font-size: 1.25rem;
          color: #a1a1aa;
          margin-bottom: 0.5rem;
        }
        
        .empty-state p {
          margin-bottom: 1.5rem;
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
          background: #18181b;
          border: 2px dashed #3f3f46;
          border-radius: 12px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #71717a;
        }
        
        .new-project-card:hover {
          border-color: #8b5cf6;
          color: #a78bfa;
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
      {!isLoading && !error && projects.length === 0 && (
        <div className="empty-state">
          <h2>No projects yet</h2>
          <p>Create your first graphic novel or comic project to get started.</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Create Project
          </button>
        </div>
      )}
      
      {/* Projects Grid/List */}
      {!isLoading && !error && projects.length > 0 && (
        <div className={viewMode === 'grid' ? 'project-grid' : 'project-list'}>
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              onClick={() => actions.selectProject(project.id)}
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
    </div>
  );
}
