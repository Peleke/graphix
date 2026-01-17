/**
 * ReferenceGallery Component
 * 
 * Grid display of reference images with upload and management.
 * Stub implementation for future development.
 */

import React from 'react';
import type { ReferenceGalleryProps } from './types';
import { css } from '../../../styled-system/css';

const styles = {
  container: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px',
  }),
  emptyState: css({
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '20px',
    color: 'slate.500',
    fontSize: '13px',
  }),
};

export const ReferenceGallery: React.FC<ReferenceGalleryProps> = ({
  references,
  characterId,
  allowUpload = true,
  allowGenerate = false,
  onReferenceClick,
  onReferenceDelete,
  onReferenceTypeChange,
  onUpload,
  className,
}) => {
  return (
    <div className={`${styles.container} ${className || ''}`} data-testid="reference-gallery">
      {references.length === 0 ? (
        <div className={styles.emptyState}>
          No reference images yet
        </div>
      ) : (
        references.map((ref) => (
          <div key={ref.id} data-testid={`reference-${ref.id}`}>
            {/* Reference thumbnail - stub */}
          </div>
        ))
      )}
    </div>
  );
};
