/**
 * Character Routes
 *
 * REST API endpoints for character management.
 */

import { Hono } from "hono";
import {
  getCharacterService,
  processUpload,
  getCharacterUploadDir,
  UploadError,
} from "@graphix/core";
import { ApiError, errors, ErrorCodes } from "../errors/index.js";
import {
  validateBody,
  validateId,
  createCharacterSchema,
  updateCharacterSchema,
  addReferenceSchema,
  setLoraSchema,
} from "../validation/index.js";

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of reference images per character */
const MAX_REFERENCE_IMAGES = 10;

/** Maximum file size for uploads (50MB) */
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/** Allowed image MIME types */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const characterRoutes = new Hono();

// Get character by ID
characterRoutes.get("/:id", validateId(), async (c) => {
  const service = getCharacterService();
  const { id } = c.req.valid("param");
  const character = await service.getById(id);

  if (!character) {
    return errors.notFound(c, "Character", id);
  }

  return c.json(character);
});

// List characters by project
characterRoutes.get("/project/:projectId", async (c) => {
  const service = getCharacterService();
  const characters = await service.getByProject(c.req.param("projectId"));

  return c.json({ characters });
});

// Create character
characterRoutes.post("/", validateBody(createCharacterSchema), async (c) => {
  const service = getCharacterService();
  const body = c.req.valid("json");

  const character = await service.create({
    projectId: body.projectId,
    name: body.name,
    profile: body.profile,
    promptFragments: body.promptFragments,
    referenceImages: body.referenceImages,
  });

  return c.json(character, 201);
});

// Update character
characterRoutes.put(
  "/:id",
  validateId(),
  validateBody(updateCharacterSchema),
  async (c) => {
    const service = getCharacterService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const character = await service.update(id, {
      name: body.name,
      profile: body.profile,
      promptFragments: body.promptFragments,
    });

    return c.json(character);
  }
);

// Partial update character
characterRoutes.patch(
  "/:id",
  validateId(),
  validateBody(updateCharacterSchema),
  async (c) => {
    const service = getCharacterService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const character = await service.update(id, body);

    return c.json(character);
  }
);

// Add reference image (by path)
characterRoutes.post(
  "/:id/references",
  validateId(),
  validateBody(addReferenceSchema),
  async (c) => {
    const service = getCharacterService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const character = await service.addReference(id, body.imagePath);

    return c.json(character);
  }
);

// Upload reference image (multipart/form-data)
characterRoutes.post("/:id/references/upload", validateId(), async (c) => {
  const { id: characterId } = c.req.valid("param");
  const service = getCharacterService();

  // Verify character exists
  const character = await service.getById(characterId);
  if (!character) {
    return errors.notFound(c, "Character", characterId);
  }

  // Check reference image limit
  const currentCount = character.referenceImages?.length ?? 0;
  if (currentCount >= MAX_REFERENCE_IMAGES) {
    return errors.limitExceeded(c, "reference images", currentCount, MAX_REFERENCE_IMAGES);
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return errors.validation(c, "No image file provided. Use field name 'image'", {
      field: "image",
    });
  }

  // Validate content type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return errors.badRequest(
      c,
      `Invalid file type '${file.type}'. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      ErrorCodes.INVALID_FILE_TYPE
    );
  }

  // Validate size (early check before reading into memory)
  if (file.size > MAX_UPLOAD_SIZE) {
    const maxMB = Math.round(MAX_UPLOAD_SIZE / 1024 / 1024);
    const apiError = new ApiError(
      `File too large. Maximum size is ${maxMB}MB`,
      ErrorCodes.FILE_TOO_LARGE,
      { maxSize: MAX_UPLOAD_SIZE, fileSize: file.size }
    );
    throw apiError;
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Process upload (validates, saves, generates thumbnail)
  const destDir = getCharacterUploadDir(characterId);
  const result = await processUpload(buffer, file.name, file.type, {
    destDir,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxSize: MAX_UPLOAD_SIZE,
    generateThumbnail: true,
    thumbnailSize: { width: 256, height: 256 },
  });

  // Add to character's reference images
  await service.addReference(characterId, result.originalPath);

  return c.json(
    {
      originalPath: result.originalPath,
      thumbnailPath: result.thumbnailPath,
      filename: result.savedFilename,
      originalFilename: result.originalFilename,
      size: result.size,
      mimeType: result.mimeType,
      dimensions: result.dimensions,
    },
    201
  );
});

// Remove reference image
characterRoutes.delete(
  "/:id/references",
  validateId(),
  validateBody(addReferenceSchema),
  async (c) => {
    const service = getCharacterService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const character = await service.removeReference(id, body.imagePath);

    return c.json(character);
  }
);

// Set LoRA
characterRoutes.post(
  "/:id/lora",
  validateId(),
  validateBody(setLoraSchema),
  async (c) => {
    const service = getCharacterService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const character = await service.setLora(id, {
      path: body.path,
      strength: body.strength,
      strengthClip: body.strengthClip,
      trainingImages: body.trainingImages,
    });

    return c.json(character);
  }
);

// Clear LoRA
characterRoutes.delete("/:id/lora", validateId(), async (c) => {
  const service = getCharacterService();
  const { id } = c.req.valid("param");
  const character = await service.clearLora(id);

  return c.json(character);
});

// Delete character
characterRoutes.delete("/:id", validateId(), async (c) => {
  const service = getCharacterService();
  const { id } = c.req.valid("param");
  await service.delete(id);

  return c.body(null, 204);
});

export { characterRoutes };
