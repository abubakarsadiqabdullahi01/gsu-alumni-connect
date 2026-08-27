"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, MoveRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(tokenError ? "This reset link is invalid or has expired." : "");
  const [complete, setComplete] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string; code?: string }
          | null;
        setError(
          payload?.message ??
            (payload?.code === "INVALID_TOKEN"
              ? "This reset link is invalid or has expired."
              : "Unable to reset your password.")
        );
        return;
      }

      setComplete(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/login"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>

      <div>
        <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight text-foreground">
          Create a new password
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Choose a password you have not used before.
        </p>
      </div>

      {complete ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
          <CheckCircle2 className="size-4" />
          <AlertDescription>
            Your password has been reset. Taking you back to sign in...
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <Alert variant="destructive" className="py-3 text-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-[13px] font-semibold">
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || !token}
                autoComplete="new-password"
                className="h-11 rounded-xl border-border/70 bg-background pr-11 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{showPassword ? "Hide" : "Show"} password</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password" className="text-[13px] font-semibold">
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading || !token}
              autoComplete="new-password"
              className="h-11 rounded-xl border-border/70 bg-background text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !token}
            className="group h-11 w-full rounded-xl text-[14px] font-semibold shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/25"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Resetting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Reset password
                <MoveRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight text-foreground">
              Create a new password
            </h1>
            <p className="text-[14px] text-muted-foreground">Loading reset link...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
