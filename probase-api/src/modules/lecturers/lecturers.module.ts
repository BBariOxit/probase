import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { LecturersController } from './lecturers.controller';
import { LecturersService } from './lecturers.service';
import { MentoringLoadService } from './mentoring-load.service';

@Module({
  imports: [PermissionsModule],
  controllers: [LecturersController],
  providers: [LecturersService, MentoringLoadService],
  exports: [MentoringLoadService],
})
export class LecturersModule {}
