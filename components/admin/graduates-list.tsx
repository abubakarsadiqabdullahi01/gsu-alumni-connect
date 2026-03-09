'use client';

import { useState, useEffect, useTransition } from 'react';
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
  Download,
  Eye,
  Filter,
  Loader2,
  X,
  FileDown,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Graduate {
  id: string;
  registrationNo: string;
  fullName: string;
  email: string;
  facultyCode: string;
  facultyName: string;
  departmentName: string;
  graduationYear: string;
  degreeClass?: string;
  cgpa?: number;
  stateOfOrigin: string;
  profilePhotoUrl?: string;
  accountStatus: string;
  profileCompleted: boolean;
  createdAt: Date;
  user?: {
    image?: string;
    accountStatus?: string;
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

const DEGREE_CLASS_COLORS: Record<string, string> = {
  FIRST_CLASS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
  SECOND_CLASS_UPPER: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
  SECOND_CLASS_LOWER: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
  THIRD_CLASS: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400',
  PASS: 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-400',
};

const FACULTY_COLORS: Record<string, string> = {
  AS: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400',
  SC: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
  ED: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400',
  PH: 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-400',
  MD: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
};

export function AdminGraduatesList() {
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [departments, setDepartments] = useState<string[]>([]);

  // ── Filters ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // ── Load departments on mount ────────────────────────────────────────
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/admin/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments || []);
        }
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchGraduates = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sortBy,
          sortOrder,
        });

        if (search) params.append('search', search);
        if (faculty) params.append('faculty', faculty);
        if (department) params.append('department', department);
        if (graduationYear) params.append('graduationYear', graduationYear);

        const response = await fetch(`/api/admin/graduates?${params}`);
        const result = await response.json();

        if (result.error) throw new Error(result.message);

        setGraduates(result.data);
        setPagination(result.pagination);
      } catch (error) {
        console.error('Failed to load graduates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    startTransition(() => {
      fetchGraduates();
    });
  }, [page, limit, search, faculty, department, graduationYear, sortBy, sortOrder]);

  // ── Handle filters ───────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFacultyChange = (value: string) => {
    setFaculty(value === 'all' ? '' : value);
    setDepartment(''); // Reset department when faculty changes
    setPage(1);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartment(value === 'all' ? '' : value);
    setPage(1);
  };

  const handleYearChange = (value: string) => {
    setGraduationYear(value === 'all' ? '' : value);
    setPage(1);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-950/80 backdrop-blur-sm">
      {/* ── Card Header ───────────────────────────────────────────────────── */}
      <CardHeader className="bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50 border-b border-blue-100 dark:border-blue-900/30 pb-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-600/20 dark:to-cyan-600/20 border border-blue-200 dark:border-blue-900/40 shadow-sm">
                <Users className="size-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black bg-gradient-to-r from-blue-700 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Graduate Directory</CardTitle>
                <CardDescription className="mt-1.5 text-sm font-medium">
                  <span className="text-slate-600 dark:text-slate-300">Total: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{pagination?.total || 0}</span>
                  <span className="text-slate-600 dark:text-slate-300"> registered graduates</span>
                </CardDescription>
              </div>
            </div>
          </div>
          <Button 
            variant="default" 
            size="lg"
            className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 text-white font-semibold"
          >
            <FileDown className="size-5" />
            Export to CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">

        {/* ── Advanced Filters ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-slate-50/80 to-blue-50/50 dark:from-slate-950/50 dark:to-slate-900/50 p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Filter className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm">Advanced Filters</h3>
            </div>
            {(search || faculty || department || graduationYear) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFaculty('');
                  setDepartment('');
                  setGraduationYear('');
                  setPage(1);
                }}
                className="h-8 gap-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600"
              >
                <X className="size-3.5" />
                Clear all
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="lg:col-span-1">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  placeholder="Name, reg no, email..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-10 rounded-lg border-border/60 bg-white dark:bg-slate-900 transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-500/30 shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            {/* Faculty Filter */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Faculty
              </label>
              <Select value={faculty || 'all'} onValueChange={handleFacultyChange}>
                <SelectTrigger className="h-10 rounded-lg border-border/60 bg-white dark:bg-slate-900 transition-all hover:border-blue-300 shadow-sm hover:shadow-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculties</SelectItem>
                  <SelectItem value="AS">Arts & Social Sciences</SelectItem>
                  <SelectItem value="SC">Science</SelectItem>
                  <SelectItem value="ED">Education</SelectItem>
                  <SelectItem value="PH">Pharmacy</SelectItem>
                  <SelectItem value="MD">Medicine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Department
              </label>
              <Select value={department || 'all'} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="h-10 rounded-lg border-border/60 bg-white dark:bg-slate-900 transition-all hover:border-blue-300 shadow-sm hover:shadow-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Graduation Year Filter */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Graduation Year
              </label>
              <Select value={graduationYear || 'all'} onValueChange={handleYearChange}>
                <SelectTrigger className="h-10 rounded-lg border-border/60 bg-white dark:bg-slate-900 transition-all hover:border-blue-300 shadow-sm hover:shadow-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {Array.from({ length: 16 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return `${year}-${year + 1}`;
                  }).map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sort By
              </label>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger className="h-10 rounded-lg border-border/60 bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Latest</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest</SelectItem>
                  <SelectItem value="fullName-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="fullName-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Loading state ───────────────────────────────────────────────── */}
        {(isLoading || isPending) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-blue-600/60 mb-3" />
            <p className="text-sm text-muted-foreground">Loading graduates...</p>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────────── */}
        {!isLoading && !isPending && graduates.length > 0 && (
          <>
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-950/50 dark:to-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
                      <TableHead className="w-[50px] font-semibold"></TableHead>
                      <TableHead className="min-w-[200px] font-semibold">Name & Details</TableHead>
                      <TableHead className="min-w-[140px] font-semibold">Faculty</TableHead>
                      <TableHead className="min-w-[140px] font-semibold">Department</TableHead>
                      <TableHead className="min-w-[120px] font-semibold">Graduation</TableHead>
                      <TableHead className="min-w-[120px] font-semibold">Class</TableHead>
                      <TableHead className="min-w-[120px] font-semibold">Status</TableHead>
                      <TableHead className="min-w-[110px] font-semibold">Profile</TableHead>
                      <TableHead className="text-right w-[80px] font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {graduates.map((grad) => (
                      <TableRow
                        key={grad.id}
                        className="border-b border-border/30 hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-transparent dark:hover:from-blue-950/30 dark:hover:to-transparent transition-all duration-200"
                      >
                        {/* Avatar */}
                        <TableCell className="py-4">
                          <Avatar className="size-9 border-2 border-blue-200/50 dark:border-blue-900/50 ring-2 ring-blue-500/10 shadow-md">
                            {grad.user?.image && (
                              <AvatarImage src={grad.user.image} />
                            )}
                            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                              {getInitials(grad.fullName)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>

                        {/* Name & Details */}
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            <p className="font-semibold text-sm text-foreground">{grad.fullName}</p>
                            <p className="text-xs text-muted-foreground font-mono bg-slate-100/50 dark:bg-slate-900/50 px-2 py-1 rounded w-fit">
                              {grad.registrationNo}
                            </p>
                          </div>
                        </TableCell>

                        {/* Faculty */}
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-semibold rounded-full border-2',
                              FACULTY_COLORS[grad.facultyCode] ||
                                'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                            )}
                          >
                            {grad.facultyCode}
                          </Badge>
                        </TableCell>

                        {/* Department */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"></div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/30 px-3 py-1 rounded-full">
                              {grad.departmentName || '—'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Graduation Year */}
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="font-semibold bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                            {grad.graduationYear}
                          </Badge>
                        </TableCell>

                        {/* Degree Class */}
                        <TableCell className="py-4">
                          {grad.degreeClass && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs font-semibold rounded-full border-2',
                                DEGREE_CLASS_COLORS[grad.degreeClass] ||
                                  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                              )}
                            >
                              {grad.degreeClass
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (c) => c.toUpperCase())
                                .substring(0, 12)}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Account Status */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'size-3 rounded-full ring-2 ring-offset-1 ring-offset-background shadow-sm',
                                grad.user?.accountStatus === 'ACTIVE'
                                  ? 'bg-emerald-500 ring-emerald-500/40 animate-pulse'
                                  : 'bg-slate-400 ring-slate-400/30'
                              )}
                            />
                            <span className={cn(
                              'text-xs font-semibold',
                              grad.user?.accountStatus === 'ACTIVE'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                            )}>
                              {grad.user?.accountStatus === 'ACTIVE'
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Profile Status */}
                        <TableCell className="py-4">
                          <Badge 
                            className={cn(
                              'font-semibold text-xs rounded-full border-2 shadow-sm',
                              grad.profileCompleted 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                            )}
                          >
                            {grad.profileCompleted ? '✓ Complete' : '○ Incomplete'}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400"
                            title="View profile"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ── Pagination ──────────────────────────────────────────────── */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col gap-4 border-t border-border/30 pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing{' '}
                    <span className="font-semibold text-foreground">
                      {(page - 1) * limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-foreground">
                      {Math.min(page * limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-foreground">
                      {pagination.total}
                    </span>{' '}
                    graduates
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrevPage || isPending}
                      className="h-9 w-9 p-0 rounded-lg"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }).map(
                        (_, i) => {
                          const pageNum =
                            page <= 3
                              ? i + 1
                              : page >= pagination.totalPages - 2
                              ? pagination.totalPages - 4 + i
                              : page - 2 + i;

                          if (pageNum < 1 || pageNum > pagination.totalPages)
                            return null;

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                pageNum === page ? 'default' : 'outline'
                              }
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={cn(
                                'h-9 w-9 p-0 text-xs font-semibold rounded-lg transition-all hover:shadow-md',
                                pageNum === page 
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg text-white' 
                                  : 'border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
                              )}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasNextPage || isPending}
                      className="h-9 px-3 rounded-lg border-blue-200 dark:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-blue-400 transition-all disabled:opacity-50"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!isLoading && !isPending && graduates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-900/20 mb-4 shadow-sm">
              <Users className="size-10 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-bold text-foreground">No graduates found</p>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
              Try adjusting your search filters or check back later
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
