"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Lock, Save, Shield, UserCog } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SettingsData = {
  accountStatus: string | null;
  registrationNo: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  showCgpa: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showDob: boolean;
  showInDirectory: boolean;
  allowMessages: boolean;
  showActivityFeed: boolean;
  openToOpportunities: boolean;
  availableForMentorship: boolean;
};

type SettingsFormProps = {
  initialData: SettingsData;
};

type ToggleField =
  | "showCgpa"
  | "showEmail"
  | "showPhone"
  | "showDob"
  | "showInDirectory"
  | "allowMessages"
  | "showActivityFeed"
  | "openToOpportunities"
  | "availableForMentorship";

export function SettingsForm({ initialData }: SettingsFormProps) {
  const [settings, setSettings] = useState<SettingsData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const setToggle = (field: ToggleField, value: boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showCgpa: settings.showCgpa,
          showEmail: settings.showEmail,
          showPhone: settings.showPhone,
          showDob: settings.showDob,
          showInDirectory: settings.showInDirectory,
          allowMessages: settings.allowMessages,
          showActivityFeed: settings.showActivityFeed,
          openToOpportunities: settings.openToOpportunities,
          availableForMentorship: settings.availableForMentorship,
        }),
      });

      const result = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(result.error ?? "Failed to update settings.");
        return;
      }

      setSuccess("Settings updated successfully.");
    } catch {
      setError("Something went wrong while updating settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <BadgeCheck className="size-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Tabs defaultValue="privacy" className="space-y-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="privacy">Privacy & Visibility</TabsTrigger>
            <TabsTrigger value="account">Account Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  Privacy Controls
                </CardTitle>
                <CardDescription>Control what is visible across directory and profile pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Show CGPA</p>
                    <p className="text-xs text-muted-foreground">Display your CGPA on your profile.</p>
                  </div>
                  <Switch checked={settings.showCgpa} onCheckedChange={(v) => setToggle("showCgpa", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Show Email</p>
                    <p className="text-xs text-muted-foreground">Allow alumni to view your email on profile.</p>
                  </div>
                  <Switch checked={settings.showEmail} onCheckedChange={(v) => setToggle("showEmail", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Show Phone</p>
                    <p className="text-xs text-muted-foreground">Allow alumni to view your phone on profile.</p>
                  </div>
                  <Switch checked={settings.showPhone} onCheckedChange={(v) => setToggle("showPhone", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Show Date of Birth</p>
                    <p className="text-xs text-muted-foreground">Show your date of birth on your profile.</p>
                  </div>
                  <Switch checked={settings.showDob} onCheckedChange={(v) => setToggle("showDob", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Show in Directory</p>
                    <p className="text-xs text-muted-foreground">Make your profile visible in alumni directory search.</p>
                  </div>
                  <Switch checked={settings.showInDirectory} onCheckedChange={(v) => setToggle("showInDirectory", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Allow Messages</p>
                    <p className="text-xs text-muted-foreground">Permit direct messages from other alumni.</p>
                  </div>
                  <Switch checked={settings.allowMessages} onCheckedChange={(v) => setToggle("allowMessages", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Show Activity Feed</p>
                    <p className="text-xs text-muted-foreground">Share your activity updates publicly.</p>
                  </div>
                  <Switch checked={settings.showActivityFeed} onCheckedChange={(v) => setToggle("showActivityFeed", v)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Open to Opportunities</p>
                    <p className="text-xs text-muted-foreground">Highlight your profile for job opportunities.</p>
                  </div>
                  <Switch
                    checked={settings.openToOpportunities}
                    onCheckedChange={(v) => setToggle("openToOpportunities", v)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Available for Mentorship</p>
                    <p className="text-xs text-muted-foreground">Allow mentorship requests from alumni.</p>
                  </div>
                  <Switch
                    checked={settings.availableForMentorship}
                    onCheckedChange={(v) => setToggle("availableForMentorship", v)}
                  />
                </div>
                <Button onClick={saveSettings} disabled={isSaving} className="w-full sm:w-auto">
                  <Save className="mr-2 size-4" />
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="size-4 text-primary" />
                  Account Details
                </CardTitle>
                <CardDescription>Core identity is synced from admin import records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">{settings.fullName}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">Registration Number</span>
                  <span className="font-medium">{settings.registrationNo}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{settings.email ?? "Not set"}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{settings.phone ?? "Not set"}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{settings.accountStatus ?? "PENDING"}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Lock className="size-3.5" />
                  For data integrity, academic identity fields are locked and updated by admin uploads only.
                </p>
                <p className="mt-2 flex items-center gap-2">
                  <BadgeCheck className="size-3.5" />
                  Employment, education, and skills modules can be expanded next.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
