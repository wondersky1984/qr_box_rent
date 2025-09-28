import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LockersService } from '../lockers/lockers.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(private readonly lockersService: LockersService) {}

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
}
