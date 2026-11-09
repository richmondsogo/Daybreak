import { describe, expect, it } from "vitest";
import { parseIngestEnv } from "./ingest-env";

describe("ingest env configuration", () => {
  it("applies default values when optional env vars are missing", () => {
    const config = parseIngestEnv({
      GMAIL_USER: "test@example.com",
      GMAIL_APP_PASSWORD: "test-password",
    });

    expect(config.DATABASE_PATH).toBe("./data/medium-reader.db");
    expect(config.LOG_LEVEL).toBe("info");
    expect(config.FREEDIUM_BASE_URLS).toEqual([
      "https://freedium-mirror.cfd",
      "https://freedium.cfd",
    ]);
    expect(config.ARTICLE_FETCH_DELAY_MS).toBe(1500);
    expect(config.ARTICLE_FETCH_CONCURRENCY).toBe(3);
    expect(config.INGEST_LOOKBACK_DAYS).toBe(14);
    expect(config.TURSO_DATABASE_URL).toBeUndefined();
    expect(config.TURSO_AUTH_TOKEN).toBeUndefined();
    expect(config.APP_PASSWORD).toBeUndefined();
  });

  it("parses Turso and auth environment variables in ingest", () => {
    const config = parseIngestEnv({
      GMAIL_USER: "test@example.com",
      GMAIL_APP_PASSWORD: "test-password",
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "turso-auth-token",
      APP_PASSWORD: "my-app-password",
    });

    expect(config.TURSO_DATABASE_URL).toBe("libsql://example.turso.io");
    expect(config.TURSO_AUTH_TOKEN).toBe("turso-auth-token");
    expect(config.APP_PASSWORD).toBe("my-app-password");
  });

  it("parses valid custom environment variables", () => {
    const config = parseIngestEnv({
      DATABASE_PATH: "/custom/path/app.db",
      LOG_LEVEL: "debug",
      FREEDIUM_BASE_URLS: "https://custom.freedium.com, https://other.com",
      GMAIL_USER: "test@example.com",
      GMAIL_APP_PASSWORD: "test-password",
      ARTICLE_FETCH_DELAY_MS: "500",
      ARTICLE_FETCH_CONCURRENCY: "4",
      INGEST_LOOKBACK_DAYS: "30",
    });

    expect(config.DATABASE_PATH).toBe("/custom/path/app.db");
    expect(config.LOG_LEVEL).toBe("debug");
    expect(config.FREEDIUM_BASE_URLS).toEqual([
      "https://custom.freedium.com",
      "https://other.com",
    ]);
    expect(config.ARTICLE_FETCH_DELAY_MS).toBe(500);
    expect(config.ARTICLE_FETCH_CONCURRENCY).toBe(4);
    expect(config.INGEST_LOOKBACK_DAYS).toBe(30);
  });

  it("throws a readable error when LOG_LEVEL is invalid", () => {
    expect(() =>
      parseIngestEnv({
        LOG_LEVEL: "verbose",
        GMAIL_USER: "test@example.com",
        GMAIL_APP_PASSWORD: "test-password",
      }),
    ).toThrow(/Invalid ingest environment configuration: LOG_LEVEL/);
  });

  it("throws a readable error when GMAIL_USER or GMAIL_APP_PASSWORD is missing", () => {
    expect(() =>
      parseIngestEnv({
        GMAIL_USER: "test@example.com",
      }),
    ).toThrow(/Invalid ingest environment configuration: GMAIL_APP_PASSWORD/);

    expect(() =>
      parseIngestEnv({
        GMAIL_APP_PASSWORD: "test-password",
      }),
    ).toThrow(/Invalid ingest environment configuration: GMAIL_USER/);
  });
});
