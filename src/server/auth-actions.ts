"use server";

import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getExpectedSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginAction(password: string): Promise<LoginResult> {
  const configuredPassword = env.APP_PASSWORD;

  if (!configuredPassword) {
    // If no password is set on the server, allow immediately
    return { success: true };
  }

  if (password !== configuredPassword) {
    return { success: false, error: "Incorrect password" };
  }

  const token = await getExpectedSessionToken(configuredPassword);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return { success: true };
}
