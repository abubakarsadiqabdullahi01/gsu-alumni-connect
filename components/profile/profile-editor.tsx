"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, BriefcaseBusiness, GraduationCap, Lock, Plus, Save, Sparkles, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type EmploymentItem = {
  id: string;
  jobTitle: string;
  companyName: string;
  employmentType: string;
  isCurrent: boolean;
};

type EducationItem = {
  id: string;
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  isCurrent: boolean;
};

type SkillItem = {
  id: string;
  skillName: string;
  proficiency: string;
};

type ProfileEditorData = {
  fullName: string;
  registrationNo: string;
  departmentName: string | null;
  facultyName: string | null;
  graduationYear: string | null;
  degreeClass: string | null;
  accountStatus: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  personalWebsite: string | null;
  nyscState: string | null;
  nyscYear: number | null;
  openToOpportunities: boolean;
  availableForMentorship: boolean;
  employment: EmploymentItem[];
  education: EducationItem[];
  skills: SkillItem[];
};

type ProfileEditorProps = {
  initialData: ProfileEditorData;
};

function missingFieldLabels(data: ProfileEditorData): string[] {
  const checks: Array<[string, boolean]> = [
    ["Email", Boolean(data.email)],
    ["Phone", Boolean(data.phone)],
    ["Date of Birth", Boolean(data.dateOfBirth)],
    ["Bio", Boolean(data.bio)],
    ["LinkedIn URL", Boolean(data.linkedinUrl)],
    ["Employment", data.employment.length > 0],
    ["Education", data.education.length > 0],
    ["Skills", data.skills.length > 0],
  ];
  return checks.filter(([, ok]) => !ok).map(([label]) => label);
}

export function ProfileEditor({ initialData }: ProfileEditorProps) {
  const [form, setForm] = useState<ProfileEditorData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [employmentForm, setEmploymentForm] = useState({
    jobTitle: "",
    companyName: "",
    employmentType: "FULL_TIME",
    isCurrent: false,
  });
  const [educationForm, setEducationForm] = useState({
    institution: "",
    degree: "",
    fieldOfStudy: "",
    isCurrent: false,
  });
  const [skillForm, setSkillForm] = useState({
    skillName: "",
    proficiency: "INTERMEDIATE",
  });

  const [isAddingEmployment, setIsAddingEmployment] = useState(false);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const missing = useMemo(() => missingFieldLabels(form), [form]);

  const onChange = (field: keyof ProfileEditorData, value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSave = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email ?? "",
          phone: form.phone ?? "",
          dateOfBirth: form.dateOfBirth,
          bio: form.bio,
          linkedinUrl: form.linkedinUrl,
          twitterUrl: form.twitterUrl,
          githubUrl: form.githubUrl,
          personalWebsite: form.personalWebsite,
          nyscState: form.nyscState,
          nyscYear: form.nyscYear,
          openToOpportunities: form.openToOpportunities,
          availableForMentorship: form.availableForMentorship,
        }),
      });

      const result = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(result.error ?? "Failed to update profile.");
        return;
      }

      setSuccess("Profile updated successfully.");
    } catch {
      setError("Something went wrong while updating profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const addEmployment = async () => {
    setError("");
    setSuccess("");
    setIsAddingEmployment(true);
    try {
      const res = await fetch("/api/profile/employment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employmentForm),
      });
      const result = (await res.json()) as { error?: string; employment?: EmploymentItem };
      if (!res.ok || !result.employment) {
        setError(result.error ?? "Failed to add employment.");
        return;
      }
      setForm((prev) => ({ ...prev, employment: [result.employment!, ...prev.employment] }));
      setEmploymentForm({ jobTitle: "", companyName: "", employmentType: "FULL_TIME", isCurrent: false });
      setSuccess("Employment added.");
    } catch {
      setError("Something went wrong while adding employment.");
    } finally {
      setIsAddingEmployment(false);
    }
  };

  const addEducation = async () => {
    setError("");
    setSuccess("");
    setIsAddingEducation(true);
    try {
      const res = await fetch("/api/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(educationForm),
      });
      const result = (await res.json()) as { error?: string; education?: EducationItem };
      if (!res.ok || !result.education) {
        setError(result.error ?? "Failed to add education.");
        return;
      }
      setForm((prev) => ({ ...prev, education: [result.education!, ...prev.education] }));
      setEducationForm({ institution: "", degree: "", fieldOfStudy: "", isCurrent: false });
      setSuccess("Education added.");
    } catch {
      setError("Something went wrong while adding education.");
    } finally {
      setIsAddingEducation(false);
    }
  };

  const addSkill = async () => {
    setError("");
    setSuccess("");
    setIsAddingSkill(true);
    try {
      const res = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skillForm),
      });
      const result = (await res.json()) as { error?: string; skill?: SkillItem };
      if (!res.ok || !result.skill) {
        setError(result.error ?? "Failed to add skill.");
        return;
      }
      setForm((prev) => ({ ...prev, skills: [result.skill!, ...prev.skills] }));
      setSkillForm({ skillName: "", proficiency: "INTERMEDIATE" });
      setSuccess("Skill added.");
    } catch {
      setError("Something went wrong while adding skill.");
    } finally {
      setIsAddingSkill(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className="overflow-hidden border-primary/20">
          <div className="h-24 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
          <CardContent className="space-y-3 px-6 pb-6 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{form.fullName}</h1>
              <Badge variant="secondary">{form.registrationNo}</Badge>
              <Badge variant="outline">{form.accountStatus ?? "PENDING"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {form.departmentName ?? "Department not set"} - {form.facultyName ?? "Faculty not set"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Graduation: {form.graduationYear ?? "N/A"}</Badge>
              <Badge variant="outline">Degree Class: {form.degreeClass ?? "N/A"}</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {missing.length > 0 && (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription className="text-sm">Complete your profile by adding: {missing.join(", ")}.</AlertDescription>
        </Alert>
      )}

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

      <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Keep your login and contact details up to date.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email ?? ""} onChange={(e) => onChange("email", e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone ?? ""} onChange={(e) => onChange("phone", e.target.value)} placeholder="+234..." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth ?? ""} onChange={(e) => onChange("dateOfBirth", e.target.value || null)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Profile</CardTitle>
              <CardDescription>Add links and details that improve discoverability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={form.bio ?? ""} onChange={(e) => onChange("bio", e.target.value)} placeholder="Write a short professional summary" className="min-h-28 resize-none" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input value={form.linkedinUrl ?? ""} onChange={(e) => onChange("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-2">
                  <Label>Twitter URL</Label>
                  <Input value={form.twitterUrl ?? ""} onChange={(e) => onChange("twitterUrl", e.target.value)} placeholder="https://x.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input value={form.githubUrl ?? ""} onChange={(e) => onChange("githubUrl", e.target.value)} placeholder="https://github.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Personal Website</Label>
                  <Input value={form.personalWebsite ?? ""} onChange={(e) => onChange("personalWebsite", e.target.value)} placeholder="https://your-site.com" />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>NYSC State</Label>
                  <Input value={form.nyscState ?? ""} onChange={(e) => onChange("nyscState", e.target.value)} placeholder="e.g. Lagos" />
                </div>
                <div className="space-y-2">
                  <Label>NYSC Year</Label>
                  <Input type="number" min={1980} max={2100} value={form.nyscYear ?? ""} onChange={(e) => onChange("nyscYear", e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 2024" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="size-4 text-primary" />Employment</CardTitle>
              <CardDescription>Add your current or previous roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Job title" value={employmentForm.jobTitle} onChange={(e) => setEmploymentForm((p) => ({ ...p, jobTitle: e.target.value }))} />
                <Input placeholder="Company" value={employmentForm.companyName} onChange={(e) => setEmploymentForm((p) => ({ ...p, companyName: e.target.value }))} />
                <Select value={employmentForm.employmentType} onValueChange={(value) => setEmploymentForm((p) => ({ ...p, employmentType: value }))}>
                  <SelectTrigger><SelectValue placeholder="Employment type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="SELF_EMPLOYED">Self Employed</SelectItem>
                    <SelectItem value="UNEMPLOYED">Unemployed</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between rounded-md border px-3">
                  <span className="text-sm">Current role</span>
                  <Switch checked={employmentForm.isCurrent} onCheckedChange={(v) => setEmploymentForm((p) => ({ ...p, isCurrent: v }))} />
                </div>
              </div>
              <Button onClick={addEmployment} disabled={isAddingEmployment}><Plus className="mr-2 size-4" />{isAddingEmployment ? "Adding..." : "Add Employment"}</Button>
              <div className="space-y-2">
                {form.employment.length === 0 ? <p className="text-sm text-muted-foreground">No employment added yet.</p> : form.employment.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="font-semibold">{item.jobTitle}</p>
                    <p className="text-muted-foreground">{item.companyName}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline">{item.employmentType.replace(/_/g, " ")}</Badge>
                      {item.isCurrent ? <Badge>Current</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-primary" />Education</CardTitle>
              <CardDescription>Add postgraduate or additional education.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Institution" value={educationForm.institution} onChange={(e) => setEducationForm((p) => ({ ...p, institution: e.target.value }))} />
                <Input placeholder="Degree (e.g. MSc)" value={educationForm.degree} onChange={(e) => setEducationForm((p) => ({ ...p, degree: e.target.value }))} />
                <Input className="sm:col-span-2" placeholder="Field of study" value={educationForm.fieldOfStudy} onChange={(e) => setEducationForm((p) => ({ ...p, fieldOfStudy: e.target.value }))} />
                <div className="flex items-center justify-between rounded-md border px-3 sm:col-span-2">
                  <span className="text-sm">Currently studying</span>
                  <Switch checked={educationForm.isCurrent} onCheckedChange={(v) => setEducationForm((p) => ({ ...p, isCurrent: v }))} />
                </div>
              </div>
              <Button onClick={addEducation} disabled={isAddingEducation}><Plus className="mr-2 size-4" />{isAddingEducation ? "Adding..." : "Add Education"}</Button>
              <div className="space-y-2">
                {form.education.length === 0 ? <p className="text-sm text-muted-foreground">No education added yet.</p> : form.education.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="font-semibold">{item.institution}</p>
                    <p className="text-muted-foreground">{item.degree ?? "Degree not set"}{item.fieldOfStudy ? ` - ${item.fieldOfStudy}` : ""}</p>
                    {item.isCurrent ? <Badge className="mt-1">Current</Badge> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench className="size-4 text-primary" />Skills</CardTitle>
              <CardDescription>Add core skills for search and networking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Skill name" value={skillForm.skillName} onChange={(e) => setSkillForm((p) => ({ ...p, skillName: e.target.value }))} />
                <Select value={skillForm.proficiency} onValueChange={(value) => setSkillForm((p) => ({ ...p, proficiency: value }))}>
                  <SelectTrigger><SelectValue placeholder="Proficiency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addSkill} disabled={isAddingSkill}><Plus className="mr-2 size-4" />{isAddingSkill ? "Adding..." : "Add Skill"}</Button>
              <div className="flex flex-wrap gap-2">
                {form.skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills added yet.</p> : form.skills.map((item) => (
                  <Badge key={item.id} variant="secondary">{item.skillName} ({item.proficiency})</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="size-4 text-primary" />Admin-Managed</CardTitle>
              <CardDescription>Imported academic identity fields are locked.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Registration Number</p><p className="font-semibold">{form.registrationNo}</p></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Full Name</p><p className="font-semibold">{form.fullName}</p></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Faculty / Department</p><p className="font-semibold">{form.facultyName ?? "N/A"} / {form.departmentName ?? "N/A"}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Career Preferences</CardTitle>
              <CardDescription>Control what opportunities you are open to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Open to Opportunities</p>
                  <p className="text-xs text-muted-foreground">Show recruiters that you are open to jobs.</p>
                </div>
                <Switch checked={form.openToOpportunities} onCheckedChange={(v) => onChange("openToOpportunities", v)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Available for Mentorship</p>
                  <p className="text-xs text-muted-foreground">Allow alumni to request mentorship from you.</p>
                </div>
                <Switch checked={form.availableForMentorship} onCheckedChange={(v) => onChange("availableForMentorship", v)} />
              </div>
              <Button className="w-full" onClick={onSave} disabled={isSaving}><Save className="mr-2 size-4" />{isSaving ? "Saving..." : "Save Profile"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground">
              <div className="mb-2 flex items-center gap-2"><GraduationCap className="size-3.5" /><span>Academic records are maintained by admin upload.</span></div>
              <div className="flex items-center gap-2"><BriefcaseBusiness className="size-3.5" /><span>Employment, education, and skills modules can be expanded next.</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
