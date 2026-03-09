import * as XLSX from "xlsx";
import { getDepartmentName } from "./department-map";

// ── Era detection ──────────────────────────────────────────────────────────────
export type Era = "LEGACY" | "MID_ERA" | "MODERN";

// ── Column name variant maps ───────────────────────────────────────────────────
const REG_NO_V    = ["REG.NO","REG. NO","REG. No.","REGISTRATION NO","REGNO","REG NO","REG.NO."];
const NAME_V      = ["NAME","FULL NAME","FULLNAME","FULL_NAME"];
const SURNAME_V   = ["SURNAME","SUR NAME","SURENAME"];
const OTHERS_V    = ["OTHER_NAMES","OTHER NAMES","OTHERNAMES","OTHER NAME","OTHERNAME"];
const CLASS_V     = ["CLASS","GRADE","CLASS OF DEGREE","DEGREE","DEGREE CLASS","CLASS OF DEGREE"];
const COURSE_V    = ["COU","DEPT","COURSE_CODE","COURSE CODE","COURSE","CODE","COURSECODE"];
const SEX_V       = ["SEX","GENDER","SEX/GENDER"];
const STATE_V     = ["STATE","STATE OF ORIGIN","STATE_OF_ORIGIN","STATEOFORIGIN"];
const LGA_V       = ["LGA","L.G.A","LOCAL GOVT","LOCAL GOVERNMENT","LGA."];
const CGPA_V      = ["CGPA","GPA","CUMULATIVE GPA"];
const FACULTY_V   = ["FACULTY","FAC","FACULTY CODE","FACULTY_CODE"];
const JAMB_V      = ["JAMB","JAMB NUMBER","JAMB NO","JAMBNO","JAMB_NO"];

// ── Degree class normalisation ─────────────────────────────────────────────────
const DEGREE_MAP: Record<string, string> = {
  "1":                                              "FIRST_CLASS",
  "FIRST CLASS":                                    "FIRST_CLASS",
  "FIRST CLASS HONOURS":                            "FIRST_CLASS",
  "WITH FIRST CLASS HONOURS":                       "FIRST_CLASS",
  "2.1":                                            "SECOND_CLASS_UPPER",
  "SECOND CLASS UPPER":                             "SECOND_CLASS_UPPER",
  "2ND CLASS UPPER":                                "SECOND_CLASS_UPPER",
  "SECOND CLASS HONOURS (UPPER DIVISION)":          "SECOND_CLASS_UPPER",
  "WITH SECOND CLASS HONOURS (UPPER DIVISION)":     "SECOND_CLASS_UPPER",
  "2.2":                                            "SECOND_CLASS_LOWER",
  "SECOND CLASS LOWER":                             "SECOND_CLASS_LOWER",
  "2ND CLASS LOWER":                                "SECOND_CLASS_LOWER",
  "SECOND CLASS HONOURS (LOWER DIVISION)":          "SECOND_CLASS_LOWER",
  "WITH SECOND CLASS HONOURS (LOWER DIVISION)":     "SECOND_CLASS_LOWER",
  "3":                                              "THIRD_CLASS",
  "THIRD CLASS":                                    "THIRD_CLASS",
  "WITH THIRD CLASS HONOURS":                       "THIRD_CLASS",
  "PASS":                                           "PASS",
};

// ── Faculty lookup ─────────────────────────────────────────────────────────────
const FACULTY_MAP: Record<string, string> = {
  AS: "Arts & Social Sciences",
  ED: "Education",
  MD: "Medicine",
  PH: "Pharmacy",
  SC: "Science",
};

// ── Public types ───────────────────────────────────────────────────────────────
export interface ParsedRow {
  registrationNo: string;
  fullName: string;
  surname?: string;
  otherNames?: string;
  sex?: string;
  stateOfOrigin?: string;
  lga?: string;
  facultyCode?: string;
  facultyName?: string;
  courseCode?: string;
  departmentName?: string;
  cgpa?: number | null;
  degreeClass?: string;
  jambNumber?: string;
  sourceSheet: string;
  era: Era;
  rowIndex: number;
}

export interface SheetParseResult {
  sheetName: string;
  era: Era;
  rows: ParsedRow[];
  errors: Array<{ row: number; reason: string }>;
  duplicatesInSheet: string[];
  totalRows: number;
  validRows: number;
}

export interface FileParseResult {
  fileName: string;
  fileSize: number;
  sheets: SheetParseResult[];
  totalRecords: number;
  duplicateRegNos: string[];
  warnings: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function detectEra(sheetName: string): Era {
  const year = parseInt(sheetName.split("-")[0], 10);
  if (year >= 2009 && year <= 2012) return "LEGACY";
  if (year >= 2013 && year <= 2019) return "MID_ERA";
  return "MODERN";
}

function findCol(headers: string[], variants: string[]): string | undefined {
  const upper = variants.map((v) => v.toUpperCase().trim());
  return headers.find((h) => upper.includes(h.toUpperCase().trim()));
}

function normaliseRegNo(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function normaliseDegreeClass(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase();
  return DEGREE_MAP[s] ?? String(raw ?? "").trim();
}

function normaliseName(raw: unknown): string {
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

// ── Sheet parser ───────────────────────────────────────────────────────────────
function parseSheet(ws: XLSX.WorkSheet, sheetName: string): SheetParseResult {
  const era = detectEra(sheetName);
  const rows: ParsedRow[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const seenInSheet = new Set<string>();
  const duplicatesInSheet: string[] = [];

  // LEGACY sheets have 3 header rows to skip
  const skipRows = era === "LEGACY" ? 3 : 0;

  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
    range: skipRows,
  });

  if (raw.length < 2) {
    return { sheetName, era, rows, errors, duplicatesInSheet, totalRows: 0, validRows: 0 };
  }

  const headers = (raw[0] as unknown[]).map((h) => String(h ?? "").trim());
  const dataRows = raw.slice(1) as unknown[][];

  // Locate columns once
  const regNoCol   = findCol(headers, REG_NO_V);
  const nameCol    = findCol(headers, NAME_V);
  const surnameCol = findCol(headers, SURNAME_V);
  const othersCol  = findCol(headers, OTHERS_V);
  const classCol   = findCol(headers, CLASS_V);
  const courseCol  = findCol(headers, COURSE_V);
  const sexCol     = findCol(headers, SEX_V);
  const stateCol   = findCol(headers, STATE_V);
  const lgaCol     = findCol(headers, LGA_V);
  const cgpaCol    = findCol(headers, CGPA_V);
  const facultyCol = findCol(headers, FACULTY_V);
  const jambCol    = findCol(headers, JAMB_V);

  let totalRows = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i];
    const rowNum = i + 2 + skipRows;

    // Build header→value map
    const r: Record<string, string> = {};
    headers.forEach((h, idx) => { r[h] = String(cells[idx] ?? "").trim(); });

    const regNo = normaliseRegNo(regNoCol ? r[regNoCol] : "");
    if (!regNo) continue; // truly empty row
    totalRows++;

    if (regNo.length < 5) {
      errors.push({ row: rowNum, reason: `Invalid registration number: "${regNo}"` });
      continue;
    }

    // Within-sheet duplicate detection
    if (seenInSheet.has(regNo)) {
      duplicatesInSheet.push(regNo);
    }
    seenInSheet.add(regNo);

    // Build full name
    let fullName = "";
    if (nameCol && r[nameCol]) {
      fullName = normaliseName(r[nameCol]);
    } else {
      const sn = surnameCol ? normaliseName(r[surnameCol]) : "";
      const on = othersCol  ? normaliseName(r[othersCol])  : "";
      fullName = [sn, on].filter(Boolean).join(" ");
    }

    if (!fullName) {
      errors.push({ row: rowNum, reason: `Missing name for ${regNo}` });
      continue;
    }

    // Faculty code from reg no pattern UG{YY}/{FAC_CODE}{DEPT}/{NUM}
    const facFromRegNo = regNo.split("/")[1]?.replace(/[^A-Z]/gi, "").substring(0, 2).toUpperCase() ?? "";
    const facultyCode = (facultyCol ? r[facultyCol] : "") || facFromRegNo;
    const facultyName = FACULTY_MAP[facultyCode] ?? facultyCode;

    // CGPA
    let cgpa: number | null = null;
    if (cgpaCol && r[cgpaCol]) {
      const n = parseFloat(r[cgpaCol]);
      cgpa = isNaN(n) ? null : n;
    }

    rows.push({
      registrationNo: regNo,
      fullName,
      surname:       surnameCol ? r[surnameCol] : undefined,
      otherNames:    othersCol  ? r[othersCol]  : undefined,
      sex:           sexCol     ? r[sexCol]?.toUpperCase().charAt(0) : undefined,
      stateOfOrigin: stateCol   ? r[stateCol]   : undefined,
      lga:           lgaCol     ? r[lgaCol]      : undefined,
      facultyCode,
      facultyName,
      courseCode:    courseCol  ? r[courseCol]   : undefined,
      departmentName: getDepartmentName(courseCol ? r[courseCol] : undefined),
      cgpa,
      degreeClass:   classCol   ? normaliseDegreeClass(r[classCol]) : undefined,
      jambNumber:    jambCol    ? r[jambCol]     : undefined,
      sourceSheet: sheetName,
      era,
      rowIndex: rowNum,
    });
  }

  return {
    sheetName,
    era,
    rows,
    errors,
    duplicatesInSheet,
    totalRows,
    validRows: rows.length,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function parseExcelFile(file: File): Promise<FileParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheets: SheetParseResult[] = [];
  const allRegNos: string[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    // Only process graduation-year sheets (e.g. "2023-2024" or "2009")
    if (!/\d{4}/.test(sheetName)) {
      warnings.push(`Sheet "${sheetName}" skipped — not a graduation-year format`);
      continue;
    }
    const result = parseSheet(workbook.Sheets[sheetName], sheetName);
    sheets.push(result);
    allRegNos.push(...result.rows.map((r) => r.registrationNo));
  }

  // Cross-sheet duplicates
  const counts: Record<string, number> = {};
  allRegNos.forEach((rn) => { counts[rn] = (counts[rn] ?? 0) + 1; });
  const duplicateRegNos = Object.entries(counts)
    .filter(([, n]) => n > 1)
    .map(([rn]) => rn);

  if (duplicateRegNos.length > 0) {
    warnings.push(
      `${duplicateRegNos.length} registration number${duplicateRegNos.length > 1 ? "s" : ""} appear in multiple sheets and will be placed in the Admin Review Queue.`
    );
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    sheets,
    totalRecords: allRegNos.length,
    duplicateRegNos,
    warnings,
  };
}
