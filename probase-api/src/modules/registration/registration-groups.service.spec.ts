import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GroupJoinSource,
  GroupMemberStatus,
  NotificationType,
  Prisma,
  RegistrationGroupStatus,
  TopicStatus,
} from '../../../generated/prisma/client';
import { MailService } from '../../core/mail/mail.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { RegistrationGroupsService } from './registration-groups.service';

interface MockPrisma {
  studentProfile: {
    findUnique: jest.Mock;
  };
  registrationGroup: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  registrationGroupMember: {
    findFirst: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
  };
  topic: {
    findUnique: jest.Mock;
  };
  roundStudentEligibility: {
    count: jest.Mock;
    findUnique: jest.Mock;
  };
  roundEligibility: {
    findFirst: jest.Mock;
  };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
}

function makeGroupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    topicId: 10,
    semesterId: 5,
    leaderId: 1,
    name: null,
    status: RegistrationGroupStatus.FORMING,
    openForJoin: true,
    declaredSize: null,
    holdUntil: null,
    joinCode: 'JOIN123',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    topic: {
      id: 10,
      title: 'Đề tài cũ',
      maxStudents: 2,
      lecturerId: 20,
      roundId: 3,
      lecturer: { id: 20, fullName: 'TS. Nguyễn Văn A', academicTitle: 'TS.' },
      round: {
        projectType: { id: 1, name: 'Khóa luận tốt nghiệp', code: 'DATN' },
        requirements: [],
      },
    },
    members: [
      {
        id: 1,
        studentId: 1,
        joinSource: GroupJoinSource.SELF,
        joinedAt: new Date('2026-09-01T00:00:00.000Z'),
        student: {
          id: 1,
          studentCode: '2212345',
          fullName: 'Trưởng Nhóm',
          class: 'CTK46A',
          cohort: '2022',
          major: { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
          user: {
            id: 101,
            email: '2212345@dlu.edu.vn',
            avatarUrl: null,
          },
        },
      },
    ],
    ...overrides,
  };
}

function makeTopicRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    title: 'Đề tài mới',
    semesterId: 5,
    roundId: 3,
    maxStudents: 2,
    status: TopicStatus.OPEN,
    round: { projectType: { name: 'Khóa luận tốt nghiệp' } },
    sourceProposal: null,
    ...overrides,
  };
}

describe('RegistrationGroupsService', () => {
  let service: RegistrationGroupsService;
  let prisma: MockPrisma;
  let phases: {
    requireCanJoin: jest.Mock;
    requireCanLeave: jest.Mock;
  };
  let notifications: { notify: jest.Mock };
  let mail: { sendGroupInvitation: jest.Mock };

  beforeEach(async () => {
    prisma = {
      studentProfile: {
        findUnique: jest.fn(),
      },
      registrationGroup: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      registrationGroupMember: {
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
      topic: {
        findUnique: jest.fn(),
      },
      roundStudentEligibility: {
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({ id: 99 }),
      },
      roundEligibility: {
        findFirst: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(async (cb: (tx: MockPrisma) => Promise<unknown>) =>
        cb(prisma),
      ),
    };

    phases = {
      requireCanJoin: jest.fn().mockResolvedValue(undefined),
      requireCanLeave: jest.fn().mockResolvedValue(undefined),
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    mail = {
      sendGroupInvitation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationGroupsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoundPhaseService, useValue: phases },
        { provide: NotificationsService, useValue: notifications },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(RegistrationGroupsService);
  });

  describe('inviteByStudentCode', () => {
    it('rejects adding a deactivated student account', async () => {
      prisma.studentProfile.findUnique
        .mockResolvedValueOnce({
          id: 1,
          cohort: '2022',
          fullName: 'Trưởng Nhóm',
        })
        .mockResolvedValueOnce({
          id: 2,
          fullName: 'Sinh Viên Bị Khóa',
          cohort: '2022',
          studentCode: '2212999',
          user: { id: 102, email: '2212999@dlu.edu.vn', isActive: false },
        });
      prisma.registrationGroup.findUnique.mockResolvedValue(makeGroupRow());

      await expect(
        service.inviteByStudentCode(100, '2212999', 101),
      ).rejects.toThrow(ConflictException);

      expect(prisma.registrationGroupMember.create).not.toHaveBeenCalled();
      expect(notifications.notify).not.toHaveBeenCalled();
      expect(mail.sendGroupInvitation).not.toHaveBeenCalled();
    });

    it('adds an active eligible student and sends notification and email', async () => {
      const initialGroup = makeGroupRow();
      const updatedGroup = makeGroupRow({
        status: RegistrationGroupStatus.APPROVED,
        members: [
          ...initialGroup.members,
          {
            id: 2,
            studentId: 2,
            joinSource: GroupJoinSource.LINK,
            joinedAt: new Date('2026-09-02T00:00:00.000Z'),
            student: {
              id: 2,
              studentCode: '2212346',
              fullName: 'Thành Viên Mới',
              class: 'CTK46A',
              cohort: '2022',
              major: { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
              user: {
                id: 102,
                email: '2212346@dlu.edu.vn',
                avatarUrl: null,
              },
            },
          },
        ],
      });

      prisma.studentProfile.findUnique
        .mockResolvedValueOnce({
          id: 1,
          cohort: '2022',
          fullName: 'Trưởng Nhóm',
        })
        .mockResolvedValueOnce({
          id: 2,
          fullName: 'Thành Viên Mới',
          cohort: '2022',
          studentCode: '2212346',
          user: { id: 102, email: '2212346@dlu.edu.vn', isActive: true },
        });

      prisma.registrationGroup.findUnique
        .mockResolvedValueOnce(initialGroup)
        .mockResolvedValueOnce(initialGroup)
        .mockResolvedValueOnce(updatedGroup)
        .mockResolvedValueOnce(updatedGroup);

      prisma.topic.findUnique.mockResolvedValue(makeTopicRow({ id: 10 }));
      prisma.registrationGroupMember.findFirst.mockResolvedValue(null);

      const res = await service.inviteByStudentCode(100, ' 2212346 ', 101);

      const memberCalls = prisma.registrationGroupMember.create.mock.calls as [
        {
          data: {
            groupId: number;
            studentId: number;
            status: GroupMemberStatus;
            joinSource: GroupJoinSource;
          };
        },
      ][];
      expect(memberCalls).toHaveLength(1);
      expect(memberCalls[0][0].data).toMatchObject({
        groupId: 100,
        studentId: 2,
        status: GroupMemberStatus.ACCEPTED,
        joinSource: GroupJoinSource.LINK,
      });

      const notifyCalls = notifications.notify.mock.calls as [
        Array<{ userId: number; type: NotificationType }>,
      ][];
      expect(notifyCalls).toHaveLength(2);
      expect(notifyCalls[0][0]).toEqual([
        expect.objectContaining({
          userId: 101,
          type: NotificationType.GROUP_MEMBER_JOINED,
        }),
      ]);
      expect(notifyCalls[1][0]).toEqual([
        expect.objectContaining({
          userId: 102,
          type: NotificationType.GROUP_MEMBER_JOINED,
        }),
      ]);

      const mailCalls = mail.sendGroupInvitation.mock.calls as [
        { to: string },
      ][];
      expect(mailCalls[0][0]).toMatchObject({ to: '2212346@dlu.edu.vn' });
      expect(res.members).toHaveLength(2);
    });
  });

  describe('switchTopic', () => {
    it('translates P2002 one_live_per_topic unique violation into ConflictException', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 1,
        cohort: '2022',
        fullName: 'Trưởng Nhóm',
      });
      prisma.registrationGroup.findUnique.mockResolvedValue(makeGroupRow());
      prisma.topic.findUnique.mockResolvedValue(makeTopicRow());
      prisma.registrationGroup.findFirst.mockResolvedValue(null);

      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.0.0',
          meta: {
            driverAdapterError: {
              cause: {
                constraint: { index: 'registration_groups_one_live_per_topic' },
              },
            },
          },
        },
      );
      prisma.registrationGroup.update.mockRejectedValue(uniqueError);

      await expect(service.switchTopic(100, 20, 101)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects switching to a topic proposed by another student', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 1,
        cohort: '2022',
        fullName: 'Trưởng Nhóm',
      });
      prisma.registrationGroup.findUnique.mockResolvedValue(makeGroupRow());
      prisma.topic.findUnique.mockResolvedValue(
        makeTopicRow({ sourceProposal: { studentId: 999 } }),
      );

      await expect(service.switchTopic(100, 20, 101)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.registrationGroup.update).not.toHaveBeenCalled();
    });

    it('rejects switching when current group members exceed newTopic maxStudents', async () => {
      const twoMemberGroup = makeGroupRow({
        members: [
          ...makeGroupRow().members,
          {
            id: 2,
            studentId: 2,
            joinSource: GroupJoinSource.LINK,
            joinedAt: new Date('2026-09-02T00:00:00.000Z'),
            student: {
              id: 2,
              studentCode: '2212346',
              fullName: 'Thành Viên',
              class: 'CTK46A',
              cohort: '2022',
              major: { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
              user: {
                id: 102,
                email: '2212346@dlu.edu.vn',
                avatarUrl: null,
              },
            },
          },
        ],
      });
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 1,
        cohort: '2022',
        fullName: 'Trưởng Nhóm',
      });
      prisma.registrationGroup.findUnique.mockResolvedValue(twoMemberGroup);
      prisma.topic.findUnique.mockResolvedValue(
        makeTopicRow({ maxStudents: 1 }),
      );

      await expect(service.switchTopic(100, 20, 101)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.registrationGroup.update).not.toHaveBeenCalled();
    });
  });
});
