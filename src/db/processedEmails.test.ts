import { describe, it, expect, beforeEach } from "vitest";
import { createMigratedDb, type DbClient } from "./client";
import { isEmailProcessed, markEmailProcessed } from "./processedEmails";

describe("db/processedEmails", () => {
  let db: DbClient;

  beforeEach(async () => {
    db = await createMigratedDb(":memory:");
  });

  it("isEmailProcessed is false before, true after markEmailProcessed", async () => {
    expect(await isEmailProcessed(db, "msg-123")).toBe(false);

    await markEmailProcessed(db, "msg-123", 5);

    expect(await isEmailProcessed(db, "msg-123")).toBe(true);
  });

  it("marking the same messageId twice doesn't throw (idempotent)", async () => {
    await markEmailProcessed(db, "msg-123", 5);
    await expect(markEmailProcessed(db, "msg-123", 5)).resolves.not.toThrow();
  });
});
