"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark, UiLabel, Meta } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/server/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await loginAction(password);
      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error ?? "Authentication failed");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm border border-border/40 rounded-xl p-8 bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <Wordmark className="mb-2">daybreak</Wordmark>
          <Meta>Enter your password to access your digests</Meta>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="cursor-pointer">
              <UiLabel>Password</UiLabel>
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-10 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <Meta className="text-destructive" role="alert">
              {error}
            </Meta>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !password}
            className="w-full h-10 mt-2"
          >
            {isSubmitting ? "Unlocking..." : "Unlock Reader"}
          </Button>
        </form>
      </div>
    </div>
  );
}
