'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Loader2, Search, Users } from 'lucide-react';
import {
  useLecturerDirectory,
  type LecturerDirectoryQuery,
} from '@/lib/api/lecturers';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 12;

export default function LecturerDirectoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const query: LecturerDirectoryQuery = {
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isPending } = useLecturerDirectory(query);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Giảng viên
        </h1>
        <p className="text-sm text-muted-foreground">
          Danh sách giảng viên hướng dẫn đang hoạt động trong khoa.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="lecturer-search"
          placeholder="Tìm theo tên hoặc mã GV…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            debouncedSearch
              ? 'Không có giảng viên nào khớp với từ khoá tìm kiếm.'
              : 'Chưa có giảng viên nào trong hệ thống.'
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((lecturer) => (
              <LecturerCard key={lecturer.id} lecturer={lecturer} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <PaginationBar
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── LecturerCard ────────────────────────────────────────────────────────────

interface LecturerCardProps {
  lecturer: {
    id: number;
    fullName: string;
    academicTitle: string | null;
    researchInterests: string | null;
    avatarUrl: string | null;
    mentoring: {
      groups: number;
      reserved: number;
      quota: number | null;
      atQuota: boolean;
    };
  };
}

function LecturerCard({ lecturer }: LecturerCardProps) {
  const { groups, reserved, quota, atQuota } = lecturer.mentoring;
  const total = groups + reserved;

  return (
    <Link
      href={`/lecturers/${lecturer.id}`}
      className="group flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      {/* Identity */}
      <div className="flex items-start gap-3">
        <UserAvatar
          name={lecturer.fullName}
          src={lecturer.avatarUrl}
          className="size-11 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate font-medium leading-snug">
            {lecturer.academicTitle
              ? `${lecturer.academicTitle} ${lecturer.fullName}`
              : lecturer.fullName}
          </p>
          {lecturer.researchInterests && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {lecturer.researchInterests}
            </p>
          )}
        </div>
      </div>

      {/* Mentoring load */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <GraduationCap className="size-3.5 shrink-0" />
        <span>
          {quota !== null ? (
            <>
              Đang hướng dẫn{' '}
              <span
                className={
                  atQuota ? 'font-medium text-destructive' : 'font-medium'
                }
              >
                {total}/{quota}
              </span>{' '}
              nhóm
            </>
          ) : (
            <>
              Đang hướng dẫn <span className="font-medium">{total}</span> nhóm
            </>
          )}
        </span>
        {atQuota && (
          <span className="ml-auto rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
            Đã đủ nhóm
          </span>
        )}
      </div>
    </Link>
  );
}
