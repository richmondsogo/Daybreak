import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSet } = vi.hoisted(() => ({
  mockSet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockSet,
    get: vi.fn(),
  }),
}));

vi.mock("@/lib/env", () => ({
  env: {
    APP_PASSWORD: "correct-horse-battery-staple",
  },
}));

import { loginAction } from "./auth-actions";
import { getExpectedSessionToken } from "@/lib/auth";

describe("auth-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error on invalid password", async () => {
    const res = await loginAction("wrong-password");
    expect(res.success).toBe(false);
    expect(res.error).toBe("Incorrect password");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("sets 30-day session cookie on valid password", async () => {
    const res = await loginAction("correct-horse-battery-staple");
    expect(res.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      "daybreak_session",
      await getExpectedSessionToken("correct-horse-battery-staple"),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      })
    );
  });
});
