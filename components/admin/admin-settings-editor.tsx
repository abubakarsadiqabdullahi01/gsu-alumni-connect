"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SettingsState = {
  platformName: string;
  supportEmail: string;
  welcomeMessage: string;
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  forcePasswordChangeOnFirst: boolean;
  enableTwoFactor: boolean;
  featureJobBoard: boolean;
  featureMentorship: boolean;
  featureMessaging: boolean;
  featureMap: boolean;
  featureGroups: boolean;
  featureSkills: boolean;
};

const INITIAL: SettingsState = {
  platformName: "",
  supportEmail: "",
  welcomeMessage: "",
  allowSelfRegistration: false,
  requireEmailVerification: true,
  forcePasswordChangeOnFirst: true,
  enableTwoFactor: true,
  featureJobBoard: true,
  featureMentorship: true,
  featureMessaging: true,
  featureMap: true,
  featureGroups: true,
  featureSkills: false,
};

export function AdminSettingsEditor() {
  const [settings, setSettings] = useState<SettingsState>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings");
      const json = (await res.json()) as { settings?: SettingsState; error?: string };
      if (!res.ok || !json.settings) {
        setError(json.error ?? "Failed to load settings.");
        return;
      }
      setSettings(json.settings);
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await res.json()) as { settings?: SettingsState; error?: string };
      if (!res.ok || !json.settings) {
        setError(json.error ?? "Failed to save settings.");
        return;
      }
      setSettings(json.settings);
      setSuccess("Settings saved successfully.");
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const setBool = (key: keyof SettingsState, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Persisted platform identity and onboarding text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Platform Name</Label>
            <Input value={settings.platformName} disabled={loading} onChange={(e) => setSettings((p) => ({ ...p, platformName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input value={settings.supportEmail} disabled={loading} onChange={(e) => setSettings((p) => ({ ...p, supportEmail: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea rows={3} value={settings.welcomeMessage} disabled={loading} onChange={(e) => setSettings((p) => ({ ...p, welcomeMessage: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration & Auth Policy</CardTitle>
          <CardDescription>Operational policy values saved in database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm">Allow Self-Registration</span><Switch checked={settings.allowSelfRegistration} disabled={loading} onCheckedChange={(v) => setBool("allowSelfRegistration", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Require Email Verification</span><Switch checked={settings.requireEmailVerification} disabled={loading} onCheckedChange={(v) => setBool("requireEmailVerification", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Force First-Login Password Change</span><Switch checked={settings.forcePasswordChangeOnFirst} disabled={loading} onCheckedChange={(v) => setBool("forcePasswordChangeOnFirst", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Enable Two-Factor Auth</span><Switch checked={settings.enableTwoFactor} disabled={loading} onCheckedChange={(v) => setBool("enableTwoFactor", v)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Flags</CardTitle>
          <CardDescription>Saved feature state. Some modules are informational until full enforcement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm">Job Board</span><Switch checked={settings.featureJobBoard} disabled={loading} onCheckedChange={(v) => setBool("featureJobBoard", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Mentorship</span><Switch checked={settings.featureMentorship} disabled={loading} onCheckedChange={(v) => setBool("featureMentorship", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Messaging</span><Switch checked={settings.featureMessaging} disabled={loading} onCheckedChange={(v) => setBool("featureMessaging", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Map</span><Switch checked={settings.featureMap} disabled={loading} onCheckedChange={(v) => setBool("featureMap", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Groups</span><Switch checked={settings.featureGroups} disabled={loading} onCheckedChange={(v) => setBool("featureGroups", v)} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Skills</span><Switch checked={settings.featureSkills} disabled={loading} onCheckedChange={(v) => setBool("featureSkills", v)} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={loading || saving}>
          <Save className="mr-1.5 size-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
