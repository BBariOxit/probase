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
  useFinalizeCouncilTopic,
  useMyCouncils,
} from '@/lib/api/councils';
import { sanitizeLecturerName } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CouncilEvaluationDialog } from './council-evaluation-dialog';

export function LecturerCouncilsView() {
  const { data: myCouncils, isLoading, refetch } = useMyCouncils();
  const [evaluatingTopic, setEvaluatingTopic] =
    useState<CouncilTopicItem | null>(null);
  const [lockTarget, setLockTarget] = useState<CouncilTopicItem | null>(null);

  const finalizeMutation = useFinalizeCouncilTopic();

  const roleBadge = (role: string) => {
    switch (role) {
      case 'PRESIDENT':
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-xs">
            Chủ tịch
          </Badge>
        );
      case 'SECRETARY':
        return (
          <Badge variant="secondary" className="text-xs">
            Thư ký
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Ủy viên
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Hội đồng bảo vệ của tôi</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !myCouncils || myCouncils.length === 0 ? (
        <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <EmptyState
            icon={Gavel}
            title="Bạn chưa được phân công vào hội đồng bảo vệ nào."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {myCouncils.map((council) => {
            const isLeaderOrSecretary =
              council.myRole === 'PRESIDENT' || council.myRole === 'SECRETARY';

            return (
              <div
                key={council.councilId}
                className="rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] p-5 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
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
                    <h2 className="mt-1.5 text-base font-semibold text-foreground">
                      {council.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {council.location || 'Chưa định phòng'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {new Date(council.defenseDate).toLocaleString('vi-VN')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {council.members.length} thành viên
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Đề tài bảo vệ ({council.topics.length})
                  </h3>

                  {council.topics.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground border rounded-lg">
                      Hội đồng này chưa được xếp nhóm đồ án nào.
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border overflow-hidden">
                      {council.topics.map((t, idx) => {
                        const evaluatedCount =
                          t.evaluationSummary?.evaluatedCount ?? 0;
                        const totalMembers =
                          t.evaluationSummary?.totalMembers ??
                          council.members.length;
                        const avgScore = t.evaluationSummary?.avgScore;
                        const latestSub = t.group.latestSubmission;
                        const supName = sanitizeLecturerName(
                          t.topic.lecturer.fullName,
                          t.topic.lecturer.academicTitle,
                        ).displayName;
                        const revName = t.reviewer
                          ? sanitizeLecturerName(
                              t.reviewer.fullName,
                              t.reviewer.academicTitle,
                            ).displayName
                          : 'Chưa gán';

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
                                  #{t.defenseOrder ?? idx + 1}
                                </span>
                                {t.timeSlot && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs gap-1"
                                  >
                                    <Clock className="size-3" />
                                    {t.timeSlot}
                                  </Badge>
                                )}
                                {t.isLocked ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] gap-1"
                                  >
                                    <Lock className="size-2.5" />
                                    Đã khóa điểm
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-amber-600 border-amber-500/30"
                                  >
                                    Đang đánh giá
                                  </Badge>
                                )}
                              </div>

                              <h4 className="font-semibold text-sm text-foreground leading-snug">
                                {t.topic.title}
                              </h4>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  GVHD: <strong>{supName}</strong>
                                </span>
                                <span>·</span>
                                <span>
                                  GVPB: <strong>{revName}</strong>
                                </span>
                              </div>

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

                              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                                {latestSub?.fileUrl && (
                                  <a
                                    href={latestSub.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                  >
                                    <FileText className="size-3.5" />
                                    Xem báo cáo ({latestSub.fileName || 'PDF'})
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
                                    Mã nguồn / Demo
                                  </a>
                                )}
                              </div>
                            </div>

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
                                  {avgScore !== null &&
                                    avgScore !== undefined && (
                                      <span className="text-primary font-bold ml-1.5">
                                        (TB: {avgScore})
                                      </span>
                                    )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant={
                                    t.myEvaluation ? 'outline' : 'default'
                                  }
                                  className="text-xs gap-1 font-semibold cursor-pointer"
                                  onClick={() => setEvaluatingTopic(t)}
                                  disabled={t.isLocked}
                                >
                                  <Award className="size-3.5" />
                                  {t.myEvaluation ? 'Sửa điểm' : 'Chấm điểm'}
                                </Button>

                                {isLeaderOrSecretary && (
                                  <Button
                                    size="sm"
                                    variant={
                                      t.isLocked ? 'secondary' : 'outline'
                                    }
                                    className="text-xs gap-1 h-8 cursor-pointer"
                                    onClick={() => setLockTarget(t)}
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

      <CouncilEvaluationDialog
        open={evaluatingTopic !== null}
        onOpenChange={(open) => !open && setEvaluatingTopic(null)}
        topicItem={evaluatingTopic}
        onSuccess={() => refetch()}
      />

      <ConfirmDialog
        open={lockTarget !== null}
        onOpenChange={(next) => {
          if (!next) setLockTarget(null);
        }}
        title={
          lockTarget?.isLocked
            ? 'Mở khóa bảng điểm'
            : 'Chốt sổ & khóa điểm bảo vệ'
        }
        description={
          lockTarget
            ? lockTarget.isLocked
              ? `Mở khóa bảng điểm để hội đồng có thể sửa lại điểm cho đề tài "${lockTarget.topic.title}"?`
              : `Chốt sổ và khóa điểm bảo vệ cho đề tài "${lockTarget.topic.title}"?`
            : ''
        }
        confirmLabel={lockTarget?.isLocked ? 'Mở khóa' : 'Khóa điểm'}
        onConfirm={async () => {
          if (!lockTarget) return;
          const nextLocked = !lockTarget.isLocked;
          await finalizeMutation.mutateAsync({
            councilTopicId: lockTarget.id,
            data: { isLocked: nextLocked },
          });
          toast.success(
            nextLocked ? 'Đã khóa điểm bảo vệ.' : 'Đã mở khóa điểm bảo vệ.',
          );
          refetch();
        }}
      />
    </div>
  );
}
