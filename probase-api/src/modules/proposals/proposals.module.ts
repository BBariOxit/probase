import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../core/cloudinary/cloudinary.module';
import { LecturersModule } from '../lecturers/lecturers.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { RoundsModule } from '../rounds/rounds.module';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';

@Module({
  imports: [
    RoundsModule,
    NotificationsModule,
    LecturersModule,
    CloudinaryModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
