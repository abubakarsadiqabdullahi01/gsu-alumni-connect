import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { S3, extractS3KeyFromUrl, getS3BucketName } from "@/lib/S3Client";

/**
 * Deletes a member's account and everything they added, keeping only the
 * University's academic record — as /delete-account and the privacy policy
 * promise.
 *
 * Graduate.userId is required and cascades, so the record cannot simply be
 * detached. Instead: copy the imported fields, delete the user (which cascades
 * the graduate and all their content), then re-create the record under a
 * placeholder user that is SUSPENDED, has no password, and is hidden. The
 * reset script only touches defaultPassword=true users, so the placeholder
 * stays locked until the Secretariat deliberately sets it up again.
 */
export async function deleteAccount(userId: string): Promise<{ registrationNo: string | null; filesRemoved: number }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      registrationNo: true,
      image: true,
      graduate: {
        select: {
          // Imported from the University's graduation records ([EXCEL] in the schema).
          registrationNo: true,
          fullName: true,
          surname: true,
          otherNames: true,
          sex: true,
          stateOfOrigin: true,
          lga: true,
          facultyCode: true,
          facultyName: true,
          courseCode: true,
          departmentName: true,
          cgpa: true,
          degreeClass: true,
          graduationYear: true,
          entryYear: true,
          jambNumber: true,
          sourceSheet: true,
          createdAt: true,
          // Files to remove from storage.
          signatureUrl: true,
          groupPosts: { where: { imageUrl: { not: null } }, select: { imageUrl: true } },
          sentMessages: { where: { fileUrl: { not: null } }, select: { fileUrl: true } },
          jobApplications: { where: { cvUrl: { not: null } }, select: { cvUrl: true } },
          // Auto-groups (cohort, department, faculty, state) come from the record itself.
          groupMemberships: { where: { group: { isAuto: true } }, select: { groupId: true } },
        },
      },
    },
  });

  const g = user.graduate;
  const fileUrls = [
    user.image,
    g?.signatureUrl,
    ...(g?.groupPosts.map((p) => p.imageUrl) ?? []),
    ...(g?.sentMessages.map((m) => m.fileUrl) ?? []),
    ...(g?.jobApplications.map((a) => a.cvUrl) ?? []),
  ].filter((u): u is string => Boolean(u));

  await prisma.$transaction(
    async (tx) => {
      await tx.user.delete({ where: { id: userId } });
      if (!g) return;

      const { signatureUrl, groupPosts, sentMessages, jobApplications, groupMemberships, ...record } = g;
      void signatureUrl; void groupPosts; void sentMessages; void jobApplications;

      const placeholder = await tx.user.create({
        data: {
          name: record.fullName,
          registrationNo: record.registrationNo,
          email: null,
          accountStatus: "SUSPENDED",
          defaultPassword: false,
        },
      });
      const kept = await tx.graduate.create({
        data: {
          ...record,
          userId: placeholder.id,
          showInDirectory: false,
          allowMessages: false,
          showActivityFeed: false,
        },
      });
      if (groupMemberships.length) {
        await tx.groupMember.createMany({
          data: groupMemberships.map(({ groupId }) => ({ groupId, graduateId: kept.id })),
          skipDuplicates: true,
        });
      }
    },
    { timeout: 30_000 }
  );

  return { registrationNo: g?.registrationNo ?? user.registrationNo, filesRemoved: await removeFiles(fileUrls) };
}

/** Best effort: the account is already gone, so a storage hiccup only leaves an orphaned file. */
async function removeFiles(urls: string[]): Promise<number> {
  const keys = [...new Set(urls.map(extractS3KeyFromUrl).filter((k): k is string => Boolean(k)))];
  if (!keys.length) return 0;
  try {
    await S3.send(
      new DeleteObjectsCommand({
        Bucket: getS3BucketName(),
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      })
    );
    return keys.length;
  } catch (error) {
    console.error("[account-deletion] could not remove files", keys.length, error);
    return 0;
  }
}
