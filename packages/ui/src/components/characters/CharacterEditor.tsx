/**
 * CharacterEditor Component
 * 
 * Modal/drawer for editing character details.
 * Handles name, species, description, color palette, prompt fragments, and LoRA.
 * 
 * ARRR! Time to wine and dine this component! 🍷🏴‍☠️
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '../../../styled-system/css';
import { Dialog } from '../ui';
import { useCharacterStore } from './store';
import { Character, LoraConfig, ReferenceImageType } from './types';
import { useColorPalette, usePromptFragments, useCharacterLoRA, useCreateCharacter, useUpdateCharacter } from './hooks';
import { ReferenceGallery } from './ReferenceGallery';
import { ColorPaletteDisplay } from './ColorPalette';
import { LoRABrowser } from './LoRABrowser';
import { MAX_COLOR_PALETTE_SIZE, MAX_PROMPT_FRAGMENTS, MAX_DESCRIPTION_LENGTH } from '../../constants';

// ============================================================================
// Types
// ============================================================================

export interface CharacterEditorProps {
  /** Character ID to edit (null for create mode) */
  characterId: string | null;
  /** Project ID for creating new characters */
  projectId: string;
  /** Called when editor should close */
  onClose: () => void;
  /** Called after successful save */
  onSave?: (character: Character) => void;
  /** Whether the editor is open */
  isOpen: boolean;
}

interface FormData {
  name: string;
  species: string;
  description: string;
}

interface FormErrors {
  name?: string;
  species?: string;
  description?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CharacterEditor({
  characterId,
  projectId,
  onClose,
  onSave,
  isOpen,
}: CharacterEditorProps) {
  const character = useCharacterStore((state) =>
    characterId ? state.characters.get(characterId) : null
  );
  const { createCharacter } = useCreateCharacter();
  const { updateCharacter } = useUpdateCharacter();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    species: '',
    description: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'references' | 'lora'>('details');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Hooks for sub-features
  const { addColor, removeColor } = useColorPalette(characterId || '');
  const { addFragment, removeFragment, generateFragments } = usePromptFragments(characterId || '');
  const { associateLora, removeLora, updateStrength } = useCharacterLoRA(characterId || '');

  // ============================================================================
  // Effects
  // ============================================================================

  // Sync form data with character
  useEffect(() => {
    if (character) {
      const profile = character.profile ?? {};
      const description =
        profile.description ||
        (Array.isArray((profile as { distinguishing?: string[] }).distinguishing)
          ? (profile as { distinguishing?: string[] }).distinguishing?.[0] ?? ''
          : '');
      setFormData({
        name: character.name,
        species: profile.species ?? '',
        description,
      });
      setIsDirty(false);
    } else {
      setFormData({ name: '', species: '', description: '' });
      setIsDirty(false);
    }
  }, [character, isOpen]);

  // Reset errors when form changes
  useEffect(() => {
    setErrors({});
  }, [formData]);

  // ============================================================================
  // Validation
  // ============================================================================

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (!formData.species.trim()) {
      newErrors.species = 'Species is required';
    } else if (formData.species.length > 50) {
      newErrors.species = 'Species must be 50 characters or less';
    }

    if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    // Guard against double-submission (idempotency)
    if (isSaving) return;
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (characterId && character) {
        // Update existing character
        const trimmedDescription = formData.description.trim();
        const updated = await updateCharacter(characterId, {
          name: formData.name.trim(),
          profile: {
            ...(character.profile ?? {}),
            species: formData.species.trim(),
            description: trimmedDescription || undefined,
            distinguishing: trimmedDescription ? [trimmedDescription] : [],
          } as any,
        });
        if (updated) {
          onSave?.(updated);
          setIsDirty(false);
          onClose();
        }
      } else if (projectId) {
        // Create new character - format data for API
        const newCharacter = await createCharacter({
          projectId,
          name: formData.name.trim(),
          profile: {
            species: formData.species.trim(),
            // description is stored in profile features for now
            ...(formData.description.trim() ? { distinguishing: [formData.description.trim()] } : {}),
          },
          promptFragments: {},
        } as any); // Cast to any since UI type differs from API
        if (newCharacter) {
          onSave?.(newCharacter);
          setIsDirty(false);
          onClose();
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, characterId, character, formData, validate, updateCharacter, createCharacter, projectId, onSave, onClose]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      // Show custom confirmation dialog instead of blocking window.confirm
      setShowConfirmClose(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

  const handleColorAdd = useCallback((color: string) => {
    if (characterId) {
      addColor(color);
    }
  }, [characterId, addColor]);

  const handleColorRemove = useCallback((color: string) => {
    if (characterId) {
      removeColor(color);
    }
  }, [characterId, removeColor]);

  const handleFragmentAdd = useCallback((fragment: string) => {
    if (characterId) {
      addFragment(fragment);
    }
  }, [characterId, addFragment]);

  const handleFragmentRemove = useCallback((fragment: string) => {
    if (characterId) {
      removeFragment(fragment);
    }
  }, [characterId, removeFragment]);

  const handleGenerateFragments = useCallback(() => {
    if (characterId) {
      generateFragments();
    }
  }, [characterId, generateFragments]);

  const handleLoraSelect = useCallback((loraId: string, strength: number) => {
    if (characterId) {
      associateLora(loraId, strength);
    }
  }, [characterId, associateLora]);

  const handleLoraRemove = useCallback(() => {
    if (characterId) {
      removeLora();
    }
  }, [characterId, removeLora]);

  const handleLoraStrengthChange = useCallback((strength: number) => {
    if (characterId) {
      updateStrength(strength);
    }
  }, [characterId, updateStrength]);

  // ============================================================================
  // Render
  // ============================================================================

  if (!isOpen) return null;

  const isCreateMode = !characterId;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      role="dialog"
      ariaLabelledby="editor-title"
      overlayTestId="character-editor-overlay"
      zIndex={1000}
    >
      <div
        className={css({
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        })}
        style={{
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        data-testid="character-editor"
      >
        {/* Header */}
        <header
          className={css({
            padding: '16px 24px',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#111827',
          })}
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#111827',
          }}
        >
          <div>
            <h2 id="editor-title" className={css({ margin: 0, color: '#fff', fontSize: '1.5rem' })}>
              {isCreateMode ? 'Create Character' : `Edit: ${character?.name}`}
            </h2>
            {isCreateMode && (
              <p
                className={css({
                  margin: '6px 0 0 0',
                  fontSize: '0.85rem',
                  color: '#9ca3af',
                })}
              >
                Start with the basics. You can add references and LoRA later.
              </p>
            )}
          </div>
          <button
            onClick={handleCancel}
            className={css({
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '4px',
              _hover: { color: '#fff' },
            })}
            aria-label="Close editor"
            data-testid="close-editor-button"
          >
            ×
          </button>
        </header>

        {/* Tabs (only show for edit mode) */}
        {!isCreateMode && (
          <nav
            className={css({
              display: 'flex',
              borderBottom: '1px solid #333',
              padding: '0 24px',
            })}
            role="tablist"
            aria-label="Editor sections"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'details'}
              aria-controls="panel-details"
              onClick={() => setActiveTab('details')}
              className={css({
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: activeTab === 'details' ? '#fff' : '#888',
                cursor: 'pointer',
                borderBottom: activeTab === 'details' ? '2px solid #6366f1' : '2px solid transparent',
                _hover: { color: '#fff' },
              })}
              data-testid="tab-details"
            >
              Details
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'references'}
              aria-controls="panel-references"
              onClick={() => setActiveTab('references')}
              className={css({
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: activeTab === 'references' ? '#fff' : '#888',
                cursor: 'pointer',
                borderBottom: activeTab === 'references' ? '2px solid #6366f1' : '2px solid transparent',
                _hover: { color: '#fff' },
              })}
              data-testid="tab-references"
            >
              References ({character?.referenceImages.length || 0})
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'lora'}
              aria-controls="panel-lora"
              onClick={() => setActiveTab('lora')}
              className={css({
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: activeTab === 'lora' ? '#fff' : '#888',
                cursor: 'pointer',
                borderBottom: activeTab === 'lora' ? '2px solid #6366f1' : '2px solid transparent',
                _hover: { color: '#fff' },
              })}
              data-testid="tab-lora"
            >
              LoRA {character?.lora ? '✓' : ''}
            </button>
          </nav>
        )}

        {/* Content */}
        <div
          className={css({
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            backgroundColor: '#0f172a',
          })}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            backgroundColor: '#0f172a',
          }}
        >
          {/* Details Panel */}
          {(isCreateMode || activeTab === 'details') && (
            <div
              id="panel-details"
              role="tabpanel"
              aria-labelledby="tab-details"
              data-testid="panel-details"
            >
              <div
                className={css({
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '12px',
                  padding: '20px',
                })}
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
              {/* Name Field */}
              <div className={css({ marginBottom: '16px' })}>
                <label
                  htmlFor="character-name"
                  className={css({ display: 'block', color: '#cbd5f5', marginBottom: '8px', fontSize: '0.85rem' })}
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: '#cbd5f5',
                  }}
                >
                  Name *
                </label>
                <input
                  id="character-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={css({
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0b1020',
                    border: errors.name ? '1px solid #ef4444' : '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    _focus: { outline: 'none', borderColor: '#7c3aed', boxShadow: '0 0 0 2px rgba(124,58,237,0.2)' },
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0b1020',
                    border: errors.name ? '1px solid #ef4444' : '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: '1.2',
                  }}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  data-testid="character-name-input"
                />
                {errors.name && (
                  <p id="name-error" className={css({ color: '#ef4444', fontSize: '0.875rem', marginTop: '4px' })} data-testid="name-error">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Species Field */}
              <div className={css({ marginBottom: '16px' })}>
                <label
                  htmlFor="character-species"
                  className={css({ display: 'block', color: '#cbd5f5', marginBottom: '8px', fontSize: '0.85rem' })}
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: '#cbd5f5',
                  }}
                >
                  Species *
                </label>
                <input
                  id="character-species"
                  type="text"
                  value={formData.species}
                  onChange={(e) => handleChange('species', e.target.value)}
                  className={css({
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0b1020',
                    border: errors.species ? '1px solid #ef4444' : '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    _focus: { outline: 'none', borderColor: '#7c3aed', boxShadow: '0 0 0 2px rgba(124,58,237,0.2)' },
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0b1020',
                    border: errors.species ? '1px solid #ef4444' : '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: '1.2',
                  }}
                  aria-invalid={!!errors.species}
                  aria-describedby={errors.species ? 'species-error' : undefined}
                  data-testid="character-species-input"
                />
                {errors.species && (
                  <p id="species-error" className={css({ color: '#ef4444', fontSize: '0.875rem', marginTop: '4px' })} data-testid="species-error">
                    {errors.species}
                  </p>
                )}
              </div>

              {/* Description Field */}
              <div className={css({ marginBottom: '16px' })}>
                <label
                  htmlFor="character-description"
                  className={css({ display: 'block', color: '#cbd5f5', marginBottom: '8px', fontSize: '0.85rem' })}
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: '#cbd5f5',
                  }}
                >
                  Description
                </label>
                <textarea
                  id="character-description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className={css({
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0b1020',
                    border: errors.description ? '1px solid #ef4444' : '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    resize: 'vertical',
                    _focus: { outline: 'none', borderColor: '#7c3aed', boxShadow: '0 0 0 2px rgba(124,58,237,0.2)' },
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0b1020',
                    border: errors.description ? '1px solid #ef4444' : '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: '1.3',
                    resize: 'vertical',
                  }}
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'description-error' : 'description-hint'}
                  data-testid="character-description-input"
                />
                <p id="description-hint" className={css({ color: '#64748b', fontSize: '0.75rem', marginTop: '6px' })}>
                  {formData.description.length}/{MAX_DESCRIPTION_LENGTH} characters
                </p>
                {errors.description && (
                  <p id="description-error" className={css({ color: '#ef4444', fontSize: '0.875rem', marginTop: '4px' })} data-testid="description-error">
                    {errors.description}
                  </p>
                )}
              </div>
              </div>

              {/* Color Palette (only in edit mode) */}
              {!isCreateMode && character && (
                <div className={css({ marginBottom: '16px' })}>
                  <label className={css({ display: 'block', color: '#888', marginBottom: '8px' })}>
                    Color Palette ({character.colorPalette.length}/{MAX_COLOR_PALETTE_SIZE})
                  </label>
                  <ColorPaletteDisplay
                    colors={character.colorPalette}
                    onAddColor={handleColorAdd}
                    onRemoveColor={handleColorRemove}
                    maxColors={MAX_COLOR_PALETTE_SIZE}
                  />
                </div>
              )}

              {/* Prompt Fragments (only in edit mode) */}
              {!isCreateMode && character && (
                <div className={css({ marginBottom: '16px' })}>
                  <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' })}>
                    <label className={css({ color: '#888' })}>
                      Prompt Fragments ({character.promptFragments.length}/{MAX_PROMPT_FRAGMENTS})
                    </label>
                    <button
                      onClick={handleGenerateFragments}
                      className={css({
                        padding: '4px 12px',
                        backgroundColor: '#4f46e5',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        _hover: { backgroundColor: '#6366f1' },
                      })}
                      data-testid="generate-fragments-button"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px' })}>
                    {character.promptFragments.map((fragment, index) => (
                      <span
                        key={index}
                        className={css({
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          backgroundColor: '#2a2a4a',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '0.875rem',
                        })}
                        data-testid="prompt-fragment"
                      >
                        {fragment}
                        <button
                          onClick={() => handleFragmentRemove(fragment)}
                          className={css({
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '0 2px',
                            _hover: { color: '#ef4444' },
                          })}
                          aria-label={`Remove fragment: ${fragment}`}
                          data-testid="remove-fragment-button"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* References Panel */}
          {!isCreateMode && activeTab === 'references' && character && (
            <div
              id="panel-references"
              role="tabpanel"
              aria-labelledby="tab-references"
              data-testid="panel-references"
            >
              <ReferenceGallery characterId={characterId!} />
            </div>
          )}

          {/* LoRA Panel */}
          {!isCreateMode && activeTab === 'lora' && character && (
            <div
              id="panel-lora"
              role="tabpanel"
              aria-labelledby="tab-lora"
              data-testid="panel-lora"
            >
              <LoRABrowser
                selectedLora={character.lora}
                onSelect={handleLoraSelect}
                onRemove={handleLoraRemove}
                onStrengthChange={handleLoraStrengthChange}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className={css({
            padding: '16px 24px',
            borderTop: '1px solid #333',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: '#0b1020',
          })}
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #333',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: '#0b1020',
          }}
        >
          <button
            onClick={handleCancel}
            className={css({
              padding: '10px 18px',
              backgroundColor: 'transparent',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#cbd5e1',
              cursor: 'pointer',
              _hover: { backgroundColor: '#0f172a', color: '#fff' },
            })}
            data-testid="cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (!isDirty && !isCreateMode)}
            className={css({
              padding: '10px 20px',
              backgroundColor: '#7c3aed',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              _hover: { backgroundColor: '#8b5cf6' },
              _disabled: { opacity: 0.5, cursor: 'not-allowed' },
            })}
            data-testid="save-button"
          >
            {isSaving ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
          </button>
        </footer>
      </div>

      {/* Confirmation Dialog - Non-blocking replacement for window.confirm */}
      <Dialog
        isOpen={showConfirmClose}
        onClose={handleCancelClose}
        role="alertdialog"
        ariaLabelledby="confirm-close-title"
        ariaDescribedby="confirm-close-description"
        overlayTestId="confirm-close-dialog"
        zIndex={1100}
      >
        <div
          className={css({
            padding: '24px',
            maxWidth: '400px',
            border: '1px solid #ef4444',
          })}
        >
            <h3
              id="confirm-close-title"
              className={css({ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' })}
            >
              Unsaved Changes
            </h3>
            <p
              id="confirm-close-description"
              className={css({ color: '#888', marginBottom: '24px' })}
            >
              You have unsaved changes. Are you sure you want to close? Your changes will be lost.
            </p>
            <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: '12px' })}>
              <button
                onClick={handleCancelClose}
                className={css({
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer',
                  _hover: { backgroundColor: '#1a1a2e', color: '#fff' },
                })}
                data-testid="cancel-close-button"
              >
                Keep Editing
              </button>
              <button
                onClick={handleConfirmClose}
                className={css({
                  padding: '10px 20px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  _hover: { backgroundColor: '#dc2626' },
                })}
                data-testid="confirm-close-button"
              >
                Discard Changes
              </button>
            </div>
        </div>
      </Dialog>
    </Dialog>
  );
}

export default CharacterEditor;
