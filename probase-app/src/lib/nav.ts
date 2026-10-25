import {
  BookOpen,
  BookUser,
  CalendarRange,
  ChartColumn,
  ClipboardCheck,
  ClipboardPen,
  FileSearch,
  FileUp,
  Gavel,
  GraduationCap,
  Inbox,
  Layers,
  LibraryBig,
  Lightbulb,
  MessageSquareText,
  ScrollText,
  Shuffle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/api/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;

  ready?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  // Five destinations, no grouping: a label above a flat list of five would be
  // furniture around something already obvious.
  STUDENT: [
    {
      items: [
        { href: '/student', label: 'Đề tài', icon: BookOpen, ready: true },
        {
          href: '/student/groups',
          label: 'Nhóm của tôi',
          icon: Users,
          ready: true,
        },
        {
          href: '/student/proposals',
          label: 'Đề xuất của tôi',
          icon: Lightbulb,
          ready: true,
        },
        {
          href: '/student/submissions',
          label: 'Nộp báo cáo',
          icon: FileUp,
          ready: true,
        },
        {
          href: '/lecturers',
          label: 'Giảng viên',
          icon: GraduationCap,
          ready: true,
        },
        { href: '/student/ket-qua', label: 'Kết quả', icon: ClipboardPen },
      ],
    },
  ],

  // Split because supervising and sitting on a council are two different
  // capacities of the same person. Flattened, a lecturer would confuse the
  // topics they mentor with the ones they have been assigned to review.
  //
  // "Duyệt nhóm" used to be the second entry here and has been removed rather
  // than left disabled: per-group approval is gone from the design entirely —
  // a group that fills up is simply done, and the faculty office settles the
  // whole semester at once — so the item was promising a screen that is never
  // going to be built.
  LECTURER: [
    {
      label: 'Hướng dẫn',
      items: [
        {
          href: '/lecturer',
          label: 'Đề tài của tôi',
          icon: BookOpen,
          ready: true,
        },
        {
          href: '/lecturer/groups',
          label: 'Nhóm hướng dẫn',
          icon: Users,
          ready: true,
        },
        {
          href: '/lecturer/proposals',
          label: 'Đề xuất từ SV',
          icon: Lightbulb,
          ready: true,
        },
        {
          href: '/lecturer/reports',
          label: 'Báo cáo & nhận xét',
          icon: MessageSquareText,
          ready: true,
        },
        {
          href: '/lecturers',
          label: 'Giảng viên',
          icon: GraduationCap,
          ready: true,
        },
        { href: '/lecturer/cham-diem', label: 'Chấm điểm', icon: ClipboardPen },
      ],
    },
    {
      label: 'Hội đồng',
      items: [
        { href: '/lecturer/phan-bien', label: 'Phản biện', icon: FileSearch },
        { href: '/lecturer/hoi-dong', label: 'Hội đồng của tôi', icon: Gavel },
      ],
    },
  ],

  // Eight destinations across four unrelated concerns — this is the role that
  // makes grouping necessary rather than decorative.
  ADMIN: [
    {
      label: 'Vận hành',
      items: [
        {
          href: '/admin',
          label: 'Duyệt đề tài',
          icon: ClipboardCheck,
          ready: true,
        },
        {
          href: '/admin/topic-registry',
          label: 'Quản lý đề tài',
          icon: LibraryBig,
          ready: true,
        },
        // Between approving topics and running councils, which is where it sits
        // in the term as well: it is the work that turns a closed registration
        // window into the list everything afterwards is built on.
        {
          href: '/admin/allocations',
          label: 'Phân bổ đề tài',
          icon: Shuffle,
          ready: true,
        },
        {
          href: '/admin/submissions',
          label: 'Bài nộp',
          icon: Inbox,
          ready: true,
        },
        { href: '/admin/hoi-dong', label: 'Hội đồng bảo vệ', icon: Gavel },
      ],
    },
    {
      label: 'Người dùng',
      // Importing a roster is a button inside a screen, not a destination: it is
      // something you do, not somewhere you go.
      //
      // Two entries rather than one, because they answer different questions.
      // Tài khoản is about logins — who may sign in, in which role. Sinh viên is
      // about the term — who has a topic, under whom, and who is still waiting.
      // The office opens the second one daily and the first one twice a year.
      items: [
        {
          href: '/admin/students',
          label: 'Sinh viên',
          // Not the graduation cap: Chuyên ngành two groups below already wears
          // it, and two entries in one sidebar with the same glyph are two
          // entries nobody can tell apart at a glance.
          icon: BookUser,
          ready: true,
        },
        {
          href: '/admin/accounts',
          label: 'Tài khoản',
          icon: Users,
          ready: true,
        },
      ],
    },
    {
      label: 'Danh mục',
      items: [
        {
          href: '/admin/semesters',
          label: 'Học kỳ',
          icon: CalendarRange,
          ready: true,
        },
        // One destination for both flat lists. They were a page each and each
        // page was a six-row table holding a third of a monitor, while the
        // office declares both in the same sitting at the start of a term.
        {
          href: '/admin/catalogues',
          label: 'Ngành & loại đồ án',
          icon: Layers,
          ready: true,
        },
      ],
    },
    {
      label: 'Hệ thống',
      items: [
        {
          href: '/admin/reports',
          label: 'Báo cáo & thống kê',
          icon: ChartColumn,
          ready: true,
        },
        {
          href: '/admin/audit',
          label: 'Nhật ký hoạt động',
          icon: ScrollText,
          ready: true,
        },
      ],
    },
  ],
};

const TITLE_BY_PREFIX: { prefix: string; label: string }[] = [
  { prefix: '/join/', label: 'Tham gia nhóm' },
  // Reached from the bell rather than the sidebar, so it needs a title here or
  // the header would fall back to the product name on a real screen.
  { prefix: '/notifications', label: 'Thông báo' },
  // Same again for the two screens the account menu opens. Not "/tai-khoan":
  // the admin's user-management screen is already called that, and two
  // different pages answering to the same word is how a support question
  // becomes unanswerable.
  { prefix: '/profile', label: 'Trang cá nhân' },
  // The directory itself and any profile within it share the same heading:
  // "/lecturers" (the list) and "/lecturers/42" (one person) both say
  // "Giảng viên" because the sub-page is the person, not a new section.
  { prefix: '/lecturers', label: 'Giảng viên' },
];

export function topicHref(role: Role, topicId: number): string {
  switch (role) {
    case 'STUDENT':
      return `/student/topics/${topicId}`;
    case 'LECTURER':
      return `/lecturer/topics/${topicId}`;
    case 'ADMIN':
      return `/admin/topics/${topicId}`;
  }
}

export function titleFor(role: Role, pathname: string): string {
  const items = NAV_BY_ROLE[role].flatMap((group) => group.items);
  const match = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    // The role landing is a prefix of every one of its subpages, so the
    // longest match is the specific one.
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match) return match.label;

  const offNav = TITLE_BY_PREFIX.find((entry) =>
    pathname.startsWith(entry.prefix),
  );

  return offNav?.label ?? 'ProBase';
}

export interface BreadcrumbSegment {
  label: string;
  href: string;

  isCurrent: boolean;
}

export function breadcrumbsFor(
  role: Role,
  pathname: string,
  getSegmentLabel: ((segment: string) => string | null) | null = null,
): BreadcrumbSegment[] {
  const navItems = NAV_BY_ROLE[role].flatMap((g) => g.items);

  // Human-readable labels for well-known static sub-path segments that do not
  // appear as nav items (because they are reached from content links rather
  // than the sidebar).
  const STATIC_SEGMENT_LABELS: Record<string, string> = {
    moi: 'Tạo mới',
    new: 'Tạo mới',
    topics: 'Đề tài',
  };

  // Split on "/" and drop the empty string left by the leading slash.
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [];

  const baseMatch = navItems
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  const segments: BreadcrumbSegment[] = [];

  for (let i = 0; i < parts.length; i++) {
    const cumPath = '/' + parts.slice(0, i + 1).join('/');
    const isLast = i === parts.length - 1;
    const rawSegment = parts[i];

    if (baseMatch && cumPath.length < baseMatch.href.length) {
      continue;
    }

    // 1. Exact or prefix match in the role's nav items. We prefer the longest
    //    nav item that is a prefix of cumPath so that sub-paths inherit the
    //    right label from their parent nav entry.
    const navMatch = navItems
      .filter(
        (item) => item.href === cumPath || cumPath.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];

    if (navMatch && navMatch.href === cumPath) {
      // Avoid duplicating the role root when it is already captured as the
      // parent of the first real nav entry.
      const isDupe = segments.some((s) => s.href === cumPath);
      if (!isDupe) {
        segments.push({
          label: navMatch.label,
          href: cumPath,
          isCurrent: isLast,
        });
      }
      continue;
    }

    // 2. Off-nav prefix match (thong-bao, ca-nhan, giang-vien …).
    const offNav = TITLE_BY_PREFIX.find(
      (entry) =>
        cumPath === entry.prefix || cumPath.startsWith(`${entry.prefix}/`),
    );
    if (offNav && cumPath === offNav.prefix) {
      segments.push({ label: offNav.label, href: cumPath, isCurrent: isLast });
      continue;
    }

    // 3. Dynamic segment (numeric ID or slug). Use the context override if
    //    available, then a static label map, then fall back to the raw string.
    const overrideLabel = getSegmentLabel ? getSegmentLabel(rawSegment) : null;
    const label =
      overrideLabel ?? STATIC_SEGMENT_LABELS[rawSegment] ?? rawSegment;
    segments.push({ label, href: cumPath, isCurrent: isLast });
  }

  return segments;
}
