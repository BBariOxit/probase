'use client';

import { useState } from 'react';
import { Archive, BookOpen, Users } from 'lucide-react';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useMyProfile } from '@/lib/api/me';
import {
  useActiveSemester,
  useMajors,
  useProjectTypes,
  useSemesters,
} from '@/lib/api/master-data';
import { useTopics } from '@/lib/api/topics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyCurrentTopicsTab } from '@/components/lecturer/topics/my-current-topics-tab';
import { TopicArchiveTab } from '@/components/lecturer/topics/topic-archive-tab';
import { ColleagueTopicsTab } from '@/components/lecturer/topics/colleague-topics-tab';

export default function LecturerTopicsPage() {
  const allowed = useRequireRole('LECTURER');
  const { data: profile } = useMyProfile({ enabled: allowed });

  const activeSemester = useActiveSemester();
  const { data: allSemesters = [] } = useSemesters();
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: majors = [] } = useMajors();

  const [activeTab, setActiveTab] = useState('current');

  const currentLecturerId = profile?.lecturer?.id ?? 0;
  const isHeadOfDepartment = profile?.lecturer?.isHeadOfDepartment ?? false;
  const lecturerMajorId = profile?.lecturer?.major?.id;

  // Counter for active tab
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
    <div className="space-y-4">
      {/* HEADER & TABS NAVIGATION */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="h-10 p-1 bg-slate-100 dark:bg-[#18181b] border border-slate-300 dark:border-neutral-700 rounded-lg">
            <TabsTrigger
              value="current"
              className="gap-2 text-xs font-semibold px-3 py-1.5"
            >
              <BookOpen className="size-3.5" />
              <span>Đề tài của tôi</span>
              {myCurrentTopicsData?.total !== undefined && (
                <span className="ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold bg-slate-200/80 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {myCurrentTopicsData.total}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="archive"
              className="gap-2 text-xs font-semibold px-3 py-1.5"
            >
              <Archive className="size-3.5" />
              <span>Kho đề tài cũ</span>
            </TabsTrigger>

            <TabsTrigger
              value="colleagues"
              className="gap-2 text-xs font-semibold px-3 py-1.5"
            >
              <Users className="size-3.5" />
              <span>Đề tài đồng nghiệp</span>
              {colleagueTopicsData?.total !== undefined && (
                <span className="ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold bg-slate-200/80 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {colleagueTopicsData.total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {activeSemester && (
            <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
              Học kỳ:{' '}
              <span className="font-semibold text-slate-800 dark:text-neutral-200">
                {activeSemester.name}
              </span>
            </div>
          )}
        </div>

        {/* TAB 1: ĐỀ TÀI CỦA TÔI (KỲ NÀY) */}
        <TabsContent value="current" className="space-y-4 pt-1">
          <MyCurrentTopicsTab
            activeSemester={activeSemester}
            isHeadOfDepartment={isHeadOfDepartment}
            lecturerMajorId={lecturerMajorId}
            projectTypes={projectTypes}
            majors={majors}
          />
        </TabsContent>

        {/* TAB 2: KHO ĐỀ TÀI CŨ (CÓ TÍNH NĂNG NHÂN BẢN) */}
        <TabsContent value="archive" className="space-y-4 pt-1">
          <TopicArchiveTab
            currentLecturerId={currentLecturerId}
            activeSemester={activeSemester}
            allSemesters={allSemesters}
            projectTypes={projectTypes}
            majors={majors}
            onTopicCloned={() => {
              // Automatically switch to current tab when user clones a topic so they see their new draft
              setActiveTab('current');
            }}
          />
        </TabsContent>

        {/* TAB 3: ĐỀ TÀI ĐỒNG NGHIỆP (KỲ NÀY - HIỆN CẢ DRAFT ĐỂ TRÁNH TRÙNG LẶP) */}
        <TabsContent value="colleagues" className="space-y-4 pt-1">
          <ColleagueTopicsTab
            currentLecturerId={currentLecturerId}
            activeSemester={activeSemester}
            projectTypes={projectTypes}
            majors={majors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
