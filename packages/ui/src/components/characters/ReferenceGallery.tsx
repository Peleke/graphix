/**
 * ReferenceGallery Component
 * 
 * Manages reference images for a character.
 * Supports upload, delete, and type marking.
 * 
 * ARRR! Every pirate needs reference for their wanted posters! 📸🏴‍☠️
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '../../../styled-system/css';
import { useCharacterStore } from './store';
import { ReferenceImage, ReferenceImageType } from './types';
import { MAX_REFERENCE_IMAGES, MAX_FILE_SIZE_MB } from '../../constants';

// ============================================================================
// Blob URL Management (Memory Leak Prevention)
// ============================================================================

/**
 * Track blob URLs we create so we can revoke them on cleanup.
 * This prevents memory leaks from orphaned blob URLs.
 */
const createdBlobUrls = new Set<string>();

function trackBlobUrl(url: string): void {
  if (url.startsWith('blob:')) {
    createdBlobUrls.add(url);
  }
}

function revokeBlobUrl(url: string): void {
  if (url.startsWith('blob:') && createdBlobUrls.has(url)) {
    URL.revokeObjectURL(url);
    createdBlobUrls.delete(url);
  }
}

function revokeAllTrackedBlobUrls(): void {
  createdBlobUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  createdBlobUrls.clear();
}

// ============================================================================
// Types
// ============================================================================

export interface ReferenceGalleryProps {
  /** Character ID */
  characterId: string;
  /** Whether gallery is read-only */
  readOnly?: boolean;
}

export interface ReferenceCardProps {
  /** Reference image data */
  reference: ReferenceImage;
  /** Called when type is changed */
  onTypeChange?: (type: ReferenceImageType) => void;
  /** Called when delete is clicked */
  onDelete?: () => void;
  /** Called when extract colors is clicked */
  onExtractColors?: () => void;
  /** Whether the card is read-only */
  readOnly?: boolean;
}

const REFERENCE_TYPES: { value: ReferenceImageType; label: string }[] = [
  { value: 'face', label: 'Face' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'expression', label: 'Expression' },
  { value: 'detail', label: 'Detail' },
  { value: 'pose', label: 'Pose' },
];

const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ============================================================================
// ReferenceCard Component
// ============================================================================

export function ReferenceCard({
  reference,
  onTypeChange,
  onDelete,
  onExtractColors,
  readOnly = false,
}: ReferenceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onTypeChange?.(e.target.value as ReferenceImageType);
  }, [onTypeChange]);

  return (
    <div
      className={css({
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
        border: '1px solid #333',
        transition: 'transform 0.2s ease',
        _hover: { transform: 'scale(1.02)' },
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="reference-card"
    >
      {/* Image */}
      <div
        className={css({
          aspectRatio: '1',
          backgroundColor: '#0f0f1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {imageError ? (
          <span className={css({ color: '#666', fontSize: '0.875rem' })}>
            Failed to load
          </span>
        ) : (
          <img
            src={reference.thumbnailUrl || reference.url}
            alt={`${reference.type} reference`}
            className={css({
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            })}
            onError={() => setImageError(true)}
            data-testid="reference-image"
          />
        )}
      </div>

      {/* Overlay (on hover or always on mobile) */}
      {(isHovered || !readOnly) && (
        <div
          className={css({
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '8px',
            opacity: isHovered ? 1 : 0.5,
            transition: 'opacity 0.2s ease',
          })}
          data-testid="reference-overlay"
        >
          {/* Type Selector */}
          {!readOnly && onTypeChange && (
            <select
              value={reference.type}
              onChange={handleTypeChange}
              className={css({
                width: '100%',
                padding: '6px',
                backgroundColor: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.75rem',
                cursor: 'pointer',
                marginBottom: '8px',
              })}
              aria-label="Reference type"
              data-testid="reference-type-select"
            >
              {REFERENCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          )}

          {/* Actions */}
          {!readOnly && (
            <div className={css({ display: 'flex', gap: '4px' })}>
              {onExtractColors && (
                <button
                  type="button"
                  onClick={onExtractColors}
                  className={css({
                    flex: 1,
                    padding: '6px',
                    backgroundColor: '#4f46e5',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    _hover: { backgroundColor: '#6366f1' },
                  })}
                  data-testid="extract-colors-button"
                >
                  🎨 Colors
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className={css({
                    padding: '6px 10px',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    _hover: { backgroundColor: '#dc2626' },
                  })}
                  aria-label="Delete reference"
                  data-testid="delete-reference-button"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Type Badge (always visible) */}
      <div
        className={css({
          position: 'absolute',
          top: '8px',
          left: '8px',
          padding: '2px 8px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.7rem',
          textTransform: 'capitalize',
        })}
        data-testid="reference-type-badge"
      >
        {reference.type.replace('_', ' ')}
      </div>
    </div>
  );
}

// ============================================================================
// ReferenceGallery Component
// ============================================================================

export function ReferenceGallery({
  characterId,
  readOnly = false,
}: ReferenceGalleryProps) {
  const character = useCharacterStore((state) => state.characters.get(characterId));
  const addReference = useCharacterStore((state) => state.addReferenceImage);
  const removeReference = useCharacterStore((state) => state.removeReferenceImage);
  const updateReferenceType = useCharacterStore((state) => state.updateReferenceType);
  const extractColorPalette = useCharacterStore((state) => state.extractColorPalette);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const references = character?.referenceImages || [];
  const canAddMore = references.length < MAX_REFERENCE_IMAGES && !readOnly;

  // ============================================================================
  // Blob URL Cleanup (Memory Leak Prevention)
  // ============================================================================

  /**
   * Clean up blob URLs when component unmounts.
   * This prevents memory leaks from orphaned blob URLs.
   * 
   * Note: We only revoke URLs we created (tracked in createdBlobUrls).
   * Server URLs are not affected.
   */
  useEffect(() => {
    return () => {
      // On unmount, revoke all blob URLs we created in this session
      revokeAllTrackedBlobUrls();
    };
  }, []);

  // ============================================================================
  // File Handling
  // ============================================================================

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please use JPEG, PNG, GIF, or WebP.';
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`;
    }
    return null;
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploadError(null);
    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (references.length >= MAX_REFERENCE_IMAGES) {
          setUploadError(`Maximum of ${MAX_REFERENCE_IMAGES} references allowed.`);
          break;
        }

        const error = validateFile(file);
        if (error) {
          setUploadError(error);
          continue;
        }

        // Create object URL for preview and track it for cleanup
        const url = URL.createObjectURL(file);
        trackBlobUrl(url);
        
        // Add reference (in real app, would upload to server first)
        addReference(characterId, {
          type: 'face', // Default type
          url,
          thumbnailUrl: url,
        });
      }
    } finally {
      setIsUploading(false);
    }
  }, [characterId, references.length, validateFile, addReference]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
    // Reset input value to allow re-uploading same file
    e.target.value = '';
  }, [handleFileUpload]);

  // ============================================================================
  // Drag & Drop
  // ============================================================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleTypeChange = useCallback((refId: string, type: ReferenceImageType) => {
    updateReferenceType(characterId, refId, type);
  }, [characterId, updateReferenceType]);

  const handleDelete = useCallback((refId: string) => {
    // Find the reference to revoke its blob URL before deletion
    const refToDelete = references.find((r) => r.id === refId);
    if (refToDelete) {
      revokeBlobUrl(refToDelete.url);
      if (refToDelete.thumbnailUrl) {
        revokeBlobUrl(refToDelete.thumbnailUrl);
      }
    }
    removeReference(characterId, refId);
  }, [characterId, removeReference, references]);

  const handleExtractColors = useCallback((refId: string) => {
    extractColorPalette(characterId, refId);
  }, [characterId, extractColorPalette]);

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
      data-testid="reference-gallery"
    >
      {/* Upload Zone */}
      {canAddMore && (
        <div
          className={css({
            border: isDragging ? '2px dashed #6366f1' : '2px dashed #333',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          })}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload reference images"
          data-testid="upload-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(',')}
            multiple
            onChange={handleInputChange}
            className={css({ display: 'none' })}
            data-testid="file-input"
          />
          <p className={css({ color: '#888', marginBottom: '8px' })}>
            {isUploading ? 'Uploading...' : isDragging ? 'Drop images here' : 'Drag & drop images or click to upload'}
          </p>
          <p className={css({ color: '#666', fontSize: '0.75rem' })}>
            JPEG, PNG, GIF, or WebP • Max {MAX_FILE_SIZE_MB}MB • {references.length}/{MAX_REFERENCE_IMAGES} references
          </p>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div
          className={css({
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '0.875rem',
          })}
          role="alert"
          data-testid="upload-error"
        >
          {uploadError}
        </div>
      )}

      {/* Reference Grid */}
      {references.length > 0 ? (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
          })}
          role="list"
          aria-label="Reference images"
          data-testid="reference-grid"
        >
          {references.map((ref) => (
            <div key={ref.id} role="listitem">
              <ReferenceCard
                reference={ref}
                onTypeChange={(type) => handleTypeChange(ref.id, type)}
                onDelete={() => handleDelete(ref.id)}
                onExtractColors={() => handleExtractColors(ref.id)}
                readOnly={readOnly}
              />
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
          data-testid="empty-gallery"
        >
          <p>No reference images yet.</p>
          {canAddMore && <p>Upload some to help with character consistency!</p>}
        </div>
      )}

      {/* Limit Warning */}
      {references.length >= MAX_REFERENCE_IMAGES && !readOnly && (
        <p
          className={css({
            color: '#f59e0b',
            fontSize: '0.75rem',
            textAlign: 'center',
          })}
          role="alert"
          data-testid="reference-limit-warning"
        >
          Maximum of {MAX_REFERENCE_IMAGES} references reached
        </p>
      )}
    </div>
  );
}

export default ReferenceGallery;
