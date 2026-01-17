/**
 * ID Generator
 * 
 * Injectable ID generation for testability.
 * The Ruthless Reviewer demands pure functions!
 * 
 * ARRR! No more impure Math.random() scattered about! 🏴‍☠️
 */

// ============================================================================
// Interface
// ============================================================================

/**
 * Interface for ID generation - allows injection for testing
 */
export interface IdGenerator {
  /** Generate a unique character ID */
  characterId(): string;
  
  /** Generate a unique reference ID */
  referenceId(): string;
}

// ============================================================================
// Default Implementation (Production)
// ============================================================================

/**
 * Default ID generator using timestamp + random string
 * Used in production - NOT deterministic
 */
export const defaultIdGenerator: IdGenerator = {
  characterId(): string {
    return `char_${Date.now()}_${randomString(9)}`;
  },
  
  referenceId(): string {
    return `ref_${Date.now()}_${randomString(9)}`;
  },
};

function randomString(length: number): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// ============================================================================
// Test Implementation (Deterministic)
// ============================================================================

/**
 * Create a deterministic ID generator for testing
 * IDs are predictable and sequential
 */
export function createTestIdGenerator(prefix: string = 'test'): IdGenerator {
  let charCounter = 0;
  let refCounter = 0;
  
  return {
    characterId(): string {
      return `${prefix}_char_${++charCounter}`;
    },
    
    referenceId(): string {
      return `${prefix}_ref_${++refCounter}`;
    },
  };
}

/**
 * Create an ID generator with fixed IDs (for specific test scenarios)
 */
export function createFixedIdGenerator(charId: string, refId: string): IdGenerator {
  return {
    characterId: () => charId,
    referenceId: () => refId,
  };
}

// ============================================================================
// Global Instance (Swappable for Tests)
// ============================================================================

let _currentGenerator: IdGenerator = defaultIdGenerator;

/**
 * Get the current ID generator
 */
export function getIdGenerator(): IdGenerator {
  return _currentGenerator;
}

/**
 * Set the ID generator (for testing)
 * Returns a cleanup function to restore the default
 */
export function setIdGenerator(generator: IdGenerator): () => void {
  const previous = _currentGenerator;
  _currentGenerator = generator;
  return () => {
    _currentGenerator = previous;
  };
}

/**
 * Reset to default generator
 */
export function resetIdGenerator(): void {
  _currentGenerator = defaultIdGenerator;
}

// ============================================================================
// Convenience Functions (Use Current Generator)
// ============================================================================

/**
 * Generate a character ID using the current generator
 */
export function generateCharacterId(): string {
  return _currentGenerator.characterId();
}

/**
 * Generate a reference ID using the current generator
 */
export function generateReferenceId(): string {
  return _currentGenerator.referenceId();
}
