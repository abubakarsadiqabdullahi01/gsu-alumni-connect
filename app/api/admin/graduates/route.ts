import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { Prisma } from "@/src/generated/prisma";
import { redisGetJson, redisSetJson } from "@/lib/cache/redis-cache";
import { getAdminCacheVersion } from "@/lib/cache/admin-cache-version";

const ADMIN_GRADUATES_CACHE_TTL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.ADMIN_GRADUATES_CACHE_TTL_SECONDS ?? "20", 10) || 20
);

/**
 * GET /api/admin/graduates
 * 
 * Efficient paginated endpoint for admin graduates list
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - search: string (searches by name, reg no, email)
 * - faculty: string (filter by faculty code)
 * - department: string (filter by department name)
 * - graduationYear: string (filter by year)
 * - sortBy: 'name' | 'createdAt' | 'graduationYear' (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // ── Pagination ──────────────────────────────────────────────────────────
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
    const skip = (page - 1) * limit;

    // ── Search & Filters ────────────────────────────────────────────────────
    const search = searchParams.get('search')?.trim();
    const faculty = searchParams.get('faculty');
    const department = searchParams.get('department');
    const graduationYear = searchParams.get('graduationYear');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const cacheVersion = await getAdminCacheVersion("graduates");
    const cacheKey = `admin:graduates:v${cacheVersion}:${session.user.id}:p${page}:l${limit}:q:${encodeURIComponent(search ?? "")}:f:${encodeURIComponent(faculty ?? "all")}:d:${encodeURIComponent(department ?? "all")}:y:${encodeURIComponent(graduationYear ?? "all")}:sb:${encodeURIComponent(sortBy)}:so:${encodeURIComponent(sortOrder)}`;
    const cached = await redisGetJson<{
      data: Array<{
        id: string;
        registrationNo: string;
        fullName: string;
        facultyCode: string | null;
        facultyName: string | null;
        departmentName: string | null;
        graduationYear: string | null;
        degreeClass: string | null;
        cgpa: number | null;
        stateOfOrigin: string | null;
        profilePhotoUrl: string | null;
        profileCompleted: boolean;
        createdAt: Date;
        user: {
          email: string;
          phone?: string;
          image?: string;
          accountStatus: string;
        };
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    // ── Build where clause ──────────────────────────────────────────────────
    const where: Prisma.GraduateWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { registrationNo: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (faculty && faculty !== 'all') {
      where.facultyCode = faculty;
    }

    if (department && department !== 'all') {
      where.departmentName = { equals: department, mode: 'insensitive' };
    }

    if (graduationYear && graduationYear !== 'all') {
      where.graduationYear = graduationYear;
    }

    // ── Build order clause ──────────────────────────────────────────────────
    const validSortOrder = (sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc') as 'asc' | 'desc';
    const orderBy: Prisma.GraduateOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.fullName = validSortOrder;
    } else if (sortBy === 'graduationYear') {
      orderBy.graduationYear = validSortOrder;
    } else {
      orderBy.createdAt = validSortOrder;
    }

    // ── Execute query (optimized) ───────────────────────────────────────────
    const [graduates, total] = await Promise.all([
      prisma.graduate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          registrationNo: true,
          fullName: true,
          facultyCode: true,
          facultyName: true,
          departmentName: true,
          graduationYear: true,
          degreeClass: true,
          cgpa: true,
          stateOfOrigin: true,
          profileCompleted: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              phone: true,
              image: true,
              accountStatus: true,
            },
          },
        },
      }),
      prisma.graduate.count({ where }),
    ]);

    // Transform the response to match Graduate interface
    const transformedGraduates = graduates.map((grad) => ({
      id: grad.id,
      registrationNo: grad.registrationNo,
      fullName: grad.fullName,
      facultyCode: grad.facultyCode,
      facultyName: grad.facultyName,
      departmentName: grad.departmentName,
      graduationYear: grad.graduationYear,
      degreeClass: grad.degreeClass,
      cgpa: grad.cgpa,
      stateOfOrigin: grad.stateOfOrigin,
      profilePhotoUrl: grad.user.image,
      profileCompleted: grad.profileCompleted,
      createdAt: grad.createdAt,
      user: {
        email: grad.user.email || '',
        phone: grad.user.phone || undefined,
        image: grad.user.image || undefined,
        accountStatus: grad.user.accountStatus || 'PENDING',
      },
    }));

    const totalPages = Math.ceil(total / limit);

    const payload = {
      data: transformedGraduates,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    void redisSetJson(cacheKey, payload, ADMIN_GRADUATES_CACHE_TTL_SECONDS);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[API] /api/admin/graduates error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch graduates',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/graduates/stats
 * Summary stats for admin dashboard
 */
export async function getGraduateStats() {
  try {
    const [
      total,
      profileCompleted,
      byFaculty,
      byGraduationYear,
    ] = await Promise.all([
      prisma.graduate.count(),
      prisma.graduate.count({ where: { profileCompleted: true } }),
      prisma.graduate.groupBy({
        by: ['facultyCode', 'facultyName'],
        _count: true,
        orderBy: { _count: { graduationYear: 'desc' } },
      }),
      prisma.graduate.groupBy({
        by: ['graduationYear'],
        _count: true,
        orderBy: { graduationYear: 'desc' },
      }),
    ]);

    return {
      total,
      profileCompleted,
      profileCompletionRate: total > 0 ? ((profileCompleted / total) * 100).toFixed(1) : '0',
      byFaculty,
      byGraduationYear,
    };
  } catch (error) {
    console.error('[API] Graduate stats error:', error);
    throw error;
  }
}
