import { describe, it, expect, afterAll } from "vitest";
import { createDb, migrateDb } from "./client";
import { articles } from "./schema";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

describe("createDb and migrateDb", () => {
  const uniqueId = Math.random().toString(36).substring(7);
  const tempDir = path.join(os.tmpdir(), `medium-reader-test-client-db-${uniqueId}`);

  afterAll(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore EPERM on Windows due to open sqlite file lock
    }
  });

  it("creates parent directory for database file if missing", () => {
    const dbPath = path.join(tempDir, "nested", "subfolder", "test.db");
    const db = createDb(dbPath);

    expect(fs.existsSync(path.dirname(dbPath))).toBe(true);
    expect(db).toBeDefined();
  });

  it("migrates in-memory database and allows querying schema", async () => {
    const db = createDb(":memory:");
    await migrateDb(db);

    const rows = await db.select().from(articles);
    expect(rows).toEqual([]);
  });
});
