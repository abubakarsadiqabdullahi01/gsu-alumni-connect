"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountCard() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete(event: { preventDefault(): void }) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Your account could not be deleted. Please try again.");
        return;
      }
      window.location.assign("/?account=deleted");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="size-4" />
          Delete account
        </CardTitle>
        <CardDescription>
          Permanently deletes your account, profile, photos, posts, messages, connections and applications. Your
          academic record stays with the University, hidden.{" "}
          <Link href="/delete-account" className="text-primary underline underline-offset-2">
            What is deleted
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog onOpenChange={() => { setPassword(""); setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete my account</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={confirmDelete} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This cannot be undone. Your profile, photos, posts, messages, connections, RSVPs, mentorship
                  and job applications will be deleted, and your ID card will stop being valid.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-password">Enter your password to confirm</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" variant="destructive" disabled={busy || !password}>
                  {busy ? "Deleting…" : "Delete permanently"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
