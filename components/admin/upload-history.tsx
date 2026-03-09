'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  DownloadCloud,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadLog {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  startedAt: Date;
  completedAt?: Date | null;
  errorMessage?: string | null;
}

interface UploadHistoryProps {
  logs: UploadLog[];
  isLoading?: boolean;
}

const STATUS_CONFIG = {
  COMPLETED: {
    icon: CheckCircle2,
    label: 'Completed',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/30',
  },
  FAILED: {
    icon: AlertCircle,
    label: 'Failed',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/30',
  },
  PROCESSING: {
    icon: Clock,
    label: 'Processing',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/30',
  },
};

export function UploadHistory({ logs, isLoading = false }: UploadHistoryProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Upload History</CardTitle>
            <CardDescription className="mt-1">
              {logs.length} import session{logs.length !== 1 ? 's' : ''} recorded
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <DownloadCloud className="size-3.5" />
            Export Log
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No upload history yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {logs.map((log, idx) => {
              const config = STATUS_CONFIG[log.status];
              const Icon = config.icon;

              return (
                <div
                  key={log.id || idx}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    config.bgColor
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Icon, File info */}
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className={cn('mt-1', config.color)}>
                        <Icon className="size-5 shrink-0" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold truncate">
                            {log.fileName || 'Unnamed Upload'}
                          </h4>
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs"
                          >
                            {config.label}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground mb-2">
                          {formatDate(log.startedAt)}
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <p className="font-semibold">
                              {log.created.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Updated:</span>
                            <p className="font-semibold">
                              {log.updated.toLocaleString()}
                            </p>
                          </div>
                          {log.failed > 0 && (
                            <div>
                              <span className="text-muted-foreground">Failed:</span>
                              <p className="font-semibold text-red-600 dark:text-red-400">
                                {log.failed}
                              </p>
                            </div>
                          )}
                          {log.skipped > 0 && (
                            <div>
                              <span className="text-muted-foreground">Skipped:</span>
                              <p className="font-semibold">
                                {log.skipped}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* File info */}
                        <div className="text-xs text-muted-foreground mt-2">
                          File size: {formatFileSize(log.fileSize)}
                        </div>

                        {/* Error message */}
                        {log.errorMessage && (
                          <div className="mt-2 text-xs bg-black/5 dark:bg-white/5 rounded px-2 py-1">
                            <p className="font-mono text-muted-foreground">
                              {log.errorMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Download details"
                      >
                        <DownloadCloud className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
