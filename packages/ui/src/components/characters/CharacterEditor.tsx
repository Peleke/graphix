/**
 * CharacterEditor Component
 *
 * Modal for editing character details.
 * Handles name, species, description, color palette, prompt fragments, and LoRA.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Dialog } from '../ui';
import { useCharacterStore } from './store';
import { Character } from './types';
import { useColorPalette, usePromptFragments, useCharacterLoRA, useCreateCharacter, useUpdateCharacter } from './hooks';
import { ReferenceGallery } from './ReferenceGallery';
import { ColorPaletteDisplay } from './ColorPalette';
import { LoRABrowser } from './LoRABrowser';
import { MAX_COLOR_PALETTE_SIZE, MAX_PROMPT_FRAGMENTS, MAX_DESCRIPTION_LENGTH } from '../../constants';

// ============================================================================
// Types
// ============================================================================

export interface CharacterEditorProps {
  characterId: string | null;
  projectId: string;
  onClose: () => void;
  onSave?: (character: Character) => void;
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
// Styles
// ============================================================================

const styles = {
  container: {
    width: '90%',
    maxWidth: '600px',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e1e2e',
    borderRadius: '16px',
    border: '1px solid #313244',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  } as React.CSSProperties,

  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #313244',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(180deg, #262637 0%, #1e1e2e 100%)',
  } as React.CSSProperties,

  title: {
    margin: 0,
    color: '#cdd6f4',
    fontSize: '1.25rem',
    fontWeight: 600,
  } as React.CSSProperties,

  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '0.8rem',
    color: '#6c7086',
  } as React.CSSProperties,

  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#313244',
    border: 'none',
    color: '#a6adc8',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  tabs: {
    display: 'flex',
    borderBottom: '1px solid #313244',
    padding: '0 24px',
    backgroundColor: '#1e1e2e',
    gap: '4px',
  } as React.CSSProperties,

  tab: {
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    color: '#6c7086',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s ease',
    marginBottom: '-1px',
  } as React.CSSProperties,

  tabActive: {
    color: '#cdd6f4',
    borderBottom: '2px solid #8b5cf6',
  } as React.CSSProperties,

  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
    backgroundColor: '#181825',
  } as React.CSSProperties,

  card: {
    backgroundColor: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  } as React.CSSProperties,

  fieldGroup: {
    marginBottom: '20px',
  } as React.CSSProperties,

  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.03em',
    color: '#a6adc8',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: '#11111b',
    border: '1px solid #313244',
    borderRadius: '8px',
    color: '#cdd6f4',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  } as React.CSSProperties,

  inputError: {
    borderColor: '#f38ba8',
  } as React.CSSProperties,

  inputFocus: {
    borderColor: '#8b5cf6',
    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.15)',
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: '#11111b',
    border: '1px solid #313244',
    borderRadius: '8px',
    color: '#cdd6f4',
    fontSize: '0.95rem',
    lineHeight: 1.5,
    resize: 'vertical',
    minHeight: '100px',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  } as React.CSSProperties,

  hint: {
    marginTop: '6px',
    fontSize: '0.75rem',
    color: '#6c7086',
  } as React.CSSProperties,

  error: {
    marginTop: '6px',
    fontSize: '0.8rem',
    color: '#f38ba8',
  } as React.CSSProperties,

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#a6adc8',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  } as React.CSSProperties,

  generateButton: {
    padding: '6px 12px',
    backgroundColor: '#8b5cf6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as React.CSSProperties,

  fragmentList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  } as React.CSSProperties,

  fragment: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    backgroundColor: '#313244',
    borderRadius: '6px',
    color: '#cdd6f4',
    fontSize: '0.85rem',
  } as React.CSSProperties,

  fragmentRemove: {
    background: 'none',
    border: 'none',
    color: '#6c7086',
    cursor: 'pointer',
    padding: '0 2px',
    fontSize: '14px',
    lineHeight: 1,
  } as React.CSSProperties,

  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #313244',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#1e1e2e',
  } as React.CSSProperties,

  cancelButton: {
    padding: '10px 18px',
    backgroundColor: 'transparent',
    border: '1px solid #313244',
    borderRadius: '8px',
    color: '#a6adc8',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#8b5cf6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  saveButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  confirmDialog: {
    padding: '24px',
    maxWidth: '400px',
    backgroundColor: '#1e1e2e',
    borderRadius: '12px',
    border: '1px solid #f38ba8',
  } as React.CSSProperties,

  confirmTitle: {
    color: '#cdd6f4',
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '12px',
  } as React.CSSProperties,

  confirmText: {
    color: '#a6adc8',
    fontSize: '0.9rem',
    marginBottom: '20px',
    lineHeight: 1.5,
  } as React.CSSProperties,

  confirmButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  } as React.CSSProperties,

  discardButton: {
    padding: '10px 18px',
    backgroundColor: '#f38ba8',
    border: 'none',
    borderRadius: '8px',
    color: '#11111b',
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,
};

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
  const safePromptFragments = Array.isArray(character?.promptFragments)
    ? character.promptFragments
    : [];
  const safeColorPalette = Array.isArray(character?.colorPalette)
    ? character.colorPalette
    : [];
  const { createCharacter } = useCreateCharacter();
  const { updateCharacter } = useUpdateCharacter();

  const [formData, setFormData] = useState<FormData>({ name: '', species: '', description: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'references' | 'lora'>('details');
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { addColor, removeColor } = useColorPalette(characterId || '');
  const { addFragment, removeFragment, generateFragments } = usePromptFragments(characterId || '');
  const { associateLora, removeLora, updateStrength } = useCharacterLoRA(characterId || '');

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

  useEffect(() => {
    setErrors({});
  }, [formData]);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    else if (formData.name.length > 100) newErrors.name = 'Name must be 100 characters or less';
    if (!formData.species.trim()) newErrors.species = 'Species is required';
    else if (formData.species.length > 50) newErrors.species = 'Species must be 50 characters or less';
    if (formData.description.length > MAX_DESCRIPTION_LENGTH)
      newErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (characterId && character) {
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
        const newCharacter = await createCharacter({
          projectId,
          name: formData.name.trim(),
          profile: {
            species: formData.species.trim(),
            ...(formData.description.trim() ? { distinguishing: [formData.description.trim()] } : {}),
          },
          promptFragments: {},
        } as any);
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
    if (characterId) addColor(color);
  }, [characterId, addColor]);

  const handleColorRemove = useCallback((color: string) => {
    if (characterId) removeColor(color);
  }, [characterId, removeColor]);

  const handleFragmentRemove = useCallback((fragment: string) => {
    if (characterId) removeFragment(fragment);
  }, [characterId, removeFragment]);

  const handleGenerateFragments = useCallback(() => {
    if (characterId) generateFragments();
  }, [characterId, generateFragments]);

  const handleLoraSelect = useCallback((loraId: string, strength: number) => {
    if (characterId) associateLora(loraId, strength);
  }, [characterId, associateLora]);

  const handleLoraRemove = useCallback(() => {
    if (characterId) removeLora();
  }, [characterId, removeLora]);

  const handleLoraStrengthChange = useCallback((strength: number) => {
    if (characterId) updateStrength(strength);
  }, [characterId, updateStrength]);

  if (!isOpen) return null;

  const isCreateMode = !characterId;

  const getInputStyle = (field: string, hasError: boolean) => ({
    ...styles.input,
    ...(hasError ? styles.inputError : {}),
    ...(focusedField === field ? styles.inputFocus : {}),
  });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      role="dialog"
      ariaLabelledby="editor-title"
      overlayTestId="character-editor-overlay"
      zIndex={1000}
    >
      <div style={styles.container} data-testid="character-editor">
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h2 id="editor-title" style={styles.title}>
              {isCreateMode ? 'Create Character' : `Edit: ${character?.name}`}
            </h2>
            {isCreateMode && (
              <p style={styles.subtitle}>Start with the basics. You can add references and LoRA later.</p>
            )}
          </div>
          <button
            onClick={handleCancel}
            style={styles.closeButton}
            aria-label="Close editor"
            data-testid="close-editor-button"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#45475a';
              e.currentTarget.style.color = '#cdd6f4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#313244';
              e.currentTarget.style.color = '#a6adc8';
            }}
          >
            ×
          </button>
        </header>

        {/* Tabs (only in edit mode) */}
        {!isCreateMode && (
          <nav style={styles.tabs} role="tablist" aria-label="Editor sections">
            {(['details', 'references', 'lora'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.tabActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = '#a6adc8';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = '#6c7086';
                }}
                data-testid={`tab-${tab}`}
              >
                {tab === 'details' && 'Details'}
                {tab === 'references' && `References (${character?.referenceImages.length || 0})`}
                {tab === 'lora' && `LoRA ${character?.lora ? '✓' : ''}`}
              </button>
            ))}
          </nav>
        )}

        {/* Content */}
        <div style={styles.content}>
          {/* Details Panel */}
          {(isCreateMode || activeTab === 'details') && (
            <div id="panel-details" role="tabpanel" data-testid="panel-details">
              <div style={styles.card}>
                {/* Name Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="character-name" style={styles.label}>Name *</label>
                  <input
                    id="character-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    style={getInputStyle('name', !!errors.name)}
                    placeholder="Enter character name"
                    aria-invalid={!!errors.name}
                    data-testid="character-name-input"
                  />
                  {errors.name && <p style={styles.error}>{errors.name}</p>}
                </div>

                {/* Species Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="character-species" style={styles.label}>Species *</label>
                  <input
                    id="character-species"
                    type="text"
                    value={formData.species}
                    onChange={(e) => handleChange('species', e.target.value)}
                    onFocus={() => setFocusedField('species')}
                    onBlur={() => setFocusedField(null)}
                    style={getInputStyle('species', !!errors.species)}
                    placeholder="e.g., otter, fox, wolf"
                    aria-invalid={!!errors.species}
                    data-testid="character-species-input"
                  />
                  {errors.species && <p style={styles.error}>{errors.species}</p>}
                </div>

                {/* Description Field */}
                <div style={{ ...styles.fieldGroup, marginBottom: 0 }}>
                  <label htmlFor="character-description" style={styles.label}>Description</label>
                  <textarea
                    id="character-description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.textarea,
                      ...(errors.description ? styles.inputError : {}),
                      ...(focusedField === 'description' ? styles.inputFocus : {}),
                    }}
                    placeholder="Describe your character's appearance, personality, etc."
                    rows={4}
                    data-testid="character-description-input"
                  />
                  <p style={styles.hint}>{formData.description.length}/{MAX_DESCRIPTION_LENGTH} characters</p>
                  {errors.description && <p style={styles.error}>{errors.description}</p>}
                </div>
              </div>

              {/* Color Palette (edit mode only) */}
              {!isCreateMode && character && (
                <div style={styles.card}>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionTitle}>
                      Color Palette ({safeColorPalette.length}/{MAX_COLOR_PALETTE_SIZE})
                    </span>
                  </div>
                  <ColorPaletteDisplay
                    colors={safeColorPalette}
                    onAddColor={handleColorAdd}
                    onRemoveColor={handleColorRemove}
                    maxColors={MAX_COLOR_PALETTE_SIZE}
                  />
                </div>
              )}

              {/* Prompt Fragments (edit mode only) */}
              {!isCreateMode && character && (
                <div style={styles.card}>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionTitle}>
                      Prompt Fragments ({safePromptFragments.length}/{MAX_PROMPT_FRAGMENTS})
                    </span>
                    <button
                      onClick={handleGenerateFragments}
                      style={styles.generateButton}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a78bfa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                      data-testid="generate-fragments-button"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <div style={styles.fragmentList}>
                    {safePromptFragments.map((fragment, index) => (
                      <span key={index} style={styles.fragment} data-testid="prompt-fragment">
                        {fragment}
                        <button
                          onClick={() => handleFragmentRemove(fragment)}
                          style={styles.fragmentRemove}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#f38ba8'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6c7086'}
                          aria-label={`Remove fragment: ${fragment}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {safePromptFragments.length === 0 && (
                      <span style={{ color: '#6c7086', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        No fragments yet. Click Auto-Generate to create some.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* References Panel */}
          {!isCreateMode && activeTab === 'references' && character && (
            <div id="panel-references" role="tabpanel" data-testid="panel-references">
              <ReferenceGallery characterId={characterId!} />
            </div>
          )}

          {/* LoRA Panel */}
          {!isCreateMode && activeTab === 'lora' && character && (
            <div id="panel-lora" role="tabpanel" data-testid="panel-lora">
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
        <footer style={styles.footer}>
          <button
            onClick={handleCancel}
            style={styles.cancelButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#313244';
              e.currentTarget.style.color = '#cdd6f4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#a6adc8';
            }}
            data-testid="cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (!isDirty && !isCreateMode)}
            style={{
              ...styles.saveButton,
              ...((isSaving || (!isDirty && !isCreateMode)) ? styles.saveButtonDisabled : {}),
            }}
            onMouseEnter={(e) => {
              if (!isSaving && (isDirty || isCreateMode)) {
                e.currentTarget.style.backgroundColor = '#a78bfa';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8b5cf6';
            }}
            data-testid="save-button"
          >
            {isSaving ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
          </button>
        </footer>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={showConfirmClose}
        onClose={handleCancelClose}
        role="alertdialog"
        ariaLabelledby="confirm-close-title"
        overlayTestId="confirm-close-dialog"
        zIndex={1100}
      >
        <div style={styles.confirmDialog}>
          <h3 style={styles.confirmTitle}>Unsaved Changes</h3>
          <p style={styles.confirmText}>
            You have unsaved changes. Are you sure you want to close? Your changes will be lost.
          </p>
          <div style={styles.confirmButtons}>
            <button
              onClick={handleCancelClose}
              style={styles.cancelButton}
              data-testid="cancel-close-button"
            >
              Keep Editing
            </button>
            <button
              onClick={handleConfirmClose}
              style={styles.discardButton}
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
