/**
 * ThreadSidebar Component
 * 
 * Sidebar showing chat thread history with ability to switch between threads.
 */

import { css } from '../../../styled-system/css';
import { useThreads, type ChatThread } from '../../api/hooks/useThreads';

// =============================================================================
// Props
// =============================================================================

interface ThreadSidebarProps {
  /** Currently active thread ID */
  activeThreadId?: string;
  /** Called when a thread is selected */
  onSelectThread: (threadId: string) => void;
  /** Called when new chat is requested */
  onNewChat: () => void;
  /** Whether sidebar is open (for mobile) */
  isOpen?: boolean;
  /** Called to close sidebar (mobile) */
  onClose?: () => void;
}

// =============================================================================
// Styles
// =============================================================================

const sidebarStyles = css({
  display: 'flex',
  flexDirection: 'column',
  width: '280px',
  height: '100%',
  backgroundColor: 'gray.900',
  borderRight: '1px solid',
  borderColor: 'gray.700',
  overflow: 'hidden',
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px',
  borderBottom: '1px solid',
  borderColor: 'gray.700',
});

const titleStyles = css({
  fontSize: '14px',
  fontWeight: '600',
  color: 'gray.100',
});

const newChatButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  backgroundColor: 'blue.600',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
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
  padding: '8px',
});

const threadItemStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '12px',
  borderRadius: '8px',
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
  color: 'gray.400',
});

const threadBadgeStyles = css({
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
});

const phaseBadgeStyles = css({
  backgroundColor: 'blue.900',
  color: 'blue.300',
});

const completedBadgeStyles = css({
  backgroundColor: 'green.900',
  color: 'green.300',
});

const emptyStateStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 16px',
  textAlign: 'center',
  color: 'gray.400',
});

const loadingStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px',
  color: 'gray.400',
});

// =============================================================================
// Component
// =============================================================================

export function ThreadSidebar({
  activeThreadId,
  onSelectThread,
  onNewChat,
  isOpen = true,
  onClose,
}: ThreadSidebarProps) {
  const { threads, isLoading, error, fetchThreads } = useThreads();

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

  if (!isOpen) return null;

  return (
    <aside className={sidebarStyles} data-testid="thread-sidebar">
      {/* Header */}
      <div className={headerStyles}>
        <span className={titleStyles}>Conversations</span>
        <button
          className={newChatButtonStyles}
          onClick={onNewChat}
          data-testid="new-chat-button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New
        </button>
      </div>

      {/* Thread List */}
      <div className={threadListStyles}>
        {isLoading ? (
          <div className={loadingStyles}>Loading...</div>
        ) : error ? (
          <div className={emptyStateStyles}>
            <p>Failed to load conversations</p>
            <button onClick={fetchThreads} style={{ marginTop: '8px', color: '#60a5fa' }}>
              Retry
            </button>
          </div>
        ) : threads.length === 0 ? (
          <div className={emptyStateStyles}>
            <p>No conversations yet</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              Start a new chat to create a project
            </p>
          </div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className={`${threadItemStyles} ${thread.id === activeThreadId ? threadItemActiveStyles : ''}`}
              onClick={() => onSelectThread(thread.id)}
              data-testid={`thread-item-${thread.id}`}
            >
              <span className={threadTitleStyles}>{thread.title}</span>
              <div className={threadMetaStyles}>
                <span className={`${threadBadgeStyles} ${thread.status === 'completed' ? completedBadgeStyles : phaseBadgeStyles}`}>
                  {thread.status === 'completed' ? 'Completed' : getPhaseDisplay(thread.phase)}
                </span>
                <span>{formatTime(thread.lastActivityAt)}</span>
                <span>{thread.messageCount} msgs</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
