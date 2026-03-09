"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  PartyPopper,
  Shield,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { signOut } from "@/lib/auth-client";

const steps = [
  { id: 0, label: "Welcome", icon: Sparkles },
  { id: 1, label: "Personal Info", icon: UserCircle },
  { id: 2, label: "Employment", icon: Briefcase },
  { id: 3, label: "Education & Skills", icon: GraduationCap },
  { id: 4, label: "Privacy", icon: Shield },
  { id: 5, label: "Complete", icon: PartyPopper },
];

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

type PrivacyState = {
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

type ProfileState = {
  email: string;
  phone: string;
  dateOfBirth: string;
  bio: string;
  linkedinUrl: string;
  nyscState: string;
  nyscYear: string;
};

function StepWelcome() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
        <Sparkles className="size-10 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold">Welcome to GSU Alumni Connect</h2>
      <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        Your account was created from university records. Complete onboarding to activate your profile.
      </p>
    </div>
  );
}

function StepPersonalInfo({
  profile,
  onChange,
}: {
  profile: ProfileState;
  onChange: (field: keyof ProfileState, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Personal Information</h2>
        <p className="text-[13px] text-muted-foreground">These fields are saved to your profile.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[12px]">Email Address</Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={profile.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px]">Phone Number</Label>
          <Input
            type="tel"
            placeholder="+234..."
            value={profile.phone}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[12px]">Date of Birth</Label>
        <Input
          type="date"
          value={profile.dateOfBirth}
          onChange={(e) => onChange("dateOfBirth", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[12px]">Bio</Label>
        <Textarea
          className="min-h-[100px] resize-none"
          placeholder="Share a short professional bio"
          value={profile.bio}
          onChange={(e) => onChange("bio", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[12px]">LinkedIn URL (optional)</Label>
        <Input
          placeholder="https://linkedin.com/in/username"
          value={profile.linkedinUrl}
          onChange={(e) => onChange("linkedinUrl", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[12px]">NYSC State</Label>
          <Select
            value={profile.nyscState}
            onValueChange={(value) => onChange("nyscState", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {nigerianStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[12px]">NYSC Year</Label>
          <Select
            value={profile.nyscYear}
            onValueChange={(value) => onChange("nyscYear", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepEmployment() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Employment History</h2>
        <Badge variant="outline" className="text-[10px]">Optional</Badge>
      </div>
      <p className="text-[13px] text-muted-foreground">
        This step is optional for now. You can add full employment details from your profile later.
      </p>
    </div>
  );
}

function StepEducationSkills() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Education and Skills</h2>
        <Badge variant="outline" className="text-[10px]">Optional</Badge>
      </div>
      <p className="text-[13px] text-muted-foreground">
        This step is optional for now. You can add education and skills after onboarding.
      </p>
      <div className="flex flex-wrap gap-2">
        {["Leadership", "Data Analysis", "Communication"].map((skill) => (
          <Badge key={skill} variant="secondary" className="text-[11px]">
            {skill}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function StepPrivacy({
  privacy,
  onToggle,
}: {
  privacy: PrivacyState;
  onToggle: (field: keyof PrivacyState, value: boolean) => void;
}) {
  const settings: Array<{
    id: keyof PrivacyState;
    label: string;
    description: string;
  }> = [
    { id: "showCgpa", label: "Show CGPA on profile", description: "Display your academic performance." },
    { id: "showEmail", label: "Show email address", description: "Allow alumni to see your email." },
    { id: "showPhone", label: "Show phone number", description: "Allow alumni to see your phone number." },
    { id: "showDob", label: "Show date of birth", description: "Display your date of birth publicly." },
    { id: "showInDirectory", label: "Show in directory", description: "Appear in alumni directory search." },
    { id: "allowMessages", label: "Allow messages", description: "Allow other alumni to message you." },
    { id: "showActivityFeed", label: "Show activity feed", description: "Share your activity feed updates." },
    { id: "openToOpportunities", label: "Open to opportunities", description: "Signal that you are open to opportunities." },
    { id: "availableForMentorship", label: "Available for mentorship", description: "Appear as an available mentor." },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Privacy and Preferences</h2>
        <p className="text-[13px] text-muted-foreground">Set your profile visibility defaults.</p>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {settings.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[12px] font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={privacy[item.id]}
                onCheckedChange={(value) => onToggle(item.id, value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StepComplete({
  currentPassword,
  newPassword,
  confirmPassword,
  onChange,
}: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onChange: (field: "currentPassword" | "newPassword" | "confirmPassword", value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
          <PartyPopper className="size-8 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold">Finalize Your Account</h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          Change your default password to activate your account.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-[12px]">Current Password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => onChange("currentPassword", e.target.value)}
            placeholder="Your default password"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px]">New Password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => onChange("newPassword", e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px]">Confirm New Password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            placeholder="Repeat new password"
          />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<ProfileState>({
    email: "",
    phone: "",
    dateOfBirth: "",
    bio: "",
    linkedinUrl: "",
    nyscState: "",
    nyscYear: "",
  });

  const [privacy, setPrivacy] = useState<PrivacyState>({
    showCgpa: true,
    showEmail: false,
    showPhone: false,
    showDob: false,
    showInDirectory: true,
    allowMessages: true,
    showActivityFeed: true,
    openToOpportunities: false,
    availableForMentorship: false,
  });

  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const progress = (currentStep / (steps.length - 1)) * 100;

  const handleProfileChange = (field: keyof ProfileState, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleTogglePrivacy = (field: keyof PrivacyState, value: boolean) => {
    setPrivacy((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (
    field: "currentPassword" | "newPassword" | "confirmPassword",
    value: string
  ) => {
    setPasswordFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordFields.currentPassword,
          newPassword: passwordFields.newPassword,
          confirmPassword: passwordFields.confirmPassword,
          profile: {
            email: profile.email,
            phone: profile.phone,
            dateOfBirth: profile.dateOfBirth,
            bio: profile.bio,
            linkedinUrl: profile.linkedinUrl,
            nyscState: profile.nyscState,
            nyscYear: profile.nyscYear ? Number(profile.nyscYear) : undefined,
          },
          privacy,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Unable to complete onboarding.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong while completing onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const renderCurrentStep = () => {
    if (currentStep === 0) return <StepWelcome />;
    if (currentStep === 1) return <StepPersonalInfo profile={profile} onChange={handleProfileChange} />;
    if (currentStep === 2) return <StepEmployment />;
    if (currentStep === 3) return <StepEducationSkills />;
    if (currentStep === 4) return <StepPrivacy privacy={privacy} onToggle={handleTogglePrivacy} />;
    return (
      <StepComplete
        currentPassword={passwordFields.currentPassword}
        newPassword={passwordFields.newPassword}
        confirmPassword={passwordFields.confirmPassword}
        onChange={handlePasswordChange}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isSubmitting}>
          <LogOut className="mr-2 size-4" />
          Log out
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
          <p className="text-[11px] font-bold text-primary">{steps[currentStep].label}</p>
        </div>
        <Progress value={progress} className="h-2" />

        <div className="flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div
                  className={`flex size-8 items-center justify-center rounded-full transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                      : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="size-4" /> : <Icon className="size-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0 || isSubmitting}
        >
          <ChevronLeft className="mr-1 size-4" /> Back
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={isSubmitting}
          >
            {currentStep === 0
              ? "Get Started"
              : currentStep === 2 || currentStep === 3
                ? "Skip for now"
                : "Next"}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            {isSubmitting ? "Completing..." : "Activate Account"}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
