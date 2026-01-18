/**
 * ThreadModal Component
 * 
 * Full-screen modal for browsing and switching chat threads.
 * Uses inline styles for reliability across environments.
 */

import { useEffect } from 'react';
import { useThreads } from '../../api/hooks/useThreads';

// =============================================================================
// Props
// =============================================================================

interface ThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
}

// =============================================================================
// Styles (inline for reliability)
// =============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  modal: {
    width: '90%',
    maxWidth: '420px',
    maxHeight: '70vh',
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #27272a',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#fafafa',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#a1a1aa',
    cursor: 'pointer',
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    margin: '16px',
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  threadList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 12px 16px',
  },
  threadItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '12px 14px',
    marginBottom: '4px',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
  },
  threadItemHover: {
    backgroundColor: '#27272a',
  },
  threadTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 500,
    color: '#fafafa',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  threadMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#71717a',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#1e3a5f',
    color: '#60a5fa',
  },
  badgeComplete: {
    backgroundColor: '#14532d',
    color: '#4ade80',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: '#71717a',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#a1a1aa',
  },
};

// =============================================================================
// Component
// =============================================================================

export function ThreadModal({
  isOpen,
  onClose,
  activeThreadId,
  onSelectThread,
  onNewChat,
}: ThreadModalProps) {
  const { threads, isLoading, fetchThreads } = useThreads({ autoFetch: isOpen });

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Refetch when opened
  useEffect(() => {
    if (isOpen) fetchThreads();
  }, [isOpen, fetchThreads]);

  const formatTime = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getPhaseDisplay = (phase: string): string => {
    const map: Record<string, string> = {
      greeting: 'Starting',
      characters: 'Characters',
      setting: 'Setting',
      style: 'Style',
      scope: 'Scope',
      confirmation: 'Ready',
      complete: 'Done',
    };
    return map[phase] || phase;
  };

  if (!isOpen) return null;

  return (
    <div 
      style={styles.overlay}
      onClick={onClose}
      data-testid="thread-modal-overlay"
    >
      <div 
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="thread-modal"
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Conversations</h2>
          <button 
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
            data-testid="thread-modal-close"
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#27272a'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          style={styles.newChatBtn}
          onClick={() => { onNewChat(); onClose(); }}
          data-testid="thread-modal-new-chat"
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Conversation
        </button>

        {/* Thread List */}
        <div style={styles.threadList}>
          {isLoading ? (
            <div style={styles.loading}>Loading...</div>
          ) : threads.length === 0 ? (
            <div style={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.4 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ margin: '0 0 4px', fontSize: '14px' }}>No conversations yet</p>
              <p style={{ margin: 0, fontSize: '12px' }}>Click "New Conversation" to start</p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                style={{
                  ...styles.threadItem,
                  backgroundColor: thread.id === activeThreadId ? '#27272a' : 'transparent',
                  borderLeft: thread.id === activeThreadId ? '3px solid #3b82f6' : '3px solid transparent',
                }}
                onClick={() => { onSelectThread(thread.id); onClose(); }}
                data-testid={`thread-modal-item-${thread.id}`}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#27272a'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = thread.id === activeThreadId ? '#27272a' : 'transparent'}
              >
                <p style={styles.threadTitle}>{thread.title}</p>
                <div style={styles.threadMeta}>
                  <span style={thread.status === 'completed' ? { ...styles.badge, ...styles.badgeComplete } : styles.badge}>
                    {thread.status === 'completed' ? 'Done' : getPhaseDisplay(thread.phase)}
                  </span>
                  <span>{formatTime(thread.lastActivityAt)}</span>
                  <span>{thread.messageCount} msgs</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
