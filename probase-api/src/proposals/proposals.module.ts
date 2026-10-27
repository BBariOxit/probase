import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { LecturersModule } from '../lecturers/lecturers.module';
import { NotificationsModule } from '../notifications/notifications.module';
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
