export type Role = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface SessionUser {
  id: number;
  email: string;
  role: Role;
  mustChangePassword: boolean;

  fullName: string | null;
  avatarUrl: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends TokenPair {
  user: SessionUser;
}

export interface ChangePasswordResponse extends TokenPair {
  message: string;
}

export interface MeResponse {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  avatarUrl: string | null;
  studentProfile: {
    fullName: string;
    studentCode: string;
    class?: string;
    cohort?: string;
    major?: { id: number; name: string; code: string } | null;
  } | null;
  lecturerProfile: {
    fullName: string;
    lecturerCode: string;
    academicTitle?: string | null;
    isHeadOfDepartment?: boolean;
    isFacultyBoard?: boolean;
    isAcademicAssistant?: boolean;
    major?: { id: number; name: string; code: string } | null;
  } | null;
}

export function displayName(me: MeResponse): string {
  return (
    me.studentProfile?.fullName ?? me.lecturerProfile?.fullName ?? me.email
  );
}

export type RoundPhase =
  'PREP' | 'OPEN' | 'RECONCILING' | 'EXTENDED' | 'FINALIZED';

export interface Semester {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  gradeSubmissionDeadline: string | null;
  isActive: boolean;
}

export interface RegistrationRound {
  id: number;
  semesterId: number;
  projectTypeId: number;
  phase: RoundPhase;
  registrationStart: string;
  registrationEnd: string;
  allocationMode: 'FIRST_COME' | 'PREFERENCE_ROUND';
  finalisedAt: string | null;
  semester: { id: number; name: string; code: string };
  projectType: ProjectType;
  cohorts: string[];
}

export interface TopicRound {
  id: number;
  phase: RoundPhase;
  registrationStart: string;
  registrationEnd: string;
}

export interface ProjectType {
  id: number;
  name: string;
  code: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type RegistrationGroupStatus =
  'FORMING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface ActiveGroup {
  id: number;
  status: RegistrationGroupStatus;
  occupiedSeats: number;
  openForJoin: boolean;

  holdActive: boolean;
}

export type TopicStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_DEPARTMENT'
  | 'PENDING_FACULTY'
  | 'APPROVED_OPEN'
  | 'APPROVED'
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED';

export interface TopicAvailability {
  occupiedSeats: number;
  isFull: boolean;

  canRegister: boolean;

  canJoin: boolean;

  eligibleForMe: boolean | null;

  alreadyInAGroup: boolean | null;

  fromProposal: boolean;

  proposedByMe: boolean | null;

  isMyGroup: boolean | null;
}

export type NotificationType =
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_REVISION_REQUESTED'
  | 'PROPOSAL_RESUBMITTED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'GROUP_MEMBER_JOINED'
  | 'GROUP_MEMBER_REMOVED'
  | 'GROUP_DISBANDED'
  | 'ROUND_EXTENDED'
  | 'GROUP_MEMBER_ASSIGNED'
  | 'TOPIC_STUDENT_ASSIGNED'
  | 'ROUND_FINALIZED'
  | 'SUBMISSION_FEEDBACK'
  | 'REGISTRATION_CLOSING_SOON'
  | 'SUBMISSION_DUE_SOON'
  | 'GRADE_PUBLISHED'
  | 'DEADLINE_REMINDER'
  | 'OUTLINE_SUBMITTED'
  | 'OUTLINE_REVISION_REQUESTED'
  | 'OUTLINE_APPROVED'
  | 'STUDENT_ELIGIBILITY_CONFIRMED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  content: string;

  targetId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  total: number;

  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TopicListItem extends TopicAvailability {
  id: number;
  title: string;
  maxStudents: number;
  status: TopicStatus;
  majorId?: number | null;
  major?: { id: number; name: string; code: string } | null;
  departmentFeedback?: string | null;
  facultyFeedback?: string | null;
  departmentReviewer?: {
    id: number;
    fullName: string;
    academicTitle: string | null;
  } | null;
  facultyApprover?: {
    id: number;
    fullName: string;
    academicTitle: string | null;
  } | null;
  createdAt: string;
  semester: { id: number; name: string; code: string };
  round: TopicRound;
  projectType: { id: number; name: string; code: string };
  lecturer: { id: number; fullName: string; academicTitle: string | null };
  activeGroup: ActiveGroup | null;
}

export interface TopicDetail extends TopicAvailability {
  id: number;
  title: string;
  description: string;
  expectedOutcomes: string;
  objectives?: string | null;
  techStack?: string | null;
  maxStudents: number;
  status: TopicStatus;
  majorId?: number | null;
  major?: { id: number; name: string; code: string } | null;
  departmentFeedback?: string | null;
  facultyFeedback?: string | null;
  departmentReviewer?: {
    id: number;
    fullName: string;
    academicTitle: string | null;
  } | null;
  facultyApprover?: {
    id: number;
    fullName: string;
    academicTitle: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  semesterId: number;
  projectTypeId: number;
  semester: { id: number; name: string; code: string };

  round: TopicRound;
  projectType: { id: number; name: string; code: string };
  lecturer: {
    id: number;
    fullName: string;
    lecturerCode: string;
    academicTitle: string | null;
  };
  activeGroup: ActiveGroup | null;
  roundPhase: RoundPhase;

  isRegistrationOpen: boolean;
}

export interface DepartmentReviewInput {
  action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT';
  feedback?: string;
}

export interface FacultyReviewInput {
  action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT';
  feedback?: string;
}

export interface SimilarityMatch {
  matchedTopicId: number;
  matchedTitle: string;
  matchedLecturerName: string;
  matchedSemesterName: string;
  similarityScore: number;
  matchedFields: {
    titleSimilarity: number;
    contentSimilarity: number;
    overlappingKeywords: string[];
  };
}

export type GroupJoinSource = 'SELF' | 'LINK' | 'ASSIGNED';

export interface BulkOpenResult {
  updated: number;
}

export interface GroupMember {
  id: number;
  joinSource: GroupJoinSource;
  joinedAt: string | null;
  isLeader: boolean;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    class: string | null;
    cohort: string | null;
    major: { id: number; name: string; code: string } | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface RegistrationGroup {
  id: number;
  topicId: number;
  semesterId: number;
  leaderId: number;
  name: string | null;
  status: RegistrationGroupStatus;
  openForJoin: boolean;
  declaredSize: number | null;
  holdUntil: string | null;
  createdAt: string;
  topic: {
    id: number;
    title: string;
    maxStudents: number;
    lecturerId: number;
    lecturer: { id: number; fullName: string; academicTitle: string | null };
    projectType: { id: number; name: string; code: string };
  };

  requirements: SubmissionRequirement[];
  members: GroupMember[];
  occupiedSeats: number;

  heldSeats: number;
  seatsOpenToAnyone: number;
  isFull: boolean;
  holdActive: boolean;
  isLeader: boolean;

  joinCode: string | null;
}

export interface JoinPreview {
  group: {
    id: number;
    name: string | null;
    occupiedSeats: number;
    capacity: number;
    isFull: boolean;
    members: { fullName: string; isLeader: boolean }[];
  };
  topic: {
    id: number;
    title: string;
    projectType: { id: number; name: string; code: string };
    lecturer: { id: number; fullName: string; academicTitle: string | null };
  };
  alreadyMember: boolean;
  canJoin: boolean;

  blockedReason: string | null;
}

export interface MyProfile {
  id: number;
  email: string;
  role: Role;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  fullName: string | null;
  student: {
    studentCode: string;
    fullName: string;
    class: string | null;
    cohort: string | null;
    phone: string | null;
    bio: string | null;
    major: { id: number; name: string; code: string } | null;
  } | null;
  lecturer: {
    id: number;
    lecturerCode: string;
    fullName: string;
    academicTitle: string | null;
    phone: string | null;
    bio: string | null;
    researchInterests: string | null;
    isHeadOfDepartment?: boolean;
    isFacultyBoard?: boolean;
    isAcademicAssistant?: boolean;
    major?: { id: number; name: string; code: string } | null;
    mentoring: MentoringLoad;
  } | null;
}

export interface MentoringLoad {
  groups: number;
  reserved: number;

  quota: number | null;
  atQuota: boolean;
}

export interface UpdateMyProfileInput {
  phone?: string | null;
  bio?: string | null;

  academicTitle?: string | null;
  researchInterests?: string | null;
}

export interface PublicLecturer extends LecturerDirectoryEntry {
  bio: string | null;
  email: string | null;
  phone: string | null;
}

export interface LecturerDirectoryEntry {
  id: number;
  fullName: string;
  academicTitle: string | null;
  researchInterests: string | null;
  avatarUrl: string | null;
  mentoring: MentoringLoad;
}

export interface AllocationDesk {
  round: {
    id: number;
    phase: RoundPhase;
    semester: { id: number; name: string; code: string };
    projectType: ProjectType;

    cohorts: string[];
  };

  canPlace: boolean;

  blockedReason: string | null;
  summary: {
    unplacedCount: number;
    openSeats: number;

    shortfall: number;

    unopenedTopics: number;
    unopenedSeats: number;
  };
  students: UnplacedStudent[];
  topics: AllocationTopic[];
  placements: Placement[];
}

export interface UnplacedStudent {
  id: number;
  studentCode: string;
  fullName: string;
  class: string | null;
  cohort: string | null;
  major: { id: number; name: string; code: string } | null;
  userId: number;
  email: string;
  avatarUrl: string | null;
}

export interface AllocationTopic {
  id: number;
  title: string;
  maxStudents: number;
  status: TopicStatus;
  lecturer: { id: number; fullName: string; academicTitle: string | null };
  occupiedSeats: number;
  freeSeats: number;

  group: { id: number; name: string | null } | null;
}

export interface Placement {
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    class: string | null;
  };
  groupId: number;
  topicId: number;
  topicTitle: string;
  assignedAt: string | null;
}

export interface Major {
  id: number;
  name: string;
  code: string;
  _count: { students: number };
}

export interface ProjectTypeDetail extends ProjectType {
  _count: { rounds: number; topicProposals: number };
}

export interface UserAccount {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentProfile: {
    id: number;
    studentCode: string;
    fullName: string;
    class: string | null;
    cohort: string | null;
  } | null;
  lecturerProfile: {
    id: number;
    lecturerCode: string;
    fullName: string;
    academicTitle: string | null;
  } | null;
}

export interface UsersPage {
  data: UserAccount[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface UserDetail extends Omit<
  UserAccount,
  'studentProfile' | 'lecturerProfile'
> {
  avatarUrl: string | null;
  mustChangePassword: boolean;
  studentProfile: StudentProfileDetail | null;
  lecturerProfile: LecturerProfileDetail | null;
}

export interface StudentProfileDetail {
  id: number;
  userId: number;
  majorId: number | null;
  studentCode: string;
  fullName: string;
  class: string | null;

  cohort: string | null;
  phone: string | null;
  bio: string | null;

  note: string | null;
}

export interface LecturerProfileDetail {
  id: number;
  userId: number;
  lecturerCode: string;
  fullName: string;
  academicTitle: string | null;
  phone: string | null;
  bio: string | null;
  researchInterests: string | null;

  maxMentoringQuota: number | null;
}

export interface StudentProfileInput {
  studentCode: string;
  fullName: string;
  majorId?: number | null;
  class?: string | null;
  phone?: string | null;
  bio?: string | null;
  note?: string | null;
}

export interface LecturerProfileInput {
  lecturerCode: string;
  fullName: string;
  academicTitle?: string | null;
  phone?: string | null;
  bio?: string | null;
  researchInterests?: string | null;

  maxMentoringQuota?: number | null;
}

export interface ImportRowResult {
  row: number;
  email?: string;
  role?: 'STUDENT' | 'LECTURER';

  reason?: string;

  emailSent?: boolean;

  warnings?: string[];
}

export interface BulkImportResult {
  total: number;
  createdCount: number;
  failedCount: number;
  emailsFailedCount: number;
  warnedCount: number;
  created: ImportRowResult[];
  failed: ImportRowResult[];
}

// ── Import Wizard types ──────────────────────────────────────

export type SystemField =
  | 'role'
  | 'email'
  | 'fullName'
  | 'code'
  | 'majorCode'
  | 'class'
  | 'academicTitle'
  | 'researchInterests'
  | 'phone'
  | 'bio';

export type ColumnMapping = Record<SystemField, string | null>;

export interface FieldSuggestion {
  fileColumn: string | null;
  confidence: number;
}

export interface ParseImportResult {
  sessionId: string;
  headers: string[];
  suggestions: Record<SystemField, FieldSuggestion>;
  rowCount: number;
  expiresAt: string;
}

export interface PreviewImportRow {
  row: number;
  valid: boolean;
  email?: string;
  role?: string;
  fullName?: string;
  warnings?: string[];
  reason?: string;
  values?: Record<string, string>;
}

export interface PreviewImportResult {
  sessionId: string;
  total: number;
  validCount: number;
  invalidCount: number;
  rows: PreviewImportRow[];
}

export interface CommitImportResult {
  sessionId: string;
  createdCount: number;
  failedCount: number;
  warnedCount: number;
  created: ImportRowResult[];
  failed: ImportRowResult[];
}

export interface AuditLogEntry {
  id: number;
  action: string;
  targetTable: string;
  targetId: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  user: {
    id: number;
    email: string;
    role: Role;

    fullName: string | null;
  };
}

export interface RoundPlanInput {
  projectTypeId: number;

  registrationStart: string;
  registrationEnd: string;

  cohorts: string[];
  allocationMode?: 'FIRST_COME' | 'PREFERENCE_ROUND';
}

export interface StudentRosterRow {
  id: number;
  studentCode: string;
  fullName: string;
  class: string | null;

  cohort: string | null;
  note: string | null;
  major: { id: number; name: string; code: string } | null;
  userId: number;
  email: string;
  isActive: boolean;
  avatarUrl: string | null;
  group: {
    id: number;
    name: string | null;
    topic: {
      id: number;
      title: string;
      projectType: ProjectType;
      lecturer: { id: number; fullName: string; academicTitle: string | null };
    };
  } | null;
}

export interface SubmissionRequirement {
  id: number;
  name: string;

  dueAt: string;

  isRequired: boolean;
  sortOrder: number;
}

export interface Submission {
  id: number;

  requirement: SubmissionRequirement;
  version: number;
  fileUrl: string | null;

  fileName: string | null;
  fileSize: number | null;
  submissionUrl: string | null;
  lecturerFeedback: string | null;

  feedbackAt: string | null;
  submittedAt: string;

  submittedBy: { id: number; fullName: string; studentCode: string } | null;
  group: {
    id: number;
    name: string | null;
    topic: {
      id: number;
      title: string;
      lecturer: { id: number; fullName: string; academicTitle: string | null };
    };
  };

  dueAt: string | null;

  isLate: boolean;
}

export type ProposalStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'NEEDS_REVISION';

export interface ProposalComment {
  id: number;
  proposalId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    fullName: string;
    avatarUrl?: string | null;
    role: string;
  };
}

export interface ProposalAttachment {
  id: number;
  fileUrl: string;
  filePublicId: string;
  fileName: string;
  fileSize: number;
  fileType: 'IMAGE' | 'DOCUMENT';
  createdAt: string;
}

export interface TopicProposal {
  id: number;
  status: ProposalStatus;
  title: string;
  description: string;
  expectedOutcomes: string;

  lecturerFeedback: string | null;
  createdAt: string;
  updatedAt: string;
  semester: { id: number; name: string; code: string };
  projectType: ProjectType;
  student: {
    id: number;
    fullName: string;
    studentCode: string;
    class: string | null;
    avatarUrl: string | null;
  };
  requestedLecturer: {
    id: number;
    fullName: string;
    academicTitle: string | null;
  };

  acceptedByLecturer: {
    id: number;
    fullName: string;
    academicTitle: string | null;
  } | null;

  attachments: ProposalAttachment[];
  comments?: ProposalComment[];

  convertedTopic: { id: number; title: string; status: TopicStatus } | null;
}

export interface FacultyReport {
  semester: { id: number; name: string; code: string };
  rounds: RoundReportRow[];
  supervision: SupervisionRow[];
  majors: MajorReportRow[];
  progress: ProgressRow[];
}

export interface RoundReportRow {
  roundId: number;
  projectType: ProjectType;
  phase: RoundPhase;
  cohorts: string[];

  eligible: number;
  withGroup: number;
  withoutGroup: number;

  selfRegistered: number;

  assigned: number;
  topics: number;
  topicsUnderway: number;
}

export interface SupervisionRow {
  lecturerId: number;
  fullName: string;
  academicTitle: string | null;
  groups: number;
  students: number;
}

export interface MajorReportRow {
  majorId: number;
  name: string;
  code: string;
  students: number;
  withGroup: number;
}

export interface ProgressRow {
  roundId: number;
  projectType: ProjectType;
  groups: number;

  required: number;

  complete: number;

  awaitingFeedback: number;

  items: {
    requirementId: number;
    name: string;
    dueAt: string;
    isRequired: boolean;
    submitted: number;
  }[];
}

export type OutlineStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'NEEDS_REVISION'
  | 'APPROVED_BY_LECTURER';

export interface TopicOutline {
  id?: number;
  groupId?: number;
  topicId?: number;
  status: OutlineStatus;
  attachmentUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  lecturerFeedback?: string | null;
  submittedBy?: {
    id: number;
    email: string;
    studentProfile?: {
      fullName: string;
      studentCode: string;
    } | null;
  } | null;
}

export interface StudentGroupOutlineResponse {
  hasGroup: boolean;
  hasTopic?: boolean;
  message?: string;
  group: {
    id: number;
    name: string | null;
    code?: string | null;
    topic: TopicDetail;
    members: Array<{
      id: number;
      student: {
        id: number;
        fullName: string;
        studentCode: string;
        class?: string | null;
        user: { id: number; email: string; avatarUrl: string | null };
      };
    }>;
    leader: {
      id: number;
      fullName: string;
      studentCode: string;
    };
  } | null;
  outline: TopicOutline | null;
}

export interface LecturerGroupOutlineItem {
  id: number;
  name: string | null;
  topic: TopicDetail;
  members: Array<{
    id: number;
    student: {
      id: number;
      fullName: string;
      studentCode: string;
      class?: string | null;
      user: { id: number; email: string; avatarUrl: string | null };
    };
  }>;
  leader: {
    id: number;
    fullName: string;
    studentCode: string;
  };
  outline: TopicOutline | null;
}

export interface FacultyOutlineOverview {
  items: LecturerGroupOutlineItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    totalGroups: number;
    approved: number;
    submitted: number;
    needsRevision: number;
    notSubmitted: number;
  };
}

export interface EligibleStudentItem {
  id: number;
  roundId: number;
  studentId: number;
  studentCode: string;
  fullName: string;
  class: string | null;
  cohort: string | null;
  major: { id: number; name: string; code: string } | null;
  email: string;
  isActive: boolean;
  avatarUrl: string | null;
  note: string | null;
  createdAt: string;
  hasGroup: boolean;
  group: {
    id: number;
    name: string | null;
    topic: {
      id: number;
      title: string;
      lecturer: { id: number; fullName: string; academicTitle: string | null };
    } | null;
  } | null;
}

export interface EligibleStudentsResponse {
  round: {
    id: number;
    semesterId: number;
    semesterName: string;
    projectTypeId: number;
    projectTypeName: string;
  };
  items: EligibleStudentItem[];
  total: number;
  totalEligible: number;
  withGroupCount: number;
  withoutGroupCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ImportEligibleStudentsResult {
  totalRows: number;
  importedCount: number;
  createdAccountsCount: number;
  errorCount: number;
  errors: { row: number; reason: string }[];
}

export interface StudentEligibilityStatus {
  isEligible: boolean;
  specific: boolean;
  message: string;
  rounds: {
    roundId: number;
    projectTypeId: number;
    projectTypeName: string;
    semesterName: string;
    deadline: string | null;
    note: string | null;
  }[];
}

