import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LockersService } from '../lockers/lockers.service';
import { DeviceService } from '../device/device.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(
    private readonly lockersService: LockersService,
    private readonly deviceService: DeviceService,
  ) {}

  onModuleInit() {
    console.log('Scheduler service initialized');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredRentals() {
    try {
      // Вызываем логику обновления истекших аренд каждую минуту
      await this.lockersService.refreshExpiredRentals();
      console.log('Expired rentals check completed');
    } catch (error) {
      console.error('Error checking expired rentals:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredDeviceCommands() {
    try {
      // Очищаем истёкшие команды каждую минуту
      const count = await this.deviceService.cleanupExpiredCommands();
      if (count > 0) {
        console.log(`Cleaned up ${count} expired device commands`);
      }
    } catch (error) {
      console.error('Error cleaning up expired device commands:', error);
    }
  }
}


