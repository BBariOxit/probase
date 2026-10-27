import { Module } from '@nestjs/common';
import { RoundsModule } from '../rounds/rounds.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { TopicSimilarityService } from './topic-similarity.service';

@Module({
  imports: [RoundsModule, NotificationsModule],
  controllers: [TopicsController],
  providers: [TopicsService, TopicSimilarityService],
  exports: [TopicsService, TopicSimilarityService],
})
export class TopicsModule {}
