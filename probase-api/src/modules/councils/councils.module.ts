import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { CouncilsController } from './councils.controller';
import { CouncilsService } from './councils.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CouncilsController],
  providers: [CouncilsService],
  exports: [CouncilsService],
})
export class CouncilsModule {}
