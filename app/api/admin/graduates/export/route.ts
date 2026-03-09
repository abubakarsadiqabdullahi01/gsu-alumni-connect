import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * GET /api/admin/graduates/export
 * 
 * Export all graduates to CSV
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

    const graduates = await prisma.graduate.findMany({
      select: {
        registrationNo: true,
        fullName: true,
        facultyName: true,
        departmentName: true,
        graduationYear: true,
        degreeClass: true,
        cgpa: true,
        user: {
          select: {
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create CSV header
    const headers = [
      'Registration No',
      'Full Name',
      'Email',
      'Phone',
      'Faculty',
      'Department',
      'Graduation Year',
      'Degree Class',
      'CGPA',
      'Status',
      'Joined Date',
    ];

    // Create CSV rows
    const rows = graduates.map((g: any) => [
      g.registrationNo,
      `"${g.fullName}"`, // Quote names to handle commas
      g.user.email,
      g.user.phone || '',
      `"${g.facultyName}"`,
      `"${g.departmentName}"`,
      g.graduationYear,
      g.degreeClass || '',
      g.cgpa || '',
      g.user.accountStatus,
      new Date(g.createdAt).toLocaleDateString(),
    ]);

    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Return as CSV file
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="graduates-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[API] Graduate export error:', error);
    return NextResponse.json(
      { error: 'Failed to export graduates' },
      { status: 500 }
    );
  }
}
