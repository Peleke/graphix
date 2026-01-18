/**
 * ThreadDropdown Component
 * 
 * Compact dropdown for switching between chat threads.
 */

import { useState, useRef, useEffect } from 'react';
import { css } from '../../../styled-system/css';
import { useThreads, type ChatThread } from '../../api/hooks/useThreads';

// =============================================================================
// Props
// =============================================================================

interface ThreadDropdownProps {
  /** Currently active thread ID */
  activeThreadId?: string;
  /** Current thread title */
  activeTitle?: string;
  /** Called when a thread is selected */
  onSelectThread: (threadId: string) => void;
  /** Called when new chat is requested */
  onNewChat: () => void;
}

// =============================================================================
// Styles
// =============================================================================

const containerStyles = css({
  position: 'relative',
});

const triggerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  backgroundColor: 'transparent',
  border: '1px solid',
  borderColor: 'gray.600',
  borderRadius: '8px',
  color: 'gray.100',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  maxWidth: '200px',
  _hover: {
    backgroundColor: 'gray.800',
    borderColor: 'gray.500',
  },
});

const triggerTextStyles = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

const dropdownStyles = css({
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  width: '280px',
  maxHeight: '400px',
  backgroundColor: 'gray.900',
  border: '1px solid',
  borderColor: 'gray.700',
  borderRadius: '12px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  overflow: 'hidden',
  zIndex: 100,
});

const dropdownHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid',
  borderColor: 'gray.700',
});

const dropdownTitleStyles = css({
  fontSize: '13px',
  fontWeight: '600',
  color: 'gray.300',
});

const newChatLinkStyles = css({
  fontSize: '13px',
  color: 'blue.400',
  cursor: 'pointer',
  _hover: {
    color: 'blue.300',
    textDecoration: 'underline',
  },
});

const threadListStyles = css({
  maxHeight: '300px',
  overflowY: 'auto',
});

const threadItemStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: '10px 16px',
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
  color: 'gray.100',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const threadMetaStyles = css({
  fontSize: '12px',
  color: 'gray.500',
});

const emptyStyles = css({
  padding: '24px 16px',
  textAlign: 'center',
  color: 'gray.500',
  fontSize: '13px',
});

// =============================================================================
// Component
// =============================================================================

export function ThreadDropdown({
  activeThreadId,
  activeTitle = 'New conversation',
  onSelectThread,
  onNewChat,
}: ThreadDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { threads, isLoading } = useThreads({ autoFetch: isOpen });

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

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

  const handleSelectThread = (threadId: string) => {
    onSelectThread(threadId);
    setIsOpen(false);
  };

  const handleNewChat = () => {
    onNewChat();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={containerStyles}>
      {/* Trigger Button */}
      <button
        className={triggerStyles}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="thread-dropdown-trigger"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className={triggerTextStyles}>{activeTitle}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={dropdownStyles} data-testid="thread-dropdown-menu">
          <div className={dropdownHeaderStyles}>
            <span className={dropdownTitleStyles}>Conversations</span>
            <span className={newChatLinkStyles} onClick={handleNewChat}>
              + New chat
            </span>
          </div>

          <div className={threadListStyles}>
            {isLoading ? (
              <div className={emptyStyles}>Loading...</div>
            ) : threads.length === 0 ? (
              <div className={emptyStyles}>
                No previous conversations
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`${threadItemStyles} ${thread.id === activeThreadId ? threadItemActiveStyles : ''}`}
                  onClick={() => handleSelectThread(thread.id)}
                  data-testid={`thread-dropdown-item-${thread.id}`}
                >
                  <span className={threadTitleStyles}>{thread.title}</span>
                  <span className={threadMetaStyles}>
                    {formatTime(thread.lastActivityAt)} · {thread.messageCount} messages
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
