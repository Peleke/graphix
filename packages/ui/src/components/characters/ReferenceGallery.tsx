/**
 * ReferenceGallery Component
 *
 * Manages reference images for a character.
 * Supports upload, delete, and type marking.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCharacterStore } from './store';
import type { ReferenceImage, ReferenceImageType } from './types';
import { MAX_REFERENCE_IMAGES, MAX_FILE_SIZE_MB } from '../../constants';

// ============================================================================
// Blob URL Management (Memory Leak Prevention)
// ============================================================================

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
  characterId: string;
  readOnly?: boolean;
}

export interface ReferenceCardProps {
  reference: ReferenceImage;
  onTypeChange?: (type: ReferenceImageType) => void;
  onDelete?: () => void;
  onExtractColors?: () => void;
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
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,

  uploadZone: {
    border: '2px dashed #313244',
    borderRadius: '12px',
    padding: '28px',
    textAlign: 'center',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  } as React.CSSProperties,

  uploadZoneDragging: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  } as React.CSSProperties,

  uploadText: {
    color: '#a6adc8',
    marginBottom: '8px',
    margin: 0,
    fontSize: '14px',
  } as React.CSSProperties,

  uploadHint: {
    color: '#6c7086',
    fontSize: '12px',
    margin: 0,
  } as React.CSSProperties,

  errorBox: {
    padding: '12px 16px',
    backgroundColor: 'rgba(243, 139, 168, 0.1)',
    border: '1px solid rgba(243, 139, 168, 0.3)',
    borderRadius: '8px',
    color: '#f38ba8',
    fontSize: '13px',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '12px',
  } as React.CSSProperties,

  card: {
    position: 'relative',
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: '#1e1e2e',
    border: '1px solid #313244',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,

  cardHover: {
    transform: 'scale(1.02)',
    borderColor: '#45475a',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  } as React.CSSProperties,

  imageContainer: {
    aspectRatio: '1',
    backgroundColor: '#313244',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as React.CSSProperties,

  imageError: {
    color: '#6c7086',
    fontSize: '12px',
  } as React.CSSProperties,

  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '10px',
    transition: 'opacity 0.2s ease',
  } as React.CSSProperties,

  overlayHidden: {
    opacity: 0,
  } as React.CSSProperties,

  overlayVisible: {
    opacity: 1,
  } as React.CSSProperties,

  typeSelect: {
    width: '100%',
    padding: '6px 8px',
    backgroundColor: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: '6px',
    color: '#cdd6f4',
    fontSize: '11px',
    cursor: 'pointer',
    marginBottom: '8px',
    outline: 'none',
  } as React.CSSProperties,

  actionRow: {
    display: 'flex',
    gap: '6px',
  } as React.CSSProperties,

  colorsButton: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#8b5cf6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as React.CSSProperties,

  colorsButtonHover: {
    backgroundColor: '#9333ea',
  } as React.CSSProperties,

  deleteButton: {
    padding: '6px 10px',
    backgroundColor: 'rgba(243, 139, 168, 0.2)',
    border: '1px solid rgba(243, 139, 168, 0.3)',
    borderRadius: '6px',
    color: '#f38ba8',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  deleteButtonHover: {
    backgroundColor: 'rgba(243, 139, 168, 0.35)',
    borderColor: '#f38ba8',
  } as React.CSSProperties,

  typeBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '3px 8px',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: '4px',
    color: '#cdd6f4',
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'capitalize',
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

  emptyHint: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#45475a',
  } as React.CSSProperties,

  limitWarning: {
    color: '#fab387',
    fontSize: '12px',
    textAlign: 'center',
    padding: '8px',
    backgroundColor: 'rgba(250, 179, 135, 0.1)',
    borderRadius: '6px',
  } as React.CSSProperties,
};

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
  const [colorsHovered, setColorsHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onTypeChange?.(e.target.value as ReferenceImageType);
    },
    [onTypeChange]
  );

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    ...(isHovered ? styles.cardHover : {}),
  };

  const overlayStyle: React.CSSProperties = {
    ...styles.overlay,
    ...(isHovered || !readOnly ? styles.overlayVisible : styles.overlayHidden),
    opacity: isHovered ? 1 : 0.5,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="reference-card"
    >
      {/* Image */}
      <div style={styles.imageContainer}>
        {imageError ? (
          <span style={styles.imageError}>Failed to load</span>
        ) : (
          <img
            src={reference.thumbnailUrl || reference.url}
            alt={`${reference.type} reference`}
            style={styles.image}
            onError={() => setImageError(true)}
            data-testid="reference-image"
          />
        )}
      </div>

      {/* Overlay */}
      {(isHovered || !readOnly) && (
        <div style={overlayStyle} data-testid="reference-overlay">
          {/* Type Selector */}
          {!readOnly && onTypeChange && (
            <select
              value={reference.type}
              onChange={handleTypeChange}
              style={styles.typeSelect}
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
            <div style={styles.actionRow}>
              {onExtractColors && (
                <button
                  type="button"
                  onClick={onExtractColors}
                  style={{
                    ...styles.colorsButton,
                    ...(colorsHovered ? styles.colorsButtonHover : {}),
                  }}
                  onMouseEnter={() => setColorsHovered(true)}
                  onMouseLeave={() => setColorsHovered(false)}
                  data-testid="extract-colors-button"
                >
                  Extract Colors
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  style={{
                    ...styles.deleteButton,
                    ...(deleteHovered ? styles.deleteButtonHover : {}),
                  }}
                  onMouseEnter={() => setDeleteHovered(true)}
                  onMouseLeave={() => setDeleteHovered(false)}
                  aria-label="Delete reference"
                  data-testid="delete-reference-button"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Type Badge */}
      <div style={styles.typeBadge} data-testid="reference-type-badge">
        {reference.type.replace('_', ' ')}
      </div>
    </div>
  );
}

// ============================================================================
// ReferenceGallery Component
// ============================================================================

export function ReferenceGallery({ characterId, readOnly = false }: ReferenceGalleryProps) {
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

  // Blob URL Cleanup
  useEffect(() => {
    return () => {
      revokeAllTrackedBlobUrls();
    };
  }, []);

  // File Handling
  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please use JPEG, PNG, GIF, or WebP.';
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`;
    }
    return null;
  }, []);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
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

          const url = URL.createObjectURL(file);
          trackBlobUrl(url);

          addReference(characterId, {
            type: 'face',
            url,
            thumbnailUrl: url,
          });
        }
      } finally {
        setIsUploading(false);
      }
    },
    [characterId, references.length, validateFile, addReference]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileUpload(e.target.files);
      e.target.value = '';
    },
    [handleFileUpload]
  );

  // Drag & Drop
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  // Actions
  const handleTypeChange = useCallback(
    (refId: string, type: ReferenceImageType) => {
      updateReferenceType(characterId, refId, type);
    },
    [characterId, updateReferenceType]
  );

  const handleDelete = useCallback(
    (refId: string) => {
      const refToDelete = references.find((r) => r.id === refId);
      if (refToDelete) {
        revokeBlobUrl(refToDelete.url);
        if (refToDelete.thumbnailUrl) {
          revokeBlobUrl(refToDelete.thumbnailUrl);
        }
      }
      removeReference(characterId, refId);
    },
    [characterId, removeReference, references]
  );

  const handleExtractColors = useCallback(
    (refId: string) => {
      extractColorPalette(characterId, refId);
    },
    [characterId, extractColorPalette]
  );

  const uploadZoneStyle: React.CSSProperties = {
    ...styles.uploadZone,
    ...(isDragging ? styles.uploadZoneDragging : {}),
  };

  return (
    <div style={styles.container} data-testid="reference-gallery">
      {/* Upload Zone */}
      {canAddMore && (
        <div
          style={uploadZoneStyle}
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
            style={{ display: 'none' }}
            data-testid="file-input"
          />
          <p style={styles.uploadText}>
            {isUploading
              ? 'Uploading...'
              : isDragging
                ? 'Drop images here'
                : 'Drag & drop images or click to upload'}
          </p>
          <p style={styles.uploadHint}>
            JPEG, PNG, GIF, or WebP | Max {MAX_FILE_SIZE_MB}MB |{' '}
            {references.length}/{MAX_REFERENCE_IMAGES} refs
          </p>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div style={styles.errorBox} role="alert" data-testid="upload-error">
          {uploadError}
        </div>
      )}

      {/* Reference Grid */}
      {references.length > 0 ? (
        <div style={styles.grid} role="list" aria-label="Reference images" data-testid="reference-grid">
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
        <div style={styles.emptyState} data-testid="empty-gallery">
          <p style={styles.emptyText}>No reference images yet</p>
          {canAddMore && (
            <p style={styles.emptyHint}>Upload some to help with character consistency</p>
          )}
        </div>
      )}

      {/* Limit Warning */}
      {references.length >= MAX_REFERENCE_IMAGES && !readOnly && (
        <p style={styles.limitWarning} role="alert" data-testid="reference-limit-warning">
          Maximum of {MAX_REFERENCE_IMAGES} references reached
        </p>
      )}
    </div>
  );
}

export default ReferenceGallery;
