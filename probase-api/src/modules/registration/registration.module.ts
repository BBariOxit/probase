import { Module } from '@nestjs/common';
import { MailModule } from '../../core/mail/mail.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { RoundsModule } from '../rounds/rounds.module';
import { StudentsModule } from '../students/students.module';
import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';
import { RegistrationGroupsController } from './registration-groups.controller';
import { RegistrationGroupsService } from './registration-groups.service';
import { TopicRegistrationController } from './topic-registration.controller';

@Module({
  imports: [RoundsModule, NotificationsModule, StudentsModule, MailModule],
  controllers: [
    RegistrationGroupsController,
    TopicRegistrationController,
    AllocationController,
  ],
  providers: [RegistrationGroupsService, AllocationService],
  exports: [RegistrationGroupsService],
})
export class RegistrationModule {}
