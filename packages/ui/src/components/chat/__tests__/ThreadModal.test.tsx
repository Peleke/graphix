/**
 * ThreadModal Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThreadModal } from '../ThreadModal';

// Mock useThreads hook
vi.mock('../../../api/hooks/useThreads', () => ({
  useThreads: vi.fn(() => ({
    threads: [
      {
        id: 'thread-1',
        title: 'Story about otters',
        status: 'active',
        phase: 'characters',
        messageCount: 5,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      },
      {
        id: 'thread-2',
        title: 'Space adventure',
        status: 'completed',
        phase: 'complete',
        messageCount: 12,
        lastActivityAt: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 86400000),
      },
    ],
    isLoading: false,
    error: null,
    fetchThreads: vi.fn(),
    deleteThread: vi.fn(),
  })),
}));

describe('ThreadModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectThread: vi.fn(),
    onNewChat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<ThreadModal {...defaultProps} />);
    expect(screen.getByTestId('thread-modal')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ThreadModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('thread-modal')).not.toBeInTheDocument();
  });

  it('displays threads', async () => {
    render(<ThreadModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Story about otters')).toBeInTheDocument();
      expect(screen.getByText('Space adventure')).toBeInTheDocument();
    });
  });

  it('calls onSelectThread when thread clicked', async () => {
    render(<ThreadModal {...defaultProps} />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('thread-modal-item-thread-1'));
    });
    
    expect(defaultProps.onSelectThread).toHaveBeenCalledWith('thread-1');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onNewChat when new chat button clicked', () => {
    render(<ThreadModal {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-modal-new-chat'));
    
    expect(defaultProps.onNewChat).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes on overlay click', () => {
    render(<ThreadModal {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-modal-overlay'));
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes on close button click', () => {
    render(<ThreadModal {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-modal-close'));
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
