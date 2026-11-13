'use client';

import { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Code,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useMajors, useRoundsForSemester, useSemesters } from '@/lib/api/master-data';
import {
  type ArchiveTopicItem,
  useArchives,
  useExportArchives,
  useVerifyArchive,
} from '@/lib/api/archives';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusPill } from '@/components/shared/status-pill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PAGE_SIZE = 15;

const VERIFIED_FILTER_OPTIONS = [
  { value: 'all', label: 'Mọi tình trạng nghiệm thu' },
  { value: 'true', label: 'Đã nghiệm thu' },
  { value: 'false', label: 'Chưa nghiệm thu' },
];

export default function ArchivesPage() {
  useRequireRole(['ADMIN']);

  // Filters state
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('all');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('all');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('all');
  const [selectedVerified, setSelectedVerified] = useState<'all' | 'true' | 'false'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Selected topic for detail modal
  const [selectedTopic, setSelectedTopic] = useState<ArchiveTopicItem | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  // Queries
  const { data: semesters = [], isLoading: isLoadingSemesters } = useSemesters();
  const numericSemesterId =
    selectedSemesterId === 'all' ? undefined : Number(selectedSemesterId);

  const { data: rounds = [] } = useRoundsForSemester(numericSemesterId);
  const { data: majors = [] } = useMajors();

  const selectedRound = rounds.find((r) => String(r.id) === selectedRoundId);
  const projectTypeId = selectedRound?.projectTypeId;

  const {
    data: archiveData,
    isLoading: isLoadingArchives,
    isFetching: isFetchingArchives,
  } = useArchives({
    semesterId: numericSemesterId,
    projectTypeId,
    majorId: selectedMajorId === 'all' ? undefined : Number(selectedMajorId),
    verified: selectedVerified,
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const exportMutation = useExportArchives();
  const verifyMutation = useVerifyArchive();

  const topics = archiveData?.items || [];
  const total = archiveData?.total || 0;
  const totalPages = archiveData?.totalPages || 1;

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        semesterId: numericSemesterId,
        projectTypeId,
        majorId: selectedMajorId === 'all' ? undefined : Number(selectedMajorId),
        verified: selectedVerified,
        q: debouncedSearch || undefined,
      });
      toast.success('Đã tải xuống file sổ lưu trữ đồ án Excel');
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể xuất danh sách. Vui lòng thử lại.',
      );
    }
  };

  const handleToggleVerify = async (archiveId: number, currentVerified: boolean) => {
    try {
      await verifyMutation.mutateAsync({
        archiveId,
        isVerified: !currentVerified,
      });
      toast.success(
        !currentVerified
          ? 'Đã xác nhận nghiệm thu hồ sơ đồ án.'
          : 'Đã hủy nghiệm thu hồ sơ đồ án.',
      );

      // Update local modal state if open
      if (selectedTopic) {
        setSelectedTopic({
          ...selectedTopic,
          registrationGroups: selectedTopic.registrationGroups.map((group) => {
            if (group.archive?.id === archiveId) {
              return {
                ...group,
                archive: {
                  ...group.archive,
                  isVerifiedByAcademic: !currentVerified,
                },
              };
            }
            return group;
          }),
        });
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi cập nhật nghiệm thu');
    }
  };

  const handleResetFilters = () => {
    setSelectedSemesterId('all');
    setSelectedRoundId('all');
    setSelectedMajorId('all');
    setSelectedVerified('all');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters =
    selectedSemesterId !== 'all' ||
    selectedRoundId !== 'all' ||
    selectedMajorId !== 'all' ||
    selectedVerified !== 'all' ||
    Boolean(searchQuery.trim());

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Kho lưu trữ đồ án</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tra cứu đề cương, điểm số, hồ sơ số hóa và nghiệm thu kết quả đồ án các khóa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportMutation.isPending || total === 0}
              className="gap-1.5 h-9"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 rounded-xl border bg-card">
          {/* Semester Selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Học kỳ / Năm học
            </label>
            <Select
              value={selectedSemesterId}
              onValueChange={(val) => {
                setSelectedSemesterId(val);
                setSelectedRoundId('all');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tất cả học kỳ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả học kỳ</SelectItem>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Round Selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Đợt đồ án
            </label>
            <Select
              value={selectedRoundId}
              onValueChange={(val) => {
                setSelectedRoundId(val);
                setPage(1);
              }}
              disabled={selectedSemesterId === 'all'}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue
                  placeholder={
                    selectedSemesterId === 'all'
                      ? 'Chọn học kỳ trước'
                      : 'Tất cả các đợt'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả các đợt</SelectItem>
                {rounds.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.projectType?.name || `Đợt ${r.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Major Selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Chuyên ngành
            </label>
            <Select
              value={selectedMajorId}
              onValueChange={(val) => {
                setSelectedMajorId(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tất cả chuyên ngành" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                {majors.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name} ({m.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Verification Status */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Nghiệm thu hồ sơ
            </label>
            <Select
              value={selectedVerified}
              onValueChange={(val: 'all' | 'true' | 'false') => {
                setSelectedVerified(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERIFIED_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Tên đề tài, MSSV, CBHD..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 pr-7 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Summary & Quick Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-muted-foreground -mt-3 px-1">
            <span>
              Tìm thấy <strong className="text-foreground">{total}</strong> đề tài lưu trữ
              phù hợp với bộ lọc
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Xóa bộ lọc
            </Button>
          </div>
        )}

        {/* Table Content */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="relative overflow-x-auto">
            {isFetchingArchives && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-full" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[30%]">Đề tài & Học kỳ</TableHead>
                  <TableHead className="w-[18%]">Cán bộ hướng dẫn</TableHead>
                  <TableHead className="w-[22%]">Sinh viên & Điểm tổng kết</TableHead>
                  <TableHead className="w-[15%]">Hồ sơ số hóa</TableHead>
                  <TableHead className="w-[10%] text-center">Nghiệm thu</TableHead>
                  <TableHead className="w-[5%] text-right">Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingArchives ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs">Đang tải kho lưu trữ...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : topics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <EmptyState
                        icon={Archive}
                        title="Chưa có đề tài lưu trữ"
                        description={
                          hasActiveFilters
                            ? 'Không tìm thấy đề tài nào phù hợp với bộ lọc hiện tại.'
                            : 'Chưa có đề tài nào hoàn thành được đưa vào kho lưu trữ.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  topics.map((topic) => {
                    const group = topic.registrationGroups[0];
                    const archive = group?.archive;
                    const outline = group?.outline;
                    const grades = group?.studentGrades || [];
                    const members = group?.members || [];

                    const isAcademicVerified = archive?.isVerifiedByAcademic ?? false;

                    return (
                      <TableRow key={topic.id} className="hover:bg-muted/30">
                        {/* Title & Info */}
                        <TableCell className="align-top py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-muted-foreground">
                                #{topic.id}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                {topic.round?.projectType?.name || 'Đề tài'}
                              </Badge>
                              {topic.major && (
                                <Badge variant="secondary" className="text-[10px] py-0 h-4">
                                  {topic.major.code}
                                </Badge>
                              )}
                              <span className="text-[11px] text-muted-foreground">
                                • {topic.semester?.name}
                              </span>
                            </div>
                            <div
                              className="font-medium text-xs text-foreground cursor-pointer hover:text-primary transition-colors line-clamp-2"
                              onClick={() => setSelectedTopic(topic)}
                            >
                              {topic.titleVi || topic.title}
                            </div>
                            {topic.titleEn && (
                              <div className="text-[11px] text-muted-foreground italic line-clamp-1">
                                {topic.titleEn}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Lecturer */}
                        <TableCell className="align-top py-3">
                          <div className="text-xs font-medium text-foreground">
                            {topic.lecturer?.academicTitle && (
                              <span className="text-muted-foreground mr-1">
                                {topic.lecturer.academicTitle}
                              </span>
                            )}
                            {topic.lecturer?.fullName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            MSGV: {topic.lecturer?.lecturerCode}
                          </div>
                          {group?.councilTopic?.reviewer && (
                            <div className="mt-1 text-[11px] text-muted-foreground/80 flex items-center gap-1">
                              <span>GVPB:</span>
                              <span>{group.councilTopic.reviewer.fullName}</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Students & Scores */}
                        <TableCell className="align-top py-3">
                          <div className="space-y-1.5">
                            {members.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">
                                Chưa có dữ liệu nhóm
                              </span>
                            ) : (
                              members.map((m) => {
                                const stGrade = grades.find(
                                  (g) => g.studentId === m.student.id,
                                );
                                return (
                                  <div
                                    key={m.id}
                                    className="flex items-center justify-between text-xs gap-2"
                                  >
                                    <div className="truncate">
                                      <span className="font-medium">{m.student.fullName}</span>
                                      <span className="text-[11px] text-muted-foreground ml-1">
                                        ({m.student.studentCode})
                                      </span>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      {stGrade?.finalGradeNum !== null &&
                                      stGrade?.finalGradeNum !== undefined ? (
                                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                          {stGrade.finalGradeNum}
                                          {stGrade.finalGradeLetter && (
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                              ({stGrade.finalGradeLetter})
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground">
                                          —
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </TableCell>

                        {/* Digital Archive Links (Icons) */}
                        <TableCell className="align-top py-3">
                          <div className="flex items-center gap-2">
                            {/* Outline M03 */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`p-1.5 rounded-md border text-xs ${
                                    outline?.attachmentUrl
                                      ? 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900'
                                      : 'bg-muted/40 text-muted-foreground/40 border-transparent cursor-not-allowed'
                                  }`}
                                >
                                  <FileCheck2 className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {outline?.attachmentUrl
                                  ? 'Đề cương M03 đã duyệt'
                                  : 'Chưa có đề cương M03'}
                              </TooltipContent>
                            </Tooltip>

                            {/* Thesis PDF */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`p-1.5 rounded-md border text-xs ${
                                    archive?.thesisUrl
                                      ? 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900'
                                      : 'bg-muted/40 text-muted-foreground/40 border-transparent cursor-not-allowed'
                                  }`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {archive?.thesisUrl
                                  ? 'PDF Luận văn hoàn chỉnh'
                                  : 'Chưa nộp PDF luận văn'}
                              </TooltipContent>
                            </Tooltip>

                            {/* Source Code */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`p-1.5 rounded-md border text-xs ${
                                    archive?.sourceUrl
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900'
                                      : 'bg-muted/40 text-muted-foreground/40 border-transparent cursor-not-allowed'
                                  }`}
                                >
                                  <Code className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {archive?.sourceUrl
                                  ? 'Mã nguồn (Source Code)'
                                  : 'Chưa có link source code'}
                              </TooltipContent>
                            </Tooltip>

                            {/* Database */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`p-1.5 rounded-md border text-xs ${
                                    archive?.databaseUrl
                                      ? 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900'
                                      : 'bg-muted/40 text-muted-foreground/40 border-transparent cursor-not-allowed'
                                  }`}
                                >
                                  <Database className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {archive?.databaseUrl
                                  ? 'CSDL / Tài nguyên số hóa'
                                  : 'Chưa có file CSDL'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>

                        {/* Verification Status */}
                        <TableCell className="align-top py-3 text-center">
                          {isAcademicVerified ? (
                            <StatusPill
                              label="Đã nghiệm thu"
                              tone="success"
                              variant="tag"
                            />
                          ) : archive ? (
                            <StatusPill
                              label="Chờ nghiệm thu"
                              tone="waiting"
                              variant="tag"
                            />
                          ) : (
                            <StatusPill
                              label="Chưa nộp"
                              tone="idle"
                              variant="tag"
                            />
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="align-top py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTopic(topic)}
                            className="h-8 w-8 p-0"
                            title="Xem chi tiết hồ sơ lưu trữ"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={(newPage) => setPage(newPage)}
              itemName="đề tài"
            />
          </div>
        </div>

        {/* Detailed Topic Archive Dialog */}
        {selectedTopic && (
          <ArchiveDetailDialog
            topic={selectedTopic}
            open={Boolean(selectedTopic)}
            onOpenChange={(open) => !open && setSelectedTopic(null)}
            onToggleVerify={handleToggleVerify}
            isVerifying={verifyMutation.isPending}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ── Detail Modal Component ─────────────────────────────────────────────
interface ArchiveDetailDialogProps {
  topic: ArchiveTopicItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleVerify: (archiveId: number, current: boolean) => void;
  isVerifying: boolean;
}

function ArchiveDetailDialog({
  topic,
  open,
  onOpenChange,
  onToggleVerify,
  isVerifying,
}: ArchiveDetailDialogProps) {
  const group = topic.registrationGroups[0];
  const archive = group?.archive;
  const outline = group?.outline;
  const grades = group?.studentGrades || [];
  const members = group?.members || [];

  const isVerified = archive?.isVerifiedByAcademic ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs">
              Mã #{topic.id}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {topic.round?.projectType?.name || 'Đề tài'}
            </Badge>
            {topic.major && (
              <Badge variant="outline" className="text-xs">
                {topic.major.name} ({topic.major.code})
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              Học kỳ: {topic.semester?.name}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground leading-snug">
            {topic.titleVi || topic.title}
          </DialogTitle>
          {topic.titleEn && (
            <DialogDescription className="text-xs italic text-muted-foreground">
              {topic.titleEn}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5 pt-3 text-xs">
          {/* Section: Supervisors & Reviewer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border">
            <div>
              <span className="font-semibold text-foreground block mb-0.5">
                Cán bộ hướng dẫn:
              </span>
              <div className="text-muted-foreground">
                {topic.lecturer?.academicTitle && (
                  <span className="mr-1">{topic.lecturer.academicTitle}</span>
                )}
                <span className="font-medium text-foreground">
                  {topic.lecturer?.fullName}
                </span>{' '}
                (MSGV: {topic.lecturer?.lecturerCode})
              </div>
            </div>
            <div>
              <span className="font-semibold text-foreground block mb-0.5">
                Cán bộ phản biện:
              </span>
              <div className="text-muted-foreground">
                {group?.councilTopic?.reviewer ? (
                  <>
                    {group.councilTopic.reviewer.academicTitle && (
                      <span className="mr-1">
                        {group.councilTopic.reviewer.academicTitle}
                      </span>
                    )}
                    <span className="font-medium text-foreground">
                      {group.councilTopic.reviewer.fullName}
                    </span>
                  </>
                ) : (
                  <span className="italic">Chưa phân công</span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Students & Grade Table */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              Thành viên thực hiện & Bảng điểm chi tiết
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">MSSV</TableHead>
                    <TableHead className="text-xs">Họ và tên</TableHead>
                    <TableHead className="text-xs text-center">Tiến độ 1 (20%)</TableHead>
                    <TableHead className="text-xs text-center">Tiến độ 2 (30%)</TableHead>
                    <TableHead className="text-xs text-center">Bảo vệ (50%)</TableHead>
                    <TableHead className="text-xs text-center font-bold">Tổng kết</TableHead>
                    <TableHead className="text-xs text-center">Điểm chữ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                        Chưa có thông tin sinh viên
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => {
                      const g = grades.find((gr) => gr.studentId === m.student.id);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {m.student.studentCode}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium">{m.student.fullName}</span>
                            {m.student.class && (
                              <span className="text-[11px] text-muted-foreground ml-1">
                                ({m.student.class})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {g?.progress1Grade ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {g?.progress2Grade ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {g?.defenseGrade ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {g?.finalGradeNum ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-center font-semibold">
                            {g?.finalGradeLetter ?? '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Section: Digital Assets */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Archive className="h-4 w-4 text-primary" />
              Hồ sơ số hóa lưu trữ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Outline M03 */}
              <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Đề cương chi tiết (M03)</div>
                    <div className="text-[11px] text-muted-foreground">
                      {outline?.fileName || 'Đề cương đã được duyệt'}
                    </div>
                  </div>
                </div>
                {outline?.attachmentUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    asChild
                  >
                    <a
                      href={outline.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-3 w-3" />
                      Tải về
                    </a>
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Chưa có
                  </span>
                )}
              </div>

              {/* Thesis PDF */}
              <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-rose-500/10 text-rose-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Toàn văn Luận văn (PDF)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Báo cáo nghiệm thu hoàn chỉnh
                    </div>
                  </div>
                </div>
                {archive?.thesisUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    asChild
                  >
                    <a
                      href={archive.thesisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Xem file
                    </a>
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Chưa nộp
                  </span>
                )}
              </div>

              {/* Source Code */}
              <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
                    <Code className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Mã nguồn (Source Code)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Repository Git hoặc nén ZIP
                    </div>
                  </div>
                </div>
                {archive?.sourceUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    asChild
                  >
                    <a
                      href={archive.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Truy cập
                    </a>
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Chưa nộp
                  </span>
                )}
              </div>

              {/* Database */}
              <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-amber-500/10 text-amber-600">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Cơ sở dữ liệu / Tài nguyên</div>
                    <div className="text-[11px] text-muted-foreground">
                      Script SQL hoặc dump data
                    </div>
                  </div>
                </div>
                {archive?.databaseUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    asChild
                  >
                    <a
                      href={archive.databaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Truy cập
                    </a>
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Chưa nộp
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Academic Verification Action Box */}
          <div className="p-3.5 rounded-lg border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  Trạng thái nghiệm thu lưu trữ:
                </span>
                {isVerified ? (
                  <StatusPill
                    label="Đã hoàn tất nghiệm thu"
                    tone="success"
                    variant="tag"
                  />
                ) : (
                  <StatusPill
                    label="Chưa nghiệm thu lưu trữ"
                    tone="waiting"
                    variant="tag"
                  />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Xác nhận hồ sơ số hóa đã đầy đủ để khóa lưu trữ vĩnh viễn vào hệ thống
              </p>
            </div>

            {archive ? (
              <Button
                variant={isVerified ? 'outline' : 'default'}
                size="sm"
                onClick={() => onToggleVerify(archive.id, isVerified)}
                disabled={isVerifying}
                className="gap-1.5 h-8 text-xs shrink-0"
              >
                {isVerifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isVerified ? (
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                )}
                {isVerified ? 'Hủy nghiệm thu' : 'Xác nhận nghiệm thu'}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                (Chưa có bản ghi nộp lưu trữ)
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
