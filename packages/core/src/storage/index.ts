/**
 * Storage Module
 *
 * Unified access to storage providers.
 *
 * Environment Variables:
 * - STORAGE_PROVIDER: "local" | "supabase" | "gcp" | "s3" (default: "local")
 *
 * For Local:
 * - GRAPHIX_OUTPUT_DIR or STORAGE_LOCAL_PATH
 *
 * For Supabase:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 * - SUPABASE_BUCKET
 *
 * For GCP (future):
 * - GCP_PROJECT, GCP_BUCKET, GOOGLE_APPLICATION_CREDENTIALS
 *
 * For S3 (future):
 * - AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

export type {
  StorageProvider,
  StorageObject,
  UploadResult,
  HealthCheckResult,
  StorageProviderType,
  StorageConfig,
} from "./provider.js";

export { getStorageConfigFromEnv } from "./provider.js";
export { LocalStorageProvider } from "./local.js";
export type { LocalStorageConfig } from "./local.js";
export { SupabaseStorageProvider, SupabaseStorageError } from "./supabase.js";
export type { SupabaseStorageConfig } from "./supabase.js";

import type { StorageProvider, StorageConfig } from "./provider.js";
import { getStorageConfigFromEnv } from "./provider.js";
import { LocalStorageProvider } from "./local.js";
import { SupabaseStorageProvider } from "./supabase.js";
import { resolve } from "path";

let storageInstance: StorageProvider | null = null;

/**
 * Create storage provider from config
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "local":
      return new LocalStorageProvider({
        basePath: config.localBasePath || resolve(process.cwd(), "output"),
      });

    case "supabase":
      if (!config.supabaseUrl || !config.supabaseServiceKey) {
        throw new Error("Supabase storage requires SUPABASE_URL and SUPABASE_SERVICE_KEY");
      }
      return new SupabaseStorageProvider({
        url: config.supabaseUrl,
        serviceKey: config.supabaseServiceKey,
        bucket: config.supabaseBucket || "generated-assets",
      });

    case "gcp":
      throw new Error("GCP storage not yet implemented - PRs welcome!");

    case "s3":
      throw new Error("S3 storage not yet implemented - PRs welcome!");

    default:
      throw new Error(`Unknown storage provider: ${config.provider}`);
  }
}

/**
 * Get the configured storage provider (singleton)
 */
export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    const config = getStorageConfigFromEnv();
    storageInstance = createStorageProvider(config);
  }
  return storageInstance;
}

/**
 * Reset storage provider singleton (for testing)
 */
export function resetStorageProvider(): void {
  storageInstance = null;
}

/**
 * Check if cloud storage is configured
 */
export function isCloudStorageConfigured(): boolean {
  const provider = process.env.STORAGE_PROVIDER || "local";
  return provider !== "local";
}

/**
 * Generate remote path for an asset
 */
export function generateRemotePath(
  type: "images" | "videos" | "audio",
  filename: string
): string {
  const prefix = process.env.STORAGE_OUTPUT_PREFIX || "";
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}${type}/${timestamp}_${sanitized}`;
}

/**
 * Upload result with error handling
 */
export interface CloudUploadResult {
  attempted: boolean;
  success: boolean;
  remoteUrl?: string;
  error?: string;
}

/**
 * Upload to cloud storage with graceful fallback
 */
export async function uploadToCloudStorage(
  localPath: string,
  assetType: "images" | "videos" | "audio",
  filename: string,
  uploadToCloud = true
): Promise<CloudUploadResult> {
  if (!uploadToCloud || !isCloudStorageConfigured()) {
    return { attempted: false, success: false };
  }

  try {
    const storage = getStorageProvider();
    const remotePath = generateRemotePath(assetType, filename);
    const result = await storage.upload(localPath, remotePath);

    return {
      attempted: true,
      success: true,
      remoteUrl: result.signedUrl || result.url || undefined,
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
