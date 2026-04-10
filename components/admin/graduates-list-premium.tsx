'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  X,
  FileDown,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Graduate {
  id: string;
  registrationNo: string;
  fullName: string;
  facultyCode: string;
  facultyName: string;
  departmentName: string;
  graduationYear: string;
  degreeClass?: string;
  cgpa?: number;
  stateOfOrigin: string;
  profileCompleted: boolean;
  createdAt: string;
  user: {
    email: string;
    phone?: string;
    image?: string;
    accountStatus: string;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface GraduateMetaCombination {
  departmentName: string | null;
  facultyCode: string | null;
  graduationYear: string | null;
}

interface GraduatesMeta {
  departments: string[];
  faculties: string[];
  years: string[];
  combinations: GraduateMetaCombination[];
}

const DEGREE_CLASS_COLORS: Record<string, string> = {
  FIRST_CLASS:
    'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border border-emerald-200 dark:from-emerald-950/40 dark:to-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800',
  SECOND_CLASS_UPPER:
    'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 dark:from-blue-950/40 dark:to-blue-950/20 dark:text-blue-400 dark:border-blue-800',
  SECOND_CLASS_LOWER:
    'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200 dark:from-amber-950/40 dark:to-amber-950/20 dark:text-amber-400 dark:border-amber-800',
  THIRD_CLASS:
    'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200 dark:from-orange-950/40 dark:to-orange-950/20 dark:text-orange-400 dark:border-orange-800',
  PASS: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200 dark:from-gray-950/40 dark:to-gray-950/20 dark:text-gray-400 dark:border-gray-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400',
  SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
};

const formatStatusLabel = (status?: string) => {
  if (!status) return 'Pending';
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatGraduationYearLabel = (value?: string) => {
  if (!value) return 'N/A';
  const cleaned = value.trim();
  if (/^\d{4}$/.test(cleaned)) return `${cleaned} Set`;
  if (/^\d{4}-\d{4}$/.test(cleaned)) {
    const [from, to] = cleaned.split('-');
    return `${from}/${to} Session`;
  }
  return cleaned;
};

export function AdminGraduatesListPremium() {
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [meta, setMeta] = useState<GraduatesMeta>({
    departments: [],
    faculties: [],
    years: [],
    combinations: [],
  });

  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [graduationYear, setGraduationYear] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const availableDepartments = useMemo(() => {
    const filtered = meta.combinations.filter((row) => {
      const byFaculty = selectedFaculty === 'all' || row.facultyCode === selectedFaculty;
      const byYear = graduationYear === 'all' || row.graduationYear === graduationYear;
      return byFaculty && byYear && Boolean(row.departmentName);
    });
    return Array.from(
      new Set(filtered.map((row) => row.departmentName).filter(Boolean) as string[])
    ).sort();
  }, [meta.combinations, selectedFaculty, graduationYear]);

  const availableYears = useMemo(() => {
    const filtered = meta.combinations.filter((row) => {
      const byFaculty = selectedFaculty === 'all' || row.facultyCode === selectedFaculty;
      const byDepartment = selectedDepartment === 'all' || row.departmentName === selectedDepartment;
      return byFaculty && byDepartment && Boolean(row.graduationYear);
    });
    return Array.from(
      new Set(filtered.map((row) => row.graduationYear).filter(Boolean) as string[])
    ).sort((a, b) => {
      const aYear = parseInt(a.split('-')[0] || '0', 10);
      const bYear = parseInt(b.split('-')[0] || '0', 10);
      return bYear - aYear;
    });
  }, [meta.combinations, selectedFaculty, selectedDepartment]);

  const fetchGraduates = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...(search && { search }),
          ...(selectedFaculty !== 'all' && { faculty: selectedFaculty }),
          ...(selectedDepartment !== 'all' && { department: selectedDepartment }),
          ...(graduationYear !== 'all' && { graduationYear }),
          sortBy,
          sortOrder,
        });

        const response = await fetch(`/api/admin/graduates?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch graduates');

        const data = await response.json();
        setGraduates(data.data || []);
        setPagination(data.pagination || null);
        setCurrentPage(page);
      } catch (error) {
        console.error('Failed to fetch graduates:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedFaculty, selectedDepartment, graduationYear, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchGraduates(1);
  }, [fetchGraduates]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const response = await fetch('/api/admin/graduates/meta');
        if (!response.ok) return;
        const data = await response.json();
        setMeta({
          departments: data.departments || [],
          faculties: data.faculties || [],
          years: data.years || [],
          combinations: data.combinations || [],
        });
      } catch (error) {
        console.error('Failed to fetch graduates metadata:', error);
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    if (selectedDepartment !== 'all' && !availableDepartments.includes(selectedDepartment)) {
      setSelectedDepartment('all');
    }
  }, [availableDepartments, selectedDepartment]);

  useEffect(() => {
    if (graduationYear !== 'all' && !availableYears.includes(graduationYear)) {
      setGraduationYear('all');
    }
  }, [availableYears, graduationYear]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/graduates/export');
      if (!response.ok) return;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graduates-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-gray-200 shadow-xl dark:border-gray-800">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 pb-4 dark:border-gray-800 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Graduates Management
              </CardTitle>
              <CardDescription className="mt-2 text-gray-600 dark:text-gray-400">
                {pagination?.total || 0} total graduates · Filter and manage profiles
              </CardDescription>
            </div>
            <Button
              onClick={handleExport}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg"
              size="sm"
            >
              <FileDown className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>

        <div className="border-b border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/30">
          <div className="space-y-4 px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, registration number, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 border-gray-300 bg-white pl-10 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Faculty</label>
                <Select value={selectedFaculty} onValueChange={(v) => { setSelectedFaculty(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 w-full min-w-[220px] border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <SelectValue placeholder="All Faculties" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 min-w-[260px] w-[--radix-select-trigger-width]">
                    <SelectItem value="all">All Faculties</SelectItem>
                    {meta.faculties.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>{faculty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Department</label>
                <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 w-full min-w-[240px] border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 min-w-[300px] w-[--radix-select-trigger-width]">
                    <SelectItem value="all">All Departments</SelectItem>
                    {availableDepartments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Graduation Year</label>
                <Select value={graduationYear} onValueChange={(v) => { setGraduationYear(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 w-full min-w-[220px] border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 min-w-[260px] w-[--radix-select-trigger-width]">
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>{formatGraduationYearLabel(year)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sort By</label>
                <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 w-full min-w-[200px] border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-[--radix-select-trigger-width]">
                    <SelectItem value="createdAt">Joined Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="graduationYear">Graduation Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Order</label>
                <Button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  variant="outline"
                  className="h-10 w-full justify-center gap-2 border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
                >
                  {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </Button>
              </div>
            </div>

            {(search || selectedFaculty !== 'all' || selectedDepartment !== 'all' || graduationYear !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Active filters:</span>
                {search && (
                  <Badge variant="secondary" className="cursor-pointer gap-1" onClick={() => setSearch('')}>
                    {search}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedFaculty !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer gap-1" onClick={() => setSelectedFaculty('all')}>
                    {selectedFaculty}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedDepartment !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer gap-1" onClick={() => setSelectedDepartment('all')}>
                    {selectedDepartment}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {graduationYear !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer gap-1" onClick={() => setGraduationYear('all')}>
                    {formatGraduationYearLabel(graduationYear)}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : graduates.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <Users className="mb-4 h-12 w-12 opacity-40" />
              <p>No graduates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/50">
                  <TableRow>
                    <TableHead className="font-semibold">Graduate</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Year</TableHead>
                    <TableHead className="font-semibold">Grade</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Profile</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {graduates.map((graduate) => (
                    <TableRow
                      key={graduate.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-950/50"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700">
                            <AvatarImage src={graduate.user?.image} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 font-semibold text-white">
                              {getInitials(graduate.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{graduate.fullName}</p>
                            <code className="w-fit rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                              {graduate.registrationNo}
                            </code>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{graduate.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('border bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400')}
                        >
                          {graduate.departmentName || 'N/A'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm font-medium">{formatGraduationYearLabel(graduate.graduationYear)}</span>
                      </TableCell>

                      <TableCell>
                        {graduate.degreeClass ? (
                          <Badge className={cn('text-xs', DEGREE_CLASS_COLORS[graduate.degreeClass] || DEGREE_CLASS_COLORS.PASS)}>
                            {graduate.degreeClass.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge className={cn('text-xs', STATUS_COLORS[graduate.user?.accountStatus] || STATUS_COLORS.PENDING)}>
                          {formatStatusLabel(graduate.user?.accountStatus)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={cn(
                            'text-xs',
                            graduate.profileCompleted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                          )}
                        >
                          {graduate.profileCompleted ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="gap-2">
                          <Link href={`/admin/graduates/${graduate.id}`}>
                          <Eye className="h-4 w-4" />
                          View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-950/50">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * pagination.limit + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} graduates
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchGraduates(Math.max(1, currentPage - 1))}
                disabled={!pagination.hasPrevPage || isLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={() => fetchGraduates(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={!pagination.hasNextPage || isLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
