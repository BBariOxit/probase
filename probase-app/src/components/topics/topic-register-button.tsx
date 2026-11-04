'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  useJoinTopic,
  useMyGroup,
  useRegisterTopic,
} from '@/lib/api/registration';
import type { TopicAvailability } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupSeatList } from '@/components/groups/group-seat-list';

interface TopicLike extends TopicAvailability {
  id: number;
  title: string;
  maxStudents: number;
}

export function TopicRegisterButton({
  topic,
  idle,
  className,
}: {
  topic: TopicLike;
  idle?: React.ReactNode;
  className?: string;
}) {
  const register = useRegisterTopic();
  const join = useJoinTopic();
  const [confirming, setConfirming] = useState(false);

  const pending = register.isPending || join.isPending;
  const error = register.error ?? join.error;
  const registering = topic.canRegister;

  const showButton = topic.canRegister || topic.canJoin;

  function act() {
    if (registering) {
      register.mutate(
        { topicId: topic.id },
        { onSuccess: () => setConfirming(true) },
      );
      return;
    }

    join.mutate(topic.id, { onSuccess: () => setConfirming(true) });
  }

  return (
    <>
      {!showButton && !error && idle}

      {/* z-10 lifts this above the link overlay stretched across the card. */}
      {(showButton || error) && (
        <div className={className}>
          {showButton && (
            <Button
              type="button"
              size="sm"
              onClick={act}
              disabled={pending}
              className="relative z-10 font-semibold shadow-xs"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {registering ? 'Đăng ký' : 'Tham gia'}
            </Button>
          )}

          {/*
            The refused message is the useful part of a failure here — "Đề tài
            vừa có nhóm khác nhận" is exactly what someone needs to read, and the
            mutation has already invalidated the list, so the badge beside it
            corrects itself at the same time.
          */}
          {error && (
            <p className="relative z-10 mt-1.5 text-xs text-destructive">
              {error.message}
            </p>
          )}
        </div>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          {/*
            Mounted only while open. Result reads the group, and a closed dialog
            on every card in the list would each subscribe to that query for a
            confirmation nobody has asked to see.
          */}
          {confirming && <Result />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Result() {
  const { data: group, isPending } = useMyGroup();

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Only reachable if the group vanished between succeeding and being read,
  // which in practice means another tab left or disbanded it.
  if (!group) {
    return (
      <DialogHeader>
        <DialogTitle>Không tìm thấy nhóm của bạn</DialogTitle>
        <DialogDescription>
          Có thể nhóm vừa bị thay đổi ở nơi khác. Mở lại trang nhóm để xem.
        </DialogDescription>
      </DialogHeader>
    );
  }

  return (
    <>
      {/*
        No success tick. The title already says it happened, and a third accent
        colour in a box this small only competes with the one control worth
        pressing. The topic is named underneath because it is what was just
        claimed — and because a group belongs to a topic, which "đề tài này giờ
        là của bạn" quietly got wrong: it belongs to the group, not the person.
      */}
      <DialogHeader>
        <DialogTitle>
          {group.isLeader ? 'Đăng ký thành công' : 'Đã vào nhóm'}
        </DialogTitle>
        <DialogDescription>{group.topic.title}</DialogDescription>
      </DialogHeader>

      {/*
        Two steps, in the order they are done: say how many are coming, then
        send the link. The same list of seats as on the group screen, so the
        first thing a new group sees is the shape it will keep.
      */}
      <div className="space-y-4">
        {group.topic.maxStudents > 1 && <GroupSeatList group={group} />}

        {group.isLeader && group.topic.maxStudents > 1 && (
          <div className="rounded-lg border border-slate-200 dark:border-neutral-700/80 bg-slate-50 dark:bg-neutral-800/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-slate-800 dark:text-neutral-200 mb-1">
              Mời thành viên vào nhóm
            </p>
            <p>
              Bạn có thể vào trang nhóm để mời thêm bạn cùng làm bằng MSSV (tối đa {group.topic.maxStudents} sinh viên).
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button render={<Link href="/student/groups" />}>
          Vào trang nhóm
          <ArrowRight className="size-4" />
        </Button>
        <DialogClose render={<Button variant="outline" />}>Xong</DialogClose>
      </DialogFooter>
    </>
  );
}
