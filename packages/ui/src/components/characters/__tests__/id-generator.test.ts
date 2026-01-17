/**
 * ID Generator Tests
 * 
 * Testing the injectable ID generation system.
 * The Ruthless Reviewer demands testable, pure functions! 🔥
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  defaultIdGenerator,
  createTestIdGenerator,
  createFixedIdGenerator,
  getIdGenerator,
  setIdGenerator,
  resetIdGenerator,
  generateCharacterId,
  generateReferenceId,
} from '../id-generator';

// ============================================================================
// Default Generator Tests
// ============================================================================

describe('defaultIdGenerator', () => {
  it('should generate character IDs with correct prefix', () => {
    const id = defaultIdGenerator.characterId();
    expect(id).toMatch(/^char_\d+_[a-z0-9]+$/);
  });

  it('should generate reference IDs with correct prefix', () => {
    const id = defaultIdGenerator.referenceId();
    expect(id).toMatch(/^ref_\d+_[a-z0-9]+$/);
  });

  it('should generate unique character IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(defaultIdGenerator.characterId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate unique reference IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(defaultIdGenerator.referenceId());
    }
    expect(ids.size).toBe(100);
  });

  it('should include timestamp in character ID', () => {
    const before = Date.now();
    const id = defaultIdGenerator.characterId();
    const after = Date.now();
    
    const timestampPart = parseInt(id.split('_')[1], 10);
    expect(timestampPart).toBeGreaterThanOrEqual(before);
    expect(timestampPart).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// Test Generator Tests
// ============================================================================

describe('createTestIdGenerator', () => {
  it('should generate sequential character IDs', () => {
    const generator = createTestIdGenerator();
    
    expect(generator.characterId()).toBe('test_char_1');
    expect(generator.characterId()).toBe('test_char_2');
    expect(generator.characterId()).toBe('test_char_3');
  });

  it('should generate sequential reference IDs', () => {
    const generator = createTestIdGenerator();
    
    expect(generator.referenceId()).toBe('test_ref_1');
    expect(generator.referenceId()).toBe('test_ref_2');
    expect(generator.referenceId()).toBe('test_ref_3');
  });

  it('should use custom prefix', () => {
    const generator = createTestIdGenerator('mytest');
    
    expect(generator.characterId()).toBe('mytest_char_1');
    expect(generator.referenceId()).toBe('mytest_ref_1');
  });

  it('should maintain separate counters for characters and references', () => {
    const generator = createTestIdGenerator();
    
    expect(generator.characterId()).toBe('test_char_1');
    expect(generator.referenceId()).toBe('test_ref_1');
    expect(generator.characterId()).toBe('test_char_2');
    expect(generator.referenceId()).toBe('test_ref_2');
  });

  it('should create independent generators', () => {
    const gen1 = createTestIdGenerator('gen1');
    const gen2 = createTestIdGenerator('gen2');
    
    expect(gen1.characterId()).toBe('gen1_char_1');
    expect(gen2.characterId()).toBe('gen2_char_1');
    expect(gen1.characterId()).toBe('gen1_char_2');
    expect(gen2.characterId()).toBe('gen2_char_2');
  });
});

// ============================================================================
// Fixed Generator Tests
// ============================================================================

describe('createFixedIdGenerator', () => {
  it('should always return the fixed character ID', () => {
    const generator = createFixedIdGenerator('fixed-char-id', 'fixed-ref-id');
    
    expect(generator.characterId()).toBe('fixed-char-id');
    expect(generator.characterId()).toBe('fixed-char-id');
    expect(generator.characterId()).toBe('fixed-char-id');
  });

  it('should always return the fixed reference ID', () => {
    const generator = createFixedIdGenerator('fixed-char-id', 'fixed-ref-id');
    
    expect(generator.referenceId()).toBe('fixed-ref-id');
    expect(generator.referenceId()).toBe('fixed-ref-id');
    expect(generator.referenceId()).toBe('fixed-ref-id');
  });
});

// ============================================================================
// Global Generator Management Tests
// ============================================================================

describe('Global ID Generator Management', () => {
  afterEach(() => {
    resetIdGenerator();
  });

  it('should use default generator initially', () => {
    const generator = getIdGenerator();
    const id = generator.characterId();
    expect(id).toMatch(/^char_\d+_[a-z0-9]+$/);
  });

  it('should allow setting a custom generator', () => {
    const testGen = createTestIdGenerator('custom');
    setIdGenerator(testGen);
    
    const generator = getIdGenerator();
    expect(generator.characterId()).toBe('custom_char_1');
  });

  it('should return cleanup function that restores previous generator', () => {
    const testGen = createTestIdGenerator('temp');
    const cleanup = setIdGenerator(testGen);
    
    expect(getIdGenerator().characterId()).toBe('temp_char_1');
    
    cleanup();
    
    // Should be back to default
    expect(getIdGenerator().characterId()).toMatch(/^char_\d+_[a-z0-9]+$/);
  });

  it('should reset to default generator', () => {
    setIdGenerator(createTestIdGenerator('custom'));
    expect(getIdGenerator().characterId()).toBe('custom_char_1');
    
    resetIdGenerator();
    
    expect(getIdGenerator().characterId()).toMatch(/^char_\d+_[a-z0-9]+$/);
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe('Convenience Functions', () => {
  afterEach(() => {
    resetIdGenerator();
  });

  it('generateCharacterId should use current generator', () => {
    setIdGenerator(createTestIdGenerator('conv'));
    
    expect(generateCharacterId()).toBe('conv_char_1');
    expect(generateCharacterId()).toBe('conv_char_2');
  });

  it('generateReferenceId should use current generator', () => {
    setIdGenerator(createTestIdGenerator('conv'));
    
    expect(generateReferenceId()).toBe('conv_ref_1');
    expect(generateReferenceId()).toBe('conv_ref_2');
  });

  it('should use default generator when not overridden', () => {
    expect(generateCharacterId()).toMatch(/^char_\d+_[a-z0-9]+$/);
    expect(generateReferenceId()).toMatch(/^ref_\d+_[a-z0-9]+$/);
  });
});

// ============================================================================
// Integration with Store Tests
// ============================================================================

describe('ID Generator Integration', () => {
  afterEach(() => {
    resetIdGenerator();
  });

  it('should allow deterministic testing of store operations', () => {
    // Set up deterministic IDs
    setIdGenerator(createTestIdGenerator('store'));
    
    // Now any store operation using generateCharacterId/generateReferenceId
    // will produce predictable IDs: store_char_1, store_char_2, etc.
    
    const id1 = generateCharacterId();
    const id2 = generateCharacterId();
    
    expect(id1).toBe('store_char_1');
    expect(id2).toBe('store_char_2');
  });

  it('should allow testing specific ID scenarios', () => {
    // For testing a specific duplicate scenario
    setIdGenerator(createFixedIdGenerator('dup-char-123', 'dup-ref-456'));
    
    expect(generateCharacterId()).toBe('dup-char-123');
    expect(generateReferenceId()).toBe('dup-ref-456');
  });
});
