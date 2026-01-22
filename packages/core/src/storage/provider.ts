/**
 * Storage Provider Abstraction
 *
 * Unified interface for storing generated assets to:
 * - Local filesystem (development)
 * - Supabase Storage (production)
 * - GCP Cloud Storage (future)
 * - AWS S3 (future)
 *
 * Swap providers via STORAGE_PROVIDER env var.
 */

export interface StorageObject {
  name: string;
  path: string;
  size: number;
  contentType: string;
  created: Date;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  /** Path in storage (relative to bucket root) */
  path: string;
  /** Public URL if available */
  url: string | null;
  /** Signed URL for private buckets (time-limited) */
  signedUrl?: string;
  /** Size in bytes */
  size: number;
}

export interface HealthCheckResult {
  ok: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Storage provider interface - implement this for new backends
 */
export interface StorageProvider {
  readonly name: string;

  /** Upload local file to storage */
  upload(localPath: string, remotePath: string): Promise<UploadResult>;

  /** Download remote file to local path */
  download(remotePath: string, localPath: string): Promise<void>;

  /** List objects with prefix */
  list(prefix: string): Promise<StorageObject[]>;

  /** Get signed URL for temporary access */
  getSignedUrl(remotePath: string, expiresInSeconds?: number): Promise<string>;

  /** Health check */
  healthCheck(): Promise<HealthCheckResult>;

  /** Delete file */
  delete(remotePath: string): Promise<void>;

  /** Check if file exists */
  exists(remotePath: string): Promise<boolean>;

  /** Read file and return buffer (for serving) */
  read(remotePath: string): Promise<Buffer>;

  /** Get content type for a path */
  getContentType(remotePath: string): string;
}

export type StorageProviderType = "local" | "supabase" | "gcp" | "s3";

export interface StorageConfig {
  provider: StorageProviderType;

  // Local
  localBasePath?: string;

  // Supabase
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  supabaseBucket?: string;

  // GCP (future)
  gcpProjectId?: string;
  gcpBucket?: string;
  gcpKeyFile?: string;

  // AWS S3 (future)
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;

  // Common
  outputPrefix?: string;
}

/**
 * Get storage config from environment
 */
export function getStorageConfigFromEnv(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || "local") as StorageProviderType;

  return {
    provider,

    // Local
    localBasePath: process.env.GRAPHIX_OUTPUT_DIR || process.env.STORAGE_LOCAL_PATH,

    // Supabase
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    supabaseBucket: process.env.SUPABASE_BUCKET || "generated-assets",

    // GCP
    gcpProjectId: process.env.GCP_PROJECT,
    gcpBucket: process.env.GCP_BUCKET,
    gcpKeyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,

    // AWS S3
    s3Bucket: process.env.AWS_S3_BUCKET,
    s3Region: process.env.AWS_REGION || "us-east-1",
    s3AccessKey: process.env.AWS_ACCESS_KEY_ID,
    s3SecretKey: process.env.AWS_SECRET_ACCESS_KEY,

    // Common
    outputPrefix: process.env.STORAGE_OUTPUT_PREFIX || "",
  };
}
