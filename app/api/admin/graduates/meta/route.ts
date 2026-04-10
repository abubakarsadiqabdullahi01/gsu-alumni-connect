import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * GET /api/admin/graduates/meta
 * 
 * Returns metadata for the graduates list:
 * - Unique departments
 * - Unique faculties
 * - Graduation years
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

    const graduates = await prisma.graduate.findMany({
      select: {
        departmentName: true,
        facultyCode: true,
        graduationYear: true,
      },
      where: {
        departmentName: { not: null },
        facultyCode: { not: null },
        graduationYear: { not: null },
      },
      distinct: ['departmentName', 'facultyCode', 'graduationYear'],
    });

    const departments = Array.from(
      new Set(graduates.map(g => g.departmentName).filter(Boolean))
    ).sort() as string[];

    const faculties = Array.from(
      new Set(graduates.map(g => g.facultyCode).filter(Boolean))
    ).sort() as string[];

    const years = Array.from(
      new Set(graduates.map(g => g.graduationYear).filter(Boolean))
    ).sort((a, b) => {
      const aYear = parseInt(a?.split('-')[0] || '0');
      const bYear = parseInt(b?.split('-')[0] || '0');
      return bYear - aYear;
    }) as string[];

    const departmentsByFaculty = faculties.reduce<Record<string, string[]>>((acc, faculty) => {
      acc[faculty] = Array.from(
        new Set(
          graduates
            .filter((g) => g.facultyCode === faculty)
            .map((g) => g.departmentName)
            .filter(Boolean)
        )
      ).sort() as string[];
      return acc;
    }, {});

    return NextResponse.json({
      departments,
      faculties,
      years,
      departmentsByFaculty,
      combinations: graduates,
    });
  } catch (error) {
    console.error('[AdminGraduatesMeta] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
