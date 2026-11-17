'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useMyProfile } from '@/lib/api/me';
import {
  useActiveSemester,
  useMajors,
  useProjectTypes,
  useSemesters,
} from '@/lib/api/master-data';
import { useTopics } from '@/lib/api/topics';
import { MyCurrentTopicsTab } from '@/components/lecturer/topics/my-current-topics-tab';
import { TopicArchiveTab } from '@/components/lecturer/topics/topic-archive-tab';
import { ColleagueTopicsTab } from '@/components/lecturer/topics/colleague-topics-tab';

export default function LecturerTopicsPage() {
  const allowed = useRequireRole(['LECTURER', 'GVCN']);
  const { data: profile } = useMyProfile({ enabled: allowed });

  const activeSemester = useActiveSemester();
  const { data: allSemesters = [] } = useSemesters();
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: majors = [] } = useMajors();

  const [activeTab, setActiveTab] = useState<'current' | 'archive' | 'colleagues'>('current');

  const currentLecturerId = profile?.lecturer?.id ?? 0;
  const isHeadOfDepartment = profile?.lecturer?.isHeadOfDepartment ?? false;
  const lecturerMajorId = profile?.lecturer?.major?.id;

  // Counters for tabs
  const { data: myCurrentTopicsData } = useTopics(
    {
      mine: true,
      semesterId: activeSemester?.id,
      limit: 1,
    },
    { enabled: allowed && !!activeSemester?.id },
  );

  const { data: colleagueTopicsData } = useTopics(
    {
      semesterId: activeSemester?.id,
      includeDrafts: true,
      excludeLecturerId: currentLecturerId || undefined,
      limit: 1,
    },
    { enabled: allowed && !!activeSemester?.id && currentLecturerId > 0 },
  );

  if (!allowed) return null;

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang tích hợp tab điều hướng chuẩn trang phân quyền vai trò */}
      <div className="flex items-center gap-8 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={cn(
            'group inline-flex items-center gap-2 pb-0.5 text-xl font-bold tracking-tight transition-colors cursor-pointer relative',
            activeTab === 'current'
              ? 'text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span>Đề tài của tôi</span>
          {myCurrentTopicsData?.total !== undefined && (
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
              {myCurrentTopicsData.total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          className={cn(
            'group inline-flex items-center gap-2 pb-0.5 text-xl font-bold tracking-tight transition-colors cursor-pointer relative',
            activeTab === 'archive'
              ? 'text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span>Đề tài kỳ trước</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colleagues')}
          className={cn(
            'group inline-flex items-center gap-2 pb-0.5 text-xl font-bold tracking-tight transition-colors cursor-pointer relative',
            activeTab === 'colleagues'
              ? 'text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span>Giảng viên khác</span>
          {colleagueTopicsData?.total !== undefined && (
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
              {colleagueTopicsData.total}
            </span>
          )}
        </button>
      </div>

      {/* NỘI DUNG TAB */}
      {activeTab === 'current' && (
        <MyCurrentTopicsTab
          activeSemester={activeSemester}
          isHeadOfDepartment={isHeadOfDepartment}
          lecturerMajorId={lecturerMajorId}
          projectTypes={projectTypes}
          majors={majors}
        />
      )}

      {activeTab === 'archive' && (
        <TopicArchiveTab
          currentLecturerId={currentLecturerId}
          activeSemester={activeSemester}
          allSemesters={allSemesters}
          projectTypes={projectTypes}
          majors={majors}
          onTopicCloned={() => {
            setActiveTab('current');
          }}
        />
      )}

      {activeTab === 'colleagues' && (
        <ColleagueTopicsTab
          currentLecturerId={currentLecturerId}
          activeSemester={activeSemester}
          projectTypes={projectTypes}
          majors={majors}
        />
      )}
    </div>
  );
}
