import { Test, TestingModule } from '@nestjs/testing';
import {
  GroupJoinSource,
  RoundPhase,
  TopicStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  const round = {
    id: 3,
    semesterId: 1,
    phase: RoundPhase.OPEN,
    registrationStart: new Date('2026-11-01T00:00:00.000Z'),
    registrationEnd: new Date('2026-11-25T00:00:00.000Z'),
    outlineDeadline: new Date('2026-12-05T00:00:00.000Z'),
    officialStartDate: new Date('2026-12-01T00:00:00.000Z'),
    officialEndDate: new Date('2027-03-01T00:00:00.000Z'),
    archiveDeadline: null,
    finalisedAt: null,
    maxStudentsPerTopic: 3,
    minTopicsPerLecturer: 2,
    projectType: { id: 3, name: 'Khóa luận tốt nghiệp', code: 'DATN' },
    eligibilities: [{ cohort: '2022' }],
    _count: { eligibleStudents: 0 },
  };

  beforeEach(async () => {
    prisma = {
      semester: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Học kỳ 1',
          code: 'HK1-2026-2027',
          startDate: new Date('2026-09-01T00:00:00.000Z'),
          endDate: new Date('2027-01-31T00:00:00.000Z'),
        }),
        findUnique: jest.fn(),
      },
      registrationRound: { findMany: jest.fn().mockResolvedValue([round]) },
      topic: { findMany: jest.fn().mockResolvedValue([]) },
      registrationGroup: { findMany: jest.fn().mockResolvedValue([]) },
      major: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, name: 'Kỹ thuật phần mềm', code: 'KTPM' },
          { id: 2, name: 'Mạng máy tính', code: 'MMT' },
        ]),
      },
      lecturerProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 4,
            lecturerCode: 'GV01',
            fullName: 'Trần Thị B',
            academicTitle: 'TS.',
            maxMentoringQuota: 5,
            major: { code: 'KTPM' },
          },
          {
            id: 5,
            lecturerCode: 'GV02',
            fullName: 'Nguyễn Văn C',
            academicTitle: 'ThS.',
            maxMentoringQuota: 5,
            major: { code: 'MMT' },
          },
        ]),
      },
      roundLecturerQuota: { findMany: jest.fn().mockResolvedValue([]) },
      studentProfile: { findMany: jest.fn().mockResolvedValue([]) },
      topicProposal: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RoundPhaseService,
          useValue: {
            resolveMany: jest
              .fn()
              .mockResolvedValue(new Map([[round.id, RoundPhase.OPEN]])),
          },
        },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  it('aggregates student placement, group sizes, capacity balance, outlines, and zero-group lecturers', async () => {
    prisma.studentProfile.findMany.mockResolvedValue([
      { id: 101, majorId: 1 },
      { id: 102, majorId: 1 },
      { id: 103, majorId: 2 },
      { id: 104, majorId: null },
    ]);

    prisma.topic.findMany.mockResolvedValue([
      {
        id: 11,
        roundId: 3,
        lecturerId: 4,
        majorId: 1,
        status: TopicStatus.OPEN,
        maxStudents: 3,
        lecturer: { majorId: 1 },
      },
      {
        id: 12,
        roundId: 3,
        lecturerId: 4,
        majorId: 1,
        status: TopicStatus.PENDING_DEPARTMENT,
        maxStudents: 2,
        lecturer: { majorId: 1 },
      },
      {
        id: 13,
        roundId: 3,
        lecturerId: 5,
        majorId: 2,
        status: TopicStatus.APPROVED,
        maxStudents: 2,
        lecturer: { majorId: 2 },
      },
    ]);

    prisma.registrationGroup.findMany.mockResolvedValue([
      {
        id: 70,
        topicId: 11,
        topic: { roundId: 3, lecturerId: 4, majorId: 1, maxStudents: 3 },
        members: [
          {
            studentId: 101,
            joinSource: GroupJoinSource.SELF,
            student: { majorId: 1 },
          },
          {
            studentId: 102,
            joinSource: GroupJoinSource.LINK,
            student: { majorId: 1 },
          },
        ],
        outline: { status: 'APPROVED_BY_LECTURER' },
        archive: null,
      },
    ]);

    const report = await service.summary();

    // Self-registration vs assigned
    expect(report.rounds[0].eligible).toBe(4);
    expect(report.rounds[0].withGroup).toBe(2);
    expect(report.rounds[0].withoutGroup).toBe(2);
    expect(report.rounds[0].selfRegistered).toBe(2);
    expect(report.rounds[0].assigned).toBe(0);

    // Group sizes
    expect(report.overview.groups).toEqual({
      total: 1,
      full: 0,
      forming: 1,
      size1: 0,
      size2: 1,
      size3Plus: 0,
      avgSize: 2,
    });

    // Topic capacity (topic 11 = 3 seats, topic 13 = 2 seats -> 5 seats vs 4 eligible)
    expect(report.overview.topics.usable).toBe(2);
    expect(report.overview.topics.pending).toBe(1);
    expect(report.overview.topics.approvedNotOpen).toBe(1);
    expect(report.overview.topics.seatCapacity).toBe(5);
    expect(report.overview.topics.seatBalance).toBe(1);

    // Outlines
    expect(report.overview.outlines).toEqual({
      totalGroups: 1,
      approved: 1,
      pendingReview: 0,
      needsRevision: 0,
      notSubmitted: 0,
    });

    // Majors include KTPM, MMT, and General (majorId = null) scoped ONLY to eligible students
    const ktpm = report.majors.find((m) => m.code === 'KTPM');
    const general = report.majors.find((m) => m.majorId === null);
    expect(ktpm).toEqual(
      expect.objectContaining({
        eligibleStudents: 2,
        withGroup: 2,
        withoutGroup: 0,
        seatCapacity: 3,
      }),
    );
    expect(general?.eligibleStudents).toBe(1);

    // Supervision includes zero-group lecturer (id: 5)
    expect(report.supervision).toHaveLength(2);
    const gv2 = report.supervision.find((s) => s.lecturerId === 5);
    expect(gv2).toEqual(
      expect.objectContaining({
        groups: 0,
        students: 0,
        topicsUsable: 1,
        targetTopicQuota: 2,
      }),
    );
  });

  it('respects RoundLecturerQuota exemptions', async () => {
    prisma.roundLecturerQuota.findMany.mockResolvedValue([
      { roundId: 3, lecturerId: 5, targetQuota: null, isExempt: true },
    ]);

    const report = await service.summary();
    const gv2 = report.supervision.find((s) => s.lecturerId === 5);

    expect(gv2?.isExempt).toBe(true);
    expect(gv2?.targetTopicQuota).toBe(0);
  });
});
