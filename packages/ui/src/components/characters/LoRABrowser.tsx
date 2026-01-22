/**
 * LoRABrowser Component
 *
 * Browse and select LoRAs to associate with a character.
 * Displays LoRAs grouped by category with search and filtering.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { LoraConfig } from './types';
import { LORA_CATALOG, getLora, type LoraEntry } from '@graphix/core/generation/models';

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
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,

  selectedDisplay: {
    padding: '16px',
    backgroundColor: '#262637',
    borderRadius: '12px',
    border: '1px solid #8b5cf6',
  } as React.CSSProperties,

  selectedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  } as React.CSSProperties,

  selectedTitle: {
    margin: 0,
    color: '#cdd6f4',
    fontSize: '15px',
    fontWeight: 600,
  } as React.CSSProperties,

  removeButton: {
    padding: '6px 12px',
    backgroundColor: 'rgba(243, 139, 168, 0.15)',
    border: '1px solid rgba(243, 139, 168, 0.3)',
    borderRadius: '6px',
    color: '#f38ba8',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  removeButtonHover: {
    backgroundColor: 'rgba(243, 139, 168, 0.25)',
    borderColor: '#f38ba8',
  } as React.CSSProperties,

  strengthLabel: {
    display: 'block',
    color: '#a6adc8',
    fontSize: '13px',
    marginBottom: '8px',
  } as React.CSSProperties,

  strengthSlider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    cursor: 'pointer',
    accentColor: '#8b5cf6',
  } as React.CSSProperties,

  triggerSection: {
    marginTop: '12px',
  } as React.CSSProperties,

  triggerLabel: {
    color: '#6c7086',
    fontSize: '12px',
    marginBottom: '6px',
  } as React.CSSProperties,

  triggerContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  } as React.CSSProperties,

  triggerWord: {
    padding: '3px 8px',
    backgroundColor: '#313244',
    borderRadius: '4px',
    color: '#cdd6f4',
    fontSize: '11px',
    fontFamily: 'monospace',
  } as React.CSSProperties,

  filterRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  searchInput: {
    flex: 1,
    minWidth: '180px',
    padding: '10px 14px',
    backgroundColor: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: '8px',
    color: '#cdd6f4',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  } as React.CSSProperties,

  searchInputFocus: {
    borderColor: '#8b5cf6',
  } as React.CSSProperties,

  categoryTabs: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  categoryTab: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #313244',
    borderRadius: '6px',
    color: '#6c7086',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  categoryTabActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    color: '#fff',
  } as React.CSSProperties,

  categoryTabHover: {
    color: '#cdd6f4',
    borderColor: '#8b5cf6',
  } as React.CSSProperties,

  categorySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  } as React.CSSProperties,

  categoryHeader: {
    color: '#a6adc8',
    fontSize: '13px',
    fontWeight: 500,
    textTransform: 'capitalize',
    margin: 0,
    paddingBottom: '8px',
    borderBottom: '1px solid #313244',
  } as React.CSSProperties,

  loraGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
  } as React.CSSProperties,

  loraCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    backgroundColor: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,

  loraCardHover: {
    backgroundColor: '#262637',
    borderColor: '#45475a',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  } as React.CSSProperties,

  loraCardSelected: {
    backgroundColor: '#2d2b55',
    borderColor: '#8b5cf6',
    boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.3)',
  } as React.CSSProperties,

  loraPreview: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '10px',
    backgroundColor: '#313244',
  } as React.CSSProperties,

  loraPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as React.CSSProperties,

  loraName: {
    margin: 0,
    color: '#cdd6f4',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
  } as React.CSSProperties,

  loraBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: '6px',
  } as React.CSSProperties,

  loraDescription: {
    margin: 0,
    color: '#6c7086',
    fontSize: '11px',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  } as React.CSSProperties,

  loraStrength: {
    margin: '6px 0 0 0',
    color: '#45475a',
    fontSize: '10px',
  } as React.CSSProperties,

  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6c7086',
  } as React.CSSProperties,

  emptyText: {
    margin: 0,
    fontSize: '14px',
  } as React.CSSProperties,

  clearButton: {
    marginTop: '12px',
    padding: '10px 20px',
    backgroundColor: '#8b5cf6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
};

const categoryColors: Record<string, string> = {
  style: '#8b5cf6',
  character: '#a6e3a1',
  concept: '#fab387',
  effect: '#f38ba8',
};

function getCategoryColor(category: string): string {
  return categoryColors[category] || '#8b5cf6';
}

// ============================================================================
// LoRACard Component
// ============================================================================

export function LoRACard({ lora, isSelected, onClick }: LoRACardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle: React.CSSProperties = {
    ...styles.loraCard,
    ...(isHovered && !isSelected ? styles.loraCardHover : {}),
    ...(isSelected ? styles.loraCardSelected : {}),
  };

  const defaultStrength = lora.defaultStrength ?? 0.8;

  return (
    <button
      type="button"
      onClick={onClick}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-pressed={isSelected}
      data-testid="lora-card"
      data-lora-id={lora.filename}
    >
      {/* Preview */}
      {lora.previewUrl && (
        <div style={styles.loraPreview}>
          <img
            src={lora.previewUrl}
            alt={`${lora.name} preview`}
            style={styles.loraPreviewImg}
          />
        </div>
      )}

      {/* Name */}
      <h4 style={styles.loraName}>{lora.name}</h4>

      {/* Category Badge */}
      <span
        style={{
          ...styles.loraBadge,
          backgroundColor: getCategoryColor(lora.category),
        }}
        data-testid="lora-category-badge"
      >
        {lora.category}
      </span>

      {/* Description */}
      {lora.description && (
        <p style={styles.loraDescription}>{lora.description}</p>
      )}

      {/* Default Strength */}
      <p style={styles.loraStrength}>
        Default: {(defaultStrength * 100).toFixed(0)}%
      </p>
    </button>
  );
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [removeHovered, setRemoveHovered] = useState(false);

  // Get all LoRAs as array
  const allLoras = useMemo(() => Object.values(LORA_CATALOG), []);

  // Filter LoRAs
  const filteredLoras = useMemo(() => {
    let result = allLoras;

    if (categoryFilter !== 'all') {
      result = result.filter((lora) => lora.category === categoryFilter);
    }

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

    return filteredLoras.reduce(
      (acc, lora) => {
        const cat = lora.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(lora);
        return acc;
      },
      {} as Record<string, LoraEntry[]>
    );
  }, [filteredLoras, categoryFilter]);

  // Get selected LoRA details
  const selectedLoraDetails = useMemo(() => {
    if (!selectedLora) return null;
    const filename = selectedLora.id || selectedLora.path;
    return filename ? getLora(filename) ?? null : null;
  }, [selectedLora]);

  // Handlers
  const handleSelectLora = useCallback(
    (lora: LoraEntry) => {
      const strength = lora.defaultStrength ?? 0.8;
      setLocalStrength(strength);
      onSelect(lora.filename, strength);
    },
    [onSelect]
  );

  const handleStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setLocalStrength(value);
    },
    []
  );

  const handleStrengthCommit = useCallback(() => {
    onStrengthChange(localStrength);
  }, [localStrength, onStrengthChange]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleCategoryChange = useCallback((category: LoraCategory) => {
    setCategoryFilter(category);
  }, []);

  // Sync local strength with prop
  React.useEffect(() => {
    if (selectedLora) {
      setLocalStrength(selectedLora.strength);
    }
  }, [selectedLora]);

  return (
    <div style={styles.container} data-testid="lora-browser">
      {/* Selected LoRA Display */}
      {selectedLora && selectedLoraDetails && (
        <div style={styles.selectedDisplay} data-testid="selected-lora-display">
          <div style={styles.selectedHeader}>
            <div>
              <h4 style={styles.selectedTitle}>{selectedLoraDetails.name}</h4>
              <span
                style={{
                  ...styles.loraBadge,
                  backgroundColor: getCategoryColor(selectedLoraDetails.category),
                  marginTop: '6px',
                }}
              >
                {selectedLoraDetails.category}
              </span>
            </div>
            <button
              type="button"
              onClick={onRemove}
              style={{
                ...styles.removeButton,
                ...(removeHovered ? styles.removeButtonHover : {}),
              }}
              onMouseEnter={() => setRemoveHovered(true)}
              onMouseLeave={() => setRemoveHovered(false)}
              data-testid="remove-lora-button"
            >
              Remove
            </button>
          </div>

          {/* Strength Slider */}
          <div>
            <label htmlFor="lora-strength" style={styles.strengthLabel}>
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
              style={styles.strengthSlider}
              data-testid="lora-strength-slider"
            />
          </div>

          {/* Trigger Words */}
          {selectedLoraDetails.triggerWords &&
            selectedLoraDetails.triggerWords.length > 0 && (
              <div style={styles.triggerSection}>
                <p style={styles.triggerLabel}>Trigger words:</p>
                <div style={styles.triggerContainer}>
                  {selectedLoraDetails.triggerWords.map((word, index) => (
                    <span key={index} style={styles.triggerWord}>
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Search & Filter */}
      <div style={styles.filterRow}>
        <input
          type="search"
          placeholder="Search LoRAs..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            ...styles.searchInput,
            ...(searchFocused ? styles.searchInputFocus : {}),
          }}
          aria-label="Search LoRAs"
          data-testid="lora-search-input"
        />

        <div
          style={styles.categoryTabs}
          role="tablist"
          aria-label="Filter by category"
        >
          {(['all', 'style', 'character', 'concept', 'effect'] as LoraCategory[]).map(
            (cat) => {
              const isActive = categoryFilter === cat;
              const isHovered = hoveredTab === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleCategoryChange(cat)}
                  onMouseEnter={() => setHoveredTab(cat)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    ...styles.categoryTab,
                    ...(isActive ? styles.categoryTabActive : {}),
                    ...(isHovered && !isActive ? styles.categoryTabHover : {}),
                  }}
                  data-testid={`category-filter-${cat}`}
                >
                  {cat}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* LoRA Grid */}
      {filteredLoras.length > 0 ? (
        <div style={styles.categorySection}>
          {Object.entries(groupedLoras).map(([category, loras]) => (
            <div key={category} data-testid={`lora-category-${category}`}>
              {categoryFilter === 'all' && (
                <h3 style={styles.categoryHeader}>
                  {category} ({loras.length})
                </h3>
              )}
              <div
                style={styles.loraGrid}
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
        <div style={styles.emptyState} data-testid="no-loras-found">
          <p style={styles.emptyText}>No LoRAs found matching your search.</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={styles.clearButton}
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
