/**
 * Local Storage Provider Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { LocalStorageProvider } from "../../storage/local.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("LocalStorageProvider", () => {
  let provider: LocalStorageProvider;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `graphix-storage-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    provider = new LocalStorageProvider({ basePath: testDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("healthCheck", () => {
    it("should return ok when directory is writable", async () => {
      const result = await provider.healthCheck();
      expect(result.ok).toBe(true);
      expect(result.details?.basePath).toBe(testDir);
    });
  });

  describe("upload and read", () => {
    it("should upload a file and read it back", async () => {
      // Create a test file to upload
      const sourceFile = path.join(testDir, "source.txt");
      const content = "Hello, storage!";
      await fs.writeFile(sourceFile, content);

      // Upload it
      const result = await provider.upload(sourceFile, "uploaded/test.txt");
      expect(result.path).toBe("uploaded/test.txt");
      expect(result.size).toBe(content.length);

      // Read it back
      const buffer = await provider.read("uploaded/test.txt");
      expect(buffer.toString()).toBe(content);
    });
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      const testFile = path.join(testDir, "exists-test.txt");
      await fs.writeFile(testFile, "test");
      await provider.upload(testFile, "check/exists.txt");

      const exists = await provider.exists("check/exists.txt");
      expect(exists).toBe(true);
    });

    it("should return false for non-existing file", async () => {
      const exists = await provider.exists("nonexistent.txt");
      expect(exists).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete an existing file", async () => {
      const testFile = path.join(testDir, "delete-test.txt");
      await fs.writeFile(testFile, "to delete");
      await provider.upload(testFile, "todelete.txt");

      expect(await provider.exists("todelete.txt")).toBe(true);
      await provider.delete("todelete.txt");
      expect(await provider.exists("todelete.txt")).toBe(false);
    });
  });

  describe("getContentType", () => {
    it("should return correct content types", () => {
      expect(provider.getContentType("image.png")).toBe("image/png");
      expect(provider.getContentType("image.jpg")).toBe("image/jpeg");
      expect(provider.getContentType("image.jpeg")).toBe("image/jpeg");
      expect(provider.getContentType("image.webp")).toBe("image/webp");
      expect(provider.getContentType("video.mp4")).toBe("video/mp4");
      expect(provider.getContentType("unknown.xyz")).toBe("application/octet-stream");
    });
  });

  describe("list", () => {
    it("should list uploaded files", async () => {
      const testFile = path.join(testDir, "list-test.txt");
      await fs.writeFile(testFile, "list me");
      await provider.upload(testFile, "listdir/file1.txt");
      await provider.upload(testFile, "listdir/file2.txt");

      const files = await provider.list("listdir");
      expect(files.length).toBe(2);
      expect(files.map(f => f.name).sort()).toEqual(["file1.txt", "file2.txt"]);
    });

    it("should return empty array for non-existing prefix", async () => {
      const files = await provider.list("nonexistent");
      expect(files).toEqual([]);
    });
  });
});
