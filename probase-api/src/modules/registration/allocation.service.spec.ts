import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GroupJoinSource,
  GroupMemberStatus,
  RegistrationGroupStatus,
  RoundPhase,
  TopicStatus,
} from '../../../generated/prisma/client';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { StudentRosterService } from '../students/student-roster.service';
import {
  AllocationService,
  buildAutoAllocationPlan,
} from './allocation.service';

const KTPM = { id: 1, name: 'Kỹ thuật phần mềm', code: 'KTPM' };
const MMT = { id: 2, name: 'Mạng máy tính', code: 'MMT' };

function makeStudent(
  id: number,
  code: string,
  cls: string | null,
  major: { id: number; name: string; code: string } | null,
) {
  return {
    id,
    studentCode: code,
    fullName: `Sinh viên ${code}`,
    class: cls,
    cohort: '2022',
    major,
  };
}

function makeTopic(
  id: number,
  title: string,
  lecturerId: number,
  major: { id: number; name: string; code: string } | null,
  occupiedSeats: number,
  maxStudents = 2,
  existingClasses: (string | null)[] = [],
) {
  return {
    id,
    title,
    maxStudents,
    major,
    lecturer: { id: lecturerId, fullName: `GV ${lecturerId}`, academicTitle: 'ThS.' },
    occupiedSeats,
    freeSeats: maxStudents - occupiedSeats,
    existingMembers: existingClasses.map((cls) => ({ class: cls })),
  };
}

describe('buildAutoAllocationPlan', () => {
  it('fills existing partially-occupied groups first and keeps classmates together under FILL_EXISTING', () => {
    const s1 = makeStudent(1, '2288001', 'CTK46PM', KTPM);
    const s2 = makeStudent(2, '2288002', 'CTK46PM', KTPM);
    const s3 = makeStudent(3, '2299001', 'CTK46MMT', MMT);

    const tOpenEmpty = makeTopic(10, 'Đề tài AI mới', 1, KTPM, 0, 2);
    const tStarted = makeTopic(11, 'Đề tài Web đang thiếu 1', 2, KTPM, 1, 2, [
      'CTK46PM',
    ]);

    const plan = buildAutoAllocationPlan({
      students: [s1, s2, s3],
      topics: [tOpenEmpty, tStarted],
      lecturerStudentCounts: new Map([
        [1, 0],
        [2, 1],
      ]),
      strategy: 'FILL_EXISTING',
      allowCrossMajor: false,
    });

    expect(plan.matched).toHaveLength(2);
    expect(plan.matched[0].student.id).toBe(1);
    expect(plan.matched[0].topic.id).toBe(11); // started 1/2 filled first
    expect(plan.matched[1].student.id).toBe(2);
    expect(plan.matched[1].topic.id).toBe(10);

    // MMT student stays unmatched instead of being pushed into KTPM when allowCrossMajor=false
    expect(plan.unmatched).toHaveLength(1);
    expect(plan.unmatched[0].student.id).toBe(3);
    expect(plan.unmatched[0].reasonCode).toBe('NO_COMPATIBLE_MAJOR');
  });

  it('balances load across lecturers under BALANCE_LECTURER', () => {
    const s1 = makeStudent(1, '2288001', 'CTK46PM', KTPM);
    const s2 = makeStudent(2, '2288002', 'CTK46PM', KTPM);

    const tLec1 = makeTopic(10, 'Đề tài A', 1, KTPM, 0, 2);
    const tLec2 = makeTopic(11, 'Đề tài B', 2, KTPM, 0, 2);

    const plan = buildAutoAllocationPlan({
      students: [s1, s2],
      topics: [tLec1, tLec2],
      lecturerStudentCounts: new Map([
        [1, 0],
        [2, 0],
      ]),
      strategy: 'BALANCE_LECTURER',
      allowCrossMajor: false,
    });

    const assignedTopics = plan.matched.map((item) => item.topic.id);
    expect(new Set(assignedTopics).size).toBe(2);
  });

  it('allows cross-major fallback only when allowCrossMajor=true', () => {
    const s1 = makeStudent(1, '2299001', 'CTK46MMT', MMT);
    const tKtpm = makeTopic(10, 'Đề tài KTPM', 1, KTPM, 0, 2);

    const plan = buildAutoAllocationPlan({
      students: [s1],
      topics: [tKtpm],
      lecturerStudentCounts: new Map(),
      strategy: 'FILL_EXISTING',
      allowCrossMajor: true,
    });

    expect(plan.matched).toHaveLength(1);
    expect(plan.matched[0].matchType).toBe('CROSS_MAJOR');
    expect(plan.unmatched).toHaveLength(0);
  });
});

describe('AllocationService batch operations', () => {
  let service: AllocationService;
  let prisma: {
    registrationRound: { findUnique: jest.Mock };
    studentProfile: { findMany: jest.Mock };
    roundStudentEligibility: { findMany: jest.Mock };
    registrationGroupMember: {
      findMany: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
    topic: { findMany: jest.Mock };
    registrationGroup: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let phases: { resolve: jest.Mock };
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      registrationRound: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          semesterId: 10,
          semester: { id: 10, name: 'HK1', code: 'HK1' },
          projectType: { id: 1, name: 'ĐACN', code: 'DACN' },
          eligibilities: [{ cohort: '2022' }],
          _count: { eligibleStudents: 0 },
        }),
      },
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 101,
            studentCode: '2288001',
            fullName: 'SV Một',
            cohort: '2022',
            userId: 1001,
            user: { isActive: true },
          },
          {
            id: 102,
            studentCode: '2288002',
            fullName: 'SV Hai',
            cohort: '2022',
            userId: 1002,
            user: { isActive: true },
          },
        ]),
      },
      roundStudentEligibility: { findMany: jest.fn().mockResolvedValue([]) },
      registrationGroupMember: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      topic: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 50,
            title: 'Đề tài Edge AI',
            roundId: 1,
            semesterId: 10,
            maxStudents: 2,
            status: TopicStatus.OPEN,
            lecturer: { userId: 2001 },
          },
        ]),
      },
      registrationGroup: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 900 }),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };

    phases = { resolve: jest.fn().mockResolvedValue(RoundPhase.RECONCILING) };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoundPhaseService, useValue: phases },
        { provide: NotificationsService, useValue: notifications },
        { provide: StudentRosterService, useValue: { find: jest.fn() } },
      ],
    }).compile();

    service = module.get(AllocationService);
  });

  it('rejects duplicate studentIds in batchPlace', async () => {
    await expect(
      service.batchPlace(
        1,
        {
          placements: [
            { studentId: 101, topicId: 50 },
            { studentId: 101, topicId: 50 },
          ],
        },
        99,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('places multiple students into one empty topic in a single transaction and sends consolidated lecturer notice', async () => {
    const res = await service.batchPlace(
      1,
      {
        placements: [
          { studentId: 101, topicId: 50 },
          { studentId: 102, topicId: 50 },
        ],
      },
      99,
    );

    expect(res.placedCount).toBe(2);
    expect(prisma.registrationGroup.create).toHaveBeenCalledTimes(1);
    expect(prisma.registrationGroupMember.create).toHaveBeenCalledTimes(2);
    expect(prisma.registrationGroup.update).toHaveBeenCalledWith({
      where: { id: 900 },
      data: { status: RegistrationGroupStatus.SUBMITTED },
    });
    // 2 student notices + 1 consolidated lecturer notice
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 1001 }),
        expect.objectContaining({ userId: 1002 }),
        expect.objectContaining({
          userId: 2001,
          content: expect.stringContaining('SV Một, SV Hai'),
        }),
      ]),
    );
  });

  it('rejects batchPlace when incoming students exceed free seats', async () => {
    prisma.registrationGroup.findFirst.mockResolvedValue({
      id: 900,
      leaderId: 100,
      members: [{ studentId: 100, student: { userId: 1000 } }],
    });

    await expect(
      service.batchPlace(
        1,
        {
          placements: [
            { studentId: 101, topicId: 50 },
            { studentId: 102, topicId: 50 },
          ],
        },
        99,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects batchUnplace if any student self-registered', async () => {
    prisma.registrationGroupMember.findMany.mockResolvedValue([
      {
        id: 1,
        groupId: 900,
        joinSource: GroupJoinSource.SELF,
        student: { id: 101, fullName: 'SV Một', studentCode: '2288001', userId: 1001 },
        group: {
          topicId: 50,
          leaderId: 101,
          topic: { title: 'Đề tài Edge AI', maxStudents: 2 },
        },
      },
    ]);

    await expect(
      service.batchUnplace(1, { studentIds: [101] }, 99),
    ).rejects.toThrow(ConflictException);
  });
});
