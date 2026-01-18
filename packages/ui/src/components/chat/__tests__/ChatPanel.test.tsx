/**
 * ChatPanel Unit Tests
 * 
 * Tests the ChatPanel component with mocked useChat hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel, CHAT_COMMANDS, MAX_MESSAGE_LENGTH } from '../ChatPanel';

// Mock the useChat hook
const mockCreateSession = vi.fn();
const mockSendMessage = vi.fn();
const mockReset = vi.fn();
const mockCreateProject = vi.fn();

vi.mock('../../../api/hooks/useChat', () => ({
  useChat: vi.fn(() => ({
    session: { id: 'test-session', threadId: 'test-thread', state: { phase: 'greeting' }, messages: [] },
    messages: [
      {
        id: 'greeting-1',
        role: 'assistant',
        content: "Hi! I'm here to help you create a new project. Tell me about your story idea.",
        createdAt: new Date(),
        metadata: {
          suggestions: ['A romance between two otters', 'A space adventure comic', 'A slice of life story'],
        },
      },
    ],
    isStreaming: false,
    error: null,
    createSession: mockCreateSession,
    sendMessage: mockSendMessage,
    reset: mockReset,
    createProject: mockCreateProject,
  })),
}));

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ChatPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnProjectCreated = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnProjectCreated.mockClear();
    mockCreateSession.mockClear();
    mockSendMessage.mockClear();
    mockReset.mockClear();
    mockCreateProject.mockClear();
    mockCreateSession.mockResolvedValue({ id: 'new-session' });
    mockCreateProject.mockResolvedValue('new-project-id');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = render(
        <ChatPanel isOpen={false} onClose={mockOnClose} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders panel when open', () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create with AI')).toBeInTheDocument();
    });

    it('renders greeting message from session', async () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await waitFor(() => {
        expect(screen.getByText(/help you create a new project/i)).toBeInTheDocument();
      });
    });

    it('renders close button', () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByLabelText(/close chat/i)).toBeInTheDocument();
    });

    it('renders chat input', () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('closing behavior', () => {
    it('calls onClose when clicking close button', async () => {
      const user = userEvent.setup();
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByLabelText(/close chat/i));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByRole('dialog'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when clicking inside panel', async () => {
      const user = userEvent.setup();
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Create with AI'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('message sending', () => {
    it('calls sendMessage when sending a message', async () => {
      const user = userEvent.setup();
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByRole('textbox'), 'My story idea');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('My story idea');
      });
    });
  });

  describe('special commands', () => {
    it('calls createProject on Create Project command', async () => {
      const user = userEvent.setup();
      render(
        <ChatPanel 
          isOpen={true} 
          onClose={mockOnClose} 
          onProjectCreated={mockOnProjectCreated}
        />
      );
      
      await user.type(screen.getByRole('textbox'), CHAT_COMMANDS.CREATE_PROJECT);
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalled();
      });
    });

    it('calls onProjectCreated with project ID', async () => {
      const user = userEvent.setup();
      render(
        <ChatPanel 
          isOpen={true} 
          onClose={mockOnClose} 
          onProjectCreated={mockOnProjectCreated}
        />
      );
      
      await user.type(screen.getByRole('textbox'), CHAT_COMMANDS.CREATE_PROJECT);
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(mockOnProjectCreated).toHaveBeenCalledWith('new-project-id');
      });
    });

    it('resets and creates new session on Start Over command', async () => {
      const user = userEvent.setup();
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByRole('textbox'), CHAT_COMMANDS.START_OVER);
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
        expect(mockCreateSession).toHaveBeenCalled();
      });
    });
  });

  describe('suggestion chips', () => {
    it('renders suggestions from session', async () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await waitFor(() => {
        expect(screen.getByText('A romance between two otters')).toBeInTheDocument();
        expect(screen.getByText('A space adventure comic')).toBeInTheDocument();
      });
    });

    it('sends message when suggestion chip is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      await waitFor(() => {
        expect(screen.getByText('A romance between two otters')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('A romance between two otters'));
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('A romance between two otters');
      });
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'chat-title');
    });

    it('has live region for messages', () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    });

    it('close button has accessible label', () => {
      render(<ChatPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /close chat/i })).toBeInTheDocument();
    });
  });

  describe('constants', () => {
    it('exports CHAT_COMMANDS', () => {
      expect(CHAT_COMMANDS.CREATE_PROJECT).toBe('Create Project');
      expect(CHAT_COMMANDS.START_OVER).toBe('Start over');
      expect(CHAT_COMMANDS.ADD_DETAILS).toBe('Add more details');
      expect(CHAT_COMMANDS.SKIP).toBe('Skip for now');
    });

    it('exports MAX_MESSAGE_LENGTH', () => {
      expect(MAX_MESSAGE_LENGTH).toBe(4000);
    });
  });
});
