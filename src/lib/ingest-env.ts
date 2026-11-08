import { config } from "dotenv";
config();
import { z } from "zod";
import { envSchema } from "./env";

export const ingestEnvSchema = envSchema.extend({
  FREEDIUM_BASE_URLS: z
    .string()
    .default("https://freedium-mirror.cfd,https://freedium.cfd")
    .transform((val) => val.split(",").map((s) => s.trim()).filter(Boolean)),
  GMAIL_USER: z.string(),
  GMAIL_APP_PASSWORD: z.string(),
  ARTICLE_FETCH_DELAY_MS: z.coerce.number().default(1500),
  ARTICLE_FETCH_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  INGEST_LOOKBACK_DAYS: z.coerce.number().default(14),
});

export type IngestEnv = z.infer<typeof ingestEnvSchema>;

export function parseIngestEnv(
  rawEnv: Record<string, string | undefined> = process.env,
): IngestEnv {
  const result = ingestEnvSchema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid ingest environment configuration: ${issues}`);
  }
  return result.data;
}

export const env = parseIngestEnv();
export const ingestEnv = env;
