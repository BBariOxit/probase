import type { MyProfile } from '@/lib/api/types';
import { cn, formatDate } from '@/lib/utils';

function getLecturerPositions(
  lecturer: NonNullable<MyProfile['lecturer']>,
): string[] {
  const positions: string[] = [];
  if (lecturer.isHeadOfDepartment) positions.push('Tổ trưởng Bộ môn');
  if (lecturer.isHomeroomTeacher) positions.push('Giáo viên chủ nhiệm');
  if (lecturer.isAcademicAssistant) positions.push('Trợ lý học vụ');
  return positions;
}

export function ProfileFacts({ profile }: { profile: MyProfile }) {
  const { student, lecturer } = profile;

  const title = lecturer
    ? 'Thông tin công tác'
    : student
      ? 'Thông tin học vụ'
      : 'Thông tin tài khoản';

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium">{title}</h2>

      {student && (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Fact label="Lớp" value={student.class} />
          <Fact label="Khoá" value={student.cohort} />
          <Fact label="Chuyên ngành" value={student.major?.name ?? null} />
        </dl>
      )}

      {lecturer && (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Fact label="Bộ môn" value={lecturer.major?.name ?? null} />
          <Fact
            label="Chức vụ"
            value={
              getLecturerPositions(lecturer).length > 0
                ? getLecturerPositions(lecturer).join(' · ')
                : 'Giảng viên'
            }
          />
          <Fact
            label="Hướng dẫn học kỳ này"
            value={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {lecturer.mentoring.quota === null
                    ? `${lecturer.mentoring.groups} nhóm`
                    : `${lecturer.mentoring.groups}/${lecturer.mentoring.quota} nhóm`}
                </span>
                {lecturer.mentoring.quota !== null && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                      lecturer.mentoring.atQuota
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {lecturer.mentoring.atQuota ? 'Đã đủ chỉ tiêu' : 'Còn nhận'}
                  </span>
                )}
              </span>
            }
            hint={
              lecturer.mentoring.reserved > 0
                ? `${lecturer.mentoring.reserved} đề tài đã nhận, chờ sinh viên đăng ký`
                : undefined
            }
          />
        </dl>
      )}

      {!student && !lecturer && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tài khoản quản trị không gắn với hồ sơ sinh viên hay giảng viên nào,
            nên ở đây chỉ quản lý thông tin đăng nhập và ảnh đại diện.
          </p>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Fact label="Email đăng nhập" value={profile.email} />
            <Fact
              label="Ngày tạo tài khoản"
              value={formatDate(profile.createdAt)}
            />
          </dl>
        </div>
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
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm">
        {value ?? <span className="text-muted-foreground">Chưa có</span>}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
