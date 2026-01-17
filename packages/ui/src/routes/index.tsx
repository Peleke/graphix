/**
 * Dashboard Route (/)
 * 
 * The main landing page showing project list.
 * This is a placeholder - Agent A will build the real thing!
 */

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="dashboard">
      <style>{`
        .dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .dashboard-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: #fafafa;
        }
        
        .dashboard-subtitle {
          color: #71717a;
          margin-top: 0.25rem;
        }
        
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
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
          transform: translateY(-1px);
        }
        
        .project-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .project-card {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .project-card:hover {
          border-color: #8b5cf6;
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -10px rgba(139, 92, 246, 0.3);
        }
        
        .project-card.placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          border-style: dashed;
          color: #71717a;
        }
        
        .project-card.placeholder:hover {
          border-color: #8b5cf6;
          color: #a78bfa;
        }
        
        .project-thumb {
          width: 100%;
          aspect-ratio: 16/9;
          background: #27272a;
          border-radius: 8px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
          font-size: 0.75rem;
        }
        
        .project-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .project-meta {
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #71717a;
        }
        
        .empty-state h2 {
          font-size: 1.25rem;
          color: #a1a1aa;
          margin-bottom: 0.5rem;
        }
        
        .empty-state p {
          margin-bottom: 1.5rem;
        }
      `}</style>
      
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Projects</h1>
          <p className="dashboard-subtitle">Your graphic novel and comic projects</p>
        </div>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New Project
        </button>
      </div>
      
      <div className="project-grid">
        {/* Placeholder projects - Agent A will make this real! */}
        <div className="project-card">
          <div className="project-thumb">Coming Soon</div>
          <div className="project-name">Marina's Adventures</div>
          <div className="project-meta">12 pages • Last edited 2 hours ago</div>
        </div>
        
        <div className="project-card">
          <div className="project-thumb">Coming Soon</div>
          <div className="project-name">Beach Day</div>
          <div className="project-meta">4 pages • Last edited yesterday</div>
        </div>
        
        <div className="project-card placeholder">
          <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ marginTop: '0.5rem' }}>Create New Project</span>
        </div>
      </div>
    </div>
  );
}
