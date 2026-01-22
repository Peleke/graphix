/**
 * Supabase Storage Provider
 *
 * Production storage using Supabase Storage.
 * Requires service role key for write operations.
 */

import { StorageClient } from "@supabase/storage-js";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  StorageProvider,
  StorageObject,
  UploadResult,
  HealthCheckResult,
} from "./provider.js";

export interface SupabaseStorageConfig {
  url: string;
  serviceKey: string;
  bucket: string;
}

export class SupabaseStorageError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = "SupabaseStorageError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  private storage: StorageClient;
  private bucket: string;

  constructor(config: SupabaseStorageConfig) {
    if (!config.url) throw new Error("Supabase URL required");
    if (!config.serviceKey) throw new Error("Supabase service key required");

    this.storage = new StorageClient(`${config.url}/storage/v1`, {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
    });
    this.bucket = config.bucket;
  }

  private async withRetry<T>(op: string, fn: () => Promise<T>, retries = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const status = (error as any)?.statusCode || (error as any)?.status;
        const retryable = status === 408 || status === 429 || status >= 500;

        if (!retryable || i === retries) throw error;
        await sleep(1000 * Math.pow(2, i) + Math.random() * 300);
      }
    }
    throw lastError;
  }

  async upload(localPath: string, remotePath: string): Promise<UploadResult> {
    return this.withRetry("upload", async () => {
      const fileBuffer = await fs.readFile(localPath);
      const contentType = this.getContentType(localPath);

      const { data, error } = await this.storage
        .from(this.bucket)
        .upload(remotePath, fileBuffer, { contentType, upsert: true });

      if (error) {
        throw new SupabaseStorageError(`Upload failed: ${error.message}`, "upload");
      }

      const { data: urlData } = this.storage.from(this.bucket).getPublicUrl(remotePath);
      const { data: signedData } = await this.storage
        .from(this.bucket)
        .createSignedUrl(remotePath, 3600);

      return {
        path: data.path,
        url: urlData.publicUrl,
        signedUrl: signedData?.signedUrl,
        size: fileBuffer.length,
      };
    });
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    return this.withRetry("download", async () => {
      const { data, error } = await this.storage.from(this.bucket).download(remotePath);

      if (error) {
        throw new SupabaseStorageError(`Download failed: ${error.message}`, "download");
      }

      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, Buffer.from(await data.arrayBuffer()));
    });
  }

  async read(remotePath: string): Promise<Buffer> {
    return this.withRetry("read", async () => {
      const { data, error } = await this.storage.from(this.bucket).download(remotePath);

      if (error) {
        throw new SupabaseStorageError(`Read failed: ${error.message}`, "read");
      }

      return Buffer.from(await data.arrayBuffer());
    });
  }

  async list(prefix: string): Promise<StorageObject[]> {
    return this.withRetry("list", async () => {
      const { data, error } = await this.storage
        .from(this.bucket)
        .list(prefix, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });

      if (error) {
        throw new SupabaseStorageError(`List failed: ${error.message}`, "list");
      }

      return (data || [])
        .filter((item) => item.name !== ".emptyFolderPlaceholder")
        .map((item) => ({
          name: item.name,
          path: prefix ? `${prefix}/${item.name}` : item.name,
          size: item.metadata?.size || 0,
          contentType: item.metadata?.mimetype || "application/octet-stream",
          created: new Date(item.created_at),
        }));
    });
  }

  async getSignedUrl(remotePath: string, expiresInSeconds = 3600): Promise<string> {
    return this.withRetry("getSignedUrl", async () => {
      const { data, error } = await this.storage
        .from(this.bucket)
        .createSignedUrl(remotePath, expiresInSeconds);

      if (error) {
        throw new SupabaseStorageError(`Signed URL failed: ${error.message}`, "getSignedUrl");
      }

      return data.signedUrl;
    });
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const { error } = await this.storage.from(this.bucket).list("", { limit: 1 });

      if (error) {
        return { ok: false, error: `Bucket access failed: ${error.message}` };
      }

      return { ok: true, details: { bucket: this.bucket, provider: "supabase" } };
    } catch (error) {
      return { ok: false, error: `Health check failed: ${error}` };
    }
  }

  async delete(remotePath: string): Promise<void> {
    return this.withRetry("delete", async () => {
      const { error } = await this.storage.from(this.bucket).remove([remotePath]);
      if (error) {
        throw new SupabaseStorageError(`Delete failed: ${error.message}`, "delete");
      }
    });
  }

  async exists(remotePath: string): Promise<boolean> {
    try {
      const { data } = await this.storage
        .from(this.bucket)
        .list(path.dirname(remotePath), { limit: 1, search: path.basename(remotePath) });

      return data?.some((item) => item.name === path.basename(remotePath)) || false;
    } catch {
      return false;
    }
  }

  getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
    };
    return types[ext] || "application/octet-stream";
  }
}
