/**
 * Root Route - App Shell
 * 
 * This is the root layout that wraps all routes.
 * Contains the app shell, navigation, and global providers.
 */

import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import React, { useState, useEffect } from 'react';

const DEVTOOLS_STORAGE_KEY = 'graphix-devtools-visible';

// Root layout component
function RootLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [devtoolsVisible, setDevtoolsVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(DEVTOOLS_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  // Listen for storage changes (from DevtoolsToggle in main.tsx)
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem(DEVTOOLS_STORAGE_KEY);
      setDevtoolsVisible(stored === null ? true : stored === 'true');
    };
    
    // Check periodically since storage events don't fire in same tab
    const interval = setInterval(handleStorage, 500);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

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
          padding: 0 1rem;
          height: 56px;
          background: #18181b;
          border-bottom: 1px solid #27272a;
          flex-shrink: 0;
          position: relative;
        }
        
        @media (min-width: 768px) {
          .app-header {
            padding: 0 1.5rem;
          }
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
          z-index: 10;
        }
        
        .app-logo svg {
          width: 28px;
          height: 28px;
        }
        
        .logo-text {
          display: none;
        }
        
        @media (min-width: 640px) {
          .logo-text {
            display: inline;
          }
        }
        
        .app-nav {
          display: none;
          gap: 0.5rem;
        }
        
        @media (min-width: 768px) {
          .app-nav {
            display: flex;
          }
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
        
        .mobile-menu-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          color: #fafafa;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s ease;
          z-index: 10;
        }
        
        @media (min-width: 768px) {
          .mobile-menu-button {
            display: none;
          }
        }
        
        .mobile-menu-button:hover {
          background: #27272a;
        }
        
        .mobile-menu-button svg {
          width: 24px;
          height: 24px;
        }
        
        .mobile-menu {
          position: fixed;
          top: 56px;
          right: 0;
          width: 200px;
          background: #18181b;
          border-bottom: 1px solid #27272a;
          border-left: 1px solid #27272a;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          z-index: 100;
          transform: translateX(100%);
          opacity: 0;
          transition: all 0.2s ease;
          pointer-events: none;
          box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .mobile-menu.open {
          transform: translateX(0);
          opacity: 1;
          pointer-events: all;
        }
        
        .mobile-menu a {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          color: #a1a1aa;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        
        .mobile-menu a:hover {
          background: #27272a;
          color: #fafafa;
        }
        
        .mobile-menu a[data-status="active"] {
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
        
        .app-status .status-text {
          display: none;
        }
        
        @media (min-width: 768px) {
          .app-status .status-text {
            display: inline;
          }
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
        <Link to="/" className="app-logo" onClick={() => setMobileMenuOpen(false)}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="logo-text">Graphix</span>
        </Link>
        
        {/* Mobile menu button */}
        <button
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        
        {/* Desktop nav */}
        <nav className="app-nav">
          <Link to="/" activeProps={{ 'data-status': 'active' }}>
            Dashboard
          </Link>
          <Link to="/demo/generation-tree" activeProps={{ 'data-status': 'active' }}>
            Gen Tree Demo
          </Link>
        </nav>
        
        {/* Mobile menu */}
        <nav className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <Link 
            to="/" 
            activeProps={{ 'data-status': 'active' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            to="/demo/generation-tree" 
            activeProps={{ 'data-status': 'active' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Gen Tree Demo
          </Link>
        </nav>
        
        <div className="app-status">
          <div className="dot" id="server-status"></div>
          <span className="status-text">Server</span>
        </div>
      </header>
      
      {/* Main content */}
      <main className="app-main">
        <Outlet />
      </main>
      
      {/* Dev tools (only in development, toggleable) */}
      {import.meta.env.DEV && devtoolsVisible && <TanStackRouterDevtools position="bottom-right" />}
    </div>
  );
}

// Create and export the root route
export const Route = createRootRoute({
  component: RootLayout,
});
