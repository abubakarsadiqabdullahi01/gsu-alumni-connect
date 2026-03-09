import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

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

    // ── Build where clause ──────────────────────────────────────────────────
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { registrationNo: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (faculty) {
      where.facultyCode = faculty;
    }

    if (department) {
      where.departmentName = { contains: department, mode: 'insensitive' };
    }

    if (graduationYear) {
      where.graduationYear = graduationYear;
    }

    // ── Build order clause ──────────────────────────────────────────────────
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.fullName = sortOrder;
    } else if (sortBy === 'graduationYear') {
      orderBy.graduationYear = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
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
    const transformedGraduates = graduates.map((grad: any) => ({
      id: grad.id,
      registrationNo: grad.registrationNo,
      fullName: grad.fullName,
      email: grad.user.email || '',
      facultyCode: grad.facultyCode,
      facultyName: grad.facultyName,
      departmentName: grad.departmentName,
      graduationYear: grad.graduationYear,
      degreeClass: grad.degreeClass,
      cgpa: grad.cgpa,
      stateOfOrigin: grad.stateOfOrigin,
      profilePhotoUrl: grad.user.image,
      accountStatus: grad.user.accountStatus,
      profileCompleted: grad.profileCompleted,
      createdAt: grad.createdAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: transformedGraduates,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
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
