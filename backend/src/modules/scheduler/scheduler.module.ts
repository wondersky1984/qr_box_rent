import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { LockersModule } from '../lockers/lockers.module';

@Module({
  imports: [ScheduleModule.forRoot(), LockersModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}


