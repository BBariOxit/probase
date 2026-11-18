import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, RoundPhase } from '../../../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoundPhaseService } from '../../modules/rounds/round-phase.service';
import { RemindersService } from './reminders.service';

describe('RemindersService', () => {
  let service: RemindersService;
  let prisma: {
    registrationRound: { findMany: jest.Mock };
  };
  let notifications: {
    notify: jest.Mock;
    studentsWithoutGroupIn: jest.Mock;
  };
  let phases: { resolveMany: jest.Mock };

  const closingSoon = {
    id: 12,
    semesterId: 1,
    phase: RoundPhase.OPEN,
    registrationStart: new Date('2026-08-01T00:00:00.000Z'),
    registrationEnd: new Date('2026-08-22T00:00:00.000Z'),
    projectType: { name: 'Đồ án Tốt nghiệp' },
    eligibilities: [{ cohort: '2022' }],
  };

  beforeEach(async () => {
    prisma = {
      registrationRound: { findMany: jest.fn().mockResolvedValue([]) },
    };
    notifications = {
      notify: jest.fn().mockResolvedValue(0),
      studentsWithoutGroupIn: jest.fn().mockResolvedValue([]),
    };
    phases = {
      resolveMany: jest
        .fn()
        .mockImplementation((rounds: { id: number; phase: RoundPhase }[]) =>
          Promise.resolve(new Map(rounds.map((r) => [r.id, r.phase]))),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: RoundPhaseService, useValue: phases },
      ],
    }).compile();

    service = module.get(RemindersService);
  });

  function sent() {
    return notifications.notify.mock.calls.flatMap(
      (call: [{ type: NotificationType; dedupeKey?: string }[]]) => call[0],
    );
  }

  describe('the window', () => {
    it('never reaches back past now', async () => {
      await service.run();

      type Call = [{ where: Record<string, { gt: Date; lte: Date }> }];
      const calls: Call[] = [
        ...(prisma.registrationRound.findMany.mock.calls as Call[]).filter(
          ([args]) => 'registrationEnd' in args.where,
        ),
      ];

      expect(calls.length).toBeGreaterThan(0);

      for (const [args] of calls) {
        const [range] = Object.values(args.where);

        expect(range.gt.getTime()).toBeLessThanOrEqual(Date.now());
        expect(range.lte.getTime()).toBeGreaterThan(range.gt.getTime());
      }
    });
  });

  describe('round opened', () => {
    it('announces a PREP round once it enters OPEN with open topics', async () => {
      const openingRound = {
        ...closingSoon,
        phase: RoundPhase.PREP,
        semester: { name: 'HKI-2026-2027' },
        _count: { eligibleStudents: 5 },
      };
      prisma.registrationRound.findMany.mockImplementation((args: any) => {
        if (args?.where?.phase === RoundPhase.PREP) {
          return Promise.resolve([openingRound]);
        }
        return Promise.resolve([]);
      });
      phases.resolveMany.mockResolvedValueOnce(
        new Map([[openingRound.id, RoundPhase.OPEN]]),
      );
      notifications.studentsWithoutGroupIn.mockResolvedValueOnce([340]);

      await service.run();

      const [notice] = sent().filter(
        (one) => one.type === NotificationType.DEADLINE_REMINDER,
      );

      expect(notice).toEqual(
        expect.objectContaining({
          userId: 340,
          targetId: 12,
          dedupeKey: 'ROUND_OPENED:round=12:user=340',
        }),
      );
    });
  });

  describe('registration closing', () => {
    it('says nothing about a round whose gate has already shut', async () => {
      prisma.registrationRound.findMany.mockImplementation((args: any) =>
        'registrationEnd' in (args?.where ?? {})
          ? Promise.resolve([closingSoon])
          : Promise.resolve([]),
      );
      phases.resolveMany.mockResolvedValueOnce(
        new Map([[closingSoon.id, RoundPhase.RECONCILING]]),
      );

      await service.run();

      expect(notifications.studentsWithoutGroupIn).not.toHaveBeenCalled();
      expect(sent()).toHaveLength(0);
    });

    it('keys each notice to the deadline, so an extension is heard again', async () => {
      prisma.registrationRound.findMany.mockImplementation((args: any) =>
        'registrationEnd' in (args?.where ?? {})
          ? Promise.resolve([closingSoon])
          : Promise.resolve([]),
      );
      notifications.studentsWithoutGroupIn.mockResolvedValueOnce([340]);

      await service.run();

      const [notice] = sent().filter(
        (one) => one.type === NotificationType.REGISTRATION_CLOSING_SOON,
      );

      expect(notice.dedupeKey).toBe(
        `REGISTRATION_CLOSING_SOON:round=12:end=${closingSoon.registrationEnd.toISOString()}:user=340`,
      );
    });
  });
});
