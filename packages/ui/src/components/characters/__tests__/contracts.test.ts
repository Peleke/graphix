/**
 * Character API Contract Tests
 * 
 * These tests verify that our frontend expectations match the API contract.
 * The Test Terrorist demands API boundary testing! 🔥
 * 
 * Contract tests ensure:
 * 1. Request shapes match what the server expects
 * 2. Response shapes match what the frontend expects
 * 3. Error responses are handled correctly
 * 4. Edge cases at the API boundary are covered
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { Character, ReferenceImage, LoraConfig, ReferenceImageType } from '../types';

// ============================================================================
// API Contract Schemas (What the server expects/returns)
// ============================================================================

/**
 * These schemas define the contract between frontend and backend.
 * If the API changes, these schemas should be updated FIRST,
 * and tests will fail to alert us of breaking changes.
 */

// Request Schemas
const CreateCharacterRequestSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  species: z.string().min(1).max(50),
  description: z.string().max(1000).optional(),
  colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(5).optional(),
  promptFragments: z.array(z.string().max(200)).max(10).optional(),
});

const UpdateCharacterRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  species: z.string().min(1).max(50).optional(),
  description: z.string().max(1000).optional(),
  colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(5).optional(),
  promptFragments: z.array(z.string().max(200)).max(10).optional(),
  lora: z.object({
    id: z.string(),
    strength: z.number().min(0).max(1),
  }).nullable().optional(),
});

const AddReferenceRequestSchema = z.object({
  type: z.enum(['face', 'full_body', 'expression', 'detail', 'pose']),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});

// Response Schemas
const ReferenceImageResponseSchema = z.object({
  id: z.string(),
  characterId: z.string(),
  type: z.enum(['face', 'full_body', 'expression', 'detail', 'pose']),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});

const LoraConfigResponseSchema = z.object({
  id: z.string(),
  strength: z.number().min(0).max(1),
});

const CharacterResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  species: z.string(),
  description: z.string(),
  colorPalette: z.array(z.string()),
  promptFragments: z.array(z.string()),
  referenceImages: z.array(ReferenceImageResponseSchema),
  lora: LoraConfigResponseSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CharacterListResponseSchema = z.object({
  characters: z.array(CharacterResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

// ============================================================================
// Contract Test Helpers
// ============================================================================

function createValidCharacterRequest() {
  return {
    projectId: 'proj_123',
    name: 'Captain Whiskers',
    species: 'cat',
    description: 'A brave seafaring feline',
    colorPalette: ['#FF5733', '#33FF57'],
    promptFragments: ['orange tabby', 'wearing pirate hat'],
  };
}

function createValidCharacterResponse() {
  return {
    id: 'char_abc123',
    projectId: 'proj_123',
    name: 'Captain Whiskers',
    species: 'cat',
    description: 'A brave seafaring feline',
    colorPalette: ['#FF5733', '#33FF57'],
    promptFragments: ['orange tabby', 'wearing pirate hat'],
    referenceImages: [],
    lora: null,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };
}

function createValidReferenceResponse() {
  return {
    id: 'ref_xyz789',
    characterId: 'char_abc123',
    type: 'face' as const,
    url: 'https://example.com/images/ref1.png',
    thumbnailUrl: 'https://example.com/images/ref1_thumb.png',
    createdAt: '2024-01-15T11:00:00.000Z',
  };
}

// ============================================================================
// CREATE Character Contract Tests
// ============================================================================

describe('POST /api/characters - Create Character Contract', () => {
  describe('Request Schema Validation', () => {
    it('should accept valid create request', () => {
      const request = createValidCharacterRequest();
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should require projectId', () => {
      const request = { ...createValidCharacterRequest(), projectId: undefined };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should require non-empty projectId', () => {
      const request = { ...createValidCharacterRequest(), projectId: '' };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should require name', () => {
      const request = { ...createValidCharacterRequest(), name: undefined };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should require non-empty name', () => {
      const request = { ...createValidCharacterRequest(), name: '' };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const request = { ...createValidCharacterRequest(), name: 'x'.repeat(101) };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should require species', () => {
      const request = { ...createValidCharacterRequest(), species: undefined };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject species over 50 characters', () => {
      const request = { ...createValidCharacterRequest(), species: 'x'.repeat(51) };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should allow optional description', () => {
      const request = { ...createValidCharacterRequest(), description: undefined };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject description over 1000 characters', () => {
      const request = { ...createValidCharacterRequest(), description: 'x'.repeat(1001) };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should allow optional colorPalette', () => {
      const request = { ...createValidCharacterRequest(), colorPalette: undefined };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid hex colors in palette', () => {
      const request = { ...createValidCharacterRequest(), colorPalette: ['red', 'blue'] };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject palette with more than 5 colors', () => {
      const request = {
        ...createValidCharacterRequest(),
        colorPalette: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'],
      };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should accept valid hex colors (uppercase)', () => {
      const request = { ...createValidCharacterRequest(), colorPalette: ['#AABBCC'] };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid hex colors (lowercase)', () => {
      const request = { ...createValidCharacterRequest(), colorPalette: ['#aabbcc'] };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should allow optional promptFragments', () => {
      const request = { ...createValidCharacterRequest(), promptFragments: undefined };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject promptFragments with more than 10 items', () => {
      const request = {
        ...createValidCharacterRequest(),
        promptFragments: Array(11).fill('fragment'),
      };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject prompt fragment over 200 characters', () => {
      const request = {
        ...createValidCharacterRequest(),
        promptFragments: ['x'.repeat(201)],
      };
      const result = CreateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('Response Schema Validation', () => {
    it('should validate complete character response', () => {
      const response = createValidCharacterResponse();
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should require id in response', () => {
      const response = { ...createValidCharacterResponse(), id: undefined };
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require valid datetime for createdAt', () => {
      const response = { ...createValidCharacterResponse(), createdAt: 'not-a-date' };
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require valid datetime for updatedAt', () => {
      const response = { ...createValidCharacterResponse(), updatedAt: 'invalid' };
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should accept null lora', () => {
      const response = { ...createValidCharacterResponse(), lora: null };
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate lora object when present', () => {
      const response = {
        ...createValidCharacterResponse(),
        lora: { id: 'lora_123', strength: 0.8 },
      };
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject lora with strength > 1', () => {
      const response = {
        ...createValidCharacterResponse(),
        lora: { id: 'lora_123', strength: 1.5 },
      };
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject lora with strength < 0', () => {
      const response = {
        ...createValidCharacterResponse(),
        lora: { id: 'lora_123', strength: -0.1 },
      };
      const result = CharacterResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// UPDATE Character Contract Tests
// ============================================================================

describe('PUT /api/characters/:id - Update Character Contract', () => {
  describe('Request Schema Validation', () => {
    it('should accept partial update with only name', () => {
      const request = { name: 'New Name' };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only species', () => {
      const request = { species: 'dog' };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only description', () => {
      const request = { description: 'Updated description' };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only colorPalette', () => {
      const request = { colorPalette: ['#FF0000'] };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only promptFragments', () => {
      const request = { promptFragments: ['new fragment'] };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept setting lora to null', () => {
      const request = { lora: null };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept setting lora with valid config', () => {
      const request = { lora: { id: 'anime_v3', strength: 0.75 } };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject empty name in update', () => {
      const request = { name: '' };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should accept empty object (no-op update)', () => {
      const request = {};
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept full update with all fields', () => {
      const request = {
        name: 'Updated Name',
        species: 'dragon',
        description: 'A mighty dragon',
        colorPalette: ['#FF0000', '#00FF00'],
        promptFragments: ['scales', 'wings'],
        lora: { id: 'fantasy_v2', strength: 0.9 },
      };
      const result = UpdateCharacterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// GET Characters List Contract Tests
// ============================================================================

describe('GET /api/characters - List Characters Contract', () => {
  describe('Response Schema Validation', () => {
    it('should validate list response with characters', () => {
      const response = {
        characters: [createValidCharacterResponse()],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate empty list response', () => {
      const response = {
        characters: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should require total field', () => {
      const response = {
        characters: [],
        page: 1,
        pageSize: 20,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require page field', () => {
      const response = {
        characters: [],
        total: 0,
        pageSize: 20,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require pageSize field', () => {
      const response = {
        characters: [],
        total: 0,
        page: 1,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject negative total', () => {
      const response = {
        characters: [],
        total: -1,
        page: 1,
        pageSize: 20,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject page 0', () => {
      const response = {
        characters: [],
        total: 0,
        page: 0,
        pageSize: 20,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject pageSize 0', () => {
      const response = {
        characters: [],
        total: 0,
        page: 1,
        pageSize: 0,
      };
      const result = CharacterListResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Reference Image Contract Tests
// ============================================================================

describe('POST /api/characters/:id/references - Add Reference Contract', () => {
  describe('Request Schema Validation', () => {
    it('should accept valid reference request', () => {
      const request = {
        type: 'face',
        url: 'https://example.com/image.png',
      };
      const result = AddReferenceRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept all valid reference types', () => {
      const types: ReferenceImageType[] = ['face', 'full_body', 'expression', 'detail', 'pose'];
      for (const type of types) {
        const request = { type, url: 'https://example.com/image.png' };
        const result = AddReferenceRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid reference type', () => {
      const request = {
        type: 'invalid_type',
        url: 'https://example.com/image.png',
      };
      const result = AddReferenceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should require valid URL', () => {
      const request = {
        type: 'face',
        url: 'not-a-url',
      };
      const result = AddReferenceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should allow optional thumbnailUrl', () => {
      const request = {
        type: 'face',
        url: 'https://example.com/image.png',
        thumbnailUrl: undefined,
      };
      const result = AddReferenceRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should validate thumbnailUrl when provided', () => {
      const request = {
        type: 'face',
        url: 'https://example.com/image.png',
        thumbnailUrl: 'not-a-url',
      };
      const result = AddReferenceRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should accept valid thumbnailUrl', () => {
      const request = {
        type: 'face',
        url: 'https://example.com/image.png',
        thumbnailUrl: 'https://example.com/thumb.png',
      };
      const result = AddReferenceRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe('Response Schema Validation', () => {
    it('should validate reference response', () => {
      const response = createValidReferenceResponse();
      const result = ReferenceImageResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should require id in reference response', () => {
      const response = { ...createValidReferenceResponse(), id: undefined };
      const result = ReferenceImageResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require characterId in reference response', () => {
      const response = { ...createValidReferenceResponse(), characterId: undefined };
      const result = ReferenceImageResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require type in reference response', () => {
      const response = { ...createValidReferenceResponse(), type: undefined };
      const result = ReferenceImageResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require url in reference response', () => {
      const response = { ...createValidReferenceResponse(), url: undefined };
      const result = ReferenceImageResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should require createdAt in reference response', () => {
      const response = { ...createValidReferenceResponse(), createdAt: undefined };
      const result = ReferenceImageResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Error Response Contract Tests
// ============================================================================

describe('Error Response Contract', () => {
  it('should validate error response structure', () => {
    const response = {
      error: {
        code: 'NOT_FOUND',
        message: 'Character not found',
      },
    };
    const result = ErrorResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should allow optional details in error', () => {
    const response = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: {
          field: 'name',
          reason: 'too_long',
        },
      },
    };
    const result = ErrorResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should require error code', () => {
    const response = {
      error: {
        message: 'Something went wrong',
      },
    };
    const result = ErrorResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should require error message', () => {
    const response = {
      error: {
        code: 'INTERNAL_ERROR',
      },
    };
    const result = ErrorResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Frontend Type Compatibility Tests
// ============================================================================

describe('Frontend Type Compatibility', () => {
  it('should be able to transform API response to frontend Character type', () => {
    const apiResponse = createValidCharacterResponse();
    
    // Transform API response to frontend type
    const character: Character = {
      id: apiResponse.id,
      projectId: apiResponse.projectId,
      name: apiResponse.name,
      species: apiResponse.species,
      description: apiResponse.description,
      colorPalette: apiResponse.colorPalette,
      promptFragments: apiResponse.promptFragments,
      referenceImages: apiResponse.referenceImages.map(ref => ({
        id: ref.id,
        characterId: ref.characterId,
        type: ref.type as ReferenceImageType,
        url: ref.url,
        thumbnailUrl: ref.thumbnailUrl,
        createdAt: new Date(ref.createdAt),
      })),
      lora: apiResponse.lora,
      createdAt: new Date(apiResponse.createdAt),
      updatedAt: new Date(apiResponse.updatedAt),
    };

    expect(character.id).toBe(apiResponse.id);
    expect(character.name).toBe(apiResponse.name);
    expect(character.createdAt).toBeInstanceOf(Date);
  });

  it('should handle reference images in transformation', () => {
    const apiResponse = {
      ...createValidCharacterResponse(),
      referenceImages: [createValidReferenceResponse()],
    };

    const character: Character = {
      id: apiResponse.id,
      projectId: apiResponse.projectId,
      name: apiResponse.name,
      species: apiResponse.species,
      description: apiResponse.description,
      colorPalette: apiResponse.colorPalette,
      promptFragments: apiResponse.promptFragments,
      referenceImages: apiResponse.referenceImages.map(ref => ({
        id: ref.id,
        characterId: ref.characterId,
        type: ref.type as ReferenceImageType,
        url: ref.url,
        thumbnailUrl: ref.thumbnailUrl,
        createdAt: new Date(ref.createdAt),
      })),
      lora: apiResponse.lora,
      createdAt: new Date(apiResponse.createdAt),
      updatedAt: new Date(apiResponse.updatedAt),
    };

    expect(character.referenceImages).toHaveLength(1);
    expect(character.referenceImages[0].type).toBe('face');
    expect(character.referenceImages[0].createdAt).toBeInstanceOf(Date);
  });

  it('should handle lora config in transformation', () => {
    const apiResponse = {
      ...createValidCharacterResponse(),
      lora: { id: 'anime_v3', strength: 0.8 },
    };

    const character: Character = {
      ...apiResponse,
      referenceImages: [],
      createdAt: new Date(apiResponse.createdAt),
      updatedAt: new Date(apiResponse.updatedAt),
    };

    expect(character.lora).not.toBeNull();
    expect(character.lora?.id).toBe('anime_v3');
    expect(character.lora?.strength).toBe(0.8);
  });
});

// ============================================================================
// API Request Builder Tests
// ============================================================================

describe('API Request Builders', () => {
  /**
   * These tests verify that our frontend correctly builds API requests
   */

  it('should build valid create character request from form data', () => {
    const formData = {
      projectId: 'proj_abc',
      name: 'Test Character',
      species: 'human',
      description: 'A test character',
      colorPalette: ['#FF0000'],
      promptFragments: ['test'],
    };

    const request = {
      projectId: formData.projectId,
      name: formData.name.trim(),
      species: formData.species.trim(),
      description: formData.description?.trim() || undefined,
      colorPalette: formData.colorPalette.length > 0 ? formData.colorPalette : undefined,
      promptFragments: formData.promptFragments.length > 0 ? formData.promptFragments : undefined,
    };

    const result = CreateCharacterRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should sanitize whitespace in request fields', () => {
    const formData = {
      projectId: 'proj_abc',
      name: '  Whitespace Name  ',
      species: '  cat  ',
      description: '  Some description  ',
    };

    const request = {
      projectId: formData.projectId,
      name: formData.name.trim(),
      species: formData.species.trim(),
      description: formData.description.trim(),
    };

    expect(request.name).toBe('Whitespace Name');
    expect(request.species).toBe('cat');
    expect(request.description).toBe('Some description');

    const result = CreateCharacterRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should handle empty optional fields', () => {
    const formData = {
      projectId: 'proj_abc',
      name: 'Minimal Character',
      species: 'unknown',
      description: '',
      colorPalette: [],
      promptFragments: [],
    };

    const request = {
      projectId: formData.projectId,
      name: formData.name,
      species: formData.species,
      description: formData.description || undefined,
      colorPalette: formData.colorPalette.length > 0 ? formData.colorPalette : undefined,
      promptFragments: formData.promptFragments.length > 0 ? formData.promptFragments : undefined,
    };

    const result = CreateCharacterRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    expect(request.description).toBeUndefined();
    expect(request.colorPalette).toBeUndefined();
    expect(request.promptFragments).toBeUndefined();
  });
});

// ============================================================================
// API Response Parser Tests
// ============================================================================

describe('API Response Parsers', () => {
  /**
   * These tests verify that our frontend correctly parses API responses
   */

  it('should parse dates from ISO strings', () => {
    const apiResponse = createValidCharacterResponse();
    
    const createdAt = new Date(apiResponse.createdAt);
    const updatedAt = new Date(apiResponse.updatedAt);

    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAt).toBeInstanceOf(Date);
    expect(isNaN(createdAt.getTime())).toBe(false);
    expect(isNaN(updatedAt.getTime())).toBe(false);
  });

  it('should handle null lora gracefully', () => {
    const apiResponse = { ...createValidCharacterResponse(), lora: null };
    
    const lora = apiResponse.lora;
    expect(lora).toBeNull();
  });

  it('should parse reference image dates', () => {
    const refResponse = createValidReferenceResponse();
    
    const createdAt = new Date(refResponse.createdAt);
    expect(createdAt).toBeInstanceOf(Date);
    expect(isNaN(createdAt.getTime())).toBe(false);
  });

  it('should handle missing optional thumbnailUrl', () => {
    const refResponse = { ...createValidReferenceResponse(), thumbnailUrl: undefined };
    
    expect(refResponse.thumbnailUrl).toBeUndefined();
    
    // Should still be valid
    const result = ReferenceImageResponseSchema.safeParse(refResponse);
    expect(result.success).toBe(true);
  });
});
