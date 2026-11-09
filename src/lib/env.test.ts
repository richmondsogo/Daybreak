import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("web env configuration", () => {
  it("applies default values when env vars are missing", () => {
    const config = parseEnv({});

    expect(config.DATABASE_PATH).toBe("./data/medium-reader.db");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("parses when ONLY DATABASE_PATH is set (no mail credentials required)", () => {
    const config = parseEnv({
      DATABASE_PATH: "./data/custom.db",
    });

    expect(config.DATABASE_PATH).toBe("./data/custom.db");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("parses valid custom environment variables", () => {
    const config = parseEnv({
      DATABASE_PATH: "/custom/path/app.db",
      LOG_LEVEL: "debug",
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "test-token",
      APP_PASSWORD: "secret-password",
    });

    expect(config.DATABASE_PATH).toBe("/custom/path/app.db");
    expect(config.LOG_LEVEL).toBe("debug");
    expect(config.TURSO_DATABASE_URL).toBe("libsql://example.turso.io");
    expect(config.TURSO_AUTH_TOKEN).toBe("test-token");
    expect(config.APP_PASSWORD).toBe("secret-password");
  });

  it("parses custom Turso and auth settings", () => {
    const config = parseEnv({
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "test-token",
      APP_PASSWORD: "secret-password",
    });

    expect(config.TURSO_DATABASE_URL).toBe("libsql://example.turso.io");
    expect(config.TURSO_AUTH_TOKEN).toBe("test-token");
    expect(config.APP_PASSWORD).toBe("secret-password");
  });

  it("throws a readable error when LOG_LEVEL is invalid", () => {
    expect(() =>
      parseEnv({
        LOG_LEVEL: "verbose",
      }),
    ).toThrow(/Invalid environment configuration: LOG_LEVEL/);
  });
});

