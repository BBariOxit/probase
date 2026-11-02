'use client';

import { useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gavel,
  Loader2,
  Lock,
  MapPin,
  Unlock,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type CouncilTopicItem,
  type MyCouncilItem,
  useFinalizeCouncilTopic,
  useMyCouncils,
} from '@/lib/api/councils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CouncilEvaluationDialog } from './council-evaluation-dialog';

export function LecturerCouncilsView() {
  const { data: myCouncils, isLoading, refetch } = useMyCouncils();
  const [evaluatingTopic, setEvaluatingTopic] = useState<CouncilTopicItem | null>(
    null,
  );

  const finalizeMutation = useFinalizeCouncilTopic();

  const handleToggleLock = async (topicItem: CouncilTopicItem) => {
    const nextLocked = !topicItem.isLocked;
    const msg = nextLocked
      ? 'Chốt sổ và khóa điểm bảo vệ của đề tài này?'
      : 'Mở khóa bảng điểm để hội đồng có thể sửa lại điểm?';
    if (!confirm(msg)) return;

    try {
      await finalizeMutation.mutateAsync({
        councilTopicId: topicItem.id,
        data: { isLocked: nextLocked },
      });
      toast.success(
        nextLocked ? 'Đã khóa điểm bảo vệ' : 'Đã mở khóa điểm bảo vệ',
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Thao tác thất bại');
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'PRESIDENT':
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-xs">
            Chủ tịch Hội đồng
          </Badge>
        );
      case 'SECRETARY':
        return (
          <Badge variant="secondary" className="text-xs">
            Thư ký Hội đồng
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Ủy viên Hội đồng
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            BR-18 • Đánh giá Hội đồng 50%
          </span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Hội đồng Bảo vệ của Tôi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xem danh sách các phiên bảo vệ Khóa luận tốt nghiệp được phân công và chấm điểm đánh giá độc lập (chấm thầm).
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : myCouncils?.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Gavel className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-4 font-semibold text-foreground">
            Bạn chưa được phân công vào Hội đồng nào
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Khi Khoa ban hành Quyết định thành lập Hội đồng và gán tên bạn vào danh sách, các phiên bảo vệ sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {myCouncils?.map((council) => {
            const isLeaderOrSecretary =
              council.myRole === 'PRESIDENT' || council.myRole === 'SECRETARY';

            return (
              <div
                key={council.councilId}
                className="rounded-xl border bg-card p-5 shadow-sm space-y-4"
              >
                {/* Council Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {roleBadge(council.myRole)}
                      {council.major && (
                        <Badge variant="outline" className="text-xs">
                          {council.major.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {council.semester.name}
                      </span>
                    </div>
                    <h2 className="mt-1 text-lg font-bold text-foreground">
                      {council.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5 text-primary" />
                        {council.location || 'Chưa định phòng'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3.5 text-primary" />
                        {new Date(council.defenseDate).toLocaleString('vi-VN')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 text-primary" />
                        {council.members.length} Giảng viên trong HĐ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Topics in session */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Danh sách Đề tài bảo vệ ({council.topics.length})
                  </h3>

                  {council.topics.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground border rounded-lg">
                      Hội đồng này chưa được xếp nhóm đồ án nào.
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border overflow-hidden">
                      {council.topics.map((t, idx) => {
                        const evaluatedCount =
                          t.evaluationSummary?.evaluatedCount || 0;
                        const totalMembers =
                          t.evaluationSummary?.totalMembers || council.members.length;
                        const avgScore = t.evaluationSummary?.avgScore;
                        const latestSub = t.group.latestSubmission;

                        return (
                          <div
                            key={t.id}
                            className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors ${
                              t.isLocked ? 'bg-muted/5' : ''
                            }`}
                          >
                            <div className="space-y-2 flex-1 min-w-[280px]">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                {t.timeSlot && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Clock className="size-3" />
                                    {t.timeSlot}
                                  </Badge>
                                )}
                                {t.isLocked ? (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Lock className="size-2.5" />
                                    Đã khóa điểm
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                                    Đang đánh giá
                                  </Badge>
                                )}
                              </div>

                              <h4 className="font-bold text-sm text-foreground leading-snug">
                                {t.topic.title}
                              </h4>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  GVHD: <strong>{t.topic.lecturer.fullName}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  GVPB: <strong>{t.reviewer?.fullName || 'Chưa gán'}</strong>
                                </span>
                              </div>

                              {/* Sinh viên */}
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {t.group.members.map((m) => (
                                  <span
                                    key={m.id}
                                    className="rounded bg-background px-2 py-0.5 border text-xs text-foreground font-medium flex items-center gap-1"
                                  >
                                    <User className="size-3 text-muted-foreground" />
                                    {m.fullName} ({m.studentCode})
                                  </span>
                                ))}
                              </div>

                              {/* Hồ sơ đính kèm */}
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                                {latestSub?.fileUrl && (
                                  <a
                                    href={latestSub.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                  >
                                    <FileText className="size-3.5" />
                                    Xem Báo cáo cuối kỳ ({latestSub.fileName || 'PDF'})
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                                {latestSub?.submissionUrl && (
                                  <a
                                    href={latestSub.submissionUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                  >
                                    <ExternalLink className="size-3.5" />
                                    Repo Demo / Source code
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Scoring Status & Actions */}
                            <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0">
                              <div className="text-right">
                                {t.myEvaluation ? (
                                  <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3.5" />
                                    Điểm của bạn: {t.myEvaluation.score}/10
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                    Chưa chấm điểm
                                  </div>
                                )}

                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  Hội đồng:{' '}
                                  <strong>
                                    {evaluatedCount}/{totalMembers}
                                  </strong>{' '}
                                  GV đã chấm
                                  {avgScore !== null && avgScore !== undefined && (
                                    <span className="text-primary font-bold ml-1.5">
                                      (TB: {avgScore})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant={t.myEvaluation ? 'outline' : 'default'}
                                  className="text-xs gap-1 font-semibold"
                                  onClick={() => setEvaluatingTopic(t)}
                                  disabled={t.isLocked}
                                >
                                  <Award className="size-3.5" />
                                  {t.myEvaluation ? 'Sửa điểm' : 'Chấm điểm'}
                                </Button>

                                {isLeaderOrSecretary && (
                                  <Button
                                    size="sm"
                                    variant={t.isLocked ? 'secondary' : 'outline'}
                                    className="text-xs gap-1 h-8"
                                    onClick={() => handleToggleLock(t)}
                                    disabled={finalizeMutation.isPending}
                                    title={
                                      t.isLocked
                                        ? 'Mở khóa bảng điểm'
                                        : 'Khóa sổ và chốt điểm'
                                    }
                                  >
                                    {t.isLocked ? (
                                      <Lock className="size-3.5 text-muted-foreground" />
                                    ) : (
                                      <Unlock className="size-3.5 text-primary" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Evaluation Dialog */}
      <CouncilEvaluationDialog
        open={evaluatingTopic !== null}
        onOpenChange={(open) => !open && setEvaluatingTopic(null)}
        topicItem={evaluatingTopic}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
