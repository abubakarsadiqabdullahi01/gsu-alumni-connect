import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { S3, buildPublicS3Url, getS3BucketName } from "@/lib/S3Client";

const ALLOWED_EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const MAX_IMPORT_FILE_SIZE = 40 * 1024 * 1024; // 40MB

function normalizeExtension(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "xls" || ext === "xlsx" ? ext : null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    const ext = normalizeExtension(file.name);
    if (!ext) {
      return NextResponse.json(
        { error: "Invalid file extension. Allowed: .xlsx, .xls" },
        { status: 400 }
      );
    }

    if (file.type && !ALLOWED_EXCEL_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXCEL_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum ${(MAX_IMPORT_FILE_SIZE / 1024 / 1024).toFixed(0)}MB allowed.` },
        { status: 400 }
      );
    }

    const key = `imports/${session.user.id}/${Date.now()}-${randomUUID()}.${ext}`;
    const bucket = getS3BucketName();
    const buffer = Buffer.from(await file.arrayBuffer());

    await S3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType:
          file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ContentLength: file.size,
      })
    );

    return NextResponse.json({
      success: true,
      url: buildPublicS3Url(key),
      key,
      size: file.size,
      name: file.name,
    });
  } catch (error) {
    console.error("[UploadImportFile] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload import file." },
      { status: 500 }
    );
  }
}
