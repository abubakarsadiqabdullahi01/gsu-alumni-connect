import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { csvLine } from "@/lib/csv";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Column layouts observed in the real graduation sheets ─────────────────
  //
  // LEGACY  (≤ 2012):  S/N | REG. No. | NAME | STATE | LGA | SEX | FAC | COU | CGPA | DEGREE
  // MID_ERA (2013-2019): Registration No | SURNAME | other_names | State | SEX | course_code | Jamb_number | FAC | COU
  // MODERN  (2020+):   S/N | REG.NO | NAME | SEX | LGA | STATE | FAC | COU | CGPA | CLASS
  //
  // The parser resolves columns by name variants (not position), so header
  // spelling must match at least one entry in the variant lists in excel-parser.ts.
  // ─────────────────────────────────────────────────────────────────────────

  // ── Sheet 1: MODERN template (2020-2021 onward) ───────────────────────────
  const modernHeaders = [
    "S/N",
    "REG.NO",       // matches REG_NO_V → required
    "NAME",         // matches NAME_V → required
    "SEX",          // M | F
    "LGA",
    "STATE",        // STATE_V
    "FAC",          // FACULTY_V  → AS | ED | SC | MD | PH | EP
    "COU",          // COURSE_V   → AC | BA | CS | ZO | MD | NUT | SLT …
    "CGPA",         // 0.00–5.00
    "CLASS",        // DEGREE class — see accepted values in NOTES below
  ];

  const modernSamples = [
    ["1", "UG19/ASAC/1025", "ABDULLAHI ABUBAKAR SADIQ", "M", "Akko", "GOMBE", "AS", "AC", "4.12", "2.1"],
    ["2", "UG19/SCCS/1080", "OBASANJO JOSEPH EMEKA",    "M", "Port Harcourt", "RIVERS", "SC", "CS", "3.87", "2.1"],
    ["3", "UG18/MDMD/1003", "IBRAHIM FATIMA YUSUF",     "F", "Gombe", "GOMBE", "MD", "MD", "4.68", "1"],
  ];

  // ── Sheet 2: MID_ERA template (2013–2019) ─────────────────────────────────
  const midEraHeaders = [
    "Registration No", // matches REG_NO_V → required
    "SURNAME",         // matches SURNAME_V → required (combined with other_names)
    "other_names",     // matches OTHERS_V
    "State",           // matches STATE_V
    "SEX",             // M | F
    "course_code",     // matches COURSE_V — use full dept name: ACCOUNT, COMPUTSC, etc.
    "Jamb_number",     // matches JAMB_V
    "FAC",             // FACULTY_V
    "COU",             // 2-letter dept code — parser prefers course_code but falls back here
  ];

  const midEraSamples = [
    ["UG13/ASAC/1047", "DAUDA",    "PROGRESS SUNDAY",    "GM", "M", "ACCOUNT",  "15479690GI", "AS", "AC"],
    ["UG14/SCCS/1012", "IBRAHIM",  "SADIQ UMAR",         "GM", "M", "COMPUTSC", "25196749BA", "SC", "CS"],
    ["UG12/MDNR/1008", "HASSAN",   "AISHA BELLO",        "GM", "F", "MEDICINE", "35193296FD", "MD", "NR"],
  ];

  // ── Sheet 3: LEGACY template (≤ 2012) ─────────────────────────────────────
  const legacyHeaders = [
    "S/N",
    "REG. No.",   // matches REG_NO_V → required
    "NAME",       // matches NAME_V → required
    "STATE",
    "LGA",
    "SEX",        // M | F
    "FAC",        // FACULTY_V
    "COU",        // COURSE_V
    "CGPA",
    "DEGREE",     // matches CLASS_V via "DEGREE" variant → use numeric: 1 | 2.1 | 2.2 | 3 | PASS
  ];

  const legacySamples = [
    ["1", "UG06/ASAC/1006", "MUKTAR JAMILA",         "GOM", "GOMBE", "F", "AS", "AC", "4.25", "2.1"],
    ["2", "UG08/SCBC/1021", "SABO AHMED MUSA",       "GOM", "NA-BA", "M", "SC", "BC", "4.50", "1"],
    ["3", "UG07/EDME/1015", "YUSUF BWIYANURE ALHERI","GOM", "BALAN", "F", "ED", "ME", "3.55", "2.2"],
  ];

  // ── Notes block (appended after data in each section) ─────────────────────
  const sharedNotes = [
    [""],
    ["── NOTES ──────────────────────────────────────────────────────────────"],
    ["Name the worksheet tab after the graduation year, e.g.  2023-2024  or  2019-2020"],
    ["REG.NO / Registration No is required and must be unique across all sheets."],
    [""],
    ["CLASS / DEGREE / GRADE — accepted values:"],
    ["  1           →  First Class"],
    ["  2.1         →  Second Class Upper"],
    ["  2.2         →  Second Class Lower"],
    ["  3           →  Third Class"],
    ["  PASS        →  Pass"],
    ["  (Long forms also accepted, e.g. SECOND CLASS HONOURS (UPPER DIVISION))"],
    [""],
    ["FAC codes:  AS | ED | MD | PH | SC | EP"],
    ["COU / course_code 2-letter codes:  AC BA EC EN GV HI IS PS SG PA HS IR CR"],
    ["  BC BT CH CS MC MT PY ST ZO GL GS BS SLT"],
    ["  MD ML NR NM AN HP PC NUT  |  PH  |  LW SL"],
    ["  AE BE FR GE HE LI ME PE SE ED CE RE LE IE"],
    ["Mid-era course_code full names:  ACCOUNT BUSADMIN ECONOMICS ENGLISH COMPUTSC"],
    ["  BIOCHEM BIOLOGY BOTANY CHEMISTRY MATHS MICROBIOL PHARMACY PHYSICS STATISTICS"],
    ["  ZOOLOGY GEOLOGY GEOGRAPHY MEDICINE EDUCBIOL EDUCCHEM EDUCMATHS EDUCPHY …"],
    ["SEX values:  M  or  F"],
    ["CGPA:  numeric, e.g.  4.12  (omit for mid-era sheets if unavailable)"],
    ["State / LGA:  free text — use the state/LGA name as it appears in official records"],
  ];

  // ── Assemble CSV with clearly labelled sections ────────────────────────────
  const sections: string[][] = [
    ["═══════════════════════════════════════════════════════════════════════"],
    ["SECTION 1 — MODERN FORMAT  (graduation year 2020-2021 and later)"],
    ["═══════════════════════════════════════════════════════════════════════"],
    modernHeaders,
    ...modernSamples,
    ...sharedNotes,
    [""],
    ["═══════════════════════════════════════════════════════════════════════"],
    ["SECTION 2 — MID-ERA FORMAT  (graduation years 2013-2014 to 2018-2019)"],
    ["═══════════════════════════════════════════════════════════════════════"],
    midEraHeaders,
    ...midEraSamples,
    ...sharedNotes,
    [""],
    ["═══════════════════════════════════════════════════════════════════════"],
    ["SECTION 3 — LEGACY FORMAT  (graduation year 2012-2013 and earlier)"],
    ["═══════════════════════════════════════════════════════════════════════"],
    legacyHeaders,
    ...legacySamples,
    ...sharedNotes,
  ];

  const csv = sections.map((row) => csvLine(row)).join("\n");

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="graduate-upload-template-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}