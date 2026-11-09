import { createHash } from "node:crypto";

export const SESSION_COOKIE_NAME = "daybreak_session";

export function getExpectedSessionToken(password: string): string {
  return createHash("sha256").update(`daybreak-auth:${password}`).digest("hex");
}
