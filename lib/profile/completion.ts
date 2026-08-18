import { prisma } from "@/lib/db";

/**
 * Backend-calculated profile completion.
 *
 * Computed here rather than in each client so web and mobile always agree on
 * what "complete" means, and so the friendly prompts stay in one place instead
 * of being re-worded per platform.
 */
export type CompletionSection = {
  key: string;
  label: string;
  weight: number;
  done: boolean;
  /** Shown when the section is outstanding. Written as an invitation, not a scold. */
  prompt: string;
  href: string;
};

export type ProfileCompletion = {
  percent: number;
  sections: CompletionSection[];
  /** Highest-weight outstanding section: the single thing most worth doing next. */
  nextBestAction: CompletionSection | null;
};

/** A bio of a few words reads as skipped rather than written. */
const MIN_BIO_LENGTH = 40;
const MIN_SKILLS = 3;

export async function getProfileCompletion(userId: string): Promise<ProfileCompletion | null> {
  const graduate = await prisma.graduate.findUnique({
    where: { userId },
    select: {
      bio: true,
      sex: true,
      dateOfBirth: true,
      stateOfOrigin: true,
      lga: true,
      signatureUrl: true,
      showInDirectory: true,
      user: { select: { image: true, email: true, phone: true } },
      _count: { select: { employment: true, education: true, skills: true } },
    },
  });

  if (!graduate) return null;

  const sections: CompletionSection[] = [
    {
      key: "employment",
      label: "Work experience",
      weight: 20,
      done: graduate._count.employment > 0,
      prompt: "Add your current job to improve alumni discovery.",
      href: "/profile",
    },
    {
      key: "basics",
      label: "Personal details",
      weight: 15,
      done: Boolean(
        graduate.sex && graduate.dateOfBirth && graduate.stateOfOrigin && graduate.lga
      ),
      prompt: "Add your date of birth and home state so classmates can place you.",
      href: "/profile",
    },
    {
      key: "photo",
      label: "Profile photo",
      weight: 15,
      done: Boolean(graduate.user?.image),
      prompt: "Add a profile photo — alumni with photos get far more connection requests.",
      href: "/profile",
    },
    {
      key: "bio",
      label: "About you",
      weight: 10,
      done: (graduate.bio?.trim().length ?? 0) >= MIN_BIO_LENGTH,
      prompt: "Write a short bio so other alumni know what you do now.",
      href: "/profile",
    },
    {
      key: "contact",
      label: "Contact details",
      weight: 10,
      done: Boolean(graduate.user?.email && graduate.user?.phone),
      prompt: "Confirm your email and phone so the association can reach you.",
      href: "/settings",
    },
    {
      key: "education",
      label: "Further education",
      weight: 10,
      done: graduate._count.education > 0,
      prompt: "Add any study you completed after GSU.",
      href: "/profile",
    },
    {
      key: "skills",
      label: "Skills",
      weight: 10,
      done: graduate._count.skills >= MIN_SKILLS,
      prompt: `List at least ${MIN_SKILLS} skills so you show up when alumni search by expertise.`,
      href: "/profile",
    },
    {
      key: "idCard",
      label: "Digital ID card",
      weight: 5,
      done: Boolean(graduate.signatureUrl && graduate.user?.image),
      prompt: "Upload your signature to finish your digital ID card.",
      href: "/id-card",
    },
    {
      key: "discoverable",
      label: "Directory visibility",
      weight: 5,
      done: graduate.showInDirectory,
      prompt: "Turn on directory visibility so other alumni can find you.",
      href: "/settings",
    },
  ];

  const earned = sections.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0);
  const available = sections.reduce((sum, s) => sum + s.weight, 0);

  // Sections are declared in weight order, so the first outstanding one is the heaviest.
  const nextBestAction = sections.find((s) => !s.done) ?? null;

  return {
    percent: available > 0 ? Math.round((earned / available) * 100) : 0,
    sections,
    nextBestAction,
  };
}
