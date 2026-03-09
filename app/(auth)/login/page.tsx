"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Info, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [registrationNo, setRegistrationNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!registrationNo.trim()) {
      setError("Please enter your registration number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const identifier = registrationNo.trim();
      const result = identifier.includes("@")
        ? await signIn.email({
            email: identifier.toLowerCase(),
            password,
            rememberMe: true,
          })
        : await fetch("/api/auth/sign-in/registration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              registrationNo: identifier,
              password,
              rememberMe: true,
            }),
          }).then(async (response) => {
            if (!response.ok) {
              const payload = (await response.json()) as { message?: string };
              return { error: { message: payload.message ?? "Invalid credentials." } };
            }
            const data = (await response.json()) as {
              user?: { role?: string; defaultPassword?: boolean };
            };
            return { data };
          });

      if (result.error) {
        setError(result.error.message || "Invalid credentials.");
        return;
      }

      const user = result.data?.user as
        | { role?: string; defaultPassword?: boolean }
        | undefined;

      if (user?.defaultPassword) {
        router.push("/onboarding");
        return;
      }

      if (user?.role === "admin") {
        router.push("/admin");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to home
      </Link>

      {/* Header */}
      <div>
        <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Use your registration number (or admin email) to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Error */}
        {error && (
          <Alert variant="destructive" className="py-3 text-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Registration number field */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="registration-no" className="text-[13px] font-semibold">
            Registration Number
          </Label>
          <Input
            id="registration-no"
            type="text"
            placeholder="e.g. UG19/ASAC/1025"
            value={registrationNo}
            onChange={(e) => setRegistrationNo(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
            autoFocus
            className={cn(
              "h-11 rounded-xl border-border/70 bg-background text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/30",
              error && !registrationNo.trim() && "border-destructive"
            )}
          />
        </div>

        {/* Password field */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px] font-semibold">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
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

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          className="group mt-1 h-11 w-full rounded-xl text-[14px] font-semibold shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/25"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Sign In
              <MoveRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] text-muted-foreground/50">First time?</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* First-time info */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-primary/70" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">New to the platform?</span>{" "}
          Your default password is your registration number plus entry year
          (e.g. UG19/ASAC/10252019). You&apos;ll be prompted to set a new password
          after your first sign-in.
        </p>
      </div>
    </div>
  );
}
