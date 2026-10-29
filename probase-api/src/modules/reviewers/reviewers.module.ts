import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ReviewersController } from './reviewers.controller';
import { ReviewersService } from './reviewers.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ReviewersController],
  providers: [ReviewersService],
  exports: [ReviewersService],
})
export class ReviewersModule {}
