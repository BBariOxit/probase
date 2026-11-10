import { Test, TestingModule } from '@nestjs/testing';
import {
  GroupMemberStatus,
  RegistrationGroupStatus,
  Role,
  RoundPhase,
} from '../../../generated/prisma/client';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from './round-phase.service';
import { RoundsService } from './rounds.service';

describe('RoundsService', () => {
  let service: RoundsService;
  let prisma: {
    studentProfile: { findUnique: jest.Mock };
    roundStudentEligibility: { findMany: jest.Mock };
    registrationRound: { findMany: jest.Mock };
    registrationGroupMember: { findFirst: jest.Mock };
  };
  let phases: { resolveMany: jest.Mock };

  beforeEach(async () => {
    prisma = {
      studentProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 7, cohort: '2022' }),
      },
      roundStudentEligibility: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ roundId: 10 }, { roundId: 11 }]),
      },
      registrationRound: {
        findMany: jest.fn(),
      },
      registrationGroupMember: {
        findFirst: jest.fn(),
      },
    };

    phases = {
      resolveMany: jest.fn().mockResolvedValue(
        new Map([
          [10, RoundPhase.OPEN],
          [11, RoundPhase.OPEN],
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoundPhaseService, useValue: phases },
        { provide: NotificationsService, useValue: { notify: jest.fn() } },
      ],
    }).compile();

    service = module.get(RoundsService);
  });

  describe('findAll (mine=true)', () => {
    it('scopes ownRoundFirst lookup to the queried rounds and puts the active round first', async () => {
      prisma.registrationRound.findMany
        // 1. eligibleRoundIds cohort fallback lookup (rounds with 0 imported rows)
        .mockResolvedValueOnce([])
        // 2. main findAll query
        .mockResolvedValueOnce([
          {
            id: 10,
            semesterId: 5,
            projectTypeId: 1,
            registrationStart: new Date('2026-09-01T00:00:00.000Z'),
            registrationEnd: new Date('2026-09-10T00:00:00.000Z'),
            targetCohort: 'CTK46',
            officialStartDate: null,
            officialEndDate: null,
            phase: RoundPhase.OPEN,
            allocationMode: 'FIRST_COME',
            finalisedAt: null,
            semester: { id: 5, name: 'HK1 2026-2027', code: '2026-1' },
            projectType: { id: 1, name: 'Đồ án chuyên ngành', code: 'DACN' },
            eligibilities: [{ cohort: '2022' }],
          },
          {
            id: 11,
            semesterId: 5,
            projectTypeId: 2,
            registrationStart: new Date('2026-09-01T00:00:00.000Z'),
            registrationEnd: new Date('2026-09-20T00:00:00.000Z'),
            targetCohort: 'CTK46',
            officialStartDate: null,
            officialEndDate: null,
            phase: RoundPhase.OPEN,
            allocationMode: 'FIRST_COME',
            finalisedAt: null,
            semester: { id: 5, name: 'HK1 2026-2027', code: '2026-1' },
            projectType: { id: 2, name: 'Khóa luận tốt nghiệp', code: 'DATN' },
            eligibilities: [{ cohort: '2022' }],
          },
        ]);

      prisma.registrationGroupMember.findFirst.mockResolvedValue({
        group: { topic: { roundId: 11 } },
      });

      const result = await service.findAll(
        { semesterId: 5, mine: true },
        101,
        Role.STUDENT,
      );

      expect(prisma.registrationGroupMember.findFirst).toHaveBeenCalledWith({
        where: {
          student: { userId: 101 },
          status: GroupMemberStatus.ACCEPTED,
          group: {
            status: { not: RegistrationGroupStatus.REJECTED },
            topic: { roundId: { in: [10, 11] } },
          },
        },
        select: { group: { select: { topic: { select: { roundId: true } } } } },
      });

      expect(result.map((r) => r.id)).toEqual([11, 10]);
    });
  });
});
