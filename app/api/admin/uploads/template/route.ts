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

  const headers = [
    "REG.NO",
    "SURNAME",
    "OTHER_NAMES",
    "SEX",
    "STATE OF ORIGIN",
    "LGA",
    "FACULTY",
    "COU",
    "CLASS",
    "CGPA",
    "JAMB NUMBER",
  ];

  const sampleRows = [
    [
      "UG19/ASAC/1025",
      "ABDULLAHI",
      "ABUBAKAR SADIQ",
      "M",
      "GOMBE",
      "AKKO",
      "AS",
      "AC",
      "SECOND_CLASS_UPPER",
      "4.12",
      "JAMB/2015/000001",
    ],
    [
      "UG18/SCZO/1080",
      "OBASIYA",
      "JOSEPH",
      "M",
      "RIVERS",
      "PORT HARCOURT",
      "SC",
      "ZO",
      "FIRST_CLASS",
      "4.68",
      "JAMB/2014/000002",
    ],
  ];

  const notes = [
    ["NOTES"],
    ["Use one worksheet per graduation year (e.g. 2019-2020)."],
    ["REG.NO is required and must be unique."],
    ["CLASS accepted values: FIRST_CLASS, SECOND_CLASS_UPPER, SECOND_CLASS_LOWER, THIRD_CLASS, PASS."],
    ["SEX values: M or F."],
  ];

  const csv = [
    csvLine(headers),
    ...sampleRows.map((row) => csvLine(row)),
    "",
    ...notes.map((row) => csvLine(row)),
  ].join("\n");

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="graduate-upload-template-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
