import { Test, TestingModule } from '@nestjs/testing';
import { Role, TopicProposalStatus, TopicStatus } from '../../../generated/prisma/client';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MentoringLoadService } from '../lecturers/mentoring-load.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { RoundsService } from '../rounds/rounds.service';
import { ProposalsService } from './proposals.service';

describe('ProposalsService', () => {
  let service: ProposalsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      lecturerProfile: {
        findUnique: jest.fn(),
      },
      topicProposal: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      topic: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RoundsService,
          useValue: {
            requireRoundFor: jest.fn().mockResolvedValue({ id: 8 }),
            eligibleRoundIds: jest.fn().mockResolvedValue([8]),
          },
        },
        {
          provide: RoundPhaseService,
          useValue: {
            requireCanAcceptProposal: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsService,
          useValue: { notify: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: MentoringLoadService,
          useValue: { requireRoomForOneMore: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CloudinaryService,
          useValue: { destroy: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<ProposalsService>(ProposalsService);
  });

  describe('accept', () => {
    it('propagates student or lecturer majorId to the created topic', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 5,
        fullName: 'Phan Bửu',
        academicTitle: 'ThS.',
        majorId: 1,
        maxMentoringQuota: 10,
      });

      const proposalRow = {
        id: 8,
        status: TopicProposalStatus.PENDING,
        title: 'Đề tài CV',
        description: 'Mô tả',
        expectedOutcomes: 'Sản phẩm',
        maxStudents: 3,
        lecturerFeedback: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        semesterId: 5,
        projectTypeId: 3,
        studentId: 1,
        requestedLecturerId: 5,
        semester: { id: 5, name: 'HK1', code: 'HK1-2026-2027' },
        projectType: { id: 3, name: 'Khóa luận tốt nghiệp', code: 'DATN' },
        student: {
          id: 1,
          fullName: 'Nguyễn Văn A',
          studentCode: '2266666',
          class: 'CTK46PM',
          majorId: null,
          userId: 100,
          user: { avatarUrl: null },
        },
        requestedLecturer: { id: 5, fullName: 'Phan Bửu', academicTitle: 'ThS.' },
        acceptedByLecturer: null,
        attachments: [],
        comments: [],
        convertedTopic: null,
      };

      prisma.topicProposal.findUnique.mockResolvedValue(proposalRow);
      prisma.topic.create.mockResolvedValue({ id: 38, title: 'Đề tài CV' });
      prisma.topicProposal.update.mockResolvedValue(proposalRow);
      jest.spyOn(service, 'findOne').mockResolvedValue(proposalRow as any);

      await service.accept(8, { maxStudents: 3 }, 50);

      expect(prisma.topic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lecturerId: 5,
            majorId: 1,
            sourceProposalId: 8,
            status: TopicStatus.DRAFT,
          }),
        }),
      );
      expect(service.findOne).toHaveBeenCalledWith(8, 50, Role.LECTURER);
    });
  });
});

