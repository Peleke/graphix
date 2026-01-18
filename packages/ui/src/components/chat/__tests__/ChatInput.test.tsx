/**
 * ChatInput Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput, DEFAULT_MAX_LENGTH } from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  describe('rendering', () => {
    it('renders textarea and send button', () => {
      render(<ChatInput onSend={mockOnSend} />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('shows custom placeholder', () => {
      render(<ChatInput onSend={mockOnSend} placeholder="Custom placeholder" />);
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('shows character count', () => {
      render(<ChatInput onSend={mockOnSend} maxLength={100} />);
      
      expect(screen.getByText('0/100')).toBeInTheDocument();
    });

    it('shows keyboard hint', () => {
      render(<ChatInput onSend={mockOnSend} />);
      
      expect(screen.getByText(/enter to send/i)).toBeInTheDocument();
    });
  });

  describe('input handling', () => {
    it('updates value when typing', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello world');
      
      expect(textarea).toHaveValue('Hello world');
    });

    it('enforces maxLength', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} maxLength={10} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'This is a very long message');
      
      expect(textarea).toHaveValue('This is a ');
      expect(screen.getByText('10/10')).toBeInTheDocument();
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      expect(textarea).toHaveValue('');
    });
  });

  describe('sending messages', () => {
    it('calls onSend when clicking send button', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      await user.type(screen.getByRole('textbox'), 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('calls onSend when pressing Enter', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test message');
      await user.keyboard('{Enter}');
      
      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('does not send on Shift+Enter (allows newline)', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'Line 2');
      
      expect(mockOnSend).not.toHaveBeenCalled();
      expect(textarea).toHaveValue('Line 1\nLine 2');
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('does not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      await user.type(screen.getByRole('textbox'), '   ');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('trims whitespace from messages', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      await user.type(screen.getByRole('textbox'), '  Hello world  ');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      expect(mockOnSend).toHaveBeenCalledWith('Hello world');
    });
  });

  describe('disabled state', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<ChatInput onSend={mockOnSend} disabled />);
      
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('disables send button when disabled', () => {
      render(<ChatInput onSend={mockOnSend} disabled />);
      
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    it('disables send button when input is empty', () => {
      render(<ChatInput onSend={mockOnSend} />);
      
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    it('enables send button when input has content', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);
      
      await user.type(screen.getByRole('textbox'), 'Hello');
      
      expect(screen.getByRole('button', { name: /send/i })).toBeEnabled();
    });
  });

  describe('character limit feedback', () => {
    it('shows normal styling below 90% limit', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} maxLength={100} />);
      
      await user.type(screen.getByRole('textbox'), 'Short');
      
      const charCount = screen.getByText('5/100');
      expect(charCount).not.toHaveClass('near-limit');
      expect(charCount).not.toHaveClass('at-limit');
    });
  });

  describe('accessibility', () => {
    it('has accessible labels', () => {
      render(<ChatInput onSend={mockOnSend} />);
      
      expect(screen.getByLabelText(/chat message input/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/send message/i)).toBeInTheDocument();
    });

    it('associates textarea with descriptions', () => {
      render(<ChatInput onSend={mockOnSend} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'char-count input-hint');
    });
  });
});
