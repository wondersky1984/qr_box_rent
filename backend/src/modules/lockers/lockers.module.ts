import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { LockersController } from './lockers.controller';
import { LockersService } from './lockers.service';
import { LockerDriverModule } from '../locker-driver/locker-driver.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, LockerDriverModule, SettingsModule, forwardRef(() => AuditModule)],
  controllers: [LockersController],
  providers: [LockersService],
  exports: [LockersService],
})
export class LockersModule {}
