export const DEPARTMENT_MAP: Record<string, string> = {
  // ── Arts & Social Sciences (AS) ───────────────────────────────────────────
  AC:  "Accounting",
  BA:  "Business Administration",
  EC:  "Economics",
  EN:  "English Language & Literature",
  GV:  "Government & Political Science",
  HI:  "History & Diplomatic Studies",
  IS:  "Islamic Studies",
  // MC:  "Mass Communication",
  PS:  "Political Science",
  SG:  "Sociology",
  SS:  "Social Science",
  IR:  "Islamic Studies",
  CR:  "Christian Studies",
  PA:  "Public Administration",
  HS:  "History",

  // ── Education (ED) ────────────────────────────────────────────────────────
  AE:  "Agricultural Education",
  BE:  "Biology Education",
  FR:  "French Education",
  GE:  "Education Geology",
  HE:  "Education History",
  LI:  "Library & Information Science",
  ME:  "Mathematics Education",
  PE:  "Education Physics",
  SE:  "Science Education",
  ED:  "Education",
  CE:  "Chemistry Education",
  RE:  "Education Christian Studies",
  LE:  "Education English",
  IE: "Education Islamic Studies",

  // ── Medicine & Health Sciences (MD) ──────────────────────────────────────
  MD:  "Medicine",
  ML:  "Medical Laboratory Science",
  NR:  "Nursing Science",
  NM:  "Nursing & Midwifery",
  AN:  "Anatomy",
  HP:  "Human Physiology",
  PC:  "Pharmacology",
  NUT: "Nutrition & Dietetics",

  // ── Pharmacy (PH) ─────────────────────────────────────────────────────────
  PH:  "Pharmacy",

  // ── Science (SC) ──────────────────────────────────────────────────────────
  BC:  "Biochemistry",
  BT:  "Botany",
  CH:  "Chemistry",
  CS:  "Computer Science",
  MC:  "Microbiology",
  MT:  "Mathematics",
  PY:  "Physics",
  ST:  "Statistics",
  ZO:  "Zoology",
  GL:  "Geology",
  GS:  "Geography",
  SLT: "Science Laboratory Technology",
  BS:  "Biological Sciences",

  // ── Law ───────────────────────────────────────────────────────────────────
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

/**
 * Mid-era sheets (2013–2019) store full department names in the course_code
 * column instead of 2-letter codes (e.g. "ACCOUNT", "COMPUT-SC", "EDUC-MATHS").
 * This map normalises those values to the canonical department name.
 */
const MID_ERA_COURSE_NAME_MAP: Record<string, string> = {
  ACCOUNT:    "Accounting",
  BUSADMIN:   "Business Administration",
  ECONOMICS:  "Economics",
  ENGLISH:    "English Language & Literature",
  POLITSC:    "Political Science",
  HISTORY:    "History & Diplomatic Studies",
  ISLAMSTUD:  "Islamic Studies",
  SOCIOLOGY:  "Sociology",
  PUBLICADM:  "Public Administration",
  CHRISSTUD:  "Christian Religion",
  EDCSTUD:    "Education",           // "ED-C-STUD" — general Christian Studies Education
  EDUCRK:     "Religious Education", // "EDU-CRK"
  EDUIRK:     "Islamic Education",   // "EDU-IRK"
  EDUCBIOL:   "Biology Education",
  EDUCCHEM:   "Chemistry Education",
  EDUCECON:   "Economics",           // Economics Education track
  EDUCENG:    "Language Education",
  EDUCGEO:    "Geography Education",
  EDUCHIST:   "History & Diplomatic Studies",
  EDUCMATHS:  "Mathematics Education",
  EDUCPHY:    "Physical & Health Education",
  BIOCHEM:    "Biochemistry",
  BIOLOGY:    "Biological Sciences",
  BOTANY:     "Botany",
  BUILDTECH:  "Science Laboratory Technology", // closest match; update if a dedicated code exists
  CHEMISTRY:  "Chemistry",
  COMPUTSC:   "Computer Science",
  GEOGRAPHY:  "Geography",
  GEOLOGY:    "Geology",
  MATHS:      "Mathematics",
  MEDICINE:   "Medicine & Surgery",
  MICROBIOL:  "Microbiology",
  PHARMACY:   "Pharmacy",
  PHYSICS:    "Physics",
  STATISTICS: "Statistics",
  ZOOLOGY:    "Zoology",
};

/** Collapse a raw string to uppercase letters only (strips hyphens, spaces, etc.). */
function lettersOnly(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Return department name for a course code.
 *
 * Resolution order:
 *  1. Direct 2-or-3-letter code match (e.g. "CS", "NUT", "SLT").
 *  2. Combined faculty+department code from the reg-no token (e.g. "SCCS" → "CS").
 *  3. Mid-era full department name (e.g. "COMPUT-SC", "EDUC-MATHS").
 *  4. Fall back to the raw value — never guess via substring matching.
 *
 * NOTE: The old suffix-based fallback (`key.slice(-2)` / `key.slice(-3)`) has been
 * removed because it caused silent wrong assignments, e.g.:
 *   "ECONOMICS" → last 2 chars "CS" → "Computer Science"  ✗
 *   "MATHS"     → last 2 chars "HS" → "History"            ✗
 *   "PHYSICS"   → last 2 chars "CS" → "Computer Science"  ✗
 */
export function getDepartmentName(courseCode: string | undefined): string {
  if (!courseCode) return "";
  const raw = courseCode.trim();
  if (!raw) return "";

  const key = lettersOnly(raw);
  if (!key) return "";

  // 1. Direct code match (CS, NUT, SLT, MD, …)
  if (DEPARTMENT_MAP[key]) return DEPARTMENT_MAP[key];

  // 2. Combined faculty+dept code (e.g. "SCCS" → slice(2) = "CS")
  if (key.length > 2) {
    const deptSuffix = key.slice(2);
    if (DEPARTMENT_MAP[deptSuffix]) return DEPARTMENT_MAP[deptSuffix];
  }

  // 3. Mid-era full department name lookup
  if (MID_ERA_COURSE_NAME_MAP[key]) return MID_ERA_COURSE_NAME_MAP[key];

  // 4. Return the raw value unchanged — never guess
  return raw;
}

export function getFacultyName(facultyCode: string | undefined): string {
  if (!facultyCode) return "";
  const key = lettersOnly(facultyCode);
  return FACULTY_MAP[key] ?? facultyCode;
}

export function extractProgramCodesFromRegistrationNo(registrationNo: string): {
  facultyCode?: string;
  courseCode?: string;
} {
  const normalized = registrationNo.trim().toUpperCase().replace(/\s+/g, "");
  const token = normalized.split("/")[1] ?? "";
  const letters = lettersOnly(token);

  if (letters.length < 2) return {};

  const facultyCode = letters.slice(0, 2);
  const courseCode = letters.slice(2) || undefined;

  return { facultyCode, courseCode };
}