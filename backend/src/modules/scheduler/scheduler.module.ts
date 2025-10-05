import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { LockersModule } from '../lockers/lockers.module';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [ScheduleModule.forRoot(), LockersModule, DeviceModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}


