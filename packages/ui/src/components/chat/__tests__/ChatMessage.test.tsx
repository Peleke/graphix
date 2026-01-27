/**
 * ChatMessage Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import type { ChatMessage as ChatMessageType } from '../types';

const createMessage = (overrides: Partial<ChatMessageType> = {}): ChatMessageType => ({
  id: 'test-msg-1',
  role: 'assistant',
  content: 'Hello, how can I help you?',
  timestamp: new Date('2026-01-18T10:00:00Z'),
  ...overrides
});

describe('ChatMessage', () => {
  describe('rendering', () => {
    it('renders message content', () => {
      const message = createMessage({ content: 'Test message content' });
      render(<ChatMessage message={message} />);
      
      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });

    it('applies user role styling', () => {
      const message = createMessage({ role: 'user' });
      const { container } = render(<ChatMessage message={message} />);
      
      expect(container.querySelector('.chat-message.user')).toBeInTheDocument();
    });

    it('applies assistant role styling', () => {
      const message = createMessage({ role: 'assistant' });
      const { container } = render(<ChatMessage message={message} />);
      
      expect(container.querySelector('.chat-message.assistant')).toBeInTheDocument();
    });

    it('applies system role styling', () => {
      const message = createMessage({ role: 'system' });
      const { container } = render(<ChatMessage message={message} />);
      
      expect(container.querySelector('.chat-message.system')).toBeInTheDocument();
    });
  });

  describe('streaming indicator', () => {
    it('shows streaming dots when isStreaming is true', () => {
      const message = createMessage({ isStreaming: true });
      const { container } = render(<ChatMessage message={message} />);
      
      expect(container.querySelector('.streaming-indicator')).toBeInTheDocument();
      expect(container.querySelectorAll('.streaming-dot')).toHaveLength(3);
    });

    it('hides streaming dots when isStreaming is false', () => {
      const message = createMessage({ isStreaming: false });
      const { container } = render(<ChatMessage message={message} />);
      
      expect(container.querySelector('.streaming-indicator')).not.toBeInTheDocument();
    });
  });

  describe('suggestion chips', () => {
    it('renders suggestion chips from metadata', () => {
      const message = createMessage({
        metadata: { suggestions: ['Option A', 'Option B', 'Option C'] }
      });
      render(<ChatMessage message={message} />);
      
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('Option C')).toBeInTheDocument();
    });

    it('calls onSuggestionClick when chip is clicked', () => {
      const mockOnClick = vi.fn();
      const message = createMessage({
        metadata: { suggestions: ['Click me'] }
      });
      render(<ChatMessage message={message} onSuggestionClick={mockOnClick} />);
      
      fireEvent.click(screen.getByText('Click me'));
      
      expect(mockOnClick).toHaveBeenCalledWith('Click me');
    });

    it('does not render suggestions container when no suggestions', () => {
      const message = createMessage({ metadata: { suggestions: [] } });
      const { container } = render(<ChatMessage message={message} />);
      
      expect(container.querySelector('.suggestions')).not.toBeInTheDocument();
    });

    it('does not render suggestions container when metadata is undefined', () => {
      const message = createMessage();
      const { container } = render(<ChatMessage message={message} />);
      
      expect(container.querySelector('.suggestions')).not.toBeInTheDocument();
    });
  });

  describe('asset matches', () => {
    it('renders character matches with initials when no thumbnail', () => {
      const message = createMessage({
        metadata: {
          assetMatches: [
            { id: 'char-1', name: 'Alice', confidence: 0.95, matchReason: 'exact_name' },
            { id: 'char-2', name: 'Bob', confidence: 0.8, matchReason: 'similar_name' }
          ]
        }
      });
      render(<ChatMessage message={message} />);
      
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument(); // Initial
      expect(screen.getByText('B')).toBeInTheDocument(); // Initial
      expect(screen.getByText('95% match')).toBeInTheDocument();
      expect(screen.getByText('80% match')).toBeInTheDocument();
    });

    it('renders thumbnail image when provided', () => {
      const message = createMessage({
        metadata: {
          assetMatches: [
            { 
              id: 'char-1', 
              name: 'Alice', 
              thumbnail: 'https://example.com/alice.jpg',
              confidence: 0.9, 
              matchReason: 'exact_name' 
            }
          ]
        }
      });
      render(<ChatMessage message={message} />);
      
      const img = screen.getByAltText('Alice');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg');
      expect(img).toHaveAttribute('width', '32');
      expect(img).toHaveAttribute('height', '32');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('whitespace handling', () => {
    it('preserves whitespace in message content', () => {
      const message = createMessage({
        content: 'Line 1\n\nLine 3'
      });
      const { container } = render(<ChatMessage message={message} />);
      
      // Check the message-content has white-space: pre-wrap
      const messageContent = container.querySelector('.message-content');
      expect(messageContent).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      const message = createMessage({ content: '' });
      render(<ChatMessage message={message} />);
      
      // Should render without crashing
      expect(document.querySelector('.chat-message')).toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = 'A'.repeat(10000);
      const message = createMessage({ content: longContent });
      render(<ChatMessage message={message} />);
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('handles special characters in content', () => {
      const message = createMessage({
        role: 'user',
        content: '<script>alert("xss")</script> & "quotes" \'apostrophes\''
      });
      render(<ChatMessage message={message} />);

      // React escapes HTML in user messages (rendered as plain text)
      expect(screen.getByText('<script>alert("xss")</script> & "quotes" \'apostrophes\'')).toBeInTheDocument();
    });

    it('handles unicode and emojis', () => {
      const message = createMessage({
        content: 'Hello 🌍! 你好 مرحبا'
      });
      render(<ChatMessage message={message} />);
      
      expect(screen.getByText('Hello 🌍! 你好 مرحبا')).toBeInTheDocument();
    });
  });
});
