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
  IR:  "Islamic Religion",
  CR:  "Cristian Religion",
  PA: "Public Administration",
  HS: "History",

  // ── Education (ED) ────────────────────────────────────────────────────────
  AE:  "Agricultural Education",
  BE:  "Biology Education",
  FR:  "French Education",
  GE:  "Geography Education",
  HE:  "Home Economics Education",
  IE:  "Islamic Education",
  LI:  "Library & Information Science",
  ME:  "Mathematics Education",
  PE:  "Physical & Health Education",
  SE:  "Science Education",
  ED:  "Education",
  CE:  "Chemistry Education",
  RE:  "Religious Education",
  LE:  "Language Education",

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
  // PG:  "Pharmacognosy",
  // PT:  "Pharmaceutics",
  // PM:  "Pharmaceutical Microbiology",

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
  BS:  "Biological Sciences",

  // ── Law & Social Sciences ─────────────────────────────────────────────────
  LW:  "Law",
  SL:  "Social Law",
};

export const FACULTY_MAP: Record<string, string> = {
  AS: "Arts & Social Sciences",
  ED: "Education",
  MD: "Medicine",
  PH: "Pharmacy",
  SC: "Science",
  EP: "Entrepreneurship & Professional Studies",
};

/** Return department name for a course code, falling back to the raw code. */
export function getDepartmentName(courseCode: string | undefined): string {
  if (!courseCode) return "";
  const key = courseCode.toUpperCase().trim().replace(/[^A-Z]/g, "");
  if (!key) return "";

  // Direct match (e.g. CS, GS, NUT, SLT)
  if (DEPARTMENT_MAP[key]) {
    return DEPARTMENT_MAP[key];
  }

  // Handle combined faculty+department codes from sheets (e.g. SCGS, SCCS, SCNUT)
  if (key.length > 2) {
    const withoutFacultyPrefix = key.slice(2);
    if (DEPARTMENT_MAP[withoutFacultyPrefix]) {
      return DEPARTMENT_MAP[withoutFacultyPrefix];
    }
  }

  // Last-resort suffix match for malformed combined values.
  for (const len of [3, 2]) {
    if (key.length > len) {
      const suffix = key.slice(-len);
      if (DEPARTMENT_MAP[suffix]) {
        return DEPARTMENT_MAP[suffix];
      }
    }
  }

  return courseCode.trim();
}

export function getFacultyName(facultyCode: string | undefined): string {
  if (!facultyCode) return "";
  const key = facultyCode.toUpperCase().trim().replace(/[^A-Z]/g, "");
  return FACULTY_MAP[key] ?? facultyCode;
}

export function extractProgramCodesFromRegistrationNo(registrationNo: string): {
  facultyCode?: string;
  courseCode?: string;
} {
  const normalized = registrationNo.trim().toUpperCase().replace(/\s+/g, "");
  const token = normalized.split("/")[1] ?? "";
  const lettersOnly = token.replace(/[^A-Z]/g, "");

  if (lettersOnly.length < 2) {
    return {};
  }

  const facultyCode = lettersOnly.slice(0, 2);
  const courseCode = lettersOnly.slice(2) || undefined;

  return { facultyCode, courseCode };
}
