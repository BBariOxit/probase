import { Module } from '@nestjs/common';
import { CouncilsController } from './councils.controller';
import { CouncilsService } from './councils.service';

@Module({
  controllers: [CouncilsController],
  providers: [CouncilsService],
  exports: [CouncilsService],
})
export class CouncilsModule {}
