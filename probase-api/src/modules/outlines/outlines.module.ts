import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../core/cloudinary/cloudinary.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { OutlinesController } from './outlines.controller';
import { OutlinesService } from './outlines.service';

@Module({
  imports: [PrismaModule, CloudinaryModule, NotificationsModule],
  controllers: [OutlinesController],
  providers: [OutlinesService],
  exports: [OutlinesService],
})
export class OutlinesModule {}
