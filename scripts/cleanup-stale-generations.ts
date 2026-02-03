#!/usr/bin/env bun
/**
 * Cleanup Stale Generations
 *
 * Removes generation records from the database that point to missing image files.
 * Run this when you see "Invalid image file" errors from ComfyUI.
 *
 * Usage: bun run scripts/cleanup-stale-generations.ts [--dry-run]
 */

import { existsSync } from "fs";
import { createDatabase, setDefaultDatabase, getDb } from "../packages/core/src/db/index.js";
import { generatedImages } from "../packages/core/src/db/schema.js";
import { eq } from "drizzle-orm";

// Initialize database
const dbPath = process.env.SQLITE_PATH || "./graphix.db";
const database = createDatabase({ url: `file:${dbPath}` });
setDefaultDatabase(database);

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🧹 Cleaning up stale generation records...\n");

  if (isDryRun) {
    console.log("🔍 DRY RUN - no records will be deleted\n");
  }

  const db = getDb();

  // Get all generations
  const allGenerations = await db.select().from(generatedImages);
  console.log(`Found ${allGenerations.length} total generation records\n`);

  let staleCount = 0;
  let validCount = 0;
  const staleIds: string[] = [];

  for (const gen of allGenerations) {
    if (!gen.imagePath) {
      // No image path - might be a failed generation
      continue;
    }

    if (existsSync(gen.imagePath)) {
      validCount++;
    } else {
      staleCount++;
      staleIds.push(gen.id);
      console.log(`❌ STALE: ${gen.id}`);
      console.log(`   Path: ${gen.imagePath}`);
      console.log(`   Panel: ${gen.panelId}`);
      console.log("");
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Valid: ${validCount}`);
  console.log(`   Stale: ${staleCount}`);

  if (staleCount === 0) {
    console.log("\n✅ No stale records found!");
    return;
  }

  if (isDryRun) {
    console.log(`\n🔍 Would delete ${staleCount} stale records`);
    console.log("   Run without --dry-run to actually delete them");
    return;
  }

  // Delete stale records
  console.log(`\n🗑️  Deleting ${staleCount} stale records...`);

  for (const id of staleIds) {
    await db.delete(generatedImages).where(eq(generatedImages.id, id));
  }

  console.log("✅ Done!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
