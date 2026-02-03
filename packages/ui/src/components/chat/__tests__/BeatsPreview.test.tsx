/**
 * BeatsPreview Unit Tests
 *
 * Tests the BeatsPreview component for displaying extracted story beats.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BeatsPreview } from '../BeatsPreview';
import type { ExtractedCharacter, ExtractedStoryArc } from '../../../api/hooks/useChat';

// Test data
const mockCharacters: ExtractedCharacter[] = [
  {
    name: 'Luna',
    role: 'protagonist',
    visualDescription: 'A silver wolf with blue eyes',
    personality: ['brave', 'kind'],
  },
  {
    name: 'Max',
    role: 'supporting',
    visualDescription: 'An orange fox',
    personality: ['clever'],
  },
];

const mockArc: ExtractedStoryArc = {
  premise: {
    logline: 'Two unlikely friends face danger together',
    genre: 'adventure',
    tone: 'hopeful',
    themes: ['friendship', 'courage'],
    setting: 'Snowy forest',
  },
  structure: 'three-act',
  acts: ['Setup', 'Confrontation', 'Resolution'],
  beats: [
    {
      type: 'setup',
      actIndex: 0,
      summary: 'Luna alone in the forest',
      visualDescription: 'A silver wolf sits on a snowy hilltop',
      emotionalTone: 'lonely',
      involvedCharacters: ['Luna'],
      cameraAngle: 'wide',
    },
    {
      type: 'inciting_incident',
      actIndex: 0,
      summary: 'Luna meets Max',
      visualDescription: 'Luna encounters Max in a clearing',
      emotionalTone: 'curious',
      involvedCharacters: ['Luna', 'Max'],
    },
    {
      type: 'climax',
      actIndex: 2,
      summary: 'They face danger together',
      visualDescription: 'Luna and Max stand against a storm',
      emotionalTone: 'tense',
      involvedCharacters: ['Luna', 'Max'],
      cameraAngle: 'low-angle',
    },
  ],
};

describe('BeatsPreview', () => {
  const mockOnConfirm = vi.fn();
  const mockOnEdit = vi.fn();

  describe('rendering', () => {
    it('renders the story name', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="My Adventure Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('My Adventure Story')).toBeInTheDocument();
    });

    it('renders the premise logline', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Two unlikely friends face danger together')).toBeInTheDocument();
    });

    it('renders premise metadata', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/Genre:/)).toBeInTheDocument();
      expect(screen.getByText('adventure')).toBeInTheDocument();
      expect(screen.getByText(/Tone:/)).toBeInTheDocument();
      expect(screen.getByText('hopeful')).toBeInTheDocument();
    });

    it('renders the structure type', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('three act')).toBeInTheDocument();
    });

    it('renders all acts', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Setup')).toBeInTheDocument();
      expect(screen.getByText('Confrontation')).toBeInTheDocument();
      expect(screen.getByText('Resolution')).toBeInTheDocument();
    });

    it('renders beat cards', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('beat-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('beat-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('beat-card-2')).toBeInTheDocument();
    });

    it('renders beat summaries', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Luna alone in the forest')).toBeInTheDocument();
      expect(screen.getByText('Luna meets Max')).toBeInTheDocument();
      expect(screen.getByText('They face danger together')).toBeInTheDocument();
    });

    it('renders beat visual descriptions', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('A silver wolf sits on a snowy hilltop')).toBeInTheDocument();
    });

    it('renders character names in beats', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      // Luna appears in all beats
      const lunaChips = screen.getAllByText('Luna');
      expect(lunaChips.length).toBeGreaterThan(0);

      // Max appears in some beats
      const maxChips = screen.getAllByText('Max');
      expect(maxChips.length).toBeGreaterThan(0);
    });

    it('renders beat count summary', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('3 beats across 3 acts')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('renders Create Project button', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('create-project-button')).toBeInTheDocument();
      expect(screen.getByText('Create Project')).toBeInTheDocument();
    });

    it('calls onConfirm when Create Project is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      await user.click(screen.getByTestId('create-project-button'));
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('renders Edit Story button when onEdit is provided', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Edit Story')).toBeInTheDocument();
    });

    it('calls onEdit when Edit Story is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
        />
      );

      await user.click(screen.getByText('Edit Story'));
      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('disables buttons when isCreating is true', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          isCreating={true}
        />
      );

      expect(screen.getByTestId('create-project-button')).toBeDisabled();
      expect(screen.getByText('Edit Story')).toBeDisabled();
    });

    it('shows Creating... text when isCreating is true', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
          isCreating={true}
        />
      );

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('shows no beats message for empty act', () => {
      const arcWithEmptyAct: ExtractedStoryArc = {
        ...mockArc,
        beats: mockArc.beats.filter(b => b.actIndex !== 1), // Remove act 1 beats
      };

      render(
        <BeatsPreview
          arc={arcWithEmptyAct}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('No beats in this act')).toBeInTheDocument();
    });
  });

  describe('beat types', () => {
    it('renders beat type labels', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('setup')).toBeInTheDocument();
      expect(screen.getByText('inciting incident')).toBeInTheDocument();
      expect(screen.getByText('climax')).toBeInTheDocument();
    });

    it('renders emotional tones', () => {
      render(
        <BeatsPreview
          arc={mockArc}
          characters={mockCharacters}
          name="Test Story"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('lonely')).toBeInTheDocument();
      expect(screen.getByText('curious')).toBeInTheDocument();
      expect(screen.getByText('tense')).toBeInTheDocument();
    });
  });
});
