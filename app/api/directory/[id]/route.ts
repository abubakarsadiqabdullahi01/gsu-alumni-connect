import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

/**
 * A single alumnus, as another member is allowed to see them.
 *
 * Placed under /api/directory rather than /api/profile/{id} because
 * /api/profile already owns the signed-in member's own record and has a static
 * `completion` child; a sibling dynamic segment there would be a standing
 * source of routing confusion.
 *
 * Every per-field privacy toggle on the Graduate record is honoured here rather
 * than in the client, so a hidden phone number is genuinely absent from the
 * payload instead of merely unrendered.
 */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;

    const viewer = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const graduate = await prisma.graduate.findFirst({
      where: {
        id,
        showInDirectory: true,
        user: { accountStatus: "ACTIVE" },
      },
      select: {
        id: true,
        fullName: true,
        registrationNo: true,
        departmentName: true,
        facultyName: true,
        graduationYear: true,
        degreeClass: true,
        bio: true,
        stateOfOrigin: true,
        lga: true,
        linkedinUrl: true,
        twitterUrl: true,
        githubUrl: true,
        personalWebsite: true,
        nyscState: true,
        nyscYear: true,
        profileViews: true,
        openToOpportunities: true,
        availableForMentorship: true,
        allowMessages: true,
        showEmail: true,
        showPhone: true,
        showDob: true,
        showCgpa: true,
        cgpa: true,
        dateOfBirth: true,
        user: { select: { image: true, email: true, phone: true, lastSeenAt: true } },
        employment: {
          orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            industry: true,
            employmentType: true,
            city: true,
            state: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
          },
        },
        education: {
          orderBy: { endYear: "desc" },
          select: {
            id: true,
            institution: true,
            degree: true,
            fieldOfStudy: true,
            startYear: true,
            endYear: true,
            isCurrent: true,
          },
        },
        skills: {
          select: {
            id: true,
            skillName: true,
            proficiency: true,
            _count: { select: { endorsements: true } },
          },
        },
        achievements: {
          // Unverified achievements are self-asserted, so only the vetted ones
          // are shown to other members.
          where: { verified: true },
          orderBy: { year: "desc" },
          select: { id: true, title: true, description: true, year: true, verifiedAt: true },
        },
        badges: {
          orderBy: { awardedAt: "desc" },
          select: { id: true, badgeType: true, awardedAt: true },
        },
      },
    });

    if (!graduate) {
      return NextResponse.json({ error: "Alumnus not found." }, { status: 404 });
    }

    const isSelf = viewer?.id === graduate.id;

    // Either direction counts: a connection is mutual once accepted.
    const connection = viewer
      ? await prisma.connection.findFirst({
          where: {
            OR: [
              { requesterId: viewer.id, receiverId: graduate.id },
              { requesterId: graduate.id, receiverId: viewer.id },
            ],
          },
          select: { status: true, requesterId: true },
        })
      : null;

    return NextResponse.json({
      id: graduate.id,
      fullName: graduate.fullName,
      registrationNo: graduate.registrationNo,
      departmentName: graduate.departmentName,
      facultyName: graduate.facultyName,
      graduationYear: graduate.graduationYear,
      degreeClass: graduate.degreeClass,
      bio: graduate.bio,
      stateOfOrigin: graduate.stateOfOrigin,
      lga: graduate.lga,
      avatarUrl: graduate.user?.image ?? null,
      profileViews: graduate.profileViews,
      lastSeenAt: graduate.user?.lastSeenAt?.toISOString() ?? null,

      // Present only when the owner opted in, or when you are looking at yourself.
      email: isSelf || graduate.showEmail ? graduate.user?.email ?? null : null,
      phone: isSelf || graduate.showPhone ? graduate.user?.phone ?? null : null,
      dateOfBirth:
        isSelf || graduate.showDob ? graduate.dateOfBirth?.toISOString() ?? null : null,
      cgpa: isSelf || graduate.showCgpa ? graduate.cgpa?.toString() ?? null : null,

      links: {
        linkedin: graduate.linkedinUrl,
        twitter: graduate.twitterUrl,
        github: graduate.githubUrl,
        website: graduate.personalWebsite,
      },
      nysc: { state: graduate.nyscState, year: graduate.nyscYear },

      employment: graduate.employment.map((row) => ({
        ...row,
        startDate: row.startDate?.toISOString() ?? null,
        endDate: row.endDate?.toISOString() ?? null,
      })),
      education: graduate.education,
      skills: graduate.skills.map((skill) => ({
        id: skill.id,
        skillName: skill.skillName,
        proficiency: skill.proficiency,
        endorsements: skill._count.endorsements,
      })),
      achievements: graduate.achievements.map((row) => ({
        ...row,
        verifiedAt: row.verifiedAt?.toISOString() ?? null,
      })),
      badges: graduate.badges.map((row) => ({
        ...row,
        awardedAt: row.awardedAt.toISOString(),
      })),

      // What the viewer may actually do from here, resolved server-side so the
      // client does not have to reimplement the rules.
      viewer: {
        isSelf,
        connectionStatus: connection?.status ?? "NONE",
        connectionInitiatedByMe: connection ? connection.requesterId === viewer?.id : false,
        canMessage: !isSelf && graduate.allowMessages,
        canRequestMentorship: !isSelf && graduate.availableForMentorship,
        openToOpportunities: graduate.openToOpportunities,
      },
    });
  } catch (error) {
    console.error("[AlumniProfileAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to load alumni profile." },
      { status: 500 }
    );
  }
}
