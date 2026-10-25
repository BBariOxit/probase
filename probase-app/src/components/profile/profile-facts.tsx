import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { MyProfile } from '@/lib/api/types';

export function ProfileFacts({ profile }: { profile: MyProfile }) {
  const { student, lecturer } = profile;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium">Thông tin cá nhân</h2>

      {student && (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact label="Họ và tên" value={student.fullName} />
          <Fact label="Mã sinh viên" value={student.studentCode} />
          <Fact label="Lớp" value={student.class} />
          <Fact label="Khoá" value={student.cohort} />
          <Fact label="Chuyên ngành" value={student.major?.name ?? null} />
        </dl>
      )}

      {lecturer && (
        <>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Fact label="Họ và tên" value={lecturer.fullName} />
            <Fact label="Mã giảng viên" value={lecturer.lecturerCode} />
            <Fact
              label="Hướng dẫn học kỳ này"
              value={
                lecturer.mentoring.quota === null
                  ? `${lecturer.mentoring.groups} nhóm`
                  : `${lecturer.mentoring.groups}/${lecturer.mentoring.quota} nhóm`
              }
              hint={
                lecturer.mentoring.reserved > 0
                  ? `${lecturer.mentoring.reserved} đề tài đã nhận, chờ sinh viên đăng ký`
                  : undefined
              }
            />
          </dl>

          <Link
            href={`/lecturers/${lecturer.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Xem trang sinh viên nhìn thấy
            <ExternalLink className="size-3.5" />
          </Link>
        </>
      )}

      {!student && !lecturer && (
        <p className="text-sm text-muted-foreground">
          Tài khoản quản trị không gắn với hồ sơ sinh viên hay giảng viên nào,
          nên ở đây chỉ có địa chỉ đăng nhập và ảnh đại diện.
        </p>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">
        {value ?? <span className="text-muted-foreground">Chưa có</span>}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
