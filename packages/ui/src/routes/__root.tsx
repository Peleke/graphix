/**
 * Root Route - App Shell
 * 
 * This is the root layout that wraps all routes.
 * Contains the app shell, navigation, and global providers.
 */

import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

// Root layout component
function RootLayout() {
  return (
    <div className="app-root">
      {/* Global styles */}
      <style>{`
        .app-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0a0a0a;
          color: #fafafa;
        }
        
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          height: 56px;
          background: #18181b;
          border-bottom: 1px solid #27272a;
          flex-shrink: 0;
        }
        
        .app-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: #fafafa;
          text-decoration: none;
        }
        
        .app-logo svg {
          width: 28px;
          height: 28px;
        }
        
        .app-nav {
          display: flex;
          gap: 0.5rem;
        }
        
        .app-nav a {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          color: #a1a1aa;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        
        .app-nav a:hover {
          background: #27272a;
          color: #fafafa;
        }
        
        .app-nav a[data-status="active"] {
          background: #8b5cf620;
          color: #a78bfa;
        }
        
        .app-main {
          flex: 1;
          overflow: auto;
        }
        
        .app-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .app-status .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
        }
        
        .app-status .dot.offline {
          background: #ef4444;
        }
      `}</style>
      
      {/* Header */}
      <header className="app-header">
        <Link to="/" className="app-logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Graphix
        </Link>
        
        <nav className="app-nav">
          <Link to="/" activeProps={{ 'data-status': 'active' }}>
            Dashboard
          </Link>
          <Link to="/demo/generation-tree" activeProps={{ 'data-status': 'active' }}>
            Gen Tree Demo
          </Link>
        </nav>
        
        <div className="app-status">
          <div className="dot" id="server-status"></div>
          <span>Server</span>
        </div>
      </header>
      
      {/* Main content */}
      <main className="app-main">
        <Outlet />
      </main>
      
      {/* Dev tools (only in development) */}
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </div>
  );
}

// Create and export the root route
export const Route = createRootRoute({
  component: RootLayout,
});
