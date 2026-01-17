/**
 * LoRABrowser Component
 * 
 * Browse and select LoRAs to associate with a character.
 * Displays LoRAs grouped by category with search and filtering.
 * 
 * ARRR! Choose yer style, ye scurvy dog! 🎭🏴‍☠️
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '../../../styled-system/css';
import { LoraConfig } from './types';
import { LORA_CATALOG, getLora, listLorasByCategory, type LoraEntry } from '@graphix/core/src/generation/models/lora-catalog';

// ============================================================================
// Types
// ============================================================================

export interface LoRABrowserProps {
  /** Currently selected LoRA config (if any) */
  selectedLora: LoraConfig | null;
  /** Called when a LoRA is selected */
  onSelect: (loraId: string, strength: number) => void;
  /** Called when LoRA is removed */
  onRemove: () => void;
  /** Called when strength is changed */
  onStrengthChange: (strength: number) => void;
}

export interface LoRACardProps {
  /** LoRA entry data */
  lora: LoraEntry;
  /** Whether this LoRA is selected */
  isSelected: boolean;
  /** Called when card is clicked */
  onClick: () => void;
}

type LoraCategory = 'all' | 'style' | 'character' | 'concept' | 'effect';

// ============================================================================
// LoRACard Component
// ============================================================================

export function LoRACard({ lora, isSelected, onClick }: LoRACardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={css({
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        backgroundColor: isSelected ? '#3730a3' : '#1a1a2e',
        border: isSelected ? '2px solid #6366f1' : '1px solid #333',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        _hover: { backgroundColor: isSelected ? '#4338ca' : '#2a2a4a' },
      })}
      aria-pressed={isSelected}
      data-testid="lora-card"
      data-lora-id={lora.id}
    >
      {/* Preview (if available) */}
      {lora.previewUrl && (
        <div
          className={css({
            width: '100%',
            aspectRatio: '1',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px',
            backgroundColor: '#0f0f1a',
          })}
        >
          <img
            src={lora.previewUrl}
            alt={`${lora.name} preview`}
            className={css({
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            })}
          />
        </div>
      )}

      {/* Name */}
      <h4
        className={css({
          margin: 0,
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '4px',
        })}
      >
        {lora.name}
      </h4>

      {/* Category Badge */}
      <span
        className={css({
          display: 'inline-block',
          padding: '2px 6px',
          backgroundColor: getCategoryColor(lora.category),
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          marginBottom: '4px',
        })}
        data-testid="lora-category-badge"
      >
        {lora.category}
      </span>

      {/* Description */}
      {lora.description && (
        <p
          className={css({
            margin: 0,
            color: '#888',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          })}
        >
          {lora.description}
        </p>
      )}

      {/* Default Strength */}
      <p
        className={css({
          margin: '4px 0 0 0',
          color: '#666',
          fontSize: '0.7rem',
        })}
      >
        Default: {(lora.defaultStrength * 100).toFixed(0)}%
      </p>
    </button>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    style: '#8b5cf6',
    character: '#10b981',
    concept: '#f59e0b',
    effect: '#ef4444',
  };
  return colors[category] || '#6366f1';
}

// ============================================================================
// LoRABrowser Component
// ============================================================================

export function LoRABrowser({
  selectedLora,
  onSelect,
  onRemove,
  onStrengthChange,
}: LoRABrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LoraCategory>('all');
  const [localStrength, setLocalStrength] = useState(selectedLora?.strength ?? 0.8);

  // Get all LoRAs as array
  const allLoras = useMemo(() => Object.values(LORA_CATALOG), []);

  // Filter LoRAs
  const filteredLoras = useMemo(() => {
    let result = allLoras;

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter((lora) => lora.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (lora) =>
          lora.name.toLowerCase().includes(query) ||
          lora.description?.toLowerCase().includes(query) ||
          lora.id.toLowerCase().includes(query) ||
          lora.triggerWords?.some((w) => w.toLowerCase().includes(query))
      );
    }

    return result;
  }, [allLoras, categoryFilter, searchQuery]);

  // Group by category for display
  const groupedLoras = useMemo(() => {
    if (categoryFilter !== 'all') {
      return { [categoryFilter]: filteredLoras };
    }

    return filteredLoras.reduce((acc, lora) => {
      const cat = lora.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(lora);
      return acc;
    }, {} as Record<string, LoraEntry[]>);
  }, [filteredLoras, categoryFilter]);

  // Get selected LoRA details
  const selectedLoraDetails = useMemo(() => {
    if (!selectedLora) return null;
    return getLora(selectedLora.id);
  }, [selectedLora]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSelectLora = useCallback((lora: LoraEntry) => {
    const strength = lora.defaultStrength;
    setLocalStrength(strength);
    onSelect(lora.id, strength);
  }, [onSelect]);

  const handleStrengthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalStrength(value);
  }, []);

  const handleStrengthCommit = useCallback(() => {
    onStrengthChange(localStrength);
  }, [localStrength, onStrengthChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((category: LoraCategory) => {
    setCategoryFilter(category);
  }, []);

  // Sync local strength with prop
  React.useEffect(() => {
    if (selectedLora) {
      setLocalStrength(selectedLora.strength);
    }
  }, [selectedLora]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      })}
      data-testid="lora-browser"
    >
      {/* Selected LoRA Display */}
      {selectedLora && selectedLoraDetails && (
        <div
          className={css({
            padding: '16px',
            backgroundColor: '#2a2a4a',
            borderRadius: '8px',
            border: '1px solid #6366f1',
          })}
          data-testid="selected-lora-display"
        >
          <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' })}>
            <div>
              <h4 className={css({ margin: 0, color: '#fff', fontSize: '1rem' })}>
                {selectedLoraDetails.name}
              </h4>
              <span
                className={css({
                  display: 'inline-block',
                  padding: '2px 6px',
                  backgroundColor: getCategoryColor(selectedLoraDetails.category),
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  marginTop: '4px',
                })}
              >
                {selectedLoraDetails.category}
              </span>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className={css({
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.75rem',
                cursor: 'pointer',
                _hover: { backgroundColor: '#dc2626' },
              })}
              data-testid="remove-lora-button"
            >
              Remove
            </button>
          </div>

          {/* Strength Slider */}
          <div>
            <label
              htmlFor="lora-strength"
              className={css({ display: 'block', color: '#888', fontSize: '0.875rem', marginBottom: '8px' })}
            >
              Strength: {(localStrength * 100).toFixed(0)}%
            </label>
            <input
              id="lora-strength"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localStrength}
              onChange={handleStrengthChange}
              onMouseUp={handleStrengthCommit}
              onTouchEnd={handleStrengthCommit}
              className={css({
                width: '100%',
                cursor: 'pointer',
              })}
              data-testid="lora-strength-slider"
            />
          </div>

          {/* Trigger Words */}
          {selectedLoraDetails.triggerWords && selectedLoraDetails.triggerWords.length > 0 && (
            <div className={css({ marginTop: '12px' })}>
              <p className={css({ color: '#888', fontSize: '0.75rem', marginBottom: '4px' })}>
                Trigger words:
              </p>
              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '4px' })}>
                {selectedLoraDetails.triggerWords.map((word, index) => (
                  <span
                    key={index}
                    className={css({
                      padding: '2px 8px',
                      backgroundColor: '#1a1a2e',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    })}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter */}
      <div className={css({ display: 'flex', gap: '8px', flexWrap: 'wrap' })}>
        <input
          type="search"
          placeholder="Search LoRAs..."
          value={searchQuery}
          onChange={handleSearchChange}
          className={css({
            flex: 1,
            minWidth: '200px',
            padding: '10px 12px',
            backgroundColor: '#0f0f1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem',
            _focus: { outline: 'none', borderColor: '#6366f1' },
          })}
          aria-label="Search LoRAs"
          data-testid="lora-search-input"
        />
        
        <div className={css({ display: 'flex', gap: '4px' })} role="tablist" aria-label="Filter by category">
          {(['all', 'style', 'character', 'concept', 'effect'] as LoraCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={categoryFilter === cat}
              onClick={() => handleCategoryChange(cat)}
              className={css({
                padding: '8px 12px',
                backgroundColor: categoryFilter === cat ? '#4f46e5' : 'transparent',
                border: '1px solid',
                borderColor: categoryFilter === cat ? '#4f46e5' : '#333',
                borderRadius: '4px',
                color: categoryFilter === cat ? '#fff' : '#888',
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                cursor: 'pointer',
                _hover: { color: '#fff', borderColor: '#6366f1' },
              })}
              data-testid={`category-filter-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* LoRA Grid */}
      {filteredLoras.length > 0 ? (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '16px' })}>
          {Object.entries(groupedLoras).map(([category, loras]) => (
            <div key={category} data-testid={`lora-category-${category}`}>
              {categoryFilter === 'all' && (
                <h3
                  className={css({
                    color: '#888',
                    fontSize: '0.875rem',
                    textTransform: 'capitalize',
                    marginBottom: '8px',
                    borderBottom: '1px solid #333',
                    paddingBottom: '4px',
                  })}
                >
                  {category} ({loras.length})
                </h3>
              )}
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '12px',
                })}
                role="list"
                aria-label={`${category} LoRAs`}
              >
                {loras.map((lora) => (
                  <div key={lora.id} role="listitem">
                    <LoRACard
                      lora={lora}
                      isSelected={selectedLora?.id === lora.id}
                      onClick={() => handleSelectLora(lora)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={css({
            textAlign: 'center',
            padding: '32px',
            color: '#666',
          })}
          data-testid="no-loras-found"
        >
          <p>No LoRAs found matching your search.</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={css({
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#4f46e5',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
              })}
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LoRABrowser;
