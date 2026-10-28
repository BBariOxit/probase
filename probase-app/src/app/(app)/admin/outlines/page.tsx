'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useActiveSemester, useSemesters } from '@/lib/api/master-data';
import { useFacultyOutlines } from '@/lib/api/outlines';
import type { OutlineStatus } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { PageHeading } from '@/components/layout/page-heading';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function OutlineStatusBadge({ status }: { status?: OutlineStatus | null }) {
  switch (status) {
    case 'APPROVED_BY_LECTURER':
      return (
        <Badge className="bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30 gap-1 px-2.5 py-0.5 text-xs font-medium">
          <CheckCircle2 className="size-3.5" />
          Đã duyệt
        </Badge>
      );
    case 'SUBMITTED':
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 gap-1 px-2.5 py-0.5 text-xs font-medium">
          <Clock className="size-3.5" />
          Chờ duyệt
        </Badge>
      );
    case 'NEEDS_REVISION':
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/30 gap-1 px-2.5 py-0.5 text-xs font-medium">
          <AlertCircle className="size-3.5" />
          Cần sửa
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1 px-2 py-0.5 text-xs">
          <FileText className="size-3" />
          Chưa nộp
        </Badge>
      );
  }
}

export default function AdminOutlinesPage() {
  const allowed = useRequireRole('ADMIN');
  const activeSemester = useActiveSemester();
  const { data: semesters } = useSemesters();

  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const currentSemesterId = semesterId ?? activeSemester?.id;

  const { data, isLoading } = useFacultyOutlines({
    semesterId: currentSemesterId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: search.trim() || undefined,
  });

  if (!allowed) return null;

  const items = data?.items ?? [];
  const stats = data?.stats ?? {
    totalGroups: 0,
    approved: 0,
    submitted: 0,
    needsRevision: 0,
    notSubmitted: 0,
  };

  const handleExportApprovedList = () => {
    const approvedItems = items.filter(
      (i) => i.outline?.status === 'APPROVED_BY_LECTURER',
    );
    if (approvedItems.length === 0) {
      toast.error('Chưa có nhóm nào được duyệt Đề cương M03 để xuất tờ trình.');
      return;
    }

    // Xuất CSV danh sách đề tài chính thức
    const headers = [
      'STT',
      'Tên nhóm',
      'Tên đề tài',
      'Giảng viên hướng dẫn',
      'Sinh viên thực hiện',
      'Trạng thái M03',
      'Ngày duyệt',
    ];

    const rows = approvedItems.map((g, idx) => [
      String(idx + 1),
      `"${g.name ?? `Nhóm ${g.id}`}"`,
      `"${g.topic?.title?.replace(/"/g, '""') ?? ''}"`,
      `"${g.topic?.lecturer?.academicTitle ? `${g.topic.lecturer.academicTitle} ` : ''}${g.topic?.lecturer?.fullName ?? ''}"`,
      `"${g.members.map((m) => `${m.student.fullName} (${m.student.studentCode})`).join('; ')}"`,
      '"Đã được GVHD duyệt"',
      `"${formatDate(g.outline?.approvedAt)}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Danh_sach_de_tai_chinh_thuc_M03_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Đã xuất ${approvedItems.length} đề tài đủ điều kiện trình ký!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title="Tổng hợp Đề cương M03 toàn Khoa"
          description="Theo dõi tiến độ nộp và xét duyệt Đề cương M03 để xuất Tờ trình và trình BCN Khoa ký Quyết định giao việc chính thức (BR-10)"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleExportApprovedList}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <FileSpreadsheet className="size-4" />
            Xuất Tờ trình danh sách chính thức (CSV)
          </Button>
        </div>
      </div>

      {/* Thẻ thống kê số liệu tổng quan */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Tổng số nhóm</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{stats.totalGroups}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Có đề tài trong kỳ</p>
        </Card>

        <Card className="p-4 shadow-2xs border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Đã phê duyệt</p>
          <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{stats.approved}</p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Đủ điều kiện giao việc</p>
        </Card>

        <Card className="p-4 shadow-2xs border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Đang chờ duyệt</p>
          <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-400">{stats.submitted}</p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Đã nộp bản scan</p>
        </Card>

        <Card className="p-4 shadow-2xs border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/10">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Cần chỉnh sửa</p>
          <p className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-400">{stats.needsRevision}</p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">GV yêu cầu nộp lại</p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Chưa nộp</p>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">{stats.notSubmitted}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cần nhắc nhở hạn</p>
        </Card>
      </div>

      {/* Thanh bộ lọc */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên đề tài, tên nhóm hoặc giảng viên..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="APPROVED_BY_LECTURER">Đã duyệt (Sẵn sàng)</SelectItem>
            <SelectItem value="SUBMITTED">Chờ duyệt</SelectItem>
            <SelectItem value="NEEDS_REVISION">Cần chỉnh sửa</SelectItem>
            <SelectItem value="NOT_SUBMITTED">Chưa nộp</SelectItem>
          </SelectContent>
        </Select>

        {semesters && semesters.length > 0 && (
          <Select
            value={currentSemesterId ? String(currentSemesterId) : undefined}
            onValueChange={(val) => setSemesterId(val ? Number(val) : undefined)}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
              <SelectValue placeholder="Chọn học kỳ" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-xl border">
          <EmptyState
            icon={FileText}
            title="Không tìm thấy bản ghi đề tài nào trong học kỳ này."
          />
        </Card>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[180px]">Nhóm & Thành viên</TableHead>
                <TableHead>Tên đề tài</TableHead>
                <TableHead className="w-[180px]">GVHD</TableHead>
                <TableHead className="w-[140px] text-center">Trạng thái M03</TableHead>
                <TableHead className="w-[140px]">Tài liệu scan</TableHead>
                <TableHead className="w-[110px] text-right">Ngày duyệt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((group) => {
                const outline = group.outline;
                return (
                  <TableRow key={group.id} className="hover:bg-muted/20">
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground text-sm">
                          {group.name ?? `Nhóm ${group.id}`}
                        </p>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {group.members.map((m) => (
                            <div key={m.id}>
                              {m.student.fullName} ({m.student.studentCode})
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground text-sm leading-snug">
                          {group.topic?.title}
                        </p>
                        {group.topic?.projectType && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <Badge variant="secondary" className="text-[11px] font-normal">
                              {group.topic.projectType.name}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-3 text-sm">
                      <p className="font-medium text-foreground">
                        {group.topic?.lecturer?.academicTitle ? `${group.topic.lecturer.academicTitle} ` : ''}
                        {group.topic?.lecturer?.fullName}
                      </p>
                    </TableCell>

                    <TableCell className="align-top py-3 text-center">
                      <OutlineStatusBadge status={outline?.status} />
                    </TableCell>

                    <TableCell className="align-top py-3 text-xs">
                      {outline?.attachmentUrl ? (
                        <div className="space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            render={
                              <a
                                href={outline.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                          >
                            <ExternalLink className="size-3" />
                            Xem bản scan
                          </Button>
                          <p className="text-[11px] text-muted-foreground">
                            {formatBytes(outline.fileSize)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Chưa có</span>
                      )}
                    </TableCell>

                    <TableCell className="align-top py-3 text-right text-xs text-muted-foreground">
                      {formatDate(outline?.approvedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
