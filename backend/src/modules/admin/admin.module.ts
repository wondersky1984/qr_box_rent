import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AdminLockersController } from './admin.lockers.controller';
import { AdminTariffsController } from './admin.tariffs.controller';
import { AdminReportsController } from './admin.reports.controller';
import { AdminSettingsController } from './admin.settings.controller';
import { LockersModule } from '../lockers/lockers.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, LockersModule, AuditModule, SettingsModule, AuthModule],
  controllers: [AdminLockersController, AdminTariffsController, AdminReportsController, AdminSettingsController],
})
export class AdminModule {}
