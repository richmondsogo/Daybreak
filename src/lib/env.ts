import { z } from "zod";

export const envSchema = z.object({
  DATABASE_PATH: z.string().default("./data/medium-reader.db"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  APP_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(
  rawEnv: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}

export const env = parseEnv();

