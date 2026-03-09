import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * GET /api/admin/departments
 * 
 * Fetch all unique departments with graduate count
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const departments = await prisma.graduate.findMany({
      select: {
        departmentName: true,
      },
      distinct: ['departmentName'],
      orderBy: {
        departmentName: 'asc',
      },
    });

    const uniqueDepartments = departments
      .map(d => d.departmentName)
      .filter(d => d && d.trim() !== '');

    return NextResponse.json({
      departments: uniqueDepartments,
      count: uniqueDepartments.length,
    });
  } catch (error) {
    console.error('[API] Departments fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}
