import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../core/cloudinary/cloudinary.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [PrismaModule, CloudinaryModule, NotificationsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
