/**
 * ChatPanel Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel, CHAT_COMMANDS, MAX_MESSAGE_LENGTH } from '../ChatPanel';

// Mock scrollIntoView - JSDOM doesn't support it
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ChatPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnProjectCreated = vi.fn();
  const mockIdGenerator = vi.fn();
  let idCounter = 0;

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnProjectCreated.mockClear();
    idCounter = 0;
    mockIdGenerator.mockImplementation(() => `test-msg-${idCounter++}`);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = render(
        <ChatPanel isOpen={false} onClose={mockOnClose} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders panel when open', () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create with AI')).toBeInTheDocument();
    });

    it('renders greeting message on open', async () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/help you create a new project/i)).toBeInTheDocument();
      });
    });

    it('renders close button', () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      expect(screen.getByLabelText(/close chat/i)).toBeInTheDocument();
    });

    it('renders chat input', () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('closing behavior', () => {
    it('calls onClose when clicking close button', async () => {
      const user = userEvent.setup();
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      await user.click(screen.getByLabelText(/close chat/i));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      // Click on the overlay (dialog element itself)
      await user.click(screen.getByRole('dialog'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when clicking inside panel', async () => {
      const user = userEvent.setup();
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      // Click on the panel content
      await user.click(screen.getByText('Create with AI'));
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('message sending', () => {
    it('adds user message to chat', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      await user.type(screen.getByRole('textbox'), 'My story idea');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('My story idea')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('special commands', () => {
    it('triggers project creation on Create Project command', async () => {
      const user = userEvent.setup();
      render(
        <ChatPanel 
          isOpen={true} 
          onClose={mockOnClose} 
          onProjectCreated={mockOnProjectCreated}
          idGenerator={mockIdGenerator}
        />
      );
      
      // Type the create project command
      await user.type(screen.getByRole('textbox'), CHAT_COMMANDS.CREATE_PROJECT);
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      expect(mockOnProjectCreated).toHaveBeenCalledWith('mock-project-id');
      expect(mockOnClose).toHaveBeenCalled();
    });

    // Skipped: Complex async timing - covered by E2E test "2.8 Start Over"
    it.skip('resets conversation on Start Over command', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      // Wait for greeting
      await waitFor(() => {
        expect(screen.getByText(/help you create/i)).toBeInTheDocument();
      });
      
      // Send a unique message
      await user.type(screen.getByRole('textbox'), 'UniqueTestPhrase12345');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('UniqueTestPhrase12345')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Now send Start Over - this should reset
      await user.type(screen.getByRole('textbox'), CHAT_COMMANDS.START_OVER);
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      // After reset, our unique message should be gone
      await waitFor(() => {
        expect(screen.queryByText('UniqueTestPhrase12345')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('message length validation', () => {
    it('exports MAX_MESSAGE_LENGTH constant', () => {
      expect(MAX_MESSAGE_LENGTH).toBe(4000);
    });
  });

  describe('suggestion chips', () => {
    it('renders initial suggestions', async () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      await waitFor(() => {
        expect(screen.getByText('A romance between two otters')).toBeInTheDocument();
        expect(screen.getByText('A space adventure comic')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('sends message when suggestion chip is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      await waitFor(() => {
        expect(screen.getByText('A romance between two otters')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      await user.click(screen.getByText('A romance between two otters'));
      
      await waitFor(() => {
        // Should appear as user message
        const userMessages = document.querySelectorAll('.chat-message.user');
        expect(userMessages.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'chat-title');
    });

    it('has live region for messages', () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    });

    it('close button has accessible label', () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
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
  });

  describe('id generation', () => {
    it('uses provided idGenerator', () => {
      render(
        <ChatPanel isOpen={true} onClose={mockOnClose} idGenerator={mockIdGenerator} />
      );
      
      expect(mockIdGenerator).toHaveBeenCalled();
    });
  });
});
