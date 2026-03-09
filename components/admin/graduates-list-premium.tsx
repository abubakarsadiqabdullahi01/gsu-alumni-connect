'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { formatDistanceToNow } from 'date-fns';

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
  profilePhotoUrl?: string;
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

const DEGREE_CLASS_COLORS: Record<string, string> = {
  FIRST_CLASS: 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border border-emerald-200 dark:from-emerald-950/40 dark:to-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800',
  SECOND_CLASS_UPPER: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 dark:from-blue-950/40 dark:to-blue-950/20 dark:text-blue-400 dark:border-blue-800',
  SECOND_CLASS_LOWER: 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200 dark:from-amber-950/40 dark:to-amber-950/20 dark:text-amber-400 dark:border-amber-800',
  THIRD_CLASS: 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200 dark:from-orange-950/40 dark:to-orange-950/20 dark:text-orange-400 dark:border-orange-800',
  PASS: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200 dark:from-gray-950/40 dark:to-gray-950/20 dark:text-gray-400 dark:border-gray-800',
};

const DEPARTMENT_COLORS: Record<string, string> = {
  default: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400',
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

export function AdminGraduatesListPremium() {
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  // ── Filters ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // ── Fetch graduates ──────────────────────────────────────────────────
  const fetchGraduates = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...(search && { search }),
          ...(selectedDepartment && selectedDepartment !== 'all' && { department: selectedDepartment }),
          ...(selectedFaculty && { faculty: selectedFaculty }),
          ...(graduationYear && { graduationYear }),
          sortBy,
          sortOrder,
        });

        const response = await fetch(`/api/admin/graduates?${params}`);
        if (!response.ok) throw new Error('Failed to fetch graduates');

        const data = await response.json();
        setGraduates(data.data || []);
        setPagination(data.pagination);
        setCurrentPage(page);
      } catch (error) {
        console.error('Failed to fetch graduates:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedDepartment, selectedFaculty, graduationYear, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchGraduates(1);
  }, [fetchGraduates]);

  // ── Fetch departments ────────────────────────────────────────────────
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/admin/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments || []);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/graduates/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graduates-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Main Card ────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border-b border-gray-200 dark:border-gray-800 pb-4">
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
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
              size="sm"
            >
              <FileDown className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardHeader>

        {/* ── Advanced Filters ────────────────────────────────────────────── */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30">
          <div className="px-6 py-4 space-y-4">
            {/* ── Search Bar ──────────────────────────────────────────── */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, registration number, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* ── Filter Controls ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Department Filter */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Department
                </label>
                <Select
                  value={selectedDepartment}
                  onValueChange={(value) => {
                    setSelectedDepartment(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                    <SelectValue placeholder="All Departments" />
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
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Graduation Year
                </label>
                <Select
                  value={graduationYear || 'all'}
                  onValueChange={(value) => {
                    setGraduationYear(value === 'all' ? '' : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {Array.from({ length: 30 }, (_, i) => {
                      const year = (new Date().getFullYear() - i).toString();
                      return (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Sort By
                </label>
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Joined Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="graduationYear">Grad Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Order
                </label>
                <Button
                  onClick={() =>
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  }
                  variant="outline"
                  className="w-full h-10 justify-center gap-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                >
                  {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </Button>
              </div>
            </div>

            {/* ── Active Filters Info ─────────────────────────────────── */}
            {(search || selectedDepartment !== 'all' || graduationYear) && (
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Active filters:
                </span>
                {search && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer"
                    onClick={() => setSearch('')}
                  >
                    {search}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                {selectedDepartment !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer"
                    onClick={() => setSelectedDepartment('all')}
                  >
                    {selectedDepartment}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                {graduationYear && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer"
                    onClick={() => setGraduationYear('')}
                  >
                    {graduationYear}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────── */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : graduates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mb-4 opacity-40" />
              <p>No graduates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800">
                  <TableRow>
                    <TableHead className="font-semibold">Graduate</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Year</TableHead>
                    <TableHead className="font-semibold">Grade</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Profile</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {graduates.map((graduate) => (
                    <TableRow
                      key={graduate.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-950/50 transition-colors border-b border-gray-100 dark:border-gray-800/50"
                    >
                      {/* Graduate Name & Email */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-gray-200 dark:border-gray-700">
                            <AvatarImage src={graduate.user?.image} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold">
                              {getInitials(graduate.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {graduate.fullName}
                            </p>
                            <code className="w-fit rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                              {graduate.registrationNo}
                            </code>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {graduate.user?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Department */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border',
                            DEPARTMENT_COLORS.default
                          )}
                        >
                          {graduate.departmentName}
                        </Badge>
                      </TableCell>

                      {/* Graduation Year */}
                      <TableCell>
                        <span className="text-sm font-medium">
                          {graduate.graduationYear}
                        </span>
                      </TableCell>

                      {/* Degree Class */}
                      <TableCell>
                        {graduate.degreeClass ? (
                          <Badge
                            className={cn(
                              'text-xs',
                              DEGREE_CLASS_COLORS[graduate.degreeClass] ||
                                DEGREE_CLASS_COLORS.PASS
                            )}
                          >
                            {graduate.degreeClass.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </TableCell>

                      {/* Account Status */}
                      <TableCell>
                        {(() => {
                          const accountStatus = graduate.user?.accountStatus || 'PENDING';
                          return (
                        <Badge
                          className={cn(
                            'text-xs',
                                STATUS_COLORS[accountStatus] ||
                              STATUS_COLORS.PENDING
                          )}
                        >
                              {formatStatusLabel(accountStatus)}
                        </Badge>
                          );
                        })()}
                      </TableCell>

                      {/* Profile Status */}
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

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * pagination.limit + 1} to{' '}
              {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
              {pagination.total} graduates
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  fetchGraduates(Math.max(1, currentPage - 1))
                }
                disabled={!pagination.hasPrevPage || isLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                onClick={() =>
                  fetchGraduates(Math.min(pagination.totalPages, currentPage + 1))
                }
                disabled={!pagination.hasNextPage || isLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
