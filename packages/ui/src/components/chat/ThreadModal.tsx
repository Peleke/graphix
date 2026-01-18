/**
 * ThreadModal Component
 * 
 * Full-screen modal for browsing and switching chat threads.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { css } from '../../../styled-system/css';
import { useThreads } from '../../api/hooks/useThreads';

// =============================================================================
// Props
// =============================================================================

interface ThreadModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Called to close the modal */
  onClose: () => void;
  /** Currently active thread ID */
  activeThreadId?: string;
  /** Called when a thread is selected */
  onSelectThread: (threadId: string) => void;
  /** Called when new chat is requested */
  onNewChat: () => void;
}

// =============================================================================
// Styles
// =============================================================================

const overlayStyles = css({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,  // Very high to ensure it's above everything
  animation: 'fadeIn 0.15s ease',
});

const modalStyles = css({
  width: '90%',
  maxWidth: '480px',
  maxHeight: '80vh',
  backgroundColor: 'gray.900',
  border: '1px solid',
  borderColor: 'gray.700',
  borderRadius: '16px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  animation: 'slideUp 0.2s ease',
  // Mobile-first: full width on small screens
  '@media (max-width: 480px)': {
    width: '95%',
    maxHeight: '85vh',
    borderRadius: '12px',
  },
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid',
  borderColor: 'gray.700',
});

const titleStyles = css({
  fontSize: '16px',
  fontWeight: '600',
  color: 'gray.100',
});

const closeButtonStyles = css({
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  color: 'gray.400',
  cursor: 'pointer',
  transition: 'all 0.15s',
  _hover: {
    backgroundColor: 'gray.800',
    color: 'gray.100',
  },
});

const newChatButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  margin: '16px 20px',
  padding: '12px 16px',
  backgroundColor: 'blue.600',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  _hover: {
    backgroundColor: 'blue.500',
  },
});

const threadListStyles = css({
  flex: 1,
  overflowY: 'auto',
  padding: '0 12px 12px',
});

const threadItemStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '14px 16px',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  _hover: {
    backgroundColor: 'gray.800',
  },
});

const threadItemActiveStyles = css({
  backgroundColor: 'gray.800',
  borderLeft: '3px solid',
  borderColor: 'blue.500',
});

const threadTitleStyles = css({
  fontSize: '14px',
  fontWeight: '500',
  color: 'gray.100',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const threadMetaStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: 'gray.500',
});

const badgeStyles = css({
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
});

const activeBadgeStyles = css({
  backgroundColor: 'blue.900',
  color: 'blue.300',
});

const completedBadgeStyles = css({
  backgroundColor: 'green.900',
  color: 'green.300',
});

const emptyStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  textAlign: 'center',
  color: 'gray.500',
});

const loadingStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
  color: 'gray.400',
});

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
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Refetch when opened
  useEffect(() => {
    if (isOpen) {
      fetchThreads();
    }
  }, [isOpen, fetchThreads]);

  // Format relative time
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get phase display name
  const getPhaseDisplay = (phase: string): string => {
    const phases: Record<string, string> = {
      greeting: 'Starting',
      characters: 'Characters',
      setting: 'Setting',
      arc: 'Story Arc',
      style: 'Style',
      scope: 'Scope',
      confirmation: 'Ready',
      complete: 'Done',
    };
    return phases[phase] || phase;
  };

  const handleSelectThread = (threadId: string) => {
    onSelectThread(threadId);
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  if (!isOpen) return null;

  // Guard for SSR/tests where document.body might not exist
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  // Use portal to render at body level (escapes parent fixed positioning)
  return createPortal(
    <div 
      className={overlayStyles} 
      onClick={onClose}
      data-testid="thread-modal-overlay"
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div 
        className={modalStyles} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="thread-modal-title"
        data-testid="thread-modal"
      >
        {/* Header */}
        <div className={headerStyles}>
          <h2 id="thread-modal-title" className={titleStyles}>Conversations</h2>
          <button 
            className={closeButtonStyles} 
            onClick={onClose}
            aria-label="Close"
            data-testid="thread-modal-close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          className={newChatButtonStyles}
          onClick={handleNewChat}
          data-testid="thread-modal-new-chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Start new conversation
        </button>

        {/* Thread List */}
        <div className={threadListStyles}>
          {isLoading ? (
            <div className={loadingStyles}>Loading conversations...</div>
          ) : threads.length === 0 ? (
            <div className={emptyStyles}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ marginBottom: '4px' }}>No conversations yet</p>
              <p style={{ fontSize: '13px' }}>Start a new chat to create a project</p>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`${threadItemStyles} ${thread.id === activeThreadId ? threadItemActiveStyles : ''}`}
                onClick={() => handleSelectThread(thread.id)}
                data-testid={`thread-modal-item-${thread.id}`}
              >
                <span className={threadTitleStyles}>{thread.title}</span>
                <div className={threadMetaStyles}>
                  <span className={`${badgeStyles} ${thread.status === 'completed' ? completedBadgeStyles : activeBadgeStyles}`}>
                    {thread.status === 'completed' ? 'Completed' : getPhaseDisplay(thread.phase)}
                  </span>
                  <span>{formatTime(thread.lastActivityAt)}</span>
                  <span>{thread.messageCount} msgs</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
