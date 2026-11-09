import { Module } from '@nestjs/common';
import { RoundsModule } from '../rounds/rounds.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { TopicsController } from './topics.controller';
import { TopicsExportService } from './topics-export.service';
import { TopicsService } from './topics.service';
import { TopicSimilarityService } from './topic-similarity.service';

@Module({
  imports: [RoundsModule, NotificationsModule],
  controllers: [TopicsController],
  providers: [TopicsService, TopicsExportService, TopicSimilarityService],
  exports: [TopicsService, TopicSimilarityService],
})
export class TopicsModule {}
