import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { EligibleImportSessionService } from './eligible-import-session.service';
import { EligibleStudentsService } from './eligible-students.service';
import { RequirementsService } from './requirements.service';
import { RoundPhaseService } from './round-phase.service';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';

@Module({
  imports: [NotificationsModule],
  controllers: [RoundsController],
  providers: [
    RoundsService,
    RoundPhaseService,
    RequirementsService,
    EligibleImportSessionService,
    EligibleStudentsService,
  ],
  exports: [
    RoundsService,
    RoundPhaseService,
    RequirementsService,
    EligibleStudentsService,
  ],
})
export class RoundsModule {}
