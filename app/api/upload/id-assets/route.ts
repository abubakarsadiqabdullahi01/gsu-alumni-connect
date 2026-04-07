import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3, buildPublicS3Url, extractS3KeyFromUrl, getS3BucketName } from "@/lib/S3Client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BY_ASSET: Record<AssetType, number> = {
  avatar: 2 * 1024 * 1024,
  signature: 1 * 1024 * 1024,
};

type AssetType = "avatar" | "signature";

function normalizeAssetType(value: string | null): AssetType | null {
  if (value === "avatar" || value === "signature") return value;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const assetType = normalizeAssetType(String(formData.get("assetType") ?? ""));

    if (!(file instanceof File) || !assetType) {
      return NextResponse.json({ error: "Missing file or invalid asset type." }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const maxSize = MAX_SIZE_BY_ASSET[assetType];
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum ${(maxSize / 1024 / 1024).toFixed(0)}MB allowed.` },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const key = `id-assets/${assetType}/${session.user.id}-${randomUUID()}.${extension}`;
    const bucket = getS3BucketName();

    const buffer = Buffer.from(await file.arrayBuffer());
    await S3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ContentLength: file.size,
      })
    );

    const publicUrl = buildPublicS3Url(key);

    let oldUrl: string | null = null;
    if (assetType === "avatar") {
      const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { image: true },
      });
      oldUrl = current?.image ?? null;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: publicUrl },
      });
    } else {
      const graduate = await prisma.graduate.findUnique({
        where: { userId: session.user.id },
        select: { signatureUrl: true },
      });
      if (!graduate) {
        return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
      }
      oldUrl = graduate.signatureUrl ?? null;
      await prisma.graduate.update({
        where: { userId: session.user.id },
        data: { signatureUrl: publicUrl },
      });
    }

    if (oldUrl) {
      const oldKey = extractS3KeyFromUrl(oldUrl);
      if (oldKey && oldKey !== key) {
        try {
          await S3.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: oldKey,
            })
          );
        } catch (deleteError) {
          console.error("[UploadIdAssets] Failed to delete old asset:", deleteError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      assetType,
      url: publicUrl,
      key,
    });
  } catch (error) {
    console.error("[UploadIdAssets] Error:", error);
    return NextResponse.json({ error: "Failed to upload ID asset." }, { status: 500 });
  }
}
