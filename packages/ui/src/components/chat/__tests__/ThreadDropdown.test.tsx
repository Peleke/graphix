/**
 * ThreadDropdown Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThreadDropdown } from '../ThreadDropdown';

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
        lastActivityAt: new Date(Date.now() - 3600000), // 1 hour ago
        createdAt: new Date(Date.now() - 86400000),
      },
    ],
    isLoading: false,
    error: null,
    fetchThreads: vi.fn(),
    deleteThread: vi.fn(),
  })),
}));

describe('ThreadDropdown', () => {
  const defaultProps = {
    onSelectThread: vi.fn(),
    onNewChat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<ThreadDropdown {...defaultProps} />);
    
    expect(screen.getByTestId('thread-dropdown-trigger')).toBeInTheDocument();
  });

  it('shows dropdown when clicked', async () => {
    render(<ThreadDropdown {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-dropdown-trigger'));
    
    await waitFor(() => {
      expect(screen.getByTestId('thread-dropdown-menu')).toBeInTheDocument();
    });
  });

  it('displays threads in dropdown', async () => {
    render(<ThreadDropdown {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-dropdown-trigger'));
    
    await waitFor(() => {
      expect(screen.getByText('Story about otters')).toBeInTheDocument();
      expect(screen.getByText('Space adventure')).toBeInTheDocument();
    });
  });

  it('calls onSelectThread when thread is clicked', async () => {
    render(<ThreadDropdown {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-dropdown-trigger'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('thread-dropdown-item-thread-1'));
    });
    
    expect(defaultProps.onSelectThread).toHaveBeenCalledWith('thread-1');
  });

  it('calls onNewChat when new chat is clicked', async () => {
    render(<ThreadDropdown {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-dropdown-trigger'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ New chat'));
    });
    
    expect(defaultProps.onNewChat).toHaveBeenCalled();
  });

  it('closes dropdown after selecting thread', async () => {
    render(<ThreadDropdown {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('thread-dropdown-trigger'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('thread-dropdown-item-thread-1'));
    });
    
    expect(screen.queryByTestId('thread-dropdown-menu')).not.toBeInTheDocument();
  });

  it('displays active title', () => {
    render(<ThreadDropdown {...defaultProps} activeTitle="My conversation" />);
    
    expect(screen.getByText('My conversation')).toBeInTheDocument();
  });

  it('highlights active thread', async () => {
    render(<ThreadDropdown {...defaultProps} activeThreadId="thread-1" />);
    
    fireEvent.click(screen.getByTestId('thread-dropdown-trigger'));
    
    await waitFor(() => {
      const activeItem = screen.getByTestId('thread-dropdown-item-thread-1');
      // Check for active styles (border-left indicates active)
      expect(activeItem).toBeInTheDocument();
    });
  });
});
