import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateAdminSettings } from "@/lib/platform-settings";

/**
 * Single start-up call for the Android client.
 *
 * The web app resolves feature flags, identity and badge counts across several
 * server components. A mobile client cannot do that, so this endpoint folds the
 * whole "what should the shell render?" question into one round trip.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOrCreateAdminSettings();

    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        fullName: true,
        registrationNo: true,
        departmentName: true,
        facultyName: true,
        graduationYear: true,
        degreeClass: true,
        profileCompleted: true,
        allowMessages: true,
        user: {
          select: {
            image: true,
            email: true,
            accountStatus: true,
            defaultPassword: true,
          },
        },
      },
    });

    if (!graduate) {
      return NextResponse.json(
        { error: "Graduate profile not found." },
        { status: 404 }
      );
    }

    const [unreadNotifications, pendingConnections, participantRows] =
      await Promise.all([
        prisma.notification.count({
          where: { graduateId: graduate.id, isRead: false },
        }),
        prisma.connection.count({
          where: { receiverId: graduate.id, status: "PENDING" },
        }),
        prisma.conversationParticipant.findMany({
          where: { graduateId: graduate.id },
          select: { conversationId: true, lastReadAt: true },
        }),
      ]);

    let unreadMessages = 0;
    if (participantRows.length) {
      const counts = await Promise.all(
        participantRows.map((row) =>
          prisma.message.count({
            where: {
              conversationId: row.conversationId,
              senderId: { not: graduate.id },
              isDeleted: false,
              ...(row.lastReadAt ? { createdAt: { gt: row.lastReadAt } } : {}),
            },
          })
        )
      );
      unreadMessages = counts.reduce((sum, value) => sum + value, 0);
    }

    return NextResponse.json({
      platform: {
        name: settings.platformName,
        supportEmail: settings.supportEmail,
        welcomeMessage: settings.welcomeMessage,
      },
      features: {
        jobBoard: settings.featureJobBoard,
        mentorship: settings.featureMentorship,
        messaging: settings.featureMessaging,
        map: settings.featureMap,
        groups: settings.featureGroups,
        skills: settings.featureSkills,
      },
      identity: {
        graduateId: graduate.id,
        userId: session.user.id,
        fullName: graduate.fullName,
        registrationNo: graduate.registrationNo,
        email: graduate.user.email,
        avatarUrl: graduate.user.image,
        departmentName: graduate.departmentName,
        facultyName: graduate.facultyName,
        graduationYear: graduate.graduationYear,
        degreeClass: graduate.degreeClass,
        accountStatus: graduate.user.accountStatus,
        role: session.user.role ?? "user",
        profileCompleted: graduate.profileCompleted,
        mustChangePassword: graduate.user.defaultPassword === true,
        allowMessages: graduate.allowMessages,
      },
      badges: {
        notifications: unreadNotifications,
        messages: unreadMessages,
        connectionRequests: pendingConnections,
      },
    });
  } catch (error) {
    console.error("[MobileBootstrap] Error:", error);
    return NextResponse.json(
      { error: "Failed to load application bootstrap." },
      { status: 500 }
    );
  }
}
