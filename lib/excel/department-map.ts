export const DEPARTMENT_MAP: Record<string, string> = {
  // ── Arts & Social Sciences / Arts (AS) ────────────────────────────────────
  AC:  "Accounting",
  BA:  "Business Administration",
  EC:  "Economics",
  EN:  "English Language & Literature",
  GV:  "Government & Political Science",
  HI:  "History & Diplomatic Studies",
  IS:  "Islamic Studies",
  MC:  "Mass Communication",
  PS:  "Political Science",
  SG:  "Sociology",
  SS:  "Social Science",

  // ── Education (ED) ────────────────────────────────────────────────────────
  AE:  "Agricultural Education",
  BE:  "Business Education",
  FR:  "French Education",
  GE:  "Geography Education",
  HE:  "Home Economics Education",
  IE:  "Integrated Science Education",
  LI:  "Library & Information Science",
  ME:  "Mathematics Education",
  PE:  "Physical & Health Education",
  SE:  "Science Education",
  ED:  "Education",

  // ── Medicine & Health Sciences (MD) ──────────────────────────────────────
  MD:  "Medicine & Surgery",
  ML:  "Medical Laboratory Science",
  NR:  "Nursing Science",
  NM:  "Nursing & Midwifery",
  AN:  "Anatomy",
  HP:  "Human Physiology",
  PC: "Pharmacology",
  NUT: "Nutrition & Dietetics",

  // ── Pharmacy (PH) / Pharmaceutical Sciences ───────────────────────────────
  PH:  "Pharmacy",
  PG:  "Pharmacognosy",
  PT:  "Pharmaceutics",
  // PC:  "Pharmaceutical Chemistry",
  PM:  "Pharmaceutical Microbiology",

  // ── Science (SC) ──────────────────────────────────────────────────────────
  BC:  "Biochemistry",
  BT:  "Botany",
  CH:  "Chemistry",
  CS:  "Computer Science",
  MB:  "Microbiology",
  MT:  "Mathematics",
  PY:  "Physics",
  ST:  "Statistics",
  ZO:  "Zoology",
  GL: "Geology",          // Geology
  GS: "Geography",        // Geography
  SLT: "Science Laboratory Technology",
  BI:  "Biological Sciences",

  // ── Law & Social Sciences ─────────────────────────────────────────────────
  LW:  "Law",
  SL:  "Social Law",
};

/** Return department name for a course code, falling back to the raw code. */
export function getDepartmentName(courseCode: string | undefined): string {
  if (!courseCode) return "";
  const key = courseCode.toUpperCase().trim();
  return DEPARTMENT_MAP[key] ?? courseCode;
}
