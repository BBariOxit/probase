import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoundsModule } from '../../modules/rounds/rounds.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [NotificationsModule, RoundsModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
