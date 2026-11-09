import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db/instance", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/db/articles", () => ({
  setArticleRead: vi.fn().mockResolvedValue({}),
}));

import { revalidatePath } from "next/cache";
import { setArticleRead } from "@/db/articles";
import { markArticleRead } from "./actions";

describe("server/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("markArticleRead", () => {
    it("calls setArticleRead and revalidates layout cache", async () => {
      await markArticleRead(42);

      expect(setArticleRead).toHaveBeenCalledWith(expect.anything(), 42, true);
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("throws if id is invalid", async () => {
      await expect(markArticleRead(-1)).rejects.toThrow();
      await expect(markArticleRead(0)).rejects.toThrow();
      await expect(markArticleRead(1.5)).rejects.toThrow();
    });
  });
});
